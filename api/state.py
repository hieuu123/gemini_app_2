# state.py
from threading import Event

# Event Stream
log_messages = []
job_messages = []

# Chatbot
chat_sessions = {}
current_chat_index = 0

# Scraping / threading
reset_flag = Event()
processing_thread = None
retry_count = 0
displayed_job_ids = set()

current_search_id = None

def send_log(msg):
    print(msg)
    log_messages.append(msg)

def send_job(job):
    jid = job.get("job_id")
    if jid and jid not in displayed_job_ids:
        displayed_job_ids.add(jid)
        job_messages.append(job)
