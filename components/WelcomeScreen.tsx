import React, { useRef } from 'react';

interface Props {
  onNewFile: () => void;
  onOpenFiles: (files: FileList) => void;
}

export const WelcomeScreen: React.FC<Props> = ({ onNewFile, onOpenFiles }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onOpenFiles(e.target.files);
    }
  };

  return (
    <div className="h-screen w-screen bg-gray-950 flex flex-col items-center justify-center text-gray-100 font-sans p-4">
      <div className="max-w-md w-full bg-gray-900 border border-gray-800 p-8 rounded-lg shadow-2xl text-center">
        <div className="mb-8">
          <div className="w-20 h-20 mx-auto bg-blue-900/30 rounded-full flex items-center justify-center mb-4 border border-blue-500/30">
            <svg className="w-10 h-10 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold mb-2 tracking-tight">KLang IDE</h1>
          <p className="text-gray-400 text-sm">3D World Development Environment</p>
        </div>

        <div className="space-y-3">
          <button 
            onClick={onNewFile}
            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-500 rounded font-medium transition-all shadow-lg shadow-blue-900/20 flex items-center justify-center group"
          >
            <span className="mr-2 text-xl leading-none group-hover:-translate-y-0.5 transition-transform">+</span> Open New File
          </button>

          <div className="relative">
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-3 px-4 bg-gray-800 hover:bg-gray-750 border border-gray-700 hover:border-gray-600 rounded font-medium transition-all flex items-center justify-center text-gray-300"
            >
              <svg className="w-5 h-5 mr-2 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" /></svg>
              Select File / Folder
            </button>
            <input 
              type="file" 
              multiple 
              accept=".klang,.txt"
              ref={fileInputRef} 
              className="hidden" 
              onChange={handleFileChange} 
            />
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-800">
           <p className="text-xs text-gray-500">
             All files will be treated as <span className="font-mono text-gray-400">.klang</span>
           </p>
        </div>
      </div>
    </div>
  );
};