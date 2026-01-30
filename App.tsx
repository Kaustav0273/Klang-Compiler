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
  
  // Settings State
  const [showSettings, setShowSettings] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [gridSize, setGridSize] = useState(50);
  const [viewDistance, setViewDistance] = useState(100);

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

  // --- Theme Classes ---
  const mainBg = theme === 'dark' ? 'bg-gray-950 text-gray-100' : 'bg-gray-100 text-gray-900';
  const sidebarBg = theme === 'dark' ? 'bg-gray-900 border-gray-800' : 'bg-gray-100 border-gray-200';
  const activityBarBg = theme === 'dark' ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-300';
  const topBarBg = theme === 'dark' ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-300';

  // Activity Bar Icon Styles
  const iconActive = theme === 'dark' ? 'text-blue-400 bg-gray-700' : 'text-blue-600 bg-blue-100';
  const iconInactive = theme === 'dark' ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600';

  // Settings Menu Styles
  const settingsBg = theme === 'dark' ? 'bg-gray-800 border-gray-700 text-gray-200' : 'bg-white border-gray-300 text-gray-800';
  const settingsHeader = theme === 'dark' ? 'text-gray-500 border-gray-700' : 'text-gray-400 border-gray-200';
  const settingsInputBg = theme === 'dark' ? 'bg-gray-900' : 'bg-gray-100';
  const sliderBg = theme === 'dark' ? 'bg-gray-600' : 'bg-gray-300';

  // --- Render ---

  if (!hasStarted) {
    return <WelcomeScreen onNewFile={handleNewProject} onOpenFiles={handleOpenFiles} />;
  }

  return (
    <div ref={containerRef} className={`h-screen w-screen flex overflow-hidden font-sans ${mainBg}`}>
      
      {/* Sidebar: Activity Bar + Explorer */}
      <div className="flex flex-row">
         {/* Activity Bar (Icon Strip) */}
         <div className={`w-12 ${activityBarBg} flex flex-col items-center py-4 border-r z-20 space-y-4 shrink-0 relative`}>
            <div 
              className={`p-2 cursor-pointer rounded-lg transition-colors ${activeSidebar === 'explorer' ? iconActive : iconInactive}`}
              onClick={() => setActiveSidebar('explorer')}
              title="Explorer"
            >
               <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
            </div>
            <div 
              className={`p-2 cursor-pointer rounded-lg transition-colors ${activeSidebar === 'search' ? iconActive : iconInactive}`}
              onClick={() => setActiveSidebar('search')}
              title="Search"
            >
               <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            </div>
            <div 
              className={`p-2 cursor-pointer rounded-lg transition-colors ${activeSidebar === 'converter' ? iconActive : iconInactive}`}
              onClick={() => setActiveSidebar('converter')}
              title="OBJ Converter"
            >
               <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            </div>

            {/* Bottom Settings Icon */}
            <div className="mt-auto absolute bottom-4">
              <div 
                className={`p-2 cursor-pointer rounded-lg transition-colors ${showSettings ? iconActive : iconInactive}`}
                onClick={() => setShowSettings(!showSettings)}
                title="Settings"
              >
                 <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              </div>
              
              {/* Settings Popover */}
              {showSettings && (
                 <div className={`absolute left-14 bottom-0 p-4 rounded shadow-xl w-64 z-50 border ${settingsBg}`}>
                    <h3 className={`text-xs font-bold uppercase mb-3 border-b pb-2 ${settingsHeader}`}>Environment Settings</h3>
                    
                    <div className="mb-4">
                       <label className="text-xs block mb-1">Theme</label>
                       <div className={`flex rounded p-1 ${settingsInputBg}`}>
                          <button 
                            className={`flex-1 text-xs py-1 rounded ${theme === 'dark' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-gray-600'}`}
                            onClick={() => setTheme('dark')}
                          >
                             Dark
                          </button>
                          <button 
                            className={`flex-1 text-xs py-1 rounded ${theme === 'light' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-gray-200'}`}
                            onClick={() => setTheme('light')}
                          >
                             Light
                          </button>
                       </div>
                    </div>

                    <div className="mb-4">
                       <label className="text-xs block mb-1 flex justify-between">
                          <span>Grid Size</span>
                          <span className="opacity-70">{gridSize}</span>
                       </label>
                       <input 
                         type="range" 
                         min="10" 
                         max="200" 
                         step="10"
                         value={gridSize}
                         onChange={(e) => setGridSize(parseInt(e.target.value))}
                         className={`w-full h-1 rounded-lg appearance-none cursor-pointer ${sliderBg}`}
                       />
                    </div>

                    <div className="mb-2">
                       <label className="text-xs block mb-1 flex justify-between">
                          <span>View Distance</span>
                          <span className="opacity-70">{viewDistance}</span>
                       </label>
                       <input 
                         type="range" 
                         min="20" 
                         max="500" 
                         step="10"
                         value={viewDistance}
                         onChange={(e) => setViewDistance(parseInt(e.target.value))}
                         className={`w-full h-1 rounded-lg appearance-none cursor-pointer ${sliderBg}`}
                       />
                    </div>
                 </div>
              )}
            </div>
         </div>
         
         {/* Sidebar Content */}
         <div style={{ width: sidebarWidth }} className={`flex flex-col ${sidebarBg} border-r shrink-0`}>
           {activeSidebar === 'explorer' && (
             <FileExplorer 
               files={files} 
               activeFile={activeFile} 
               onSelectFile={setActiveFile} 
               onCreateFile={createNewFile}
               theme={theme}
             />
           )}
           {activeSidebar === 'search' && (
             <SearchPane 
               files={files} 
               onOpenFile={(file) => {
                  setActiveFile(file);
               }} 
               theme={theme}
             />
           )}
           {activeSidebar === 'converter' && (
             <ObjConverter 
               onCreateFile={createNewFile}
               theme={theme}
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
        <div className={`h-10 ${topBarBg} border-b flex items-center px-4 justify-between shrink-0`}>
           <div className="flex items-center space-x-2 overflow-x-auto no-scrollbar">
              <div className={`px-3 py-1 rounded-t-sm text-xs border-t-2 border-blue-500 flex items-center select-none ${theme === 'dark' ? 'bg-gray-800 text-gray-200' : 'bg-white text-gray-800'}`}>
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
                 <CodeEditor 
                    code={files[activeFile]} 
                    onChange={handleCodeChange} 
                    theme={theme}
                 />
              </div>

              {/* Console Resizer */}
              <div 
                className="h-1 cursor-row-resize hover:bg-blue-500 hover:opacity-50 transition-colors bg-gray-700 z-20"
                onMouseDown={startResize('console')}
              />

              <div style={{ height: consoleHeight }} className="min-h-[50px] shrink-0">
                 <Console 
                    logs={result.logs} 
                    errors={result.errors} 
                    theme={theme}
                 />
              </div>
           </div>
           
           {/* Preview Resizer */}
           <div 
              className="w-1 cursor-col-resize hover:bg-blue-500 hover:opacity-50 transition-colors bg-gray-700 z-20"
              onMouseDown={startResize('preview')}
           />

           {/* Preview Column */}
           <div style={{ width: previewWidth }} className="flex flex-col bg-black shrink-0 min-w-[100px]">
              <div className={`px-3 py-2 text-xs font-bold border-b flex justify-between items-center shrink-0 ${theme === 'dark' ? 'bg-gray-900 border-gray-800 text-gray-400' : 'bg-gray-200 border-gray-300 text-gray-600'}`}>
                 <span>3D PREVIEW</span>
                 <div className="flex space-x-2">
                    <span className="w-2 h-2 rounded-full bg-red-500"></span>
                    <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
                    <span className="w-2 h-2 rounded-full bg-green-500"></span>
                 </div>
              </div>
              <div className="flex-1 relative min-h-0">
                 <Renderer 
                    data={result.sceneGraph} 
                    theme={theme}
                    gridSize={gridSize}
                    viewDistance={viewDistance}
                 />
                 
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