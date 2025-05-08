import pymysql
from db.connection import connect_db
import config


def save_job_to_db(job_details, keyword, send_job_callback=None):
    """
    Lưu chi tiết job vào database. Nếu truyền send_job_callback,
    sẽ gọi callback đó sau khi commit để đẩy sự kiện SSE.
    """
    conn = connect_db()
    try:
        with conn.cursor() as cursor:
            # Xóa nếu đã tồn tại
            cursor.execute("SELECT job_id FROM jobs WHERE job_id=%s",
                           (job_details.get('job_id'),))
            if cursor.fetchone():
                cursor.execute("DELETE FROM jobs WHERE job_id=%s",
                               (job_details.get('job_id'),))
            # Chèn mới
            sql = """
                INSERT INTO jobs
                (job_id, title, company_name, posted_time, num_applicants,
                 seniority_level, employment_type, job_function, industries,
                 place, job_description, submit_time, keyword)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """
            cursor.execute(sql, (
                job_details.get('job_id', 'None'),
                job_details.get('title', 'None'),
                job_details.get('company_name', 'None'),
                job_details.get('posted_time', 'None'),
                job_details.get('num_applicants', '<25'),
                job_details.get('seniority_level', 'None'),
                job_details.get('employment_type', 'None'),
                job_details.get('job_function', 'None'),
                job_details.get('industries', 'None'),
                job_details.get('place', 'None'),
                job_details.get('job_description', 'None'),
                job_details.get('submit_time', 'None'),
                keyword
            ))
        conn.commit()
    finally:
        conn.close()

    # Gọi callback (nếu có)
    if send_job_callback:
        send_job_callback(job_details)


def get_existing_job_ids_from_db(keyword):
    """
    Trả về danh sách job_id đã lưu trong DB cho keyword
    """
    conn = connect_db()
    try:
        with conn.cursor() as cursor:
            cursor.execute(
                "SELECT job_id FROM jobs WHERE LOWER(keyword)=LOWER(%s)",
                (keyword,)
            )
            return [row['job_id'] for row in cursor.fetchall()]
    finally:
        conn.close()

def delete_job_from_db(job_id):
    """
    Xóa bản ghi job với job_id khỏi database.
    """
    conn = connect_db()
    try:
        with conn.cursor() as cursor:
            cursor.execute("DELETE FROM jobs WHERE job_id = %s", (job_id,))
        conn.commit()
    finally:
        conn.close()

