from flask import Blueprint, request, jsonify


legacy_api = Blueprint('legacy_api', __name__, url_prefix='/api/legacy')

# ─── Helper: generic CRUD for insumos tables ───
def _insumos_crud(table, id_col='proyecto_id'):
    """Generic CRUD for insumos sub-tables keyed by proyecto_id."""
    from app import q, ex
    action = request.args.get('action')
    data = request.json if request.is_json else request.form.to_dict()

    if action == 'list':
        pid = request.args.get('proyecto_id')
        rows = q(f"SELECT * FROM {table} WHERE {id_col}=%s ORDER BY orden ASC", (pid,))
        return jsonify({'success': True, 'data': rows})
    elif action == 'create':
        pid = data.get('proyecto_id')
        nid = ex(f"INSERT INTO {table} ({id_col}) VALUES (%s)", (pid,))
        row = q(f"SELECT * FROM {table} WHERE id=%s", (nid,), fetch="one")
        return jsonify({'success': True, 'id': nid, 'row': row})
    elif action == 'update':
        rid = data.get('id')
        allowed = {k: v for k, v in data.items() if k != 'id'}
        if allowed:
            sets = ", ".join(f"{k}=%s" for k in allowed)
            vals = list(allowed.values()) + [rid]
            ex(f"UPDATE {table} SET {sets} WHERE id=%s", tuple(vals))
        return jsonify({'success': True})
    elif action == 'delete':
        rid = data.get('id')
        ex(f"DELETE FROM {table} WHERE id=%s", (rid,))
        return jsonify({'success': True})
    return jsonify({'success': False, 'error': 'Unknown action'})


