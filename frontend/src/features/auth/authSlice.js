import { createSlice } from '@reduxjs/toolkit'

// 從 localStorage 還原登入狀態（重新整理後不會被登出）
const tokensFromStorage = JSON.parse(localStorage.getItem('auth') || 'null')

const initialState = tokensFromStorage || {
  access: null,
  refresh: null,
  user: null, // { id, username, is_staff, ... }
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials(state, action) {
      const { access, refresh } = action.payload
      state.access = access
      state.refresh = refresh
      localStorage.setItem('auth', JSON.stringify(state))
    },
    setUser(state, action) {
      state.user = action.payload
      localStorage.setItem('auth', JSON.stringify(state))
    },
    logout(state) {
      state.access = null
      state.refresh = null
      state.user = null
      localStorage.removeItem('auth')
    },
  },
})

export const { setCredentials, setUser, logout } = authSlice.actions
export default authSlice.reducer

// 方便取用的 selector
export const selectAccess = (state) => state.auth.access
export const selectCurrentUser = (state) => state.auth.user
