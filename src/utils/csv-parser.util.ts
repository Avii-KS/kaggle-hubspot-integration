import * as fs from "fs";
import * as csv from "csv-parser";
import AdmZip from "adm-zip";
import * as path from "path";

export interface BabyNameRecord {
  name: string;
  sex: "M" | "F";
  count: number;
  year: number;
}

export class CSVParser {
  private readonly validSexValues = new Set(["M", "F", "MALE", "FEMALE"]);
  private readonly MIN_YEAR = 1800;
  private readonly MAX_YEAR = new Date().getFullYear();

  private validateRecord(record: any): BabyNameRecord | null {
    try {
      // Extract column headers
      const columnKeys = Object.keys(record);

      // Find name column
      const nameCol =
        columnKeys.find(
          (key) =>
            key.toLowerCase().includes("name") || key.toLowerCase() === "n"
        ) || columnKeys[0]; // Default to first column if no name column found

      // Find sex/gender column
      const sexCol =
        columnKeys.find(
          (key) =>
            key.toLowerCase().includes("sex") ||
            key.toLowerCase().includes("gender") ||
            key.toLowerCase() === "g" ||
            key.toLowerCase() === "s"
        ) || columnKeys[1]; // Default to second column

      // Find count column
      const countCol =
        columnKeys.find(
          (key) =>
            key.toLowerCase().includes("count") ||
            key.toLowerCase().includes("frequency") ||
            key.toLowerCase() === "c" ||
            key.toLowerCase() === "f"
        ) || columnKeys[2]; // Default to third column

      // Find year column
      const yearCol =
        columnKeys.find(
          (key) =>
            key.toLowerCase().includes("year") ||
            key.toLowerCase().includes("date") ||
            key.toLowerCase() === "y"
        ) || columnKeys[3]; // Default to fourth column

      // Validate name
      const name = record[nameCol]?.toString().trim();
      if (!name) {
        return null;
      }

      // Validate sex - accept any recognizable sex/gender value
      let sex = record[sexCol]?.toString().trim().toUpperCase() || "";
      if (sex.startsWith("M") || sex === "1") {
        sex = "M";
      } else if (sex.startsWith("F") || sex === "2") {
        sex = "F";
      } else {
        return null;
      }

      // Validate count - accept any non-negative number
      const countStr = record[countCol]?.toString().trim();
      const count = parseInt(countStr || "0", 10);
      if (isNaN(count)) {
        return null;
      }

      // Validate year - be more lenient with year validation
      const yearStr = record[yearCol]?.toString().trim();
      const year = parseInt(yearStr, 10);
      // Accept any year between 1800 and the current year
      if (isNaN(year) || year < 1800 || year > new Date().getFullYear()) {
        return null;
      }

      return {
        name,
        sex: sex as "M" | "F",
        count,
        year,
      };
    } catch (error) {
      return null;
    }
  }

  async extractZipFile(zipPath: string): Promise<string> {
    console.log("📦 Extracting ZIP file...");

    if (!fs.existsSync(zipPath)) {
      throw new Error(`ZIP file not found at path: ${zipPath}`);
    }

    try {
      const zip = new AdmZip(zipPath);
      const zipEntries = zip.getEntries();

      // Find the MAIN aggregate CSV file
      let csvEntry = zipEntries.find(
        (entry) =>
          entry.entryName.toLowerCase().includes("babynames") &&
          entry.entryName.toLowerCase().includes("full") &&
          entry.entryName.endsWith(".csv") &&
          !entry.isDirectory
      );

      if (!csvEntry) {
        // If not found, look for any CSV with "full" in name
        csvEntry = zipEntries.find(
          (entry) =>
            entry.entryName.endsWith(".csv") &&
            !entry.isDirectory &&
            entry.entryName.toLowerCase().includes("full")
        );

        if (!csvEntry) {
          console.log("Available files in ZIP:");
          const csvFiles = zipEntries.filter((entry) =>
            entry.entryName.endsWith(".csv")
          );
          if (csvFiles.length === 0) {
            throw new Error("No CSV files found in ZIP");
          }
          csvFiles.forEach((entry) => {
            console.log(`  - ${entry.entryName}`);
          });
          throw new Error("Main CSV file not found in ZIP");
        }
      }

      const extractPath = path.dirname(zipPath);

      // Ensure extract path exists
      if (!fs.existsSync(extractPath)) {
        fs.mkdirSync(extractPath, { recursive: true });
      }

      zip.extractEntryTo(csvEntry, extractPath, false, true);

      const csvPath = path.join(extractPath, csvEntry.entryName);

      // Verify extracted file exists and is readable
      if (!fs.existsSync(csvPath)) {
        throw new Error(`Failed to extract CSV file to: ${csvPath}`);
      }

      try {
        fs.accessSync(csvPath, fs.constants.R_OK);
      } catch (error) {
        throw new Error(`Extracted CSV file is not readable: ${csvPath}`);
      }

      console.log(`✅ CSV extracted to: ${csvPath}`);
      console.log(
        `📄 File size: ${(csvEntry.header.size / 1024 / 1024).toFixed(2)} MB`
      );

      return csvPath;
    } catch (error) {
      console.error(
        "❌ ZIP extraction failed:",
        error instanceof Error ? error.message : error
      );
      throw error;
    }
  }

