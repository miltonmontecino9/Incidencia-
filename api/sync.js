
let globalIncidents = [];

export default function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  if (req.method === "POST") {
    const { action, incident } = req.body || {};
    if (incident) {
      const exists = globalIncidents.find(i => i.incidentId === incident.incidentId);
      if (!exists) {
        globalIncidents.unshift(incident);
      } else {
        globalIncidents = globalIncidents.map(i => i.incidentId === incident.incidentId ? incident : i);
      }
    }
    return res.status(200).json({ success: true, incidents: globalIncidents });
  }

  return res.status(200).json({ success: true, incidents: globalIncidents });
}
