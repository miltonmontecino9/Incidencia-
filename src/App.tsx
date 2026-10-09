import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Incident, IncidentStatus, StaffMember, AuditLogEntry } from './types/incident';
import { INITIAL_INCIDENTS } from './data/mockIncidents';
import { Header } from './components/Header';
import { IncidentForm } from './components/IncidentForm';
import { AdminDashboard } from './components/AdminDashboard';
import { IncidentDetailModal } from './components/IncidentDetailModal';
import { WorkspaceConfirmModal } from './components/WorkspaceConfirmModal';
import { QRCodeModal } from './components/QRCodeModal';
import { ImageModal } from './components/ImageModal';
import { PinLoginModal } from './components/PinLoginModal';
import { ChangePinModal } from './components/ChangePinModal';
import { SubmissionSuccessModal } from './components/SubmissionSuccessModal';
import { StaffManagementModal } from './components/StaffManagementModal';
import {
  fetchCentralSync,
  saveCentralIncident,
  updateCentralIncident,
  saveStaffList as saveCentralStaffList,
  checkServerHealth,
} from './services/centralApi';
import {
  getCachedIncidents,
  saveCachedIncidents,
  getPendingQueue,
  enqueuePendingIncident,
  removeFromPendingQueue,
} from './utils/offlineSync';
import { getStoredStaffList, saveStoredStaffList } from './utils/staffStorage';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { playHighUrgencySound, unlockAudio } from './utils/audioAlert';

