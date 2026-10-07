import React, { useState, useMemo } from 'react';
import {
  Incident,
  IncidentCategory,
  IncidentSector,
  IncidentStatus,
  OrganizationOption,
  UrgencyLevel,
  StaffMember,
  CATEGORIES,
  SECTORS,
  ORGANIZATIONS,
} from '../types/incident';
import {
  AlertTriangle,
  Search,
  LayoutGrid,
  ListFilter,
  Clock,
  MapPin,
  User,
  Users,
  ExternalLink,
  Eye,
  Camera,
  Download,
  CheckCircle,
  Play,
  RotateCcw,
  Lock,
  Unlock,
  KeyRound,
  RefreshCw,
  Shield,
  ShieldAlert,
  UserCheck,
} from 'lucide-react';
import { SheetMetadata } from '../services/googleSheets';
import { getShiftFromTimestamp, getElapsedTime, ShiftType } from '../utils/timeAgo';

interface Props {
  incidents: Incident[];
  onOpenDetail: (incident: Incident) => void;
  onRequestStatusChange: (
    incident: Incident,
    newStatus: IncidentStatus
  ) => void;
  onZoomPhoto: (url: string, title: string) => void;
  sheetMeta: SheetMetadata | null;
  onRefreshData?: () => void;
  isRefreshing?: boolean;
  // Role & PIN Control
  isCoordinator: boolean;
  onOpenPinLogin: () => void;
  onOpenChangePin: () => void;
  // Dynamic Staff Management
  staffList?: StaffMember[];
  onOpenStaffManagement: () => void;
  coordinatorIdentity: string;
  // Auto-refresh countdown in seconds
  autoRefreshSecondsLeft: number;
}

