const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage();
  
  // Assuming the dev server is running on 5173
  try {
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle', timeout: 8000 });
  } catch (e) {
    console.log("Could not load local server. Make sure `npm run dev` is running.");
    await browser.close();
    process.exit(1);
  }

  // Type in Paris and submit
  await page.fill('input[placeholder="Code postal (ex: 75011)"]', '75011');
  await page.click('button[type="submit"]');

  // Wait for Dashboard to load
  await page.waitForSelector('h1:has-text("Analyse marché 75011")', { timeout: 15000 });
  
  // Click Paris Movement Map tab
  await page.click('button:has-text("Paris Movement Map")');
  
  // Wait for the map and markers to load
  await page.waitForSelector('.leaflet-marker-icon', { timeout: 30000 });
  
  // Click the first marker to open the popup
  await page.click('.leaflet-marker-icon:first-child');
  
  // Wait for popup to render
  await page.waitForSelector('.leaflet-popup-content');
  
  // Take screenshot
  await page.screenshot({ path: '/tmp/ui_map_flash.png', fullPage: true });

  console.log("Screenshot saved to /tmp/ui_map_flash.png");
  await browser.close();
})();
