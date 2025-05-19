import os, json
from firebase_admin import credentials, initialize_app, firestore

# Nạp JSON key từ ENV VAR
sa_json = os.environ["FIREBASE_SA_JSON"]
cred    = credentials.Certificate(json.loads(sa_json))

# Khởi app với projectId từ ENV
initialize_app(cred, { "projectId": os.environ["FIREBASE_PROJECT_ID"] })

# Xuất client Firestore toàn cục
db = firestore.client()
