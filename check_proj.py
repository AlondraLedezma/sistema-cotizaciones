import pymysql
conn = pymysql.connect(host='localhost',user='root',password='',db='cotizaciones_dematiq',cursorclass=pymysql.cursors.DictCursor)
cursor = conn.cursor()
cursor.execute("SELECT id FROM proyectos WHERE numero_proyecto='DM-2026-4242'")
p = cursor.fetchone()
if p:
    cursor.execute("SELECT * FROM insumos_viaticos_cd WHERE proyecto_id=%s", (p['id'],))
    print("Viaticos CD:", cursor.fetchall())
else:
    print("Not found")
