import { Incident } from '../types/incident';

const INCIDENTS_CACHE_KEY = 'mp_incidents_cache_v1';
const PENDING_QUEUE_KEY = 'mp_pending_sync_queue_v1';

export function getCachedIncidents(): Incident[] | null {
  try {
    const raw = localStorage.getItem(INCIDENTS_CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveCachedIncidents(incidents: Incident[]): void {
  try {
    localStorage.setItem(INCIDENTS_CACHE_KEY, JSON.stringify(incidents));
  } catch (err) {
    console.warn('Could not cache incidents to localStorage:', err);
  }
}

export function getPendingQueue(): Incident[] {
  try {
    const raw = localStorage.getItem(PENDING_QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function enqueuePendingIncident(incident: Incident): void {
  try {
    const current = getPendingQueue();
    // Avoid duplicates in queue
    const filtered = current.filter((i) => i.incidentId !== incident.incidentId);
    filtered.push(incident);
    localStorage.setItem(PENDING_QUEUE_KEY, JSON.stringify(filtered));
  } catch (err) {
    console.warn('Could not enqueue incident:', err);
  }
}

export function removeFromPendingQueue(incidentId: string): void {
  try {
    const current = getPendingQueue();
    const updated = current.filter((i) => i.incidentId !== incidentId);
    localStorage.setItem(PENDING_QUEUE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.warn('Could not remove from pending queue:', err);
  }
}
