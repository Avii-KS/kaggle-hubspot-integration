import { Sequelize } from "sequelize";
import { config } from "../config/environment.config";

export const sequelize = new Sequelize({
  dialect: "mysql",
  host: config.database.host,
  port: config.database.port,
  username: config.database.user,
  password: config.database.password,
  database: config.database.name,
  logging: config.app.nodeEnv === "development" ? console.log : false,
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000,
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

export async function syncDatabase(): Promise<void> {
  try {
    await sequelize.sync({ alter: true });
    console.log("✅ Database synchronized");
  } catch (error) {
    console.error("❌ Database sync failed:", error);
    throw error;
  }
}
