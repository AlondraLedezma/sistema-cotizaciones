with open('old_proyecto.html', 'r', encoding='utf-8', errors='ignore') as f:
    text = f.read()

for line in text.splitlines():
    if '<table' in line or 'excel' in line.lower() or 'grid' in line.lower():
        print(line.strip()[:100])
