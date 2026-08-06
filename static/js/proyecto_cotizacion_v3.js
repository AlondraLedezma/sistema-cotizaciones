let projectData = null;

let currentTab = 'REPORTE';

let unsavedChanges = false;



const TABS = [

  { code: 'PRESE',       label: 'PRESE',        color: '#1e293b', icon: 'fa-file-alt' },

  { code: 'REPORTE',     label: 'REPORTE',       color: '#16a34a', icon: 'fa-chart-bar' },

  { code: 'ING_MO',      label: 'ING. MO',       color: '#2196F3', icon: 'fa-cogs' },

  { code: 'E_CONTROL',   label: 'E. CONTROL',    color: '#0d47a1', icon: 'fa-microchip' },

  { code: 'E_ELECTRICO', label: 'E. EL├ëCTRICO',  color: '#1976d2', icon: 'fa-bolt' },

  { code: 'E_NEUMATICO', label: 'E. NEUM├üTICO',  color: '#00897b', icon: 'fa-wind' },

  { code: 'E_MECANICO',  label: 'E. MEC├üNICO',   color: '#e65100', icon: 'fa-wrench' },

  { code: 'INSUMOS',     label: 'INSUMOS Y MÁS', color: '#c62828', icon: 'fa-box' },

  { code: 'LISTAS',      label: 'LISTAS',        color: '#546e7a', icon: 'fa-list-ol' },

  { code: 'IO',          label: 'I/O',           color: '#455a64', icon: 'fa-plug' },

  { code: 'CONDICIONES', label: 'CONDICIONES',   color: '#546e7a', icon: 'fa-handshake' }

];



const tipoCambio = () => parseFloat(document.getElementById('field-tipo-cambio')?.value) || 20;



const debouncedSavePartida  = debounce(savePartidaToAPI, 800);

const debouncedSaveProject  = debounce(saveProjectToAPI, 1000);

const debouncedSaveCondicion = debounce(saveCondicionToAPI, 800);

const debouncedSavePunto    = debounce(savePuntoToAPI, 800);

const debouncedSaveIO       = debounce(saveIOToAPI, 800);

const debouncedSaveInsumo   = debounce(saveInsumoToAPI, 800);



document.addEventListener('DOMContentLoaded', async () => {

  const user = await checkAuth();

  if (!user) return;



  const params = new URLSearchParams(window.location.search);
  let id = params.get('id');
  if (!id) {
    const parts = window.location.pathname.split('/');
    id = parts[parts.length - 1];
  }
  const action = params.get('action');

  if (!id) { window.location.href = '/dashboard'; return; }



  await loadProject(id);



  const headerFields = ['field-atencion','field-telefono','field-empresa','field-email',

    'field-fecha','field-vencimiento','field-tipo-cambio','field-referencia','field-descripcion','field-carpeta','field-dias-vigencia'];

  headerFields.forEach(fid => {

    const el = document.getElementById(fid);

    if (el) el.addEventListener('input', () => { unsavedChanges = true; debouncedSaveProject(); });

  });



  const fechaField = document.getElementById('field-fecha');

  const diasField = document.getElementById('field-dias-vigencia');

  if (fechaField) fechaField.addEventListener('change', () => { autoCalcVencimiento(); });

  if (diasField) diasField.addEventListener('input', () => { autoCalcVencimiento(); });



  const tcField = document.getElementById('field-tipo-cambio');

  if (tcField) tcField.addEventListener('input', () => { recalculateAllSections(); updateTotals(); recalcAllGastos(); });



  if (action === 'pdf') setTimeout(() => generatePDF(), 500);



  window.addEventListener('beforeunload', e => {

    if (unsavedChanges) { e.preventDefault(); e.returnValue = ''; }

  });

});



async function loadProject(id) {

  try {

    showLoading();

    const result = await apiCall(`/api/proyecto/${id}`);

    // result = {proyecto: {...}, secciones: [...], condiciones: [...], ...}
    // Merge proyecto fields into projectData root + attach secciones/condiciones
    projectData = result.proyecto || {};
    projectData.secciones = result.secciones || [];
    projectData.condiciones = result.condiciones || [];
    projectData.subtemas = result.subtemas || [];
    projectData.listas = result.listas || [];
    projectData.insumos_cd = result.insumos_cd || [];
    projectData.insumos_en_cd = result.insumos_en_cd || [];
    projectData.insumos_transporte = result.insumos_transporte || [];
    projectData.insumos_gastos_admin = result.insumos_gastos_admin || [];
    projectData.insumos_imss = result.insumos_imss || [];

    renderHeader();

    renderTabs();

    recalculateAllSections();

    const defTab = (projectData && projectData.tipo_proyecto === 'cotizacion') ? 'COTIZACION' : 'REPORTE';
    switchTab(defTab);

    updateTotals();

    hideLoading();

  } catch (error) {

    hideLoading();

    showToast('Error al cargar el proyecto', 'error');

    console.error(error);

    setTimeout(() => window.location.href = '/dashboard', 2000);

  }

}



function renderHeader() {

  if (!projectData) return;

  const nombreEl = document.getElementById('proyecto-nombre');
  nombreEl.textContent = projectData.nombre_proyecto || 'Sin nombre';
  nombreEl.contentEditable = true;
  nombreEl.onblur = () => saveProjectName(nombreEl.textContent.trim());
  nombreEl.onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); nombreEl.blur(); } };

  document.getElementById('proyecto-numero').textContent = `No. ${projectData.numero_proyecto || '---'}`;

  document.getElementById('field-numero').textContent = projectData.numero_proyecto || '---';

  document.getElementById('field-atencion').value   = projectData.atencion || '';

  document.getElementById('field-telefono').value   = projectData.telefono_cliente || '';

  document.getElementById('field-empresa').value    = projectData.empresa_cliente || '';

  document.getElementById('field-email').value      = projectData.email_cliente || '';

  document.getElementById('field-tipo-cambio').value = projectData.tipo_cambio_usd || projectData.tipo_cambio || 20;

  document.getElementById('field-referencia').value = projectData.referencia || '';

  document.getElementById('field-descripcion').value = projectData.descripcion_solucion || '';

  document.getElementById('field-dias-vigencia').value = projectData.dias_vigencia || 30;

  projectData.dias_vigencia = projectData.dias_vigencia || 30;



  renderCarpetaField();

  document.title = `DEMATIQ - ${projectData.nombre_proyecto || 'Proyecto'}`;

}



function renderCarpetaField() {

  const container = document.getElementById('carpeta-field-container');

  if (!container) return;

  const link = projectData.carpeta_link || '';

  container.innerHTML = link

    ? `<a href="${escapeAttr(link)}" target="_blank" class="carpeta-link"><i class="fas fa-folder-open"></i> ${link}</a>

       <button class="btn btn-ghost btn-sm" onclick="editCarpetaLink()"><i class="fas fa-edit"></i></button>`

    : `<input type="text" id="field-carpeta" class="input-field" placeholder="Ruta a la carpeta del proyecto" value="${escapeAttr(link)}">`;

}



function editCarpetaLink() {

  const container = document.getElementById('carpeta-field-container');

  if (!container) return;

  container.innerHTML = `<input type="text" id="field-carpeta" class="input-field" placeholder="Ruta a la carpeta" value="${escapeAttr(projectData.carpeta_link || '')}">`;

  const inp = document.getElementById('field-carpeta');

  if (inp) { inp.focus(); inp.addEventListener('blur', saveCarpetaLink); }

}



async function saveCarpetaLink() {

  const inp = document.getElementById('field-carpeta');

  if (!inp || !projectData) return;

  projectData.carpeta_link = inp.value;

  await saveProjectToAPI();

  renderCarpetaField();

}



function openFolderLink() {

  if (projectData && projectData.carpeta_link) window.open(projectData.carpeta_link, '_blank');

}



function autoCalcVencimiento() {
  const fechaEl = document.getElementById('field-fecha-inline') || document.getElementById('field-fecha');
  const diasEl = document.getElementById('field-dias-vigencia-inline') || document.getElementById('field-dias-vigencia');
  const vencEl = document.getElementById('field-vencimiento-inline') || document.getElementById('field-vencimiento');

  if (!fechaEl || !diasEl || !vencEl) return;

  const fecha = fechaEl.value;
  const dias = parseInt(diasEl.value) || 30;

  projectData.fecha_creacion = fecha;
  projectData.dias_vigencia = dias;

  if (fecha && dias >= 0) {
    const cleanFecha = fecha.split(/[ T]/)[0];
    const fechaDate = new Date(cleanFecha + 'T00:00:00');
    fechaDate.setDate(fechaDate.getDate() + dias);
    const year = fechaDate.getFullYear();
    const month = String(fechaDate.getMonth() + 1).padStart(2, '0');
    const day = String(fechaDate.getDate()).padStart(2, '0');
    const newVenc = `${year}-${month}-${day}`;
    vencEl.value = newVenc;
    projectData.fecha_vencimiento = newVenc;
  }
}



function renderTabs() {
  const tabsBar = document.getElementById('tabs-bar');
  if (!tabsBar) return;
  tabsBar.innerHTML = '';

  let visibleTabs = TABS;
  if (projectData && projectData.tipo_proyecto === 'cotizacion') {
    visibleTabs = [
      { code: 'COTIZACION', label: 'COTIZACIÓN', color: '#16a34a', icon: 'fa-file-invoice-dollar' },
      { code: 'CONDICIONES', label: 'CONDICIONES', color: '#546e7a', icon: 'fa-handshake' }
    ];
  }

  visibleTabs.forEach(tab => {
    const el = document.createElement('button');
    el.className = 'excel-tab' + (tab.code === currentTab ? ' active' : '');
    el.style.background = tab.color;
    el.dataset.tab = tab.code;
    el.innerHTML = `<i class="fas ${tab.icon}"></i> ${tab.label}`;
    el.onclick = () => switchTab(tab.code);
    tabsBar.appendChild(el);
  });
}



function switchTab(tabCode) {

  currentTab = tabCode;

  document.querySelectorAll('.excel-tab').forEach(el => {

    el.classList.toggle('active', el.dataset.tab === tabCode);

  });



  const content = document.getElementById('tab-content');

  if (!content) return;

  content.innerHTML = '';



  const seccion = projectData?.secciones?.find(s => (s.codigo || s.id?.toString()) === tabCode);



  switch (tabCode) {
    case 'COTIZACION':  renderCotizacionTable(content); break;
    case 'PRESE':       renderPrese(content); break;

    case 'REPORTE':     renderReporte(content); break;

    case 'ING_MO':      if (seccion) renderIngMoTable(content, seccion); break;

    case 'E_CONTROL':   if (seccion) renderEquipoTable(content, seccion); break;

    case 'E_ELECTRICO': renderElectricoTab(content); break;

    case 'E_NEUMATICO': if (seccion) renderEquipoTable(content, seccion); break;

    case 'E_MECANICO':  if (seccion) renderMecanicoTable(content, seccion); break;

    case 'INSUMOS':     renderInsumosTab(content); break;

    case 'LISTAS':      renderListasTab(content); break;

    case 'IO':          renderIOTab(content); break;

    case 'CONDICIONES': renderCondiciones(content); break;

    default:

      if (seccion) {

        if (seccion.tipo === 'mano_obra') renderIngMoTable(content, seccion);

        else renderEquipoTable(content, seccion);

      }

  }

}



