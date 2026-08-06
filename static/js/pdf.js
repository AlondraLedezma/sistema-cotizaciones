// ── PDF Section Selector ──
let _pdfSelectedSections = {};

async function generatePDF() {
  if (!projectData) {
    showToast('No hay datos del proyecto para generar el PDF', 'error');
    return;
  }

  if (projectData.tipo_proyecto === 'cotizacion') {
    return generateCotizacionPDF();
  }

  // Build section list for selector
  const sections = [
    { key: 'presentacion', label: 'Presentación (Logo, Slogan, Datos, Descripción)', checked: true },
    { key: 'alcances', label: 'Puntos Generales y Alcance (A1.x, A2.x)', checked: true }
  ];

  if (projectData.secciones) {
    projectData.secciones.forEach(s => {
      sections.push({ key: 'sec_' + s.id, label: s.titulo || s.codigo, checked: true });
    });
  }

  sections.push({ key: 'condiciones', label: 'Condiciones Comerciales', checked: true });
  sections.push({ key: 'totales', label: 'Totales y Notas', checked: true });

  // Set defaults
  _pdfSelectedSections = {};
  sections.forEach(s => _pdfSelectedSections[s.key] = s.checked);

  // Render checkboxes
  const listEl = document.getElementById('pdf-sections-list');
  listEl.innerHTML = sections.map(s => `
    <label style="display:flex;align-items:center;gap:10px;padding:8px 12px;cursor:pointer;border-bottom:1px solid #f1f5f9;font-size:13px;">
      <input type="checkbox" ${s.checked ? 'checked' : ''} onchange="_pdfSelectedSections['${s.key}']=this.checked" style="width:18px;height:18px;accent-color:#2563eb;">
      <span>${s.label}</span>
    </label>
  `).join('');

  openModal('modal-pdf-sections');
}

