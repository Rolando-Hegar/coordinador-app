import { Routes, Route, Navigate } from 'react-router-dom';
import { useAppStore } from './store/app';
import DrawerNav  from './components/DrawerNav';
import Login      from './screens/Login';
import Resumen    from './screens/Resumen';
import MisTiendas from './screens/MisTiendas';
import Tecnicos   from './screens/Tecnicos';
import Encargadas from './screens/Encargadas';
import Ranking    from './screens/Ranking';
import Cambios    from './screens/Cambios';

function AuthLayout({ children }: { children: React.ReactElement }) {
  const coordinador = useAppStore(s => s.coordinador);
  if (!coordinador) return <Navigate to="/login" replace />;
  return (
    <>
      <DrawerNav />
      {children}
    </>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login"      element={<Login />} />
      <Route path="/"           element={<AuthLayout><Resumen /></AuthLayout>} />
      <Route path="/tiendas"    element={<AuthLayout><MisTiendas /></AuthLayout>} />
      <Route path="/tecnicos"   element={<AuthLayout><Tecnicos /></AuthLayout>} />
      <Route path="/encargadas" element={<AuthLayout><Encargadas /></AuthLayout>} />
      <Route path="/cambios"    element={<AuthLayout><Cambios /></AuthLayout>} />
      <Route path="/ranking"    element={<AuthLayout><Ranking /></AuthLayout>} />
      <Route path="*"           element={<Navigate to="/" replace />} />
    </Routes>
  );
}
