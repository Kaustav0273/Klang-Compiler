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
    const alias = imp.alias || imp.source; // Use source as alias if no alias
    
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
    } else if (imp.source.startsWith('local@')) {
       // Local Import: local@houses -> look for 'local/houses.klang' or just 'houses' in keys
       const pathKey = imp.source.replace('local@', '') + '.klang';
       // Try 'local/houses.klang' then 'houses.klang'
       const lookup1 = `local/${imp.source.replace('local@', '')}.klang`;
       const lookup2 = imp.source.replace('local@', '') + '.klang';
       
       if (fileSystem[lookup1]) {
          modSource = fileSystem[lookup1];
       } else if (fileSystem[lookup2]) {
          modSource = fileSystem[lookup2];
       } else {
          // Check for exact match in keys just in case
          if (fileSystem[imp.source]) modSource = fileSystem[imp.source];
       }
    }
    
    if (modSource) {
      // Recursive compilation
      // We ignore the sceneGraph of modules, we only care about their 'scope' (variables exported)
      // Note: Our interpreter returns 'scope' in the extended result.
      const modResult = await compile(modSource, fileSystem, imp.source);
      
      // We expose the entire scope of the module as an object
      // If `from` syntax is used: import { x } from ... (not supported in AST yet really, simpler import)
      // The AST has `items`.
      
      const modScope = (modResult as any).scope;
      modules[alias] = modScope;
    }
  }
  
  // Now interpret the main file with the loaded modules
  return interpret(ast, modules);
}