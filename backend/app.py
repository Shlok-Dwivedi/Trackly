import os

from flask import Flask, Response, jsonify, request
from flask_cors import CORS
from dotenv import load_dotenv

load_dotenv()

FRONTEND_ORIGIN = os.getenv("FRONTEND_ORIGIN", "http://localhost:5173")
VERCEL_ORIGIN = os.getenv("VERCEL_FRONTEND_ORIGIN", "")

ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:8080",
    "http://127.0.0.1:8080",
    FRONTEND_ORIGIN,
]
if VERCEL_ORIGIN:
    ALLOWED_ORIGINS.append(VERCEL_ORIGIN)


def create_app() -> Flask:
    app = Flask(__name__)

    CORS(
        app,
        origins=ALLOWED_ORIGINS,
        supports_credentials=True,
        allow_headers=["Content-Type", "Authorization"],
        methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    )

    @app.before_request
    def handle_preflight():
        if request.method == "OPTIONS":
            origin = request.headers.get("Origin", "")
            resp = Response()
            if origin in ALLOWED_ORIGINS:
                resp.headers["Access-Control-Allow-Origin"] = origin
            else:
                resp.headers["Access-Control-Allow-Origin"] = ALLOWED_ORIGINS[-1]
            resp.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
            resp.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
            resp.headers["Access-Control-Allow-Credentials"] = "true"
            resp.headers["Access-Control-Max-Age"] = "3600"
            resp.status_code = 204
            return resp

    from routes.auth import auth_bp
    from routes.calendar import calendar_bp
    from routes.notifications import notifications_bp
    from routes.events import events_bp

    app.register_blueprint(auth_bp)
    app.register_blueprint(calendar_bp)
    app.register_blueprint(notifications_bp)
    app.register_blueprint(events_bp)

    @app.route("/health", methods=["GET"])
    def health():
        origin = request.headers.get("Origin", "")
        resp = jsonify({"status": "ok"})
        if origin in ALLOWED_ORIGINS:
            resp.headers["Access-Control-Allow-Origin"] = origin
            resp.headers["Access-Control-Allow-Credentials"] = "true"
        return resp, 200

    @app.route("/ping-supabase", methods=["GET"])
    def ping_supabase():
        import urllib.request
        supabase_url = os.getenv("SUPABASE_URL")
        supabase_key = os.getenv("SUPABASE_ANON_KEY")
        try:
            req = urllib.request.Request(
                f"{supabase_url}/rest/v1/",
                headers={"apikey": supabase_key}
            )
            urllib.request.urlopen(req, timeout=5)
            return jsonify({"status": "supabase ok"}), 200
        except Exception as e:
            return jsonify({"status": "supabase error", "error": str(e)}), 200

    return app


application = create_app()

if __name__ == "__main__":
    port = int(os.getenv("PORT", "5000"))
    application.run(host="0.0.0.0", port=port, debug=False)
