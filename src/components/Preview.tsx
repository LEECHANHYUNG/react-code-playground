import { useEffect, useState } from "react";
import { bundle } from "../utils/bundler";
interface PreviewProps {
  code: string;
  extraLibs?: string[];
}
const htmlTemplate = (code: string, extraLibs: string[] = []) => {
  const imports: Record<string, string> = {
    react: "https://esm.sh/react",
    "react/": "https://esm.sh/react/",
    "react-dom": "https://esm.sh/react-dom",
    "react-dom/": "https://esm.sh/react-dom/",
    "@radix-ui/react-switch": "https://esm.sh/@radix-ui/react-switch",
    "@vapor-ui/core": "https://esm.sh/@vapor-ui/core?external=react,react-dom",
  };

  extraLibs.forEach((pkg) => {
    imports[pkg] = `https://esm.sh/${pkg}`;
    // Support subpath imports (e.g. lodash/)
    if (!pkg.endsWith("/")) {
      imports[`${pkg}/`] = `https://esm.sh/${pkg}/`;
    }
  });

  const importMapJSON = JSON.stringify({ imports });

  return `<!DOCTYPE html>
  <html>
    <head>
      <link rel="stylesheet" href="https://esm.sh/@vapor-ui/core/dist/styles.css" />
      <style>
        body {
          margin: 0;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
            'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
            sans-serif;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }
      </style>
    </head>
    <body>
      <div id="root"></div>
      <script type="importmap">${importMapJSON}</script>
      <script type="module">
        window.addEventListener('error', (e) => {
          document.body.innerHTML = '<pre style="color: red;">' + e.error + '</pre>';
        });

        ${code}
      </script>
    </body>
  </html>`;
};

function Preview({ code }: PreviewProps) {
  const [srcDoc, setSrcDoc] = useState("");

  useEffect(() => {
    const transpileAndRender = async () => {
      try {
        const transformed = await bundle(code);
        const html = htmlTemplate(transformed);
        setSrcDoc(html);
      } catch (err) {
        setSrcDoc(`<pre style="color:red;">${(err as Error).message}</pre>`);
      }
    };

    transpileAndRender();
  }, [code]);

  return (
    <iframe
      key={srcDoc} // srcDoc이 바뀔 때마다 새로 렌더링
      srcDoc={srcDoc}
      title="preview"
      sandbox="allow-scripts allow-same-origin"
      style={{ width: "100%", height: "100%", border: "none" }}
    />
  );
}

export default Preview;
