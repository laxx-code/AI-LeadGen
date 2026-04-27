const Groq = require('groq-sdk');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });


async function enrichLeads(leads, productName, businessType) {
  if (!leads || leads.length === 0) return [];

  const prompt = `You are a B2B sales expert. Score these business leads for selling "${productName}" to ${businessType}s in India.

For each lead return a JSON array with these exact fields:
- name: same as input
- score: "A" (hot), "B" (warm), or "C" (cold)
- reason: one line explaining the score (max 10 words)
- suggestedEmail: a guessed business email based on name (e.g. info@businessname.com)

Leads to score:
${JSON.stringify(leads.map(l => ({ name: l.name, location: l.location, phone: l.phone })), null, 2)}

Return ONLY a valid JSON array. No explanation. No markdown. No extra text.`;

  try {
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 1000
    });

    const text = completion.choices[0]?.message?.content || '[]';

    const clean = text.replace(/```json|```/g, '').trim();
    const scored = JSON.parse(clean);

    return leads.map((lead, i) => ({
      ...lead,
      score: scored[i]?.score || fallbackScore(lead.quality),
      reason: scored[i]?.reason || 'Scored by data quality',
      email: scored[i]?.suggestedEmail || null
    }));

  } catch (err) {
    console.warn('[AI] Groq scoring failed:', err.message);
    return leads.map(lead => ({
      ...lead,
      score: fallbackScore(lead.quality),
      reason: 'Scored by data quality',
      email: null
    }));
  }
}

function fallbackScore(quality) {
  if (quality === 'high') return 'A';
  if (quality === 'medium') return 'B';
  return 'C';
}

module.exports = { enrichLeads };