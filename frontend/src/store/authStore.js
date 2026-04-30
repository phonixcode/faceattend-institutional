import { create } from 'zustand'

const useAuthStore = create((set) => ({
  token        : sessionStorage.getItem('token')      || null,
  refreshToken : sessionStorage.getItem('refreshToken')|| null,
  user         : JSON.parse(sessionStorage.getItem('user') || 'null'),

  setAuth: (token, refreshToken, user) => {
    sessionStorage.setItem('token',        token)
    sessionStorage.setItem('refreshToken', refreshToken)
    sessionStorage.setItem('user',         JSON.stringify(user))
    set({ token, refreshToken, user })
  },

  updateUser: (partial) => set((state) => {
    const updated = { ...state.user, ...partial }
    sessionStorage.setItem('user', JSON.stringify(updated))
    return { user: updated }
  }),

  clearAuth: () => {
    sessionStorage.clear()
    set({ token: null, refreshToken: null, user: null })
  },
}))

export default useAuthStore