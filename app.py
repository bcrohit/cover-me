from flask import Flask, request, jsonify
from flask_cors import CORS
import json

app = Flask(__name__)
CORS(app)

@app.route("/api/jobdata", methods=["POST"])
def receive_job_data():
    data = request.get_json()
    print("Received Job Data")
    with open("assets/contents/job_data.json", "w") as f:
        json.dump(data, f)
    return jsonify({"status": "success", "message": "Data received"})

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8000, debug=True)
