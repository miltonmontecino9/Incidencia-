import React, { useState } from 'react';
import { X, Users, UserPlus, Trash2, CheckCircle, AlertCircle, Briefcase, Mail, Power } from 'lucide-react';
import { StaffMember } from '../types/incident';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  staffList: StaffMember[];
  onUpdateStaffList: (updated: StaffMember[]) => void;
}

export const StaffManagementModal: React.FC<Props> = ({
  isOpen,
  onClose,
  staffList,
  onUpdateStaffList,
}) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen) return null;

  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('El nombre y apellido son obligatorios.');
      return;
    }

    if (!role.trim()) {
      setError('La especialidad o rol es obligatoria (ej: Audio/Técnica, Primeros Auxilios).');
      return;
    }

    const emailValue = email.trim() || `${name.trim().toLowerCase().replace(/\s+/g, '.')}@evento.org`;

    // Check duplicate email
    if (staffList.some((s) => s.email.toLowerCase() === emailValue.toLowerCase())) {
      setError('Ya existe un miembro con este correo electrónico.');
      return;
    }

    const newMember: StaffMember = {
      id: `st_${Date.now()}`,
      name: name.trim(),
      email: emailValue,
      role: role.trim(),
      active: true,
    };

    const updated = [...staffList, newMember];
    onUpdateStaffList(updated);

    setName('');
    setEmail('');
    setRole('');
    setSuccessMsg(`"${newMember.name}" añadido al equipo con éxito.`);
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const handleDeleteMember = (id: string, memberName: string) => {
    if (staffList.length <= 1) {
      alert('Debe quedar al menos un miembro en la lista de personal asignable.');
      return;
    }
    const updated = staffList.filter((s) => s.id !== id);
    onUpdateStaffList(updated);
    setSuccessMsg(`"${memberName}" eliminado de la lista.`);
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const handleToggleActive = (id: string) => {
    const updated = staffList.map((s) => (s.id === id ? { ...s, active: s.active === false ? true : false } : s));
    onUpdateStaffList(updated);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-xl w-full p-6 text-slate-900 dark:text-white my-auto max-h-[90vh] flex flex-col">
        
        {/* Cabecera */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4 shrink-0">
          <div className="flex items-center gap-2 font-bold text-base">
            <div className="w-8 h-8 rounded-xl bg-amber-600 text-white flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold">Gestión de Personal Asignable</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-normal">
                Configura los miembros que aparecerán en la asignación de incidencias.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mensaje de éxito */}
        {successMsg && (
          <div className="mb-3 p-2.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 rounded-xl border border-emerald-200 dark:border-emerald-800 text-xs font-semibold flex items-center gap-1.5 animate-in fade-in">
            <CheckCircle className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        <div className="overflow-y-auto space-y-5 flex-1 pr-1">
          
          {/* Formulario para agregar nuevo miembro */}
          <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
            <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <UserPlus className="w-4 h-4 text-amber-600" />
              <span>Agregar Nuevo Miembro al Equipo</span>
            </h4>

            <form onSubmit={handleAddMember} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                    Nombre Completo *
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ej: Lucía Gómez"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                    Especialidad / Rol *
                  </label>
                  <input
                    type="text"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    placeholder="Ej: Audio/Técnica, Logística"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                  Correo Electrónico (Opcional)
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="lucia.gomez@evento.org"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {error && (
                <div className="text-xs text-red-600 dark:text-red-400 font-semibold flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>{error}</span>
                </div>
              )}

              <div className="pt-1 flex justify-end">
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition shadow-xs"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Guardar Miembro</span>
                </button>
              </div>
            </form>
          </div>

          {/* Lista de Miembros Actuales */}
          <div>
            <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2 flex items-center justify-between">
              <span>Personal Actual ({staffList.length})</span>
              <span className="text-[10px] text-slate-400 font-normal">Disponibles en el selector de despacho</span>
            </h4>

            <div className="space-y-2 max-h-56 overflow-y-auto">
              {staffList.map((member) => {
                const isActive = member.active !== false;
                return (
                  <div
                    key={member.id}
                    className={`p-3 rounded-xl border flex items-center justify-between gap-3 transition ${
                      isActive
                        ? 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                        : 'bg-slate-100 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 opacity-60'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-xs text-slate-900 dark:text-white truncate">
                          {member.name}
                        </span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                          {member.role}
                        </span>
                        {!isActive && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-500">
                            Desactivado
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                        {member.email}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleToggleActive(member.id)}
                        className={`p-1.5 rounded-lg text-xs transition ${
                          isActive
                            ? 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                            : 'text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
                        }`}
                        title={isActive ? 'Desactivar miembro temporalmente' : 'Reactivar miembro'}
                      >
                        <Power className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteMember(member.id, member.name)}
                        className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition"
                        title="Eliminar de la lista"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* Pie */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold transition"
          >
            Listo / Cerrar
          </button>
        </div>

      </div>
    </div>
  );
};
