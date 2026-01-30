import React, { useState, useMemo } from 'react';

interface Props {
  files: Record<string, string>;
  onOpenFile: (file: string) => void;
  theme: 'dark' | 'light';
}

export const SearchPane: React.FC<Props> = ({ files, onOpenFile, theme }) => {
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

  const borderClass = theme === 'dark' ? 'border-gray-700' : 'border-gray-300';
  const headerText = theme === 'dark' ? 'text-gray-400' : 'text-gray-600';
  const inputBg = theme === 'dark' ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-600' : 'bg-white border-gray-300 text-gray-800 placeholder-gray-400';
  const itemHover = theme === 'dark' ? 'hover:bg-gray-800 border-gray-800/50' : 'hover:bg-gray-200 border-gray-200';
  const filenameColor = theme === 'dark' ? 'text-blue-300' : 'text-blue-600';
  const textColor = theme === 'dark' ? 'text-gray-400' : 'text-gray-600';

  return (
    <div className={`w-64 border-r flex flex-col ${borderClass}`}>
       <div className={`p-3 text-xs font-bold uppercase tracking-wider ${headerText}`}>
        Search
      </div>
      <div className="px-2 pb-2">
        <input 
          className={`w-full text-xs p-2 focus:border-blue-500 outline-none rounded-sm border ${inputBg}`}
          placeholder="Search in files..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          autoFocus
        />
      </div>
      <div className="flex-1 overflow-y-auto">
         {query && results.length === 0 && (
           <div className={`p-4 text-xs text-center ${textColor}`}>No results found</div>
         )}
         {results.map((hit, i) => (
           <div 
             key={i} 
             className={`px-4 py-2 cursor-pointer group border-b last:border-0 ${itemHover}`}
             onClick={() => onOpenFile(hit.filename)}
           >
             <div className={`text-xs font-bold mb-0.5 flex justify-between ${filenameColor}`}>
                <span>{hit.filename}</span>
                <span className={`group-hover:opacity-100 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`}>:{hit.line}</span>
             </div>
             <div className={`text-xs truncate font-mono opacity-80 group-hover:opacity-100 ${textColor}`}>{hit.text}</div>
           </div>
         ))}
      </div>
    </div>
  );
};