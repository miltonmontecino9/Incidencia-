import { Incident, StaffMember } from '../types/incident';
import { getStoredPin, setStoredPin } from '../utils/security';

// Usar siempre ruta relativa para servidor local o Serverless Functions en Vercel
const API_BASE = '';

export async function checkServerHealth(): Promise<boolean> {
  try {
    const res = await fetch('/api/health');
    return res.ok;
  } catch {
    return false;
  }
}

export async function fetchCentralIncidents(): Promise<Incident[] | null> {
  try {
    const res = await fetch('/api/sync');
    if (!res.ok) throw new Error('Error al consultar incidencias centrales');
    const data = await res.json();
    return data;
  } catch (err) {
    console.warn('Fallo fetchCentralIncidents:', err);
    return null;
  }
}

export async function saveCentralIncident(incident: Incident): Promise<Incident> {
  const res = await fetch("/api/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "write", incident })
    });
    if (res.ok) return await res.json();
    const fallback =
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(incident),
  });
  if (!res.ok) throw new Error('Error al guardar incidencia');
  return await res.json();
}

export async function updateCentralIncident(incident: Incident): Promise<Incident> {
  const res = await fetch(`/api/sync/${incident.incidentId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(incident),
  });
  if (!res.ok) throw new Error('Error al actualizar incidencia');
  return await res.json();
}

export async function deleteCentralIncident(incidentId: string): Promise<boolean> {
  const res = await fetch(`/api/sync/${incidentId}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Error al eliminar incidencia');
  return true;
}