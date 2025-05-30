# MLOps Final Project

## Project Overview
This project implements an end-to-end MLOps pipeline for diabetes prediction. The objective is to automate the process of data ingestion, preprocessing, feature engineering, model training, evaluation, and deployment, providing a robust and reproducible workflow for machine learning in healthcare.

## Requirements
- **Python Version:** Python 3.10.11
- **Node.js:** For running the frontend (see `frontend/package.json` for version details).

## Dataset
- **Source:** The dataset is sourced from the [UCI Machine Learning Repository](https://archive.ics.uci.edu/ml/datasets/diabetes+130-us+hospitals+for+years+1999-2008).
- **Description:** The dataset contains patient records from hospitals, including demographic information, medical measurements, and diabetes-related outcomes. It is used to predict the likelihood of diabetes readmission.
- **Files:**
  - `data/raw/diabetic_data.csv`: Main dataset.
  - `data/raw/IDS_mapping.csv`: Mapping for categorical features.

## Pipeline Steps
1. **Data Preprocessing**
   - Missing value handling and data cleaning are performed in `src/data/preprocessing.py`.
   - Data validation scripts are in `src/data/validation.py`.
2. **Feature Engineering**
   - Feature selection and transformation are handled in the preprocessing scripts.
   - Categorical encoding are applied.
3. **Model Training**
   - Multiple models (LightGBM, Logistic Regression, Random Forest, XGBoost) are trained using `src/models/train.py` and `train_model.py`.
   - Hyperparameter tuning and cross-validation are included.
4. **Evaluation**
   - Model performance is evaluated using metrics such as accuracy, precision, recall, and ROC-AUC.
   - Evaluation results are saved in `models/metrics.json`.
5. **Deployment**
   - The trained model is deployed via a backend API (`app.py`).
   - A React-based frontend (`frontend/`) provides a dashboard and prediction interface.

## Setup Instructions
1. **Clone the repository and navigate to the project folder.**
2. **Install Python dependencies:**
   ```powershell
   pip install -r requirements.txt
   ```
3. **Run the backend server:**
   ```powershell
   python app.py
   ```
4. **Set up and run the frontend:**
   ```powershell
   cd frontend
   npm install
   npm start
   ```
5. **Configuration:**
   - Edit `config/config.yaml` and `config/logging.yaml` for custom settings.

## Usage
- **API Usage:**
  - The backend exposes endpoints for predictions and model information. Use tools like Postman or cURL to interact with the API.
  - Example (replace `<data>` with your input):
    ```powershell
    curl -X POST http://localhost:5000/predict -H "Content-Type: application/json" -d '<data>'
    ```
- **Web Application:**
  - Access the dashboard and prediction interface at `http://localhost:3000` after starting the frontend.
  - Use the web UI to upload data, view model metrics, and get predictions.

## License
This project is for educational purposes.
