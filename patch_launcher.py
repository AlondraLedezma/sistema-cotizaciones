with open('launcher.py', 'r', encoding='utf-8') as f:
    text = f.read()

patch = '''def iniciar_flask():
    import sys
    sys.stdout = open('flask_access.log', 'w', buffering=1)
    sys.stderr = open('flask_error.log', 'w', buffering=1)
    from app import app
    app.run(host="127.0.0.1", port=5000, debug=False, use_reloader=False)'''

text = text.replace('def iniciar_flask():\n    from app import app\n    app.run(host="127.0.0.1", port=5000, debug=False, use_reloader=False)', patch)

with open('launcher.py', 'w', encoding='utf-8') as f:
    f.write(text)

print('Patched launcher.py to save logs')