function renderPrese(container) {

  const pd = projectData || {};

  const subtotal = calculateSubtotalMN();

  const iva = subtotal * 0.16;

  const totalMN = subtotal + iva;

  const totalUSD = totalMN / tipoCambio();

  const logoData = pd.logo_data || '';

  const empresaSlogan = pd.empresa_slogan || '';

  const diasVigencia = pd.dias_vigencia || 30;

  container.innerHTML = `

    <div class="prese-header-info">

      <div class="reporte-info-panel" style="margin-bottom:20px;">

        <div class="reporte-info-row"><span class="reporte-info-label">EMPRESA</span><span class="reporte-info-value">${pd.empresa_cliente || '---'}</span></div>

        <div class="reporte-info-row"><span class="reporte-info-label">ATENCI├ôN</span><span class="reporte-info-value">${pd.atencion || '---'}</span></div>

        <div class="reporte-info-row"><span class="reporte-info-label">COT. NO.</span><span class="reporte-info-value">${pd.numero_proyecto || '---'}</span></div>

        <div class="reporte-info-row"><span class="reporte-info-label">FECHA</span><span class="reporte-info-value">${formatDate(pd.fecha_creacion)}</span></div>

        <div class="reporte-info-row"><span class="reporte-info-label">VENCIMIENTO</span><span class="reporte-info-value">${formatDate(pd.fecha_vencimiento) || '---'}</span></div>

        <div class="reporte-info-row" style="border-bottom:none;"><span class="reporte-info-label">DÍAS DE VIGENCIA</span><span class="reporte-info-value">${diasVigencia} días</span></div>

      </div>

    </div>

    <div style="margin-bottom:16px;display:flex;align-items:center;gap:16px;padding:12px;border:1px solid #e2e8f0;border-radius:6px;background:#fafafa;">
      ${logoData ? `<img src="${logoData}" style="max-height:80px;max-width:200px;object-fit:contain;" />` : `<div style="font-size:12px;color:#94a3b8;font-style:italic;">(Logo configurable desde la pestaña LISTAS)</div>`}
      <div style="font-family:var(--font-heading);font-size:13px;color:#334155;white-space:pre-wrap;line-height:1.5;">${escapeHtml(empresaSlogan || 'Integración de sistemas Automatizados\nProgramación de PLC, HMI\nServicio de Diseño y Armado Tableros\nPólizas de Mantenimiento')}</div>
    </div>

    <div class="prese-section">
      <div class="prese-section-title"><i class="fas fa-file-alt" style="margin-right:8px;"></i>DESCRIPCIÓN DE LA SOLUCIÓN</div>
      <div style="padding:12px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 6px 6px;">
        <textarea class="punto-textarea" style="min-height:80px;width:100%;" 
          oninput="saveDescripcionSolucion(this.value)"
          onchange="saveDescripcionSolucion(this.value)">${escapeHtml(pd.descripcion_solucion || '')}</textarea>
      </div>
    </div>

    <div class="prese-section">

      <div class="prese-section-title"><i class="fas fa-list-ul" style="margin-right:8px;"></i>PUNTOS GENERALES (A1.x)</div>

      <div id="prese-alcance1-list" style="padding:8px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 6px 6px;">

        <div class="loading-inline">Cargando...</div>

      </div>

      <button class="excel-add-btn" onclick="addPunto('prese_alcance1')"><i class="fas fa-plus"></i> Agregar Punto</button>

    </div>

    <div class="prese-section">

      <div class="prese-section-title"><i class="fas fa-building" style="margin-right:8px;"></i>ALCANCE DE DEMATIQ AUTOMATIZACI├ôN (A2.x)</div>

      <div id="prese-alcance2-list" style="padding:8px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 6px 6px;">

        <div class="loading-inline">Cargando...</div>

      </div>

      <button class="excel-add-btn" onclick="addPunto('prese_alcance2')"><i class="fas fa-plus"></i> Agregar Punto</button>

    </div>

    <div style="margin-top:24px;display:flex;gap:20px;flex-wrap:wrap;">

      <div style="flex:1;min-width:260px;padding:20px;background:#e0f7fa;border-radius:8px;border:1px solid #b2ebf2;">

        <h4 style="font-family:var(--font-heading);font-size:14px;font-weight:700;margin-bottom:12px;color:#006064;text-transform:uppercase;letter-spacing:1px;border-bottom:1px solid #b2ebf2;padding-bottom:8px;">MONEDA NACIONAL</h4>

        <div style="display:grid;grid-template-columns:120px 1fr;gap:8px;align-items:center;">

          <span style="color:#37474f;font-family:var(--font-heading);font-weight:600;">SUBTOTAL:</span>

          <span style="text-align:right;font-weight:600;">${formatCurrency(subtotal)}</span>

          <span style="color:#37474f;font-family:var(--font-heading);font-weight:600;">IVA 16%:</span>

          <span style="text-align:right;font-weight:600;">${formatCurrency(iva)}</span>

          <span style="color:#0d47a1;font-weight:700;font-family:var(--font-heading);font-size:16px;">TOTAL:</span>

          <span id="prese-total-mn" style="text-align:right;font-weight:700;font-size:22px;color:#0d47a1;">${formatCurrency(totalMN)}</span>

        </div>

        <p id="prese-total-letras" style="color:#37474f;font-size:12px;margin-top:10px;padding-top:10px;border-top:1px solid #b2ebf2;font-style:italic;">${numberToWords(totalMN)}</p>

      </div>

      <div style="flex:1;min-width:260px;padding:20px;background:#e3f2fd;border-radius:8px;border:1px solid #bbdefb;">

        <h4 style="font-family:var(--font-heading);font-size:14px;font-weight:700;margin-bottom:12px;color:#1565c0;text-transform:uppercase;letter-spacing:1px;border-bottom:1px solid #bbdefb;padding-bottom:8px;">DÓLARES (USD)</h4>

        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">

          <span style="color:#37474f;font-family:var(--font-heading);font-weight:600;font-size:13px;">TIPO DE CAMBIO:</span>

          <span style="font-weight:600;font-size:13px;">$${tipoCambio().toFixed(2)}</span>

        </div>

        <div style="display:flex;justify-content:space-between;align-items:center;">

          <span style="color:#37474f;font-family:var(--font-heading);font-weight:600;">TOTAL:</span>

          <span id="prese-total-usd" style="text-align:right;font-weight:700;font-size:22px;color:#1565c0;">${formatCurrency(totalUSD)}</span>

        </div>

      </div>

    </div>

  `;

  loadPuntos('prese_alcance1', 'prese-alcance1-list', 'A1');

  loadPuntos('prese_alcance2', 'prese-alcance2-list', 'A2');

}



async function saveDescripcionSolucion(val) {
  if (!projectData) return;
  projectData.descripcion_solucion = val;
  const descEl = document.getElementById('field-descripcion');
  if (descEl) descEl.value = val;
  unsavedChanges = true;
  debouncedSaveProject();
}



async function loadPuntos(tipo, containerId, prefix) {

  const container = document.getElementById(containerId);

  if (!container || !projectData) return;

  try {

    const result = await apiCall(`/api/legacy/puntos?action=list&proyecto_id=${projectData.id}&tipo=${tipo}`);

    const puntos = result.data || result.puntos || [];

    renderPuntosList(puntos, container, tipo, prefix);

  } catch(e) {

    container.innerHTML = '<p style="color:red;font-size:12px;">Error al cargar</p>';

  }

}



function renderPuntosList(puntos, container, tipo, prefix) {

  if (puntos.length === 0) {

    container.innerHTML = '<p style="color:var(--text-muted);font-size:12px;padding:8px;">Sin puntos. Agrega uno.</p>';

    return;

  }

  container.innerHTML = puntos.map((p, idx) => `

    <div class="punto-row" data-punto-id="${p.id}">

      <span class="punto-numero">${prefix}.${idx + 1}</span>

      <textarea class="punto-textarea" rows="2" onblur="handlePuntoBlur(${p.id}, this.value, '${tipo}', '${prefix}')">${escapeHtml(p.contenido || '')}</textarea>

      <button class="delete-row-btn" style="opacity:1;" onclick="deletePunto(${p.id}, '${tipo}', '${prefix}')"><i class="fas fa-times"></i></button>

    </div>

  `).join('');

}



async function addPunto(tipo) {

  if (!projectData) return;

  try {

    const prefix = tipo === 'prese_alcance1' ? 'A1' : (tipo === 'prese_alcance2' ? 'A2' : '');

    const result = await apiCall('/api/legacy/puntos?action=create', 'POST', { proyecto_id: projectData.id, tipo, contenido: '' });

    const containerId = tipo === 'prese_alcance1' ? 'prese-alcance1-list' : (tipo === 'prese_alcance2' ? 'prese-alcance2-list' : 'listas-list');

    await loadPuntos(tipo, containerId, prefix || '#');

    showToast('Punto agregado', 'success');

  } catch(e) { showToast('Error al agregar punto', 'error'); }

}



function handlePuntoBlur(id, value, tipo, prefix) {

  debouncedSavePunto(id, value);

}



async function savePuntoToAPI(id, contenido) {

  try { await apiCall('/api/legacy/puntos?action=update', 'POST', { id, contenido }); }

  catch(e) { console.error('Error saving punto:', e); }

}



async function deletePunto(id, tipo, prefix) {

  if (!confirm('┬┐Eliminar este punto?')) return;

  try {

    await apiCall('/api/legacy/puntos?action=delete', 'POST', { id });

    const containerId = tipo === 'prese_alcance1' ? 'prese-alcance1-list' : (tipo === 'prese_alcance2' ? 'prese-alcance2-list' : 'listas-list');

    await loadPuntos(tipo, containerId, prefix);

    showToast('Punto eliminado', 'success');

  } catch(e) { showToast('Error al eliminar', 'error'); }

}



function renderReporte(container) {

  if (!projectData) return;

  const tc = tipoCambio();

  const secciones = projectData.secciones || [];



  let totalUSD = 0;

  let totalMN = 0;



  const rows = secciones.map(s => {

    const usd = parseFloat(s.subtotal_usd) || 0;

    const mn  = parseFloat(s.subtotal_mn)  || 0;

    totalUSD += usd;

    totalMN  += mn;

    return `

      <tr>

        <td style="padding:8px 12px;">

          <span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:${s.color||'#4fc3f7'};margin-right:8px;vertical-align:middle;"></span>

          <strong>${s.titulo || s.codigo || '---'}</strong>

        </td>

        <td style="padding:8px 12px;"><span class="excel-display">$ USD</span></td>

        <td style="padding:8px 12px;text-align:right;font-weight:600;color:#0d47a1;">${formatCurrency(usd)}</td>

        <td style="padding:8px 12px;"><span class="excel-display">MN</span></td>

        <td style="padding:8px 12px;text-align:right;font-weight:600;color:#0d47a1;">${formatCurrency(mn)}</td>

      </tr>`;

  }).join('');



  container.innerHTML = `

    <div class="reporte-grid">

      <div>

        <div class="reporte-tipo-cambio">

          <span>TIPO CAMBIO D├ôLAR</span>

          <input type="number" class="reporte-tc-value" value="${tc.toFixed(2)}" step="0.01"

            oninput="handleTipoCambioChange(this.value)">

          <span style="margin-left:24px;">COTIZACION NO.</span>

          <span style="font-size:18px;color:#16a34a;margin-left:8px;">${projectData.numero_proyecto || '---'}</span>

        </div>

        <div class="excel-table-wrapper">

          <table class="excel-table">

            <thead><tr>

              <th style="min-width:200px;">SECCI├ôN</th>

              <th>$ USD</th>

              <th></th>

              <th>MN</th>

              <th style="min-width:140px;">$ MN</th>

            </tr></thead>

            <tbody>

              ${rows}

              <tr class="total-row">

                <td colspan="4" style="padding:10px 12px;font-weight:700;">TOTAL</td>

                <td style="padding:10px 12px;text-align:right;font-weight:700;">${formatCurrency(totalMN)}</td>

              </tr>

              <tr style="background:#e0f7fa;">

                <td colspan="3" style="padding:8px 12px;font-weight:700;">TOTAL USD</td>

                <td colspan="2" style="padding:8px 12px;text-align:right;font-weight:700;color:#0d47a1;">${formatCurrency(totalUSD)}</td>

              </tr>

            </tbody>

          </table>

        </div>

      </div>

      <div class="reporte-info-panel">

        <div class="reporte-info-row">

          <span class="reporte-info-label">EMPRESA</span>

          <span class="reporte-info-value">${projectData.empresa_cliente || '---'}</span>

        </div>

        <div class="reporte-info-row">

          <span class="reporte-info-label">ATENCI├ôN</span>

          <span class="reporte-info-value">${projectData.atencion || '---'}</span>

        </div>

        <div class="reporte-info-row">

          <span class="reporte-info-label">PROYECTO</span>

          <span class="reporte-info-value">${projectData.nombre_proyecto || '---'}</span>

        </div>

        <div class="reporte-info-row">

          <span class="reporte-info-label">FECHA</span>

          <span class="reporte-info-value">${formatDate(projectData.fecha_creacion)}</span>

        </div>

        <div class="reporte-info-row">

          <span class="reporte-info-label">REFERENCIA</span>

          <span class="reporte-info-value">${projectData.referencia || '---'}</span>

        </div>

      </div>

    </div>

  `;

}



function handleTipoCambioChange(val) {
  const tcField = document.getElementById('field-tipo-cambio');
  if (tcField) tcField.value = val;
  recalculateAllSections();
  updateTotals();
  recalcAllGastos();
  if (typeof currentTab !== 'undefined' && currentTab) switchTab(currentTab);
  debouncedSaveProject();
}



