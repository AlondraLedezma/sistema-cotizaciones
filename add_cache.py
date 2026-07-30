with open('templates/proyecto_cotizacion.html', 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace('<script src="/static/js/proyecto_cotizacion.js"></script>', '<script src="/static/js/proyecto_cotizacion.js?v=2"></script>')
text = text.replace('<script src="/static/js/utils.js"></script>', '<script src="/static/js/utils.js?v=2"></script>')
text = text.replace('<script src="/static/js/pdf.js"></script>', '<script src="/static/js/pdf.js?v=2"></script>')

with open('templates/proyecto_cotizacion.html', 'w', encoding='utf-8') as f:
    f.write(text)

print('Added cache buster')
