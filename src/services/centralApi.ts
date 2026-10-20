import { Incident, StaffMember } from '../types/incident';

const BASE_URL = '/api';

export interface SyncResponse {
  incidents: Incident[];
  staff: StaffMember[];
  updatedAt: string;
}

export async function checkServerHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${BASE_URL}/health`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function fetchCentralSync(): Promise<SyncResponse> {
  const res = await fetch(`${BASE_URL}/sync`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  });
  if (!res.ok) {
    throw new Error(`Error en sync central: ${res.statusText}`);
  }
  return await res.json();
}

export async function saveCentralIncident(incident: Incident): Promise<Incident> {
  const res = await fetch(`${BASE_URL}/incidents`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(incident),
  });
  if (!res.ok) {
    throw new Error(`Error al guardar incidencia: ${res.statusText}`);
  }
  return await res.json();
}

export async function updateCentralIncident(incident: Incident): Promise<Incident> {
  const res = await fetch(`${BASE_URL}/incidents/${incident.incidentId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(incident),
  });
  if (!res.ok) {
    throw new Error(`Error al actualizar incidencia: ${res.statusText}`);
  }
  return await res.json();
}

export async function deleteCentralIncident(incidentId: string): Promise<boolean> {
  const res = await fetch(`${BASE_URL}/incidents/${incidentId}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    throw new Error(`Error al eliminar incidencia: ${res.statusText}`);
  }
  return true;
}

export async function saveStaffList(staff: StaffMember[]): Promise<StaffMember[]> {
  const res = await fetch(`${BASE_URL}/staff`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(staff),
  });
  if (!res.ok) {
    throw new Error(`Error al guardar personal: ${res.statusText}`);
  }
  return await res.json();
}