with open('static/js/proyecto_cotizacion.js', 'r', encoding='utf-8') as f:
    text = f.read()

# Fix 1: Store gastos
text = text.replace('const gastos = result.data || result.insumos_especiales || [];', 
                    'const gastos = result.data || result.insumos_especiales || [];\n    seccion.gastos = gastos;')

# Fix 2: recalculateSectionTotals includes gastos
recalc_old = '''    let usd = 0, mn = 0;
    (sec.partidas || []).forEach(p => {
      usd += parseFloat(p.total_usd) || 0;
      mn  += parseFloat(p.total_mn)  || 0;
    });
    sec.subtotal_usd = usd;
    sec.subtotal_mn  = mn;'''

recalc_new = '''    let usd = 0, mn = 0;
    (sec.partidas || []).forEach(p => {
      usd += parseFloat(p.total_usd) || 0;
      mn  += parseFloat(p.total_mn)  || 0;
    });
    (sec.gastos || []).forEach(g => {
      const sub = (parseFloat(g.num_personas)||0) * (parseFloat(g.costo_por_persona)||0) * (parseFloat(g.num_veces)||0);
      mn += sub;
      usd += sub / tipoCambio();
    });
    sec.subtotal_usd = usd;
    sec.subtotal_mn  = mn;'''

text = text.replace(recalc_old, recalc_new)

# Fix 3: Mano de Obra calculations in recalculateAllSections
mo_old = '''      if (sec.tipo === 'mano_obra') {
        const sub = (parseFloat(p.horas_mo)||0) * (parseFloat(p.dias_trabajo)||0) * (parseFloat(p.costo_hora_usd)||0);
        const mgn = parseFloat(p.porcentaje_mgn) || 0;
        p.subtotal  = sub;
        p.total_usd = sub * (1 + mgn/100);
        p.total_mn  = p.total_usd * tc;'''

mo_new = '''      if (sec.tipo === 'mano_obra') {
        const sub = (parseFloat(p.horas_mo)||0) * (parseFloat(p.dias_trabajo)||0) * (parseFloat(p.costo_hora_usd)||0);
        const mgn = parseFloat(p.porcentaje_mgn) || 0;
        p.subtotal  = sub;
        p.total_mn = sub * (1 + mgn/100);
        p.total_usd  = p.total_mn / tc;'''

text = text.replace(mo_old, mo_new)

# Fix 4: Mano de obra in renderIngMoTable
mo_table_old = '''    const subtotal  = horas * dias * costo;
    const totalUsdR = subtotal * (1 + mgn / 100);
    const totalMnR  = totalUsdR * tipoCambio();'''

mo_table_new = '''    const subtotal  = horas * dias * costo;
    const totalMnR = subtotal * (1 + mgn / 100);
    const totalUsdR  = totalMnR / tipoCambio();'''

text = text.replace(mo_table_old, mo_table_new)

# Fix header
text = text.replace('<th style="width:100px;">C/HORA USD</th>', '<th style="width:100px;">C/HORA MN</th>')

with open('static/js/proyecto_cotizacion.js', 'w', encoding='utf-8') as f:
    f.write(text)
print('Applied patches to JS')
