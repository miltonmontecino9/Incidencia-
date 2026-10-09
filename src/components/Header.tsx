import React from 'react';
import logoOficial from '../assets/logo_oficial.png';
import {
  ClipboardList,
  LayoutDashboard,
  QrCode,
  Lock,
  Unlock,
  Sun,
  Moon,
  KeyRound,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';

interface Props {
  activeTab: 'report' | 'dashboard';
  setActiveTab: (tab: 'report' | 'dashboard') => void;
  isOnline?: boolean;
  isSyncing?: boolean;
  onRefreshData?: () => void;
  isRefreshing?: boolean;
  highPriorityCount: number;
  onOpenQR: () => void;
  // Role & PIN Control
  isCoordinator: boolean;
  onOpenPinLogin: () => void;
  onLogoutCoordinator: () => void;
  onOpenChangePin: () => void;
  // Theme Toggle
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
}

export const Header: React.FC<Props> = ({
  activeTab,
  setActiveTab,
  isOnline = true,
  isSyncing = false,
  onRefreshData,
  isRefreshing = false,
  highPriorityCount,
  onOpenQR,
  isCoordinator,
  onOpenPinLogin,
  onLogoutCoordinator,
  onOpenChangePin,
  isDarkMode,
  onToggleDarkMode,
}) => {
  return (
    <header className="bg-slate-900 dark:bg-slate-950 text-white shadow-lg sticky top-0 z-40 border-b border-slate-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Fila Principal */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 py-3">
          
          {/* Logo e Identidad Global del Congreso */}
          <div className="flex items-center gap-3">
            <img
              src={logoOficial}
              alt="Logo Oficial Museo Patagónico"
              referrerPolicy="no-referrer"
              className="h-[48px] w-auto max-h-[48px] object-contain shrink-0"
            />
            <div>
              <h1 className="text-base sm:text-lg font-black text-slate-100 tracking-tight leading-tight">
                MUSEO PATAGÓNICO
              </h1>
              <p className="text-xs font-semibold text-amber-400 tracking-wide leading-tight mt-0.5">
                Sistema de Reporte y Gestión de Incidencias
              </p>
            </div>
          </div>

          {/* Navegación y Pestañas */}
          <div className="flex items-center gap-2 self-start md:self-auto flex-wrap">
            <div className="inline-flex p-1 bg-slate-800 dark:bg-slate-900 rounded-lg border border-slate-700/80">
              <button
                type="button"
                onClick={() => setActiveTab('report')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs sm:text-sm font-semibold transition-colors ${
                  activeTab === 'report'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
                }`}
              >
                <ClipboardList className="w-4 h-4" />
                <span>Reportar Incidencia</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('dashboard')}
                className={`relative flex items-center gap-2 px-3 py-1.5 rounded-md text-xs sm:text-sm font-semibold transition-colors ${
                  activeTab === 'dashboard'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
                }`}
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>Panel Coordinación</span>
                {highPriorityCount > 0 && (
                  <span className="inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-black rounded-full bg-red-600 text-white animate-pulse">
                    {highPriorityCount}
                  </span>
                )}
              </button>
            </div>

            {/* Selector de Modo Claro / Oscuro */}
            <button
              type="button"
              onClick={onToggleDarkMode}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs transition"
              title={isDarkMode ? 'Cambiar a Modo Claro' : 'Cambiar a Modo Oscuro'}
            >
              {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-300" />}
            </button>

            {/* Botón QR */}
            <button
              type="button"
              onClick={onOpenQR}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-400 border border-slate-700 text-xs font-semibold transition"
              title="Mostrar Código QR"
            >
              <QrCode className="w-4 h-4" />
              <span className="hidden sm:inline">Código QR</span>
            </button>
          </div>

          {/* Indicador de Rol + Indicador de Conexión Centralizada */}
          <div className="flex items-center gap-2 flex-wrap">
            
            {/* 1. INDICADOR Y CONTROLES DE ROL (VOLUNTARIO VS COORDINADOR) */}
            {isCoordinator ? (
              /* MODO COORDINADOR ACTIVO */
              <div className="flex items-center gap-1.5 bg-emerald-950/80 border border-emerald-500/70 text-emerald-200 px-2.5 py-1.5 rounded-lg text-xs font-semibold">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="hidden sm:inline">Vista Coordinador (Modo Edición)</span>
                <span className="sm:hidden">Coordinador</span>
                
                <button
                  type="button"
                  onClick={onOpenChangePin}
                  className="p-1 hover:bg-emerald-900 text-emerald-300 rounded ml-1"
                  title="Cambiar PIN de Acceso"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={onLogoutCoordinator}
                  className="px-2 py-0.5 bg-emerald-900 hover:bg-emerald-800 text-emerald-100 rounded text-[11px] font-bold transition ml-1"
                  title="Cerrar Modo Coordinador y volver a Voluntario"
                >
                  Bloquear
                </button>
              </div>
            ) : (
              /* MODO VOLUNTARIO (SOLO LECTURA) */
              <div className="flex items-center gap-1.5 bg-slate-800 border border-slate-700 text-slate-300 px-2.5 py-1.5 rounded-lg text-xs font-medium">
                <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="hidden sm:inline text-slate-400">Vista Voluntario (Lectura)</span>
                
                <button
                  type="button"
                  onClick={onOpenPinLogin}
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-amber-600 hover:bg-amber-500 text-white rounded text-xs font-bold transition shadow-xs"
                >
                  <Unlock className="w-3.5 h-3.5" />
                  <span>Acceso Coordinador</span>
                </button>
              </div>
            )}

            {/* 4. INDICADOR DE CONEXIÓN Y SINCRONIZACIÓN EN TIEMPO REAL */}
            <div className="flex items-center gap-1.5 bg-slate-800/90 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs">
              {isSyncing ? (
                <>
                  <RefreshCw className="w-3 h-3 text-amber-400 animate-spin shrink-0" />
                  <span className="text-amber-300 font-semibold text-[11px] sm:text-xs">Sincronizando...</span>
                </>
              ) : isOnline ? (
                <>
                  <span className="relative flex h-2.5 w-2.5 shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                  </span>
                  <span className="text-emerald-400 font-bold text-[11px] sm:text-xs tracking-tight">
                    En línea / Sincronizado
                  </span>
                </>
              ) : (
                <>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500 shrink-0"></span>
                  <span className="text-rose-400 font-bold text-[11px] sm:text-xs tracking-tight">
                    Desconectado (Modo local)
                  </span>
                </>
              )}

              {onRefreshData && (
                <button
                  type="button"
                  onClick={onRefreshData}
                  disabled={isRefreshing}
                  className="text-slate-400 hover:text-white p-0.5 hover:bg-slate-700 rounded ml-1 transition"
                  title="Sincronizar ahora con la base central"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-amber-400' : ''}`} />
                </button>
              )}
            </div>

          </div>

        </div>
      </div>
    </header>
  );
};

