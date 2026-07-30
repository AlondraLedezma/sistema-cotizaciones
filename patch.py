import re

with open('app.py', 'r', encoding='utf-8') as f:
    content = f.read()

start = content.find('def _build_pdf(')
end = content.find('if __name__ == "__main__":', start)
if end == -1:
    end = len(content)

new_build_pdf = """def _build_pdf(proyecto, secciones, condiciones, moneda="MN", subtemas=None):
    from fpdf import FPDF
    from datetime import date
    from decimal import Decimal
    
    def format_currency(val):
        if val is None:
            val = 0
        return f"${float(val):,.2f}"

    pdf = FPDF(orientation="P", unit="mm", format="Letter")
    pdf.add_page()
    pdf.set_auto_page_break(auto=True, margin=15)
    
    margin = 15
    pageWidth = 215.9
    pageHeight = 279.4
    contentWidth = pageWidth - 2 * margin
    
    # Header
    pdf.set_font('helvetica', 'B', 18)
    pdf.set_text_color(26, 58, 92)
    pdf.text(margin, 15, 'DEMATIQ')
    
    pdf.set_font_size(10)
    pdf.text(margin, 21, 'AUTOMATIZACIÓN')
    
    pdf.set_font('helvetica', '', 8)
    pdf.set_text_color(80, 80, 80)
    pdf.text(70, 15, 'Integración de sistemas Automatizados')
    pdf.text(70, 19, 'Programación de PLC, HMI')
    pdf.text(70, 23, 'Servicio de Diseño y Armado Tableros')
    pdf.text(70, 27, 'Pólizas de Mantenimiento')
    
    pdf.set_text_color(0, 100, 180)
    pdf.set_font('helvetica', 'B', 8)
    pdf.text(130, 15, 'Ventas: Jose Moreno Rangel')
    
    pdf.set_font('helvetica', 'B', 14)
    pdf.set_text_color(26, 58, 92)
    pdf.text(155, 25, 'COTIZACIÓN')
    
    pdf.set_font('helvetica', '', 9)
    pdf.set_text_color(40, 40, 40)
    
    numProyecto = str(proyecto.get('numero_proyecto') or '---')
    fechaCreacion = str(proyecto.get('fecha_creacion') or '')[:10]
    
    pdf.set_font('helvetica', 'B', 9)
    pdf.text(140, 32, 'COTIZACIÓN No.')
    pdf.set_font('helvetica', '', 9)
    pdf.text(175, 32, numProyecto)
    
    pdf.set_font('helvetica', 'B', 9)
    pdf.text(140, 37, 'FECHA')
    pdf.set_font('helvetica', '', 9)
    pdf.text(175, 37, fechaCreacion)
    
    pdf.set_font('helvetica', 'B', 9)
    pdf.text(140, 42, 'VENCIMIENTO')
    pdf.set_font('helvetica', '', 9)
    pdf.text(175, 42, fechaCreacion)
    
    y = 47
    pdf.set_draw_color(0, 100, 180)
    pdf.set_line_width(0.5)
    pdf.line(margin, y, pageWidth - margin, y)
    y += 7
    
    pdf.set_font('helvetica', '', 9)
    pdf.set_text_color(0, 0, 0)
    
    pdf.set_font('helvetica', 'B', 9)
    pdf.text(margin, y, 'Atención:')
    pdf.set_font('helvetica', '', 9)
    pdf.text(margin + 22, y, str(proyecto.get('atencion') or ''))
    y += 5
    
    pdf.set_font('helvetica', 'B', 9)
    pdf.text(margin, y, 'TEL:')
    pdf.set_font('helvetica', '', 9)
    pdf.text(margin + 10, y, f"52 {proyecto.get('telefono_cliente') or ''}")
    
    pdf.set_font('helvetica', 'B', 9)
    pdf.text(90, y, 'Empresa:')
    pdf.set_font('helvetica', '', 9)
    pdf.text(110, y, str(proyecto.get('empresa_cliente') or ''))
    y += 5
    
    pdf.set_text_color(0, 100, 180)
    pdf.set_font('helvetica', 'B', 9)
    pdf.text(margin, y, 'E-mail:')
    pdf.set_font('helvetica', '', 9)
    pdf.text(margin + 16, y, str(proyecto.get('email_cliente') or ''))
    y += 8
    
    pdf.set_text_color(0, 0, 0)
    pdf.set_font('helvetica', 'B', 9)
    pdf.text(margin, y, 'Su Referencia:')
    pdf.set_font('helvetica', '', 9)
    pdf.text(margin + 30, y, str(proyecto.get('referencia') or ''))
    y += 8
    
    pdf.set_y(y)
    
    for s in secciones:
        if s.get("codigo") in ("PRESE", "REPORTE", "CONDICIONES", "LISTAS", "I/O", "IO"):
            continue
            
        pdf.set_font('helvetica', 'B', 10)
        pdf.set_text_color(26, 58, 92)
        pdf.set_x(margin)
        pdf.cell(0, 8, str(s.get("titulo") or s.get("codigo") or ""), new_x="LMARGIN", new_y="NEXT")
        
        partidas = s.get("partidas", [])
        if not partidas:
            pdf.set_font('helvetica', 'I', 8)
            pdf.set_text_color(100, 100, 100)
            pdf.set_x(margin)
            pdf.cell(0, 6, "Sin partidas", new_x="LMARGIN", new_y="NEXT")
            pdf.ln(4)
            continue
            
        pdf.set_font('helvetica', '', 7)
        pdf.set_text_color(0, 0, 0)
        
        with pdf.table(borders_layout="ALL",
                       cell_fill_color=(240, 245, 250),
                       col_widths=(10, 40, 16, 16, 10, 18, 12, 18, 12, 22, 20),
                       line_height=5,
                       text_align=("CENTER", "LEFT", "LEFT", "LEFT", "CENTER", "RIGHT", "CENTER", "RIGHT", "CENTER", "RIGHT", "RIGHT")) as table:
            
            header = table.row()
            for h in ["PDA", "DESCRIPCIÓN", "MARCA", "MODELO", "QTY", "PRECIO", "MON.", "SUBTOTAL", "% MGN", "TOTAL MN", "TOTAL USD"]:
                pdf.set_font('helvetica', 'B', 7)
                pdf.set_text_color(255, 255, 255)
                pdf.set_fill_color(26, 58, 92)
                header.cell(h)
                
            pdf.set_text_color(0, 0, 0)
            pdf.set_font('helvetica', '', 7)
            
            for p in partidas:
                row = table.row()
                row.cell(str(p.get("numero_partida") or ''))
                row.cell(str(p.get("descripcion") or ''))
                row.cell(str(p.get("marca") or ''))
                row.cell(str(p.get("modelo") or ''))
                
                if s.get("tipo") == "mano_obra":
                    row.cell(str(p.get("dias_trabajo") or ''))
                    row.cell(format_currency(p.get("costo_hora_usd")))
                else:
                    row.cell(str(p.get("cantidad") or ''))
                    row.cell(format_currency(p.get("precio_lista")))
                
                row.cell(str(p.get("moneda") or 'MN'))
                
                subt = float(p.get("subtotal") or 0)
                if s.get("tipo") == "mano_obra":
                    subt = float(p.get("horas_mo") or 0) * float(p.get("dias_trabajo") or 0) * float(p.get("costo_hora_usd") or 0)
                    
                row.cell(format_currency(subt))
                
                mgn = float(p.get("porcentaje_mgn") or 0)
                row.cell(f"{mgn}%" if mgn else "")
                row.cell(format_currency(p.get("total_mn")))
                row.cell(format_currency(p.get("total_usd")))
                
            row = table.row()
            pdf.set_font('helvetica', 'B', 7)
            row.cell("TOTAL", colspan=9, align="RIGHT")
            row.cell(format_currency(s.get("subtotal_mn")))
            row.cell(format_currency(s.get("subtotal_usd")))
            
        pdf.ln(6)
        
    pdf.ln(10)
    pdf.set_draw_color(0, 100, 180)
    pdf.set_line_width(0.3)
    y = pdf.get_y()
    pdf.line(120, y, pageWidth - margin, y)
    pdf.ln(2)
    
    subtotal_mn = float(proyecto.get("total_mn") or 0)
    porcentaje_iva = float(proyecto.get("porcentaje_iva") or 16.0)
    iva = subtotal_mn * (porcentaje_iva / 100.0)
    total_final = subtotal_mn + iva
    
    pdf.set_font('helvetica', '', 9)
    pdf.set_text_color(40, 40, 40)
    
    pdf.set_x(margin)
    pdf.cell(115)
    pdf.cell(30, 5, "SUBTOTAL:", new_x="RIGHT", new_y="TOP")
    pdf.cell(0, 5, format_currency(subtotal_mn), new_x="LMARGIN", new_y="NEXT", align="R")
    
    pdf.set_x(margin)
    pdf.cell(115)
    pdf.cell(30, 5, f"IVA ({porcentaje_iva}%):", new_x="RIGHT", new_y="TOP")
    pdf.cell(0, 5, format_currency(iva), new_x="LMARGIN", new_y="NEXT", align="R")
    
    pdf.set_font('helvetica', 'B', 11)
    pdf.set_text_color(26, 58, 92)
    pdf.set_x(margin)
    pdf.cell(115)
    pdf.cell(30, 8, "TOTAL:", new_x="RIGHT", new_y="TOP")
    pdf.cell(0, 8, format_currency(total_final), new_x="LMARGIN", new_y="NEXT", align="R")
    
    pdf.ln(4)
    pdf.set_font('helvetica', '', 8)
    pdf.set_text_color(80, 80, 80)
    pdf.set_x(margin)
    try:
        from utils.numero_a_letras import numero_a_letras
        letras = numero_a_letras(total_final)
        pdf.multi_cell(0, 4, f"SON: {letras}")
    except:
        pass
        
    pdf.ln(10)
    pdf.set_font_size(7)
    pdf.set_text_color(100, 100, 100)
    pdf.set_x(margin)
    pdf.cell(0, 4, "Nota: precios en Pesos Mexicanos MN, precios sujetos a cambio sin previo aviso", new_x="LMARGIN", new_y="NEXT")
    
    cond_pago = str(proyecto.get('condiciones_pago') or '90 DIAS')
    tiempo_entrega = str(proyecto.get('tiempo_entrega') or '8 DIAS HABILES')
    pdf.set_x(margin)
    pdf.cell(0, 4, f"TÉRMINOS Y CONDICIONES: Condiciones de Pago: {cond_pago}  |  Tiempo de Entrega: {tiempo_entrega}", new_x="LMARGIN", new_y="NEXT")
    
    pdf.ln(6)
    pdf.set_font_size(8)
    pdf.set_text_color(40, 40, 40)
    pdf.set_x(margin)
    pdf.cell(0, 4, "Para cualquier aclaración con respecto a esta cotización, favor de comunicarse al", new_x="LMARGIN", new_y="NEXT")
    
    pdf.set_text_color(0, 100, 180)
    pdf.set_x(margin)
    pdf.cell(0, 4, "correo integraqro07@outlook.com", new_x="LMARGIN", new_y="NEXT")
    
    pdf.set_text_color(40, 40, 40)
    pdf.set_x(margin)
    pdf.cell(0, 4, "Atención: Jose Moreno Rangel  tel: 447 7214891", new_x="LMARGIN", new_y="NEXT")
    
    # Render Condiciones Comerciales
    if condiciones:
        pdf.add_page()
        pdf.set_font('helvetica', 'B', 11)
        pdf.set_text_color(26, 58, 92)
        pdf.cell(0, 8, "Condiciones Comerciales", new_x="LMARGIN", new_y="NEXT")
        pdf.ln(4)
        pdf.set_font('helvetica', '', 9)
        pdf.set_text_color(0, 0, 0)
        for c in condiciones:
            text = f"{c.get('codigo', '')} {c.get('contenido', '')}"
            pdf.multi_cell(0, 5, text)
            pdf.ln(2)
            
    return pdf
"""

new_content = content[:start] + new_build_pdf + "\n" + content[end:]
with open('app.py', 'w', encoding='utf-8') as f:
    f.write(new_content)
print("patched app.py")
