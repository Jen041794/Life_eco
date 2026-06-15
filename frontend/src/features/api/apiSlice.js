import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import { logout } from '../auth/authSlice'

// 後端 API 位址（之後部署可改成環境變數 VITE_API_BASE_URL）
const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api'

// 依目前所在路徑決定要用哪一份 session：/admin 底下走管理員、其餘走顧客。
// 這讓前台與後台各自帶自己的 token，互不干擾。
const currentScope = () =>
  window.location.pathname.startsWith('/admin') ? 'admin' : 'customer'

const rawBaseQuery = fetchBaseQuery({
  baseUrl: API_BASE,
  prepareHeaders: (headers, { getState }) => {
    const token = getState().auth[currentScope()].access
    if (token) headers.set('Authorization', `Bearer ${token}`)
    return headers
  },
})

// 包一層：token 失效（401）時只登出「目前這一邊」，不影響另一邊
const baseQueryWithAuth = async (args, api, extraOptions) => {
  const result = await rawBaseQuery(args, api, extraOptions)
  if (result.error && result.error.status === 401) {
    api.dispatch(logout(currentScope()))
  }
  return result
}

export const apiSlice = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithAuth,
  tagTypes: ['Product', 'Category', 'Order', 'User', 'Stats', 'Profile'],
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
      query: ({ page = 1, search = '', category = '', storefront = false } = {}) => {
        const params = new URLSearchParams({ page })
        if (search) params.set('search', search)
        if (category) params.set('category', category)
        // 前台逛商品帶 storefront=1：後端一律只回上架品（連管理員逛前台也是）
        if (storefront) params.set('storefront', '1')
        return `/products/?${params.toString()}`
      },
      providesTags: ['Product'],
    }),
    // body 傳 FormData（含圖片檔），fetchBaseQuery 會自動用 multipart 送出
    addProduct: builder.mutation({
      query: (formData) => ({ url: '/products/', method: 'POST', body: formData }),
      // 新增商品可能改變分類的 product_count → 連同 Category 一起刷新
      invalidatesTags: ['Product', 'Category', 'Stats'],
    }),
    updateProduct: builder.mutation({
      query: ({ id, formData }) => ({ url: `/products/${id}/`, method: 'PATCH', body: formData }),
      invalidatesTags: ['Product', 'Category', 'Stats'],
    }),
    deleteProduct: builder.mutation({
      query: (id) => ({ url: `/products/${id}/`, method: 'DELETE' }),
      invalidatesTags: ['Product', 'Category', 'Stats'],
    }),

    // ---- 分類管理 ----
    getCategories: builder.query({
      query: () => '/categories/',
      providesTags: ['Category'],
    }),
    addCategory: builder.mutation({
      query: (body) => ({ url: '/categories/', method: 'POST', body }),
      invalidatesTags: ['Category'],
    }),
    updateCategory: builder.mutation({
      query: ({ id, ...body }) => ({ url: `/categories/${id}/`, method: 'PATCH', body }),
      invalidatesTags: ['Category'],
    }),
    deleteCategory: builder.mutation({
      query: (id) => ({ url: `/categories/${id}/`, method: 'DELETE' }),
      // 刪分類會把底下商品的 category 變 null → 商品列表也要刷新
      invalidatesTags: ['Category', 'Product'],
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
      query: ({ page = 1, role = '' } = {}) => {
        const params = new URLSearchParams({ page })
        // 後台會員管理分頁：role=admin / customer
        if (role) params.set('role', role)
        return `/user/?${params.toString()}`
      },
      providesTags: ['User'],
    }),
    // 後台新增一般會員（僅管理員）：body { username, email, password }
    adminCreateUser: builder.mutation({
      query: (body) => ({ url: '/user/create/', method: 'POST', body }),
      invalidatesTags: ['User'],
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

    // ==== 顧客端 ====
    // 註冊（任何人可呼叫）：body { username, email, password }
    register: builder.mutation({
      query: (body) => ({ url: '/user/register/', method: 'POST', body }),
    }),

    // 我的個人資料：讀寫自己的電話、地址（body { phone, address }）
    getProfile: builder.query({
      query: () => '/user/profile/',
      providesTags: ['Profile'],
    }),
    updateProfile: builder.mutation({
      query: (body) => ({ url: '/user/profile/', method: 'PATCH', body }),
      invalidatesTags: ['Profile'],
    }),

    // 下單：body { items: [{ product, quantity }], recipient_name, recipient_phone, shipping_address }
    // 後端會自動算總價、扣庫存 → 連同商品列表一起刷新
    createOrder: builder.mutation({
      query: (body) => ({ url: '/orders/', method: 'POST', body }),
      invalidatesTags: ['Order', 'Product'],
    }),

    // 我的訂單：帶 mine=1，後端強制只回自己的訂單（即使登入的是管理員）
    getMyOrders: builder.query({
      query: ({ page = 1 } = {}) => `/orders/?mine=1&page=${page}`,
      providesTags: ['Order'],
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
  useGetCategoriesQuery,
  useAddCategoryMutation,
  useUpdateCategoryMutation,
  useDeleteCategoryMutation,
  useGetOrdersQuery,
  useUpdateOrderStatusMutation,
  useCancelOrderMutation,
  useGetUsersQuery,
  useActivateUserMutation,
  useDeactivateUserMutation,
  useUpdateUserMutation,
  useAdminCreateUserMutation,
  // 顧客端
  useRegisterMutation,
  useGetProfileQuery,
  useUpdateProfileMutation,
  useCreateOrderMutation,
  useGetMyOrdersQuery,
} = apiSlice