function renderIngMoTable(container, seccion) {

  const partidas = seccion.partidas || [];

  let totalUSD = 0, totalMN = 0;



  const rows = partidas.map((p, idx) => {

    const horas = parseFloat(p.horas_mo) || 0;

    const dias  = parseFloat(p.dias_trabajo) || 0;

    const costo = parseFloat(p.costo_hora_usd) || 0;

    const mgn   = parseFloat(p.porcentaje_mgn) || 0;

    const subtotal  = horas * dias * costo;

    const totalUsdR = subtotal * (1 + mgn / 100);

    const totalMnR  = totalUsdR * tipoCambio();

    totalUSD += totalUsdR;

    totalMN  += totalMnR;

    return `

      <tr data-partida-id="${p.id}" data-tipo="mano_obra" data-seccion-id="${seccion.id}">

        <td><span class="excel-display" style="text-align:center;">${p.numero_partida || idx+1}</span></td>

        <td><input class="excel-input" type="text" value="${escapeAttr(p.descripcion||'')}" data-field="descripcion" onchange="handleCellChange(this)" tabindex="0"></td>

        <td><input class="excel-input numeric" type="number" value="${horas||''}" data-field="horas_mo" oninput="handleNumericInput(this)" step="0.5" tabindex="0"></td>

        <td><input class="excel-input numeric" type="number" value="${dias||''}" data-field="dias_trabajo" oninput="handleNumericInput(this)" step="0.5" tabindex="0"></td>

        <td><input class="excel-input numeric" type="number" value="${costo||''}" data-field="costo_hora_usd" oninput="handleNumericInput(this)" step="0.01" tabindex="0"></td>

        <td><span class="excel-display" data-field="subtotal">${formatCurrency(subtotal)}</span></td>

        <td><input class="excel-input numeric" type="number" value="${mgn||''}" data-field="porcentaje_mgn" oninput="handleNumericInput(this)" step="1" tabindex="0"></td>

        <td><span class="excel-display" data-field="total_usd">${formatCurrency(totalUsdR)}</span></td>

        <td><span class="excel-display" data-field="total_mn">${formatCurrency(totalMnR)}</span></td>

        <td><button class="delete-row-btn" onclick="deletePartida(${p.id},'mano_obra','${seccion.id}')"><i class="fas fa-times"></i></button></td>

      </tr>`;

  }).join('');



  container.innerHTML = `

    <h3 class="tab-section-title"><span style="width:10px;height:10px;border-radius:2px;background:${seccion.color||'#2196F3'};display:inline-block;margin-right:8px;"></span>${seccion.titulo||'ING. Mano de Obra'}</h3>

    <div class="excel-table-wrapper">

      <table class="excel-table">

        <thead><tr>

          <th style="width:60px;">PARTIDA</th>

          <th style="min-width:220px;">INGENIER├ìA Y DESARROLLO</th>

          <th style="width:90px;">HORAS/MO</th>

          <th style="width:100px;">D├ìAS TRABAJO</th>

          <th style="width:100px;">C/HORA MN</th>

          <th style="width:110px;">SUB TOTAL</th>

          <th style="width:80px;">% MGN</th>

          <th style="width:120px;">TOTAL USD</th>

          <th style="width:120px;">TOTAL MN</th>

          <th style="width:40px;"></th>

        </tr></thead>

        <tbody>

          ${rows}

          <tr class="total-row">

            <td colspan="7" style="text-align:right;padding:10px 12px;">TOTAL</td>

            <td><span class="excel-display">${formatCurrency(totalUSD)}</span></td>

            <td><span class="excel-display">${formatCurrency(totalMN)}</span></td>

            <td></td>

          </tr>

        </tbody>

      </table>

    </div>

    <button class="excel-add-btn" onclick="addPartida('${seccion.id}','mano_obra')">

      <i class="fas fa-plus"></i> Agregar Partida

    </button>

  `;

}



function renderEquipoTable(container, seccion) {

  const partidas = seccion.partidas || [];

  const tc = tipoCambio();

  let totalMN = 0, totalUSD = 0;



  const rows = partidas.map((p, idx) => {

    const qty    = parseFloat(p.cantidad) || 0;

    const precio = parseFloat(p.precio_lista) || 0;

    const mgn    = parseFloat(p.porcentaje_mgn) || 0;

    const moneda = p.moneda || 'MN';

    const subtotal = qty * precio;

    let tmn, tusd;

    if (moneda === 'USD') { tusd = subtotal * (1 + mgn/100); tmn = tusd * tc; }

    else { tmn = subtotal * (1 + mgn/100); tusd = tmn / tc; }

    totalMN  += tmn;

    totalUSD += tusd;

    return `

      <tr data-partida-id="${p.id}" data-tipo="equipo" data-seccion-id="${seccion.id}">

        <td><span class="excel-display" style="text-align:center;">${p.numero_partida||idx+1}</span></td>

        <td><input class="excel-input" type="text" value="${escapeAttr(p.descripcion||'')}" data-field="descripcion" onchange="handleCellChange(this)" tabindex="0"></td>

        <td><input class="excel-input" type="text" value="${escapeAttr(p.marca||'')}" data-field="marca" onchange="handleCellChange(this)" tabindex="0"></td>

        <td><input class="excel-input" type="text" value="${escapeAttr(p.modelo||'')}" data-field="modelo" onchange="handleCellChange(this)" tabindex="0"></td>

        <td><input class="excel-input numeric" type="number" value="${qty||''}" data-field="cantidad" oninput="handleNumericInput(this)" step="1" tabindex="0"></td>

        <td><input class="excel-input numeric" type="number" value="${precio||''}" data-field="precio_lista" oninput="handleNumericInput(this)" step="0.01" tabindex="0"></td>

        <td>

          <select class="excel-select" data-field="moneda" onchange="handleCellChange(this)">

            <option value="MN" ${moneda==='MN'?'selected':''}>MN</option>

            <option value="USD" ${moneda==='USD'?'selected':''}>USD</option>

          </select>

        </td>

        <td><span class="excel-display" data-field="subtotal">${formatCurrency(subtotal)}</span></td>

        <td><input class="excel-input numeric" type="number" value="${mgn||''}" data-field="porcentaje_mgn" oninput="handleNumericInput(this)" step="1" tabindex="0"></td>

        <td><span class="excel-display" data-field="total_mn">${formatCurrency(tmn)}</span></td>

        <td><span class="excel-display" data-field="total_usd">${formatCurrency(tusd)}</span></td>

        <td><button class="delete-row-btn" onclick="deletePartida(${p.id},'equipo','${seccion.id}')"><i class="fas fa-times"></i></button></td>

      </tr>`;

  }).join('');



  container.innerHTML = `

    <h3 class="tab-section-title"><span style="width:10px;height:10px;border-radius:2px;background:${seccion.color||'#4fc3f7'};display:inline-block;margin-right:8px;"></span>${seccion.titulo||'Equipo'}</h3>

    <div class="excel-table-wrapper">

      <table class="excel-table">

        <thead><tr>

          <th style="width:50px;">PDA</th>

          <th style="min-width:180px;">DESCRIPCI├ôN</th>

          <th style="width:100px;">MARCA</th>

          <th style="width:100px;">MODELO</th>

          <th style="width:60px;">QYT</th>

          <th style="width:110px;">PRECIO LISTA</th>

          <th style="width:70px;">MONEDA</th>

          <th style="width:110px;">SUB TOTAL</th>

          <th style="width:70px;">% MGN</th>

          <th style="width:120px;">TOTAL MN</th>

          <th style="width:120px;">TOTAL USD</th>

          <th style="width:40px;"></th>

        </tr></thead>

        <tbody>

          ${rows}

          <tr class="total-row">

            <td colspan="9" style="text-align:right;padding:10px 12px;">TOTAL</td>

            <td><span class="excel-display">${formatCurrency(totalMN)}</span></td>

            <td><span class="excel-display">${formatCurrency(totalUSD)}</span></td>

            <td></td>

          </tr>

        </tbody>

      </table>

    </div>

    <button class="excel-add-btn" onclick="addPartida('${seccion.id}','equipo')">

      <i class="fas fa-plus"></i> Agregar Partida

    </button>

  `;

}



async function renderElectricoTab(container) {

  const seccion = projectData?.secciones?.find(s => s.codigo === 'E_ELECTRICO');

  if (!seccion) { container.innerHTML = '<p>Secci├│n no encontrada</p>'; return; }



  container.innerHTML = `

    <h3 class="tab-section-title"><span style="width:10px;height:10px;border-radius:2px;background:${seccion.color||'#1976d2'};display:inline-block;margin-right:8px;"></span>${seccion.titulo||'Equipo El├®ctrico'}</h3>

    <div id="electrico-content"><div class="loading-inline">Cargando sub-secciones...</div></div>

    <button class="excel-add-btn" onclick="addSubSeccion('${seccion.id}')" style="margin-top:12px;border-color:#1976d2;color:#1976d2;">

      <i class="fas fa-plus"></i> Nueva Sub-secci├│n

    </button>

  `;



  try {

    const result = await apiCall(`/api/legacy/sub_secciones?action=list&seccion_id=${seccion.id}`);

    const subSecciones = result.data || result.sub_secciones || [];

    renderElectricoContent(seccion, subSecciones);

  } catch(e) {

    document.getElementById('electrico-content').innerHTML = '<p style="color:red;">Error al cargar</p>';

  }

}



function renderElectricoContent(seccion, subSecciones) {

  const content = document.getElementById('electrico-content');

  if (!content) return;

  const tc = tipoCambio();



  if (subSecciones.length === 0) {

    content.innerHTML = '';

    renderEquipoTable(content, seccion);

    return;

  }



  let html = '';

  subSecciones.forEach(sub => {

    const subPartidas = (seccion.partidas || []).filter(p => p.sub_seccion_id == sub.id);

    let subTotalMN = 0, subTotalUSD = 0;



    const rows = subPartidas.map((p, idx) => {

      const qty    = parseFloat(p.cantidad) || 0;

      const precio = parseFloat(p.precio_lista) || 0;

      const mgn    = parseFloat(p.porcentaje_mgn) || 0;

      const moneda = p.moneda || 'MN';

      const subtotal = qty * precio;

      let tmn, tusd;

      if (moneda === 'USD') { tusd = subtotal * (1+mgn/100); tmn = tusd * tc; }

      else { tmn = subtotal * (1+mgn/100); tusd = tmn / tc; }

      subTotalMN  += tmn;

      subTotalUSD += tusd;

      return `

        <tr data-partida-id="${p.id}" data-tipo="equipo" data-seccion-id="${seccion.id}">

          <td><span class="excel-display" style="text-align:center;">${p.numero_partida||idx+1}</span></td>

          <td><input class="excel-input" type="text" value="${escapeAttr(p.descripcion||'')}" data-field="descripcion" onchange="handleCellChange(this)"></td>

          <td><input class="excel-input" type="text" value="${escapeAttr(p.marca||'')}" data-field="marca" onchange="handleCellChange(this)"></td>

          <td><input class="excel-input" type="text" value="${escapeAttr(p.modelo||'')}" data-field="modelo" onchange="handleCellChange(this)"></td>

          <td><input class="excel-input numeric" type="number" value="${qty||''}" data-field="cantidad" oninput="handleNumericInput(this)"></td>

          <td><input class="excel-input numeric" type="number" value="${precio||''}" data-field="precio_lista" oninput="handleNumericInput(this)"></td>

          <td>

            <select class="excel-select" data-field="moneda" onchange="handleCellChange(this)">

              <option value="MN" ${moneda==='MN'?'selected':''}>MN</option>

              <option value="USD" ${moneda==='USD'?'selected':''}>USD</option>

            </select>

          </td>

          <td><span class="excel-display" data-field="subtotal">${formatCurrency(subtotal)}</span></td>

          <td><input class="excel-input numeric" type="number" value="${mgn||''}" data-field="porcentaje_mgn" oninput="handleNumericInput(this)"></td>

          <td><span class="excel-display" data-field="total_mn">${formatCurrency(tmn)}</span></td>

          <td><span class="excel-display" data-field="total_usd">${formatCurrency(tusd)}</span></td>

          <td><button class="delete-row-btn" onclick="deletePartida(${p.id},'equipo','${seccion.id}')"><i class="fas fa-times"></i></button></td>

        </tr>`;

    }).join('');



    html += `

      <div class="sub-section-block" data-sub-id="${sub.id}" style="margin-bottom:16px;">

        <div class="sub-section-header">

          <input type="text" value="${escapeAttr(sub.titulo||'')}" placeholder="Nombre sub-secci├│n"

            onblur="saveSubSeccion(${sub.id}, this.value)">

          <button class="delete-row-btn" style="opacity:1;color:rgba(255,255,255,0.8);" onclick="deleteSubSeccion(${sub.id},'${seccion.id}')">

            <i class="fas fa-trash"></i>

          </button>

        </div>

        <div class="excel-table-wrapper" style="border-radius:0 0 8px 8px;">

          <table class="excel-table">

            <thead><tr>

              <th style="width:50px;">PDA</th><th style="min-width:180px;">DESCRIPCI├ôN</th>

              <th style="width:100px;">MARCA</th><th style="width:100px;">MODELO</th>

              <th style="width:60px;">QYT</th><th style="width:110px;">PRECIO LISTA</th>

              <th style="width:70px;">MONEDA</th><th style="width:110px;">SUB TOTAL</th>

              <th style="width:70px;">% MGN</th><th style="width:120px;">TOTAL MN</th>

              <th style="width:120px;">TOTAL USD</th><th style="width:40px;"></th>

            </tr></thead>

            <tbody>

              ${rows}

              <tr class="total-row">

                <td colspan="9" style="text-align:right;padding:10px 12px;">SUB-TOTAL</td>

                <td><span class="excel-display">${formatCurrency(subTotalMN)}</span></td>

                <td><span class="excel-display">${formatCurrency(subTotalUSD)}</span></td>

                <td></td>

              </tr>

            </tbody>

          </table>

        </div>

        <button class="excel-add-btn" onclick="addPartidaSubSeccion('${seccion.id}',${sub.id},'equipo')" style="border-radius:0 0 6px 6px;">

          <i class="fas fa-plus"></i> Agregar Partida

        </button>

      </div>

    `;

  });



  content.innerHTML = html;

}



