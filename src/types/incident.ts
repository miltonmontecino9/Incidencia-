export type UrgencyLevel = 'Baja' | 'Media' | 'Alta';

export type IncidentCategory =
  | 'Técnica / Audiovisual'
  | 'Limpieza e Higiene'
  | 'Mobiliario y Señaléctica'
  | 'Seguridad y Salud'
  | 'Control de Acceso / Aforo'
  | 'Logística y Catering'
  | 'Otra';

export type IncidentSector =
  | 'Auditorio Principal'
  | 'Salas de Exposición'
  | 'Hall Central / Acreditaciones'
  | 'Área de Catering / Buffet'
  | 'Sanitarios'
  | 'Exteriores y Patios'
  | 'Otro / Especificar';

export type IncidentStatus = 'Pendiente' | 'En Curso' | 'Resuelto';

export type OrganizationOption =
  | 'Museo Patagónico'
  | 'Asociación Española'
  | 'Auditorio Diario Río Negro';

export interface ProgressComment {
  id: string;
  timestamp: string;
  author: string;
  text: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  coordinatorName: string;
  action: string;
  details?: string;
}

export interface StaffMember {
  id: string;
  name: string;
  email: string;
  role: string;
  active?: boolean;
}

export interface Incident {
  incidentId: string;
  timestamp: string;
  reporterName: string;
  reporterEmail: string;
  organization: OrganizationOption;
  category: IncidentCategory;
  customCategory?: string; // When category === 'Otra'
  urgency: UrgencyLevel;
  sector: IncidentSector;
  customSector?: string; // When sector === 'Otro / Especificar'
  exactLocation: string;
  description: string;
  evidencePhoto?: string; // Base64 data URL
  status: IncidentStatus;
  assignedTo?: string;
  resolutionNotes?: string;
  progressComments?: ProgressComment[];
  auditLog?: AuditLogEntry[];
  rowIndex?: number; // Row in Google Sheets
}

export const CATEGORIES: { label: IncidentCategory; icon: string; description: string }[] = [
  {
    label: 'Técnica / Audiovisual',
    icon: 'Cpu',
    description: 'Equipos AV, micrófonos, proyectores, WiFi, enchufes y sonido',
  },
  {
    label: 'Limpieza e Higiene',
    icon: 'Sparkles',
    description: 'Derrames, tachos de basura, sanitización, insumos de higiene',
  },
  {
    label: 'Mobiliario y Señaléctica',
    icon: 'Armchair',
    description: 'Sillas, atriles, caballetes, vallas, cartelería de orientación',
  },
  {
    label: 'Seguridad y Salud',
    icon: 'ShieldAlert',
    description: 'Primeros auxilios, riesgos de tropiezo, salidas bloqueadas',
  },
  {
    label: 'Control de Acceso / Aforo',
    icon: 'Users',
    description: 'Lectoras de acreditación, filas, congestión, accesos VIP',
  },
  {
    label: 'Logística y Catering',
    icon: 'Coffee',
    description: 'Estaciones de agua, café, vajilla, reposición de refrigerios',
  },
  {
    label: 'Otra',
    icon: 'HelpCircle',
    description: 'Especificar manualmente si no encaja en las opciones anteriores',
  },
];

export const SECTORS: IncidentSector[] = [
  'Auditorio Principal',
  'Salas de Exposición',
  'Hall Central / Acreditaciones',
  'Área de Catering / Buffet',
  'Sanitarios',
  'Exteriores y Patios',
  'Otro / Especificar',
];

export const ORGANIZATIONS: { value: OrganizationOption; label: string }[] = [
  { value: 'Museo Patagónico', label: '1. Museo Patagónico' },
  { value: 'Asociación Española', label: '2. Asociación Española' },
  { value: 'Auditorio Diario Río Negro', label: '3. Auditorio Diario Río Negro' },
];

export const STAFF_MEMBERS: StaffMember[] = [
  { id: 'st_1', name: 'Dr. Lucas Vedia', email: 'lucas.vedia@museopatagonico.org', role: 'Coordinador General', active: true },
  { id: 'st_2', name: 'Camila Rossi', email: 'camila.rossi@museopatagonico.org', role: 'Jefa Técnica & AV', active: true },
  { id: 'st_3', name: 'Esteban Moreno', email: 'esteban.moreno@museopatagonico.org', role: 'Logística & Mantenimiento', active: true },
  { id: 'st_4', name: 'Sofía Álvarez', email: 'sofia.alvarez@museopatagonico.org', role: 'Seguridad & Primeros Auxilios', active: true },
  { id: 'st_5', name: 'Mariano Díaz', email: 'mariano.diaz@museopatagonico.org', role: 'Acreditaciones y Sala', active: true },
];
