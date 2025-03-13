from flask import Flask, request, jsonify
import xgboost as xgb
import pandas as pd
import joblib

app = Flask(__name__)

# Load the model and scaler
booster = xgb.Booster()
booster.load_model(r"./model.json")
scaler = joblib.load(r"./scaler.pkl")

# Define the columns and features used during training
cols_to_scale = ['amount', 'oldbalanceOrg', 'newbalanceOrig', 'oldbalanceDest', 'newbalanceDest']
feature_cols = cols_to_scale + ['diffOrg', 'diffDest']

@app.route('/predict', methods=['POST'])
def predict():
    try:
        # Parse the input JSON data
        data = request.json
        
        if not data:
            return jsonify({"error": "Invalid input. JSON data is required."}), 400

        # Convert input data to a DataFrame
        df_new = pd.DataFrame([data])

        # Ensure all required columns are present
        missing_cols = [col for col in cols_to_scale if col not in df_new]
        if missing_cols:
            return jsonify({"error": f"Missing required fields: {', '.join(missing_cols)}"}), 400

        # Scale numerical columns
        df_new[cols_to_scale] = scaler.transform(df_new[cols_to_scale])

        # Add derived features
        df_new['diffOrg'] = df_new['oldbalanceOrg'] - df_new['newbalanceOrig'] + df_new['amount']
        df_new['diffDest'] = df_new['oldbalanceDest'] - df_new['newbalanceDest'] + df_new['amount']

        # Keep only the relevant features
        df_new = df_new[feature_cols]

        # Convert to DMatrix for XGBoost
        dmat_new = xgb.DMatrix(df_new)

        # Make predictions
        y_pred = booster.predict(dmat_new)

        # Apply threshold to classify as Fraud or Not Fraud
        threshold = 0.5
        result = "Fraud" if y_pred[0] >= threshold else "Not Fraud"

        return jsonify({"prediction": result, "score": float(y_pred[0])})

    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)