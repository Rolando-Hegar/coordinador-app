import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useAppStore } from '../store/app';
import Spinner from '../components/Spinner';

interface RankingRow {
  codigo_tecnico:   string;
  nombre_tecnico:   string;
  resueltos_mes:    number;
  avg_duracion_min: number | null;
  tasa_completado:  number | null;
}

function fmtMin(min: number): string {
  if (min < 60) return `${min}min`;
  return `${Math.floor(min / 60)}h ${min % 60}min`;
}

export default function Ranking() {
  const navigate    = useNavigate();
  const coordinador = useAppStore(s => s.coordinador)!;

  const [ranking, setRanking] = useState<RankingRow[]>([]);
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<{ ranking: RankingRow[] }>('getRanking', {
      tiendas: coordinador.tiendas_asignadas.join(','),
    })
      .then(d => setRanking(d.ranking))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [coordinador]);

  const medals = ['🥇', '🥈', '🥉'];

  return (
    <div className="screen">
      <div className="px-4 pt-4 pb-3 safe-top flex items-center gap-3 flex-shrink-0">
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-10 bg-srv-surface flex items-center justify-center border border-white/[0.07] cursor-pointer flex-shrink-0"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <div>
          <p className="text-xs text-srv-text-muted">Últimos 30 días</p>
          <p className="text-xl font-semibold text-srv-text">Ranking técnicos</p>
        </div>
      </div>

      <div className="scroll-area px-4 pb-4">
        {loading && <Spinner />}
        {error && <p className="text-srv-crit text-sm text-center mt-8">{error}</p>}

        {!loading && !error && ranking.length === 0 && (
          <p className="text-srv-text-muted text-sm text-center mt-8">
            Sin datos suficientes en los últimos 30 días.
          </p>
        )}

        <div className="flex flex-col gap-2">
          {ranking.map((r, i) => (
            <div key={r.codigo_tecnico} className="card px-4 py-3 flex items-center gap-4">
              {/* Position */}
              <span className="text-xl flex-shrink-0 w-7 text-center">
                {i < 3 ? medals[i] : <span className="text-srv-text-muted font-mono text-sm">#{i + 1}</span>}
              </span>

              {/* Name */}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-srv-text text-sm truncate">{r.nombre_tecnico}</p>
                <p className="text-xs text-srv-text-muted">{r.codigo_tecnico}</p>
              </div>

              {/* Stats */}
              <div className="flex flex-col items-end gap-1 flex-shrink-0">
                <span className="text-sm font-medium text-srv-text">
                  {r.resueltos_mes} resueltos
                </span>
                <div className="flex items-center gap-2">
                  {r.avg_duracion_min != null && (
                    <span className="text-xs text-srv-text-muted">{fmtMin(r.avg_duracion_min)}</span>
                  )}
                  {r.tasa_completado != null && (
                    <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${
                      r.tasa_completado >= 80 ? 'bg-srv-ok/15 text-srv-ok'
                      : r.tasa_completado >= 60 ? 'bg-srv-warn/15 text-srv-warn'
                      : 'bg-srv-crit/15 text-srv-crit'
                    }`}>
                      {r.tasa_completado}%
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {ranking.length > 0 && (
          <p className="text-center text-xs text-srv-text-muted mt-4">
            Ordenado por tasa de completado · tiempo promedio de resolución
          </p>
        )}
      </div>
    </div>
  );
}
