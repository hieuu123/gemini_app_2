# db/operations.py
from api.firebase_config import db
import state

def save_job_to_db(job_details, keyword, send_job_callback=None):
    """
    Lưu (hoặc cập nhật) document với ID = job_id vào collection 'jobs'.
    """
    doc_ref = db.collection("jobs").document(job_details["job_id"])
    # Chuẩn bị dữ liệu
    data = {
        "title": job_details.get("title"),
        "company_name": job_details.get("company_name"),
        "posted_time": job_details.get("posted_time"),
        "num_applicants": job_details.get("num_applicants"),
        "seniority_level": job_details.get("seniority_level"),
        "employment_type": job_details.get("employment_type"),
        "job_function": job_details.get("job_function"),
        "industries": job_details.get("industries"),
        "place": job_details.get("place"),
        "job_description": job_details.get("job_description"),
        "submit_time": job_details.get("submit_time"),
        "keyword": keyword.lower(),
    }
    doc_ref.set(data)  # tạo mới hoặc ghi đè
    if send_job_callback:
        send_job_callback(job_details)


def get_existing_job_ids_from_db(keyword):
    """
    Trả về list các job_id đã lưu với trường keyword khớp.
    """
    col = db.collection("jobs")
    qs = col.where("keyword", "==", keyword.lower()).stream()
    return [doc.id for doc in qs]


def delete_job_from_db(job_id):
    """
    Xóa document có ID = job_id.
    """
    db.collection("jobs").document(job_id).delete()