  async parseCSV(
    csvPath: string,
    onBatch: (records: BabyNameRecord[]) => Promise<void>,
    limit?: number
  ): Promise<number> {
    if (!fs.existsSync(csvPath)) {
      throw new Error(`CSV file not found at path: ${csvPath}`);
    }

    console.log("📊 Parsing CSV file...");
    if (limit) {
      console.log(
        `   Limiting to first ${limit.toLocaleString()} records for demo`
      );
    }

    const BATCH_SIZE = 1000;
    let batch: BabyNameRecord[] = [];
    let totalRecords = 0;
    let invalidRecords = 0;
    const uniqueNames = new Set<string>();
    let lineNumber = 0;

    return new Promise<number>((resolve, reject) => {
      const stream = fs
        .createReadStream(csvPath)
        .pipe(csv.default())
        .on("data", async (data) => {
          lineNumber++;

          try {
            // Stop if we've reached the limit
            if (limit && totalRecords >= limit) {
              stream.destroy();
              return;
            }

            const record = this.validateRecord(data);
            if (record) {
              const nameKey = `${record.name}-${record.sex}-${record.year}`;
              if (!uniqueNames.has(nameKey)) {
                uniqueNames.add(nameKey);
                batch.push(record);
                totalRecords++;

                if (batch.length >= BATCH_SIZE) {
                  try {
                    stream.pause();
                    await onBatch([...batch]);
                    process.stdout.write(
                      `\r📊 Valid records processed: ${totalRecords.toLocaleString()}`
                    );
                    batch = [];
                    stream.resume();
                  } catch (error) {
                    stream.destroy();
                    reject(error);
                  }
                }
              }
            } else {
              invalidRecords++;
              if (invalidRecords % 1000 === 0) {
                console.warn(
                  `⚠️  ${invalidRecords.toLocaleString()} invalid records found`
                );
              }
            }
          } catch (error) {
            console.error(
              `Error processing line ${lineNumber}:`,
              error instanceof Error ? error.message : error
            );
            invalidRecords++;
          }
        })
        .on("end", async () => {
          if (batch.length > 0) {
            try {
              await onBatch(batch);
              process.stdout.write(
                `\r📊 Unique names found: ${totalRecords.toLocaleString()}`
              );
            } catch (error) {
              reject(error);
              return;
            }
          }
          console.log(
            `\n✅ Found ${totalRecords.toLocaleString()} valid records in CSV`
          );
          if (invalidRecords > 0) {
            console.warn(
              `⚠️  Skipped ${invalidRecords.toLocaleString()} invalid records`
            );
          }
          resolve(totalRecords);
        })
        .on("error", (error) => {
          console.error(
            "❌ CSV parsing failed:",
            error instanceof Error ? error.message : error
          );
          reject(error);
        });

      // Handle stream errors
      stream.on("error", (error) => {
        console.error(
          "❌ Stream error:",
          error instanceof Error ? error.message : error
        );
        reject(error);
      });
    });
  }
}
