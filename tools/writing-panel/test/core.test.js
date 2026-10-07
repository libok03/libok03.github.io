'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const core = require('../extension/core');

const source = '---\ntitle: "원래 제목"\ndraft: true\ndate: "2026-10-04"\ncategories:\n  - 논문 리뷰\n  - 알고리즘\nbibliography: references.bib\n---\n\n## 본문\n그대로 둔다.\n';
test('바탕 화면 작업 공간에서 중첩된 블로그를 찾는다', () => {
  const desktop = path.resolve('Desktop');
  const project = path.join(desktop, 'libok03.github.io');
  const exists = file => file === path.join(project, '_quarto.yml');
  assert.equal(core.findProjectRoot([desktop], path.join(project,'posts','first-review','index.qmd'), exists), project);
  assert.equal(core.findProjectRoot([desktop], path.join(desktop,'Morai','scene.json'), exists), project);
  assert.equal(core.findProjectRoot([project], undefined, exists), project);
  assert.equal(core.findProjectRoot([path.resolve('Other')], undefined, exists), null);
});
test('draft 변경은 인접한 YAML 키와 본문을 보존한다', () => {
  const result = core.updateMetadata(source, {draft:false});
  assert.ok(result.includes('draft: false\ndate: "2026-10-04"'));
  assert.ok(result.endsWith('\n\n## 본문\n그대로 둔다.\n'));
  assert.ok(result.includes('bibliography: references.bib'));
});
test('다중 행 카테고리와 특수문자 제목을 안전하게 교체한다', () => {
  const result = core.updateMetadata(source, {title:'제목 "인용" : 테스트', categories:['SLAM','논문 리뷰']});
  assert.ok(result.includes('title: ' + JSON.stringify('제목 "인용" : 테스트')));
  assert.ok(result.includes('categories: ["SLAM","논문 리뷰"]\nbibliography: references.bib'));
  assert.ok(!result.includes('  - 알고리즘'));
});
test('CRLF 파일과 없는 키도 처리한다', () => {
  const result = core.updateMetadata(source.replace(/\n/g, '\r\n'), {description:'한 줄 설명'});
  assert.ok(result.includes('description: "한 줄 설명"\r\n---\r\n'));
  assert.ok(result.endsWith('\r\n\r\n## 본문\r\n그대로 둔다.\r\n'));
});
test('글 경로와 비공개 파일 범위를 제한한다', () => {
  const root = path.resolve('workspace');
  assert.equal(core.articlePath(root, path.join(root,'posts','review-one','index.qmd')), 'posts/review-one/index.qmd');
  assert.equal(core.articlePath(root, path.resolve(root,'..','posts','review','index.qmd')), null);
  assert.equal(core.articlePath(root, path.join(root,'notes','index.qmd')), null);
  for (const f of ['notes/private.md','papers/paper.pdf','.tools/github/bin/gh.exe','posts/review/notes/private.md','secrets.txt']) assert.equal(core.allowedStage(f),false);
  assert.equal(core.allowedStage('posts/review/figures/image.png'),true);
  assert.equal(core.allowedStage('.github/workflows/quarto-pages.yml'),true);
});

