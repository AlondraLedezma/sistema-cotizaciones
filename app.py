from flask import (Flask, render_template, request, redirect, url_for,
                   session, jsonify, send_file, send_from_directory)
import pymysql, pymysql.cursors, hashlib, random, os, io
from datetime import date, datetime
from functools import wraps

app = Flask(__name__)
app.secret_key = "dematiq-2026-secret-key"

from legacy_api import legacy_api
app.register_blueprint(legacy_api)

@app.after_request
def add_header(r):
    r.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    r.headers["Pragma"] = "no-cache"
    r.headers["Expires"] = "0"
    r.headers['Cache-Control'] = 'public, max-age=0'
    return r

@app.route("/favicon.ico")
def favicon():
    return send_from_directory(os.path.join(app.root_path, "static"),
                               "favicon.ico", mimetype="image/x-icon")

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

def ex(sql, params=()):
    conn = get_db()
    with conn.cursor() as c:
        c.execute(sql, params)
        lid = c.lastrowid
    conn.close()
    return lid

def login_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if "user_id" not in session:
            return redirect(url_for("login"))
        return f(*args, **kwargs)
    return decorated

def hash_pw(p): return hashlib.sha256(p.encode()).hexdigest()

def verify_pw(plain, stored):
    import re
    if re.match(r"^\$2[aby]\$", stored):
        try:
            import bcrypt
            return bcrypt.checkpw(plain.encode(), stored.encode())
        except Exception:
            pass
    return hash_pw(plain) == stored

@app.route("/", methods=["GET"])
def index():
    return redirect(url_for("dashboard") if "user_id" in session else url_for("login"))

@app.route("/login", methods=["GET", "POST"])
def login():
    error = None
    if request.method == "POST":
        email = request.form.get("email", "").strip()
        pwd   = request.form.get("password", "")
        user  = q("SELECT * FROM usuarios WHERE email=%s", (email,), fetch="one")
        if not user or not verify_pw(pwd, user["password_hash"]):
            error = "Correo o contraseña incorrectos."
        else:
            session["user_id"] = user["id"]
            session["user_email"] = user["email"]
            session["user_nombre"] = user.get("nombre") or user["email"]
            return redirect(url_for("dashboard"))
    return render_template("login.html", error=error)

@app.route("/logout")
def logout():
    session.clear()
    return redirect(url_for("login"))

@app.route("/api/auth/check")
def api_auth_check():
    if "user_id" in session:
        return jsonify(success=True, authenticated=True,
                       user={"id": session["user_id"], "email": session.get("user_email"),
                             "nombre": session.get("user_nombre")})
    return jsonify(success=True, authenticated=False)

@app.route("/registro", methods=["GET", "POST"])
def registro():
    error = None
    success = None
    if request.method == "POST":
        nombre = request.form.get("nombre", "").strip()
        email  = request.form.get("email", "").strip()
        pwd    = request.form.get("password", "")
        pwd2   = request.form.get("password2", "")
        if not nombre or not email or not pwd:
            error = "Todos los campos son obligatorios."
        elif pwd != pwd2:
            error = "Las contraseñas no coinciden."
        elif len(pwd) < 6:
            error = "La contraseña debe tener al menos 6 caracteres."
        else:
            existe = q("SELECT id FROM usuarios WHERE email=%s", (email,), fetch="one")
            if existe:
                error = "Ya existe una cuenta con ese correo."
            else:
                try:
                    ex("INSERT INTO usuarios (nombre, email, password_hash) VALUES (%s,%s,%s)",
                       (nombre, email, hash_pw(pwd)))
                    success = "Cuenta creada correctamente. Ya puedes iniciar sesión."
                except Exception as e:
                    error = f"Error al crear cuenta: {e}"
    return render_template("registro.html", error=error, success=success)

@app.route("/dashboard")
@login_required
def dashboard():
    return render_template("dashboard.html",
                           user_email=session.get("user_email"),
                           user_nombre=session.get("user_nombre"))

@app.route("/proyecto/<int:pid>")
@login_required
def proyecto(pid):
    p = q("SELECT * FROM proyectos WHERE id=%s", (pid,), fetch="one")
    if not p:
        return redirect(url_for("dashboard"))
    vendedor_row = q("SELECT valor FROM configuracion WHERE clave='vendedor'", fetch="one")
    vendedor = vendedor_row.get("valor") if vendedor_row else "Jose Moreno Rangel"
    tel_row = q("SELECT valor FROM configuracion WHERE clave='vendedor_telefono'", fetch="one")
    vendedor_telefono = tel_row.get("valor") if tel_row else "442 7214891"
    correo_row = q("SELECT valor FROM configuracion WHERE clave='vendedor_correo'", fetch="one")
    vendedor_correo = correo_row.get("valor") if correo_row else "ventas@dematiq.com"
    nota_row = q("SELECT valor FROM configuracion WHERE clave='nota_aclaracion'", fetch="one")
    nota_aclaracion = nota_row.get("valor") if nota_row else "Para cualquier aclaración con respecto a esta cotización o para colocar su orden, favor de comunicarse al correo: integraqro07@outlook.com"
    slogans_row = q("SELECT valor FROM configuracion WHERE clave='slogans'", fetch="one")
    slogans = slogans_row.get("valor") if slogans_row else "Integracion de sistemas Automatizados\nProgramacion de PLC, HMI\nServicio de Diseño y Armado Tableros\nPolizas de Mantenimiento"
    
    titulo_cond_row = q("SELECT valor FROM configuracion WHERE clave='condiciones_seccion_titulo'", fetch="one")
    titulo_cond = titulo_cond_row.get("valor") if titulo_cond_row else "CONDICIONES COMERCIALES"
    
    tipo = p.get("tipo_proyecto", "")
    if tipo in ("cotizacion", "mecanico"):
        return render_template("proyecto_cotizacion.html", proyecto=p)
    
    return render_template("proyecto.html", proyecto=p, vendedor_config=vendedor,
                           vendedor_telefono=vendedor_telefono,
                           vendedor_correo_config=vendedor_correo,
                           nota_aclaracion=nota_aclaracion,
                           slogans_config=slogans,
                           condiciones_seccion_titulo_config=titulo_cond,
                           user_email=session.get("user_email"))

@app.route("/api/stats")
@login_required
def api_stats():
    stats = q("""SELECT COUNT(*) total,
               SUM(CASE WHEN MONTH(fecha_creacion)=MONTH(CURDATE())
                         AND YEAR(fecha_creacion)=YEAR(CURDATE()) THEN 1 ELSE 0 END) mes,
               COALESCE(SUM(total_mn),0) monto
               FROM proyectos""", fetch="one")
    chart = q("""SELECT numero_proyecto, nombre_proyecto, total_mn, total_usd
                 FROM proyectos ORDER BY created_at DESC LIMIT 8""")
    return jsonify(stats=stats, chart=list(chart))

@app.route("/api/proyectos")
@login_required
def api_proyectos():
    search = request.args.get("q", "")
    if search:
        rows = q("""SELECT * FROM proyectos WHERE nombre_proyecto LIKE %s
                    OR empresa_cliente LIKE %s OR numero_proyecto LIKE %s
                    ORDER BY created_at DESC""",
                 (f"%{search}%", f"%{search}%", f"%{search}%"))
    else:
        rows = q("SELECT * FROM proyectos ORDER BY created_at DESC")
    return jsonify(data=list(rows))

@app.route("/api/proyectos/create", methods=["POST"])
@login_required
def api_crear_proyecto():
    d = request.json or {}
    nombre = (d.get("nombre_proyecto") or "").strip()
    if not nombre:
        return jsonify(error="Nombre requerido"), 400
    num = (d.get("numero_proyecto") or "").strip()
    if not num:
        return jsonify(error="Número de proyecto requerido"), 400
    existing = q("SELECT id FROM proyectos WHERE numero_proyecto=%s", (num,), fetch="one")
    if existing:
        return jsonify(error="El número de proyecto ya existe"), 400
    pid = ex("""INSERT INTO proyectos
               (numero_proyecto,nombre_proyecto,empresa_cliente,contacto_cliente,
                telefono_cliente,email_cliente,atencion,referencia,carpeta_link,
                fecha_creacion,usuario_id)
               VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)""",
             (num, nombre, d.get("empresa_cliente",""), d.get("contacto_cliente",""),
              d.get("telefono_cliente",""), d.get("email_cliente",""),
              d.get("atencion",""), d.get("referencia",""), d.get("carpeta_link",""),
              date.today().isoformat(), session["user_id"]))

    secciones = [
        ("PRESE","PRESENTACIÓN","mano_obra",1,"#64748b"),
        ("REPORTE","REPORTE GENERAL","mano_obra",2,"#16a34a"),
        ("ING_MO","ING. MANO DE OBRA","mano_obra",3,"#2563eb"),
        ("E_CONTROL","EQUIPO DE CONTROL","equipo",4,"#0d47a1"),
        ("E_ELECTRICO","EQUIPO ELÉCTRICO","equipo",5,"#0284c7"),
        ("E_NEUMATICO","EQUIPO NEUMÁTICO","equipo",6,"#0891b2"),
        ("E_MECANICO","EQUIPO MECÁNICO","equipo",7,"#ea580c"),
        ("T_ELECTRICO","TABLERO ELÉCTRICO","equipo",8,"#6366f1"),
        ("INSUMOS","INSUMOS","equipo",9,"#dc2626"),
        ("LISTAS","LISTAS","equipo",10,"#7c3aed"),
        ("CONDICIONES","CONDICIONES COMERCIALES","mano_obra",11,"#475569"),
    ]
    for code,title,tipo,orden,color in secciones:
        ex("INSERT INTO secciones (proyecto_id,codigo,titulo,tipo,orden,color) VALUES (%s,%s,%s,%s,%s,%s)",
           (pid,code,title,tipo,orden,color))

    conds = [
        ("C1","Precios expresados en Moneda Nacional con IVA incluido.",1),
        ("C2","Tiempo de entrega según especificaciones del proyecto.",2),
        ("C3","Anticipo del 50% para iniciar trabajos.",3),
        ("C4","Garantía de 12 meses en equipos instalados.",4),
        ("C5","Cotización válida por 30 días naturales.",5),
    ]
    for code,cont,orden in conds:
        ex("INSERT INTO condiciones_comerciales (proyecto_id,codigo,contenido,orden) VALUES (%s,%s,%s,%s)",
           (pid,code,cont,orden))

    return jsonify(id=pid, numero=num)

@app.route("/api/proyectos/delete", methods=["POST"])
@login_required
def api_delete_proyecto():
    d = request.json or {}
    pid   = d.get("id")
    clave = d.get("clave","")
    if clave != "ELIMINAR2026":
        return jsonify(error="Clave incorrecta"), 403
    ex("DELETE FROM proyectos WHERE id=%s", (pid,))
    return jsonify(ok=True)

@app.route("/api/proyectos/update", methods=["POST"])
@login_required
def api_update_proyecto():
    d = request.json or {}
    pid = d.get("id")
    curr = q("SELECT porcentaje_iva FROM proyectos WHERE id=%s", (pid,), fetch="one")
    curr_iva = curr.get("porcentaje_iva") if curr else 16.00
    new_num = d.get("numero_proyecto")
    if new_num:
        conflict = q("SELECT id FROM proyectos WHERE numero_proyecto=%s AND id!=%s", (new_num, pid), fetch="one")
        if conflict:
            return jsonify(error="El número de proyecto ya está en uso"), 400
        ex("UPDATE proyectos SET numero_proyecto=%s WHERE id=%s", (new_num, pid))
    ex("""UPDATE proyectos SET nombre_proyecto=%s,empresa_cliente=%s,
          contacto_cliente=%s,telefono_cliente=%s,email_cliente=%s,
          atencion=%s,referencia=%s,descripcion_solucion=%s,
          fecha_creacion=%s,fecha_vencimiento=%s,tipo_cambio_usd=%s,
          carpeta_link=%s,tiempo_entrega=%s,condiciones_pago=%s,
          porcentaje_iva=%s,dias_vigencia=%s WHERE id=%s""",
       (d.get("nombre_proyecto"), d.get("empresa_cliente"),
        d.get("contacto_cliente"), d.get("telefono_cliente"),
        d.get("email_cliente"), d.get("atencion"), d.get("referencia"),
        d.get("descripcion_solucion"), d.get("fecha_creacion"),
        d.get("fecha_vencimiento"), d.get("tipo_cambio_usd") or 20,
        d.get("carpeta_link"), d.get("tiempo_entrega"), d.get("condiciones_pago"),
        d.get("porcentaje_iva") if d.get("porcentaje_iva") is not None else curr_iva,
        d.get("dias_vigencia"), pid))
    tc_new = float(d.get("tipo_cambio_usd") or 20)
    recalc_project_currency_conversions(pid, tc_new)
    return jsonify(ok=True)

