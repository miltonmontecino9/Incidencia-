import React, { useState } from 'react';
import { X, KeyRound, Check, AlertCircle } from 'lucide-react';
import { updatePinAsync } from '../utils/security';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onPinChanged: () => void;
}

export const ChangePinModal: React.FC<Props> = ({ isOpen, onClose, onPinChanged }) => {
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!/^\d{4}$/.test(currentPin)) {
      setErrorMsg('El PIN actual debe tener 4 dígitos.');
      return;
    }

    if (!/^\d{4}$/.test(newPin)) {
      setErrorMsg('El nuevo PIN debe tener exactamente 4 dígitos numéricos.');
      return;
    }

    if (newPin !== confirmPin) {
      setErrorMsg('La confirmación no coincide con el nuevo PIN.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await updatePinAsync(currentPin, newPin);
      if (res.success) {
        setSuccess(true);
        setTimeout(() => {
          setSuccess(false);
          setCurrentPin('');
          setNewPin('');
          setConfirmPin('');
          onPinChanged();
          onClose();
        }, 1500);
      } else {
        setErrorMsg(res.error || 'Error al actualizar el PIN.');
      }
    } catch {
      setErrorMsg('Error de red al actualizar el PIN.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-sm w-full p-6 overflow-hidden">
        
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
          <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-base">
            <KeyRound className="w-5 h-5 text-amber-600" />
            <span>Cambiar PIN de Coordinador</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {success ? (
          <div className="py-6 text-center text-emerald-600 dark:text-emerald-400 space-y-2">
            <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950/60 mx-auto flex items-center justify-center">
              <Check className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h4 className="font-bold text-base">¡PIN actualizado con éxito!</h4>
            <p className="text-xs text-slate-500">Usa tu nueva clave de 4 dígitos a partir de ahora.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 text-left">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                PIN Actual (4 dígitos)
              </label>
              <input
                type="password"
                maxLength={4}
                value={currentPin}
                onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, ''))}
                placeholder="****"
                className="w-full px-3 py-2 text-center tracking-widest font-mono text-base rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                Nuevo PIN (4 dígitos)
              </label>
              <input
                type="password"
                maxLength={4}
                value={newPin}
                onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                placeholder="****"
                className="w-full px-3 py-2 text-center tracking-widest font-mono text-base rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                Confirmar Nuevo PIN
              </label>
              <input
                type="password"
                maxLength={4}
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                placeholder="****"
                className="w-full px-3 py-2 text-center tracking-widest font-mono text-base rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500"
                required
              />
            </div>

            {errorMsg && (
              <div className="flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400 font-semibold bg-red-50 dark:bg-red-950/40 p-2.5 rounded-lg border border-red-200 dark:border-red-900">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="pt-2 flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="flex-1 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition shadow-xs"
              >
                Guardar Clave
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