async function addSubSeccion(seccionId) {

  try {

    await apiCall('/api/legacy/sub_secciones?action=create', 'POST', { seccion_id: seccionId, titulo: 'Nueva Sub-secci├│n' });

    renderElectricoTab(document.getElementById('tab-content'));

    showToast('Sub-secci├│n agregada', 'success');

  } catch(e) { showToast('Error al agregar sub-secci├│n', 'error'); }

}



async function saveSubSeccion(id, titulo) {

  try { await apiCall('/api/legacy/sub_secciones?action=update', 'POST', { id, titulo }); }

  catch(e) { console.error(e); }

}



async function deleteSubSeccion(id, seccionId) {

  if (!confirm('┬┐Eliminar esta sub-secci├│n y todas sus partidas?')) return;

  try {

    await apiCall('/api/legacy/sub_secciones?action=delete', 'POST', { id });

    renderElectricoTab(document.getElementById('tab-content'));

    showToast('Sub-secci├│n eliminada', 'success');

  } catch(e) { showToast('Error', 'error'); }

}



async function addPartidaSubSeccion(seccionId, subSeccionId, tipo) {

  try {

    const result = await apiCall('/api/legacy/partidas?action=create', 'POST', { seccion_id: seccionId, sub_seccion_id: subSeccionId, tipo });

    if (result.data || result.partida) {

      const seccion = projectData.secciones?.find(s => s.id.toString() === seccionId.toString());

      if (seccion) {

        if (!seccion.partidas) seccion.partidas = [];

        const partida = result.data || result.partida;

        partida.sub_seccion_id = subSeccionId;

        seccion.partidas.push(partida);

      }

      renderElectricoTab(document.getElementById('tab-content'));

      showToast('Partida agregada', 'success');

    }

  } catch(e) { showToast('Error al agregar partida', 'error'); }

}



function renderMecanicoTable(container, seccion) {

  const partidas = seccion.partidas || [];

  const tc = tipoCambio();

  let totalMN = 0, totalUSD = 0;



  const rows = partidas.map((p, idx) => {

    const mat    = parseFloat(p.material) || 0;

    const mo     = parseFloat(p.mano_obra_mecanico) || 0;

    const dis    = parseFloat(p.diseno) || 0;

    const trans  = parseFloat(p.transporte) || 0;

    const mgn    = parseFloat(p.porcentaje_mgn) || 0;

    const moneda = p.moneda || 'MN';

    const qty    = parseFloat(p.cantidad) || 0;

    const precio = parseFloat(p.precio_lista) || 0;

    const subtotal = mat + mo + dis + trans;

    let tmn, tusd;

    if (moneda === 'USD') { tusd = subtotal * (1+mgn/100); tmn = tusd * tc; }

    else { tmn = subtotal * (1+mgn/100); tusd = tmn / tc; }

    totalMN  += tmn;

    totalUSD += tusd;

    return `

      <tr data-partida-id="${p.id}" data-tipo="equipo" data-seccion-id="${seccion.id}" data-sub-tipo="mecanico">

        <td><span class="excel-display" style="text-align:center;">${p.numero_partida||idx+1}</span></td>

        <td><input class="excel-input" type="text" value="${escapeAttr(p.descripcion||'')}" data-field="descripcion" onchange="handleCellChange(this)"></td>

        <td><input class="excel-input" type="text" value="${escapeAttr(p.marca||'')}" data-field="marca" onchange="handleCellChange(this)"></td>

        <td><input class="excel-input" type="text" value="${escapeAttr(p.modelo||'')}" data-field="modelo" onchange="handleCellChange(this)"></td>

        <td><input class="excel-input numeric" type="number" value="${qty||''}" data-field="cantidad" oninput="handleNumericInput(this)"></td>

        <td><input class="excel-input numeric" type="number" value="${precio||''}" data-field="precio_lista" oninput="handleNumericInput(this)"></td>

        <td>

          <select class="excel-select" data-field="moneda" onchange="handleCellChange(this)">

            <option value="MN" ${moneda==='MN'?'selected':''}>MN</option>

            <option value="USD" ${moneda==='USD'?'selected':''}>USD</option>

          </select>

        </td>

        <td><input class="excel-input numeric" type="number" value="${mat||''}" data-field="material" oninput="handleMecanicoInput(this)"></td>

        <td><input class="excel-input numeric" type="number" value="${mo||''}" data-field="mano_obra_mecanico" oninput="handleMecanicoInput(this)"></td>

        <td><input class="excel-input numeric" type="number" value="${dis||''}" data-field="diseno" oninput="handleMecanicoInput(this)"></td>

        <td><input class="excel-input numeric" type="number" value="${trans||''}" data-field="transporte" oninput="handleMecanicoInput(this)"></td>

        <td><span class="excel-display" data-field="subtotal">${formatCurrency(subtotal)}</span></td>

        <td><input class="excel-input numeric" type="number" value="${mgn||''}" data-field="porcentaje_mgn" oninput="handleNumericInput(this)"></td>

        <td><span class="excel-display" data-field="total_mn">${formatCurrency(tmn)}</span></td>

        <td><span class="excel-display" data-field="total_usd">${formatCurrency(tusd)}</span></td>

        <td><button class="delete-row-btn" onclick="deletePartida(${p.id},'equipo','${seccion.id}')"><i class="fas fa-times"></i></button></td>

      </tr>`;

  }).join('');



  container.innerHTML = `

    <h3 class="tab-section-title"><span style="width:10px;height:10px;border-radius:2px;background:${seccion.color||'#e65100'};display:inline-block;margin-right:8px;"></span>${seccion.titulo||'Equipo Mec├ínico'}</h3>

    <div class="excel-table-wrapper">

      <table class="excel-table">

        <thead><tr>

          <th style="width:50px;">PARTIDA</th>

          <th style="min-width:160px;">DESCRIPCI├ôN</th>

          <th style="width:90px;">MARCA</th>

          <th style="width:90px;">MODELO</th>

          <th style="width:55px;">QYT</th>

          <th style="width:90px;">PRECIO LISTA</th>

          <th style="width:65px;">MONEDA</th>

          <th style="width:90px;">MATERIAL</th>

          <th style="width:100px;">MANO DE OBRA</th>

          <th style="width:80px;">DISE├æO</th>

          <th style="width:90px;">TRANSPORTE</th>

          <th style="width:100px;">SUB TOTAL</th>

          <th style="width:65px;">% MGN</th>

          <th style="width:110px;">TOTAL MN</th>

          <th style="width:110px;">TOTAL USD</th>

          <th style="width:40px;"></th>

        </tr></thead>

        <tbody>

          ${rows}

          <tr class="total-row">

            <td colspan="13" style="text-align:right;padding:10px 12px;">TOTAL</td>

            <td><span class="excel-display">${formatCurrency(totalMN)}</span></td>

            <td><span class="excel-display">${formatCurrency(totalUSD)}</span></td>

            <td></td>

          </tr>

        </tbody>

      </table>

    </div>

    <button class="excel-add-btn" onclick="addPartida('${seccion.id}','equipo')">

      <i class="fas fa-plus"></i> Agregar Partida

    </button>

  `;

}



function handleMecanicoInput(input) {

  const row = input.closest('tr');

  if (!row) return;

  const mat   = parseFloat(row.querySelector('[data-field="material"]')?.value) || 0;

  const mo    = parseFloat(row.querySelector('[data-field="mano_obra_mecanico"]')?.value) || 0;

  const dis   = parseFloat(row.querySelector('[data-field="diseno"]')?.value) || 0;

  const trans = parseFloat(row.querySelector('[data-field="transporte"]')?.value) || 0;

  const subtotalCell = row.querySelector('[data-field="subtotal"]');

  const subtotal = mat + mo + dis + trans;

  if (subtotalCell) subtotalCell.textContent = formatCurrency(subtotal);

  const precioInput = row.querySelector('[data-field="precio_lista"]');

  if (precioInput) precioInput.value = subtotal;

  handleNumericInput(input);

}



async function renderInsumosTab(container) {

  const seccion = projectData?.secciones?.find(s => s.codigo === 'INSUMOS');

  if (!seccion) { container.innerHTML = '<p>Secci├│n no encontrada</p>'; return; }



  const equipoDiv = document.createElement('div');

  renderEquipoTable(equipoDiv, seccion);

  container.appendChild(equipoDiv);



  const gastosDiv = document.createElement('div');

  gastosDiv.className = 'gastos-especiales';

  gastosDiv.innerHTML = `

    <div class="gastos-title"><i class="fas fa-receipt" style="margin-right:8px;"></i>GASTOS ESPECIALES Y MÁS</div>

    <div id="gastos-list"><div class="loading-inline">Cargando...</div></div>

    <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:8px;">

      <button class="excel-add-btn" style="flex:1 1 calc(33% - 8px);" onclick="addGastoEspecial('${seccion.id}','HOSPEDAJE')"><i class="fas fa-hotel"></i> Hospedaje</button>

      <button class="excel-add-btn" style="flex:1 1 calc(33% - 8px);" onclick="addGastoEspecial('${seccion.id}','IMSS')"><i class="fas fa-briefcase-medical"></i> IMSS</button>

      <button class="excel-add-btn" style="flex:1 1 calc(33% - 8px);" onclick="addGastoEspecial('${seccion.id}','RENTA DE AUTO')"><i class="fas fa-car"></i> Renta de Auto</button>
      
      <button class="excel-add-btn" style="flex:1 1 calc(33% - 8px);" onclick="addGastoEspecial('${seccion.id}','VIATICOS')"><i class="fas fa-plane"></i> Viáticos</button>

      <button class="excel-add-btn" style="flex:1 1 calc(33% - 8px);" onclick="addGastoEspecial('${seccion.id}','TRANSPORTE')"><i class="fas fa-truck"></i> Transporte</button>

      <button class="excel-add-btn" style="flex:1 1 calc(33% - 8px);" onclick="addGastoEspecial('${seccion.id}','ADMIN')"><i class="fas fa-user-tie"></i> Admin</button>

    </div>

  `;

  container.appendChild(gastosDiv);



  try {

    const result = await apiCall(`/api/legacy/insumos_especiales?action=list&seccion_id=${seccion.id}`);

    const gastos = result.data || result.insumos_especiales || [];
    seccion.gastos = gastos;

    renderGastosEspeciales(gastos, seccion.id);

    recalculateAllSections();
    updateTotals();

  } catch(e) {

    const gl = document.getElementById('gastos-list');

    if (gl) gl.innerHTML = '<p style="color:red;font-size:12px;">Error al cargar</p>';

  }

}



function renderGastosEspeciales(gastos, seccionId) {

  const container = document.getElementById('gastos-list');

  if (!container) return;



  if (gastos.length === 0) {

    container.innerHTML = '<p style="color:var(--text-muted);font-size:12px;padding:8px;">Sin gastos especiales.</p>';

    return;

  }



  const rows = gastos.map(g => {

    const npers = parseFloat(g.num_personal) || 1;
    const np    = parseFloat(g.num_personas) || 0;

    const cpp   = parseFloat(g.costo_por_persona) || 0;

    const nv    = parseFloat(g.num_veces) || 0;

    const sub   = npers * np * cpp * nv;

    const tmn   = sub;

    const tusd  = tmn / tipoCambio();

    return `

      <tr data-gasto-id="${g.id}">

        <td><span class="excel-display" style="font-weight:700;color:#c62828;">${g.tipo||'---'}</span></td>

        <td><input class="excel-input" type="text" value="${escapeAttr(g.descripcion||'')}" onblur="handleGastoChange(${g.id},'descripcion',this.value)"></td>

        <td><input class="excel-input numeric" type="number" value="${npers||''}" onblur="handleGastoChange(${g.id},'num_personal',this.value)" oninput="recalcGasto(this)"></td>

        <td><input class="excel-input numeric" type="number" value="${np||''}" onblur="handleGastoChange(${g.id},'num_personas',this.value)" oninput="recalcGasto(this)"></td>

        <td><input class="excel-input numeric" type="number" value="${cpp||''}" onblur="handleGastoChange(${g.id},'costo_por_persona',this.value)" oninput="recalcGasto(this)"></td>

        <td><input class="excel-input numeric" type="number" value="${nv||''}" onblur="handleGastoChange(${g.id},'num_veces',this.value)" oninput="recalcGasto(this)"></td>

        <td><span class="excel-display" data-field="subtotal">${formatCurrency(sub)}</span></td>

        <td><span class="excel-display" data-field="total_mn">${formatCurrency(tmn)}</span></td>

        <td><span class="excel-display" data-field="total_usd">${formatCurrency(tusd)}</span></td>

        <td><button class="delete-row-btn" style="opacity:1;" onclick="deleteGasto(${g.id},'${seccionId}')"><i class="fas fa-times"></i></button></td>

      </tr>`;

  }).join('');



  container.innerHTML = `

    <div class="excel-table-wrapper" style="margin-top:8px;">

      <table class="excel-table">

        <thead><tr>

          <th>TIPO</th><th style="min-width:160px;">DESCRIPCI├ôN</th>

          <th>PERSONAL</th><th>N┬║ PERSONAS</th><th>COSTO/PERSONA</th><th>N┬║ VECES</th>

          <th>SUB TOTAL</th><th>TOTAL MN</th><th>TOTAL USD</th><th style="width:40px;"></th>

        </tr></thead>

        <tbody>${rows}</tbody>

      </table>

    </div>

  `;

}



