# Diabetes Readmission Prediction – MLOps Pipeline

## Project Overview
This project implements an end-to-end MLOps pipeline for predicting hospital readmission of diabetes patients. The objective is to automate data ingestion, preprocessing, feature engineering, model training, evaluation, and deployment, providing a robust, reproducible, and production-ready workflow for machine learning in healthcare.

## Requirements
- **Python Version:** Python 3.10.11
- **Node.js:** For running the frontend (see `frontend/package.json` for version details).

## Dataset
- *Source:* [UCI Machine Learning Repository – Diabetes 130-US hospitals](https://archive.ics.uci.edu/ml/datasets/diabetes+130-us+hospitals+for+years+1999-2008)
- *Description:* The dataset contains over 100,000 hospital records for diabetes patients, including demographics, diagnoses, lab results, medications, and outcomes. The goal is to predict whether a patient will be readmitted within 30 days.
- *Files:*
  - data/raw/diabetic_data.csv: Main dataset.
  - data/raw/IDS_mapping.csv: Categorical feature mappings.

## Pipeline Steps

### 1. Data Ingestion
- Loads raw CSV data using src/data/ingestion.py.
- Saves a processed copy for downstream steps.

### 2. Data Preprocessing
- Conducted in src/data/preprocessing.py.
- Handles missing values, drops irrelevant columns, and standardizes formats.
- Maps categorical IDs to descriptions using mapping files.
- Cleans and encodes features (e.g., age bins, ICD-9 codes).

### 3. Feature Engineering
- Encodes categorical variables using label, one-hot, or binary encoding based on cardinality.
- Aggregates drug columns into count features.
- Converts age ranges to numeric values.
- Maps diagnosis codes to clinical categories.

### 4. Model Training
- Implemented in src/models/train.py and train_model.py.
- Trains multiple models: Logistic Regression, Random Forest, LightGBM, and XGBoost.
- Handles class imbalance with SMOTE.
- Uses cross-validation and saves the best model and encoders.

### 5. Evaluation
- Evaluates models using accuracy, precision, recall, F1, and ROC-AUC.
- Stores metrics in models/metrics.json.

### 6. Deployment
- The best model (LightGBM) is deployed via a Flask API (app.py).
- A React frontend (frontend/) provides a dashboard and prediction interface.

### 7. Automated Training Pipeline
- The entire process from data ingestion to model training and metrics saving can be run with a single command using train_model.py:
  sh
  python train_model.py
  
- This script automates all steps: loading data, preprocessing, training models, and saving artifacts.

## Setup Instructions

### 1. Clone the repository
sh
git clone <repo-url>
cd mlops-diabetes-prediction


### 2.  Create and activate a virtual environment
sh
py -3.10 -m venv venv
venv\Scripts\activate



### 3. Install Python dependencies
sh
py -3.10 -m pip install --upgrade pip
pip install -r requirements.txt


### 4. Run the automated training pipeline
To train all models and update metrics, run:
sh
python train_model.py


### 5. Run the backend server
sh
python app.py


### 6. Set up and run the frontend
open a new terminal 
sh
cd frontend
npm install
npm start


### 7. Configuration
- Edit config/config.yaml and config/logging.yaml for custom settings (e.g., data paths, model parameters).

## Usage

### API Usage
- The backend exposes endpoints for predictions and model information.
- See app.py for additional endpoints: /metrics, /health, /model-info/<model_name>, /predictions.

### Web Application
- Access the dashboard and prediction interface at [http://localhost:3000](http://localhost:3000) after starting the frontend.
- Use the web UI to input patient data, view model metrics, and get predictions.