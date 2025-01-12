import { test, expect } from 'playwright/test';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';

let server;

test.beforeAll(async () => {
  // Start the server
  server = spawn('npm', ['run', 'start'], { stdio: 'inherit', shell: true });

  // Wait for the server to be up
  await new Promise((resolve) => setTimeout(resolve, 5000)); // Adjust timeout if needed
});

test.afterAll(async () => {
  // Stop the server
  if (server) {
    server.kill();
  }
});


// Helper to recursively find all index.html files
const findIndexFiles = (startPath) => {
  const files = [];
  const entries = fs.readdirSync(startPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(startPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...findIndexFiles(fullPath));
    } else if (entry.name === 'index.html') {
      files.push(fullPath);
    }
  }
  return files;
};

test.describe('Resource Loading Tests', () => {
  const baseUrl = 'http://localhost:8080'; // Replace with your local dev server or deployed URL
  const siteRoot = './dist'; // Adjust this to the root folder of your built site

  const indexFiles = findIndexFiles(siteRoot);

  for (const file of indexFiles) {
    const relativePath = path.relative(siteRoot, file);
    const url = `${baseUrl}/${relativePath.replace(/\\/g, '/')}`;

    test(`should load all resources for ${relativePath}`, async ({ page }) => {
      // Intercept requests to monitor for failures
      const failedRequests = [];
      page.on('requestfailed', (request) => {
        failedRequests.push({
          url: request.url(),
          error: request.failure()?.errorText,
        });
      });

      await page.goto(url);

      // Ensure the page loads successfully
      const status = await page.evaluate(() => document.readyState);
      expect(status).toBe('complete');

      // Verify no failed requests
      expect(failedRequests).toHaveLength(0);
    });
  }
});
