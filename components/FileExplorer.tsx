import React, { useState, useRef, useEffect } from 'react';

interface Props {
  files: Record<string, string>;
  activeFile: string;
  onSelectFile: (name: string) => void;
  onCreateFile: (name: string) => void;
  theme: 'dark' | 'light';
}

export const FileExplorer: React.FC<Props> = ({ files, activeFile, onSelectFile, onCreateFile, theme }) => {
  const [isCreating, setIsCreating] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [fileSearch, setFileSearch] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isCreating && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isCreating]);

  const handleCreateSubmit = () => {
    if (newFileName.trim()) {
      onCreateFile(newFileName.trim());
    }
    setIsCreating(false);
    setNewFileName('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleCreateSubmit();
    if (e.key === 'Escape') {
      setIsCreating(false);
      setNewFileName('');
    }
  };

  const filteredFiles = Object.keys(files).sort().filter(fileName => 
    fileName.toLowerCase().includes(fileSearch.toLowerCase())
  );

  const headerText = theme === 'dark' ? 'text-gray-400' : 'text-gray-600';
  const buttonClass = theme === 'dark' ? 'text-gray-500 hover:text-white hover:bg-gray-700' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-200';
  const inputBg = theme === 'dark' ? 'bg-gray-800 border-gray-700 text-gray-300 placeholder-gray-600' : 'bg-white border-gray-300 text-gray-800 placeholder-gray-400';
  const itemActive = theme === 'dark' ? 'bg-blue-900/20 text-blue-300 border-blue-500' : 'bg-blue-100 text-blue-700 border-blue-500';
  const itemInactive = theme === 'dark' ? 'border-transparent text-gray-400 hover:text-gray-200 hover:bg-gray-800' : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-200';
  const createBg = theme === 'dark' ? 'bg-gray-800 text-white' : 'bg-white text-gray-800 border border-gray-300';

  return (
    <div className="h-full flex flex-col">
      <div className={`p-3 pb-2 text-xs font-bold uppercase tracking-wider flex justify-between items-center group ${headerText}`}>
        <span>Explorer</span>
        <button 
          onClick={() => setIsCreating(true)} 
          className={`p-1 rounded transition-colors ${buttonClass}`} 
          title="New File"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>
        </button>
      </div>

      {/* File Name Search Bar */}
      <div className="px-3 pb-2">
         <div className="relative">
            <input 
              className={`w-full text-xs px-2 py-1 focus:border-blue-500 outline-none rounded-sm border ${inputBg}`}
              placeholder="Filter files..."
              value={fileSearch}
              onChange={e => setFileSearch(e.target.value)}
            />
            {fileSearch && (
              <button 
                className="absolute right-1 top-1 text-gray-500 hover:text-gray-300"
                onClick={() => setFileSearch('')}
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            )}
         </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {isCreating && (
          <div className={`px-4 py-1 flex items-center border-l-2 border-blue-500 ${createBg}`}>
             <span className="mr-2 opacity-50 text-sm">#</span>
             <input
               ref={inputRef}
               className="bg-transparent border-none text-inherit text-sm outline-none w-full font-mono"
               value={newFileName}
               onChange={e => setNewFileName(e.target.value)}
               onKeyDown={handleKeyDown}
               onBlur={handleCreateSubmit}
               placeholder="filename.klang"
             />
          </div>
        )}
        
        {filteredFiles.length === 0 && !isCreating && (
           <div className={`px-4 py-2 text-xs italic ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`}>No files match</div>
        )}

        {filteredFiles.map(fileName => (
          <div 
            key={fileName}
            onClick={() => onSelectFile(fileName)}
            className={`px-4 py-1 cursor-pointer text-sm flex items-center border-l-2 transition-colors ${
              activeFile === fileName ? itemActive : itemInactive
            }`}
          >
            <span className="mr-2 opacity-50 text-xs">
               {fileName.endsWith('.klib') ? '{}' : '#'}
            </span>
            <span className="truncate">{fileName}</span>
          </div>
        ))}
      </div>
    </div>
  );
};