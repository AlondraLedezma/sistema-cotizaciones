import re

with open('app.py', 'r', encoding='utf-8') as f:
    text = f.read()

# Let's find def _build_pdf(...)
marker = 'def _build_pdf(proyecto, secciones, condiciones, moneda="MN", subtemas=None):'
idx = text.find(marker)
if idx == -1:
    print("Could not find _build_pdf")
    exit(1)

insertion_point = text.find('pdf.set_auto_page_break(auto=True, margin=15)')
if insertion_point != -1:
    end_of_line = text.find('\n', insertion_point)
    
    new_code = """
    tipo_proy = proyecto.get("tipo_proyecto", "")
    if tipo_proy == "cotizacion":
        return _build_pdf_cotizacion_simple(proyecto, secciones, condiciones, moneda, pdf)
"""
    text = text[:end_of_line+1] + new_code + text[end_of_line+1:]

cotizacion_pdf_code = """
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
    pdf.multi_cell(0, 5, "• Tiempo de Entrega: Los días de entrega serán considerados a partir de la recepción de su orden de compra. Este tiempo de entrega es SALVO PREVIA VENTA.\\n• Si esta cotización es en pesos y el tipo de cambio sufre una variación mayor al 2%, esta cotización pierde su validez.\\n• Vigencia: 30 días para cotizaciones en Pesos y Dólares.")
    pdf.ln(4)
    
    pdf.set_font("Helvetica", "B", 9)
    vend_tel = proyecto.get("vendedor_config", {}).get("vendedor_telefono", "442 7214891")
    pdf.cell(0, 5, f"Atencion: {vendedor} tel: {vend_tel}")
    
    file_path = f"cot_{proyecto['numero_proyecto']}.pdf".replace("/", "-")
    pdf.output(file_path)
    return file_path
"""

with open('app.py', 'w', encoding='utf-8') as f:
    f.write(text + "\n" + cotizacion_pdf_code)

print("Patched app.py with new PDF generation")
