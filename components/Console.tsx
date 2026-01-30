import React from 'react';

interface Props {
  logs: string[];
  errors: string[];
  theme: 'dark' | 'light';
}

export const Console: React.FC<Props> = ({ logs, errors, theme }) => {
  const bgClass = theme === 'dark' ? 'bg-black text-gray-300' : 'bg-white text-gray-800 border-t border-gray-200';
  const headerBg = theme === 'dark' ? 'bg-gray-900 border-gray-700' : 'bg-gray-100 border-gray-200';
  const headerText = theme === 'dark' ? 'text-gray-300' : 'text-gray-700';
  const headerInactive = theme === 'dark' ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600';

  return (
    <div className={`flex flex-col h-full font-mono text-xs border-t ${bgClass} ${theme === 'dark' ? 'border-gray-700' : 'border-gray-300'}`}>
      <div className={`flex border-b ${headerBg}`}>
         <div className={`px-4 py-1 border-b-2 border-blue-500 uppercase text-[10px] font-bold tracking-widest cursor-pointer ${headerText}`}>
           Terminal
         </div>
         <div className={`px-4 py-1 uppercase text-[10px] font-bold tracking-widest cursor-pointer ${headerInactive}`}>
           Problems {errors.length > 0 && `(${errors.length})`}
         </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-3 space-y-1 font-mono">
        {logs.length === 0 && errors.length === 0 && (
           <div className="text-gray-500">Waiting for compiler output...</div>
        )}
        
        {errors.map((err, i) => (
          <div key={`err-${i}`} className="text-red-500 flex items-start">
            <span className="mr-2">✖</span>
            <span>{err}</span>
          </div>
        ))}
        
        {logs.map((log, i) => (
          <div key={`log-${i}`} className="flex items-start">
            <span className="mr-2 text-green-600">➜</span>
            <span>{log.replace('> ', '')}</span>
          </div>
        ))}
      </div>
    </div>
  );
};