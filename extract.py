import subprocess
import os

def run(cmd):
    return subprocess.check_output(cmd, shell=True)

# 1. HTML
html_raw = run('git show 7679b8f:proyecto.html')
try:
    html_text = html_raw.decode('utf-16le')
except:
    html_text = html_raw.decode('utf-8', errors='ignore')

# We need to change the references in HTML: 
html_text = html_text.replace('js/proyecto.js', '/static/js/proyecto_cotizacion.js')
html_text = html_text.replace('css/styles.css', '/static/css/cotizacion.css')
html_text = html_text.replace('href="css/', 'href="/static/css/')
html_text = html_text.replace('src="js/', 'src="/static/js/')
# Replace API calls with Flask routes
html_text = html_text.replace('api/proyectos.php', '/api/proyecto')
html_text = html_text.replace('.php', '') # Might break some things, let's be careful
# Actually, the original js handles API calls, we'll patch that in the JS file, not HTML.

with open('templates/proyecto_cotizacion.html', 'w', encoding='utf-8') as f:
    f.write(html_text)

# 2. JS
js_raw = run('git show 7679b8f:js/proyecto.js')
try:
    js_text = js_raw.decode('utf-16le')
except:
    js_text = js_raw.decode('utf-8', errors='ignore')

# Fix API paths in JS
js_text = js_text.replace('api/secciones.php', '/api/secciones')
js_text = js_text.replace('api/partidas.php', '/api/partidas')
js_text = js_text.replace('api/proyectos.php', '/api/proyecto')
js_text = js_text.replace('api/puntos.php', '/api/puntos')
js_text = js_text.replace('api/condiciones.php', '/api/condiciones')
js_text = js_text.replace('api/io.php', '/api/io')
js_text = js_text.replace('api/sub_secciones.php', '/api/sub_secciones')
js_text = js_text.replace('api/insumos_especiales.php', '/api/insumos_especiales')

# Use standard json payload for API calls since Flask expects JSON mostly, or just leave as is if Flask handles form-data/args
with open('static/js/proyecto_cotizacion.js', 'w', encoding='utf-8') as f:
    f.write(js_text)

# 3. CSS
css_raw = run('git show 7679b8f:css/styles.css')
try:
    css_text = css_raw.decode('utf-16le')
except:
    css_text = css_raw.decode('utf-8', errors='ignore')

with open('static/css/cotizacion.css', 'w', encoding='utf-8') as f:
    f.write(css_text)

print("Files extracted and patched successfully!")
