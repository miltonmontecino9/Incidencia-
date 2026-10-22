import { redis, getIp, hitLimit, checkPin, readPin, parseBody } from './_lib/shared.js';
import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

const INC = 'incidents';
const PHOTOS = 'incident_photos';
const COUNTER = 'incidents:counter';
const STAFF_KEY = 'staff_list';
const COORD_EMAILS_KEY = 'coordinator_emails_list';

const NON_EDITABLE = [
  'incidentId', 'createdAt', 'timestamp', 'updatedAt',
  'hasPhoto', 'evidencePhoto', 'reporterName', 'reporterEmail'
];

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

async function sendCoordinatorEmail(incident) {
  try {
    let recipientList = [];
    const storedList = await redis.get(COORD_EMAILS_KEY);
    if (Array.isArray(storedList) && storedList.length > 0) {
      recipientList = storedList;
    } else if (process.env.COORDINATOR_EMAILS) {
      recipientList = process.env.COORDINATOR_EMAILS.split(',').map((e) => e.trim());
    }

    if (recipientList.length === 0) return;

    const urgencyColor = incident.urgency === 'Alta' ? '#dc2626' : incident.urgency === 'Media' ? '#d97706' : '#2563eb';

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
        <div style="background-color: #0f172a; padding: 20px; text-align: center; color: white;">
          <h2 style="margin: 0; font-size: 20px;">🏛️ Museo Patagónico</h2>
          <p style="margin: 5px 0 0 0; color: #94a3b8; font-size: 14px;">Nueva Incidencia Registrada [${incident.incidentId}]</p>
        </div>
        <div style="padding: 24px; background-color: #ffffff; color: #334155;">
          <div style="display: inline-block; padding: 6px 12px; background-color: ${urgencyColor}; color: white; font-weight: bold; font-size: 12px; border-radius: 6px; margin-bottom: 16px;">
            Urgencia: ${incident.urgency || 'Media'}
          </div>
          <p style="font-size: 16px; font-weight: bold; margin: 0 0 10px 0;">Sector: ${incident.sector || 'General'}</p>
          <p style="font-size: 14px; margin: 0 0 10px 0;"><b>Ubicación exacta:</b> ${incident.exactLocation || 'No especificada'}</p>
          <p style="font-size: 14px; margin: 0 0 16px 0; background-color: #f8fafc; padding: 12px; border-radius: 8px; border-left: 4px solid #cbd5e1;">
            <b>Descripción:</b><br/>${incident.description || 'Sin descripción'}
          </p>
          <p style="font-size: 13px; color: #64748b;"><b>Informante:</b> ${incident.reporterName || 'Anónimo'} (${incident.reporterEmail || 'Sin email'})</p>
        </div>
        <div style="background-color: #f1f5f9; padding: 16px; text-align: center; font-size: 12px; color: #64748b;">
          Sistema de Gestión de Incidencias — Museo Patagónico
        </div>
      </div>
    `;

    const subject = `🚨 [${incident.urgency || 'Urgente'}] Nueva Incidencia ${incident.incidentId} - ${incident.sector || 'Museo'}`;

    if (resend) {
      try {
        await resend.emails.send({
          from: 'Incidencias Museo <onboarding@resend.dev>',
          to: recipientList,
          subject,
          html: htmlContent,
        });
        return;
      } catch (err) {
        console.warn('Fallo Resend, probando Brevo:', err);
      }
    }

    if (process.env.BREVO_API_KEY) {
      await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'api-key': process.env.BREVO_API_KEY,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          sender: { name: 'Incidencias Museo', email: 'no-reply@museo.org' },
          to: recipientList.map((email) => ({ email })),
          subject,
          htmlContent,
        }),
      });
    }
  } catch (e) {
    console.error('Error enviando notificaciones por email:', e);
  }
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  const { id, photo, health, staff } = req.query || {};

  try {
    if (req.method === 'GET' && health) return res.status(200).json({ ok: true });

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

      sendCoordinatorEmail(incident).catch(() => {});

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
