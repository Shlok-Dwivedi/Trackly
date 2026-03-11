import os

from flask import Flask, Response, jsonify, request
from flask_cors import CORS
from dotenv import load_dotenv

# Load .env in local dev; Render injects env vars in production
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

    # Explicit OPTIONS preflight handler — runs before any route
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

    # Register blueprints
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

    return app


# Gunicorn entry point (production)
application = create_app()

if __name__ == "__main__":
    port = int(os.getenv("PORT", "5000"))
    application.run(host="0.0.0.0", port=port, debug=False)
