"""Integration checks against the app's native WebView2 renderer."""
import json
from pathlib import Path
import time
import webview
from app import make_server, project_root
from backend import Workspace

workspace = Workspace(project_root())
server = make_server(workspace)
origin = f'http://127.0.0.1:{server.server_port}'
window = webview.create_window('Paper Notes · design check', origin + '/preview/index.html', width=1440, height=900, min_size=(320, 500))

def check():
    results = {}
    try:
        for _ in range(40):
            time.sleep(.25)
            result = window.evaluate_js('({ready:!!document.querySelector(".awards-hero"),width:innerWidth,overflow:document.documentElement.scrollWidth>innerWidth+1,cards:document.querySelectorAll(".paper-card").length,images:[...document.images].every(i=>i.complete&&i.naturalWidth>0)})')
            if result['ready'] and result['images']:
                break
        assert result['ready'] and result['cards'] == 2 and result['images'] and not result['overflow'], result
        results['desktop'] = result
        window.evaluate_js('document.getElementById("paper-search").value="Attention";document.getElementById("paper-search").dispatchEvent(new Event("input"));')
        assert window.evaluate_js('document.querySelectorAll(".paper-card:not([hidden])").length') == 1
        window.evaluate_js('document.getElementById("paper-search").value="zzzz_no_match";document.getElementById("paper-search").dispatchEvent(new Event("input"));')
        assert window.evaluate_js('!document.getElementById("paper-search-empty").hidden')
        window.evaluate_js('document.getElementById("paper-search").value="";document.getElementById("paper-search").dispatchEvent(new Event("input"));')
        window.resize(390, 844)
        time.sleep(1)
        mobile = window.evaluate_js('({width:innerWidth,overflow:document.documentElement.scrollWidth>innerWidth+1,columns:getComputedStyle(document.querySelector(".paper-grid")).gridTemplateColumns})')
        assert not mobile['overflow'], mobile
        results['mobile'] = mobile
        results['search'] = True
        results['passed'] = True
    except Exception as error:
        results['passed'] = False
        results['error'] = str(error)
    (workspace.root / '.tools/design-check.json').write_text(json.dumps(results, ensure_ascii=False, indent=2), encoding='utf-8')
    window.destroy()

try:
    webview.start(check, gui='edgechromium')
finally:
    server.shutdown()

