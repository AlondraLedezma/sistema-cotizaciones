let currentUser = null;
let allProjects = [];
let monthlyChart = null;
let deleteProjectId = null;

document.addEventListener('DOMContentLoaded', async () => {
  currentUser = await checkAuth();
  if (!currentUser) return;

  const userDisplay = document.getElementById('user-display-name');
  if (userDisplay) {
    userDisplay.textContent = currentUser.email || 'Administrador';
  }

  await loadStats();
  await loadProjects();
});

async function loadStats() {
  try {
    const result = await apiCall('api/proyectos.php?action=stats');
    const data = result.data || result.stats || {};

    const statTotal = document.getElementById('stat-total');
    const statMonth = document.getElementById('stat-month');
    const statAmount = document.getElementById('stat-amount');

    if (statTotal) animateCounter(statTotal, data.total_proyectos || 0, 1200);
    if (statMonth) animateCounter(statMonth, data.proyectos_mes || data.proyectos_mes_actual || 0, 1200);
    if (statAmount) animateCounter(statAmount, data.monto_total_mn || 0, 1500, true);

    if (data.proyectos_recientes && data.proyectos_recientes.length > 0) {
      renderProjectChart(data.proyectos_recientes);
    } else if (data.monthly_data) {
      renderChart(data.monthly_data);
    }
  } catch (error) {
    console.error('Error loading stats:', error);
    showToast('Error al cargar estadísticas', 'error');
  }
}

async function loadProjects(search = '', fechaDesde = '', fechaHasta = '') {
  try {
    const sort = document.getElementById('sort-select')?.value || 'created_at_desc';
    let url = `api/proyectos.php?action=list&sort=${sort}`;
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (fechaDesde) params.set('fecha_desde', fechaDesde);
    if (fechaHasta) params.set('fecha_hasta', fechaHasta);
    const qs = params.toString();
    if (qs) url += '&' + qs;

    const result = await apiCall(url);
    allProjects = result.data || result.proyectos || [];
    renderProjectsTable(allProjects);
  } catch (error) {
    console.error('Error loading projects:', error);
    showToast('Error al cargar proyectos', 'error');
  }
}

function renderProjectsTable(projects) {
  const tbody = document.getElementById('projects-tbody');
  const emptyState = document.getElementById('empty-state');
  const tableContainer = document.querySelector('.table-container');

  if (!tbody) return;

  if (!projects || projects.length === 0) {
    tbody.innerHTML = '';
    if (emptyState) emptyState.style.display = 'block';
    if (tableContainer) tableContainer.style.display = 'none';
    return;
  }

  if (emptyState) emptyState.style.display = 'none';
  if (tableContainer) tableContainer.style.display = 'block';

  tbody.innerHTML = projects.map((p, index) => `
    <tr style="animation: fadeIn 0.4s ease both; animation-delay: ${index * 0.05}s;">
      <td style="color:var(--text-muted);">${index + 1}</td>
      <td>
        <span class="badge badge-cyan">${p.numero_proyecto || '---'}</span>
      </td>
      <td style="font-weight:600;max-width:250px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${p.nombre_proyecto || ''}</td>
      <td style="color:var(--text-secondary);">${p.empresa_cliente || ''}</td>
      <td style="color:var(--text-secondary);white-space:nowrap;">${formatDate(p.fecha_creacion)}</td>
      <td style="font-weight:600;text-align:right;">${formatCurrency(p.total_mn)}</td>
      <td style="font-weight:600;text-align:right;color:var(--accent-light);">${formatCurrency(p.total_usd)}</td>
      <td>
        <div class="table-actions">
          <button class="btn-icon view" onclick="viewProject(${p.id})" title="Ver">
            <i class="fas fa-eye"></i>
          </button>
          <button class="btn-icon edit" onclick="editProject(${p.id})" title="Editar">
            <i class="fas fa-pencil-alt"></i>
          </button>
          <button class="btn-icon pdf" onclick="downloadPDF(${p.id})" title="PDF">
            <i class="fas fa-file-pdf"></i>
          </button>
          <button class="btn-icon delete" onclick="openDeleteModal(${p.id})" title="Eliminar">
            <i class="fas fa-trash-alt"></i>
          </button>
        </div>
      </td>
    </tr>
  `).join('');
}

