import React, { useState, useEffect, useRef } from 'react';
import {
  Incident,
  IncidentCategory,
  IncidentSector,
  OrganizationOption,
  UrgencyLevel,
  CATEGORIES,
  SECTORS,
  ORGANIZATIONS,
} from '../types/incident';
import { AntiDuplicateWidget } from './AntiDuplicateWidget';
import { compressImage } from '../utils/imageCompressor';
import { playHighUrgencySound } from '../utils/audioAlert';
import {
  Camera,
  Upload,
  X,
  AlertTriangle,
  Send,
  CheckCircle2,
  Cpu,
  Sparkles,
  Armchair,
  ShieldAlert,
  Users,
  Coffee,
  HelpCircle,
  Bell,
  Volume2,
} from 'lucide-react';
import { User } from 'firebase/auth';

interface Props {
  user: User | null;
  activeIncidents: Incident[];
  nextId: string;
  onSubmitIncident: (incident: Incident) => Promise<void>;
  onViewIncidentDetail?: (incident: Incident) => void;
  isSubmitting: boolean;
}

const CATEGORY_ICONS: Record<IncidentCategory, React.ComponentType<{ className?: string }>> = {
  'Técnica / Audiovisual': Cpu,
  'Limpieza e Higiene': Sparkles,
  'Mobiliario y Señaléctica': Armchair,
  'Seguridad y Salud': ShieldAlert,
  'Control de Acceso / Aforo': Users,
  'Logística y Catering': Coffee,
  'Otra': HelpCircle,
};

