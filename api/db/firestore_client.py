# db/firestore_client.py
import os, json
from firebase_admin import credentials, initialize_app, firestore

# nếu có JSON string ở env thì parse, còn không fallback về path file
sa_json = os.getenv("FIREBASE_SA_JSON")
project_id = os.getenv("FIREBASE_PROJECT_ID")

if sa_json:
    cert_dict = json.loads(sa_json)
    cred = credentials.Certificate(cert_dict)
else:
    path = os.getenv("FIREBASE_CREDENTIALS_PATH")
    if not path:
        raise RuntimeError("Bạn phải set FIREBASE_SA_JSON hoặc FIREBASE_CREDENTIALS_PATH")
    cred = credentials.Certificate(path)

initialize_app(cred, {"projectId": project_id})
db = firestore.client()
