import pymysql
conn = pymysql.connect(host='localhost',user='root',password='',db='cotizaciones_dematiq',cursorclass=pymysql.cursors.DictCursor)
cursor = conn.cursor()
cursor.execute("SELECT codigo, subtotal_mn, subtotal_usd FROM secciones WHERE proyecto_id=1")
print(cursor.fetchall())