export const AdminDashboard: React.FC<Props> = ({
  incidents,
  onOpenDetail,
  onRequestStatusChange,
  onZoomPhoto,
  sheetMeta,
  onRefreshData,
  isRefreshing = false,
  isCoordinator,
  onOpenPinLogin,
  onOpenChangePin,
  staffList = [],
  onOpenStaffManagement,
  coordinatorIdentity,
  autoRefreshSecondsLeft,
}) => {
  // Modo de vista: Kanban vs Lista
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');

  // Filtros
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'Todos' | IncidentStatus>('Todos');
  const [urgencyFilter, setUrgencyFilter] = useState<'Todos' | UrgencyLevel>('Todos');
  const [sectorFilter, setSectorFilter] = useState<'Todos' | IncidentSector>('Todos');
  const [categoryFilter, setCategoryFilter] = useState<'Todos' | IncidentCategory>('Todos');
  const [orgFilter, setOrgFilter] = useState<'Todos' | OrganizationOption>('Todos');
  const [shiftFilter, setShiftFilter] = useState<ShiftType>('Todos');
  const [assignedToFilter, setAssignedToFilter] = useState<string>('Todos');

  // 2. BÚSQUEDA RÁPIDA INSTANTÁNEA Y FILTRADO MULTIDIMENSIONAL
  const filteredIncidents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return incidents
      .filter((inc) => {
        if (statusFilter !== 'Todos' && inc.status !== statusFilter) return false;
        if (urgencyFilter !== 'Todos' && inc.urgency !== urgencyFilter) return false;
        if (sectorFilter !== 'Todos' && inc.sector !== sectorFilter) return false;
        if (categoryFilter !== 'Todos' && inc.category !== categoryFilter) return false;
        if (orgFilter !== 'Todos' && inc.organization !== orgFilter) return false;

        // Filtro por Turnos de Guardia
        if (shiftFilter !== 'Todos') {
          const incShift = getShiftFromTimestamp(inc.timestamp);
          if (incShift !== shiftFilter) return false;
        }

        // Filtro Personal de Tareas (Asignado a)
        if (assignedToFilter !== 'Todos') {
          if (assignedToFilter === 'Sin asignar') {
            if (inc.assignedTo && inc.assignedTo.trim() !== '') return false;
          } else {
            const target = assignedToFilter.toLowerCase();
            const currentAssigned = (inc.assignedTo || '').toLowerCase();
            const staffObj = staffList.find(
              (s) => s.email.toLowerCase() === target || s.name.toLowerCase() === target
            );
            const matchesEmail = currentAssigned.includes(target);
            const matchesName = staffObj
              ? currentAssigned.includes(staffObj.name.toLowerCase())
              : false;
            if (!matchesEmail && !matchesName) return false;
          }
        }

        // Búsqueda instantánea optimizada
        if (q) {
          const matchId = inc.incidentId.toLowerCase().includes(q);
          const matchLoc = inc.exactLocation.toLowerCase().includes(q);
          const matchDesc = inc.description.toLowerCase().includes(q);
          const matchReporter = inc.reporterName.toLowerCase().includes(q);
          const matchSector = inc.sector.toLowerCase().includes(q);
          const matchCustomSector = (inc.customSector || '').toLowerCase().includes(q);
          const matchCustomCat = (inc.customCategory || '').toLowerCase().includes(q);
          const matchOrg = inc.organization.toLowerCase().includes(q);
          const matchAssigned = (inc.assignedTo || '').toLowerCase().includes(q);
          return (
            matchId ||
            matchLoc ||
            matchDesc ||
            matchReporter ||
            matchSector ||
            matchCustomSector ||
            matchCustomCat ||
            matchOrg ||
            matchAssigned
          );
        }

        return true;
      })
      .sort((a, b) => {
        // Alta primero, luego Media, luego Baja
        const urgencyWeight: Record<UrgencyLevel, number> = { Alta: 3, Media: 2, Baja: 1 };
        const uDiff = urgencyWeight[b.urgency] - urgencyWeight[a.urgency];
        if (uDiff !== 0) return uDiff;

        // Pendiente primero, luego En Curso, luego Resuelto
        const statusWeight: Record<IncidentStatus, number> = {
          Pendiente: 3,
          'En Curso': 2,
          Resuelto: 1,
        };
        const sDiff = statusWeight[b.status] - statusWeight[a.status];
        if (sDiff !== 0) return sDiff;

        // Por fecha/hora descendente
        return b.timestamp.localeCompare(a.timestamp);
      });
  }, [
    incidents,
    statusFilter,
    urgencyFilter,
    sectorFilter,
    categoryFilter,
    orgFilter,
    shiftFilter,
    assignedToFilter,
    staffList,
    searchQuery,
  ]);

  // Métricas
  const highPriorityOpen = incidents.filter(
    (i) => i.urgency === 'Alta' && i.status !== 'Resuelto'
  );
  const pendingCount = incidents.filter((i) => i.status === 'Pendiente').length;
  const inProgressCount = incidents.filter((i) => i.status === 'En Curso').length;
  const resolvedCount = incidents.filter((i) => i.status === 'Resuelto').length;

  // Columnas Kanban
  const kanbanColumns: {
    status: IncidentStatus;
    title: string;
    color: string;
    border: string;
  }[] = [
    {
      status: 'Pendiente',
      title: 'Pendiente / Triaje',
      color: 'bg-amber-50 dark:bg-amber-950/40 text-amber-950 dark:text-amber-200',
      border: 'border-amber-300 dark:border-amber-700',
    },
    {
      status: 'En Curso',
      title: 'En Curso / Despachado',
      color: 'bg-blue-50 dark:bg-blue-950/40 text-blue-950 dark:text-blue-200',
      border: 'border-blue-300 dark:border-blue-700',
    },
    {
      status: 'Resuelto',
      title: 'Resuelto y Cerrado',
      color: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-950 dark:text-emerald-200',
      border: 'border-emerald-300 dark:border-emerald-700',
    },
  ];

  // Exportar Reporte a CSV
  const handleExportCSV = () => {
    const headers = [
      'Código',
      'Fecha_Hora',
      'Turno',
      'Informante',
      'Email',
      'Organización',
      'Categoría',
      'Urgencia',
      'Sector',
      'Ubicación_Exacta',
      'Descripción',
      'Estado',
      'Asignado_A',
      'Notas_Resolución',
    ];

    const rows = filteredIncidents.map((i) => {
      const shift = getShiftFromTimestamp(i.timestamp);
      const cat = i.category === 'Otra' && i.customCategory ? `Otra: ${i.customCategory}` : i.category;
      const sec = i.sector === 'Otro / Especificar' && i.customSector ? `${i.customSector} (Otro)` : i.sector;
      return [
        i.incidentId,
        `"${i.timestamp}"`,
        `"${shift}"`,
        `"${i.reporterName.replace(/"/g, '""')}"`,
        `"${i.reporterEmail.replace(/"/g, '""')}"`,
        `"${i.organization}"`,
        `"${cat}"`,
        `"${i.urgency}"`,
        `"${sec}"`,
        `"${i.exactLocation.replace(/"/g, '""')}"`,
        `"${i.description.replace(/"/g, '""')}"`,
        `"${i.status}"`,
        `"${(i.assignedTo || '').replace(/"/g, '""')}"`,
        `"${(i.resolutionNotes || '').replace(/"/g, '""')}"`,
      ].join(',');
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute(
      'download',
      `reporte-incidencias-museo-patagonico-${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const resetFilters = () => {
    setSearchQuery('');
    setStatusFilter('Todos');
    setUrgencyFilter('Todos');
    setSectorFilter('Todos');
    setCategoryFilter('Todos');
    setOrgFilter('Todos');
    setShiftFilter('Todos');
    setAssignedToFilter('Todos');
  };

  const hasActiveFilters =
    searchQuery !== '' ||
    statusFilter !== 'Todos' ||
    urgencyFilter !== 'Todos' ||
    sectorFilter !== 'Todos' ||
    categoryFilter !== 'Todos' ||
    orgFilter !== 'Todos' ||
    shiftFilter !== 'Todos' ||
    assignedToFilter !== 'Todos';

  return (
    <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 space-y-6">
      
      {/* 1. BANNER DE AVISO DE MODO VOLUNTARIO SI NO ES COORDINADOR */}
      {!isCoordinator && (
        <div className="bg-amber-500/10 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-700/60 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-amber-950 dark:text-amber-200">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-2xs">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-sm">Vista de Voluntario (Modo Solo Lectura)</h4>
              <p className="text-xs opacity-90">
                Puedes consultar todas las incidencias. Para despachar, cambiar estados o agregar notas, ingresa con el PIN de coordinador.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onOpenPinLogin}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition shadow-xs shrink-0 self-start sm:self-auto"
          >
            <Unlock className="w-4 h-4" />
            <span>Ingresar PIN de Coordinador</span>
          </button>
        </div>
      )}

      {/* Alerta Visual de Incidencias de Urgencia Alta */}
      {highPriorityOpen.length > 0 && (
        <div className="bg-red-600 dark:bg-red-700 text-white rounded-2xl p-4 sm:p-5 shadow-xl border-4 border-red-500 animate-in fade-in duration-300">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-white text-red-600 flex items-center justify-center shrink-0 animate-bounce shadow-md">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <div className="text-xs font-black uppercase tracking-wider text-red-200">
                  ACCIÓN INMEDIATA REQUERIDA
                </div>
                <h3 className="text-lg sm:text-xl font-black text-white">
                  {highPriorityOpen.length} {highPriorityOpen.length === 1 ? 'Incidencia Crítica' : 'Incidencias Críticas'} sin Resolver
                </h3>
                <p className="text-xs text-red-100 font-medium">
                  Sectores comprometidos:{' '}
                  <strong>{Array.from(new Set(highPriorityOpen.map((i) => i.sector))).join(', ')}</strong>.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setUrgencyFilter('Alta');
                setStatusFilter('Todos');
              }}
              className="px-4 py-2 bg-white text-red-700 font-black text-xs rounded-xl hover:bg-red-50 transition shrink-0 self-start sm:self-auto shadow-md"
            >
              Ver Solo Urgencia Alta ({highPriorityOpen.length})
            </button>
          </div>
        </div>
      )}

      {/* Métricas Rápidas y Contador de Refresco en Segundo Plano */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div
          onClick={() => {
            setUrgencyFilter('Alta');
            setStatusFilter('Todos');
          }}
          className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800 shadow-2xs cursor-pointer hover:border-red-400 transition"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Urgencia Alta</span>
            <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-ping"></span>
          </div>
          <div className="text-2xl font-black text-red-600 dark:text-red-400 mt-1">{highPriorityOpen.length}</div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Respuesta prioritaria</div>
        </div>

        <div
          onClick={() => {
            setStatusFilter('Pendiente');
            setUrgencyFilter('Todos');
          }}
          className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800 shadow-2xs cursor-pointer hover:border-amber-400 transition"
        >
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Pendiente / Triaje</span>
          <div className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">{pendingCount}</div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Sin despachar</div>
        </div>

        <div
          onClick={() => {
            setStatusFilter('En Curso');
            setUrgencyFilter('Todos');
          }}
          className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800 shadow-2xs cursor-pointer hover:border-blue-400 transition"
        >
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">En Curso</span>
          <div className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-1">{inProgressCount}</div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Personal en el lugar</div>
        </div>

        <div
          onClick={() => {
            setStatusFilter('Resuelto');
            setUrgencyFilter('Todos');
          }}
          className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800 shadow-2xs cursor-pointer hover:border-emerald-400 transition"
        >
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Resueltos</span>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{resolvedCount}</div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Cerrados y conformes</div>
        </div>
      </div>

      {/* Barra de Búsqueda Instantánea y Controles */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          
          {/* 2. BÚSQUEDA RÁPIDA OPTIMIZADA */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por código (ej. INC-004), nombre, lugar o descripción..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-amber-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                Limpiar
              </button>
            )}
          </div>

          {/* Acciones de la Barra: Refresco en 2º plano, CSV, Cambiar PIN, Vistas */}
          <div className="flex items-center gap-2 self-end md:self-auto flex-wrap">
            
            {/* 2. INDICADOR DE REFRESCO AUTOMÁTICO CADA 20 SEGUNDOS */}
            <div
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-[11px] font-semibold text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
              title="Refresco automático en segundo plano cada 20 segundos"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-amber-600 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>Auto-sync: {autoRefreshSecondsLeft}s</span>
            </div>

            {/* 1. BOTÓN CAMBIAR PIN (VISIBLE PARA COORDINADORES) */}
            {isCoordinator && (
              <button
                type="button"
                onClick={onOpenChangePin}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-bold transition"
                title="Cambiar la clave de 4 dígitos de los coordinadores"
              >
                <KeyRound className="w-3.5 h-3.5 text-amber-600" />
                <span>Cambiar PIN</span>
              </button>
            )}

            {/* 2. GESTIÓN DINÁMICA DE PERSONAL (MODO COORDINADOR) */}
            {isCoordinator && (
              <button
                type="button"
                onClick={onOpenStaffManagement}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition shadow-2xs"
                title="Administrar miembros asignables del equipo"
              >
                <Users className="w-3.5 h-3.5" />
                <span>Gestionar Equipo</span>
              </button>
            )}

            {/* Exportar CSV */}
            <button
              type="button"
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition shadow-2xs"
              title="Descargar lista filtrada en archivo Excel / CSV"
            >
              <Download className="w-3.5 h-3.5 text-amber-400" />
              <span>Exportar CSV</span>
            </button>

            {sheetMeta && (
              <a
                href={sheetMeta.url}
                target="_blank"
                rel="noopener noreferrer"
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
              >
                <ExternalLink className="w-3.5 h-3.5 text-emerald-600" />
                <span>Google Sheets</span>
              </a>
            )}

            <div className="inline-flex p-1 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setViewMode('kanban')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold transition ${
                  viewMode === 'kanban'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Kanban</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold transition ${
                  viewMode === 'list'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <ListFilter className="w-3.5 h-3.5" />
                <span>Lista</span>
              </button>
            </div>
          </div>
        </div>

        {/* 4. FILTRO PERSONAL DE TAREAS OPERATIVAS */}
        <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-slate-50 dark:from-amber-950/30 dark:via-slate-800/40 dark:to-slate-850 border border-amber-300 dark:border-amber-700/60 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
              <UserCheck className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Filtro Personal de Tareas</span>
                {assignedToFilter !== 'Todos' && (
                  <span className="px-2 py-0.5 rounded-full bg-amber-600 text-white text-[10px] font-bold">
                    Activo: {filteredIncidents.length} tarea(s)
                  </span>
                )}
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                Selecciona tu nombre para consultar de inmediato tus incidencias asignadas
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 self-stretch sm:self-auto">
            <label
              htmlFor="assignedFilterSelect"
              className="text-xs font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap"
            >
              Ver solo asignadas a:
            </label>
            <select
              id="assignedFilterSelect"
              value={assignedToFilter}
              onChange={(e) => setAssignedToFilter(e.target.value)}
              className="flex-1 sm:w-64 px-3 py-1.5 rounded-lg border border-amber-400/80 dark:border-amber-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold text-xs focus:ring-2 focus:ring-amber-500 shadow-2xs"
            >
              <option value="Todos">Todos los responsables ({incidents.length})</option>
              <option value="Sin asignar">⚠️ Sin asignar / Por despachar</option>
              {staffList.map((st) => (
                <option key={st.id} value={st.email}>
                  {st.name} — {st.role}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Fila de Filtros Avanzados */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
          
          {/* Turnos de Guardia */}
          <div className="col-span-1 bg-amber-50/70 dark:bg-amber-950/30 p-1.5 rounded-lg border border-amber-200 dark:border-amber-800/60">
            <label className="block text-[10px] font-black uppercase text-amber-900 dark:text-amber-300 mb-0.5 flex items-center gap-1">
              <Clock className="w-3 h-3 text-amber-700 dark:text-amber-400" />
              <span>Turno Guardia</span>
            </label>
            <select
              value={shiftFilter}
              onChange={(e) => setShiftFilter(e.target.value as ShiftType)}
              className="w-full px-2 py-1 rounded border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-800 text-amber-950 dark:text-amber-200 font-bold"
            >
              <option value="Todos">Todos los Turnos</option>
              <option value="Turno Mañana">Turno Mañana (07-15h)</option>
              <option value="Turno Tarde">Turno Tarde (15-23h)</option>
            </select>
          </div>

          {/* Estado */}
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">Estado</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white font-medium"
            >
              <option value="Todos">Todos los Estados</option>
              <option value="Pendiente">Pendiente / Triaje</option>
              <option value="En Curso">En Curso / Despachado</option>
              <option value="Resuelto">Resuelto y Cerrado</option>
            </select>
          </div>

          {/* Urgencia */}
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">Urgencia</label>
            <select
              value={urgencyFilter}
              onChange={(e) => setUrgencyFilter(e.target.value as any)}
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white font-medium"
            >
              <option value="Todos">Todas las Urgencias</option>
              <option value="Alta">🔴 Alta (Inmediata)</option>
              <option value="Media">🟡 Media (Hoy)</option>
              <option value="Baja">🟢 Baja (Rutina)</option>
            </select>
          </div>

          {/* Sector */}
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">Sector</label>
            <select
              value={sectorFilter}
              onChange={(e) => setSectorFilter(e.target.value as any)}
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white font-medium truncate"
            >
              <option value="Todos">Todos los Sectores</option>
              {SECTORS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* Categoría */}
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">Categoría</label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value as any)}
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white font-medium truncate"
            >
              <option value="Todos">Todas las Categorías</option>
              {CATEGORIES.map((c) => (
                <option key={c.label} value={c.label}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          {/* Organización */}
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">Organización</label>
            <select
              value={orgFilter}
              onChange={(e) => setOrgFilter(e.target.value as any)}
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white font-medium truncate"
            >
              <option value="Todos">Todas las Entidades</option>
              {ORGANIZATIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Resumen de Filtros Activos */}
        {hasActiveFilters && (
          <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 p-2 rounded-lg">
            <span>
              Mostrando <strong>{filteredIncidents.length}</strong> de <strong>{incidents.length}</strong> incidencias
            </span>
            <button
              type="button"
              onClick={resetFilters}
              className="text-amber-800 dark:text-amber-400 hover:underline font-bold"
            >
              Restablecer filtros
            </button>
          </div>
        )}

      </div>

      {/* Renderizado de Vistas: KANBAN vs LISTA */}
      {viewMode === 'kanban' ? (
        /* TABLERO KANBAN INTERACTIVO */
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {kanbanColumns.map((col) => {
            const columnIncidents = filteredIncidents.filter((i) => i.status === col.status);

            return (
              <div
                key={col.status}
                className="bg-slate-100/90 dark:bg-slate-900/90 rounded-2xl p-4 border border-slate-200/90 dark:border-slate-800 flex flex-col min-h-[520px]"
              >
                {/* Cabecera de Columna */}
                <div className={`p-3 rounded-xl ${col.color} border ${col.border} mb-3 flex items-center justify-between shadow-2xs`}>
                  <div className="flex items-center gap-2">
                    <h3 className="font-black text-sm tracking-tight">{col.title}</h3>
                  </div>
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-full bg-white dark:bg-slate-800 shadow-2xs">
                    {columnIncidents.length}
                  </span>
                </div>

                {/* Tarjetas de la Columna */}
                <div className="space-y-3 flex-1 overflow-y-auto">
                  {columnIncidents.length === 0 ? (
                    <div className="h-32 flex items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-400 font-medium">
                      Sin incidencias en este estado
                    </div>
                  ) : (
                    columnIncidents.map((incident) => (
                      <IncidentCard
                        key={incident.incidentId}
                        incident={incident}
                        onOpenDetail={onOpenDetail}
                        onRequestStatusChange={onRequestStatusChange}
                        onZoomPhoto={onZoomPhoto}
                        isCoordinator={isCoordinator}
                        onOpenPinLogin={onOpenPinLogin}
                      />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* VISTA DE TABLA PRIORITARIA */
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800 text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-bold uppercase tracking-wider">
                <tr>
                  <th scope="col" className="px-4 py-3.5">Código & Urgencia</th>
                  <th scope="col" className="px-4 py-3.5">Estado</th>
                  <th scope="col" className="px-4 py-3.5">Tiempo</th>
                  <th scope="col" className="px-4 py-3.5">Sector & Ubicación</th>
                  <th scope="col" className="px-4 py-3.5">Categoría</th>
                  <th scope="col" className="px-4 py-3.5">Descripción</th>
                  <th scope="col" className="px-4 py-3.5">Informante</th>
                  <th scope="col" className="px-4 py-3.5">Asignado</th>
                  <th scope="col" className="px-4 py-3.5 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                {filteredIncidents.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-12 text-center text-slate-400 text-sm">
                      No hay incidencias que coincidan con la búsqueda.
                    </td>
                  </tr>
                ) : (
                  filteredIncidents.map((inc) => {
                    const timeInfo = getElapsedTime(inc.timestamp);
                    const isHigh = inc.urgency === 'Alta';

                    return (
                      <tr
                        key={inc.incidentId}
                        className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 transition ${
                          isHigh && inc.status !== 'Resuelto'
                            ? 'bg-red-50/50 dark:bg-red-950/20 font-medium'
                            : ''
                        }`}
                      >
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-slate-900 dark:text-slate-100 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-300 dark:border-slate-700">
                              {inc.incidentId}
                            </span>
                            <span
                              className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                                isHigh
                                  ? 'bg-red-600 text-white animate-pulse'
                                  : inc.urgency === 'Media'
                                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-700'
                                  : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              }`}
                            >
                              {inc.urgency}
                            </span>
                          </div>
                        </td>

                        <td className="px-4 py-3 whitespace-nowrap">
                          <span
                            className={`text-[11px] font-semibold px-2 py-0.5 rounded-md border ${
                              inc.status === 'Pendiente'
                                ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-300 border-amber-300 dark:border-amber-700'
                                : inc.status === 'En Curso'
                                ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-900 dark:text-blue-300 border-blue-300 dark:border-blue-700'
                                : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700'
                            }`}
                          >
                            {inc.status}
                          </span>
                        </td>

                        <td className="px-4 py-3 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1 font-mono text-[11px] px-1.5 py-0.5 rounded ${
                              inc.status === 'Pendiente' && timeInfo.isOverdue
                                ? 'bg-red-100 dark:bg-red-950/60 text-red-800 dark:text-red-300 font-bold'
                                : 'text-slate-600 dark:text-slate-400'
                            }`}
                          >
                            <Clock className="w-3 h-3 text-slate-400" />
                            <span>{timeInfo.formatted}</span>
                          </span>
                        </td>

                        <td className="px-4 py-3">
                          <div className="font-bold text-slate-900 dark:text-white">
                            {inc.sector === 'Otro / Especificar' && inc.customSector ? inc.customSector : inc.sector}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[160px]">
                            {inc.exactLocation}
                          </div>
                        </td>

                        <td className="px-4 py-3 whitespace-nowrap text-slate-700 dark:text-slate-300 font-medium">
                          {inc.category === 'Otra' && inc.customCategory
                            ? `Otra: ${inc.customCategory}`
                            : inc.category}
                        </td>

                        <td className="px-4 py-3">
                          <p className="text-slate-700 dark:text-slate-300 truncate max-w-[220px]" title={inc.description}>
                            {inc.description}
                          </p>
                        </td>

                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="font-bold text-slate-900 dark:text-white">{inc.reporterName}</div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400">{inc.organization}</div>
                        </td>

                        <td className="px-4 py-3 whitespace-nowrap text-slate-600 dark:text-slate-400">
                          {inc.assignedTo ? (
                            <span className="truncate max-w-[120px] block font-medium" title={inc.assignedTo}>
                              {inc.assignedTo.split('@')[0]}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic">Sin asignar</span>
                          )}
                        </td>

                        <td className="px-4 py-3 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => onOpenDetail(inc)}
                              className="p-1.5 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                              title="Ver Ficha Detallada"
                            >
                              <Eye className="w-4 h-4" />
                            </button>

                            {/* Acciones protegidas por PIN */}
                            {isCoordinator ? (
                              <>
                                {inc.status === 'Pendiente' && (
                                  <button
                                    type="button"
                                    onClick={() => onRequestStatusChange(inc, 'En Curso')}
                                    className="px-2 py-1 bg-blue-600 text-white rounded text-[11px] font-bold hover:bg-blue-700 transition"
                                  >
                                    Despachar
                                  </button>
                                )}
                                {inc.status === 'En Curso' && (
                                  <button
                                    type="button"
                                    onClick={() => onRequestStatusChange(inc, 'Resuelto')}
                                    className="px-2 py-1 bg-emerald-600 text-white rounded text-[11px] font-bold hover:bg-emerald-700 transition"
                                  >
                                    Resolver
                                  </button>
                                )}
                                {inc.status === 'Resuelto' && (
                                  <button
                                    type="button"
                                    onClick={() => onRequestStatusChange(inc, 'En Curso')}
                                    className="px-2 py-1 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded text-[11px] font-bold hover:bg-slate-300 dark:hover:bg-slate-600 transition"
                                  >
                                    Reabrir
                                  </button>
                                )}
                              </>
                            ) : (
                              <button
                                type="button"
                                onClick={onOpenPinLogin}
                                className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded text-[10px] font-semibold hover:bg-amber-100 hover:text-amber-800 transition"
                                title="Ingresa PIN para editar estado"
                              >
                                <Lock className="w-3 h-3" />
                                <span>PIN</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
};

/**
 * Tarjeta de Incidencia para Tablero Kanban
 */
const IncidentCard: React.FC<{
  incident: Incident;
  onOpenDetail: (i: Incident) => void;
  onRequestStatusChange: (i: Incident, newStatus: IncidentStatus) => void;
  onZoomPhoto: (url: string, title: string) => void;
  isCoordinator: boolean;
  onOpenPinLogin: () => void;
}> = ({
  incident,
  onOpenDetail,
  onRequestStatusChange,
  onZoomPhoto,
  isCoordinator,
  onOpenPinLogin,
}) => {
  const isHigh = incident.urgency === 'Alta';
  const timeInfo = getElapsedTime(incident.timestamp);
  const shift = getShiftFromTimestamp(incident.timestamp);

  return (
    <div
      className={`bg-white dark:bg-slate-900 rounded-xl p-4 shadow-xs border transition-all hover:shadow-md ${
        isHigh && incident.status !== 'Resuelto'
          ? 'border-red-500 dark:border-red-600 ring-2 ring-red-200 dark:ring-red-950/60 shadow-sm'
          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
      }`}
    >
      {/* Cabecera de la Tarjeta */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="font-mono text-xs font-bold text-slate-900 dark:text-slate-100 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-300 dark:border-slate-700">
            {incident.incidentId}
          </span>
          <span
            className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
              isHigh
                ? 'bg-red-600 text-white animate-pulse'
                : incident.urgency === 'Media'
                ? 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-700'
                : 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-300'
            }`}
          >
            {incident.urgency}
          </span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-mono">
            {shift}
          </span>
        </div>

        {/* Contador de tiempo transcurrido */}
        <span
          className={`text-[11px] font-mono flex items-center gap-1 ${
            incident.status === 'Pendiente' && timeInfo.isOverdue
              ? 'text-red-600 dark:text-red-400 font-bold animate-pulse'
              : 'text-slate-500 dark:text-slate-400'
          }`}
          title={`Reportado a las ${incident.timestamp}`}
        >
          <Clock className="w-3 h-3" />
          <span>{timeInfo.formatted}</span>
        </span>
      </div>

      {/* Sector y Categoría */}
      <div className="mb-2">
        <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800 dark:text-amber-400">
          {incident.category === 'Otra' && incident.customCategory
            ? `Otra: ${incident.customCategory}`
            : incident.category}
        </span>
        <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1 mt-0.5">
          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span className="truncate">
            {incident.exactLocation ||
              (incident.sector === 'Otro / Especificar' && incident.customSector
                ? incident.customSector
                : incident.sector)}
          </span>
        </h4>
        <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
          Sector:{' '}
          {incident.sector === 'Otro / Especificar' && incident.customSector
            ? incident.customSector
            : incident.sector}
        </div>
      </div>

      {/* Descripción Breve */}
      <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 mb-3 bg-slate-50 dark:bg-slate-800/60 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
        {incident.description}
      </p>

      {/* Miniatura de Evidencia con Zoom directo */}
      {incident.evidencePhoto && (
        <div
          onClick={() =>
            onZoomPhoto(
              incident.evidencePhoto!,
              `Evidencia ${incident.incidentId} - ${incident.exactLocation}`
            )
          }
          className="mb-3 flex items-center gap-2 p-1.5 bg-amber-50/80 dark:bg-amber-950/40 rounded-lg border border-amber-200 dark:border-amber-800/60 cursor-pointer hover:bg-amber-100 dark:hover:bg-amber-900/40 transition"
        >
          <img
            src={incident.evidencePhoto}
            alt="Evidencia miniatura"
            className="w-8 h-8 rounded object-cover shrink-0"
          />
          <div className="flex-1 min-w-0">
            <span className="text-[11px] font-bold text-amber-900 dark:text-amber-300 block truncate">
              Foto de Evidencia Adjunta
            </span>
            <span className="text-[10px] text-amber-700 dark:text-amber-400">Clic para ampliar</span>
          </div>
        </div>
      )}

      {/* Comentarios de Seguimiento Registrados */}
      {incident.progressComments && incident.progressComments.length > 0 && (
        <div className="mb-3 text-[11px] text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <span className="text-slate-400">Último avance:</span>
          <span className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[130px]">
            {incident.progressComments[incident.progressComments.length - 1].text}
          </span>
        </div>
      )}

      {/* Informante y Organización */}
      <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pb-3 border-b border-slate-100 dark:border-slate-800 mb-3">
        <div className="flex items-center gap-1 truncate max-w-[130px]">
          <User className="w-3 h-3 shrink-0" />
          <span className="truncate font-semibold text-slate-700 dark:text-slate-300">{incident.reporterName}</span>
        </div>
        <div className="text-slate-500 dark:text-slate-400 font-medium text-[10px] truncate max-w-[120px]" title={incident.organization}>
          {incident.organization}
        </div>
      </div>

      {/* Botones de Acción (Condicionados por Modo Coordinador) */}
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => onOpenDetail(incident)}
          className="text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 px-2.5 py-1 rounded-lg transition"
        >
          Ver Ficha
        </button>

        <div className="flex items-center gap-1">
          {isCoordinator ? (
            <>
              {incident.status === 'Pendiente' && (
                <button
                  type="button"
                  onClick={() => onRequestStatusChange(incident, 'En Curso')}
                  className="inline-flex items-center gap-1 px-3 py-1 text-xs font-bold rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-2xs transition"
                  title="Mover a En Curso en Google Sheets"
                >
                  <Play className="w-3 h-3" />
                  <span>Despachar</span>
                </button>
              )}

              {incident.status === 'En Curso' && (
                <button
                  type="button"
                  onClick={() => onRequestStatusChange(incident, 'Resuelto')}
                  className="inline-flex items-center gap-1 px-3 py-1 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs transition"
                  title="Marcar como Resuelto en Google Sheets"
                >
                  <CheckCircle className="w-3 h-3" />
                  <span>Resolver</span>
                </button>
              )}

              {incident.status === 'Resuelto' && (
                <button
                  type="button"
                  onClick={() => onRequestStatusChange(incident, 'En Curso')}
                  className="inline-flex items-center gap-1 px-3 py-1 text-xs font-bold rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 transition"
                  title="Reabrir incidencia en Google Sheets"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reabrir</span>
                </button>
              )}
            </>
          ) : (
            <button
              type="button"
              onClick={onOpenPinLogin}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-amber-100 hover:text-amber-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 transition"
              title="Acceso restringido: Ingresar PIN de coordinador"
            >
              <Lock className="w-3 h-3" />
              <span>Despacho (PIN)</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
