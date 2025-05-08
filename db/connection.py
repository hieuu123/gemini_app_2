import pymysql
import config

def connect_db():
    """
    Tạo và trả về kết nối tới MySQL theo cấu hình trong config.py
    """
    return pymysql.connect(
        host=config.DB_HOST,
        port=config.DB_PORT,
        user=config.DB_USER,
        password=config.DB_PASSWORD,
        db=config.DB_NAME,
        charset='utf8mb4',
        cursorclass=pymysql.cursors.DictCursor
    )