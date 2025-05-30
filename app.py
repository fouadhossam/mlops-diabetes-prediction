"""
ML prediction & monitoring service (Flask).
"""
from datetime import datetime
import json
import logging
import os
from typing import Any, Dict

import joblib
import numpy as np
import pandas as pd
from flask import Flask, jsonify, request
from flask_cors import CORS
from prometheus_client import Counter, Histogram, generate_latest, CONTENT_TYPE_LATEST

from src.data.preprocessing import DataPreprocessor

# --------------------------------------------------------------------------- #
# Logging
# --------------------------------------------------------------------------- #
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[logging.FileHandler("logs/app.log"), logging.StreamHandler()],
)
logger = logging.getLogger("inference_app")

# --------------------------------------------------------------------------- #
PREDICTIONS_FILE = "data/predictions.json"

PREDICTION_LATENCY = Histogram(
    "prediction_latency_seconds",
    "Time spent processing prediction requests",
    buckets=(0.1, 0.5, 1.0, 2.0, 5.0),
)
PREDICTION_REQUESTS = Counter(
    "prediction_requests_total",
    "Prediction request count",
    ["model", "status"],
)

# --------------------------------------------------------------------------- #
app = Flask(__name__)
CORS(app)

# --------------------------------------------------------------------------- #
# Load artefacts needed for *prediction* (we keep LightGBM as the live model)
# --------------------------------------------------------------------------- #
preprocessor = DataPreprocessor()
preprocessor.load_preprocessor()

model_path = "models/lightgbm.joblib"
encoder_path = "models/lightgbm_label_encoder.joblib"

model = joblib.load(model_path)
label_encoder = joblib.load(encoder_path)

logger.info("LightGBM model & encoder loaded for /predict.")

# --------------------------------------------------------------------------- #
#  Metrics table shared by the monitoring endpoints
# --------------------------------------------------------------------------- #
def _load_metrics_table() -> Dict[str, Dict[str, float]]:
    path = "models/metrics.json"
    if os.path.exists(path):
        with open(path) as f:
            return json.load(f)
    logger.warning("No metrics.json found – /model-info will return zeros.")
    return {}

METRICS_TABLE: Dict[str, Dict[str, float]] = _load_metrics_table()

# --------------------------------------------------------------------------- #
# Utils
# --------------------------------------------------------------------------- #
def load_predictions() -> list[Dict[str, Any]]:
    return json.load(open(PREDICTIONS_FILE)) if os.path.exists(PREDICTIONS_FILE) else []


def save_prediction(record: Dict[str, Any]):
    os.makedirs(os.path.dirname(PREDICTIONS_FILE), exist_ok=True)
    data = load_predictions()
    data.append(record | {"timestamp": datetime.now().isoformat()})
    with open(PREDICTIONS_FILE, "w") as f:
        json.dump(data, f, indent=2)

# --------------------------------------------------------------------------- #
# Routes – Prometheus, health, prediction
# --------------------------------------------------------------------------- #
@app.route("/metrics")
def metrics():
    return generate_latest(), 200, {"Content-Type": CONTENT_TYPE_LATEST}


@app.route("/health")
def health():
    return jsonify({"status": "healthy", "model_loaded": True})


@app.route("/predict", methods=["POST"])
def predict():
    start_time = datetime.now()
    with PREDICTION_LATENCY.time():
        try:
            payload = request.get_json()
            logger.info(f"Request: {payload}")

            inp_df = pd.DataFrame([payload])
            X = preprocessor.transform_new_data(inp_df)
            X = X[preprocessor.feature_names_]          # keep order
            X = X.apply(pd.to_numeric, errors="ignore") # ensure numeric

            y_num = int(proba >= 0.5)
            label = label_encoder.inverse_transform([y_num])[0]

            # Calculate response time in milliseconds
            response_time = (datetime.now() - start_time).total_seconds() * 1000

            result = {
                "prediction": label,
                "response_time": round(response_time, 2)  # Round to 2 decimal places
            }
            save_prediction(result)

            PREDICTION_REQUESTS.labels(model="LightGBM", status="success").inc()
            return jsonify(result)
        except Exception as e:
            logger.exception(e)
            PREDICTION_REQUESTS.labels(model="LightGBM", status="error").inc()
            return jsonify({"error": str(e)}), 500

# --------------------------------------------------------------------------- #
#  NEW ▸ monitoring / analytics endpoints
# --------------------------------------------------------------------------- #
@app.route("/models", methods=["GET"])
def models_list():
    """Return list of model names for the UI tab bar."""
    return jsonify({"models": list(METRICS_TABLE)})


@app.route("/model-info/<model_name>", methods=["GET"])
def model_info(model_name: str):
    """
    Return metadata + metrics for the requested model.
    Metrics are read from models/metrics.json that was written at training time.
    """
    try:
        if model_name not in METRICS_TABLE:
            return jsonify({"error": f"Unknown model '{model_name}'"}), 404

        model_file = f"models/{model_name}.joblib"
        if not os.path.exists(model_file):
            return jsonify({"error": "Model file not found"}), 404

        metrics = METRICS_TABLE[model_name]

        return jsonify(
            {
                "name": model_name,
                "type": os.path.splitext(os.path.basename(model_file))[0],
                "version": "1.0.0",
                "metrics": metrics,
                "created_at": datetime.fromtimestamp(os.path.getctime(model_file)).isoformat(),
                "last_updated": datetime.fromtimestamp(os.path.getmtime(model_file)).isoformat(),
            }
        )
    except Exception as exc:
        logger.exception(exc)
        return jsonify({"error": str(exc)}), 500


@app.route("/predictions", methods=["GET"])
def get_predictions():
    """Return stored predictions (newest first)."""
    try:
        history = load_predictions()
        history.sort(key=lambda r: r["timestamp"], reverse=True)
        return jsonify(history)
    except Exception as exc:
        logger.exception(exc)
        return jsonify({"error": str(exc)}), 500


@app.route("/predictions/clear", methods=["POST"])
def clear_predictions():
    """Clear all stored predictions."""
    try:
        if os.path.exists(PREDICTIONS_FILE):
            os.remove(PREDICTIONS_FILE)
            logger.info("Predictions cleared")
        return jsonify({"message": "Predictions cleared successfully"})
    except Exception as exc:
        logger.exception(exc)
        return jsonify({"error": str(exc)}), 500


# --------------------------------------------------------------------------- #
if __name__ == "__main__":
    os.makedirs("logs", exist_ok=True)
    app.run(host="0.0.0.0", port=5000, debug=True)
