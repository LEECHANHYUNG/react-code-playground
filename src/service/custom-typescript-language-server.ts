// A custom TypeScript worker which can serve extra library files (e.g. *.d.ts that
// we fetch from npm). The extra files are stored in `fileEntries` and seamlessly
// presented to the TypeScript language service so that the usual editor
// features (completion, diagnostics, etc.) work even for those virtual files.

import type * as monaco from "monaco-editor";
import { Uri } from "monaco-editor";

// The ESM build of the default TypeScript worker exposes an `initialize` helper
// and the base `TypescriptWorker` implementation that we extend below.
import {
  initialize,
  TypescriptWorker,
} from "monaco-editor/esm/vs/language/typescript/ts.worker.js";

export class CustomTypescriptWorker extends TypescriptWorker {
  /**
   * Map of virtual files keyed by their path/URI. Each entry holds the full
   * content of the *.ts/tsx/*.d.ts file.
   */
  private readonly fileEntries = new Map<string, string>();

  constructor(ctx: unknown, createData: unknown) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    super(ctx as any, createData as any);
  }

  /** API for the main thread to add/update extra library sources */
  addExtraLib(fileName: string, contents: string): void {
    console.log(`Adding extra lib to worker: ${fileName}`);
    this.fileEntries.set(fileName, contents);

    // Also add variations for better module resolution
    if (fileName.includes("@types/")) {
      const packageName = fileName.match(/@types\/([^/]+)/)?.[1];
      if (packageName) {
        // Add as bare module name
        this.fileEntries.set(packageName, contents);
        // Add with node_modules prefix
        this.fileEntries.set(
          `node_modules/${packageName}/index.d.ts`,
          contents
        );
      }
    }
  }

  // -- Enhanced Overrides ------------------------------------------------- //

  readFile(fileName: string): string | undefined {
    // Try exact match first
    let result = super.readFile(fileName) ?? this.fileEntries.get(fileName);

    if (!result) {
      // Try variations for better module resolution
      const variations = this.getFileNameVariations(fileName);
      for (const variation of variations) {
        result = this.fileEntries.get(variation);
        if (result) break;
      }
    }

    if (result) {
      console.log(`Worker resolved file: ${fileName} -> found`);
    }

    return result;
  }

  getScriptFileNames(): string[] {
    const baseFiles = super.getScriptFileNames();
    const extraFiles = Array.from(this.fileEntries.keys());
    return [...baseFiles, ...extraFiles];
  }

  fileExists(fileName: string): boolean {
    const exists = super.fileExists(fileName) || this.fileEntries.has(fileName);

    if (!exists) {
      // Check variations
      const variations = this.getFileNameVariations(fileName);
      for (const variation of variations) {
        if (this.fileEntries.has(variation)) {
          return true;
        }
      }
    }

    return exists;
  }

  _getModel(fileName: string): monaco.worker.IMirrorModel | null {
    let model = super._getModel(fileName);

    if (!model) {
      model = this.asModel(fileName);
    }

    return model;
  }

  _getScriptText(fileName: string): string | undefined {
    let text = super._getScriptText(fileName);

    if (!text) {
      text = this.fileEntries.get(fileName);

      if (!text) {
        // Try variations
        const variations = this.getFileNameVariations(fileName);
        for (const variation of variations) {
          text = this.fileEntries.get(variation);
          if (text) break;
        }
      }
    }

    return text;
  }

  // --------------------------------------------------------------------- //

  private getFileNameVariations(fileName: string): string[] {
    const variations: string[] = [];

    // Remove file:// protocol if present
    const cleanName = fileName.replace("file://", "");
    variations.push(cleanName);

    // Add with file:// protocol
    if (!fileName.startsWith("file://")) {
      variations.push(`file://${fileName}`);
    }

    // For node_modules paths, try different variations
    if (cleanName.includes("node_modules")) {
      const packageMatch = cleanName.match(/node_modules\/@?([^/]+)/);
      if (packageMatch) {
        const packageName = packageMatch[1];
        variations.push(
          `file:///node_modules/@types/${packageName}/index.d.ts`
        );
        variations.push(`@types/${packageName}`);
        variations.push(packageName);
      }
    }

    // For @types paths, try package name variations
    if (cleanName.includes("@types/")) {
      const typeMatch = cleanName.match(/@types\/([^/]+)/);
      if (typeMatch) {
        const packageName = typeMatch[1];
        variations.push(packageName);
        variations.push(`node_modules/${packageName}/index.d.ts`);
      }
    }

    return variations;
  }

  // --------------------------------------------------------------------- //

  private asModel(fileName: string): monaco.worker.IMirrorModel | null {
    const text = this.fileEntries.get(fileName);
    if (text == null) {
      return null;
    }

    return {
      getValue() {
        return text;
      },
      uri: Uri.parse(fileName),
      version: 1,
    } as monaco.worker.IMirrorModel;
  }
}

// ----------------------------------------------------------------------------------
// Worker bootstrap
// ----------------------------------------------------------------------------------

// The worker host (Monaco) calls into this `initialize` function and provides the
// worker context. We simply return an instance of our custom worker so that it
// is used instead of the default implementation.

initialize((ctx: unknown, createData: unknown) => {
  return new CustomTypescriptWorker(ctx, createData);
});
