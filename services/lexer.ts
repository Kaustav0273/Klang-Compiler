import { Token, TokenType } from '../types';

const KEYWORDS = new Set([
  'import', 'from', 'as', 
  'cube', 'material', 'modifier', 'group', 'mesh',
  'not', 'local'
]);

export function tokenize(source: string): Token[] {
  const tokens: Token[] = [];
  let cursor = 0;
  let line = 1;

  while (cursor < source.length) {
    const char = source[cursor];

    // Whitespace
    if (/\s/.test(char)) {
      if (char === '\n') line++;
      cursor++;
      continue;
    }

    // Comments (//)
    if (char === '/' && source[cursor + 1] === '/') {
      while (cursor < source.length && source[cursor] !== '\n') {
        cursor++;
      }
      continue;
    }
    
    // Comments (# legacy support)
    if (char === '#') {
      while (cursor < source.length && source[cursor] !== '\n') {
        cursor++;
      }
      continue;
    }

    // Symbols (Added ;)
    if (/[{}[\]():,=.;]/.test(char)) {
      tokens.push({ type: TokenType.SYMBOL, value: char, line });
      cursor++;
      continue;
    }

    // Numbers (integers and floats)
    if (/[0-9]/.test(char) || (char === '-' && /[0-9]/.test(source[cursor + 1] || ''))) {
      let value = char;
      cursor++;
      while (cursor < source.length && /[0-9.]/.test(source[cursor])) {
        value += source[cursor];
        cursor++;
      }
      tokens.push({ type: TokenType.NUMBER, value, line });
      continue;
    }

    // Strings
    if (char === '"') {
      let value = '';
      cursor++; // Skip opening quote
      while (cursor < source.length && source[cursor] !== '"') {
        value += source[cursor];
        cursor++;
      }
      cursor++; // Skip closing quote
      tokens.push({ type: TokenType.STRING, value, line });
      continue;
    }

    // Identifiers / Keywords / Special Sources
    if (/[a-zA-Z_@]/.test(char)) {
      let value = '';
      while (cursor < source.length && /[a-zA-Z0-9_\-@]/.test(source[cursor])) {
        value += source[cursor];
        cursor++;
      }

      if (KEYWORDS.has(value)) {
        tokens.push({ type: TokenType.KEYWORD, value, line });
      } else {
        tokens.push({ type: TokenType.IDENTIFIER, value, line });
      }
      continue;
    }

    // Unknown character
    cursor++;
  }

  tokens.push({ type: TokenType.EOF, value: '', line });
  return tokens;
}