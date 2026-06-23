import threading
import time
import socket
import sys
import os

os.chdir(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

def esperar_servidor(host="127.0.0.1", port=5000, timeout=15):
    inicio = time.time()
    while time.time() - inicio < timeout:
        try:
            with socket.create_connection((host, port), timeout=1):
                return True
        except OSError:
            time.sleep(0.15)
    return False

def iniciar_flask():
    from app import app
    app.run(host="127.0.0.1", port=5000, debug=False, use_reloader=False)

if __name__ == "__main__":
    hilo = threading.Thread(target=iniciar_flask, daemon=True)
    hilo.start()

    if not esperar_servidor():
        import tkinter, tkinter.messagebox
        root = tkinter.Tk(); root.withdraw()
        tkinter.messagebox.showerror(
            "DEMATIQ — Error",
            "No se pudo iniciar el servidor.\n\nVerifica que MySQL esté activo en XAMPP."
        )
        sys.exit(1)

    import webview
    window = webview.create_window(
        title="DEMATIQ Cotizaciones 2026",
        url="http://127.0.0.1:5000",
        width=1366,
        height=768,
        min_size=(960, 600),
        resizable=True,
        text_select=False,
        zoomable=False,
    )

    try:
        icon_path = os.path.join(os.path.dirname(__file__), "static", "img", "logo.ico")
        if os.path.exists(icon_path):
            webview.start(icon=icon_path, debug=False)
        else:
            webview.start(debug=False)
    except Exception:
        webview.start(debug=False)
