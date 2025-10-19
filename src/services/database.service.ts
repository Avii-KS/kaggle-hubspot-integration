import { BabyName } from "../database/models/BabyName";
import { BabyNameRecord } from "../utils/csv-parser.util";

export class DatabaseService {
  async saveBabyNames(records: BabyNameRecord[]): Promise<void> {
    console.log(`💾 Saving ${records.length} records to database...`);

    try {
      await BabyName.bulkCreate(records, {
        ignoreDuplicates: true,
        validate: true,
      });

      console.log("✅ All records saved successfully");
    } catch (error) {
      console.error("❌ Error saving to database:", error);
      throw error;
    }
  }

  async getAllBabyNames(): Promise<BabyName[]> {
    console.log("📚 Fetching all baby names from database...");

    try {
      const records = await BabyName.findAll({
        order: [["name", "ASC"]],
      });

      console.log(`✅ Retrieved ${records.length} records`);
      return records;
    } catch (error) {
      console.error("❌ Error fetching from database:", error);
      throw error;
    }
  }

  async getRecordCount(): Promise<number> {
    return await BabyName.count();
  }

  async clearTable(): Promise<void> {
    console.log("🗑️ Clearing baby_names table...");
    await BabyName.destroy({ where: {}, truncate: true });
    console.log("✅ Table cleared");
  }
}
