import React, { useState, useRef, useEffect } from 'react';

interface Props {
  files: Record<string, string>;
  activeFile: string;
  onSelectFile: (name: string) => void;
  onCreateFile: (name: string) => void;
}

export const FileExplorer: React.FC<Props> = ({ files, activeFile, onSelectFile, onCreateFile }) => {
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

  return (
    <div className="h-full flex flex-col bg-gray-900">
      <div className="p-3 pb-2 text-xs font-bold text-gray-400 uppercase tracking-wider flex justify-between items-center group">
        <span>Explorer</span>
        <button 
          onClick={() => setIsCreating(true)} 
          className="text-gray-500 hover:text-white p-1 rounded hover:bg-gray-700 transition-colors" 
          title="New File"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>
        </button>
      </div>

      {/* File Name Search Bar */}
      <div className="px-3 pb-2">
         <div className="relative">
            <input 
              className="w-full bg-gray-800 border border-gray-700 text-gray-300 text-xs px-2 py-1 focus:border-blue-500 outline-none rounded-sm placeholder-gray-600"
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
          <div className="px-4 py-1 flex items-center bg-gray-800 border-l-2 border-blue-500">
             <span className="mr-2 opacity-50 text-sm">#</span>
             <input
               ref={inputRef}
               className="bg-transparent border-none text-white text-sm outline-none w-full font-mono"
               value={newFileName}
               onChange={e => setNewFileName(e.target.value)}
               onKeyDown={handleKeyDown}
               onBlur={handleCreateSubmit}
               placeholder="filename.klang"
             />
          </div>
        )}
        
        {filteredFiles.length === 0 && !isCreating && (
           <div className="px-4 py-2 text-xs text-gray-600 italic">No files match</div>
        )}

        {filteredFiles.map(fileName => (
          <div 
            key={fileName}
            onClick={() => onSelectFile(fileName)}
            className={`px-4 py-1 cursor-pointer text-sm flex items-center border-l-2 transition-colors ${
              activeFile === fileName 
                ? 'bg-blue-900/20 text-blue-300 border-blue-500' 
                : 'border-transparent text-gray-400 hover:text-gray-200 hover:bg-gray-800'
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