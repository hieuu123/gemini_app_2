# routes/main.py
import os, time, json
from flask import Blueprint, render_template, send_file, Response, jsonify, request
import markdown2
import config
from db.connection import connect_db
import state  # import module state

main_bp = Blueprint("main", __name__)

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
    conn = connect_db()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM jobs WHERE job_id=%s", (job_id,))
            j = cur.fetchone()
        return jsonify(j)
    finally:
        conn.close()

@main_bp.route("/send_message", methods=["POST"])
def send_message():
    data = request.get_json()
    user_input = data.get("message", "")
    session_name = f"chat{state.current_chat_index - 1}"
    if session_name not in state.chat_sessions:
        return jsonify({"error": "Chat session not found."}), 404
    response = state.chat_sessions[session_name].send_message([user_input])
    html = markdown2.markdown(response.text)
    return jsonify({"response": html})
