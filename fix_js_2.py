import re
with open('old_proyecto.js', 'rb') as f:
    text = f.read().decode('utf-16le')

# Replace api/xxx.php with /api/legacy/xxx
text = re.sub(r'[\'\"]api/([a-zA-Z_]+)\.php', r"'/api/legacy/\1", text)
text = re.sub(r'\`api/([a-zA-Z_]+)\.php', r"`/api/legacy/\1", text)

with open('static/js/proyecto_cotizacion.js', 'w', encoding='utf-8') as f:
    f.write(text)

print('Done converting old_proyecto.js to static/js/proyecto_cotizacion.js in UTF-8!')
