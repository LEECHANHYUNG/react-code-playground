/**
 * 통합 TypeScript 인텔리센스 관리자
 * 모든 타입 로딩, 캐싱, 모듈 해석을 통합 관리하는 중앙 시스템
 */

import type * as monaco from "monaco-editor";
import { fetchAndAddTypes } from "./typeFetcher";
import { globalTypeCache } from "./typeCache";

export interface IntelliSenseConfig {
  enableCache: boolean;
  enableAutoLoading: boolean;
  supportedLibraries: string[];
  debounceMs: number;
  maxConcurrentLoads: number;
}

export class IntelliSenseManager {
  private monaco: typeof monaco;
  private config: IntelliSenseConfig;
  private loadingQueue = new Set<string>();
  private loadedModules = new Set<string>();
  private isInitialized = false;

  constructor(
    monacoInstance: typeof monaco,
    config?: Partial<IntelliSenseConfig>
  ) {
    this.monaco = monacoInstance;

    this.config = {
      enableCache: true,
      enableAutoLoading: true,
      debounceMs: 1000,
      maxConcurrentLoads: 3,
      supportedLibraries: [
        // React 생태계
        "react",
        "react-dom",
        "react-router",
        "react-router-dom",
        "react-query",
        "@tanstack/react-query",
        "react-hook-form",
        "formik",

        // 상태 관리
        "zustand",
        "redux",
        "@reduxjs/toolkit",
        "mobx",
        "jotai",
        "recoil",

        // 스타일링
        "styled-components",
        "@emotion/react",
        "@emotion/styled",
        "tailwindcss",
        "classnames",
        "clsx",

        // 유틸리티
        "lodash",
        "lodash-es",
        "ramda",
        "immer",
        "date-fns",
        "moment",
        "dayjs",

        // HTTP & API
        "axios",
        "fetch",
        "ky",
        "swr",

        // 애니메이션
        "framer-motion",
        "react-spring",
        "react-transition-group",

        // 폼 & 검증
        "yup",
        "zod",
        "joi",
        "ajv",

        // 테스팅
        "jest",
        "@testing-library/react",
        "@testing-library/jest-dom",
        "vitest",

        // 유틸리티
        "uuid",
        "nanoid",
        "crypto-js",
        "js-cookie",

        // UI 라이브러리
        "@mui/material",
        "antd",
        "react-bootstrap",
        "chakra-ui",
        "@vapor-ui/core",
        "vapor-ui",

        // 개발 도구
        "typescript",
        "eslint",
        "prettier",
      ],
      ...config,
    };
  }

