import { Incident, StaffMember } from '../types/incident';

const BASE_URL = '/api';

export interface SyncResponse {
  incidents: Incident[];
  staff: StaffMember[];
  updatedAt: string;
}

/**
 * Health check to verify central server connectivity
 */
export async function checkServerHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${BASE_URL}/health`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      cache: 'no-store',
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Fetch all incidents and staff in a single roundtrip
 */
export async function fetchCentralSync(): Promise<SyncResponse> {
  const res = await fetch(`${BASE_URL}/sync`, {
    method: 'GET',
    headers: { 'Accept': 'application/json' },
    cache: 'no-store',
  });
  if (!res.ok) {
    throw new Error(`Error en servidor central: ${res.statusText}`);
  }
  return await res.json();
}

/**
 * Fetch incidents only
 */
export async function fetchIncidents(): Promise<Incident[]> {
  const res = await fetch(`${BASE_URL}/incidents`, {
    method: 'GET',
    headers: { 'Accept': 'application/json' },
    cache: 'no-store',
  });
  if (!res.ok) {
    throw new Error(`Error al obtener incidencias: ${res.statusText}`);
  }
  return await res.json();
}

/**
 * Create or append a new incident to the central persistent store
 */
export async function saveCentralIncident(incident: Incident): Promise<Incident> {
  const res = await fetch(`${BASE_URL}/incidents`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify(incident),
  });
  if (!res.ok) {
    throw new Error(`Error al registrar incidencia en servidor central: ${res.statusText}`);
  }
  return await res.json();
}

/**
 * Update an existing incident in the central store
 */
export async function updateCentralIncident(incident: Incident): Promise<Incident> {
  const res = await fetch(`${BASE_URL}/incidents/${encodeURIComponent(incident.incidentId)}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify(incident),
  });
  if (!res.ok) {
    throw new Error(`Error al actualizar incidencia en servidor central: ${res.statusText}`);
  }
  return await res.json();
}

/**
 * Fetch staff members from central store
 */
export async function fetchStaffList(): Promise<StaffMember[]> {
  const res = await fetch(`${BASE_URL}/staff`, {
    method: 'GET',
    headers: { 'Accept': 'application/json' },
    cache: 'no-store',
  });
  if (!res.ok) {
    throw new Error(`Error al obtener equipo de personal: ${res.statusText}`);
  }
  return await res.json();
}

/**
 * Save staff members to central store
 */
export async function saveStaffList(staff: StaffMember[]): Promise<StaffMember[]> {
  const res = await fetch(`${BASE_URL}/staff`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify(staff),
  });
  if (!res.ok) {
    throw new Error(`Error al guardar equipo de personal: ${res.statusText}`);
  }
  return await res.json();
}

/**
 * Verify coordinator PIN against central store
 */
export async function verifyCoordinatorPin(pin: string): Promise<boolean> {
  try {
    const res = await fetch(`${BASE_URL}/pin/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({ pin }),
    });
    if (!res.ok) return false;
    const data = await res.json();
    return !!data.valid;
  } catch {
    // Offline fallback to stored pin if network fails
    const local = localStorage.getItem('mp_coordinator_pin_v1') || '2026';
    return pin.trim() === local;
  }
}

/**
 * Update coordinator PIN on central store
 */
export async function updateCoordinatorPin(currentPin: string, newPin: string): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch(`${BASE_URL}/pin/update`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({ currentPin, newPin }),
    });
    const data = await res.json();
    if (!res.ok) {
      return { success: false, error: data.error || 'Error al cambiar PIN' };
    }
    // Also update local storage for offline resilience
    try {
      localStorage.setItem('mp_coordinator_pin_v1', newPin);
    } catch {}
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Error de conexión con el servidor central' };
  }
}
