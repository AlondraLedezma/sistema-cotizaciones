import urllib.request
import urllib.parse
from http.cookiejar import CookieJar

cj = CookieJar()
opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj))

# First, attempt to login. We don't have login credentials, but we can bypass it if we mock the session.
# Actually, I can just create a session cookie using the app's secret key.
import sys
sys.path.append('.')
from flask import session
from app import app

with app.test_client() as client:
    with client.session_transaction() as sess:
        sess['user_id'] = 1
        sess['user_nombre'] = "Test User"
        sess['user_email'] = "test@example.com"
        
    response = client.get('/proyecto/7')
    print("Status:", response.status_code)
    print("URL:", response.request.url)
    
    if response.status_code != 200:
        print("Redirect or Error")
    else:
        print("Success")
