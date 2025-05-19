import os
from flask import Flask
import datetime
import json
import google.generativeai as genai
import api.config as config
# from db.connection import connect_db
from api.firebase_config import db

# from state import chat_sessions, current_chat_index
import api.state as state
from api.routes.main import main_bp
from api.routes.search import search_bp

app = Flask(__name__)

# Khởi cấu hình Gemini AI
genai.configure(api_key=config.API_KEY)

generation_config = config.GENERATION_CONFIG

model = genai.GenerativeModel(
    model_name=config.MODEL_NAME,
    generation_config=generation_config,
    system_instruction=config.SYSTEM_INSTRUCTION,
)

# Function to export jobs to a JSON file based on the keyword
def export_jobs_to_file(keyword):
    jobs = []

    # 1) Job scrape từ collection "jobs"
    for doc in db.collection("jobs")\
                 .where("keyword", "==", keyword.lower())\
                 .stream():
        data = doc.to_dict()
        # nếu cần: convert Timestamp thành chuỗi
        if isinstance(data.get("submit_time"), datetime.datetime):
            data["submit_time"] = data["submit_time"].strftime("%Y-%m-%d %H:%M")
        data["job_id"] = doc.id
        jobs.append(data)

    # 2) Job tự đăng từ collection "jobs_self_posted"
    for doc in db.collection("jobs_self_posted")\
                 .where("keyword", "==", keyword)\
                 .stream():
        data = doc.to_dict()
        # giữ nguyên các trường như trong Firestore
        # chỉ thêm job_id để tiện sử dụng về sau
        data["job_id"] = doc.id
        # và gắn thêm flag để phân biệt nếu cần
        data["self_posted"] = True
        jobs.append(data)

    # 3) Ghi ra file JSON
    with open(config.KNOWLEDGE_FILE_PATH, "w", encoding="utf-8") as f:
        json.dump(jobs, f, ensure_ascii=False, indent=2)

# Read the content from knowledge.json if it exists
def read_knowledge_file():
    file_path = config.KNOWLEDGE_FILE_PATH
    if os.path.exists(file_path):
        with open(file_path, "r", encoding="utf-8") as file:
            file_content = file.read()
        print(f"Loaded knowledge file: {file_content[:100]}...")  # Log for checking
        return file_content
    return ""

# Function to export and update the chat content
def export_and_update_chat():
    # global chat_sessions, current_chat_index

    # Tạo tên cho chat session mới
    chat_name = f"chat{state.current_chat_index}"
    print(f"Creating new chat session: {chat_name}")

    # Tạo chat session mới
    state.chat_sessions[chat_name] = model.start_chat(  
        history=[
            {
                "role": "model",
                "parts": "Hello! I’m Jack, your job search assistant. Tell me about your ideal job—things like salary, job type (full-time, part-time, freelance), working hours, location, and benefits. The more details you provide, the better I can help you find the right match!",
            }
        ]
    )
    
    state.current_chat_index += 1  # Tăng chỉ số cho phiên chat tiếp theo

    # Log thông tin
    print(f"Chat session {chat_name} created successfully.")
    # print(f"Current chat index: {current_chat_index}")

# Function to continue an existing chat session
def continue_chat_session():
    # global chat_sessions, current_chat_index

    # Sử dụng phiên chat hiện tại
    chat_name = f"chat{state.current_chat_index - 1}"
    print(f"Continuing chat session: {chat_name}")

    if chat_name in state.chat_sessions:
        # Lưu lại toàn bộ lịch sử chat hiện tại, không bao gồm knowledge cũ
        chat_history = state.chat_sessions[chat_name].history
        chat_history = [
            {
                "role": entry.role,
                "parts": entry.parts
            } for entry in chat_history
        ]

        # Làm mới nội dung file_content
        file_content = read_knowledge_file()

        # Tạo lại chat với nội dung knowledge mới và lịch sử chat cũ
        state.chat_sessions[chat_name] = model.start_chat(
            history=chat_history + [
                {
                    "role": "model",
                    "parts": "knowledge.json:",
                },
                {
                    "role": "model",
                    "parts": [file_content],
                },
            ]
        )
        print(f"Updated chat session {chat_name} with new file_content.")
    else:
        print(f"Chat session {chat_name} not found.")

# Khởi tạo chat với nội dung knowledge hiện tại (nếu có) khi trang được tải
export_and_update_chat()

app.register_blueprint(main_bp)
app.register_blueprint(search_bp)

if __name__ == '__main__':
    app.run(debug=False, use_reloader=False)
