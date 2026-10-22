import fs from "fs";
import path from "path";

const FILE_PATH = path.join("/tmp", "incidents.json");

function readIncidents() {
try {
if (fs.existsSync(FILE_PATH)) {
  const data = fs.readFileSync(FILE_PATH, "utf8");
  return JSON.parse(data);
}
} catch (e) {}
return [];
}

function saveIncidents(incidents) {
try {
fs.writeFileSync(FILE_PATH, JSON.stringify(incidents), "utf8");
} catch (e) {}
}

export default function handler(req, res) {
res.setHeader("Access-Control-Allow-Origin", "*");
res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
res.setHeader("Access-Control-Allow-Headers", "Content-Type");

if (req.method === "OPTIONS") return res.status(200).end();

let incidents = readIncidents();

if (req.method === "POST") {
const { incident } = req.body || {};
if (incident) {
  const idx = incidents.findIndex(i => i.incidentId === incident.incidentId);
  if (idx >= 0) {
    incidents[idx] = incident;
  } else {
    incidents.unshift(incident);
  }
  saveIncidents(incidents);
}
return res.status(200).json({ success: true, incidents });
}

return res.status(200).json({ success: true, incidents });
}