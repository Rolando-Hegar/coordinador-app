import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Coordinador {
  codigo_coordinador: string;
  nombre: string;
  tiendas_asignadas: string[];
}

interface AppState {
  coordinador: Coordinador | null;
  setCoordinador: (c: Coordinador) => void;
  logout: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      coordinador: null,
      setCoordinador: (c) => set({ coordinador: c }),
      logout: () => set({ coordinador: null }),
    }),
    { name: 'coor-app' },
  ),
);