function recalcGasto(input) {

  const row = input.closest('tr');

  if (!row) return;

  const npers = parseFloat(row.querySelectorAll('input[type="number"]')[0]?.value) || 1;
  const np    = parseFloat(row.querySelectorAll('input[type="number"]')[1]?.value) || 0;

  const cpp   = parseFloat(row.querySelectorAll('input[type="number"]')[2]?.value) || 0;

  const nv    = parseFloat(row.querySelectorAll('input[type="number"]')[3]?.value) || 0;

  const sub   = npers * np * cpp * nv;

  const subCell = row.querySelector('[data-field="subtotal"]');

  const mnCell  = row.querySelector('[data-field="total_mn"]');

  const usdCell = row.querySelector('[data-field="total_usd"]');

  if (subCell) subCell.textContent = formatCurrency(sub);

  if (mnCell)  mnCell.textContent  = formatCurrency(sub);

  if (usdCell) usdCell.textContent = formatCurrency(sub / tipoCambio());

}



function recalcAllGastos() {
  document.querySelectorAll('.gastos-especiales tbody tr[data-gasto-id]').forEach(row => {
    const npers = parseFloat(row.querySelectorAll('input[type="number"]')[0]?.value) || 1;
    const np    = parseFloat(row.querySelectorAll('input[type="number"]')[1]?.value) || 0;
    const cpp   = parseFloat(row.querySelectorAll('input[type="number"]')[2]?.value) || 0;
    const nv    = parseFloat(row.querySelectorAll('input[type="number"]')[3]?.value) || 0;
    const sub   = npers * np * cpp * nv;
    const subCell = row.querySelector('[data-field="subtotal"]');
    const mnCell  = row.querySelector('[data-field="total_mn"]');
    const usdCell = row.querySelector('[data-field="total_usd"]');
    if (subCell) subCell.textContent = formatCurrency(sub);
    if (mnCell)  mnCell.textContent  = formatCurrency(sub);
    if (usdCell) usdCell.textContent = formatCurrency(sub / tipoCambio());
  });
}

async function handleGastoChange(id, field, value) {

  try { await apiCall('/api/legacy/insumos_especiales?action=update', 'POST', { id, [field]: value }); }

  catch(e) { console.error(e); }

}



async function addGastoEspecial(seccionId, tipo) {

  try {

    await apiCall('/api/legacy/insumos_especiales?action=create', 'POST', { seccion_id: seccionId, tipo });

    renderInsumosTab(document.getElementById('tab-content'));

    showToast(`${tipo} agregado`, 'success');

  } catch(e) { showToast('Error al agregar', 'error'); }

}



async function deleteGasto(id, seccionId) {

  if (!confirm('┬┐Eliminar este gasto?')) return;

  try {

    await apiCall('/api/legacy/insumos_especiales?action=delete', 'POST', { id });

    renderInsumosTab(document.getElementById('tab-content'));

    showToast('Gasto eliminado', 'success');

  } catch(e) { showToast('Error', 'error'); }

}



async function renderListasTab(container) {

  const pd = projectData || {};

  const logoData = pd.logo_data || '';

  const empresaSlogan = pd.empresa_slogan || '';

  container.innerHTML = `

    <h3 class="tab-section-title"><i class="fas fa-list-ol" style="margin-right:8px;"></i>LISTAS</h3>

    <div class="prese-section" style="margin-bottom:20px;">

      <div class="prese-section-title"><i class="fas fa-image" style="margin-right:8px;"></i>LOGO Y DATOS DE EMPRESA</div>

      <div style="padding:16px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 6px 6px;">

        <div style="display:flex;gap:20px;align-items:flex-start;flex-wrap:wrap;">

          <div style="flex:0 0 250px;">

            <label style="display:block;font-size:12px;font-weight:600;color:#475569;margin-bottom:6px;">LOGO DE LA EMPRESA</label>

            <div id="logo-preview-container" onclick="if (!event.target.closest('button')) document.getElementById('logo-file-input')?.click();" style="border:2px dashed #cbd5e1;border-radius:8px;padding:16px;text-align:center;min-height:120px;display:flex;align-items:center;justify-content:center;flex-direction:column;cursor:pointer;transition:border-color 0.2s;" onmouseover="this.style.borderColor='#3b82f6'" onmouseout="this.style.borderColor='#cbd5e1'">
              ${logoData 
                ? `<img src="${logoData}" style="max-height:100px;max-width:220px;object-fit:contain;margin-bottom:8px;" />
                   <button class="btn btn-ghost btn-sm" onclick="removeLogo()" style="color:#ef4444;font-size:11px;"><i class="fas fa-trash"></i> Quitar logo</button>`
                : `<i class="fas fa-cloud-upload-alt" style="font-size:32px;color:#94a3b8;margin-bottom:8px;"></i>
                   <span style="font-size:12px;color:#94a3b8;">Click para subir logo</span>
                   <span style="font-size:10px;color:#cbd5e1;margin-top:4px;">PNG, JPG (max 2MB)</span>`
              }
            </div>
            <input type="file" id="logo-file-input" accept="image/png,image/jpeg,image/jpg" style="display:none;" onchange="handleLogoUpload(event)">

          </div>

          <div style="flex:1;min-width:200px;">

            <label style="display:block;font-size:12px;font-weight:600;color:#475569;margin-bottom:6px;">TEXTO AL LADO DEL LOGO</label>

            <textarea id="listas-empresa-slogan" class="punto-textarea" rows="3" style="width:100%;"
              oninput="projectData.empresa_slogan=this.value; unsavedChanges=true; debouncedSaveProject();"
              onblur="saveEmpresaSlogan(this.value)" placeholder="Ej: Integración de sistemas Automatizados...">${escapeHtml(empresaSlogan)}</textarea>

            <p style="font-size:10px;color:#94a3b8;margin-top:4px;">Este texto aparecer├í junto al logo en la presentaci├│n.</p>

          </div>

        </div>

      </div>

    </div>

    <div id="listas-list"><div class="loading-inline">Cargando...</div></div>

    <button class="excel-add-btn" onclick="addPunto('listas')"><i class="fas fa-plus"></i> Agregar Punto</button>

  `;

  await loadPuntos('listas', 'listas-list', '#');

  const container2 = document.getElementById('listas-list');

  if (!container2) return;

  try {

    const result = await apiCall(`/api/legacy/puntos?action=list&proyecto_id=${projectData.id}&tipo=listas`);

    const puntos = result.data || result.puntos || [];

    if (puntos.length === 0) {

      container2.innerHTML = '<p style="color:var(--text-muted);font-size:12px;padding:8px;">Sin puntos.</p>';

      return;

    }

    container2.innerHTML = puntos.map((p, idx) => `

      <div class="punto-row" data-punto-id="${p.id}">

        <span class="punto-numero">${idx+1}.</span>

        <textarea class="punto-textarea" rows="2" onblur="handlePuntoBlur(${p.id}, this.value, 'listas', '#')">${escapeHtml(p.contenido||'')}</textarea>

        <button class="delete-row-btn" style="opacity:1;" onclick="deletePunto(${p.id},'listas','#')"><i class="fas fa-times"></i></button>

      </div>

    `).join('');

  } catch(e) { container2.innerHTML = '<p style="color:red;font-size:12px;">Error al cargar</p>'; }

}



async function handleLogoUpload(event) {

  const file = event.target.files[0];

  if (!file) return;

  if (file.size > 2 * 1024 * 1024) {

    showToast('El archivo excede 2MB. Use una imagen m├ís peque├▒a.', 'error');

    return;

  }

  if (!file.type.match(/^image\/(png|jpe?g)$/)) {

    showToast('Solo se permiten archivos PNG o JPG.', 'error');

    return;

  }

  const reader = new FileReader();
  reader.onload = async function(e) {
    const base64 = e.target.result;
    projectData.logo_data = base64;
    const previewContainer = document.getElementById('logo-preview-container');
    if (previewContainer) {
      previewContainer.innerHTML = `
        <img src="${base64}" style="max-height:100px;max-width:220px;object-fit:contain;margin-bottom:8px;" />
        <button class="btn btn-ghost btn-sm" onclick="removeLogo()" style="color:#ef4444;font-size:11px;"><i class="fas fa-trash"></i> Quitar logo</button>
      `;
    }
    await saveProjectToAPI();
    showToast('Logo actualizado exitosamente', 'success');
  };
  reader.readAsDataURL(file);
}

function removeLogo() {
  if (!confirm('¿Quitar el logo de la presentación?')) return;
  projectData.logo_data = '';
  const previewContainer = document.getElementById('logo-preview-container');
  if (previewContainer) {
    previewContainer.innerHTML = `
      <i class="fas fa-cloud-upload-alt" style="font-size:32px;color:#94a3b8;margin-bottom:8px;"></i>
      <span style="font-size:12px;color:#94a3b8;">Click para subir logo</span>
      <span style="font-size:10px;color:#cbd5e1;margin-top:4px;">PNG, JPG (max 2MB)</span>
    `;
  }
  saveProjectToAPI().then(() => {
    showToast('Logo eliminado', 'success');
  });
}



async function saveEmpresaSlogan(val) {

  if (!projectData) return;

  projectData.empresa_slogan = val;

  await saveProjectToAPI();

}



async function renderIOTab(container) {

  const seccion = projectData?.secciones?.find(s => s.codigo === 'IO');

  container.innerHTML = `

    <h3 class="tab-section-title"><i class="fas fa-plug" style="margin-right:8px;"></i>I/O</h3>

    <div id="io-content"><div class="loading-inline">Cargando...</div></div>

    <button class="excel-add-btn" onclick="addIORow('${seccion?.id||''}')"><i class="fas fa-plus"></i> Agregar Fila</button>

  `;



  if (!seccion) { document.getElementById('io-content').innerHTML = '<p>Secci├│n I/O no encontrada</p>'; return; }



  try {

    const result = await apiCall(`/api/legacy/io?action=list&seccion_id=${seccion.id}`);

    const rows = result.data || result.io || [];

    renderIOTable(rows, seccion.id);

  } catch(e) {

    document.getElementById('io-content').innerHTML = '<p style="color:red;">Error al cargar</p>';

  }

}



function renderIOTable(rows, seccionId) {

  const container = document.getElementById('io-content');

  if (!container) return;

  const trs = rows.map(r => `

    <tr data-io-id="${r.id}">

      <td><input class="excel-input" type="text" value="${escapeAttr(r.entrada||'')}" placeholder="E.g: I0.0" onblur="handleIOBlur(${r.id},'entrada',this.value)"></td>

      <td><input class="excel-input" type="text" value="${escapeAttr(r.descripcion_entrada||'')}" placeholder="Descripci├│n" onblur="handleIOBlur(${r.id},'descripcion_entrada',this.value)"></td>

      <td><input class="excel-input" type="text" value="${escapeAttr(r.salida||'')}" placeholder="E.g: Q0.0" onblur="handleIOBlur(${r.id},'salida',this.value)"></td>

      <td><input class="excel-input" type="text" value="${escapeAttr(r.descripcion_salida||'')}" placeholder="Descripci├│n" onblur="handleIOBlur(${r.id},'descripcion_salida',this.value)"></td>

      <td><button class="delete-row-btn" style="opacity:1;" onclick="deleteIORow(${r.id},'${seccionId}')"><i class="fas fa-times"></i></button></td>

    </tr>

  `).join('');



  container.innerHTML = `

    <div class="excel-table-wrapper">

      <table class="excel-table">

        <thead><tr>

          <th style="width:100px;">ENTRADA</th>

          <th style="min-width:220px;">DESCRIPCI├ôN ENTRADA</th>

          <th style="width:100px;">SALIDA</th>

          <th style="min-width:220px;">DESCRIPCI├ôN SALIDA</th>

          <th style="width:40px;"></th>

        </tr></thead>

        <tbody>${trs || '<tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:20px;">Sin entradas/salidas</td></tr>'}</tbody>

      </table>

    </div>

  `;

}



