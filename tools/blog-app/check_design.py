"""Render the built journal in an isolated native preview window and save QA images."""
import argparse
import functools
import json
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import threading
import time
import webview
from app import project_root

root = project_root()
parser = argparse.ArgumentParser()
parser.add_argument('--capture', action='store_true', help='Also capture images; hidden WebView capture support varies by runtime.')
parser.add_argument('--article-only', action='store_true')
parser.add_argument('--mobile', action='store_true')
options = parser.parse_args()
output = root / '.tools/design-review'
output.mkdir(parents=True, exist_ok=True)
report = output / ('results-article-' + ('mobile' if options.mobile else 'desktop') + '.json' if options.article_only else 'results.json')

class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *_):
        pass

server = ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(QuietHandler, directory=str(root / '_publish')))
threading.Thread(target=server.serve_forever, daemon=True).start()
origin = f'http://127.0.0.1:{server.server_port}'
entry = origin + '/posts/first-review/index.html' if options.article_only else origin
window = webview.create_window('Paper Notes · layout review', entry, width=390 if options.mobile else 1440, height=844 if options.mobile else 1000, min_size=(320, 500), hidden=True)

def wait_for(expression, seconds=20):
    deadline = time.monotonic() + seconds
    while time.monotonic() < deadline:
        if window.evaluate_js(expression):
            return
        time.sleep(.2)
    raise AssertionError('Page readiness timeout: ' + expression)

def native_task(start):
    from System import Action
    tasks = []
    window.native.Invoke(Action(lambda: tasks.append(start(window.native.webview.CoreWebView2))))
    deadline = time.monotonic() + 30
    while not tasks[0].IsCompleted:
        if time.monotonic() > deadline:
            raise TimeoutError('Native rendering task timed out')
        time.sleep(.05)
    if tasks[0].IsFaulted:
        raise RuntimeError(str(tasks[0].Exception))

def capture(name):
    if not options.capture:
        return
    from System.IO import MemoryStream
    from Microsoft.Web.WebView2.Core import CoreWebView2CapturePreviewImageFormat
    stream = MemoryStream()
    native_task(lambda view: view.CapturePreviewAsync(CoreWebView2CapturePreviewImageFormat.Png, stream))
    (output / (name + '.png')).write_bytes(bytes(stream.ToArray()))
    stream.Dispose()

def measure():
    return window.evaluate_js('({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,overflow:document.documentElement.scrollWidth>innerWidth+1,images:[...document.images].filter(i=>i.getBoundingClientRect().top<innerHeight&&i.getBoundingClientRect().bottom>0).every(i=>i.complete&&i.naturalWidth>0)})')

def review():
    results = {}
    try:
        if options.article_only:
            wait_for('document.readyState==="complete" && !!document.querySelector(".paper-article .article-eyebrow")', seconds=45)
            time.sleep(2)
            results['article'] = measure()
            assert not results['article']['overflow'], results['article']
            capture('mobile-article' if options.mobile else 'desktop-article')
            results['passed'] = True
            return
        wait_for('!!document.querySelector(".hero-art img") && document.querySelector(".hero-art img").complete && document.querySelector(".hero-art img").naturalWidth>0')
        time.sleep(3)
        results['desktop'] = measure()
        assert not results['desktop']['overflow'] and results['desktop']['images'], results
        # Hidden preview windows throttle the clock: sample two animation times explicitly.
        motion = window.evaluate_js('(()=>{const el=document.querySelector(".art-orbit");const animation=el.getAnimations()[0];if(!animation)return {running:false};animation.currentTime=0;const first=getComputedStyle(el).transform;animation.currentTime=2000;return {running:animation.playState==="running",first,second:getComputedStyle(el).transform}})()')
        assert motion['running'] and motion['first'] != motion['second'], motion
        results['orbit_motion'] = True
        capture('desktop-hero')
        window.evaluate_js('document.querySelector("#archive-heading").scrollIntoView({behavior:"instant"})')
        time.sleep(2.3)
        capture('desktop-archive')
        window.evaluate_js('document.querySelector(".reading-principles").scrollIntoView({behavior:"instant"})')
        time.sleep(2.3)
        capture('desktop-method')
        window.evaluate_js('document.getElementById("paper-search").value="zzzz_no_match";document.getElementById("paper-search").dispatchEvent(new Event("input"));')
        assert window.evaluate_js('!document.getElementById("paper-search-empty").hidden && document.querySelectorAll(".paper-card:not([hidden])").length===0')
        window.evaluate_js('document.getElementById("paper-search").value="";document.getElementById("paper-search").dispatchEvent(new Event("input"));document.getElementById("motion-toggle").click()')
        assert window.evaluate_js('document.body.classList.contains("motion-paused") && getComputedStyle(document.querySelector(".hero-art img")).animationName==="none"')
        results['search_and_motion_toggle'] = True
        window.resize(390, 844)
        window.evaluate_js('scrollTo({top:0,behavior:"instant"})')
        time.sleep(1)
        results['mobile'] = measure()
        assert not results['mobile']['overflow'], results['mobile']
        capture('mobile-hero')
        window.evaluate_js('document.querySelector("#archive-heading").scrollIntoView({behavior:"instant"})')
        time.sleep(.5)
        capture('mobile-archive')
        window.evaluate_js('document.querySelector(".quarto-color-scheme-toggle").click();scrollTo({top:0,behavior:"instant"})')
        time.sleep(.5)
        capture('mobile-dark')
        native_task(lambda view: view.CallDevToolsProtocolMethodAsync('Emulation.setEmulatedMedia', json.dumps({'features':[{'name':'prefers-reduced-motion','value':'reduce'}]})))
        assert window.evaluate_js('getComputedStyle(document.querySelector(".hero-art img")).animationName==="none"')
        results['reduced_motion'] = True
        window.load_url(origin + '/posts/first-review/index.html')
        wait_for('document.readyState==="complete" && !!document.querySelector(".paper-article .article-eyebrow")', seconds=45)
        time.sleep(2)
        if window.evaluate_js('document.body.classList.contains("quarto-dark")'):
            window.evaluate_js('document.querySelector(".quarto-color-scheme-toggle").click()')
            time.sleep(.5)
        results['mobile_article'] = measure()
        assert not results['mobile_article']['overflow'], results['mobile_article']
        capture('mobile-article')
        window.resize(1440, 1000)
        time.sleep(.7)
        results['desktop_article'] = measure()
        assert not results['desktop_article']['overflow'], results['desktop_article']
        capture('desktop-article')
        results['passed'] = True
    except Exception as error:
        results['passed'] = False
        results['error'] = str(error)
    finally:
        report.write_text(json.dumps(results, ensure_ascii=False, indent=2), encoding='utf-8')
        print(json.dumps(results, ensure_ascii=False))
        window.destroy()

try:
    webview.start(review, gui='edgechromium', private_mode=True)
finally:
    server.shutdown()

if not json.loads(report.read_text(encoding='utf-8')).get('passed'):
    raise SystemExit(1)

