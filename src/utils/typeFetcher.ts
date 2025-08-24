import type * as monaco from "monaco-editor";
import * as ts from "typescript";
import { globalTypeCache} from './typeCache';

/**
 * Virtual file system for storing type definitions in memory
 */
class VirtualFileSystem {
  private files = new Map<string, string>();
  private visited = new Set<string>();

  has(path: string): boolean {
    return this.files.has(path);
  }

  get(path: string): string | undefined {
    return this.files.get(path);
  }

  set(path: string, content: string): void {
    this.files.set(path, content);
  }

  isVisited(path: string): boolean {
    return this.visited.has(path);
  }

  markVisited(path: string): void {
    this.visited.add(path);
  }

  getAllFiles(): Map<string, string> {
    return this.files;
  }
}

const globalVFS = new VirtualFileSystem();

/**
 * Normalize a TypeScript declaration file URL to prevent duplicate extensions
 */
function normalizeTypeUrl(url: string): string {
  // Remove duplicate .d.ts extensions
  while (url.includes(".d.ts.d.ts")) {
    url = url.replace(/\.d\.ts\.d\.ts/g, ".d.ts");
  }

  // If it already ends with .d.ts, don't add more
  if (url.endsWith(".d.ts")) {
    return url;
  }

  // If it has query parameters, don't modify
  if (url.includes("?")) {
    return url;
  }

  // If it's a directory path or already has an extension, don't add .d.ts
  if (url.endsWith("/") || url.includes(".ts") || url.includes(".js")) {
    return url;
  }

  // Add .d.ts for bare paths
  return url + ".d.ts";
}

/**
 * Enhanced type fetcher with recursive dependency analysis and virtual file system
 */
export async function fetchAndAddTypes(
  packageSpecifier: string,
  monacoInstance: typeof monaco
): Promise<void> {
  const defaults = monacoInstance.languages.typescript.typescriptDefaults;

  /**
   * Process a single .d.ts file and its dependencies recursively
   */
  async function processFile(url: string, packageName?: string): Promise<void> {
    // Normalize URL to prevent duplicate extensions
    url = normalizeTypeUrl(url);

    if (globalVFS.isVisited(url)) return;
    globalVFS.markVisited(url);

    try {
      console.log(`Fetching types from: ${url}`);

      // 1단계: 캐시에서 먼저 확인
      let text = await globalTypeCache.get(url);
      const fromCache = !!text;

      if (!text) {
        // 2단계: 캐시에 없으면 네트워크에서 다운로드
        const res = await fetch(url);
        if (!res.ok) {
          console.warn(`Failed to fetch ${url}: ${res.statusText}`);
          return;
        }
        text = await res.text();

        // 3단계: 다운로드한 내용을 캐시에 저장
        const etag = res.headers.get("etag") || undefined;
        await globalTypeCache.set(url, text, { etag });
      }

      console.log(
        `${fromCache ? "📦 Loaded from cache" : "🌐 Downloaded"}: ${url}`
      );

      // Create virtual file path - use the actual module name for proper resolution
      let virtualPath: string;
      if (packageName) {
        // Main entry point for the package
        virtualPath = `file:///node_modules/${packageName}/index.d.ts`;
      } else {
        // Derived from URL - maintain proper module structure
        virtualPath = url.replace("https://esm.sh/", "file:///node_modules/");
        // Ensure it has proper .d.ts extension
        if (!virtualPath.endsWith(".d.ts")) {
          virtualPath = virtualPath.replace(/\?.*$/, "") + ".d.ts";
        }
      }

      // Store in virtual file system
      globalVFS.set(virtualPath, text);

      // Register with Monaco - 중복 체크 추가
      const existingLib = defaults.getExtraLibs()[virtualPath];
      if (!existingLib || existingLib.content !== text) {
        defaults.addExtraLib(text, virtualPath);
        console.log(`Added types for: ${virtualPath}`);
      } else {
        console.log(`Types already exist for: ${virtualPath}`);
      }

      // Also register with package name mapping for direct imports
      if (packageName && !virtualPath.includes("/dist/")) {
        const packagePath = `file:///node_modules/@types/${packageName}/index.d.ts`;
        const existingPackageLib = defaults.getExtraLibs()[packagePath];
        if (!existingPackageLib || existingPackageLib.content !== text) {
          defaults.addExtraLib(text, packagePath);
          console.log(`Added package mapping: ${packagePath}`);
        }
      }

      // Analyze dependencies using TypeScript
      const info = ts.preProcessFile(text, true, true);

      // Process triple-slash reference paths
      for (const ref of info.referencedFiles) {
        const childUrl = normalizeTypeUrl(
          new URL(ref.fileName, url).toString()
        );
        await processFile(childUrl);
      }

      // Process import statements to find more dependencies
      for (const importRef of info.importedFiles) {
        if (importRef.fileName.startsWith(".")) {
          // Relative import - handle .d.ts extension properly
          const childUrl = normalizeTypeUrl(
            new URL(importRef.fileName, url).toString()
          );
          await processFile(childUrl);
        } else if (!importRef.fileName.includes("/")) {
          // Bare module specifier - fetch its types too
          try {
            await fetchEntry(importRef.fileName);
          } catch (e) {
            console.warn(
              `Failed to fetch dependency types for ${importRef.fileName}:`,
              e
            );
          }
        }
      }
    } catch (error) {
      console.warn(`Error processing file ${url}:`, error);
    }
  }

  /**
   * Fetch entry point for a package and start processing
   */
  async function fetchEntry(specifier: string): Promise<void> {
    if (globalVFS.isVisited(`package:${specifier}`)) return;
    globalVFS.markVisited(`package:${specifier}`);

    try {
      const baseUrl = `https://esm.sh/${specifier}`;
      console.log(`Resolving package: ${specifier}`);

      const resp = await fetch(baseUrl, { method: "HEAD" });
      if (!resp.ok) {
        console.warn(
          `Unable to resolve package ${specifier}: ${resp.statusText}`
        );
        return;
      }

      const typesHeader = resp.headers.get("X-TypeScript-Types");
      let typesUrl: string;

      if (typesHeader) {
        typesUrl = new URL(typesHeader, baseUrl).toString();
      } else {
        // Fallback: explicit ?dts query
        typesUrl = `https://esm.sh/${specifier}?dts`;
      }

      await processFile(typesUrl, specifier);
    } catch (error) {
      console.error(`Failed to fetch entry for ${specifier}:`, error);
    }
  }

  await fetchEntry(packageSpecifier);
}

/**
 * Get all stored type definitions (useful for debugging)
 */
export function getStoredTypes(): Map<string, string> {
  return globalVFS.getAllFiles();
}
