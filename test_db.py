import pymysql
import pymysql.cursors

DB = dict(host="localhost", user="root", password="",
          database="cotizaciones_dematiq", charset="utf8mb4",
          cursorclass=pymysql.cursors.DictCursor, autocommit=True)

def get_db():
    return pymysql.connect(**DB)

def q(sql, params=(), fetch="all"):
    conn = get_db()
    with conn.cursor() as c:
        c.execute(sql, params)
        if fetch == "all":
            result = c.fetchall()
        elif fetch == "one":
            result = c.fetchone()
        else:
            result = c.lastrowid
    conn.close()
    return result

proyectos = q("SELECT * FROM proyectos ORDER BY id DESC LIMIT 5")
for p in proyectos:
    print(p["id"], p["nombre_proyecto"], p["tipo_proyecto"])
