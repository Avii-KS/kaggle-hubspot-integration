import { BabyName } from "../database/models/BabyName";
import { BabyNameRecord } from "../utils/csv-parser.util";
import { sequelize } from "../database/connection";
import { Transaction, QueryTypes } from "sequelize";

export class DatabaseService {
  /**
   * Get a random selection of names from the database
   * @param limit Number of names to return
   */
  public async getRandomNames(limit: number): Promise<BabyName[]> {
    return BabyName.findAll({
      order: sequelize.random(),
      limit,
    });
  }

  /**
   * Save baby names to database in optimized batches with error handling
   * @param records Array of baby name records to save
   * @param batchSize Size of each batch (default 25)
   */
  public async saveBabyNames(
    records: BabyNameRecord[],
    batchSize = 25
  ): Promise<void> {
    const CHUNK_SIZE = 25; // Reduced chunk size for better memory management
    const DELAY_MS = 2000; // Increased delay between operations
    const MAX_RETRIES = 5;
    const totalRecords = records.length;
    let processedRecords = 0;

    console.log(
      `💾 Starting to save ${totalRecords.toLocaleString()} records to database...`
    );

    const sleep = (ms: number) =>
      new Promise((resolve) => setTimeout(resolve, ms));

    const isRetryableError = (error: any) => {
      const retryableErrors = [
        "ER_NET_READ_INTERRUPTED",
        "PROTOCOL_CONNECTION_LOST",
        "ETIMEDOUT",
        "ECONNRESET",
        "SequelizeConnectionError",
        "SequelizeConnectionRefusedError",
        "SequelizeHostNotFoundError",
        "SequelizeAccessDeniedError",
        "SequelizeConnectionAcquireTimeoutError",
        "SequelizeConnectionTimedOutError",
        "ER_LOCK_WAIT_TIMEOUT",
        "ER_LOCK_DEADLOCK",
      ];
      return retryableErrors.some(
        (errType) =>
          error.name?.includes(errType) ||
          error.message?.includes(errType) ||
          error.code?.includes(errType)
      );
    };

    const saveChunkWithRetry = async (
      chunk: BabyNameRecord[],
      retryCount = 0,
      transaction?: Transaction
    ): Promise<void> => {
      try {
        // Create values string for SQL insert
        const values = chunk
          .map(
            (record) =>
              `(${
                record.name ? `'${record.name.replace(/'/g, "''")}'` : "NULL"
              }, ${record.sex ? `'${record.sex}'` : "NULL"})`
          )
          .join(",");

        // Use raw SQL insert with multiple values
        const sql = `INSERT IGNORE INTO baby_names (name, sex) VALUES ${values}`;

        // Execute raw query within transaction
        await sequelize.query(sql, {
          raw: true,
          transaction,
          retry: {
            max: 3,
            backoffBase: 1000,
          },
        });
      } catch (error) {
        if (retryCount < MAX_RETRIES && isRetryableError(error)) {
          console.log(
            `\n⚠️ Retry attempt ${retryCount + 1} for current chunk...`
          );
          // Exponential backoff
          await sleep(DELAY_MS * Math.pow(2, retryCount));
          return saveChunkWithRetry(chunk, retryCount + 1, transaction);
        }
        throw error;
      }
    };

    try {
      let currentBatch: BabyNameRecord[] = [];

      // Process records in batches
      for (let i = 0; i < records.length; i++) {
        currentBatch.push(records[i]);

        // When batch is full or we're at the last record
        if (currentBatch.length === batchSize || i === records.length - 1) {
          // Create transaction for entire batch
          const transaction = await sequelize.transaction();

          try {
            // Process current batch in chunks
            for (let j = 0; j < currentBatch.length; j += CHUNK_SIZE) {
              const chunk = currentBatch.slice(j, j + CHUNK_SIZE);
              await saveChunkWithRetry(chunk, 0, transaction);

              processedRecords += chunk.length;
              const progress = Math.round(
                (processedRecords / totalRecords) * 100
              );
              console.log(
                `💾 Processed ${processedRecords.toLocaleString()} of ${totalRecords.toLocaleString()} records (${progress}%)`
              );

              // Force garbage collection after each chunk
              if (global.gc) {
                global.gc();
              }

              await sleep(DELAY_MS);
            }

            // Commit transaction after all chunks in batch are processed
            await transaction.commit();

            // Clear batch and force GC
            currentBatch = [];
            if (global.gc) {
              global.gc();
            }

            // Additional delay between batches
            await sleep(DELAY_MS);
          } catch (error) {
            // Rollback transaction on error
            await transaction.rollback();
            throw error;
          }
        }
      }

      console.log("\n✅ All records saved successfully");
    } catch (error) {
      console.error("\n❌ Error saving records:", error);
      throw error;
    }
  }

  /**
   * Get all baby names from database with optional limit
   * @param limit Maximum number of records to return
   */
  public async getAllBabyNames(limit?: number): Promise<BabyName[]> {
    console.log("📚 Fetching baby names from database...");
    if (limit) {
      console.log(`   Limiting to ${limit.toLocaleString()} records`);
    }

    try {
      const records = await sequelize.query(
        `SELECT DISTINCT name, sex, id, createdAt, updatedAt 
         FROM baby_names 
         ORDER BY RAND() 
         LIMIT :limit`,
        {
          replacements: { limit: limit || 100 },
          type: QueryTypes.SELECT,
          model: BabyName,
          mapToModel: true,
        }
      );

      console.log(`✅ Retrieved ${records.length} unique names`);
      return records;
    } catch (error) {
      console.error("❌ Error fetching records:", error);
      throw error;
    }
  }

  /**
   * Get total count of records in the baby_names table
   */
  public async getRecordCount(): Promise<number> {
    try {
      return await BabyName.count();
    } catch (error) {
      console.error("❌ Error getting record count:", error);
      throw error;
    }
  }

  /**
   * Clear all records from the baby_names table
   */
  public async clearTable(): Promise<void> {
    console.log("🗑️ Clearing baby_names table...");
    try {
      await BabyName.destroy({ where: {}, truncate: true });
      console.log("✅ Table cleared");
    } catch (error) {
      console.error("❌ Error clearing table:", error);
      throw error;
    }
  }
}
