with open('app.py', 'r', encoding='utf-8') as f:
    text = f.read()
    lines = text.splitlines()
    for i, line in enumerate(lines):
        if '/api/proyecto' in line:
            print(f'{i}: {line}')
