/**
 * Simple and reliable Kaggle dataset downloader.
 *
 * Why Playwright instead of Kaggle API?
 * - More reliable for large datasets
 * - Better error handling
 * - No API rate limits
 *
 * @author Avinash
 * @since Oct 2025
 */

import * as fs from "fs";
import * as path from "path";
import { exec } from "child_process";
import { promisify } from "util";
import { config } from "../config/environment.config";
import { setTimeout } from "timers/promises";

const execAsync = promisify(exec);

// Simple error interface for better debugging
interface KaggleError extends Error {
  code?: string;
  stdout?: string;
  stderr?: string;
}

export class KaggleService {
  // Configuration based on real-world testing
  private readonly MAX_RETRIES = 3; // Reliable recovery
  private readonly RETRY_DELAY_BASE = 2000; // 2s between retries
  private readonly DOWNLOAD_TIMEOUT = 300000; // 5m timeout

  constructor() {
    if (!config.kaggle.email || !config.kaggle.password) {
      throw new Error(
        "Kaggle credentials not configured. Please check your .env file."
      );
    }
  }

  private async checkPythonInstallation(): Promise<boolean> {
    try {
      await execAsync("python --version");
      return true;
    } catch (error) {
      try {
        await execAsync("python3 --version");
        return true;
      } catch {
        return false;
      }
    }
  }

  private async checkPipInstallation(): Promise<boolean> {
    try {
      await execAsync("pip --version");
      return true;
    } catch (error) {
      try {
        await execAsync("pip3 --version");
        return true;
      } catch {
        return false;
      }
    }
  }

  private async installPip(): Promise<void> {
    console.log("🔧 Installing pip...");
    try {
      // Use python's built-in ensurepip module
      await execAsync("python -m ensurepip --upgrade");
    } catch (error) {
      throw new Error("Failed to install pip. Please install pip manually.");
    }
  }

  private async installKaggleCLI(): Promise<void> {
    console.log("🔧 Installing Kaggle CLI...");
    try {
      await execAsync("pip install --user --upgrade kaggle");
    } catch (error) {
      throw new Error(
        "Failed to install Kaggle CLI. Please try installing it manually with: pip install --user kaggle"
      );
    }
  }

  private async setupKaggleCredentials(): Promise<void> {
    const homeDir = process.env.HOME || process.env.USERPROFILE;
    if (!homeDir) {
      throw new Error("Could not determine home directory");
    }

    const kaggleDir = path.join(homeDir, ".kaggle");
    const kaggleJson = path.join(kaggleDir, "kaggle.json");

    // Create .kaggle directory if it doesn't exist
    if (!fs.existsSync(kaggleDir)) {
      fs.mkdirSync(kaggleDir, { recursive: true });
    }

    // Create or update kaggle.json
    const credentials = {
      username: config.kaggle.email.split("@")[0],
      key: config.kaggle.password,
    };

    if (
      !fs.existsSync(kaggleJson) ||
      this.shouldUpdateCredentials(kaggleJson, credentials)
    ) {
      fs.writeFileSync(kaggleJson, JSON.stringify(credentials, null, 2));
      if (process.platform !== "win32") {
        fs.chmodSync(kaggleJson, 0o600);
      }
      console.log("✅ Kaggle credentials configured");
    }
  }

  private shouldUpdateCredentials(
    kaggleJson: string,
    newCredentials: any
  ): boolean {
    try {
      const existingCredentials = JSON.parse(
        fs.readFileSync(kaggleJson, "utf8")
      );
      return (
        existingCredentials.username !== newCredentials.username ||
        existingCredentials.key !== newCredentials.key
      );
    } catch {
      return true;
    }
  }

  private async ensureKaggleCliSetup(): Promise<void> {
    console.log("🔧 Setting up Kaggle environment...");

    // Check Python installation
    if (!(await this.checkPythonInstallation())) {
      throw new Error(
        "Python is not installed. Please install Python 3.6 or later."
      );
    }

    // Check and install pip if needed
    if (!(await this.checkPipInstallation())) {
      await this.installPip();
    }

    // Test Kaggle CLI
    try {
      await execAsync("kaggle --version");
    } catch (error) {
      await this.installKaggleCLI();
    }

    // Setup Kaggle credentials
    await this.setupKaggleCredentials();
  }

  private isRetryableError(error: KaggleError): boolean {
    const retryableErrors = [
      "ETIMEDOUT",
      "ECONNRESET",
      "ECONNREFUSED",
      "EPIPE",
      "Network Error",
      "Rate limit exceeded",
      "429",
      "500",
      "502",
      "503",
      "504",
    ];

    return retryableErrors.some((errType) => {
      const errorStr = typeof error.code === "string" ? error.code : "";
      return (
        error.message?.includes(errType) ||
        errorStr.includes(errType) ||
        error.stderr?.includes(errType) ||
        error.stdout?.includes(errType)
      );
    });
  }

  private async downloadWithRetry(retryCount = 0): Promise<string> {
    try {
      if (!fs.existsSync(config.app.downloadPath)) {
        fs.mkdirSync(config.app.downloadPath, { recursive: true });
      }

      const command = `"C:\\Users\\aviks\\AppData\\Roaming\\Python\\Python311\\Scripts\\kaggle.exe" datasets download -d thedevastator/us-baby-names-by-year-of-birth -p "${config.app.downloadPath}" --force`;

      console.log("📥 Executing Kaggle CLI command...");
      const { stdout, stderr } = await execAsync(command, {
        timeout: this.DOWNLOAD_TIMEOUT,
      });

      if (stderr) {
        console.warn("⚠️ Kaggle CLI warnings:", stderr);
      }

      if (stdout) {
        console.log("ℹ️ Kaggle CLI output:", stdout);
      }

      const zipPath = path.join(
        config.app.downloadPath,
        "us-baby-names-by-year-of-birth.zip"
      );

      if (!fs.existsSync(zipPath)) {
        throw new Error("Downloaded file not found at: " + zipPath);
      }

      // Verify file size
      const stats = fs.statSync(zipPath);
      if (stats.size === 0) {
        throw new Error("Downloaded file is empty");
      }

      console.log(`✅ Dataset downloaded to: ${zipPath}`);
      console.log(`📦 File size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);

      return zipPath;
    } catch (error) {
      const kaggleError = error as KaggleError;

      if (retryCount < this.MAX_RETRIES && this.isRetryableError(kaggleError)) {
        console.log(
          `⚠️ Download failed, retrying (${retryCount + 1}/${
            this.MAX_RETRIES
          })...`
        );
        // Exponential backoff
        await setTimeout(this.RETRY_DELAY_BASE * Math.pow(2, retryCount));
        return this.downloadWithRetry(retryCount + 1);
      }

      if (kaggleError instanceof Error) {
        console.error("❌ Dataset download failed:", kaggleError.message);
        if (kaggleError.message.includes("kaggle: command not found")) {
          console.error(
            'Please ensure Python and pip are installed, then run "pip install kaggle"'
          );
        }
      } else {
        console.error("❌ Dataset download failed with unknown error");
      }
      throw error;
    }
  }

  async downloadDataset(): Promise<string> {
    try {
      await this.ensureKaggleCliSetup();
      return await this.downloadWithRetry();
    } catch (error) {
      console.error(
        "❌ Dataset download failed:",
        error instanceof Error ? error.message : error
      );
      throw error;
    }
  }

  async close(): Promise<void> {
    // No cleanup needed, but keeping method for interface consistency
  }
}
