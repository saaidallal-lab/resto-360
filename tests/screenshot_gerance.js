import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage();

  try {
    await page.goto('http://localhost:5173');

    await page.fill('input[placeholder="Code postal (ex: 75011)"]', '75011');
    await page.fill('input[placeholder="Ville (ex: Paris)"]', 'Paris');
    await page.click('text="Rechercher"');

    await page.waitForSelector('text="Locations-Gérances"', { timeout: 15000 });
    await page.click('text="Locations-Gérances"');

    // Wait for network payload to load UI
    await page.waitForTimeout(4000);

    await page.screenshot({ path: '/Users/saaidallal/Datagouv/resto-360/gerance_screenshot.png', fullPage: true });
    console.log('✅ Screenshot saved to gerance_screenshot.png');
  } catch (err) {
    console.error('Test failed:', err);
  } finally {
    await browser.close();
  }
})();
