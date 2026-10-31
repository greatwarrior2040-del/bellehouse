export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "Service en cours d'activation" });
  }
  const { messages } = req.body || {};
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'Messages manquants' });
  }
  const clean = messages.slice(-12).map((m) => ({
    role: m.role === 'assistant' ? 'assistant' : 'user',
    content: String(m.content || '').slice(0, 2000),
  }));

  const SYSTEM =
    "Tu es l'assistant virtuel de Belle House Niger, entreprise de BTP basée à Koubia, Niamey (Niger). " +
    "Ses quatre métiers : BTP et gros œuvre, architecture, immobilier (terrains vérifiés, villas, accompagnement investisseur), construction métallique (charpentes, hangars). " +
    "Téléphone : +227 92 08 50 50. Un seul interlocuteur, de l'étude à la remise des clés. " +
    "Réponds en français, de façon concise et utile. Ne jamais inventer de prix, de délais précis, de références de projets ou de coordonnées. " +
    "Pour un devis ou un projet concret, oriente vers la page contact du site. Si tu ne sais pas, dis-le honnêtement.";

  try {
    const r = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.XAI_MODEL || 'grok-3-mini',
        max_tokens: 600,
        temperature: 0.7,
        messages: [{ role: 'system', content: SYSTEM }, ...clean],
      }),
    });
    if (!r.ok) {
      return res.status(502).json({ error: 'Service momentanément indisponible' });
    }
    const data = await r.json();
    const reply =
      data.choices && data.choices[0] && data.choices[0].message
        ? data.choices[0].message.content
        : '';
    return res.status(200).json({ reply: reply || "Je n'ai pas pu répondre, réessayez." });
  } catch (e) {
    return res.status(502).json({ error: 'Service momentanément indisponible' });
  }
}
