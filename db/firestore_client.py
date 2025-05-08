# db/firestore_client.py
import os
import firebase_admin
from firebase_admin import credentials, firestore
import config

# Chỉ init một lần
if not firebase_admin._apps:
    cred = credentials.Certificate(config.FIREBASE_CREDENTIALS_PATH)
    firebase_admin.initialize_app(cred, {
        "projectId": config.FIREBASE_PROJECT_ID,
    })

db = firestore.client()
