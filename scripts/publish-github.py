"""Publish this checkout using Git Credential Manager; credentials never leave process memory.
Run only after reviewing and committing the intended public source.
"""
import json
import os
import subprocess
import sys
import urllib.request
import urllib.error

OWNER = 'eshaanvgupta'
REPO = 'reclaim-run-paypal-ai'
env = dict(os.environ, GIT_TERMINAL_PROMPT='0', GCM_INTERACTIVE='never')
result = subprocess.run(['git', 'credential', 'fill'], input='protocol=https\nhost=github.com\n\n', text=True, capture_output=True, env=env, timeout=30)
credentials = dict(line.split('=', 1) for line in result.stdout.splitlines() if '=' in line)
token = credentials.get('password')
if not token:
    sys.exit('No stored GitHub credentials. Authenticate Git Credential Manager, then retry.')

def request(path, data=None):
    req = urllib.request.Request('https://api.github.com' + path, data=json.dumps(data).encode() if data is not None else None, headers={'Authorization': 'Bearer ' + token, 'Accept': 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', 'User-Agent': 'reclaim-run-local-publisher'})
    with urllib.request.urlopen(req, timeout=30) as response:
        return json.load(response)

user = request('/user')
if user['login'].lower() != OWNER:
    sys.exit('Stored credential identity differs from the authorized GitHub owner. No changes made.')
if '--check' in sys.argv:
    print('Verified Git credential identity:', user['login'])
    sys.exit(0)
try:
    repository = request('/repos/' + OWNER + '/' + REPO)
    print('Existing target found. It will only receive a non-force Git push.')
except urllib.error.HTTPError as error:
    if error.code != 404:
        sys.exit('GitHub repository check failed: HTTP ' + str(error.code))
    repository = request('/user/repos', {'name': REPO, 'private': False, 'description': 'RECLAIM//RUN — an inventory rescue arcade with constrained bundles, ephemeral BYOK AI, and PayPal sandbox commerce.', 'auto_init': False})
    print('Created public repository:', repository['html_url'])
if repository.get('private'):
    sys.exit('The existing repository is private. Visibility was not changed automatically.')
remotes = subprocess.run(['git', 'remote'], capture_output=True, text=True, check=True).stdout.split()
url = 'https://github.com/' + OWNER + '/' + REPO + '.git'
if 'origin' not in remotes:
    subprocess.run(['git', 'remote', 'add', 'origin', url], check=True)
else:
    existing = subprocess.run(['git', 'remote', 'get-url', 'origin'], capture_output=True, text=True, check=True).stdout.strip()
    if existing != url:
        sys.exit('Existing origin differs from the authorized target. No push performed.')
subprocess.run(['git', 'push', '-u', 'origin', 'main'], env=env, check=True, timeout=180)
local = subprocess.run(['git', 'rev-parse', 'HEAD'], capture_output=True, text=True, check=True).stdout.strip()
remote = subprocess.run(['git', 'ls-remote', 'origin', 'refs/heads/main'], capture_output=True, text=True, env=env, check=True).stdout.split()[0]
if local != remote:
    sys.exit('Remote main differs from the local commit. Verification failed.')
print('VERIFIED REPOSITORY:', repository['html_url'])
print('VERIFIED COMMIT:', remote)
