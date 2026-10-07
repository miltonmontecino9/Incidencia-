import React, { useState } from 'react';
import { X, ShieldCheck, AlertCircle, UserCheck } from 'lucide-react';
import { verifyPinAsync } from '../utils/security';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (coordinatorName: string) => void;
  defaultName?: string;
}

export const PinLoginModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onSuccess,
  defaultName = '',
}) => {
  const [pin, setPin] = useState('');
  const [coordinatorName, setCoordinatorName] = useState(defaultName || '');
  const [error, setError] = useState(false);
  const [nameError, setNameError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  if (!isOpen) return null;

  const validateAndProceed = async (targetPin: string) => {
    if (!coordinatorName.trim()) {
      setNameError('Por favor ingresa tu nombre o email para firmar las acciones.');
      return;
    }
    setNameError('');
    setIsVerifying(true);

    try {
      const isValid = await verifyPinAsync(targetPin);
      if (isValid) {
        setError(false);
        const finalName = coordinatorName.trim();
        setPin('');
        onSuccess(finalName);
      } else {
        setError(true);
        setPin('');
      }
    } catch {
      setError(true);
      setPin('');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleKeyPress = (digit: string) => {
    if (isVerifying) return;
    if (pin.length < 4) {
      const nextPin = pin + digit;
      setPin(nextPin);
      setError(false);
      if (nextPin.length === 4) {
        validateAndProceed(nextPin);
      }
    }
  };

  const handleDelete = () => {
    if (isVerifying) return;
    setPin((prev) => prev.slice(0, -1));
    setError(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-sm w-full p-6 text-center overflow-hidden">
        
        {/* Cabecera */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
          <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-base">
            <ShieldCheck className="w-5 h-5 text-amber-600" />
            <span>Acceso de Coordinador</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 3. SOLICITUD DE NOMBRE O EMAIL DEL COORDINADOR EN TURNO */}
        <div className="text-left mb-4">
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1 flex items-center gap-1.5">
            <UserCheck className="w-3.5 h-3.5 text-amber-600" />
            <span>Coordinador en Turno (Firma) *</span>
          </label>
          <input
            type="text"
            value={coordinatorName}
            onChange={(e) => {
              setCoordinatorName(e.target.value);
              if (nameError) setNameError('');
            }}
            placeholder="Ej: Lic. Marcos Paz o marcos@museo.org"
            className={`w-full px-3 py-2 text-xs rounded-xl border bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 ${
              nameError ? 'border-red-500 bg-red-50/50' : 'border-slate-300 dark:border-slate-700'
            }`}
          />
          {nameError && (
            <p className="mt-1 text-[11px] text-red-600 dark:text-red-400 font-semibold">{nameError}</p>
          )}
          <p className="text-[10px] text-slate-400 mt-1">
            Se registrará en la bitácora de trazabilidad de cada acción efectuada.
          </p>
        </div>

        <p className="text-xs text-slate-600 dark:text-slate-300 mb-3">
          Ingresa el PIN de 4 dígitos para habilitar el despacho de incidencias.
        </p>

        {/* Indicador de 4 dígitos */}
        <div className="flex justify-center items-center gap-3 my-3">
          {[0, 1, 2, 3].map((index) => {
            const isFilled = pin.length > index;
            return (
              <div
                key={index}
                className={`w-11 h-12 rounded-xl border-2 flex items-center justify-center text-xl font-bold font-mono transition-all ${
                  isFilled
                    ? 'border-amber-600 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-400 scale-105'
                    : 'border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-400'
                } ${error ? 'border-red-500 bg-red-50 text-red-600 animate-shake' : ''}`}
              >
                {isFilled ? '●' : ''}
              </div>
            );
          })}
        </div>

        {error && (
          <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-red-600 dark:text-red-400 mb-3 animate-in fade-in">
            <AlertCircle className="w-4 h-4" />
            <span>PIN incorrecto. Intenta nuevamente.</span>
          </div>
        )}

        {isVerifying && (
          <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400 mb-3 animate-in fade-in">
            <span className="w-3.5 h-3.5 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" />
            <span>Verificando PIN...</span>
          </div>
        )}

        {/* Teclado Numérico */}
        <div className="grid grid-cols-3 gap-2 max-w-[240px] mx-auto mb-3">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => handleKeyPress(d)}
              className="h-12 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-bold text-lg transition active:scale-95 shadow-2xs"
            >
              {d}
            </button>
          ))}
          <button
            type="button"
            onClick={handleDelete}
            className="h-12 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-semibold text-xs transition active:scale-95 flex items-center justify-center"
          >
            Borrar
          </button>
          <button
            type="button"
            onClick={() => handleKeyPress('0')}
            className="h-12 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-bold text-lg transition active:scale-95 shadow-2xs"
          >
            0
          </button>
          <button
            type="button"
            onClick={() => validateAndProceed(pin)}
            disabled={pin.length < 4 || isVerifying}
            className="h-12 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-40 text-white font-bold text-xs transition active:scale-95 flex items-center justify-center shadow-xs"
          >
            {isVerifying ? (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              'OK'
            )}
          </button>
        </div>

      </div>
    </div>
  );
};
