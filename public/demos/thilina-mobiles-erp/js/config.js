// ─── API Configuration & Standalone Demo Mock Interceptor ─────────────────────────
window.API_BASE_URL = 'https://demo-api.thilinamobiles.local/api';

(function () {
  if (window.__demo_fetch_intercepted) return;
  window.__demo_fetch_intercepted = true;

  const originalFetch = window.fetch;

  // 1. MAIN CATEGORIES
  const mockMainCategories = [
    {
      id: 1,
      name: "Phones",
      description: "Smartphones and Mobile Handsets",
      parentId: null,
      isActive: true,
      children: [
        { id: 10, name: "Smartphones", description: "Touchscreen smartphones", parentId: 1, isActive: true },
        { id: 11, name: "Feature Phones", description: "Keypad feature phones", parentId: 1, isActive: true }
      ]
    },
    {
      id: 2,
      name: "Accessories",
      description: "Chargers, Cables, Earbuds and Cases",
      parentId: null,
      isActive: true,
      children: [
        { id: 20, name: "Chargers & Adapters", description: "Fast wall chargers and power banks", parentId: 2, isActive: true },
        { id: 21, name: "Earbuds & Audio", description: "Wireless earbuds and headphones", parentId: 2, isActive: true },
        { id: 22, name: "Cases & Covers", description: "Protective phone cases", parentId: 2, isActive: true }
      ]
    },
    {
      id: 3,
      name: "Tablets",
      description: "iPads and Android Tablets",
      parentId: null,
      isActive: true,
      children: [
        { id: 30, name: "iOS Tablets", description: "Apple iPad Air and Pro", parentId: 3, isActive: true },
        { id: 31, name: "Android Tablets", description: "Samsung Galaxy Tab series", parentId: 3, isActive: true }
      ]
    }
  ];

  // 2. SUBCATEGORIES
  const mockCategories = [
    { id: 1, name: "Phones", description: "Main Phones", parentId: null, isActive: true, _count: { products: 15 } },
    { id: 2, name: "Accessories", description: "Main Accessories", parentId: null, isActive: true, _count: { products: 20 } },
    { id: 3, name: "Tablets", description: "Main Tablets", parentId: null, isActive: true, _count: { products: 7 } },
    { id: 10, name: "Smartphones", description: "Touchscreen smartphones", parentId: 1, parentName: "Phones", parent: { id: 1, name: "Phones" }, isActive: true, status: "Active", productCount: 8, _count: { products: 8 } },
    { id: 11, name: "Feature Phones", description: "Keypad feature phones", parentId: 1, parentName: "Phones", parent: { id: 1, name: "Phones" }, isActive: true, status: "Active", productCount: 4, _count: { products: 4 } },
    { id: 20, name: "Chargers & Adapters", description: "Fast wall chargers", parentId: 2, parentName: "Accessories", parent: { id: 2, name: "Accessories" }, isActive: true, status: "Active", productCount: 12, _count: { products: 12 } },
    { id: 21, name: "Earbuds & Audio", description: "Wireless earbuds", parentId: 2, parentName: "Accessories", parent: { id: 2, name: "Accessories" }, isActive: true, status: "Active", productCount: 8, _count: { products: 8 } },
    { id: 22, name: "Cases & Covers", description: "Protective phone cases", parentId: 2, parentName: "Accessories", parent: { id: 2, name: "Accessories" }, isActive: true, status: "Active", productCount: 15, _count: { products: 15 } },
    { id: 30, name: "iOS Tablets", description: "Apple iPad Air and Pro", parentId: 3, parentName: "Tablets", parent: { id: 3, name: "Tablets" }, isActive: true, status: "Active", productCount: 5, _count: { products: 5 } },
    { id: 31, name: "Android Tablets", description: "Samsung Galaxy Tab", parentId: 3, parentName: "Tablets", parent: { id: 3, name: "Tablets" }, isActive: true, status: "Active", productCount: 3, _count: { products: 3 } }
  ];

  // 3. BRANDS (10 records)
  const mockBrands = [
    { id: 1, name: "Apple", status: "Active", isActive: true, productCount: 15, _count: { products: 15 } },
    { id: 2, name: "Samsung", status: "Active", isActive: true, productCount: 12, _count: { products: 12 } },
    { id: 3, name: "Xiaomi", status: "Active", isActive: true, productCount: 10, _count: { products: 10 } },
    { id: 4, name: "Anker", status: "Active", isActive: true, productCount: 8, _count: { products: 8 } },
    { id: 5, name: "OnePlus", status: "Active", isActive: true, productCount: 6, _count: { products: 6 } },
    { id: 6, name: "Google", status: "Active", isActive: true, productCount: 5, _count: { products: 5 } },
    { id: 7, name: "Baseus", status: "Active", isActive: true, productCount: 7, _count: { products: 7 } },
    { id: 8, name: "JBL", status: "Active", isActive: true, productCount: 4, _count: { products: 4 } },
    { id: 9, name: "Sony", status: "Active", isActive: true, productCount: 3, _count: { products: 3 } },
    { id: 10, name: "Huawei", status: "Active", isActive: true, productCount: 2, _count: { products: 2 } }
  ];

  // 4. PRODUCTS LIST (10 records)
  const mockProductsList = [
    {
      id: 1,
      productName: "iPhone 15 Pro Max 256GB",
      modelNumber: "15 Pro Max",
      description: "Titanium design, A17 Pro chip, Action button",
      specifications: "256GB Storage, 8GB RAM",
      isActive: true,
      brandId: 1,
      brand: { id: 1, name: "Apple" },
      categoryId: 10,
      category: { id: 10, name: "Smartphones", parentId: 1, parent: { id: 1, name: "Phones" } },
      _count: { productVariants: 2 },
      productVariants: [
        { id: 101, variantName: "Natural Titanium - 256GB", barcode: "194253001001", isActive: true, totalStock: 8, latestSellingPrice: 425000 },
        { id: 102, variantName: "Blue Titanium - 256GB", barcode: "194253001002", isActive: true, totalStock: 4, latestSellingPrice: 425000 }
      ]
    },
    {
      id: 2,
      productName: "Samsung Galaxy S24 Ultra 512GB",
      modelNumber: "S24 Ultra",
      description: "Galaxy AI, 200MP Camera, S Pen integrated",
      specifications: "512GB Storage, 12GB RAM",
      isActive: true,
      brandId: 2,
      brand: { id: 2, name: "Samsung" },
      categoryId: 10,
      category: { id: 10, name: "Smartphones", parentId: 1, parent: { id: 1, name: "Phones" } },
      _count: { productVariants: 2 },
      productVariants: [
        { id: 103, variantName: "Titanium Black - 512GB", barcode: "880609500102", isActive: true, totalStock: 5, latestSellingPrice: 399000 },
        { id: 104, variantName: "Titanium Gray - 512GB", barcode: "880609500103", isActive: true, totalStock: 3, latestSellingPrice: 399000 }
      ]
    },
    {
      id: 3,
      productName: "Apple 20W USB-C Power Adapter",
      modelNumber: "20W Adapter",
      description: "Fast charging power adapter for iPhone/iPad",
      specifications: "20W Output, Type-C",
      isActive: true,
      brandId: 1,
      brand: { id: 1, name: "Apple" },
      categoryId: 20,
      category: { id: 20, name: "Chargers & Adapters", parentId: 2, parent: { id: 2, name: "Accessories" } },
      _count: { productVariants: 1 },
      productVariants: [
        { id: 105, variantName: "White Standard", barcode: "194253001003", isActive: true, totalStock: 45, latestSellingPrice: 9500 }
      ]
    },
    {
      id: 4,
      productName: "Samsung Galaxy Buds 3 Pro",
      modelNumber: "Buds 3 Pro",
      description: "Hi-Fi sound with Active Noise Cancellation",
      specifications: "Wireless ANC Earbuds",
      isActive: true,
      brandId: 2,
      brand: { id: 2, name: "Samsung" },
      categoryId: 21,
      category: { id: 21, name: "Earbuds & Audio", parentId: 2, parent: { id: 2, name: "Accessories" } },
      _count: { productVariants: 2 },
      productVariants: [
        { id: 106, variantName: "Silver", barcode: "880609500104", isActive: true, totalStock: 2, latestSellingPrice: 65000 },
        { id: 107, variantName: "White", barcode: "880609500105", isActive: true, totalStock: 2, latestSellingPrice: 65000 }
      ]
    },
    {
      id: 5,
      productName: "Xiaomi Redmi Note 13 Pro+ 5G",
      modelNumber: "Note 13 Pro+",
      description: "200MP camera, 120W HyperCharge, IP68",
      specifications: "256GB Storage, 12GB RAM",
      isActive: true,
      brandId: 3,
      brand: { id: 3, name: "Xiaomi" },
      categoryId: 10,
      category: { id: 10, name: "Smartphones", parentId: 1, parent: { id: 1, name: "Phones" } },
      _count: { productVariants: 2 },
      productVariants: [
        { id: 108, variantName: "Midnight Black", barcode: "693417700105", isActive: true, totalStock: 10, latestSellingPrice: 129000 },
        { id: 109, variantName: "Aurora Purple", barcode: "693417700106", isActive: true, totalStock: 8, latestSellingPrice: 129000 }
      ]
    },
    {
      id: 6,
      productName: "Anker MagGo 10000mAh Power Bank",
      modelNumber: "MagGo 10K",
      description: "MagSafe wireless portable charger with smart display",
      specifications: "10000mAh, 15W Wireless",
      isActive: true,
      brandId: 4,
      brand: { id: 4, name: "Anker" },
      categoryId: 20,
      category: { id: 20, name: "Chargers & Adapters", parentId: 2, parent: { id: 2, name: "Accessories" } },
      _count: { productVariants: 1 },
      productVariants: [
        { id: 110, variantName: "Black", barcode: "848061001006", isActive: true, totalStock: 15, latestSellingPrice: 24500 }
      ]
    },
    {
      id: 7,
      productName: "iPad Air M2 11-inch 128GB",
      modelNumber: "Air M2",
      description: "Supercharged by Apple M2 chip",
      specifications: "128GB Wi-Fi",
      isActive: true,
      brandId: 1,
      brand: { id: 1, name: "Apple" },
      categoryId: 30,
      category: { id: 30, name: "iOS Tablets", parentId: 3, parent: { id: 3, name: "Tablets" } },
      _count: { productVariants: 2 },
      productVariants: [
        { id: 111, variantName: "Space Gray", barcode: "194253001007", isActive: true, totalStock: 4, latestSellingPrice: 239000 },
        { id: 112, variantName: "Starlight", barcode: "194253001008", isActive: true, totalStock: 3, latestSellingPrice: 239000 }
      ]
    },
    {
      id: 8,
      productName: "OnePlus 12 5G 512GB",
      modelNumber: "12 5G",
      description: "Snapdragon 8 Gen 3, Hasselblad Camera",
      specifications: "512GB Storage, 16GB RAM",
      isActive: true,
      brandId: 5,
      brand: { id: 5, name: "OnePlus" },
      categoryId: 10,
      category: { id: 10, name: "Smartphones", parentId: 1, parent: { id: 1, name: "Phones" } },
      _count: { productVariants: 1 },
      productVariants: [
        { id: 113, variantName: "Flowy Emerald", barcode: "692181500108", isActive: true, totalStock: 5, latestSellingPrice: 275000 }
      ]
    },
    {
      id: 9,
      productName: "Google Pixel 8 Pro 128GB",
      modelNumber: "Pixel 8 Pro",
      description: "Google Tensor G3 chip, best smartphone camera",
      specifications: "128GB Storage, 12GB RAM",
      isActive: true,
      brandId: 6,
      brand: { id: 6, name: "Google" },
      categoryId: 10,
      category: { id: 10, name: "Smartphones", parentId: 1, parent: { id: 1, name: "Phones" } },
      _count: { productVariants: 1 },
      productVariants: [
        { id: 114, variantName: "Bay Blue", barcode: "840244001009", isActive: true, totalStock: 6, latestSellingPrice: 295000 }
      ]
    },
    {
      id: 10,
      productName: "Baseus 65W GaN Fast Charger",
      modelNumber: "65W GaN5",
      description: "Triple-port GaN fast wall charger",
      specifications: "65W 2x USB-C + 1x USB-A",
      isActive: true,
      brandId: 7,
      brand: { id: 7, name: "Baseus" },
      categoryId: 20,
      category: { id: 20, name: "Chargers & Adapters", parentId: 2, parent: { id: 2, name: "Accessories" } },
      _count: { productVariants: 1 },
      productVariants: [
        { id: 115, variantName: "Black", barcode: "695315600110", isActive: true, totalStock: 25, latestSellingPrice: 12500 }
      ]
    }
  ];

  // 5. INVENTORY STOCK ITEMS (10 records)
  const mockInventoryStockList = mockProductsList.map((p) => ({
    id: p.id,
    stockId: `BAT-2026-00${p.id}`,
    productName: p.productName,
    name: p.productName,
    sku: `SKU-${p.id}`,
    barcode: p.productVariants[0]?.barcode || "100000000",
    brandName: p.brand.name,
    brand: p.brand.name,
    categoryName: p.category.name,
    category: p.category.name,
    currentStock: p.productVariants[0]?.totalStock || 10,
    quantity: p.productVariants[0]?.totalStock || 10,
    reorderPoint: 5,
    minStock: 5,
    batchCount: 1,
    location: "Shelf A-1",
    warehouse: "Main Warehouse",
    buyingPrice: 100000,
    cost: 100000,
    sellingPrice: p.productVariants[0]?.latestSellingPrice || 120000,
    price: p.productVariants[0]?.latestSellingPrice || 120000,
    status: p.productVariants[0]?.totalStock > 5 ? "In Stock" : "Low Stock",
    lastUpdated: "2026-09-20"
  }));

  // 6. INVENTORY BATCHES (10 records)
  const mockStockBatches = [
    { stockId: "BAT-2026-001", productName: "iPhone 15 Pro Max 256GB", variantName: "Natural Titanium - 256GB", brand: "Apple", category: { name: "Smartphones" }, barcode: "194253001001", receivedDate: "2026-09-10", quantity: 12, buyingPrice: 380000, sellingPrice: 425000, supplier: "Apple Authorized Dist. LK", status: "In Stock" },
    { stockId: "BAT-2026-002", productName: "Samsung Galaxy S24 Ultra", variantName: "Titanium Black - 512GB", brand: "Samsung", category: { name: "Smartphones" }, barcode: "880609500102", receivedDate: "2026-09-12", quantity: 8, buyingPrice: 360000, sellingPrice: 399000, supplier: "Samsung Electronics Ceylon", status: "In Stock" },
    { stockId: "BAT-2026-003", productName: "Apple 20W USB-C Adapter", variantName: "White Standard", brand: "Apple", category: { name: "Accessories" }, barcode: "194253001003", receivedDate: "2026-09-15", quantity: 3, buyingPrice: 6500, sellingPrice: 9500, supplier: "Apple Authorized Dist. LK", status: "Low Stock" },
    { stockId: "BAT-2026-004", productName: "Samsung Galaxy Buds 3 Pro", variantName: "Silver", brand: "Samsung", category: { name: "Accessories" }, barcode: "880609500104", receivedDate: "2026-09-14", quantity: 0, buyingPrice: 52000, sellingPrice: 65000, supplier: "Samsung Electronics Ceylon", status: "Out of Stock" },
    { stockId: "BAT-2026-005", productName: "Xiaomi Redmi Note 13 Pro+", variantName: "Midnight Black", brand: "Xiaomi", category: { name: "Smartphones" }, barcode: "693417700105", receivedDate: "2026-09-18", quantity: 18, buyingPrice: 110000, sellingPrice: 129000, supplier: "Xiaomi Lanka Pvt Ltd", status: "In Stock" },
    { stockId: "BAT-2026-006", productName: "iPad Air M2 11-inch", variantName: "Space Gray", brand: "Apple", category: { name: "Tablets" }, barcode: "194253001007", receivedDate: "2026-09-16", quantity: 7, buyingPrice: 210000, sellingPrice: 239000, supplier: "Apple Authorized Dist. LK", status: "In Stock" },
    { stockId: "BAT-2026-007", productName: "OnePlus 12 5G 512GB", variantName: "Flowy Emerald", brand: "OnePlus", category: { name: "Smartphones" }, barcode: "692181500108", receivedDate: "2026-09-17", quantity: 5, buyingPrice: 240000, sellingPrice: 275000, supplier: "OnePlus Direct LK", status: "In Stock" },
    { stockId: "BAT-2026-008", productName: "Google Pixel 8 Pro", variantName: "Bay Blue", brand: "Google", category: { name: "Smartphones" }, barcode: "840244001009", receivedDate: "2026-09-19", quantity: 6, buyingPrice: 260000, sellingPrice: 295000, supplier: "Google Devices Importers", status: "In Stock" },
    { stockId: "BAT-2026-009", productName: "Baseus 65W Fast Charger", variantName: "Black", brand: "Baseus", category: { name: "Accessories" }, barcode: "695315600110", receivedDate: "2026-09-20", quantity: 25, buyingPrice: 8500, sellingPrice: 12500, supplier: "Baseus Official Dist. LK", status: "In Stock" },
    { stockId: "BAT-2026-010", productName: "JBL Flip 6 Portable Speaker", variantName: "Black Wireless", brand: "JBL", category: { name: "Accessories" }, barcode: "695315600111", receivedDate: "2026-09-21", quantity: 14, buyingPrice: 32000, sellingPrice: 42000, supplier: "JBL Audio LK", status: "In Stock" }
  ];

  // 7. LOW STOCK ALERT ITEMS (10 records)
  const mockLowStockItems = [
    { stockId: "BAT-2026-003", productName: "Apple 20W USB-C Power Adapter", variantName: "20W Adapter", brand: "Apple", category: { name: "Chargers & Adapters" }, barcode: "194253001003", currentStock: 3, minStockLevel: 15, reorderQty: 25, priority: "Critical", lastSaleDate: "2026-09-20" },
    { stockId: "BAT-2026-004", productName: "Samsung Galaxy Buds 3 Pro", variantName: "Buds 3 Pro", brand: "Samsung", category: { name: "Earbuds & Audio" }, barcode: "880609500104", currentStock: 0, minStockLevel: 10, reorderQty: 20, priority: "Critical", lastSaleDate: "2026-09-19" },
    { stockId: "BAT-2026-007", productName: "OnePlus 12 5G 512GB", variantName: "Flowy Emerald", brand: "OnePlus", category: { name: "Smartphones" }, barcode: "692181500108", currentStock: 5, minStockLevel: 10, reorderQty: 15, priority: "Low", lastSaleDate: "2026-09-18" },
    { stockId: "BAT-2026-008", productName: "Google Pixel 8 Pro 128GB", variantName: "Bay Blue", brand: "Google", category: { name: "Smartphones" }, barcode: "840244001009", currentStock: 6, minStockLevel: 10, reorderQty: 15, priority: "Low", lastSaleDate: "2026-09-17" },
    { stockId: "BAT-2026-006", productName: "iPad Air M2 11-inch 128GB", variantName: "Space Gray", brand: "Apple", category: { name: "iOS Tablets" }, barcode: "194253001007", currentStock: 7, minStockLevel: 12, reorderQty: 10, priority: "Watch", lastSaleDate: "2026-09-16" },
    { stockId: "BAT-2026-002", productName: "Samsung Galaxy S24 Ultra 512GB", variantName: "Titanium Black", brand: "Samsung", category: { name: "Smartphones" }, barcode: "880609500102", currentStock: 8, minStockLevel: 15, reorderQty: 10, priority: "Watch", lastSaleDate: "2026-09-21" },
    { stockId: "BAT-2026-011", productName: "Anker Nylon USB-C Cable 6ft", variantName: "Braided Black", brand: "Anker", category: { name: "Chargers & Adapters" }, barcode: "848061001011", currentStock: 4, minStockLevel: 20, reorderQty: 30, priority: "Critical", lastSaleDate: "2026-09-21" },
    { stockId: "BAT-2026-012", productName: "iPhone 15 Silicon Case", variantName: "Black Shield", brand: "Apple", category: { name: "Cases & Covers" }, barcode: "194253001012", currentStock: 2, minStockLevel: 10, reorderQty: 15, priority: "Critical", lastSaleDate: "2026-09-20" },
    { stockId: "BAT-2026-013", productName: "Sony WH-1000XM5 Headphones", variantName: "Black Noise Cancelling", brand: "Sony", category: { name: "Earbuds & Audio" }, barcode: "490552400113", currentStock: 3, minStockLevel: 8, reorderQty: 5, priority: "Low", lastSaleDate: "2026-09-19" },
    { stockId: "BAT-2026-014", productName: "Baseus Power Bank 20000mAh", variantName: "Fast Charge 22.5W", brand: "Baseus", category: { name: "Chargers & Adapters" }, barcode: "695315600114", currentStock: 5, minStockLevel: 15, reorderQty: 20, priority: "Watch", lastSaleDate: "2026-09-18" }
  ];

  // 8. STOCK MOVEMENTS (10 records)
  const mockStockMovements = [
    { id: 101, date: "2026-09-21 14:30", productName: "iPhone 15 Pro Max 256GB", sku: "IPH15PM256", type: "IN", quantity: 5, reference: "GRN-2026-001", user: "Thilina Perera" },
    { id: 102, date: "2026-09-21 11:15", productName: "Samsung Galaxy S24 Ultra", sku: "S24U512", type: "SALE", quantity: -1, reference: "POS-INV-8891", user: "Sahan Dilshan" },
    { id: 103, date: "2026-09-20 16:45", productName: "Apple 20W Power Adapter", sku: "APL20WADPT", type: "SALE", quantity: -2, reference: "POS-INV-8889", user: "Sahan Dilshan" },
    { id: 104, date: "2026-09-20 09:20", productName: "Xiaomi Redmi Note 13 Pro+", sku: "RN13PROPLUS", type: "ADJUSTMENT", quantity: 2, reference: "STOCK-AUDIT", user: "Kasun Jayawardena" },
    { id: 105, date: "2026-09-19 15:10", productName: "Samsung Buds 3 Pro", sku: "BUDS3PRO", type: "SALE", quantity: -1, reference: "POS-INV-8884", user: "Sahan Dilshan" },
    { id: 106, date: "2026-09-18 13:00", productName: "iPad Air M2", sku: "IPADAIRM2", type: "IN", quantity: 3, reference: "GRN-2026-002", user: "Thilina Perera" },
    { id: 107, date: "2026-09-17 10:45", productName: "OnePlus 12 5G", sku: "OP12-512", type: "SALE", quantity: -1, reference: "POS-INV-8878", user: "Sahan Dilshan" },
    { id: 108, date: "2026-09-16 17:15", productName: "Anker MagGo Power Bank", sku: "ANK-MAGGO", type: "IN", quantity: 15, reference: "GRN-2026-003", user: "Thilina Perera" },
    { id: 109, date: "2026-09-15 12:30", productName: "Baseus 65W Fast Charger", sku: "BAS-65W", type: "SALE", quantity: -3, reference: "POS-INV-8865", user: "Sahan Dilshan" },
    { id: 110, date: "2026-09-14 08:50", productName: "Google Pixel 8 Pro", sku: "PIXEL8PRO", type: "IN", quantity: 6, reference: "GRN-2026-004", user: "Kasun Jayawardena" }
  ];

  // 9. GRN LIST (10 records)
  const mockGRNList = [
    {
      id: 1,
      grnId: 1,
      grnCode: "GRN-2026-001",
      grnNo: "GRN-2026-001",
      supplierName: "Apple Authorized Dist. LK",
      supplier: { id: 1, name: "Dinesh Gunasekara", companyName: "Apple Authorized Dist. LK" },
      invoiceNo: "INV-APL-8821",
      date: "2026-09-15",
      receivedDate: "2026-09-15",
      itemCount: 25,
      itemsCount: 25,
      totalAmount: 4550000,
      totalValue: 4550000,
      amountPaid: 4550000,
      balance: 0,
      stockTypes: ["Main"],
      status: "Received",
      paymentStatus: { id: 1, name: "Paid" },
      paymentType: "Bank Transfer",
      items: [
        { id: 1, productName: "iPhone 15 Pro Max 256GB", variantName: "Natural Titanium - 256GB", barcode: "194253001001", quantity: 10, costPrice: 380000, sellingPrice: 425000, totalCost: 3800000, stockType: "Main" },
        { id: 2, productName: "Apple 20W USB-C Adapter", variantName: "White Standard", barcode: "194253001003", quantity: 15, costPrice: 6500, sellingPrice: 9500, totalCost: 97500, stockType: "Main" }
      ]
    },
    {
      id: 2,
      grnId: 2,
      grnCode: "GRN-2026-002",
      grnNo: "GRN-2026-002",
      supplierName: "Samsung Electronics Ceylon",
      supplier: { id: 2, name: "Priyantha Jayasuriya", companyName: "Samsung Electronics Ceylon" },
      invoiceNo: "SEC-99201",
      date: "2026-09-18",
      receivedDate: "2026-09-18",
      itemCount: 15,
      itemsCount: 15,
      totalAmount: 3100000,
      totalValue: 3100000,
      amountPaid: 1850000,
      balance: 1250000,
      stockTypes: ["Main"],
      status: "Received",
      paymentStatus: { id: 2, name: "Partial" },
      paymentType: "Cheque",
      items: [
        { id: 3, productName: "Samsung Galaxy S24 Ultra", variantName: "Titanium Black - 512GB", barcode: "880609500102", quantity: 8, costPrice: 360000, sellingPrice: 399000, totalCost: 2880000, stockType: "Main" }
      ]
    },
    {
      id: 3,
      grnId: 3,
      grnCode: "GRN-2026-003",
      grnNo: "GRN-2026-003",
      supplierName: "Anker Innovations Asia",
      supplier: { id: 3, name: "Sahan Abeywardena", companyName: "Anker Innovations Asia" },
      invoiceNo: "ANK-7712",
      date: "2026-09-21",
      receivedDate: "2026-09-21",
      itemCount: 50,
      itemsCount: 50,
      totalAmount: 920000,
      totalValue: 920000,
      amountPaid: 0,
      balance: 920000,
      stockTypes: ["Main"],
      status: "Pending Verification",
      paymentStatus: { id: 3, name: "Pending" },
      paymentType: "Credit",
      items: [
        { id: 4, productName: "Anker MagGo 10000mAh Power Bank", variantName: "Black", barcode: "848061001006", quantity: 50, costPrice: 18400, sellingPrice: 24500, totalCost: 920000, stockType: "Main" }
      ]
    },
    {
      id: 4,
      grnId: 4,
      grnCode: "GRN-2026-004",
      grnNo: "GRN-2026-004",
      supplierName: "Xiaomi Lanka Pvt Ltd",
      supplier: { id: 4, name: "Buddhika Herath", companyName: "Xiaomi Lanka Pvt Ltd" },
      invoiceNo: "XM-LKA-401",
      date: "2026-09-12",
      receivedDate: "2026-09-12",
      itemCount: 20,
      itemsCount: 20,
      totalAmount: 2200000,
      totalValue: 2200000,
      amountPaid: 2200000,
      balance: 0,
      stockTypes: ["Main"],
      status: "Received",
      paymentStatus: { id: 1, name: "Paid" },
      paymentType: "Bank Transfer",
      items: [
        { id: 5, productName: "Xiaomi Redmi Note 13 Pro+", variantName: "Midnight Black", barcode: "693417700105", quantity: 20, costPrice: 110000, sellingPrice: 129000, totalCost: 2200000, stockType: "Main" }
      ]
    },
    {
      id: 5,
      grnId: 5,
      grnCode: "GRN-2026-005",
      grnNo: "GRN-2026-005",
      supplierName: "Baseus Official Dist. LK",
      supplier: { id: 5, name: "Gayan Karunaratne", companyName: "Baseus Official Dist. LK" },
      invoiceNo: "BAS-9901",
      date: "2026-09-10",
      receivedDate: "2026-09-10",
      itemCount: 40,
      itemsCount: 40,
      totalAmount: 450000,
      totalValue: 450000,
      amountPaid: 450000,
      balance: 0,
      stockTypes: ["Main"],
      status: "Received",
      paymentStatus: { id: 1, name: "Paid" },
      paymentType: "Cash",
      items: [
        { id: 6, productName: "Baseus 65W GaN Fast Charger", variantName: "Black", barcode: "695315600110", quantity: 40, costPrice: 8500, sellingPrice: 12500, totalCost: 340000, stockType: "Main" }
      ]
    },
    {
      id: 6,
      grnId: 6,
      grnCode: "GRN-2026-006",
      grnNo: "GRN-2026-006",
      supplierName: "OnePlus Direct LK",
      supplier: { id: 6, name: "Janaka Pathirana", companyName: "OnePlus Direct LK" },
      invoiceNo: "OP-LK-204",
      date: "2026-09-08",
      receivedDate: "2026-09-08",
      itemCount: 10,
      itemsCount: 10,
      totalAmount: 2400000,
      totalValue: 2400000,
      amountPaid: 2400000,
      balance: 0,
      stockTypes: ["Main"],
      status: "Received",
      paymentStatus: { id: 1, name: "Paid" },
      paymentType: "Bank Transfer",
      items: [
        { id: 7, productName: "OnePlus 12 5G 512GB", variantName: "Flowy Emerald", barcode: "692181500108", quantity: 10, costPrice: 240000, sellingPrice: 275000, totalCost: 2400000, stockType: "Main" }
      ]
    },
    {
      id: 7,
      grnId: 7,
      grnCode: "GRN-2026-007",
      grnNo: "GRN-2026-007",
      supplierName: "Google Devices Importers",
      supplier: { id: 7, name: "Mohomed Imran", companyName: "Google Devices Importers" },
      invoiceNo: "GGL-IMP-88",
      date: "2026-09-05",
      receivedDate: "2026-09-05",
      itemCount: 8,
      itemsCount: 8,
      totalAmount: 2080000,
      totalValue: 2080000,
      amountPaid: 1580000,
      balance: 500000,
      stockTypes: ["Main"],
      status: "Received",
      paymentStatus: { id: 2, name: "Partial" },
      paymentType: "Cheque",
      items: [
        { id: 8, productName: "Google Pixel 8 Pro 128GB", variantName: "Bay Blue", barcode: "840244001009", quantity: 8, costPrice: 260000, sellingPrice: 295000, totalCost: 2080000, stockType: "Main" }
      ]
    },
    {
      id: 8,
      grnId: 8,
      grnCode: "GRN-2026-008",
      grnNo: "GRN-2026-008",
      supplierName: "JBL Audio LK",
      supplier: { id: 8, name: "Rohan Fernando", companyName: "JBL Audio LK" },
      invoiceNo: "JBL-LK-771",
      date: "2026-09-03",
      receivedDate: "2026-09-03",
      itemCount: 15,
      itemsCount: 15,
      totalAmount: 480000,
      totalValue: 480000,
      amountPaid: 480000,
      balance: 0,
      stockTypes: ["Main"],
      status: "Received",
      paymentStatus: { id: 1, name: "Paid" },
      paymentType: "Bank Transfer",
      items: [
        { id: 9, productName: "JBL Flip 6 Portable Speaker", variantName: "Black Wireless", barcode: "695315600111", quantity: 15, costPrice: 32000, sellingPrice: 42000, totalCost: 480000, stockType: "Main" }
      ]
    },
    {
      id: 9,
      grnId: 9,
      grnCode: "GRN-2026-009",
      grnNo: "GRN-2026-009",
      supplierName: "Sony Lanka Dist.",
      supplier: { id: 9, name: "Niroshan Perera", companyName: "Sony Lanka Dist." },
      invoiceNo: "SNY-LK-009",
      date: "2026-09-01",
      receivedDate: "2026-09-01",
      itemCount: 12,
      itemsCount: 12,
      totalAmount: 1850000,
      totalValue: 1850000,
      amountPaid: 1850000,
      balance: 0,
      stockTypes: ["Repair"],
      status: "Received",
      paymentStatus: { id: 1, name: "Paid" },
      paymentType: "Bank Transfer",
      items: [
        { id: 10, productName: "Sony WH-1000XM5 Headphones", variantName: "Black Noise Cancelling", barcode: "490552400113", quantity: 12, costPrice: 154000, sellingPrice: 185000, totalCost: 1848000, stockType: "Repair" }
      ]
    },
    {
      id: 10,
      grnId: 10,
      grnCode: "GRN-2026-010",
      grnNo: "GRN-2026-010",
      supplierName: "Apple Authorized Dist. LK",
      supplier: { id: 1, name: "Dinesh Gunasekara", companyName: "Apple Authorized Dist. LK" },
      invoiceNo: "INV-APL-8799",
      date: "2026-08-28",
      receivedDate: "2026-08-28",
      itemCount: 30,
      itemsCount: 30,
      totalAmount: 6200000,
      totalValue: 6200000,
      amountPaid: 6200000,
      balance: 0,
      stockTypes: ["Main"],
      status: "Received",
      paymentStatus: { id: 1, name: "Paid" },
      paymentType: "Bank Transfer",
      items: [
        { id: 11, productName: "iPad Air M2 11-inch 128GB", variantName: "Space Gray", barcode: "194253001007", quantity: 30, costPrice: 206666, sellingPrice: 239000, totalCost: 6200000, stockType: "Main" }
      ]
    }
  ];

  // 10. USERS LIST (10 records)
  const mockUsers = [
    { id: 1, name: "Thilina Perera", username: "thilina.admin", email: "thilina@thilinamobiles.com", role: "Administrator", userRoleName: "Administrator", status: "Active", lastLogin: "2026-09-22 09:30 AM", createdAt: "2021-01-15" },
    { id: 2, name: "Kasun Jayawardena", username: "kasun.mgr", email: "kasun@thilinamobiles.com", role: "Manager", userRoleName: "Manager", status: "Active", lastLogin: "2026-09-21 04:15 PM", createdAt: "2022-03-15" },
    { id: 3, name: "Nimali Fernando", username: "nimali.acc", email: "accounts@thilinamobiles.com", role: "Accountant", userRoleName: "Accountant", status: "Active", lastLogin: "2026-09-22 08:45 AM", createdAt: "2023-01-10" },
    { id: 4, name: "Sahan Dilshan", username: "sahan.pos", email: "sahan@thilinamobiles.com", role: "Cashier", userRoleName: "Cashier", status: "Active", lastLogin: "2026-09-22 10:15 AM", createdAt: "2023-08-01" },
    { id: 5, name: "Ruwan Silva", username: "ruwan.tech", email: "ruwan@thilinamobiles.com", role: "Technician", userRoleName: "Technician", status: "Active", lastLogin: "2026-09-21 02:20 PM", createdAt: "2023-09-12" },
    { id: 6, name: "Dilanka Rathnayake", username: "dilanka.pos", email: "dilanka@thilinamobiles.com", role: "Cashier", userRoleName: "Cashier", status: "Active", lastLogin: "2026-09-20 06:10 PM", createdAt: "2023-11-05" },
    { id: 7, name: "Kavisha Perera", username: "kavisha.inv", email: "kavisha@thilinamobiles.com", role: "Inventory Keeper", userRoleName: "Inventory Keeper", status: "Active", lastLogin: "2026-09-22 07:50 AM", createdAt: "2024-01-15" },
    { id: 8, name: "Amila Wijesinghe", username: "amila.sales", email: "amila@thilinamobiles.com", role: "Sales Rep", userRoleName: "Sales Rep", status: "Active", lastLogin: "2026-09-21 05:00 PM", createdAt: "2024-02-01" },
    { id: 9, name: "Janith Kumara", username: "janith.tech", email: "janith@thilinamobiles.com", role: "Technician", userRoleName: "Technician", status: "Active", lastLogin: "2026-09-19 03:30 PM", createdAt: "2024-03-20" },
    { id: 10, name: "Chathuri De Silva", username: "chathuri.acc", email: "chathuri@thilinamobiles.com", role: "Assistant Accountant", userRoleName: "Assistant Accountant", status: "Active", lastLogin: "2026-09-22 09:00 AM", createdAt: "2024-05-10" }
  ];

  // 11. EMPLOYEES LIST (10 records)
  const mockEmployees = [
    { id: 101, employeeId: 101, firstName: "Kasun", lastName: "Jayawardena", name: "Kasun Jayawardena", email: "kasun@thilinamobiles.com", mobileNumber: "0771234567", phone: "0771234567", position: "Store Manager", roleName: "Store Manager", department: "Operations", salary: 125000, status: "Active", hireDate: "2022-03-15", createdAt: "2022-03-15", nic: "199012345678" },
    { id: 102, employeeId: 102, firstName: "Nimali", lastName: "Fernando", name: "Nimali Fernando", email: "nimali@thilinamobiles.com", mobileNumber: "0718899112", phone: "0718899112", position: "Senior Accountant", roleName: "Senior Accountant", department: "Finance", salary: 110000, status: "Active", hireDate: "2023-01-10", createdAt: "2023-01-10", nic: "199288776655" },
    { id: 103, employeeId: 103, firstName: "Sahan", lastName: "Dilshan", name: "Sahan Dilshan", email: "sahan@thilinamobiles.com", mobileNumber: "0754433221", phone: "0754433221", position: "POS Cashier", roleName: "Cashier", department: "Sales", salary: 65000, status: "Active", hireDate: "2023-08-01", createdAt: "2023-08-01", nic: "199511223344" },
    { id: 104, employeeId: 104, firstName: "Ruwan", lastName: "Silva", name: "Ruwan Silva", email: "ruwan@thilinamobiles.com", mobileNumber: "0729988776", phone: "0729988776", position: "Head Technician", roleName: "Technician", department: "Repairs", salary: 95000, status: "Active", hireDate: "2023-09-12", createdAt: "2023-09-12", nic: "199155667788" },
    { id: 105, employeeId: 105, firstName: "Dilanka", lastName: "Rathnayake", name: "Dilanka Rathnayake", email: "dilanka@thilinamobiles.com", mobileNumber: "0783322110", phone: "0783322110", position: "Sales Assistant", roleName: "Cashier", department: "Sales", salary: 60000, status: "Active", hireDate: "2023-11-05", createdAt: "2023-11-05", nic: "199677889900" },
    { id: 106, employeeId: 106, firstName: "Kavisha", lastName: "Perera", name: "Kavisha Perera", email: "kavisha@thilinamobiles.com", mobileNumber: "0701122334", phone: "0701122334", position: "Inventory Officer", roleName: "Inventory Keeper", department: "Warehouse", salary: 70000, status: "Active", hireDate: "2024-01-15", createdAt: "2024-01-15", nic: "199733445566" },
    { id: 107, employeeId: 107, firstName: "Amila", lastName: "Wijesinghe", name: "Amila Wijesinghe", email: "amila@thilinamobiles.com", mobileNumber: "0765544332", phone: "0765544332", position: "Sales Executive", roleName: "Sales Rep", department: "Sales", salary: 80000, status: "Active", hireDate: "2024-02-01", createdAt: "2024-02-01", nic: "199488990011" },
    { id: 108, employeeId: 108, firstName: "Janith", lastName: "Kumara", name: "Janith Kumara", email: "janith@thilinamobiles.com", mobileNumber: "0714455667", phone: "0714455667", position: "Junior Technician", roleName: "Technician", department: "Repairs", salary: 55000, status: "Active", hireDate: "2024-03-20", createdAt: "2024-03-20", nic: "199822334455" },
    { id: 109, employeeId: 109, firstName: "Chathuri", lastName: "De Silva", name: "Chathuri De Silva", email: "chathuri@thilinamobiles.com", mobileNumber: "0776677889", phone: "0776677889", position: "Assistant Accountant", roleName: "Accountant", department: "Finance", salary: 75000, status: "Active", hireDate: "2024-05-10", createdAt: "2024-05-10", nic: "199966778899" },
    { id: 110, employeeId: 110, firstName: "Nuwan", lastName: "Pradeep", name: "Nuwan Pradeep", email: "nuwan@thilinamobiles.com", mobileNumber: "0789900112", phone: "0789900112", position: "Security & Custodian", roleName: "Staff", department: "Maintenance", salary: 45000, status: "Active", hireDate: "2024-06-01", createdAt: "2024-06-01", nic: "198811223344" }
  ];

  // 12. CUSTOMERS LIST (10 records)
  const mockCustomers = [
    { id: 1, customerId: "C001", name: "Mahesh Rajapaksha", firstName: "Mahesh", lastName: "Rajapaksha", phone: "0778899000", mobile: "0778899000", email: "mahesh.r@gmail.com", totalSpent: 645000, totalPurchases: 645000, lastPurchaseDate: "2026-09-18", loyaltyPoints: 320, type: "VIP", address: "Colombo 03" },
    { id: 2, customerId: "C002", name: "Dilini Alwis", firstName: "Dilini", lastName: "Alwis", phone: "0712233445", mobile: "0712233445", email: "dilini.a@yahoo.com", totalSpent: 135000, totalPurchases: 135000, lastPurchaseDate: "2026-09-15", loyaltyPoints: 65, type: "Regular", address: "Kiribathgoda" },
    { id: 3, customerId: "C003", name: "Kamal Wickramasinghe", firstName: "Kamal", lastName: "Wickramasinghe", phone: "0751122334", mobile: "0751122334", email: "kamal.w@hotmail.com", totalSpent: 425000, totalPurchases: 425000, lastPurchaseDate: "2026-09-20", loyaltyPoints: 210, type: "VIP", address: "Kandy" },
    { id: 4, customerId: "C004", name: "Sunil Shantha", firstName: "Sunil", lastName: "Shantha", phone: "0769988776", mobile: "0769988776", email: "sunil.s@gmail.com", totalSpent: 24500, totalPurchases: 24500, lastPurchaseDate: "2026-09-10", loyaltyPoints: 12, type: "Regular", address: "Gampaha" },
    { id: 5, customerId: "C005", name: "Anusha Fonseka", firstName: "Anusha", lastName: "Fonseka", phone: "0704433221", mobile: "0704433221", email: "anusha.f@outlook.com", totalSpent: 239000, totalPurchases: 239000, lastPurchaseDate: "2026-09-14", loyaltyPoints: 115, type: "Regular", address: "Nugegoda" },
    { id: 6, customerId: "C006", name: "Dhanushka Gunawardena", firstName: "Dhanushka", lastName: "Gunawardena", phone: "0773344556", mobile: "0773344556", email: "dhanu.g@gmail.com", totalSpent: 399000, totalPurchases: 399000, lastPurchaseDate: "2026-09-19", loyaltyPoints: 195, type: "VIP", address: "Dehiwala" },
    { id: 7, customerId: "C007", name: "Pabashwari Rathnayake", firstName: "Pabashwari", lastName: "Rathnayake", phone: "0718877665", mobile: "0718877665", email: "paba.r@yahoo.com", totalSpent: 65000, totalPurchases: 65000, lastPurchaseDate: "2026-09-12", loyaltyPoints: 30, type: "Regular", address: "Maharagama" },
    { id: 8, customerId: "C008", name: "Roshan Ranasinghe", firstName: "Roshan", lastName: "Ranasinghe", phone: "0725566778", mobile: "0725566778", email: "roshan.r@gmail.com", totalSpent: 129000, totalPurchases: 129000, lastPurchaseDate: "2026-09-17", loyaltyPoints: 60, type: "Regular", address: "Battaramulla" },
    { id: 9, customerId: "C009", name: "Malini Perera", firstName: "Malini", lastName: "Perera", phone: "0781122445", mobile: "0781122445", email: "malini.p@gmail.com", totalSpent: 275000, totalPurchases: 275000, lastPurchaseDate: "2026-09-16", loyaltyPoints: 135, type: "VIP", address: "Negombo" },
    { id: 10, customerId: "C010", name: "Tharindu Liyanage", firstName: "Tharindu", lastName: "Liyanage", phone: "0761133557", mobile: "0761133557", email: "tharindu.l@gmail.com", totalSpent: 9500, totalPurchases: 9500, lastPurchaseDate: "2026-09-21", loyaltyPoints: 5, type: "Regular", address: "Kadawatha" }
  ];

  // 13. SUPPLIERS LIST (10 records)
  const mockSuppliers = [
    { id: 1, name: "Apple Authorized Dist. LK", companyName: "Apple Authorized Dist. LK", repName: "Dinesh Gunasekara", contactPerson: "Dinesh Gunasekara", phone: "0771234567", mobile: "0771234567", landline: "0112345678", email: "dinesh@appledist.lk", category: "Smartphones & Tablets", address: "No 100, Galle Road, Colombo 03", status: "Active", balance: 0, outstandingBalance: 0 },
    { id: 2, name: "Samsung Electronics Ceylon", companyName: "Samsung Electronics Ceylon", repName: "Priyantha Jayasuriya", contactPerson: "Priyantha Jayasuriya", phone: "0777654321", mobile: "0777654321", landline: "0117654321", email: "priyantha@samsung.lk", category: "Smartphones & Accessories", address: "No 45, Union Place, Colombo 02", status: "Active", balance: 1250000, outstandingBalance: 1250000 },
    { id: 3, name: "Anker Innovations Asia", companyName: "Anker Innovations Asia", repName: "Sahan Abeywardena", contactPerson: "Sahan Abeywardena", phone: "0714455667", mobile: "0714455667", landline: "0114455667", email: "sahan@anker.lk", category: "Chargers & Power Banks", address: "No 12, Main Street, Pettah", status: "Active", balance: 920000, outstandingBalance: 920000 },
    { id: 4, name: "Xiaomi Lanka Pvt Ltd", companyName: "Xiaomi Lanka Pvt Ltd", repName: "Buddhika Herath", contactPerson: "Buddhika Herath", phone: "0758899001", mobile: "0758899001", landline: "0115889900", email: "buddhika@xiaomi.lk", category: "Smartphones & Smart Home", address: "No 88, Duplication Road, Colombo 04", status: "Active", balance: 0, outstandingBalance: 0 },
    { id: 5, name: "Baseus Official Dist. LK", companyName: "Baseus Official Dist. LK", repName: "Gayan Karunaratne", contactPerson: "Gayan Karunaratne", phone: "0721122334", mobile: "0721122334", landline: "0112112233", email: "gayan@baseus.lk", category: "Accessories & Cables", address: "No 34, Liberty Plaza, Colombo 03", status: "Active", balance: 0, outstandingBalance: 0 },
    { id: 6, name: "OnePlus Direct LK", companyName: "OnePlus Direct LK", repName: "Janaka Pathirana", contactPerson: "Janaka Pathirana", phone: "0785544332", mobile: "0785544332", landline: "0118554433", email: "janaka@oneplus.lk", category: "Smartphones", address: "No 15, Arcade Independence, Colombo 07", status: "Active", balance: 0, outstandingBalance: 0 },
    { id: 7, name: "Google Devices Importers", companyName: "Google Devices Importers", repName: "Mohomed Imran", contactPerson: "Mohomed Imran", phone: "0709988776", mobile: "0709988776", landline: "0110998877", email: "imran@gdevices.lk", category: "Smartphones & Pixels", address: "No 200, Baseline Road, Colombo 09", status: "Active", balance: 500000, outstandingBalance: 500000 },
    { id: 8, name: "JBL Audio LK", companyName: "JBL Audio LK", repName: "Rohan Fernando", contactPerson: "Rohan Fernando", phone: "0763322114", mobile: "0763322114", landline: "0116332211", email: "rohan@jbl.lk", category: "Audio & Speakers", address: "No 50, Majestic City, Colombo 04", status: "Active", balance: 0, outstandingBalance: 0 },
    { id: 9, name: "Sony Lanka Dist.", companyName: "Sony Lanka Dist.", repName: "Niroshan Perera", contactPerson: "Niroshan Perera", phone: "0774433221", mobile: "0774433221", landline: "0117443322", email: "niroshan@sony.lk", category: "Audio & Cameras", address: "No 77, Kandy Road, Kelaniya", status: "Active", balance: 0, outstandingBalance: 0 },
    { id: 10, name: "Huawei Technologies LK", companyName: "Huawei Technologies LK", repName: "Shenal De Silva", contactPerson: "Shenal De Silva", phone: "0719988112", mobile: "0719988112", landline: "0119988112", email: "shenal@huawei.lk", category: "Networking & Mobiles", address: "No 10, World Trade Center, Colombo 01", status: "Active", balance: 0, outstandingBalance: 0 }
  ];

  // 14. REPAIRS LIST (10 records)
  const mockRepairs = [
    {
      id: 1,
      repairNumber: "REP-2026-088",
      repairJobNo: "REP-2026-088",
      jobNo: "REP-2026-088",
      deviceName: "Apple iPhone 13 Pro",
      deviceBrand: "Apple",
      brand: "Apple",
      deviceModel: "iPhone 13 Pro",
      model: "iPhone 13 Pro",
      imei: "358992018291001",
      customer: { id: 1, name: "Mahesh Rajapaksha", mobileNumber: "0778899000", phone: "0778899000", email: "mahesh.r@gmail.com" },
      customerName: "Mahesh Rajapaksha",
      customerMobile: "0778899000",
      issue: "Cracked Display & Battery Replacement",
      fault: "Cracked Display & Battery Replacement",
      faultDescription: "Cracked Display & Battery Replacement",
      estimatedCost: 48000,
      totalAmount: 48000,
      advancePaid: 15000,
      advanceAmount: 15000,
      balance: 33000,
      technician: "Ruwan Silva",
      technicianName: "Ruwan Silva",
      status: "In Progress",
      dateReceived: "2026-09-20",
      createdAt: "2026-09-20",
      items: [],
      payments: [{ id: 1, amount: 15000, isAdvance: true, note: "Advance payment" }]
    },
    {
      id: 2,
      repairNumber: "REP-2026-089",
      repairJobNo: "REP-2026-089",
      jobNo: "REP-2026-089",
      deviceName: "Samsung Galaxy S21 Ultra",
      deviceBrand: "Samsung",
      brand: "Samsung",
      deviceModel: "Galaxy S21 Ultra",
      model: "Galaxy S21 Ultra",
      imei: "358992018291002",
      customer: { id: 2, name: "Dilini Alwis", mobileNumber: "0712233445", phone: "0712233445", email: "dilini.a@yahoo.com" },
      customerName: "Dilini Alwis",
      customerMobile: "0712233445",
      issue: "Charging Port Replacement",
      fault: "Charging Port Replacement",
      faultDescription: "Not charging properly",
      estimatedCost: 12500,
      totalAmount: 12500,
      advancePaid: 5000,
      advanceAmount: 5000,
      balance: 7500,
      technician: "Janith Kumara",
      technicianName: "Janith Kumara",
      status: "Completed",
      dateReceived: "2026-09-18",
      createdAt: "2026-09-18",
      items: [],
      payments: [{ id: 2, amount: 5000, isAdvance: true, note: "Advance payment" }]
    },
    {
      id: 3,
      repairNumber: "REP-2026-090",
      repairJobNo: "REP-2026-090",
      jobNo: "REP-2026-090",
      deviceName: "Apple iPad Air 4",
      deviceBrand: "Apple",
      brand: "Apple",
      deviceModel: "iPad Air 4",
      model: "iPad Air 4",
      imei: "358992018291003",
      customer: { id: 3, name: "Kamal Wickramasinghe", mobileNumber: "0751122334", phone: "0751122334", email: "kamal.w@hotmail.com" },
      customerName: "Kamal Wickramasinghe",
      customerMobile: "0751122334",
      issue: "Glass Touch Replacement",
      fault: "Glass Touch Replacement",
      faultDescription: "Touch response dead on top screen",
      estimatedCost: 32000,
      totalAmount: 32000,
      advancePaid: 10000,
      advanceAmount: 10000,
      balance: 22000,
      technician: "Ruwan Silva",
      technicianName: "Ruwan Silva",
      status: "Pending Parts",
      dateReceived: "2026-09-19",
      createdAt: "2026-09-19",
      items: [],
      payments: [{ id: 3, amount: 10000, isAdvance: true, note: "Advance payment" }]
    },
    {
      id: 4,
      repairNumber: "REP-2026-091",
      repairJobNo: "REP-2026-091",
      jobNo: "REP-2026-091",
      deviceName: "Xiaomi Redmi Note 11",
      deviceBrand: "Xiaomi",
      brand: "Xiaomi",
      deviceModel: "Redmi Note 11",
      model: "Redmi Note 11",
      imei: "358992018291004",
      customer: { id: 4, name: "Sunil Shantha", mobileNumber: "0769988776", phone: "0769988776", email: "sunil.s@gmail.com" },
      customerName: "Sunil Shantha",
      customerMobile: "0769988776",
      issue: "Speaker Replacement",
      fault: "Speaker Replacement",
      faultDescription: "No sound during calls",
      estimatedCost: 6500,
      totalAmount: 6500,
      advancePaid: 6500,
      advanceAmount: 6500,
      balance: 0,
      technician: "Janith Kumara",
      technicianName: "Janith Kumara",
      status: "Delivered",
      dateReceived: "2026-09-15",
      createdAt: "2026-09-15",
      items: [],
      payments: [{ id: 4, amount: 6500, isAdvance: true, note: "Full payment" }]
    },
    {
      id: 5,
      repairNumber: "REP-2026-092",
      repairJobNo: "REP-2026-092",
      jobNo: "REP-2026-092",
      deviceName: "OnePlus OnePlus 9",
      deviceBrand: "OnePlus",
      brand: "OnePlus",
      deviceModel: "OnePlus 9",
      model: "OnePlus 9",
      imei: "358992018291005",
      customer: { id: 5, name: "Anusha Fonseka", mobileNumber: "0704433221", phone: "0704433221", email: "anusha.f@outlook.com" },
      customerName: "Anusha Fonseka",
      customerMobile: "0704433221",
      issue: "Display Green Line Issue",
      fault: "Display Green Line Issue",
      faultDescription: "OLED display green line after update",
      estimatedCost: 38000,
      totalAmount: 38000,
      advancePaid: 15000,
      advanceAmount: 15000,
      balance: 23000,
      technician: "Ruwan Silva",
      technicianName: "Ruwan Silva",
      status: "In Progress",
      dateReceived: "2026-09-21",
      createdAt: "2026-09-21",
      items: [],
      payments: [{ id: 5, amount: 15000, isAdvance: true, note: "Advance payment" }]
    },
    {
      id: 6,
      repairNumber: "REP-2026-093",
      repairJobNo: "REP-2026-093",
      jobNo: "REP-2026-093",
      deviceName: "Apple iPhone 12",
      deviceBrand: "Apple",
      brand: "Apple",
      deviceModel: "iPhone 12",
      model: "iPhone 12",
      imei: "358992018291006",
      customer: { id: 6, name: "Dhanushka Gunawardena", mobileNumber: "0773344556", phone: "0773344556", email: "dhanu.g@gmail.com" },
      customerName: "Dhanushka Gunawardena",
      customerMobile: "0773344556",
      issue: "FaceID & Front Camera Fix",
      fault: "FaceID & Front Camera Fix",
      faultDescription: "FaceID disabled error",
      estimatedCost: 22000,
      totalAmount: 22000,
      advancePaid: 5000,
      advanceAmount: 5000,
      balance: 17000,
      technician: "Ruwan Silva",
      technicianName: "Ruwan Silva",
      status: "Completed",
      dateReceived: "2026-09-17",
      createdAt: "2026-09-17",
      items: [],
      payments: [{ id: 6, amount: 5000, isAdvance: true, note: "Advance payment" }]
    },
    {
      id: 7,
      repairNumber: "REP-2026-094",
      repairJobNo: "REP-2026-094",
      jobNo: "REP-2026-094",
      deviceName: "Samsung Galaxy A53",
      deviceBrand: "Samsung",
      brand: "Samsung",
      deviceModel: "Galaxy A53",
      model: "Galaxy A53",
      imei: "358992018291007",
      customer: { id: 7, name: "Pabashwari Rathnayake", mobileNumber: "0718877665", phone: "0718877665", email: "paba.r@yahoo.com" },
      customerName: "Pabashwari Rathnayake",
      customerMobile: "0718877665",
      issue: "Water Damage Cleanup",
      fault: "Water Damage Cleanup",
      faultDescription: "Fell in water, no power",
      estimatedCost: 18500,
      totalAmount: 18500,
      advancePaid: 5000,
      advanceAmount: 5000,
      balance: 13500,
      technician: "Janith Kumara",
      technicianName: "Janith Kumara",
      status: "In Progress",
      dateReceived: "2026-09-20",
      createdAt: "2026-09-20",
      items: [],
      payments: [{ id: 7, amount: 5000, isAdvance: true, note: "Advance payment" }]
    },
    {
      id: 8,
      repairNumber: "REP-2026-095",
      repairJobNo: "REP-2026-095",
      jobNo: "REP-2026-095",
      deviceName: "Google Pixel 6",
      deviceBrand: "Google",
      brand: "Google",
      deviceModel: "Pixel 6",
      model: "Pixel 6",
      imei: "358992018291008",
      customer: { id: 8, name: "Roshan Ranasinghe", mobileNumber: "0725566778", phone: "0725566778", email: "roshan.r@gmail.com" },
      customerName: "Roshan Ranasinghe",
      customerMobile: "0725566778",
      issue: "Battery Replacement",
      fault: "Battery Replacement",
      faultDescription: "Battery draining fast",
      estimatedCost: 14500,
      totalAmount: 14500,
      advancePaid: 14500,
      advanceAmount: 14500,
      balance: 0,
      technician: "Janith Kumara",
      technicianName: "Janith Kumara",
      status: "Delivered",
      dateReceived: "2026-09-16",
      createdAt: "2026-09-16",
      items: [],
      payments: [{ id: 8, amount: 14500, isAdvance: true, note: "Full payment" }]
    },
    {
      id: 9,
      repairNumber: "REP-2026-096",
      repairJobNo: "REP-2026-096",
      jobNo: "REP-2026-096",
      deviceName: "Apple iPhone 14 Pro",
      deviceBrand: "Apple",
      brand: "Apple",
      deviceModel: "iPhone 14 Pro",
      model: "iPhone 14 Pro",
      imei: "358992018291009",
      customer: { id: 9, name: "Malini Perera", mobileNumber: "0781122445", phone: "0781122445", email: "malini.p@gmail.com" },
      customerName: "Malini Perera",
      customerMobile: "0781122445",
      issue: "Back Glass Replacement",
      fault: "Back Glass Replacement",
      faultDescription: "Cracked back glass cover",
      estimatedCost: 25000,
      totalAmount: 25000,
      advancePaid: 10000,
      advanceAmount: 10000,
      balance: 15000,
      technician: "Ruwan Silva",
      technicianName: "Ruwan Silva",
      status: "In Progress",
      dateReceived: "2026-09-21",
      createdAt: "2026-09-21",
      items: [],
      payments: [{ id: 9, amount: 10000, isAdvance: true, note: "Advance payment" }]
    },
    {
      id: 10,
      repairNumber: "REP-2026-097",
      repairJobNo: "REP-2026-097",
      jobNo: "REP-2026-097",
      deviceName: "Xiaomi Poco X3 Pro",
      deviceBrand: "Xiaomi",
      brand: "Xiaomi",
      deviceModel: "Poco X3 Pro",
      model: "Poco X3 Pro",
      imei: "358992018291010",
      customer: { id: 10, name: "Tharindu Liyanage", mobileNumber: "0761133557", phone: "0761133557", email: "tharindu.l@gmail.com" },
      customerName: "Tharindu Liyanage",
      customerMobile: "0761133557",
      issue: "Motherboard PMIC Reball",
      fault: "Motherboard PMIC Reball",
      faultDescription: "Dead phone bootloop",
      estimatedCost: 28000,
      totalAmount: 28000,
      advancePaid: 8000,
      advanceAmount: 8000,
      balance: 20000,
      technician: "Janith Kumara",
      technicianName: "Janith Kumara",
      status: "Pending Parts",
      dateReceived: "2026-09-19",
      createdAt: "2026-09-19",
      items: [],
      payments: [{ id: 10, amount: 8000, isAdvance: true, note: "Advance payment" }]
    }
  ];

  // 15. ACCOUNT TYPES (5 categories)
  const mockAccountTypes = [
    { id: 1, name: "Assets", type_name: "Assets", category: "Assets", normalSide: "DEBIT", normal_balance: "debit" },
    { id: 2, name: "Liabilities", type_name: "Liabilities", category: "Liabilities", normalSide: "CREDIT", normal_balance: "credit" },
    { id: 3, name: "Equity", type_name: "Equity", category: "Equity", normalSide: "CREDIT", normal_balance: "credit" },
    { id: 4, name: "Revenue", type_name: "Revenue", category: "Revenue", normalSide: "CREDIT", normal_balance: "credit" },
    { id: 5, name: "Expenses", type_name: "Expenses", category: "Expenses", normalSide: "DEBIT", normal_balance: "debit" }
  ];

  // 15B. ACCOUNTS LIST (10 records)
  const mockAccountsList = [
    { id: 1, accountCode: "1010", account_code: "1010", accountName: "Cash in Hand", account_name: "Cash in Hand", accountTypeId: 1, type_id: 1, typeName: "Assets", type_name: "Assets", category: "Assets", balance: 450000, isActive: true, is_active: true, parentId: null },
    { id: 2, accountCode: "1020", account_code: "1020", accountName: "Commercial Bank PLC", account_name: "Commercial Bank PLC", accountTypeId: 1, type_id: 1, typeName: "Assets", type_name: "Assets", category: "Assets", balance: 18450000, isActive: true, is_active: true, parentId: null },
    { id: 3, accountCode: "1030", account_code: "1030", accountName: "Sampath Bank Savings", account_name: "Sampath Bank Savings", accountTypeId: 1, type_id: 1, typeName: "Assets", type_name: "Assets", category: "Assets", balance: 5200000, isActive: true, is_active: true, parentId: null },
    { id: 4, accountCode: "2010", account_code: "2010", accountName: "Accounts Payable (Suppliers)", account_name: "Accounts Payable (Suppliers)", accountTypeId: 2, type_id: 2, typeName: "Liabilities", type_name: "Liabilities", category: "Liabilities", balance: 2670000, isActive: true, is_active: true, parentId: null },
    { id: 5, accountCode: "2020", account_code: "2020", accountName: "Salary Payable", account_name: "Salary Payable", accountTypeId: 2, type_id: 2, typeName: "Liabilities", type_name: "Liabilities", category: "Liabilities", balance: 840000, isActive: true, is_active: true, parentId: null },
    { id: 6, accountCode: "3010", account_code: "3010", accountName: "Owner Equity", account_name: "Owner Equity", accountTypeId: 3, type_id: 3, typeName: "Equity", type_name: "Equity", category: "Equity", balance: 20000000, isActive: true, is_active: true, parentId: null },
    { id: 7, accountCode: "4010", account_code: "4010", accountName: "Sales Income", account_name: "Sales Income", accountTypeId: 4, type_id: 4, typeName: "Revenue", type_name: "Revenue", category: "Revenue", balance: 42500000, isActive: true, is_active: true, parentId: null },
    { id: 8, accountCode: "4020", account_code: "4020", accountName: "Repair Service Revenue", account_name: "Repair Service Revenue", accountTypeId: 4, type_id: 4, typeName: "Revenue", type_name: "Revenue", category: "Revenue", balance: 3450000, isActive: true, is_active: true, parentId: null },
    { id: 9, accountCode: "5010", account_code: "5010", accountName: "Cost of Goods Sold (COGS)", account_name: "Cost of Goods Sold (COGS)", accountTypeId: 5, type_id: 5, typeName: "Expenses", type_name: "Expenses", category: "Expenses", balance: 31200000, isActive: true, is_active: true, parentId: null },
    { id: 10, accountCode: "5020", account_code: "5020", accountName: "Shop Rent & Electricity Expense", account_name: "Shop Rent & Electricity Expense", accountTypeId: 5, type_id: 5, typeName: "Expenses", type_name: "Expenses", category: "Expenses", balance: 1450000, isActive: true, is_active: true, parentId: null }
  ];

  // 15C. JOURNAL ENTRIES (10 records)
  const mockJournalEntries = [
    {
      id: 1,
      entryNumber: "JE-2026-001",
      date: "2026-09-22",
      description: "Daily POS Sales Cash & Card Deposit",
      referenceType: "POS_SALE",
      referenceNo: "POS-8891",
      totalAmount: 425000,
      status: "POSTED",
      lines: [
        { id: 101, accountId: 1, accountCode: "1010", accountName: "Cash in Hand", debit: 425000, credit: 0 },
        { id: 102, accountId: 7, accountCode: "4010", accountName: "Sales Income", debit: 0, credit: 425000 }
      ]
    },
    {
      id: 2,
      entryNumber: "JE-2026-002",
      date: "2026-09-21",
      description: "Supplier Stock Purchase Inventory Receipt",
      referenceType: "GRN",
      referenceNo: "GRN-2026-001",
      totalAmount: 4550000,
      status: "POSTED",
      lines: [
        { id: 103, accountId: 9, accountCode: "5010", accountName: "Cost of Goods Sold (COGS)", debit: 4550000, credit: 0 },
        { id: 104, accountId: 4, accountCode: "2010", accountName: "Accounts Payable (Suppliers)", debit: 0, credit: 4550000 }
      ]
    },
    {
      id: 3,
      entryNumber: "JE-2026-003",
      date: "2026-09-20",
      description: "Repair Service Job Payment Received",
      referenceType: "REPAIR",
      referenceNo: "REP-2026-088",
      totalAmount: 15000,
      status: "POSTED",
      lines: [
        { id: 105, accountId: 1, accountCode: "1010", accountName: "Cash in Hand", debit: 15000, credit: 0 },
        { id: 106, accountId: 8, accountCode: "4020", accountName: "Repair Service Revenue", debit: 0, credit: 15000 }
      ]
    },
    {
      id: 4,
      entryNumber: "JE-2026-004",
      date: "2026-09-18",
      description: "Electricity Utility Bill Settlement",
      referenceType: "BILL_PAYMENT",
      referenceNo: "CEB-9920182",
      totalAmount: 145000,
      status: "POSTED",
      lines: [
        { id: 107, accountId: 10, accountCode: "5020", accountName: "Shop Rent & Electricity Expense", debit: 145000, credit: 0 },
        { id: 108, accountId: 2, accountCode: "1020", accountName: "Commercial Bank PLC", debit: 0, credit: 145000 }
      ]
    },
    {
      id: 5,
      entryNumber: "JE-2026-005",
      date: "2026-09-15",
      description: "Monthly Staff Payroll Salary Settlement",
      referenceType: "PAYROLL",
      referenceNo: "PAY-2026-09",
      totalAmount: 840000,
      status: "POSTED",
      lines: [
        { id: 109, accountId: 5, accountCode: "2020", accountName: "Salary Payable", debit: 840000, credit: 0 },
        { id: 110, accountId: 2, accountCode: "1020", accountName: "Commercial Bank PLC", debit: 0, credit: 840000 }
      ]
    },
    {
      id: 6,
      entryNumber: "JE-2026-006",
      date: "2026-09-12",
      description: "Supplier Payment Transfer via Commercial Bank",
      referenceType: "SUPPLIER_PAYMENT",
      referenceNo: "SEC-99201",
      totalAmount: 1850000,
      status: "POSTED",
      lines: [
        { id: 111, accountId: 4, accountCode: "2010", accountName: "Accounts Payable (Suppliers)", debit: 1850000, credit: 0 },
        { id: 112, accountId: 2, accountCode: "1020", accountName: "Commercial Bank PLC", debit: 0, credit: 1850000 }
      ]
    },
    {
      id: 7,
      entryNumber: "JE-2026-007",
      date: "2026-09-10",
      description: "Cash Transfer to Bank Savings Account",
      referenceType: "TRANSFER",
      referenceNo: "TRF-9901",
      totalAmount: 500000,
      status: "POSTED",
      lines: [
        { id: 113, accountId: 3, accountCode: "1030", accountName: "Sampath Bank Savings", debit: 500000, credit: 0 },
        { id: 114, accountId: 1, accountCode: "1010", accountName: "Cash in Hand", debit: 0, credit: 500000 }
      ]
    },
    {
      id: 8,
      entryNumber: "JE-2026-008",
      date: "2026-09-08",
      description: "Shop Equipment Accessories Inventory Topup",
      referenceType: "GRN",
      referenceNo: "GRN-2026-005",
      totalAmount: 450000,
      status: "POSTED",
      lines: [
        { id: 115, accountId: 9, accountCode: "5010", accountName: "Cost of Goods Sold (COGS)", debit: 450000, credit: 0 },
        { id: 116, accountId: 1, accountCode: "1010", accountName: "Cash in Hand", debit: 0, credit: 450000 }
      ]
    },
    {
      id: 9,
      entryNumber: "JE-2026-009",
      date: "2026-09-05",
      description: "Credit Installment Customer Payment Received",
      referenceType: "INSTALLMENT",
      referenceNo: "POS-INV-8891",
      totalAmount: 200000,
      status: "POSTED",
      lines: [
        { id: 117, accountId: 1, accountCode: "1010", accountName: "Cash in Hand", debit: 200000, credit: 0 },
        { id: 118, accountId: 7, accountCode: "4010", accountName: "Sales Income", debit: 0, credit: 200000 }
      ]
    },
    {
      id: 10,
      entryNumber: "JE-2026-010",
      date: "2026-09-01",
      description: "Owner Capital Contribution Investment",
      referenceType: "EQUITY",
      referenceNo: "EQT-2026-01",
      totalAmount: 5000000,
      status: "POSTED",
      lines: [
        { id: 119, accountId: 2, accountCode: "1020", accountName: "Commercial Bank PLC", debit: 5000000, credit: 0 },
        { id: 120, accountId: 6, accountCode: "3010", accountName: "Owner Equity", debit: 0, credit: 5000000 }
      ]
    }
  ];

  // 16. SAVED BILLERS (10 records)
  const mockBillersList = [
    { id: 1, name: "Ceylon Electricity Board", biller_name: "Ceylon Electricity Board", category: "Utilities", category_name: "Utilities", code: "CEB-COL-03", accountNo: "CEB-9920182", defaultPaymentType: { id: 1, name: "Bank Transfer" }, defaultExpenseAccount: { id: 1, accountCode: "5010", accountName: "Electricity & Power" }, contactNumber: "011-2304950" },
    { id: 2, name: "National Water Supply Board", biller_name: "National Water Supply Board", category: "Utilities", category_name: "Utilities", code: "NWSDB-LK", accountNo: "NWSDB-88192", defaultPaymentType: { id: 2, name: "Cash" }, defaultExpenseAccount: { id: 2, accountCode: "5020", accountName: "Water Supply Expense" }, contactNumber: "011-2613840" },
    { id: 3, name: "SLT Mobitel Fiber Internet", biller_name: "SLT Mobitel Fiber Internet", category: "Telecommunication", category_name: "Telecommunication", code: "SLT-FIBER", accountNo: "SLT-772819", defaultPaymentType: { id: 1, name: "Bank Transfer" }, defaultExpenseAccount: { id: 3, accountCode: "5030", accountName: "Telephone & Internet" }, contactNumber: "011-2441122" },
    { id: 4, name: "Dialog Axiata Corporate Postpaid", biller_name: "Dialog Axiata Corporate Postpaid", category: "Telecommunication", category_name: "Telecommunication", code: "DLG-CORP", accountNo: "DLG-445511", defaultPaymentType: { id: 1, name: "Bank Transfer" }, defaultExpenseAccount: { id: 3, accountCode: "5030", accountName: "Telephone & Internet" }, contactNumber: "077-7678678" },
    { id: 5, name: "Shop Building Rent - Colombo 03", biller_name: "Shop Building Rent - Colombo 03", category: "Rent", category_name: "Rent", code: "PROPERTY-RENT", accountNo: "RNT-2026-09", defaultPaymentType: { id: 1, name: "Bank Transfer" }, defaultExpenseAccount: { id: 4, accountCode: "5040", accountName: "Rent Expense" }, contactNumber: "071-8899000" },
    { id: 6, name: "Ceylinco General Insurance", biller_name: "Ceylinco General Insurance", category: "Insurance", category_name: "Insurance", code: "CEY-INS", accountNo: "INS-990182", defaultPaymentType: { id: 1, name: "Bank Transfer" }, defaultExpenseAccount: { id: 5, accountCode: "5050", accountName: "Insurance Expense" }, contactNumber: "011-2485000" },
    { id: 7, name: "Colombo Municipal Council Tax", biller_name: "Colombo Municipal Council Tax", category: "Taxes & Rates", category_name: "Taxes & Rates", code: "CMC-RATES", accountNo: "CMC-2026-Q3", defaultPaymentType: { id: 3, name: "Cheque" }, defaultExpenseAccount: { id: 6, accountCode: "5060", accountName: "Rates & Local Taxes" }, contactNumber: "011-2693151" },
    { id: 8, name: "Securitas Security Patrol", biller_name: "Securitas Security Patrol", category: "Services", category_name: "Services", code: "SEC-PATROL", accountNo: "SEC-44120", defaultPaymentType: { id: 1, name: "Bank Transfer" }, defaultExpenseAccount: { id: 7, accountCode: "5070", accountName: "Security Services" }, contactNumber: "011-5500000" },
    { id: 9, name: "Janashakthi Employee Health Ins", biller_name: "Janashakthi Employee Health Ins", category: "Insurance", category_name: "Insurance", code: "JNS-HEALTH", accountNo: "JNS-88190", defaultPaymentType: { id: 1, name: "Bank Transfer" }, defaultExpenseAccount: { id: 5, accountCode: "5050", accountName: "Insurance Expense" }, contactNumber: "011-2636363" },
    { id: 10, name: "Waste Management Service", biller_name: "Waste Management Service", category: "Utilities", category_name: "Utilities", code: "WASTE-COL", accountNo: "WST-0091", defaultPaymentType: { id: 2, name: "Cash" }, defaultExpenseAccount: { id: 1, accountCode: "5010", accountName: "Utilities Expense" }, contactNumber: "011-2687111" }
  ];

  // 16B. BILLS LIST (10 records)
  const mockBillsList = [
    {
      id: 1,
      billNumber: "CEB-9920182",
      billNo: "CEB-9920182",
      referenceNo: "CEB-9920182",
      billingPeriod: "Sept 2026",
      biller: { id: 1, name: "Ceylon Electricity Board", category: "Utilities" },
      biller_name: "Ceylon Electricity Board",
      category: "Electricity",
      billDate: "2026-09-01",
      dueDate: "2026-09-28",
      totalAmount: 145000,
      amount: 145000,
      paidAmount: 145000,
      balance: 0,
      status: "Paid",
      paymentMethod: "Bank Transfer"
    },
    {
      id: 2,
      billNumber: "NWSDB-88192",
      billNo: "NWSDB-88192",
      referenceNo: "NWSDB-88192",
      billingPeriod: "Sept 2026",
      biller: { id: 2, name: "National Water Supply Board", category: "Utilities" },
      biller_name: "National Water Supply Board",
      category: "Water",
      billDate: "2026-09-05",
      dueDate: "2026-09-30",
      totalAmount: 18500,
      amount: 18500,
      paidAmount: 0,
      balance: 18500,
      status: "Unpaid",
      paymentMethod: "Pending"
    },
    {
      id: 3,
      billNumber: "SLT-772819",
      billNo: "SLT-772819",
      referenceNo: "SLT-772819",
      billingPeriod: "Sept 2026",
      biller: { id: 3, name: "SLT Mobitel Fiber Internet", category: "Telecommunication" },
      biller_name: "SLT Mobitel Fiber Internet",
      category: "Internet",
      billDate: "2026-09-02",
      dueDate: "2026-09-25",
      totalAmount: 38500,
      amount: 38500,
      paidAmount: 38500,
      balance: 0,
      status: "Paid",
      paymentMethod: "Online Banking"
    },
    {
      id: 4,
      billNumber: "DLG-445511",
      billNo: "DLG-445511",
      referenceNo: "DLG-445511",
      billingPeriod: "Sept 2026",
      biller: { id: 4, name: "Dialog Axiata Corporate Postpaid", category: "Telecommunication" },
      biller_name: "Dialog Axiata Corporate Postpaid",
      category: "Mobile Phone",
      billDate: "2026-09-03",
      dueDate: "2026-09-26",
      totalAmount: 24500,
      amount: 24500,
      paidAmount: 0,
      balance: 24500,
      status: "Unpaid",
      paymentMethod: "Pending"
    },
    {
      id: 5,
      billNumber: "RNT-2026-09",
      billNo: "RNT-2026-09",
      referenceNo: "RNT-2026-09",
      billingPeriod: "Sept 2026",
      biller: { id: 5, name: "Shop Building Rent - Colombo 03", category: "Rent" },
      biller_name: "Shop Building Rent - Colombo 03",
      category: "Property Rent",
      billDate: "2026-09-01",
      dueDate: "2026-10-01",
      totalAmount: 350000,
      amount: 350000,
      paidAmount: 0,
      balance: 350000,
      status: "Unpaid",
      paymentMethod: "Cheque"
    },
    {
      id: 6,
      billNumber: "INS-990182",
      billNo: "INS-990182",
      referenceNo: "INS-990182",
      billingPeriod: "Sept 2026",
      biller: { id: 6, name: "Ceylinco General Insurance", category: "Insurance" },
      biller_name: "Ceylinco General Insurance",
      category: "Shop Insurance",
      billDate: "2026-08-25",
      dueDate: "2026-09-22",
      totalAmount: 85000,
      amount: 85000,
      paidAmount: 85000,
      balance: 0,
      status: "Paid",
      paymentMethod: "Bank Transfer"
    },
    {
      id: 7,
      billNumber: "CMC-2026-Q3",
      billNo: "CMC-2026-Q3",
      referenceNo: "CMC-2026-Q3",
      billingPeriod: "Q3 2026",
      biller: { id: 7, name: "Colombo Municipal Council Tax", category: "Taxes & Rates" },
      biller_name: "Colombo Municipal Council Tax",
      category: "Local Rates",
      billDate: "2026-09-01",
      dueDate: "2026-09-30",
      totalAmount: 45000,
      amount: 45000,
      paidAmount: 0,
      balance: 45000,
      status: "Unpaid",
      paymentMethod: "Pending"
    },
    {
      id: 8,
      billNumber: "SEC-44120",
      billNo: "SEC-44120",
      referenceNo: "SEC-44120",
      billingPeriod: "Sept 2026",
      biller: { id: 8, name: "Securitas Security Patrol", category: "Services" },
      biller_name: "Securitas Security Patrol",
      category: "Security",
      billDate: "2026-09-02",
      dueDate: "2026-09-27",
      totalAmount: 65000,
      amount: 65000,
      paidAmount: 65000,
      balance: 0,
      status: "Paid",
      paymentMethod: "Bank Transfer"
    },
    {
      id: 9,
      billNumber: "JNS-88190",
      billNo: "JNS-88190",
      referenceNo: "JNS-88190",
      billingPeriod: "Sept 2026",
      biller: { id: 9, name: "Janashakthi Employee Health Ins", category: "Insurance" },
      biller_name: "Janashakthi Employee Health Ins",
      category: "Employee Health",
      billDate: "2026-09-04",
      dueDate: "2026-09-29",
      totalAmount: 110000,
      amount: 110000,
      paidAmount: 0,
      balance: 110000,
      status: "Unpaid",
      paymentMethod: "Pending"
    },
    {
      id: 10,
      billNumber: "WST-0091",
      billNo: "WST-0091",
      referenceNo: "WST-0091",
      billingPeriod: "Sept 2026",
      biller: { id: 10, name: "Waste Management Service", category: "Utilities" },
      biller_name: "Waste Management Service",
      category: "Waste Clean",
      billDate: "2026-09-01",
      dueDate: "2026-09-24",
      totalAmount: 12000,
      amount: 12000,
      paidAmount: 12000,
      balance: 0,
      status: "Paid",
      paymentMethod: "Cash"
    }
  ];

  // 17. CUSTOMER INSTALLMENTS (10 records)
  const mockCustomerInstallments = [
    { id: 1, invoiceId: 1, invoiceNo: "POS-INV-8891", customerName: "Mahesh Rajapaksha", customerPhone: "0778899000", totalAmount: 425000, paidAmount: 200000, balance: 225000, status: "Partial", dueDate: "2026-10-15", installmentNo: "1 of 3" },
    { id: 2, invoiceId: 2, invoiceNo: "POS-INV-8892", customerName: "Dilini Alwis", customerPhone: "0712233445", totalAmount: 135000, paidAmount: 50000, balance: 85000, status: "Partial", dueDate: "2026-10-10", installmentNo: "1 of 2" },
    { id: 3, invoiceId: 3, invoiceNo: "POS-INV-8893", customerName: "Kamal Wickramasinghe", customerPhone: "0751122334", totalAmount: 399000, paidAmount: 150000, balance: 249000, status: "Partial", dueDate: "2026-10-20", installmentNo: "1 of 4" },
    { id: 4, invoiceId: 4, invoiceNo: "POS-INV-8894", customerName: "Dhanushka Gunawardena", customerPhone: "0773344556", totalAmount: 239000, paidAmount: 100000, balance: 139000, status: "Partial", dueDate: "2026-10-05", installmentNo: "1 of 2" },
    { id: 5, invoiceId: 5, invoiceNo: "POS-INV-8895", customerName: "Anusha Fonseka", customerPhone: "0704433221", totalAmount: 129000, paidAmount: 0, balance: 129000, status: "Unpaid", dueDate: "2026-09-30", installmentNo: "1 of 1" },
    { id: 6, invoiceId: 6, invoiceNo: "POS-INV-8896", customerName: "Roshan Ranasinghe", customerPhone: "0725566778", totalAmount: 275000, paidAmount: 100000, balance: 175000, status: "Partial", dueDate: "2026-10-25", installmentNo: "1 of 3" },
    { id: 7, invoiceId: 7, invoiceNo: "POS-INV-8897", customerName: "Malini Perera", customerPhone: "0781122445", totalAmount: 295000, paidAmount: 150000, balance: 145000, status: "Partial", dueDate: "2026-10-12", installmentNo: "1 of 2" },
    { id: 8, invoiceId: 8, invoiceNo: "POS-INV-8898", customerName: "Pabashwari Rathnayake", customerPhone: "0718877665", totalAmount: 65000, paidAmount: 25000, balance: 40000, status: "Partial", dueDate: "2026-10-08", installmentNo: "1 of 2" },
    { id: 9, invoiceId: 9, invoiceNo: "POS-INV-8899", customerName: "Sunil Shantha", customerPhone: "0769988776", totalAmount: 24500, paidAmount: 10000, balance: 14500, status: "Partial", dueDate: "2026-09-28", installmentNo: "1 of 2" },
    { id: 10, invoiceId: 10, invoiceNo: "POS-INV-8900", customerName: "Tharindu Liyanage", customerPhone: "0761133557", totalAmount: 42000, paidAmount: 20000, balance: 22000, status: "Partial", dueDate: "2026-10-18", installmentNo: "1 of 2" }
  ];

  // 18. PAYROLL LIST (10 records)
  const mockPayrollList = mockEmployees.map((emp, idx) => ({
    id: idx + 1,
    employeeId: emp.employeeId,
    employeeName: emp.name,
    month: "September 2026",
    basicSalary: emp.salary,
    allowances: 15000,
    deductions: 5000,
    netSalary: emp.salary + 10000,
    status: idx % 2 === 0 ? "Paid" : "Pending",
    paidDate: idx % 2 === 0 ? "2026-09-20" : null
  }));

  // 19. ATTENDANCE LIST (10 records)
  const mockAttendanceList = mockEmployees.map((emp, idx) => ({
    id: idx + 1,
    employeeId: emp.employeeId,
    employeeName: emp.name,
    date: "2026-09-22",
    checkIn: "08:30 AM",
    checkOut: idx % 3 === 0 ? null : "05:30 PM",
    status: idx % 4 === 0 ? "Late" : "Present"
  }));

  const mockDashboardStats = {
    totalRevenue: 14250000,
    totalSales: 18500000,
    totalSalesCount: 42,
    activeCustomersCount: 128,
    pendingRepairs: 5,
    salesTrend: [
      { month: "Apr", amount: 9800000, count: 22 },
      { month: "May", amount: 11200000, count: 28 },
      { month: "Jun", amount: 10500000, count: 25 },
      { month: "Jul", amount: 13400000, count: 32 },
      { month: "Aug", amount: 12800000, count: 30 },
      { month: "Sep", amount: 14250000, count: 42 }
    ],
    revenueTrend: [
      { month: "Apr", amount: 9800000 },
      { month: "May", amount: 11200000 },
      { month: "Jun", amount: 10500000 },
      { month: "Jul", amount: 13400000 },
      { month: "Aug", amount: 12800000 },
      { month: "Sep", amount: 14250000 }
    ],
    recentSales: [
      { id: 1, firstItemName: "iPhone 15 Pro Max 256GB", customerName: "Mahesh Rajapaksha", totalAmount: 425000, createdAt: "2026-09-22" },
      { id: 2, firstItemName: "Samsung Galaxy S24 Ultra", customerName: "Kamal Wickramasinghe", totalAmount: 399000, createdAt: "2026-09-22" },
      { id: 3, firstItemName: "Apple 20W Power Adapter", customerName: "Sunil Shantha", totalAmount: 9500, createdAt: "2026-09-21" },
      { id: 4, firstItemName: "iPad Air M2 11-inch", customerName: "Anusha Fonseka", totalAmount: 239000, createdAt: "2026-09-21" },
      { id: 5, firstItemName: "OnePlus 12 5G", customerName: "Roshan Ranasinghe", totalAmount: 275000, createdAt: "2026-09-20" }
    ],
    lowStockAlerts: [
      { id: 3, productName: "Apple 20W Power Adapter", variantName: "White Standard", quantity: 3 },
      { id: 4, productName: "Samsung Galaxy Buds 3 Pro", variantName: "Silver", quantity: 0 },
      { id: 11, productName: "Anker Nylon USB-C Cable", variantName: "Braided Black", quantity: 4 }
    ]
  };

  // INTERCEPT FETCH CALLS
  window.fetch = async function (url, options = {}) {
    const urlStr = String(url || "");
    const method = (options.method || "GET").toUpperCase();

    let requestBody = {};
    if (options.body) {
      try {
        requestBody = typeof options.body === "string" ? JSON.parse(options.body) : options.body;
      } catch (e) {
        requestBody = {};
      }
    }

    if (
      urlStr.includes("onrender.com") ||
      urlStr.includes("localhost") ||
      urlStr.includes("demo-api.thilinamobiles") ||
      urlStr.includes("/api")
    ) {
      console.log(`[Demo Interceptor] ${method} ${urlStr}`);

      // 1. Auth Login
      if (urlStr.includes("/auth/login") || urlStr.includes("/login")) {
        const username = requestBody.username || "admin";
        const role = requestBody.role || "Administrator";
        return makeJsonResponse({
          success: true,
          message: "Login successful (Demo Mode)",
          data: {
            token: "demo-jwt-auth-token-xyz999",
            user: {
              id: 1,
              username: username,
              role: role,
              userRoleName: role
            }
          }
        });
      }

      // 2. Dashboard Stats
      if (urlStr.includes("/dashboard/stats") || urlStr.includes("/empdashboard")) {
        return makeJsonResponse({
          success: true,
          data: mockDashboardStats
        });
      }

      // 3. Products Module
      if (urlStr.includes("/category/main")) {
        return makeJsonResponse({ success: true, data: mockMainCategories });
      }

      if (urlStr.includes("/category")) {
        return makeJsonResponse({ success: true, data: mockCategories });
      }

      if (urlStr.includes("/brands")) {
        return makeJsonResponse({ success: true, data: mockBrands });
      }

      if (urlStr.includes("/products/stats")) {
        return makeJsonResponse({
          success: true,
          data: { totalProducts: mockProductsList.length, totalCategories: mockCategories.length, totalBrands: mockBrands.length, outOfStock: 1, lowStock: 2 }
        });
      }

      if (urlStr.includes("/products")) {
        return makeJsonResponse({
          success: true,
          data: mockProductsList,
          products: mockProductsList,
          pagination: { page: 1, pages: 1, total: mockProductsList.length }
        });
      }

      // 4. Inventory & Stock
      if (urlStr.includes("/inventory/stats") || urlStr.includes("/inventory/summary")) {
        return makeJsonResponse({
          success: true,
          data: { totalStockValue: 18500000, lowStockItems: mockLowStockItems.length, outOfStock: 1, totalBatches: mockStockBatches.length, totalProducts: mockProductsList.length, lowStockCount: mockLowStockItems.length, outOfStockCount: 1 }
        });
      }

      if (urlStr.includes("/inventory/search-stock")) {
        return makeJsonResponse({
          success: true,
          data: mockStockBatches.map(b => ({
            stockId: b.stockId,
            productName: b.productName,
            variantName: b.variantName,
            barcode: b.barcode,
            quantityInStock: b.quantity,
            buyingPrice: b.buyingPrice,
            status: b.status
          }))
        });
      }

      if (urlStr.includes("/inventory/variants")) {
        return makeJsonResponse({
          success: true,
          data: mockProductsList.map(p => ({ id: p.id, productName: p.productName, variantName: p.productVariants[0]?.variantName || "" }))
        });
      }

      if (urlStr.includes("/inventory/batches")) {
        return makeJsonResponse({ success: true, data: mockStockBatches });
      }

      if (urlStr.includes("/inventory/movements")) {
        return makeJsonResponse({ success: true, data: mockStockMovements });
      }

      if (urlStr.includes("/inventory/low-stock")) {
        return makeJsonResponse({ success: true, data: mockLowStockItems });
      }

      if (urlStr.includes("/inventory/stock") || urlStr.includes("/inventory")) {
        return makeJsonResponse({
          success: true,
          data: mockInventoryStockList,
          inventory: mockInventoryStockList
        });
      }

      // 5. GRN / Purchases
      if (urlStr.includes("/grn/stats")) {
        return makeJsonResponse({
          success: true,
          data: {
            totalGrns: mockGRNList.length,
            pendingPayments: mockGRNList.filter(g => g.balance > 0).length,
            receivedToday: 5,
            valueReceived: mockGRNList.reduce((acc, g) => acc + (g.totalAmount || 0), 0)
          }
        });
      }

      if (urlStr.includes("/grn/suppliers")) {
        return makeJsonResponse({
          success: true,
          data: mockSuppliers.map(s => ({
            id: s.id,
            name: s.repName || s.contactPerson || s.name,
            companyName: s.name,
            contactPerson: s.contactPerson || s.repName
          }))
        });
      }

      if (urlStr.includes("/grn/payment-statuses") || urlStr.includes("/payment-statuses")) {
        return makeJsonResponse({
          success: true,
          data: [{ id: 1, name: "Paid" }, { id: 2, name: "Partial" }, { id: 3, name: "Pending" }, { id: 4, name: "Voided" }]
        });
      }

      if (urlStr.includes("/grn/payment-types") || urlStr.includes("/payment-types")) {
        return makeJsonResponse({
          success: true,
          data: [{ id: 1, name: "Cash" }, { id: 2, name: "Bank Transfer" }, { id: 3, name: "Cheque" }, { id: 4, name: "Credit" }]
        });
      }

      if (urlStr.match(/\/grn\/\d+\/payments/)) {
        return makeJsonResponse({ success: true, data: [] });
      }

      if (urlStr.match(/\/grn\/\d+\/void/)) {
        return makeJsonResponse({ success: true, message: "GRN voided successfully" });
      }

      if (urlStr.match(/\/grn\/\d+/)) {
        const idMatch = urlStr.match(/\/grn\/(\d+)/);
        const grnId = idMatch ? parseInt(idMatch[1]) : 1;
        const foundGrn = mockGRNList.find(g => g.id === grnId || g.grnId === grnId) || mockGRNList[0];
        return makeJsonResponse({ success: true, data: foundGrn });
      }

      if (urlStr.includes("/grn") || urlStr.includes("/purchases")) {
        return makeJsonResponse({
          success: true,
          data: mockGRNList
        });
      }

      // 6. Users / Roles
      if (urlStr.includes("/user-roles")) {
        return makeJsonResponse({
          success: true,
          data: [{ id: 1, name: "Administrator" }, { id: 2, name: "Manager" }, { id: 3, name: "Accountant" }, { id: 4, name: "Cashier" }]
        });
      }

      if (urlStr.includes("/users")) {
        return makeJsonResponse({
          success: true,
          data: mockUsers
        });
      }

      // 7. Employee / Payroll / Attendance
      if (urlStr.includes("/employee/roles")) {
        return makeJsonResponse({
          success: true,
          data: [{ id: 1, name: "Store Manager", department: "Operations" }, { id: 2, name: "Senior Accountant", department: "Finance" }, { id: 3, name: "POS Cashier", department: "Sales" }, { id: 4, name: "Head Technician", department: "Repairs" }]
        });
      }

      if (urlStr.includes("/employee/all/addresses")) {
        return makeJsonResponse({ success: true, data: [] });
      }

      if (urlStr.includes("/employee")) {
        return makeJsonResponse({
          success: true,
          data: mockEmployees
        });
      }

      if (urlStr.includes("/payroll")) {
        return makeJsonResponse({ success: true, data: mockPayrollList });
      }

      if (urlStr.includes("/attendance")) {
        return makeJsonResponse({ success: true, data: mockAttendanceList });
      }

      // 8. Invoices / Installments / Payment Statuses
      if (urlStr.includes("/invoices/payment-statuses")) {
        return makeJsonResponse({
          success: true,
          data: [{ id: 1, name: "Paid" }, { id: 2, name: "Partial" }, { id: 3, name: "Unpaid" }]
        });
      }

      if (urlStr.includes("/invoices/payment-types")) {
        return makeJsonResponse({
          success: true,
          data: [{ id: 1, name: "Cash" }, { id: 2, name: "Card" }, { id: 3, name: "Bank Transfer" }, { id: 4, name: "Cheque" }]
        });
      }

      if (urlStr.includes("/invoices/credit")) {
        return makeJsonResponse({
          success: true,
          data: mockCustomerInstallments
        });
      }

      // 9. Customers
      if (urlStr.includes("/customers/stats")) {
        return makeJsonResponse({
          success: true,
          data: { totalCustomers: mockCustomers.length, activeThisMonth: 8, totalRevenue: 2450000 }
        });
      }

      if (urlStr.includes("/customers/installments") || urlStr.includes("/installments")) {
        return makeJsonResponse({ success: true, data: mockCustomerInstallments });
      }

      if (urlStr.includes("/customers")) {
        return makeJsonResponse({
          success: true,
          data: mockCustomers
        });
      }

      // 10. Suppliers
      if (urlStr.includes("/suppliers/stats")) {
        return makeJsonResponse({
          success: true,
          data: { totalSuppliers: mockSuppliers.length, activeSuppliers: 10, totalBalance: 2670000 }
        });
      }

      if (urlStr.includes("/suppliers/payments")) {
        return makeJsonResponse({ success: true, data: [] });
      }

      if (urlStr.includes("/suppliers")) {
        return makeJsonResponse({
          success: true,
          data: mockSuppliers
        });
      }

      // 11. Repairs
      if (urlStr.includes("/repairs/stats")) {
        return makeJsonResponse({
          success: true,
          data: { activeRepairs: mockRepairs.length, completedToday: 4, pendingParts: 2, monthlyRevenue: 285000 }
        });
      }

      if (urlStr.includes("/repairs/payment-types")) {
        return makeJsonResponse({
          success: true,
          data: [{ id: 1, name: "Cash" }, { id: 2, name: "Card" }, { id: 3, name: "Bank Transfer" }]
        });
      }

      if (urlStr.match(/\/repairs\/\d+\/status/)) {
        return makeJsonResponse({ success: true, message: "Repair status updated successfully" });
      }

      if (urlStr.match(/\/repairs\/\d+\/items/)) {
        return makeJsonResponse({ success: true, message: "Repair items updated successfully" });
      }

      if (urlStr.match(/\/repairs\/\d+/)) {
        const idMatch = urlStr.match(/\/repairs\/(\d+)/);
        const repId = idMatch ? parseInt(idMatch[1]) : 1;
        const foundRep = mockRepairs.find(r => r.id === repId) || mockRepairs[0];
        return makeJsonResponse({ success: true, data: foundRep });
      }

      if (urlStr.includes("/repairs")) {
        return makeJsonResponse({
          success: true,
          data: mockRepairs
        });
      }

      // 12. Accounts
      if (urlStr.includes("/accounts/account-types")) {
        return makeJsonResponse({ success: true, data: mockAccountTypes });
      }

      if (urlStr.includes("/accounts/accounts")) {
        return makeJsonResponse({ success: true, data: mockAccountsList });
      }

      if (urlStr.includes("/accounts/transaction-mappings")) {
        return makeJsonResponse({ success: true, data: [] });
      }

      if (urlStr.includes("/accounts/journal-entries")) {
        return makeJsonResponse({
          success: true,
          data: {
            entries: mockJournalEntries,
            total: mockJournalEntries.length,
            page: 1,
            limit: 50,
            pages: 1
          }
        });
      }

      if (urlStr.includes("/accounts/reports/trial-balance")) {
        return makeJsonResponse({
          success: true,
          data: {
            accounts: mockAccountsList.map(acc => ({
              accountCode: acc.accountCode,
              accountName: acc.accountName,
              typeName: acc.typeName,
              debit: (acc.accountTypeId === 1 || acc.accountTypeId === 5) ? acc.balance : 0,
              credit: (acc.accountTypeId === 2 || acc.accountTypeId === 3 || acc.accountTypeId === 4) ? acc.balance : 0
            })),
            totalDebit: 56750000,
            totalCredit: 56750000,
            isBalanced: true
          }
        });
      }

      if (urlStr.includes("/accounts/reports/balance-sheet")) {
        return makeJsonResponse({
          success: true,
          data: {
            assets: mockAccountsList.filter(a => a.accountTypeId === 1),
            liabilities: mockAccountsList.filter(a => a.accountTypeId === 2),
            equity: mockAccountsList.filter(a => a.accountTypeId === 3),
            totalAssets: 24100000,
            totalLiabilities: 3510000,
            totalEquity: 20590000,
            isBalanced: true
          }
        });
      }

      if (urlStr.includes("/accounts/reports/income-statement")) {
        return makeJsonResponse({
          success: true,
          data: {
            revenue: mockAccountsList.filter(a => a.accountTypeId === 4),
            expenses: mockAccountsList.filter(a => a.accountTypeId === 5),
            totalRevenue: 45950000,
            totalExpenses: 32650000,
            netIncome: 13300000
          }
        });
      }

      if (urlStr.includes("/accounts/reports/general-ledger")) {
        return makeJsonResponse({
          success: true,
          data: {
            accounts: mockAccountsList.map(a => ({
              accountCode: a.accountCode,
              accountName: a.accountName,
              openingBalance: 0,
              endingBalance: a.balance,
              totalDebit: a.balance,
              totalCredit: 0,
              transactions: []
            }))
          }
        });
      }

      if (urlStr.includes("/accounts/reports/cashflow")) {
        return makeJsonResponse({
          success: true,
          data: {
            operatingActivities: [
              { description: "Net Income from Sales & Services", amount: 13300000 }
            ],
            investingActivities: [],
            financingActivities: [
              { description: "Owner Capital Contribution", amount: 5000000 }
            ],
            netCashFlow: 18300000,
            beginningCash: 5800000,
            endingCash: 24100000
          }
        });
      }

      if (urlStr.includes("/accounts/reports/aging")) {
        return makeJsonResponse({
          success: true,
          data: {
            customers: mockCustomerInstallments.map(i => ({
              id: i.id,
              name: i.customerName,
              phone: i.customerPhone,
              current: i.balance,
              days30: 0,
              days60: 0,
              days90Plus: 0,
              total: i.balance
            })),
            suppliers: mockSuppliers.filter(s => s.balance > 0).map(s => ({
              id: s.id,
              name: s.companyName,
              current: s.balance,
              days30: 0,
              days60: 0,
              days90Plus: 0,
              total: s.balance
            })),
            totalCustomerOutstanding: 1044500,
            totalSupplierOutstanding: 2670000
          }
        });
      }

      if (urlStr.includes("/accounts/reports/bank-reconciliation")) {
        return makeJsonResponse({
          success: true,
          data: {
            bankAccount: "Commercial Bank PLC",
            statementBalance: 18450000,
            bookBalance: 18450000,
            difference: 0,
            isReconciled: true,
            unclearedDeposits: [],
            unclearedWithdrawals: []
          }
        });
      }

      if (urlStr.includes("/accounts")) {
        return makeJsonResponse({
          success: true,
          data: {
            accountTypes: mockAccountTypes,
            accounts: mockAccountsList,
            mappings: [],
            journalEntries: mockJournalEntries
          }
        });
      }

      // 13. Bills & Utilities
      if (urlStr.includes("/bills/billers")) {
        const parts = urlStr.split("/bills/billers/");
        if (parts.length > 1 && parts[1] && !isNaN(parseInt(parts[1]))) {
          const bId = parseInt(parts[1]);
          const found = mockBillersList.find(b => b.id === bId) || mockBillersList[0];
          return makeJsonResponse({ success: true, data: found });
        }
        return makeJsonResponse({ success: true, data: mockBillersList });
      }

      if (urlStr.includes("/pay") || urlStr.includes("/payments")) {
        return makeJsonResponse({ success: true, message: "Payment recorded successfully" });
      }

      if (urlStr.includes("/cancel")) {
        return makeJsonResponse({ success: true, message: "Bill invoice cancelled successfully" });
      }

      if (urlStr.match(/\/bills\/\d+$/)) {
        const billId = parseInt(urlStr.split("/bills/")[1]);
        const found = mockBillsList.find(b => b.id === billId) || mockBillsList[0];
        return makeJsonResponse({ success: true, data: found });
      }

      if (urlStr.includes("/bills")) {
        return makeJsonResponse({
          success: true,
          data: mockBillsList,
          total: mockBillsList.length,
          totalPages: 1,
          stats: {
            totalUnpaidAmount: 578000,
            unpaidCount: 5,
            overdueCount: 0,
            paidThisMonthAmount: 345000,
            activeBillersCount: 10
          }
        });
      }

      // Default generic fallback
      return makeJsonResponse({
        success: true,
        message: "Demo Mode Response",
        data: []
      });
    }

    return originalFetch.apply(this, arguments);
  };

  function makeJsonResponse(dataObj, statusCode = 200) {
    return Promise.resolve(
      new Response(JSON.stringify(dataObj), {
        status: statusCode,
        statusText: "OK",
        headers: {
          "Content-Type": "application/json"
        }
      })
    );
  }
})();
