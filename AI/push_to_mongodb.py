import pandas as pd
from pymongo import MongoClient

# Load CSV
# df = pd.read_excel("20250211.SCAI.FreeFlowALPR.xlsx",sheet_name='Sheet1')
# df = pd.read_csv("df_combined.csv")
# df = pd.read_excel("Violation_Records.xlsx", sheet_name='Sheet1', header=1)
df = pd.read_csv("acc_df5(agg).csv")
# Connect to MongoDB
client = MongoClient("mongodb://localhost:27017/Dashboard")
db = client["myDatabase"]
collection = db["acc"]

# Convert DataFrame to dictionary records
data = df.to_dict(orient="records")

# Insert into MongoDB
collection.insert_many(data)

print("Data successfully imported into MongoDB.")