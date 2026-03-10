import os

from flask import Flask, jsonify
from flask_cors import CORS
from dotenv import load_dotenv


def create_app() -> Flask:
    # Load .env in local dev; Render injects env vars in production
    load_dotenv()

    app = Flask(__name__)

    # CORS — allow localhost for dev + Vercel origin(s) for prod
    frontend_origin = os.getenv("FRONTEND_ORIGIN", "http://localhost:5173")
    vercel_origin = os.getenv("VERCEL_FRONTEND_ORIGIN", "")

    allowed_origins = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:8080",
        "http://127.0.0.1:8080",
        frontend_origin,
    ]
    if vercel_origin:
        allowed_origins.append(vercel_origin)

    CORS(
        app,
        resources={r"/api/*": {"origins": allowed_origins}},
        supports_credentials=True,
    )

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
    def health() -> tuple[dict, int]:
        return jsonify({"status": "ok"}), 200

    return app


# Gunicorn entry point (production)
application = create_app()

if __name__ == "__main__":
    port = int(os.getenv("PORT", "5000"))
    application.run(host="0.0.0.0", port=port, debug=False)