async function confirmGeneratePDF() {
  closeModal('modal-pdf-sections');

  try {
    showLoading();

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'mm', 'letter');
    const pageWidth = 215.9;
    const pageHeight = 279.4;
    const margin = 15;
    const contentWidth = pageWidth - 2 * margin;
    let y = 15;

    function checkPageBreak(needed) {
      if (y + needed > pageHeight - 25) {
        doc.addPage();
        y = 20;
        return true;
      }
      return false;
    }

    const sel = _pdfSelectedSections;

    // ── HEADER (always included) ──
    try {
      if (projectData.logo_data) {
        doc.addImage(projectData.logo_data, 'PNG', margin, 10, 42, 20);
      } else {
        const logoImg = await loadImageAsBase64('/static/img/logo.png');
        if (logoImg) doc.addImage(logoImg, 'PNG', margin, 10, 42, 20);
      }
    } catch(e) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(18);
      doc.setTextColor(26, 58, 92);
      doc.text('DEMATIQ', margin, y);
    }

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80, 80, 80);
    const rawSlogans = projectData.empresa_slogan || "Integración de sistemas Automatizados\nProgramación de PLC, HMI\nServicio de Diseño y Armado Tableros\nPólizas de Mantenimiento";
    const sloganLines = rawSlogans.split('\n');
    let sy = 13;
    sloganLines.forEach(line => {
      doc.text(line, 65, sy);
      sy += 3.5;
    });

    doc.setTextColor(0, 100, 180);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    const vendedor = projectData.vendedor_config?.vendedor || 'Jose Moreno Rangel';
    doc.text('Ventas: ' + vendedor, 130, 15);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(26, 58, 92);
    doc.text('COTIZACIÓN', 155, 25);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(40, 40, 40);

    const numProyecto = projectData.numero_proyecto || '---';
    const fechaCreacion = formatDate(projectData.fecha_creacion);
    const fechaVencimiento = formatDate(projectData.fecha_vencimiento);

    doc.setFont('helvetica', 'bold');
    doc.text('COTIZACIÓN No.', 140, 32);
    doc.setFont('helvetica', 'normal');
    doc.text(numProyecto, 175, 32);

    doc.setFont('helvetica', 'bold');
    doc.text('FECHA', 140, 37);
    doc.setFont('helvetica', 'normal');
    doc.text(fechaCreacion, 175, 37);

    doc.setFont('helvetica', 'bold');
    doc.text('VENCIMIENTO', 140, 42);
    doc.setFont('helvetica', 'normal');
    doc.text(fechaVencimiento, 175, 42);

    y = 47;
    doc.setDrawColor(0, 100, 180);
    doc.setLineWidth(0.5);
    doc.line(margin, y, pageWidth - margin, y);
    y += 7;

    // ── PRESENTACIÓN SECTION ──
    if (sel.presentacion) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(0, 0, 0);

      doc.setFont('helvetica', 'bold');
      doc.text('Atención:', margin, y);
      doc.setFont('helvetica', 'normal');
      doc.text(projectData.atencion || '', margin + 22, y);
      y += 5;

      doc.setFont('helvetica', 'bold');
      doc.text('TEL:', margin, y);
      doc.setFont('helvetica', 'normal');
      doc.text('52 ' + (projectData.telefono_cliente || ''), margin + 10, y);

      doc.setFont('helvetica', 'bold');
      doc.text('Empresa:', 90, y);
      doc.setFont('helvetica', 'normal');
      doc.text(projectData.empresa_cliente || '', 110, y);
      y += 5;

      doc.setTextColor(0, 100, 180);
      doc.setFont('helvetica', 'bold');
      doc.text('E-mail:', margin, y);
      doc.setFont('helvetica', 'normal');
      doc.text(projectData.email_cliente || '', margin + 16, y);
      y += 8;

      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text('Su Referencia:', margin, y);
      doc.setFont('helvetica', 'normal');
      doc.text(projectData.referencia || '', margin + 30, y);
      y += 8;

      // Descripción de la Solución
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text('DESCRIPCIÓN DE LA SOLUCIÓN.', margin, y);
      y += 6;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      const descText = projectData.descripcion_solucion || '';
      if (descText) {
        const descLines = doc.splitTextToSize(descText, contentWidth);
        doc.text(descLines, margin, y);
        y += descLines.length * 3.5 + 6;
      } else {
        y += 6;
      }
    }

    // ── ALCANCES / PUNTOS SECTION ──
    if (sel.alcances) {
      try {
        const r1 = await apiCall('/api/legacy/puntos?action=list&proyecto_id=' + projectData.id + '&tipo=prese_alcance1');
        const puntos1 = r1.data || r1.puntos || [];
        if (puntos1.length > 0) {
          checkPageBreak(15);
          doc.setFillColor(26, 58, 92);
          doc.rect(margin, y - 4, contentWidth, 7, 'F');
          doc.setTextColor(255, 255, 255);
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(9);
          doc.text('PUNTOS GENERALES (A1.x)', margin + 2, y);
          y += 6;
          doc.setTextColor(0, 0, 0);
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8);
          puntos1.forEach(function(p, idx) {
            var txt = 'A1.' + (idx+1) + '  ' + (p.contenido || '');
            var lines = doc.splitTextToSize(txt, contentWidth);
            checkPageBreak(lines.length * 3.5 + 3);
            doc.text(lines, margin, y);
            y += lines.length * 3.5 + 2;
          });
          y += 4;
        }
      } catch(e) { console.warn('No se pudieron cargar puntos A1:', e); }

      try {
        const r2 = await apiCall('/api/legacy/puntos?action=list&proyecto_id=' + projectData.id + '&tipo=prese_alcance2');
        const puntos2 = r2.data || r2.puntos || [];
        if (puntos2.length > 0) {
          checkPageBreak(15);
          doc.setFillColor(26, 58, 92);
          doc.rect(margin, y - 4, contentWidth, 7, 'F');
          doc.setTextColor(255, 255, 255);
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(9);
          doc.text('ALCANCE DE DEMATIQ AUTOMATIZACIÓN (A2.x)', margin + 2, y);
          y += 6;
          doc.setTextColor(0, 0, 0);
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8);
          puntos2.forEach(function(p, idx) {
            var txt = 'A2.' + (idx+1) + '  ' + (p.contenido || '');
            var lines = doc.splitTextToSize(txt, contentWidth);
            checkPageBreak(lines.length * 3.5 + 3);
            doc.text(lines, margin, y);
            y += lines.length * 3.5 + 2;
          });
          y += 4;
        }
      } catch(e) { console.warn('No se pudieron cargar puntos A2:', e); }
    }

    // ── SECCIONES (Tablas de partidas) ──
    if (projectData.secciones && projectData.secciones.length > 0) {
      for (const seccion of projectData.secciones) {
        if (!sel['sec_' + seccion.id]) continue;
        checkPageBreak(30);

        doc.setFillColor(26, 58, 92);
        doc.rect(margin, y - 4, contentWidth, 7, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.text(seccion.titulo || 'Sección', margin + 2, y);
        y += 6;

        if (seccion.tipo === 'mano_obra') {
          const tableBody = (seccion.partidas || []).map(p => {
            const subtotal = (parseFloat(p.horas_mo) || 0) * (parseFloat(p.dias_trabajo) || 0) * (parseFloat(p.costo_hora_usd) || 0);
            const mgn = parseFloat(p.porcentaje_mgn) || 0;
            const totalUSD = subtotal * (1 + mgn / 100);
            const totalMN = totalUSD * (parseFloat(projectData.tipo_cambio) || 20);
            return [
              p.numero_partida || '', p.descripcion || '', p.horas_mo || '', p.dias_trabajo || '',
              formatCurrency(p.costo_hora_usd), formatCurrency(subtotal),
              p.porcentaje_mgn ? p.porcentaje_mgn + '%' : '',
              formatCurrency(totalUSD), formatCurrency(totalMN)
            ];
          });
          const secTotalUSD = seccion.subtotal_usd || 0;
          const secTotalMN = seccion.subtotal_mn || 0;
          tableBody.push([
            { content: 'TOTAL', colSpan: 7, styles: { halign: 'right', fontStyle: 'bold' } },
            { content: formatCurrency(secTotalUSD), styles: { fontStyle: 'bold' } },
            { content: formatCurrency(secTotalMN), styles: { fontStyle: 'bold' } }
          ]);
          doc.autoTable({
            startY: y,
            head: [['PARTIDA', 'INGENIERÍA Y DESARROLLO', 'HORAS/MO', 'DÍAS', 'C/HORA USD', 'SUB TOTAL', '% MGN', 'TOTAL USD', 'TOTAL MN']],
            body: tableBody, theme: 'grid',
            headStyles: { fillColor: [26, 58, 92], fontSize: 7, fontStyle: 'bold', halign: 'center', cellPadding: 2 },
            bodyStyles: { fontSize: 7, cellPadding: 2 },
            columnStyles: { 0:{halign:'center',cellWidth:14}, 1:{cellWidth:40}, 2:{halign:'center',cellWidth:16}, 3:{halign:'center',cellWidth:12}, 4:{halign:'right',cellWidth:18}, 5:{halign:'right',cellWidth:18}, 6:{halign:'center',cellWidth:14}, 7:{halign:'right',cellWidth:22}, 8:{halign:'right',cellWidth:22} },
            margin: { left: margin, right: margin }, tableWidth: contentWidth,
            alternateRowStyles: { fillColor: [240, 245, 250] }
          });
        } else {
          const tableBody = (seccion.partidas || []).map(p => {
            const qty = parseFloat(p.cantidad) || 0;
            const precio = parseFloat(p.precio_lista) || 0;
            const subtotal = qty * precio;
            const mgn = parseFloat(p.porcentaje_mgn) || 0;
            const moneda = p.moneda || 'MN';
            const tc = parseFloat(projectData.tipo_cambio) || 20;
            let totalMN, totalUSD;
            if (moneda === 'USD') { totalUSD = subtotal * (1 + mgn / 100); totalMN = totalUSD * tc; }
            else { totalMN = subtotal * (1 + mgn / 100); totalUSD = totalMN / tc; }
            return [
              p.numero_partida || '', p.descripcion || '', p.marca || '', p.modelo || '',
              p.cantidad || '', formatCurrency(p.precio_lista), moneda,
              formatCurrency(subtotal), p.porcentaje_mgn ? p.porcentaje_mgn + '%' : '',
              formatCurrency(totalMN), formatCurrency(totalUSD)
            ];
          });
          const secTotalMN = seccion.subtotal_mn || 0;
          const secTotalUSD = seccion.subtotal_usd || 0;
          tableBody.push([
            { content: 'TOTAL', colSpan: 9, styles: { halign: 'right', fontStyle: 'bold' } },
            { content: formatCurrency(secTotalMN), styles: { fontStyle: 'bold' } },
            { content: formatCurrency(secTotalUSD), styles: { fontStyle: 'bold' } }
          ]);
          doc.autoTable({
            startY: y,
            head: [['PDA', 'DESCRIPCIÓN', 'MARCA', 'MODELO', 'QTY', 'PRECIO', 'MON.', 'SUBTOTAL', '% MGN', 'TOTAL MN', 'TOTAL USD']],
            body: tableBody, theme: 'grid',
            headStyles: { fillColor: [26, 58, 92], fontSize: 7, fontStyle: 'bold', halign: 'center', cellPadding: 2 },
            bodyStyles: { fontSize: 7, cellPadding: 2 },
            columnStyles: { 0:{halign:'center',cellWidth:10}, 1:{cellWidth:32}, 2:{cellWidth:16}, 3:{cellWidth:16}, 4:{halign:'center',cellWidth:10}, 5:{halign:'right',cellWidth:18}, 6:{halign:'center',cellWidth:12}, 7:{halign:'right',cellWidth:18}, 8:{halign:'center',cellWidth:12}, 9:{halign:'right',cellWidth:22}, 10:{halign:'right',cellWidth:20} },
            margin: { left: margin, right: margin }, tableWidth: contentWidth,
            alternateRowStyles: { fillColor: [240, 245, 250] }
          });
        }
        y = doc.lastAutoTable.finalY + 8;
      }
    }

    // ── CONDICIONES COMERCIALES ──
    if (sel.condiciones && projectData.condiciones && projectData.condiciones.length > 0) {
      checkPageBreak(20);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(26, 58, 92);
      doc.text('Condiciones Comerciales', margin, y);
      y += 6;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(0, 0, 0);
      for (const cond of projectData.condiciones) {
        const text = (cond.codigo || '') + ' ' + (cond.contenido || '');
        const lines = doc.splitTextToSize(text, contentWidth);
        checkPageBreak(lines.length * 3.5 + 4);
        doc.text(lines, margin, y);
        y += lines.length * 3.5 + 2;
      }
    }

    // ── TOTALES Y NOTAS ──
    if (sel.totales) {
      checkPageBreak(40);
      y += 5;
      doc.setDrawColor(0, 100, 180);
      doc.setLineWidth(0.3);
      doc.line(120, y - 2, pageWidth - margin, y - 2);

      const subtotal = projectData.subtotal_mn || calculateSubtotalMN();
      const iva = subtotal * 0.16;
      const totalMN = subtotal + iva;
      const totalUSD = totalMN / (parseFloat(projectData.tipo_cambio) || 20);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(40, 40, 40);

      doc.text('SUBTOTAL:', 130, y);
      doc.text(formatCurrency(subtotal), pageWidth - margin, y, { align: 'right' });
      y += 5;
      doc.text('IVA (16%):', 130, y);
      doc.text(formatCurrency(iva), pageWidth - margin, y, { align: 'right' });
      y += 6;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(26, 58, 92);
      doc.text('TOTAL:', 130, y);
      doc.text(formatCurrency(totalMN), pageWidth - margin, y, { align: 'right' });
      y += 8;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(80, 80, 80);
      const totalLetras = projectData.total_letras || numberToWords(totalMN);
      const letrasLines = doc.splitTextToSize(totalLetras, contentWidth);
      doc.text(letrasLines, margin, y);
      y += letrasLines.length * 3.5 + 6;

      checkPageBreak(25);
      doc.setFontSize(7);
      doc.setTextColor(100, 100, 100);
      doc.text('Nota: precios en Pesos Mexicanos MN, precios sujetos a cambio sin previo aviso', margin, y);
      y += 4;
      doc.text('TÉRMINOS Y CONDICIONES: Condiciones de Pago: 90 DÍAS', margin, y);
      y += 8;

      doc.setTextColor(40, 40, 40);
      doc.setFontSize(8);
      doc.text('Para cualquier aclaración con respecto a esta cotización, favor de comunicarse al', margin, y);
      y += 4;
      doc.setTextColor(0, 100, 180);
      doc.text('correo integraqro07@outlook.com', margin, y);
      y += 6;
      doc.setTextColor(40, 40, 40);
      doc.text('Atención: Jose Moreno Rangel  tel: 447 7214891', margin, y);
    }

    const filename = 'Cotizacion_' + (projectData.numero_proyecto || 'SN') + '.pdf';
    doc.save(filename);

    hideLoading();
    showToast('PDF generado exitosamente', 'success');

  } catch (error) {
    hideLoading();
    console.error('Error generating PDF:', error);
    showToast('Error al generar el PDF: ' + error.message, 'error');
  }
}