const searchProjects = debounce(() => {
  const search = document.getElementById('search-input')?.value || '';
  const fechaDesde = document.getElementById('filter-date-from')?.value || '';
  const fechaHasta = document.getElementById('filter-date-to')?.value || '';
  loadProjects(search, fechaDesde, fechaHasta);
}, 400);

function openCreateModal() {
  document.getElementById('create-nombre').value = '';
  document.getElementById('create-empresa').value = '';
  document.getElementById('create-contacto').value = '';
  document.getElementById('create-telefono').value = '';
  document.getElementById('create-email').value = '';
  document.getElementById('create-atencion').value = '';
  document.getElementById('create-referencia').value = '';
  document.getElementById('create-carpeta').value = '';
  openModal('modal-create');
}

async function createProject() {
  const nombre = document.getElementById('create-nombre').value.trim();
  if (!nombre) {
    showToast('El nombre del proyecto es obligatorio', 'warning');
    return;
  }

  const data = {
    nombre_proyecto: nombre,
    empresa_cliente: document.getElementById('create-empresa').value.trim(),
    contacto_cliente: document.getElementById('create-contacto').value.trim(),
    telefono_cliente: document.getElementById('create-telefono').value.trim(),
    email_cliente: document.getElementById('create-email').value.trim(),
    atencion: document.getElementById('create-atencion').value.trim(),
    referencia: document.getElementById('create-referencia').value.trim(),
    carpeta_link: document.getElementById('create-carpeta').value.trim()
  };

  try {
    showLoading();
    const result = await apiCall('api/proyectos.php?action=create', 'POST', data);
    hideLoading();
    closeModal('modal-create');
    showToast('Proyecto creado exitosamente', 'success');

    if (result.data && result.data.id) {
      window.location.href = `proyecto.html?id=${result.data.id}`;
    } else {
      await loadProjects();
      await loadStats();
    }
  } catch (error) {
    hideLoading();
    showToast(error.message || 'Error al crear proyecto', 'error');
  }
}

function viewProject(id) {
  window.location.href = `proyecto.html?id=${id}&mode=view`;
}

function editProject(id) {
  window.location.href = `proyecto.html?id=${id}`;
}

function downloadPDF(id) {
  window.location.href = `proyecto.html?id=${id}&action=pdf`;
}

function openDeleteModal(id) {
  deleteProjectId = id;
  document.getElementById('delete-password').value = '';
  openModal('modal-delete');
}

async function confirmDelete() {
  const password = document.getElementById('delete-password').value;
  if (!password) {
    showToast('Ingresa la clave de eliminación', 'warning');
    return;
  }

  try {
    showLoading();
    await apiCall('api/proyectos.php?action=delete', 'POST', {
      id: deleteProjectId,
      clave: password
    });
    hideLoading();
    closeModal('modal-delete');
    showToast('Proyecto eliminado', 'success');
    deleteProjectId = null;

    await loadProjects();
    await loadStats();
  } catch (error) {
    hideLoading();
    showToast(error.message || 'Error al eliminar proyecto', 'error');
  }
}

function openSettingsModal() {
  const emailDisplay = document.getElementById('settings-current-email');
  if (emailDisplay && currentUser) {
    emailDisplay.textContent = currentUser.email || '';
  }
  document.getElementById('settings-email').value = '';
  document.getElementById('settings-current-pass').value = '';
  document.getElementById('settings-new-pass').value = '';
  openModal('modal-settings');
}

async function updateCredentials() {
  const newEmail = document.getElementById('settings-email').value.trim();
  const currentPass = document.getElementById('settings-current-pass').value;
  const newPass = document.getElementById('settings-new-pass').value;

  if (!currentPass) {
    showToast('Ingresa tu contraseña actual', 'warning');
    return;
  }

  const data = { current_password: currentPass };
  if (newEmail) data.new_email = newEmail;
  if (newPass) data.new_password = newPass;

  try {
    showLoading();
    await apiCall('api/auth.php?action=update_credentials', 'POST', data);
    hideLoading();
    closeModal('modal-settings');
    showToast('Credenciales actualizadas exitosamente', 'success');

    currentUser = await checkAuth();
    const userDisplay = document.getElementById('user-display-name');
    if (userDisplay && currentUser) {
      userDisplay.textContent = currentUser.email || 'Administrador';
    }
  } catch (error) {
    hideLoading();
    showToast(error.message || 'Error al actualizar credenciales', 'error');
  }
}