export default function App() {
  const [activeTab, setActiveTab] = useState<'report' | 'dashboard'>('report');
  
  // 3. Inicializar incidencias desde caché local o mock inicial
  const [incidents, setIncidents] = useState<Incident[]>(() => {
    const cached = getCachedIncidents();
    return cached && cached.length > 0 ? cached : INITIAL_INCIDENTS;
  });

  // 2. Personal asignado dinámico
  const [staffList, setStaffList] = useState<StaffMember[]>(() => getStoredStaffList());
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);

  // 3. Identidad del coordinador para firma y trazabilidad
  const [coordinatorIdentity, setCoordinatorIdentity] = useState<string>(() => {
    try {
      return localStorage.getItem('mp_coordinator_name') || '';
    } catch {
      return '';
    }
  });

  // Conexión y sincronización centralizada en tiempo real
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // 1. Control de acceso por roles y PIN (Por defecto: Modo Voluntario = false)
  const [isCoordinator, setIsCoordinator] = useState(false);
  const [isPinLoginOpen, setIsPinLoginOpen] = useState(false);
  const [isChangePinOpen, setIsChangePinOpen] = useState(false);

  // Modo Oscuro / Claro
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem('mp_theme') === 'dark';
    } catch {
      return false;
    }
  });

  // Refresco automático en tiempo real (cada 6 segundos para detección inmediata)
  const [autoRefreshSecondsLeft, setAutoRefreshSecondsLeft] = useState(6);
  const knownIncidentIdsRef = useRef<Set<string>>(new Set(incidents.map((i) => i.incidentId)));
  const isInitialSyncDoneRef = useRef<boolean>(false);

  // Modal de confirmación de reporte enviado
  const [submittedIncidentModal, setSubmittedIncidentModal] = useState<Incident | null>(null);
  const [isLastSubmitOffline, setIsLastSubmitOffline] = useState(false);

  // Modales adicionales
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  const [zoomedPhoto, setZoomedPhoto] = useState<{ url: string; title: string } | null>(null);

  // Modal de confirmación para cambios de estado
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    confirmVariant?: 'primary' | 'danger' | 'warning';
    onConfirmAction: () => Promise<void>;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirmAction: async () => {},
  });
  const [isMutating, setIsMutating] = useState(false);

  // Toast flotante
  const [toastMessage, setToastMessage] = useState<{
    type: 'success' | 'info' | 'warning';
    text: string;
  } | null>(null);

  const showToast = useCallback((text: string, type: 'success' | 'info' | 'warning' = 'info') => {
    setToastMessage({ type, text });
    setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  }, []);

  // Actualizar tema en elemento raíz
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('mp_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('mp_theme', 'light');
    }
  }, [isDarkMode]);

  const toggleDarkMode = () => {
    setIsDarkMode((prev) => !prev);
  };

  // Guardar siempre en caché local cuando cambian las incidencias
  useEffect(() => {
    saveCachedIncidents(incidents);
  }, [incidents]);

  // Siguiente código de ticket único (ej. INC-007)
  const nextId = useMemo(() => {
    let maxNum = 0;
    incidents.forEach((inc) => {
      const match = inc.incidentId.match(/INC-([0-9]+)/i);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    });
    return `INC-${String(maxNum + 1).padStart(3, '0')}`;
  }, [incidents]);

  const highPriorityCount = useMemo(() => {
    return incidents.filter((i) => i.urgency === 'Alta' && i.status !== 'Resuelto').length;
  }, [incidents]);

  // Sincronización de cola pendiente offline con servidor central
  const flushPendingOfflineQueue = useCallback(async () => {
    const queue = getPendingQueue();
    if (queue.length === 0) return;

    let syncedCount = 0;
    for (const item of queue) {
      try {
        await saveCentralIncident(item);
        removeFromPendingQueue(item.incidentId);
        syncedCount++;
      } catch (err) {
        console.warn(`No se pudo sincronizar incidencia encolada ${item.incidentId}:`, err);
      }
    }
    if (syncedCount > 0) {
      showToast(`Sincronizadas ${syncedCount} incidencias pendientes con el servidor central.`, 'success');
    }
  }, [showToast]);

  // Desbloqueo de audio y permisos de notificación al primer toque/clic
  useEffect(() => {
    const handleUserInteraction = () => {
      unlockAudio();
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission().catch(() => {});
      }
      window.removeEventListener('click', handleUserInteraction);
      window.removeEventListener('touchstart', handleUserInteraction);
    };

    window.addEventListener('click', handleUserInteraction);
    window.addEventListener('touchstart', handleUserInteraction);
    return () => {
      window.removeEventListener('click', handleUserInteraction);
      window.removeEventListener('touchstart', handleUserInteraction);
    };
  }, []);

  // Sincronización completa con servidor central
  const syncWithCentralServer = useCallback(
    async (showFeedback = false) => {
      try {
        setIsSyncing(true);
        const data = await fetchCentralSync();
        if (data.incidents && data.incidents.length > 0) {
          // Si ya se hizo la primera carga, detectamos si ingresaron incidencias nuevas desde otro dispositivo
          if (isInitialSyncDoneRef.current) {
            const newlyAdded = data.incidents.filter(
              (inc) => !knownIncidentIdsRef.current.has(inc.incidentId)
            );

            if (newlyAdded.length > 0) {
              // 🚨 Ruidito de alerta para el coordinador
              playHighUrgencySound();

              // Vibración en smartphones/tablets
              if (typeof navigator !== 'undefined' && navigator.vibrate) {
                try {
                  navigator.vibrate([250, 100, 250, 100, 400]);
                } catch {}
              }

              const latest = newlyAdded[0];
              showToast(
                `🚨 ¡Nueva incidencia registrada! [${latest.incidentId}] - ${latest.sector} (Urgencia: ${latest.urgency})`,
                'error'
              );

              // Notificación nativa del navegador para cuando la pestaña esté minimizada
              if (
                typeof window !== 'undefined' &&
                'Notification' in window &&
                Notification.permission === 'granted'
              ) {
                try {
                  new Notification(`🚨 Nueva Incidencia: [${latest.incidentId}]`, {
                    body: `Sector: ${latest.sector} | Urgencia: ${latest.urgency}\n${latest.description?.slice(0, 90) || ''}`,
                    icon: '/logo_oficial.png',
                  });
                } catch {}
              }
            }
          }

          // Actualizar registro de incidencias conocidas
          knownIncidentIdsRef.current = new Set(data.incidents.map((i) => i.incidentId));
          isInitialSyncDoneRef.current = true;
          setIncidents(data.incidents);
        }
        if (data.staff && data.staff.length > 0) {
          setStaffList(data.staff);
          saveStoredStaffList(data.staff);
        }
        setIsOnline(true);

        // Despachar cualquier reporte pendiente
        await flushPendingOfflineQueue();

        if (showFeedback) {
          showToast(`Sincronizado con base central (${data.incidents.length} incidencias).`, 'success');
        }
      } catch (err: any) {
        console.warn('Error al sincronizar con servidor central:', err);
        setIsOnline(false);
        if (showFeedback) {
          showToast('Servidor central temporalmente inalcanzable. Usando copia local.', 'warning');
        }
      } finally {
        setIsSyncing(false);
      }
    },
    [flushPendingOfflineQueue, showToast]
  );

  // Carga inicial al montar la aplicación
  useEffect(() => {
    syncWithCentralServer(false);
  }, [syncWithCentralServer]);

  // Listener para evento 'online' / 'offline' del navegador
  useEffect(() => {
    const handleOnline = async () => {
      setIsOnline(true);
      showToast('Conexión reestablecida. Sincronizando con base central...', 'info');
      await syncWithCentralServer(true);
    };

    const handleOffline = () => {
      setIsOnline(false);
      showToast('Sin conexión a Internet. Operando en Modo Local Resiliente.', 'warning');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [syncWithCentralServer, showToast]);

  // 2. Refresco automático en segundo plano cada 6 segundos para detección inmediata
  useEffect(() => {
    const interval = setInterval(async () => {
      setAutoRefreshSecondsLeft((prev) => {
        if (prev <= 1) {
          // Refresco silencioso con servidor central
          syncWithCentralServer(false);
          return 6;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [syncWithCentralServer]);

  // Recarga manual al tocar el botón de sincronizar
  const handleManualRefresh = async () => {
    setAutoRefreshSecondsLeft(6);
    await syncWithCentralServer(true);
  };

  // 1. VISTA DE REPORTE TOTALMENTE PROTEGIDA E INTACTA
  const handleSubmitIncident = async (newIncident: Incident) => {
    setIsSubmitting(true);
    let syncedToCentral = false;

    try {
      if (navigator.onLine) {
        try {
          await saveCentralIncident(newIncident);
          syncedToCentral = true;
          setIsOnline(true);
        } catch (netErr) {
          console.warn('Fallo al enviar a servidor central, encolando offline:', netErr);
          enqueuePendingIncident(newIncident);
          setIsOnline(false);
        }
      } else {
        enqueuePendingIncident(newIncident);
        setIsOnline(false);
      }

      knownIncidentIdsRef.current.add(newIncident.incidentId);
      setIncidents((prev) => [newIncident, ...prev]);
      setIsLastSubmitOffline(!syncedToCentral);
      setSubmittedIncidentModal(newIncident);

      if (syncedToCentral) {
        showToast(`Incidencia ${newIncident.incidentId} guardada y compartida en tiempo real`, 'success');
      } else {
        showToast(`Incidencia ${newIncident.incidentId} guardada localmente (Modo Resiliente).`, 'info');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // 3. Solicitud de cambio de estado con firma de trazabilidad
  const handleRequestStatusChange = (incident: Incident, newStatus: IncidentStatus) => {
    if (!isCoordinator) {
      setIsPinLoginOpen(true);
      return;
    }

    const author = coordinatorIdentity || 'Coordinador en Turno';
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const timeFormatted = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(
      now.getHours()
    )}:${pad(now.getMinutes())}`;

    const newAuditEntry: AuditLogEntry = {
      id: `audit_quick_${Date.now()}`,
      timestamp: timeFormatted,
      coordinatorName: author,
      action: `Estado cambiado de '${incident.status}' a '${newStatus}'`,
    };

    const currentSectorLabel =
      incident.sector === 'Otro / Especificar' && incident.customSector
        ? incident.customSector
        : incident.sector;

    const actionDesc =
      newStatus === 'Resuelto'
        ? `¿Confirmar resolución de la incidencia ${incident.incidentId} en la base central del evento?\n\nSector: ${currentSectorLabel}\nUbicación: ${incident.exactLocation}\n\nFirma responsable: ${author}`
        : newStatus === 'En Curso'
        ? `¿Despachar la incidencia ${incident.incidentId} y cambiar estado a 'En Curso'?\n\nFirma responsable: ${author}`
        : `¿Reabrir la incidencia ${incident.incidentId} y devolverla a 'Pendiente'?\n\nFirma responsable: ${author}`;

    setConfirmModal({
      isOpen: true,
      title: `Confirmar cambio de estado: ${incident.incidentId}`,
      message: actionDesc,
      confirmLabel: `Cambiar a ${newStatus}`,
      confirmVariant: newStatus === 'Resuelto' ? 'primary' : 'warning',
      onConfirmAction: async () => {
        await executeUpdateIncident({
          ...incident,
          status: newStatus,
          auditLog: [...(incident.auditLog || []), newAuditEntry],
        });
      },
    });
  };

  // Actualización en el servidor central y estado local
  const executeUpdateIncident = async (updatedIncident: Incident) => {
    setIsMutating(true);

    try {
      try {
        await updateCentralIncident(updatedIncident);
        setIsOnline(true);
        showToast(`Incidencia ${updatedIncident.incidentId} sincronizada con el panel central.`, 'success');
      } catch (err: any) {
        console.warn('Error al actualizar en servidor central, guardando local:', err);
        setIsOnline(false);
        showToast(`Incidencia ${updatedIncident.incidentId} actualizada localmente.`, 'info');
      }

      setIncidents((prev) =>
        prev.map((i) => (i.incidentId === updatedIncident.incidentId ? updatedIncident : i))
      );

      if (selectedIncident && selectedIncident.incidentId === updatedIncident.incidentId) {
        setSelectedIncident(updatedIncident);
      }
    } finally {
      setIsMutating(false);
      setConfirmModal((prev) => ({ ...prev, isOpen: false }));
    }
  };

  // Guardado desde el modal de detalle con firma de auditoría
  const handleModalUpdate = (updatedIncident: Incident, changeDescription: string) => {
    if (!isCoordinator) {
      setIsPinLoginOpen(true);
      return;
    }

    const author = coordinatorIdentity || 'Coordinador en Turno';

    setConfirmModal({
      isOpen: true,
      title: `Confirmar Cambios en Incidencia ${updatedIncident.incidentId}`,
      message: `${changeDescription}\n\nFirma del Coordinador: ${author}\n\nLos cambios se registrarán inmediatamente en la base de datos central compartida del evento.`,
      confirmLabel: 'Guardar y Sincronizar',
      confirmVariant: 'primary',
      onConfirmAction: async () => {
        await executeUpdateIncident(updatedIncident);
        setSelectedIncident(null);
      },
    });
  };

  // Actualización del equipo de personal en la base central
  const handleUpdateStaffList = async (updated: StaffMember[]) => {
    setStaffList(updated);
    saveStoredStaffList(updated);
    try {
      await saveCentralStaffList(updated);
      setIsOnline(true);
      showToast('Lista de personal actualizada y sincronizada en tiempo real.', 'success');
    } catch {
      showToast('Lista de personal guardada localmente.', 'info');
    }
  };

  return (
    <div className={`min-h-screen ${isDarkMode ? 'dark bg-slate-950 text-slate-100' : 'bg-slate-100/75 text-slate-900'} flex flex-col font-sans transition-colors`}>
      
      {/* Cabecera Principal */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isOnline={isOnline}
        isSyncing={isSyncing}
        onRefreshData={handleManualRefresh}
        isRefreshing={isSyncing}
        highPriorityCount={highPriorityCount}
        onOpenQR={() => setIsQRModalOpen(true)}
        isCoordinator={isCoordinator}
        onOpenPinLogin={() => setIsPinLoginOpen(true)}
        onLogoutCoordinator={() => {
          setIsCoordinator(false);
          showToast('Sesión de coordinador cerrada. Ahora en Vista de Voluntario (Solo Lectura).', 'info');
        }}
        onOpenChangePin={() => setIsChangePinOpen(true)}
        isDarkMode={isDarkMode}
        onToggleDarkMode={toggleDarkMode}
      />

      {/* Toast Flotante */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 max-w-md animate-in slide-in-from-bottom duration-300">
          <div
            className={`p-3.5 rounded-2xl shadow-2xl border flex items-center gap-3 text-xs sm:text-sm font-semibold ${
              toastMessage.type === 'success'
                ? 'bg-emerald-950 text-white border-emerald-700'
                : toastMessage.type === 'warning'
                ? 'bg-amber-950 text-white border-amber-700'
                : 'bg-slate-900 text-white border-slate-700'
            }`}
          >
            {toastMessage.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
            )}
            <span className="flex-1">{toastMessage.text}</span>
          </div>
        </div>
      )}

      {/* Contenido Principal */}
      <main className="flex-1 pb-16">
        {activeTab === 'report' ? (
          /* 1. VISTA DE FORMULARIO DE REPORTE INTACTA Y SIN MODIFICACIONES */
          <IncidentForm
            user={null}
            activeIncidents={incidents}
            nextId={nextId}
            onSubmitIncident={handleSubmitIncident}
            onViewIncidentDetail={(inc) => {
              setSelectedIncident(inc);
              setActiveTab('dashboard');
            }}
            isSubmitting={isSubmitting}
          />
        ) : (
          /* 2. PANEL DE COORDINACIÓN CON GESTIÓN DE PERSONAL Y TRAZABILIDAD */
          <AdminDashboard
            incidents={incidents}
            onOpenDetail={(inc) => setSelectedIncident(inc)}
            onRequestStatusChange={handleRequestStatusChange}
            onZoomPhoto={(url, title) => setZoomedPhoto({ url, title })}
            sheetMeta={null}
            onRefreshData={handleManualRefresh}
            isRefreshing={isSyncing}
            isCoordinator={isCoordinator}
            onOpenPinLogin={() => setIsPinLoginOpen(true)}
            onOpenChangePin={() => setIsChangePinOpen(true)}
            staffList={staffList}
            onOpenStaffManagement={() => setIsStaffModalOpen(true)}
            coordinatorIdentity={coordinatorIdentity}
            autoRefreshSecondsLeft={autoRefreshSecondsLeft}
          />
        )}
      </main>

      {/* Modal de Confirmación de Envío con Ticket Destacado */}
      <SubmissionSuccessModal
        incident={submittedIncidentModal}
        onClose={() => setSubmittedIncidentModal(null)}
        onGoToDashboard={() => {
          setSubmittedIncidentModal(null);
          setActiveTab('dashboard');
        }}
        isOffline={isLastSubmitOffline}
      />

      {/* 3. Modal de Autenticación por PIN y Captura de Nombre/Email del Coordinador */}
      <PinLoginModal
        isOpen={isPinLoginOpen}
        onClose={() => setIsPinLoginOpen(false)}
        defaultName={coordinatorIdentity}
        onSuccess={(coordinatorName) => {
          setIsCoordinator(true);
          setCoordinatorIdentity(coordinatorName);
          try {
            localStorage.setItem('mp_coordinator_name', coordinatorName);
          } catch {}
          setIsPinLoginOpen(false);
          showToast(`Acceso concedido como Coordinador: ${coordinatorName}`, 'success');
        }}
      />

      {/* Modal de Cambio de PIN */}
      <ChangePinModal
        isOpen={isChangePinOpen}
        onClose={() => setIsChangePinOpen(false)}
        onPinChanged={() => {
          showToast('Clave PIN de coordinador actualizada exitosamente.', 'success');
        }}
      />

      {/* 2. Modal de Gestión Dinámica de Personal Asignable */}
      <StaffManagementModal
        isOpen={isStaffModalOpen}
        onClose={() => setIsStaffModalOpen(false)}
        staffList={staffList}
        onUpdateStaffList={handleUpdateStaffList}
      />

      {/* Modal de Detalle de Incidencia con Trazabilidad y Gestión de Personal */}
      {selectedIncident && (
        <IncidentDetailModal
          incident={selectedIncident}
          onClose={() => setSelectedIncident(null)}
          onUpdateIncident={handleModalUpdate}
          onZoomPhoto={(url, title) => setZoomedPhoto({ url, title })}
          currentUserEmail={coordinatorIdentity || undefined}
          isLoading={isMutating}
          isCoordinator={isCoordinator}
          onOpenPinLogin={() => setIsPinLoginOpen(true)}
          staffList={staffList}
          onOpenStaffManagement={() => setIsStaffModalOpen(true)}
          coordinatorIdentity={coordinatorIdentity}
        />
      )}

      {/* Modal de Confirmación para Operaciones Mutantes */}
      <WorkspaceConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmLabel={confirmModal.confirmLabel}
        confirmVariant={confirmModal.confirmVariant}
        isLoading={isMutating}
        onConfirm={async () => {
          await confirmModal.onConfirmAction();
        }}
        onCancel={() => {
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        }}
      />

      {/* Modal de Código QR */}
      <QRCodeModal isOpen={isQRModalOpen} onClose={() => setIsQRModalOpen(false)} />

      {/* Modal de Zoom de Foto */}
      <ImageModal
        imageUrl={zoomedPhoto ? zoomedPhoto.url : null}
        title={zoomedPhoto ? zoomedPhoto.title : undefined}
        onClose={() => setZoomedPhoto(null)}
      />

      {/* Barra Móvil Inferior Fija */}
      <div className="md:hidden fixed bottom-0 inset-x-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xs border-t border-slate-200 dark:border-slate-800 py-2 px-6 flex items-center justify-around z-30 shadow-lg">
        <button
          type="button"
          onClick={() => setActiveTab('report')}
          className={`flex flex-col items-center gap-0.5 text-xs font-bold ${
            activeTab === 'report' ? 'text-amber-700 dark:text-amber-400' : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          <span>Reportar</span>
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              activeTab === 'report' ? 'bg-amber-700 dark:bg-amber-400' : 'bg-transparent'
            }`}
          />
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('dashboard')}
          className={`flex flex-col items-center gap-0.5 text-xs font-bold relative ${
            activeTab === 'dashboard' ? 'text-amber-700 dark:text-amber-400' : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          <span className="flex items-center gap-1">
            <span>Coordinación</span>
            {highPriorityCount > 0 && (
              <span className="w-2 h-2 rounded-full bg-red-600 animate-ping"></span>
            )}
          </span>
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              activeTab === 'dashboard' ? 'bg-amber-700 dark:bg-amber-400' : 'bg-transparent'
            }`}
          />
        </button>
      </div>

    </div>
  );
}
