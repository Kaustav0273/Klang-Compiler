import React, { useState, useMemo } from 'react';

interface Props {
  files: Record<string, string>;
  onOpenFile: (file: string) => void;
}

export const SearchPane: React.FC<Props> = ({ files, onOpenFile }) => {
  const [query, setQuery] = useState('');

  const results = useMemo(() => {
    if (!query) return [];
    const hits: { filename: string, line: number, text: string }[] = [];
    for (const [filename, content] of Object.entries(files)) {
      const strContent = content as string;
      const lines = strContent.split('\n');
      lines.forEach((line, idx) => {
        if (line.toLowerCase().includes(query.toLowerCase())) {
          hits.push({ filename, line: idx + 1, text: line.trim() });
        }
      });
    }
    return hits;
  }, [query, files]);

  return (
    <div className="w-64 bg-gray-900 border-r border-gray-700 flex flex-col">
       <div className="p-3 text-xs font-bold text-gray-400 uppercase tracking-wider">
        Search
      </div>
      <div className="px-2 pb-2">
        <input 
          className="w-full bg-gray-800 border border-gray-700 text-white text-xs p-2 focus:border-blue-500 outline-none rounded-sm placeholder-gray-600"
          placeholder="Search in files..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          autoFocus
        />
      </div>
      <div className="flex-1 overflow-y-auto">
         {query && results.length === 0 && (
           <div className="p-4 text-gray-500 text-xs text-center">No results found</div>
         )}
         {results.map((hit, i) => (
           <div 
             key={i} 
             className="px-4 py-2 hover:bg-gray-800 cursor-pointer group border-b border-gray-800/50 last:border-0"
             onClick={() => onOpenFile(hit.filename)}
           >
             <div className="text-blue-300 text-xs font-bold mb-0.5 flex justify-between">
                <span>{hit.filename}</span>
                <span className="text-gray-600 group-hover:text-gray-500">:{hit.line}</span>
             </div>
             <div className="text-gray-400 text-xs truncate font-mono opacity-80 group-hover:opacity-100">{hit.text}</div>
           </div>
         ))}
      </div>
    </div>
  );
};