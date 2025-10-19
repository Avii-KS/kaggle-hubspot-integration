import dotenv from "dotenv";

dotenv.config();

export const config = {
  kaggle: {
    email: process.env.KAGGLE_EMAIL || "",
    password: process.env.KAGGLE_PASSWORD || "",
    datasetUrl:
      "https://www.kaggle.com/datasets/thedevastator/us-baby-names-by-year-of-birth?select=babyNamesUSYOB-full.csv",
  },
  database: {
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT || "3306"),
    name: process.env.DB_NAME || "kaggle_db",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
  },
  hubspot: {
    accessToken: process.env.HUBSPOT_ACCESS_TOKEN || "",
  },
  app: {
    nodeEnv: process.env.NODE_ENV || "development",
    logLevel: process.env.LOG_LEVEL || "info",
    downloadPath: "./downloads",
  },
};

export function validateConfig(): boolean {
  const required = [
    "KAGGLE_EMAIL",
    "KAGGLE_PASSWORD",
    "DB_PASSWORD",
    "HS_CLIENT_ID",
  ];

  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    console.error("Missing required environment variables:", missing);
    return false;
  }

  return true;
}
