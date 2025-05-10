import os
from dotenv import load_dotenv

# Load các biến môi trường từ .env
load_dotenv()

FIREBASE_CREDENTIALS_PATH = os.getenv("FIREBASE_CREDENTIALS_PATH")
FIREBASE_PROJECT_ID     = os.getenv("FIREBASE_PROJECT_ID")

# === Database configuration ===
DB_HOST     = os.getenv("DB_HOST", "localhost")
DB_PORT     = int(os.getenv("DB_PORT", 3360))
DB_USER     = os.getenv("DB_USER", "root")
DB_PASSWORD = os.getenv("DB_PASSWORD", "")
DB_NAME     = os.getenv("DB_NAME", "gemini_app")

# === LinkedIn scraping configuration ===
LINKEDIN_BASE_URL      = "https://www.linkedin.com/jobs/search/"
LINKEDIN_JOB_VIEW_URL  = "https://www.linkedin.com/jobs/view/"
LINKEDIN_DEFAULT_PARAMS = {
    'currentJobId': '3965318907',
    'f_WT': '2',
    'origin': 'JOB_SEARCH_PAGE_LOCATION_AUTOCOMPLETE',
    'refresh': 'true',
}
REQUEST_HEADERS = {
    "User-Agent": os.getenv(
        "USER_AGENT",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/114.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "en-US,en;q=0.9",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
}

# === Chatbot (Gemini) configuration ===
API_KEY = os.getenv("API_KEY")
MODEL_NAME = "gemini-2.0-flash"
GENERATION_CONFIG = {
    "temperature": 1,
    "top_p": 0.95,
    "top_k": 64,
    "max_output_tokens": 8192,
    "response_mime_type": "text/plain",
}
SYSTEM_INSTRUCTION = (
    "You're Jack, a job search assistant. Provide relevant job recommendations "
    "based on user preferences (salary, job type, hours, etc.) without repeatedly "
    "asking for details. Use the latest knowledge.json data, updated three times per session. "
    "Communicate clearly and concisely, keeping responses brief yet informative. "
    "When recommending a job, include a brief introduction and a link opened in new tab: "
    "<a href='https://www.linkedin.com/jobs/view/job_id' target='_blank'>See details</a>. "
    "Ideally, suggest 3-5 jobs per consultation."
)

# === Miscellaneous ===
KNOWLEDGE_FILE_PATH = "knowledge.json"
TIMEZONE           = "Asia/Ho_Chi_Minh"
