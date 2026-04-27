const Lead = require('../models/Lead');

async function saveLeads(leadsArray) {
  if (!leadsArray || leadsArray.length === 0) return [];
  const saved = await Lead.insertMany(leadsArray);
  return saved;
}

async function getAllLeads() {
  return await Lead.find().sort({ scrapedAt: -1 });
}

async function getLeadById(id) {
  try {
    return await Lead.findById(id);
  } catch { return null; }
}

async function deleteLeadById(id) {
  try {
    const result = await Lead.findByIdAndDelete(id);
    return result !== null;
  } catch { return false; }
}

async function getCachedLeads(keyword, city) {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const leads = await Lead.find({
    keyword: keyword?.toLowerCase(),
    city: city?.toLowerCase(),
    scrapedAt: { $gte: since }
  }).sort({ scrapedAt: -1 });
  return leads.length > 0 ? leads : null;
}

module.exports = { saveLeads, getAllLeads, getLeadById, deleteLeadById, getCachedLeads };