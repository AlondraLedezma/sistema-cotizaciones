let projectData = null;
let currentTab = 'REPORTE';
let unsavedChanges = false;

const TABS = [
  { code: 'PRESE',       label: 'PRESE',        color: '#1e293b', icon: 'fa-file-alt' },
  { code: 'REPORTE',     label: 'REPORTE',       color: '#16a34a', icon: 'fa-chart-bar' },
  { code: 'ING_MO',      label: 'ING. MO',       color: '#2196F3', icon: 'fa-cogs' },
  { code: 'E_CONTROL',   label: 'E. CONTROL',    color: '#0d47a1', icon: 'fa-microchip' },
  { code: 'E_ELECTRICO', label: 'E. ELÉCTRICO',  color: '#1976d2', icon: 'fa-bolt' },
  { code: 'E_NEUMATICO', label: 'E. NEUMÁTICO',  color: '#00897b', icon: 'fa-wind' },
  { code: 'E_MECANICO',  label: 'E. MECÁNICO',   color: '#e65100', icon: 'fa-wrench' },
  { code: 'INSUMOS',     label: 'INSUMOS',       color: '#c62828', icon: 'fa-box' },
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
  const id = params.get('id');
  const action = params.get('action');

  if (!id) { window.location.href = 'dashboard.html'; return; }

  await loadProject(id);

  const headerFields = ['field-atencion','field-telefono','field-empresa','field-email',
    'field-fecha','field-vencimiento','field-tipo-cambio','field-referencia','field-descripcion','field-carpeta'];
  headerFields.forEach(fid => {
    const el = document.getElementById(fid);
    if (el) el.addEventListener('input', () => { unsavedChanges = true; debouncedSaveProject(); });
  });

  const tcField = document.getElementById('field-tipo-cambio');
  if (tcField) tcField.addEventListener('input', () => { recalculateAllSections(); updateTotals(); });

  if (action === 'pdf') setTimeout(() => generatePDF(), 500);

  window.addEventListener('beforeunload', e => {
    if (unsavedChanges) { e.preventDefault(); e.returnValue = ''; }
  });
});

async function loadProject(id) {
  try {
    showLoading();
    const result = await apiCall(`api/proyectos.php?action=get&id=${id}`);
    projectData = result.proyecto || result.data;
    renderHeader();
    renderTabs();
    switchTab('REPORTE');
    updateTotals();
    hideLoading();
  } catch (error) {
    hideLoading();
    showToast('Error al cargar el proyecto', 'error');
    console.error(error);
    setTimeout(() => window.location.href = 'dashboard.html', 2000);
  }
}

