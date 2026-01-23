import React from 'react';

interface Props {
  logs: string[];
  errors: string[];
}

export const Console: React.FC<Props> = ({ logs, errors }) => {
  return (
    <div className="flex flex-col h-full bg-black font-mono text-xs border-t border-gray-700">
      <div className="flex border-b border-gray-700 bg-gray-900">
         <div className="px-4 py-1 text-gray-300 border-b-2 border-blue-500 uppercase text-[10px] font-bold tracking-widest cursor-pointer">
           Terminal
         </div>
         <div className="px-4 py-1 text-gray-500 hover:text-gray-300 uppercase text-[10px] font-bold tracking-widest cursor-pointer">
           Problems {errors.length > 0 && `(${errors.length})`}
         </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-3 space-y-1 font-mono">
        {logs.length === 0 && errors.length === 0 && (
           <div className="text-gray-600">Waiting for compiler output...</div>
        )}
        
        {errors.map((err, i) => (
          <div key={`err-${i}`} className="text-red-400 flex items-start">
            <span className="mr-2">✖</span>
            <span>{err}</span>
          </div>
        ))}
        
        {logs.map((log, i) => (
          <div key={`log-${i}`} className="text-gray-300 flex items-start">
            <span className="mr-2 text-green-500">➜</span>
            <span>{log.replace('> ', '')}</span>
          </div>
        ))}
      </div>
    </div>
  );
};