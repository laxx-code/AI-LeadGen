const cron = require('node-cron');
const { scrapeLeads } = require('./scraper');
const { processLeads } = require('./dataProcessor');
const { enrichLeads } = require('./ai');
const { saveLeads, getCachedLeads } = require('../store/leadStore');

const AUTO_SEARCH_JOBS = [
  { productName: 'TDS Meter', businessType: 'retailer', location: 'Pune' },
  { productName: 'water purifier', businessType: 'dealer', location: 'Pune' },
  { productName: 'solar panel', businessType: 'distributor', location: 'Pune' },
];

async function runAutoScrape(job) {
  const { productName, businessType, location } = job;
  console.log(`[Automation] Running auto-scrape: "${productName}" in "${location}"`);

  try {
    const cached = await getCachedLeads(productName, location);
    if (cached) {
      console.log(`[Automation] Skipping — cached results exist for "${productName}"`);
      return;
    }
    const rawLeads = await scrapeLeads(productName, businessType, location);
    const cleaned = processLeads(rawLeads, { productName, businessType, location });
    const scored = await enrichLeads(cleaned, productName, businessType);
    const saved = await saveLeads(scored);

    console.log(`[Automation]  Saved ${saved.length} leads for "${productName}" in "${location}"`);

  } catch (err) {
    console.error(`[Automation]  Failed for "${productName}":`, err.message);
  }
}


function startAutomation() {
  console.log('[Automation]  Scheduler started — runs daily at 2:00 AM');

  cron.schedule('0 2 * * *', async () => {
    console.log('[Automation]  Daily scrape triggered');
    for (const job of AUTO_SEARCH_JOBS) {
      await runAutoScrape(job);
    }
  });
}

module.exports = { startAutomation, runAutoScrape, AUTO_SEARCH_JOBS };