import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import { logout } from '../auth/authSlice'

// 後端 API 位址（之後部署可改成環境變數 VITE_API_BASE_URL）
const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api'

const rawBaseQuery = fetchBaseQuery({
  baseUrl: API_BASE,
  prepareHeaders: (headers, { getState }) => {
    const token = getState().auth.access
    if (token) headers.set('Authorization', `Bearer ${token}`)
    return headers
  },
})

// 包一層：token 失效（401）時自動登出，把使用者導回登入頁
const baseQueryWithAuth = async (args, api, extraOptions) => {
  const result = await rawBaseQuery(args, api, extraOptions)
  if (result.error && result.error.status === 401) {
    api.dispatch(logout())
  }
  return result
}

export const apiSlice = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithAuth,
  tagTypes: ['Product', 'Order', 'User', 'Stats'],
  endpoints: (builder) => ({
    // ---- 認證 ----
    login: builder.mutation({
      query: (credentials) => ({
        url: '/user/login/',
        method: 'POST',
        body: credentials,
      }),
    }),
    getMe: builder.query({
      query: () => '/user/me/',
    }),

    // ---- 儀表板 ----
    getStats: builder.query({
      query: () => '/admin/stats/',
      providesTags: ['Stats'],
    }),

    // ---- 商品管理 ----
    getProducts: builder.query({
      query: ({ page = 1, search = '' } = {}) => {
        const params = new URLSearchParams({ page })
        if (search) params.set('search', search)
        return `/products/?${params.toString()}`
      },
      providesTags: ['Product'],
    }),
    // body 傳 FormData（含圖片檔），fetchBaseQuery 會自動用 multipart 送出
    addProduct: builder.mutation({
      query: (formData) => ({ url: '/products/', method: 'POST', body: formData }),
      invalidatesTags: ['Product', 'Stats'],
    }),
    updateProduct: builder.mutation({
      query: ({ id, formData }) => ({ url: `/products/${id}/`, method: 'PATCH', body: formData }),
      invalidatesTags: ['Product', 'Stats'],
    }),
    deleteProduct: builder.mutation({
      query: (id) => ({ url: `/products/${id}/`, method: 'DELETE' }),
      invalidatesTags: ['Product', 'Stats'],
    }),

    // ---- 訂單管理 ----
    getOrders: builder.query({
      query: ({ page = 1, status = '', search = '' } = {}) => {
        const params = new URLSearchParams({ page })
        if (status) params.set('status', status)
        if (search) params.set('search', search)
        return `/orders/?${params.toString()}`
      },
      providesTags: ['Order'],
    }),
    updateOrderStatus: builder.mutation({
      query: ({ id, status }) => ({
        url: `/orders/${id}/status/`,
        method: 'PATCH',
        body: { status },
      }),
      invalidatesTags: ['Order', 'Stats'],
    }),
    cancelOrder: builder.mutation({
      query: (id) => ({ url: `/orders/${id}/cancel/`, method: 'POST' }),
      // 取消會回補庫存、可能退款 → 商品與儀表板也要刷新
      invalidatesTags: ['Order', 'Product', 'Stats'],
    }),

    // ---- 會員管理 ----
    getUsers: builder.query({
      query: ({ page = 1 } = {}) => `/user/?page=${page}`,
      providesTags: ['User'],
    }),
    activateUser: builder.mutation({
      query: (id) => ({ url: `/user/${id}/activate/`, method: 'POST' }),
      invalidatesTags: ['User'],
    }),
    deactivateUser: builder.mutation({
      query: (id) => ({ url: `/user/${id}/deactivate/`, method: 'POST' }),
      invalidatesTags: ['User'],
    }),
    updateUser: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `/user/${id}/update-info/`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: ['User'],
    }),
  }),
})

export const {
  useLoginMutation,
  useGetMeQuery,
  useGetStatsQuery,
  useGetProductsQuery,
  useAddProductMutation,
  useUpdateProductMutation,
  useDeleteProductMutation,
  useGetOrdersQuery,
  useUpdateOrderStatusMutation,
  useCancelOrderMutation,
  useGetUsersQuery,
  useActivateUserMutation,
  useDeactivateUserMutation,
  useUpdateUserMutation,
} = apiSlice
