import fs from "fs";
import path from "path";

const FILE_PATH = path.join("/tmp", "incidents.json");

function readData() {
try {
if (fs.existsSync(FILE_PATH)) {
  return JSON.parse(fs.readFileSync(FILE_PATH, "utf8"));
}
} catch (e) {}
return [];
}

function writeData(data) {
try {
fs.writeFileSync(FILE_PATH, JSON.stringify(data), "utf8");
} catch (e) {}
}

export default function handler(req, res) {
res.setHeader("Access-Control-Allow-Origin", "*");
res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
res.setHeader("Access-Control-Allow-Headers", "Content-Type");

if (req.method === "OPTIONS") return res.status(200).end();

let incidents = readData();

if (req.method === "POST") {
const { incident } = req.body || {};
if (incident) {
  const exists = incidents.find(i => i.incidentId === incident.incidentId);
  if (!exists) {
    incidents.unshift(incident);
  } else {
    incidents = incidents.map(i => i.incidentId === incident.incidentId ? incident : i);
  }
  writeData(incidents);
}
return res.status(200).json({ success: true, incidents });
}

return res.status(200).json({ success: true, incidents });
}