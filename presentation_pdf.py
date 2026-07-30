def _build_pdf(proyecto, secciones, condiciones, moneda="MN", subtemas=None):
    from fpdf import FPDF
    from utils.numero_a_letras import numero_a_letras
    from app import q
    import os, re

    def clean_point_text(text):
        return re.sub(r'^(?:[A-Za-z]?\d+(?:\.\d+)*[\s\.:\-\)]*)+', '', text.strip()).strip()


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
    CYAN = (0, 188, 212)  # #00bcd4

    # ─── PAGE 1: COVER PAGE / PRESENTATION ───
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

    # ─── DATOS DEL VENDEDOR (right side) ───
    vendedor_row = q("SELECT valor FROM configuracion WHERE clave='vendedor'", fetch="one")
    vendedor_nombre = vendedor_row.get("valor") if vendedor_row else "Jose Moreno Rangel"
    vendedor_tel_row = q("SELECT valor FROM configuracion WHERE clave='vendedor_telefono'", fetch="one")
    vendedor_tel = vendedor_tel_row.get("valor") if vendedor_tel_row else "442 7214891"
    vendedor_correo_row = q("SELECT valor FROM configuracion WHERE clave='vendedor_correo'", fetch="one")
    vendedor_correo = vendedor_correo_row.get("valor") if vendedor_correo_row else "integraqro07@outlook.com"

    pdf.set_text_color(*DARK)
    pdf.set_font("Helvetica", "B", 8)
    pdf.set_xy(130, 8)
    pdf.cell(68, 4, "DATOS DEL VENDEDOR", align="R")
    
    pdf.set_font("Helvetica", "", 8)
    pdf.set_xy(130, 12)
    pdf.cell(68, 4, vendedor_nombre, align="R")
    pdf.set_xy(130, 16)
    pdf.cell(68, 4, f"Tel: {vendedor_tel}", align="R")
    pdf.set_xy(130, 20)
    pdf.cell(68, 4, vendedor_correo, align="R")
    
    # COTIZACION Banner
    pdf.set_fill_color(*BLUE)
    pdf.rect(130, 26, 68, 8, "F")
    pdf.set_xy(130, 26)
    pdf.set_text_color(255, 255, 255)
    pdf.set_font("Helvetica", "B", 10)
    pdf.cell(68, 8, "COTIZACIÓN", align="C")
    
    # Quote Details
    pdf.set_text_color(*DARK)
    pdf.set_font("Helvetica", "", 9)
    
    pdf.set_xy(130, 36)
    pdf.cell(30, 5, "COTIZACIÓN No.")
    pdf.set_font("Helvetica", "B", 10)
    pdf.cell(38, 5, str(proyecto.get("numero_proyecto") or "---"), align="R")
    
    # Row 1: Atención & FECHA
    fecha_crea = str(proyecto.get("fecha_creacion") or "")[:10]
    if not fecha_crea or fecha_crea.startswith("0000"):
        fecha_crea = datetime.date.today().isoformat()
    
    fecha_venc = str(proyecto.get("fecha_vencimiento") or "")[:10]
    if not fecha_venc or fecha_venc.startswith("0000"):
        try:
            d_obj = datetime.datetime.strptime(fecha_crea, "%Y-%m-%d")
            d_obj += datetime.timedelta(days=int(proyecto.get("dias_vigencia") or 30))
            fecha_venc = d_obj.strftime("%Y-%m-%d")
        except Exception:
            fecha_venc = ""

    pdf.set_xy(12, 43)
    pdf.set_font("Helvetica", "B", 9)
    pdf.cell(20, 5, "Atención:")
    pdf.set_font("Helvetica", "", 9)
    pdf.cell(100, 5, str(proyecto.get("atencion") or "---"))
    
    pdf.set_xy(140, 43)
    pdf.set_font("Helvetica", "B", 9)
    pdf.cell(25, 5, "FECHA")
    pdf.set_font("Helvetica", "", 9)
    pdf.cell(33, 5, fecha_crea, align="R")
    
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
    pdf.cell(33, 5, fecha_venc, align="R")
    
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
    pdf.cell(0, 6, "DESCRIPCIÓN DE LA SOLUCIÓN.", ln=True)
    pdf.set_font("Helvetica", "", 9.5)
    pdf.multi_cell(0, 5.5, str(proyecto.get("descripcion_solucion") or "De acuerdo a la información proporcionada se realiza la siguiente propuesta:"), align="J")
    pdf.ln(4)
    
    # ─── Subthemes (Formatted like Commercial Conditions - Image 5) ───
    if subtemas:
        for st in subtemas:
            # Check page space
            if pdf.get_y() > 240:
                pdf.add_page()
            
            # Subtheme Header Banner
            pdf.set_fill_color(226, 232, 240)
            pdf.set_text_color(*BLUE)
            pdf.set_font("Helvetica", "B", 9.5)
            st_idx = str(st.get("indice") or "")
            st_title = str(st.get("titulo") or "").upper()
            pdf.cell(0, 7, f"  {st_idx} - {st_title}", ln=True, fill=True)
            pdf.ln(2)
            
            # Render points of the subtheme
            pdf.set_text_color(*DARK)
            raw_lines = str(st.get("contenido") or "").split("\n")
            pt_idx = 1
            for line in raw_lines:
                clean_line = clean_point_text(line)
                if not clean_line:
                    continue
                if pdf.get_y() > 255:
                    pdf.add_page()
                
                sub_code = f"{st_idx}.{pt_idx}" if not st_idx.endswith(".") else f"{st_idx}{pt_idx}"
                pdf.set_font("Helvetica", "B", 9)
                pdf.cell(16, 5, sub_code, align="L")
                
                pdf.set_font("Helvetica", "", 9)
                y_pos = pdf.get_y()
                pdf.set_xy(28, y_pos)
                pdf.multi_cell(170, 5, clean_line, align="J")
                pdf.ln(1.5)
                pt_idx += 1
            pdf.ln(3)

    # ─── Calculate totals from sections/partidas ───
    subtotal_mn = 0
    subtotal_usd = 0
    for sec in secciones:
        if sec["codigo"] in ("PRESE", "REPORTE", "CONDICIONES", "LISTAS", "IO", "I/O"):
            continue
        subtotal_mn += float(sec.get("subtotal_mn") or 0)
        subtotal_usd += float(sec.get("subtotal_usd") or 0)

    # Calculate IVA
    pct_iva = float(proyecto.get("porcentaje_iva") if proyecto.get("porcentaje_iva") is not None else 16.00)
    iva_mn = subtotal_mn * (pct_iva / 100.0)
    iva_usd = subtotal_usd * (pct_iva / 100.0)
    total_mn = subtotal_mn + iva_mn
    total_usd = subtotal_usd + iva_usd

    # Check page space for totals section
    if pdf.get_y() > 220:
        pdf.add_page()

    pdf.ln(2)
    pdf.set_font("Helvetica", "B", 9)
    pdf.set_text_color(*DARK)
    pdf.cell(0, 5, "Precio Total más IVA.", align="R", ln=True)
    pdf.ln(2)

    # ─── TWO TOTAL BOXES: MXN and USD (Presentation Box Style - NO Table Border) ───
    box_w = 91  # Width of each box
    
    # Left Box: PESOS (MXN) - Cyan
    pdf.set_fill_color(*CYAN)
    pdf.set_text_color(255, 255, 255)
    pdf.set_font("Helvetica", "B", 10)
    pdf.cell(box_w, 8, f"  TOTAL (PESOS MXN): $ {total_mn:,.2f} M.N.", border=0, fill=True, align="L")
    
    # Right Box: DOLARES (USD) - Dark Blue
    pdf.set_fill_color(*BLUE)
    pdf.cell(box_w, 8, f"  TOTAL (DÓLARES USD): $ {total_usd:,.2f} USD", border=0, fill=True, align="L", ln=True)
    
    # Words in total inside each box area
    pdf.set_font("Helvetica", "B", 8)
    
    try:
        letras_mn = numero_a_letras(total_mn).upper()
    except Exception:
        letras_mn = ""
    try:
        letras_usd = numero_a_letras(total_usd).replace("PESOS", "DÓLARES").replace("M.N.", "USD").upper()
    except Exception:
        letras_usd = ""
        
    y_before = pdf.get_y()
    pdf.set_fill_color(*CYAN)
    pdf.set_text_color(255, 255, 255)
    pdf.multi_cell(box_w, 4.5, f"  ({letras_mn})", border=0, fill=True, align="L")
    y_after_left = pdf.get_y()
    
    pdf.set_xy(12 + box_w, y_before)
    pdf.set_fill_color(*BLUE)
    pdf.set_text_color(255, 255, 255)
    pdf.multi_cell(box_w, 4.5, f"  ({letras_usd})", border=0, fill=True, align="L")
    y_after_right = pdf.get_y()
    
    pdf.set_y(max(y_after_left, y_after_right))
    pdf.ln(5)
    
    # ─── Commercial Conditions ───
    if condiciones:
        if pdf.get_y() > 230:
            pdf.add_page()
        
        subtemas_list = list(subtemas or [])
        next_idx = len(subtemas_list) + 1
        cond_prefix = f"A{next_idx}"
        
        tit_row = q("SELECT valor FROM configuracion WHERE clave='condiciones_seccion_titulo'", fetch="one")
        tit_val = tit_row["valor"] if tit_row and tit_row.get("valor") else "CONDICIONES COMERCIALES"
        
        # Banner
        pdf.set_fill_color(226, 232, 240)
        pdf.set_text_color(*BLUE)
        pdf.set_font("Helvetica", "B", 9.5)
        pdf.cell(0, 7, f"  {cond_prefix} - {tit_val.upper()}", ln=True, fill=True)
        pdf.ln(2)
        
        pdf.set_text_color(*DARK)
        for idx, c in enumerate(condiciones):
            if pdf.get_y() > 255:
                pdf.add_page()
            c_text = clean_point_text(c.get("contenido", ""))
            if not c_text:
                continue
            code_str = f"{cond_prefix}.{idx + 1}"
            pdf.set_font("Helvetica", "B", 9)
            pdf.cell(16, 5, code_str, align="L")
            pdf.set_font("Helvetica", "", 9)
            y_pos = pdf.get_y()
            pdf.set_xy(28, y_pos)
            pdf.multi_cell(170, 5, c_text, align="J")
            pdf.ln(1.5)
            
    return pdf
