import Editor from "@monaco-editor/react";
import { useRef } from "react";
import { createIntelliSenseManager } from "~/utils/intelligenceManager";
import { setMonacoInstance } from "~/utils/monacoInstance";

// 디버깅을 위한 window 객체 확장
declare global {
  interface Window {
    debugIntelliSense?: () => void;
    testCompletion?: (line: number, col: number) => void;
    restartLanguageService?: () => void;
  }
}

interface CodeEditorProps {
  code: string;
  onChange: (value: string | undefined) => void;
}

const CodeEditor: React.FC<CodeEditorProps> = ({ code, onChange }) => {
  const intelligenceManagerRef = useRef<ReturnType<
    typeof createIntelliSenseManager
  > | null>(null);

  return (
    <div style={{ position: "relative", height: "100%" }}>
      <Editor
        height="100%"
        defaultLanguage="typescript"
        path="file:///src/index.tsx"
        theme="vs-dark"
        value={code}
        onChange={onChange}
        onMount={async (editor, monaco) => {
          setMonacoInstance(monaco);

          try {
            console.log("🚀 Initializing Enhanced TypeScript IntelliSense...");

            // 1. 명시적 모델 생성 및 URI 설정
            const uri = monaco.Uri.parse("file:///src/index.tsx");
            let model = monaco.editor.getModel(uri);

            if (!model) {
              model = monaco.editor.createModel(code, "typescript", uri);
              editor.setModel(model);
            }

            // 3. 통합 인텔리센스 관리자 생성 및 초기화
            const manager = createIntelliSenseManager(monaco, {
              enableCache: true,
              enableAutoLoading: true,
              debounceMs: 1000,
              maxConcurrentLoads: 3,
            });

            intelligenceManagerRef.current = manager;

            // 4. 인텔리센스 시스템 초기화
            await manager.initialize();
          } catch (error) {
            console.error("❌ Failed to setup enhanced IntelliSense:", error);
          }
        }}
        beforeMount={() => {
          // 7. TypeScript 워커 설정 (beforeMount에서 먼저 설정)
          self.MonacoEnvironment = {
            getWorker(_: string, label: string) {
              if (label === "typescript" || label === "javascript") {
                return new Worker(
                  new URL(
                    "monaco-editor/esm/vs/language/typescript/ts.worker.js",
                    import.meta.url
                  ),
                  { type: "module" }
                );
              }
              return new Worker(
                new URL(
                  "monaco-editor/esm/vs/editor/editor.worker.js",
                  import.meta.url
                ),
                { type: "module" }
              );
            },
          } as typeof self.MonacoEnvironment;
        }}
        options={{
          fontSize: 14,
          minimap: { enabled: false },
          wordWrap: "on",
          // IntelliSense 개선을 위한 추가 옵션
          quickSuggestions: {
            other: true,
            comments: false,
            strings: true,
          },
          quickSuggestionsDelay: 50, // 더 빠른 응답
          suggestOnTriggerCharacters: true,
          acceptSuggestionOnEnter: "on",
          acceptSuggestionOnCommitCharacter: true,
          snippetSuggestions: "top",
          wordBasedSuggestions: "off",
          // JSX 자동완성을 위한 추가 설정
          suggest: {
            showKeywords: true,
            showSnippets: true,
            showClasses: true,
            showFunctions: true,
            showConstructors: true,
            showFields: true,
            showVariables: true,
            showInterfaces: true,
            showModules: true,
            showProperties: true,
            showEvents: true,
            showOperators: true,
            showUnits: false,
            showValues: true,
            showConstants: true,
            showEnums: true,
            showEnumMembers: true,
            showColors: true,
            showFiles: false,
            showReferences: true,
            showFolders: false,
            showTypeParameters: true,
            showIssues: true,
            showUsers: false,
            filterGraceful: true,
            snippetsPreventQuickSuggestions: false,
            localityBonus: true,
            shareSuggestSelections: false,
            showInlineDetails: true,
          },
          // 파라미터 힌트 활성화
          parameterHints: {
            enabled: true,
            cycle: true,
          },
          // 호버 정보 활성화
          hover: {
            enabled: true,
            delay: 50, // 더 빠른 응답
            sticky: true,
          },
          // 코드 렌즈 활성화
          codeLens: true,
          // 자동 닫기 태그
          autoClosingBrackets: "always",
          autoClosingQuotes: "always",
          autoIndent: "full",
          // JSX 태그 자동 완성
          autoClosingOvertype: "always",
          autoSurround: "languageDefined",
        }}
      />

      {/* 스피너 애니메이션을 위한 CSS */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default CodeEditor;
