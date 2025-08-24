import * as esbuild from "esbuild-wasm";

let initializePromise: Promise<void> | null = null;

/**
 * Ensure esbuild is initialized only once, even with concurrent calls
 */
const ensureInitialized = async (): Promise<void> => {
  if (initializePromise) {
    return initializePromise;
  }

  initializePromise = esbuild.initialize({
    // Remote WASM binary that can be fetched in the browser at runtime
    wasmURL: "https://esm.sh/esbuild-wasm/esbuild.wasm",
    worker: true,
  });

  return initializePromise;
};

/**
 * Transpile TypeScript / TSX (including JSX) to plain JavaScript (ESM) in the browser
 * Now supports automatic React wrapper for component-only code
 */
export const bundle = async (rawCode: string): Promise<string> => {
  await ensureInitialized();

  // Check if user code already contains createRoot (full app mode)
  const hasCreateRoot =
    rawCode.includes("createRoot") || rawCode.includes("render");

  if (hasCreateRoot) {
    // User provided complete app code, use simple transform
    const result = await esbuild.transform(rawCode, {
      loader: "tsx",
      jsx: "automatic",
      format: "esm",
      jsxImportSource: "react",
    });
    return result.code;
  } else {
    // For component-only code, wrap it with createRoot and ThemeProvider
    const wrappedCode = `
import { createRoot } from 'react-dom/client';
import { ThemeProvider } from '@vapor-ui/core';

${rawCode}

const root = createRoot(document.getElementById('root')!);
root.render(
  <ThemeProvider>
    <App />
  </ThemeProvider>
);
`;

    const result = await esbuild.transform(wrappedCode, {
      loader: "tsx",
      jsx: "automatic",
      format: "esm",
      jsxImportSource: "react",
    });

    return result.code;
  }
};
