import dotenv from "dotenv";
import path from "path";

// Load environment variables
const result = dotenv.config();
if (result.error) {
  throw new Error(`Failed to load .env file: ${result.error.message}`);
}

// Interface definitions
interface KaggleConfig {
  email: string;
  password: string;
  datasetUrl: string;
}

interface DatabaseConfig {
  host: string;
  port: number;
  name: string;
  user: string;
  password: string;
}

interface HubspotConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  accessToken: string;
}

interface AppConfig {
  nodeEnv: "development" | "test" | "production";
  logLevel: "error" | "warn" | "info" | "debug";
  downloadPath: string;
}

interface Config {
  kaggle: KaggleConfig;
  database: DatabaseConfig;
  hubspot: HubspotConfig;
  app: AppConfig;
}

// Map legacy env var names to new names
const ENV_VAR_MAPPING: Record<string, string> = {
  HS_CLIENT_ID: "HUBSPOT_CLIENT_ID",
  HS_CLIENT_SECRET: "HUBSPOT_CLIENT_SECRET",
  HS_REDIRECT_URI: "HUBSPOT_REDIRECT_URI",
  HS_ACCESS_TOKEN: "HUBSPOT_ACCESS_TOKEN",
};

// Validate required environment variables
function validateEnvVar(name: string, fallback?: string): string {
  const legacyName = Object.entries(ENV_VAR_MAPPING).find(
    ([, newName]) => newName === name
  )?.[0];
  const value = process.env[name] || process.env[legacyName || ""] || fallback;
  if (value === undefined) {
    throw new Error(
      `Missing required environment variable: ${name} ${
        legacyName ? `or ${legacyName}` : ""
      }`
    );
  }
  return value;
}

// Validate number environment variables
function validateNumberEnvVar(name: string, fallback?: number): number {
  const value = process.env[name];
  if (value === undefined) {
    if (fallback === undefined) {
      throw new Error(`Missing required environment variable: ${name}`);
    }
    return fallback;
  }
  const num = parseInt(value, 10);
  if (isNaN(num)) {
    throw new Error(
      `Invalid number value for environment variable ${name}: ${value}`
    );
  }
  return num;
}

// Validate enum environment variables
function validateEnumEnvVar<T extends string>(
  name: string,
  validValues: readonly T[],
  fallback?: T
): T {
  const value = process.env[name] || fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  if (!validValues.includes(value as T)) {
    throw new Error(
      `Invalid value for ${name}. Must be one of: ${validValues.join(", ")}`
    );
  }
  return value as T;
}

// Configuration object
export const config: Config = {
  kaggle: {
    email: validateEnvVar("KAGGLE_EMAIL"),
    password: validateEnvVar("KAGGLE_PASSWORD"),
    datasetUrl:
      "https://www.kaggle.com/datasets/thedevastator/us-baby-names-by-year-of-birth?select=babyNamesUSYOB-full.csv",
  },
  database: {
    host: validateEnvVar("DB_HOST", "localhost"),
    port: validateNumberEnvVar("DB_PORT", 3306),
    name: validateEnvVar("DB_NAME", "kaggle_db"),
    user: validateEnvVar("DB_USER", "root"),
    password: validateEnvVar("DB_PASSWORD"),
  },
  hubspot: {
    clientId: validateEnvVar("HS_CLIENT_ID"),
    clientSecret: validateEnvVar("HS_CLIENT_SECRET"),
    redirectUri: validateEnvVar("HS_REDIRECT_URI"),
    accessToken: validateEnvVar("HS_ACCESS_TOKEN"), // Use HS_ACCESS_TOKEN instead of HUBSPOT_ACCESS_TOKEN
  },
  app: {
    nodeEnv: validateEnumEnvVar(
      "NODE_ENV",
      ["development", "test", "production"] as const,
      "development"
    ),
    logLevel: validateEnumEnvVar(
      "LOG_LEVEL",
      ["error", "warn", "info", "debug"] as const,
      "info"
    ),
    downloadPath: path.resolve(process.cwd(), "downloads"),
  },
};

// Validation function for checking required environment variables at startup
export function validateConfig(): boolean {
  try {
    // Test database connection settings
    if (
      !config.database.host ||
      !config.database.port ||
      !config.database.name
    ) {
      throw new Error("Invalid database configuration");
    }

    // Validate downloadPath exists and is writable
    try {
      require("fs").accessSync(
        config.app.downloadPath,
        require("fs").constants.W_OK
      );
    } catch (error) {
      throw new Error(
        `Download path ${config.app.downloadPath} is not writable`
      );
    }

    // Validate Kaggle credentials
    if (!config.kaggle.email || !config.kaggle.password) {
      throw new Error("Missing Kaggle credentials");
    }

    // Validate Hubspot configuration
    if (
      !config.hubspot.clientId ||
      !config.hubspot.clientSecret ||
      !config.hubspot.redirectUri
    ) {
      throw new Error("Missing Hubspot configuration");
    }

    // Additional validation specific to each environment
    if (config.app.nodeEnv === "production") {
      if (!config.database.password) {
        throw new Error("Database password is required in production");
      }
      if (!config.hubspot.accessToken) {
        throw new Error("Hubspot access token is required in production");
      }
    }

    return true;
  } catch (error) {
    console.error(
      "❌ Configuration validation failed:",
      error instanceof Error ? error.message : error
    );
    return false;
  }
}
