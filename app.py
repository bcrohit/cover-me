from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

@app.route("/api/jobdata", methods=["POST"])
def receive_job_data():
    data = request.get_json()
    print("Received Job Data:", data)
    return jsonify({"status": "success", "message": "Data received"})

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8000, debug=True)
