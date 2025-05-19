# db/firestore_client.py
import os, json
from firebase_admin import credentials, initialize_app, firestore

# Đọc JSON service account straight từ ENV
sa_json = os.environ.get("FIREBASE_SA_JSON")
project_id = os.environ.get("FIREBASE_PROJECT_ID")
if not sa_json or not project_id:
    raise RuntimeError("Bạn phải set biến ENV FIREBASE_SA_JSON và FIREBASE_PROJECT_ID")

sa_dict = json.loads(sa_json)
cred    = credentials.Certificate(sa_dict)
initialize_app(cred, {"projectId": project_id})
db = firestore.client()
