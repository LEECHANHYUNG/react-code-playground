import { Editor as MonacoEditor } from "@monaco-editor/react";

function Editor({
  code,
  onCodeChange,
}: {
  code: string;
  onCodeChange: (value: string | undefined) => void;
}) {
  return (
    <MonacoEditor
      value={code}
      onChange={onCodeChange}
      className="flex-1"
      options={{
        minimap: { enabled: false },
      }}
    />
  );
}

export default Editor;
