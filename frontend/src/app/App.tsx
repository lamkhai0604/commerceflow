import { Route, Routes } from 'react-router-dom';
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
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