@app.route("/api/proyectos/seleccionar_carpeta", methods=["POST"])
@login_required
def api_seleccionar_carpeta():
    import tkinter as tk
    from tkinter import filedialog
    root = tk.Tk()
    root.withdraw()
    root.attributes("-topmost", True)
    folder = filedialog.askdirectory(parent=root, title="Seleccionar Carpeta")
    root.destroy()
    return jsonify(path=folder)

@app.route("/api/proyecto/<int:pid>")
@login_required
def api_get_proyecto(pid):
    _update_insumos_total(pid)
    proyecto = q("SELECT * FROM proyectos WHERE id=%s", (pid,), fetch="one")
    if not proyecto:
        return jsonify(error="No encontrado"), 404
    secciones = q("SELECT * FROM secciones WHERE proyecto_id=%s ORDER BY orden", (pid,))
    for s in secciones:
        if s["tipo"] == "mano_obra":
            s["partidas"] = list(q("SELECT * FROM partidas_mano_obra WHERE seccion_id=%s ORDER BY orden", (s["id"],)))
        else:
            s["partidas"] = list(q("SELECT * FROM partidas_equipo WHERE seccion_id=%s ORDER BY orden", (s["id"],)))
    condiciones = q("SELECT * FROM condiciones_comerciales WHERE proyecto_id=%s ORDER BY orden", (pid,))
    try:
        subtemas = q("SELECT * FROM subtemas_prese WHERE proyecto_id=%s ORDER BY orden", (pid,))
    except Exception:
        try:
            ex("""CREATE TABLE IF NOT EXISTS `subtemas_prese` (
              `id` int(11) NOT NULL AUTO_INCREMENT,
              `proyecto_id` int(11) NOT NULL,
              `titulo` varchar(500) NOT NULL,
              `contenido` text DEFAULT NULL,
              `indice` varchar(20) NOT NULL,
              `orden` int(11) DEFAULT 0,
              PRIMARY KEY (`id`),
              KEY `proyecto_id` (`proyecto_id`),
              CONSTRAINT `subtemas_prese_ibfk_1` FOREIGN KEY (`proyecto_id`) REFERENCES `proyectos` (`id`) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;""")
            subtemas = q("SELECT * FROM subtemas_prese WHERE proyecto_id=%s ORDER BY orden", (pid,))
        except Exception:
            subtemas = []
    _ensure_insumos_tables()
    listas = q("SELECT * FROM listas_predefinidas ORDER BY seccion_codigo, orden")
    _update_insumos_total(pid)
    # Load INSUMOS data
    insumos_cd, insumos_en_cd, insumos_transporte, insumos_ga, insumos_imss = [], [], [], [], []
    try:
        insumos_cd = list(q("SELECT * FROM insumos_viaticos_cd WHERE proyecto_id=%s ORDER BY orden", (pid,)))
        insumos_en_cd = list(q("SELECT * FROM insumos_viaticos_en_cd WHERE proyecto_id=%s ORDER BY orden", (pid,)))
        insumos_transporte = list(q("SELECT * FROM insumos_transporte WHERE proyecto_id=%s ORDER BY orden", (pid,)))
        insumos_ga = list(q("SELECT * FROM insumos_gastos_admin WHERE proyecto_id=%s ORDER BY orden", (pid,)))
        insumos_imss = list(q("SELECT * FROM insumos_imss WHERE proyecto_id=%s ORDER BY orden", (pid,)))
    except Exception:
        _ensure_insumos_tables()
        insumos_cd = list(q("SELECT * FROM insumos_viaticos_cd WHERE proyecto_id=%s ORDER BY orden", (pid,)))
        insumos_en_cd = list(q("SELECT * FROM insumos_viaticos_en_cd WHERE proyecto_id=%s ORDER BY orden", (pid,)))
        insumos_transporte = list(q("SELECT * FROM insumos_transporte WHERE proyecto_id=%s ORDER BY orden", (pid,)))
        insumos_ga = list(q("SELECT * FROM insumos_gastos_admin WHERE proyecto_id=%s ORDER BY orden", (pid,)))
        insumos_imss = list(q("SELECT * FROM insumos_imss WHERE proyecto_id=%s ORDER BY orden", (pid,)))
    # Auto-seed insumos rows if empty (for existing projects)
    has_insumos_sec = any(s['codigo']=='INSUMOS' for s in secciones)
    if has_insumos_sec and not insumos_cd and not insumos_en_cd and not insumos_transporte:
        _seed_insumos(pid)
        insumos_cd = list(q("SELECT * FROM insumos_viaticos_cd WHERE proyecto_id=%s ORDER BY orden", (pid,)))
        insumos_en_cd = list(q("SELECT * FROM insumos_viaticos_en_cd WHERE proyecto_id=%s ORDER BY orden", (pid,)))
        insumos_transporte = list(q("SELECT * FROM insumos_transporte WHERE proyecto_id=%s ORDER BY orden", (pid,)))
        insumos_ga = list(q("SELECT * FROM insumos_gastos_admin WHERE proyecto_id=%s ORDER BY orden", (pid,)))
        insumos_imss = list(q("SELECT * FROM insumos_imss WHERE proyecto_id=%s ORDER BY orden", (pid,)))
    return jsonify(
        proyecto=_serialize(proyecto),
        secciones=[_serialize(s) for s in secciones],
        condiciones=[_serialize(c) for c in condiciones],
        subtemas=[_serialize(st) for st in subtemas],
        listas=[_serialize(l) for l in listas],
        insumos_cd=[_serialize(r) for r in insumos_cd],
        insumos_en_cd=[_serialize(r) for r in insumos_en_cd],
        insumos_transporte=[_serialize(r) for r in insumos_transporte],
        insumos_gastos_admin=[_serialize(r) for r in insumos_ga],
        insumos_imss=[_serialize(r) for r in insumos_imss]
    )

@app.route("/api/partidas/create", methods=["POST"])
@login_required
def api_create_partida():
    d = request.json or {}
    sid  = d.get("seccion_id")
    tipo = d.get("tipo","mano_obra")
    sec  = q("SELECT * FROM secciones WHERE id=%s", (sid,), fetch="one")
    if not sec:
        return jsonify(error="Sección no encontrada"), 404
    n = q("SELECT COUNT(*) cnt FROM partidas_mano_obra WHERE seccion_id=%s" if tipo=="mano_obra"
          else "SELECT COUNT(*) cnt FROM partidas_equipo WHERE seccion_id=%s", (sid,), fetch="one")["cnt"] + 1
    if tipo == "mano_obra":
        new_id = ex("INSERT INTO partidas_mano_obra (seccion_id,numero_partida,descripcion,horas_mo,dias_trabajo,costo_hora_usd,porcentaje_mgn,subtotal,total_usd,total_mn,orden) VALUES (%s,%s,'',0,1,0,0,0,0,0,%s)",
                    (sid, n, n))
    else:
        new_id = ex("INSERT INTO partidas_equipo (seccion_id,numero_partida,descripcion,marca,modelo,cantidad,precio_lista,moneda,porcentaje_mgn,subtotal,total_mn,total_usd,orden) VALUES (%s,%s,'','','',1,0,'MN',0,0,0,0,%s)",
                    (sid, n, n))
    return jsonify(id=new_id)

@app.route("/api/partidas/update", methods=["POST"])
@login_required
def api_update_partida():
    d  = request.json or {}
    pid = d.get("id")
    tipo = d.get("tipo","mano_obra")
    tc   = float(d.get("tipo_cambio",20) or 20)
    if tipo == "mano_obra":
        h = float(d.get("horas_mo") or 0)
        di = float(d.get("dias_trabajo") or 0)
        c  = float(d.get("costo_hora_usd") or 0)
        m  = float(d.get("porcentaje_mgn") or 0)
        sub = h * di * c
        t_usd = sub * (1 + m/100)
        t_mn  = t_usd * tc
        ex("""UPDATE partidas_mano_obra SET descripcion=%s,horas_mo=%s,dias_trabajo=%s,
              costo_hora_usd=%s,porcentaje_mgn=%s,subtotal=%s,total_usd=%s,total_mn=%s
              WHERE id=%s""",
           (d.get("descripcion",""), h, di, c, m, sub, t_usd, t_mn, pid))
        sec = q("SELECT seccion_id FROM partidas_mano_obra WHERE id=%s", (pid,), fetch="one")
    else:
        qty    = float(d.get("cantidad") or 0)
        precio = float(d.get("precio_lista") or 0)
        m      = float(d.get("porcentaje_mgn") or 0)
        moneda = d.get("moneda","MN")
        sub    = qty * precio
        if moneda == "USD":
            t_usd = sub * (1 + m/100)
            t_mn  = t_usd * tc
        else:
            t_mn  = sub * (1 + m/100)
            t_usd = t_mn / tc if tc else 0
        ex("""UPDATE partidas_equipo SET descripcion=%s,marca=%s,modelo=%s,
              cantidad=%s,precio_lista=%s,moneda=%s,porcentaje_mgn=%s,
              subtotal=%s,total_mn=%s,total_usd=%s WHERE id=%s""",
           (d.get("descripcion",""), d.get("marca",""), d.get("modelo",""),
            qty, precio, moneda, m, sub, t_mn, t_usd, pid))
        sec = q("SELECT seccion_id FROM partidas_equipo WHERE id=%s", (pid,), fetch="one")

    if sec:
        _recalc_section(sec["seccion_id"], tipo, tc)
        sec_row = q("SELECT proyecto_id FROM secciones WHERE id=%s", (sec["seccion_id"],), fetch="one")
        if sec_row:
            _recalc_totals(sec_row["proyecto_id"])
    return jsonify(ok=True)

@app.route("/api/partidas/delete", methods=["POST"])
@login_required
def api_delete_partida():
    d    = request.json or {}
    pid  = d.get("id")
    tipo = d.get("tipo","mano_obra")
    tc   = float(d.get("tipo_cambio",20) or 20)
    if tipo == "mano_obra":
        sec = q("SELECT seccion_id FROM partidas_mano_obra WHERE id=%s", (pid,), fetch="one")
        ex("DELETE FROM partidas_mano_obra WHERE id=%s", (pid,))
    else:
        sec = q("SELECT seccion_id FROM partidas_equipo WHERE id=%s", (pid,), fetch="one")
        ex("DELETE FROM partidas_equipo WHERE id=%s", (pid,))
    if sec:
        _recalc_section(sec["seccion_id"], tipo, tc)
        sr = q("SELECT proyecto_id FROM secciones WHERE id=%s", (sec["seccion_id"],), fetch="one")
        if sr:
            _recalc_totals(sr["proyecto_id"])
    return jsonify(ok=True)

@app.route("/api/condiciones/create", methods=["POST"])
@login_required
def api_create_cond():
    d = request.json or {}
    pid = d.get("proyecto_id")
    cont = d.get("contenido", "")
    n = q("SELECT COUNT(*) cnt FROM condiciones_comerciales WHERE proyecto_id=%s", (pid,), fetch="one")["cnt"] + 1
    new_id = ex("INSERT INTO condiciones_comerciales (proyecto_id,codigo,contenido,orden) VALUES (%s,%s,%s,%s)",
                (pid, f"C{n}", cont, n))
    return jsonify(id=new_id, codigo=f"C{n}")

@app.route("/api/condiciones/update", methods=["POST"])
@login_required
def api_update_cond():
    d = request.json or {}
    ex("UPDATE condiciones_comerciales SET codigo=%s,contenido=%s WHERE id=%s",
       (d.get("codigo"), d.get("contenido"), d.get("id")))
    return jsonify(ok=True)

