import { Routes, Route } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import CustomerRoute from "./components/CustomerRoute";
import AdminLayout from "./components/AdminLayout";
import ShopLayout from "./components/ShopLayout";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import AdminLoginPage from "./pages/AdminLoginPage";
// 後台頁面
import DashboardPage from "./pages/DashboardPage";
import ProductsPage from "./pages/ProductsPage";
import CategoriesPage from "./pages/CategoriesPage";
import OrdersPage from "./pages/OrdersPage";
import UsersPage from "./pages/UsersPage";
// 顧客端頁面
import HomePage from "./pages/shop/HomePage";
import ShopPage from "./pages/shop/ShopPage";
import CartPage from "./pages/shop/CartPage";
import CheckoutPage from "./pages/shop/CheckoutPage";
import OrderSuccessPage from "./pages/shop/OrderSuccessPage";
import AboutPage from "./pages/shop/AboutPage";
import AccountPage from "./pages/shop/AccountPage";
import { ProductDetail } from "./pages/shop/ProductDetail";
import NotFoundPage from "./pages/NotFoundPage";

export default function App() {
  return (
    <Routes>
      {/* 顧客登入 / 註冊（前台入口） */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      {/* 後台登入（前台不會連到這裡） */}
      <Route path="/admin/login" element={<AdminLoginPage />} />

      {/* 顧客端（網站主體，掛在根目錄） */}
      <Route element={<ShopLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/shop" element={<ShopPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/products/:id" element={<ProductDetail />} />
        <Route path="/cart" element={<CartPage />} />
        {/* 需登入才能結帳 / 看帳戶（含我的訂單） */}
        <Route element={<CustomerRoute />}>
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/order-success" element={<OrderSuccessPage />} />
          <Route path="/account" element={<AccountPage />} />
        </Route>
        {/* 找不到的前台網址 → 404（保留導覽列與頁尾） */}
        <Route path="*" element={<NotFoundPage />} />
      </Route>

      {/* 後台（/admin，僅管理員） */}
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
  );
}
