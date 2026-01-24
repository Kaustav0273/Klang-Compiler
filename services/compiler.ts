import { tokenize } from './lexer';
import { parse } from './parser';
import { interpret } from './interpreter';
import { CompilerResult, ImportStatement } from '../types';

// Cache for cloud libraries to avoid re-fetching constantly
const libraryCache: Record<string, string> = {};

export async function compile(
  sourceCode: string, 
  fileSystem: Record<string, string>,
  rootFile: string = "root"
): Promise<CompilerResult> {
  
  const tokens = tokenize(sourceCode);
  const ast = parse(tokens);
  
  // Find imports
  const modules: Record<string, any> = {};
  
  // Extract imports from AST
  const imports = ast.statements.filter(s => s.type === 'Import') as ImportStatement[];
  
  for (const imp of imports) {
    let modSource = "";
    
    if (imp.source.startsWith('http')) {
       // Cloud Import
       if (libraryCache[imp.source]) {
         modSource = libraryCache[imp.source];
       } else {
         try {
           const resp = await fetch(imp.source);
           if (!resp.ok) throw new Error(`Failed to fetch ${imp.source}`);
           modSource = await resp.text();
           libraryCache[imp.source] = modSource;
         } catch (e) {
           console.error("Import Error", e);
           // Fallback or empty
           modSource = `console.print("Failed to load ${imp.source}")`;
         }
       }
    } else {
       // Local Import
       // normalize source: remove local@ prefix if present
       const cleanName = imp.source.replace('local@', '');
       const possiblePaths = [
         imp.source, // raw
         `${cleanName}.klang`, // clean + extension
         `local/${cleanName}.klang` // local folder
       ];
       
       for (const p of possiblePaths) {
          if (fileSystem[p]) {
             modSource = fileSystem[p];
             break;
          }
       }
    }
    
    if (modSource) {
      // Recursive compilation to get module exports
      const modResult = await compile(modSource, fileSystem, imp.source);
      const modScope = (modResult as any).scope || {};
      
      // Determine what to put in 'modules' map (which becomes the scope)
      if (imp.items && imp.items.length > 0) {
         // Case: import x, y from ...
         
         if (imp.alias && imp.items.length === 1) {
            // Case: import x from lib as y
            const itemName = imp.items[0];
            if (modScope[itemName] !== undefined) {
               modules[imp.alias] = modScope[itemName];
            }
         } else {
            // Case: import x, y from lib
            // No alias support for multiple imports in this version of KLang (as per prompt implication)
            imp.items.forEach(itemName => {
               if (modScope[itemName] !== undefined) {
                  modules[itemName] = modScope[itemName];
               }
            });
         }
      } else {
         // Case: import lib as m  OR  import lib
         const key = imp.alias || imp.source;
         modules[key] = modScope;
      }
    }
  }
  
  // Now interpret the main file with the loaded modules
  return interpret(ast, modules);
}