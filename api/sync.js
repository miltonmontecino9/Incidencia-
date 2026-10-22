
let centralStore = global.__CENTRAL_STORE__ || [];
global.__CENTRAL_STORE__ = centralStore;

export default function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  if (req.method === "POST") {
    const { incident } = req.body || {};
    if (incident) {
      const idx = centralStore.findIndex(i => i.incidentId === incident.incidentId);
      if (idx >= 0) centralStore[idx] = incident;
      else centralStore.unshift(incident);
    }
    return res.status(200).json({ success: true, incidents: centralStore });
  }

  return res.status(200).json({ success: true, incidents: centralStore });
}
