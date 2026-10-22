import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv();
const HASH_KEY = "incidents";
const COUNTER_KEY = "incidents:counter";

const parse = (v) => (typeof v === "string" ? JSON.parse(v) : v);

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Cache-Control", "no-store, max-age=0");

  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    if (req.method === "GET") {
      const all = (await redis.hgetall(HASH_KEY)) || {};
      const incidents = Object.values(all)
        .map(parse)
        .sort((a, b) => new Date(b.timestamp || b.createdAt) - new Date(a.timestamp || a.createdAt));
      return res.status(200).json({ success: true, incidents });
    }

    if (req.method === "POST") {
      const body = req.body || {};
      const incidentData = body.incident || body;

      const n = await redis.incr(COUNTER_KEY);
      const generatedId = "INC-" + String(n).padStart(3, "0");

      const incident = {
        ...incidentData,
        incidentId: incidentData.incidentId || generatedId,
        id: incidentData.id || generatedId,
        status: incidentData.status || "PENDIENTE",
        timestamp: incidentData.timestamp || new Date().toISOString()
      };

      await redis.hset(HASH_KEY, { [incident.incidentId]: JSON.stringify(incident) });
      return res.status(201).json({ success: true, incident, incidents: [incident] });
    }

    return res.status(405).json({ error: "Método no permitido" });
  } catch (err) {
    console.error("sync error:", err);
    return res.status(500).json({ error: "Error interno en Redis" });
  }
}
