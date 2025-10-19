import { Sequelize } from "sequelize";
import { config } from "../config/environment.config";

export const sequelize = new Sequelize({
  dialect: "mysql",
  host: config.database.host,
  port: config.database.port,
  username: config.database.user,
  password: config.database.password,
  database: config.database.name,
  logging: false, // Disable SQL logging for cleaner output
  pool: {
    max: 10,
    min: 0,
    acquire: 30000,
    idle: 10000,
  },
  dialectOptions: {
    connectTimeout: 30000,
    decimalNumbers: true,
  },
  retry: {
    max: 5, // Increased from 3
    backoffBase: 1000,
    backoffExponent: 1.5,
    match: [
      /Deadlock/i,
      /ER_NET_READ_INTERRUPTED/,
      /ER_LOCK_DEADLOCK/,
      /ER_LOCK_WAIT_TIMEOUT/,
      /SequelizeConnectionError/,
      /SequelizeConnectionRefusedError/,
      /SequelizeHostNotFoundError/,
      /SequelizeAccessDeniedError/,
      /SequelizeConnectionAcquireTimeoutError/,
      /SequelizeConnectionTimedOutError/,
      /ETIMEDOUT/,
      /ECONNRESET/,
      /PROTOCOL_CONNECTION_LOST/,
      /PROTOCOL_ENQUEUE_AFTER_FATAL_ERROR/,
    ],
  },
});

export async function connectDatabase(): Promise<void> {
  try {
    await sequelize.authenticate();
    console.log("✅ Database connection established successfully");
  } catch (error) {
    console.error("❌ Unable to connect to database:", error);
    throw error;
  }
}

// syncDatabase removed: use migrations instead (sequelize-cli)
