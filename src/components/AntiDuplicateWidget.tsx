import React, { useState } from 'react';
import { Incident, IncidentSector } from '../types/incident';
import { AlertCircle, ChevronDown, ChevronUp, Clock, MapPin, Eye } from 'lucide-react';
import { getElapsedTime } from '../utils/timeAgo';

interface Props {
  sector: IncidentSector | '';
  activeIncidents: Incident[];
  onSelectIncident?: (incident: Incident) => void;
}

export const AntiDuplicateWidget: React.FC<Props> = ({
  sector,
  activeIncidents,
  onSelectIncident,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  if (!sector) return null;

  // Filtrar incidencias activas en el sector seleccionado (no resueltas)
  const duplicatesInSector = activeIncidents.filter(
    (inc) => inc.sector === sector && inc.status !== 'Resuelto'
  );

  if (duplicatesInSector.length === 0) return null;

  return (
    <div className="my-4 rounded-xl border-2 border-amber-400 bg-amber-50/90 p-4 text-amber-950 shadow-sm animate-in fade-in slide-in-from-top duration-300">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-amber-950 text-sm sm:text-base">
              Verificación Anti-Duplicados en {sector}
            </h4>
            <p className="text-xs text-amber-800">
              Actualmente {duplicatesInSector.length === 1 ? 'existe' : 'existen'}{' '}
              <strong className="underline">
                {duplicatesInSector.length} {duplicatesInSector.length === 1 ? 'incidencia activa' : 'incidencias activas'}
              </strong>{' '}
              reportadas en este sector.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-amber-800 hover:text-amber-950 p-1 rounded-lg hover:bg-amber-100/80 transition-colors"
          aria-label={isExpanded ? 'Contraer advertencias de duplicados' : 'Expandir advertencias de duplicados'}
        >
          {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </button>
      </div>

      {isExpanded && (
        <div className="mt-3 space-y-2 pt-2 border-t border-amber-200">
          {duplicatesInSector.map((inc) => {
            const timeInfo = getElapsedTime(inc.timestamp);
            return (
              <div
                key={inc.incidentId}
                className="bg-white/95 rounded-lg p-3 border border-amber-200/90 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-2"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-bold px-1.5 py-0.5 rounded bg-slate-800 text-white">
                      {inc.incidentId}
                    </span>
                    <span
                      className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                        inc.urgency === 'Alta'
                          ? 'bg-red-100 text-red-800 border border-red-300'
                          : inc.urgency === 'Media'
                          ? 'bg-amber-100 text-amber-800 border border-amber-300'
                          : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      }`}
                    >
                      Urgencia {inc.urgency}
                    </span>
                    <span className="text-xs font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                      {inc.category === 'Otra' && inc.customCategory
                        ? `Otra: ${inc.customCategory}`
                        : inc.category}
                    </span>
                    <span className="text-xs text-slate-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {timeInfo.formatted}
                    </span>
                  </div>

                  <div className="text-xs text-slate-700 flex items-center gap-1 font-medium">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    {inc.exactLocation || sector}
                  </div>

                  <p className="text-xs text-slate-600 line-clamp-2">
                    "{inc.description}"
                  </p>
                </div>

                {onSelectIncident && (
                  <button
                    type="button"
                    onClick={() => onSelectIncident(inc)}
                    className="sm:self-center shrink-0 inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded bg-amber-700 hover:bg-amber-800 text-white transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    Ver Detalle
                  </button>
                )}
              </div>
            );
          })}
          <p className="text-[11px] text-amber-900 italic pt-1">
            Si tu problema coincide con uno de los anteriores, el equipo ya está avisado. Si se trata de otra situación, completa el reporte a continuación.
          </p>
        </div>
      )}
    </div>
  );
};
