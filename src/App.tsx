import { useState } from "react";
import Editor from "./components/Editor";
import Preview from "./components/Preview";

function App() {
  const [code, setCode] = useState('console.log("Hello, world!")');

  return (
    <div className="w-screen h-screen flex">
      <div className="w-1/2 h-full flex flex-col">
        <div className="bg-gray-800 text-white px-4 py-2 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Code Editor</h2>
        </div>
        <Editor
          code={code}
          onCodeChange={(value: string | undefined) => setCode(value || "")}
        />
      </div>

      <div className="w-1/2 h-full flex flex-col bg-gray-900 border-l border-gray-700">
        <div className="bg-gray-800 text-white px-4 py-2">
          <h2 className="text-lg font-semibold">Preview</h2>
        </div>
        <Preview code={code} />
      </div>
    </div>
  );
}

export default App;
