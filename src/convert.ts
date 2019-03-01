import * as t from '@babel/types';
import { generateFreeIdentifier } from './utils';

export function convert(f: t.File): t.File {
  const result = ts(f);
  return result;
}

export let ts = (node: any) => {
  if (!node) {
    return node;
  }
  if (Array.isArray(node)) {
    return node.map(ts);
  }
  if (!node.type) {
    return node;
  }
  const newNode = getNode();
  if (node.returnType) {
    newNode.returnType = t.tsTypeAnnotation(ts(node.returnType));
  } else if (node.typeAnnotation && node.type !== 'TypeCastExpression') {
    newNode.typeAnnotation = t.tsTypeAnnotation(ts(node.typeAnnotation));
  }
  const copyProps = [
    'leadingComments',
    'trailingComments',
    'innerComments',
    'optional',
    'async',
    'generator',
    'superClass',
    'superTypeParameters',
    'mixins',
    'typeParameters',
    'typeArguments',
  ];
  copyProps.forEach(p => {
    if (node[p]) {
      newNode[p] = ts(node[p]);
    }
  });

  if (node.implements) {
    newNode.implements = node.implements;
  }

  return newNode;

  function getNode() {
    switch (node.type) {
      case 'File':
        return t.file(ts(node.program), node.comments, node.tokens);
      case 'Program':
        return t.program(ts(node.body), node.directives);
      case 'CommentBlock':
        return node;
      case 'CommentLine':
        return node;
      // Statements
      case 'OptionalMemberExpression':
        return convertOptionalMemberExpression(node);
      case 'VariableDeclaration':
        return t.variableDeclaration(node.kind, ts(node.declarations));
      case 'VariableDeclarator':
        return t.variableDeclarator(ts(node.id), ts(node.init));
      case 'BlockStatement':
        return t.blockStatement(ts(node.body), ts(node.directives));
      case 'DoWhileStatement':
        return t.doWhileStatement(ts(node.test), ts(node.body));
      case 'ExpressionStatement':
        return t.expressionStatement(ts(node.expression));
      case 'ForInStatement':
        return t.forInStatement(ts(node.left), ts(node.right), ts(node.body));
      case 'ForStatement':
        return t.forStatement(ts(node.init), ts(node.test), ts(node.update), ts(node.body));
      case 'FunctionDeclaration':
        return t.functionDeclaration(
          ts(node.id),
          ts(node.params),
          ts(node.body),
          node.generator,
          node.async
        );
      case 'IfStatement':
        return t.ifStatement(ts(node.test), ts(node.consequent), ts(node.alternate));
      case 'LabeledStatement':
        return t.labeledStatement(ts(node.label), ts(node.body));
      case 'ReturnStatement':
        return t.returnStatement(ts(node.argument));
      case 'SwitchStatement':
        return t.switchStatement(ts(node.discriminant), ts(node.cases));
      case 'ThrowStatement':
        return t.throwStatement(ts(node.argument));
      case 'TryStatement':
        return t.tryStatement(ts(node.block), ts(node.handler), ts(node.finalizer));
      case 'WhileStatement':
        return t.whileStatement(ts(node.test), ts(node.body));
      case 'WithStatement':
        return t.withStatement(ts(node.object), ts(node.body));
      case 'ClassDeclaration':
        return t.classDeclaration(
          ts(node.id),
          ts(node.superClass),
          ts(node.body),
          ts(node.decorators)
        );
      case 'ClassExpression':
        return t.classExpression(
          ts(node.id),
          ts(node.superClass),
          ts(node.body),
          ts(node.decorators)
        );
      case 'ClassProperty':
        return t.classProperty(
          ts(node.key),
          ts(node.value),
          node.typeAnnotation ? t.tsTypeAnnotation(ts(node.typeAnnotation)) : null,
          node.decorators,
          node.computed
        ); // TODO: static
      case 'ExportAllDeclaration':
        return t.exportAllDeclaration(ts(node.source));
      case 'ExportDefaultDeclaration':
        return t.exportDefaultDeclaration(ts(node.declaration));
      case 'ExportNamedDeclaration':
        return t.exportNamedDeclaration(
          ts(node.declaration),
          node.specifiers.map(_ => ts(_)),
          ts(node.source)
        );
      case 'ForOfStatement':
        return t.forOfStatement(ts(node.left), ts(node.right), ts(node.body));
      case 'ImportDeclaration':
        return t.importDeclaration(ts(node.specifiers), ts(node.source));
      case 'BreakStatement':
        return t.breakStatement(ts(node.label));
      case 'ContinueStatement':
        return t.continueStatement(ts(node.label));
      case 'TaggedTemplateExpression':
        return t.taggedTemplateExpression(ts(node.tag), ts(node.quasi));
      case 'CatchClause':
        return t.catchClause(ts(node.param), ts(node.body));
      case 'RestElement':
        return t.restElement(ts(node.argument));
      case 'RegExpLiteral':
        return node;
      // Flow types
      case 'ClassImplements':
        throw new Error('Should not reach this');
      case 'DeclareClass':
        return node;
      case 'DeclareFunction':
        return node;
      case 'DeclareInterface':
        return node; // TODO
      case 'DeclareModule':
        return node; // TODO
      case 'DeclareTypeAlias':
        return node; // TODO
      case 'DeclareVariable':
        return node; // TODO
      case 'FunctionTypeParam':
        return node; // TODO
      case 'InterfaceExtends':
        return t.tsExpressionWithTypeArguments(ts(node.id), ts(node.typeParameters));
      case 'InterfaceDeclaration':
        return getInterfaceDeclaration(node);
      case 'TypeAlias':
        return t.tsTypeAliasDeclaration(ts(node.id), ts(node.typeParameters), ts(node.right));
      case 'TypeCastExpression':
        return t.tsAsExpression(ts(node.expression), ts(node.typeAnnotation));
      case 'TypeParameterDeclaration':
        return t.tsTypeParameterDeclaration(ts(node.params));
      case 'TypeParameter':
        return getTypeParameter(ts(node.bound), ts(node.default), node.name);
      case 'TypeParameterInstantiation':
        return t.tsTypeParameterInstantiation(ts(node.params));
      case 'ObjectTypeCallProperty':
        return ts(node.value);
      case 'ObjectTypeIndexer':
        const name = (node.id && node.id.name) || 'key';
        let type;
        if (node.key.type === 'GenericTypeAnnotation') {
          // typescript doesn't support identifiers as type indexers
          type = t.tsStringKeyword();
        } else {
          type = ts(node.key);
        }
        const param = t.identifier(name);
        param.typeAnnotation = t.tsTypeAnnotation(type);
        return t.tsIndexSignature([param], t.tsTypeAnnotation(ts(node.value)));
      case 'QualifiedTypeIdentifier':
        return t.tsQualifiedName(ts(node.qualification), ts(node.id));
      case 'Variance':
        return node; // TODO

      // Flow type annotations
      case 'AnyTypeAnnotation':
        return t.tsAnyKeyword();
      case 'ArrayTypeAnnotation':
        return t.tsArrayType(ts(node.elementType));
      case 'BooleanTypeAnnotation':
        return t.tsBooleanKeyword();
      case 'BooleanLiteralTypeAnnotation':
        return t.tsLiteralType(t.booleanLiteral(node.value));
      case 'FunctionTypeAnnotation':
        return functionToTsType(node);
      case 'GenericTypeAnnotation':
        const id = node.id;
        if (id.type === 'Identifier') {
          const name = id.name;
          if (name === '$Keys') {
            const op = t.tsTypeOperator(ts(node.typeParameters.params[0]));
            op.operator = 'keyof';
            return op;
          } else if (name === '$Exact') {
            return ts(node.typeParameters.params[0]);
          } else if (name === '$ReadOnly') {
            node.id.name = 'Readonly';
          } else if (name === '$Values') {
            const param = ts(node.typeParameters.params[0]);
            const op = t.tsTypeOperator(param);
            op.operator = 'keyof';
            const replacement = t.tsIndexedAccessType(param, op);
            return replacement;
          } else if (name === '$Diff') {
            return t.tsAnyKeyword();
          }
        }
        return t.tsTypeReference(ts(node.id));
      case 'IntersectionTypeAnnotation':
        return t.tsIntersectionType(node.types.map(_ => ts(_)));
      case 'MixedTypeAnnotation':
        return t.tsAnyKeyword();
      case 'NullLiteralTypeAnnotation':
        return t.tsNullKeyword();
      case 'NullableTypeAnnotation':
        return t.tsUnionType([ts(node.typeAnnotation), t.tsNullKeyword(), t.tsUndefinedKeyword()]);
      case 'NumberLiteralTypeAnnotation':
        return t.tsLiteralType(t.numericLiteral(node.value));
      case 'NumberTypeAnnotation':
        return t.tsNumberKeyword();
      case 'StringLiteralTypeAnnotation':
        return t.tsLiteralType(t.stringLiteral(node.value));
      case 'StringTypeAnnotation':
        return t.tsStringKeyword();
      case 'ThisTypeAnnotation':
        return t.tsThisType();
      case 'TupleTypeAnnotation':
        return t.tsTupleType(node.types.map(_ => ts(_)));
      case 'TypeofTypeAnnotation':
        return t.tsTypeQuery(ts(node.argument.id));
      case 'TypeAnnotation':
        return ts(node.typeAnnotation);
      case 'ObjectTypeAnnotation':
        return t.tsTypeLiteral([
          ...node.properties.map(_ => {
            let s = t.tsPropertySignature(_.key, t.tsTypeAnnotation(ts(_.value)));
            s.optional = _.optional;
            return s;
            // TODO: variance
          }),
          ...ts(node.indexers),
          ...ts(node.callProperties),
        ]);
      case 'UnionTypeAnnotation':
        return t.tsUnionType(ts(node.types));
      case 'VoidTypeAnnotation':
        return t.tsVoidKeyword();

      case 'ObjectTypeProperty':
        let _ = t.tsPropertySignature(node.key, t.tsTypeAnnotation(ts(node.value)));
        _.optional = node.optional;
        _.readonly = node.variance && node.variance.kind === 'minus';
        return _;
      case 'NewExpression':
        return t.newExpression(ts(node.callee), ts(node.arguments));
      case 'CallExpression':
        return t.callExpression(ts(node.callee), ts(node.arguments));
      case 'ArrowFunctionExpression':
        return t.arrowFunctionExpression(ts(node.params), ts(node.body), node.async);
      case 'ClassBody':
        return t.classBody(ts(node.body));
      case 'Identifier':
        return t.identifier(node.name);
      case 'StringLiteral':
        return node;
      case 'ImportSpecifier':
        return t.importSpecifier(node.local, node.imported);
      case 'ImportDefaultSpecifier':
        return node;
      case 'ImportNamespaceSpecifier':
        return node;
      case 'NullLiteral':
        return node;
      case 'BooleanLiteral':
        return node;
      case 'ThisExpression':
        return node;
      case 'MemberExpression':
        return t.memberExpression(ts(node.object), ts(node.property), node.computed, node.optional);
      case 'ObjectProperty':
        return t.objectProperty(
          ts(node.key),
          ts(node.value),
          node.computed,
          node.shorthand,
          ts(node.decorators)
        );
      case 'ClassMethod':
        return t.classMethod(
          node.kind,
          node.key,
          ts(node.params),
          ts(node.body),
          node.computed,
          node.static
        );
      case 'LogicalExpression':
        return t.logicalExpression(node.operator, ts(node.left), ts(node.right));
      case 'ConditionalExpression':
        return t.conditionalExpression(ts(node.test), ts(node.consequent), ts(node.alternate));
      case 'AssignmentExpression':
        return t.assignmentExpression(node.operator, ts(node.left), ts(node.right));
      case 'UnaryExpression':
        return t.unaryExpression(node.operator, ts(node.argument), node.prefix);
      case 'ObjectPattern':
        return t.objectPattern(ts(node.properties));
      case 'ObjectExpression':
        return t.objectExpression(ts(node.properties));
      case 'AwaitExpression':
        return t.awaitExpression(ts(node.argument));
      case 'JSXElement':
        return t.jsxElement(
          ts(node.openingElement),
          ts(node.closingElement),
          ts(node.children),
          node.selfClosing
        );
      case 'JSXOpeningElement':
        return t.jsxOpeningElement(ts(node.name), ts(node.attributes), node.selfClosing);
      case 'JSXClosingElement':
        return t.jsxClosingElement(ts(node.name));
      case 'JSXFragment':
        return t.jsxFragment(ts(node.openingFragment), ts(node.closingFragment), ts(node.children));
      case 'JSXOpeningFragment':
        return node;
      case 'JSXClosingFragment':
        return node;
      case 'SpreadElement':
        return t.spreadElement(ts(node.argument));
      case 'NumericLiteral':
        return node;
      case 'ObjectMethod':
        return t.objectMethod(node.kind, node.key, ts(node.params), ts(node.body), node.computed);
      case 'BinaryExpression':
        return t.binaryExpression(node.operator, ts(node.left), ts(node.right));
      case 'ArrayExpression':
        return t.arrayExpression(ts(node.elements));
      case 'Super':
        return node;
      case 'TemplateLiteral':
        return t.templateLiteral(ts(node.quasis), ts(node.expressions));
      case 'TemplateElement':
        return node;
      case 'YieldExpression':
        return t.yieldExpression(ts(node.argument), node.delegate);
      case 'ForOfStatement':
        return t.forOfStatement(ts(node.left), ts(node.right), ts(node.body));
      case 'ArrayPattern':
        return t.arrayPattern(ts(node.elements));
      case 'AssignmentPattern':
        return t.assignmentPattern(ts(node.left), ts(node.right));
      case 'JSXAttribute':
        return t.jsxAttribute(ts(node.name), ts(node.value));
      case 'JSXExpressionContainer':
        return t.jsxExpressionContainer(ts(node.expression));
      case 'JSXText':
        return node;
      case 'JSXIdentifier':
        return node;
      case 'JSXSpreadAttribute':
        return t.jsxSpreadAttribute(ts(node.argument));
      case 'FunctionExpression':
        return t.functionExpression(
          ts(node.id),
          ts(node.params),
          ts(node.body),
          node.generator,
          node.async
        );
      case 'UpdateExpression':
        return t.updateExpression(node.operator, ts(node.argument), node.prefix);
      case 'SwitchCase':
        return t.switchCase(ts(node.test), ts(node.consequent));
      case 'ExportSpecifier':
        return node;
      case 'OpaqueType':
        return t.tsTypeAliasDeclaration(ts(node.id), ts(node.typeParameters), ts(node.impltype));
      case 'ExistsTypeAnnotation':
        return t.tsAnyKeyword();

      default:
        console.log('hit default', node.type);
        return node;
    }
  }
};

