import React, { useState, useRef, useEffect } from 'react';
import { CodeEditor } from './components/CodeEditor';
import { Console } from './components/Console';
import { Renderer } from './components/Renderer';
import { FileExplorer } from './components/FileExplorer';
import { SearchPane } from './components/SearchPane';
import { ObjConverter } from './components/ObjConverter';
import { WelcomeScreen } from './components/WelcomeScreen';
import { compile } from './services/compiler';
import { CompilerResult } from './types';
import { INITIAL_CODE } from './constants';

export default function App() {
  const [hasStarted, setHasStarted] = useState(false);
  const [files, setFiles] = useState<Record<string, string>>({});
  const [activeFile, setActiveFile] = useState('');
  
  const [activeSidebar, setActiveSidebar] = useState<'explorer' | 'search' | 'converter'>('explorer');
  
  // Layout State
  const [sidebarWidth, setSidebarWidth] = useState(250);
  const [previewWidth, setPreviewWidth] = useState(400);
  const [consoleHeight, setConsoleHeight] = useState(200);

  const [result, setResult] = useState<CompilerResult>({
    sceneGraph: {},
    logs: [],
    errors: []
  });
  const [isCompiling, setIsCompiling] = useState(false);

  // --- Handlers for Welcome Screen ---

  const handleNewProject = () => {
    const defaultName = 'main.klang';
    setFiles({ [defaultName]: INITIAL_CODE });
    setActiveFile(defaultName);
    setHasStarted(true);
  };

  const handleOpenFiles = async (fileList: FileList) => {
    const newFiles: Record<string, string> = {};
    let firstFile = '';

    const readPromises = Array.from(fileList).map(file => {
      return new Promise<void>((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          let fileName = file.name;
          if (!fileName.endsWith('.klang')) {
             if (fileName.includes('.')) {
               fileName = fileName.substring(0, fileName.lastIndexOf('.')) + '.klang';
             } else {
               fileName += '.klang';
             }
          }

          const content = e.target?.result as string;
          newFiles[fileName] = content;
          if (!firstFile) firstFile = fileName;
          resolve();
        };
        reader.readAsText(file);
      });
    });

    await Promise.all(readPromises);

    if (Object.keys(newFiles).length > 0) {
      setFiles(newFiles);
      setActiveFile(firstFile);
      setHasStarted(true);
    }
  };

  // --- IDE Logic ---

  const handleCodeChange = (newCode: string) => {
    setFiles(prev => ({
      ...prev,
      [activeFile]: newCode
    }));
  };

  const handleRun = async () => {
    setIsCompiling(true);
    setResult({ sceneGraph: {}, logs: ['Compiling...'], errors: [] });
    
    try {
      const codeToRun = files[activeFile];
      const res = await compile(codeToRun, files);
      setResult(res);
    } catch (e: any) {
      setResult({
         sceneGraph: {},
         logs: [],
         errors: [e.message || 'Unknown compiler error']
      });
    } finally {
      setIsCompiling(false);
    }
  };
  
  const createNewFile = (name: string, content: string = "") => {
     if (name) {
        let finalName = name;
        if (!finalName.endsWith('.klang')) finalName += '.klang';
        
        if (!files[finalName]) {
          setFiles(prev => ({...prev, [finalName]: content || "// New KLang Script\n"}));
          setActiveFile(finalName);
        } else {
          // If file exists, maybe we should overwrite or warn? 
          // For this app, let's just overwrite if content is provided (converter mode), else just switch to it.
          if (content) {
             setFiles(prev => ({...prev, [finalName]: content}));
          }
          setActiveFile(finalName);
        }
     }
  };

  // --- Resizing Logic ---
  const containerRef = useRef<HTMLDivElement>(null);
  const isResizing = useRef<'sidebar' | 'preview' | 'console' | null>(null);

  const startResize = (type: 'sidebar' | 'preview' | 'console') => (e: React.MouseEvent) => {
    e.preventDefault();
    isResizing.current = type;
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isResizing.current) return;
    
    if (isResizing.current === 'sidebar') {
       const newWidth = e.clientX - 48; // Subtract activity bar width
       if (newWidth > 150 && newWidth < 600) setSidebarWidth(newWidth);
    } 
    else if (isResizing.current === 'preview') {
       const containerWidth = containerRef.current?.clientWidth || window.innerWidth;
       const newWidth = containerWidth - e.clientX;
       
       // Improved constraint logic to prevent overflow
       const activityBarWidth = 48;
       const minEditorWidth = 200;
       const maxPreviewWidth = containerWidth - activityBarWidth - sidebarWidth - minEditorWidth;
       
       if (newWidth > 200 && newWidth < maxPreviewWidth) {
           setPreviewWidth(newWidth);
       }
    }
    else if (isResizing.current === 'console') {
       const containerHeight = containerRef.current?.clientHeight || window.innerHeight;
       const newHeight = containerHeight - e.clientY;
       if (newHeight > 50 && newHeight < containerHeight - 100) setConsoleHeight(newHeight);
    }
  };

  const handleMouseUp = () => {
    isResizing.current = null;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };

  // --- Render ---

  if (!hasStarted) {
    return <WelcomeScreen onNewFile={handleNewProject} onOpenFiles={handleOpenFiles} />;
  }

  return (
    <div ref={containerRef} className="h-screen w-screen bg-gray-950 flex text-gray-100 overflow-hidden font-sans">
      
      {/* Sidebar: Activity Bar + Explorer */}
      <div className="flex flex-row">
         {/* Activity Bar (Icon Strip) */}
         <div className="w-12 bg-gray-900 flex flex-col items-center py-4 border-r border-gray-800 z-10 space-y-4 shrink-0">
            <div 
              className={`p-2 cursor-pointer rounded-lg transition-colors ${activeSidebar === 'explorer' ? 'text-blue-400 bg-gray-800' : 'text-gray-500 hover:text-gray-300'}`}
              onClick={() => setActiveSidebar('explorer')}
              title="Explorer"
            >
               <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
            </div>
            <div 
              className={`p-2 cursor-pointer rounded-lg transition-colors ${activeSidebar === 'search' ? 'text-blue-400 bg-gray-800' : 'text-gray-500 hover:text-gray-300'}`}
              onClick={() => setActiveSidebar('search')}
              title="Search"
            >
               <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            </div>
            <div 
              className={`p-2 cursor-pointer rounded-lg transition-colors ${activeSidebar === 'converter' ? 'text-blue-400 bg-gray-800' : 'text-gray-500 hover:text-gray-300'}`}
              onClick={() => setActiveSidebar('converter')}
              title="OBJ Converter"
            >
               <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            </div>
         </div>
         
         {/* Sidebar Content */}
         <div style={{ width: sidebarWidth }} className="flex flex-col border-r border-gray-800 shrink-0">
           {activeSidebar === 'explorer' && (
             <FileExplorer 
               files={files} 
               activeFile={activeFile} 
               onSelectFile={setActiveFile} 
               onCreateFile={createNewFile}
             />
           )}
           {activeSidebar === 'search' && (
             <SearchPane 
               files={files} 
               onOpenFile={(file) => {
                  setActiveFile(file);
               }} 
             />
           )}
           {activeSidebar === 'converter' && (
             <ObjConverter 
               onCreateFile={createNewFile}
             />
           )}
         </div>

         {/* Resizer Sidebar */}
         <div 
            className="w-1 cursor-col-resize hover:bg-blue-500 hover:opacity-50 transition-colors bg-transparent z-20"
            onMouseDown={startResize('sidebar')}
         />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Top Bar / Tabs */}
        <div className="h-10 bg-gray-900 border-b border-gray-800 flex items-center px-4 justify-between shrink-0">
           <div className="flex items-center space-x-2 overflow-x-auto no-scrollbar">
              <div className="bg-gray-800 text-gray-200 px-3 py-1 rounded-t-sm text-xs border-t-2 border-blue-500 flex items-center select-none">
                 <span className="mr-2">📝</span>
                 {activeFile}
              </div>
           </div>
           
           <div className="flex items-center space-x-3">
              <button 
                onClick={handleRun}
                disabled={isCompiling}
                className="flex items-center space-x-1 bg-green-700 hover:bg-green-600 text-white px-3 py-1 rounded text-xs font-bold transition-colors disabled:opacity-50"
              >
                 <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" /></svg>
                 <span>{isCompiling ? 'Compiling...' : 'Run Code'}</span>
              </button>
           </div>
        </div>

        {/* Content Split: Editor (Left) | Preview (Right) */}
        <div className="flex-1 flex flex-row overflow-hidden">
           
           {/* Editor Column (Contains Editor + Console) */}
           <div className="flex-1 flex flex-col min-w-[200px]">
              
              <div className="flex-1 relative min-h-0">
                 <CodeEditor code={files[activeFile]} onChange={handleCodeChange} />
              </div>

              {/* Console Resizer */}
              <div 
                className="h-1 cursor-row-resize hover:bg-blue-500 hover:opacity-50 transition-colors bg-gray-800 z-20"
                onMouseDown={startResize('console')}
              />

              <div style={{ height: consoleHeight }} className="min-h-[50px] shrink-0">
                 <Console logs={result.logs} errors={result.errors} />
              </div>
           </div>
           
           {/* Preview Resizer */}
           <div 
              className="w-1 cursor-col-resize hover:bg-blue-500 hover:opacity-50 transition-colors bg-gray-800 z-20"
              onMouseDown={startResize('preview')}
           />

           {/* Preview Column */}
           <div style={{ width: previewWidth }} className="flex flex-col bg-black shrink-0 min-w-[100px]">
              <div className="bg-gray-900 px-3 py-2 text-xs font-bold text-gray-400 border-b border-gray-800 flex justify-between items-center shrink-0">
                 <span>3D PREVIEW</span>
                 <div className="flex space-x-2">
                    <span className="w-2 h-2 rounded-full bg-red-500"></span>
                    <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
                    <span className="w-2 h-2 rounded-full bg-green-500"></span>
                 </div>
              </div>
              <div className="flex-1 relative min-h-0">
                 <Renderer data={result.sceneGraph} />
                 
                 {/* Floating Info */}
                 <div className="absolute bottom-4 left-4 bg-black/50 backdrop-blur text-white text-[10px] p-2 rounded pointer-events-none">
                    {Object.keys(result.sceneGraph).length} Objects
                 </div>
              </div>
           </div>

        </div>
      </div>
    </div>
  );
}