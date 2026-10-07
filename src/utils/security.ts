const PIN_STORAGE_KEY = 'mp_coordinator_pin_v1';
const DEFAULT_PIN = '2026';

export function getStoredPin(): string {
  try {
    const pin = localStorage.getItem(PIN_STORAGE_KEY);
    return pin && /^\d{4}$/.test(pin) ? pin : DEFAULT_PIN;
  } catch {
    return DEFAULT_PIN;
  }
}

export function setStoredPin(newPin: string): boolean {
  if (!/^\d{4}$/.test(newPin)) return false;
  try {
    localStorage.setItem(PIN_STORAGE_KEY, newPin);
    return true;
  } catch {
    return false;
  }
}

export function verifyPin(enteredPin: string): boolean {
  return enteredPin.trim() === getStoredPin();
}

export async function verifyPinAsync(enteredPin: string): Promise<boolean> {
  try {
    const res = await fetch('/api/pin/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin: enteredPin.trim() }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.valid) {
        setStoredPin(enteredPin.trim());
        return true;
      }
      return false;
    }
  } catch {
    // fallback to local stored pin
  }
  return verifyPin(enteredPin);
}

export async function updatePinAsync(
  currentPin: string,
  newPin: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch('/api/pin/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPin, newPin }),
    });
    const data = await res.json();
    if (res.ok && data.success) {
      setStoredPin(newPin);
      return { success: true };
    }
    return { success: false, error: data.error || 'Error al actualizar PIN' };
  } catch {
    // If offline, at least update local storage if current matches
    if (verifyPin(currentPin)) {
      setStoredPin(newPin);
      return { success: true };
    }
    return { success: false, error: 'El PIN actual no es correcto' };
  }
}