@app.route("/api/condiciones/delete", methods=["POST"])
@login_required
def api_delete_cond():
    ex("DELETE FROM condiciones_comerciales WHERE id=%s", (request.json.get("id"),))
    return jsonify(ok=True)

@app.route("/api/cuenta/update", methods=["POST"])
@login_required
def api_update_cuenta():
    d = request.json or {}
    user = q("SELECT * FROM usuarios WHERE id=%s", (session["user_id"],), fetch="one")
    if not verify_pw(d.get("current_password",""), user["password_hash"]):
        return jsonify(error="Contraseña actual incorrecta"), 400
    if d.get("new_email"):
        ex("UPDATE usuarios SET email=%s WHERE id=%s", (d["new_email"], session["user_id"]))
        session["user_email"] = d["new_email"]
    if d.get("new_password"):
        ex("UPDATE usuarios SET password_hash=%s WHERE id=%s",
           (hash_pw(d["new_password"]), session["user_id"]))
    return jsonify(ok=True)

@app.route("/api/proyecto/<int:pid>/pdf")
@login_required
def api_pdf(pid):
    proyecto   = q("SELECT * FROM proyectos WHERE id=%s", (pid,), fetch="one")
    secciones  = q("SELECT * FROM secciones WHERE proyecto_id=%s ORDER BY orden", (pid,))
    condiciones= q("SELECT * FROM condiciones_comerciales WHERE proyecto_id=%s ORDER BY orden", (pid,))
    subtemas   = q("SELECT * FROM subtemas_prese WHERE proyecto_id=%s ORDER BY orden, id", (pid,))
    moneda = request.args.get("moneda", "MN")
    try:
        from fpdf import FPDF
        pdf = _build_pdf(proyecto, secciones, condiciones, moneda, subtemas)
        buf = io.BytesIO()
        pdf.output(buf)
        buf.seek(0)
        filename = f"COT_{proyecto.get('numero_proyecto','')}.pdf"
        return send_file(buf, as_attachment=True, download_name=filename, mimetype="application/pdf")
    except Exception as e:
        return jsonify(error=str(e)), 500

@app.route("/api/proyecto/<int:pid>/pdf/save", methods=["POST"])
@login_required
def api_pdf_save(pid):
    d = request.json or {}
    moneda = d.get("moneda", "MN")
    proyecto   = q("SELECT * FROM proyectos WHERE id=%s", (pid,), fetch="one")
    secciones  = q("SELECT * FROM secciones WHERE proyecto_id=%s ORDER BY orden", (pid,))
    condiciones= q("SELECT * FROM condiciones_comerciales WHERE proyecto_id=%s ORDER BY orden", (pid,))
    subtemas   = q("SELECT * FROM subtemas_prese WHERE proyecto_id=%s ORDER BY orden, id", (pid,))
    try:
        import os
        filename = f"COT_{proyecto.get('numero_proyecto','')}.pdf"
        folder = (proyecto.get("carpeta_link") or "").strip()
        filepath = None
        if folder and os.path.isdir(folder):
            filepath = os.path.join(folder, filename)
        else:
            import tkinter as tk
            from tkinter import filedialog
            root = tk.Tk()
            root.withdraw()
            root.attributes("-topmost", True)
            filepath = filedialog.asksaveasfilename(
                parent=root,
                title="Guardar PDF de Cotización",
                initialfile=filename,
                defaultextension=".pdf",
                filetypes=[("Archivos PDF", "*.pdf")]
            )
            root.destroy()
        if not filepath:
            return jsonify(ok=False, canceled=True)
            
        if moneda == "AMBOS":
            base, ext = os.path.splitext(filepath)
            filepath_mn = f"{base}_MN{ext}"
            filepath_usd = f"{base}_USD{ext}"
            
            pdf_mn = _build_pdf(proyecto, secciones, condiciones, "MN", subtemas)
            pdf_mn.output(filepath_mn)
            
            pdf_usd = _build_pdf(proyecto, secciones, condiciones, "USD", subtemas)
            pdf_usd.output(filepath_usd)
            return jsonify(ok=True, path=f"{filepath_mn} y {filepath_usd}")
        else:
            pdf = _build_pdf(proyecto, secciones, condiciones, moneda, subtemas)
            pdf.output(filepath)
            return jsonify(ok=True, path=filepath)
    except Exception as e:
        return jsonify(error=str(e)), 500

@app.route("/api/listas_predefinidas")
@login_required
def api_listas():
    _ensure_insumos_tables()
    seccion = request.args.get("seccion", "")
    if seccion:
        rows = q("SELECT * FROM listas_predefinidas WHERE seccion_codigo=%s ORDER BY orden", (seccion,))
    else:
        rows = q("SELECT * FROM listas_predefinidas ORDER BY seccion_codigo, orden")
    return jsonify(data=list(rows))

@app.route("/api/listas_predefinidas/create", methods=["POST"])
@login_required
def api_create_lista():
    d = request.json or {}
    sec = d.get("seccion_codigo")
    val = d.get("valor","")
    factor = float(d.get("factor") or 1.2)
    n = q("SELECT COALESCE(MAX(orden),0)+1 as n FROM listas_predefinidas WHERE seccion_codigo=%s",
          (sec,), fetch="one")["n"]
    new_id = ex("INSERT INTO listas_predefinidas (seccion_codigo,valor,factor,orden) VALUES (%s,%s,%s,%s)",
                (sec, val, factor, n))
    return jsonify(id=new_id)

@app.route("/api/listas_predefinidas/update", methods=["POST"])
@login_required
def api_update_lista():
    d = request.json or {}
    iid = d.get("id")
    if "factor" in d:
        ex("UPDATE listas_predefinidas SET factor=%s WHERE id=%s", (d.get("factor"), iid))
    if "valor" in d:
        ex("UPDATE listas_predefinidas SET valor=%s WHERE id=%s", (d.get("valor"), iid))
    return jsonify(ok=True)

@app.route("/api/listas_predefinidas/delete", methods=["POST"])
@login_required
def api_delete_lista():
    ex("DELETE FROM listas_predefinidas WHERE id=%s", (request.json.get("id"),))
    return jsonify(ok=True)

# ─── INSUMOS HELPERS ────────────────────────────────────────────────────────────
def _ensure_insumos_tables():
    try:
        ex("ALTER TABLE `listas_predefinidas` ADD COLUMN `factor` float DEFAULT 1.2")
    except Exception: pass
    factors = [
        ("FACTOR VIATICOS A CD", 1.2, 1),
        ("FACTOR AUTO FORANEO", 1.2, 2),
        ("FACTOR VIATICOS EN CD", 1.2, 3),
        ("FACTOR AUTO LOCAL", 1.2, 4),
        ("FACTOR HOSPEDAJE", 1.2, 5),
        ("FACTOR TRANSPORTE", 1.2, 6),
        ("FACTOR GASTOS ADMIN", 1.2, 7),
        ("FACTOR IMSS", 1.2, 8)
    ]
    for f_name, f_val, f_ord in factors:
        exists = q("SELECT id FROM listas_predefinidas WHERE seccion_codigo='INSUMOS' AND valor=%s", (f_name,), fetch="one")
        if not exists:
            ex("INSERT INTO listas_predefinidas (seccion_codigo, valor, factor, orden) VALUES ('INSUMOS', %s, %s, %s)", (f_name, f_val, f_ord))

    ex("""CREATE TABLE IF NOT EXISTS `insumos_viaticos_cd` (
      `id` int(11) NOT NULL AUTO_INCREMENT,
      `proyecto_id` int(11) NOT NULL,
      `persona` varchar(200) DEFAULT '',
      `personas` float DEFAULT 0,
      `viajes_cd` float DEFAULT 0,
      `autobus` float DEFAULT 0,
      `taxis` float DEFAULT 0,
      `subtotal_mn` float DEFAULT 0,
      `autocasetas` float DEFAULT 0,
      `gasolina` float DEFAULT 0,
      `subtotal_mn2` float DEFAULT 0,
      `orden` int(11) DEFAULT 0,
      PRIMARY KEY (`id`),
      KEY `proyecto_id` (`proyecto_id`),
      CONSTRAINT `ivc_ibfk_1` FOREIGN KEY (`proyecto_id`) REFERENCES `proyectos` (`id`) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci""")
    try:
        ex("ALTER TABLE `insumos_viaticos_cd` ADD COLUMN `renta_auto` float DEFAULT 0")
    except Exception: pass
    try:
        ex("ALTER TABLE `insumos_viaticos_cd` ADD COLUMN `dias` float DEFAULT 0")
    except Exception: pass
    try:
        ex("ALTER TABLE `insumos_viaticos_en_cd` ADD COLUMN `gasolina` float DEFAULT 0")
    except Exception: pass
    try:
        ex("ALTER TABLE `insumos_viaticos_en_cd` ADD COLUMN `dias_auto` float DEFAULT 0")
    except Exception: pass
    ex("""CREATE TABLE IF NOT EXISTS `insumos_viaticos_en_cd` (
      `id` int(11) NOT NULL AUTO_INCREMENT,
      `proyecto_id` int(11) NOT NULL,
      `persona` varchar(200) DEFAULT '',
      `personas` float DEFAULT 0,
      `dias` float DEFAULT 0,
      `alimentos` float DEFAULT 0,
      `hotel` float DEFAULT 0,
      `transporte` float DEFAULT 0,
      `subtotal_mn` float DEFAULT 0,
      `renta_coche` float DEFAULT 0,
      `meses` float DEFAULT 0,
      `renta_casa` float DEFAULT 0,
      `subtotal_mn2` float DEFAULT 0,
      `orden` int(11) DEFAULT 0,
      PRIMARY KEY (`id`),
      KEY `proyecto_id` (`proyecto_id`),
      CONSTRAINT `ivec_ibfk_1` FOREIGN KEY (`proyecto_id`) REFERENCES `proyectos` (`id`) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci""")
    ex("""CREATE TABLE IF NOT EXISTS `insumos_transporte` (
      `id` int(11) NOT NULL AUTO_INCREMENT,
      `proyecto_id` int(11) NOT NULL,
      `descripcion` varchar(300) DEFAULT '',
      `costo` float DEFAULT 0,
      `no_veces` float DEFAULT 0,
      `subtotal` float DEFAULT 0,
      `orden` int(11) DEFAULT 0,
      PRIMARY KEY (`id`),
      KEY `proyecto_id` (`proyecto_id`),
      CONSTRAINT `it_ibfk_1` FOREIGN KEY (`proyecto_id`) REFERENCES `proyectos` (`id`) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci""")
    ex("""CREATE TABLE IF NOT EXISTS `insumos_gastos_admin` (
      `id` int(11) NOT NULL AUTO_INCREMENT,
      `proyecto_id` int(11) NOT NULL,
      `descripcion` varchar(300) DEFAULT '',
      `costo` float DEFAULT 0,
      `subtotal` float DEFAULT 0,
      `orden` int(11) DEFAULT 0,
      PRIMARY KEY (`id`),
      KEY `proyecto_id` (`proyecto_id`),
      CONSTRAINT `iga_ibfk_1` FOREIGN KEY (`proyecto_id`) REFERENCES `proyectos` (`id`) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci""")
    ex("""CREATE TABLE IF NOT EXISTS `insumos_imss` (
      `id` int(11) NOT NULL AUTO_INCREMENT,
      `proyecto_id` int(11) NOT NULL,
      `personas` float DEFAULT 0,
      `costo_dia` float DEFAULT 0,
      `dias` float DEFAULT 0,
      `subtotal` float DEFAULT 0,
      `orden` int(11) DEFAULT 0,
      PRIMARY KEY (`id`),
      KEY `proyecto_id` (`proyecto_id`),
      CONSTRAINT `imss_ibfk_1` FOREIGN KEY (`proyecto_id`) REFERENCES `proyectos` (`id`) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci""")