export const IncidentForm: React.FC<Props> = ({
  user,
  activeIncidents,
  nextId,
  onSubmitIncident,
  onViewIncidentDetail,
  isSubmitting,
}) => {
  const getFormattedNow = () => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(
      now.getHours()
    )}:${pad(now.getMinutes())}`;
  };

  // Form State
  const [reporterName, setReporterName] = useState(user?.displayName || '');
  const [reporterEmail, setReporterEmail] = useState(user?.email || '');
  const [organization, setOrganization] = useState<OrganizationOption>('Museo Patagónico');
  const [category, setCategory] = useState<IncidentCategory>('Técnica / Audiovisual');
  const [customCategory, setCustomCategory] = useState('');
  const [urgency, setUrgency] = useState<UrgencyLevel>('Media');
  const [sector, setSector] = useState<IncidentSector>('Auditorio Principal');
  const [customSector, setCustomSector] = useState('');
  const [exactLocation, setExactLocation] = useState('');
  const [description, setDescription] = useState('');
  const [evidencePhoto, setEvidencePhoto] = useState<string | undefined>(undefined);
  const [isCompressingPhoto, setIsCompressingPhoto] = useState(false);

  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submittedIncident, setSubmittedIncident] = useState<Incident | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) {
      if (!reporterName && user.displayName) setReporterName(user.displayName);
      if (!reporterEmail && user.email) setReporterEmail(user.email);
    }
  }, [user]);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsCompressingPhoto(true);
      const compressedDataUrl = await compressImage(file, 480, 480, 0.65);
      setEvidencePhoto(compressedDataUrl);
    } catch (err) {
      console.error('Error al comprimir foto:', err);
      alert('No se pudo procesar la imagen. Por favor selecciona una foto JPG o PNG válida.');
    } finally {
      setIsCompressingPhoto(false);
    }
  };

  const removePhoto = () => {
    setEvidencePhoto(undefined);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!reporterName.trim()) newErrors.reporterName = 'El nombre del informante es obligatorio.';
    if (!reporterEmail.trim()) {
      newErrors.reporterEmail = 'El correo electrónico es obligatorio.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(reporterEmail)) {
      newErrors.reporterEmail = 'Ingresa un correo electrónico válido.';
    }
    if (category === 'Otra' && !customCategory.trim()) {
      newErrors.customCategory = 'Por favor especifica la categoría personalizada.';
    }
    if (sector === 'Otro / Especificar' && !customSector.trim()) {
      newErrors.customSector = 'Por favor especifica el sector o área manualmente.';
    }
    if (!exactLocation.trim()) {
      newErrors.exactLocation = 'La ubicación exacta es obligatoria (ej. Fila 4, Stand 12, Baño 1er piso).';
    }
    if (!description.trim()) {
      newErrors.description = 'La descripción de la incidencia es obligatoria.';
    } else if (description.trim().length < 8) {
      newErrors.description = 'Ingresa al menos 8 caracteres describiendo la situación.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      window.scrollTo({ top: 120, behavior: 'smooth' });
      return;
    }

    const newIncident: Incident = {
      incidentId: nextId,
      timestamp: getFormattedNow(),
      reporterName: reporterName.trim(),
      reporterEmail: reporterEmail.trim(),
      organization,
      category,
      customCategory: category === 'Otra' ? customCategory.trim() : undefined,
      urgency,
      sector,
      customSector: sector === 'Otro / Especificar' ? customSector.trim() : undefined,
      exactLocation: exactLocation.trim(),
      description: description.trim(),
      evidencePhoto,
      status: 'Pendiente',
      assignedTo: '',
      resolutionNotes: '',
      progressComments: [],
    };

    try {
      await onSubmitIncident(newIncident);
      setSubmittedIncident(newIncident);

      // Reproducir sonido si la urgencia es ALTA
      if (urgency === 'Alta') {
        playHighUrgencySound();
      }

      // Reiniciar campos dinámicos
      setExactLocation('');
      setDescription('');
      setCustomCategory('');
      setEvidencePhoto(undefined);
      if (fileInputRef.current) fileInputRef.current.value = '';
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      console.error('Error al registrar incidencia:', err);
      alert(`Error al registrar incidencia: ${err.message || 'Verifica tu conexión y reintenta.'}`);
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-6 px-4 sm:px-6">
      
      {/* 3. SISTEMA DE NOTIFICACIONES DIFERENCIADAS SEGÚN URGENCIA */}
      {submittedIncident && (
        <div className="mb-6">
          {submittedIncident.urgency === 'Alta' ? (
            /* URGENCIA ALTA: Notificación de alto impacto, parpadeo y borde rojo */
            <div className="rounded-2xl border-4 border-red-600 bg-red-700 text-white p-5 shadow-2xl animate-in zoom-in-95 duration-300">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-white text-red-700 flex items-center justify-center shrink-0 animate-bounce shadow-md">
                  <AlertTriangle className="w-7 h-7" />
                </div>
                <div className="flex-1">
                  <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-white text-red-700 text-xs font-black uppercase tracking-wider mb-1.5 shadow-2xs">
                    <Volume2 className="w-3.5 h-3.5 animate-pulse" />
                    <span>ALERTA DE ACCIÓN INMEDIATA TRANSMITIDA</span>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-black text-white">
                    Incidencia {submittedIncident.incidentId} Registrada
                  </h3>
                  <p className="mt-1 text-sm text-red-100 font-medium">
                    Señal de respuesta prioritaria enviada a los coordinadores y equipo de piso para acudir inmediatamente a{' '}
                    <strong>
                      {submittedIncident.sector === 'Otro / Especificar' && submittedIncident.customSector
                        ? submittedIncident.customSector
                        : submittedIncident.sector}
                    </strong>{' '}
                    ({submittedIncident.exactLocation}).
                  </p>
                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setSubmittedIncident(null)}
                      className="px-4 py-2 bg-white text-red-700 font-bold text-sm rounded-xl hover:bg-red-50 transition shadow-sm"
                    >
                      Reportar Otra Incidencia
                    </button>
                    {onViewIncidentDetail && (
                      <button
                        type="button"
                        onClick={() => onViewIncidentDetail(submittedIncident)}
                        className="px-4 py-2 bg-red-900 text-white font-bold text-sm rounded-xl hover:bg-black transition border border-red-400"
                      >
                        Ver en Panel de Coordinación
                      </button>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSubmittedIncident(null)}
                  className="text-red-200 hover:text-white p-1 rounded-md"
                  aria-label="Cerrar notificación de urgencia alta"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
          ) : submittedIncident.urgency === 'Media' ? (
            /* URGENCIA MEDIA: Banner estándar en color naranja */
            <div className="rounded-xl border-2 border-amber-500 bg-amber-50 text-amber-950 p-4 shadow-md flex items-start justify-between gap-3 animate-in fade-in duration-300">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center shrink-0 mt-0.5">
                  <Bell className="w-5 h-5" />
                </div>
                <div>
                  <div className="inline-block px-2 py-0.5 rounded text-[11px] font-bold bg-amber-200 text-amber-900 mb-0.5">
                    ATENCIÓN HOY
                  </div>
                  <h4 className="font-bold text-amber-950 text-sm sm:text-base">
                    Incidencia {submittedIncident.incidentId} registrada correctamente
                  </h4>
                  <p className="text-xs text-amber-800 mt-0.5">
                    Se sumó a la cola de atención del día en{' '}
                    <strong>
                      {submittedIncident.sector === 'Otro / Especificar' && submittedIncident.customSector
                        ? submittedIncident.customSector
                        : submittedIncident.sector}
                    </strong>
                    . Los encargados han sido avisados.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSubmittedIncident(null)}
                className="text-amber-800 hover:text-amber-950 p-1 rounded-md"
                aria-label="Cerrar aviso de urgencia media"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            /* URGENCIA BAJA: Confirmación sutil y discreta en la parte inferior/superior sin estrés */
            <div className="rounded-lg border border-slate-300 bg-slate-100 text-slate-800 p-3 shadow-2xs flex items-center justify-between gap-3 animate-in fade-in duration-300">
              <div className="flex items-center gap-2 text-xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  <strong>Aviso registrado sin interrupción:</strong> {submittedIncident.incidentId} añadido al registro general de rutina.
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSubmittedIncident(null)}
                className="text-slate-500 hover:text-slate-800 text-xs font-semibold px-2 py-0.5 rounded"
              >
                Entendido
              </button>
            </div>
          )}
        </div>
      )}

      {/* Formulario Principal de Reporte */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-md border border-slate-200/90 dark:border-slate-800 overflow-hidden text-slate-900 dark:text-white">
        
        {/* Cabecera del formulario */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-amber-950 text-white px-6 py-5">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-amber-400 text-xs font-bold uppercase tracking-wider">
                Operaciones del Evento
              </span>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white mt-0.5">
                Nuevo Reporte de Incidencia
              </h2>
            </div>
            <div className="text-right">
              <span className="text-[11px] text-slate-400 uppercase font-mono block">Código</span>
              <span className="text-base sm:text-lg font-mono font-bold text-amber-300 bg-slate-800/80 px-2.5 py-1 rounded border border-slate-700">
                {nextId}
              </span>
            </div>
          </div>
          <p className="text-xs text-slate-300 mt-2">
            Formulario móvil para voluntarios, coordinadores y personal del Congreso Herpetológico 2026.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          
          {/* Selector de Urgencia */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
              Nivel de Urgencia <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              {(
                [
                  { level: 'Baja', label: 'Baja', desc: 'Rutina / Minor' },
                  { level: 'Media', label: 'Media', desc: 'Atención Hoy' },
                  { level: 'Alta', label: 'Alta', desc: 'Acción Inmediata' },
                ] as { level: UrgencyLevel; label: string; desc: string }[]
              ).map(({ level, label, desc }) => {
                const isSelected = urgency === level;
                let activeStyle = '';
                if (isSelected) {
                  if (level === 'Alta') activeStyle = 'bg-red-600 text-white border-red-600 shadow-md ring-2 ring-red-400';
                  else if (level === 'Media') activeStyle = 'bg-amber-500 text-white border-amber-500 shadow-md ring-2 ring-amber-300';
                  else activeStyle = 'bg-emerald-600 text-white border-emerald-600 shadow-md ring-2 ring-emerald-300';
                } else {
                  activeStyle = 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700';
                }

                return (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setUrgency(level)}
                    className={`py-3 px-2 sm:px-3 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-0.5 ${activeStyle}`}
                  >
                    <span className="text-sm font-black">{label}</span>
                    <span className="text-[10px] opacity-90 truncate max-w-full">
                      {desc}
                    </span>
                  </button>
                );
              })}
            </div>
            {urgency === 'Alta' && (
              <div className="mt-2 text-xs text-red-700 dark:text-red-300 font-semibold flex items-center gap-1.5 bg-red-50 dark:bg-red-950/40 p-2.5 rounded-lg border border-red-200 dark:border-red-900">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                <span>
                  Urgencia Alta activará una alarma visual y sonora prioritaria en los monitores de coordinación.
                </span>
              </div>
            )}
          </div>

          {/* Sector y Radar Anti-Duplicados */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
              Sector / Área del Evento <span className="text-red-500">*</span>
            </label>
            <select
              value={sector}
              onChange={(e) => {
                const val = e.target.value as IncidentSector;
                setSector(val);
                if (val !== 'Otro / Especificar') {
                  setCustomSector('');
                  if (errors.customSector) {
                    const { customSector: _, ...rest } = errors;
                    setErrors(rest);
                  }
                }
              }}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-amber-500 text-sm shadow-2xs"
            >
              {SECTORS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>

            {/* 2. CAMPO DINÁMICO CUANDO SECTOR ES "OTRO / ESPECIFICAR" */}
            {sector === 'Otro / Especificar' && (
              <div className="mt-3 p-3.5 bg-amber-50/80 dark:bg-amber-950/40 rounded-xl border border-amber-300 dark:border-amber-700 animate-in fade-in slide-in-from-top-2 duration-200">
                <label className="block text-xs font-bold text-amber-950 dark:text-amber-300 uppercase mb-1">
                  Especificar Sector / Área Manualmente <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  value={customSector}
                  onChange={(e) => {
                    setCustomSector(e.target.value);
                    if (errors.customSector) setErrors({ ...errors, customSector: '' });
                  }}
                  placeholder="Escribe el sector o espacio específico (ej: Sala de Prensa, Terraza Ponientes, Depósito)"
                  className={`w-full px-3.5 py-2 rounded-lg border text-sm text-slate-900 dark:text-white bg-white dark:bg-slate-800 focus:ring-2 focus:ring-amber-500 ${
                    errors.customSector ? 'border-red-500 bg-red-50' : 'border-amber-300 dark:border-amber-700'
                  }`}
                  autoFocus
                />
                {errors.customSector && (
                  <p className="mt-1 text-xs text-red-600 font-semibold">{errors.customSector}</p>
                )}
              </div>
            )}

            {/* Widget Anti-Duplicados */}
            <AntiDuplicateWidget
              sector={sector}
              activeIncidents={activeIncidents}
              onSelectIncident={onViewIncidentDetail}
            />
          </div>

          {/* Ubicación Exacta */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
              Ubicación Exacta / Referencia <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={exactLocation}
              onChange={(e) => {
                setExactLocation(e.target.value);
                if (errors.exactLocation) setErrors({ ...errors, exactLocation: '' });
              }}
              placeholder="Ej: Fila 4 al medio, Puerta B, Stand 14, Cabina técnica"
              className={`w-full px-3.5 py-2.5 rounded-xl border text-sm text-slate-900 dark:text-white bg-white dark:bg-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-amber-500 ${
                errors.exactLocation ? 'border-red-500 bg-red-50/40' : 'border-slate-300 dark:border-slate-700'
              }`}
            />
            {errors.exactLocation && (
              <p className="mt-1 text-xs text-red-600 font-medium">{errors.exactLocation}</p>
            )}
          </div>

          {/* Categoría de Incidencia y Campo Dinámico "Otra" */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
              Categoría de la Incidencia <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {CATEGORIES.map((cat) => {
                const IconComponent = CATEGORY_ICONS[cat.label] || HelpCircle;
                const isSelected = category === cat.label;
                return (
                  <button
                    key={cat.label}
                    type="button"
                    onClick={() => {
                      setCategory(cat.label);
                      if (cat.label !== 'Otra') setCustomCategory('');
                    }}
                    className={`flex items-center gap-2 p-2.5 sm:p-3 rounded-xl border text-left text-xs transition-all ${
                      isSelected
                        ? 'border-amber-600 bg-amber-50/90 dark:bg-amber-950/40 text-amber-950 dark:text-amber-200 font-bold shadow-xs ring-1 ring-amber-500'
                        : 'border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium'
                    }`}
                  >
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                        isSelected ? 'bg-amber-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      <IconComponent className="w-4 h-4" />
                    </div>
                    <span className="truncate">{cat.label}</span>
                  </button>
                );
              })}
            </div>

            {/* 1. CAMPO DINÁMICO CUANDO CATEGORÍA ES "OTRA" */}
            {category === 'Otra' && (
              <div className="mt-3 p-3.5 bg-amber-50/80 dark:bg-amber-950/40 rounded-xl border border-amber-300 dark:border-amber-700 animate-in fade-in slide-in-from-top-2 duration-200">
                <label className="block text-xs font-bold text-amber-950 dark:text-amber-300 uppercase mb-1">
                  Especificar Categoría Personalizada <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  value={customCategory}
                  onChange={(e) => {
                    setCustomCategory(e.target.value);
                    if (errors.customCategory) setErrors({ ...errors, customCategory: '' });
                  }}
                  placeholder="Escribe la categoría (ej: Climatización, Redes/Streaming, Protocolo)"
                  className={`w-full px-3.5 py-2 rounded-lg border text-sm text-slate-900 dark:text-white bg-white dark:bg-slate-800 focus:ring-2 focus:ring-amber-500 ${
                    errors.customCategory ? 'border-red-500 bg-red-50' : 'border-amber-300 dark:border-amber-700'
                  }`}
                  autoFocus
                />
                {errors.customCategory && (
                  <p className="mt-1 text-xs text-red-600 font-semibold">{errors.customCategory}</p>
                )}
              </div>
            )}
          </div>

          {/* 2. ORGANIZACIONES OFICIALES (3 ENTIDADES) */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
              Organización Responsable / Pertenencia <span className="text-red-500">*</span>
            </label>
            <select
              value={organization}
              onChange={(e) => setOrganization(e.target.value as OrganizationOption)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-semibold focus:ring-2 focus:ring-amber-500 shadow-2xs"
            >
              {ORGANIZATIONS.map((org) => (
                <option key={org.value} value={org.value}>
                  {org.label}
                </option>
              ))}
            </select>
          </div>

          {/* Datos del Informante */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                Nombre de quien Reporta <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={reporterName}
                onChange={(e) => {
                  setReporterName(e.target.value);
                  if (errors.reporterName) setErrors({ ...errors, reporterName: '' });
                }}
                placeholder="Nombre y Apellido"
                className={`w-full px-3.5 py-2.5 rounded-xl border text-sm text-slate-900 dark:text-white bg-white dark:bg-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-amber-500 ${
                  errors.reporterName ? 'border-red-500 bg-red-50/40' : 'border-slate-300 dark:border-slate-700'
                }`}
              />
              {errors.reporterName && (
                <p className="mt-1 text-xs text-red-600 font-medium">{errors.reporterName}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                Correo Electrónico <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={reporterEmail}
                onChange={(e) => {
                  setReporterEmail(e.target.value);
                  if (errors.reporterEmail) setErrors({ ...errors, reporterEmail: '' });
                }}
                placeholder="contacto@organizacion.org"
                className={`w-full px-3.5 py-2.5 rounded-xl border text-sm text-slate-900 dark:text-white bg-white dark:bg-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-amber-500 ${
                  errors.reporterEmail ? 'border-red-500 bg-red-50/40' : 'border-slate-300 dark:border-slate-700'
                }`}
              />
              {errors.reporterEmail && (
                <p className="mt-1 text-xs text-red-600 font-medium">{errors.reporterEmail}</p>
              )}
            </div>
          </div>

          {/* Descripción Detallada */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
              Descripción de la Situación <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={4}
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                if (errors.description) setErrors({ ...errors, description: '' });
              }}
              placeholder="Explica qué ocurre con claridad: ¿Qué equipo o área falla? ¿Afecta a ponentes o público? ¿Se requiere material urgente?"
              className={`w-full px-3.5 py-2.5 rounded-xl border text-sm text-slate-900 dark:text-white bg-white dark:bg-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-amber-500 ${
                errors.description ? 'border-red-500 bg-red-50/40' : 'border-slate-300 dark:border-slate-700'
              }`}
            />
            {errors.description && (
              <p className="mt-1 text-xs text-red-600 font-medium">{errors.description}</p>
            )}
          </div>

          {/* Adjuntar Foto de Evidencia */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Foto de Evidencia (Opcional)
            </label>

            {evidencePhoto ? (
              <div className="relative inline-block border-2 border-amber-300 rounded-xl overflow-hidden bg-slate-900">
                <img
                  src={evidencePhoto}
                  alt="Vista previa evidencia"
                  className="w-48 h-36 object-cover"
                />
                <button
                  type="button"
                  onClick={removePhoto}
                  className="absolute top-2 right-2 bg-red-600/90 hover:bg-red-700 text-white p-1 rounded-full shadow-md transition-colors"
                  title="Quitar foto"
                >
                  <X className="w-4 h-4" />
                </button>
                <div className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-[10px] px-2 py-0.5 text-center">
                  Foto Adjunta Lista
                </div>
              </div>
            ) : (
              <div>
                <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-300 hover:border-amber-500 rounded-2xl cursor-pointer bg-slate-50/80 hover:bg-amber-50/30 transition-all">
                  <div className="flex items-center gap-3 text-slate-600 mb-2">
                    <Camera className="w-6 h-6 text-amber-700" />
                    <Upload className="w-5 h-5 text-slate-500" />
                  </div>
                  <span className="text-xs font-bold text-slate-800">
                    {isCompressingPhoto ? 'Optimizando foto...' : 'Tomar foto o elegir desde la galería'}
                  </span>
                  <span className="text-[11px] text-slate-500 mt-1">
                    JPG o PNG (se optimiza automáticamente para Google Sheets)
                  </span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handlePhotoUpload}
                    disabled={isCompressingPhoto}
                    className="hidden"
                  />
                </label>
              </div>
            )}
          </div>

          {/* Botón de Envío */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting || isCompressingPhoto}
              className={`w-full py-3.5 px-6 rounded-xl font-black text-white shadow-md transition-all flex items-center justify-center gap-2 ${
                urgency === 'Alta'
                  ? 'bg-red-600 hover:bg-red-700 focus:ring-4 focus:ring-red-300 animate-pulse'
                  : urgency === 'Media'
                  ? 'bg-amber-600 hover:bg-amber-700 focus:ring-4 focus:ring-amber-300'
                  : 'bg-emerald-700 hover:bg-emerald-800 focus:ring-4 focus:ring-emerald-300'
              } disabled:opacity-50`}
            >
              {isSubmitting ? (
                <>
                  <span className="inline-block w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  <span>Registrando en Google Sheets...</span>
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  <span>
                    Enviar Reporte de Incidencia (Urgencia {urgency})
                  </span>
                </>
              )}
            </button>
            <p className="text-[11px] text-center text-slate-500 mt-2 font-medium">
              Sincroniza directamente con el sistema centralizado de eventos del Congreso Herpetológico 2026.
            </p>
          </div>

        </form>
      </div>
    </div>
  );
};
