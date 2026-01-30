import { 
  Token, TokenType, ProgramNode, StatementNode, 
  ExpressionNode, ImportStatement, AssignmentStatement,
  CubeExpression, MaterialExpression, ModifierExpression, GroupExpression,
  MeshExpression, MeshFace, IfStatement, BlockNode, WhileStatement, ForStatement, BinaryExpression, LiteralExpression
} from '../types';

export function parse(tokens: Token[]): ProgramNode {
  let current = 0;

  function peek(offset = 0): Token {
    return tokens[current + offset];
  }

  function advance(): Token {
    if (current < tokens.length) current++;
    return tokens[current - 1];
  }

  function check(type: TokenType, value?: string): boolean {
    const token = peek();
    if (token.type === TokenType.EOF) return false;
    if (token.type !== type) return false;
    if (value && token.value !== value) return false;
    return true;
  }

  function match(type: TokenType, value?: string): boolean {
    if (check(type, value)) {
      advance();
      return true;
    }
    return false;
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

    if (token.type === TokenType.KEYWORD) {
        switch (token.value) {
            case 'import': return parseImport();
            case 'if': return parseIf();
            case 'while': return parseWhile();
            case 'for': return parseFor();
        }
    }

    if (token.value === 'console') {
      const nextToken = peek(1);
      if (nextToken && nextToken.value === '.') {
         return parseConsolePrint();
      }
    }

    if (token.type === TokenType.IDENTIFIER) {
      const next = peek(1);
      if (next.value === '=') {
        return parseAssignment();
      } else if (next.value === '(' || next.value === '.') {
        return parseAction();
      }
    }

    throw new Error(`Unexpected token '${token.value}' at line ${token.line}`);
  }

  function parseBlock(): BlockNode {
    expect(TokenType.SYMBOL, '{');
    const statements: StatementNode[] = [];
    while (!check(TokenType.SYMBOL, '}') && !check(TokenType.EOF)) {
      statements.push(parseStatement());
    }
    expect(TokenType.SYMBOL, '}');
    return { type: 'Block', statements };
  }

  function parseIf(): IfStatement {
    expect(TokenType.KEYWORD, 'if');
    const condition = parseExpression();
    const thenBlock = parseBlock();
    let elseBlock: BlockNode | IfStatement | undefined = undefined;

    if (match(TokenType.KEYWORD, 'else')) {
      if (check(TokenType.KEYWORD, 'if')) {
        elseBlock = parseIf();
      } else {
        elseBlock = parseBlock();
      }
    }

    return { type: 'If', condition, thenBlock, elseBlock };
  }

  function parseWhile(): WhileStatement {
    expect(TokenType.KEYWORD, 'while');
    const condition = parseExpression();
    const body = parseBlock();
    return { type: 'While', condition, body };
  }

  function parseFor(): ForStatement {
    expect(TokenType.KEYWORD, 'for');
    const variable = expect(TokenType.IDENTIFIER).value;
    expect(TokenType.SYMBOL, '=');
    const start = parseExpression();
    expect(TokenType.KEYWORD, 'to');
    const end = parseExpression();
    
    let step: ExpressionNode | undefined = undefined;
    if (match(TokenType.KEYWORD, 'step')) {
       step = parseExpression();
    }
    
    const body = parseBlock();
    return { type: 'For', variable, start, end, step, body };
  }

  function parseImport(): ImportStatement {
    expect(TokenType.KEYWORD, 'import');
    let items: string[] | null = null;
    let source = '';
    
    const t = peek();
    
    if (t.type === TokenType.STRING) {
      source = advance().value;
    } else {
      const ids: string[] = [];
      ids.push(expect(TokenType.IDENTIFIER).value);
      while (match(TokenType.SYMBOL, ',')) {
        ids.push(expect(TokenType.IDENTIFIER).value);
      }

      if (match(TokenType.KEYWORD, 'from')) {
         items = ids;
         const srcToken = peek();
         if (srcToken.type === TokenType.STRING) {
            source = advance().value;
         } else {
            source = expect(TokenType.IDENTIFIER).value;
         }
      } else {
         if (ids.length === 1) {
            source = ids[0];
            items = null;
         } else {
            throw new Error(`Syntax Error: Expected 'from' after import list at line ${t.line}`);
         }
      }
    }

    let alias: string | null = null;
    if (match(TokenType.KEYWORD, 'as')) {
      alias = expect(TokenType.IDENTIFIER).value;
    }

    return { type: 'Import', source, items, alias };
  }

  function parseConsolePrint(): StatementNode {
    expect(TokenType.IDENTIFIER, 'console');
    expect(TokenType.SYMBOL, '.');
    expect(TokenType.IDENTIFIER, 'print');
    expect(TokenType.SYMBOL, '(');
    const msg = parseExpression(); 
    expect(TokenType.SYMBOL, ')');
    return { type: 'ConsolePrint', message: msg as any }; // Cast for type compatibility in AST
  }

  function parseAssignment(): AssignmentStatement {
    const id = expect(TokenType.IDENTIFIER).value;
    expect(TokenType.SYMBOL, '=');
    const expr = parseExpression();
    return { type: 'Assignment', identifier: id, value: expr };
  }

  // Expression Parsing with Precedence

  function parseExpression(): ExpressionNode {
    return parseLogicOr();
  }

  function parseLogicOr(): ExpressionNode {
      return parseEquality();
  }

  function parseEquality(): ExpressionNode {
      let expr = parseComparison();
      while (match(TokenType.OPERATOR, '==') || match(TokenType.OPERATOR, '!=')) {
          const operator = tokens[current - 1].value;
          const right = parseComparison();
          expr = { type: 'BinaryExpr', left: expr, operator, right } as BinaryExpression;
      }
      return expr;
  }

  function parseComparison(): ExpressionNode {
      let expr = parseTerm();
      while (match(TokenType.SYMBOL, '>') || match(TokenType.SYMBOL, '<') || 
             match(TokenType.OPERATOR, '>=') || match(TokenType.OPERATOR, '<=')) {
          const operator = tokens[current - 1].value;
          const right = parseTerm();
          expr = { type: 'BinaryExpr', left: expr, operator, right } as BinaryExpression;
      }
      return expr;
  }

  function parseTerm(): ExpressionNode {
      let expr = parseFactor();
      while (match(TokenType.SYMBOL, '+') || match(TokenType.SYMBOL, '-')) {
          const operator = tokens[current - 1].value;
          const right = parseFactor();
          expr = { type: 'BinaryExpr', left: expr, operator, right } as BinaryExpression;
      }
      return expr;
  }

  function parseFactor(): ExpressionNode {
      let expr = parseUnary();
      // Added % support here
      while (match(TokenType.SYMBOL, '*') || match(TokenType.SYMBOL, '/') || match(TokenType.SYMBOL, '%')) {
          const operator = tokens[current - 1].value;
          const right = parseUnary();
          expr = { type: 'BinaryExpr', left: expr, operator, right } as BinaryExpression;
      }
      return expr;
  }

  function parseUnary(): ExpressionNode {
     if (match(TokenType.SYMBOL, '-')) {
        // Handle unary minus as 0 - expression
        return { 
           type: 'BinaryExpr', 
           left: { type: 'Literal', value: 0 } as LiteralExpression,
           operator: '-', 
           right: parseUnary() 
        } as BinaryExpression;
     }
     return parsePrimary();
  }

  function parsePrimary(): ExpressionNode {
    const token = peek();

    if (token.type === TokenType.NUMBER) {
       return { type: 'Literal', value: parseFloat(advance().value) };
    }
    
    if (token.type === TokenType.STRING) {
       return { type: 'Literal', value: advance().value };
    }

    if (token.value === 'cube') return parseCube();
    if (token.value === 'mesh') return parseMesh();
    if (token.value === 'material') return parseMaterial();
    if (token.value === 'modifier') return parseModifier();
    if (token.value === 'group') return parseGroup();

    if (token.type === TokenType.IDENTIFIER) {
       const id = advance();
       
       if (check(TokenType.SYMBOL, '(')) {
         // Call Expression (e.g., int(5), someFunc())
         advance(); // (
         const args: ExpressionNode[] = [];
         if (!check(TokenType.SYMBOL, ')')) {
             args.push(parseExpression());
             while (match(TokenType.SYMBOL, ',')) {
                 args.push(parseExpression());
             }
         }
         expect(TokenType.SYMBOL, ')');
         return { type: 'CallExpr', callee: id.value, args };
       }
       else if (check(TokenType.SYMBOL, '.') && peek(1).type === TokenType.IDENTIFIER && peek(2).type === TokenType.SYMBOL && peek(2).value === '(') {
           advance(); // .
           const sub = expect(TokenType.IDENTIFIER).value;
           return { type: 'Reference', name: id.value, callArgs: sub };
       }
       
       return { type: 'Reference', name: id.value };
    }

    if (match(TokenType.SYMBOL, '(')) {
        const expr = parseExpression();
        expect(TokenType.SYMBOL, ')');
        return expr;
    }

    throw new Error(`Unknown expression starting with '${token.value}' at line ${token.line}`);
  }

  // --- Specialized Parsers ---

  function parseCube(): CubeExpression {
    expect(TokenType.KEYWORD, 'cube');
    expect(TokenType.SYMBOL, '(');
    const vertices: string[] = [];
    let buffer = "";
    // Note: This relies on manual token processing, so '-' is just another token added to buffer
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
          const parseCoord = () => {
             let multiplier = 1;
             if (match(TokenType.SYMBOL, '-')) {
                multiplier = -1;
             }
             const val = parseFloat(expect(TokenType.NUMBER).value);
             return val * multiplier;
          };

          const x = parseCoord();
          expect(TokenType.SYMBOL, ',');
          const y = parseCoord();
          expect(TokenType.SYMBOL, ',');
          const z = parseCoord();
          expect(TokenType.SYMBOL, ';');
          vertices.push({ x, y, z });
        }
      } else if (key === 'faces') {
        while (peek().value !== ']') {
          const indices: number[] = [];
          while (true) {
            indices.push(parseInt(expect(TokenType.NUMBER).value));
            if (!match(TokenType.SYMBOL, ',')) break;
          }
          let materialRef: any = undefined;
          if (match(TokenType.SYMBOL, ':')) {
             const refName = expect(TokenType.IDENTIFIER).value;
             if (match(TokenType.SYMBOL, '.')) {
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
      const keys: string[] = [];
      keys.push(expect(TokenType.IDENTIFIER).value);
      while (match(TokenType.SYMBOL, ',')) {
        keys.push(expect(TokenType.IDENTIFIER).value);
      }

      expect(TokenType.SYMBOL, '=');
      const values: ExpressionNode[] = [];
      values.push(parseExpression());
      while (match(TokenType.SYMBOL, ',')) {
        values.push(parseExpression());
      }
      
      if (keys.length === values.length) {
         keys.forEach((k, i) => props[k] = values[i]);
      } else if (keys.length === 1) {
         props[keys[0]] = values;
      } else {
         throw new Error(`Count mismatch in assignment: ${keys.length} keys vs ${values.length} values`);
      }
    }
    return props;
  }

  function parseAction(): StatementNode {
    const objectName = expect(TokenType.IDENTIFIER).value;
    let subTarget: string | null = null;
    if (match(TokenType.SYMBOL, '(')) {
      subTarget = expect(TokenType.IDENTIFIER).value;
      expect(TokenType.SYMBOL, ')');
    }

    expect(TokenType.SYMBOL, '.');
    const propOrMethod = expect(TokenType.IDENTIFIER).value;

    if (match(TokenType.SYMBOL, '=')) {
      let val: any;
      const t1 = peek();
      
      // Legacy coordinate list support for PropertyAssignment
      if ((t1.type === TokenType.NUMBER || t1.value === '-') && peek(1).value === ',') {
         // This is a special legacy case: pos = -1, 2, 3
         // We must handle signs manually here too if we want legacy support to work with negatives
         const coords = [];
         while (peek().type === TokenType.NUMBER || peek().value === '-' || peek().value === ',') {
           if (match(TokenType.SYMBOL, ',')) continue;
           
           let mult = 1;
           if (match(TokenType.SYMBOL, '-')) mult = -1;
           
           if (peek().type === TokenType.NUMBER) {
              coords.push(parseFloat(advance().value) * mult);
           } else {
              break; 
           }
         }
         val = coords;
      } else {
         val = parseExpression();
      }

      return {
        type: 'PropertyAssignment',
        objectName,
        subTarget,
        property: propOrMethod,
        value: val
      };

    } else if (match(TokenType.SYMBOL, '(')) {
      const args = [];
      let exclusion: string | null = null;

      while (!check(TokenType.SYMBOL, ')')) {
        if (match(TokenType.KEYWORD, 'not')) {
           exclusion = expect(TokenType.IDENTIFIER).value;
        } else {
           args.push(parseExpression());
           if (check(TokenType.SYMBOL, ',')) advance();
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