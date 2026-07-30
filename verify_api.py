from app import app
from flask import json

with app.test_client() as client:
    # First we need to login via the session
    with client.session_transaction() as sess:
        sess['logged_in'] = True
        sess['user_id'] = 1
        sess['rol'] = 'admin'

    resp = client.get('/api/proyecto/1')
    data = resp.get_json()
    if data:
        for k in ['insumos_cd', 'insumos_en_cd', 'insumos_transporte', 'insumos_gastos_admin', 'insumos_imss']:
            print(f"{k}: {len(data.get(k, []))} items")
            if len(data.get(k, [])) > 0:
                print(f"  First item: {data[k][0]}")
