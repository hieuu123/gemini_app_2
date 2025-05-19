import os
from flask import Flask, send_from_directory, render_template
from api.routes.search import search_bp
from api.routes.main   import main_bp
# …
from api.firebase_config import db        # <-- import tương đối

BASE = os.path.dirname(__file__)            # api/
ROOT = os.path.abspath(os.path.join(BASE, ".."))

app = Flask(
  __name__,
  template_folder=os.path.join(ROOT, "templates"),
  static_folder=os.path.join(ROOT, "static"),
  static_url_path="/"
)
app.register_blueprint(main_bp)
app.register_blueprint(search_bp)
# …

# @app.route("/", defaults={"path": ""})
# chỉ 1 route, cho tất cả đường dẫn có dấu “.” hoặc folder
@app.route("/<path:path>")
def static_proxy(path):
    full = os.path.join(app.static_folder, path)
    if os.path.exists(full):
        return send_from_directory(app.static_folder, path)
    # nếu không phải file tĩnh, chuyển sang index để app-side routing (SPA) hoặc blueprint
    return render_template("index.html")

if __name__ == "__main__":
    app.run()
