"""
Data preprocessing – mirrors exactly the notebook steps.
"""
import csv
import logging
import logging.config
from typing import Dict, Tuple, List

import category_encoders as ce
import joblib
import numpy as np
import pandas as pd
import yaml
from sklearn.preprocessing import LabelEncoder

logger = logging.getLogger("data_pipeline")


class DataPreprocessor:
    # ------------------------------------------------------------------ #
    # Init / utils
    # ------------------------------------------------------------------ #
    def __init__(self, config_path: str = "config/config.yaml"):
        self.config = self._load_config(config_path)
        self._setup_logging()

        self.label_encoders: Dict[str, LabelEncoder] = {}
        self.binary_encoder: ce.BinaryEncoder | None = None
        self.onehot_encode_features: List[str] = []
        self.onehot_columns: List[str] = []
        self.feature_names_: List[str] = []
        self.id_mappings: Dict[str, Dict[int, str]] = {}

    def _load_config(self, path: str) -> Dict:
        with open(path, "r") as f:
            return yaml.safe_load(f)

    def _setup_logging(self):
        with open("config/logging.yaml", "r") as f:
            logging.config.dictConfig(yaml.safe_load(f))

    # ------------------------------------------------------------------ #
    # Helper functions (age / ICD-9 etc.)
    # ------------------------------------------------------------------ #
    @staticmethod
    def _convert_age_bin_to_mean(age_bin: str) -> float:
        try:
            lower, upper = age_bin.strip("[]()").split("-")
            return (int(lower) + int(upper)) / 2
        except Exception:
            return np.nan

    @staticmethod
    def _map_icd9_to_category(code: str) -> str:
        try:
            if isinstance(code, str) and (code.startswith("E") or code.startswith("V")):
                return "External/Supplemental"
            n = float(code)
            if 1 <= n <= 139:
                return "Infectious and parasitic diseases"
            if 140 <= n <= 239:
                return "Neoplasms"
            if 240 <= n <= 279:
                return "Endocrine, nutritional and metabolic diseases, and immunity disorders"
            if 280 <= n <= 289:
                return "Diseases of the blood and blood-forming organs"
            if 290 <= n <= 319:
                return "Mental disorders"
            if 320 <= n <= 389:
                return "Diseases of the nervous system and sense organs"
            if 390 <= n <= 459:
                return "Diseases of the circulatory system"
            if 460 <= n <= 519:
                return "Diseases of the respiratory system"
            if 520 <= n <= 579:
                return "Diseases of the digestive system"
            if 580 <= n <= 629:
                return "Diseases of the genitourinary system"
            if 630 <= n <= 679:
                return "Complications of pregnancy, childbirth, and the puerperium"
            if 680 <= n <= 709:
                return "Diseases of the skin and subcutaneous tissue"
            if 710 <= n <= 739:
                return "Diseases of the musculoskeletal system and connective tissue"
            if 740 <= n <= 759:
                return "Congenital anomalies"
            if 760 <= n <= 779:
                return "Perinatal conditions"
            if 780 <= n <= 799:
                return "Symptoms, signs, and ill-defined conditions"
            if 800 <= n <= 999:
                return "Injury and poisoning"
            return "Unknown"
        except Exception:
            return "Unknown"

    @staticmethod
    def _check_label(text: str) -> str:
        return "Yes" if text in (">30", "<30") else "No"

    # ------------------------------------------------------------------ #
    # ID mapping loader
    # ------------------------------------------------------------------ #
    def _load_id_mappings(self, mapping_file: str = "data/raw/IDS_mapping.csv"):
        mapping_blocks, current = {}, None
        with open(mapping_file, newline="", encoding="utf-8") as f:
            reader = csv.reader(f)
            for row in reader:
                if not row or all(cell.strip() == "" for cell in row):
                    continue
                if row[0] in (
                    "admission_type_id",
                    "discharge_disposition_id",
                    "admission_source_id",
                ) and row[1] == "description":
                    current = row[0]
                    mapping_blocks[current] = {"cols": row, "rows": []}
                    continue
                if current:
                    mapping_blocks[current]["rows"].append(row)

        for col, block in mapping_blocks.items():
            df_map = pd.DataFrame(block["rows"], columns=block["cols"])
            df_map[col] = df_map[col].astype(int)
            self.id_mappings[col] = df_map.set_index(col)["description"].to_dict()
        logger.info("Loaded ID mappings")

    # ------------------------------------------------------------------ #
    # Pre-processing (training)
    # ------------------------------------------------------------------ #
    def preprocess_data(self, data: pd.DataFrame) -> Tuple[pd.DataFrame, pd.Series]:
        logger.info("=== Preprocessing (fit) ===")
        df = data.copy()

        # ---- load mappings
        if not self.id_mappings:
            self._load_id_mappings()
        for col, mapping in self.id_mappings.items():
            if col in df.columns:
                df[col] = df[col].map(mapping)

        # ---- notebook-identical transformations
        df.drop(
            columns=["weight", "max_glu_serum", "A1Cresult", "medical_specialty", "payer_code"],
            inplace=True,
            errors="ignore",
        )
        df[["diag_1", "diag_2", "diag_3"]] = df[["diag_1", "diag_2", "diag_3"]].replace("?", np.nan)
        df.dropna(subset=["diag_1", "diag_2", "diag_3"], inplace=True)

        target = self.config["features"]["target_column"]
        df[target] = df[target].apply(self._check_label)

        df.loc[df["race"] == "?", "race"] = "Other"
        df = df[df["gender"] != "Unknown/Invalid"].reset_index(drop=True)

        drug_cols = [
            "metformin","repaglinide","nateglinide","chlorpropamide","glimepiride",
            "acetohexamide","glipizide","glyburide","tolbutamide","pioglitazone",
            "rosiglitazone","acarbose","miglitol","troglitazone","tolazamide",
            "examide","citoglipton","insulin","glyburide-metformin",
            "glipizide-metformin","glimepiride-pioglitazone","metformin-rosiglitazone",
            "metformin-pioglitazone",
        ]
        counts = (
            df[drug_cols]
            .apply(lambda r: r.value_counts(), axis=1)
            .fillna(0)
            .astype(int)
            .add_prefix("count_")
        )
        df = pd.concat([df, counts], axis=1)
        df.drop(columns=drug_cols + ["encounter_id", "patient_nbr"], inplace=True, errors="ignore")

        df["age"] = df["age"].apply(self._convert_age_bin_to_mean)
        for c in ["diag_1", "diag_2", "diag_3"]:
            df[c] = df[c].apply(self._map_icd9_to_category)

        # ---- encoding strategy
        cat_cols = df.select_dtypes(include=["object", "category"]).columns.tolist()
        if target in cat_cols:
            cat_cols.remove(target)

        label_feats, oh_feats, bin_feats = [], [], []
        for c in cat_cols:
            n = df[c].nunique()
            if n <= 4:
                label_feats.append(c)
            elif n <= 5:
                oh_feats.append(c)
            else:
                bin_feats.append(c)
        self.onehot_encode_features = oh_feats  # <-- save!

        for c in label_feats:
            le = LabelEncoder()
            df[c] = le.fit_transform(df[c])
            self.label_encoders[c] = le

        df = pd.get_dummies(df, columns=oh_feats)
        self.onehot_columns = df.columns.tolist()  # after one-hot

        if bin_feats:
            self.binary_encoder = ce.BinaryEncoder(cols=bin_feats)
            df = self.binary_encoder.fit_transform(df)

        self.feature_names_ = [c for c in df.columns if c != target]

        X = df.drop(columns=[target])
        y = df[target]

        logger.info(f"Finished preprocessing. Shape: {X.shape}")
        return X, y

    # ------------------------------------------------------------------ #
    # Transform (inference)
    # ------------------------------------------------------------------ #
    def transform_new_data(self, data: pd.DataFrame) -> pd.DataFrame:
        if not self.feature_names_:
            raise RuntimeError("Preprocessor not fitted / loaded.")

        df = data.copy()

        # mappings
        if not self.id_mappings:
            self._load_id_mappings()
        for col, mapping in self.id_mappings.items():
            if col in df.columns:
                df[col] = df[col].map(mapping)

        # replicate notebook steps (same as fit, but without drops that
        # would remove unseen columns if missing)
        df.drop(
            columns=["weight", "max_glu_serum", "A1Cresult", "medical_specialty", "payer_code"],
            inplace=True,
            errors="ignore",
        )
        for c in ["diag_1", "diag_2", "diag_3"]:
            if c in df.columns:
                df[c] = df[c].replace("?", np.nan)
        df.dropna(subset=[c for c in ["diag_1", "diag_2", "diag_3"] if c in df.columns], inplace=True)

        df = df[df.get("gender", "Valid") != "Unknown/Invalid"].reset_index(drop=True)

        # counts
        drug_cols = [
            "metformin","repaglinide","nateglinide","chlorpropamide","glimepiride",
            "acetohexamide","glipizide","glyburide","tolbutamide","pioglitazone",
            "rosiglitazone","acarbose","miglitol","troglitazone","tolazamide",
            "examide","citoglipton","insulin","glyburide-metformin",
            "glipizide-metformin","glimepiride-pioglitazone","metformin-rosiglitazone",
            "metformin-pioglitazone",
        ]
        for c in drug_cols:
            if c not in df:
                df[c] = "No"
        counts = (
            df[drug_cols]
            .apply(lambda r: r.value_counts(), axis=1)
            .fillna(0)
            .astype(int)
            .add_prefix("count_")
        )
        for c in drug_cols + ["encounter_id", "patient_nbr"]:
            df.drop(columns=c, inplace=True, errors="ignore")
        df = pd.concat([df, counts], axis=1)

        df["age"] = df["age"].apply(self._convert_age_bin_to_mean)
        for c in ["diag_1", "diag_2", "diag_3"]:
            if c in df.columns:
                df[c] = df[c].apply(self._map_icd9_to_category)

        # ---------- replay encoders (fit-objects) ------------------------
        for c, le in self.label_encoders.items():
            if c in df.columns:
                df[c] = le.transform(df[c])

        if self.onehot_encode_features:
            df = pd.get_dummies(df, columns=self.onehot_encode_features)
        for c in self.onehot_columns:
            if c not in df.columns:
                df[c] = 0

        if self.binary_encoder:
            df = self.binary_encoder.transform(df)

        # reorder / fill
        df = df.reindex(columns=self.feature_names_, fill_value=0)

        df = df.apply(pd.to_numeric, errors="ignore")
        
        return df

    # ------------------------------------------------------------------ #
    # Persist / load
    # ------------------------------------------------------------------ #
    def save_preprocessor(self, path: str = "models/preprocessor.joblib"):
        joblib.dump(
            {
                "label_encoders": self.label_encoders,
                "binary_encoder": self.binary_encoder,
                "onehot_encode_features": self.onehot_encode_features,
                "onehot_columns": self.onehot_columns,
                "feature_names_": self.feature_names_,
            },
            path,
        )
        logger.info(f"Preprocessor saved → {path}")

    def load_preprocessor(self, path: str = "models/preprocessor.joblib"):
        obj = joblib.load(path)
        self.label_encoders = obj["label_encoders"]
        self.binary_encoder = obj["binary_encoder"]
        self.onehot_encode_features = obj["onehot_encode_features"]
        self.onehot_columns = obj["onehot_columns"]
        self.feature_names_ = obj["feature_names_"]
        logger.info(f"Preprocessor loaded ← {path}")