def _seed_insumos(pid):
    _ensure_insumos_tables()
    personas = ['INGENIERO','TECNICO','ELECTRICO','AYUDANTE GENERAL']
    for i, p in enumerate(personas):
        ex("INSERT INTO insumos_viaticos_cd (proyecto_id,persona,personas,viajes_cd,autobus,taxis,subtotal_mn,autocasetas,gasolina,subtotal_mn2,orden) VALUES (%s,%s,0,0,0,0,0,0,0,0,%s)",
           (pid, p, i+1))
        ex("INSERT INTO insumos_viaticos_en_cd (proyecto_id,persona,personas,dias,alimentos,hotel,transporte,subtotal_mn,renta_coche,meses,renta_casa,subtotal_mn2,orden) VALUES (%s,%s,0,0,0,0,0,0,0,0,0,0,%s)",
           (pid, p, i+1))
    transporte_items = ['CAMIONETA CARGA','ENVIO PAQUETERIA','IMSS','']
    for i, desc in enumerate(transporte_items):
        ex("INSERT INTO insumos_transporte (proyecto_id,descripcion,costo,no_veces,subtotal,orden) VALUES (%s,%s,0,0,0,%s)",
           (pid, desc, i+1))
    ex("INSERT INTO insumos_gastos_admin (proyecto_id,descripcion,costo,subtotal,orden) VALUES (%s,'',0,0,1)", (pid,))
    ex("INSERT INTO insumos_imss (proyecto_id,personas,costo_dia,dias,subtotal,orden) VALUES (%s,0,0,0,0,1)", (pid,))

@app.route("/api/insumos/update_row", methods=["POST"])
@login_required
def api_update_insumos_row():
    d = request.json or {}
    _ensure_insumos_tables()
    iid = d.get("id")
    tabla = d.get("tabla")
    field = d.get("field")
    val = d.get("val")
    
    table_name = ""
    if tabla in ['cd', 'viaticos_cd', 'insumos_viaticos_cd']: table_name = "insumos_viaticos_cd"
    elif tabla in ['en_cd', 'viaticos_en_cd', 'insumos_viaticos_en_cd']: table_name = "insumos_viaticos_en_cd"
    elif tabla in ['transporte', 'insumos_transporte']: table_name = "insumos_transporte"
    elif tabla in ['gastos_admin', 'insumos_gastos_admin']: table_name = "insumos_gastos_admin"
    elif tabla in ['imss', 'insumos_imss']: table_name = "insumos_imss"
    
    if not table_name: return jsonify(error="Invalid table"), 400
    
    row = q(f"SELECT * FROM {table_name} WHERE id=%s", (iid,), fetch="one")
    if not row: return jsonify(error="Not found"), 404
    
    pid = row["proyecto_id"]
    
    field_map = {'transporte': 'descripcion'}
    if (tabla in ['transporte', 'insumos_transporte']) and field in field_map:
        field = field_map[field]
    
    text_fields = ['persona', 'destino', 'descripcion']
    
    if field in row:
        if isinstance(val, str) and field not in text_fields:
            try: val = float(val) if val.strip() else 0.0
            except: val = 0.0
        row[field] = val
        ex(f"UPDATE {table_name} SET {field}=%s WHERE id=%s", (val, iid))
    
    if table_name == 'insumos_viaticos_cd':
        p = float(row.get("personas") or 0)
        v = float(row.get("viajes_cd") or 0)
        a = float(row.get("autobus") or 0)
        t = float(row.get("taxis") or 0)
        sub1 = p * v * (a + t)
        ra = float(row.get("renta_auto") or 0)
        ac = float(row.get("autocasetas") or 0)
        g = float(row.get("gasolina") or 0)
        dias = float(row.get("dias") or 0)
        sub2 = (ra + ac + g) * dias
        ex("UPDATE insumos_viaticos_cd SET subtotal_mn=%s, subtotal_mn2=%s WHERE id=%s", (sub1, sub2, iid))
    elif table_name == 'insumos_viaticos_en_cd':
        p = float(row.get("personas") or 0)
        di = float(row.get("dias") or 0)
        al = float(row.get("alimentos") or 0)
        h = float(row.get("hotel") or 0)
        tr = float(row.get("transporte") or 0)
        sub1 = p * di * (al + h + tr)
        rc = float(row.get("renta_coche") or 0)
        gas = float(row.get("gasolina") or 0)
        di_auto = float(row.get("dias_auto") or 0)
        m = float(row.get("meses") or 0)
        ca = float(row.get("renta_casa") or 0)
        sub2 = ((rc + gas) * di_auto) + (ca * m)
        ex("UPDATE insumos_viaticos_en_cd SET subtotal_mn=%s, subtotal_mn2=%s WHERE id=%s", (sub1, sub2, iid))
    elif table_name == 'insumos_transporte':
        c = float(row.get("costo") or 0)
        n = float(row.get("no_veces") or 0)
        ex("UPDATE insumos_transporte SET subtotal=%s WHERE id=%s", (c * n, iid))
    elif table_name == 'insumos_gastos_admin':
        c = float(row.get("costo") or 0)
        ex("UPDATE insumos_gastos_admin SET subtotal=%s WHERE id=%s", (c, iid))
    elif table_name == 'insumos_imss':
        p = float(row.get("personas") or 0)
        c = float(row.get("costo_dia") or 0)
        di = float(row.get("dias") or 0)
        ex("UPDATE insumos_imss SET subtotal=%s WHERE id=%s", (p * c * di, iid))
        
    _update_insumos_total(pid)
    row_updated = q(f"SELECT * FROM {table_name} WHERE id=%s", (iid,), fetch="one")
    return jsonify(ok=True, row=row_updated)

@app.route("/api/insumos/recalc", methods=["POST"])
@login_required
def api_recalc_insumos():
    pid = request.json.get("proyecto_id")
    if pid:
        _update_insumos_total(pid)
    return jsonify(ok=True)

@app.route("/api/insumos/add_row", methods=["POST"])
@login_required
def api_insumos_add_row():
    d = request.json or {}
    pid = d.get("proyecto_id")
    tabla = d.get("tabla")
    _ensure_insumos_tables()
    if tabla in ['cd', 'viaticos_cd', 'insumos_viaticos_cd']:
        n = q("SELECT COUNT(*) cnt FROM insumos_viaticos_cd WHERE proyecto_id=%s", (pid,), fetch="one")["cnt"]+1
        new_id = ex("INSERT INTO insumos_viaticos_cd (proyecto_id,persona,personas,viajes_cd,autobus,taxis,subtotal_mn,autocasetas,gasolina,subtotal_mn2,orden) VALUES (%s,'',0,0,0,0,0,0,0,0,%s)", (pid, n))
    elif tabla in ['en_cd', 'viaticos_en_cd', 'insumos_viaticos_en_cd']:
        n = q("SELECT COUNT(*) cnt FROM insumos_viaticos_en_cd WHERE proyecto_id=%s", (pid,), fetch="one")["cnt"]+1
        new_id = ex("INSERT INTO insumos_viaticos_en_cd (proyecto_id,persona,personas,dias,alimentos,hotel,transporte,subtotal_mn,renta_coche,meses,renta_casa,subtotal_mn2,orden) VALUES (%s,'',0,0,0,0,0,0,0,0,0,0,%s)", (pid, n))
    elif tabla in ['gastos_admin', 'insumos_gastos_admin']:
        n = q("SELECT COUNT(*) cnt FROM insumos_gastos_admin WHERE proyecto_id=%s", (pid,), fetch="one")["cnt"]+1
        new_id = ex("INSERT INTO insumos_gastos_admin (proyecto_id,descripcion,costo,subtotal,orden) VALUES (%s,'',0,0,%s)", (pid, n))
    elif tabla in ['imss', 'insumos_imss']:
        n = q("SELECT COUNT(*) cnt FROM insumos_imss WHERE proyecto_id=%s", (pid,), fetch="one")["cnt"]+1
        new_id = ex("INSERT INTO insumos_imss (proyecto_id,personas,costo_dia,dias,subtotal,orden) VALUES (%s,0,0,0,0,%s)", (pid, n))
    else:
        n = q("SELECT COUNT(*) cnt FROM insumos_transporte WHERE proyecto_id=%s", (pid,), fetch="one")["cnt"]+1
        new_id = ex("INSERT INTO insumos_transporte (proyecto_id,descripcion,costo,no_veces,subtotal,orden) VALUES (%s,'',0,0,0,%s)", (pid, n))
    return jsonify(id=new_id)

@app.route("/api/insumos/delete_row", methods=["POST"])
@login_required
def api_insumos_delete_row():
    d = request.json or {}
    iid = d.get("id")
    tabla = d.get("tabla")
    pid = d.get("proyecto_id")
    _ensure_insumos_tables()
    table_name = ""
    if tabla in ['cd', 'viaticos_cd', 'insumos_viaticos_cd']: table_name = "insumos_viaticos_cd"
    elif tabla in ['en_cd', 'viaticos_en_cd', 'insumos_viaticos_en_cd']: table_name = "insumos_viaticos_en_cd"
    elif tabla in ['gastos_admin', 'insumos_gastos_admin']: table_name = "insumos_gastos_admin"
    elif tabla in ['imss', 'insumos_imss']: table_name = "insumos_imss"
    elif tabla in ['transporte', 'insumos_transporte']: table_name = "insumos_transporte"
    
    if table_name and iid:
        ex(f"DELETE FROM {table_name} WHERE id=%s", (iid,))
        _update_insumos_total(pid)
    return jsonify(ok=True)

def _update_insumos_total(pid):
    if not pid: return
    _ensure_insumos_tables()
    # Delete obsolete IO / I/O sections from DB
    ex("DELETE FROM secciones WHERE proyecto_id=%s AND codigo IN ('IO', 'I/O')", (pid,))

    cd_rows = q("SELECT personas, viajes_cd, autobus, taxis, autocasetas, gasolina, renta_auto, dias FROM insumos_viaticos_cd WHERE proyecto_id=%s", (pid,))
    en_rows = q("SELECT personas, dias, alimentos, hotel, transporte, renta_coche, gasolina, dias_auto, meses, renta_casa FROM insumos_viaticos_en_cd WHERE proyecto_id=%s", (pid,))
    tr_rows = q("SELECT costo, no_veces FROM insumos_transporte WHERE proyecto_id=%s", (pid,))
    ga_rows = q("SELECT costo FROM insumos_gastos_admin WHERE proyecto_id=%s", (pid,))
    imss_rows = q("SELECT personas, costo_dia, dias FROM insumos_imss WHERE proyecto_id=%s", (pid,))
    
    # FACTORS
    lf = q("SELECT valor, factor FROM listas_predefinidas WHERE seccion_codigo='INSUMOS'")
    fm = {r["valor"]: float(r.get("factor") or 1.2) for r in lf}
    f_cd   = fm.get("FACTOR VIATICOS A CD", 1.2)
    f_af   = fm.get("FACTOR AUTO FORANEO", 1.2)
    f_en   = fm.get("FACTOR VIATICOS EN CD", 1.2)
    f_al   = fm.get("FACTOR AUTO LOCAL", 1.2)
    f_ho   = fm.get("FACTOR HOSPEDAJE", 1.2)
    f_tr   = fm.get("FACTOR TRANSPORTE", 1.2)
    f_ga   = fm.get("FACTOR GASTOS ADMIN", 1.2)
    f_imss = fm.get("FACTOR IMSS", 1.2)

    sum_cd1 = sum((float(r.get("personas") or 0) * float(r.get("viajes_cd") or 0) * (float(r.get("autobus") or 0) + float(r.get("taxis") or 0))) for r in cd_rows)
    sum_cd2 = sum(((float(r.get("renta_auto") or 0) + float(r.get("autocasetas") or 0) + float(r.get("gasolina") or 0)) * float(r.get("dias") or 0)) for r in cd_rows)
    
    sum_en1 = sum((float(r.get("personas") or 0) * float(r.get("dias") or 0) * (float(r.get("alimentos") or 0) + float(r.get("hotel") or 0) + float(r.get("transporte") or 0))) for r in en_rows)
    sum_auto = sum(((float(r.get("renta_coche") or 0) + float(r.get("gasolina") or 0)) * float(r.get("dias_auto") or 0)) for r in en_rows)
    sum_casa = sum((float(r.get("renta_casa") or 0) * float(r.get("meses") or 0)) for r in en_rows)

    sum_tr = sum((float(r.get("costo") or 0) * float(r.get("no_veces") or 0)) for r in tr_rows)
    sum_ga = sum(float(r.get("costo") or 0) for r in ga_rows)
    sum_imss = sum((float(r.get("personas") or 0) * float(r.get("costo_dia") or 0) * float(r.get("dias") or 0)) for r in imss_rows)

    total_insumos_mn = (sum_cd1 * f_cd) + (sum_cd2 * f_af) + (sum_en1 * f_en) + (sum_auto * f_al) + (sum_casa * f_ho) + (sum_tr * f_tr) + (sum_ga * f_ga) + (sum_imss * f_imss)
    
    p_info = q("SELECT tipo_cambio_usd FROM proyectos WHERE id=%s", (pid,), fetch="one")
    tc = float((p_info and p_info.get("tipo_cambio_usd")) or 20)
    total_insumos_usd = total_insumos_mn / (tc if tc > 0 else 20)

    sec = q("SELECT id FROM secciones WHERE proyecto_id=%s AND codigo='INSUMOS'", (pid,), fetch="one")
    if sec:
        ex("UPDATE secciones SET subtotal_mn=%s, subtotal_usd=%s WHERE id=%s", (total_insumos_mn, total_insumos_usd, sec["id"]))
        _recalc_totals(pid)

