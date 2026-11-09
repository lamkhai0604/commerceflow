import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import MainLayout from '@/layouts/MainLayout';
import CartPage from '@/pages/CartPage';
import CheckoutPage from '@/pages/CheckoutPage';
import HomePage from '@/pages/HomePage';
import NotFoundPage from '@/pages/NotFoundPage';
import OrderConfirmationPage from '@/pages/OrderConfirmationPage';
import OrderDetailPage from '@/pages/OrderDetailPage';
import OrdersPage from '@/pages/OrdersPage';
import ProductListPage from '@/pages/ProductListPage';
import ProductPage from '@/pages/ProductPage';
import TrackOrderPage from '@/pages/TrackOrderPage';

// Administration is only for administrators, so it is loaded on demand and stays out of the storefront bundle.
const AdminLayout = lazy(() => import('@/pages/admin/AdminLayout'));
const AdminOrdersPage = lazy(() => import('@/pages/admin/AdminOrdersPage'));
const AdminOrderPage = lazy(() => import('@/pages/admin/AdminOrderPage'));
const AdminProductsPage = lazy(() => import('@/pages/admin/AdminProductsPage'));

export default function App() {
  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route index element={<HomePage />} />
        <Route path="products" element={<ProductListPage />} />
        <Route path="products/:slug" element={<ProductPage />} />
        <Route path="cart" element={<CartPage />} />
        <Route path="checkout" element={<CheckoutPage />} />
        <Route path="checkout/confirmation" element={<OrderConfirmationPage />} />
        <Route path="account/orders" element={<OrdersPage />} />
        <Route path="account/orders/:orderId" element={<OrderDetailPage />} />
        <Route path="track-order" element={<TrackOrderPage />} />
        <Route path="admin" element={<Suspense fallback={null}><AdminLayout /></Suspense>}>
          <Route index element={<Navigate to="orders" replace />} />
          <Route path="orders" element={<Suspense fallback={null}><AdminOrdersPage /></Suspense>} />
          <Route path="orders/:orderId" element={<Suspense fallback={null}><AdminOrderPage /></Suspense>} />
          <Route path="products" element={<Suspense fallback={null}><AdminProductsPage /></Suspense>} />
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
