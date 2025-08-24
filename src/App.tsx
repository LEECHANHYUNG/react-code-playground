import { useState } from "react";
import Editor from "./components/Editor";
import Preview from "./components/Preview";

function App() {
  const [code, setCode] = useState(`import React from 'react';
import { Button, Card, Text, Flex } from '@vapor-ui/core';

function App() {
  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
      <Card.Root variant="elevated" p={6}>
        <Card.Body>
          <Flex direction="column" spacing={4}>
            <Text fontSize="2xl" fontWeight="bold">
              Welcome to Code Playground!
            </Text>
            
            <Text color="gray.600">
              Try typing JSX components below and see the autocomplete in action:
            </Text>
          </Flex>
        </Card.Body>
        <Card.Footer>
          <Button 
              color="primary" 
            >
              Click me!
          </Button>
        </Card.Footer>
      </Card.Root>
    </div>
  );
}

export default App;`);

  return (
    <div className="w-screen h-screen flex">
      <div className="w-1/2 h-full flex flex-col">
        <div className="bg-gray-800 text-white px-4 py-2 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Code Editor</h2>
        </div>
        <Editor
          code={code}
          onChange={(value: string | undefined) => setCode(value || "")}
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
