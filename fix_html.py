with open('templates/proyecto_cotizacion.html', 'r', encoding='utf-8') as f:
    text = f.read()

import re
replacement = """
    <div class="proyecto-header card" style="margin-bottom:12px;">
      <div class="header-toggle" onclick="toggleHeader()">
        <h3><i class="fas fa-info-circle" style="color:var(--accent);margin-right:8px;"></i>Información del Proyecto</h3>
        <i class="fas fa-chevron-up" id="header-chevron"></i>
      </div>
      <div id="header-content" class="header-content">
        <div class="header-grid">
          <div class="header-col">
            <div class="field-group">
              <label>Atención:</label>
              <input type="text" id="field-atencion" class="input-field" placeholder="A la atención de...">
            </div>
            <div class="field-group">
              <label>Teléfono:</label>
              <input type="text" id="field-telefono" class="input-field" placeholder="Teléfono de contacto">
            </div>
            <div class="field-group">
              <label>Empresa:</label>
              <input type="text" id="field-empresa" class="input-field" placeholder="Nombre de la empresa">
            </div>
            <div class="field-group">
              <label>E-mail:</label>
              <input type="email" id="field-email" class="input-field" placeholder="email@empresa.com">
            </div>
          </div>
          <div class="header-col">
            <div class="field-group">
              <label>Cotización No.:</label>
              <span id="field-numero" class="field-display">---</span>
            </div>
            <div class="field-group">
              <label>Días de Vigencia:</label>
              <input type="number" id="field-dias-vigencia" class="input-field" min="1" value="30" placeholder="Días">
            </div>
            <div class="field-group">
              <label>Tipo Cambio USD:</label>
              <input type="number" id="field-tipo-cambio" class="input-field" step="0.01" value="20.00">
            </div>
          </div>
        </div>
        <div class="field-group full-width">
          <label>Referencia:</label>
          <input type="text" id="field-referencia" class="input-field" placeholder="Referencia del proyecto">
        </div>
        <div class="field-group full-width">
          <label>Descripción de la Solución:</label>
          <textarea id="field-descripcion" class="input-field" rows="2" placeholder="Descripción detallada..."></textarea>
        </div>
        <div class="field-group full-width">
          <label>Carpeta del Proyecto:</label>
          <div id="carpeta-field-container">
            <input type="text" id="field-carpeta" class="input-field" placeholder="Ruta a la carpeta del proyecto">
          </div>
        </div>
      </div>
    </div>

    <div class="tabs-bar" id="tabs-bar">
    </div>
"""

# The file currently has some messed up content.
# I will clear it starting from `<div class="header-toggle" onclick="toggleHeader()">` 
# all the way to `<div id="tab-content" class="tab-content card">`
start_idx = text.find('<div class="header-toggle" onclick="toggleHeader()">')
end_idx = text.find('<div id="tab-content" class="tab-content card">')
if start_idx != -1 and end_idx != -1:
    new_text = text[:start_idx-4] + replacement + "\n    " + text[end_idx:]
    with open('templates/proyecto_cotizacion.html', 'w', encoding='utf-8') as f:
        f.write(new_text)
    print("Fixed HTML")
else:
    print("Could not find indices")
