import { Routes, Route, Navigate } from 'react-router-dom';
import { useAppStore } from './store/app';
import Login      from './screens/Login';
import Resumen    from './screens/Resumen';
import MisTiendas from './screens/MisTiendas';
import Tecnicos   from './screens/Tecnicos';
import Encargadas from './screens/Encargadas';
import Ranking    from './screens/Ranking';

function RequireAuth({ children }: { children: React.ReactElement }) {
  const coordinador = useAppStore(s => s.coordinador);
  if (!coordinador) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login"      element={<Login />} />
      <Route path="/"           element={<RequireAuth><Resumen /></RequireAuth>} />
      <Route path="/tiendas"    element={<RequireAuth><MisTiendas /></RequireAuth>} />
      <Route path="/tecnicos"   element={<RequireAuth><Tecnicos /></RequireAuth>} />
      <Route path="/encargadas" element={<RequireAuth><Encargadas /></RequireAuth>} />
      <Route path="/ranking"    element={<RequireAuth><Ranking /></RequireAuth>} />
      <Route path="*"           element={<Navigate to="/" replace />} />
    </Routes>
  );
}
