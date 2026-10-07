import { StaffMember, STAFF_MEMBERS } from '../types/incident';

const STAFF_STORAGE_KEY = 'mp_assigned_staff_list_v1';

export function getStoredStaffList(): StaffMember[] {
  try {
    const raw = localStorage.getItem(STAFF_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Error reading staff list from localStorage:', err);
  }
  return STAFF_MEMBERS;
}

export function saveStoredStaffList(list: StaffMember[]): void {
  try {
    localStorage.setItem(STAFF_STORAGE_KEY, JSON.stringify(list));
  } catch (err) {
    console.warn('Error saving staff list to localStorage:', err);
  }
}
