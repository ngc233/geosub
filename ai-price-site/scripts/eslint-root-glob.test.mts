import assert from 'node:assert/strict';
import {test} from 'node:test';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const pluginRoot=path.dirname(require.resolve('@next/eslint-plugin-next'));
const {getRootDirs}=require(path.join(pluginRoot,'utils/get-root-dirs.js'));

test('Next ESLint root discovery preserves directories, glob patterns and defaults with the scoped adapter',()=>{
 const root=mkdtempSync(path.join(tmpdir(),'geosub-eslint-glob-'));
 try{
  for(const name of ['app-one','app-two','other'])mkdirSync(path.join(root,name));
  writeFileSync(path.join(root,'app-file'),'not a directory');
  const discover=(rootDir: string|string[])=>getRootDirs({cwd:root,settings:{next:{rootDir}}}).sort();
  const expected=['app-one','app-two'].map(n=>path.join(root,n)).sort();
  assert.deepEqual(getRootDirs({cwd:root,settings:{}}),[root]);
  assert.deepEqual(discover(root+'/app-*'),expected);
  assert.deepEqual(discover(root+'/{app-one,app-two}'),expected);
  assert.deepEqual(discover([root+'/app-one',root+'/app-two']),expected);
  assert.deepEqual(discover(root+'/missing-*'),[]);
 }finally{rmSync(root,{recursive:true,force:true});}
});

test('root glob rejects deeply nested configuration without exhausting the stack',()=>{
 const {globSync}=createRequire(path.join(pluginRoot,'index.js'))('fast-glob');
 assert.throws(()=>globSync('{'.repeat(1000)+'x'+'}'.repeat(1000),{onlyDirectories:true}), /too deeply nested/);
 assert.throws(()=>globSync('x'.repeat(4097),{onlyDirectories:true}), /too long/);
 assert.throws(()=>globSync('app-*',{onlyFiles:true}), /Unsupported/);
});

test('relative roots remain relative and literal directories do not expand',()=>{
 const root=mkdtempSync(path.join(process.cwd(),'eslint-glob-fixture-'));
 try {
  mkdirSync(path.join(root,'app-one','nested'),{recursive:true});
  mkdirSync(path.join(root,'app-two'));
  mkdirSync(path.join(root,'.hidden'));
  const relative=path.relative(process.cwd(),root).replaceAll('\\','/');
  const discover=(pattern:string)=>getRootDirs({cwd:process.cwd(),settings:{next:{rootDir:pattern}}}).sort();
  assert.deepEqual(discover(relative+'/app-*'),[relative+'/app-one',relative+'/app-two']);
  assert.deepEqual(discover(relative+'/app-one'),[relative+'/app-one']);
  assert.deepEqual(discover(relative+'/*'),[relative+'/app-one',relative+'/app-two']);
 } finally {rmSync(root,{recursive:true,force:true});}
});
