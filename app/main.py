from dotenv import load_dotenv
from flask import Flask
from flask_cors import CORS

from routes.analyze import analyze_bp
from routes.ats import ats_bp
from routes.export import export_bp
from routes.generate import generate_bp
from routes.legacy import legacy_bp

load_dotenv()


def create_app() -> Flask:
    app = Flask(__name__)
    CORS(app)

    app.register_blueprint(analyze_bp)
    app.register_blueprint(generate_bp)
    app.register_blueprint(ats_bp)
    app.register_blueprint(export_bp)
    app.register_blueprint(legacy_bp)

    return app


app = create_app()

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8000, debug=True)
