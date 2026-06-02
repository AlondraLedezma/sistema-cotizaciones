async function generatePDF() {
  if (!projectData) {
    showToast('No hay datos del proyecto para generar el PDF', 'error');
    return;
  }

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

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(26, 58, 92);
    doc.text('DEMATIQ', margin, y);
    y += 6;

    doc.setFontSize(10);
    doc.text('AUTOMATIZACIÓN', margin, y);
    y += 3;

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80, 80, 80);
    doc.text('Integración de sistemas Automatizados', 70, 15);
    doc.text('Programación de PLC, HMI', 70, 19);
    doc.text('Servicio de Diseño y Armado Tableros', 70, 23);
    doc.text('Pólizas de Mantenimiento', 70, 27);

    doc.setTextColor(0, 100, 180);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('Ventas: Jose Moreno Rangel', 130, 15);

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
    doc.text(`52 ${projectData.telefono_cliente || ''}`, margin + 10, y);

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

    if (projectData.secciones && projectData.secciones.length > 0) {
      for (const seccion of projectData.secciones) {
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
              p.numero_partida || '',
              p.descripcion || '',
              p.horas_mo || '',
              p.dias_trabajo || '',
              formatCurrency(p.costo_hora_usd),
              formatCurrency(subtotal),
              p.porcentaje_mgn ? p.porcentaje_mgn + '%' : '',
              formatCurrency(totalUSD),
              formatCurrency(totalMN)
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
            body: tableBody,
            theme: 'grid',
            headStyles: {
              fillColor: [26, 58, 92],
              fontSize: 7,
              fontStyle: 'bold',
              halign: 'center',
              cellPadding: 2
            },
            bodyStyles: {
              fontSize: 7,
              cellPadding: 2
            },
            columnStyles: {
              0: { halign: 'center', cellWidth: 14 },
              1: { cellWidth: 40 },
              2: { halign: 'center', cellWidth: 16 },
              3: { halign: 'center', cellWidth: 12 },
              4: { halign: 'right', cellWidth: 18 },
              5: { halign: 'right', cellWidth: 18 },
              6: { halign: 'center', cellWidth: 14 },
              7: { halign: 'right', cellWidth: 22 },
              8: { halign: 'right', cellWidth: 22 }
            },
            margin: { left: margin, right: margin },
            tableWidth: contentWidth,
            alternateRowStyles: {
              fillColor: [240, 245, 250]
            }
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
            if (moneda === 'USD') {
              totalUSD = subtotal * (1 + mgn / 100);
              totalMN = totalUSD * tc;
            } else {
              totalMN = subtotal * (1 + mgn / 100);
              totalUSD = totalMN / tc;
            }

            return [
              p.numero_partida || '',
              p.descripcion || '',
              p.marca || '',
              p.modelo || '',
              p.cantidad || '',
              formatCurrency(p.precio_lista),
              moneda,
              formatCurrency(subtotal),
              p.porcentaje_mgn ? p.porcentaje_mgn + '%' : '',
              formatCurrency(totalMN),
              formatCurrency(totalUSD)
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
            body: tableBody,
            theme: 'grid',
            headStyles: {
              fillColor: [26, 58, 92],
              fontSize: 7,
              fontStyle: 'bold',
              halign: 'center',
              cellPadding: 2
            },
            bodyStyles: {
              fontSize: 7,
              cellPadding: 2
            },
            columnStyles: {
              0: { halign: 'center', cellWidth: 10 },
              1: { cellWidth: 32 },
              2: { cellWidth: 16 },
              3: { cellWidth: 16 },
              4: { halign: 'center', cellWidth: 10 },
              5: { halign: 'right', cellWidth: 18 },
              6: { halign: 'center', cellWidth: 12 },
              7: { halign: 'right', cellWidth: 18 },
              8: { halign: 'center', cellWidth: 12 },
              9: { halign: 'right', cellWidth: 22 },
              10: { halign: 'right', cellWidth: 20 }
            },
            margin: { left: margin, right: margin },
            tableWidth: contentWidth,
            alternateRowStyles: {
              fillColor: [240, 245, 250]
            }
          });
        }

        y = doc.lastAutoTable.finalY + 8;
      }
    }

    if (projectData.condiciones && projectData.condiciones.length > 0) {
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
        const text = `${cond.codigo || ''} ${cond.contenido || ''}`;
        const lines = doc.splitTextToSize(text, contentWidth);

        checkPageBreak(lines.length * 3.5 + 4);

        doc.text(lines, margin, y);
        y += lines.length * 3.5 + 2;
      }
    }

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
