# api/firebase_config.py
import os, json
from firebase_admin import credentials, initialize_app, firestore

# Load service account JSON (được đưa vào ENV variable FIREBASE_SA_JSON)
sa_json = os.environ["FIREBASE_SA_JSON"]
cred    = credentials.Certificate(json.loads(sa_json))
initialize_app(cred, {"projectId": os.environ["FIREBASE_PROJECT_ID"]})

# Export Firestore client
db = firestore.client()