@app.route("/api/subtemas_prese")
@login_required
def api_subtemas():
    pid = request.args.get("proyecto_id")
    try:
        rows = q("SELECT * FROM subtemas_prese WHERE proyecto_id=%s ORDER BY orden", (pid,))
    except Exception:
        rows = []
    return jsonify(data=list(rows))

@app.route("/api/subtemas_prese/create", methods=["POST"])
@login_required
def api_create_subtema():
    d = request.json or {}
    pid = d.get("proyecto_id")
    n = q("SELECT COALESCE(MAX(orden),0)+1 as n FROM subtemas_prese WHERE proyecto_id=%s", (pid,), fetch="one")["n"]
    indice = d.get("indice", f"A{n}")
    new_id = ex("INSERT INTO subtemas_prese (proyecto_id,titulo,contenido,indice,orden) VALUES (%s,%s,%s,%s,%s)",
                (pid, d.get("titulo","Nuevo subtema"), d.get("contenido",""), indice, n))
    return jsonify(id=new_id, indice=indice)

@app.route("/api/subtemas_prese/update", methods=["POST"])
@login_required
def api_update_subtema():
    d = request.json or {}
    ex("UPDATE subtemas_prese SET titulo=%s,contenido=%s,indice=%s WHERE id=%s",
       (d.get("titulo"), d.get("contenido"), d.get("indice"), d.get("id")))
    return jsonify(ok=True)

@app.route("/api/subtemas_prese/delete", methods=["POST"])
@login_required
def api_delete_subtema():
    ex("DELETE FROM subtemas_prese WHERE id=%s", (request.json.get("id"),))
    return jsonify(ok=True)

@app.route("/api/listas/clave", methods=["GET","POST"])
@login_required
def api_listas_clave():
    if request.method == "GET":
        row = q("SELECT valor FROM configuracion WHERE clave='clave_listas'", fetch="one")
        return jsonify(existe=bool(row and row["valor"]))
    d = request.json or {}
    action = d.get("action", "verificar")
    if action == "crear":
        ex("INSERT INTO configuracion (clave,valor) VALUES ('clave_listas',%s) ON DUPLICATE KEY UPDATE valor=%s",
           (d.get("nueva_clave"), d.get("nueva_clave")))
        return jsonify(ok=True)
    elif action == "modificar":
        row = q("SELECT valor FROM configuracion WHERE clave='clave_listas'", fetch="one")
        if not row or row["valor"] != d.get("clave_actual"):
            return jsonify(error="Contraseña actual incorrecta"), 400
        ex("UPDATE configuracion SET valor=%s WHERE clave='clave_listas'", (d.get("nueva_clave"),))
        return jsonify(ok=True)
    else:
        row = q("SELECT valor FROM configuracion WHERE clave='clave_listas'", fetch="one")
        if not row or row["valor"] != d.get("clave"):
            return jsonify(error="Contraseña incorrecta"), 400
        return jsonify(ok=True)

@app.route("/api/proyectos/duplicar", methods=["POST"])
@login_required
def api_duplicar_proyecto():
    d = request.json or {}
    orig_id = d.get("id")
    orig = q("SELECT * FROM proyectos WHERE id=%s", (orig_id,), fetch="one")
    if not orig:
        return jsonify(error="Proyecto no encontrado"), 404
    num = f"DM-{date.today().year}-{random.randint(1000,9999)}"
    new_pid = ex("""INSERT INTO proyectos
        (numero_proyecto,nombre_proyecto,empresa_cliente,contacto_cliente,
         telefono_cliente,email_cliente,atencion,referencia,carpeta_link,
         fecha_creacion,usuario_id,tipo_cambio_usd,tipo_proyecto,tiempo_entrega,
         condiciones_pago,descripcion_solucion)
        VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)""",
        (num, f"COPIA - {orig.get('nombre_proyecto','')}", orig.get("empresa_cliente",""),
         orig.get("contacto_cliente",""), orig.get("telefono_cliente",""),
         orig.get("email_cliente",""), orig.get("atencion",""), orig.get("referencia",""),
         orig.get("carpeta_link",""), date.today().isoformat(), session["user_id"],
         orig.get("tipo_cambio_usd",20), orig.get("tipo_proyecto","completo"),
         orig.get("tiempo_entrega","8 DIAS HABILES"), orig.get("condiciones_pago","90 DIAS"),
         orig.get("descripcion_solucion","")))
    secciones = q("SELECT * FROM secciones WHERE proyecto_id=%s ORDER BY orden", (orig_id,))
    for s in secciones:
        new_sid = ex("INSERT INTO secciones (proyecto_id,codigo,titulo,tipo,orden,color,subtotal_mn,subtotal_usd) VALUES (%s,%s,%s,%s,%s,%s,%s,%s)",
                     (new_pid, s["codigo"], s["titulo"], s["tipo"], s["orden"], s["color"],
                      s.get("subtotal_mn",0), s.get("subtotal_usd",0)))
        if s["tipo"] == "mano_obra":
            partidas = q("SELECT * FROM partidas_mano_obra WHERE seccion_id=%s ORDER BY orden", (s["id"],))
            for p in partidas:
                ex("""INSERT INTO partidas_mano_obra (seccion_id,numero_partida,descripcion,horas_mo,
                      dias_trabajo,costo_hora_usd,porcentaje_mgn,subtotal,total_usd,total_mn,orden)
                      VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)""",
                   (new_sid, p["numero_partida"], p.get("descripcion",""),
                    p.get("horas_mo",0), p.get("dias_trabajo",0), p.get("costo_hora_usd",0),
                    p.get("porcentaje_mgn",0), p.get("subtotal",0), p.get("total_usd",0),
                    p.get("total_mn",0), p.get("orden",0)))
        else:
            partidas = q("SELECT * FROM partidas_equipo WHERE seccion_id=%s ORDER BY orden", (s["id"],))
            for p in partidas:
                ex("""INSERT INTO partidas_equipo (seccion_id,numero_partida,descripcion,marca,modelo,
                      cantidad,precio_lista,moneda,porcentaje_mgn,subtotal,total_mn,total_usd,orden)
                      VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)""",
                   (new_sid, p["numero_partida"], p.get("descripcion",""), p.get("marca",""),
                    p.get("modelo",""), p.get("cantidad",1), p.get("precio_lista",0),
                    p.get("moneda","MN"), p.get("porcentaje_mgn",0), p.get("subtotal",0),
                    p.get("total_mn",0), p.get("total_usd",0), p.get("orden",0)))
    conds = q("SELECT * FROM condiciones_comerciales WHERE proyecto_id=%s ORDER BY orden", (orig_id,))
    for c in conds:
        ex("INSERT INTO condiciones_comerciales (proyecto_id,codigo,contenido,orden) VALUES (%s,%s,%s,%s)",
           (new_pid, c["codigo"], c["contenido"], c["orden"]))
    subtemas = q("SELECT * FROM subtemas_prese WHERE proyecto_id=%s ORDER BY orden", (orig_id,))
    for st in subtemas:
        ex("INSERT INTO subtemas_prese (proyecto_id,titulo,contenido,indice,orden) VALUES (%s,%s,%s,%s,%s)",
           (new_pid, st["titulo"], st.get("contenido",""), st["indice"], st["orden"]))
    _recalc_totals(new_pid)
    return jsonify(id=new_pid, numero=num)

@app.route("/api/stats/anual")
@login_required
def api_stats_anual():
    year = request.args.get("year", date.today().year)
    mensual = q("""SELECT MONTH(fecha_creacion) mes, COUNT(*) total,
                   COALESCE(SUM(total_mn),0) monto_mn, COALESCE(SUM(total_usd),0) monto_usd
                   FROM proyectos WHERE YEAR(fecha_creacion)=%s
                   GROUP BY MONTH(fecha_creacion) ORDER BY mes""", (year,))
    anios = q("SELECT DISTINCT YEAR(fecha_creacion) anio FROM proyectos ORDER BY anio DESC")
    return jsonify(mensual=list(mensual), anios=[r["anio"] for r in anios])

@app.route("/api/proyectos/create_mecanico", methods=["POST"])
@login_required
def api_crear_mecanico():
    d = request.json or {}
    nombre = (d.get("nombre_proyecto") or "").strip()
    if not nombre:
        return jsonify(error="Nombre requerido"), 400
    num = (d.get("numero_proyecto") or "").strip()
    if not num:
        return jsonify(error="Número de proyecto requerido"), 400
    existing = q("SELECT id FROM proyectos WHERE numero_proyecto=%s", (num,), fetch="one")
    if existing:
        return jsonify(error="El número de proyecto ya existe"), 400
    pid = ex("""INSERT INTO proyectos
        (numero_proyecto,nombre_proyecto,empresa_cliente,contacto_cliente,
         telefono_cliente,email_cliente,atencion,referencia,carpeta_link,
         fecha_creacion,usuario_id,tipo_proyecto,tiempo_entrega,condiciones_pago)
        VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,'mecanico',%s,%s)""",
        (num, nombre, d.get("empresa_cliente",""), d.get("contacto_cliente",""),
         d.get("telefono_cliente",""), d.get("email_cliente",""),
         d.get("atencion",""), d.get("referencia",""), d.get("carpeta_link",""),
         date.today().isoformat(), session["user_id"],
         d.get("tiempo_entrega","8 DIAS HABILES"), d.get("condiciones_pago","90 DIAS")))
    secciones_mec = [
        ("PRESE","PRESENTACIÓN","mano_obra",1,"#64748b"),
        ("REPORTE","REPORTE GENERAL","mano_obra",2,"#16a34a"),
        ("E_MECANICO","EQUIPO MECÁNICO","equipo",3,"#ea580c"),
        ("T_ELECTRICO","TABLERO ELÉCTRICO","equipo",4,"#6366f1"),
        ("INSUMOS","INSUMOS","equipo",5,"#dc2626"),
        ("LISTAS","LISTAS","equipo",6,"#7c3aed"),
        ("CONDICIONES","CONDICIONES COMERCIALES","mano_obra",7,"#475569"),
    ]
    for code,title,tipo,orden,color in secciones_mec:
        ex("INSERT INTO secciones (proyecto_id,codigo,titulo,tipo,orden,color) VALUES (%s,%s,%s,%s,%s,%s)",
           (pid,code,title,tipo,orden,color))
    conds = [
        ("C1","Precios expresados en Moneda Nacional con IVA incluido.",1),
        ("C2","Tiempo de entrega según especificaciones del proyecto.",2),
        ("C3","Anticipo del 50% para iniciar trabajos.",3),
        ("C4","Garantía de 12 meses en equipos instalados.",4),
        ("C5","Cotización válida por 30 días naturales.",5),
    ]
    for code,cont,orden in conds:
        ex("INSERT INTO condiciones_comerciales (proyecto_id,codigo,contenido,orden) VALUES (%s,%s,%s,%s)",
           (pid,code,cont,orden))
    return jsonify(id=pid, numero=num)

