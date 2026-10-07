import React, { useState } from 'react';
import { CheckCircle2, Copy, Check, X, ClipboardList, LayoutDashboard } from 'lucide-react';
import { Incident } from '../types/incident';

interface Props {
  incident: Incident | null;
  onClose: () => void;
  onGoToDashboard: () => void;
  isOffline?: boolean;
}

export const SubmissionSuccessModal: React.FC<Props> = ({
  incident,
  onClose,
  onGoToDashboard,
  isOffline = false,
}) => {
  const [copied, setCopied] = useState(false);

  if (!incident) return null;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(incident.incidentId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-md w-full p-6 text-center overflow-hidden">
        
        {/* Check Verde Destacado */}
        <div className="w-16 h-16 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-4 shadow-sm animate-bounce">
          <CheckCircle2 className="w-10 h-10" />
        </div>

        <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
          ¡Incidencia Registrada con Éxito!
        </h3>

        <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
          {isOffline
            ? 'Guardada localmente en tu teléfono. Se sincronizará con Google Sheets al recuperar conexión.'
            : 'Enviada al libro de incidencias y transmitida a los coordinadores de sala.'}
        </p>

        {/* Tarjeta del Código de Ticket */}
        <div className="my-5 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border-2 border-dashed border-amber-400 dark:border-amber-600">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">
            Código de Seguimiento
          </span>
          <div className="flex items-center justify-center gap-3">
            <span className="font-mono text-3xl font-black tracking-tight text-amber-600 dark:text-amber-400">
              {incident.incidentId}
            </span>
            <button
              type="button"
              onClick={handleCopyCode}
              className="p-2 rounded-xl bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600 shadow-2xs transition"
              title="Copiar código al portapapeles"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
          <div className="mt-2 flex items-center justify-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
            <span>
              {incident.sector === 'Otro / Especificar' && incident.customSector
                ? incident.customSector
                : incident.sector}
            </span>
            <span>•</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] ${
                incident.urgency === 'Alta'
                  ? 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
                  : incident.urgency === 'Media'
                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                  : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
              }`}
            >
              Urgencia {incident.urgency}
            </span>
          </div>
        </div>

        {/* Botones de Acción */}
        <div className="space-y-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-3 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm transition shadow-sm flex items-center justify-center gap-2"
          >
            <ClipboardList className="w-4 h-4" />
            <span>Reportar Otra Incidencia</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onClose();
              onGoToDashboard();
            }}
            className="w-full py-2.5 px-4 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold text-xs transition flex items-center justify-center gap-2"
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Consultar Estado en el Tablero</span>
          </button>
        </div>

      </div>
    </div>
  );
};
