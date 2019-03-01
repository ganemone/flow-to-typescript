import { sync } from 'glob';
import { readFile, writeFile } from 'mz/fs';
import { basename, resolve } from 'path';
import { compile } from '../src';
import { format } from 'prettier';
let tests = ['rules', 'unit'];

tests.forEach(runTest);

function runTest(dir) {
  sync(resolve(__dirname, `${dir}/*/`))
    .filter(_ => !_.endsWith('.json'))
    .filter(_ => !basename(_).startsWith('_'))
    .map(async folder => {
      test(basename(folder), async () => {
        let filein = resolve(folder, 'input.js');
        let fileOut = resolve(folder, 'output.tsx');
        let input = await readFile(filein, 'utf-8');
        let result = format(await compile(input), { parser: 'typescript' });
        if (process.env.REGENERATE_FIXTURES) {
          await writeFile(fileOut, result);
        }
        let output = await readFile(fileOut, 'utf-8');
        expect(result).toEqual(output);
      });
    });
}
