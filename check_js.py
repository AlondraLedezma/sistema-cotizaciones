import re, subprocess
with open('templates/proyecto.html', 'r', encoding='utf-8') as f:
    html = f.read()
scripts = re.findall(r'<script>(.*?)</script>', html, re.DOTALL)
full_js = '\n'.join(scripts)
full_js = re.sub(r'\{\{.*?\}\}', '1', full_js)
full_js = re.sub(r'\{%.*?%\}', '', full_js)
with open('temp_test.js', 'w', encoding='utf-8') as f:
    f.write(full_js)
res = subprocess.run(['node', '--check', 'temp_test.js'], capture_output=True, text=True)
print('JS STDOUT:', res.stdout)
print('JS STDERR:', res.stderr)
if res.returncode == 0:
    print('JS OK')
else:
    print('JS ERROR')
