import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useAppStore } from '../store/app';
import BottomNav from '../components/BottomNav';
import Spinner from '../components/Spinner';

interface Recurrente { codigo_maquina: string; count: number; }

interface TiendaDetalle {
  codigo_tienda:    string;
  nombre_tienda:    string;
  total_maquinas:   number;
  maquinas_falla:   number;
  tickets_abiertos: number;
  recurrentes:      Recurrente[];
}

export default function MisTiendas() {
  const coordinador = useAppStore(s => s.coordinador)!;

  const [tiendas, setTiendas]   = useState<TiendaDetalle[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    api.get<{ tiendas: TiendaDetalle[] }>('getMisTiendas', {
      tiendas: coordinador.tiendas_asignadas.join(','),
    })
      .then(d => setTiendas(d.tiendas))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [coordinador]);

  function toggle(ct: string) {
    setExpanded(prev => prev === ct ? null : ct);
  }

  return (
    <div className="screen">
      <div className="px-4 pt-4 pb-3 safe-top flex-shrink-0">
        <p className="text-xs text-srv-text-muted">Vista general</p>
        <p className="text-xl font-semibold text-srv-text">Mis tiendas</p>
      </div>

      <div className="scroll-area px-4 pb-4">
        {loading && <Spinner />}
        {error && <p className="text-srv-crit text-sm text-center mt-8">{error}</p>}

        <div className="flex flex-col gap-3">
          {tiendas.map(t => (
            <div key={t.codigo_tienda} className="card overflow-hidden">
              {/* Header row */}
              <button
                onClick={() => toggle(t.codigo_tienda)}
                className="w-full px-4 py-3 flex items-start justify-between text-left bg-transparent border-none cursor-pointer"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-srv-text text-sm truncate">{t.nombre_tienda}</p>
                  <p className="text-xs text-srv-text-muted mt-0.5">{t.codigo_tienda}</p>
                  {/* Quick badges */}
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    <Badge label={`${t.total_maquinas} máq`} />
                    {t.tickets_abiertos > 0
                      ? <Badge label={`${t.tickets_abiertos} abiertos`} color="warn" />
                      : <Badge label="Sin tickets" color="ok" />}
                    {t.maquinas_falla > 0 && <Badge label={`${t.maquinas_falla} con falla`} color="crit" />}
                  </div>
                </div>
                <svg
                  viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}
                  strokeLinecap="round" strokeLinejoin="round"
                  className={`w-4 h-4 text-srv-text-muted ml-2 mt-0.5 flex-shrink-0 transition-transform ${expanded === t.codigo_tienda ? 'rotate-180' : ''}`}
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>

              {/* Expanded: recurring failures */}
              {expanded === t.codigo_tienda && (
                <div className="border-t border-white/[0.07] px-4 py-3">
                  {t.recurrentes.length === 0 ? (
                    <p className="text-sm text-srv-text-muted">Sin fallas recurrentes en los últimos 30 días.</p>
                  ) : (
                    <>
                      <p className="label mb-2">⚠ Fallas recurrentes (30 días)</p>
                      <div className="flex flex-col gap-1.5">
                        {t.recurrentes.map(r => (
                          <div key={r.codigo_maquina} className="flex items-center justify-between py-1">
                            <span className="text-sm font-mono text-srv-accent">{r.codigo_maquina}</span>
                            <span className="text-xs text-srv-text-muted">
                              {r.count} ticket{r.count !== 1 ? 's' : ''}
                            </span>
                          </div>
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

      <BottomNav />
    </div>
  );
}

function Badge({ label, color }: { label: string; color?: 'ok' | 'warn' | 'crit' }) {
  const cls = color === 'ok'   ? 'bg-srv-ok/15 text-srv-ok'
            : color === 'warn' ? 'bg-srv-warn/15 text-srv-warn'
            : color === 'crit' ? 'bg-srv-crit/15 text-srv-crit'
            : 'bg-white/[0.06] text-srv-text-sub';
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cls}`}>{label}</span>
  );
}
