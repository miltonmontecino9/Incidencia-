
let cache = global.__SHARED_CACHE__ || [];
global.__SHARED_CACHE__ = cache;

export default function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  if (req.method === "POST") {
    const { incident } = req.body || {};
    if (incident) {
      const idx = cache.findIndex(i => i.incidentId === incident.incidentId);
      if (idx >= 0) cache[idx] = incident;
      else cache.unshift(incident);
    }
    return res.status(200).json({ success: true, incidents: cache });
  }

  return res.status(200).json({ success: true, incidents: cache });
}
