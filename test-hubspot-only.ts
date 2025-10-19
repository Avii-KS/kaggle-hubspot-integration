import { DatabaseService } from "./src/services/database.service";
import { HubSpotService } from "./src/services/hubspot.service";
import { connectDatabase, sequelize } from "./src/database/connection";

async function testHubSpotOnly() {
  console.log("🧪 Testing HubSpot with existing database records...\n");

  try {
    // Connect to database
    await connectDatabase();

    // Get 10 records from database
    const dbService = new DatabaseService();
    const records = await dbService.getAllBabyNames(10);

    console.log(`Found ${records.length} records in database\n`);

    // Test HubSpot
    const hubspotService = new HubSpotService();
    const isConnected = await hubspotService.testConnection();

    if (!isConnected) {
      throw new Error("HubSpot connection failed");
    }

    // Sync to HubSpot
    await hubspotService.createContactsBatch(records);

    console.log("\n✅ Test complete!");
  } catch (error) {
    console.error("❌ Test failed:", error);
  } finally {
    await sequelize.close();
  }
}

testHubSpotOnly();
