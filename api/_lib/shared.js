import { Redis } from '@upstash/redis';
import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN,
});

export const getIp = (req) =>
  String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';

export const readPin = (req) => String(req.headers['x-coordinator-pin'] || '').trim();

export function parseBody(req) {
  let b = req.body;
  if (typeof b === 'string') {
    try { b = JSON.parse(b); } catch { b = {}; }
  }
  return b && typeof b === 'object' ? b : {};
}

export async function hitLimit(key, max, windowSec) {
  const n = await redis.incr(key);
  if (n === 1) await redis.expire(key, windowSec);
  return n > max;
}

const PIN_KEY = 'coordinator_pin';
const sha = (s) => createHash('sha256').update(String(s)).digest();
const scryptHash = (pin, salt) => scryptSync(String(pin), salt, 32);

export async function pinMatches(candidate) {
  const c = String(candidate || '').trim();
  if (!c) return false;
  const rec = await redis.get(PIN_KEY);
  if (typeof rec === 'string' && rec.includes(':')) {
    const [salt, hex] = rec.split(':');
    const a = scryptHash(c, salt);
    const b = Buffer.from(hex, 'hex');
    return a.length === b.length && timingSafeEqual(a, b);
  }
  const real = (process.env.COORDINATOR_PIN || '').trim();
  if (!real) return false;
  return timingSafeEqual(sha(c), sha(real));
}

export async function setPin(newPin) {
  const salt = randomBytes(16).toString('hex');
  await redis.set(PIN_KEY, `${salt}:${scryptHash(newPin, salt).toString('hex')}`);
}

const MAX_FAILS = 10;
const LOCK_SECONDS = 900;

export async function checkPin(req, candidate) {
  const failKey = `pinfail:${getIp(req)}`;
  const fails = Number(await redis.get(failKey)) || 0;
  if (fails >= MAX_FAILS) {
    return { ok: false, status: 429, error: 'Demasiados intentos. Esperá unos minutos.' };
  }
  if (await pinMatches(candidate)) {
    if (fails > 0) await redis.del(failKey);
    return { ok: true };
  }
  await hitLimit(failKey, MAX_FAILS, LOCK_SECONDS);
  return { ok: false, status: 401, error: 'PIN inválido' };
}
