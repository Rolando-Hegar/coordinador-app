import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useAppStore } from '../store/app';
import BottomNav from '../components/BottomNav';
import Spinner from '../components/Spinner';

interface Ticket {
  id_servicio:    string;
  codigo_tienda:  string;
  codigo_maquina: string;
  tipo_servicio:  string;
  descripcion:    string;
  estado:         string;
}

const ESTADO_LABEL: Record<string, { label: string; className: string }> = {
  nuevo:                   { label: 'Nuevo',          className: 'text-srv-text-muted' },
  en_proceso:              { label: 'En proceso',     className: 'text-srv-accent' },
  pendiente_confirmacion:  { label: 'Por confirmar',  className: 'text-amber-400' },
};

function EstadoBadge({ estado }: { estado: string }) {
  const { label, className } = ESTADO_LABEL[estado] ?? { label: estado, className: 'text-srv-text-muted' };
  return <span className={`font-medium ${className}`}>{label}</span>;
}

interface Tecnico {
  codigo_tecnico:     string;
  nombre_tecnico:     string;
  tickets_asignados:  number;
  tickets_en_proceso: number;
  tickets:            Ticket[];
}

export default function Tecnicos() {
  const coordinador = useAppStore(s => s.coordinador)!;

  const [tecnicos, setTecnicos]     = useState<Tecnico[]>([]);
  const [expanded, setExpanded]     = useState<string | null>(null);
  const [selected, setSelected]     = useState<Set<string>>(new Set());
  const [reasignModal, setReasignModal] = useState(false);
  const [destino, setDestino]       = useState('');
  const [saving, setSaving]         = useState(false);
  const [error, setError]           = useState('');
  const [loading, setLoading]       = useState(true);

  function load() {
    setLoading(true);
    setError('');
    api.get<{ tecnicos: Tecnico[] }>('getTecnicos', {
      tiendas: coordinador.tiendas_asignadas.join(','),
    })
      .then(d => setTecnicos(d.tecnicos))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(load, [coordinador]);

  function toggleTicket(id: string) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function reasignar() {
    if (!destino || selected.size === 0) return;
    const tec = tecnicos.find(t => t.codigo_tecnico === destino);
    setSaving(true);
    try {
      await api.post('reasignarTickets', {
        tickets:                  Array.from(selected),
        codigo_tecnico_destino:   destino,
        nombre_tecnico_destino:   tec?.nombre_tecnico ?? destino,
        usuario:                  coordinador.nombre,
      });
      setSelected(new Set());
      setReasignModal(false);
      setDestino('');
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al reasignar');
    } finally {
      setSaving(false);
    }
  }

  const origenCodigo = selected.size > 0
    ? tecnicos.find(t => t.tickets.some(tk => selected.has(tk.id_servicio)))?.codigo_tecnico ?? ''
    : '';

  return (
    <div className="screen">
      <div className="px-4 pt-4 pb-3 safe-top flex-shrink-0">
        <p className="text-xs text-srv-text-muted">Gestión de personal</p>
        <p className="text-xl font-semibold text-srv-text">Técnicos</p>
      </div>

      <div className="scroll-area px-4 pb-4">
        {loading && <Spinner />}
        {error && <p className="text-srv-crit text-sm text-center mt-4">{error}</p>}

        <div className="flex flex-col gap-3">
          {tecnicos.map(t => (
            <div key={t.codigo_tecnico} className="card overflow-hidden">
              {/* Card header */}
              <button
                onClick={() => { setExpanded(prev => prev === t.codigo_tecnico ? null : t.codigo_tecnico); }}
                className="w-full px-4 py-3 flex items-center justify-between text-left bg-transparent border-none cursor-pointer"
              >
                <div>
                  <p className="font-semibold text-srv-text text-sm">{t.nombre_tecnico}</p>
                  <p className="text-xs text-srv-text-muted mt-0.5">{t.codigo_tecnico}</p>
                  <div className="flex gap-1.5 mt-1.5">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-white/[0.06] text-srv-text-sub font-medium">
                      {t.tickets_asignados} asignado{t.tickets_asignados !== 1 ? 's' : ''}
                    </span>
                    {t.tickets_en_proceso > 0 && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-srv-accent/15 text-srv-accent font-medium">
                        {t.tickets_en_proceso} en proceso
                      </span>
                    )}
                  </div>
                </div>
                <svg
                  viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}
                  strokeLinecap="round" strokeLinejoin="round"
                  className={`w-4 h-4 text-srv-text-muted flex-shrink-0 transition-transform ${expanded === t.codigo_tecnico ? 'rotate-180' : ''}`}
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>

              {/* Expanded ticket list */}
              {expanded === t.codigo_tecnico && (
                <div className="border-t border-white/[0.07] px-4 py-3">
                  {t.tickets.length === 0 ? (
                    <p className="text-sm text-srv-text-muted">Sin tickets abiertos.</p>
                  ) : (
                    <>
                      <p className="label mb-2">Selecciona tickets a reasignar</p>
                      <div className="flex flex-col gap-2">
                        {t.tickets.map(tk => (
                          <label
                            key={tk.id_servicio}
                            className="flex items-start gap-3 py-2 cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={selected.has(tk.id_servicio)}
                              onChange={() => toggleTicket(tk.id_servicio)}
                              className="mt-0.5 accent-purple-500 w-4 h-4 flex-shrink-0"
                            />
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-srv-text">
                                <span className="font-mono text-srv-accent">{tk.codigo_maquina}</span>
                                {' · '}{tk.tipo_servicio}
                              </p>
                              <p className="text-xs text-srv-text-muted truncate">{tk.codigo_tienda} · <EstadoBadge estado={tk.estado} /></p>
                            </div>
                          </label>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Floating reasign button */}
      {selected.size > 0 && (
        <div className="px-4 py-3 border-t border-white/[0.07] flex-shrink-0">
          <button
            onClick={() => setReasignModal(true)}
            className="btn-primary w-full"
          >
            Reasignar {selected.size} ticket{selected.size !== 1 ? 's' : ''}
          </button>
        </div>
      )}

      {/* Modal */}
      {reasignModal && (
        <div className="absolute inset-0 bg-black/60 flex items-end" onClick={() => setReasignModal(false)}>
          <div
            className="w-full bg-srv-surface rounded-t-[20px] p-5 pb-8"
            onClick={e => e.stopPropagation()}
          >
            <p className="font-semibold text-srv-text mb-4">Selecciona técnico destino</p>
            <div className="flex flex-col gap-2 max-h-56 overflow-y-auto mb-4">
              {tecnicos
                .filter(t => t.codigo_tecnico !== origenCodigo)
                .map(t => (
                  <button
                    key={t.codigo_tecnico}
                    onClick={() => setDestino(t.codigo_tecnico)}
                    className={`px-4 py-3 rounded-12 border text-left cursor-pointer transition-colors ${
                      destino === t.codigo_tecnico
                        ? 'border-srv-accent bg-srv-accent/10 text-srv-text'
                        : 'border-white/[0.07] bg-srv-bg text-srv-text-sub'
                    }`}
                  >
                    <p className="text-sm font-medium">{t.nombre_tecnico}</p>
                    <p className="text-xs text-srv-text-muted">{t.tickets_asignados} tickets actuales</p>
                  </button>
                ))}
            </div>
            <button
              onClick={reasignar}
              disabled={!destino || saving}
              className="btn-primary w-full disabled:opacity-50"
            >
              {saving ? 'Reasignando…' : `Confirmar reasignación`}
            </button>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
