from flask import (Flask, render_template, request, redirect, url_for,
                   session, jsonify, send_file, send_from_directory)
import pymysql, pymysql.cursors, hashlib, random, os, io
from datetime import date, datetime
from functools import wraps

app = Flask(__name__)
app.secret_key = "dematiq-2026-secret-key"

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
    nota_row = q("SELECT valor FROM configuracion WHERE clave='nota_aclaracion'", fetch="one")
    nota_aclaracion = nota_row.get("valor") if nota_row else "Para cualquier aclaración con respecto a esta cotización o para colocar su orden, favor de comunicarse al correo: integraqro07@outlook.com"
    slogans_row = q("SELECT valor FROM configuracion WHERE clave='slogans'", fetch="one")
    slogans = slogans_row.get("valor") if slogans_row else "Integracion de sistemas Automatizados\nProgramacion de PLC, HMI\nServicio de Diseño y Armado Tableros\nPolizas de Mantenimiento"
    
    return render_template("proyecto.html", proyecto=p, vendedor_config=vendedor,
                           vendedor_telefono=vendedor_telefono,
                           nota_aclaracion=nota_aclaracion,
                           slogans_config=slogans,
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
          porcentaje_iva=%s WHERE id=%s""",
       (d.get("nombre_proyecto"), d.get("empresa_cliente"),
        d.get("contacto_cliente"), d.get("telefono_cliente"),
        d.get("email_cliente"), d.get("atencion"), d.get("referencia"),
        d.get("descripcion_solucion"), d.get("fecha_creacion"),
        d.get("fecha_vencimiento"), d.get("tipo_cambio_usd") or 20,
        d.get("carpeta_link"), d.get("tiempo_entrega"), d.get("condiciones_pago"),
        d.get("porcentaje_iva") if d.get("porcentaje_iva") is not None else curr_iva, pid))
    _recalc_totals(pid)
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
    listas = q("SELECT * FROM listas_predefinidas ORDER BY seccion_codigo, orden")
    return jsonify(
        proyecto=_serialize(proyecto),
        secciones=[_serialize(s) for s in secciones],
        condiciones=list(condiciones),
        subtemas=list(subtemas),
        listas=list(listas)
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
    n = q("SELECT COUNT(*) cnt FROM condiciones_comerciales WHERE proyecto_id=%s", (pid,), fetch="one")["cnt"] + 1
    new_id = ex("INSERT INTO condiciones_comerciales (proyecto_id,codigo,contenido,orden) VALUES (%s,%s,%s,%s)",
                (pid, f"C{n}", "Nueva condición comercial.", n))
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
        pdf = _build_pdf(proyecto, secciones, condiciones, moneda, subtemas)
        pdf.output(filepath)
        return jsonify(ok=True, path=filepath)
    except Exception as e:
        return jsonify(error=str(e)), 500

@app.route("/api/listas_predefinidas")
@login_required
def api_listas():
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
    n = q("SELECT COALESCE(MAX(orden),0)+1 as n FROM listas_predefinidas WHERE seccion_codigo=%s",
          (d.get("seccion_codigo"),), fetch="one")["n"]
    new_id = ex("INSERT INTO listas_predefinidas (seccion_codigo,valor,orden) VALUES (%s,%s,%s)",
                (d.get("seccion_codigo"), d.get("valor",""), n))
    return jsonify(id=new_id)

@app.route("/api/listas_predefinidas/update", methods=["POST"])
@login_required
def api_update_lista():
    d = request.json or {}
    ex("UPDATE listas_predefinidas SET valor=%s WHERE id=%s", (d.get("valor"), d.get("id")))
    return jsonify(ok=True)

@app.route("/api/listas_predefinidas/delete", methods=["POST"])
@login_required
def api_delete_lista():
    ex("DELETE FROM listas_predefinidas WHERE id=%s", (request.json.get("id"),))
    return jsonify(ok=True)

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
        pdf.set_text_color(255, 255, 255)
        pdf.set_font("Helvetica", "B", 10)
        pdf.cell(68, 8, "COTIZACION", align="C")
        
        # Quote Details
        pdf.set_text_color(*DARK)
        pdf.set_font("Helvetica", "", 9)
        
        pdf.set_xy(130, 24)
        pdf.cell(30, 7, "COTIZACION No.")
        pdf.set_font("Helvetica", "B", 10)
        pdf.cell(38, 7, str(proyecto.get("numero_proyecto") or "---"), align="R")
        
        # Customer Info on Left, Dates on Right (aligned side-by-side)
        # Row 1: Atencion & FECHA
        pdf.set_xy(12, 43)
        pdf.set_font("Helvetica", "B", 9)
        pdf.cell(20, 5, "Atencion:")
        pdf.set_font("Helvetica", "", 9)
        pdf.cell(100, 5, str(proyecto.get("atencion") or "---"))
        
        pdf.set_xy(140, 43)
        pdf.set_font("Helvetica", "B", 9)
        pdf.cell(25, 5, "FECHA")
        pdf.set_font("Helvetica", "", 9)
        pdf.cell(33, 5, str(proyecto.get("fecha_creacion") or "")[:10], align="R")
        
        # Row 2: TEL / Empresa & VENCIMIENTO
        pdf.set_xy(12, 49)
        pdf.set_font("Helvetica", "B", 9)
        pdf.cell(10, 5, "TEL:")
        pdf.set_font("Helvetica", "", 9)
        pdf.cell(30, 5, str(proyecto.get("telefono_cliente") or "---"))
        
        pdf.set_font("Helvetica", "B", 9)
        pdf.cell(18, 5, "Empresa:")
        pdf.set_font("Helvetica", "", 9)
        pdf.cell(62, 5, str(proyecto.get("empresa_cliente") or "---"))
        
        pdf.set_xy(140, 49)
        pdf.set_font("Helvetica", "B", 9)
        pdf.cell(25, 5, "VENCIMIENTO")
        pdf.set_font("Helvetica", "", 9)
        pdf.cell(33, 5, str(proyecto.get("fecha_vencimiento") or "")[:10], align="R")
        
        # Row 3: E-mail
        pdf.set_xy(12, 55)
        pdf.set_font("Helvetica", "B", 9)
        pdf.cell(15, 5, "E-mail:")
        pdf.set_font("Helvetica", "", 9)
        pdf.cell(105, 5, str(proyecto.get("email_cliente") or "---"))

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
                for line in raw_lines:
                    if not line.strip():
                        continue
                    # Print the point with a left margin
                    pdf.set_x(18)
                    pdf.multi_cell(0, 5, line.strip())
                pdf.ln(3)

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
        sub_val = subtotal_usd if moneda == "USD" else subtotal_mn
        pct_iva = float(proyecto.get("porcentaje_iva") if proyecto.get("porcentaje_iva") is not None else 16.00)
        iva_val = sub_val * (pct_iva / 100.0)
        total_val = sub_val + iva_val
        suffix = "USD" if moneda == "USD" else "M.N."
        
        pdf.ln(4)
        pdf.set_font("Helvetica", "", 9)
        pdf.cell(140, 6, "SUB TOTAL", border=1, align="R")
        pdf.cell(46, 6, f"$ {sub_val:,.2f}", border=1, align="R", ln=True)
        
        # IVA
        pdf.cell(140, 6, f"IVA ({pct_iva:g}%)", border=1, align="R")
        pdf.cell(46, 6, f"$ {iva_val:,.2f}", border=1, align="R", ln=True)
        
        # Price Total plus IVA label
        pdf.ln(1)
        pdf.set_font("Helvetica", "B", 9.5)
        pdf.set_text_color(*DARK)
        pdf.cell(0, 5, "Precio Total más IVA.", align="R", ln=True)
        pdf.ln(1)
        
        # TOTAL Banner
        pdf.set_fill_color(0, 188, 212)  # Cyan #00bcd4
        pdf.set_text_color(255, 255, 255)
        pdf.set_font("Helvetica", "B", 10)
        pdf.cell(140, 8, "  TOTAL", border=1, fill=True, align="L")
        pdf.cell(46, 8, f"$ {total_val:,.2f} {suffix}", border=1, fill=True, align="R", ln=True)
        
        # Words total
        pdf.ln(2)
        pdf.set_text_color(*DARK)
        pdf.set_font("Helvetica", "B", 10)
        try:
            letras = numero_a_letras(total_val)
            if moneda == "USD":
                letras = letras.replace("PESOS", "DÓLARES").replace("M.N.", "USD")
            pdf.multi_cell(0, 5, f"({letras.upper()})", align="L")
        except Exception:
            pass
            
        pdf.set_text_color(*DARK)
        pdf.ln(5)
        
        # Commercial Conditions
        if condiciones:
            # Banner
            pdf.set_fill_color(226, 232, 240)
            pdf.set_text_color(*BLUE)
            pdf.set_font("Helvetica", "B", 9.5)
            pdf.cell(0, 7, "  A3 - CONDICIONES COMERCIALES", ln=True, fill=True)
            pdf.ln(1)
            
            pdf.set_text_color(*DARK)
            for c in condiciones:
                pdf.set_font("Helvetica", "B", 9)
                pdf.cell(20, 5, c.get("codigo", ""), ln=False)
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
