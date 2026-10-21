
let store = global.__INCIDENTS__ || [];
global.__INCIDENTS__ = store;

export default function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  if (req.method === "POST") {
    const { incident } = req.body || {};
    if (incident) {
      store.unshift(incident);
    }
    return res.status(200).json({ success: true, incidents: store });
  }

  return res.status(200).json({ success: true, incidents: store });
}
