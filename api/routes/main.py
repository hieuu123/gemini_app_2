# routes/main.py
import os, time, json
from flask import Blueprint, render_template, send_file, Response, jsonify, request, current_app
import markdown2
import api.config as config
# from db.connection import connect_db
import api.state as state  # import module state
from api.firebase_config import db
from api.chat_utils import model, read_knowledge_from_store
import traceback

main_bp = Blueprint("main", __name__)

@main_bp.route("/login", methods=["GET"])
def login():
    return render_template("login.html")

@main_bp.route("/register", methods=["GET"])
def register():
    return render_template("register.html")

@main_bp.route("/profile")
def profile():
    return render_template("profile.html")

@main_bp.route("/post_job", methods=["GET"])
def post_job():
    return render_template("post_job.html")

@main_bp.route("/manage_jobs", methods=["GET"])
def manage_jobs():
    return render_template("manage_jobs.html")

@main_bp.route('/my_job/<job_id>')
def job_detail(job_id):
    """
    Trang chi tiết công việc tự đăng.
    JS phía client (job_details.js) sẽ đọc `window.location.pathname`
    để lấy job_id và fetch dữ liệu từ Firestore.
    """
    return render_template('job_self_posted_details.html')

@main_bp.route('/edit_job.html')
def edit_job():
    return render_template('edit_job.html')

@main_bp.route("/my_applications")
def my_applications():
    return render_template("my_jobs.html")

@main_bp.route("/manage_applicants/<job_id>")
def manage_applicants(job_id):
    # Lấy dữ liệu job từ Firestore
    job_doc = db.collection("jobs_self_posted").document(job_id).get()
    if job_doc.exists:
        job_title = job_doc.to_dict().get("title", "–")
    else:
        job_title = "Unknown Job"
    return render_template("manage_applicants.html",
                           job_id=job_id,
                           job_title=job_title)
    
@main_bp.route("/all_jobs", methods=["GET"])
def all_jobs():
    """
    Trang hiển thị tất cả các jobs đã tự đăng (jobs_self_posted).
    JS phía client (all_jobs.js) sẽ fetch trực tiếp từ Firestore.
    """
    return render_template("all_jobs.html")

@main_bp.route('/applicant_profile/<uid>')
def applicant_profile(uid):
    return render_template('applicant_profile.html', uid=uid)

@main_bp.route("/", methods=["GET"])
def index():
    return render_template("index.html")

@main_bp.route("/find_jobs", methods=["GET"])
def find_jobs():
    return render_template("find_jobs.html")

@main_bp.route("/about", methods=["GET"])
def about():
    return render_template("about.html")

@main_bp.route("/blog", methods=["GET"])
def blog():
    return render_template("blog.html")

@main_bp.route("/single-blog", methods=["GET"])
def single_blog():
    return render_template("single-blog.html")

@main_bp.route("/cancel_search", methods=["POST"])
def cancel_search():
    """
    Khi client navigates away, sẽ POST về đây để hủy scrap ngay lập tức.
    """
    state.reset_flag.set()
    return ("", 204)

@main_bp.route("/download_knowledge")
def download_knowledge():
    file_path = config.KNOWLEDGE_FILE_PATH
    if os.path.exists(file_path):
        return send_file(file_path, as_attachment=True)
    return jsonify({"message": "File not found"}), 404

@main_bp.route("/stream/<search_id>")
def stream(search_id):
    def event_stream():
        try:
            while True:
                if state.log_messages:
                    msg = state.log_messages.pop(0)
                    yield f"data: {msg}\n\n"
                if state.job_messages:
                    job = state.job_messages.pop(0)
                    yield f"data: new_job:{json.dumps(job, default=str)}\n\n"
                time.sleep(0.1)
        except GeneratorExit:
            # chỉ cancel khi đúng phiên đó
            if search_id == state.current_search_id:
                state.reset_flag.set()
                state.log_messages.clear()
                state.job_messages.clear()
            return
    return Response(event_stream(), content_type="text/event-stream")

@main_bp.route("/job/<job_id>")
def job(job_id):
    # 1. Thử trong scraped jobs
    snap = db.collection("jobs").document(job_id).get()
    source = "jobs"
    # 2. Nếu không có, thử trong tự đăng
    if not snap.exists:
        snap = db.collection("jobs_self_posted").document(job_id).get()
        source = "jobs_self_posted"
    if not snap.exists:
        return jsonify({"error": "Not found"}), 404

    data = snap.to_dict()
    data["job_id"] = job_id
    # đánh dấu đây có phải self_posted không
    data["self_posted"] = (source == "jobs_self_posted")
    return jsonify(data)

# @main_bp.route("/send_message", methods=["POST"])
# def send_message():
#     data = request.get_json()
#     user_input = data.get("message", "")
#     session_name = f"chat{state.current_chat_index - 1}"
#     if session_name not in state.chat_sessions:
#         # return jsonify({"error": "Chat session not found."}), 404
#         return jsonify({"response": "Chat session không tìm thấy, vui lòng search lại để khởi session mới."})
#     response = state.chat_sessions[session_name].send_message([user_input])
#     html = markdown2.markdown(response.text)
#     return jsonify({"response": html})

@main_bp.route("/send_message", methods=["POST"])
def send_message():
    # 1) Đọc JSON payload thật chặt
    try:
        payload = request.get_json(force=True)
    except Exception as e:
        current_app.logger.error(f"/send_message: invalid JSON: {e}")
        return jsonify({"error": "Invalid JSON"}), 400

    # 2) Lấy message, history, keyword với mặc định an toàn
    user_input = (payload.get("message") or "").strip()
    history    = payload.get("history") or []
    keyword    = (payload.get("keyword") or "").strip()

    if not user_input:
        return jsonify({"error": "Empty message"}), 400

    try:
        # 3) Chèn knowledge lên đầu history nếu có
        jobs = read_knowledge_from_store(keyword)
        if jobs:
            history.insert(0, {
                "role": "user",
                "parts": "Current job listings:\n" + json.dumps(jobs, ensure_ascii=False)
            })

        # 4) Append user và tạo phiên chat mới
        history.append({"role": "user", "parts": user_input})
        chat     = model.start_chat(history=history)
        response = chat.send_message([user_input])

        # 5) Lấy text, append vào history, trả về client
        text = response.text or ""
        history.append({"role": "model", "parts": text})
        return jsonify({
            "response": markdown2.markdown(text),
            "history":  history
        })
    except Exception as e:
        # 6) Log stacktrace thật chi tiết, trả JSON lỗi
        current_app.logger.error("Error in /send_message:\n" + traceback.format_exc())
        return jsonify({"error": "Internal server error, please try again."}), 500


