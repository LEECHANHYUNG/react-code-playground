import type * as monaco from "monaco-editor";

let instance: typeof monaco | null = null;

export const setMonacoInstance = (m: typeof monaco) => {
  instance = m;
};

export const getMonacoInstance = (): typeof monaco | null => instance;
