import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AuthProvider } from "@/auth/AuthProvider";
import { RequireAdmin, RequireAuth, RequireDashboardRole } from "@/auth/RouteGuards";
import { SiteLayout } from "@/components/SiteLayout";
import { isRateLimitedError } from "@/lib/api";

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
const WishlistPage = lazy(() =>
  import("@/pages/WishlistPage").then((module) => ({ default: module.WishlistPage })),
);
const PrivacyPage = lazy(() =>
  import("@/pages/LegalPages").then((module) => ({ default: module.PrivacyPage })),
);
const TermsPage = lazy(() =>
  import("@/pages/LegalPages").then((module) => ({ default: module.TermsPage })),
);
const CustomerDashboardPage = lazy(() =>
  import("@/pages/DashboardPages").then((module) => ({
    default: module.CustomerDashboardPage,
  })),
);
const AdminDashboardPage = lazy(() =>
  import("@/pages/DashboardPages").then((module) => ({
    default: module.AdminDashboardPage,
  })),
);
const AdminOrdersPage = lazy(() =>
  import("@/pages/AdminManagementPage").then((module) => ({
    default: module.AdminOrdersPage,
  })),
);
const AdminUsersPage = lazy(() =>
  import("@/pages/AdminManagementPage").then((module) => ({
    default: module.AdminUsersPage,
  })),
);
const StaffWorkspacePage = lazy(() =>
  import("@/pages/DashboardPages").then((module) => ({
    default: module.StaffWorkspacePage,
  })),
);
const AdminDeliveryPage = lazy(() =>
  import("@/pages/DeliveryPages").then((module) => ({
    default: module.AdminDeliveryPage,
  })),
);
const DeliveryDashboardPage = lazy(() =>
  import("@/pages/DeliveryPages").then((module) => ({
    default: module.DeliveryDashboardPage,
  })),
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
const AdminLoginPage = lazy(() =>
  import("@/auth/AuthPages").then((module) => ({ default: module.AdminLoginPage })),
);
const StaffLoginPage = lazy(() =>
  import("@/auth/AuthPages").then((module) => ({ default: module.StaffLoginPage })),
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10_000,
      retry: (failureCount, error) =>
        !isRateLimitedError(error) && failureCount < 3,
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
                <Route path="admin/login" element={<AdminLoginPage />} />
                <Route path="staff/login" element={<StaffLoginPage />} />
                <Route path="register" element={<RegisterPage />} />
                <Route path="forgot-password" element={<ForgotPasswordPage />} />
                <Route path="reset-password" element={<ResetPasswordPage />} />
                <Route path="privacy" element={<PrivacyPage />} />
                <Route path="terms" element={<TermsPage />} />
                <Route element={<RequireAuth />}>
                  <Route path="account" element={<AccountPage />} />
                  <Route element={<RequireDashboardRole allowedRoles={["customer"]} />}>
                    <Route path="account/dashboard" element={<CustomerDashboardPage />} />
                  </Route>
                  <Route path="cart" element={<CartPage />} />
                  <Route path="wishlist" element={<WishlistPage />} />
                  <Route path="orders" element={<OrdersPage />} />
                  <Route path="orders/:orderId" element={<OrderDetailsPage />} />
                  <Route element={<RequireAdmin />}>
                    <Route path="admin/dashboard" element={<AdminDashboardPage />} />
                    <Route path="admin/order-management" element={<AdminOrdersPage />} />
                    <Route path="admin/customers" element={<AdminUsersPage />} />
                    <Route path="admin/products" element={<AdminProductsPage />} />
                    <Route path="admin/categories" element={<AdminCategoriesPage />} />
                  </Route>
                  <Route element={<RequireDashboardRole allowedRoles={["admin", "super_admin", "delivery_manager"]} />}>
                    <Route path="admin/deliveries" element={<AdminDeliveryPage />} />
                  </Route>
                  <Route element={<RequireDashboardRole allowedRoles={["admin", "super_admin", "inventory_manager"]} />}>
                    <Route path="admin/inventory" element={<StaffWorkspacePage />} />
                  </Route>
                  <Route element={<RequireDashboardRole allowedRoles={["admin", "super_admin", "order_manager"]} />}>
                    <Route path="admin/orders" element={<StaffWorkspacePage />} />
                  </Route>
                  <Route element={<RequireDashboardRole allowedRoles={["delivery_staff"]} />}>
                    <Route path="delivery/dashboard" element={<DeliveryDashboardPage />} />
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
