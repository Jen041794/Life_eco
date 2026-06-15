import { Routes, Route } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'
import CustomerRoute from './components/CustomerRoute'
import AdminLayout from './components/AdminLayout'
import ShopLayout from './components/ShopLayout'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
// 後台頁面
import DashboardPage from './pages/DashboardPage'
import ProductsPage from './pages/ProductsPage'
import CategoriesPage from './pages/CategoriesPage'
import OrdersPage from './pages/OrdersPage'
import UsersPage from './pages/UsersPage'
// 顧客端頁面
import ShopPage from './pages/shop/ShopPage'
import CartPage from './pages/shop/CartPage'
import CheckoutPage from './pages/shop/CheckoutPage'
import AccountPage from './pages/shop/AccountPage'
import MyOrdersPage from './pages/shop/MyOrdersPage'

export default function App() {
  return (
    <Routes>
      {/* 共用：登入 / 註冊（無外框） */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* 顧客端（網站主體，掛在根目錄） */}
      <Route element={<ShopLayout />}>
        <Route path="/" element={<ShopPage />} />
        <Route path="/cart" element={<CartPage />} />
        {/* 需登入才能結帳 / 看帳戶與訂單 */}
        <Route element={<CustomerRoute />}>
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/account" element={<AccountPage />} />
          <Route path="/my-orders" element={<MyOrdersPage />} />
        </Route>
      </Route>

      {/* 後台（搬到 /admin，僅管理員） */}
      <Route element={<ProtectedRoute />}>
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="products" element={<ProductsPage />} />
          <Route path="categories" element={<CategoriesPage />} />
          <Route path="orders" element={<OrdersPage />} />
          <Route path="users" element={<UsersPage />} />
        </Route>
      </Route>
    </Routes>
  )
}