async function handleIOBlur(id, field, value) {

  debouncedSaveIO(id, field, value);

}



async function saveIOToAPI(id, field, value) {

  try { await apiCall('/api/legacy/io?action=update', 'POST', { id, [field]: value }); }

  catch(e) { console.error(e); }

}



async function addIORow(seccionId) {

  if (!seccionId) return;

  try {

    await apiCall('/api/legacy/io?action=create', 'POST', { seccion_id: seccionId });

    renderIOTab(document.getElementById('tab-content'));

    showToast('Fila agregada', 'success');

  } catch(e) { showToast('Error al agregar', 'error'); }

}



async function deleteIORow(id, seccionId) {

  if (!confirm('┬┐Eliminar esta fila?')) return;

  try {

    await apiCall('/api/legacy/io?action=delete', 'POST', { id });

    renderIOTab(document.getElementById('tab-content'));

    showToast('Fila eliminada', 'success');

  } catch(e) { showToast('Error', 'error'); }

}



function renderCondiciones(container) {

  const condiciones = projectData.condiciones || [];

  const subtotal = calculateSubtotalMN();

  const iva = subtotal * 0.16;

  const total = subtotal + iva;



  const items = condiciones.map((c, idx) => `

    <div class="condicion-item" data-condicion-id="${c.id}">

      <span class="condicion-code">${c.codigo || `A3.${idx+1}`}</span>

      <div class="condicion-text">

        <textarea rows="2" onchange="handleCondicionChange(${c.id}, this.value)">${escapeHtml(c.contenido||'')}</textarea>

      </div>

      <button class="delete-row-btn" style="opacity:1;" onclick="deleteCondicion(${c.id})"><i class="fas fa-times"></i></button>

    </div>

  `).join('');



  container.innerHTML = `

    <h3 class="tab-section-title"><i class="fas fa-handshake" style="margin-right:8px;"></i>Condiciones Comerciales</h3>

    <div class="condiciones-list">

      ${items || '<p style="color:var(--text-muted);text-align:center;padding:20px;">No hay condiciones</p>'}

    </div>

    <button class="excel-add-btn" onclick="addCondicion()" style="margin-top:16px;"><i class="fas fa-plus"></i> Agregar Condici├│n</button>

    <div style="margin-top:32px;padding:24px;background:#f8fafc;border-radius:8px;border:1px solid #e2e8f0;">

      <h4 style="font-family:var(--font-heading);font-size:14px;font-weight:700;margin-bottom:16px;color:#475569;text-transform:uppercase;letter-spacing:1px;">Resumen de Totales</h4>

      <div style="display:grid;grid-template-columns:160px 1fr;gap:10px;max-width:400px;align-items:center;">

        <span style="color:var(--text-muted);font-family:var(--font-heading);">SUBTOTAL:</span>

        <span style="text-align:right;font-weight:600;font-size:15px;">${formatCurrency(subtotal)}</span>

        <span style="color:var(--text-muted);font-family:var(--font-heading);">IVA 16%:</span>

        <span style="text-align:right;font-weight:600;font-size:15px;">${formatCurrency(iva)}</span>

        <span style="color:#0d47a1;font-weight:700;font-family:var(--font-heading);">TOTAL:</span>

        <span style="text-align:right;font-weight:700;font-size:20px;color:#0d47a1;">${formatCurrency(total)}</span>

      </div>

      <p style="color:var(--text-muted);font-size:12px;margin-top:12px;padding-top:12px;border-top:1px solid #e2e8f0;font-style:italic;">${numberToWords(total)}</p>

    </div>

  `;

}



function handleNumericInput(input) {

  const row = input.closest('tr');

  if (!row) return;

  const tipo = row.dataset.tipo;

  const partidaId = row.dataset.partidaId;

  const field = input.dataset.field;

  const value = input.value;



  recalculateRow(row, tipo);

  debouncedSavePartida(partidaId, field, value, tipo);

  unsavedChanges = true;

}



function handleCellChange(input) {
  const row = input.closest('tr');
  if (!row) return;

  const tipo = row.dataset.tipo;
  const partidaId = row.dataset.partidaId;
  const field = input.dataset.field;
  const value = input.value;

  if (field === 'descripcion') {
    const hasDesc = value.trim().length > 0;
    const priceInput = row.querySelector('[data-field="precio_lista"]');
    const qtyInput = row.querySelector('[data-field="cantidad"]');
    if (priceInput) priceInput.disabled = !hasDesc;
    if (qtyInput) qtyInput.disabled = !hasDesc;
    if (!hasDesc) {
      if (priceInput) priceInput.value = '';
      recalculateRow(row, tipo);
    }
  }

  if (field === 'moneda') recalculateRow(row, tipo);
  debouncedSavePartida(partidaId, field, value, tipo);
  unsavedChanges = true;
}



function recalculateRow(row, tipo) {

  const tc = tipoCambio();



  if (tipo === 'mano_obra') {

    const horas  = parseFloat(row.querySelector('[data-field="horas_mo"]')?.value) || 0;

    const dias   = parseFloat(row.querySelector('[data-field="dias_trabajo"]')?.value) || 0;

    const costo  = parseFloat(row.querySelector('[data-field="costo_hora_usd"]')?.value) || 0;

    const mgn    = parseFloat(row.querySelector('[data-field="porcentaje_mgn"]')?.value) || 0;

    const subtotal  = horas * dias * costo;

    const totalUSD  = subtotal * (1 + mgn / 100);

    const totalMN   = totalUSD * tc;



    setDisplayCell(row, 'subtotal', formatCurrency(subtotal));

    setDisplayCell(row, 'total_usd', formatCurrency(totalUSD));

    setDisplayCell(row, 'total_mn', formatCurrency(totalMN));

    updateLocalPartida(row.dataset.partidaId, { subtotal, total_usd: totalUSD, total_mn: totalMN });



  } else if (tipo === 'equipo') {

    const qty    = parseFloat(row.querySelector('[data-field="cantidad"]')?.value) || 0;

    const precio = parseFloat(row.querySelector('[data-field="precio_lista"]')?.value) || 0;

    const mgn    = parseFloat(row.querySelector('[data-field="porcentaje_mgn"]')?.value) || 0;

    const moneda = row.querySelector('[data-field="moneda"]')?.value || 'MN';

    const subtotal = qty * precio;

    let tmn, tusd;

    if (moneda === 'USD') { tusd = subtotal * (1 + mgn/100); tmn = tusd * tc; }

    else { tmn = subtotal * (1 + mgn/100); tusd = tmn / tc; }



    setDisplayCell(row, 'subtotal', formatCurrency(subtotal));

    setDisplayCell(row, 'total_mn', formatCurrency(tmn));

    setDisplayCell(row, 'total_usd', formatCurrency(tusd));

    updateLocalPartida(row.dataset.partidaId, { subtotal, total_usd: tusd, total_mn: tmn });

  }



  recalculateSectionTotals();

  updateTotals();

}



function setDisplayCell(row, field, value) {

  const cell = row.querySelector(`[data-field="${field}"]`);

  if (cell) cell.textContent = value;

}



function updateLocalPartida(partidaId, values) {

  if (!projectData?.secciones) return;

  for (const sec of projectData.secciones) {

    if (!sec.partidas) continue;

    const p = sec.partidas.find(x => x.id?.toString() === partidaId?.toString());

    if (p) { Object.assign(p, values); break; }

  }

}



function recalculateSectionTotals() {

  if (!projectData?.secciones) return;

  projectData.secciones.forEach(sec => {

    let usd = 0, mn = 0;

    (sec.partidas || []).forEach(p => {

      usd += parseFloat(p.total_usd) || 0;

      mn  += parseFloat(p.total_mn)  || 0;

    });

    (sec.gastos || []).forEach(g => {

      const npers  = parseFloat(g.num_personal) || 1;
      const np     = parseFloat(g.num_personas) || 0;
      const cpp    = parseFloat(g.costo_por_persona) || 0;
      const nv     = parseFloat(g.num_veces) || 0;
      const sub    = npers * np * cpp * nv;
      const tc     = tipoCambio();
      mn  += sub;
      usd += sub / tc;

    });

    sec.subtotal_usd = usd;

    sec.subtotal_mn  = mn;

  });

}



function recalculateAllSections() {

  const tc = tipoCambio();

  if (!projectData?.secciones) return;

  projectData.secciones.forEach(sec => {

    (sec.partidas || []).forEach(p => {

      if (sec.tipo === 'mano_obra') {

        const sub = (parseFloat(p.horas_mo)||0) * (parseFloat(p.dias_trabajo)||0) * (parseFloat(p.costo_hora_usd)||0);

        const mgn = parseFloat(p.porcentaje_mgn) || 0;

        p.subtotal  = sub;

        p.total_usd = sub * (1 + mgn/100);

        p.total_mn  = p.total_usd * tc;

      } else {

        const sub    = (parseFloat(p.cantidad)||0) * (parseFloat(p.precio_lista)||0);

        const mgn    = parseFloat(p.porcentaje_mgn) || 0;

        const moneda = p.moneda || 'MN';

        p.subtotal = sub;

        if (moneda === 'USD') { p.total_usd = sub*(1+mgn/100); p.total_mn = p.total_usd * tc; }

        else { p.total_mn = sub*(1+mgn/100); p.total_usd = p.total_mn / tc; }

      }

    });

  });

  recalculateSectionTotals();

}



function calculateSubtotalMN() {

  if (!projectData?.secciones) return 0;

  return projectData.secciones.reduce((sum, s) => sum + (parseFloat(s.subtotal_mn) || 0), 0);

}



function updateTotals() {
  const subtotal = calculateSubtotalMN();
  const tc = tipoCambio() || 20;
  const pctIva = projectData?.porcentaje_iva !== undefined ? parseFloat(projectData.porcentaje_iva) : 16;
  const iva = subtotal * (pctIva / 100);
  const totalMN = subtotal + iva;
  const totalUSD = totalMN / tc;

  const setEl = (id, val) => { const el = document.getElementById(id); if(el) el.textContent = val; };

  setEl('total-subtotal', formatCurrency(subtotal));
  setEl('total-iva',      formatCurrency(iva));
  setEl('total-mn',       formatCurrency(totalMN));
  setEl('total-usd',      formatCurrency(totalUSD));
  setEl('total-letras',   numberToWords(totalMN));

  const subtotalStr = subtotal > 0 ? formatCurrency(subtotal).replace('$', '').trim() : '-';
  const ivaStr = iva > 0 ? formatCurrency(iva).replace('$', '').trim() : '-';
  const totalMnStr = totalMN > 0 ? formatCurrency(totalMN).replace('$', '').trim() : '-';
  const totalUsdStr = totalUSD > 0 ? formatCurrency(totalUSD).replace('$', '').trim() : '-';

  setEl('cot-subtotal', subtotal > 0 ? `$ ${subtotalStr}` : '$ -');
  setEl('cot-iva', ivaStr);
  setEl('cot-total-mn', totalMN > 0 ? `$ ${totalMnStr}` : '-');
  setEl('cot-total-usd', totalUSD > 0 ? `$ ${totalUsdStr}` : '-');

  let letras = subtotal > 0 ? numberToWords(totalMN).toUpperCase() : '';
  if (projectData && projectData.moneda === 'USD') {
    letras = numberToWords(totalUSD).toUpperCase().replace("PESOS", "DOLARES").replace("M.N.", "USD");
  }
  setEl('cot-letras', letras);

  setEl('prese-subtotal', formatCurrency(subtotal));
  setEl('prese-iva',      formatCurrency(iva));
  setEl('prese-total-mn', formatCurrency(totalMN));
  setEl('prese-total-usd', formatCurrency(totalUSD));
  setEl('prese-total-letras', numberToWords(totalMN));

  if (projectData) {
    projectData.subtotal_mn = subtotal;
    projectData.iva         = iva;
    projectData.total_mn    = totalMN;
    projectData.total_usd   = totalUSD;
  }
}



async function addPartida(seccionId, tipo) {
  const sec = projectData.secciones?.find(s => s.id?.toString() === seccionId?.toString());
  const tempId = 'temp_' + Date.now();
  const newPartida = {
    id: tempId,
    seccion_id: seccionId,
    numero_partida: (sec?.partidas?.length || 0) + 1,
    descripcion: '',
    marca: '',
    modelo: '',
    cantidad: 1,
    precio_lista: 0,
    moneda: 'MN',
    porcentaje_mgn: 0,
    horas_mo: 0,
    dias_trabajo: 0,
    costo_hora_usd: 0,
    subtotal: 0,
    total_mn: 0,
    total_usd: 0
  };

  if (sec) {
    if (!sec.partidas) sec.partidas = [];
    sec.partidas.push(newPartida);
  }

  recalculateSectionTotals();
  updateTotals();
  switchTab(currentTab);
  showToast('Partida agregada', 'success');

  try {
    const result = await apiCall('/api/legacy/partidas?action=create', 'POST', { seccion_id: seccionId, tipo });
    const partida = result.data || result.partida;
    if (partida && partida.id) {
      newPartida.id = partida.id;
    }
  } catch(e) {
    showToast(e.message || 'Error al agregar partida en servidor', 'error');
  }
}



