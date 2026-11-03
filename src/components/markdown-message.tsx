"use client";

import * as React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

interface CodeBlockProps {
  language: string;
  value: string;
}

const CodeBlock = ({ language, value }: CodeBlockProps) => {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard unavailable; ignore
    }
  };

  return (
    <div className="group relative my-2 overflow-hidden rounded-xl bg-green-950 text-green-50">
      <div className="flex items-center justify-between border-b border-green-800/60 px-3 py-1.5">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-green-300">
          {language || "code"}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-semibold text-green-200 transition-colors hover:bg-green-800 hover:text-green-50"
        >
          {copied ? (
            <>
              <Check className="size-3" /> Copied
            </>
          ) : (
            <>
              <Copy className="size-3" /> Copy
            </>
          )}
        </button>
      </div>
      <pre className="overflow-x-auto p-3 font-mono text-xs leading-relaxed">
        <code>{value}</code>
      </pre>
    </div>
  );
};

export interface MarkdownMessageProps {
  content: string;
  className?: string;
}

export const MarkdownMessage = ({ content, className }: MarkdownMessageProps) => {
  return (
    <div className={cn("break-words min-w-0", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className="mt-3 mb-1 text-base font-semibold text-green-950">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="mt-3 mb-1 text-sm font-semibold text-green-950">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="mt-3 mb-1 text-sm font-semibold text-green-950">{children}</h3>
          ),
          p: ({ children }) => (
            <p className="mb-2 text-sm leading-relaxed last:mb-0">{children}</p>
          ),
          ul: ({ children }) => (
            <ul className="mb-2 list-disc space-y-1 pl-5 last:mb-0">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="mb-2 list-decimal space-y-1 pl-5 last:mb-0">{children}</ol>
          ),
          li: ({ children }) => <li className="text-sm">{children}</li>,
          strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
          em: ({ children }) => <em className="italic">{children}</em>,
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-green-700 underline underline-offset-2 hover:text-green-800"
            >
              {children}
            </a>
          ),
          blockquote: ({ children }) => (
            <blockquote className="my-2 border-l-2 border-green-200 pl-3 text-sm italic text-slate-600">
              {children}
            </blockquote>
          ),
          code: ({ className: codeClassName, children, ...props }) => {
            const match = /language-(\w+)/.exec(codeClassName || "");
            const isBlock = Boolean(match) || String(children).includes("\n");
            if (isBlock) {
              return (
                <CodeBlock
                  language={match ? match[1] : ""}
                  value={String(children).replace(/\n$/, "")}
                />
              );
            }
            return (
              <code
                className="rounded bg-green-50 px-1.5 py-0.5 font-mono text-[0.85em] text-green-900"
                {...props}
              >
                {children}
              </code>
            );
          },
          table: ({ children }) => (
            <div className="my-2 overflow-x-auto">
              <table className="w-full border-collapse text-sm">{children}</table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="border-b border-slate-200">{children}</thead>
          ),
          th: ({ children }) => (
            <th className="px-2 py-1 text-left font-semibold text-slate-700">{children}</th>
          ),
          td: ({ children }) => (
            <td className="border-t border-slate-100 px-2 py-1 text-slate-600">{children}</td>
          ),
          hr: () => <hr className="my-3 border-slate-200" />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};