  /**
   * 인텔리센스 시스템 초기화
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    console.log("🚀 Initializing Enhanced TypeScript IntelliSense...");

    try {
      // Monaco 컴파일러 옵션 설정
      this.setupCompilerOptions();

      // 기본 라이브러리 로드
      await this.loadEssentialLibraries();

      // 코드 변경 감지 설정
      this.setupCodeAnalyzer();

      this.isInitialized = true;
      console.log("✅ IntelliSense initialization completed!");

      // 캐시 통계 출력
      const stats = globalTypeCache.getStats();
      console.log(
        `📊 Cache Stats: ${stats.totalTypes} types, ${stats.cacheSize}, ${stats.hitRate}% hit rate`
      );
    } catch (error) {
      console.error("❌ Failed to initialize IntelliSense:", error);
      throw error;
    }
  }

  /**
   * 특정 라이브러리의 타입 수동 로드
   */
  async loadLibrary(libraryName: string): Promise<boolean> {
    if (
      this.loadedModules.has(libraryName) ||
      this.loadingQueue.has(libraryName)
    ) {
      return true;
    }

    if (!this.config.supportedLibraries.includes(libraryName)) {
      console.warn(`⚠️ Library '${libraryName}' is not in supported list`);
      return false;
    }

    this.loadingQueue.add(libraryName);

    try {
      console.log(`📦 Loading types for: ${libraryName}`);
      await fetchAndAddTypes(libraryName, this.monaco);
      this.loadedModules.add(libraryName);
      console.log(`✅ Successfully loaded: ${libraryName}`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to load ${libraryName}:`, error);
      return false;
    } finally {
      this.loadingQueue.delete(libraryName);
    }
  }

  /**
   * 여러 라이브러리를 병렬로 로드
   */
  async loadLibraries(
    libraryNames: string[]
  ): Promise<Array<{ library: string; success: boolean }>> {
    const results = await Promise.allSettled(
      libraryNames.map(async (lib) => ({
        library: lib,
        success: await this.loadLibrary(lib),
      }))
    );

    return results.map((result, index) => {
      if (result.status === "fulfilled") {
        return result.value;
      }
      return { library: libraryNames[index], success: false };
    });
  }

  /**
   * 코드에서 import 구문 분석하여 필요한 타입 자동 로드
   */
  async analyzeAndLoadTypes(code: string): Promise<void> {
    if (!this.config.enableAutoLoading) return;

    const imports = this.extractImports(code);
    const newLibraries = imports.filter(
      (lib) =>
        this.config.supportedLibraries.includes(lib) &&
        !this.loadedModules.has(lib) &&
        !this.loadingQueue.has(lib)
    );

    if (newLibraries.length === 0) return;

    console.log(`🔍 Found new imports: ${newLibraries.join(", ")}`);

    // 동시 로딩 제한
    const chunks = this.chunkArray(
      newLibraries,
      this.config.maxConcurrentLoads
    );

    for (const chunk of chunks) {
      await this.loadLibraries(chunk);
    }

    // 컴포넌트 import 분석 및 자동 등록
    this.analyzeAndRegisterComponents(code);
  }

  /**
   * 코드에서 컴포넌트 import를 분석하여 자동 등록
   */
  private analyzeAndRegisterComponents(code: string): void {
    console.log("🔍 Analyzing component imports...");

    // Named imports 패턴 매칭
    const namedImportPattern =
      /import\s*\{\s*([^}]+)\s*\}\s*from\s*['"]([^'"]+)['"]/g;
    let match;

    while ((match = namedImportPattern.exec(code)) !== null) {
      const importedNames = match[1].split(",").map((name) => name.trim());
      const moduleName = match[2];

      console.log(`Found imports from ${moduleName}:`, importedNames);

      // React 컴포넌트로 보이는 것들 필터링 (대문자로 시작)
      const componentNames = importedNames.filter((name) =>
        /^[A-Z]/.test(name)
      );

      if (componentNames.length > 0) {
        console.log(`Registering components:`, componentNames);

        // 모듈별 컴포넌트 타입 정의
        const componentDefs: Record<string, string> = {};

        componentNames.forEach((name) => {
          // 기본 props 타입 정의 (모듈에 따라 달라질 수 있음)
          let propsType = "any";

          if (
            moduleName.includes("vapor-ui") ||
            moduleName.includes("@vapor-ui")
          ) {
            // vapor-ui 컴포넌트의 경우
            propsType = this.getVaporUIComponentProps(name);
          } else if (moduleName.includes("@mui")) {
            // Material-UI 컴포넌트의 경우
            propsType = `import('${moduleName}').${name}Props`;
          } else if (moduleName.includes("antd")) {
            // Ant Design 컴포넌트의 경우
            propsType = `import('${moduleName}').${name}Props`;
          } else {
            // 기본 React 컴포넌트 props
            propsType = "React.ComponentProps<any>";
          }

          componentDefs[name] = propsType;
        });

        this.registerComponents(componentDefs);
      }
    }
  }

  /**
   * vapor-ui 컴포넌트의 예상 props 타입 반환
   */
  private getVaporUIComponentProps(componentName: string): string {
    const vaporUIPropsMap: Record<string, string> = {
      Button:
        "{ variant?: 'solid' | 'outline' | 'ghost'; colorScheme?: string; size?: 'xs' | 'sm' | 'md' | 'lg'; isLoading?: boolean; onClick?: () => void; children: React.ReactNode }",
      Input:
        "{ variant?: 'outline' | 'filled' | 'flushed'; size?: 'xs' | 'sm' | 'md' | 'lg'; isInvalid?: boolean; placeholder?: string; value?: string; onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void }",
      Box: "{ p?: number | string; m?: number | string; bg?: string; w?: string | number; h?: string | number; children?: React.ReactNode }",
      Stack:
        "{ spacing?: number | string; direction?: 'row' | 'column'; align?: 'start' | 'center' | 'end'; children: React.ReactNode }",
      Text: "{ fontSize?: string; color?: string; fontWeight?: string; children: React.ReactNode }",
      Heading:
        "{ size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'; color?: string; children: React.ReactNode }",
      Flex: "{ direction?: 'row' | 'column'; align?: 'start' | 'center' | 'end'; justify?: 'start' | 'center' | 'end' | 'space-between'; children: React.ReactNode }",
      Card: "{ variant?: 'elevated' | 'outline' | 'filled'; p?: number | string; children: React.ReactNode }",
      Modal:
        "{ isOpen: boolean; onClose: () => void; size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'; children: React.ReactNode }",
      Alert:
        "{ status?: 'success' | 'error' | 'warning' | 'info'; variant?: 'solid' | 'subtle' | 'outline'; children: React.ReactNode }",
    };

    return (
      vaporUIPropsMap[componentName] ||
      "{ children?: React.ReactNode; [key: string]: any }"
    );
  }

  /**
   * 캐시 관리 기능
   */
  getCacheStats() {
    return globalTypeCache.getStats();
  }

  clearCache(): void {
    globalTypeCache.clear();
    this.loadedModules.clear();
    console.log("🗑️ Cleared type cache and loaded modules");
  }

  /**
   * 로드된 모듈 목록 조회
   */
  getLoadedModules(): string[] {
    return Array.from(this.loadedModules);
  }

  /**
   * 현재 로딩 중인 모듈 목록 조회
   */
  getLoadingModules(): string[] {
    return Array.from(this.loadingQueue);
  }

  /**
   * 컴포넌트 타입 동적 등록 (JSX 자동완성용)
   */
  registerComponent(componentName: string, propsType: string): void {
    const componentTypes = `
declare global {
  namespace JSX {
    interface IntrinsicElements {
      ${componentName}: ${propsType};
    }
  }
}

declare const ${componentName}: React.ComponentType<${propsType}>;
`;

    this.monaco.languages.typescript.typescriptDefaults.addExtraLib(
      componentTypes,
      `file:///node_modules/@types/custom/${componentName}.d.ts`
    );

    console.log(`✅ Registered component: ${componentName}`);
  }

  /**
   * 여러 컴포넌트를 일괄 등록
   */
  registerComponents(components: Record<string, string>): void {
    Object.entries(components).forEach(([name, propsType]) => {
      this.registerComponent(name, propsType);
    });
  }

  /**
   * 지원되는 라이브러리 목록 조회
   */
  getSupportedLibraries(): string[] {
    return [...this.config.supportedLibraries];
  }

  /**
   * Monaco 컴파일러 옵션 설정
   */
  private setupCompilerOptions(): void {
    this.monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
      target: this.monaco.languages.typescript.ScriptTarget.ESNext,
      module: this.monaco.languages.typescript.ModuleKind.ESNext,
      moduleResolution:
        this.monaco.languages.typescript.ModuleResolutionKind.NodeJs,
      jsx: this.monaco.languages.typescript.JsxEmit.React,
      jsxFactory: "React.createElement",
      jsxFragmentFactory: "React.Fragment",
      allowSyntheticDefaultImports: true,
      esModuleInterop: true,
      resolvePackageJsonExports: true,
      allowNonTsExtensions: true,
      skipLibCheck: true,
      strict: false,
      noImplicitAny: false,
      noImplicitReturns: false,
      noUnusedLocals: false,
      noUnusedParameters: false,
      // JSX 자동완성을 위한 추가 옵션
      declaration: true,
      declarationMap: true,
      sourceMap: true,
      // JSX에서 import 자동 생성 활성화
      includePackageJsonAutoImports: "on",
      // 타입 체킹 강화
      lib: ["ES2020", "DOM", "DOM.Iterable"],
      // JSX 네임스페이스 명시적 설정
      reactNamespace: "React",
    });

