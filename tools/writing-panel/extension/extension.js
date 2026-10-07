'use strict';
const vscode = require('vscode');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const {spawn} = require('node:child_process');
const {randomBytes} = require('node:crypto');
const core = require('./core');

let previewProcess;
function activate(context) {
  const root = core.findProjectRoot(
    (vscode.workspace.workspaceFolders || []).map(f => f.uri.fsPath),
    vscode.window.activeTextEditor?.document.uri.fsPath
  );
  if (!root) {
    const showFolder = async () => {
      const selected = await vscode.window.showOpenDialog({canSelectFolders:true, canSelectFiles:false, canSelectMany:false, title:'블로그 프로젝트 폴더 선택'});
      if (selected?.length) await vscode.commands.executeCommand('vscode.openFolder', selected[0], true);
    };
    context.subscriptions.push(vscode.window.registerWebviewViewProvider('paperBlog.controls', {resolveWebviewView(view) {
      view.webview.options = {enableScripts:true, localResourceRoots:[]};
      const nonce = randomBytes(16).toString('hex');
      view.webview.html = `<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}';"></head><body style="font-family:var(--vscode-font-family);color:var(--vscode-foreground);padding:12px"><h3>블로그 폴더를 찾지 못했습니다</h3><p>_quarto.yml이 있는 프로젝트 폴더를 선택해 주세요.</p><button id="open">블로그 폴더 열기</button><script nonce="${nonce}">const api=acquireVsCodeApi();document.getElementById('open').onclick=()=>api.postMessage({action:'folder'});</script></body></html>`;
      view.webview.onDidReceiveMessage(message => {if (message?.action === 'folder') showFolder();}, undefined, context.subscriptions);
    }}));
    context.subscriptions.push(vscode.commands.registerCommand('paperBlog.open', () => vscode.commands.executeCommand('workbench.view.extension.paperBlog')));
    for (const action of ['save','preview','new','publish']) context.subscriptions.push(vscode.commands.registerCommand('paperBlog.' + action, showFolder));
    return;
  }
  const output = vscode.window.createOutputChannel('논문 블로그');
  output.appendLine('집필 프로젝트: ' + root);
  const gh = path.join(root, '.tools', 'github', 'bin', 'gh.exe');
  const quarto = path.join(root, '.tools', 'bin', 'quarto.exe');
  let lastArticle = context.workspaceState.get('lastArticle');
  if (!lastArticle || !core.articlePath(root, lastArticle) || !fs.existsSync(lastArticle)) lastArticle = path.join(root, 'posts', 'first-review', 'index.qmd');
  let busy = false;
  let status = '버튼을 눌러 집필을 시작하세요.';
  let hasError = false;
  let controls;
  let previewPanel;
  const statusButton = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 20);
  statusButton.text = '$(notebook) 블로그 집필';
  statusButton.command = 'paperBlog.open';
  statusButton.tooltip = '저장 · 미리보기 · 배포 버튼';
  statusButton.show();
  const run = (executable, args, options = {}) => new Promise((resolve, reject) => {
    const isApi = executable === gh && args[0] === 'api';
    if (!options.quiet) output.appendLine('> ' + path.basename(executable) + ' ' + args.join(' '));
    const child = spawn(executable, args, {
      cwd: root, windowsHide: true, shell: false,
      env: {...process.env, GH_PROMPT_DISABLED: '1', GIT_TERMINAL_PROMPT: '0', GCM_INTERACTIVE: 'Never'}
    });
    let stdout = '', stderr = '';
    child.stdout.on('data', data => { stdout += data.toString('utf8'); if (!options.quiet && !isApi) output.append(data.toString('utf8')); });
    child.stderr.on('data', data => { stderr += data.toString('utf8'); if (!options.quiet) output.append(data.toString('utf8')); });
    child.on('error', reject);
    child.on('close', code => {
      if (code === 0) resolve(stdout);
      else if (options.allowFailure) resolve('');
      else reject(new Error((stderr || stdout || path.basename(executable) + ' 실행 실패').trim()));
    });
  });
  function remember(editor) {
    if (editor && core.articlePath(root, editor.document.uri.fsPath)) {
      lastArticle = editor.document.uri.fsPath;
      context.workspaceState.update('lastArticle', lastArticle);
    }
    refresh();
  }
  async function articleDocument() {
    const editor = vscode.window.activeTextEditor;
    if (editor && core.articlePath(root, editor.document.uri.fsPath)) lastArticle = editor.document.uri.fsPath;
    if (!lastArticle || !fs.existsSync(lastArticle)) throw new Error('리뷰 글을 먼저 열거나 새 리뷰를 만들어 주세요.');
    return vscode.workspace.openTextDocument(vscode.Uri.file(lastArticle));
  }
  async function save() {
    for (const doc of vscode.workspace.textDocuments) {
      if (doc.isDirty && !doc.isUntitled && core.inside(root, doc.uri.fsPath)) {
        if (!await doc.save()) throw new Error('파일을 저장하지 못했습니다: ' + path.basename(doc.fileName));
      }
    }
    setStatus('모든 글과 메모를 저장했습니다.');
  }
  async function replaceDocument(doc, text) {
    const edit = new vscode.WorkspaceEdit();
    edit.replace(doc.uri, new vscode.Range(doc.positionAt(0), doc.positionAt(doc.getText().length)), text);
    if (!await vscode.workspace.applyEdit(edit) || !await doc.save()) throw new Error('글 정보를 저장하지 못했습니다.');
  }
  function setStatus(text, error = false) {
    status = text; hasError = error;
    statusButton.text = busy ? '$(sync~spin) ' + text : '$(notebook) 블로그 집필';
    refresh();
  }
  function refresh() {
    let text = '';
    if (lastArticle && fs.existsSync(lastArticle)) {
      const doc = vscode.workspace.textDocuments.find(d => d.uri.fsPath === lastArticle);
      text = doc ? doc.getText() : fs.readFileSync(lastArticle, 'utf8');
    }
    const title = text.match(/^title:\s*(.*)$/m)?.[1] || '아직 선택한 글이 없습니다';
    controls?.webview.postMessage({type:'state', busy, status, error:hasError, title:title.replace(/^"|"$/g, ''), draft:/^draft:\s*true\s*$/m.test(text), file:lastArticle ? path.relative(root, lastArticle) : ''});
  }
  async function ensureTools() {
    for (const [exe, script] of [[quarto, 'setup-quarto.ps1'], [gh, 'setup-github.ps1']]) {
      if (!fs.existsSync(exe)) {
        setStatus('집필 도구 준비 중');
        await run('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', path.join(root, 'tools', script)]);
      }
    }
  }
  async function login() {
    await ensureTools();
    const terminal = vscode.window.createTerminal({name:'GitHub 연결', shellPath:'powershell.exe', cwd:root});
    // Paths are local and quoted for PowerShell, with no credential interpolation.
    const quoted = "'" + gh.replace(/'/g, "''") + "'";
    terminal.sendText('& ' + quoted + ' auth login --hostname github.com --git-protocol https --web --scopes workflow; if ($LASTEXITCODE -eq 0) { & ' + quoted + ' auth setup-git --hostname github.com }');
    terminal.show();
    setStatus('터미널 안내에 따라 GitHub에 로그인한 뒤 배포 버튼을 누르세요.');
  }
  const probe = () => new Promise(resolve => {
    const request = http.get('http://127.0.0.1:4200/', response => {
      let body = ''; response.on('data', d => body += d.toString('utf8'));
      response.on('end', () => resolve(response.statusCode === 200 && body.includes('libok03 / research notes')));
    });
    request.setTimeout(1500, () => {request.destroy(); resolve(false);});
    request.on('error', () => resolve(false));
  });
  async function ensurePreview() {
    if (await probe()) return;
    if (!fs.existsSync(quarto)) await ensureTools();
    previewProcess = spawn(quarto, ['preview', '--render', 'all', '--profile', 'preview', '--host', '127.0.0.1', '--port', '4200', '--no-browser'], {cwd:root, windowsHide:true, shell:false});
    let failure;
    previewProcess.on('error', error => {failure = error;});
    previewProcess.stdout.on('data', d => output.append(d.toString('utf8')));
    previewProcess.stderr.on('data', d => output.append(d.toString('utf8')));
    previewProcess.on('close', code => { if (code) failure = new Error('미리보기 서버가 종료됐습니다. 로그 버튼을 확인하세요.'); previewProcess = undefined; });
    for (let i = 0; i < 60; i++) {
      if (failure) throw failure;
      if (await probe()) return;
      await new Promise(r => setTimeout(r, 500));
    }
    throw new Error('미리보기 준비에 시간이 걸립니다. 잠시 뒤 미리보기 버튼을 다시 눌러 주세요.');
  }
  async function preview() {
    await save();
    const doc = await articleDocument();
    setStatus('독자 화면 준비 중');
    // Render a newly created article even if a running watcher has not registered its directory yet.
    if (!fs.existsSync(quarto)) await ensureTools();
    await run(quarto, ['render', core.articlePath(root, doc.uri.fsPath), '--profile', 'preview']);
    await ensurePreview();
    const url = 'http://127.0.0.1:4200/' + core.articlePath(root, doc.uri.fsPath).replace(/index\.qmd$/, '');
    if (!previewPanel) {
      previewPanel = vscode.window.createWebviewPanel('paperBlog.preview', '독자 화면', vscode.ViewColumn.Beside, {enableScripts:true, retainContextWhenHidden:true, localResourceRoots:[]});
      previewPanel.onDidDispose(() => {previewPanel = undefined;});
    } else previewPanel.reveal(vscode.ViewColumn.Beside, true);
    previewPanel.webview.html = previewHtml(url);
    setStatus('미리보기 준비 완료 · 저장하면 화면이 갱신됩니다.');
  }
  async function newReview() {
    const title = await vscode.window.showInputBox({title:'새 논문 리뷰', prompt:'글 제목', ignoreFocusOut:true});
    if (!title?.trim()) return;
    const slug = await vscode.window.showInputBox({title:'새 논문 리뷰', prompt:'영문 주소 이름 (예: bevformer-review)', ignoreFocusOut:true, validateInput:value => {
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)) return '영문 소문자·숫자·하이픈으로 입력하세요.';
      if (fs.existsSync(path.join(root, 'posts', value)) || fs.existsSync(path.join(root, 'notes', value + '.md'))) return '이미 존재하는 이름입니다.';
    }});
    if (!slug) return;
    await ensureTools();
    await run('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', path.join(root, 'tools', 'new-review.ps1'), '-Slug', slug, '-Title', title.trim(), '-NoOpen']);
    lastArticle = path.join(root, 'posts', slug, 'index.qmd');
    context.workspaceState.update('lastArticle', lastArticle);
    await vscode.window.showTextDocument(vscode.Uri.file(lastArticle), {viewColumn:vscode.ViewColumn.One});
    await preview();
  }
  async function notes() {
    const doc = await articleDocument();
    const slug = core.articlePath(root, doc.uri.fsPath).split('/')[1];
    const uri = vscode.Uri.file(path.join(root, 'notes', slug + '.md'));
    if (!fs.existsSync(uri.fsPath)) {
      await vscode.workspace.fs.createDirectory(vscode.Uri.file(path.dirname(uri.fsPath)));
      await vscode.workspace.fs.writeFile(uri, Buffer.from('# 읽기 메모\n\n## 질문과 확인할 점\n\n', 'utf8'));
    }
    await vscode.window.showTextDocument(uri, {viewColumn:vscode.ViewColumn.One});
  }
  async function insertImage() {
    const doc = await articleDocument();
    const files = await vscode.window.showOpenDialog({title:'글에 넣을 이미지 선택', canSelectMany:false, filters:{'이미지':['png','jpg','jpeg','webp','gif','svg']}});
    if (!files?.length) return;
    const alt = await vscode.window.showInputBox({title:'이미지 설명', prompt:'그림의 내용을 설명하세요.', value:'모델 구조', ignoreFocusOut:true});
    if (alt === undefined) return;
    const ext = path.extname(files[0].fsPath).toLowerCase();
    if (!['.png','.jpg','.jpeg','.webp','.gif','.svg'].includes(ext)) throw new Error('지원하지 않는 이미지 형식입니다.');
    const name = 'figure-' + Date.now() + ext;
    const destination = vscode.Uri.file(path.join(path.dirname(doc.uri.fsPath), 'figures', name));
    await vscode.workspace.fs.createDirectory(vscode.Uri.file(path.dirname(destination.fsPath)));
    await vscode.workspace.fs.copy(files[0], destination, {overwrite:false});
    const editor = await vscode.window.showTextDocument(doc, {viewColumn:vscode.ViewColumn.One});
    const safeAlt = alt.replace(/[\[\]\r\n]/g, ' ');
    await editor.insertSnippet(new vscode.SnippetString().appendText('\n![' + safeAlt + '](figures/' + name + ')\n'));
    await doc.save();
    setStatus('그림을 복사하고 글에 넣었습니다.');
  }
  async function metadata() {
    const doc = await articleDocument();
    const title = await vscode.window.showInputBox({title:'글 정보', prompt:'제목', value:doc.getText().match(/^title:\s*"?(.*?)"?\s*$/m)?.[1] || '', ignoreFocusOut:true});
    if (title === undefined) return;
    const description = await vscode.window.showInputBox({title:'글 정보', prompt:'목록에 보여 줄 한 줄 설명', value:doc.getText().match(/^description:\s*"?(.*?)"?\s*$/m)?.[1] || '', ignoreFocusOut:true});
    if (description === undefined) return;
    const categories = await vscode.window.showInputBox({title:'글 정보', prompt:'카테고리 (쉼표로 구분)', value:'논문 리뷰', ignoreFocusOut:true});
    if (categories === undefined) return;
    await replaceDocument(doc, core.updateMetadata(doc.getText(), {title, description, categories:categories.split(',').map(v => v.trim()).filter(Boolean)}));
    setStatus('글 정보를 저장했습니다.');
  }
  async function snippet(type) {
    const doc = await articleDocument();
    const editor = await vscode.window.showTextDocument(doc, {viewColumn:vscode.ViewColumn.One});
    const snippets = {
      math:'\n$$\n${1:Y = XW}\n$$ {#eq-${2:projection}}\n',
      code:'\n```${1:python}\n${2:# 구현 코드}\n```\n',
      diagram:'\n```{mermaid}\nflowchart LR\n    X[${1:입력}] --> M[${2:핵심 모듈}]\n    M --> Y[${3:출력}]\n```\n'
    };
    await editor.insertSnippet(new vscode.SnippetString(snippets[type]));
    setStatus('작성 틀을 넣었습니다.');
  }
  async function publish() {
    await save();
    await ensureTools();
    try { await run(gh, ['auth','status','--hostname','github.com'], {quiet:true}); }
    catch { await login(); return; }
    const doc = await articleDocument();
    await vscode.window.showTextDocument(doc, {viewColumn:vscode.ViewColumn.One});
    const result = await core.publish({root, file:doc.uri.fsPath, run,
      edit:text => replaceDocument(doc, text), progress:setStatus,
      recordRun:runState => context.workspaceState.update('lastRun', {id:runState.id, url:runState.html_url})});
    setStatus('온라인 배포 완료! 사이트에서 글을 확인하세요.');
    vscode.window.showInformationMessage('논문 리뷰를 배포했습니다.', '글 열기').then(choice => {
      if (choice) vscode.env.openExternal(vscode.Uri.parse(result.url));
    });
  }
  const actions = {
    save, preview, new:newReview, notes, image:insertImage, metadata,
    math:() => snippet('math'), code:() => snippet('code'), diagram:() => snippet('diagram'),
    publish, login,
    draft:async () => {const doc = await articleDocument(); await replaceDocument(doc, core.updateMetadata(doc.getText(), {draft:true})); setStatus('초안으로 변경했습니다. 온라인 반영은 다음 배포 때 적용됩니다.');},
    logs:() => output.show(true),
    site:() => vscode.env.openExternal(vscode.Uri.parse(core.SITE)),
    deployment:() => vscode.env.openExternal(vscode.Uri.parse(context.workspaceState.get('lastRun')?.url || 'https://github.com/' + core.REPO + '/actions/workflows/quarto-pages.yml')),
    article:async () => vscode.window.showTextDocument(await articleDocument(), {viewColumn:vscode.ViewColumn.One})
  };
  async function act(action) {
    if (!actions[action]) return;
    if (['logs','site','deployment'].includes(action)) return actions[action]();
    if (busy) return;
    busy = true; hasError = false; refresh();
    try { await actions[action](); }
    catch (error) { setStatus(error.message, true); output.appendLine('\n오류: ' + error.message); vscode.window.showErrorMessage(error.message, '로그 보기').then(choice => {if (choice) output.show(true);}); }
    finally {busy = false; statusButton.text = '$(notebook) 블로그 집필'; refresh();}
  }
  const provider = {resolveWebviewView(view) {
    controls = view;
    view.webview.options = {enableScripts:true, localResourceRoots:[]};
    view.webview.html = controlsHtml();
    view.webview.onDidReceiveMessage(message => {if (message?.action === 'ready') refresh(); else act(message?.action);}, undefined, context.subscriptions);
    view.onDidDispose(() => {controls = undefined;});
  }};
  context.subscriptions.push(output, statusButton, vscode.window.registerWebviewViewProvider('paperBlog.controls', provider, {webviewOptions:{retainContextWhenHidden:true}}));
  for (const action of ['save','preview','new','publish']) context.subscriptions.push(vscode.commands.registerCommand('paperBlog.' + action, () => act(action)));
  context.subscriptions.push(vscode.commands.registerCommand('paperBlog.open', () => vscode.commands.executeCommand('workbench.view.extension.paperBlog')));
  context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor(remember), vscode.workspace.onDidChangeTextDocument(refresh), vscode.workspace.onDidSaveTextDocument(refresh));
  remember(vscode.window.activeTextEditor);
  if (!context.workspaceState.get('panelIntroduced')) {
    context.workspaceState.update('panelIntroduced', true);
    vscode.commands.executeCommand('workbench.view.extension.paperBlog');
  }
}
function controlsHtml() {
  const nonce = randomBytes(16).toString('hex');
  return `<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}';"><meta name="viewport" content="width=device-width,initial-scale=1"><style>
  body{padding:18px 14px;font-family:var(--vscode-font-family);color:var(--vscode-foreground);font-size:13px;line-height:1.6}h1{font-size:19px;margin:0 0 4px}h2{font-size:11px;text-transform:uppercase;letter-spacing:.1em;color:var(--vscode-descriptionForeground);margin:24px 0 8px}p{margin:5px 0}.muted{color:var(--vscode-descriptionForeground);font-size:12px}.card{margin:18px 0;padding:12px;border:1px solid var(--vscode-widget-border);border-radius:7px}#title{font-weight:600;overflow-wrap:anywhere}#file{overflow-wrap:anywhere;font-size:11px}.badge{display:inline-block;font-size:10px;border:1px solid var(--vscode-widget-border);border-radius:4px;padding:1px 6px;margin-bottom:6px}button{display:block;width:100%;margin:7px 0;padding:10px 11px;border:0;border-radius:5px;cursor:pointer;font:inherit;text-align:left;color:var(--vscode-button-foreground);background:var(--vscode-button-background)}button:hover{background:var(--vscode-button-hoverBackground)}button.secondary{background:var(--vscode-button-secondaryBackground);color:var(--vscode-button-secondaryForeground)}button.secondary:hover{background:var(--vscode-button-secondaryHoverBackground)}button:disabled{opacity:.45;cursor:wait}.grid{display:grid;grid-template-columns:1fr 1fr;gap:0 7px}.grid button{font-size:12px}#status{white-space:pre-wrap;overflow-wrap:anywhere;border-left:3px solid var(--vscode-progressBar-background);padding:9px 10px;background:var(--vscode-textBlockQuote-background);margin:17px 0}#status.error{border-left-color:var(--vscode-errorForeground)}small{display:block;color:var(--vscode-descriptionForeground);line-height:1.6}
  </style></head><body><h1>논문 블로그</h1><p class="muted">읽기 메모부터 온라인 발행까지</p><div class="card"><span id="draft" class="badge">초안</span><div id="title"></div><div id="file" class="muted"></div><button class="secondary" data-action="article">현재 글 열기</button></div>
  <button data-action="save">모두 저장</button><button data-action="preview">독자 화면 미리보기</button><small>저장한 내용이 미리보기에 자동 반영됩니다.<br>미리보기 상단에서 데스크톱·모바일을 바꿀 수 있습니다.</small>
  <h2>글쓰기</h2><div class="grid"><button class="secondary" data-action="new">새 리뷰</button><button class="secondary" data-action="notes">읽기 메모</button><button class="secondary" data-action="metadata">글 정보</button><button class="secondary" data-action="image">이미지 삽입</button><button class="secondary" data-action="math">수식 삽입</button><button class="secondary" data-action="code">코드 삽입</button><button class="secondary" data-action="diagram">흐름도 삽입</button><button class="secondary" data-action="draft">초안으로 변경</button></div>
  <h2>온라인 발행</h2><button data-action="publish">저장하고 배포</button><small>현재 글을 공개하고 사이트 변경 사항을 GitHub에 업로드합니다. 다른 글은 기존 초안 상태를 유지합니다. 공개 저장소에는 글 원문도 올라갑니다. 첫 배포는 기존 사이트 디자인을 교체합니다.</small>
  <div class="grid"><button class="secondary" data-action="login">GitHub 연결</button><button class="secondary" data-action="deployment">배포 상태</button><button class="secondary" data-action="site">사이트 열기</button><button class="secondary" data-action="logs">작업 로그</button></div><div id="status" role="status" aria-live="polite"></div>
  <script nonce="${nonce}">const api=acquireVsCodeApi();document.querySelectorAll('button').forEach(button=>button.addEventListener('click',()=>api.postMessage({action:button.dataset.action})));window.addEventListener('message',event=>{const state=event.data;if(state.type!=='state')return;document.getElementById('title').textContent=state.title;document.getElementById('file').textContent=state.file;document.getElementById('draft').textContent=state.draft?'초안':'공개 대상';document.getElementById('status').textContent=state.status;document.getElementById('status').classList.toggle('error',state.error);document.querySelectorAll('button').forEach(b=>b.disabled=state.busy&&!['logs','site','deployment'].includes(b.dataset.action));});api.postMessage({action:'ready'});</script></body></html>`;
}
function previewHtml(url) {
  const nonce = randomBytes(16).toString('hex');
  return `<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; frame-src http://127.0.0.1:4200; style-src 'unsafe-inline'; script-src 'nonce-${nonce}';"><style>html,body{margin:0;height:100%;overflow:hidden;font-family:var(--vscode-font-family);background:var(--vscode-editor-background);color:var(--vscode-foreground)}header{height:44px;display:flex;align-items:center;gap:8px;padding:0 12px;border-bottom:1px solid var(--vscode-widget-border)}button{cursor:pointer;border:0;padding:6px 10px;border-radius:4px;color:var(--vscode-button-foreground);background:var(--vscode-button-background)}span{font-size:12px;opacity:.7}main{height:calc(100% - 45px);overflow:auto;display:flex;justify-content:center}iframe{height:100%;width:100%;border:0;background:white}iframe.mobile{width:390px;min-width:390px;flex:none}</style></head><body><header><button id="desktop">데스크톱</button><button id="mobile">모바일</button><button id="reload">새로고침</button><span>저장 시 자동 갱신</span></header><main><iframe id="page" title="블로그 독자 화면" src="${core.escapeHtml(url)}"></iframe></main><script nonce="${nonce}">const frame=document.getElementById('page');document.getElementById('desktop').onclick=()=>frame.classList.remove('mobile');document.getElementById('mobile').onclick=()=>frame.classList.add('mobile');document.getElementById('reload').onclick=()=>{frame.src=frame.src;};</script></body></html>`;
}
function deactivate() { if (previewProcess) { previewProcess.kill(); previewProcess = undefined; } }
module.exports = {activate, deactivate};
