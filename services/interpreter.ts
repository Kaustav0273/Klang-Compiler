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

export function interpret(ast: ProgramNode, modules: Record<string, any> = {}): CompilerResult {
  const sceneGraph: Record<string, any> = {};
  const logs: string[] = [];
  const errors: string[] = [];
  
  // Initialize scope with built-in constants
  const scope: Record<string, any> = {
    // Math
    PI: Math.PI,
    
    // Colors (Hex)
    red: 0xff0000,
    green: 0x00ff00,
    blue: 0x0000ff,
    white: 0xffffff,
    black: 0x000000,
    gray: 0x808080,
    yellow: 0xffff00,
    cyan: 0x00ffff,
    magenta: 0xff00ff,
    
    // Directions / Axes (Strings)
    x: 'x',
    y: 'y',
    z: 'z',
    up: 'up',
    down: 'down',
    left: 'left',
    right: 'right',
    forward: 'forward',
    back: 'back'
  }; 
  
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
  
  function evaluateProperties(props: Record<string, any>): Record<string, any> {
    const result: Record<string, any> = {};
    for (const [key, val] of Object.entries(props)) {
        if (Array.isArray(val)) {
             result[key] = val.map(v => evaluateExpression(v));
        } else {
             result[key] = evaluateExpression(val as ExpressionNode);
        }
    }
    return result;
  }

  function evaluateExpression(expr: ExpressionNode): any {
    switch (expr.type) {
      case 'CubeExpr': {
        const verts = expr.vertices.map(v => parseVector(v));
        
        if (verts.length !== 8) {
           errors.push("Runtime Error: cube() requires exactly 8 vertices.");
           return null;
        }

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
          shape: 'mesh', 
          vertices: verts,
          faces: faces,
          pos: {x:0, y:0, z:0},
          rot: {x:0, y:0, z:0},
          scale: {x:1, y:1, z:1},
          parent: null
        };
      }
      
      case 'MeshExpr': {
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
        return { type: 'material', ...evaluateProperties(expr.properties) };
        
      case 'ModifierExpr': {
        const props = evaluateProperties(expr.properties);
        const base = props.base;
        
        if (!base) {
           errors.push("Runtime Error: Modifier requires a 'base' property.");
           return null;
        }
        
        // Deep clone the base object to apply modifications
        const newObj = JSON.parse(JSON.stringify(base));
        
        if (expr.modifierType === 'pyramid') {
           newObj.shape = 'pyramid';
           newObj.height = props.height !== undefined ? props.height : 1;
           newObj.direction = props.direction || 'up';
        }
        else if (expr.modifierType === 'scale') {
           if (props.x !== undefined) newObj.scale.x *= props.x;
           if (props.y !== undefined) newObj.scale.y *= props.y;
           if (props.z !== undefined) newObj.scale.z *= props.z;
        }
        else if (expr.modifierType === 'translate') {
           if (props.x !== undefined) newObj.pos.x += props.x;
           if (props.y !== undefined) newObj.pos.y += props.y;
           if (props.z !== undefined) newObj.pos.z += props.z;
        }
        else if (expr.modifierType === 'rotate') {
           const applyRot = (ax: string, deg: number) => {
             const rad = (deg * Math.PI) / 180;
             if (ax === 'x') newObj.rot.x += rad;
             if (ax === 'y') newObj.rot.y += rad;
             if (ax === 'z') newObj.rot.z += rad;
           };

           if (Array.isArray(props.axis) && Array.isArray(props.angle)) {
              props.axis.forEach((ax: string, i: number) => {
                 applyRot(ax, props.angle[i]);
              });
           } else if (typeof props.axis === 'string' && typeof props.angle === 'number') {
              applyRot(props.axis, props.angle);
           }
        }
        
        return newObj;
      }
        
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
        
        if (scope[expr.name] !== undefined) return scope[expr.name];
        // Handle undefined variable
        errors.push(`Runtime Error: Variable '${expr.name}' not defined.`);
        return null;
        
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