'use strict';
const path = require('node:path');
const fs = require('node:fs');

const REPO = 'libok03/libok03.github.io';
const SITE = 'https://libok03.github.io/';
const PUBLISH_PATHS = [
  '.github/workflows/quarto-pages.yml', '.gitignore', '.vscode',
  '_quarto.yml', '_quarto-preview.yml', '_quarto-publish.yml',
  'index.qmd', 'about.qmd', 'styles', 'assets/research', 'templates', 'tools',
  'start-writing.cmd', 'README.md', 'posts'
];
function inside(root, file) {
  const rel = path.relative(root, file);
  return rel !== '' && !rel.startsWith('..' + path.sep) && rel !== '..' && !path.isAbsolute(rel);
}
function findProjectRoot(workspaces, activeFile, exists = fs.existsSync) {
  const roots = workspaces.map(p => path.resolve(p));
  if (activeFile) {
    let candidate = path.dirname(path.resolve(activeFile));
    while (roots.some(root => candidate === root || inside(root, candidate))) {
      if (exists(path.join(candidate, '_quarto.yml'))) return candidate;
      const parent = path.dirname(candidate);
      if (parent === candidate) break;
      candidate = parent;
    }
  }
  for (const root of roots) {
    if (exists(path.join(root, '_quarto.yml'))) return root;
    const nested = path.join(root, 'libok03.github.io');
    if (exists(path.join(nested, '_quarto.yml'))) return nested;
  }
  return null;
}
function articlePath(root, file) {
  if (!file || !inside(root, file)) return null;
  const rel = path.relative(root, file).split(path.sep).join('/');
  return /^posts\/[a-z0-9]+(?:-[a-z0-9]+)*\/index\.qmd$/.test(rel) ? rel : null;
}
function updateMetadata(source, fields) {
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  if (!match) throw new Error('글 맨 위에 YAML 정보가 필요합니다.');
  const eol = match[0].includes('\r\n') ? '\r\n' : '\n';
  let yaml = match[1].replace(/\r\n/g, '\n');
  for (const [key, value] of Object.entries(fields)) {
    if (!['title', 'description', 'categories', 'draft'].includes(key)) throw new Error('지원하지 않는 글 정보입니다.');
    // Only replace the top-level key, including an existing multiline value.
    const pattern = new RegExp('^' + key + ':[^\\n]*(?:\\n(?:[ \\t]+[^\\n]*|[ \\t]*(?=\\n|$)))*', 'm');
    const line = key + ': ' + JSON.stringify(value);
    yaml = pattern.test(yaml) ? yaml.replace(pattern, () => line) : yaml + '\n' + line;
  }
  return '---' + eol + yaml.replace(/\n/g, eol) + eol + '---' + eol + source.slice(match[0].length);
}
function allowedStage(file) {
  return PUBLISH_PATHS.some(p => file === p || file.startsWith(p + '/')) &&
    !file.split('/').some(p => ['.tools', 'notes', 'papers', '_preview', '_publish', '_site'].includes(p));
}
function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[c]));
}
async function publish({root, file, run, edit, progress, recordRun, sleep = ms => new Promise(r => setTimeout(r, ms))}) {
  const rel = articlePath(root, file);
  if (!rel) throw new Error('배포할 posts/.../index.qmd 파일을 먼저 열어 주세요.');
  const gh = path.join(root, '.tools', 'github', 'bin', 'gh.exe');
  const quarto = path.join(root, '.tools', 'bin', 'quarto.exe');
  const git = (args, options) => run('git', args, options);
  const api = (args, options) => run(gh, ['api', ...args], options);
  progress('GitHub 연결과 저장소 확인');
  await run(gh, ['auth', 'status', '--hostname', 'github.com'], {quiet: true});
  const remote = (await git(['remote', 'get-url', 'origin'])).trim();
  if (!/^(?:https:\/\/github\.com\/|git@github\.com:)libok03\/libok03\.github\.io(?:\.git)?\/?$/.test(remote)) {
    throw new Error('origin이 libok03/libok03.github.io 저장소인지 확인해 주세요.');
  }
  const repo = JSON.parse(await api(['repos/' + REPO]));
  if (!repo.permissions?.push || !repo.permissions?.admin) throw new Error('이 저장소에 쓰기 및 Pages 관리 권한이 있는 GitHub 계정으로 연결해 주세요.');
  const branch = repo.default_branch;
  if (!/^[\w./-]+$/.test(branch) || branch.startsWith('-')) throw new Error('기본 브랜치 이름을 확인할 수 없습니다.');
  const staged = (await git(['diff', '--cached', '--name-only', '-z'])).split('\0').filter(Boolean);
  if (staged.some(f => !allowedStage(f))) throw new Error('다른 작업의 staged 파일이 있습니다. Git 패널에서 해당 파일을 unstage한 뒤 배포해 주세요.');
  await git(['fetch', 'origin', branch]);
  try { await git(['merge-base', '--is-ancestor', 'origin/' + branch, 'HEAD']); }
  catch { throw new Error('GitHub에 이 PC보다 새로운 변경이 있습니다. 먼저 변경을 병합해야 합니다. 기존 글은 덮어쓰지 않았습니다.'); }
  const source = fs.readFileSync(file, 'utf8');
  const ready = updateMetadata(source, {draft: false});
  let committed = false;
  try {
    await edit(ready);
    progress('저장한 글로 발행 화면 만들기');
    await run(quarto, ['render', '--profile', 'publish']);
    if (fs.readFileSync(file, 'utf8') !== ready) throw new Error('빌드 중 글이 바뀌었습니다. 저장을 마친 뒤 다시 배포해 주세요.');
    // Bootstrap git identity locally, without changing global settings.
    const name = await git(['config', 'user.name'], {allowFailure: true});
    const email = await git(['config', 'user.email'], {allowFailure: true});
    if (!name.trim() || !email.trim()) {
      const user = JSON.parse(await api(['user']));
      if (!name.trim()) await git(['config', '--local', 'user.name', user.login]);
      if (!email.trim()) await git(['config', '--local', 'user.email', user.id + '+' + user.login + '@users.noreply.github.com']);
    }
    progress('변경 내용을 GitHub에 업로드');
    const paths = PUBLISH_PATHS.filter(p => fs.existsSync(path.join(root, p)));
    await git(['add', '--all', '--', ...paths]);
    const changes = (await git(['diff', '--cached', '--name-only', '-z'])).split('\0').filter(Boolean);
    if (changes.some(f => !allowedStage(f))) throw new Error('배포 대상 밖의 파일이 staged되어 작업을 중단했습니다.');
    if (changes.length) await git(['commit', '-m', 'Publish review: ' + rel.split('/')[1]]);
    committed = true;
    const sha = (await git(['rev-parse', 'HEAD'])).trim();
    await run(gh, ['auth', 'setup-git', '--hostname', 'github.com']);
    await git(['push', 'origin', 'HEAD:refs/heads/' + branch]);
    progress('GitHub Pages 설정');
    let pages;
    try { pages = JSON.parse(await api(['repos/' + REPO + '/pages'])); }
    catch (error) { if (!/404/.test(error.message)) throw error; }
    if (!pages || pages.build_type !== 'workflow') {
      await api(['--method', pages ? 'PUT' : 'POST', 'repos/' + REPO + '/pages', '-f', 'build_type=workflow']);
    }
    progress('온라인 배포 시작');
    const started = Date.now();
    await run(gh, ['workflow', 'run', 'quarto-pages.yml', '--repo', REPO, '--ref', branch]);
    let workflowRun;
    for (let i = 0; i < 20 && !workflowRun; i++) {
      const result = JSON.parse(await api(['repos/' + REPO + '/actions/workflows/quarto-pages.yml/runs?event=workflow_dispatch&per_page=20']));
      workflowRun = result.workflow_runs?.find(r => r.head_sha === sha && r.head_branch === branch && Date.parse(r.created_at) >= started - 5000);
      if (!workflowRun) await sleep(3000);
    }
    if (!workflowRun) throw new Error('배포 요청은 전송됐지만 실행 번호를 확인하지 못했습니다. 배포 상태 버튼에서 확인해 주세요.');
    await recordRun(workflowRun);
    for (let i = 0; i < 120; i++) {
      const state = JSON.parse(await api(['repos/' + REPO + '/actions/runs/' + workflowRun.id], {quiet: true}));
      if (state.status === 'completed') {
        if (state.conclusion !== 'success') throw new Error('온라인 배포가 ' + state.conclusion + ' 상태로 종료됐습니다. 배포 상태 버튼으로 로그를 확인해 주세요.');
        progress('배포 완료');
        return {url: SITE + rel.replace(/index\.qmd$/, ''), runUrl: state.html_url};
      }
      progress('온라인 빌드·배포 중 · ' + (i * 5) + '초');
      await sleep(5000);
    }
    throw new Error('배포가 계속 진행 중입니다. 배포 상태 버튼에서 결과를 확인해 주세요.');
  } catch (error) {
    if (!committed && ready !== source && fs.readFileSync(file, 'utf8') === ready) await edit(source);
    throw error;
  }
}
module.exports = {REPO, SITE, PUBLISH_PATHS, inside, findProjectRoot, articlePath, updateMetadata, allowedStage, escapeHtml, publish};