async function deletePartida(id, tipo, seccionId) {
  if (!confirm('¿Eliminar esta partida?')) return;

  if (projectData?.secciones) {
    for (const sec of projectData.secciones) {
      if (sec.partidas) sec.partidas = sec.partidas.filter(p => p.id != id);
    }
  }
  recalculateSectionTotals();
  updateTotals();

  if (currentTab === 'COTIZACION') {
    renderCotizacionTable(document.getElementById('tab-content'));
  } else {
    switchTab(currentTab);
  }
  showToast('Partida eliminada', 'success');

  try {
    await apiCall('/api/partidas/delete', 'POST', { id, tipo });
  } catch(e) {
    showToast(e.message || 'Error al eliminar en servidor', 'error');
  }
}



async function savePartidaToAPI(id, field, value, tipo) {
  try {
    let partida = null;
    if (projectData && projectData.secciones) {
       for (const sec of projectData.secciones) {
           if (sec.partidas) {
               const found = sec.partidas.find(p => p.id == id);
               if (found) { partida = found; break; }
           }
       }
    }
    if (!partida) return;
    
    const payload = {
        id: partida.id,
        tipo: tipo,
        tipo_cambio: tipoCambio(),
        descripcion: partida.descripcion || '',
        marca: partida.marca || '',
        modelo: partida.modelo || '',
        cantidad: partida.cantidad || 0,
        precio_lista: partida.precio_lista || 0,
        moneda: partida.moneda || 'MN',
        porcentaje_mgn: partida.porcentaje_mgn || 0,
        horas_mo: partida.horas_mo || 0,
        dias_trabajo: partida.dias_trabajo || 0,
        costo_hora_usd: partida.costo_hora_usd || 0
    };
    
    // Apply the changed field explicitly
    if (field) {
        payload[field] = value;
        // Also update local state so future saves have it
        partida[field] = value;
    }
    
    await apiCall('/api/partidas/update', 'POST', payload);
  } catch(e) { 
    console.error('Error saving partida:', e); 
  }
}



async function saveInsumoToAPI(id, field, value) {
  try {
    let insumo = null;
    if (projectData && projectData.secciones) {
       for (const sec of projectData.secciones) {
           if (sec.insumos_especiales) {
               const found = sec.insumos_especiales.find(i => i.id == id);
               if (found) { insumo = found; break; }
           }
       }
    }
    if (!insumo) return;

    const payload = {
        id: insumo.id,
        descripcion: insumo.descripcion || '',
        costo_mxn: insumo.costo_mxn || 0,
        factor_ventas: insumo.factor_ventas || 0,
        subtotal: insumo.subtotal || 0,
        [field]: value // apply the new value
    };

    await apiCall('/api/insumos_especiales/update', 'POST', payload);
  } catch(e) { 
    console.error('Error saving insumo:', e); 
  }
}



function handleCondicionChange(id, value) {

  if (projectData?.condiciones) {

    const c = projectData.condiciones.find(x => x.id === id);

    if (c) c.contenido = value;

  }

  debouncedSaveCondicion(id, value);

  unsavedChanges = true;

}



async function saveCondicionToAPI(id, contenido) {

  try { await apiCall('/api/legacy/condiciones?action=update', 'POST', { id, contenido }); }

  catch(e) { console.error(e); }

}



async function addCondicion() {

  try {

    const result = await apiCall('/api/legacy/condiciones?action=create', 'POST', { proyecto_id: projectData.id });

    if (result.data || result.condicion) {

      if (!projectData.condiciones) projectData.condiciones = [];

      projectData.condiciones.push(result.data || result.condicion);

      switchTab('CONDICIONES');

      showToast('Condici├│n agregada', 'success');

    }

  } catch(e) { showToast(e.message||'Error', 'error'); }

}



async function deleteCondicion(id) {

  if (!confirm('┬┐Eliminar esta condici├│n?')) return;

  try {

    await apiCall('/api/legacy/condiciones?action=delete', 'POST', { id });

    if (projectData?.condiciones) projectData.condiciones = projectData.condiciones.filter(c => c.id !== id);

    switchTab('CONDICIONES');

    showToast('Condici├│n eliminada', 'success');

  } catch(e) { showToast(e.message||'Error', 'error'); }

}



async function saveProject() {

  await saveProjectToAPI();

  showToast('Proyecto guardado exitosamente', 'success');

  unsavedChanges = false;

}



function saveProjectName(name) {
  if (!projectData) return;
  projectData.nombre_proyecto = name;
  const data = { id: projectData.id, nombre_proyecto: name };
  apiCall('/api/legacy/proyectos?action=update', 'POST', data).catch(() => {});
  document.title = `DEMATIQ - ${name}`;
}

async function saveProjectToAPI() {
  if (!projectData) return;

  const data = {
    id:                  projectData.id,
    nombre_proyecto:     projectData.nombre_proyecto || '',
    atencion:            projectData.atencion || document.getElementById('field-atencion')?.value || '',
    telefono_cliente:    projectData.telefono_cliente || document.getElementById('field-telefono')?.value || '',
    empresa_cliente:     projectData.empresa_cliente || document.getElementById('field-empresa')?.value || '',
    email_cliente:       projectData.email_cliente || document.getElementById('field-email')?.value || '',
    numero_proyecto:     projectData.numero_proyecto || '',
    fecha_creacion:      projectData.fecha_creacion || '',
    fecha_vencimiento:   projectData.fecha_vencimiento || '',
    tipo_cambio_usd:     tipoCambio(),
    referencia:          projectData.referencia || document.getElementById('field-referencia')?.value || '',
    descripcion_solucion: projectData.descripcion_solucion != null ? projectData.descripcion_solucion : '',
    carpeta_link:        projectData.carpeta_link || '',
    logo_data:           projectData.logo_data || '',
    empresa_slogan:      projectData.empresa_slogan || '',
    dias_vigencia:       projectData.dias_vigencia || 30,
    tiempo_entrega:      projectData.tiempo_entrega || '',
    condiciones_pago:    projectData.condiciones_pago || '',
    nota_aclaracion:     projectData.nota_aclaracion || '',
    nota_bullet_1:       projectData.nota_bullet_1 || '',
    nota_bullet_2:       projectData.nota_bullet_2 || '',
    nota_bullet_3:       projectData.nota_bullet_3 || ''
  };

  try { 
    await apiCall('/api/proyectos/update', 'POST', data); 
    unsavedChanges = false; 
  } catch(e) { 
    showToast('Error al guardar proyecto', 'error'); 
    console.error(e); 
  }
}



function convertToUSD() {

  document.getElementById('usd-tipo-cambio').value = tipoCambio();

  openModal('modal-usd');

}



async function applyUSDConversion() {
  const newTC = parseFloat(document.getElementById('usd-tipo-cambio').value) || 20;
  document.getElementById('field-tipo-cambio').value = newTC;
  if (projectData) projectData.tipo_cambio_usd = newTC;

  recalculateAllSections();
  updateTotals();
  recalcAllGastos();

  if (currentTab === 'COTIZACION') {
    renderCotizacionTable(document.getElementById('tab-content'));
  } else {
    switchTab(currentTab);
  }

  debouncedSaveProject();
  closeModal('modal-usd');
  showToast(`Tipo de cambio actualizado a $${newTC.toFixed(2)}`, 'success');
}



function goBack() {

  if (unsavedChanges && !confirm('Hay cambios sin guardar. ┬┐Deseas salir?')) return;

  window.location.href = '/dashboard';

}



function toggleHeader() {

  const content = document.getElementById('header-content');

  const chevron = document.getElementById('header-chevron');

  if (content) content.classList.toggle('collapsed');

  if (chevron) chevron.classList.toggle('collapsed');

}



function escapeAttr(str) {

  if (!str) return '';

  return String(str).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

}



function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function getNotasBullets() {
  if (!projectData) return [];
  if (!projectData.notas_bullets || !Array.isArray(projectData.notas_bullets)) {
    projectData.notas_bullets = [
      projectData.nota_bullet_1 || 'Tiempo de Entrega: Los días de entrega serán considerados a partir de la recepción de su orden de compra. Este tiempo de entrega es SALVO PREVIA VENTA.',
      projectData.nota_bullet_2 || 'Si esta cotización es en pesos y el tipo de cambio sufre una variación mayor al 2%, esta cotización pierde su validez.',
      projectData.nota_bullet_3 || 'Vigencia: 30 días para cotizaciones en Pesos y Dólares.'
    ];
  }
  return projectData.notas_bullets;
}

function addCustomNota() {
  const bullets = getNotasBullets();
  bullets.push('Nueva nota adicional...');
  unsavedChanges = true;
  debouncedSaveProject();
  renderCotizacionTable(document.getElementById('tab-content'));
}

function removeCustomNota(idx) {
  const bullets = getNotasBullets();
  bullets.splice(idx, 1);
  unsavedChanges = true;
  debouncedSaveProject();
  renderCotizacionTable(document.getElementById('tab-content'));
}

function updateCustomNota(idx, val) {
  const bullets = getNotasBullets();
  bullets[idx] = val;
  unsavedChanges = true;
  debouncedSaveProject();
}

