import requests

endpoints = [
    'http://127.0.0.1:8000/api/products/products/',
    'http://127.0.0.1:8000/api/products/products/dashboard_stats/',
    'http://127.0.0.1:8000/api/sales/sales/',  
    'http://127.0.0.1:8000/api/sales/sales/dashboard_stats/',
    'http://127.0.0.1:8000/api/analytics/dashboard_overview/'
]

print('=== PRUEBA FINAL ===')
for url in endpoints:
    try:
        response = requests.get(url)
        if response.status_code == 200:
            print(f'✓ {url.split("/")[-2:]}: OK')
        else:
            print(f'✗ {url.split("/")[-2:]}: Error {response.status_code}')
    except Exception as e:
        print(f'✗ {url.split("/")[-2:]}: Error')