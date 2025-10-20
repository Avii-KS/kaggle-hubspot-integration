import { Client } from "@hubspot/api-client";
import { BabyName } from "../database/models/BabyName";
import { config } from "../config/environment.config";

// Enhanced error type for better debugging
interface HubSpotError extends Error {
  statusCode?: number;
  error?: {
    message?: string;
    category?: string;
    status?: string;
    correlationId?: string;
  };
}

// Core contact properties
interface ContactProperties {
  [key: string]: string | undefined;
  firstname: string;
  lastname: string;
  email: string;
  gender?: string;
  notes?: string;
}

export class HubSpotService {
  private readonly client: Client;
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY_BASE = 1000; // 1s base delay
  private readonly BATCH_SIZE = 10; // HubSpot's recommended batch size
  private readonly RATE_LIMIT_DELAY = 1000; // Prevent 429 errors

  constructor() {
    if (!config.hubspot.accessToken) {
      throw new Error("HubSpot access token not configured");
    }
    this.client = new Client({ accessToken: config.hubspot.accessToken });
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.client.crm.contacts.basicApi.getPage(1);
      console.log("✅ HubSpot connection successful");
      return true;
    } catch (error) {
      const hubspotError = error as HubSpotError;
      console.error(
        "❌ HubSpot connection failed:",
        this.formatError(hubspotError)
      );
      return false;
    }
  }

  private async createContactWithRetry(
    properties: ContactProperties,
    retryCount = 0
  ): Promise<void> {
    try {
      // Filter out undefined values and convert to HubSpot format
      const cleanProperties = Object.entries(properties)
        .filter(([_, value]) => value !== undefined)
        .reduce(
          (acc, [key, value]) => ({
            ...acc,
            [key]: value as string,
          }),
          {} as { [key: string]: string }
        );

      await this.client.crm.contacts.basicApi.create({
        properties: cleanProperties,
        associations: [],
      });
    } catch (error) {
      const hubspotError = error as HubSpotError;

      // Ignore if contact already exists
      if (hubspotError.statusCode === 409) {
        console.log(`  ⚠️ Contact already exists: ${properties.firstname}`);
        return;
      }

      // Handle rate limiting
      if (hubspotError.statusCode === 429) {
        if (retryCount < this.MAX_RETRIES) {
          console.log("  ⚠️ Rate limit hit, waiting before retry...");
          await this.delay(this.RATE_LIMIT_DELAY * Math.pow(2, retryCount));
          return this.createContactWithRetry(properties, retryCount + 1);
        }
      }

      // Handle other retryable errors
      if (
        this.isRetryableError(hubspotError) &&
        retryCount < this.MAX_RETRIES
      ) {
        console.log(
          `  ⚠️ Retrying contact creation (${retryCount + 1}/${
            this.MAX_RETRIES
          })...`
        );
        await this.delay(this.RETRY_DELAY_BASE * Math.pow(2, retryCount));
        return this.createContactWithRetry(properties, retryCount + 1);
      }

      // Otherwise, throw the error
      throw new Error(
        `Failed to create contact ${properties.firstname}: ${this.formatError(
          hubspotError
        )}`
      );
    }
  }

  private isRetryableError(error: HubSpotError): boolean {
    const retryableStatusCodes = [500, 502, 503, 504];
    const retryableCategories = ["NETWORK", "RATE_LIMITS"];

    return !!(
      retryableStatusCodes.includes(error.statusCode || 0) ||
      retryableCategories.includes(error.error?.category || "") ||
      error.message?.includes("ETIMEDOUT") ||
      error.message?.includes("ECONNRESET")
    );
  }

  private formatError(error: HubSpotError): string {
    if (error.error?.message) {
      return `${error.error.message} (Category: ${
        error.error.category || "Unknown"
      }, Status: ${
        error.error.status || error.statusCode || "Unknown"
      }, Correlation ID: ${error.error.correlationId || "None"})`;
    }
    return error.message || "Unknown error";
  }

  async createContact(name: string, sex: string): Promise<void> {
    try {
      // Generate unique email
      const cleanName = name.toLowerCase().replace(/[^a-z0-9]/g, "");
      const uniqueId = Math.random().toString(36).substring(2, 15);
      const email = `${cleanName}-${uniqueId}@example.com`;

      const properties = {
        firstname: name,
        lastname: sex === "M" ? "Boy" : "Girl",
        email: email,
        // Don't add 'description' or any other non-standard property!
      };

      await this.client.crm.contacts.basicApi.create({
        properties,
        associations: [],
      });

      console.log(`  ✓ Created: ${name} (${sex})`);
    } catch (error: any) {
      if (error.statusCode === 409) {
        console.log(`  ⚠ Duplicate: ${name}`);
      } else {
        console.error(`  ✗ Error: ${name} - ${error.message}`);
        throw error;
      }
    }
  }

  async createContactsBatch(records: BabyName[]): Promise<void> {
    console.log(`📇 Creating contacts in HubSpot...`);

    let successCount = 0;
    let errorCount = 0;
    let skipCount = 0;
    let totalProcessed = 0;

    try {
      for (let i = 0; i < records.length; i += this.BATCH_SIZE) {
        const batch = records.slice(i, i + this.BATCH_SIZE);
        console.log(`\n📦 Processing batch of ${batch.length} records...`);

        const results = await Promise.allSettled(
          batch.map((baby) => this.createContact(baby.name, baby.sex))
        );

        results.forEach((result) => {
          if (result.status === "fulfilled") {
            successCount++;
          } else {
            const error = result.reason as HubSpotError;
            if (error.statusCode === 409) {
              skipCount++;
            } else {
              errorCount++;
            }
          }
        });

        totalProcessed += batch.length;
        this.printProgress(totalProcessed, successCount, skipCount, errorCount);

        // Rate limiting delay between batches
        if (i + this.BATCH_SIZE < records.length) {
          await this.delay(this.RATE_LIMIT_DELAY);
        }
      }

      this.printSummary(totalProcessed, successCount, skipCount, errorCount);
    } catch (error) {
      console.error(
        "\n❌ Error during HubSpot sync:",
        this.formatError(error as HubSpotError)
      );
      throw error;
    }
  }

  private printProgress(
    total: number,
    success: number,
    skipped: number,
    errors: number
  ): void {
    process.stdout.write(
      `\r📊 Processed: ${total} | Success: ${success} | Skipped: ${skipped} | Errors: ${errors}`
    );
  }

  private printSummary(
    total: number,
    success: number,
    skipped: number,
    errors: number
  ): void {
    console.log("\n\n✅ HubSpot sync complete!");
    console.log("📊 Summary:");
    console.log(`   Total Processed: ${total}`);
    console.log(`   Successful: ${success}`);
    console.log(`   Skipped (Duplicates): ${skipped}`);
    console.log(`   Errors: ${errors}`);

    if (errors > 0) {
      console.warn(
        "\n⚠️  Some records failed to sync. Check the logs above for details."
      );
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
