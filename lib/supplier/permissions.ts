/**
 * Supplier team roles and what each can open. The database enforces the same
 * rules (internal.member_can_* in migration 20261114050000); this module
 * drives the sidebar, page guards and the Team UI.
 */

export const MEMBER_ROLES = ["supplier", "staff", "product_manager", "order_manager"] as const;
export type MemberRole = (typeof MEMBER_ROLES)[number];

/** Dashboard areas. "all" = everything else: overview, analytics, discounts, customers. */
export type DashboardArea = "products" | "orders" | "all";

export const ROLE_LABELS: Record<MemberRole, string> = {
  supplier: "Supplier",
  staff: "Staff",
  product_manager: "Product manager",
  order_manager: "Order manager",
};

export const ROLE_DESCRIPTIONS: Record<MemberRole, string> = {
  supplier: "Full dashboard: products, orders, analytics, discounts and customers.",
  staff: "Products and orders.",
  product_manager: "Products only.",
  order_manager: "Orders only.",
};

const ROLE_AREAS: Record<MemberRole, DashboardArea[]> = {
  supplier: ["products", "orders", "all"],
  staff: ["products", "orders"],
  product_manager: ["products"],
  order_manager: ["orders"],
};

export function isMemberRole(value: unknown): value is MemberRole {
  return typeof value === "string" && (MEMBER_ROLES as readonly string[]).includes(value);
}

/** The owner can open everything; members only their role's areas. */
export function canAccess(role: "owner" | MemberRole, area: DashboardArea): boolean {
  return role === "owner" || ROLE_AREAS[role].includes(area);
}

export type AreaAccess = Record<DashboardArea, boolean>;

export function areaAccess(role: "owner" | MemberRole): AreaAccess {
  return { products: canAccess(role, "products"), orders: canAccess(role, "orders"), all: canAccess(role, "all") };
}

/** Where a member lands when the overview isn't theirs. */
export function homeFor(role: "owner" | MemberRole): string {
  if (canAccess(role, "all")) return "/supplier/dashboard";
  if (canAccess(role, "orders")) return "/supplier/dashboard/orders";
  return "/supplier/dashboard/products";
}
