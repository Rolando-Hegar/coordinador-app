import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useAppStore } from '../store/app';
import Spinner from '../components/Spinner';

interface EncargadaRow {
  codigo_tienda:       string;
  nombre_tienda:       string;
  encargada:           string;
  ultimo_acceso:       string | null;
  pendientes:          number;
  confirmados_mes:     number;
  avg_confirmacion_min: number | null;
  rechazos_mes:        number;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const min  = Math.floor(diff / 60000);
  if (min < 60) return `hace ${min} min`;
  const hrs = Math.floor(min / 60);
  if (hrs < 24) return `hace ${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `hace ${days} día${days !== 1 ? 's' : ''}`;
}

function fmtMin(min: number): string {
  if (min < 60) return `${min}min`;
  return `${Math.floor(min / 60)}h ${min % 60}min`;
}

export default function Encargadas() {
  const coordinador = useAppStore(s => s.coordinador)!;

  const [rows, setRows]     = useState<EncargadaRow[]>([]);
  const [error, setError]   = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<{ encargadas: EncargadaRow[] }>('getEncargadas', {
      tiendas: coordinador.tiendas_asignadas.join(','),
    })
      .then(d => setRows(d.encargadas))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [coordinador]);

  return (
    <div className="screen">
      <div className="pl-14 pr-4 pt-4 pb-3 safe-top flex-shrink-0">
        <p className="text-xs text-srv-text-muted">Actividad</p>
        <p className="text-xl font-semibold text-srv-text">Encargadas</p>
      </div>

      <div className="scroll-area px-4 pb-4">
        {loading && <Spinner />}
        {error && <p className="text-srv-crit text-sm text-center mt-8">{error}</p>}

        <div className="flex flex-col gap-3">
          {rows.map(r => (
            <div key={r.codigo_tienda} className="card px-4 py-3">
              {/* Store + person */}
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-semibold text-srv-text text-sm">{r.nombre_tienda}</p>
                  <p className="text-xs text-srv-text-sub mt-0.5">
                    {r.encargada}
                    {r.ultimo_acceso && (
                      <span className="text-srv-text-muted"> · {timeAgo(r.ultimo_acceso)}</span>
                    )}
                  </p>
                </div>
                {r.pendientes > 0 && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-srv-warn/15 text-srv-warn font-medium flex-shrink-0 ml-2">
                    {r.pendientes} por confirmar
                  </span>
                )}
              </div>

              {/* Metrics row */}
              <div className="grid grid-cols-3 gap-2">
                <MetricBox
                  label="Confirmaciones"
                  value={r.confirmados_mes > 0 ? String(r.confirmados_mes) : '–'}
                  sub="este mes"
                />
                <MetricBox
                  label="Tiempo prom."
                  value={r.avg_confirmacion_min != null ? fmtMin(r.avg_confirmacion_min) : '–'}
                  sub="de confirmación"
                />
                <MetricBox
                  label="Rechazos"
                  value={r.rechazos_mes > 0 ? String(r.rechazos_mes) : '0'}
                  sub="este mes"
                  highlight={r.rechazos_mes > 2}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}

function MetricBox({ label, value, sub, highlight }: {
  label: string; value: string; sub: string; highlight?: boolean;
}) {
  return (
    <div className="bg-srv-bg rounded-10 px-3 py-2">
      <p className={`text-base font-semibold ${highlight ? 'text-srv-crit' : 'text-srv-text'}`}>{value}</p>
      <p className="text-[10px] text-srv-text-muted leading-tight mt-0.5">{label}</p>
      <p className="text-[10px] text-srv-text-muted leading-tight">{sub}</p>
    </div>
  );
}
