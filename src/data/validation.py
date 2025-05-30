"""
Light-weight schema validation using config – no value mutations.
"""
import logging
from typing import Dict, List

import pandas as pd

logger = logging.getLogger("data_pipeline")


class DataValidator:
    """Only checks that required columns exist and warns if not."""

    def __init__(self, config: Dict):
        self.config = config

    # ------------------------------------------------------------------ #
    # Public
    # ------------------------------------------------------------------ #
    def validate_data(self, data: pd.DataFrame) -> pd.DataFrame:
        missing = self._validate_schema(data)
        if missing:
            logger.warning(f"Missing required columns: {missing}")
        else:
            logger.info("Schema validation passed ✓")
        # **Do not** touch/clean the data – let the pre-processor handle it
        return data

    # ------------------------------------------------------------------ #
    # Private
    # ------------------------------------------------------------------ #
    def _validate_schema(self, data: pd.DataFrame) -> List[str]:
        required = (
            self.config["features"]["categorical_columns"]
            + self.config["features"]["numerical_columns"]
            + [self.config["features"]["target_column"]]
        )
        return list(set(required) - set(data.columns))
