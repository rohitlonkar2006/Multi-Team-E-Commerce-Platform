const adminRoles = ["admin", "super_admin"];

export function hasAdminRole(roles: string[]) {
  return roles.some((role) => adminRoles.includes(role));
}

export function dashboardPathForRoles(roles: string[]) {
  if (roles.includes("super_admin") || roles.includes("admin")) return "/admin/dashboard";
  if (roles.includes("inventory_manager")) return "/admin/inventory";
  if (roles.includes("order_manager")) return "/admin/orders";
  if (roles.includes("delivery_staff")) return "/delivery/dashboard";
  if (roles.includes("delivery_manager")) return "/admin/deliveries";
  return "/account/dashboard";
}