@legacy_api.route('/<path:endpoint>', methods=['GET', 'POST'])
def handle_legacy(endpoint):
    action = request.args.get('action')
    data = request.json if request.is_json else request.form.to_dict()
    
    from app import q, ex
    
    print(f"LEGACY API CALL: {endpoint} action={action} data={data}")

    # ─── Insumos sub-tables (individual CRUD) ───
    if endpoint == 'insumos_viaticos_cd':
        return _insumos_crud('insumos_viaticos_cd')
    elif endpoint == 'insumos_viaticos_en_cd':
        return _insumos_crud('insumos_viaticos_en_cd')
    elif endpoint == 'insumos_transporte':
        return _insumos_crud('insumos_transporte')
    elif endpoint == 'insumos_gastos_admin':
        return _insumos_crud('insumos_gastos_admin')
    elif endpoint == 'insumos_imss':
        return _insumos_crud('insumos_imss')

    # Puntos
    elif endpoint == 'puntos':
        if action == 'list':
            pid = request.args.get('proyecto_id')
            tipo = request.args.get('tipo')
            rows = q("SELECT * FROM puntos_texto WHERE proyecto_id=%s AND tipo=%s ORDER BY id ASC", (pid, tipo))
            return jsonify({'success': True, 'puntos': rows})
        elif action == 'create':
            pid = data.get('proyecto_id')
            tipo = data.get('tipo')
            cont = data.get('contenido', '')
            nid = ex("INSERT INTO puntos_texto (proyecto_id, tipo, contenido) VALUES (%s, %s, %s)", (pid, tipo, cont))
            return jsonify({'success': True, 'id': nid})
        elif action == 'update':
            id = data.get('id')
            cont = data.get('contenido')
            ex("UPDATE puntos_texto SET contenido=%s WHERE id=%s", (cont, id))
            return jsonify({'success': True})
        elif action == 'delete':
            id = data.get('id')
            ex("DELETE FROM puntos_texto WHERE id=%s", (id,))
            return jsonify({'success': True})

    # Sub-secciones
    elif endpoint == 'sub_secciones':
        if action == 'list':
            sid = request.args.get('seccion_id')
            rows = q("SELECT * FROM sub_secciones WHERE seccion_id=%s ORDER BY id ASC", (sid,))
            return jsonify({'success': True, 'sub_secciones': rows})
        elif action == 'create':
            sid = data.get('seccion_id')
            tit = data.get('titulo', 'Nueva Sub-sección')
            nid = ex("INSERT INTO sub_secciones (seccion_id, titulo) VALUES (%s, %s)", (sid, tit))
            return jsonify({'success': True, 'id': nid})
        elif action == 'update':
            id = data.get('id')
            tit = data.get('titulo')
            ex("UPDATE sub_secciones SET titulo=%s WHERE id=%s", (tit, id))
            return jsonify({'success': True})
        elif action == 'delete':
            id = data.get('id')
            ex("DELETE FROM sub_secciones WHERE id=%s", (id,))
            return jsonify({'success': True})

    # Insumos Especiales (hospedaje, imss)
    elif endpoint == 'insumos_especiales':
        if action == 'list':
            sid = request.args.get('seccion_id')
            rows = q("SELECT * FROM partidas_insumos_especiales WHERE seccion_id=%s ORDER BY orden ASC", (sid,))
            return jsonify({'success': True, 'data': rows})
        elif action == 'create':
            sid = data.get('seccion_id')
            tipo = data.get('tipo', 'HOSPEDAJE')
            nid = ex("INSERT INTO partidas_insumos_especiales (seccion_id, tipo) VALUES (%s, %s)", (sid, tipo))
            return jsonify({'success': True, 'id': nid})
        elif action == 'update':
            id = data.get('id')
            keys = [k for k in data.keys() if k != 'id']
            if keys:
                sets = ", ".join(f"{k}=%s" for k in keys)
                vals = [data[k] for k in keys] + [id]
                ex(f"UPDATE partidas_insumos_especiales SET {sets} WHERE id=%s", tuple(vals))
            return jsonify({'success': True})
        elif action == 'delete':
            id = data.get('id')
            ex("DELETE FROM partidas_insumos_especiales WHERE id=%s", (id,))
            return jsonify({'success': True})

    # IO
    elif endpoint == 'io':
        if action == 'list':
            sid = request.args.get('seccion_id')
            rows = q("SELECT * FROM partidas_io WHERE seccion_id=%s ORDER BY orden ASC", (sid,))
            return jsonify({'success': True, 'data': rows})
        elif action == 'create':
            sid = data.get('seccion_id')
            nid = ex("INSERT INTO partidas_io (seccion_id) VALUES (%s)", (sid,))
            return jsonify({'success': True, 'id': nid})
        elif action == 'update':
            id = data.get('id')
            keys = [k for k in data.keys() if k != 'id']
            if keys:
                k = keys[0]
                v = data[k]
                ex(f"UPDATE partidas_io SET {k}=%s WHERE id=%s", (v, id))
            return jsonify({'success': True})
        elif action == 'delete':
            id = data.get('id')
            ex("DELETE FROM partidas_io WHERE id=%s", (id,))
            return jsonify({'success': True})

    # Partidas (Equipos / Mano de obra)
    elif endpoint == 'partidas':
        if action == 'create':
            sid = data.get('seccion_id')
            tipo = data.get('tipo')
            sub_id = data.get('sub_seccion_id')
            if tipo == 'equipo':
                nid = ex("INSERT INTO partidas_equipo (seccion_id, sub_seccion_id) VALUES (%s, %s)", (sid, sub_id))
            else:
                nid = ex("INSERT INTO partidas_mano_obra (seccion_id) VALUES (%s)", (sid,))
            return jsonify({'success': True, 'id': nid})
        elif action == 'update':
            id = data.get('id')
            tipo = data.get('tipo')
            keys = [k for k in data.keys() if k not in ('id', 'tipo')]
            if keys:
                k = keys[0]
                v = data[k]
                table = 'partidas_equipo' if tipo == 'equipo' else 'partidas_mano_obra'
                ex(f"UPDATE {table} SET {k}=%s WHERE id=%s", (v, id))
                
                # RECALCULATE TOTALS
                partida = q(f"SELECT * FROM {table} WHERE id=%s", (id,), fetch="one")
                if partida:
                    sid = partida.get('seccion_id')
                    if tipo == 'equipo':
                        cant = float(partida.get('cantidad') or 0)
                        costo = float(partida.get('costo_unitario') or 0)
                        margen = float(partida.get('margen') or 0)
                        precio = costo / (1 - (margen/100.0)) if margen < 100 else costo
                        total = cant * precio
                        ex("UPDATE partidas_equipo SET precio_unitario=%s, factor_total=%s, total_usd=%s WHERE id=%s", (precio, total, total, id))
                    elif tipo == 'mano_obra':
                        horas = float(partida.get('horas_mo') or 0)
                        dias = float(partida.get('dias_trabajo') or 0)
                        costo = float(partida.get('costo_hora_usd') or 0)
                        mgn = float(partida.get('porcentaje_mgn') or 0)
                        subtotal = horas * dias * costo
                        total_usd = subtotal * (1 + mgn / 100.0)
                        tc_row = q("SELECT tipo_cambio_usd, tipo_cambio FROM proyectos WHERE id = (SELECT proyecto_id FROM secciones WHERE id=%s)", (sid,), fetch="one")
                        tc = float(tc_row.get('tipo_cambio_usd') or tc_row.get('tipo_cambio') or 20.0) if tc_row else 20.0
                        total_mn = total_usd * tc
                        ex("UPDATE partidas_mano_obra SET subtotal=%s, total_usd=%s, total_mn=%s WHERE id=%s", (subtotal, total_usd, total_mn, id))
                    
                    tmn = sum(float(r.get('total_mn') or 0) for r in q("SELECT total_mn FROM partidas_mano_obra WHERE seccion_id=%s", (sid,)))
                    tusd = sum(float(r.get('total_usd') or 0) for r in q("SELECT total_usd FROM partidas_equipo WHERE seccion_id=%s", (sid,)))
                    ex("UPDATE secciones SET subtotal_mn=%s, subtotal_usd=%s WHERE id=%s", (tmn, tusd, sid))
            return jsonify({'success': True})
        elif action == 'delete':
            id = data.get('id')
            tipo = data.get('tipo')
            table = 'partidas_equipo' if tipo == 'equipo' else 'partidas_mano_obra'
            partida = q(f"SELECT seccion_id FROM {table} WHERE id=%s", (id,), fetch="one")
            ex(f"DELETE FROM {table} WHERE id=%s", (id,))
            if partida:
                sid = partida.get('seccion_id')
                tmn = sum(float(r.get('total_mn') or 0) for r in q("SELECT total_mn FROM partidas_mano_obra WHERE seccion_id=%s", (sid,)))
                tusd = sum(float(r.get('total_usd') or 0) for r in q("SELECT total_usd FROM partidas_equipo WHERE seccion_id=%s", (sid,)))
                ex("UPDATE secciones SET subtotal_mn=%s, subtotal_usd=%s WHERE id=%s", (tmn, tusd, sid))
            return jsonify({'success': True})

    # Condiciones
    elif endpoint == 'condiciones':
        if action == 'create':
            pid = data.get('proyecto_id')
            nid = ex("INSERT INTO condiciones_comerciales (proyecto_id) VALUES (%s)", (pid,))
            return jsonify({'success': True, 'id': nid})
        elif action == 'update':
            id = data.get('id')
            cont = data.get('contenido')
            ex("UPDATE condiciones_comerciales SET contenido=%s WHERE id=%s", (cont, id))
            return jsonify({'success': True})
        elif action == 'delete':
            id = data.get('id')
            ex("DELETE FROM condiciones_comerciales WHERE id=%s", (id,))
            return jsonify({'success': True})

    # Proyectos
    elif endpoint == 'proyectos':
        if action == 'get':
            pid = request.args.get('id')
            p = q("SELECT * FROM proyectos WHERE id=%s", (pid,), fetch="one")
            
            # Load secciones and everything inside
            secs = q("SELECT * FROM secciones WHERE proyecto_id=%s ORDER BY orden ASC", (pid,))
            for s in secs:
                s['partidas'] = []
                s['sub_secciones'] = []
                sid = s['id']
                if s['codigo'] in ('E_ELECTRICO', 'T_ELECTRICO'):
                    subs = q("SELECT * FROM sub_secciones WHERE seccion_id=%s ORDER BY id ASC", (sid,))
                    for sub in subs:
                        sub['partidas'] = q("SELECT * FROM partidas_equipo WHERE sub_seccion_id=%s ORDER BY id ASC", (sub['id'],))
                    s['sub_secciones'] = subs
                    # Also load partidas without sub_seccion
                    s['partidas'] = q("SELECT * FROM partidas_equipo WHERE seccion_id=%s AND (sub_seccion_id IS NULL OR sub_seccion_id=0) ORDER BY id ASC", (sid,))
                elif s['tipo'] == 'equipo':
                    s['partidas'] = q("SELECT * FROM partidas_equipo WHERE seccion_id=%s ORDER BY id ASC", (sid,))
                elif s['tipo'] == 'mano_obra':
                    s['partidas'] = q("SELECT * FROM partidas_mano_obra WHERE seccion_id=%s ORDER BY id ASC", (sid,))
                
                if s['codigo'] == 'INSUMOS':
                    s['gastos'] = q("SELECT * FROM partidas_insumos_especiales WHERE seccion_id=%s ORDER BY orden ASC", (sid,))
            
            # Load insumos data
            p['insumos_cd'] = q("SELECT * FROM insumos_viaticos_cd WHERE proyecto_id=%s ORDER BY orden ASC", (pid,))
            p['insumos_en_cd'] = q("SELECT * FROM insumos_viaticos_en_cd WHERE proyecto_id=%s ORDER BY orden ASC", (pid,))
            p['insumos_transporte'] = q("SELECT * FROM insumos_transporte WHERE proyecto_id=%s ORDER BY orden ASC", (pid,))
            p['insumos_gastos_admin'] = q("SELECT * FROM insumos_gastos_admin WHERE proyecto_id=%s ORDER BY orden ASC", (pid,))
            p['insumos_imss'] = q("SELECT * FROM insumos_imss WHERE proyecto_id=%s ORDER BY orden ASC", (pid,))

            # Load vendedor config
            vend = q("SELECT clave, valor FROM configuracion WHERE clave IN ('vendedor','vendedor_telefono','vendedor_correo')")
            p['vendedor_config'] = {r['clave']: r['valor'] for r in vend} if vend else {}

            p['secciones'] = secs
            return jsonify({'success': True, 'proyecto': p})

        elif action == 'update':
            pid = data.get('id')
            ex("""UPDATE proyectos SET nombre_proyecto=%s, empresa_cliente=%s, contacto_cliente=%s,
                  telefono_cliente=%s, email_cliente=%s, atencion=%s, referencia=%s, descripcion_solucion=%s,
                  fecha_creacion=%s, fecha_vencimiento=%s, tipo_cambio_usd=%s, carpeta_link=%s,
                  logo_data=%s, empresa_slogan=%s, dias_vigencia=%s
                  WHERE id=%s""",
               (data.get('nombre_proyecto'), data.get('empresa_cliente'), data.get('contacto_cliente'),
                data.get('telefono_cliente'), data.get('email_cliente'), data.get('atencion'),
                data.get('referencia'), data.get('descripcion_solucion'), data.get('fecha_creacion'),
                data.get('fecha_vencimiento'), data.get('tipo_cambio_usd') or 20, data.get('carpeta_link'),
                data.get('logo_data'), data.get('empresa_slogan'), data.get('dias_vigencia') or 30, pid))
            # Save vendedor config if provided
            for key in ('vendedor', 'vendedor_telefono', 'vendedor_correo'):
                val = data.get(key)
                if val is not None:
                    existing = q("SELECT clave FROM configuracion WHERE clave=%s", (key,), fetch="one")
                    if existing:
                        ex("UPDATE configuracion SET valor=%s WHERE clave=%s", (val, key))
                    else:
                        ex("INSERT INTO configuracion (clave, valor) VALUES (%s, %s)", (key, val))
            return jsonify({'success': True})

    return jsonify({'success': False, 'error': f"Unknown endpoint {endpoint}"})
