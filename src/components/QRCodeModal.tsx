import React, { useState } from 'react';
import { X, Copy, Check, QrCode, ExternalLink, Search } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  incidentId?: string | null;
}

export const QRCodeModal: React.FC<Props> = ({ isOpen, onClose, incidentId }) => {
  const [copied, setCopied] = useState(false);
  const [searchTicket, setSearchTicket] = useState('');

  if (!isOpen) return null;

  // Si se provee un incidentId específico, el QR apunta al seguimiento de ese ticket
  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';
  const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
  const activeTicket = incidentId || searchTicket.trim();

  const targetUrl = activeTicket
    ? `${currentOrigin}${currentPath}?ticket=${encodeURIComponent(activeTicket)}`
    : typeof window !== 'undefined'
    ? window.location.href
    : '';

  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=280x280&margin=10&data=${encodeURIComponent(
    targetUrl
  )}`;

  const handleCopy = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(targetUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-sm w-full overflow-hidden p-6 text-center text-slate-900 dark:text-white">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
          <div className="flex items-center gap-2 font-bold text-base">
            <QrCode className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            <span>{activeTicket ? `QR Ticket: ${activeTicket}` : 'Acceso Rápido al Sistema'}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-slate-600 dark:text-slate-300 mb-3">
          {activeTicket
            ? 'Escanea este código para consultar el estado y avances en tiempo real de este reporte:'
            : 'Escanea este código con cualquier teléfono para acceder al sistema y reportar incidencias:'}
        </p>

        {/* Input opcional para ingresar otro ticket */}
        {!incidentId && (
          <div className="mb-3">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Escribe ticket (ej. INC-001) para QR individual"
                value={searchTicket}
                onChange={(e) => setSearchTicket(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-amber-500 font-mono"
              />
            </div>
          </div>
        )}

        {/* QR Code Container */}
        <div className="inline-block p-3 bg-white rounded-2xl border-2 border-slate-200 dark:border-slate-700 shadow-inner mb-4">
          <img
            src={qrImageUrl}
            alt="Código QR de la aplicación"
            className="w-52 h-52 mx-auto object-contain"
            onError={(e) => {
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
        </div>

        {activeTicket && (
          <div className="mb-3 px-3 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-xs font-mono font-bold">
            Ticket: {activeTicket}
          </div>
        )}

        <div className="bg-slate-50 dark:bg-slate-800 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2 mb-4">
          <span className="text-[11px] text-slate-600 dark:text-slate-300 font-mono truncate">{targetUrl}</span>
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-amber-700 text-white hover:bg-amber-800 transition shrink-0"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-white" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copiado' : 'Copiar'}</span>
          </button>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-full py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold transition"
        >
          Cerrar
        </button>
      </div>
    </div>
  );
};
