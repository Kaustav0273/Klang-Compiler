
export enum TokenType {
  KEYWORD = 'KEYWORD', // import, from, as, material, group, modifier, cube, not, mesh, if, else, while, for, to, step, int, float, string, bool
  IDENTIFIER = 'IDENTIFIER',
  STRING = 'STRING',
  NUMBER = 'NUMBER',
  SYMBOL = 'SYMBOL', // { } [ ] ( ) = : , . ; + - * / > < !
  OPERATOR = 'OPERATOR', // == != >= <=
  EOF = 'EOF'
}

export interface Token {
  type: TokenType;
  value: string;
  line: number;
}

// --- AST Nodes ---

export interface ASTNode {
  type: string;
}

export interface ProgramNode extends ASTNode {
  type: 'Program';
  statements: StatementNode[];
}

export type StatementNode = 
  | ImportStatement
  | AssignmentStatement
  | PropertyAssignmentStatement
  | MethodCallStatement
  | ConsolePrintStatement
  | IfStatement
  | WhileStatement
  | ForStatement;

export interface ImportStatement extends ASTNode {
  type: 'Import';
  source: string; 
  alias: string | null;
  items: string[] | null; 
}

export interface AssignmentStatement extends ASTNode {
  type: 'Assignment';
  identifier: string;
  value: ExpressionNode;
}

export interface PropertyAssignmentStatement extends ASTNode {
  type: 'PropertyAssignment';
  objectName: string;
  subTarget: string | null; 
  property: string; 
  value: any;
}

export interface MethodCallStatement extends ASTNode {
  type: 'MethodCall';
  objectName: string;
  method: string; 
  args: any[];
  exclusion: string | null; 
}

export interface ConsolePrintStatement extends ASTNode {
  type: 'ConsolePrint';
  message: ExpressionNode; // changed from string to ExpressionNode to support concatenations
}

// Control Flow

export interface BlockNode extends ASTNode {
  type: 'Block';
  statements: StatementNode[];
}

export interface IfStatement extends ASTNode {
  type: 'If';
  condition: ExpressionNode;
  thenBlock: BlockNode;
  elseBlock?: BlockNode | IfStatement;
}

export interface WhileStatement extends ASTNode {
  type: 'While';
  condition: ExpressionNode;
  body: BlockNode;
}

export interface ForStatement extends ASTNode {
  type: 'For';
  variable: string;
  start: ExpressionNode;
  end: ExpressionNode;
  step?: ExpressionNode;
  body: BlockNode;
}

// --- Expressions ---

export type ExpressionNode = 
  | CubeExpression
  | MeshExpression
  | MaterialExpression
  | ModifierExpression
  | GroupExpression
  | ReferenceExpression
  | LiteralExpression
  | BinaryExpression
  | CallExpression;

export interface CubeExpression extends ASTNode {
  type: 'CubeExpr';
  vertices: string[]; 
}

export interface MeshExpression extends ASTNode {
  type: 'MeshExpr';
  vertices: {x: number, y: number, z: number}[];
  faces: MeshFace[];
}

export interface MeshFace {
  indices: number[];
  materialRef?: string | { lib: string, item: string };
}

export interface MaterialExpression extends ASTNode {
  type: 'MaterialExpr';
  properties: Record<string, any>;
}

export interface ModifierExpression extends ASTNode {
  type: 'ModifierExpr';
  modifierType: string; 
  properties: Record<string, any>;
}

export interface GroupExpression extends ASTNode {
  type: 'GroupExpr';
  children: string[];
}

export interface ReferenceExpression extends ASTNode {
  type: 'Reference';
  name: string;
  callArgs?: string; 
}

export interface LiteralExpression extends ASTNode {
  type: 'Literal';
  value: any;
}

export interface BinaryExpression extends ASTNode {
  type: 'BinaryExpr';
  left: ExpressionNode;
  operator: string;
  right: ExpressionNode;
}

export interface CallExpression extends ASTNode {
  type: 'CallExpr';
  callee: string;
  args: ExpressionNode[];
}

// --- Runtime Types ---

export interface CompilerResult {
  sceneGraph: Record<string, any>;
  logs: string[];
  errors: string[];
  scope?: Record<string, any>;
}
