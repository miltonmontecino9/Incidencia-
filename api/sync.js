import { redis, getIp, hitLimit, checkPin, readPin, parseBody } from './_lib/shared.js';

const INC = 'incidents';
const PHOTOS = 'incident_photos';
const COUNTER = 'incidents:counter';
const STAFF_KEY = 'staff_list';

const NON_EDITABLE = [
  'incidentId', 'createdAt', 'timestamp', 'updatedAt',
  'hasPhoto', 'evidencePhoto', 'reporterName', 'reporterEmail'
];

const MAX_JSON_CHARS = 100_000;

const parse = (v) => {
  if (typeof v !== 'string') return v;
  try { return JSON.parse(v); } catch { return v; }
};

const MASK_NAME = 'Reservado (coordinación)';
const toPublic = (i) => ({ ...i, reporterName: MASK_NAME, reporterEmail: '' });

function nowAR() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Argentina/Buenos_Aires',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(new Date());
  const p = Object.fromEntries(parts.map((x) => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute}`;
}

function readIncident(req) {
  const b = parseBody(req);
  return b.incident && typeof b.incident === 'object' ? b.incident : b;
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  const { id, photo, health, staff } = req.query || {};

  try {
    if (req.method === 'GET' && health) {
      return res.status(200).json({ ok: true });
    }

    if (req.method === 'GET') {
      const pin = readPin(req);
      let authed = false;
      if (pin) {
        const auth = await checkPin(req, pin);
        if (!auth.ok) return res.status(auth.status).json({ error: auth.error });
        authed = true;
      }

      if (photo) {
        if (!authed) return res.status(401).json({ error: 'PIN requerido' });
        if (!id) return res.status(400).json({ error: 'Falta id' });
        const p = await redis.hget(PHOTOS, String(id));
        return res.status(200).json({ evidencePhoto: p || null });
      }

      const all = (await redis.hgetall(INC)) || {};
      const list = Object.values(all)
        .map(parse)
        .filter((i) => i && typeof i === 'object')
        .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));

      const payload = { incidents: authed ? list : list.map(toPublic) };
      if (authed && staff) {
        const s = parse(await redis.get(STAFF_KEY));
        payload.staff = Array.isArray(s) ? s : [];
      }
      return res.status(200).json(payload);
    }

    if (req.method === 'POST') {
      if (await hitLimit(`post:${getIp(req)}`, 20, 600)) {
        return res.status(429).json({ error: 'Demasiados reportes seguidos.' });
      }

      const data = readIncident(req);
      const rawPhoto = data.evidencePhoto;
      delete data.evidencePhoto;

      const n = await redis.incr(COUNTER);
      const incidentId = `INC-${String(n).padStart(3, '0')}`;

      const incident = {
        ...data,
        incidentId,
        timestamp: nowAR(),
        createdAt: new Date().toISOString(),
        status: 'Pendiente',
        assignedTo: '',
        resolutionNotes: '',
        progressComments: [],
        hasPhoto: Boolean(rawPhoto),
      };

      const pipe = redis.pipeline();
      pipe.hset(INC, { [incidentId]: incident });
      if (rawPhoto) pipe.hset(PHOTOS, { [incidentId]: rawPhoto });
      await pipe.exec();

      return res.status(201).json({ incident });
    }

    if (['PUT', 'PATCH', 'DELETE'].includes(req.method)) {
      const auth = await checkPin(req, readPin(req));
      if (!auth.ok) return res.status(auth.status).json({ error: auth.error });

      if (staff && req.method === 'PUT') {
        const b = parseBody(req);
        const list = Array.isArray(b.staff) ? b.staff : null;
        if (!list || list.length > 200) return res.status(400).json({ error: 'Lista inválida' });
        await redis.set(STAFF_KEY, list);
        return res.status(200).json({ staff: list });
      }

      if (!id) return res.status(400).json({ error: 'Falta id' });
      const key = String(id);

      if (req.method === 'DELETE') {
        const pipe = redis.pipeline();
        pipe.hdel(INC, key);
        pipe.hdel(PHOTOS, key);
        await pipe.exec();
        return res.status(200).json({ ok: true });
      }

      const current = parse(await redis.hget(INC, key));
      if (!current || typeof current !== 'object') {
        return res.status(404).json({ error: 'La incidencia no existe' });
      }

      const changes = {};
      for (const [k, v] of Object.entries(readIncident(req))) {
        if (v === undefined || NON_EDITABLE.includes(k) || k.startsWith('_')) continue;
        changes[k] = v;
      }

      const updated = {
        ...current,
        ...changes,
        incidentId: key,
        updatedAt: new Date().toISOString(),
      };

      await redis.hset(INC, { [key]: updated });
      return res.status(200).json({ incident: updated });
    }

    return res.status(405).json({ error: 'Método no permitido' });
  } catch (err) {
    console.error('sync error:', err);
    return res.status(500).json({ error: 'Error interno' });
  }
}
