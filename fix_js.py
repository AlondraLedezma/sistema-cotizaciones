import subprocess
import re

raw = subprocess.check_output('git show 7679b8f:js/proyecto.js', shell=True)
try:
    text = raw.decode('utf-16le')
except:
    text = raw.decode('utf-8', errors='ignore')

# 1. Replace API calls to match PHP query param style, but route to /api/legacy
text = re.sub(r'[\'\"]api/([a-zA-Z_]+)\.php', r"'/api/legacy/\1", text)
text = re.sub(r'\`api/([a-zA-Z_]+)\.php', r"`/api/legacy/\1", text)

with open('static/js/proyecto_cotizacion.js', 'w', encoding='utf-8') as f:
    f.write(text)
print('Fixed encoding and replaced api routes to /api/legacy/*')
