import * as fs from "fs";
import * as csv from "csv-parser";
import * as AdmZip from "adm-zip";
import * as path from "path";

export interface BabyNameRecord {
  name: string;
  sex: string;
}

export class CSVParser {
  async extractZipFile(zipPath: string): Promise<string> {
    console.log("📦 Extracting ZIP file...");

    try {
      const zip = new AdmZip(zipPath);
      const zipEntries = zip.getEntries();

      const csvEntry = zipEntries.find(
        (entry) =>
          entry.entryName.endsWith(".csv") &&
          entry.entryName.includes("babyNames")
      );

      if (!csvEntry) {
        throw new Error("CSV file not found in ZIP");
      }

      const extractPath = path.dirname(zipPath);
      zip.extractEntryTo(csvEntry, extractPath, false, true);

      const csvPath = path.join(extractPath, csvEntry.entryName);
      console.log(`✅ CSV extracted to: ${csvPath}`);

      return csvPath;
    } catch (error) {
      console.error("❌ ZIP extraction failed:", error);
      throw error;
    }
  }

  async parseCSV(csvPath: string): Promise<BabyNameRecord[]> {
    console.log("📊 Parsing CSV file...");

    return new Promise((resolve, reject) => {
      const results: BabyNameRecord[] = [];

      fs.createReadStream(csvPath)
        .pipe(csv.default())
        .on("data", (data) => {
          const record: BabyNameRecord = {
            name: data.Name || data.name || data.NAME,
            sex: data.Sex || data.sex || data.Gender || data.gender,
          };

          if (record.name && record.sex) {
            record.name = record.name.trim();
            record.sex = record.sex.trim().toUpperCase();

            if (record.sex === "MALE") record.sex = "M";
            if (record.sex === "FEMALE") record.sex = "F";

            if (["M", "F"].includes(record.sex)) {
              results.push(record);
            }
          }
        })
        .on("end", () => {
          console.log(`✅ Parsed ${results.length} records from CSV`);
          resolve(results);
        })
        .on("error", (error) => {
          console.error("❌ CSV parsing failed:", error);
          reject(error);
        });
    });
  }
}
