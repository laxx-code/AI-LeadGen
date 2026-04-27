
function normalizePhone(phone) {
  if (!phone || phone === "Not Available") return null;

  let digits = phone.replace(/\D/g, ""); // remove all non-numeric

  // Remove leading 0 (STD code prefix)
  if (digits.startsWith("0")) digits = digits.slice(1);  

  // Remove country code 91
  if (digits.startsWith("91") && digits.length === 12) digits = digits.slice(2);

  if (digits.length === 10) return `+91${digits}`;

  return null;
}

function cleanText(text) {
  if (!text) return null;
  return text
    .trim()
    .replace(/\n/g, " ")  
    .replace(/\s+/g, " ")         
    .replace(/[^\w\s,.\-()]/g, "")  
    .trim();
}


function getLeadQuality(lead) {
  let score = 0;
  if (lead.name) score++;
  if (lead.location) score++;
  if (lead.phone) score++;

  if (score === 3) return "high";
  if (score === 2) return "medium";
  return "low";
}


function deduplicate(leads) {
  const seenPhones = new Set();
  const seenNames = new Set();

  return leads.filter((lead) => {
    if (lead.phone) {
      if (seenPhones.has(lead.phone)) return false;
      seenPhones.add(lead.phone);
    }

    const nameKey = lead.name?.toLowerCase();
    if (nameKey) {
      if (seenNames.has(nameKey)) return false;
      seenNames.add(nameKey);
    }

    return true;
  });
}


function processLeads(rawLeads, meta = {}) {
  if (!Array.isArray(rawLeads) || rawLeads.length === 0) return [];

  const processed = rawLeads.map((lead) => {
    const name = cleanText(lead.name);
    const location = cleanText(lead.location);
    const phone = normalizePhone(lead.phone);

    const cleaned = {
      name,
      location,
      phone,
      quality: null,
      source: "Google Maps",
      keyword: meta.productName || null,
      businessType: meta.businessType || null,
      city: meta.location || null,
      scrapedAt: new Date().toISOString(),
    };

    cleaned.quality = getLeadQuality(cleaned);
    return cleaned;
  });

  const valid = processed.filter((lead) => lead.name && lead.location);

  const unique = deduplicate(valid);

  const order = { high: 0, medium: 1, low: 2 };
  unique.sort((a, b) => order[a.quality] - order[b.quality]);

  console.log(`[DataProcessor] Raw: ${rawLeads.length} → Valid: ${valid.length} → After Dedup: ${unique.length}`);

  return unique;
}

module.exports = { processLeads };
