import { Incident, StaffMember } from '../types/incident';
import { getStoredPin, setStoredPin } from '../utils/security';

// Dirección pública de tu backend desplegado en Render
const API_BASE = 'https://incidencia-6ap8.onrender.com';

/**
 * Global Centralized API client for all devices scanning the QR Code or accessing the app.
 */

export async function checkServerHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/api/health`);
    return res.ok;
  } catch {
    return false;
  }
}

export async function fetchCentralIncidents(): Promise<Incident[] | null> {
  try {
    const res = await fetch(`${API_BASE}/api/incidents`);
    if (!res.ok) throw new Error('Error al consultar incidencias centrales');
    const data = await res.json();
    return Array.isArray(data) ? data : null;
  } catch (err) {
    console.warn('Central API unreachable, falling back to local store:', err);
    return null;
  }
}

export async function saveCentralIncident(incident: Incident): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/api/incidents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(incident),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function updateCentralIncident(incident: Incident): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/api/incidents/${encodeURIComponent(incident.incidentId)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(incident),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function fetchCentralStaff(): Promise<StaffMember[] | null> {
  try {
    const res = await fetch(`${API_BASE}/api/staff`);
    if (!res.ok) throw new Error('Error al consultar personal central');
    const data = await res.json();
    return Array.isArray(data) ? data : null;
  } catch {
    return null;
  }
}

export async function saveCentralStaff(staff: StaffMember[]): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/api/staff`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(staff),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function verifyCentralPin(enteredPin: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/api/pin/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin: enteredPin.trim() }),
    });
    if (res.ok) {
      const data = await res.json();
      return !!data.valid;
    }
  } catch {
    // Offline fallback
  }
  return enteredPin.trim() === getStoredPin();
}

export async function updateCentralPin(currentPin: string, newPin: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/api/pin/update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPin, newPin }),
    });
    if (res.ok) {
      setStoredPin(newPin);
      return true;
    }
  } catch {
    // Offline fallback
  }
  return setStoredPin(newPin);
}