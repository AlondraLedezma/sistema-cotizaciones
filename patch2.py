import re

with open('app.py', 'r', encoding='utf-8') as f:
    content = f.read()

# rename _build_pdf to _build_cotizacion_pdf
content = content.replace('def _build_pdf(', 'def _build_cotizacion_pdf(')

# read presentation_pdf.py
with open('presentation_pdf.py', 'r', encoding='utf-8') as f:
    presentation = f.read()

presentation = presentation.replace('def _build_pdf(', 'def _build_proyecto_pdf(')

router = """
def _build_pdf(proyecto, secciones, condiciones, moneda="MN", subtemas=None):
    if proyecto.get("tipo_proyecto") == "proyecto":
        return _build_proyecto_pdf(proyecto, secciones, condiciones, moneda, subtemas)
    else:
        return _build_cotizacion_pdf(proyecto, secciones, condiciones, moneda, subtemas)
"""

# append to the end of app.py before if __name__
end = content.find('if __name__ == "__main__":')
if end == -1:
    end = len(content)
    
new_content = content[:end] + presentation + "\n" + router + "\n" + content[end:]

with open('app.py', 'w', encoding='utf-8') as f:
    f.write(new_content)
    
print("Successfully patched app.py with both PDF generators!")
