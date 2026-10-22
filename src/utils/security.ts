const PIN_SESSION_KEY = 'mp_coordinator_pin_session';
const LEGACY_PIN_KEY = 'mp_coordinator_pin_v1';

try { localStorage.removeItem(LEGACY_PIN_KEY); } catch {}

export function getStoredPin(): string {
  try { return sessionStorage.getItem(PIN_SESSION_KEY) || ''; } catch { return ''; }
}

export function setStoredPin(pin: string): boolean {
  const p = String(pin).trim();
  if (!p) return false;
  try {
    sessionStorage.setItem(PIN_SESSION_KEY, p);
    return true;
  } catch { return false; }
}

export function clearStoredPin(): void {
  try { sessionStorage.removeItem(PIN_SESSION_KEY); } catch {}
}

export function verifyPin(enteredPin: string): boolean {
  const stored = getStoredPin();
  return !!stored && enteredPin.trim() === stored;
}

export async function verifyPinAsync(enteredPin: string, email?: string): Promise<boolean> {
  const pin = enteredPin.trim();
  try {
    const res = await fetch('/api/pin/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin, email }),
    });
    if (!res.ok) return false;
    const data = await res.json();
    if (data && data.valid) {
      setStoredPin(pin);
      return true;
    }
    return false;
  } catch { return false; }
}

export async function updatePinAsync(currentPin: string, newPin: string): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch('/api/pin/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPin: currentPin.trim(), newPin: newPin.trim() }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.success) {
      setStoredPin(newPin.trim());
      return { success: true };
    }
    return { success: false, error: data.error || 'Error al actualizar el PIN' };
  } catch {
    return { success: false, error: 'No se pudo conectar con el servidor.' };
  }
}
