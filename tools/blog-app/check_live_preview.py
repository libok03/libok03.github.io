"""Exercise the actual native app using an isolated document, never a user's draft."""
import json
from pathlib import Path
import shutil
import tempfile
import time
import sys
import webview
from app import Api, make_server, project_root
from backend import Workspace

project = project_root()
root = Path(tempfile.mkdtemp(prefix='live-preview-qa-', dir=project / '.tools'))
for name in ['_quarto.yml', '_quarto-preview.yml', 'index.qmd', 'about.qmd', 'posts/_metadata.yml']:
    target = root / name
    target.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(project / name, target)
for name in ['styles', 'assets']:
    shutil.copytree(project / name, root / name)
file = root / 'posts/latency-check/index.qmd'
file.parent.mkdir(parents=True)
source = '---\ntitle: "실시간 미리보기 검사"\ndraft: true\n---\n\n## 확인\n\n첫 문장.\n\n$x^2$\n'
if '--article-math' in sys.argv:
    source = (project / 'posts/first-review/index.qmd').read_text(encoding='utf-8')
    if (project / 'posts/first-review/figures').exists():
        shutil.copytree(project / 'posts/first-review/figures', file.parent / 'figures')
file.write_text(source, encoding='utf-8')
workspace = Workspace(root)
workspace.quarto = project / '.tools/bin/quarto.exe'
legacy = '--legacy' in sys.argv
if legacy:
    workspace.job.pop('previewEngine', None)
    workspace.legacy_preview_server = True
server = make_server(workspace)
api = Api(workspace)
window = webview.create_window('집필실 · 입력 갱신 검사', f'http://127.0.0.1:{server.server_port}/', js_api=api, width=1440, height=900)
api._window = window

def check():
    result = {}
    try:
        for _ in range(80):
            time.sleep(.1)
            if window.evaluate_js('!!window.appReady && !!window.lastLivePaint'):
                break
        assert window.evaluate_js('!!window.lastLivePaint'), 'live preview did not initialize'
        state = window.evaluate_js('({id:window.draftState().id,sequence:window.lastLivePaint.sequence})')
        assert state['id'] == 'latency-check'
        assert window.evaluate_js('window.lastLivePaint.mathCount') > 0, 'formulas were not rendered'
        assert window.evaluate_js('window.lastLivePaint.mathErrors') == 0, 'formula parsing failed'
        for _ in range(50):
            if window.evaluate_js('window.mathFontsReady === true'):
                break
            time.sleep(.05)
        assert window.evaluate_js('window.mathFontsReady === true'), 'local math fonts did not load'
        result['mathCount'] = window.evaluate_js('window.lastLivePaint.mathCount')
        result['mathFontsReady'] = True
        timings=[]
        for index in range(5):
            before=window.evaluate_js('window.lastLivePaint.sequence')
            window.evaluate_js(f'document.getElementById("editor").value += "\\n즉시 갱신 검사 {index}"; window.inputCheckStarted=performance.now();document.getElementById("editor").dispatchEvent(new Event("input"));')
            for _ in range(100):
                time.sleep(.01)
                sequence=window.evaluate_js('window.lastLivePaint.sequence')
                if sequence>before:
                    break
            timing=window.evaluate_js('window.lastLivePaint.time-window.inputCheckStarted')
            assert sequence>before and timing<500, f'preview took {timing}ms'
            timings.append(round(timing,2))
        window.evaluate_js('document.getElementById("editor").value += "\\n<script>window.untrustedExecuted=true</script>";document.getElementById("editor").dispatchEvent(new Event("input"));')
        time.sleep(.2)
        assert window.evaluate_js('window.lastLivePaint.sanitized === true'), 'unsafe markup remained in live content'
        # Receiver acknowledges paint only after sanitized markup has been mounted.
        result['livePaintMs']=timings
        result['passed']=True
        for _ in range(100):
            if not workspace.state()['busy']:
                break
            time.sleep(.1)
        if workspace.state().get('error'):
            raise AssertionError(workspace.state()['message'])
        start=time.perf_counter()
        if not legacy:
            workspace.render_preview('latency-check')
        result['cachedCheckMs']=round((time.perf_counter()-start)*1000,2)
        result['rendererLogs']=workspace.state()['logs'][-1600:]
        result['legacyCompatibility']=legacy
    except Exception as error:
        result['passed']=False
        result['error']=str(error)
        result['logs']=workspace.state()['logs'][-2000:]
    filename = 'live-preview-legacy-check.json' if legacy else 'live-preview-check.json'
    (project / '.tools' / filename).write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
    workspace.stop()
    window.destroy()

try:
    webview.start(check,gui='edgechromium')
finally:
    workspace.stop()
    server.shutdown()
