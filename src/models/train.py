"""
Model training & evaluation.
"""
import logging
import logging.config
import os
from typing import Dict, Tuple

import joblib
import lightgbm as lgb
import numpy as np
import pandas as pd
import xgboost as xgb
import yaml
from imblearn.over_sampling import SMOTE
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    classification_report,
    roc_auc_score,
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
)
from sklearn.model_selection import StratifiedKFold, train_test_split, cross_val_score
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import LabelEncoder, StandardScaler

logger = logging.getLogger("model_pipeline")


class ModelTrainer:
    # ------------------------------------------------------------------ #
    def __init__(self, config_path: str = "config/config.yaml"):
        self.config = self._load_config(config_path)
        self._setup_logging()

        self.label_encoder = LabelEncoder()
        self.best_model = None
        self.best_model_name = None

    # ------------------------------------------------------------------ #
    def _load_config(self, path: str) -> Dict:
        with open(path, "r") as f:
            return yaml.safe_load(f)

    def _setup_logging(self):
        with open("config/logging.yaml", "r") as f:
            logging.config.dictConfig(yaml.safe_load(f))

    # ------------------------------------------------------------------ #
    def train_models(self, X: pd.DataFrame, y: pd.Series) -> Dict:
        logger.info("=== Training models ===")

        y_num = self.label_encoder.fit_transform(y)

        sm = SMOTE(sampling_strategy="minority", random_state=42)
        X_res, y_res = sm.fit_resample(X, y_num)

        X_train, X_test, y_train, y_test = train_test_split(
            X_res, y_res, test_size=0.2, random_state=42, stratify=y_res
        )

        models = {
            "logistic_regression": Pipeline(
                [("scaler", StandardScaler()), ("clf", LogisticRegression(max_iter=1000, random_state=42))]
            ),
            "random_forest": RandomForestClassifier(random_state=42),
            "lightgbm": lgb.LGBMClassifier(random_state=42),
            "xgboost": xgb.XGBClassifier(random_state=42),
        }

        results = {}
        for name, model in models.items():
            model.fit(X_train, y_train)
            y_pred = model.predict(X_test)
            y_proba = model.predict_proba(X_test)[:, 1]

            metrics = {
                "accuracy": accuracy_score(y_test, y_pred),
                "precision": precision_score(y_test, y_pred),
                "recall": recall_score(y_test, y_pred),
                "f1": f1_score(y_test, y_pred),
                "roc_auc": roc_auc_score(y_test, y_proba),
            }
            results[name] = metrics
            logger.info(f"{name}: {metrics}")

            # save model & encoder
            self._save_model(model, name)

            # keep best
            if self.best_model is None or metrics["roc_auc"] > results[self.best_model_name]["roc_auc"]:
                self.best_model = model
                self.best_model_name = name

        return results

    # ------------------------------------------------------------------ #
    def _save_model(self, model, name: str):
        os.makedirs("models", exist_ok=True)
        joblib.dump(model, f"models/{name}.joblib")
        joblib.dump(self.label_encoder, f"models/{name}_label_encoder.joblib")
        logger.info(f"Saved model {name}")

    # ------------------------------------------------------------------ #
    def load_model(self, name: str):
        self.best_model = joblib.load(f"models/{name}.joblib")
        self.label_encoder = joblib.load(f"models/{name}_label_encoder.joblib")
        self.best_model_name = name

    # ------------------------------------------------------------------ #
    def predict(self, X: pd.DataFrame) -> Tuple[np.ndarray, np.ndarray]:
        if self.best_model is None:
            raise RuntimeError("Model not loaded")
        proba = self.best_model.predict_proba(X)[:, 1]
        y_num = (proba >= 0.5).astype(int)
        y_label = self.label_encoder.inverse_transform(y_num)
        return y_label, proba
