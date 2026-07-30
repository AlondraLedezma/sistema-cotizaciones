import re

with open('static/js/proyecto_cotizacion.js', 'rb') as f:
    text_bytes = f.read()
try:
    text = text_bytes.decode('utf-16le')
except:
    text = text_bytes.decode('utf-8', errors='ignore')

# Now let's print some fetches to see what's actually there
matches = re.findall(r'apiCall\([^\)]*\)', text)
print("apiCalls found:", len(matches))
if matches:
    print(matches[:5])
