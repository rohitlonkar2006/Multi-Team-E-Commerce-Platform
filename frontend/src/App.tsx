import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AuthProvider } from "@/auth/AuthProvider";
import { RequireAdmin, RequireAuth } from "@/auth/RouteGuards";
import { SiteLayout } from "@/components/SiteLayout";

const HomePage = lazy(() =>
  import("@/pages/HomePage").then((module) => ({ default: module.HomePage })),
);
const ShopPage = lazy(() =>
  import("@/pages/ShopPage").then((module) => ({ default: module.ShopPage })),
);
const ProductDetailsPage = lazy(() =>
  import("@/pages/ShopPage").then((module) => ({ default: module.ProductDetailsPage })),
);
const AccountPage = lazy(() =>
  import("@/pages/AccountPage").then((module) => ({ default: module.AccountPage })),
);
const CartPage = lazy(() =>
  import("@/pages/CheckoutPages").then((module) => ({ default: module.CartPage })),
);
const OrdersPage = lazy(() =>
  import("@/pages/CheckoutPages").then((module) => ({ default: module.OrdersPage })),
);
const OrderDetailsPage = lazy(() =>
  import("@/pages/CheckoutPages").then((module) => ({ default: module.OrderDetailsPage })),
);
const AdminCategoriesPage = lazy(() =>
  import("@/pages/AdminCategoriesPage").then((module) => ({
    default: module.AdminCategoriesPage,
  })),
);
const AdminProductsPage = lazy(() =>
  import("@/pages/AdminProductsPage").then((module) => ({
    default: module.AdminProductsPage,
  })),
);
const LoginPage = lazy(() =>
  import("@/auth/AuthPages").then((module) => ({ default: module.LoginPage })),
);
const RegisterPage = lazy(() =>
  import("@/auth/AuthPages").then((module) => ({ default: module.RegisterPage })),
);
const ForgotPasswordPage = lazy(() =>
  import("@/auth/AuthPages").then((module) => ({
    default: module.ForgotPasswordPage,
  })),
);
const ResetPasswordPage = lazy(() =>
  import("@/auth/AuthPages").then((module) => ({
    default: module.ResetPasswordPage,
  })),
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10_000,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <Suspense
            fallback={
              <main className="grid min-h-[65vh] place-items-center text-sm text-muted-foreground" aria-live="polite">
                Loading page...
              </main>
            }
          >
            <Routes>
              <Route element={<SiteLayout />}>
                <Route index element={<HomePage />} />
                <Route path="shop" element={<ShopPage />} />
                <Route path="products/:slug" element={<ProductDetailsPage />} />
                <Route path="login" element={<LoginPage />} />
                <Route path="register" element={<RegisterPage />} />
                <Route path="forgot-password" element={<ForgotPasswordPage />} />
                <Route path="reset-password" element={<ResetPasswordPage />} />
                <Route element={<RequireAuth />}>
                  <Route path="account" element={<AccountPage />} />
                  <Route path="cart" element={<CartPage />} />
                  <Route path="orders" element={<OrdersPage />} />
                  <Route path="orders/:orderId" element={<OrderDetailsPage />} />
                  <Route element={<RequireAdmin />}>
                    <Route path="admin/products" element={<AdminProductsPage />} />
                    <Route path="admin/categories" element={<AdminCategoriesPage />} />
                  </Route>
                </Route>
                <Route
                  path="*"
                  element={
                    <main className="grid min-h-[65vh] place-items-center px-6 text-center">
                      <div>
                        <p className="text-sm font-semibold text-primary">404</p>
                        <h1 className="mt-2 text-3xl font-semibold">Page not found</h1>
                      </div>
                    </main>
                  }
                />
              </Route>
            </Routes>
          </Suspense>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
