"""Local writing workspace. No VS Code dependency."""
from __future__ import annotations
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import threading
import time
from datetime import datetime, timezone, timedelta
import yaml

REPO = 'libok03/libok03.github.io'
SITE = 'https://libok03.github.io/'
PUBLISH_PATHS = ['.github/workflows/quarto-pages.yml', '.gitignore', '.vscode', '_quarto.yml',
                 '_quarto-preview.yml', '_quarto-publish.yml', 'index.qmd', 'about.qmd',
                 'styles', 'assets/research', 'templates', 'tools', 'start-writing.cmd', 'start-blog-app.cmd', 'README.md', 'posts']
PRIVATE = {'.tools', '.venv', 'notes', 'papers', '_preview', '_publish', '_site'}

def digest(text):
    return hashlib.sha256(text.encode('utf-8')).hexdigest()

def metadata(text):
    match = re.match(r'^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)', text)
    if not match:
        raise ValueError('글 맨 위의 YAML 정보를 확인해 주세요.')
    value = yaml.safe_load(match[1]) or {}
    if not isinstance(value, dict):
        raise ValueError('글 정보는 제목·설명 등의 항목으로 작성해야 합니다.')
    return value

def set_metadata(text, fields):
    match = re.match(r'^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)', text)
    if not match:
        raise ValueError('글 맨 위의 YAML 정보가 없습니다.')
    front = match[1].replace('\r\n', '\n')
    for key, value in fields.items():
        if key not in {'title', 'description', 'categories', 'draft', 'bibliography'}:
            raise ValueError('지원하지 않는 글 정보입니다.')
        pattern = re.compile(r'^' + key + r':[^\n]*(?:\n(?:[ \t]+[^\n]*|[ \t]*(?=\n|$)))*', re.M)
        line = key + ': ' + json.dumps(value, ensure_ascii=False)
        front = pattern.sub(lambda _: line, front) if pattern.search(front) else front + '\n' + line
    result = '---\n' + front + '\n---\n' + text[match.end():]
    metadata(result)
    return result

def allowed_stage(name):
    return not any(p in PRIVATE for p in Path(name).parts) and any(name == p or name.startswith(p + '/') for p in PUBLISH_PATHS)

