import { 
  Token, TokenType, ProgramNode, StatementNode, 
  ExpressionNode, ImportStatement, AssignmentStatement,
  CubeExpression, MaterialExpression, ModifierExpression, GroupExpression,
  MeshExpression, MeshFace
} from '../types';

export function parse(tokens: Token[]): ProgramNode {
  let current = 0;

  function peek(): Token {
    return tokens[current];
  }

  function advance(): Token {
    if (current < tokens.length) current++;
    return tokens[current - 1];
  }

  function match(type: TokenType, value?: string): boolean {
    const token = peek();
    if (token.type !== type) return false;
    if (value && token.value !== value) return false;
    advance();
    return true;
  }

  function expect(type: TokenType, value?: string): Token {
    const token = peek();
    if (token.type !== type || (value && token.value !== value)) {
      throw new Error(`Syntax Error: Expected ${value || type} but found '${token.value}' at line ${token.line}`);
    }
    return advance();
  }

  // --- Grammar Rules ---

  function parseProgram(): ProgramNode {
    const statements: StatementNode[] = [];
    while (peek().type !== TokenType.EOF) {
      statements.push(parseStatement());
    }
    return { type: 'Program', statements };
  }

  function parseStatement(): StatementNode {
    const token = peek();

    if (token.value === 'import') {
      return parseImport();
    }

    if (token.value === 'console') {
      const nextToken = tokens[current + 1];
      if (nextToken && nextToken.value === '.') {
         return parseConsolePrint();
      }
    }

    if (token.type === TokenType.IDENTIFIER) {
      const next = tokens[current + 1];
      if (next.value === '=') {
        return parseAssignment();
      } else if (next.value === '(' || next.value === '.') {
        return parseAction();
      }
    }

    throw new Error(`Unexpected token '${token.value}' at line ${token.line}`);
  }

  function parseImport(): ImportStatement {
    expect(TokenType.KEYWORD, 'import');
    let items: string[] | null = null;
    let source = '';
    
    const t = peek();
    
    // Case 1: import "http://..." (Direct string source)
    if (t.type === TokenType.STRING) {
      source = advance().value;
    } else {
      // Case 2: import x, y from ... OR import libName
      const ids: string[] = [];
      ids.push(expect(TokenType.IDENTIFIER).value);
      
      // Parse optional comma-separated list
      while (peek().value === ',') {
        advance(); // consume comma
        ids.push(expect(TokenType.IDENTIFIER).value);
      }

      if (peek().value === 'from') {
         advance(); // consume 'from'
         items = ids;
         
         const srcToken = peek();
         if (srcToken.type === TokenType.STRING) {
            source = advance().value;
         } else {
            source = expect(TokenType.IDENTIFIER).value;
         }
      } else {
         // No 'from', implies `import libName`
         if (ids.length === 1) {
            source = ids[0];
            items = null;
         } else {
            throw new Error(`Syntax Error: Expected 'from' after import list at line ${t.line}`);
         }
      }
    }

    let alias: string | null = null;
    if (peek().value === 'as') {
      advance();
      alias = expect(TokenType.IDENTIFIER).value;
    }

    return { type: 'Import', source, items, alias };
  }

  function parseConsolePrint(): StatementNode {
    expect(TokenType.IDENTIFIER, 'console');
    expect(TokenType.SYMBOL, '.');
    expect(TokenType.IDENTIFIER, 'print');
    expect(TokenType.SYMBOL, '(');
    const msg = expect(TokenType.STRING).value;
    expect(TokenType.SYMBOL, ')');
    return { type: 'ConsolePrint', message: msg };
  }

  function parseAssignment(): AssignmentStatement {
    const id = expect(TokenType.IDENTIFIER).value;
    expect(TokenType.SYMBOL, '=');
    const expr = parseExpression();
    return { type: 'Assignment', identifier: id, value: expr };
  }

  function parseExpression(): ExpressionNode {
    const token = peek();

    if (token.value === 'cube') return parseCube();
    if (token.value === 'mesh') return parseMesh();
    if (token.value === 'material') return parseMaterial();
    if (token.value === 'modifier') return parseModifier();
    if (token.value === 'group') return parseGroup();
    
    if (token.type === TokenType.IDENTIFIER) {
       const id = advance();
       if (peek().value === '(') {
         advance(); // (
         const inner = expect(TokenType.IDENTIFIER).value;
         expect(TokenType.SYMBOL, ')');
         return { type: 'Reference', name: id.value, callArgs: inner };
       }
       return { type: 'Reference', name: id.value };
    }

    if (token.type === TokenType.NUMBER) {
       return { type: 'Literal', value: parseFloat(advance().value) };
    }
    
    if (token.type === TokenType.STRING) {
       return { type: 'Literal', value: advance().value };
    }

    throw new Error(`Unknown expression starting with '${token.value}' at line ${token.line}`);
  }

  function parseCube(): CubeExpression {
    expect(TokenType.KEYWORD, 'cube');
    expect(TokenType.SYMBOL, '(');
    
    const vertices: string[] = [];
    let buffer = "";
    while (peek().type !== TokenType.EOF && peek().value !== ')') {
       const t = advance();
       if (t.value === ':') {
         vertices.push(buffer.trim());
         buffer = "";
       } else {
         buffer += t.value;
       }
    }
    if (buffer) vertices.push(buffer.trim());
    expect(TokenType.SYMBOL, ')');
    return { type: 'CubeExpr', vertices };
  }

  function parseMesh(): MeshExpression {
    expect(TokenType.KEYWORD, 'mesh');
    expect(TokenType.SYMBOL, '{');
    
    let vertices: {x:number, y:number, z:number}[] = [];
    let faces: MeshFace[] = [];

    while (peek().value !== '}') {
      const key = expect(TokenType.IDENTIFIER).value;
      expect(TokenType.SYMBOL, '=');
      expect(TokenType.SYMBOL, '[');

      if (key === 'vertices') {
        while (peek().value !== ']') {
          const x = parseFloat(expect(TokenType.NUMBER).value);
          expect(TokenType.SYMBOL, ',');
          const y = parseFloat(expect(TokenType.NUMBER).value);
          expect(TokenType.SYMBOL, ',');
          const z = parseFloat(expect(TokenType.NUMBER).value);
          expect(TokenType.SYMBOL, ';');
          
          vertices.push({ x, y, z });
        }
      } else if (key === 'faces') {
        while (peek().value !== ']') {
          const indices: number[] = [];
          
          while (true) {
            indices.push(parseInt(expect(TokenType.NUMBER).value));
            const next = peek();
            if (next.value === ',') {
              advance();
              if (peek().type !== TokenType.NUMBER) {
                throw new Error(`Syntax Error: Expected number after comma in face indices at line ${peek().line}`);
              }
            } else {
              break;
            }
          }
          
          let materialRef: any = undefined;
          if (peek().value === ':') {
             advance(); 
             const refName = expect(TokenType.IDENTIFIER).value;
             if (peek().value === '.') {
                advance();
                const subRef = expect(TokenType.IDENTIFIER).value;
                materialRef = { lib: refName, item: subRef };
             } else {
                materialRef = refName;
             }
          }

          expect(TokenType.SYMBOL, ';');
          faces.push({ indices, materialRef });
        }
      }

      expect(TokenType.SYMBOL, ']');
    }

    expect(TokenType.SYMBOL, '}');
    return { type: 'MeshExpr', vertices, faces };
  }

  function parseMaterial(): MaterialExpression {
    expect(TokenType.KEYWORD, 'material');
    expect(TokenType.SYMBOL, '{');
    const props = parseKeyValueBlock();
    expect(TokenType.SYMBOL, '}');
    return { type: 'MaterialExpr', properties: props };
  }

  function parseModifier(): ModifierExpression {
    expect(TokenType.KEYWORD, 'modifier');
    expect(TokenType.SYMBOL, '.');
    const modType = expect(TokenType.IDENTIFIER).value;
    expect(TokenType.SYMBOL, '{');
    const props = parseKeyValueBlock();
    expect(TokenType.SYMBOL, '}');
    return { type: 'ModifierExpr', modifierType: modType, properties: props };
  }

  function parseGroup(): GroupExpression {
    expect(TokenType.KEYWORD, 'group');
    expect(TokenType.SYMBOL, '[');
    const children: string[] = [];
    while (peek().value !== ']') {
      children.push(expect(TokenType.IDENTIFIER).value);
      if (peek().value === ',') advance();
    }
    expect(TokenType.SYMBOL, ']');
    return { type: 'GroupExpr', children };
  }

  function parseKeyValueBlock(): Record<string, any> {
    const props: Record<string, any> = {};
    while (peek().value !== '}') {
      // 1. Parse Keys
      const keys: string[] = [];
      keys.push(expect(TokenType.IDENTIFIER).value);
      while (peek().value === ',') {
        advance();
        keys.push(expect(TokenType.IDENTIFIER).value);
      }

      expect(TokenType.SYMBOL, '=');
      
      // 2. Parse Values (Expressions)
      const values: ExpressionNode[] = [];
      values.push(parseExpression());
      while (peek().value === ',') {
        advance();
        values.push(parseExpression());
      }
      
      // 3. Map Keys to Values
      if (keys.length === values.length) {
         keys.forEach((k, i) => {
            props[k] = values[i];
         });
      } else if (keys.length === 1) {
         props[keys[0]] = values;
      } else {
         throw new Error(`Count mismatch in assignment: ${keys.length} keys vs ${values.length} values at line ${peek().line}`);
      }
    }
    return props;
  }

  function parseAction(): StatementNode {
    const objectName = expect(TokenType.IDENTIFIER).value;
    
    let subTarget: string | null = null;
    
    if (peek().value === '(') {
      advance();
      subTarget = expect(TokenType.IDENTIFIER).value;
      expect(TokenType.SYMBOL, ')');
    }

    expect(TokenType.SYMBOL, '.');
    const propOrMethod = expect(TokenType.IDENTIFIER).value;

    if (peek().value === '=') {
      advance();
      let val: any;
      const t1 = peek();
      
      if (t1.type === TokenType.IDENTIFIER && tokens[current+1]?.value === '(') {
         const refName = advance().value;
         advance(); // (
         let args = "";
         while(peek().value !== ')') {
            args += advance().value;
         }
         expect(TokenType.SYMBOL, ')');
         val = { relativeTo: refName, coords: args };
      } 
      else if (t1.type === TokenType.NUMBER && tokens[current+1]?.value === ',') {
         const coords = [];
         while (peek().type === TokenType.NUMBER || peek().value === ',') {
           const t = advance();
           if (t.type === TokenType.NUMBER) coords.push(parseFloat(t.value));
         }
         val = coords;
      }
      else {
        // Fallback for simple values, though parseExpression would be better here too in a full rewrite
        // Keeping legacy logic for Action property assignment to minimize drift from prompt
        if (t1.type === TokenType.STRING || t1.type === TokenType.NUMBER) {
             val = t1.type === TokenType.NUMBER ? parseFloat(advance().value) : advance().value;
        } else if (t1.type === TokenType.IDENTIFIER) {
             const id = advance();
             if (peek().value === '.') {
                advance();
                const sub = expect(TokenType.IDENTIFIER).value;
                val = { lib: id.value, item: sub };
             } else if (peek().value === '(') {
                 advance();
                 const arg = expect(TokenType.IDENTIFIER).value;
                 expect(TokenType.SYMBOL, ')');
                 val = { lib: id.value, item: arg };
             } else {
                 val = { ref: id.value };
             }
        } else {
             throw new Error("Unexpected value in property assignment");
        }
      }

      return {
        type: 'PropertyAssignment',
        objectName,
        subTarget,
        property: propOrMethod,
        value: val
      };

    } else if (peek().value === '(') {
      advance(); // (
      const args = [];
      let exclusion: string | null = null;

      while (peek().value !== ')') {
        if (peek().value === 'not') {
           advance(); // not
           exclusion = expect(TokenType.IDENTIFIER).value;
        } else if (peek().type === TokenType.NUMBER) {
           args.push(parseFloat(advance().value));
        } else if (peek().value === ',') {
           advance();
        } else {
           args.push(advance().value);
        }
      }
      expect(TokenType.SYMBOL, ')');
      
      return {
        type: 'MethodCall',
        objectName,
        method: propOrMethod,
        args,
        exclusion
      };
    }

    throw new Error(`Expected assignment or method call after ${objectName}.${propOrMethod}`);
  }

  return parseProgram();
}