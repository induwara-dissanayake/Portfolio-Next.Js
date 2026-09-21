// Application Constants and Configuration
const APP_CONFIG = {
  name: "Thilina Mobiles ERP",
  version: "1.0.0",
  company: "Thilina Mobiles",
  description: "Complete ERP system for mobile phone retail business",
};

const PAGE_TITLES = {
  dashboard: {
    title: "Dashboard",
    subtitle: "Welcome to Thilina Mobiles ERP System",
  },
  inventory: {
    title: "Inventory Management",
    subtitle: "Manage your products and stock levels",
  },
  purchase: {
    title: "Purchase Orders",
    subtitle: "Manage supplier orders and purchases",
  },
  users: {
    title: "User Management",
    subtitle: "Manage system users and permissions",
  },
  employee: {
    title: "Employee Management",
    subtitle: "Manage staff information and payroll",
  },
  customer: {
    title: "Customer Management",
    subtitle: "Manage customer database and history",
  },
  supplier: {
    title: "Company Sales REP",
    subtitle: "Manage Sales REP information and contracts",
  },
  repair: {
    title: "Repair Management",
    subtitle: "Track device repairs and service orders",
  },
  reports: {
    title: "Reports & Analytics",
    subtitle: "Business insights and performance metrics",
  },
  settings: {
    title: "System Settings",
    subtitle: "Configure system preferences and security",
  },
};

const STATUS_COLORS = {
  // Inventory Status
  "In Stock": "bg-green-100 text-green-800",
  "Low Stock": "bg-yellow-100 text-yellow-800",
  "Out of Stock": "bg-red-100 text-red-800",

  // Purchase Order Status
  Completed: "bg-green-100 text-green-800",
  Delivered: "bg-green-100 text-green-800",
  Shipped: "bg-blue-100 text-blue-800",
  Pending: "bg-yellow-100 text-yellow-800",
  Cancelled: "bg-red-100 text-red-800",

  // General Status
  Active: "bg-green-100 text-green-800",
  Inactive: "bg-red-100 text-red-800",
};

// Product Categories
const PRODUCT_CATEGORIES = [
  "Smartphones",
  "Accessories",
  "Tablets",
  "Smart Watches",
  "Laptops",
];

// Mobile Phone Brands
const MOBILE_BRANDS = [
  "Apple",
  "Samsung",
  "Huawei",
  "Xiaomi",
  "OnePlus",
  "Google",
  "Sony",
  "Nokia",
  "Oppo",
  "Vivo",
];

// Specification Fields by Category
const SPECIFICATION_FIELDS = {
  Smartphones: [
    { name: "RAM", type: "text", placeholder: "e.g., 8GB" },
    { name: "Storage", type: "text", placeholder: "e.g., 256GB" },
    { name: "Color", type: "text", placeholder: "e.g., Space Black" },
    { name: "Display Size", type: "text", placeholder: "e.g., 6.1 inch" },
    { name: "Battery", type: "text", placeholder: "e.g., 3200mAh" },
  ],
  Tablets: [
    { name: "RAM", type: "text", placeholder: "e.g., 8GB" },
    { name: "Storage", type: "text", placeholder: "e.g., 256GB" },
    { name: "Color", type: "text", placeholder: "e.g., Silver" },
    { name: "Display Size", type: "text", placeholder: "e.g., 10.9 inch" },
    {
      name: "Wi-Fi/Cellular",
      type: "text",
      placeholder: "e.g., Wi-Fi + Cellular",
    },
  ],
  Accessories: [
    { name: "Color", type: "text", placeholder: "e.g., Black" },
    { name: "Material", type: "text", placeholder: "e.g., Silicone" },
    {
      name: "Compatibility",
      type: "text",
      placeholder: "e.g., iPhone 15 series",
    },
  ],
  "Smart Watches": [
    { name: "Size", type: "text", placeholder: "e.g., 44mm" },
    { name: "Color", type: "text", placeholder: "e.g., Midnight" },
    { name: "Band Type", type: "text", placeholder: "e.g., Sport Band" },
    { name: "Connectivity", type: "text", placeholder: "e.g., GPS + Cellular" },
  ],
};

// Chart Colors
const CHART_COLORS = {
  primary: "#3B82F6",
  secondary: "#10B981",
  accent: "#F59E0B",
  danger: "#EF4444",
  warning: "#F59E0B",
  info: "#06B6D4",
  success: "#10B981",
};

// Form Validation Rules
const VALIDATION_RULES = {
  required: "This field is required",
  email: "Please enter a valid email address",
  phone: "Please enter a valid phone number",
  minLength: (length) => `Minimum ${length} characters required`,
  maxLength: (length) => `Maximum ${length} characters allowed`,
  numeric: "Please enter a valid number",
  positive: "Please enter a positive number",
};

// API Endpoints (for future backend integration)
const API_ENDPOINTS = {
  base: "/api/v1",
  auth: "/api/v1/auth",
  inventory: "/api/v1/inventory",
  purchase: "/api/v1/purchase",
  users: "/api/v1/users",
  employees: "/api/v1/employees",
  customers: "/api/customers",
  suppliers: "/api/suppliers",
  repairs: "/api/repairs",
  reports: "/api/v1/reports",
};

// Export constants
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    APP_CONFIG,
    PAGE_TITLES,
    STATUS_COLORS,
    PRODUCT_CATEGORIES,
    MOBILE_BRANDS,
    SPECIFICATION_FIELDS,
    CHART_COLORS,
    VALIDATION_RULES,
    API_ENDPOINTS,
  };
}