class Workspace:
    def __init__(self, root):
        self.root = Path(root).resolve()
        if not (self.root / '_quarto.yml').is_file():
            raise ValueError('블로그 프로젝트를 찾지 못했습니다.')
        self.quarto = self.root / '.tools/bin/quarto.exe'
        self.gh = self.root / '.tools/github/bin/gh.exe'
        self.lock = threading.RLock()
        self.job_lock = threading.RLock()
        self.job = {'busy': False, 'kind': '', 'message': '글을 골라 집필을 시작하세요.', 'error': False, 'version': 0, 'url': '', 'code': ''}
        self.cancel = threading.Event()
        self.process = None
        self.pending_preview = None
        self.logs = []
        self.last_run = ''
        self.preview_cache = {}
        self.job['previewEngine'] = 'isolated'
        self.job_sequence = 0

    def path(self, slug, mode='article'):
        if not isinstance(slug, str) or not re.fullmatch(r'[a-z0-9]+(?:-[a-z0-9]+)*', slug):
            raise ValueError('올바른 글 주소가 아닙니다.')
        choices = {'article': f'posts/{slug}/index.qmd', 'notes': f'notes/{slug}.md', 'references': f'posts/{slug}/references.bib'}
        if mode not in choices:
            raise ValueError('지원하지 않는 편집 탭입니다.')
        result = (self.root / choices[mode]).resolve()
        if not result.is_relative_to(self.root):
            raise ValueError('프로젝트 밖의 파일은 수정할 수 없습니다.')
        return result

    def articles(self):
        result = []
        for file in sorted((self.root / 'posts').glob('*/index.qmd')):
            try:
                info = metadata(file.read_text(encoding='utf-8'))
                result.append({'id': file.parent.name, 'title': str(info.get('title', file.parent.name)),
                               'draft': bool(info.get('draft', False)), 'date': str(info.get('date', ''))})
            except Exception as error:
                result.append({'id': file.parent.name, 'title': file.parent.name, 'draft': True, 'date': '', 'error': str(error)})
        return sorted(result, key=lambda item: item['date'], reverse=True)

    def read(self, slug, mode='article'):
        with self.lock:
            file = self.path(slug, mode)
            if not self.path(slug).is_file():
                raise ValueError('글을 찾지 못했습니다.')
            text = file.read_text(encoding='utf-8') if file.exists() else ('# 읽기 메모\n\n' if mode == 'notes' else '')
            info = metadata(self.path(slug).read_text(encoding='utf-8'))
            info = json.loads(json.dumps(info, ensure_ascii=False, default=str))
            return {'id': slug, 'mode': mode, 'text': text, 'revision': digest(text), 'metadata': info}

    def _write(self, file, text):
        file.parent.mkdir(parents=True, exist_ok=True)
        temporary = file.with_name(file.name + '.app-saving')
        try:
            temporary.write_text(text, encoding='utf-8', newline='\n')
            os.replace(temporary, file)
        finally:
            if temporary.exists():
                temporary.unlink()

    def save(self, slug, mode, text, revision):
        if not isinstance(text, str) or len(text) > 8_000_000:
            raise ValueError('저장할 내용을 확인해 주세요.')
        with self.lock:
            file = self.path(slug, mode)
            current = self.read(slug, mode)['text']
            if digest(current) != revision and current != text:
                raise ValueError('다른 프로그램에서 파일이 바뀌었습니다. 앱의 글을 복사해 보관한 뒤 다시 열어 주세요.')
            if mode == 'article':
                metadata(text)
            self._write(file, text)
            if mode == 'references' and text.strip():
                article = self.path(slug)
                source = article.read_text(encoding='utf-8')
                if metadata(source).get('bibliography') != 'references.bib':
                    self._write(article, set_metadata(source, {'bibliography': 'references.bib'}))
            return {'revision': digest(text), 'message': '저장 완료'}

    def create(self, title, slug):
        title = str(title).strip()
        if not title:
            raise ValueError('제목을 입력하세요.')
        file = self.path(slug)
        if file.parent.exists() or self.path(slug, 'notes').exists():
            raise ValueError('이미 있는 주소입니다. 다른 주소를 입력하세요.')
        template = (self.root / 'templates/paper-review/index.qmd').read_text(encoding='utf-8')
        date = datetime.now(timezone(timedelta(hours=9))).strftime('%Y-%m-%d')
        text = template.replace('"__TITLE__"', json.dumps(title, ensure_ascii=False)).replace('__DATE__', date)
        self._write(file, text)
        for folder in ['figures', 'code']:
            (file.parent / folder).mkdir()
        self._write(self.path(slug, 'references'), '')
        note = (self.root / 'templates/paper-review/notes.md').read_text(encoding='utf-8').replace('__TITLE__', title)
        self._write(self.path(slug, 'notes'), note)
        return self.read(slug)

    def log(self, line):
        with self.job_lock:
            self.logs.append(str(line).rstrip())
            self.logs = self.logs[-400:]

    def progress(self, message):
        with self.job_lock:
            self.job['message'] = message

    def state(self):
        with self.job_lock:
            return {**self.job, 'logs': '\n'.join(self.logs), 'lastRun': self.last_run}

    def stop(self):
        self.cancel.set()
        process = self.process
        if process and process.poll() is None:
            subprocess.run(['taskkill', '/PID', str(process.pid), '/T', '/F'], capture_output=True,
                           creationflags=getattr(subprocess, 'CREATE_NO_WINDOW', 0))
        return {'message': '중지 요청을 보냈습니다. 이미 업로드한 내용은 유지됩니다.'}

    def run(self, exe, args, timeout=120, allow_failure=False, device_login=False, cwd=None):
        if self.cancel.is_set():
            raise RuntimeError('작업을 중지했습니다.')
        command = [str(exe), *map(str, args)]
        self.log('> ' + Path(str(exe)).name + ' ' + ' '.join(map(str, args)))
        process = subprocess.Popen(command, cwd=cwd or self.root, stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
                                   stdin=subprocess.PIPE if device_login else subprocess.DEVNULL,
                                   text=True, encoding='utf-8', errors='replace',
                                   env={**os.environ, 'GH_PROMPT_DISABLED': '1', 'GIT_TERMINAL_PROMPT': '0', 'GCM_INTERACTIVE': 'Never'},
                                   creationflags=getattr(subprocess, 'CREATE_NO_WINDOW', 0))
        self.process = process
        lines = []
        def read_output():
            for line in process.stdout:
                lines.append(line)
                if not (str(exe) == str(self.gh) and args and args[0] == 'api'):
                    self.log(line)
                if device_login:
                    match = re.search(r'\b([A-Z0-9]{4}-[A-Z0-9]{4})\b', line)
                    if match:
                        with self.job_lock:
                            self.job['code'] = match[1]
                        self.progress('브라우저에서 GitHub 로그인 후 아래 인증 코드를 입력하세요.')
        reader = threading.Thread(target=read_output, daemon=True)
        reader.start()
        if device_login:
            process.stdin.write('\n\n')
            process.stdin.flush()
        deadline = time.monotonic() + timeout
        while process.poll() is None:
            if self.cancel.is_set() or time.monotonic() > deadline:
                self.stop()
                reader.join(2)
                raise RuntimeError('작업을 중지했습니다.' if self.cancel.is_set() and time.monotonic() <= deadline else '작업 시간이 초과됐습니다. 로그를 확인하고 다시 실행하세요.')
            time.sleep(.1)
        reader.join(3)
        self.process = None
        result = ''.join(lines)
        if process.returncode:
            if allow_failure:
                return ''
            raise RuntimeError(result.strip()[-3000:] or '명령 실행에 실패했습니다.')
        return result

    def tools(self):
        for exe, script in [(self.quarto, 'setup-quarto.ps1'), (self.gh, 'setup-github.ps1')]:
            if not exe.exists():
                self.progress('집필 도구 준비 중')
                self.run('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', str(self.root / 'tools' / script)], timeout=300)

    def start(self, kind, slug='', archive=False):
        if kind not in {'preview', 'publish', 'login'}:
            raise ValueError('지원하지 않는 작업입니다.')
        if kind != 'login':
            self.path(slug)
        with self.job_lock:
            if self.job['busy']:
                if kind == 'preview' and self.job['kind'] == 'preview':
                    self.pending_preview = (slug, archive)
                    return {'queued': True}
                raise ValueError('현재 작업이 끝난 뒤 실행하세요.')
            self.cancel.clear()
            self.job_sequence += 1
            sequence = self.job_sequence
            self.job.update(busy=True, kind=kind, message='작업 준비 중', error=False, code='')
        threading.Thread(target=self._worker, args=(kind, slug, sequence, archive), daemon=True).start()
        return {'started': True}

    def preview_signature(self, slug):
        files = [self.path(slug), self.root / '_quarto.yml', self.root / '_quarto-preview.yml', self.root / 'posts/_metadata.yml']
        for directory in [self.path(slug).parent, self.root / 'styles', self.root / 'assets']:
            if directory.exists():
                files.extend(file for file in directory.rglob('*') if file.is_file() and not any(part in PRIVATE for part in file.relative_to(self.root).parts))
        entries = [(str(file.relative_to(self.root)), file.stat().st_mtime_ns, file.stat().st_size) for file in sorted(set(files)) if file.exists()]
        return digest(json.dumps(entries)), max((entry[1] for entry in entries), default=0)

    def prepare_preview_project(self, slug):
        stage = self.root / '.tools/preview-project'
        stage.mkdir(parents=True, exist_ok=True)
        def copy_changed(source, destination):
            if not source.exists(): return
            if source.is_dir():
                for file in source.rglob('*'):
                    if file.is_file() and not any(part in PRIVATE for part in file.relative_to(source).parts):
                        copy_changed(file, destination / file.relative_to(source))
            elif not destination.exists() or source.stat().st_mtime_ns != destination.stat().st_mtime_ns or source.stat().st_size != destination.stat().st_size:
                destination.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(source, destination)
        for name in ['styles', 'assets', 'index.qmd', 'about.qmd', 'posts/_metadata.yml']:
            copy_changed(self.root / name, stage / name)
        copy_changed(self.path(slug).parent, stage / 'posts' / slug)
        config = yaml.safe_load((self.root / '_quarto.yml').read_text(encoding='utf-8'))
        config['project']['render'] = [f'posts/{slug}/index.qmd']
        config['project']['output-dir'] = '_rendered'
        config.setdefault('website', {})['draft-mode'] = 'visible'
        config.pop('profile', None)
        (stage / '_quarto.yml').write_text(yaml.safe_dump(config, allow_unicode=True, sort_keys=False), encoding='utf-8')
        (stage / '_quarto-preview.yml').write_text('project:\n  output-dir: _rendered\nwebsite:\n  draft-mode: visible\n', encoding='utf-8')
        return stage

    def render_preview(self, slug, archive=False):
        source = self.read(slug)['text']
        fingerprint, newest = self.preview_signature(slug)
        output = self.root / '_preview/posts' / slug / 'index.html'
        if not archive and output.exists() and (self.preview_cache.get(slug) == fingerprint or output.stat().st_mtime_ns >= newest):
            self.preview_cache[slug] = fingerprint
            return digest(source)
        if archive:
            self.run(self.quarto, ['render', '--profile', 'preview', '--no-clean'], timeout=120)
        else:
            stage = self.prepare_preview_project(slug)
            self.run(self.quarto, ['render', f'posts/{slug}/index.qmd', '--profile', 'preview', '--no-clean'], timeout=120, cwd=stage)
            generated = stage / '_rendered'
            for file in generated.rglob('*'):
                if file.is_file():
                    destination = self.root / '_preview' / file.relative_to(generated)
                    if not destination.exists() or destination.stat().st_size != file.stat().st_size or destination.stat().st_mtime_ns != file.stat().st_mtime_ns:
                        destination.parent.mkdir(parents=True, exist_ok=True)
                        shutil.copy2(file, destination)
        # Do not certify an old render when typing continued in the background.
        if self.read(slug)['text'] == source:
            self.preview_cache[slug] = fingerprint
        return digest(source)

    def _worker(self, kind, slug, sequence, archive=False):
        try:
            if kind != 'preview' or not self.quarto.exists():
                self.tools()
            if kind == 'login':
                self.progress('GitHub 연결 중 · 인증 안내를 기다려 주세요.')
                self.run(self.gh, ['auth', 'login', '--hostname', 'github.com', '--git-protocol', 'https', '--web', '--scopes', 'workflow'], timeout=300, device_login=True)
                self.run(self.gh, ['auth', 'setup-git', '--hostname', 'github.com'])
                self.progress('GitHub 연결 완료 · 이제 배포 버튼을 사용할 수 있습니다.')
            elif kind == 'publish':
                self.publish(slug)
            else:
                while True:
                    self.progress('발행 화면을 확인하는 중 · 입력 내용은 즉시 표시됩니다.')
                    revision = self.render_preview(slug, archive)
                    with self.job_lock:
                        self.job.update(version=self.job['version'] + 1, url=f'/preview/posts/{slug}/index.html', revision=revision)
                        pending = self.pending_preview
                        self.pending_preview = None
                        if not pending:
                            self.job.update(busy=False, message='발행 화면 확인 완료 · 입력 즉시 갱신 / 자동 저장')
                            return
                    slug, archive = pending
        except Exception as error:
            self.log('오류: ' + str(error))
            with self.job_lock:
                if sequence == self.job_sequence:
                    self.job.update(error=True, message=str(error))
        finally:
            with self.job_lock:
                if sequence == self.job_sequence:
                    self.job['busy'] = False
                    self.pending_preview = None

    def publish(self, slug):
        self.progress('GitHub 연결과 저장소 확인')
        try:
            self.run(self.gh, ['auth', 'status', '--hostname', 'github.com'])
        except Exception as error:
            raise RuntimeError('먼저 GitHub 연결 버튼으로 로그인하세요.') from error
        git = lambda args, **kw: self.run('git', args, **kw)
        api = lambda args: json.loads(self.run(self.gh, ['api', *args]) or 'null')
        remote = git(['remote', 'get-url', 'origin']).strip()
        if not re.fullmatch(r'(?:https://github\.com/|git@github\.com:)libok03/libok03\.github\.io(?:\.git)?/?', remote):
            raise RuntimeError('블로그 GitHub 저장소 연결을 확인해 주세요.')
        repo = api(['repos/' + REPO])
        if not repo.get('permissions', {}).get('admin') or not repo.get('permissions', {}).get('push'):
            raise RuntimeError('저장소의 쓰기 및 Pages 관리 권한이 필요합니다.')
        branch = repo['default_branch']
        if not re.fullmatch(r'[\w./-]+', branch) or branch.startswith('-'):
            raise RuntimeError('기본 브랜치를 확인하지 못했습니다.')
        staged = git(['diff', '--cached', '--name-only', '-z']).split('\0')
        if any(name and not allowed_stage(name) for name in staged):
            raise RuntimeError('다른 작업의 staged 파일이 있어 배포를 중단했습니다.')
        git(['fetch', 'origin', branch])
        try:
            git(['merge-base', '--is-ancestor', 'origin/' + branch, 'HEAD'])
        except Exception as error:
            raise RuntimeError('GitHub에 더 새로운 변경이 있습니다. 먼저 병합해야 하며, 원격 글은 덮어쓰지 않았습니다.') from error
        file = self.path(slug)
        original = file.read_text(encoding='utf-8')
        ready = set_metadata(original, {'draft': False})
        committed = False
        try:
            self._write(file, ready)
            self.progress('현재 글 저장 · 발행 화면 확인')
            self.run(self.quarto, ['render', '--profile', 'publish'])
            if file.read_text(encoding='utf-8') != ready:
                raise RuntimeError('빌드 중 글이 바뀌었습니다. 저장 후 다시 배포하세요.')
            name = git(['config', 'user.name'], allow_failure=True).strip()
            email = git(['config', 'user.email'], allow_failure=True).strip()
            if not name or not email:
                user = api(['user'])
                if not name:
                    git(['config', '--local', 'user.name', user['login']])
                if not email:
                    git(['config', '--local', 'user.email', f"{user['id']}+{user['login']}@users.noreply.github.com"])
            self.progress('GitHub에 변경 내용 업로드')
            git(['add', '--all', '--', *[p for p in PUBLISH_PATHS if (self.root / p).exists()]])
            changes = [p for p in git(['diff', '--cached', '--name-only', '-z']).split('\0') if p]
            if any(not allowed_stage(p) for p in changes):
                raise RuntimeError('배포 범위 밖의 파일이 있어 중단했습니다.')
            if changes:
                git(['commit', '-m', 'Publish review: ' + slug])
            committed = True
            sha = git(['rev-parse', 'HEAD']).strip()
            self.run(self.gh, ['auth', 'setup-git', '--hostname', 'github.com'])
            git(['push', 'origin', 'HEAD:refs/heads/' + branch])
            self.progress('GitHub Pages 설정')
            pages = None
            try:
                pages = api(['repos/' + REPO + '/pages'])
            except Exception as error:
                if '404' not in str(error):
                    raise
            if not pages or pages.get('build_type') != 'workflow':
                self.run(self.gh, ['api', '--method', 'PUT' if pages else 'POST', 'repos/' + REPO + '/pages', '-f', 'build_type=workflow'])
            started = time.time()
            self.run(self.gh, ['workflow', 'run', 'quarto-pages.yml', '--repo', REPO, '--ref', branch])
            workflow_run = None
            for _ in range(20):
                runs = api(['repos/' + REPO + '/actions/workflows/quarto-pages.yml/runs?event=workflow_dispatch&per_page=20'])
                workflow_run = next((r for r in runs['workflow_runs'] if r['head_sha'] == sha and r['head_branch'] == branch and datetime.fromisoformat(r['created_at'].replace('Z', '+00:00')).timestamp() >= started - 5), None)
                if workflow_run:
                    break
                self.wait(3)
            if not workflow_run:
                raise RuntimeError('배포를 요청했습니다. 배포 상태 버튼에서 실행을 확인하세요.')
            self.last_run = workflow_run['html_url']
            for i in range(120):
                state = api(['repos/' + REPO + '/actions/runs/' + str(workflow_run['id'])])
                if state['status'] == 'completed':
                    if state['conclusion'] != 'success':
                        raise RuntimeError('온라인 배포가 ' + state['conclusion'] + ' 상태로 끝났습니다. 배포 상태 버튼으로 확인하세요.')
                    self.progress('온라인 배포 완료! 사이트에서 글을 확인하세요.')
                    return
                self.progress(f'온라인 빌드·배포 중 · {i * 5}초')
                self.wait(5)
            raise RuntimeError('온라인 배포가 진행 중입니다. 배포 상태 버튼에서 결과를 확인하세요.')
        except Exception:
            if not committed and file.read_text(encoding='utf-8') == ready:
                self._write(file, original)
            raise

    def wait(self, seconds):
        if self.cancel.wait(seconds):
            raise RuntimeError('작업을 중지했습니다.')

    def image(self, slug, source):
        source = Path(source)
        ext = source.suffix.lower()
        if ext not in {'.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg'}:
            raise ValueError('지원하지 않는 이미지 형식입니다.')
        folder = self.path(slug).parent / 'figures'
        folder.mkdir(exist_ok=True)
        name = f'figure-{time.time_ns()}{ext}'
        shutil.copy2(source, folder / name)
        preview = self.root / '_preview/posts' / slug / 'figures' / name
        preview.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(folder / name, preview)
        return {'markdown': f'\n![그림 설명](figures/{name})\n'}