function renderHeader() {
  if (!projectData) return;
  document.getElementById('proyecto-nombre').textContent = projectData.nombre_proyecto || 'Sin nombre';
  document.getElementById('proyecto-numero').textContent = `No. ${projectData.numero_proyecto || '---'}`;
  document.getElementById('field-numero').textContent = projectData.numero_proyecto || '---';
  document.getElementById('field-atencion').value   = projectData.atencion || '';
  document.getElementById('field-telefono').value   = projectData.telefono_cliente || '';
  document.getElementById('field-empresa').value    = projectData.empresa_cliente || '';
  document.getElementById('field-email').value      = projectData.email_cliente || '';
  document.getElementById('field-fecha').value      = projectData.fecha_creacion || '';
  document.getElementById('field-vencimiento').value = projectData.fecha_vencimiento || '';
  document.getElementById('field-tipo-cambio').value = projectData.tipo_cambio_usd || projectData.tipo_cambio || 20;
  document.getElementById('field-referencia').value = projectData.referencia || '';
  document.getElementById('field-descripcion').value = projectData.descripcion_solucion || '';

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

function renderTabs() {
  const tabsBar = document.getElementById('tabs-bar');
  if (!tabsBar) return;
  tabsBar.innerHTML = '';
  TABS.forEach(tab => {
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
  container.innerHTML = `
    <div class="prese-header-info">
      <div class="reporte-info-panel" style="margin-bottom:20px;">
        <div class="reporte-info-row"><span class="reporte-info-label">EMPRESA</span><span class="reporte-info-value">${pd.empresa_cliente || '---'}</span></div>
        <div class="reporte-info-row"><span class="reporte-info-label">ATENCIÓN</span><span class="reporte-info-value">${pd.atencion || '---'}</span></div>
        <div class="reporte-info-row"><span class="reporte-info-label">COT. NO.</span><span class="reporte-info-value">${pd.numero_proyecto || '---'}</span></div>
        <div class="reporte-info-row"><span class="reporte-info-label">FECHA</span><span class="reporte-info-value">${formatDate(pd.fecha_creacion)}</span></div>
        <div class="reporte-info-row"><span class="reporte-info-label">TIPO CAMBIO</span><span class="reporte-info-value">$${(parseFloat(pd.tipo_cambio_usd || pd.tipo_cambio) || 20).toFixed(2)} MXN/USD</span></div>
      </div>
    </div>
    <div class="prese-section">
      <div class="prese-section-title"><i class="fas fa-file-alt" style="margin-right:8px;"></i>DESCRIPCIÓN DE LA SOLUCIÓN</div>
      <div style="padding:12px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 6px 6px;">
        <textarea class="punto-textarea" style="min-height:80px;width:100%;" 
          onblur="saveDescripcionSolucion(this.value)">${escapeHtml(pd.descripcion_solucion || '')}</textarea>
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
      <div class="prese-section-title"><i class="fas fa-building" style="margin-right:8px;"></i>ALCANCE DE DEMATIQ AUTOMATIZACIÓN (A2.x)</div>
      <div id="prese-alcance2-list" style="padding:8px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 6px 6px;">
        <div class="loading-inline">Cargando...</div>
      </div>
      <button class="excel-add-btn" onclick="addPunto('prese_alcance2')"><i class="fas fa-plus"></i> Agregar Punto</button>
    </div>
  `;
  loadPuntos('prese_alcance1', 'prese-alcance1-list', 'A1');
  loadPuntos('prese_alcance2', 'prese-alcance2-list', 'A2');
}

async function saveDescripcionSolucion(val) {
  if (!projectData) return;
  projectData.descripcion_solucion = val;
  await saveProjectToAPI();
}

async function loadPuntos(tipo, containerId, prefix) {
  const container = document.getElementById(containerId);
  if (!container || !projectData) return;
  try {
    const result = await apiCall(`api/puntos.php?action=list&proyecto_id=${projectData.id}&tipo=${tipo}`);
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
    const result = await apiCall('api/puntos.php?action=create', 'POST', { proyecto_id: projectData.id, tipo, contenido: '' });
    const containerId = tipo === 'prese_alcance1' ? 'prese-alcance1-list' : (tipo === 'prese_alcance2' ? 'prese-alcance2-list' : 'listas-list');
    await loadPuntos(tipo, containerId, prefix || '#');
    showToast('Punto agregado', 'success');
  } catch(e) { showToast('Error al agregar punto', 'error'); }
}

function handlePuntoBlur(id, value, tipo, prefix) {
  debouncedSavePunto(id, value);
}

async function savePuntoToAPI(id, contenido) {
  try { await apiCall('api/puntos.php?action=update', 'POST', { id, contenido }); }
  catch(e) { console.error('Error saving punto:', e); }
}

async function deletePunto(id, tipo, prefix) {
  if (!confirm('¿Eliminar este punto?')) return;
  try {
    await apiCall('api/puntos.php?action=delete', 'POST', { id });
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
        <td></td>
        <td style="padding:8px 12px;"><span class="excel-display">MN</span></td>
        <td style="padding:8px 12px;text-align:right;font-weight:600;color:#0d47a1;">${formatCurrency(mn)}</td>
      </tr>`;
  }).join('');

  container.innerHTML = `
    <div class="reporte-grid">
      <div>
        <div class="reporte-tipo-cambio">
          <span>TIPO CAMBIO DÓLAR</span>
          <input type="number" class="reporte-tc-value" value="${tc.toFixed(2)}" step="0.01"
            oninput="handleTipoCambioChange(this.value)">
          <span style="margin-left:24px;">COTIZACION NO.</span>
          <span style="font-size:18px;color:#16a34a;margin-left:8px;">${projectData.numero_proyecto || '---'}</span>
        </div>
        <div class="excel-table-wrapper">
          <table class="excel-table">
            <thead><tr>
              <th style="min-width:200px;">SECCIÓN</th>
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
          <span class="reporte-info-label">ATENCIÓN</span>
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
          <th style="min-width:220px;">INGENIERÍA Y DESARROLLO</th>
          <th style="width:90px;">HORAS/MO</th>
          <th style="width:100px;">DÍAS TRABAJO</th>
          <th style="width:100px;">C/HORA USD</th>
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
          <th style="min-width:180px;">DESCRIPCIÓN</th>
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
  if (!seccion) { container.innerHTML = '<p>Sección no encontrada</p>'; return; }

  container.innerHTML = `
    <h3 class="tab-section-title"><span style="width:10px;height:10px;border-radius:2px;background:${seccion.color||'#1976d2'};display:inline-block;margin-right:8px;"></span>${seccion.titulo||'Equipo Eléctrico'}</h3>
    <div id="electrico-content"><div class="loading-inline">Cargando sub-secciones...</div></div>
    <button class="excel-add-btn" onclick="addSubSeccion('${seccion.id}')" style="margin-top:12px;border-color:#1976d2;color:#1976d2;">
      <i class="fas fa-plus"></i> Nueva Sub-sección
    </button>
  `;

  try {
    const result = await apiCall(`api/sub_secciones.php?action=list&seccion_id=${seccion.id}`);
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
          <input type="text" value="${escapeAttr(sub.titulo||'')}" placeholder="Nombre sub-sección"
            onblur="saveSubSeccion(${sub.id}, this.value)">
          <button class="delete-row-btn" style="opacity:1;color:rgba(255,255,255,0.8);" onclick="deleteSubSeccion(${sub.id},'${seccion.id}')">
            <i class="fas fa-trash"></i>
          </button>
        </div>
        <div class="excel-table-wrapper" style="border-radius:0 0 8px 8px;">
          <table class="excel-table">
            <thead><tr>
              <th style="width:50px;">PDA</th><th style="min-width:180px;">DESCRIPCIÓN</th>
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
    await apiCall('api/sub_secciones.php?action=create', 'POST', { seccion_id: seccionId, titulo: 'Nueva Sub-sección' });
    renderElectricoTab(document.getElementById('tab-content'));
    showToast('Sub-sección agregada', 'success');
  } catch(e) { showToast('Error al agregar sub-sección', 'error'); }
}

async function saveSubSeccion(id, titulo) {
  try { await apiCall('api/sub_secciones.php?action=update', 'POST', { id, titulo }); }
  catch(e) { console.error(e); }
}

async function deleteSubSeccion(id, seccionId) {
  if (!confirm('¿Eliminar esta sub-sección y todas sus partidas?')) return;
  try {
    await apiCall('api/sub_secciones.php?action=delete', 'POST', { id });
    renderElectricoTab(document.getElementById('tab-content'));
    showToast('Sub-sección eliminada', 'success');
  } catch(e) { showToast('Error', 'error'); }
}

async function addPartidaSubSeccion(seccionId, subSeccionId, tipo) {
  try {
    const result = await apiCall('api/partidas.php?action=create', 'POST', { seccion_id: seccionId, sub_seccion_id: subSeccionId, tipo });
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
    <h3 class="tab-section-title"><span style="width:10px;height:10px;border-radius:2px;background:${seccion.color||'#e65100'};display:inline-block;margin-right:8px;"></span>${seccion.titulo||'Equipo Mecánico'}</h3>
    <div class="excel-table-wrapper">
      <table class="excel-table">
        <thead><tr>
          <th style="width:50px;">PARTIDA</th>
          <th style="min-width:160px;">DESCRIPCIÓN</th>
          <th style="width:90px;">MARCA</th>
          <th style="width:90px;">MODELO</th>
          <th style="width:55px;">QYT</th>
          <th style="width:90px;">PRECIO LISTA</th>
          <th style="width:65px;">MONEDA</th>
          <th style="width:90px;">MATERIAL</th>
          <th style="width:100px;">MANO DE OBRA</th>
          <th style="width:80px;">DISEÑO</th>
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
  if (!seccion) { container.innerHTML = '<p>Sección no encontrada</p>'; return; }

  const equipoDiv = document.createElement('div');
  renderEquipoTable(equipoDiv, seccion);
  container.appendChild(equipoDiv);

  const gastosDiv = document.createElement('div');
  gastosDiv.className = 'gastos-especiales';
  gastosDiv.innerHTML = `
    <div class="gastos-title"><i class="fas fa-receipt" style="margin-right:8px;"></i>GASTOS ESPECIALES</div>
    <div id="gastos-list"><div class="loading-inline">Cargando...</div></div>
    <div style="display:flex;gap:8px;margin-top:8px;">
      <button class="excel-add-btn" style="flex:1;" onclick="addGastoEspecial('${seccion.id}','HOSPEDAJE')"><i class="fas fa-hotel"></i> Agregar Hospedaje</button>
      <button class="excel-add-btn" style="flex:1;" onclick="addGastoEspecial('${seccion.id}','IMSS')"><i class="fas fa-briefcase-medical"></i> Agregar IMSS</button>
    </div>
  `;
  container.appendChild(gastosDiv);

  try {
    const result = await apiCall(`api/insumos_especiales.php?action=list&seccion_id=${seccion.id}`);
    const gastos = result.data || result.insumos_especiales || [];
    renderGastosEspeciales(gastos, seccion.id);
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
    const np   = parseFloat(g.num_personas) || 0;
    const cpp  = parseFloat(g.costo_por_persona) || 0;
    const nv   = parseFloat(g.num_veces) || 0;
    const sub  = np * cpp * nv;
    const tmn  = sub;
    const tusd = tmn / tipoCambio();
    return `
      <tr data-gasto-id="${g.id}">
        <td><span class="excel-display" style="font-weight:700;color:#c62828;">${g.tipo||'---'}</span></td>
        <td><input class="excel-input" type="text" value="${escapeAttr(g.descripcion||'')}" onblur="handleGastoChange(${g.id},'descripcion',this.value)"></td>
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
          <th>TIPO</th><th style="min-width:160px;">DESCRIPCIÓN</th>
          <th>Nº PERSONAS</th><th>COSTO/PERSONA</th><th>Nº VECES</th>
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
  const np  = parseFloat(row.querySelectorAll('input[type="number"]')[0]?.value) || 0;
  const cpp = parseFloat(row.querySelectorAll('input[type="number"]')[1]?.value) || 0;
  const nv  = parseFloat(row.querySelectorAll('input[type="number"]')[2]?.value) || 0;
  const sub = np * cpp * nv;
  const subCell = row.querySelector('[data-field="subtotal"]');
  const mnCell  = row.querySelector('[data-field="total_mn"]');
  const usdCell = row.querySelector('[data-field="total_usd"]');
  if (subCell) subCell.textContent = formatCurrency(sub);
  if (mnCell)  mnCell.textContent  = formatCurrency(sub);
  if (usdCell) usdCell.textContent = formatCurrency(sub / tipoCambio());
}

async function handleGastoChange(id, field, value) {
  try { await apiCall('api/insumos_especiales.php?action=update', 'POST', { id, [field]: value }); }
  catch(e) { console.error(e); }
}

async function addGastoEspecial(seccionId, tipo) {
  try {
    await apiCall('api/insumos_especiales.php?action=create', 'POST', { seccion_id: seccionId, tipo });
    renderInsumosTab(document.getElementById('tab-content'));
    showToast(`${tipo} agregado`, 'success');
  } catch(e) { showToast('Error al agregar', 'error'); }
}

async function deleteGasto(id, seccionId) {
  if (!confirm('¿Eliminar este gasto?')) return;
  try {
    await apiCall('api/insumos_especiales.php?action=delete', 'POST', { id });
    renderInsumosTab(document.getElementById('tab-content'));
    showToast('Gasto eliminado', 'success');
  } catch(e) { showToast('Error', 'error'); }
}

async function renderListasTab(container) {
  container.innerHTML = `
    <h3 class="tab-section-title"><i class="fas fa-list-ol" style="margin-right:8px;"></i>LISTAS</h3>
    <div id="listas-list"><div class="loading-inline">Cargando...</div></div>
    <button class="excel-add-btn" onclick="addPunto('listas')"><i class="fas fa-plus"></i> Agregar Punto</button>
  `;
  await loadPuntos('listas', 'listas-list', '#');
  const container2 = document.getElementById('listas-list');
  if (!container2) return;
  try {
    const result = await apiCall(`api/puntos.php?action=list&proyecto_id=${projectData.id}&tipo=listas`);
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

async function renderIOTab(container) {
  const seccion = projectData?.secciones?.find(s => s.codigo === 'IO');
  container.innerHTML = `
    <h3 class="tab-section-title"><i class="fas fa-plug" style="margin-right:8px;"></i>I/O</h3>
    <div id="io-content"><div class="loading-inline">Cargando...</div></div>
    <button class="excel-add-btn" onclick="addIORow('${seccion?.id||''}')"><i class="fas fa-plus"></i> Agregar Fila</button>
  `;

  if (!seccion) { document.getElementById('io-content').innerHTML = '<p>Sección I/O no encontrada</p>'; return; }

  try {
    const result = await apiCall(`api/io.php?action=list&seccion_id=${seccion.id}`);
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
      <td><input class="excel-input" type="text" value="${escapeAttr(r.descripcion_entrada||'')}" placeholder="Descripción" onblur="handleIOBlur(${r.id},'descripcion_entrada',this.value)"></td>
      <td><input class="excel-input" type="text" value="${escapeAttr(r.salida||'')}" placeholder="E.g: Q0.0" onblur="handleIOBlur(${r.id},'salida',this.value)"></td>
      <td><input class="excel-input" type="text" value="${escapeAttr(r.descripcion_salida||'')}" placeholder="Descripción" onblur="handleIOBlur(${r.id},'descripcion_salida',this.value)"></td>
      <td><button class="delete-row-btn" style="opacity:1;" onclick="deleteIORow(${r.id},'${seccionId}')"><i class="fas fa-times"></i></button></td>
    </tr>
  `).join('');

  container.innerHTML = `
    <div class="excel-table-wrapper">
      <table class="excel-table">
        <thead><tr>
          <th style="width:100px;">ENTRADA</th>
          <th style="min-width:220px;">DESCRIPCIÓN ENTRADA</th>
          <th style="width:100px;">SALIDA</th>
          <th style="min-width:220px;">DESCRIPCIÓN SALIDA</th>
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
  try { await apiCall('api/io.php?action=update', 'POST', { id, [field]: value }); }
  catch(e) { console.error(e); }
}

async function addIORow(seccionId) {
  if (!seccionId) return;
  try {
    await apiCall('api/io.php?action=create', 'POST', { seccion_id: seccionId });
    renderIOTab(document.getElementById('tab-content'));
    showToast('Fila agregada', 'success');
  } catch(e) { showToast('Error al agregar', 'error'); }
}

async function deleteIORow(id, seccionId) {
  if (!confirm('¿Eliminar esta fila?')) return;
  try {
    await apiCall('api/io.php?action=delete', 'POST', { id });
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
    <button class="excel-add-btn" onclick="addCondicion()" style="margin-top:16px;"><i class="fas fa-plus"></i> Agregar Condición</button>
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
  const iva     = subtotal * 0.16;
  const totalMN = subtotal + iva;
  const totalUSD = totalMN / tipoCambio();

  const setEl = (id, val) => { const el = document.getElementById(id); if(el) el.textContent = val; };
  setEl('total-subtotal', formatCurrency(subtotal));
  setEl('total-iva',      formatCurrency(iva));
  setEl('total-mn',       formatCurrency(totalMN));
  setEl('total-usd',      formatCurrency(totalUSD));
  setEl('total-letras',   numberToWords(totalMN));

  if (projectData) {
    projectData.subtotal_mn = subtotal;
    projectData.iva         = iva;
    projectData.total_mn    = totalMN;
    projectData.total_usd   = totalUSD;
  }
}

async function addPartida(seccionId, tipo) {
  try {
    const result = await apiCall('api/partidas.php?action=create', 'POST', { seccion_id: seccionId, tipo });
    const partida = result.data || result.partida;
    if (partida) {
      const sec = projectData.secciones?.find(s => s.id?.toString() === seccionId?.toString());
      if (sec) { if (!sec.partidas) sec.partidas = []; sec.partidas.push(partida); }
      switchTab(currentTab);
      showToast('Partida agregada', 'success');
    }
  } catch(e) { showToast(e.message||'Error al agregar partida', 'error'); }
}

async function deletePartida(id, tipo, seccionId) {
  if (!confirm('¿Eliminar esta partida?')) return;
  try {
    await apiCall('api/partidas.php?action=delete', 'POST', { id, tipo });
    if (projectData?.secciones) {
      for (const sec of projectData.secciones) {
        if (sec.partidas) sec.partidas = sec.partidas.filter(p => p.id !== id);
      }
    }
    recalculateSectionTotals();
    updateTotals();
    switchTab(currentTab);
    showToast('Partida eliminada', 'success');
  } catch(e) { showToast(e.message||'Error', 'error'); }
}

async function savePartidaToAPI(id, field, value, tipo) {
  try { await apiCall('api/partidas.php?action=update', 'POST', { id, tipo, [field]: value }); }
  catch(e) { console.error('Error saving partida:', e); }
}

async function saveInsumoToAPI(id, field, value) {
  try { await apiCall('api/insumos_especiales.php?action=update', 'POST', { id, [field]: value }); }
  catch(e) { console.error(e); }
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
  try { await apiCall('api/condiciones.php?action=update', 'POST', { id, contenido }); }
  catch(e) { console.error(e); }
}

async function addCondicion() {
  try {
    const result = await apiCall('api/condiciones.php?action=create', 'POST', { proyecto_id: projectData.id });
    if (result.data || result.condicion) {
      if (!projectData.condiciones) projectData.condiciones = [];
      projectData.condiciones.push(result.data || result.condicion);
      switchTab('CONDICIONES');
      showToast('Condición agregada', 'success');
    }
  } catch(e) { showToast(e.message||'Error', 'error'); }
}

async function deleteCondicion(id) {
  if (!confirm('¿Eliminar esta condición?')) return;
  try {
    await apiCall('api/condiciones.php?action=delete', 'POST', { id });
    if (projectData?.condiciones) projectData.condiciones = projectData.condiciones.filter(c => c.id !== id);
    switchTab('CONDICIONES');
    showToast('Condición eliminada', 'success');
  } catch(e) { showToast(e.message||'Error', 'error'); }
}

async function saveProject() {
  await saveProjectToAPI();
  showToast('Proyecto guardado exitosamente', 'success');
  unsavedChanges = false;
}

async function saveProjectToAPI() {
  if (!projectData) return;
  const data = {
    id: projectData.id,
    atencion:          document.getElementById('field-atencion')?.value || '',
    telefono_cliente:  document.getElementById('field-telefono')?.value || '',
    empresa_cliente:   document.getElementById('field-empresa')?.value || '',
    email_cliente:     document.getElementById('field-email')?.value || '',
    fecha_creacion:    document.getElementById('field-fecha')?.value || '',
    fecha_vencimiento: document.getElementById('field-vencimiento')?.value || '',
    tipo_cambio_usd:   tipoCambio(),
    referencia:        document.getElementById('field-referencia')?.value || '',
    descripcion_solucion: document.getElementById('field-descripcion')?.value || '',
    carpeta_link:      projectData.carpeta_link || ''
  };
  try { await apiCall('api/proyectos.php?action=update', 'POST', data); unsavedChanges = false; }
  catch(e) { showToast('Error al guardar proyecto', 'error'); console.error(e); }
}

function convertToUSD() {
  document.getElementById('usd-tipo-cambio').value = tipoCambio();
  openModal('modal-usd');
}

async function applyUSDConversion() {
  const newTC = parseFloat(document.getElementById('usd-tipo-cambio').value) || 20;
  document.getElementById('field-tipo-cambio').value = newTC;
  recalculateAllSections();
  updateTotals();
  switchTab(currentTab);
  debouncedSaveProject();
  closeModal('modal-usd');
  showToast(`Tipo de cambio actualizado a $${newTC.toFixed(2)}`, 'success');
}

function goBack() {
  if (unsavedChanges && !confirm('Hay cambios sin guardar. ¿Deseas salir?')) return;
  window.location.href = 'dashboard.html';
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
