# api/chat_utils.py
import os, json, datetime
import google.generativeai as genai
from flask import current_app
from . import config, state  # giả sử bạn đã có config và state dưới api/

# Khởi Gemini (thực ra chỉ cần làm 1 lần khi app khởi)
genai.configure(api_key=config.API_KEY)
model = genai.GenerativeModel(
  model_name=config.MODEL_NAME,
  generation_config=config.GENERATION_CONFIG,
  system_instruction=config.SYSTEM_INSTRUCTION,
)

def export_jobs_to_file(keyword):
    # lấy job từ Firestore (db import từ firebase_config)
    from .firebase_config import db
    jobs = []
    # scraped …
    for doc in db.collection("jobs") \
                 .where(field_path="keyword", op_string="==", value=keyword.lower()) \
                 .stream():
        data = doc.to_dict()
        data["job_id"] = doc.id
        jobs.append(data)
    # self-posted …
    for doc in db.collection("jobs_self_posted") \
                 .where(field_path="keyword", op_string="==", value=keyword.lower()) \
                 .stream():
        data = doc.to_dict()
        data["job_id"] = doc.id
        data["self_posted"] = True
        jobs.append(data)
    with open(config.KNOWLEDGE_FILE_PATH, "w", encoding="utf-8") as f:
        json.dump(jobs, f, ensure_ascii=False, indent=2)

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
        
def read_knowledge_file():
    file_path = config.KNOWLEDGE_FILE_PATH
    if os.path.exists(file_path):
        with open(file_path, "r", encoding="utf-8") as file:
            file_content = file.read()
        print(f"Loaded knowledge file: {file_content[:100]}...")  # Log for checking
        return file_content
    return 