async function generateCotizacionPDF() {
  try {
    showLoading();

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'mm', 'letter');
    const pageWidth = 215.9;
    const pageHeight = 279.4;
    const margin = 15;
    const contentWidth = pageWidth - 2 * margin;
    let y = 15;

    function checkPageBreak(needed) {
      if (y + needed > pageHeight - 25) {
        doc.addPage();
        y = 20;
        return true;
      }
      return false;
    }

    // Load and add logo (Larger logo)
    try {
      const logoImg = await loadImageAsBase64('/static/img/logo.png');
      if (logoImg) {
        doc.addImage(logoImg, 'PNG', margin, 10, 48, 22);
      }
    } catch(e) {
      console.warn('Could not load logo:', e);
    }

    // Slogans text next to logo (Larger font, no border box)
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(70, 70, 70);
    const rawSlogans = projectData.empresa_slogan || "Integracion de sistemas Automatizados\nProgramacion de PLC, HMI\nServicio de Diseño y Armado Tableros\nPolizas de Mantenimiento";
    const sloganLines = rawSlogans.split('\n');
    let sy = 13;
    sloganLines.forEach(line => {
      doc.text(line, margin + 52, sy);
      sy += 3.8;
    });

    // Header Right
    const vendedor = projectData.vendedor_config?.vendedor || 'Jose Moreno Rangel';
    const vendTel = projectData.vendedor_config?.vendedor_telefono || '442 7214891';
    doc.setTextColor(0, 100, 180);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.text(`Atención: ${vendedor} tel: ${vendTel}`, pageWidth - margin, y, { align: 'right' });
    y += 5;

    doc.setFillColor(26, 58, 92);
    doc.rect(pageWidth - margin - 70, y, 70, 7, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(255, 255, 255);
    doc.text("COTIZACION", pageWidth - margin - 35, y + 5, { align: 'center' });
    y += 10;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(40, 40, 40);
    doc.text("COTIZACION No.", pageWidth - margin - 70, y);
    doc.text(projectData.numero_proyecto || '---', pageWidth - margin, y, { align: 'right' });
    y += 5;

    doc.text("FECHA", pageWidth - margin - 70, y);
    doc.setFont('helvetica', 'normal');
    doc.text(formatDate(projectData.fecha_creacion), pageWidth - margin, y, { align: 'right' });
    y += 5;

    doc.setFont('helvetica', 'bold');
    doc.text("VENCIMIENTO", pageWidth - margin - 70, y);
    doc.setFont('helvetica', 'normal');
    doc.text(formatDate(projectData.fecha_vencimiento), pageWidth - margin, y, { align: 'right' });
    y += 6;

    // Reference under date details
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(26, 58, 92);
    const refText = (projectData.referencia || '').toUpperCase();
    const refLines = doc.splitTextToSize(refText, 70);
    doc.text(refLines, pageWidth - margin, y, { align: 'right' });
    y += refLines.length * 4;

    // Header Left (placed below logo at y=36)
    let leftY = 36;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(40, 40, 40);
    doc.text("Atención: ", margin, leftY);
    doc.setFont('helvetica', 'normal');
    doc.text(projectData.atencion || '', margin + 16, leftY);
    leftY += 5;

    doc.setFont('helvetica', 'bold');
    doc.text("TEL: ", margin, leftY);
    doc.setFont('helvetica', 'normal');
    doc.text(`52 ${projectData.telefono_cliente || ''}`, margin + 8, leftY);

    doc.setFont('helvetica', 'bold');
    doc.text("Empresa: ", margin + 45, leftY);
    doc.setFont('helvetica', 'normal');
    doc.text(projectData.empresa_cliente || '', margin + 61, leftY);
    leftY += 5;

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 100, 180);
    doc.text("E-mail", margin, leftY);
    doc.setDrawColor(0, 100, 180);
    doc.setLineWidth(0.3);
    doc.line(margin, leftY + 1, margin + 10, leftY + 1);
    leftY += 6;

    const emailText = projectData.email_cliente || '';
    doc.setFont('helvetica', 'normal');
    doc.text(emailText, margin, leftY);
    if (emailText) {
      doc.line(margin, leftY + 1, margin + Math.min(doc.getTextWidth(emailText), contentWidth/2), leftY + 1);
    }

    y = Math.max(y, 52) + 4;

    // Build flat partidas list
    const tableBody = [];
    let pda = 1;
    let subtotal = 0;
    
    if (projectData.secciones) {
      projectData.secciones.forEach(sec => {
        if (['PRESE', 'REPORTE', 'CONDICIONES', 'LISTAS', 'INSUMOS'].includes(sec.codigo)) return;
        if (sec.partidas) {
          sec.partidas.forEach(p => {
            const qty = parseFloat(p.cantidad) || 1;
            const precio_lista = parseFloat(p.precio_lista) || 0;
            const total_mn = parseFloat(p.total_mn) || (qty * precio_lista);
            const total_usd = parseFloat(p.total_usd) || 0;
            let t = total_mn;
            if (projectData.moneda === 'USD') {
              t = total_usd;
            }
            const precio_unit = precio_lista || (qty ? t / qty : 0);
            subtotal += t;

            tableBody.push([
              pda++,
              p.descripcion || '',
              precio_unit > 0 ? formatCurrency(precio_unit) : '',
              qty,
              t > 0 ? formatCurrency(t) : '-'
            ]);
          });
        }
      });
    }

    doc.autoTable({
      startY: y,
      head: [['Partida', 'Descripcion', 'Precio', 'Cantidad', 'Sub Total']],
      body: tableBody,
      theme: 'grid',
      headStyles: {
        fillColor: [26, 58, 92],
        fontSize: 9,
        fontStyle: 'bold',
        halign: 'center',
        cellPadding: 3
      },
      bodyStyles: {
        fontSize: 9,
        cellPadding: 3,
        textColor: [40, 40, 40]
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 15 },
        1: { cellWidth: 105.9 },
        2: { halign: 'right', cellWidth: 22 },
        3: { halign: 'center', cellWidth: 15 },
        4: { halign: 'right', cellWidth: 28 }
      },
      margin: { left: margin, right: margin },
      tableWidth: contentWidth
    });

    y = doc.lastAutoTable.finalY + 4;

    // Delivery time banner
    checkPageBreak(12);
    doc.setFillColor(240, 240, 240);
    doc.rect(margin, y, contentWidth, 7, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(40, 40, 40);
    const tiempoEntregaText = (projectData.tiempo_entrega || '8- DIAS HABILES').toUpperCase();
    doc.text(`TIEMPO DE ENTREGA ${tiempoEntregaText}`, margin + 3, y + 5);
    y += 12;

    // Totals Block with dynamic IVA % and BOTH Total MN & Total USD
    checkPageBreak(30);
    const pctIva = projectData.porcentaje_iva !== undefined ? parseFloat(projectData.porcentaje_iva) : 16;
    const iva = subtotal * (pctIva / 100);
    const totalMN = subtotal + iva;
    const totalUSD = totalMN / (parseFloat(projectData.tipo_cambio) || 20);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(40, 40, 40);

    doc.text("SUB TOTAL", pageWidth - margin - 55, y, { align: 'right' });
    doc.text("$", pageWidth - margin - 35, y);
    doc.text(subtotal > 0 ? formatCurrency(subtotal).replace('$', '').trim() : '-', pageWidth - margin, y, { align: 'right' });
    y += 5;

    doc.text(`IVA (${pctIva}%)`, pageWidth - margin - 55, y, { align: 'right' });
    doc.text(iva > 0 ? formatCurrency(iva).replace('$', '').trim() : '-', pageWidth - margin, y, { align: 'right' });
    y += 5;

    doc.setFont('helvetica', 'bold');
    doc.text("TOTAL MN", pageWidth - margin - 55, y, { align: 'right' });
    doc.text(totalMN > 0 ? formatCurrency(totalMN).replace('$', '').trim() : '-', pageWidth - margin, y, { align: 'right' });
    y += 5;

    doc.setTextColor(0, 100, 180);
    doc.text("TOTAL USD", pageWidth - margin - 55, y, { align: 'right' });
    doc.text(totalUSD > 0 ? formatCurrency(totalUSD).replace('$', '').trim() : '-', pageWidth - margin, y, { align: 'right' });
    y += 8;

    // Total in words
    checkPageBreak(15);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(40, 40, 40);
    let letras = numberToWords(totalMN).toUpperCase();
    if (projectData.moneda === 'USD') {
      letras = letras.replace("PESOS", "DOLARES").replace("M.N.", "USD");
    }
    doc.text(letras, pageWidth / 2, y, { align: 'center' });
    y += 6;

    const condPago = projectData.condiciones_pago || 'Condiciones de Pago : 90 DIAS';
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(40, 40, 40);
    doc.text(`TERMINOS Y CONDICIONES: ${condPago}`, pageWidth / 2, y, { align: 'center' });
    y += 8;

    // Clarification text & Bullet points
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(40, 40, 40);
    const aclaraText = projectData.texto_aclaracion || "Para cualquier aclaración con respecto a esta cotización o para colocar su orden, favor de comunicarse al correo integraqro07@outlook.com";
    const aclaraLines = doc.splitTextToSize(aclaraText, contentWidth);
    
    checkPageBreak(aclaraLines.length * 4 + 30);
    doc.text(aclaraLines, margin, y);
    y += aclaraLines.length * 4 + 3;

    // Dynamic Bullets
    const bulletsList = (projectData.notas_bullets && projectData.notas_bullets.length > 0) ? projectData.notas_bullets : [
      'Tiempo de Entrega: Los días de entrega serán considerados a partir de la recepción de su orden de compra. Este tiempo de entrega es SALVO PREVIA VENTA.',
      'Si esta cotización es en pesos y el tipo de cambio sufre una variación mayor al 2%, esta cotización pierde su validez.',
      'Vigencia: 30 días para cotizaciones en Pesos y Dólares.'
    ];

    bulletsList.forEach(b => {
      const bText = `• ${b}`;
      const bLines = doc.splitTextToSize(bText, contentWidth);
      checkPageBreak(bLines.length * 3.8 + 2);
      doc.text(bLines, margin, y);
      y += bLines.length * 3.8 + 2;
    });

    const notaAclaracion = projectData.nota_aclaracion || 'precios en Pesos Mexicanos MN ,precios sujetos a cambio sin previo aviso';
    doc.setTextColor(80, 80, 80);
    doc.text(`Nota : ${notaAclaracion}`, margin, y, { maxWidth: contentWidth });
    y += doc.splitTextToSize(`Nota : ${notaAclaracion}`, contentWidth).length * 3.8 + 6;

    const filename = `Cotizacion_${projectData.numero_proyecto || 'SN'}.pdf`;
    doc.save(filename);

    hideLoading();
    showToast('PDF generado exitosamente', 'success');

  } catch (error) {
    hideLoading();
    console.error('Error generating PDF:', error);
    showToast('Error al generar el PDF: ' + error.message, 'error');
  }
}

function loadImageAsBase64(url) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = function() {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      } catch(e) {
        resolve(null);
      }
    };
    img.onerror = function() { resolve(null); };
    img.src = url;
  });
}
