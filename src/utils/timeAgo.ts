export type ShiftType = 'Todos' | 'Turno Mañana' | 'Turno Tarde';

/**
 * Determine the work shift based on the incident timestamp
 * Format expected: YYYY-MM-DD HH:mm
 */
export function getShiftFromTimestamp(timestampStr: string): 'Turno Mañana' | 'Turno Tarde' {
  if (!timestampStr) return 'Turno Mañana';
  const parts = timestampStr.split(' ');
  const timePart = parts[1] || parts[0];
  const hour = parseInt(timePart.split(':')[0], 10);

  if (isNaN(hour)) return 'Turno Mañana';
  // Mañana: 07:00 a 14:59. Tarde: 15:00 a 23:59 (y noche)
  if (hour >= 7 && hour < 15) {
    return 'Turno Mañana';
  }
  return 'Turno Tarde';
}

/**
 * Calculate elapsed minutes and formatted text since the timestamp
 */
export function getElapsedTime(timestampStr: string): {
  minutes: number;
  formatted: string;
  isOverdue: boolean; // Over 30 min in pending
} {
  if (!timestampStr) {
    return { minutes: 0, formatted: 'Reciente', isOverdue: false };
  }

  // Parse YYYY-MM-DD HH:mm or standard date
  const isoLike = timestampStr.replace(' ', 'T');
  const incidentDate = new Date(isoLike);
  if (isNaN(incidentDate.getTime())) {
    return { minutes: 0, formatted: 'Reciente', isOverdue: false };
  }

  const now = new Date();
  const diffMs = now.getTime() - incidentDate.getTime();
  const diffMins = Math.max(0, Math.floor(diffMs / (1000 * 60)));

  let formatted = '';
  if (diffMins < 1) {
    formatted = 'Hace un momento';
  } else if (diffMins < 60) {
    formatted = `Hace ${diffMins} min`;
  } else {
    const hours = Math.floor(diffMins / 60);
    const remMins = diffMins % 60;
    if (hours < 24) {
      formatted = remMins > 0 ? `Hace ${hours}h ${remMins}m` : `Hace ${hours}h`;
    } else {
      const days = Math.floor(hours / 24);
      formatted = `Hace ${days} ${days === 1 ? 'día' : 'días'}`;
    }
  }

  return {
    minutes: diffMins,
    formatted,
    isOverdue: diffMins > 30,
  };
}