function renderCotizacionTable(container) {
  if (!container) container = document.getElementById('tab-content');
  if (!container) return;

  const seccion = (projectData?.secciones || []).find(s => s.codigo === 'E_CONTROL') || projectData?.secciones?.[0];
  if (!seccion) {
    container.innerHTML = '<div class="alert alert-warning">No se encontró sección para cargar las partidas.</div>';
    return;
  }

  const partidas = seccion.partidas || [];
  const tc = tipoCambio();
  const pctIva = projectData?.porcentaje_iva !== undefined ? parseFloat(projectData.porcentaje_iva) : 16;

  let rowsHtml = '';
  partidas.forEach((p, idx) => {
    const qty = parseFloat(p.cantidad) || 0;
    const precio = parseFloat(p.precio_lista) || 0;
    const subtotal = qty * precio;
    const hasDesc = (p.descripcion || '').trim().length > 0;
    const disabledAttr = hasDesc ? '' : 'disabled';

    rowsHtml += `
      <tr data-partida-id="${p.id}" data-tipo="equipo" data-seccion-id="${seccion.id}">
        <td style="text-align:center;"><span class="excel-display" style="text-align:center;font-weight:600;">${p.numero_partida || idx+1}</span></td>
        <td><input class="excel-input" type="text" value="${escapeAttr(p.descripcion||'')}" data-field="descripcion" oninput="handleCellChange(this)" onchange="handleCellChange(this)" tabindex="0"></td>
        <td><input class="excel-input numeric" type="number" style="text-align:right;" value="${precio||''}" data-field="precio_lista" oninput="handleNumericInput(this)" step="0.01" tabindex="0" ${disabledAttr}></td>
        <td><input class="excel-input numeric" type="number" style="text-align:center;" value="${qty||''}" data-field="cantidad" oninput="handleNumericInput(this)" step="1" tabindex="0" ${disabledAttr}></td>
        <td style="text-align:right;"><span class="excel-display total-val" data-field="subtotal" style="text-align:right;font-weight:600;display:block;">${subtotal ? formatCurrency(subtotal) : '-'}</span></td>
        <input type="hidden" data-field="porcentaje_mgn" value="0">
        <input type="hidden" data-field="moneda" value="${p.moneda || 'MN'}">
        <td style="text-align:center;">
          <button class="btn-icon text-danger" onclick="deletePartida(${p.id}, 'equipo', '${seccion.id}')" title="Eliminar Partida"><i class="fas fa-trash-alt"></i></button>
        </td>
      </tr>
    `;
  });

  const subtotalSum = partidas.reduce((acc, p) => acc + ((parseFloat(p.cantidad)||0) * (parseFloat(p.precio_lista)||0)), 0);
  const ivaSum = subtotalSum * (pctIva / 100);
  const totalSum = subtotalSum + ivaSum;
  const totalUsdSum = totalSum / (tc || 20);

  const subtotalStr = subtotalSum > 0 ? formatCurrency(subtotalSum).replace('$', '').trim() : '-';
  const ivaStr = ivaSum > 0 ? formatCurrency(ivaSum).replace('$', '').trim() : '-';
  const totalMnStr = totalSum > 0 ? formatCurrency(totalSum).replace('$', '').trim() : '-';
  const totalUsdStr = totalUsdSum > 0 ? formatCurrency(totalUsdSum).replace('$', '').trim() : '-';
  const letrasStr = subtotalSum > 0 ? numberToWords(totalSum).toUpperCase() : '';

  const defaultSlogans = "Integración de sistemas Automatizados\nProgramación de PLC, HMI\nServicio de Diseño y Armado Tableros\nPólizas de Mantenimiento";

  container.innerHTML = `
    <div class="excel-container" style="background:#ffffff; padding:20px; border-radius:8px; box-shadow:0 1px 3px rgba(0,0,0,0.1); border:1px solid #e2e8f0; margin:0;">
      
      <!-- Top Header matching Image 2 -->
      <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:20px; font-family:var(--font-body);">
        <div style="flex:1; max-width:65%;">
          <div style="display:flex; gap:15px; align-items:center; margin-bottom:15px;">
            <img src="${projectData.logo_data || '/static/img/logo.png'}" style="height:75px; object-fit:contain;" alt="DEMATIQ">
            <div style="font-size:11px; font-weight:500; color:#334155; line-height:1.4; width:260px; white-space:pre-wrap;">${escapeHtml(projectData.empresa_slogan || defaultSlogans)}</div>
          </div>
          <div style="font-size:12px; color:#334155; line-height:1.8;">
            <div><strong>Atención:</strong> <input class="excel-input-inline" style="width:70%;" value="${escapeAttr(projectData.atencion || '')}" oninput="projectData.atencion=this.value; unsavedChanges=true; debouncedSaveProject();"></div>
            <div><strong>TEL:</strong> <input class="excel-input-inline" style="width:130px;" value="${escapeAttr(projectData.telefono_cliente || '')}" oninput="projectData.telefono_cliente=this.value; unsavedChanges=true; debouncedSaveProject();"> &nbsp;&nbsp; <strong>Empresa:</strong> <input class="excel-input-inline" style="width:200px;" value="${escapeAttr(projectData.empresa_cliente || '')}" oninput="projectData.empresa_cliente=this.value; unsavedChanges=true; debouncedSaveProject();"></div>
            <div><span style="color:#0284c7; text-decoration:underline; font-weight:600;">E-mail</span>: <input class="excel-input-inline" style="width:75%;" value="${escapeAttr(projectData.email_cliente || '')}" oninput="projectData.email_cliente=this.value; unsavedChanges=true; debouncedSaveProject();"></div>
          </div>
        </div>

        <div style="width:340px; text-align:right; font-size:12px; color:#334155;">
          <div style="color:#0284c7; font-weight:bold; margin-bottom:6px;">
            Atención: <input class="excel-input-inline" style="color:#0284c7; font-weight:bold; width:150px; text-align:right;" value="${escapeAttr(projectData.vendedor_config?.vendedor || 'Jose Moreno Rangel')}" oninput="if(!projectData.vendedor_config) projectData.vendedor_config={}; projectData.vendedor_config.vendedor=this.value; unsavedChanges=true; debouncedSaveProject();"> 
            tel: <input class="excel-input-inline" style="color:#0284c7; font-weight:bold; width:100px; text-align:right;" value="${escapeAttr(projectData.vendedor_config?.vendedor_telefono || '442 7214891')}" oninput="if(!projectData.vendedor_config) projectData.vendedor_config={}; projectData.vendedor_config.vendedor_telefono=this.value; unsavedChanges=true; debouncedSaveProject();">
          </div>
          <div style="background:#1b4f72; color:#fff; font-weight:bold; font-size:14px; text-align:center; padding:6px; margin-bottom:8px; border-radius:3px; letter-spacing:1px;">COTIZACION</div>
          <table style="width:100%; font-size:12px; text-align:left; border-collapse:collapse; margin-bottom:8px;">
            <tr><td style="font-weight:bold; padding:2px 0;">COTIZACION No.</td><td style="text-align:right; font-weight:bold; padding:2px 0;"><input class="excel-input-inline" style="text-align:right; font-weight:bold; width:130px;" value="${escapeAttr(projectData.numero_proyecto || '')}" oninput="projectData.numero_proyecto=this.value; unsavedChanges=true; debouncedSaveProject();"></td></tr>
            <tr><td style="font-weight:bold; padding:2px 0;">MONEDA</td><td style="text-align:right; padding:2px 0;"><select class="excel-input-inline" style="font-weight:bold; font-size:11px; width:110px; text-align:right;" onchange="projectData.moneda=this.value; updateTotals(); unsavedChanges=true; debouncedSaveProject();"><option value="MN" ${projectData.moneda !== 'USD' ? 'selected' : ''}>PESOS (MN)</option><option value="USD" ${projectData.moneda === 'USD' ? 'selected' : ''}>DÓLARES (USD)</option></select></td></tr>
            <tr><td style="font-weight:bold; padding:2px 0;">FECHA</td><td style="text-align:right; padding:2px 0;"><input type="date" id="field-fecha-inline" class="excel-input-inline" style="font-size:11px;" value="${projectData.fecha_creacion ? projectData.fecha_creacion.split('T')[0] : ''}" onchange="autoCalcVencimiento(); unsavedChanges=true; debouncedSaveProject();"></td></tr>
            <tr><td style="font-weight:bold; padding:2px 0;">DÍAS DE VIGENCIA</td><td style="text-align:right; padding:2px 0;"><input type="number" id="field-dias-vigencia-inline" class="excel-input-inline" style="text-align:right; width:60px;" value="${projectData.dias_vigencia || 30}" oninput="autoCalcVencimiento(); unsavedChanges=true; debouncedSaveProject();"></td></tr>
            <tr><td style="font-weight:bold; padding:2px 0;">VENCIMIENTO</td><td style="text-align:right; padding:2px 0;"><input type="date" id="field-vencimiento-inline" class="excel-input-inline" style="font-size:11px;" value="${projectData.fecha_vencimiento ? projectData.fecha_vencimiento.split('T')[0] : ''}" onchange="projectData.fecha_vencimiento=this.value; unsavedChanges=true; debouncedSaveProject();"></td></tr>
          </table>
          <div style="color:#1b4f72; font-weight:bold; font-size:11px; text-transform:uppercase;"><input class="excel-input-inline" style="text-align:right; font-weight:bold; color:#1b4f72; width:100%;" value="${escapeAttr(projectData.referencia || '')}" oninput="projectData.referencia=this.value; unsavedChanges=true; debouncedSaveProject();"></div>
        </div>
      </div>

      <!-- Main Table -->
      <table class="excel-table">
        <thead>
          <tr>
            <th style="width: 60px;">Partida</th>
            <th class="align-left">Descripción</th>
            <th style="width: 140px;">Precio</th>
            <th style="width: 90px;">Cantidad</th>
            <th style="width: 140px;">Sub Total</th>
            <th style="width: 70px;">Acciones</th>
          </tr>
        </thead>
        <tbody id="cotizacion-tbody">
          ${rowsHtml}
        </tbody>
      </table>

      <div style="margin-top: 15px;">
        <button class="btn btn-success" onclick="addCotizacionPartida('${seccion.id}')"><i class="fas fa-plus"></i> Agregar Partida</button>
      </div>

      <!-- Delivery time banner -->
      <div style="background:#e2e8f0; color:#1e293b; font-weight:bold; padding:6px 12px; margin-top:20px; font-size:12px; border-radius:4px; text-transform:uppercase;">
        TIEMPO DE ENTREGA <input class="excel-input-inline" style="font-weight:bold; width:220px;" value="${escapeAttr(projectData.tiempo_entrega || '8- DIAS HABILES')}" oninput="projectData.tiempo_entrega=this.value; unsavedChanges=true; debouncedSaveProject();">
      </div>

      <!-- Totals Block with BOTH Total MN and Total USD & Dynamic IVA % -->
      <div style="display:flex; justify-content:flex-end; margin-top:15px; margin-bottom:20px;">
        <table style="width:280px; font-size:13px; text-align:right;">
          <tr>
            <td style="padding:4px; font-weight:600; color:#475569;">SUB TOTAL</td>
            <td style="padding:4px; font-weight:bold; color:#1e293b;" id="cot-subtotal">${subtotalSum > 0 ? `$ ${subtotalStr}` : '$ -'}</td>
          </tr>
          <tr>
            <td style="padding:4px; font-weight:600; color:#475569;">
              IVA (<input class="excel-input-inline" type="number" style="width:45px; text-align:center; font-weight:bold;" value="${pctIva}" oninput="projectData.porcentaje_iva=parseFloat(this.value)||0; updateTotals(); unsavedChanges=true; debouncedSaveProject();">%)
            </td>
            <td style="padding:4px; font-weight:bold; color:#1e293b;" id="cot-iva">${ivaStr}</td>
          </tr>
          <tr>
            <td style="padding:4px; font-weight:bold; color:#0f172a;">TOTAL MN</td>
            <td style="padding:4px; font-weight:bold; color:#0f172a;" id="cot-total-mn">${totalSum > 0 ? `$ ${totalMnStr}` : '-'}</td>
          </tr>
          <tr>
            <td style="padding:4px; font-weight:bold; color:#0284c7;">TOTAL USD</td>
            <td style="padding:4px; font-weight:bold; color:#0284c7;" id="cot-total-usd">${totalUsdSum > 0 ? `$ ${totalUsdStr}` : '-'}</td>
          </tr>
        </table>
      </div>

      <!-- Total in Words & Notes -->
      <div style="text-align:center; font-weight:bold; font-size:13px; color:#1e293b; margin-bottom:8px; text-transform:uppercase;" id="cot-letras">${letrasStr}</div>
      <div style="text-align:center; font-weight:bold; font-size:11px; color:#1e293b; margin-bottom:20px;">TERMINOS Y CONDICIONES: <input class="excel-input-inline" style="font-weight:bold; width:300px; text-align:center;" value="${escapeAttr(projectData.condiciones_pago || 'Condiciones de Pago : 90 DIAS')}" oninput="projectData.condiciones_pago=this.value; unsavedChanges=true; debouncedSaveProject();"></div>

      <!-- Footer Policy Bullet Points & Clarification text -->
      <div style="font-size:11px; color:#334155; line-height:1.7; border-top:1px solid #e2e8f0; padding-top:15px;">
        <p style="margin:0 0 8px 0;">
          <input class="excel-input-inline" style="width:100%; font-size:11px;" value="${escapeAttr(projectData.texto_aclaracion || 'Para cualquier aclaración con respecto a esta cotización o para colocar su orden, favor de comunicarse al correo integraqro07@outlook.com')}" oninput="projectData.texto_aclaracion=this.value; unsavedChanges=true; debouncedSaveProject();">
        </p>

        <div id="cot-bullets-container">
          ${getNotasBullets().map((bullet, idx) => `
            <div style="display:flex; align-items:center; gap:8px; margin-bottom:4px;">
              <span style="font-weight:bold;">•</span>
              <input class="excel-input-inline" style="flex:1; font-size:11px;" value="${escapeAttr(bullet)}" oninput="updateCustomNota(${idx}, this.value)">
              <button class="btn-icon text-danger" onclick="removeCustomNota(${idx})" title="Eliminar nota" style="font-size:11px; padding:2px 4px;"><i class="fas fa-trash-alt"></i></button>
            </div>
          `).join('')}
        </div>

        <div style="margin-top:8px; margin-bottom:8px;">
          <button class="btn btn-sm btn-outline-primary" onclick="addCustomNota()" style="font-size:11px; padding:3px 8px;"><i class="fas fa-plus"></i> Agregar Nota</button>
        </div>

        <p style="margin:6px 0 0 0; color:#64748b;">Nota : <input class="excel-input-inline" style="width:90%;" value="${escapeAttr(projectData.nota_aclaracion || 'precios en Pesos Mexicanos MN ,precios sujetos a cambio sin previo aviso')}" oninput="projectData.nota_aclaracion=this.value; unsavedChanges=true; debouncedSaveProject();"></p>
      </div>

    </div>
  `;
}

async function addCotizacionPartida(seccionId) {
  const seccion = (projectData?.secciones || []).find(s => s.id == seccionId || s.codigo === 'E_CONTROL') || projectData?.secciones?.[0];
  const tempId = 'temp_' + Date.now();
  const newPartida = {
    id: tempId,
    seccion_id: seccionId,
    numero_partida: (seccion?.partidas?.length || 0) + 1,
    descripcion: '',
    precio_lista: 0,
    cantidad: 1,
    moneda: 'MN',
    porcentaje_mgn: 0,
    subtotal: 0,
    total_mn: 0,
    total_usd: 0
  };

  if (seccion) {
    if (!seccion.partidas) seccion.partidas = [];
    seccion.partidas.push(newPartida);
  }

  recalculateSectionTotals();
  updateTotals();
  renderCotizacionTable(document.getElementById('tab-content'));
  showToast('Partida agregada', 'success');

  try {
    const res = await apiCall('/api/partidas/create', 'POST', {
      seccion_id: seccionId,
      tipo: 'equipo'
    });
    if (res && res.id) {
      newPartida.id = res.id;
    }
  } catch (err) {
    showToast('Error al agregar en servidor: ' + err.message, 'error');
  }
}

