"""
Data ingestion module for loading raw data.
"""
import logging
import logging.config
import os
from typing import Dict

import pandas as pd
import yaml

# --------------------------------------------------------------------------- #
# Logging
# --------------------------------------------------------------------------- #
logger = logging.getLogger("data_pipeline")


class DataIngestion:
    """Handles data loading and *initial* validation-free ingestion."""

    def __init__(self, config_path: str = "config/config.yaml"):
        self.config = self._load_config(config_path)
        self._setup_logging()

    # --------------------------------------------------------------------- #
    # Private helpers
    # --------------------------------------------------------------------- #
    def _load_config(self, config_path: str) -> Dict:
        try:
            with open(config_path, "r") as f:
                return yaml.safe_load(f)
        except Exception as e:
            logger.error(f"Error loading configuration: {e}")
            raise

    def _setup_logging(self):
        try:
            with open("config/logging.yaml", "r") as f:
                logging_config = yaml.safe_load(f)
                logging.config.dictConfig(logging_config)
        except Exception as e:
            logger.error(f"Error setting up logging: {e}")
            raise

    # --------------------------------------------------------------------- #
    # Public interface
    # --------------------------------------------------------------------- #
    def load_data(self) -> pd.DataFrame:
        """Load raw CSV into a DataFrame (no cleaning)."""
        try:
            raw_path = self.config["data"]["raw_data_path"]
            logger.info(f"Loading raw data from {raw_path} …")
            data = pd.read_csv(raw_path)
            logger.info(f"Loaded raw data with shape: {data.shape}")
            return data
        except Exception as e:
            logger.error(f"Error loading data: {e}")
            raise

    def run_pipeline(self) -> pd.DataFrame:
        """End-to-end ingestion (load → save copy → return)."""
        try:
            data = self.load_data()

            processed_path = self.config["data"]["processed_data_path"]
            os.makedirs(os.path.dirname(processed_path), exist_ok=True)
            data.to_csv(processed_path, index=False)
            logger.info(f"Ingestion completed. Data saved to {processed_path}")

            return data
        except Exception as e:
            logger.error(f"Error in ingestion pipeline: {e}")
            raise


if __name__ == "__main__":
    ingestion = DataIngestion()
    _ = ingestion.run_pipeline()
