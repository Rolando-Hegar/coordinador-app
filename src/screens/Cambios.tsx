import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useAppStore } from '../store/app';
import Spinner from '../components/Spinner';

interface Cambio {
  id_cambio:          string;
  codigo_tienda:      string;
  descripcion:        string;
  monto:              number | null;
  estado:             string;
  solicitado_por:     string | null;
  fecha_solicitud:    string | null;
  autorizado_por:     string | null;
  motivo_rechazo:     string | null;
  fecha_autorizacion: string | null;
  asignado_a:         string | null;
  nombre_tecnico:     string | null;
  fecha_entrega:      string | null;
  confirmado_por:     string | null;
  fecha_confirmacion: string | null;
  notas:              string | null;
}

interface TecnicoOpcion { codigo_tecnico: string; nombre: string; }

const ESTADO_INFO: Record<string, { label: string; cls: string }> = {
  pendiente:  { label: 'Pendiente',    cls: 'bg-srv-warn/15 text-srv-warn' },
  autorizado: { label: 'Autorizado',   cls: 'bg-srv-ok/15 text-srv-ok' },
  rechazado:  { label: 'Rechazado',    cls: 'bg-srv-crit/15 text-srv-crit' },
  entregado:  { label: 'Entregado',    cls: 'bg-srv-accent/15 text-srv-accent' },
  confirmado: { label: 'Confirmado',   cls: 'bg-srv-ok/15 text-srv-ok' },
};

