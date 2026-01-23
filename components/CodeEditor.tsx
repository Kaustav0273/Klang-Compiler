import React, { useRef, useState, useEffect } from 'react';

interface Props {
  code: string;
  onChange: (val: string) => void;
}

const highlight = (code: string) => {
  // Escape HTML first to prevent XSS and rendering issues
  const escaped = code
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // Single pass regex to avoid replacing inside existing HTML tags
  const regex = /(\/\/.*)|("[^"]*")|\b(import|from|as|material|cube|modifier|group|not|local|mesh)\b|\b(pos|rotate|move|scale|color|texture|roughness|vertices|faces)\b|\b(\d+(?:\.\d+)?)\b|\b([A-Z][a-zA-Z0-9_]*)\b|([{}[\\]():=,.;])/g;

  return escaped.replace(regex, (match, comment, string, keyword, property, number, type, symbol) => {
    if (comment) return `<span class="text-green-500">${comment}</span>`;
    if (string) return `<span class="text-orange-300">${string}</span>`;
    if (keyword) return `<span class="text-purple-400 font-bold">${keyword}</span>`;
    if (property) return `<span class="text-blue-300">${property}</span>`;
    if (number) return `<span class="text-green-300">${number}</span>`;
    if (type) return `<span class="text-yellow-200">${type}</span>`;
    if (symbol) return `<span class="text-gray-500">${symbol}</span>`;
    return match;
  });
};

export const CodeEditor: React.FC<Props> = ({ code, onChange }) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const preRef = useRef<HTMLPreElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);

  const handleScroll = () => {
    if (textareaRef.current) {
      const { scrollTop, scrollLeft } = textareaRef.current;
      if (preRef.current) {
        preRef.current.scrollTop = scrollTop;
        preRef.current.scrollLeft = scrollLeft;
      }
      if (lineNumbersRef.current) {
        lineNumbersRef.current.scrollTop = scrollTop;
      }
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = e.currentTarget.selectionStart;
      const end = e.currentTarget.selectionEnd;
      const val = e.currentTarget.value;
      e.currentTarget.value = val.substring(0, start) + "  " + val.substring(end);
      e.currentTarget.selectionStart = e.currentTarget.selectionEnd = start + 2;
      onChange(e.currentTarget.value);
    }
  };

  const lineCount = code.split('\n').length;
  const lines = Array.from({ length: lineCount }, (_, i) => i + 1);

  return (
    <div className="flex w-full h-full bg-gray-950 overflow-hidden">
      {/* Line Numbers */}
      <div 
        ref={lineNumbersRef}
        className="w-12 bg-gray-900 border-r border-gray-800 text-right pr-2 pt-4 text-gray-600 font-mono text-sm select-none overflow-hidden"
        style={{ fontFamily: 'monospace', lineHeight: '1.5rem' }}
      >
        {lines.map(n => (
          <div key={n} className="h-6">{n}</div>
        ))}
        {/* Extra space at bottom matching padding */}
        <div className="h-4"></div>
      </div>

      {/* Editor Area */}
      <div className="relative flex-1 h-full font-mono text-sm overflow-hidden">
        {/* Highlight Layer */}
        <pre
          ref={preRef}
          className="absolute inset-0 p-4 margin-0 pointer-events-none whitespace-pre overflow-hidden"
          style={{ fontFamily: 'monospace', lineHeight: '1.5rem' }}
          dangerouslySetInnerHTML={{ __html: highlight(code) + '<br/>' }} 
        />
        
        {/* Input Layer */}
        <textarea
          ref={textareaRef}
          className="absolute inset-0 w-full h-full p-4 bg-transparent text-transparent caret-white outline-none resize-none whitespace-pre overflow-auto"
          style={{ fontFamily: 'monospace', lineHeight: '1.5rem' }}
          value={code}
          onChange={handleInput}
          onScroll={handleScroll}
          onKeyDown={handleKeyDown}
          spellCheck={false}
        />
      </div>
    </div>
  );
};