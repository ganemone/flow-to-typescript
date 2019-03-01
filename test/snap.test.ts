import { compile } from '../src';

test('types', async () => {
  const input = `
/* @flow */
type A = void
type B = null
type C = boolean
type D = number
type E = string
type F = ?string
type G = {
  a: number
}
type H = {
  a: number,
  b: ?string
}
type I = {
  a<T: number, U>(b: T, c: U | number): T;
}
  `;
  const result = await compile(input);
  expect(result).toMatchInlineSnapshot(`
"type A = void;
type B = null;
type C = boolean;
type D = number;
type E = string;
type F = string | null | undefined;
type G = {
  a: number;
};
type H = {
  a: number;
  b: string | null | undefined;
};
type I = {
  a: <T extends number, U>(b: T, c: U | number) => T;
};"
`);
});

test('unions', async () => {
  const input = `
/* @flow */
type A = boolean | number
type B = boolean | number | string | object
  `;
  const result = await compile(input);
  expect(result).toMatchInlineSnapshot(`
"type A = boolean | number;
type B = boolean | number | string | object;"
`);
});

test('exact types', async () => {
  const input = `
/* @flow */
type A = {|
  a: string,
|}
  `;
  const result = await compile(input);
  expect(result).toMatchInlineSnapshot(`
"type A = {
  a: string;
};"
`);
});

test('functions', async () => {
  const input = `
/* @flow */
export function a<A, B: A>(a: A, b: B): B {
  return b;
}
export function b(a, b) {
  return b;
}
  `;
  const result = await compile(input);
  expect(result).toMatchInlineSnapshot(`
"export function a<A, B extends A>(a: A, b: B): B {
  return b;
}
export function b(a, b) {
  return b;
}"
`);
});

test('type casting', async () => {
  const input = `
// @flow
let value = 42;
let newValue = ((value: any): string);`;
  const result = await compile(input);
  expect(result).toMatchInlineSnapshot(`
"let value = 42;
let newValue = ((value as any) as string);"
`);
});

test('interfaces', async () => {
  const input = `
// @flow
interface Test {
  hello?: string
}

interface Foo<A, B: Test> {
    a?: A;
    b: B;
}

interface Other extends Test, Foo<any, any> {
  c: string
}

class A implements Foo<any, any> {
    b: {
      hello: 'test'
    }
}
  `;
  expect(await compile(input)).toMatchInlineSnapshot(`
"interface Test {
  hello?: string;
}
interface Foo<A, B extends Test> {
  a?: A;
  b: B;
}
interface Other extends Test, Foo<any, any> {
  c: string;
}

class A implements Foo<any, any> {
  b: {
    hello: \\"test\\";
  };
}"
`);
});

test('function type definitions', async () => {
  const input = `
// @flow
type a = (a: string) => string  
type b<T: Object> = (b: T) => T
`;
  expect(await compile(input)).toMatchInlineSnapshot(`
"type a = (a: string) => string;
type b<T extends Object> = (b: T) => T;"
`);
});

test('qualifying', async () => {
  const input = `
// @flow
type a = {
  prop?: key.value,
};`;
  expect(await compile(input)).toMatchInlineSnapshot(`
"type a = {
  prop?: key.value;
};"
`);
});

test('optional chaining', async () => {
  const input = `
// @flow
const a = a?.b?.c?.d;
const b = a?.b[0].location || {};
const c = a.b[0]?.asdf;
const d = a.b[0];
  `;
  expect(await compile(input)).toMatchInlineSnapshot(`
"const a = a && a.b && a.b.c && a.b.c.d;
const b = a && a.b && a.b[0] && a.b[0].location || {};
const c = a.b[0] && a.b[0].asdf;
const d = a.b[0];"
`);
});

test('class properties', async () => {
  const input = `
// @flow
doSomething({
  data: { 
    ...data,
    moreData: [a.b?.c, ...(a?.b || [])]
  }
});
`;
  expect(await compile(input)).toMatchInlineSnapshot(`
"doSomething({
  data: { ...data,
    moreData: [a.b && a.b.c, ...(a && a.b || [])]
  }
});"
`);
});

test('parameter union', async () => {
  const input = `
// @flow
const thing = (a: string | (any => string)) => 'test';
`;
  expect(await compile(input)).toMatchInlineSnapshot(`
"const thing = (a: string | _tmp) => 'test';

type _tmp = (a: any) => string;"
`);
});

test('optional parameters', async () => {
  const input = `
// @flow
function test(a?: string, b: ?string) {
}
`;
  expect(await compile(input)).toMatchInlineSnapshot(
    `"function test(a?: string, b?: string | null | undefined) {}"`
  );
});

test('nullable parameters', async () => {
  const input = `
// @flow
export type doThing = (options: ?string) => string`;
  expect(await compile(input)).toMatchInlineSnapshot(
    `"export type doThing = (options?: string | null | undefined) => string;"`
  );
});

test('namespace', async () => {
  const input = `
// @flow
export type Thing = a.b;
`;
  expect(await compile(input)).toMatchInlineSnapshot(`"export type Thing = a.b;"`);
});

test('extends class with params', async () => {
  const input = `
// @flow
class A extends B<C, D> {}
class E extends F.G<H> {}
`;
  expect(await compile(input)).toMatchInlineSnapshot(`
"class A extends B<C, D> {}

class E extends F.G<H> {}"
`);
});

test('implements class with params', async () => {
  const input = `
// @flow
class A implements B<C, D> {}
`;
  expect(await compile(input)).toMatchInlineSnapshot(`"class A implements B<C, D> {}"`);
});

test('more generics', async () => {
  const input = `
// @flow 
test<string>(hello);
`;
  expect(await compile(input)).toMatchInlineSnapshot(`"test<string>(hello);"`);
});

test('generics with inline types', async () => {
  const input = `
// @flow
fn<
{
  b: typeof B.test
}>();
`;
  expect(await compile(input)).toMatchInlineSnapshot(`
"fn<{
  b: typeof B.test;
}>();"
`);
});
