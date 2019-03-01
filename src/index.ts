import traverse, { Node, Visitor } from '@babel/traverse';
import { File } from '@babel/types';
import { parse } from '@babel/parser';
import generate from '@babel/generator';
import { convert } from './convert';
import * as t from '@babel/types';
import { NodePath } from 'babel-traverse';

type Warning = [string, string, number, number];
type Rule = (warnings: Warning[]) => Visitor<Node>;

let rules = new Map<string, Rule>();

const parserOpts = {
  sourceType: 'module',
  plugins: [
    'flow',
    'jsx',
    'doExpressions',
    'objectRestSpread',
    ['decorators', { decoratorsBeforeExport: false }],
    'classProperties',
    'classPrivateProperties',
    'classPrivateMethods',
    'exportDefaultFrom',
    'exportNamespaceFrom',
    'asyncGenerators',
    'functionBind',
    'functionSent',
    'dynamicImport',
    'numericSeparator',
    'optionalChaining',
    'importMeta',
    'bigInt',
    'optionalCatchBinding',
    'throwExpressions',
    ['pipelineOperator', { proposal: 'minimal' }],
    'nullishCoalescingOperator',
  ],
};

export function addRule(ruleName: string, rule: Rule) {
  if (rules.has(ruleName)) {
    throw `A rule with the name "${ruleName}" is already defined`;
  }
  rules.set(ruleName, rule);
}

export async function compile(code: string) {
  let ast = parse(code, parserOpts);
  traverse(ast, {
    FunctionTypeParam(path: NodePath<t.FunctionTypeParam>) {
      if (
        path.node.typeAnnotation.type === 'NullableTypeAnnotation' &&
        path.node.optional === false
      ) {
        path.node.optional = true;
      }
    },
    TypeAnnotation(path: NodePath<t.TypeAnnotation>) {
      if (path.node.typeAnnotation.type === 'NullableTypeAnnotation') {
        // @ts-ignore
        path.parent.optional = true;
      }
    },
    FunctionTypeAnnotation(path: NodePath<t.FunctionTypeAnnotation>) {
      if (path.parentPath.type === 'TypeAlias' || path.parentPath.type === 'ObjectTypeProperty') {
        return;
      }
      const id = path.scope.generateUidIdentifier('tmp');
      // @ts-ignore
      const alias = t.typeAlias(id, null, path.node);
      let p = path;
      while (p.type !== 'Program') {
        // @ts-ignore
        p = p.parentPath;
      }
      // @ts-ignore
      p.node.body.push(alias);
      // @ts-ignore
      path.replaceWith(t.genericTypeAnnotation(id));
    },
  });
  ast = stripAtFlowAnnotation(convert(ast));
  return generate(ast).code;
}

function stripAtFlowAnnotation(ast: File): File {
  let { leadingComments } = ast.program.body[0];
  if (leadingComments) {
    let index = leadingComments.findIndex(_ => _.value.trim() === '@flow');
    if (index > -1) {
      // @ts-ignore
      leadingComments.splice(index, 1);
    }
  }
  return ast;
}
