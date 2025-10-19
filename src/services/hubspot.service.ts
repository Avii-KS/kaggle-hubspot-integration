import { Client } from "@hubspot/api-client";
import { BabyName } from "../database/models/BabyName.model";
import { config } from "../config/environment.config";

export class HubSpotService {
  private client: Client;

  constructor() {
    this.client = new Client({ accessToken: config.hubspot.accessToken });
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.client.crm.contacts.basicApi.getPage(1);
      console.log("✅ HubSpot connection successful");
      return true;
    } catch (error) {
      console.error("❌ HubSpot connection failed:", error);
      return false;
    }
  }

  async createContact(name: string, sex: string): Promise<void> {
    try {
      const properties = {
        firstname: name,
        lastname: "Baby",
        email: `${name.toLowerCase().replace(/[^a-z]/g, "")}@babyname.test`,
      };

      await this.client.crm.contacts.basicApi.create({
        properties,
        associations: [],
      });

      console.log(`  ✓ Created contact: ${name} (${sex})`);
    } catch (error: any) {
      if (error.statusCode === 409) {
        console.log(`  ⚠ Contact already exists: ${name}`);
      } else {
        console.error(`  ✗ Error creating contact ${name}:`, error.message);
        throw error;
      }
    }
  }

  async createContactsBatch(
    babyNames: BabyName[],
    limit: number = 50
  ): Promise<void> {
    console.log(`📇 Creating contacts in HubSpot (limit: ${limit})...`);

    const recordsToSync = babyNames.slice(0, limit);

    const BATCH_SIZE = 10;
    const DELAY_MS = 1000;

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < recordsToSync.length; i += BATCH_SIZE) {
      const batch = recordsToSync.slice(i, i + BATCH_SIZE);

      console.log(`\n📦 Processing batch ${Math.floor(i / BATCH_SIZE) + 1}...`);

      const results = await Promise.allSettled(
        batch.map((baby) => this.createContact(baby.name, baby.sex))
      );

      results.forEach((result) => {
        if (result.status === "fulfilled") {
          successCount++;
        } else {
          errorCount++;
        }
      });

      if (i + BATCH_SIZE < recordsToSync.length) {
        console.log(`⏳ Waiting ${DELAY_MS}ms before next batch...`);
        await this.delay(DELAY_MS);
      }

      console.log(
        `Progress: ${Math.min(i + BATCH_SIZE, recordsToSync.length)}/${
          recordsToSync.length
        }`
      );
    }

    console.log(`\n✅ HubSpot sync complete!`);
    console.log(`   Success: ${successCount}`);
    console.log(`   Errors: ${errorCount}`);
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
