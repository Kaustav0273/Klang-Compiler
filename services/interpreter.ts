import { 
  ProgramNode, CompilerResult, 
  ImportStatement, AssignmentStatement, 
  PropertyAssignmentStatement, MethodCallStatement, 
  ConsolePrintStatement, ExpressionNode 
} from '../types';

interface Vec3 { x: number; y: number; z: number; }

function parseVector(str: string): Vec3 {
  const parts = str.split(',').map(s => parseFloat(s.trim()));
  return { x: parts[0] || 0, y: parts[1] || 0, z: parts[2] || 0 };
}

// Added modules parameter
export function interpret(ast: ProgramNode, modules: Record<string, any> = {}): CompilerResult {
  const sceneGraph: Record<string, any> = {};
  const logs: string[] = [];
  const errors: string[] = [];
  const scope: Record<string, any> = {}; // Variables
  
  // Initialize scope with modules
  Object.keys(modules).forEach(alias => {
    scope[alias] = modules[alias];
  });

  function log(msg: string) {
    logs.push(`> ${msg}`);
  }

  function resolveMaterialRef(ref: any): any {
     if (typeof ref === 'string') {
        if (scope[ref]) return scope[ref];
     } else if (typeof ref === 'object' && ref.lib) {
        if (scope[ref.lib] && scope[ref.lib][ref.item]) {
           return scope[ref.lib][ref.item];
        }
     }
     return null;
  }

  function evaluateExpression(expr: ExpressionNode): any {
    switch (expr.type) {
      case 'CubeExpr': {
        // Compiler Rule: cube() expands into mesh {}
        // Input vertices: 8 strings "x,y,z"
        const verts = expr.vertices.map(v => parseVector(v));
        
        // Safety check
        if (verts.length !== 8) {
           errors.push("Runtime Error: cube() requires exactly 8 vertices.");
           return null;
        }

        // Define faces (indices)
        // Order assumption based on prompt: 0,1,2,3...
        // Face 0 (Bottom): 0,1,2,3
        // Face 1 (Top): 4,5,6,7
        // etc. standard box winding. 
        // We'll use the prompt's implied logic of standard mapping if explicit topology isn't provided.
        // Let's create a solid closed cube.
        // Assuming:
        // 0-3: Base, 4-7: Top
        // 0(FL), 1(FR), 2(BR), 3(BL) (Clockwise or CCW?)
        // Standard OBJ-like mapping
        const faces = [
            { indices: [0, 1, 2, 3] }, // Bottom
            { indices: [4, 5, 6, 7] }, // Top
            { indices: [0, 1, 5, 4] }, // Front
            { indices: [1, 2, 6, 5] }, // Right
            { indices: [2, 3, 7, 6] }, // Back
            { indices: [3, 0, 4, 7] }  // Left
        ];

        return { 
          type: 'geometry', 
          shape: 'mesh', // INTERNALLY IT IS A MESH
          vertices: verts,
          faces: faces,
          pos: {x:0, y:0, z:0},
          rot: {x:0, y:0, z:0},
          scale: {x:1, y:1, z:1},
          parent: null
        };
      }
      
      case 'MeshExpr': {
         // Resolve materials in faces immediately
         const resolvedFaces = expr.faces.map(f => {
            let mat = null;
            if (f.materialRef) {
               mat = resolveMaterialRef(f.materialRef);
               if (!mat) errors.push(`Warning: Material '${JSON.stringify(f.materialRef)}' not found.`);
            }
            return {
               indices: f.indices,
               material: mat
            };
         });

         return {
            type: 'geometry',
            shape: 'mesh',
            vertices: expr.vertices,
            faces: resolvedFaces,
            pos: {x:0, y:0, z:0},
            rot: {x:0, y:0, z:0},
            scale: {x:1, y:1, z:1},
            parent: null
         };
      }

      case 'MaterialExpr':
        return { type: 'material', ...expr.properties };
        
      case 'ModifierExpr':
        const resolvedProps: any = {};
        for(const [k, v] of Object.entries(expr.properties)) {
          if (typeof v === 'string' && scope[v]) {
             resolvedProps[k] = scope[v]; 
          } else {
             resolvedProps[k] = v;
          }
        }
        return { 
          type: 'geometry', 
          shape: 'pyramid', // This is likely a placeholder for now
          props: resolvedProps,
          pos: {x:0, y:0, z:0},
          rot: {x:0, y:0, z:0},
          scale: {x:1, y:1, z:1},
          parent: null
        };
        
      case 'GroupExpr':
        return { 
          type: 'group', 
          children: expr.children,
          pos: {x:0, y:0, z:0},
          rot: {x:0, y:0, z:0},
          scale: {x:1, y:1, z:1},
          parent: null
        };
        
      case 'Literal':
        return expr.value;
        
      case 'Reference':
        if (expr.callArgs) {
             const mod = scope[expr.name];
             if (mod && mod[expr.callArgs]) {
               return mod[expr.callArgs];
             }
             return { libraryCall: expr.name, key: expr.callArgs };
        }
        
        if (scope[expr.name]) return scope[expr.name];
        return { ref: expr.name, unresolved: true };
        
      default:
        return null;
    }
  }

  try {
    ast.statements.forEach(stmt => {
      switch (stmt.type) {
        case 'Import': {
          const s = stmt as ImportStatement;
          log(`Imported ${s.source}${s.alias ? ` as ${s.alias}` : ''}`);
          break;
        }
        
        case 'Assignment': {
          const s = stmt as AssignmentStatement;
          const value = evaluateExpression(s.value);
          scope[s.identifier] = value;
          
          if (value && (value.type === 'geometry' || value.type === 'group')) {
             sceneGraph[s.identifier] = value;
             value.id = s.identifier;
             
             if (value.type === 'group' && value.children) {
                value.children.forEach((childId: string) => {
                   const child = scope[childId];
                   if (child) {
                      child.parent = s.identifier;
                   }
                });
             }
          }
          break;
        }

        case 'PropertyAssignment': {
          const s = stmt as PropertyAssignmentStatement;
          const obj = sceneGraph[s.objectName];
          if (!obj) {
             errors.push(`Runtime Error: Object '${s.objectName}' not found.`);
             break;
          }

          if (s.subTarget) {
             if (obj.type === 'group' && obj.children.includes(s.subTarget)) {
                const child = sceneGraph[s.subTarget];
                if (child) {
                   if (s.property === 'material') {
                      if (typeof s.value === 'object' && s.value.lib) {
                         child.material = resolveMaterialRef(s.value);
                      } else {
                         child.material = s.value;
                      }
                   } else if (s.property === 'color') {
                      child.color = s.value;
                   } else {
                      child[s.property] = s.value;
                   }
                }
             }
          } else {
             if (s.property === 'pos') {
                if (Array.isArray(s.value)) {
                   obj.pos = { x: s.value[0], y: s.value[1], z: s.value[2] };
                } else if (s.value && s.value.relativeTo) {
                   const target = sceneGraph[s.value.relativeTo];
                   const offsets = parseVector(s.value.coords);
                   if (target) {
                      obj.pos = { 
                        x: target.pos.x + offsets.x,
                        y: target.pos.y + offsets.y,
                        z: target.pos.z + offsets.z
                      };
                   }
                }
             } else if (s.property === 'material') {
                if (typeof s.value === 'object' && s.value.lib) {
                   obj.material = resolveMaterialRef(s.value);
                } else if (typeof s.value === 'object' && s.value.ref) {
                   obj.material = resolveMaterialRef(s.value.ref);
                } else {
                   obj.material = s.value;
                }
             } else {
                obj[s.property] = s.value;
             }
          }
          break;
        }

        case 'MethodCall': {
          const s = stmt as MethodCallStatement;
          const obj = sceneGraph[s.objectName];
           if (!obj) {
             errors.push(`Runtime Error: Object '${s.objectName}' not found.`);
             break;
          }
          
          if (s.method === 'rotate') {
             const angle = s.args[0] as number;
             obj.rot.y += (angle * Math.PI) / 180;
             if (s.exclusion) {
                const excluded = sceneGraph[s.exclusion];
                if (excluded) {
                   excluded.rot.y -= (angle * Math.PI) / 180;
                }
             }
          } else if (s.method === 'move') {
             obj.pos.x += s.args[0] || 0;
             obj.pos.y += s.args[1] || 0;
             obj.pos.z += s.args[2] || 0;
          }
          break;
        }

        case 'ConsolePrint': {
          const s = stmt as ConsolePrintStatement;
          log(s.message);
          break;
        }
      }
    });
  } catch (e: any) {
    errors.push(e.message);
  }

  return { sceneGraph, logs, errors, scope };
}