import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAppStore } from '../store/app';

const NAV = [
  {
    path: '/',
    label: 'Resumen',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
  },
  {
    path: '/tiendas',
    label: 'Mis tiendas',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" /><polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
  },
  {
    path: '/tecnicos',
    label: 'Técnicos',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" />
      </svg>
    ),
  },
  {
    path: '/encargadas',
    label: 'Encargadas',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
  {
    path: '/cambios',
    label: 'Cambios de base',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <path d="M7 16V4m0 0L3 8m4-4l4 4" /><path d="M17 8v12m0 0l4-4m-4 4l-4-4" />
      </svg>
    ),
  },
  {
    path: '/ranking',
    label: 'Ranking',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    ),
  },
];

export default function DrawerNav() {
  const [open, setOpen] = useState(false);
  const navigate        = useNavigate();
  const { pathname }    = useLocation();
  const coordinador     = useAppStore(s => s.coordinador);
  const logout          = useAppStore(s => s.logout);

  function go(path: string) {
    navigate(path);
    setOpen(false);
  }

  function handleLogout() {
    logout();
    navigate('/login');
  }

  const initial = coordinador?.nombre?.charAt(0)?.toUpperCase() ?? 'C';

  return (
    <>
      {/* Hamburger button — fixed top-left */}
      <button
        onClick={() => setOpen(true)}
        style={{ top: 'env(safe-area-inset-top)' }}
        className="fixed left-0 z-30 flex items-center justify-center w-12 h-12 bg-transparent border-none cursor-pointer text-srv-text-muted active:text-srv-text transition-colors"
        aria-label="Abrir menú"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className="w-5 h-5">
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="15" y2="12" />
          <line x1="3" y1="18" x2="18" y2="18" />
        </svg>
      </button>

      {/* Backdrop */}
      <div
        onClick={() => setOpen(false)}
        className={`fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
      />

      {/* Drawer panel */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-srv-surface flex flex-col shadow-2xl transition-transform duration-300 ease-out ${open ? 'translate-x-0' : '-translate-x-full'}`}
      >
        {/* Coordinator info */}
        <div
          className="px-5 pb-5 border-b border-white/[0.07] flex items-center gap-3"
          style={{ paddingTop: 'calc(env(safe-area-inset-top) + 24px)' }}
        >
          <div className="w-10 h-10 rounded-full bg-srv-accent/20 flex items-center justify-center flex-shrink-0">
            <span className="text-srv-accent font-semibold text-base">{initial}</span>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-srv-text truncate">{coordinador?.nombre}</p>
            <p className="text-xs text-srv-text-muted">{coordinador?.codigo_coordinador}</p>
          </div>
        </div>

        {/* Nav items */}
        <nav className="flex-1 overflow-y-auto py-2">
          {NAV.map(item => {
            const active = pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => go(item.path)}
                className={`w-full flex items-center gap-3 px-5 py-3.5 text-sm font-medium transition-colors text-left border-none cursor-pointer relative ${
                  active
                    ? 'text-srv-accent bg-srv-accent/10'
                    : 'text-srv-text-sub bg-transparent'
                }`}
              >
                {active && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-srv-accent rounded-r-full" />
                )}
                <span className={active ? 'text-srv-accent' : 'text-srv-text-muted'}>
                  {item.icon}
                </span>
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Logout */}
        <div
          className="px-5 py-4 border-t border-white/[0.07]"
          style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 16px)' }}
        >
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 text-sm text-srv-text-muted active:text-srv-crit transition-colors cursor-pointer bg-transparent border-none"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Cerrar sesión
          </button>
        </div>
      </aside>
    </>
  );
}
