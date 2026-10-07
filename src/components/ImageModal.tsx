import React from 'react';
import { X, ZoomIn, Download } from 'lucide-react';

interface Props {
  imageUrl: string | null;
  title?: string;
  onClose: () => void;
}

export const ImageModal: React.FC<Props> = ({ imageUrl, title, onClose }) => {
  if (!imageUrl) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative max-w-4xl w-full max-h-[92vh] flex flex-col items-center">
        {/* Controls */}
        <div className="w-full flex items-center justify-between text-white pb-3 px-2">
          <span className="text-sm font-semibold tracking-wide truncate">
            {title || 'Foto de Evidencia de la Incidencia'}
          </span>
          <div className="flex items-center gap-3">
            <a
              href={imageUrl}
              download="evidencia-incidencia.jpg"
              className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white transition flex items-center gap-1 text-xs"
              title="Descargar imagen"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Descargar</span>
            </a>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white transition"
              title="Cerrar vista ampliada"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Image viewport */}
        <div className="bg-slate-950/60 rounded-2xl p-2 border border-white/10 shadow-2xl overflow-hidden max-h-[82vh] flex items-center justify-center">
          <img
            src={imageUrl}
            alt="Evidencia ampliada"
            className="max-h-[80vh] w-auto max-w-full object-contain rounded-xl select-none"
          />
        </div>
      </div>
    </div>
  );
};
