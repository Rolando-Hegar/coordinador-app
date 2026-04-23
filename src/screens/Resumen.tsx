import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useAppStore } from '../store/app';
import Spinner from '../components/Spinner';

interface TiendaRow {
  codigo_tienda:  string;
  nombre_tienda:  string;
  abiertos:       number;
  porConfirmar:   number;
  conFalla:       number;
}

interface ResumenData {
  tiendas:  TiendaRow[];
  totales:  { abiertos: number; porConfirmar: number; conFalla: number };
}

export default function Resumen() {
  const navigate      = useNavigate();
  const coordinador   = useAppStore(s => s.coordinador)!;
  const logout        = useAppStore(s => s.logout);

  const [data, setData]     = useState<ResumenData | null>(null);
  const [error, setError]   = useState('');
  const [loading, setLoading] = useState(true);

  // Hidden ranking: long-press on title
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  function startPress() { pressTimer.current = setTimeout(() => navigate('/ranking'), 1000); }
  function endPress()   { if (pressTimer.current) clearTimeout(pressTimer.current); }

  useEffect(() => {
    const tiendas = coordinador.tiendas_asignadas.join(',');
    api.get<ResumenData>('getResumen', { tiendas })
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [coordinador]);

  return (
    <div className="screen">
      {/* Header */}
      <div className="pl-14 pr-4 pt-4 pb-3 safe-top flex items-center justify-between flex-shrink-0">
        <div>
          <p className="text-xs text-srv-text-muted">Bienvenido,</p>
          <button
            onMouseDown={startPress} onMouseUp={endPress} onTouchStart={startPress} onTouchEnd={endPress}
            className="text-xl font-semibold text-srv-text bg-transparent border-none cursor-pointer p-0"
          >
            {coordinador.nombre}
          </button>
        </div>
        <button
          onClick={logout}
          className="w-9 h-9 rounded-10 bg-srv-surface flex items-center justify-center border border-white/[0.07] cursor-pointer"
          title="Cerrar sesión"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-srv-text-muted">
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
          </svg>
        </button>
      </div>

      <div className="scroll-area px-4 pb-4">
        {loading && <Spinner />}
        {error && <p className="text-srv-crit text-sm text-center mt-8">{error}</p>}

        {data && (
          <>
            {/* Stats */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              <StatCard label="Abiertos" value={data.totales.abiertos} color="var(--srv-crit)" />
              <StatCard label="Por confirmar" value={data.totales.porConfirmar} color="var(--srv-warn)" />
              <StatCard label="Con falla" value={data.totales.conFalla} color="var(--srv-text-sub)" />
            </div>

            {/* Tiendas list */}
            <p className="label mb-2">{data.tiendas.length} Tiendas asignadas</p>
            <div className="flex flex-col gap-2">
              {data.tiendas.map(t => (
                <button
                  key={t.codigo_tienda}
                  onClick={() => navigate('/tiendas')}
                  className="card px-4 py-3 flex items-center justify-between text-left w-full border-none cursor-pointer"
                >
                  <div>
                    <p className="font-medium text-srv-text text-sm">{t.nombre_tienda}</p>
                    <p className="text-xs text-srv-text-muted mt-0.5">{t.codigo_tienda}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {t.conFalla > 0 && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-srv-crit/15 text-srv-crit font-medium">
                        {t.conFalla} falla{t.conFalla !== 1 ? 's' : ''}
                      </span>
                    )}
                    {t.abiertos > 0 ? (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-srv-warn/15 text-srv-warn font-medium">
                        {t.abiertos} ticket{t.abiertos !== 1 ? 's' : ''}
                      </span>
                    ) : (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-srv-ok/15 text-srv-ok font-medium">OK</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </>
        )}
      </div>

    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="card px-3 py-3 flex flex-col gap-1">
      <span className="text-2xl font-semibold" style={{ color }}>{value}</span>
      <span className="text-[11px] text-srv-text-sub leading-tight">{label}</span>
    </div>
  );
}