function fixture(t, options={}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'paper-blog-test-'));
  t.after(() => fs.rmSync(root, {recursive:true, force:true}));
  const file = path.join(root,'posts','test-review','index.qmd');
  fs.mkdirSync(path.dirname(file), {recursive:true});
  fs.writeFileSync(file, source);
  fs.writeFileSync(path.join(root,'_quarto.yml'),'project:\n  type: website\n');
  const calls=[];
  const progress=[];
  const sha='a'.repeat(40);
  const runState={id:123,head_sha:sha,head_branch:'main',created_at:new Date().toISOString(),html_url:'https://github.com/example/run/123'};
  const run=async(exe,args)=>{
    calls.push({exe:path.basename(exe),args});
    const command=args.join(' ');
    if (options.fail && options.fail(exe,args)) throw new Error(options.error || 'simulated failure');
    if (path.basename(exe)==='git') {
      if (command==='remote get-url origin') return 'https://github.com/libok03/libok03.github.io.git\n';
      if (command==='diff --cached --name-only -z') return options.staged || 'posts/test-review/index.qmd\0';
      if (command==='rev-parse HEAD') return sha;
      if (command.startsWith('config user.')) return 'configured';
    }
    if (args[0]==='api') {
      if (args[1]==='repos/'+core.REPO) return JSON.stringify({default_branch:'main',permissions:{push:true,admin:true}});
      if (args[1]==='repos/'+core.REPO+'/pages') return JSON.stringify({build_type:'workflow'});
      if (args[1]?.includes('/runs?')) return JSON.stringify({workflow_runs:[runState]});
      if (args[1]?.endsWith('/actions/runs/123')) return JSON.stringify({status:'completed',conclusion:'success',html_url:runState.html_url});
    }
    if (path.basename(exe)==='quarto.exe' && options.editDuringBuild) fs.appendFileSync(file,'new user edit\n');
    return '';
  };
  return {root,file,calls,run,source,progress,options:{root,file,run,edit:async text=>fs.writeFileSync(file,text),progress:text=>progress.push(text),recordRun:async()=>{},sleep:async()=>{}}};
}
test('배포는 빌드 후 커밋·push·워크플로 실행·성공 확인까지 처리한다', async t=>{
  const f=fixture(t);
  const result=await core.publish(f.options);
  assert.equal(result.url,core.SITE+'posts/test-review/');
  assert.ok(fs.readFileSync(f.file,'utf8').includes('draft: false'));
  const commands=f.calls.map(c=>c.args.join(' '));
  const build=commands.indexOf('render --profile publish');
  const push=commands.indexOf('push origin HEAD:refs/heads/main');
  const dispatch=commands.findIndex(c=>c.startsWith('workflow run '));
  assert.ok(build>=0 && push>build && dispatch>push);
  assert.ok(commands.some(c=>c.startsWith('api repos/'+core.REPO+'/actions/runs/123')));
});
test('GitHub 인증 실패 시 수정과 업로드를 하지 않는다', async t=>{
  const f=fixture(t,{fail:(exe,args)=>args[0]==='auth' && args[1]==='status'});
  await assert.rejects(core.publish(f.options));
  assert.equal(fs.readFileSync(f.file,'utf8'),source);
  assert.ok(!f.calls.some(c=>c.args[0]==='push'));
});
test('원격 변경과 비공개 staged 파일은 업로드 전에 중단한다', async t=>{
  const f=fixture(t,{staged:'notes/private.md\0'});
  await assert.rejects(core.publish(f.options),/staged/);
  assert.ok(!f.calls.some(c=>c.args[0]==='push'));
  const g=fixture(t,{fail:(exe,args)=>args[0]==='merge-base'});
  await assert.rejects(core.publish(g.options),/새로운 변경/);
  assert.equal(fs.readFileSync(g.file,'utf8'),source);
});
test('로컬 빌드 실패 시 초안 상태를 복구하고 push하지 않는다', async t=>{
  const f=fixture(t,{fail:exe=>path.basename(exe)==='quarto.exe'});
  await assert.rejects(core.publish(f.options));
  assert.equal(fs.readFileSync(f.file,'utf8'),source);
  assert.ok(!f.calls.some(c=>c.args[0]==='push'));
});
test('빌드 중 사용자가 편집하면 글을 덮어쓰지 않는다', async t=>{
  const f=fixture(t,{editDuringBuild:true});
  await assert.rejects(core.publish(f.options),/빌드 중 글이 바뀌/);
  assert.ok(fs.readFileSync(f.file,'utf8').endsWith('new user edit\n'));
  assert.ok(!f.calls.some(c=>c.args[0]==='push'));
});
test('온라인 배포 실패를 완료로 보고하지 않는다', async t=>{
  const f=fixture(t,{fail:(exe,args)=>args[0]==='api' && args[1]?.endsWith('/actions/runs/123'),error:'HTTP 403'});
  await assert.rejects(core.publish(f.options),/403/);
  assert.ok(fs.readFileSync(f.file,'utf8').includes('draft: false'));
});
