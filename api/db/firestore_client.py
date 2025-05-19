# db/firestore_client.py
import os, json
from firebase_admin import credentials, initialize_app, firestore

# 1) Lấy JSON string của service account và project ID từ ENV
sa_json    = os.getenv("FIREBASE_SA_JSON")
project_id = os.getenv("FIREBASE_PROJECT_ID")
if not sa_json or not project_id:
    raise RuntimeError("Bạn phải set ENV FIREBASE_SA_JSON và FIREBASE_PROJECT_ID")

# 2) Parse JSON và khởi tạo credentials
cred = credentials.Certificate(json.loads(sa_json))

# 3) Initialize App và Firestore client
initialize_app(cred, {"projectId": project_id})
db = firestore.client()
