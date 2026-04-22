import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useAppStore } from '../store/app';
import type { Coordinador } from '../store/app';

export default function Login() {
  const navigate       = useNavigate();
  const setCoordinador = useAppStore(s => s.setCoordinador);

  const [code, setCode]   = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (code.length < 4) { setError('El código debe tener al menos 4 dígitos'); return; }
    setError('');
    setLoading(true);
    try {
      const { coordinador } = await api.get<{ coordinador: Coordinador }>('login', { code });
      setCoordinador(coordinador);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter') handleLogin();
  }

  return (
    <div className="screen items-center justify-center px-6 safe-top">
      {/* Logo */}
      <div className="mb-8 flex flex-col items-center gap-3">
        <div className="w-20 h-20 rounded-[28px] bg-srv-surface flex items-center justify-center border border-white/[0.07]"
             style={{ boxShadow: '0 8px 32px rgba(139,92,246,0.25)' }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="var(--srv-accent)" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="w-10 h-10">
            <rect x="2" y="3" width="6" height="6" rx="1" /><rect x="9" y="3" width="6" height="6" rx="1" />
            <rect x="16" y="3" width="6" height="6" rx="1" /><rect x="2" y="12" width="6" height="6" rx="1" />
            <rect x="9" y="12" width="6" height="6" rx="1" /><rect x="16" y="12" width="6" height="6" rx="1" />
            <rect x="2" y="21" width="6" height="0.01" rx="1" /><rect x="9" y="21" width="6" height="0.01" rx="1" />
          </svg>
        </div>
        <div className="text-center">
          <p className="text-2xl font-semibold text-srv-text">Coordinador</p>
          <p className="text-sm text-srv-text-sub mt-1">Panel de supervisión de salas</p>
        </div>
      </div>

      {/* Form */}
      <div className="w-full max-w-xs flex flex-col gap-3">
        <div className="card px-4 py-3">
          <p className="label mb-2">Código de acceso</p>
          <input
            type="number"
            inputMode="numeric"
            pattern="[0-9]*"
            placeholder="••••••"
            value={code}
            onChange={e => { setCode(e.target.value); setError(''); }}
            onKeyDown={handleKey}
            className="w-full bg-transparent border-none outline-none text-srv-text text-2xl font-mono tracking-widest text-center"
            style={{ letterSpacing: '0.4em' }}
            autoFocus
          />
        </div>

        {error && (
          <p className="text-srv-crit text-sm text-center">{error}</p>
        )}

        <button
          onClick={handleLogin}
          disabled={loading || code.length < 4}
          className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Verificando…' : 'Entrar'}
        </button>
      </div>
    </div>
  );
}
