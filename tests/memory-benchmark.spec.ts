// @ts-nocheck
import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

const USER_CREDENTIALS = {
	username: process.env.USERNAME,
	password: process.env.PASSWORD,
};
const TARGET_URL = `${process.env.BASE_URL}/login`;
const SUCCESS_TEXT = 'Files uploaded successfully';

const SEARCH_TERM = 'uni';
const TARGET_RECEIVER = 'universal_receiver';

// Setup CSV Logging
const CSV_PATH = path.join(process.cwd(), 'benchmark-results.csv');
if (!fs.existsSync(CSV_PATH)) {
	fs.writeFileSync(CSV_PATH, 'FileSize_MB,PeakMemory_MB,EncryptDelay_sec,TotalTime_sec\n');
}

test.describe.serial('Memory Benchmark: Upload Comparison', () => {
	const fileSizes = [50, 200, 500, 1000, 1500, 2000, 2500, 3000]; // Sizes in MB

	for (const size of fileSizes) {
		test(`Measure Memory for ${size}MB Upload (Verified Mode)`, async ({ page }) => {
			test.setTimeout(600000);

			// Connect to Chrome DevTools to get memory metrics
			const client = await page.context().newCDPSession(page);
			await client.send('HeapProfiler.enable');

			// Navigation & Login Flow
			console.log(`Navigating to login...`);
			await page.goto(TARGET_URL);

			await page.getByPlaceholder('Enter Your Username').fill(USER_CREDENTIALS.username);
			await page.getByPlaceholder('Enter Your Password').fill(USER_CREDENTIALS.password);
			await page.getByRole('button', { name: 'Login' }).click();

			await expect(page).toHaveURL(/.*dashboard/);

			// Navigate to Send Files
			console.log('Navigating to Send Files...');
			await page.getByRole('link', { name: 'Go to send file page' }).click();

			// Select Verified Mode
			console.log('Selecting Verified Mode...');
			// Target the specific clickable card.
			await page.locator('div.cursor-pointer').filter({ hasText: 'Verified' }).click();

			// Create a dummy file on the actual Hard Drive (in chunks to bypass Node limits)
			console.log(`Generating ${size}MB dummy file on disk...`);
			const tempFilePath = path.join(os.tmpdir(), `test-${size}mb.dat`);
			const fd = fs.openSync(tempFilePath, 'w');

			// Write the file in 50MB chunks
			const chunkMB = 50;
			const chunk = Buffer.alloc(chunkMB * 1024 * 1024);
			for (let i = 0; i < size; i += chunkMB) {
				const bytesToWrite = Math.min(chunkMB, size - i) * 1024 * 1024;
				fs.writeSync(
					fd,
					bytesToWrite === chunk.length ? chunk : Buffer.alloc(bytesToWrite)
				);
			}
			fs.closeSync(fd);

			// Attach File using the file path instead of the buffer
			await page.setInputFiles('input[type="file"]', tempFilePath);

			// Search and Add Recipient (From your codegen!)
			console.log(`Searching for recipient: ${TARGET_RECEIVER}...`);
			await page
				.getByRole('textbox', { name: /Search recipient by username/i })
				.fill(SEARCH_TERM);
			await page.getByRole('button', { name: TARGET_RECEIVER }).click();

			// Setup Memory Tracking
			let maxMemory = 0;
			const trackMemory = async () => {
				try {
					const memory = await page.evaluate(
						() => (performance as any).memory.usedJSHeapSize
					);
					if (memory > maxMemory) maxMemory = memory;
				} catch (e) {
					// Ignore errors if context is destroyed
				}
			};

			// Start memory tracking loop right before we click upload
			const interval = setInterval(trackMemory, 100);

			// Trigger the Upload and Measure TTFB
			console.log('Starting upload...');

			// Tell Playwright to watch the network for the specific PUT request to Cloudflare R2
			const r2UploadRequestPromise = page.waitForRequest(
				(request) => request.method() === 'PUT'
			);

			// Start the stopwatch exactly before clicking the button
			const startTime = Date.now();
			await page.getByRole('button', { name: 'Upload Files' }).click();

			// Wait for the PUT request to actually fire and record the time
			await r2UploadRequestPromise;
			const ttfbTime = Date.now() - startTime;
			console.log(
				`⏱️ Time to First Byte (Encryption Delay): ${(ttfbTime / 1000).toFixed(2)} seconds`
			);

			// Wait for upload to finish completely
			await expect(
				page.getByRole('heading', { name: 'Files Uploaded Successfully!' })
			).toBeVisible({ timeout: 600000 });

			// Record the total time the moment the success screen appears
			const totalTime = Date.now() - startTime;

			// Clean up and log results
			clearInterval(interval);
			fs.unlinkSync(tempFilePath);

			const peakMemMB = (maxMemory / 1024 / 1024).toFixed(2);
			const ttfbSec = (ttfbTime / 1000).toFixed(2);
			const totalSec = (totalTime / 1000).toFixed(2);

			const csvLine = `${size},${peakMemMB},${ttfbSec},${totalSec}\n`;
			fs.appendFileSync(CSV_PATH, csvLine);

			console.log(`✅ SUCCESS! Data saved to benchmark-results.csv`);
			console.log(
				`For ${size}MB UPLOAD: PEAK MEM: ${peakMemMB} MB | DELAY: ${ttfbSec}s | TOTAL: ${totalSec}s`
			);
		});
	}
});