    this.monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
      noSemanticValidation: false,
      noSyntaxValidation: false,
      noSuggestionDiagnostics: false,
      // IntelliSense 성능 향상을 위한 옵션
      diagnosticCodesToIgnore: [
        1375, // File is a CommonJS module; it may be converted to an ES6 module.
        1378, // Top-level 'await' expressions are only allowed when the 'module' option is set to 'es2022', 'esnext', 'system', 'node12', or 'nodenext', and the 'target' option is set to 'es2017' or higher.
        2307, // Cannot find module (외부 모듈의 경우)
      ],
    });

    this.monaco.languages.typescript.typescriptDefaults.setEagerModelSync(true);

    // JavaScript 컴파일러 옵션도 설정
    this.monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
      target: this.monaco.languages.typescript.ScriptTarget.ESNext,
      allowNonTsExtensions: true,
      allowSyntheticDefaultImports: true,
      esModuleInterop: true,
      jsx: this.monaco.languages.typescript.JsxEmit.React,
      jsxFactory: "React.createElement",
      jsxFragmentFactory: "React.Fragment",
      reactNamespace: "React",
      lib: ["ES2020", "DOM", "DOM.Iterable"],
    });
  }

  /**
   * 필수 라이브러리 로드
   */
  private async loadEssentialLibraries(): Promise<void> {
    const essentialLibs = ["react", "react-dom"];
    console.log("📦 Loading essential libraries...");

    await this.loadLibraries(essentialLibs);

    // JSX Runtime 타입 추가
    const jsxRuntimeTypes = `
declare module 'react/jsx-runtime' {
  import { ReactElement } from 'react';
  export function jsx(type: any, props: any, key?: string | number | null): ReactElement;
  export function jsxs(type: any, props: any, key?: string | number | null): ReactElement;
  export { Fragment } from 'react';
}

declare module 'react/jsx-dev-runtime' {
  export * from 'react/jsx-runtime';
}`;

    this.monaco.languages.typescript.typescriptDefaults.addExtraLib(
      jsxRuntimeTypes,
      "file:///node_modules/@types/react/jsx-runtime.d.ts"
    );

    // React 네임스페이스와 JSX 컴포넌트 타입 정의 추가
    const reactJSXTypes = `
import * as React from 'react';

declare global {
  namespace JSX {
    interface Element extends React.ReactElement<any, any> {}
    interface ElementClass extends React.Component<any> {}
    interface ElementAttributesProperty { props: {}; }
    interface ElementChildrenAttribute { children: {}; }
    interface IntrinsicAttributes extends React.Attributes {}
    interface IntrinsicClassAttributes<T> extends React.ClassAttributes<T> {}
    
    interface IntrinsicElements {
      [elemName: string]: any;
      
      // HTML Elements
      div: React.DetailedHTMLProps<React.HTMLAttributes<HTMLDivElement>, HTMLDivElement>;
      span: React.DetailedHTMLProps<React.HTMLAttributes<HTMLSpanElement>, HTMLSpanElement>;
      button: React.DetailedHTMLProps<React.ButtonHTMLAttributes<HTMLButtonElement>, HTMLButtonElement>;
      input: React.DetailedHTMLProps<React.InputHTMLAttributes<HTMLInputElement>, HTMLInputElement>;
      form: React.DetailedHTMLProps<React.FormHTMLAttributes<HTMLFormElement>, HTMLFormElement>;
      h1: React.DetailedHTMLProps<React.HTMLAttributes<HTMLHeadingElement>, HTMLHeadingElement>;
      h2: React.DetailedHTMLProps<React.HTMLAttributes<HTMLHeadingElement>, HTMLHeadingElement>;
      h3: React.DetailedHTMLProps<React.HTMLAttributes<HTMLHeadingElement>, HTMLHeadingElement>;
      p: React.DetailedHTMLProps<React.HTMLAttributes<HTMLParagraphElement>, HTMLParagraphElement>;
      ul: React.DetailedHTMLProps<React.HTMLAttributes<HTMLUListElement>, HTMLUListElement>;
      li: React.DetailedHTMLProps<React.LiHTMLAttributes<HTMLLIElement>, HTMLLIElement>;
      a: React.DetailedHTMLProps<React.AnchorHTMLAttributes<HTMLAnchorElement>, HTMLAnchorElement>;
      img: React.DetailedHTMLProps<React.ImgHTMLAttributes<HTMLImageElement>, HTMLImageElement>;
    }
  }
}

// React 컴포넌트 타입 정의 확장
declare namespace React {
  type FC<P = {}> = FunctionComponent<P>;
  
  interface FunctionComponent<P = {}> {
    (props: PropsWithChildren<P>, context?: any): ReactElement<any, any> | null;
    propTypes?: WeakValidationMap<P> | undefined;
    contextTypes?: ValidationMap<any> | undefined;
    defaultProps?: Partial<P> | undefined;
    displayName?: string | undefined;
  }
}`;

    this.monaco.languages.typescript.typescriptDefaults.addExtraLib(
      reactJSXTypes,
      "file:///node_modules/@types/react/jsx-global.d.ts"
    );

    // 추가적인 React 네임스페이스 설정
    const reactNamespaceTypes = `
import React from 'react';

declare global {
  const React: typeof import('react');
  
  // JSX 팩토리 함수 전역 선언
  namespace React {
    function createElement<P extends {}>(
      type: string | React.ComponentType<P>,
      props?: (React.Attributes & P) | null,
      ...children: React.ReactNode[]
    ): React.ReactElement<P>;
    
    const Fragment: React.ExoticComponent<{ children?: React.ReactNode }>;
  }
}`;

    this.monaco.languages.typescript.typescriptDefaults.addExtraLib(
      reactNamespaceTypes,
      "file:///node_modules/@types/react/namespace.d.ts"
    );

    // 일반적인 UI 컴포넌트들 사전 등록
    await this.registerCommonComponents();
  }

  /**
   * 일반적인 UI 컴포넌트들 사전 등록
   */
  private async registerCommonComponents(): Promise<void> {
    console.log("🎨 Registering common UI components...");

    // 기본 HTML-like 컴포넌트들
    const basicComponents = {
      Button:
        "React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'outline'; size?: 'sm' | 'md' | 'lg' }",
      Input:
        "React.InputHTMLAttributes<HTMLInputElement> & { variant?: 'outline' | 'filled'; error?: boolean }",
      Card: "React.HTMLAttributes<HTMLDivElement> & { variant?: 'elevated' | 'outlined' }",
      Modal:
        "{ isOpen: boolean; onClose: () => void; title?: string; children: React.ReactNode }",
      Tooltip:
        "{ content: string; placement?: 'top' | 'bottom' | 'left' | 'right'; children: React.ReactElement }",
      Spinner: "{ size?: 'sm' | 'md' | 'lg'; color?: string }",
      Alert:
        "{ type?: 'info' | 'success' | 'warning' | 'error'; title?: string; children: React.ReactNode }",
      Badge:
        "{ variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'error'; children: React.ReactNode }",
      Avatar:
        "{ src?: string; alt?: string; size?: 'sm' | 'md' | 'lg'; fallback?: string }",
      Dropdown:
        "{ trigger: React.ReactElement; children: React.ReactNode; placement?: 'bottom-start' | 'bottom-end' }",
    };

    this.registerComponents(basicComponents);

    // vapor-ui 컴포넌트들 (예상되는 컴포넌트들)
    const vaporUIComponents = {
      VButton:
        "{ variant?: 'solid' | 'outline' | 'ghost'; colorScheme?: string; size?: 'xs' | 'sm' | 'md' | 'lg'; isLoading?: boolean; children: React.ReactNode }",
      VInput:
        "{ variant?: 'outline' | 'filled' | 'flushed'; size?: 'xs' | 'sm' | 'md' | 'lg'; isInvalid?: boolean; placeholder?: string }",
      VBox: "{ p?: number | string; m?: number | string; bg?: string; children?: React.ReactNode }",
      VStack:
        "{ spacing?: number | string; align?: 'start' | 'center' | 'end'; children: React.ReactNode }",
      VText:
        "{ fontSize?: string; color?: string; fontWeight?: string; children: React.ReactNode }",
      VHeading:
        "{ size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'; color?: string; children: React.ReactNode }",
      VFlex:
        "{ direction?: 'row' | 'column'; align?: 'start' | 'center' | 'end'; justify?: 'start' | 'center' | 'end' | 'between'; children: React.ReactNode }",
    };

    this.registerComponents(vaporUIComponents);
  }

  /**
   * 코드 분석기 설정
   */
  private setupCodeAnalyzer(): void {
    const models = this.monaco.editor.getModels();

    models.forEach((model) => {
      let debounceTimeout: NodeJS.Timeout;

      model.onDidChangeContent(() => {
        clearTimeout(debounceTimeout);
        debounceTimeout = setTimeout(() => {
          this.analyzeAndLoadTypes(model.getValue());
        }, this.config.debounceMs);
      });
    });
  }

  /**
   * 코드에서 import 구문 추출
   */
  private extractImports(code: string): string[] {
    const imports = new Set<string>();

    // 다양한 import 패턴 매칭
    const patterns = [
      /import\s+[\w\s{},*]+\s+from\s+['"]([^'"]+)['"]/g,
      /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
      /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
    ];

    console.log("🔍 Analyzing code for imports...");
    console.log("Code:", code.slice(0, 200) + "...");

    patterns.forEach((pattern, index) => {
      let match;
      while ((match = pattern.exec(code)) !== null) {
        const moduleName = match[1];
        console.log(`Pattern ${index + 1} found: "${moduleName}"`);

        // 상대 경로와 Node.js 내장 모듈 제외
        if (
          !moduleName.startsWith(".") &&
          !moduleName.startsWith("/") &&
          !moduleName.startsWith("node:") &&
          !["fs", "path", "os", "crypto", "util", "events"].includes(moduleName)
        ) {
          // 스코프 패키지 처리
          const cleanModuleName = moduleName.startsWith("@")
            ? moduleName.split("/").slice(0, 2).join("/")
            : moduleName.split("/")[0];

          console.log(
            `Adding import: "${cleanModuleName}" (from "${moduleName}")`
          );
          imports.add(cleanModuleName);
        } else {
          console.log(`Skipping: "${moduleName}" (relative/internal module)`);
        }
      }
    });

    const result = Array.from(imports);
    console.log(`Found ${result.length} unique imports:`, result);
    return result;
  }

  /**
   * 배열을 청크로 나누기
   */
  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }
}

// 전역 인스턴스 (싱글톤 패턴)
let globalIntelliSenseManager: IntelliSenseManager | null = null;

export function getIntelliSenseManager(
  monaco?: typeof import("monaco-editor")
): IntelliSenseManager | null {
  if (!globalIntelliSenseManager && monaco) {
    globalIntelliSenseManager = new IntelliSenseManager(monaco);
  }
  return globalIntelliSenseManager;
}

export function createIntelliSenseManager(
  monaco: typeof import("monaco-editor"),
  config?: Partial<IntelliSenseConfig>
): IntelliSenseManager {
  globalIntelliSenseManager = new IntelliSenseManager(monaco, config);
  return globalIntelliSenseManager;
}
