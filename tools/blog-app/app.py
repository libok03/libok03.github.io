from __future__ import annotations
import argparse
import json
import mimetypes
import os
from pathlib import Path
import sys
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import webbrowser
import traceback
import html
from backend import Workspace, SITE, REPO, set_metadata

ASSETS = Path(getattr(sys, '_MEIPASS', Path(__file__).parent)) / 'ui'

def project_root(argument=None):
    if argument:
        return Path(argument).resolve()
    source = Path(sys.executable).parent if getattr(sys, 'frozen', False) else Path(__file__).parent
    for candidate in [source, *source.parents]:
        if (candidate / '_quarto.yml').is_file():
            return candidate
    raise RuntimeError('블로그 폴더에서 앱을 실행해 주세요.')

def make_server(workspace):
    class Handler(BaseHTTPRequestHandler):
        def do_GET(self):
            from urllib.parse import unquote, urlsplit
            request = unquote(urlsplit(self.path).path)
            base = workspace.root / '_preview' if request.startswith('/preview/') else ASSETS
            relative = request[len('/preview/'):] if request.startswith('/preview/') else request.lstrip('/') or 'index.html'
            file = (base / relative).resolve()
            if file.is_dir():
                file = file / 'index.html'
            if not file.is_relative_to(base.resolve()):
                self.send_error(404)
                return
            is_article = request.startswith('/preview/posts/') and file.name == 'index.html'
            if not file.is_file() and is_article and not getattr(workspace, 'legacy_preview_server', False):
                title = html.escape(file.parent.name)
                content = f'<!doctype html><html lang="ko"><head><meta charset="utf-8"><link rel="stylesheet" href="/preview/styles/research.css"><style>main{{max-width:850px;margin:auto;padding:35px 22px}}pre{{overflow:auto}}img{{max-width:100%}}</style></head><body class="paper-article"><main id="quarto-document-content"><header id="title-block-header"><h1 class="title">{title}</h1></header></main></body></html>'.encode()
            elif file.is_file():
                content = file.read_bytes()
            else:
                self.send_error(404)
                return
            if is_article and not getattr(workspace, 'legacy_preview_server', False):
                adapter = b'<script src="/vendor/marked.umd.js"></script><script src="/vendor/purify.min.js"></script><script src="/live-reader.js"></script>'
                content = content.replace(b'</body>', adapter + b'</body>')
            self.send_response(200)
            self.send_header('Content-Type', (mimetypes.guess_type(file.name)[0] or 'application/octet-stream') + ('; charset=utf-8' if file.suffix in {'.html', '.js', '.css'} else ''))
            self.send_header('Content-Length', str(len(content)))
            self.send_header('Cache-Control', 'no-store' if file.suffix in {'.html','.json'} else 'private, max-age=3600')
            self.send_header('X-Content-Type-Options', 'nosniff')
            self.end_headers()
            self.wfile.write(content)
        def log_message(self, *_):
            pass
    server = ThreadingHTTPServer(('127.0.0.1', 0), Handler)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    return server

