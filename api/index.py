import os
from flask import Flask, send_from_directory
from api.routes.search import search_bp
from api.routes.main   import main_bp
# …
from api.firebase_config import db        # <-- import tương đối

app = Flask(__name__, static_folder="../static", static_url_path="/")
app.register_blueprint(main_bp)
app.register_blueprint(search_bp)
# …

@app.route("/", defaults={"path": ""})
@app.route("/<path:path>")
def static_proxy(path):
    full = os.path.join(app.static_folder, path)
    if path and os.path.exists(full):
        return send_from_directory(app.static_folder, path)
    return send_from_directory(app.static_folder, "index.html")

if __name__ == "__main__":
    app.run()
