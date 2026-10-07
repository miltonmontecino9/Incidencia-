import React, { useState } from 'react';
import logoOficial from '../assets/logo_oficial.png';
import {
  Incident,
  IncidentStatus,
  ProgressComment,
  AuditLogEntry,
  StaffMember,
} from '../types/incident';
import {
  X,
  MapPin,
  Clock,
  User,
  Mail,
  Building,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Save,
  Maximize2,
  MessageSquare,
  Plus,
  Lock,
  Unlock,
  History,
  Users,
  UserCheck,
  FileText,
  Printer,
} from 'lucide-react';
import { getElapsedTime } from '../utils/timeAgo';

interface Props {
  incident: Incident | null;
  onClose: () => void;
  onUpdateIncident: (
    updated: Incident,
    changeDescription: string,
    newAuditEntry?: AuditLogEntry
  ) => void;
  onZoomPhoto: (url: string, title: string) => void;
  currentUserEmail?: string;
  isLoading?: boolean;
  isCoordinator: boolean;
  onOpenPinLogin: () => void;
  staffList: StaffMember[];
  onOpenStaffManagement: () => void;
  coordinatorIdentity: string;
}

export const IncidentDetailModal: React.FC<Props> = ({
  incident,
  onClose,
  onUpdateIncident,
  onZoomPhoto,
  currentUserEmail,
  isLoading = false,
  isCoordinator,
  onOpenPinLogin,
  staffList,
  onOpenStaffManagement,
  coordinatorIdentity,
}) => {
  if (!incident) return null;

  const [status, setStatus] = useState<IncidentStatus>(incident.status);
  const [assignedTo, setAssignedTo] = useState(incident.assignedTo || '');
  const [resolutionNotes, setResolutionNotes] = useState(incident.resolutionNotes || '');
  const [newCommentText, setNewCommentText] = useState('');
  const [comments, setComments] = useState<ProgressComment[]>(incident.progressComments || []);
  const [auditLog, setAuditLog] = useState<AuditLogEntry[]>(incident.auditLog || []);

  const timeInfo = getElapsedTime(incident.timestamp);

  const getFormattedNow = () => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(
      now.getHours()
    )}:${pad(now.getMinutes())}`;
  };

  const handleAddComment = () => {
    if (!newCommentText.trim()) return;

    const author = coordinatorIdentity || currentUserEmail || 'Coordinador en Turno';
    const timeFormatted = getFormattedNow();

    const newComment: ProgressComment = {
      id: `comm_${Date.now()}`,
      timestamp: timeFormatted,
      author,
      text: newCommentText.trim(),
    };

    // Registrar también en trazabilidad
    const auditEntry: AuditLogEntry = {
      id: `audit_${Date.now()}`,
      timestamp: timeFormatted,
      coordinatorName: author,
      action: 'Nota de seguimiento agregada',
      details: newCommentText.trim(),
    };

    const updatedComments = [...comments, newComment];
    const updatedAudit = [...auditLog, auditEntry];

    setComments(updatedComments);
    setAuditLog(updatedAudit);
    setNewCommentText('');
  };

  const handleSave = () => {
    const author = coordinatorIdentity || currentUserEmail || 'Coordinador en Turno';
    const timeFormatted = getFormattedNow();
    const newAuditEntries: AuditLogEntry[] = [...auditLog];

    let changeDesc = `Actualizar incidencia ${incident.incidentId}: `;
    const actionsTaken: string[] = [];

    if (status !== incident.status) {
      const actionText = `Estado cambiado de '${incident.status}' a '${status}'`;
      changeDesc += `${actionText}. `;
      actionsTaken.push(actionText);
      newAuditEntries.push({
        id: `audit_st_${Date.now()}`,
        timestamp: timeFormatted,
        coordinatorName: author,
        action: actionText,
      });
    }

    if (assignedTo !== (incident.assignedTo || '')) {
      const staffObj = staffList.find((s) => s.email === assignedTo);
      const staffName = staffObj ? `${staffObj.name} (${staffObj.role})` : assignedTo || 'Sin asignar';
      const actionText = assignedTo ? `Asignado a ${staffName}` : `Desasignado (Sin asignar)`;
      changeDesc += `${actionText}. `;
      actionsTaken.push(actionText);
      newAuditEntries.push({
        id: `audit_as_${Date.now()}`,
        timestamp: timeFormatted,
        coordinatorName: author,
        action: actionText,
      });
    }

    if (resolutionNotes !== (incident.resolutionNotes || '')) {
      const actionText = 'Notas de resolución actualizadas';
      changeDesc += `${actionText}. `;
      actionsTaken.push(actionText);
      newAuditEntries.push({
        id: `audit_nt_${Date.now()}`,
        timestamp: timeFormatted,
        coordinatorName: author,
        action: actionText,
        details: resolutionNotes,
      });
    }

    const updated: Incident = {
      ...incident,
      status,
      assignedTo,
      resolutionNotes,
      progressComments: comments,
      auditLog: newAuditEntries,
    };

    onUpdateIncident(updated, changeDesc);
  };

  const getStatusBadge = (st: IncidentStatus) => {
    switch (st) {
      case 'Pendiente':
        return 'bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 border-amber-300 dark:border-amber-700';
      case 'En Curso':
        return 'bg-blue-100 dark:bg-blue-950/60 text-blue-900 dark:text-blue-300 border-blue-300 dark:border-blue-700';
      case 'Resuelto':
        return 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700';
    }
  };

  const getUrgencyBadge = () => {
    switch (incident.urgency) {
      case 'Alta':
        return 'bg-red-600 text-white animate-pulse';
      case 'Media':
        return 'bg-amber-500 text-white';
      case 'Baja':
        return 'bg-emerald-600 text-white';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
      <div
        className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-auto max-h-[92vh] flex flex-col text-slate-900 dark:text-white"
        role="dialog"
      >
        {/* Cabecera del Modal */}
        <div className="bg-slate-900 dark:bg-slate-950 text-white px-6 py-4 flex items-center justify-between shrink-0 border-b border-slate-800">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="font-mono text-sm sm:text-base font-bold bg-slate-800 px-2.5 py-1 rounded text-amber-400 border border-slate-700">
              {incident.incidentId}
            </span>
            <span className={`text-xs px-2.5 py-1 rounded-full font-bold ${getUrgencyBadge()}`}>
              Urgencia {incident.urgency}
            </span>
            <span className={`text-xs px-2.5 py-1 rounded-full font-semibold border ${getStatusBadge(status)}`}>
              {status}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* 4. BOTÓN IMPRIMIR / EXPORTAR PDF */}
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 text-xs font-bold transition shadow-2xs"
              title="Imprimir Ficha Técnica o Guardar como PDF"
            >
              <Printer className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Imprimir / Exportar PDF</span>
              <span className="sm:hidden">Imprimir</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
              title="Cerrar modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Cuerpo del Modal */}
        <div className="p-6 overflow-y-auto space-y-6">
          
          {/* Ubicación y Categoría */}
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-amber-800 dark:text-amber-400 uppercase tracking-wider flex-wrap">
              <span>{incident.category === 'Otra' && incident.customCategory ? `Otra: ${incident.customCategory}` : incident.category}</span>
              <span>•</span>
              <span>
                {incident.sector === 'Otro / Especificar' && incident.customSector
                  ? `${incident.customSector} (Otro sector)`
                  : incident.sector}
              </span>
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mt-1 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-amber-600 shrink-0" />
              <span>{incident.exactLocation}</span>
            </h3>
            
            {/* Contador de tiempo transcurrido */}
            <div className="mt-2 flex items-center gap-2 text-xs">
              <span className={`inline-flex items-center gap-1 font-semibold px-2 py-0.5 rounded ${
                status === 'Pendiente' && timeInfo.isOverdue
                  ? 'bg-red-100 dark:bg-red-950/60 text-red-800 dark:text-red-300 border border-red-300 dark:border-red-800'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
              }`}>
                <Clock className="w-3.5 h-3.5" />
                <span>Tiempo transcurrido: {timeInfo.formatted}</span>
              </span>
              {status === 'Pendiente' && timeInfo.isOverdue && (
                <span className="text-[11px] font-bold text-red-600 dark:text-red-400 animate-pulse">
                  ⚠️ Atención: Superó los 30 min sin despacho
                </span>
              )}
            </div>

            <p className="mt-3 text-sm text-slate-800 dark:text-slate-200 leading-relaxed bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
              "{incident.description}"
            </p>
          </div>

          {/* Foto de Evidencia con Zoom */}
          {incident.evidencePhoto && (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-2">
                Foto de Evidencia Adjunta (Clic para ampliar)
              </label>
              <div
                onClick={() =>
                  onZoomPhoto(
                    incident.evidencePhoto!,
                    `Evidencia ${incident.incidentId} - ${incident.exactLocation}`
                  )
                }
                className="relative inline-block border-2 border-slate-300 dark:border-slate-700 hover:border-amber-500 rounded-xl overflow-hidden shadow-xs cursor-pointer group transition"
              >
                <img
                  src={incident.evidencePhoto}
                  alt="Evidencia"
                  className="w-52 h-36 object-cover group-hover:scale-105 transition-transform duration-200"
                />
                <div className="absolute inset-0 bg-black/30 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                  <div className="bg-slate-900/80 text-white text-xs px-2.5 py-1 rounded-lg flex items-center gap-1.5 shadow-md">
                    <Maximize2 className="w-3.5 h-3.5" />
                    <span>Ampliar Detalle</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Grilla de Datos del Informante */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-slate-50/90 dark:bg-slate-800/80 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
              <User className="w-4 h-4 text-slate-400 shrink-0" />
              <span className="text-slate-500 dark:text-slate-400">Informante:</span>
              <span className="font-bold text-slate-900 dark:text-white">{incident.reporterName}</span>
            </div>
            <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
              <Mail className="w-4 h-4 text-slate-400 shrink-0" />
              <span className="text-slate-500 dark:text-slate-400">Email:</span>
              <a href={`mailto:${incident.reporterEmail}`} className="font-semibold text-amber-800 dark:text-amber-400 underline">
                {incident.reporterEmail}
              </a>
            </div>
            <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
              <Building className="w-4 h-4 text-slate-400 shrink-0" />
              <span className="text-slate-500 dark:text-slate-400">Organización:</span>
              <span className="font-bold text-slate-900 dark:text-white">{incident.organization}</span>
            </div>
            <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
              <Clock className="w-4 h-4 text-slate-400 shrink-0" />
              <span className="text-slate-500 dark:text-slate-400">Registrado:</span>
              <span className="font-mono text-slate-900 dark:text-white">{incident.timestamp}</span>
            </div>
          </div>

          {/* Comentarios de Seguimiento y Progreso */}
          <div className="border-t border-slate-200 dark:border-slate-800 pt-5 space-y-3">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-amber-600" />
              <span>Bitácora de Notas Rápidas ({comments.length})</span>
            </h4>

            <div className="space-y-2 max-h-40 overflow-y-auto p-1">
              {comments.length === 0 ? (
                <p className="text-xs text-slate-400 italic bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
                  Sin notas registradas aún.
                </p>
              ) : (
                comments.map((comm) => (
                  <div
                    key={comm.id}
                    className="p-3 bg-amber-50/70 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-800/60 text-xs"
                  >
                    <div className="flex items-center justify-between font-semibold text-[11px] text-amber-900 dark:text-amber-300 mb-1">
                      <span className="flex items-center gap-1">
                        <UserCheck className="w-3.5 h-3.5 text-amber-600" />
                        <span>{comm.author}</span>
                      </span>
                      <span className="font-mono text-slate-500 dark:text-slate-400">{comm.timestamp}</span>
                    </div>
                    <p className="text-slate-700 dark:text-slate-200">{comm.text}</p>
                  </div>
                ))
              )}
            </div>

            {/* Input de nota rápida protegido por PIN */}
            {isCoordinator ? (
              <div className="flex gap-2 pt-1">
                <input
                  type="text"
                  value={newCommentText}
                  onChange={(e) => setNewCommentText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddComment();
                    }
                  }}
                  placeholder="Escribe una nota rápida (ej. 'Repuesto en camino', 'Técnico en Sala')..."
                  className="flex-1 px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500"
                />
                <button
                  type="button"
                  onClick={handleAddComment}
                  disabled={!newCommentText.trim()}
                  className="px-3 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-40 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Agregar Nota</span>
                </button>
              </div>
            ) : (
              <div className="p-2.5 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-slate-400" />
                  <span>Para registrar notas de progreso, accede como Coordinador.</span>
                </span>
                <button
                  type="button"
                  onClick={onOpenPinLogin}
                  className="text-amber-600 dark:text-amber-400 font-bold hover:underline"
                >
                  Ingresar PIN
                </button>
              </div>
            )}
          </div>

          {/* Acciones de Coordinación y Actualización */}
          <div className="border-t border-slate-200 dark:border-slate-800 pt-5 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-amber-600" />
                <span>Estado Operativo y Asignación de Personal</span>
              </h4>
              {!isCoordinator ? (
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                  <Lock className="w-3 h-3" />
                  <span>Solo lectura</span>
                </span>
              ) : (
                <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>Firmando como: <strong>{coordinatorIdentity || 'Coordinador'}</strong></span>
                </span>
              )}
            </div>

            {/* Selector de Estado */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                Cambiar Estado de la Incidencia
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    { st: 'Pendiente', label: 'Pendiente' },
                    { st: 'En Curso', label: 'En Curso' },
                    { st: 'Resuelto', label: 'Resuelto' },
                  ] as { st: IncidentStatus; label: string }[]
                ).map(({ st, label }) => (
                  <button
                    key={st}
                    type="button"
                    disabled={!isCoordinator}
                    onClick={() => setStatus(st)}
                    className={`py-2 px-2 rounded-lg text-xs font-bold border transition-all text-center disabled:opacity-60 disabled:cursor-not-allowed ${
                      status === st
                        ? st === 'Resuelto'
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                          : st === 'En Curso'
                          ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                          : 'bg-amber-600 text-white border-amber-600 shadow-xs'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* 2. GESTIÓN DINÁMICA DE PERSONAL ASIGNABLE */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                  Personal Asignado Responsable
                </label>
                {isCoordinator && (
                  <button
                    type="button"
                    onClick={onOpenStaffManagement}
                    className="text-[11px] font-bold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1"
                  >
                    <Users className="w-3 h-3" />
                    <span>Gestionar Equipo / Personal</span>
                  </button>
                )}
              </div>

              <select
                disabled={!isCoordinator}
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-sm text-slate-900 dark:text-white bg-white dark:bg-slate-800 focus:ring-2 focus:ring-amber-500 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <option value="">Sin Asignar</option>
                {staffList
                  .filter((s) => s.active !== false || s.email === assignedTo)
                  .map((staff) => (
                    <option key={staff.email} value={staff.email}>
                      {staff.name} — {staff.role} ({staff.email})
                    </option>
                  ))}
              </select>
            </div>

            {/* Notas Finales */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                Notas Finales de Cierre
              </label>
              <textarea
                disabled={!isCoordinator}
                rows={2}
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                placeholder="Detalla cómo se solucionó la incidencia..."
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-sm text-slate-900 dark:text-white bg-white dark:bg-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-amber-500 disabled:opacity-60 disabled:cursor-not-allowed"
              />
            </div>
          </div>

          {/* 4. VISUALIZACIÓN DE HISTORIAL Y TRAZABILIDAD DE ACCIONES */}
          <div className="border-t border-slate-200 dark:border-slate-800 pt-5 space-y-3">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <History className="w-4 h-4 text-amber-600" />
              <span>Historial y Trazabilidad de Acciones ({auditLog.length})</span>
            </h4>

            {auditLog.length === 0 ? (
              <p className="text-xs text-slate-400 italic bg-slate-50 dark:bg-slate-800/40 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
                Aún no hay modificaciones registradas por coordinadores en este ticket.
              </p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {auditLog.map((entry) => (
                  <div
                    key={entry.id}
                    className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-800 dark:text-slate-200">
                      <span className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400">
                        <UserCheck className="w-3.5 h-3.5" />
                        <span>{entry.coordinatorName}</span>
                      </span>
                      <span className="font-mono text-slate-400 text-[10px]">{entry.timestamp}</span>
                    </div>

                    <div className="font-semibold text-slate-900 dark:text-white">
                      {entry.action}
                    </div>

                    {entry.details && (
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 p-2 rounded border border-slate-200 dark:border-slate-700">
                        "{entry.details}"
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Pie del Modal */}
        <div className="bg-slate-50 dark:bg-slate-950 px-6 py-4 flex items-center justify-between border-t border-slate-200 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
            >
              Cerrar
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
              title="Imprimir Ficha Técnica"
            >
              <Printer className="w-3.5 h-3.5 text-amber-600" />
              <span>Imprimir Ficha</span>
            </button>
          </div>

          {isCoordinator ? (
            <button
              type="button"
              onClick={handleSave}
              disabled={isLoading}
              className="inline-flex items-center gap-2 px-5 py-2 text-xs sm:text-sm font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-sm focus:ring-2 focus:ring-amber-500 disabled:opacity-50"
            >
              {isLoading ? (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Guardar y Firmar Cambios
            </button>
          ) : (
            <button
              type="button"
              onClick={onOpenPinLogin}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-bold text-white bg-amber-600 hover:bg-amber-500 rounded-lg shadow-sm"
            >
              <Unlock className="w-4 h-4" />
              <span>Desbloquear Edición con PIN</span>
            </button>
          )}
        </div>
      </div>

      {/* 4. VISTA OFICIAL DE IMPRESIÓN Y EXPORTACIÓN A PDF */}
      <div id="printable-ticket" className="hidden">
        {/* Encabezado Institucional */}
        <div style={{ borderBottom: '3px solid #b45309', paddingBottom: '12px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <img
                src={logoOficial}
                alt="Logo Congreso"
                style={{ width: '45px', height: '45px', objectFit: 'contain' }}
              />
              <div>
                <h1 style={{ fontSize: '18px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#78350f', margin: 0 }}>
                  CONGRESO HERPETOLÓGICO 2026
                </h1>
                <h2 style={{ fontSize: '13px', fontWeight: '700', color: '#1f2937', margin: '2px 0 0 0' }}>
                  GESTIÓN Y DESPACHO DE INCIDENCIAS — FICHA TÉCNICA
                </h2>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '16px', fontWeight: '900', fontFamily: 'monospace', color: '#b45309' }}>
                {incident.incidentId}
              </div>
              <div style={{ fontSize: '10px', color: '#6b7280' }}>
                Impreso: {new Date().toLocaleString('es-AR')}
              </div>
            </div>
          </div>
        </div>

        {/* Tabla de Metadatos Principales */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '16px', fontSize: '12px' }}>
          <tbody>
            <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
              <td style={{ padding: '6px 8px', fontWeight: 'bold', width: '25%', background: '#f9fafb' }}>Estado Actual:</td>
              <td style={{ padding: '6px 8px', width: '25%', fontWeight: 'bold' }}>{status}</td>
              <td style={{ padding: '6px 8px', fontWeight: 'bold', width: '25%', background: '#f9fafb' }}>Urgencia:</td>
              <td style={{ padding: '6px 8px', width: '25%', fontWeight: 'bold' }}>{incident.urgency.toUpperCase()}</td>
            </tr>
            <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
              <td style={{ padding: '6px 8px', fontWeight: 'bold', background: '#f9fafb' }}>Fecha y Hora:</td>
              <td style={{ padding: '6px 8px' }}>{incident.timestamp}</td>
              <td style={{ padding: '6px 8px', fontWeight: 'bold', background: '#f9fafb' }}>Categoría:</td>
              <td style={{ padding: '6px 8px' }}>
                {incident.category === 'Otra' && incident.customCategory ? `Otra: ${incident.customCategory}` : incident.category}
              </td>
            </tr>
            <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
              <td style={{ padding: '6px 8px', fontWeight: 'bold', background: '#f9fafb' }}>Sector:</td>
              <td style={{ padding: '6px 8px' }}>
                {incident.sector === 'Otro / Especificar' && incident.customSector
                  ? `${incident.customSector} (Otro sector)`
                  : incident.sector}
              </td>
              <td style={{ padding: '6px 8px', fontWeight: 'bold', background: '#f9fafb' }}>Ubicación Exacta:</td>
              <td style={{ padding: '6px 8px' }}>{incident.exactLocation}</td>
            </tr>
            <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
              <td style={{ padding: '6px 8px', fontWeight: 'bold', background: '#f9fafb' }}>Informante:</td>
              <td style={{ padding: '6px 8px' }}>{incident.reporterName} ({incident.reporterEmail})</td>
              <td style={{ padding: '6px 8px', fontWeight: 'bold', background: '#f9fafb' }}>Entidad:</td>
              <td style={{ padding: '6px 8px' }}>{incident.organization}</td>
            </tr>
            <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
              <td style={{ padding: '6px 8px', fontWeight: 'bold', background: '#f9fafb' }}>Personal Asignado:</td>
              <td colSpan={3} style={{ padding: '6px 8px', fontWeight: 'bold' }}>
                {staffList.find((s) => s.email === assignedTo)?.name
                  ? `${staffList.find((s) => s.email === assignedTo)?.name} (${staffList.find((s) => s.email === assignedTo)?.role})`
                  : assignedTo || 'Sin asignar'}
              </td>
            </tr>
          </tbody>
        </table>

        {/* Descripción del Incidente */}
        <div style={{ marginBottom: '16px' }} className="print-avoid-break">
          <div style={{ fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', color: '#4b5563', marginBottom: '4px' }}>
            Descripción Detallada del Incidente:
          </div>
          <div style={{ padding: '10px', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '4px', fontSize: '12px', lineHeight: '1.5' }}>
            {incident.description}
          </div>
        </div>

        {/* Foto de Evidencia si existe */}
        {incident.evidencePhoto && (
          <div style={{ marginBottom: '16px' }} className="print-avoid-break">
            <div style={{ fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', color: '#4b5563', marginBottom: '4px' }}>
              Evidencia Fotográfica Adjunta:
            </div>
            <img
              src={incident.evidencePhoto}
              alt="Evidencia fotográfica"
              style={{ maxHeight: '200px', maxWidth: '320px', objectFit: 'contain', borderRadius: '4px', border: '1px solid #d1d5db' }}
            />
          </div>
        )}

        {/* Notas de Resolución */}
        {resolutionNotes && (
          <div style={{ marginBottom: '16px' }} className="print-avoid-break">
            <div style={{ fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', color: '#4b5563', marginBottom: '4px' }}>
              Notas de Resolución / Acciones Ejecutadas:
            </div>
            <div style={{ padding: '10px', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '4px', fontSize: '12px' }}>
              {resolutionNotes}
            </div>
          </div>
        )}

        {/* Comentarios de Seguimiento */}
        {comments.length > 0 && (
          <div style={{ marginBottom: '16px' }} className="print-avoid-break">
            <div style={{ fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', color: '#4b5563', marginBottom: '4px' }}>
              Historial de Comentarios de Seguimiento ({comments.length}):
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
              <thead>
                <tr style={{ background: '#f3f4f6', borderBottom: '1px solid #d1d5db', textAlign: 'left' }}>
                  <th style={{ padding: '4px 6px', width: '25%' }}>Fecha / Hora</th>
                  <th style={{ padding: '4px 6px', width: '30%' }}>Autor</th>
                  <th style={{ padding: '4px 6px' }}>Comentario</th>
                </tr>
              </thead>
              <tbody>
                {comments.map((c) => (
                  <tr key={c.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '4px 6px', color: '#6b7280' }}>{c.timestamp}</td>
                    <td style={{ padding: '4px 6px', fontWeight: '600' }}>{c.author}</td>
                    <td style={{ padding: '4px 6px' }}>{c.text}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Bitácora de Trazabilidad y Auditoría */}
        {auditLog.length > 0 && (
          <div style={{ marginBottom: '24px' }} className="print-avoid-break">
            <div style={{ fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', color: '#4b5563', marginBottom: '4px' }}>
              Bitácora de Trazabilidad y Auditoría ({auditLog.length}):
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
              <thead>
                <tr style={{ background: '#f3f4f6', borderBottom: '1px solid #d1d5db', textAlign: 'left' }}>
                  <th style={{ padding: '4px 6px', width: '25%' }}>Fecha / Hora</th>
                  <th style={{ padding: '4px 6px', width: '30%' }}>Coordinador Responsable</th>
                  <th style={{ padding: '4px 6px' }}>Acción Ejecutada</th>
                </tr>
              </thead>
              <tbody>
                {auditLog.map((a) => (
                  <tr key={a.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '4px 6px', color: '#6b7280' }}>{a.timestamp}</td>
                    <td style={{ padding: '4px 6px', fontWeight: '600' }}>{a.coordinatorName}</td>
                    <td style={{ padding: '4px 6px' }}>
                      {a.action}
                      {a.details ? ` (${a.details})` : ''}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Bloque de Firmas de Conformidad */}
        <div style={{ marginTop: '36px', paddingTop: '16px', borderTop: '1px dashed #9ca3af', display: 'flex', justifyContent: 'space-around', fontSize: '11px', textAlign: 'center' }} className="print-avoid-break">
          <div style={{ width: '40%' }}>
            <div style={{ height: '40px' }}></div>
            <div style={{ borderTop: '1px solid #4b5563', paddingTop: '4px' }}>
              <strong>Firma Coordinador General</strong>
              <div style={{ fontSize: '10px', color: '#6b7280' }}>{coordinatorIdentity || 'Coordinación del Evento'}</div>
            </div>
          </div>
          <div style={{ width: '40%' }}>
            <div style={{ height: '40px' }}></div>
            <div style={{ borderTop: '1px solid #4b5563', paddingTop: '4px' }}>
              <strong>Firma Responsable Operativo</strong>
              <div style={{ fontSize: '10px', color: '#6b7280' }}>
                {staffList.find((s) => s.email === assignedTo)?.name || assignedTo || 'Personal Asignado'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
