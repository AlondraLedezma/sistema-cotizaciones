import sys
sys.path.insert(0, r'C:\xampp\htdocs\Sistema de cotizaciones')
from app import q
rows = q('SELECT id, numero_proyecto, nombre_proyecto, tipo_proyecto FROM proyectos ORDER BY id')
for r in rows:
    print("ID=%s | #%s | %s | %s" % (r["id"], r["numero_proyecto"], r["nombre_proyecto"], r["tipo_proyecto"]))
