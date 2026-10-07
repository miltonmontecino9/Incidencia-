import React, { useState } from 'react';
import { X, Copy, Check, QrCode, ExternalLink } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const QRCodeModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);
  if (!isOpen) return null;

  const appUrl = window.location.href;
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=280x280&margin=10&data=${encodeURIComponent(
    appUrl
  )}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(appUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-sm w-full overflow-hidden p-6 text-center">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
          <div className="flex items-center gap-2 text-slate-900 font-bold text-base">
            <QrCode className="w-5 h-5 text-amber-700" />
            <span>Acceso Rápido al Sistema</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-slate-600 mb-4">
          Escanea este código con tu teléfono o proyéctalo en pantallas del evento para reportar incidencias al instante:
        </p>

        {/* QR Code Container */}
        <div className="inline-block p-3 bg-white rounded-xl border-2 border-slate-200 shadow-inner mb-4">
          <img
            src={qrImageUrl}
            alt="Código QR de la aplicación"
            className="w-56 h-56 mx-auto object-contain"
            onError={(e) => {
              // Fallback if network blocked
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
        </div>

        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 flex items-center justify-between gap-2 mb-4">
          <span className="text-[11px] text-slate-600 font-mono truncate">{appUrl}</span>
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
          className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition"
        >
          Cerrar
        </button>
      </div>
    </div>
  );
};
