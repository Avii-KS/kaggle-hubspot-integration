import { KaggleService } from "./services/kaggle.service";
import { DatabaseService } from "./services/database.service";
import { HubSpotService } from "./services/hubspot.service";
import { CSVParser } from "./utils/csv-parser.util";
import { connectDatabase, sequelize } from "./database/connection";
import { validateConfig } from "./config/environment.config";

const CONFIG = {
  DEMO_MODE: true, // Set false to process all records
  CSV_LIMIT: 5000, // Records to process in demo mode
  DB_BATCH_SIZE: 1000, // How many records to insert at once
  HUBSPOT_LIMIT: 50, // How many contacts to sync
};

async function main() {
  console.log("\n🚀 Starting pipeline...\n");
  const startTime = Date.now();

  // Initialize services
  const kaggle = new KaggleService();
  const database = new DatabaseService();
  const hubspot = new HubSpotService();
  const parser = new CSVParser();

  try {
    // Step 1: Check configuration
    console.log("→ Checking configuration...");
    if (!validateConfig()) {
      throw new Error("Configuration missing. Check your .env file.");
    }
    console.log("  ✓ Configuration valid\n");

    // Step 2: Connect to database
    console.log("→ Connecting to database...");
    await connectDatabase();
    console.log("  ✓ Database connected\n");

    // Step 3: Check if data already exists
    const existingCount = await database.getRecordCount();

    if (existingCount > 0) {
      console.log("→ Checking existing data...");
      console.log(
        `  ℹ️  Database already contains ${existingCount.toLocaleString()} records`
      );
      console.log("  ℹ️  Skipping download (using existing data)\n");
    } else {
      // Only download and process if database is empty
      console.log("→ Downloading dataset from Kaggle...");
      const zipFile = await kaggle.downloadDataset();
      console.log("  ✓ Downloaded successfully\n");

      console.log("→ Processing CSV data...");
      if (CONFIG.DEMO_MODE) {
        console.log(
          `  (Demo mode: processing ${CONFIG.CSV_LIMIT.toLocaleString()} records)`
        );
      }

      const csvFile = await parser.extractZipFile(zipFile);
      const recordsProcessed = await parser.parseCSV(
        csvFile,
        async (batch) => {
          await database.saveBabyNames(batch, CONFIG.DB_BATCH_SIZE);
        },
        CONFIG.DEMO_MODE ? CONFIG.CSV_LIMIT : undefined
      );
      console.log(
        `  ✓ Processed ${recordsProcessed.toLocaleString()} records\n`
      );
    }

    // Step 4: Sync to HubSpot
    console.log("→ Syncing to HubSpot...");
    const connected = await hubspot.testConnection();
    if (!connected) {
      throw new Error("Could not connect to HubSpot. Check your API key.");
    }

    const contacts = await database.getAllBabyNames(CONFIG.HUBSPOT_LIMIT);
    if (contacts.length === 0) {
      throw new Error("No records found in database to sync.");
    }

    console.log(`  ✓ Connected to HubSpot API`);
    console.log(`  ✓ Fetched ${contacts.length} contacts to sync\n`);

    // Show first few names for clarity
    const sampleNames = contacts
      .slice(0, 5)
      .map((c) => c.name)
      .join(", ");
    console.log(`  Creating contacts: ${sampleNames}...`);

    await hubspot.createContactsBatch(contacts);
    console.log(`  ✓ Created ${contacts.length} contacts successfully\n`);

    // Final summary
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    const totalInDb = await database.getRecordCount();

    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("✅ Pipeline completed successfully!");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
    console.log(`  Records in database: ${totalInDb.toLocaleString()}`);
    console.log(`  Synced to HubSpot: ${contacts.length}`);
    console.log(`  Time taken: ${duration}s\n`);

    if (CONFIG.DEMO_MODE) {
      console.log("💡 Tip: Set DEMO_MODE to false to process all records\n");
    }
  } catch (error) {
    // Handle errors
    console.error("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.error("❌ Pipeline failed");
    console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    if (error instanceof Error) {
      console.error(`  Error: ${error.message}\n`);

      // Show stack trace in development
      if (process.env.NODE_ENV === "development") {
        console.error("  Stack trace:");
        console.error(error.stack);
      }
    } else {
      console.error("  Unknown error occurred\n");
    }

    console.error("💡 Check README.md for troubleshooting tips\n");
    process.exit(1);
  } finally {
    // Cleanup
    try {
      await kaggle.close();
      await sequelize.close();
    } catch (error) {}
  }
}

if (require.main === module) {
  main();
}
