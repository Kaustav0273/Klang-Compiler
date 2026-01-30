import { 
  ProgramNode, CompilerResult, 
  ImportStatement, AssignmentStatement, 
  PropertyAssignmentStatement, MethodCallStatement, 
  ConsolePrintStatement, ExpressionNode, StatementNode,
  IfStatement, WhileStatement, ForStatement, BlockNode
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
    PI: Math.PI,
    red: 0xff0000, green: 0x00ff00, blue: 0x0000ff,
    white: 0xffffff, black: 0x000000, gray: 0x808080,
    yellow: 0xffff00, cyan: 0x00ffff, magenta: 0xff00ff,
    x: 'x', y: 'y', z: 'z',
    up: 'up', down: 'down',
    left: 'left', right: 'right',
    forward: 'forward', back: 'back'
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
      case 'BinaryExpr': {
         const left = evaluateExpression(expr.left);
         const right = evaluateExpression(expr.right);
         switch (expr.operator) {
             case '+': return left + right;
             case '-': return left - right;
             case '*': return left * right;
             case '/': return left / right;
             case '%': return left % right;
             case '>': return left > right;
             case '<': return left < right;
             case '>=': return left >= right;
             case '<=': return left <= right;
             case '==': return left == right;
             case '!=': return left != right;
         }
         return 0;
      }

      case 'CallExpr': {
         if (expr.callee === 'int') {
            return Math.floor(evaluateExpression(expr.args[0]));
         }
         if (expr.callee === 'float') {
            return parseFloat(evaluateExpression(expr.args[0]));
         }
         if (expr.callee === 'string') {
            return String(evaluateExpression(expr.args[0]));
         }
         if (expr.callee === 'bool') {
            return Boolean(evaluateExpression(expr.args[0]));
         }
         // TODO: Other function calls or library calls?
         return null;
      }

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
          type: 'geometry', shape: 'mesh', 
          vertices: verts, faces: faces,
          pos: {x:0, y:0, z:0}, rot: {x:0, y:0, z:0}, scale: {x:1, y:1, z:1},
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
            return { indices: f.indices, material: mat };
         });
         return {
            type: 'geometry', shape: 'mesh',
            vertices: expr.vertices, faces: resolvedFaces,
            pos: {x:0, y:0, z:0}, rot: {x:0, y:0, z:0}, scale: {x:1, y:1, z:1},
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
        const newObj = JSON.parse(JSON.stringify(base));
        if (expr.modifierType === 'pyramid') {
           newObj.shape = 'pyramid';
           newObj.height = props.height !== undefined ? props.height : 1;
           newObj.direction = props.direction || 'up';
        } else if (expr.modifierType === 'scale') {
           if (props.x !== undefined) newObj.scale.x *= props.x;
           if (props.y !== undefined) newObj.scale.y *= props.y;
           if (props.z !== undefined) newObj.scale.z *= props.z;
        } else if (expr.modifierType === 'translate') {
           if (props.x !== undefined) newObj.pos.x += props.x;
           if (props.y !== undefined) newObj.pos.y += props.y;
           if (props.z !== undefined) newObj.pos.z += props.z;
        } else if (expr.modifierType === 'rotate') {
           const applyRot = (ax: string, deg: number) => {
             const rad = (deg * Math.PI) / 180;
             if (ax === 'x') newObj.rot.x += rad;
             if (ax === 'y') newObj.rot.y += rad;
             if (ax === 'z') newObj.rot.z += rad;
           };
           if (Array.isArray(props.axis) && Array.isArray(props.angle)) {
              props.axis.forEach((ax: string, i: number) => applyRot(ax, props.angle[i]));
           } else if (typeof props.axis === 'string' && typeof props.angle === 'number') {
              applyRot(props.axis, props.angle);
           }
        }
        return newObj;
      }
        
      case 'GroupExpr':
        return { 
          type: 'group', children: expr.children,
          pos: {x:0, y:0, z:0}, rot: {x:0, y:0, z:0}, scale: {x:1, y:1, z:1},
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
        errors.push(`Runtime Error: Variable '${expr.name}' not defined.`);
        return null;
        
      default:
        return null;
    }
  }

  function executeBlock(block: BlockNode) {
     block.statements.forEach(stmt => executeStatement(stmt));
  }

  function executeStatement(stmt: StatementNode) {
    try {
      switch (stmt.type) {
        case 'Import': {
          const s = stmt as ImportStatement;
          log(`Imported ${s.source}${s.alias ? ` as ${s.alias}` : ''}`);
          break;
        }

        case 'If': {
            const s = stmt as IfStatement;
            if (evaluateExpression(s.condition)) {
                executeBlock(s.thenBlock);
            } else if (s.elseBlock) {
                if (s.elseBlock.type === 'If') {
                    executeStatement(s.elseBlock);
                } else {
                    executeBlock(s.elseBlock as BlockNode);
                }
            }
            break;
        }

        case 'While': {
            const s = stmt as WhileStatement;
            // Simple infinite loop protection
            let limit = 10000;
            while (evaluateExpression(s.condition) && limit > 0) {
                executeBlock(s.body);
                limit--;
            }
            if (limit === 0) errors.push("Runtime Error: Loop exceeded 10000 iterations.");
            break;
        }

        case 'For': {
            const s = stmt as ForStatement;
            const start = evaluateExpression(s.start);
            const end = evaluateExpression(s.end);
            const step = s.step ? evaluateExpression(s.step) : 1;
            
            // Initial assignment
            scope[s.variable] = start;
            
            let limit = 10000;
            while (limit > 0) {
               const curr = scope[s.variable];
               // Directional check
               if (step > 0 && curr > end) break;
               if (step < 0 && curr < end) break;
               
               executeBlock(s.body);
               
               // Update
               scope[s.variable] += step;
               limit--;
            }
            if (limit === 0) errors.push("Runtime Error: Loop exceeded 10000 iterations.");
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

          let val: any;
          if (Array.isArray(s.value)) { 
             // raw coords from parser legacy
             val = s.value; 
          } else if (s.value && s.value.type) {
             // It's an AST Node from generic parser
             val = evaluateExpression(s.value);
          } else {
             // Legacy raw object/struct
             val = s.value;
          }

          if (s.subTarget) {
             if (obj.type === 'group' && obj.children.includes(s.subTarget)) {
                const child = sceneGraph[s.subTarget];
                if (child) {
                   if (s.property === 'material') {
                      if (typeof val === 'object' && val.lib) {
                         child.material = resolveMaterialRef(val);
                      } else {
                         child.material = val;
                      }
                   } else if (s.property === 'color') {
                      child.color = val;
                   } else {
                      child[s.property] = val;
                   }
                }
             }
          } else {
             if (s.property === 'pos') {
                 if (Array.isArray(val)) {
                   obj.pos = { x: val[0], y: val[1], z: val[2] };
                } else if (val && val.relativeTo) {
                   const target = sceneGraph[val.relativeTo];
                   const offsets = parseVector(val.coords);
                   if (target) {
                      obj.pos = { 
                        x: target.pos.x + offsets.x,
                        y: target.pos.y + offsets.y,
                        z: target.pos.z + offsets.z
                      };
                   }
                }
             } else if (s.property === 'material') {
                if (typeof val === 'object' && val.lib) {
                   obj.material = resolveMaterialRef(val);
                } else if (typeof val === 'object' && val.ref) {
                   obj.material = resolveMaterialRef(val.ref);
                } else {
                   obj.material = val;
                }
             } else {
                obj[s.property] = val;
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
             const argVal = evaluateExpression(s.args[0]);
             obj.rot.y += (argVal * Math.PI) / 180;
             if (s.exclusion) {
                const excluded = sceneGraph[s.exclusion];
                if (excluded) {
                   excluded.rot.y -= (argVal * Math.PI) / 180;
                }
             }
          } else if (s.method === 'move') {
             obj.pos.x += evaluateExpression(s.args[0]) || 0;
             obj.pos.y += evaluateExpression(s.args[1]) || 0;
             obj.pos.z += evaluateExpression(s.args[2]) || 0;
          }
          break;
        }

        case 'ConsolePrint': {
          const s = stmt as ConsolePrintStatement;
          const val = evaluateExpression(s.message);
          log(String(val));
          break;
        }
      }
    } catch (e: any) {
      errors.push(`Error executing statement: ${e.message}`);
    }
  }

  // Run Main Program
  try {
    ast.statements.forEach(stmt => executeStatement(stmt));
  } catch (e: any) {
    errors.push(e.message);
  }

  return { sceneGraph, logs, errors, scope };
}