function getInterfaceDeclaration(node: t.InterfaceDeclaration) {
  return t.tsInterfaceDeclaration(
    ts(node.id),
    ts(node.typeParameters),
    node.extends.length ? ts(node.extends) : null,
    t.tsInterfaceBody(ts(node.body.properties))
  );
}

function functionToTsType(node: t.FunctionTypeAnnotation): t.TSFunctionType {
  let typeParams = undefined;

  if (node.typeParameters) {
    typeParams = t.tsTypeParameterDeclaration(
      node.typeParameters.params.map(_ => {
        // TODO: How is this possible?
        if (t.isTSTypeParameter(_)) {
          return _;
        }

        let constraint = _.bound ? ts(_.bound) : undefined;
        let default_ = _.default ? ts(_.default) : undefined;
        let param = t.tsTypeParameter(constraint, default_);
        param.name = _.name;
        return param;
      })
    );
  }

  let f = t.tsFunctionType(typeParams);

  // Params
  if (node.params) {
    // TODO: Rest params
    let paramNames = node.params
      .map(_ => _.name)
      .filter(_ => _ !== null)
      .map(_ => (_ as t.Identifier).name);
    f.parameters = node.params.map(_ => {
      let name = _.name && _.name.name;

      // Generate param name? (Required in TS, optional in Flow)
      if (name == null) {
        name = generateFreeIdentifier(paramNames);
        paramNames.push(name);
      }
      let id = t.identifier(name);
      if (_.typeAnnotation) {
        id.typeAnnotation = t.tsTypeAnnotation(ts(_.typeAnnotation));
      }
      id.optional = _.optional;
      return id;
    });
  }

  // Return type
  if (node.returnType) {
    f.typeAnnotation = t.tsTypeAnnotation(ts(node.returnType));
  }

  return f;
}

function removeOptional(node) {
  if (node.type === 'OptionalMemberExpression') {
    const expr = t.memberExpression(
      removeOptional(node.object) as t.Expression,
      node.property,
      node.computed,
      node.optional
    );
    return expr;
  }
  return node;
}

function convertOptionalMemberExpression(node) {
  let current = node;
  let q = [];
  while (current) {
    if (current.type === 'OptionalMemberExpression') {
      q.push(removeOptional(current));
      current = current.object;
    } else {
      current = null;
    }
  }
  let expr = null;
  while (q.length) {
    const expression = q.pop();
    if (!expr) {
      expr = t.logicalExpression('&&', expression.object, expression);
    } else {
      expr = t.logicalExpression('&&', expr, expression);
    }
  }

  return expr;
}

function getTypeParameter(bound, d, name) {
  const param = t.tsTypeParameter(bound, d);
  param.name = name;
  return param;
}