function renderChart(data) {
  const canvas = document.getElementById('chart-monthly');
  if (!canvas || !data) return;

  const ctx = canvas.getContext('2d');
  const gradient = ctx.createLinearGradient(0, 0, 0, 300);
  gradient.addColorStop(0, 'rgba(0, 180, 216, 0.5)');
  gradient.addColorStop(1, 'rgba(13, 71, 161, 0.1)');

  if (monthlyChart) monthlyChart.destroy();

  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const labels = data.map(d => months[(d.month || d.mes) - 1] || d.month || d.mes);
  const values = data.map(d => parseFloat(d.total || d.monto) || 0);

  monthlyChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Monto MN',
        data: values,
        backgroundColor: gradient,
        borderColor: '#00b4d8',
        borderWidth: 2,
        borderRadius: 8,
        borderSkipped: false,
        maxBarThickness: 50
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#111827',
          titleFont: { family: 'Outfit', weight: '600' },
          bodyFont: { family: 'Inter' },
          borderColor: 'rgba(255,255,255,0.1)',
          borderWidth: 1,
          cornerRadius: 8,
          padding: 12,
          callbacks: { label: ctx => formatCurrency(ctx.parsed.y) }
        }
      },
      scales: {
        x: { grid: { color: 'rgba(255,255,255,0.05)', drawBorder: false }, ticks: { color: '#94a3b8', font: { family: 'Outfit', weight: '500', size: 12 } } },
        y: {
          grid: { color: 'rgba(255,255,255,0.05)', drawBorder: false },
          ticks: {
            color: '#94a3b8',
            font: { family: 'Outfit', weight: '500', size: 11 },
            callback: v => v >= 1e6 ? '$' + (v/1e6).toFixed(1)+'M' : v >= 1000 ? '$'+(v/1000).toFixed(0)+'K' : '$'+v
          },
          beginAtZero: true
        }
      }
    }
  });
}

function renderProjectChart(projects) {
  const canvas = document.getElementById('chart-monthly');
  if (!canvas || !projects || projects.length === 0) return;

  const ctx = canvas.getContext('2d');

  const colors = projects.map((_, i) => {
    const hue = 200 + (i * 15) % 80;
    return `hsl(${hue}, 70%, 55%)`;
  });

  if (monthlyChart) monthlyChart.destroy();

  const labels = projects.map(p => p.numero_proyecto || p.nombre_proyecto?.substring(0, 12) || `P${p.id}`);
  const values = projects.map(p => parseFloat(p.total_mn) || 0);

  monthlyChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Total MN por Proyecto',
        data: values,
        backgroundColor: colors,
        borderColor: colors.map(c => c.replace('55%', '35%')),
        borderWidth: 2,
        borderRadius: 6,
        borderSkipped: false,
        maxBarThickness: 60
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#111827',
          titleFont: { family: 'Outfit', weight: '700', size: 13 },
          bodyFont: { family: 'Inter', size: 12 },
          borderColor: 'rgba(255,255,255,0.1)',
          borderWidth: 1,
          cornerRadius: 8,
          padding: 14,
          callbacks: {
            title: items => {
              const p = projects[items[0].dataIndex];
              return p.nombre_proyecto || p.numero_proyecto;
            },
            label: ctx => [
              `MN: ${formatCurrency(ctx.parsed.y)}`,
              `USD: ${formatCurrency(parseFloat(projects[ctx.dataIndex]?.total_usd) || 0)}`
            ]
          }
        }
      },
      scales: {
        x: {
          grid: { color: 'rgba(255,255,255,0.04)', drawBorder: false },
          ticks: { color: '#94a3b8', font: { family: 'Outfit', weight: '600', size: 11 }, maxRotation: 45 }
        },
        y: {
          grid: { color: 'rgba(255,255,255,0.05)', drawBorder: false },
          ticks: {
            color: '#94a3b8',
            font: { family: 'Outfit', weight: '500', size: 11 },
            callback: v => v >= 1e6 ? '$'+(v/1e6).toFixed(1)+'M' : v >= 1000 ? '$'+(v/1000).toFixed(0)+'K' : '$'+v
          },
          beginAtZero: true
        }
      }
    }
  });
}
