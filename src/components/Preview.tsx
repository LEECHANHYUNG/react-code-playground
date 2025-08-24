import { useRef } from "react";

interface PreviewProps {
  code: string;
  extraLibs?: string[];
}

const htmlTemplate = (code: string, extraLibs: string[] = []) => {
  const imports: Record<string, string> = {
    "react/": "https://esm.sh/react/",
    "react-dom/": "https://esm.sh/react-dom/",
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

function Preview({ code }: { code: string }) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const iframeContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Preview</title>
          <style>
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              margin: 0;
              padding: 16px;
              background: #1e1e1e;
              color: #d4d4d4;
            }
          </style>
        </head>
        <body>
          <script>
            (function() {
              const originalConsole = window.console;
              const console = {
                log: (...args) => {
                  window.parent.postMessage({
                    type: 'console.log',
                    args: args.map(arg => typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg))
                  }, '*');
                },
                error: (...args) => {
                  window.parent.postMessage({
                    type: 'console.error',
                    args: args.map(arg => String(arg))
                  }, '*');
                }
              };

              try {
                ${code}
              } catch (error) {
                window.parent.postMessage({
                  type: 'console.error',
                  args: [error.message]
                }, '*');
              }
            })();
          </script>
        </body>
      </html>
    `;

  const html = htmlTemplate(code);
  return (
    <iframe
      ref={iframeRef}
      className="w-full h-full border-0"
      title="Code Preview"
      sandbox="allow-scripts allow-same-origin"
      srcDoc={html} // srcdoc 속성을 사용하여 iframe 콘텐츠 렌더링
    />
  );
}

export default Preview;
