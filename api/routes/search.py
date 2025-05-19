# routes/search.py
import threading, datetime, pytz, uuid
from flask import Blueprint, request, jsonify
# import config
import state
from scraper.linkedin_search import get_job_ids, get_job_details
from db.operations import save_job_to_db, get_existing_job_ids_from_db, delete_job_from_db

search_bp = Blueprint("search", __name__)

@search_bp.route("/search", methods=["POST"])
def search():
    # tạo search_id mới và lưu vào state
    search_id = str(uuid.uuid4())
    state.current_search_id = search_id

    data = request.get_json()
    keyword = data.get("keyword", "").strip()

    # reset toàn cục
    state.reset_flag.set()
    if state.processing_thread and state.processing_thread.is_alive():
        state.processing_thread.join()
    state.reset_flag.clear()
    state.log_messages.clear()
    state.job_messages.clear()
    state.retry_count = 0
    state.displayed_job_ids.clear()

    # khởi chat + initial knowledge
    from app import export_jobs_to_file, continue_chat_session
    export_jobs_to_file(keyword)
    continue_chat_session()

    vn_tz = pytz.timezone(config.TIMEZONE)
    submit_time = datetime.datetime.now(vn_tz).strftime("%Y-%m-%d %H:%M")

    def worker():
        # 1) lấy job_ids
        ids = []
        while state.retry_count < 10:
            ids = get_job_ids(keyword)
            if ids:
                state.send_log(f"Found {len(ids)} job ids")
                break
            state.retry_count += 1
            state.send_log(f"No job ids found, retrying {state.retry_count}")
        if not ids:
            state.send_log("No jobs found after 10 attempts.")
            return

        processed = set()

        # 2) xử lý jobs mới
        for idx, jid in enumerate(ids, start=1):
            if state.reset_flag.is_set():
                state.send_log("Processing canceled.")
                return
            state.send_log(f"Processing job {idx}/{len(ids)}: {jid}")
            details = get_job_details(jid, state.reset_flag)
            if not details or details.get("is_closed"):
                if details and details.get("is_closed"):
                    delete_job_from_db(jid)
                    state.send_log(f"Job {jid} is closed → removed.")
                continue

            details["job_id"]      = jid
            details["submit_time"] = submit_time
            save_job_to_db(details, keyword, send_job_callback=state.send_job)
            processed.add(jid)

        # cập nhật chat
        state.send_log("Saved new jobs to DB.")
        export_jobs_to_file(keyword)
        continue_chat_session()

        # 3) xử lý jobs cũ
        for jid in get_existing_job_ids_from_db(keyword):
            if jid in processed: continue
            details = get_job_details(jid, state.reset_flag)
            if not details or details.get("is_closed"):
                if details and details.get("is_closed"):
                    delete_job_from_db(jid)
                    state.send_log(f"Job {jid} is closed → removed.")
                continue
            details["job_id"]      = jid
            details["submit_time"] = submit_time
            save_job_to_db(details, keyword, send_job_callback=state.send_job)
            state.send_job(details)
            processed.add(jid)

        # lần cuối cùng: cập nhật chat
        export_jobs_to_file(keyword)
        continue_chat_session()

    state.processing_thread = threading.Thread(target=worker, daemon=True)
    state.processing_thread.start()

    # trả về cả search_id để client mở đúng SSE endpoint
    return jsonify({
        "message": "Job processing started.",
        "search_id": search_id
    })