@app.route("/api/proyectos/create_cotizacion", methods=["POST"])
@login_required
def api_crear_cotizacion():
    d = request.json or {}
    nombre = (d.get("nombre_proyecto") or "").strip()
    if not nombre:
        return jsonify(error="Nombre requerido"), 400
    num = (d.get("numero_proyecto") or "").strip()
    if not num:
        return jsonify(error="Número de proyecto requerido"), 400
    existing = q("SELECT id FROM proyectos WHERE numero_proyecto=%s", (num,), fetch="one")
    if existing:
        return jsonify(error="El número de proyecto ya existe"), 400
    pid = ex("""INSERT INTO proyectos
        (numero_proyecto,nombre_proyecto,empresa_cliente,contacto_cliente,
         telefono_cliente,email_cliente,atencion,referencia,carpeta_link,
         fecha_creacion,usuario_id,tipo_proyecto,tiempo_entrega,condiciones_pago)
        VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,'cotizacion',%s,%s)""",
        (num, nombre, d.get("empresa_cliente",""), d.get("contacto_cliente",""),
         d.get("telefono_cliente",""), d.get("email_cliente",""),
         d.get("atencion",""), d.get("referencia",""), d.get("carpeta_link",""),
         date.today().isoformat(), session["user_id"],
         d.get("tiempo_entrega","8 DIAS HABILES"), d.get("condiciones_pago","90 DIAS")))
    secciones_cot = [
        ("PRESE","PRESENTACIÓN","mano_obra",1,"#64748b"),
        ("REPORTE","REPORTE GENERAL","mano_obra",2,"#16a34a"),
        ("ING_MO","ING. MANO DE OBRA","mano_obra",3,"#2563eb"),
        ("E_CONTROL","EQUIPO DE CONTROL","equipo",4,"#0d47a1"),
        ("E_ELECTRICO","EQUIPO ELÉCTRICO","equipo",5,"#0284c7"),
        ("INSUMOS","INSUMOS","equipo",6,"#dc2626"),
        ("CONDICIONES","CONDICIONES COMERCIALES","mano_obra",7,"#475569"),
    ]
    for code,title,tipo,orden,color in secciones_cot:
        ex("INSERT INTO secciones (proyecto_id,codigo,titulo,tipo,orden,color) VALUES (%s,%s,%s,%s,%s,%s)",
           (pid,code,title,tipo,orden,color))
    conds = [
        ("C1","Precios expresados en Moneda Nacional con IVA incluido.",1),
        ("C2","Tiempo de entrega según especificaciones del proyecto.",2),
        ("C3","Anticipo del 50% para iniciar trabajos.",3),
        ("C4","Garantía de 12 meses en equipos instalados.",4),
        ("C5","Cotización válida por 30 días naturales.",5),
    ]
    for code,cont,orden in conds:
        ex("INSERT INTO condiciones_comerciales (proyecto_id,codigo,contenido,orden) VALUES (%s,%s,%s,%s)",
           (pid,code,cont,orden))
    return jsonify(id=pid, numero=num)

def _serialize(row):
    if not row:
        return row
    out = {}
    for k, v in row.items():
        if isinstance(v, (date, datetime)):
            out[k] = str(v)
        else:
            out[k] = v
    return out

def _recalc_section(sid, tipo, tc=20):
    if tipo == "mano_obra":
        rows = q("SELECT total_mn,total_usd FROM partidas_mano_obra WHERE seccion_id=%s",(sid,))
    else:
        rows = q("SELECT total_mn,total_usd FROM partidas_equipo WHERE seccion_id=%s",(sid,))
    tmn  = sum(float(r.get("total_mn") or 0) for r in rows)
    tusd = sum(float(r.get("total_usd") or 0) for r in rows)
    ex("UPDATE secciones SET subtotal_mn=%s,subtotal_usd=%s WHERE id=%s",(tmn,tusd,sid))

def recalc_project_currency_conversions(pid, tc=None):
    if not pid:
        return
    if tc is None:
        p = q("SELECT tipo_cambio_usd FROM proyectos WHERE id=%s", (pid,), fetch="one")
        tc = float(p.get("tipo_cambio_usd") or 20) if p else 20.0
    tc = float(tc) if tc and float(tc) > 0 else 20.0

    mo_partidas = q("""SELECT p.id, p.horas_mo, p.dias_trabajo, p.costo_hora_usd, p.porcentaje_mgn
                       FROM partidas_mano_obra p
                       JOIN secciones s ON p.seccion_id = s.id
                       WHERE s.proyecto_id=%s""", (pid,))
    for r in mo_partidas:
        h = float(r.get("horas_mo") or 0)
        di = float(r.get("dias_trabajo") or 0)
        c = float(r.get("costo_hora_usd") or 0)
        m = float(r.get("porcentaje_mgn") or 0)
        sub = h * di * c
        t_usd = sub * (1 + m / 100.0)
        t_mn = t_usd * tc
        ex("UPDATE partidas_mano_obra SET subtotal=%s, total_usd=%s, total_mn=%s WHERE id=%s", (sub, t_usd, t_mn, r["id"]))

    eq_partidas = q("""SELECT p.id, p.cantidad, p.precio_lista, p.moneda, p.porcentaje_mgn
                       FROM partidas_equipo p
                       JOIN secciones s ON p.seccion_id = s.id
                       WHERE s.proyecto_id=%s""", (pid,))
    for r in eq_partidas:
        qty = float(r.get("cantidad") or 0)
        precio = float(r.get("precio_lista") or 0)
        m = float(r.get("porcentaje_mgn") or 0)
        moneda = r.get("moneda") or "MN"
        sub = qty * precio
        if moneda == "USD":
            t_usd = sub * (1 + m / 100.0)
            t_mn = t_usd * tc
        else:
            t_mn = sub * (1 + m / 100.0)
            t_usd = t_mn / tc if tc else 0
        ex("UPDATE partidas_equipo SET subtotal=%s, total_mn=%s, total_usd=%s WHERE id=%s", (sub, t_mn, t_usd, r["id"]))

    secciones = q("SELECT id, tipo, codigo FROM secciones WHERE proyecto_id=%s", (pid,))
    for s in secciones:
        if s["codigo"] == "INSUMOS":
            continue
        if s["tipo"] == "mano_obra":
            rows = q("SELECT total_mn, total_usd FROM partidas_mano_obra WHERE seccion_id=%s", (s["id"],))
        else:
            rows = q("SELECT total_mn, total_usd FROM partidas_equipo WHERE seccion_id=%s", (s["id"],))
        tmn = sum(float(r.get("total_mn") or 0) for r in rows)
        tusd = sum(float(r.get("total_usd") or 0) for r in rows)
        ex("UPDATE secciones SET subtotal_mn=%s, subtotal_usd=%s WHERE id=%s", (tmn, tusd, s["id"]))

    _update_insumos_total(pid)
    _recalc_totals(pid)

def _recalc_totals(pid):
    rows = q("SELECT subtotal_mn,subtotal_usd FROM secciones WHERE proyecto_id=%s",(pid,))
    tmn  = sum(float(r.get("subtotal_mn") or 0) for r in rows)
    tusd = sum(float(r.get("subtotal_usd") or 0) for r in rows)
    ex("UPDATE proyectos SET total_mn=%s,total_usd=%s WHERE id=%s",(tmn,tusd,pid))

