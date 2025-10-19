import { KaggleService } from "./services/kaggle.service";
import { DatabaseService } from "./services/database.service";
import { HubSpotService } from "./services/hubspot.service";
import { CSVParser } from "./utils/csv-parser.util";
import {
  connectDatabase,
  syncDatabase,
  sequelize,
} from "./database/connection";
import { validateConfig } from "./config/environment.config";

async function main() {
  console.log("\n==============================================");
  console.log("🚀 Kaggle to HubSpot Integration Pipeline");
  console.log("==============================================\n");

  // Step 1: Validate environment
  console.log("📋 Step 1: Validating configuration...");
  if (!validateConfig()) {
    console.error(
      "❌ Configuration validation failed. Please check your .env file."
    );
    process.exit(1);
  }
  console.log("✅ Configuration validated\n");

  // Initialize services
  const kaggleService = new KaggleService();
  const dbService = new DatabaseService();
  const hubspotService = new HubSpotService();
  const csvParser = new CSVParser();

  try {
    // Step 2: Connect to database
    console.log("📋 Step 2: Connecting to database...");
    await connectDatabase();
    await syncDatabase();
    console.log("");

    // Step 3: Initialize Playwright and login to Kaggle
    console.log("📋 Step 3: Logging into Kaggle...");
    await kaggleService.initialize();
    await kaggleService.login();
    console.log("");

    // Step 4: Download dataset
    console.log("📋 Step 4: Downloading dataset from Kaggle...");
    const zipPath = await kaggleService.downloadDataset();
    console.log("");

    // Step 5: Extract ZIP and parse CSV
    console.log("📋 Step 5: Extracting and parsing data...");
    const csvPath = await csvParser.extractZipFile(zipPath);
    const babyNameRecords = await csvParser.parseCSV(csvPath);
    console.log("");

    // Step 6: Save to database
    console.log("📋 Step 6: Saving to MySQL database...");
    await dbService.saveBabyNames(babyNameRecords);
    console.log("");

    // Step 7: Retrieve from database
    console.log("📋 Step 7: Retrieving data from database...");
    const savedRecords = await dbService.getAllBabyNames();
    console.log("");

    // Step 8: Test HubSpot connection
    console.log("📋 Step 8: Testing HubSpot connection...");
    const isConnected = await hubspotService.testConnection();
    if (!isConnected) {
      throw new Error("Failed to connect to HubSpot");
    }
    console.log("");

    // Step 9: Push to HubSpot (limit to first 50 for demo)
    console.log("📋 Step 9: Syncing to HubSpot CRM...");
    await hubspotService.createContactsBatch(savedRecords, 50);
    console.log("");

    console.log("==============================================");
    console.log("🎉 Pipeline completed successfully!");
    console.log("==============================================\n");

    console.log("📊 Summary:");
    console.log(`   - Records parsed: ${babyNameRecords.length}`);
    console.log(`   - Records in database: ${savedRecords.length}`);
    console.log(
      `   - Records synced to HubSpot: ${Math.min(50, savedRecords.length)}`
    );
    console.log("");
  } catch (error) {
    console.error("\n❌ Pipeline failed with error:", error);
    process.exit(1);
  } finally {
    // Cleanup
    await kaggleService.close();
    await sequelize.close();
  }
}

// Run the application
main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
