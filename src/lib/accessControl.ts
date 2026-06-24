import { ResponsibilityAccessKey } from "./userResponsibilities";

export type ResponsibilityPermissions = Record<ResponsibilityAccessKey, boolean>;

export const DEFAULT_PERMISSIONS: ResponsibilityPermissions = {
  dashboard_access: false,
  purchase_access: false,
  inventory_access: false,
  sales_access: false,
  sales_billing_access: false,
  reports_access: false,
  settings_access: false,
};

type ProtectedRouteRule = {
  prefixes: string[];
  permission: ResponsibilityAccessKey;
};

export const MENU_PERMISSION_MAP: Array<{ name: string; permission: ResponsibilityAccessKey }> = [
  { name: "Dashboard", permission: "dashboard_access" },
  { name: "Purchase", permission: "purchase_access" },
  { name: "Inventory", permission: "inventory_access" },
  { name: "Sales", permission: "sales_access" },
  { name: "Sales Billing", permission: "sales_billing_access" },
  { name: "Reports", permission: "reports_access" },
  { name: "Settings", permission: "settings_access" },
];

const FIRST_ACCESSIBLE_PATHS: Array<{ permission: ResponsibilityAccessKey; path: string }> = [
  { permission: "dashboard_access", path: "/" },
  { permission: "purchase_access", path: "/purchase/supplier" },
  { permission: "inventory_access", path: "/inventory/products" },
  { permission: "sales_access", path: "/sales/customer" },
  { permission: "sales_billing_access", path: "/transactions/sales" },
  { permission: "reports_access", path: "/reports/stock-ledger-report" },
  { permission: "settings_access", path: "/settings/user-responsibilities" },
];

const ROUTE_RULES: ProtectedRouteRule[] = [
  {
    prefixes: ["/purchase", "/transactions/purchase", "/transactions/purchase-approval", "/transactions/grn"],
    permission: "purchase_access",
  },
  {
    prefixes: ["/inventory/products", "/inventory/opening-stock", "/inventory/image-master", "/inventory/image-master-v2"],
    permission: "inventory_access",
  },
  {
    prefixes: ["/sales", "/inventory/pricing", "/inventory/discounts"],
    permission: "sales_access",
  },
  {
    prefixes: ["/transactions/sales"],
    permission: "sales_billing_access",
  },
  {
    prefixes: ["/reports"],
    permission: "reports_access",
  },
  {
    prefixes: [
      "/inventory/categories",
      "/inventory/materials",
      "/inventory/uom",
      "/inventory/tax",
      "/inventory/payment-mode",
      "/inventory/payment-terms",
      "/inventory/currency-rate",
      "/inventory/currencies",
      "/inventory/location",
      "/inventory/warehouse",
      "/inventory/locator",
      "/inventory/despatch-terms",
      "/inventory/company-settings",
      "/inventory/user-settings",
      "/settings/user-responsibilities",
      "/admin",
    ],
    permission: "settings_access",
  },
];

export function normalizePermissions(input?: Partial<ResponsibilityPermissions> | null) {
  return {
    ...DEFAULT_PERMISSIONS,
    ...(input || {}),
  };
}

export function canAccess(permissionSet: Partial<ResponsibilityPermissions> | null | undefined, key: ResponsibilityAccessKey) {
  return Boolean(normalizePermissions(permissionSet)[key]);
}

export function getRequiredPermissionForPath(pathname: string): ResponsibilityAccessKey | null {
  if (!pathname || pathname === "/" || pathname === "") {
    return "dashboard_access";
  }

  for (const rule of ROUTE_RULES) {
    if (rule.prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) {
      return rule.permission;
    }
  }

  return null;
}

export function getFirstAccessiblePath(permissionSet: Partial<ResponsibilityPermissions> | null | undefined) {
  const permissions = normalizePermissions(permissionSet);
  const match = FIRST_ACCESSIBLE_PATHS.find((entry) => permissions[entry.permission]);
  return match?.path || null;
}
