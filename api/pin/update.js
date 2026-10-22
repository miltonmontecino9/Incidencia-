import { checkPin, setPin, parseBody } from '../_lib/shared.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ success: false });

  try {
    const body = parseBody(req);
    const currentPin = String(body.currentPin ?? '').trim();
    const newPin = String(body.newPin ?? '').trim();

    if (!/^\d{4}$/.test(newPin)) {
      return res.status(400).json({ success: false, error: 'El nuevo PIN debe tener 4 dígitos.' });
    }

    const r = await checkPin(req, currentPin);
    if (!r.ok) {
      return res.status(r.status).json({
        success: false,
        error: r.status === 401 ? 'El PIN actual no es correcto' : r.error,
      });
    }

    await setPin(newPin);
    return res.status(200).json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
}
