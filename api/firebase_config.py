# api/firebase_config.py
import json
from firebase_admin import credentials, initialize_app, firestore
import config

sa_dict = json.loads(config.FIREBASE_SA_JSON)
cred    = credentials.Certificate(sa_dict)
initialize_app(cred, {"projectId": config.FIREBASE_PROJECT_ID})
db = firestore.client()