def _build_pdf(proyecto, secciones, condiciones, moneda="MN", subtemas=None):
    from fpdf import FPDF
    from utils.numero_a_letras import numero_a_letras
    import os

    # Load partidas for all sections
    for s in secciones:
        if s["tipo"] == "mano_obra":
            s["partidas"] = q("SELECT * FROM partidas_mano_obra WHERE seccion_id=%s ORDER BY orden, id", (s["id"],))
        else:
            s["partidas"] = q("SELECT * FROM partidas_equipo WHERE seccion_id=%s ORDER BY orden, id", (s["id"],))

    pdf = FPDF()
    pdf.set_auto_page_break(auto=True, margin=15)

    tipo_proy = proyecto.get("tipo_proyecto", "")
    if tipo_proy == "cotizacion":
        return _build_pdf_cotizacion_simple(proyecto, secciones, condiciones, moneda, pdf)

    BLUE = (30, 58, 138)  # #1e3a8a
    DARK = (15, 23, 42)
    GRAY = (100, 116, 139)
    LIGHT_GRAY = (241, 245, 249)

    if True:  # Apply premium proposal cover page layout to all PDFs
        # PAGE 1: COVER PAGE / PRESENTATION
        pdf.add_page()
        
        # Draw Logo
        logo_path = os.path.join("static", "img", "logo.png")
        if os.path.exists(logo_path):
            pdf.image(logo_path, x=12, y=8, h=25)
            
        # Draw Slogans next to logo
        pdf.set_text_color(*GRAY)
        pdf.set_font("Helvetica", "", 7.5)
        slogans_row = q("SELECT valor FROM configuracion WHERE clave='slogans'", fetch="one")
        if slogans_row and slogans_row.get("valor"):
            slogans = slogans_row["valor"].split("\n")
        else:
            slogans = [
                "Integracion de sistemas Automatizados",
                "Programacion de PLC, HMI",
                "Servicio de Diseño y Armado Tableros",
                "Polizas de Mantenimiento"
            ]
        y_slog = 8
        for sl in slogans:
            pdf.set_xy(70, y_slog)
            pdf.cell(0, 4, sl)
            y_slog += 4

        # Draw Salesperson & Quote Info on right
        vendedor = q("SELECT valor FROM configuracion WHERE clave='vendedor'", fetch="one")
        vendedor = vendedor.get("valor") if vendedor else "Jose Moreno Rangel"
        
        pdf.set_text_color(*DARK)
        pdf.set_font("Helvetica", "", 9)
        pdf.set_xy(130, 8)
        pdf.cell(68, 5, f"Ventas: {vendedor}", align="R")
        
        # COTIZACION Banner
        pdf.set_fill_color(*BLUE)
        pdf.rect(130, 14, 68, 8, "F")
        pdf.set_xy(130, 14)
        pdf.set_font("Helvetica", "B", 10)
        pdf.cell(68, 8, "COTIZACION", align="C")
        
        y_pos = 35
        # Column 1
        pdf.set_xy(12, y_pos)
        pdf.set_font("Helvetica", "B", 9)
        pdf.cell(20, 5, "Empresa:")
        pdf.set_font("Helvetica", "", 9)
        pdf.cell(80, 5, str(proyecto.get("empresa_cliente") or "---"))

        pdf.set_xy(12, y_pos+5)
        pdf.set_font("Helvetica", "B", 9)
        pdf.cell(20, 5, "Atención:")
        pdf.set_font("Helvetica", "", 9)
        pdf.cell(80, 5, str(proyecto.get("atencion") or "---"))

        pdf.set_xy(12, y_pos+10)
        pdf.set_font("Helvetica", "B", 9)
        pdf.cell(20, 5, "E-mail:")
        pdf.set_font("Helvetica", "", 9)
        pdf.cell(80, 5, str(proyecto.get("email_cliente") or "---"))

        pdf.set_xy(12, y_pos+15)
        pdf.set_font("Helvetica", "B", 9)
        pdf.cell(20, 5, "TEL:")
        pdf.set_font("Helvetica", "", 9)
        pdf.cell(30, 5, str(proyecto.get("telefono_cliente") or "---"))

        pdf.set_font("Helvetica", "B", 9)
        pdf.cell(18, 5, "Proyecto:")
        pdf.set_font("Helvetica", "", 9)
        pdf.cell(50, 5, str(proyecto.get("nombre_proyecto") or "---"))

        # Column 2
        pdf.set_xy(135, y_pos)
        pdf.set_font("Helvetica", "B", 9)
        pdf.cell(30, 5, "COTIZACIÓN No.")
        pdf.set_font("Helvetica", "", 9)
        pdf.cell(33, 5, str(proyecto.get("numero_proyecto") or "---"), align="R")

        pdf.set_xy(135, y_pos+5)
        pdf.set_font("Helvetica", "B", 9)
        pdf.cell(30, 5, "FECHA")
        pdf.set_font("Helvetica", "", 9)
        fecha_c = str(proyecto.get("fecha_creacion") or "---")[:10]
        pdf.cell(33, 5, fecha_c, align="R")

        pdf.set_xy(135, y_pos+10)
        pdf.set_font("Helvetica", "B", 9)
        pdf.cell(30, 5, "VENCIMIENTO")
        pdf.set_font("Helvetica", "", 9)
        
        venc = "---"
        if fecha_c != "---":
            dias = int(proyecto.get("dias_vigencia") or 15)
            import datetime
            try:
                dt = datetime.datetime.strptime(fecha_c, "%Y-%m-%d")
                dt = dt + datetime.timedelta(days=dias)
                venc = dt.strftime("%Y-%m-%d")
            except:
                pass
        pdf.cell(33, 5, venc, align="R")

        # Separator line
        pdf.set_draw_color(*BLUE)
        pdf.set_line_width(0.5)
        pdf.line(12, 63, 198, 63)
        
        # Su Referencia
        pdf.set_xy(12, 66)
        pdf.set_font("Helvetica", "B", 10)
        pdf.cell(28, 6, "Su Referencia:")
        pdf.set_font("Helvetica", "", 10)
        pdf.multi_cell(0, 6, str(proyecto.get("referencia") or "---"))
        pdf.ln(2)
        
        # Description of the solution
        pdf.set_x(12)
        pdf.set_font("Helvetica", "B", 10)
        pdf.cell(0, 6, "DESCRIPCION DE LA SOLUCION.", ln=True)
        pdf.set_font("Helvetica", "", 9.5)
        pdf.multi_cell(0, 5.5, str(proyecto.get("descripcion_solucion") or "De acuerdo a la información proporcionada se realiza la siguiente propuesta:"))
        pdf.ln(4)
        
        # Subthemes
        if subtemas:
            for st in subtemas:
                # Subtheme Header Banner
                pdf.set_fill_color(226, 232, 240)  # Light grey background
                pdf.set_text_color(*BLUE)
                pdf.set_font("Helvetica", "B", 9.5)
                # Draw filled cell for header
                pdf.cell(0, 7, f"  {st.get('indice')} {st.get('titulo')}".upper(), ln=True, fill=True)
                pdf.ln(1)
                
                # Render points of the subtheme
                pdf.set_text_color(*DARK)
                pdf.set_font("Helvetica", "", 9)
                
                raw_lines = st.get("contenido", "").split("\n")
                points = [ln for ln in raw_lines if ln.strip()]
                for idx, line in enumerate(points):
                    point_label = f"{st.get('indice')}.{idx + 1}"
                    
                    # Remove duplicate prefix if user typed it
                    line_clean = line.strip()
                    if line_clean.startswith(point_label):
                        line_clean = line_clean[len(point_label):].strip()
                        
                    current_y = pdf.get_y()
                    pdf.set_font("Helvetica", "B", 9)
                    pdf.set_x(10)
                    pdf.cell(16, 5, point_label)
                    
                    pdf.set_font("Helvetica", "", 9)
                    pdf.set_xy(26, current_y)
                    pdf.multi_cell(0, 5, line_clean)
                    pdf.ln(2)
                pdf.ln(1)

        # Calculate totals from sections/partidas
        subtotal_mn = 0
        subtotal_usd = 0
        for sec in secciones:
            if sec["codigo"] in ("PRESE", "REPORTE", "CONDICIONES", "LISTAS"):
                continue
            partidas = sec.get("partidas", [])
            for p in partidas:
                subtotal_mn += float(p.get("total_mn") or 0)
                subtotal_usd += float(p.get("total_usd") or 0)

        # Economical totals
        pct_iva = float(proyecto.get("porcentaje_iva") if proyecto.get("porcentaje_iva") is not None else 16.00)
        
        iva_usd = subtotal_usd * (pct_iva / 100.0)
        total_usd = subtotal_usd + iva_usd
        
        iva_mn = subtotal_mn * (pct_iva / 100.0)
        total_mn = subtotal_mn + iva_mn
        
        pdf.ln(4)
        pdf.set_font("Helvetica", "B", 9)
        pdf.cell(140, 6, "SUB TOTAL:", align="R")
        pdf.set_font("Helvetica", "", 9)
        if moneda == "USD":
            pdf.cell(46, 6, f"$ {subtotal_usd:,.2f} USD", align="R", ln=True)
        else:
            pdf.cell(46, 6, f"$ {subtotal_mn:,.2f} M.N.", align="R", ln=True)
        
        # IVA
        pdf.set_font("Helvetica", "B", 9)
        pdf.cell(140, 6, f"IVA ({pct_iva:g}%):", align="R")
        pdf.set_font("Helvetica", "", 9)
        if moneda == "USD":
            pdf.cell(46, 6, f"$ {iva_usd:,.2f} USD", align="R", ln=True)
        else:
            pdf.cell(46, 6, f"$ {iva_mn:,.2f} M.N.", align="R", ln=True)
        
        # Price Total plus IVA label
        pdf.ln(2)
        pdf.set_font("Helvetica", "B", 9.5)
        pdf.set_text_color(*DARK)
        pdf.cell(0, 5, "Precio Total más IVA.", align="R", ln=True)
        pdf.ln(1)
        
        # TOTAL Banner
        pdf.set_fill_color(0, 188, 212)  # Cyan #00bcd4
        pdf.set_text_color(255, 255, 255)
        pdf.set_font("Helvetica", "B", 10)
        
        if moneda == "USD":
            pdf.cell(140, 8, "  TOTAL USD", border=0, fill=True, align="L")
            pdf.cell(46, 8, f"$ {total_usd:,.2f} USD", border=0, fill=True, align="R", ln=True)
            pdf.ln(1)
            pdf.cell(140, 8, "  TOTAL M.N.", border=0, fill=True, align="L")
            pdf.cell(46, 8, f"$ {total_mn:,.2f} M.N.", border=0, fill=True, align="R", ln=True)
            letras = numero_a_letras(total_usd)
            letras = letras.replace("PESOS", "DÓLARES").replace("M.N.", "USD")
            letras_mn = numero_a_letras(total_mn)
            letras_final = f"SON: ({letras.upper()})\nSON: ({letras_mn.upper()})"
        else:
            pdf.cell(140, 8, "  TOTAL", border=1, fill=True, align="L")
            pdf.cell(46, 8, f"$ {total_mn:,.2f} M.N.", border=1, fill=True, align="R", ln=True)
            letras = numero_a_letras(total_mn)
            letras_final = f"SON: ({letras.upper()})"
            
        # Words total
        pdf.ln(2)
        pdf.set_text_color(*DARK)
        pdf.set_font("Helvetica", "B", 10)
        try:
            pdf.multi_cell(0, 5, letras_final, align="L")
        except Exception:
            pass
            
        pdf.set_text_color(*DARK)
        pdf.ln(5)
        
        # Commercial Conditions
        if condiciones:
            # Calculate next index based on subtemas count
            subtemas_list = list(subtemas or [])
            next_idx = len(subtemas_list) + 1
            cond_prefix = f"A{next_idx}"
            
            # Load section title from configuration
            tit_row = q("SELECT valor FROM configuracion WHERE clave='condiciones_seccion_titulo'", fetch="one")
            tit_val = tit_row["valor"] if tit_row and tit_row.get("valor") else "CONDICIONES COMERCIALES"
            
            # Banner
            pdf.set_fill_color(226, 232, 240)
            pdf.set_text_color(*BLUE)
            pdf.set_font("Helvetica", "B", 9.5)
            pdf.cell(0, 7, f"  {cond_prefix} - {tit_val.upper()}", ln=True, fill=True)
            pdf.ln(1)
            
            pdf.set_text_color(*DARK)
            for idx, c in enumerate(condiciones):
                pdf.set_font("Helvetica", "B", 9)
                pdf.cell(15, 5, f"{cond_prefix}.{idx + 1}", ln=False)
                pdf.set_font("Helvetica", "", 9)
                pdf.multi_cell(0, 5, c.get("contenido", ""))
                pdf.ln(1)
                
        return pdf

    else:
        # ----------------------------------------------------
        # ORIGINAL STANDARD PROJECT LAYOUT
        # ----------------------------------------------------
        pdf.add_page()
        logo_path = os.path.join("static", "img", "logo.png")
        if os.path.exists(logo_path):
            pdf.image(logo_path, x=12, y=8, h=16)
        else:
            pdf.set_text_color(*BLUE)
            pdf.set_font("Helvetica","B",20)
            pdf.set_xy(12,8)
            pdf.cell(0,8,"DEMATIQ AUTOMATIZACIÓN")
            pdf.set_font("Helvetica","",9)
            pdf.set_xy(12,20)
            pdf.cell(0,5,"Sistema de Cotizaciones Profesional")
        pdf.set_text_color(*DARK)
        pdf.set_font("Helvetica","B",12)
        pdf.set_xy(130,8)
        pdf.cell(0,6,f"COT. No. {proyecto.get('numero_proyecto','---')}", align="R")
        pdf.set_font("Helvetica","",9)
        pdf.set_xy(130,15)
        pdf.cell(0,5,f"Fecha: {str(proyecto.get('fecha_creacion',''))[:10]}", align="R")
        pdf.set_fill_color(37, 99, 235)
        pdf.rect(0, 28, 210, 2, "F")
        pdf.set_xy(0,45)
        def sec_title(t):
            pdf.set_fill_color(37, 99, 235)
            pdf.set_text_color(255,255,255)
            pdf.set_font("Helvetica","B",10)
            pdf.cell(0,8,f"  {t}",ln=True,fill=True)
            pdf.set_text_color(*DARK)
            pdf.ln(2)
        def info(lbl,val):
            pdf.set_x(12)
            pdf.set_font("Helvetica","B",9)
            pdf.set_text_color(*GRAY)
            pdf.cell(45,6,lbl.upper()+":",ln=False)
            pdf.set_font("Helvetica","",9)
            pdf.set_text_color(*DARK)
            pdf.multi_cell(0,6,str(val or "---"))
        sec_title("INFORMACIÓN DEL CLIENTE")
        info("Empresa",proyecto.get("empresa_cliente"))
        info("Atención",proyecto.get("atencion"))
        info("Teléfono",proyecto.get("telefono_cliente"))
        info("Email",proyecto.get("email_cliente"))
        info("Referencia",proyecto.get("referencia"))
        pdf.ln(4)
        sec_title("RESUMEN DE COTIZACIÓN")
        cw=[80,55,55]
        pdf.set_fill_color(239,246,255)
        pdf.set_font("Helvetica","B",9)
        for i,(h,w) in enumerate(zip(["SECCIÓN","TOTAL MN","TOTAL USD"],cw)):
            pdf.cell(w,7,h,border=1,fill=True,align="R" if i>0 else "L")
        pdf.ln()
        tmn_total=tusd_total=0
        alt=False
        for s in secciones:
            if s["codigo"] in("PRESE","REPORTE","CONDICIONES"):
                continue
            mn=float(s.get("subtotal_mn") or 0)
            usd=float(s.get("subtotal_usd") or 0)
            tmn_total+=mn; tusd_total+=usd
            pdf.set_fill_color(248,250,252) if alt else pdf.set_fill_color(255,255,255)
            pdf.set_font("Helvetica","",9)
            pdf.cell(cw[0],6,s.get("titulo","---"),border=1,fill=True)
            pdf.cell(cw[1],6,f"$ {mn:,.2f}",border=1,fill=True,align="R")
            pdf.cell(cw[2],6,f"$ {usd:,.2f}",border=1,fill=True,align="R")
            pdf.ln(); alt=not alt
        pdf.set_fill_color(37, 99, 235); pdf.set_text_color(255,255,255)
        pdf.set_font("Helvetica","B",9)
        pdf.cell(cw[0],7,"TOTAL GENERAL",border=1,fill=True)
        pdf.cell(cw[1],7,f"$ {tmn_total:,.2f}",border=1,fill=True,align="R")
        pdf.cell(cw[2],7,f"$ {tusd_total:,.2f}",border=1,fill=True,align="R")
        pdf.ln(); pdf.set_text_color(*DARK); pdf.ln(4)
        if moneda == "USD":
            sub_val = Re_val = tusd_total
            label_cur = "USD"
            suffix = "USD"
        else:
            sub_val = Re_val = tmn_total
            label_cur = "MN"
            suffix = "M.N."
        porcentaje_iva = float(proyecto.get("porcentaje_iva") if proyecto.get("porcentaje_iva") is not None else 16.00)
        iva = sub_val * (porcentaje_iva / 100.0)
        total_final = sub_val + iva
        pdf.set_font("Helvetica","",9)
        pdf.cell(80,6,f"Subtotal {label_cur}:",border=1); pdf.cell(0,6,f"$ {sub_val:,.2f}",border=1,align="R",ln=True)
        pdf.cell(80,6,f"IVA ({porcentaje_iva:g}%):",border=1);   pdf.cell(0,6,f"$ {iva:,.2f}",border=1,align="R",ln=True)
        pdf.set_fill_color(37, 99, 235); pdf.set_text_color(255,255,255)
        pdf.set_font("Helvetica","B",10)
        pdf.cell(80,8,"TOTAL CON IVA:",border=1,fill=True)
        pdf.cell(0,8,f"$ {total_final:,.2f} {suffix}",border=1,fill=True,align="R",ln=True)
        pdf.set_text_color(*GRAY); pdf.set_font("Helvetica","I",8)
        try:
            letras = numero_a_letras(total_final)
            if moneda == "USD":
                letras = letras.replace("PESOS", "DÓLARES").replace("M.N.", "USD")
            pdf.ln(3); pdf.multi_cell(0,4,f"SON: {letras}")
        except Exception:
            pass
        pdf.set_text_color(*DARK); pdf.ln(6)
        if condiciones:
            sec_title("CONDICIONES COMERCIALES")
            for c in condiciones:
                pdf.set_font("Helvetica","B",9); pdf.cell(20,5,c.get("codigo",""),ln=False)
                pdf.set_font("Helvetica","",9);  pdf.multi_cell(0,5,c.get("contenido",""))
                pdf.ln(1)
        return pdf