class Api:
    def __init__(self, workspace):
        self._workspace = workspace
        self._window = None
        self._draft = None
        self._draft_lock = threading.RLock()

    def dispatch(self, action, data=None):
        data = data or {}
        try:
            w = self._workspace
            if action == 'list':
                result = {'articles': w.articles(), 'root': str(w.root)}
            elif action == 'read':
                result = w.read(data['id'], data.get('mode', 'article'))
            elif action == 'save':
                result = w.save(data['id'], data['mode'], data['text'], data['revision'])
                with self._draft_lock:
                    if self._draft and self._draft['id'] == data['id'] and self._draft['mode'] == data['mode']:
                        self._draft['revision'] = result['revision']
                        self._draft['dirty'] = self._draft['text'] != data['text']
            elif action == 'draft':
                with self._draft_lock:
                    self._draft = data
                result = {}
            elif action == 'create':
                result = w.create(data['title'], data['slug'])
            elif action == 'metadata':
                current = w.read(data['id'])
                fields = {key: data[key] for key in ['title', 'description', 'categories', 'draft'] if key in data}
                w.save(data['id'], 'article', set_metadata(current['text'], fields), current['revision'])
                result = w.read(data['id'])
            elif action in {'preview', 'publish', 'login'}:
                result = w.start(action, data.get('id', ''), archive=data.get('archive', False))
            elif action == 'status':
                result = w.state()
            elif action == 'stop':
                result = w.stop()
            elif action == 'image':
                import webview
                files = self._window.create_file_dialog(webview.FileDialog.OPEN, allow_multiple=False, file_types=('Images (*.png;*.jpg;*.jpeg;*.webp;*.gif;*.svg)',))
                result = w.image(data['id'], files[0]) if files else {'cancelled': True}
            elif action == 'open':
                urls = {'site': SITE, 'deployment': w.last_run or 'https://github.com/' + REPO + '/actions/workflows/quarto-pages.yml'}
                webbrowser.open(urls[data['target']])
                result = {}
            else:
                raise ValueError('지원하지 않는 버튼입니다.')
            return {'ok': True, 'data': result}
        except Exception as error:
            self._workspace.log('오류: ' + str(error))
            return {'ok': False, 'error': str(error)}

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--project')
    parser.add_argument('--smoke-test', action='store_true')
    args = parser.parse_args()
    workspace = Workspace(project_root(args.project))
    server = make_server(workspace)
    import webview
    api = Api(workspace)
    window = webview.create_window('논문 블로그 · 집필실', f'http://127.0.0.1:{server.server_port}/', js_api=api,
                                   width=1440, height=920, min_size=(1040, 640), background_color='#f5f6f8')
    api._window = window
    def on_close():
        try:
            with api._draft_lock:
                state = api._draft
                if state and state.get('dirty'):
                    workspace.save(state['id'], state['mode'], state['text'], state['revision'])
        except Exception as error:
            import ctypes
            ctypes.windll.user32.MessageBoxW(0, '저장하지 못했습니다: ' + str(error), '논문 블로그', 0x10)
            return False
        workspace.stop()
    window.events.closing += on_close
    def smoke_test():
        import time
        result = {}
        try:
            for _ in range(120):
                time.sleep(.5)
                result = window.evaluate_js('({ready:!!window.appReady, liveReady:!!window.lastLivePaint, articles:document.querySelectorAll(".article-item").length, text:document.getElementById("editor").value, preview:document.getElementById("preview").getAttribute("src"), width:innerWidth})')
                if result.get('ready') and result.get('preview') and result.get('liveReady'):
                    break
            assert result.get('ready') and result.get('liveReady') and result.get('articles', 0) >= 1 and result.get('text') and result.get('preview'), result
            window.evaluate_js('document.getElementById("mobile").click()')
            assert window.evaluate_js('document.getElementById("preview").classList.contains("mobile")')
            result['passed'] = True
        except Exception as error:
            result['passed'] = False
            result['error'] = str(error)
        result['frozen'] = bool(getattr(sys, 'frozen', False))
        result['timestamp'] = time.time()
        if result.get('passed') and result['frozen']:
            import hashlib
            checksum = hashlib.sha256(Path(sys.executable).read_bytes()).hexdigest()
            (Path(sys.executable).parent / '.verified').write_text(checksum, encoding='ascii')
        (workspace.root / '.tools/app-smoke.json').write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding='utf-8')
        window.destroy()
    try:
        webview.start(smoke_test if args.smoke_test else None, gui='edgechromium', private_mode=False,
                      storage_path=str(workspace.root / '.tools/app-webview'))
    finally:
        workspace.stop()
        server.shutdown()

if __name__ == '__main__':
    try:
        main()
    except Exception:
        error = traceback.format_exc()
        try:
            root = project_root()
            (root / '.tools/app-error.log').write_text(error, encoding='utf-8')
        except Exception:
            pass
        if sys.stdout:
            print(error)
        import ctypes
        ctypes.windll.user32.MessageBoxW(0, error[-2500:], '논문 블로그 실행 오류', 0x10)