function relativeTime(d: string | null): string {
  if (!d) return '';
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `hace ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `hace ${h} h`;
  return `hace ${Math.floor(h / 24)} día${Math.floor(h / 24) !== 1 ? 's' : ''}`;
}

function fmtMonto(m: number | null): string {
  if (!m) return '';
  return ` · $${m.toLocaleString('es-MX')}`;
}

export default function Cambios() {
  const coordinador = useAppStore(s => s.coordinador)!;

  const [cambios, setCambios]             = useState<Cambio[]>([]);
  const [tecPorTienda, setTecPorTienda]   = useState<Record<string, TecnicoOpcion[]>>({});
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState('');
  const [tab, setTab]                     = useState<'pendientes' | 'historial'>('pendientes');

  // Autorizar modal
  const [modalAut, setModalAut]           = useState<Cambio | null>(null);
  const [tecSelec, setTecSelec]           = useState('');
  const [saving, setSaving]               = useState(false);

  // Rechazar modal
  const [modalRec, setModalRec]           = useState<Cambio | null>(null);
  const [motivo, setMotivo]               = useState('');

  function load() {
    setLoading(true);
    api.get<{ cambios: Cambio[]; tecnicosPorTienda: Record<string, TecnicoOpcion[]> }>('getCambios', {
      tiendas: coordinador.tiendas_asignadas.join(','),
    })
      .then(d => { setCambios(d.cambios); setTecPorTienda(d.tecnicosPorTienda); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(load, [coordinador]);

  function openAutorizar(c: Cambio) {
    const opts = tecPorTienda[c.codigo_tienda] ?? [];
    setTecSelec(opts[0]?.codigo_tecnico ?? '');
    setModalAut(c);
  }

  async function confirmarAutorizar() {
    if (!modalAut || !tecSelec) return;
    const opts = tecPorTienda[modalAut.codigo_tienda] ?? [];
    const tec  = opts.find(t => t.codigo_tecnico === tecSelec);
    setSaving(true);
    try {
      await api.post('autorizarCambio', {
        id_cambio:      modalAut.id_cambio,
        autorizado_por: coordinador.nombre,
        asignado_a:     tecSelec,
        nombre_tecnico: tec?.nombre ?? tecSelec,
      });
      setModalAut(null);
      load();
    } catch (e) { setError(e instanceof Error ? e.message : 'Error'); }
    finally { setSaving(false); }
  }

  async function confirmarRechazar() {
    if (!modalRec || !motivo.trim()) return;
    setSaving(true);
    try {
      await api.post('rechazarCambio', {
        id_cambio:      modalRec.id_cambio,
        autorizado_por: coordinador.nombre,
        motivo_rechazo: motivo.trim(),
      });
      setModalRec(null);
      setMotivo('');
      load();
    } catch (e) { setError(e instanceof Error ? e.message : 'Error'); }
    finally { setSaving(false); }
  }

  const pendientes = cambios.filter(c => c.estado === 'pendiente');
  const historial  = cambios.filter(c => c.estado !== 'pendiente');

  const lista = tab === 'pendientes' ? pendientes : historial;

  return (
    <div className="screen">
      {/* Header */}
      <div className="pl-14 pr-4 pt-4 pb-3 safe-top flex-shrink-0">
        <p className="text-xs text-srv-text-muted">Gestión de efectivo</p>
        <p className="text-xl font-semibold text-srv-text">Cambios de base</p>
      </div>

      {/* Tabs */}
      <div className="px-4 pb-3 flex gap-2 flex-shrink-0">
        <button
          onClick={() => setTab('pendientes')}
          className={`px-4 py-1.5 rounded-full text-xs font-medium border-none cursor-pointer transition-colors ${tab === 'pendientes' ? 'bg-srv-accent text-white' : 'bg-white/[0.06] text-srv-text-sub'}`}
        >
          Pendientes{pendientes.length > 0 && ` (${pendientes.length})`}
        </button>
        <button
          onClick={() => setTab('historial')}
          className={`px-4 py-1.5 rounded-full text-xs font-medium border-none cursor-pointer transition-colors ${tab === 'historial' ? 'bg-srv-accent text-white' : 'bg-white/[0.06] text-srv-text-sub'}`}
        >
          Historial
        </button>
      </div>

      {/* List */}
      <div className="scroll-area px-4 pb-4">
        {loading && <Spinner />}
        {error && <p className="text-srv-crit text-sm text-center mt-4">{error}</p>}

        {!loading && lista.length === 0 && (
          <p className="text-srv-text-muted text-sm text-center mt-8">
            {tab === 'pendientes' ? 'Sin solicitudes pendientes.' : 'Sin historial aún.'}
          </p>
        )}

        <div className="flex flex-col gap-3">
          {lista.map(c => {
            const ei = ESTADO_INFO[c.estado] ?? { label: c.estado, cls: 'bg-white/[0.06] text-srv-text-sub' };
            return (
              <div key={c.id_cambio} className="card px-4 py-3">
                {/* Top row */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-srv-text">{c.codigo_tienda}</p>
                    <p className="text-xs text-srv-text-muted mt-0.5">{c.solicitado_por ?? '—'} · {relativeTime(c.fecha_solicitud)}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${ei.cls}`}>{ei.label}</span>
                </div>

                {/* Descripción */}
                <p className="text-sm text-srv-text mb-0.5">{c.descripcion}{fmtMonto(c.monto)}</p>
                {c.notas && <p className="text-xs text-srv-text-muted italic mb-1">{c.notas}</p>}

                {/* Estado info */}
                {c.estado === 'autorizado' && c.nombre_tecnico && (
                  <p className="text-xs text-srv-ok mt-1">Asignado a {c.nombre_tecnico}</p>
                )}
                {c.estado === 'rechazado' && c.motivo_rechazo && (
                  <p className="text-xs text-srv-crit mt-1">Motivo: {c.motivo_rechazo}</p>
                )}
                {c.estado === 'entregado' && (
                  <p className="text-xs text-srv-accent mt-1">Entregado por {c.nombre_tecnico} · {relativeTime(c.fecha_entrega)}</p>
                )}
                {c.estado === 'confirmado' && (
                  <p className="text-xs text-srv-ok mt-1">Confirmado por {c.confirmado_por} · {relativeTime(c.fecha_confirmacion)}</p>
                )}

                {/* Action buttons for pending */}
                {c.estado === 'pendiente' && (
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => openAutorizar(c)}
                      className="flex-1 h-9 rounded-10 bg-srv-ok/15 text-srv-ok text-sm font-medium border border-srv-ok/30 cursor-pointer"
                    >
                      Autorizar
                    </button>
                    <button
                      onClick={() => { setModalRec(c); setMotivo(''); }}
                      className="flex-1 h-9 rounded-10 bg-srv-crit/15 text-srv-crit text-sm font-medium border border-srv-crit/30 cursor-pointer"
                    >
                      Rechazar
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal Autorizar */}
      {modalAut && (
        <div className="absolute inset-0 bg-black/60 flex items-end z-50" onClick={() => setModalAut(null)}>
          <div className="w-full bg-srv-surface rounded-t-[20px] p-5 pb-8" onClick={e => e.stopPropagation()}>
            <p className="font-semibold text-srv-text mb-1">Autorizar cambio</p>
            <p className="text-xs text-srv-text-muted mb-4">{modalAut.descripcion}{fmtMonto(modalAut.monto)}</p>

            <p className="label mb-2">Asignar técnico</p>
            <div className="flex flex-col gap-2 max-h-48 overflow-y-auto mb-4">
              {(tecPorTienda[modalAut.codigo_tienda] ?? []).length === 0 && (
                <p className="text-sm text-srv-text-muted">Sin técnicos asignados a esta tienda.</p>
              )}
              {(tecPorTienda[modalAut.codigo_tienda] ?? []).map(t => (
                <button
                  key={t.codigo_tecnico}
                  onClick={() => setTecSelec(t.codigo_tecnico)}
                  className={`px-4 py-3 rounded-12 border text-left cursor-pointer transition-colors ${
                    tecSelec === t.codigo_tecnico
                      ? 'border-srv-ok bg-srv-ok/10 text-srv-text'
                      : 'border-white/[0.07] bg-srv-bg text-srv-text-sub'
                  }`}
                >
                  <p className="text-sm font-medium">{t.nombre}</p>
                  <p className="text-xs text-srv-text-muted">{t.codigo_tecnico}</p>
                </button>
              ))}
            </div>

            <button
              onClick={confirmarAutorizar}
              disabled={!tecSelec || saving}
              className="btn-primary w-full disabled:opacity-50"
            >
              {saving ? 'Autorizando…' : 'Confirmar autorización'}
            </button>
          </div>
        </div>
      )}

      {/* Modal Rechazar */}
      {modalRec && (
        <div className="absolute inset-0 bg-black/60 flex items-end z-50" onClick={() => setModalRec(null)}>
          <div className="w-full bg-srv-surface rounded-t-[20px] p-5 pb-8" onClick={e => e.stopPropagation()}>
            <p className="font-semibold text-srv-text mb-1">Rechazar solicitud</p>
            <p className="text-xs text-srv-text-muted mb-4">{modalRec.descripcion}{fmtMonto(modalRec.monto)}</p>

            <p className="label mb-2">Motivo del rechazo</p>
            <textarea
              value={motivo}
              onChange={e => setMotivo(e.target.value)}
              placeholder="Ej: No hay efectivo disponible, solicitar la próxima semana"
              rows={3}
              className="w-full bg-srv-bg border border-white/[0.07] rounded-12 px-3 py-2.5 text-sm text-srv-text placeholder:text-srv-text-muted resize-none mb-4 outline-none"
            />
            <button
              onClick={confirmarRechazar}
              disabled={!motivo.trim() || saving}
              className="h-12 w-full rounded-12 bg-srv-crit/15 text-srv-crit font-medium text-base border border-srv-crit/30 cursor-pointer disabled:opacity-50"
            >
              {saving ? 'Rechazando…' : 'Confirmar rechazo'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
