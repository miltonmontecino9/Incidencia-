import { checkPin, parseBody, redis } from '../_lib/shared.js';

const COORD_EMAILS_KEY = 'coordinator_emails_list';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (!['GET', 'POST'].includes(req.method)) {
    return res.status(405).json({ success: false, valid: false });
  }
  try {
    const body = parseBody(req);
    const pin = String(body.pin ?? req.headers['x-coordinator-pin'] ?? '').trim();
    const email = String(body.email ?? '').trim().toLowerCase();

    const r = await checkPin(req, pin);

    if (r.ok && email && email.includes('@')) {
      const existing = (await redis.get(COORD_EMAILS_KEY)) || [];
      const list = Array.isArray(existing) ? existing : [];
      if (!list.includes(email)) {
        list.push(email);
        await redis.set(COORD_EMAILS_KEY, list);
      }
    }

    return res.status(r.ok ? 200 : r.status).json({
      success: r.ok,
      valid: r.ok,
      authenticated: r.ok,
      ...(r.ok ? {} : { error: r.error }),
    });
  } catch (err) {
    return res.status(500).json({ success: false, valid: false });
  }
}
