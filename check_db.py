import pymysql

conn = pymysql.connect(host='localhost', user='root', password='', db='cotizaciones_dematiq', cursorclass=pymysql.cursors.DictCursor)
cursor = conn.cursor()

# Get recent projects
cursor.execute("SELECT id, numero_proyecto FROM proyectos ORDER BY id DESC LIMIT 5")
proyectos = cursor.fetchall()

print("Recent projects:", proyectos)

for p in proyectos:
    pid = p['id']
    cursor.execute("SELECT id, viajes_cd, autocasetas, gasolina, renta_auto, dias FROM insumos_viaticos_cd WHERE proyecto_id=%s", (pid,))
    rows = cursor.fetchall()
    if rows:
        print(f"Project {pid} viaticos_cd:", rows)