@app.route("/api/configuracion/update", methods=["POST"])
@login_required
def api_update_configuracion():
    d = request.json or {}
    for k, v in d.items():
        ex("INSERT INTO configuracion (clave, valor) VALUES (%s, %s) ON DUPLICATE KEY UPDATE valor=%s", (k, str(v), str(v)))
    return jsonify(success=True)

if __name__ == "__main__":
    import webbrowser, threading
    def _open():
        import time; time.sleep(1.2)
        webbrowser.open("http://localhost:5000")
    threading.Thread(target=_open, daemon=True).start()
    app.run(debug=False, port=5000)


def _build_pdf_cotizacion_simple(proyecto, secciones, condiciones, moneda, pdf):
    from utils.numero_a_letras import numero_a_letras
    import datetime

    # Colores
    BLUE = (30, 58, 138)
    DARK = (15, 23, 42)
    GRAY = (100, 116, 139)

    pdf.add_page()
    
    # Header Derecha
    vendedor = proyecto.get("vendedor_config", {}).get("vendedor", "Jose Moreno Rangel")
    
    pdf.set_text_color(*BLUE)
    pdf.set_font("Helvetica", "", 10)
    pdf.set_xy(130, 10)
    pdf.cell(70, 5, f"Ventas: {vendedor}", align="R")
    
    pdf.set_fill_color(*BLUE)
    pdf.set_text_color(255, 255, 255)
    pdf.set_xy(130, 16)
    pdf.set_font("Helvetica", "B", 11)
    pdf.cell(70, 7, "COTIZACION", align="C", fill=True)
    
    pdf.set_text_color(*DARK)
    pdf.set_font("Helvetica", "B", 10)
    pdf.set_xy(130, 24)
    pdf.cell(35, 5, "COTIZACION No.")
    pdf.set_font("Helvetica", "B", 10)
    pdf.cell(35, 5, str(proyecto.get("numero_proyecto") or "---"), align="R")
    
    pdf.set_xy(130, 29)
    pdf.set_font("Helvetica", "B", 10)
    pdf.cell(35, 5, "FECHA")
    pdf.set_font("Helvetica", "", 10)
    fecha_c = str(proyecto.get("fecha_creacion") or "---")[:10]
    pdf.cell(35, 5, fecha_c, align="R")
    
    pdf.set_xy(130, 34)
    pdf.set_font("Helvetica", "B", 10)
    pdf.cell(35, 5, "VENCIMIENTO")
    pdf.set_font("Helvetica", "", 10)
    venc = "---"
    if fecha_c != "---":
        dias = int(proyecto.get("dias_vigencia") or 30)
        try:
            dt = datetime.datetime.strptime(fecha_c, "%Y-%m-%d")
            dt = dt + datetime.timedelta(days=dias)
            venc = dt.strftime("%Y-%m-%d")
        except:
            pass
    pdf.cell(35, 5, venc, align="R")
    
    # Header Izquierda
    pdf.set_xy(10, 24)
    pdf.set_font("Helvetica", "B", 9)
    pdf.cell(18, 5, "Atencion:")
    pdf.set_font("Helvetica", "", 9)
    pdf.cell(90, 5, str(proyecto.get("atencion") or "---"))
    
    pdf.set_xy(10, 29)
    pdf.set_font("Helvetica", "B", 9)
    pdf.cell(10, 5, "TEL:")
    pdf.set_font("Helvetica", "", 9)
    pdf.cell(45, 5, str(proyecto.get("telefono_cliente") or "---"))
    
    pdf.set_font("Helvetica", "B", 9)
    pdf.cell(16, 5, "Empresa:")
    pdf.set_font("Helvetica", "", 9)
    pdf.cell(45, 5, str(proyecto.get("empresa_cliente") or "---"))
    
    pdf.set_xy(10, 34)
    pdf.set_font("Helvetica", "B", 9)
    pdf.cell(12, 5, "E-mail")
    pdf.ln()
    pdf.set_x(10)
    pdf.set_text_color(*BLUE)
    pdf.set_font("Helvetica", "U", 9)
    pdf.cell(100, 5, str(proyecto.get("email_cliente") or "---"))
    pdf.set_text_color(*DARK)
    
    # Referencia
    pdf.set_xy(130, 42)
    pdf.set_font("Helvetica", "B", 9)
    pdf.multi_cell(70, 4, str(proyecto.get("referencia") or "---").upper(), align="R")
    
    pdf.set_y(55)
    
    # Table Header
    pdf.set_fill_color(*BLUE)
    pdf.set_text_color(255, 255, 255)
    pdf.set_font("Helvetica", "B", 9)
    pdf.cell(15, 6, "Partida", border=0, fill=True, align="C")
    pdf.cell(115, 6, "Descripcion", border=0, fill=True, align="L")
    pdf.cell(20, 6, "Pecio", border=0, fill=True, align="C")
    pdf.cell(15, 6, "Cantidad", border=0, fill=True, align="C")
    pdf.cell(25, 6, "Sub Total", border=0, fill=True, align="C")
    pdf.ln()
    
    pdf.set_text_color(*DARK)
    pdf.set_font("Helvetica", "", 9)
    
    # Gather all partidas
    todas_partidas = []
    for s in secciones:
        if s["codigo"] in ("PRESE", "REPORTE", "CONDICIONES", "LISTAS", "INSUMOS"):
            continue
        for p in s.get("partidas", []):
            todas_partidas.append(p)
            
    # Table Rows
    y_start = pdf.get_y()
    subtotal = 0
    for i, p in enumerate(todas_partidas):
        # We need a bordered row, but multi_cell for description might wrap
        desc = p.get("descripcion", "")
        qty = float(p.get("cantidad") or 1)
        # Use the stored total_mn / usd
        if moneda == "USD":
            t = float(p.get("total_usd") or 0)
        else:
            t = float(p.get("total_mn") or 0)
            
        precio_unit = t / qty if qty else 0
        subtotal += t
        
        # Calculate height
        lines = pdf.get_string_width(desc) / 110.0
        h = max(6, int(lines + 1) * 5)
        
        pdf.rect(10, pdf.get_y(), 15, h)
        pdf.rect(25, pdf.get_y(), 115, h)
        pdf.rect(140, pdf.get_y(), 20, h)
        pdf.rect(160, pdf.get_y(), 15, h)
        pdf.rect(175, pdf.get_y(), 25, h)
        
        y_before = pdf.get_y()
        
        pdf.set_xy(10, y_before)
        pdf.cell(15, h, str(i+1), align="C")
        
        pdf.set_xy(25, y_before + (h - 5)/2) # rough vertical center
        pdf.multi_cell(115, 5, desc)
        
        pdf.set_xy(140, y_before)
        pdf.cell(20, h, f"{precio_unit:,.2f}", align="C")
        
        pdf.set_xy(160, y_before)
        pdf.cell(15, h, str(int(qty)), align="C")
        
        pdf.set_xy(175, y_before)
        pdf.cell(25, h, f"{t:,.2f}", align="C")
        
        pdf.set_y(y_before + h)
        
    pdf.ln(5)
    
    # Tiempo de entrega
    pdf.set_fill_color(226, 232, 240)
    pdf.set_font("Helvetica", "B", 9)
    # They said "TIEMPO DE ENTREGA 8- DIAS HABILES"
    # We don't have a specific field for this in the DB, so we'll hardcode or use dias_vigencia
    pdf.cell(190, 6, "TIEMPO DE ENTREGA 8- DIAS HABILES", fill=True, align="L")
    pdf.ln(10)
    
    # Totals
    pct_iva = float(proyecto.get("porcentaje_iva") if proyecto.get("porcentaje_iva") is not None else 16.00)
    iva = subtotal * (pct_iva / 100.0)
    total = subtotal + iva
    
    pdf.set_x(130)
    pdf.cell(30, 6, "SUB TOTAL", align="R")
    pdf.cell(10, 6, "$", align="C")
    pdf.cell(30, 6, f"{subtotal:,.2f}", align="R")
    pdf.ln()
    
    pdf.set_x(130)
    pdf.cell(30, 6, f"IVA ({pct_iva:g}%)", align="R")
    pdf.cell(10, 6, "", align="C")
    pdf.cell(30, 6, f"{iva:,.2f}", align="R")
    pdf.ln()
    
    pdf.set_x(130)
    pdf.cell(30, 6, "TOTAL", align="R")
    pdf.cell(10, 6, "", align="C")
    pdf.cell(30, 6, f"{total:,.2f}", align="R")
    pdf.ln(10)
    
    # Letras
    pdf.set_font("Helvetica", "", 9)
    letras = numero_a_letras(total)
    if moneda == "USD":
        letras = letras.replace("PESOS", "DOLARES").replace("M.N.", "USD")
        suffix = "USD"
    else:
        suffix = "MN"
        
    pdf.cell(0, 5, f"{letras.upper()} 00/100 {suffix}", align="C")
    pdf.ln(6)
    
    pdf.cell(0, 5, f"Nota : precios en {'Pesos Mexicanos MN' if moneda != 'USD' else 'Dolares USD'} ,precios sujetos a cambio sin previo aviso", align="C")
    pdf.ln(5)
    
    pdf.set_font("Helvetica", "B", 9)
    cond_pago = proyecto.get("condiciones_pago", "90 DIAS")
    pdf.cell(0, 5, f"TERMINOS Y CONDICIONES: Condiciones de Pago : {cond_pago}", align="C")
    pdf.ln(8)
    
    # Nota final
    pdf.set_font("Helvetica", "B", 9)
    nota_row = proyecto.get("nota_aclaracion", "Para cualquier aclaración con respecto a esta cotización o para colocar su orden, favor de comunicarse al correo integraqro07@outlook.com")
    pdf.multi_cell(0, 5, nota_row)
    pdf.ln(2)
    
    pdf.set_font("Helvetica", "", 9)
    pdf.multi_cell(0, 5, "• Tiempo de Entrega: Los días de entrega serán considerados a partir de la recepción de su orden de compra. Este tiempo de entrega es SALVO PREVIA VENTA.\n• Si esta cotización es en pesos y el tipo de cambio sufre una variación mayor al 2%, esta cotización pierde su validez.\n• Vigencia: 30 días para cotizaciones en Pesos y Dólares.")
    pdf.ln(4)
    
    pdf.set_font("Helvetica", "B", 9)
    vend_tel = proyecto.get("vendedor_config", {}).get("vendedor_telefono", "442 7214891")
    pdf.cell(0, 5, f"Atencion: {vendedor} tel: {vend_tel}")
    
    return pdf
