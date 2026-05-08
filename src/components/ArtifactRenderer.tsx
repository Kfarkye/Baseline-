import React, { useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { 
  SandpackProvider, 
  SandpackLayout, 
  SandpackPreview,
  SandpackCodeEditor
} from '@codesandbox/sandpack-react';

class ErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean, error: any}> {
  constructor(props: {children: React.ReactNode}) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any) {
    fetch('/api/log-error', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'ArtifactRenderer Error: ' + (error ? error.stack : '') })
    });
  }

  render() {
    if (this.state.hasError) {
      return <div className="text-red-500 p-4 border border-red-500 rounded">Error rendering artifact: {String(this.state.error)}</div>;
    }
    return this.props.children;
  }
}

export function ArtifactRenderer({ content }: { content: string }) {
  const [mode, setMode] = useState<'preview' | 'code'>('preview');

  const { textContent, codeBlock } = useMemo(() => {
    // Exact logic requested: simple regex matching typescript react codeblocks
    const tsxRegex = /```(?:tsx|jsx|react)\n([\s\S]*?)```/;
    const match = content.match(tsxRegex);
    if (match) {
      return {
        textContent: content.replace(tsxRegex, '').trim(),
        codeBlock: match[1]
      };
    }

    const rechartsRegex = /```(?:recharts)\n([\s\S]*?)```/;
    const rMatch = content.match(rechartsRegex);
    if (rMatch) {
       return {
          textContent: content.replace(rechartsRegex, '').trim(),
          codeBlock: rMatch[1] // Same handler for now
       }
    }

    return { textContent: content, codeBlock: null };
  }, [content]);

  return (
    <ErrorBoundary>
      <div className="space-y-4 w-full">
      {textContent && (
        <div className="markdown-body prose prose-zinc max-w-none text-zinc-700 font-light text-base leading-relaxed">
          <ReactMarkdown
               remarkPlugins={[remarkGfm]}
               components={{
                p: ({ children }) => (
                  <p className="mb-6 last:mb-0 text-zinc-700 leading-relaxed font-light">
                    {children}
                  </p>
                ),
                strong: ({ children }) => (
                  <strong className="text-zinc-900 font-semibold">{children}</strong>
                ),
                table: ({ children }) => (
                  <div className="w-full overflow-x-auto my-6 rounded-2xl border border-zinc-200 bg-zinc-50/50 backdrop-blur-sm">
                    <table className="w-full text-left border-collapse text-sm">
                      {children}
                    </table>
                  </div>
                ),
                thead: ({ children }) => (
                  <thead className="bg-white/50 border-b border-zinc-200">
                    {children}
                  </thead>
                ),
                tbody: ({ children }) => (
                  <tbody className="divide-y divide-zinc-100">
                    {children}
                  </tbody>
                ),
                tr: ({ children }) => (
                  <tr className="hover:bg-zinc-50/50 transition-colors">
                    {children}
                  </tr>
                ),
                th: ({ children }) => (
                  <th className="p-4 font-mono text-[10px] uppercase font-bold text-zinc-500 tracking-wider">
                    {children}
                  </th>
                ),
                td: ({ children }) => (
                  <td className="p-4 text-zinc-700 font-medium">
                    {children}
                  </td>
                ),
                li: ({ children }) => (
                  <li className="mb-2 list-disc ml-4">{children}</li>
                ),
               }}
          >{textContent}</ReactMarkdown>
        </div>
      )}
      
      {codeBlock && (
        <div className="w-full mt-6 rounded-[2rem] overflow-hidden border border-zinc-200/50 shadow-xl bg-white">
          <SandpackProvider
            template="react-ts"
            theme="auto"
            customSetup={{
              dependencies: {
                "lucide-react": "latest",
                "framer-motion": "latest",
                "motion": "latest",
                "recharts": "latest",
                "date-fns": "latest",
                "clsx": "latest",
                "tailwind-merge": "latest",
              }
            }}
            files={{
              "/App.tsx": {
                code: codeBlock,
                active: true,
              },
              "/public/index.html": {
                code: `<!DOCTYPE html>
<html lang="en">
  <head>
    <script src="https://cdn.tailwindcss.com"></script>
    
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&display=swap" rel="stylesheet">
    
    <script>
      tailwind.config = {
        theme: {
          extend: {
            fontFamily: {
              sans: ['Inter', 'sans-serif'],
              serif: ['"Playfair Display"', 'serif'],
              mono: ['"JetBrains Mono"', 'monospace'],
            }
          }
        }
      }
    </script>
  </head>
  <body class="p-4 md:p-6 antialiased bg-transparent">
    <div id="root"></div>
  </body>
</html>`,
              }
            }}
          >
            {/* The Toggle Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-zinc-50 border-b border-zinc-200">
              <div className="flex space-x-1.5 items-center">
                <div className="w-3 h-3 rounded-full bg-red-400" />
                <div className="w-3 h-3 rounded-full bg-amber-400" />
                <div className="w-3 h-3 rounded-full bg-emerald-400" />
              </div>
              <div className="p-1 max-w-[200px] grid grid-cols-2 bg-zinc-200/50 rounded-lg">
                <button
                  onClick={() => setMode('preview')}
                  className={`text-xs font-medium py-1 px-3 rounded-md transition-all ${
                    mode === 'preview'
                      ? "bg-white text-zinc-900 shadow-sm"
                      : "text-zinc-500 hover:text-zinc-700"
                  }`}
                >
                  Preview
                </button>
                <button
                  onClick={() => setMode('code')}
                  className={`text-xs font-medium py-1 px-3 rounded-md transition-all ${
                    mode === 'code'
                      ? "bg-white text-zinc-900 shadow-sm"
                      : "text-zinc-500 hover:text-zinc-700"
                  }`}
                >
                  Code
                </button>
              </div>
            </div>

            <SandpackLayout className="rounded-none overflow-hidden border-none !bg-transparent h-[500px]">
              {mode === 'preview' ? (
                <SandpackPreview
                  showOpenInCodeSandbox={false}
                  showRefreshButton={false}
                  className="w-full h-full min-h-[500px] border-none !bg-transparent"
                />
              ) : (
                <SandpackCodeEditor
                  showTabs={false}
                  showLineNumbers={true}
                  className="w-full h-full min-h-[500px] border-none"
                />
              )}
            </SandpackLayout>
          </SandpackProvider>
        </div>
      )}
    </div>
    </ErrorBoundary>
  );
}
