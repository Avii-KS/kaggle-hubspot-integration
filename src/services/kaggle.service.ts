import { chromium, Browser, Page } from "playwright";
import * as fs from "fs";
import * as path from "path";
import { config } from "../config/environment.config";

export class KaggleService {
  private browser: Browser | null = null;
  private page: Page | null = null;

  async initialize(): Promise<void> {
    console.log("🎭 Initializing Playwright browser...");

    this.browser = await chromium.launch({
      headless: true, // Set to false to see browser during development
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const context = await this.browser.newContext({
      acceptDownloads: true,
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    });

    this.page = await context.newPage();
    console.log("✅ Browser initialized");
  }

  async login(): Promise<void> {
    if (!this.page) throw new Error("Browser not initialized");

    console.log("🔐 Logging into Kaggle...");

    try {
      // Navigate to Kaggle login page
      await this.page.goto("https://www.kaggle.com/account/login", {
        waitUntil: "networkidle",
        timeout: 30000,
      });

      // Fill email
      await this.page.fill('input[type="email"]', config.kaggle.email);
      await this.page.click('button:has-text("Continue")');

      // Wait for password field
      await this.page.waitForSelector('input[type="password"]', {
        timeout: 5000,
      });

      // Fill password
      await this.page.fill('input[type="password"]', config.kaggle.password);

      // Click sign in
      await this.page.click('button[type="submit"]');

      // Wait for navigation after login
      await this.page.waitForNavigation({
        waitUntil: "networkidle",
        timeout: 30000,
      });

      console.log("✅ Successfully logged into Kaggle");
    } catch (error) {
      console.error("❌ Kaggle login failed:", error);
      throw error;
    }
  }

  async downloadDataset(): Promise<string> {
    if (!this.page) throw new Error("Browser not initialized");

    console.log("📥 Navigating to dataset page...");

    try {
      // Navigate to dataset
      await this.page.goto(config.kaggle.datasetUrl, {
        waitUntil: "networkidle",
        timeout: 30000,
      });

      console.log("⏳ Waiting for download button...");

      // Wait for and click download button
      const downloadPromise = this.page.waitForEvent("download");
      await this.page.click(
        'button:has-text("Download"), a:has-text("Download")'
      );

      const download = await downloadPromise;

      // Save file
      const fileName = download.suggestedFilename();
      const filePath = path.join(config.app.downloadPath, fileName);

      await download.saveAs(filePath);

      console.log(`✅ Dataset downloaded to: ${filePath}`);
      return filePath;
    } catch (error) {
      console.error("❌ Dataset download failed:", error);
      throw error;
    }
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      console.log("🔒 Browser closed");
    }
  }
}
