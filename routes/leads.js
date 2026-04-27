const express = require('express');
const router = express.Router();
const { scrapeLeads } = require('../services/scraper');
const { processLeads } = require('../services/dataProcessor');
const { enrichLeads } = require('../services/ai');
const { validateLeadSearch } = require('../middleware/validate');
const { saveLeads, getAllLeads, getLeadById, deleteLeadById, getCachedLeads } = require('../store/leadStore');
const { runAutoScrape, AUTO_SEARCH_JOBS } = require('../services/automation');

// POST /api/leads/search
router.post('/search', validateLeadSearch, async (req, res) => {
  try {
    const { productName, businessType, location } = req.body;

    // Step 1: Check cache
    const cached = await getCachedLeads(productName, location);
    if (cached) {
      console.log(`[Cache] Returning ${cached.length} cached leads`);
      return res.json({
        success: true,
        source: 'cache',
        total: cached.length,
        breakdown: {
          high: cached.filter(l => l.quality === 'high').length,
          medium: cached.filter(l => l.quality === 'medium').length,
          low: cached.filter(l => l.quality === 'low').length,
        },
        leads: cached
      });
    }

    // Step 2: Scrape
    const rawLeads = await scrapeLeads(productName, businessType, location);

    // Step 3: Clean + deduplicate
    const cleaned = processLeads(rawLeads, { productName, businessType, location });

    // Step 4: AI scoring with Groq (fallback built in)
    const scored = await enrichLeads(cleaned, productName, businessType);

    // Step 5: Save to MongoDB
    const saved = await saveLeads(scored);
    const leadsArr = Array.from(saved);

    res.json({
      success: true,
      source: 'fresh',
      total: leadsArr.length,
      breakdown: {
        high: leadsArr.filter(l => l.quality === 'high').length,
        medium: leadsArr.filter(l => l.quality === 'medium').length,
        low: leadsArr.filter(l => l.quality === 'low').length,
      },
      leads: leadsArr
    });

  } catch (err) {
    console.error('Search error:', err);
    res.status(500).json({ success: false, code: 'SCRAPE_FAILED', error: err.message });
  }
});

// GET /api/leads
router.get('/', async (req, res) => {
  try {
    const leads = await getAllLeads();
    res.json({ success: true, total: leads.length, leads });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/leads/:id
router.get('/:id', async (req, res) => {
  try {
    const lead = await getLeadById(req.params.id);
    if (!lead) {
      return res.status(404).json({ success: false, code: 'LEAD_NOT_FOUND', error: `No lead found with id ${req.params.id}` });
    }
    res.json({ success: true, lead });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/leads/:id
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await deleteLeadById(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, code: 'LEAD_NOT_FOUND', error: `No lead found with id ${req.params.id}` });
    }
    res.json({ success: true, message: `Lead ${req.params.id} deleted` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/leads/auto — manually trigger automation
router.post('/auto', async (req, res) => {
  try {
    console.log('[Automation] Manual trigger via API');
    for (const job of AUTO_SEARCH_JOBS) {
      runAutoScrape(job); // fire and forget
    }
    res.json({ success: true, message: `Auto-scrape triggered for ${AUTO_SEARCH_JOBS.length} jobs` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;