import pymysql
conn = pymysql.connect(host='localhost',user='root',password='',db='cotizaciones_dematiq',cursorclass=pymysql.cursors.DictCursor)
cursor = conn.cursor()
cursor.execute("SELECT * FROM secciones WHERE proyecto_id=1 AND codigo='INSUMOS'")
print("INSUMOS seccion:", cursor.fetchone())
