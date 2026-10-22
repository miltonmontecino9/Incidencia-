import { Incident, StaffMember } from '../types/incident';
import { getStoredPin } from '../utils/security';

const API = '/api/sync';

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

function authHeaders(): Record<string, string> {
  const pin = getStoredPin();
  return pin ? { 'x-coordinator-pin': pin } : {};
}

async function errorMessage(res: Response, fallback: string): Promise<string> {
  try {
    const d = await res.json();
    return d?.error || fallback;
  } catch { return fallback; }
}

export interface CentralSyncData {
  incidents?: Incident[];
  staff?: StaffMember[];
}

let pollCount = 0;

export async function fetchCentralSync(): Promise<CentralSyncData> {
  const headers = authHeaders();
  const authed = 'x-coordinator-pin' in headers;
  if (!authed) pollCount = 0;
  const wantStaff = authed && pollCount++ % 6 === 0;

  const res = await fetch(wantStaff ? `${API}?staff=1` : API, { cache: 'no-store', headers });
  if (!res.ok) {
    throw new ApiError(await errorMessage(res, `Error ${res.status}`), res.status);
  }
  const data = await res.json();
  const incidents = Array.isArray(data) ? data : data?.incidents;
  if (!Array.isArray(incidents)) throw new ApiError('Respuesta inválida', 502);

  return {
    incidents: incidents as Incident[],
    staff: Array.isArray(data?.staff) ? (data.staff as StaffMember[]) : undefined,
  };
}

export async function saveCentralIncident(incident: Incident): Promise<Incident> {
  const res = await fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ incident }),
  });
  if (!res.ok) throw new ApiError(await errorMessage(res, 'Error al guardar'), res.status);
  const data = await res.json();
  return data.incident as Incident;
}

export async function updateCentralIncident(incident: Incident): Promise<Incident> {
  const body = { ...incident } as Record<string, unknown>;
  delete body.evidencePhoto;

  const res = await fetch(`${API}?id=${encodeURIComponent(incident.incidentId)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ incident: body }),
  });
  if (!res.ok) throw new ApiError(await errorMessage(res, 'Error al actualizar'), res.status);
  const data = await res.json();
  return data.incident as Incident;
}

export async function deleteCentralIncident(incidentId: string): Promise<boolean> {
  const res = await fetch(`${API}?id=${encodeURIComponent(incidentId)}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  if (!res.ok) throw new ApiError(await errorMessage(res, 'Error al eliminar'), res.status);
  return true;
}

export async function saveStaffList(staff: StaffMember[]): Promise<void> {
  const res = await fetch(`${API}?staff=1`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ staff }),
  });
  if (!res.ok) throw new ApiError(await errorMessage(res, 'Error al guardar personal'), res.status);
}

export async function fetchIncidentPhoto(incidentId: string): Promise<string | null> {
  try {
    const res = await fetch(`${API}?id=${encodeURIComponent(incidentId)}&photo=1`, {
      cache: 'no-store',
      headers: authHeaders(),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.evidencePhoto ?? null;
  } catch { return null; }
}
