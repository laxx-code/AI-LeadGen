const puppeteer = require('puppeteer');

async function scrapeLeads(productName, businessType, location) {

  // Use Puppeteer's own bundled Chrome on Render, local Chrome on Windows/Mac
  const isLocal = process.platform === 'win32' || process.platform === 'darwin';

  const launchOptions = {
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--disable-blink-features=AutomationControlled',
    ],
    ignoreDefaultArgs: ['--enable-automation']
  };

  // Only set executablePath locally — let Puppeteer find its own Chrome on Render
  if (isLocal) {
    launchOptions.executablePath = process.platform === 'win32'
      ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
      : '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
    launchOptions.headless = false; // keep visible locally
  }

  const browser = await puppeteer.launch(launchOptions);
  const page = await browser.newPage();

  await page.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
  );

  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
  });

  const query = [productName || '', businessType || '', 'near', location].join(' ').trim();
  console.log('Searching:', query);

  try {
    await page.goto('https://www.google.com/maps/search/' + encodeURIComponent(query), {
      waitUntil: 'networkidle2',
      timeout: 60000
    });
  } catch (e) {
    console.log('Navigation warning:', e.message);
  }

  await new Promise(r => setTimeout(r, 6000));

  const results = [];

  for (let i = 0; i < 5; i++) {
    try {
      const items = await page.$$('div[role="article"]');
      if (!items[i]) continue;

      await items[i].click();
      await new Promise(r => setTimeout(r, 4000));

      const data = await page.evaluate(() => {
        const name = document.querySelector('h1')?.innerText || null;
        const address =
          document.querySelector('[data-item-id="address"]')?.innerText ||
          document.querySelector('button[data-item-id="address"]')?.innerText || null;
        const phone =
          document.querySelector('[data-item-id*="phone"]')?.innerText ||
          document.querySelector('button[data-item-id*="phone"]')?.innerText || null;
        return { name, address, phone };
      });

      if (data.name && data.address) {
        results.push({
          name: data.name,
          location: data.address,
          phone: data.phone || 'Not Available'
        });
      }

      await page.goBack();
      await new Promise(r => setTimeout(r, 4000));

    } catch (err) {
      console.log('Scrape error on item', i, ':', err.message);
    }
  }

  await browser.close();
  console.log('FINAL LEADS:', JSON.stringify(results, null, 2));
  return results;
}

module.exports = { scrapeLeads };