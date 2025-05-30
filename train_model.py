"""
Script to train and save the model pipeline.
"""
from src.data.ingestion import DataIngestion
from src.data.preprocessing import DataPreprocessor
from src.models.train import ModelTrainer
import json, os, datetime as dt

def main():
    # Load and preprocess data
    print("Loading and preprocessing data...")
    ingestion = DataIngestion()
    raw_data = ingestion.run_pipeline()
    
    preprocessor = DataPreprocessor()
    X_processed, y = preprocessor.preprocess_data(raw_data)
    
    # Save preprocessor
    print("Saving preprocessor...")
    preprocessor.save_preprocessor()
    
    # Train models
    print("Training models...")
    trainer = ModelTrainer()
    results = trainer.train_models(X_processed, y)

    metrics_path = "models/metrics.json"
    os.makedirs("models", exist_ok=True)
    with open(metrics_path, "w") as f:
        json.dump(results, f, indent=2)
    print(f"Saved per-model metrics → {metrics_path}")

    
    print("Training pipeline completed successfully!")



if __name__ == "__main__":
    main() 