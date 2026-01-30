import React, { useState, useRef } from 'react';

interface Props {
  onCreateFile: (name: string, content: string) => void;
  theme: 'dark' | 'light';
}

export const ObjConverter: React.FC<Props> = ({ onCreateFile, theme }) => {
  const [file, setFile] = useState<File | null>(null);
  const [objName, setObjName] = useState('my_mesh');
  const [matName, setMatName] = useState('');
  const [scale, setScale] = useState(1.0);
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      // Default object name from filename
      const fname = e.target.files[0].name.split('.')[0];
      setObjName(fname.replace(/[^a-zA-Z0-9_]/g, '_'));
      setOutput('');
      setError('');
    }
  };

  const convert = async () => {
    if (!file) return;

    try {
      const text = await file.text();
      const lines = text.split('\n');
      const vertices: string[] = [];
      const faces: string[] = [];

      for (let line of lines) {
        line = line.trim();
        if (line.startsWith('#') || !line) continue;
        
        // Handle double spaces
        const parts = line.split(/\s+/);
        const type = parts[0];

        if (type === 'v') {
          // Vertex: v x y z
          const x = parseFloat(parts[1]) * scale;
          const y = parseFloat(parts[2]) * scale;
          const z = parseFloat(parts[3]) * scale;
          
          if (isNaN(x) || isNaN(y) || isNaN(z)) continue;
          
          // formatting to 4 decimals for cleanliness
          vertices.push(`${parseFloat(x.toFixed(4))}, ${parseFloat(y.toFixed(4))}, ${parseFloat(z.toFixed(4))}`);
        } else if (type === 'f') {
           // Face: f v1/vt1/vn1 v2...
           const indices: number[] = [];
           for (let i = 1; i < parts.length; i++) {
             const facePart = parts[i];
             if (!facePart) continue;
             
             // OBJ is 1-based, we need 0-based
             const vIdxStr = facePart.split('/')[0];
             const vIdx = parseInt(vIdxStr);
             
             if (!isNaN(vIdx)) {
                indices.push(vIdx - 1);
             }
           }
           if (indices.length >= 3) {
              faces.push(indices.join(', '));
           }
        }
      }

      if (vertices.length === 0) {
        setError("No vertices found in OBJ file.");
        return;
      }

      // Generate KLang Syntax
      let code = `// Converted from ${file.name}\n`;
      if (matName) {
          code += `// Ensure '${matName}' is defined before this mesh\n`;
      }
      code += `${objName} = mesh {\n`;
      
      code += `  vertices = [\n`;
      vertices.forEach(v => {
          code += `    ${v};\n`;
      });
      code += `  ]\n\n`;

      code += `  faces = [\n`;
      faces.forEach(f => {
          code += `    ${f}`;
          if (matName) code += ` : ${matName}`;
          code += `;\n`;
      });
      code += `  ]\n`;
      code += `}\n`;

      setOutput(code);
      setError('');

    } catch (err) {
      setError("Failed to parse file.");
      console.error(err);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(output);
  };

  const handleSaveFile = () => {
     if (output) {
        onCreateFile(objName, output);
     }
  };
  
  const borderClass = theme === 'dark' ? 'border-gray-700' : 'border-gray-300';
  const headerClass = theme === 'dark' ? 'bg-gray-900 border-gray-800 text-gray-400' : 'bg-gray-100 border-gray-300 text-gray-600';
  const labelColor = theme === 'dark' ? 'text-gray-500' : 'text-gray-600';
  const inputBg = theme === 'dark' ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-800';
  const btnFile = theme === 'dark' ? 'bg-gray-800 border-gray-700 hover:bg-gray-700 text-gray-300' : 'bg-white border-gray-300 hover:bg-gray-50 text-gray-700';
  const previewBg = theme === 'dark' ? 'bg-black/50 border-gray-800 text-gray-400' : 'bg-white border-gray-300 text-gray-600';

  return (
    <div className={`flex flex-col h-full w-64 border-r ${borderClass}`}>
       <div className={`p-3 text-xs font-bold uppercase tracking-wider border-b ${headerClass}`}>
        OBJ Converter
      </div>
      
      <div className="p-4 flex-1 overflow-y-auto space-y-4">
         
         {/* File Input */}
         <div>
            <label className={`block text-xs mb-1 ${labelColor}`}>Source File (.obj)</label>
            <input 
               type="file" 
               accept=".obj"
               ref={fileInputRef}
               className="hidden"
               onChange={handleFileChange}
            />
            <button 
               onClick={() => fileInputRef.current?.click()}
               className={`w-full py-2 px-3 border text-xs rounded flex items-center justify-center ${btnFile}`}
            >
               {file ? (
                 <span className="truncate">{file.name}</span>
               ) : (
                 <>
                   <span className="mr-2">📂</span> Select File
                 </>
               )}
            </button>
         </div>

         {/* Settings */}
         <div className="space-y-3">
            <div>
              <label className={`block text-xs mb-1 ${labelColor}`}>Object Name</label>
              <input 
                className={`w-full text-xs p-2 rounded focus:border-blue-500 outline-none border ${inputBg}`}
                value={objName}
                onChange={e => setObjName(e.target.value)}
              />
            </div>

            <div>
              <label className={`block text-xs mb-1 ${labelColor}`}>Material (Optional)</label>
              <input 
                className={`w-full text-xs p-2 rounded focus:border-blue-500 outline-none border placeholder-gray-500 ${inputBg}`}
                placeholder="e.g. mat_stone"
                value={matName}
                onChange={e => setMatName(e.target.value)}
              />
            </div>

            <div>
              <label className={`block text-xs mb-1 ${labelColor}`}>Scale Multiplier</label>
              <input 
                type="number"
                step="0.1"
                className={`w-full text-xs p-2 rounded focus:border-blue-500 outline-none border ${inputBg}`}
                value={scale}
                onChange={e => setScale(parseFloat(e.target.value))}
              />
            </div>
         </div>

         {/* Action */}
         <button 
            onClick={convert}
            disabled={!file}
            className="w-full py-2 bg-blue-700 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold rounded"
         >
            Convert to KLang
         </button>

         {/* Error */}
         {error && (
            <div className="text-red-400 text-xs p-2 bg-red-900/20 border border-red-900 rounded">
               {error}
            </div>
         )}

         {/* Output Preview */}
         {output && (
            <div className={`space-y-2 pt-4 border-t ${borderClass}`}>
               <div className={`text-xs font-bold ${labelColor}`}>Preview</div>
               <div className={`h-32 p-2 rounded border overflow-auto ${previewBg}`}>
                  <pre className="text-[10px] font-mono whitespace-pre">{output.slice(0, 500)}...</pre>
               </div>
               
               <div className="flex space-x-2">
                  <button 
                    onClick={copyToClipboard}
                    className="flex-1 py-1 bg-gray-600 hover:bg-gray-500 text-xs text-gray-200 rounded"
                  >
                    Copy
                  </button>
                  <button 
                    onClick={handleSaveFile}
                    className="flex-1 py-1 bg-green-700 hover:bg-green-600 text-xs text-white rounded"
                  >
                    Save File
                  </button>
               </div>
            </div>
         )}

      </div>
    </div>
  );
};