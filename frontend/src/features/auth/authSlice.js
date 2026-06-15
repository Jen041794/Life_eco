import { createSlice } from '@reduxjs/toolkit'

// 前台（顧客）與後台（管理員）各自獨立的登入 session，互不影響。
// 兩份一起存在 localStorage 的 'auth'，重新整理後都能各自還原。
const emptyScope = () => ({ access: null, refresh: null, user: null })

function loadInitialState() {
  const stored = JSON.parse(localStorage.getItem('auth') || 'null')
  // 必須是新版的 { customer, admin } 結構才採用，否則重置（相容舊版單一 session 格式）
  if (stored && stored.customer && stored.admin) return stored
  return { customer: emptyScope(), admin: emptyScope() }
}

const authSlice = createSlice({
  name: 'auth',
  initialState: loadInitialState(),
  reducers: {
    // payload: { scope: 'customer' | 'admin', access, refresh }
    setCredentials(state, action) {
      const { scope, access, refresh } = action.payload
      state[scope].access = access
      state[scope].refresh = refresh
      localStorage.setItem('auth', JSON.stringify(state))
    },
    // payload: { scope, user }
    setUser(state, action) {
      const { scope, user } = action.payload
      state[scope].user = user
      localStorage.setItem('auth', JSON.stringify(state))
    },
    // payload: scope（只登出指定的一邊，另一邊不受影響）
    logout(state, action) {
      const scope = action.payload
      state[scope] = emptyScope()
      localStorage.setItem('auth', JSON.stringify(state))
    },
  },
})

export const { setCredentials, setUser, logout } = authSlice.actions
export default authSlice.reducer

// selector 工廠：依 scope 取用對應的登入狀態
export const selectAccess = (scope) => (state) => state.auth[scope].access
export const selectCurrentUser = (scope) => (state) => state.auth[scope].user
