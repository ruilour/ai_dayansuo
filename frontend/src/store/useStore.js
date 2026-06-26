import { create } from 'zustand'

const useStore = create((set) => ({
  token: null,
  user: null,
  setAuth: (token, user) => set({ token, user }),
  logout: () => set({ token: null, user: null }),
}))

export { useStore }
