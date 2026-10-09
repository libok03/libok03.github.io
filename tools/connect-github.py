"""Use an existing repository login in the app session; never save token files."""
import datetime
import json
import os
from pathlib import Path
import subprocess
import sys
import urllib.request

root = Path(__file__).resolve().parent.parent
gh = root / '.tools/github/bin/gh.exe'
state_file = root / '.tools/apps/current/PaperBlog/_internal/ui/github-connection.json'
environment = dict(os.environ, GIT_TERMINAL_PROMPT='0', GCM_INTERACTIVE='Never', GH_PROMPT_DISABLED='1')
flags = getattr(subprocess, 'CREATE_NO_WINDOW', 0)
state = {'ready':False,'checkedAt':datetime.datetime.now(datetime.timezone.utc).isoformat()}
options = dict(capture_output=True,text=True,encoding='utf-8',errors='replace',timeout=5,creationflags=flags)
try:
    status = subprocess.run([str(gh),'auth','status','--hostname','github.com'],env=environment,**options)
    if status.returncode != 0:
        response = subprocess.run(['git','-c','credential.interactive=false','credential','fill'],
            input='protocol=https\nhost=github.com\npath=libok03/libok03.github.io.git\n\n',
            cwd=root,env=environment,**options)
        fields = dict(line.split('=',1) for line in response.stdout.splitlines() if '=' in line)
        token = fields.get('password')
        if not token:
            raise RuntimeError('Existing repository login is unavailable.')
        request = urllib.request.Request('https://api.github.com/user',headers={'Authorization':'Bearer '+token,'Accept':'application/vnd.github+json'})
        with urllib.request.urlopen(request,timeout=3) as response:
            account = json.load(response)
        if account['login'].lower() != 'libok03':
            raise RuntimeError('Repository account does not match the existing login.')
        environment['GH_TOKEN'] = token
    check = subprocess.run([str(gh),'api','repos/libok03/libok03.github.io','--jq','.permissions.push'],
        env=environment,**options)
    session = subprocess.run([str(gh),'auth','status','--hostname','github.com'],env=environment,**options)
    state['ready'] = check.returncode == 0 and check.stdout.strip() == 'true' and session.returncode == 0
except Exception:
    state['message'] = 'GitHub 연결을 확인하지 못했습니다. 로그인 안내를 확인하세요.'
state_file.parent.mkdir(parents=True,exist_ok=True)
state_file.write_text(json.dumps(state,ensure_ascii=False),encoding='utf-8')
if '--launch' in sys.argv:
    app = root / '.tools/apps/current/PaperBlog/PaperBlog.exe'
    subprocess.Popen([str(app),'--project',str(root)],cwd=root,env=environment,creationflags=flags)
else:
    print(json.dumps({'ready':state['ready']}))
