import { useEffect, useRef } from "react";
import * as monaco from "monaco-editor";

function App() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      const editor = monaco.editor.create(containerRef.current, {
        value: 'console.log("Hello, world")',
        language: "javascript",
        theme: "vs-dark",
        automaticLayout: true,
        minimap: { enabled: false },
        fontSize: 14,
      });

      return () => {
        editor.dispose();
      };
    }
  }, []);

  return (
    <div
      ref={containerRef}
      className="w-screen h-screen fixed top-0 left-0"
    />
  );
}

export default App;
