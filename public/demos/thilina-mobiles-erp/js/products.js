// Set API base URL
window.API_BASE_URL = window.API_BASE_URL || "http://localhost:3000/api";

// Global variables to store data
let allProducts = [];
let allCategories = [];
let allMainCategories = [];
let allBrands = [];
let productStats = {};
let currentVariantModalProduct = null;
let currentEditingVariantId = null;

const PRODUCTS_PAGE_SIZE = 25;
let productsListPage = 1;
let mainCategoriesPage = 1;
let subCategoriesPage = 1;
let brandsListPage = 1;

function buildListPaginationFooter(page, total, changeFnName) {
  const pages = Math.max(1, Math.ceil((total || 0) / PRODUCTS_PAGE_SIZE));
  const safePage = Math.min(Math.max(1, page || 1), pages);
  return `
    <div class="mt-4 flex flex-col sm:flex-row items-center justify-between gap-3">
      <p class="text-sm text-gray-600">
        Showing page ${safePage} of ${pages} (${total} entries)
      </p>
      <div class="flex items-center gap-2">
        <button type="button"
          onclick="${changeFnName}(${safePage - 1})"
          class="px-3 py-2 border border-gray-300 rounded-lg text-sm ${
            safePage <= 1 ? "opacity-50 cursor-not-allowed" : "hover:bg-gray-50"
          }"
          ${safePage <= 1 ? "disabled" : ""}>
          Previous
        </button>
        <button type="button"
          onclick="${changeFnName}(${safePage + 1})"
          class="px-3 py-2 border border-gray-300 rounded-lg text-sm ${
            safePage >= pages
              ? "opacity-50 cursor-not-allowed"
              : "hover:bg-gray-50"
          }"
          ${safePage >= pages ? "disabled" : ""}>
          Next
        </button>
      </div>
    </div>
  `;
}

function sliceForPage(items, page) {
  const total = items.length;
  const pages = Math.max(1, Math.ceil(total / PRODUCTS_PAGE_SIZE));
  const safePage = Math.min(Math.max(1, page || 1), pages);
  const start = (safePage - 1) * PRODUCTS_PAGE_SIZE;
  return {
    page: safePage,
    pages,
    total,
    rows: items.slice(start, start + PRODUCTS_PAGE_SIZE),
  };
}

// Helper function to get auth token
function getAuthToken() {
  return (
    localStorage.getItem("authToken") ||
    sessionStorage.getItem("authToken") ||
    ""
  );
}

// Helper function to make authenticated API calls
async function makeAuthenticatedRequest(url, options = {}) {
  const token = getAuthToken();

  if (!token) {
    throw new Error("Authentication required. Please login first.");
  }

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
    ...options.headers,
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));

    if (response.status === 401) {
      throw new Error("Authentication failed. Please login again.");
    } else if (response.status === 403) {
      throw new Error("Access denied. Insufficient permissions.");
    } else if (response.status === 404) {
      throw new Error("Resource not found. Please check the endpoint.");
    } else if (response.status === 500) {
      // Prefer server-provided message when available for easier debugging
      throw new Error(
        errorData.message || "Server error. Please try again later."
      );
    }

    throw new Error(
      errorData.message || `HTTP error! status: ${response.status}`
    );
  }

  return await response.json();
}

function initializeProductsModule() {
  initializeProductsPage();
}

function catalogQuickAddButtonHtml(onclick, title) {
  return `<button type="button" onclick="${onclick}" title="${title}"
    class="inline-flex items-center justify-center w-5 h-5 rounded border border-gray-300 text-blue-600 hover:bg-blue-50 hover:border-blue-400 shrink-0">
    <i data-feather="plus" class="w-3 h-3"></i>
  </button>`;
}

function getCatalogQuickAddModalsHtml() {
  return `
    <!-- Add Product Modal -->
    <div id="add-product-modal" class="modal fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center hidden z-[60]">
      <div class="modal-content bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div class="flex justify-between items-center p-6 border-b">
          <h2 class="text-xl font-semibold">Add New Product</h2>
          <button onclick="closeAddProductModal()" class="text-gray-400 hover:text-gray-600">
            <i data-feather="x" class="w-6 h-6"></i>
          </button>
        </div>
        <form id="add-product-form" class="p-6">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Product Name *</label>
              <input type="text" id="product-name" required class="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          <div class="mb-6">
            <label class="block text-sm font-medium text-gray-700 mb-3">Product Classification *</label>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <div class="flex items-center gap-1 mb-1">
                  <label class="block text-xs font-medium text-gray-500">Category *</label>
                  ${catalogQuickAddButtonHtml("openAddSubCategoryModal()", "Add Sub Category")}
                </div>
                <select id="product-subcategory" required onchange="handleSubcategoryChange()" class="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500">
                  <option value="">Select Category</option>
                </select>
              </div>
              <div>
                <div class="flex items-center gap-1 mb-1">
                  <label class="block text-xs font-medium text-gray-500">Brand</label>
                  ${catalogQuickAddButtonHtml("openAddBrandModal()", "Add New Brand")}
                </div>
                <select id="product-brand" class="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500">
                  <option value="">Select Brand</option>
                </select>
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-500 mb-1">Model Number</label>
                <input type="text" id="product-model" class="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500" placeholder="Optional" />
              </div>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                <label class="block text-xs font-medium text-gray-500 mb-1">Warranty (optional)</label>
                <div class="flex gap-2">
                  <input type="number" id="product-warranty-value" min="1" class="w-1/2 border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500" placeholder="e.g. 12" />
                  <select id="product-warranty-unit" class="w-1/2 border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500">
                    <option value="">Unit</option>
                    <option value="weeks">Weeks</option>
                    <option value="months">Months</option>
                    <option value="years">Years</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea id="product-description" rows="3" class="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500"></textarea>
          </div>
          <div class="flex justify-end space-x-3 pt-6">
            <button type="button" onclick="closeAddProductModal()" class="btn-secondary px-4 py-2">Cancel</button>
            <button type="submit" class="btn-primary px-4 py-2 text-white">Add Product</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Add Sub Category Modal -->
    <div id="add-category-modal" class="modal fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center hidden z-[70]">
      <div class="modal-content bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] flex flex-col">
        <div class="flex justify-between items-center p-6 border-b flex-shrink-0">
          <h2 class="text-xl font-semibold">Add Sub Category</h2>
          <button onclick="closeAddCategoryModal()" class="text-gray-400 hover:text-gray-600">
            <i data-feather="x" class="w-6 h-6"></i>
          </button>
        </div>
        <form id="add-category-form" class="p-6 overflow-y-auto flex-1 min-h-0">
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-1">Main Category *</label>
            <select id="parent-category" required onchange="handleAddSubCategoryParentChange()" class="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500">
              <option value="">Select Main Category</option>
            </select>
          </div>
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-1">Sub Category Name *</label>
            <input type="text" id="category-name" required class="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500" placeholder="Enter sub category name" />
          </div>
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea id="category-description" rows="2" class="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500"></textarea>
          </div>
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select id="category-isactive" class="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500">
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </div>
          <div class="mb-4">
            <div class="flex justify-between items-center mb-2">
              <label class="block text-sm font-medium text-gray-700">Sub Category Specification Fields</label>
              <button type="button" onclick="addSpecFieldRow('sub-spec-fields-container')" class="text-blue-600 hover:text-blue-800 text-sm flex items-center gap-1">
                <i data-feather="plus-circle" class="w-4 h-4"></i> Add Field
              </button>
            </div>
            <p class="text-xs text-gray-500 mb-2">Selecting a Main Category auto-loads its specification fields. You can add/remove/edit fields for this sub category.</p>
            <div id="sub-spec-fields-container" class="space-y-3"></div>
          </div>
          <div class="flex justify-end space-x-3 pt-2 border-t sticky bottom-0 bg-white pb-1">
            <button type="button" onclick="closeAddCategoryModal()" class="btn-secondary px-4 py-2">Cancel</button>
            <button type="submit" class="btn-primary px-4 py-2 text-white">Add Sub Category</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Add Brand Modal -->
    <div id="add-brand-modal" class="modal fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center hidden z-[70]">
      <div class="modal-content bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div class="flex justify-between items-center p-6 border-b">
          <h2 class="text-xl font-semibold">Add New Brand</h2>
          <button onclick="closeAddBrandModal()" class="text-gray-400 hover:text-gray-600">
            <i data-feather="x" class="w-6 h-6"></i>
          </button>
        </div>
        <form id="add-brand-form" class="p-6">
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-1">Brand Name *</label>
            <input type="text" id="brand-name" required class="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500" />
          </div>
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select id="brand-isactive" class="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500">
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </div>
          <div class="flex justify-end space-x-3">
            <button type="button" onclick="closeAddBrandModal()" class="btn-secondary px-4 py-2">Cancel</button>
            <button type="submit" class="btn-primary px-4 py-2 text-white">Add Brand</button>
          </div>
        </form>
      </div>
    </div>
  `;
}

function bindCatalogQuickAddForm(formId, handler) {
  const form = document.getElementById(formId);
  if (!form || form.dataset.bound === "true") return;
  form.dataset.bound = "true";
  form.addEventListener("submit", handler);
}

function bindCatalogQuickAddForms() {
  bindCatalogQuickAddForm("add-product-form", handleAddProduct);
  bindCatalogQuickAddForm("add-category-form", handleAddCategory);
  bindCatalogQuickAddForm("add-brand-form", handleAddBrand);
}

function isAddProductModalOpen() {
  const modal = document.getElementById("add-product-modal");
  return !!(modal && !modal.classList.contains("hidden"));
}

function generateProductsContent() {
  return `
    <div class="content-fade-in p-4 sm:p-6">
      <div class="bg-white border-b border-gray-200 px-4 sm:px-6 py-4 -mx-4 -mt-4 sm:-mx-6 sm:-mt-6 mb-6">
        <div class="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center">
          <div>
            <h1 class="text-2xl font-bold text-gray-900">Products</h1>
            <p class="text-gray-600 mt-1">Manage product catalog, categories, brands, and models</p>
          </div>
          <div class="flex space-x-3">
            <button onclick="openAddProductModal()" class="btn-primary px-4 py-2 text-white rounded-lg flex items-center w-full sm:w-auto justify-center">
              <i data-feather="plus" class="w-4 h-4 mr-2"></i>
              Add Product
            </button>
          </div>
        </div>
      </div>

      <!-- Statistics Cards -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div class="card p-6">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-gray-600 text-sm">Total Products</p>
              <p class="text-3xl font-bold text-gray-900" id="total-products">245</p>
              <p class="text-sm text-gray-500 mt-1">In catalog</p>
            </div>
            <div class="bg-blue-100 p-3 rounded-full">
              <i data-feather="box" class="w-6 h-6 text-blue-600"></i>
            </div>
          </div>
        </div>
        <div class="card p-6">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-gray-600 text-sm">Categories</p>
              <p class="text-3xl font-bold text-green-600" id="total-categories">8</p>
              <p class="text-sm text-gray-500 mt-1">Product groups</p>
            </div>
            <div class="bg-green-100 p-3 rounded-full">
              <i data-feather="grid" class="w-6 h-6 text-green-600"></i>
            </div>
          </div>
        </div>
        <div class="card p-6">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-gray-600 text-sm">Brands</p>
              <p class="text-3xl font-bold text-purple-600" id="total-brands">15</p>
              <p class="text-sm text-gray-500 mt-1">Manufacturers</p>
            </div>
            <div class="bg-purple-100 p-3 rounded-full">
              <i data-feather="tag" class="w-6 h-6 text-purple-600"></i>
            </div>
          </div>
        </div>
      </div>

      <!-- Management Tabs -->
      <div class="card mb-6">
        <div class="border-b border-gray-200 overflow-x-auto">
          <nav class="flex space-x-8 px-4 sm:px-6 min-w-max" aria-label="Tabs">
            <button onclick="switchProductTab('products')" class="tab-button active py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap" id="products-tab">
              Products
            </button>
            <button onclick="switchProductTab('categories')" class="tab-button py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap" id="categories-tab">
              Categories
            </button>
            <button onclick="switchProductTab('brands')" class="tab-button py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap" id="brands-tab">
              Brands
            </button>
          </nav>
        </div>
        
        <!-- Products Tab Content -->
        <div id="products-content" class="tab-content p-4 sm:p-6">
          <div class="space-y-6">
            <!-- Search and Filter Bar -->
            <div class="flex flex-wrap items-center gap-2 sm:gap-3">
              <input type="text" id="products-search" placeholder="Search products..." class="flex-1 min-w-[140px] basis-[180px] max-w-xs px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
              <select id="products-category-filter" class="flex-1 min-w-[140px] basis-[160px] sm:flex-none sm:max-w-[220px] px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                <option value="">All Categories</option>
              </select>
              <select id="products-brand-filter" class="flex-1 min-w-[120px] basis-[140px] sm:flex-none sm:max-w-[180px] px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                <option value="">All Brands</option>
              </select>
              <button type="button" onclick="clearProductFilters()" class="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 inline-flex items-center shrink-0">
                <i data-feather="x" class="w-4 h-4 mr-1"></i>
                Clear
              </button>
              <div class="flex items-center gap-2 ml-auto shrink-0">
                <button onclick="downloadProductsPDF()" class="btn-secondary px-3 py-2 rounded-lg inline-flex items-center">
                  <i data-feather="download" class="w-4 h-4 mr-1"></i>
                  PDF
                </button>
              </div>
            </div>

            <!-- Products Table -->
            <div class="w-full max-w-full overflow-x-auto rounded-lg border border-gray-100">
              <table class="min-w-[880px] w-full bg-white">
                <thead class="bg-gray-50">
                  <tr>
                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Brand</th>
                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Model</th>
                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky right-0 bg-gray-50 z-10 shadow-[-6px_0_8px_rgba(0,0,0,0.04)]">Actions</th>
                  </tr>
                </thead>
                <tbody id="products-table-body" class="bg-white divide-y divide-gray-200">
                  <!-- Products will be populated here -->
                </tbody>
              </table>
            </div>
            <div id="products-pagination"></div>
          </div>
        </div>

        <!-- Categories Tab Content -->
        <div id="categories-content" class="tab-content p-6 hidden">
          <div class="space-y-6">
            <!-- Inner sub-tabs: Main / Sub -->
            <div class="border-b border-gray-200 mb-4">
              <nav class="flex space-x-6" aria-label="CategoryTabs">
                <button onclick="switchCategorySubTab('main')" id="cat-main-tab"
                  class="cat-sub-tab active py-3 px-1 border-b-2 border-blue-500 text-blue-600 font-medium text-sm">
                  Main Categories
                </button>
                <button onclick="switchCategorySubTab('sub')" id="cat-sub-tab"
                  class="cat-sub-tab py-3 px-1 border-b-2 border-transparent text-gray-500 font-medium text-sm">
                  Sub Categories
                </button>
              </nav>
            </div>

            <!-- Main Categories Table -->
            <div id="cat-main-content">
              <div class="flex justify-between items-center mb-4">
                <h3 class="text-lg font-semibold text-gray-900">Main Categories</h3>
                <div class="flex space-x-2">
                  <button onclick="downloadCategoriesPDF()" class="btn-secondary px-4 py-2 rounded-lg flex items-center">
                    <i data-feather="download" class="w-4 h-4 mr-2"></i>PDF
                  </button>
                  <button onclick="openAddMainCategoryModal()" class="btn-primary px-4 py-2 text-white rounded-lg flex items-center">
                    <i data-feather="plus" class="w-4 h-4 mr-2"></i>Add Main Category
                  </button>
                </div>
              </div>
              <div class="overflow-x-auto">
                <table class="min-w-full bg-white">
                  <thead class="bg-gray-50">
                    <tr>
                      <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                      <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                      <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Spec Fields</th>
                      <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sub Cats</th>
                      <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody id="main-categories-table-body" class="bg-white divide-y divide-gray-200">
                  </tbody>
                </table>
              </div>
              <div id="main-categories-pagination"></div>
            </div>

            <!-- Sub Categories Table -->
            <div id="cat-sub-content" class="hidden">
              <div class="flex justify-between items-center mb-4">
                <h3 class="text-lg font-semibold text-gray-900">Sub Categories</h3>
                <div class="flex space-x-2">
                  <button onclick="openAddSubCategoryModal()" class="btn-primary px-4 py-2 text-white rounded-lg flex items-center">
                    <i data-feather="plus" class="w-4 h-4 mr-2"></i>Add Sub Category
                  </button>
                </div>
              </div>
              <div class="overflow-x-auto">
                <table class="min-w-full bg-white">
                  <thead class="bg-gray-50">
                    <tr>
                      <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sub Category</th>
                      <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Main Category</th>
                      <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Products</th>
                      <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody id="categories-table-body" class="bg-white divide-y divide-gray-200">
                  </tbody>
                </table>
              </div>
              <div id="sub-categories-pagination"></div>
            </div>
          </div>
        </div>

        <!-- Brands Tab Content -->
        <div id="brands-content" class="tab-content p-6 hidden">
          <div class="space-y-6">
            <div class="flex justify-between items-center">
              <h3 class="text-lg font-semibold text-gray-900">Brands</h3>
              <div class="flex space-x-2">
                <button onclick="downloadBrandsPDF()" class="btn-secondary px-4 py-2 rounded-lg flex items-center">
                  <i data-feather="download" class="w-4 h-4 mr-2"></i>
                  PDF
                </button>
                <button onclick="openAddBrandModal()" class="btn-primary px-4 py-2 text-white rounded-lg flex items-center">
                  <i data-feather="plus" class="w-4 h-4 mr-2"></i>
                  Add Brand
                </button>
              </div>
            </div>
            
            <div class="overflow-x-auto">
              <table class="min-w-full bg-white">
                <thead class="bg-gray-50">
                  <tr>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Brand Name</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Products Count</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody id="brands-table-body" class="bg-white divide-y divide-gray-200">
                  <!-- Brands will be populated here -->
                </tbody>
              </table>
            </div>
            <div id="brands-pagination"></div>
          </div>
        </div>


      </div>
    </div>

    ${getCatalogQuickAddModalsHtml()}

    <!-- Add Main Category Modal -->
    <div id="add-main-category-modal" class="modal fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center hidden z-50">
      <div class="modal-content bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div class="flex justify-between items-center p-6 border-b">
          <h2 class="text-xl font-semibold">Add Main Category</h2>
          <button onclick="closeAddMainCategoryModal()" class="text-gray-400 hover:text-gray-600">
            <i data-feather="x" class="w-6 h-6"></i>
          </button>
        </div>
        <form id="add-main-category-form" class="p-6">
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-1">Category Name *</label>
            <input type="text" id="main-category-name" required class="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500" />
          </div>
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea id="main-category-description" rows="2" class="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500"></textarea>
          </div>
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select id="main-category-isactive" class="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500">
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </div>
          <!-- Spec Fields Builder -->
          <div class="mb-4">
            <div class="flex justify-between items-center mb-2">
              <label class="block text-sm font-medium text-gray-700">Product Specification Fields</label>
              <button type="button" onclick="addSpecFieldRow('main-spec-fields-container')" class="text-blue-600 hover:text-blue-800 text-sm flex items-center gap-1">
                <i data-feather="plus-circle" class="w-4 h-4"></i> Add Field
              </button>
            </div>
            <div id="main-spec-fields-container" class="space-y-3"></div>
            <p class="text-xs text-gray-400 mt-1">Define the specification fields products in this category should have (e.g. RAM, Color, Storage).</p>
          </div>
          <div class="flex justify-end space-x-3">
            <button type="button" onclick="closeAddMainCategoryModal()" class="btn-secondary px-4 py-2">Cancel</button>
            <button type="submit" class="btn-primary px-4 py-2 text-white">Add Category</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Edit Main Category Modal -->
    <div id="edit-main-category-modal" class="modal fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center hidden z-50">
      <div class="modal-content bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div class="flex justify-between items-center p-6 border-b">
          <h2 class="text-xl font-semibold">Edit Main Category</h2>
          <button onclick="closeEditMainCategoryModal()" class="text-gray-400 hover:text-gray-600">
            <i data-feather="x" class="w-6 h-6"></i>
          </button>
        </div>
        <form id="edit-main-category-form" class="p-6">
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-1">Category Name *</label>
            <input type="text" id="edit-main-category-name" required class="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500" />
          </div>
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea id="edit-main-category-description" rows="2" class="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500"></textarea>
          </div>
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select id="edit-main-category-isactive" class="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500">
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </div>
          <div class="mb-4">
            <div class="flex justify-between items-center mb-2">
              <label class="block text-sm font-medium text-gray-700">Product Specification Fields</label>
              <button type="button" onclick="addSpecFieldRow('edit-main-spec-fields-container')" class="text-blue-600 hover:text-blue-800 text-sm flex items-center gap-1">
                <i data-feather="plus-circle" class="w-4 h-4"></i> Add Field
              </button>
            </div>
            <div id="edit-main-spec-fields-container" class="space-y-3"></div>
          </div>
          <input type="hidden" id="edit-main-category-id" />
          <div class="flex justify-end space-x-3">
            <button type="button" onclick="closeEditMainCategoryModal()" class="btn-secondary px-4 py-2">Cancel</button>
            <button type="submit" class="btn-primary px-4 py-2 text-white">Update Category</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Edit Sub Category Modal -->
    <div id="edit-category-modal" class="modal fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center hidden z-50">
      <div class="modal-content bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] flex flex-col">
        <div class="flex justify-between items-center p-6 border-b flex-shrink-0">
          <h2 class="text-xl font-semibold">Edit Sub Category</h2>
          <button onclick="closeEditCategoryModal()" class="text-gray-400 hover:text-gray-600">
            <i data-feather="x" class="w-6 h-6"></i>
          </button>
        </div>
        <form id="edit-category-form" class="p-6 overflow-y-auto flex-1 min-h-0">
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-1">Main Category *</label>
            <select id="edit-parent-category" required onchange="handleEditSubCategoryParentChange()" class="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500">
              <option value="">Select Main Category</option>
            </select>
          </div>
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-1">Sub Category Name *</label>
            <input type="text" id="edit-category-name" required class="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500" />
          </div>
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea id="edit-category-description" rows="2" class="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500"></textarea>
          </div>
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select id="edit-category-isactive" class="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500">
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </div>
          <div class="mb-4">
            <div class="flex justify-between items-center mb-2">
              <label class="block text-sm font-medium text-gray-700">Sub Category Specification Fields</label>
              <button type="button" onclick="addSpecFieldRow('edit-sub-spec-fields-container')" class="text-blue-600 hover:text-blue-800 text-sm flex items-center gap-1">
                <i data-feather="plus-circle" class="w-4 h-4"></i> Add Field
              </button>
            </div>
            <div id="edit-sub-spec-fields-container" class="space-y-3"></div>
          </div>
          <input type="hidden" id="edit-category-id" />
          <div class="flex justify-end space-x-3 pt-2 border-t sticky bottom-0 bg-white pb-1">
            <button type="button" onclick="closeEditCategoryModal()" class="btn-secondary px-4 py-2">Cancel</button>
            <button type="submit" class="btn-primary px-4 py-2 text-white">Update Sub Category</button>
          </div>
        </form>
      </div>
    </div>
    <!-- Edit Brand Modal -->
    <div id="edit-brand-modal" class="modal fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center hidden z-50">
      <div class="modal-content bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div class="flex justify-between items-center p-6 border-b">
          <h2 class="text-xl font-semibold">Edit Brand</h2>
          <button onclick="closeEditBrandModal()" class="text-gray-400 hover:text-gray-600">
            <i data-feather="x" class="w-6 h-6"></i>
          </button>
        </div>
        <form id="edit-brand-form" class="p-6">
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-1">Brand Name *</label>
            <input type="text" id="edit-brand-name" required class="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500" />
          </div>
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select id="edit-brand-isactive" class="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500">
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </div>
          <input type="hidden" id="edit-brand-id" />
          <div class="flex justify-end space-x-3">
            <button type="button" onclick="closeEditBrandModal()" class="btn-secondary px-4 py-2">Cancel</button>
            <button type="submit" class="btn-primary px-4 py-2 text-white">Update Brand</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Edit Product Modal -->
    <div id="edit-product-modal" class="modal fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center hidden z-50">
      <div class="modal-content bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div class="flex justify-between items-center p-6 border-b">
          <h2 class="text-xl font-semibold">Edit Product</h2>
          <button onclick="closeEditProductModal()" class="text-gray-400 hover:text-gray-600">
            <i data-feather="x" class="w-6 h-6"></i>
          </button>
        </div>
        <form id="edit-product-form" class="p-6">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Product Name *</label>
              <input type="text" id="edit-product-name" required class="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          <div class="mb-6">
            <label class="block text-sm font-medium text-gray-700 mb-3">Product Classification *</label>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label class="block text-xs font-medium text-gray-500 mb-1">Category *</label>
                <select id="edit-product-subcategory" required onchange="handleEditSubcategoryChange()" class="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500">
                  <option value="">Select Category</option>
                </select>
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-500 mb-1">Brand</label>
                <select id="edit-product-brand" class="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500">
                  <option value="">Select Brand</option>
                </select>
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-500 mb-1">Model Number</label>
                <input type="text" id="edit-product-model" class="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500" placeholder="Optional" />
              </div>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                <label class="block text-xs font-medium text-gray-500 mb-1">Warranty (optional)</label>
                <div class="flex gap-2">
                  <input type="number" id="edit-product-warranty-value" min="1" class="w-1/2 border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500" placeholder="e.g. 12" />
                  <select id="edit-product-warranty-unit" class="w-1/2 border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500">
                    <option value="">Unit</option>
                    <option value="weeks">Weeks</option>
                    <option value="months">Months</option>
                    <option value="years">Years</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
          <!-- Specs from main category -->
          <div id="edit-category-specifications" class="mb-4 hidden">
            <label class="block text-sm font-medium text-gray-700 mb-3">Product Specifications <span class="text-xs text-gray-400">(from category template)</span></label>
            <div id="edit-specifications-container" class="grid grid-cols-2 md:grid-cols-3 gap-4"></div>
          </div>
          <!-- Extra custom spec fields -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea id="edit-product-description" rows="3" class="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500"></textarea>
          </div>
          <input type="hidden" id="edit-product-id" />
          <div class="flex justify-end space-x-3 pt-6">
            <button type="button" onclick="closeEditProductModal()" class="btn-secondary px-4 py-2">Cancel</button>
            <button type="submit" class="btn-primary px-4 py-2 text-white">Update Product</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Product Variants Modal -->
    <div id="product-variants-modal" class="modal fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center hidden z-50">
      <div class="modal-content bg-white rounded-lg shadow-xl max-w-5xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div class="flex justify-between items-center p-6 border-b">
          <div>
            <h2 class="text-xl font-semibold">Manage Variants</h2>
            <p class="text-sm text-gray-500 mt-1" id="variant-modal-product-name">Product</p>
          </div>
          <button onclick="closeProductVariantsModal()" class="text-gray-400 hover:text-gray-600">
            <i data-feather="x" class="w-6 h-6"></i>
          </button>
        </div>

        <div class="p-6 border-b bg-gray-50">
          <form id="add-variant-form" class="space-y-4">
            <input type="hidden" id="variant-product-id" />
            <input type="hidden" id="variant-edit-id" />
            <div>
              <h3 class="text-sm font-semibold text-gray-700 mb-2">Variant Specifications</h3>
              <div id="variant-spec-fields" class="grid grid-cols-1 md:grid-cols-3 gap-3"></div>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label class="block text-xs font-medium text-gray-600 mb-1">Barcode</label>
                <input type="text" id="variant-barcode" class="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500" placeholder="Leave blank to auto-generate" />
                <p class="text-xs text-gray-500 mt-1">Optional — leave empty for an auto barcode</p>
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-600 mb-1">Minimum Stock Level</label>
                <input type="number" id="variant-min-stock" min="0" value="10" class="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500" />
              </div>
              <div class="flex items-end gap-2">
                <button id="variant-submit-btn" type="submit" class="btn-primary px-4 py-2 text-white w-full">Add Variant</button>
                <button id="variant-cancel-edit-btn" type="button" onclick="resetVariantFormMode()" class="btn-secondary px-4 py-2 w-full hidden">Cancel Edit</button>
              </div>
            </div>
          </form>
        </div>

        <div class="p-6">
          <div class="overflow-x-auto">
            <table class="min-w-full bg-white">
              <thead class="bg-gray-50">
                <tr>
                  <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Variant</th>
                  <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Barcode</th>
                  <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Min Stock</th>
                  <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Current Stock</th>
                  <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody id="product-variants-table-body" class="divide-y divide-gray-200">
                <tr><td colspan="5" class="px-4 py-6 text-center text-gray-400">Select a product to view variants</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  `;
}

async function initializeProductsPage() {
  try {
    // Check if user is authenticated
    const token = getAuthToken();
    if (!token) {
      showErrorMessage("Please login to access the products page.");
      return;
    }

    // Load main categories first (needed for sub-category parent name resolution)
    await loadMainCategoriesFromAPI();

    // Load all other data in parallel
    await Promise.all([
      loadProductStatsFromAPI(),
      loadProductsFromAPI(),
      loadCategoriesFromAPI(),
      loadBrandsFromAPI(),
    ]);

    // Initialize the page display
    loadProductsData();
    loadCategoriesData();
    loadMainCategoriesData();
    loadBrandsData();
    updateStatsDisplay();
    populateFilterOptions();

    setTimeout(() => {
      if (typeof feather !== "undefined") {
        feather.replace();
      }
    }, 100);

    // Add event listeners
    const searchInput = document.getElementById("products-search");
    if (searchInput) {
      searchInput.addEventListener("input", filterProducts);
    }

    const categoryFilter = document.getElementById("products-category-filter");
    if (categoryFilter) {
      categoryFilter.addEventListener("change", filterProducts);
    }

    const brandFilter = document.getElementById("products-brand-filter");
    if (brandFilter) {
      brandFilter.addEventListener("change", filterProducts);
    }

    bindCatalogQuickAddForms();

    const editProductForm = document.getElementById("edit-product-form");
    if (editProductForm) {
      editProductForm.addEventListener("submit", handleEditProduct);
    }

    const editCategoryForm = document.getElementById("edit-category-form");
    if (editCategoryForm) {
      editCategoryForm.addEventListener("submit", handleEditCategory);
    }

    const editBrandForm = document.getElementById("edit-brand-form");
    if (editBrandForm) {
      editBrandForm.addEventListener("submit", handleEditBrand);
    }

    const addMainCategoryForm = document.getElementById(
      "add-main-category-form"
    );
    if (addMainCategoryForm) {
      addMainCategoryForm.addEventListener("submit", handleAddMainCategory);
    }

    const editMainCategoryForm = document.getElementById(
      "edit-main-category-form"
    );
    if (editMainCategoryForm) {
      editMainCategoryForm.addEventListener("submit", handleEditMainCategory);
    }

    const addVariantForm = document.getElementById("add-variant-form");
    if (addVariantForm) {
      addVariantForm.addEventListener("submit", handleAddVariant);
    }
  } catch (error) {
    console.error("Error initializing products page:", error);
    if (
      error.message.includes("Authentication") ||
      error.message.includes("login")
    ) {
      showErrorMessage(
        "Authentication required. Please login to access products."
      );
    } else {
      showErrorMessage("Failed to load products data: " + error.message);
    }
  }
}

// API Loading Functions
async function loadProductStatsFromAPI() {
  try {
    const response = await makeAuthenticatedRequest(
      `${window.API_BASE_URL}/products/product-stats/count`
    );
    if (response.success) {
      productStats = response.data;
    }
  } catch (error) {
    console.error("Error loading product stats:", error);
    productStats = { totalProducts: 0, totalCategories: 0, totalBrands: 0 };
  }
}

async function loadProductsFromAPI() {
  try {
    const response = await makeAuthenticatedRequest(
      `${window.API_BASE_URL}/products`
    );
    if (response.success) {
      allProducts = response.data.map((product) => ({
        id: product.id,
        name: product.productName,
        // SKU removed; use id where SKU was previously shown
        category: product.category?.name || "N/A",
        subCategory: product.category?.parent?.name || "",
        brand: product.brand?.name || "N/A",
        model: product.modelNumber || "",
        warrantyValue: product.warrantyValue ?? null,
        warrantyUnit: product.warrantyUnit || null,
        status: product.isActive ? "Active" : "Inactive",
        description: product.description,
        specifications: product.specifications,
        categoryId: product.categoryId,
        categoryParentId: product.category?.parent?.id || null,
        brandId: product.brandId,
        variantCount: product._count?.productVariants || 0,
        variants: Array.isArray(product.productVariants)
          ? product.productVariants.map((v) => ({
              id: v.id,
              variantName: v.variantName || "",
              barcode: v.barcode || "",
              isActive: v.isActive !== false,
              totalStock: v.totalStock ?? 0,
              latestSellingPrice:
                v.latestSellingPrice != null ? Number(v.latestSellingPrice) : null,
            }))
          : [],
      }));
    }
  } catch (error) {
    console.error("Error loading products:", error);
    allProducts = [];
  }
}

async function loadCategoriesFromAPI() {
  try {
    const response = await makeAuthenticatedRequest(
      `${window.API_BASE_URL}/category`
    );
    if (response.success) {
      allCategories = response.data.map((category) => {
        const isParentCategory = category.parentId === null;
        return {
          id: category.id,
          name: category.name,
          description: category.description || "",
          productCount: category._count?.products || 0,
          status: category.isActive ? "Active" : "Inactive",
          isActive: !!category.isActive,
          parentId: category.parentId,
          isParent: isParentCategory,
          parentName: category.parent?.name || null,
          specFields: category.specFields || null,
          categoryType: isParentCategory ? "Parent Category" : "Sub Category",
        };
      });
    }
  } catch (error) {
    console.error("Error loading categories:", error);
    allCategories = [];
  }
}

async function loadBrandsFromAPI() {
  try {
    const response = await makeAuthenticatedRequest(
      `${window.API_BASE_URL}/brands`
    );
    if (response.success) {
      allBrands = response.data.map((brand) => ({
        id: brand.id,
        name: brand.name,
        // country removed
        productCount: brand._count?.products || 0,
        status: brand.isActive ? "Active" : "Inactive",
        isActive: !!brand.isActive,
      }));
    }
  } catch (error) {
    console.error("Error loading brands:", error);
    allBrands = [];
  }
}

async function loadMainCategoriesFromAPI() {
  try {
    const response = await makeAuthenticatedRequest(
      `${window.API_BASE_URL}/category/main`
    );
    if (response.success) {
      allMainCategories = response.data;
    }
  } catch (error) {
    console.error("Error loading main categories:", error);
    allMainCategories = [];
  }
}

// Update stats display
function updateStatsDisplay() {
  const totalProductsEl = document.getElementById("total-products");
  const totalCategoriesEl = document.getElementById("total-categories");
  const totalBrandsEl = document.getElementById("total-brands");

  if (totalProductsEl) totalProductsEl.textContent = allProducts.length;
  if (totalCategoriesEl) totalCategoriesEl.textContent = allCategories.length;
  if (totalBrandsEl) totalBrandsEl.textContent = allBrands.length;
}

// Populate filter options with real data
function populateFilterOptions() {
  const categoryFilter = document.getElementById("products-category-filter");
  const brandFilter = document.getElementById("products-brand-filter");

  if (categoryFilter) {
    // Mirror Add Product: sub-category groups first, main categories at bottom
    categoryFilter.innerHTML = '<option value="">All Categories</option>';

    (allMainCategories || [])
      .filter((mc) => mc.isActive !== false)
      .forEach((mc) => {
        const subs = (Array.isArray(mc.children) ? mc.children : []).filter(
          (subCat) => subCat.isActive !== false
        );
        if (subs.length === 0) return;

        const group = document.createElement("optgroup");
        group.label = `${mc.name} - Sub Categories`;

        subs.forEach((subCat) => {
          const option = document.createElement("option");
          option.value = subCat.id;
          option.textContent = subCat.name;
          group.appendChild(option);
        });

        categoryFilter.appendChild(group);
      });

    (allMainCategories || [])
      .filter((mc) => mc.isActive !== false)
      .forEach((mc) => {
        const mainOption = document.createElement("option");
        mainOption.value = mc.id;
        mainOption.textContent = `${mc.name} (Main Category)`;
        categoryFilter.appendChild(mainOption);
      });
  }

  if (brandFilter) {
    brandFilter.innerHTML = '<option value="">All Brands</option>';
    (allBrands || []).forEach((brand) => {
      const option = document.createElement("option");
      option.value = brand.id;
      option.textContent = brand.name;
      brandFilter.appendChild(option);
    });
  }
}

function productMatchesCategoryFilter(product, categoryFilterId) {
  if (!categoryFilterId) return true;

  const selectedId = Number(categoryFilterId);
  if (Number.isNaN(selectedId)) return true;

  const productCategoryId = Number(product.categoryId);
  if (productCategoryId === selectedId) return true;

  // Selected main category: include products assigned to it or any of its children
  const mainCategory = (allMainCategories || []).find(
    (mc) => Number(mc.id) === selectedId
  );
  if (mainCategory) {
    const childIds = (Array.isArray(mainCategory.children)
      ? mainCategory.children
      : []
    ).map((c) => Number(c.id));
    return childIds.includes(productCategoryId);
  }

  return false;
}

function clearProductFilters() {
  const searchInput = document.getElementById("products-search");
  const categoryFilter = document.getElementById("products-category-filter");
  const brandFilter = document.getElementById("products-brand-filter");

  if (searchInput) searchInput.value = "";
  if (categoryFilter) categoryFilter.value = "";
  if (brandFilter) brandFilter.value = "";

  loadProductsData();

  if (typeof feather !== "undefined") {
    setTimeout(() => feather.replace(), 50);
  }
}

// Error / success use shared body toasts (never insert into hidden .content-fade-in)
function showBodyToastFallback(message, type = "success") {
  const existing = document.querySelectorAll(".notification");
  existing.forEach((n) => n.remove());

  const notification = document.createElement("div");
  const colors = {
    success: "bg-green-500 text-white",
    error: "bg-red-500 text-white",
    warning: "bg-yellow-500 text-white",
    info: "bg-blue-500 text-white",
  };
  notification.className = `notification fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg transition-all duration-300 transform translate-x-full ${
    colors[type] || colors.success
  }`;
  notification.textContent = message;
  document.body.appendChild(notification);

  setTimeout(() => notification.classList.remove("translate-x-full"), 100);
  setTimeout(() => {
    notification.classList.add("translate-x-full");
    setTimeout(() => {
      if (notification.parentNode) notification.parentNode.removeChild(notification);
    }, 300);
  }, 3000);
}

function showErrorMessage(message) {
  if (typeof showNotification === "function") {
    showNotification(message, "error");
    return;
  }
  showBodyToastFallback(message, "error");
}

function showSuccessMessage(message) {
  if (typeof showNotification === "function") {
    showNotification(message, "success");
    return;
  }
  showBodyToastFallback(message, "success");
}
function switchProductTab(tab) {
  document.querySelectorAll(".tab-content").forEach((content) => {
    content.classList.add("hidden");
  });

  document.querySelectorAll(".tab-button").forEach((button) => {
    button.classList.remove("active", "border-blue-500", "text-blue-600");
    button.classList.add("border-transparent", "text-gray-500");
  });

  const selectedContent = document.getElementById(`${tab}-content`);
  if (selectedContent) {
    selectedContent.classList.remove("hidden");
  }

  const selectedTab = document.getElementById(`${tab}-tab`);
  if (selectedTab) {
    selectedTab.classList.add("active", "border-blue-500", "text-blue-600");
    selectedTab.classList.remove("border-transparent", "text-gray-500");
  }

  // Reinitialize feather icons for the new tab content
  setTimeout(() => {
    if (typeof feather !== "undefined") {
      feather.replace();
    }
  }, 50);
}

function renderProductTableRow(product) {
  return `
    <tr class="group">
      <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-500">${
        product.brand || "N/A"
      }</td>
      <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-500">${
        product.model || "—"
      }</td>
      <td class="px-4 py-3 whitespace-nowrap">
        <div class="text-sm font-medium text-gray-900">${
          product.name || "N/A"
        }</div>
        <div class="text-xs text-gray-500">Variants: ${
          product.variantCount || 0
        }</div>
      </td>
      <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-500">${
        product.category || "N/A"
      }</td>
      <td class="px-4 py-3 whitespace-nowrap">
        <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
          product.status === "Active"
            ? "bg-green-100 text-green-800"
            : "bg-red-100 text-red-800"
        }">
          ${product.status}
        </span>
      </td>
      <td class="px-4 py-3 whitespace-nowrap text-sm font-medium sticky right-0 bg-white group-hover:bg-gray-50 z-10 shadow-[-6px_0_8px_rgba(0,0,0,0.04)]">
        <button onclick="openProductVariantsModal(${
          product.id
        })" class="text-indigo-600 hover:text-indigo-900 mr-2 p-1 rounded" title="Manage Variants">
          <i data-feather="layers" class="w-4 h-4"></i>
        </button>
        <button onclick="editProduct(${
          product.id
        })" class="text-blue-600 hover:text-blue-900 mr-2 p-1 rounded" title="Edit Product">
          <i data-feather="edit" class="w-4 h-4"></i>
        </button>
        <button onclick="deleteProduct(${
          product.id
        })" class="text-red-600 hover:text-red-900 p-1 rounded" title="Delete Product">
          <i data-feather="trash-2" class="w-4 h-4"></i>
        </button>
      </td>
    </tr>
  `;
}

function loadProductsData() {
  productsListPage = 1;
  const filtered = getFilteredProducts() || [];
  const tableBody = document.getElementById("products-table-body");
  const pager = document.getElementById("products-pagination");
  if (!tableBody) return;

  if (filtered.length === 0) {
    const searchTerm =
      document.getElementById("products-search")?.value?.trim() || "";
    const categoryFilter =
      document.getElementById("products-category-filter")?.value || "";
    const brandFilter =
      document.getElementById("products-brand-filter")?.value || "";
    const hasFilters = !!(searchTerm || categoryFilter || brandFilter);
    tableBody.innerHTML = `<tr><td colspan="6" class="px-6 py-4 text-center text-gray-500">${
      hasFilters
        ? "No products match your filters"
        : "No products found"
    }</td></tr>`;
    if (pager) pager.innerHTML = "";
    return;
  }

  renderProductsPaged(filtered);
}

function renderProductsPaged(list) {
  const tableBody = document.getElementById("products-table-body");
  const pager = document.getElementById("products-pagination");
  if (!tableBody) return;

  const items = list || [];
  if (items.length === 0) {
    tableBody.innerHTML =
      '<tr><td colspan="6" class="px-6 py-4 text-center text-gray-500">No products found</td></tr>';
    if (pager) pager.innerHTML = "";
    return;
  }

  const { page, total, rows } = sliceForPage(items, productsListPage);
  productsListPage = page;
  tableBody.innerHTML = rows.map(renderProductTableRow).join("");
  if (pager) {
    pager.innerHTML = buildListPaginationFooter(
      page,
      total,
      "changeProductsPage"
    );
  }

  setTimeout(() => {
    if (typeof feather !== "undefined") feather.replace();
  }, 50);
}

function changeProductsPage(page) {
  productsListPage = page;
  renderProductsPaged(getFilteredProducts() || []);
}

function loadCategoriesData() {
  subCategoriesPage = 1;
  renderSubCategoriesPaged();
}

function renderSubCategoriesPaged() {
  const tableBody = document.getElementById("categories-table-body");
  const pager = document.getElementById("sub-categories-pagination");
  if (!tableBody) return;

  const subCategories = (allCategories || []).filter(
    (c) => c.parentId !== null && c.parentId !== undefined
  );

  if (subCategories.length === 0) {
    tableBody.innerHTML =
      '<tr><td colspan="5" class="px-6 py-4 text-center text-gray-500">No sub categories found</td></tr>';
    if (pager) pager.innerHTML = "";
    return;
  }

  const { page, total, rows } = sliceForPage(subCategories, subCategoriesPage);
  subCategoriesPage = page;

  tableBody.innerHTML = rows
    .map(
      (category) => `
    <tr>
      <td class="px-6 py-4 whitespace-nowrap">
        <div class="text-sm font-medium text-gray-900">${
          category.name || "N/A"
        }</div>
      </td>
      <td class="px-6 py-4 text-sm text-gray-500">${
        category.parentName || "N/A"
      }</td>
      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${
        category.productCount || 0
      }</td>
      <td class="px-6 py-4 whitespace-nowrap">
        <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
          category.status === "Active"
            ? "bg-green-100 text-green-800"
            : "bg-red-100 text-red-800"
        }">
          ${category.status}
        </span>
      </td>
      <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
        <button onclick="editCategory(${
          category.id
        })" class="text-blue-600 hover:text-blue-900 mr-3 p-1 rounded" title="Edit Sub Category">
          <i data-feather="edit" class="w-4 h-4"></i>
        </button>
        <button onclick="deleteCategory(${
          category.id
        })" class="text-red-600 hover:text-red-900 p-1 rounded" title="Delete Sub Category">
          <i data-feather="trash-2" class="w-4 h-4"></i>
        </button>
      </td>
    </tr>
  `
    )
    .join("");

  if (pager) {
    pager.innerHTML = buildListPaginationFooter(
      page,
      total,
      "changeSubCategoriesPage"
    );
  }

  setTimeout(() => {
    if (typeof feather !== "undefined") feather.replace();
  }, 50);
}

function changeSubCategoriesPage(page) {
  subCategoriesPage = page;
  renderSubCategoriesPaged();
}

function switchCategorySubTab(tab) {
  // Hide both sub-tab contents
  const mainContent = document.getElementById("cat-main-content");
  const subContent = document.getElementById("cat-sub-content");
  if (mainContent) mainContent.classList.add("hidden");
  if (subContent) subContent.classList.add("hidden");

  // Deactivate both sub-tab buttons
  ["cat-main-tab", "cat-sub-tab"].forEach((btnId) => {
    const btn = document.getElementById(btnId);
    if (btn) {
      btn.classList.remove("border-blue-500", "text-blue-600");
      btn.classList.add("border-transparent", "text-gray-500");
    }
  });

  // Show the selected content
  const activeContent = document.getElementById(`cat-${tab}-content`);
  if (activeContent) activeContent.classList.remove("hidden");

  const activeBtn = document.getElementById(`cat-${tab}-tab`);
  if (activeBtn) {
    activeBtn.classList.add("border-blue-500", "text-blue-600");
    activeBtn.classList.remove("border-transparent", "text-gray-500");
  }

  setTimeout(() => {
    if (typeof feather !== "undefined") feather.replace();
  }, 50);
}

function loadMainCategoriesData() {
  mainCategoriesPage = 1;
  renderMainCategoriesPaged();
}

function renderMainCategoriesPaged() {
  const tableBody = document.getElementById("main-categories-table-body");
  const pager = document.getElementById("main-categories-pagination");
  if (!tableBody) return;

  if (!allMainCategories || allMainCategories.length === 0) {
    tableBody.innerHTML =
      '<tr><td colspan="6" class="px-6 py-4 text-center text-gray-500">No main categories found</td></tr>';
    if (pager) pager.innerHTML = "";
    return;
  }

  const { page, total, rows } = sliceForPage(
    allMainCategories,
    mainCategoriesPage
  );
  mainCategoriesPage = page;

  tableBody.innerHTML = rows
    .map((mc) => {
      const specCount = Array.isArray(mc.specFields) ? mc.specFields.length : 0;
      const subCount = mc._count?.children || 0;
      const isActive = mc.isActive !== false;
      return `
    <tr>
      <td class="px-6 py-4 whitespace-nowrap">
        <div class="text-sm font-medium text-gray-900">${mc.name || "N/A"}</div>
      </td>
      <td class="px-6 py-4 text-sm text-gray-500">${mc.description || "-"}</td>
      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${specCount}</td>
      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${subCount}</td>
      <td class="px-6 py-4 whitespace-nowrap">
        <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
          isActive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
        }">
          ${isActive ? "Active" : "Inactive"}
        </span>
      </td>
      <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
        <button onclick="editMainCategory(${
          mc.id
        })" class="text-blue-600 hover:text-blue-900 mr-3 p-1 rounded" title="Edit Main Category">
          <i data-feather="edit" class="w-4 h-4"></i>
        </button>
      </td>
    </tr>
  `;
    })
    .join("");

  if (pager) {
    pager.innerHTML = buildListPaginationFooter(
      page,
      total,
      "changeMainCategoriesPage"
    );
  }

  setTimeout(() => {
    if (typeof feather !== "undefined") feather.replace();
  }, 50);
}

function changeMainCategoriesPage(page) {
  mainCategoriesPage = page;
  renderMainCategoriesPaged();
}

function loadBrandsData() {
  brandsListPage = 1;
  renderBrandsPaged();
}

function renderBrandsPaged() {
  const tableBody = document.getElementById("brands-table-body");
  const pager = document.getElementById("brands-pagination");
  if (!tableBody) return;

  if (!allBrands || allBrands.length === 0) {
    tableBody.innerHTML =
      '<tr><td colspan="4" class="px-6 py-4 text-center text-gray-500">No brands found</td></tr>';
    if (pager) pager.innerHTML = "";
    return;
  }

  const { page, total, rows } = sliceForPage(allBrands, brandsListPage);
  brandsListPage = page;

  tableBody.innerHTML = rows
    .map(
      (brand) => `
    <tr>
      <td class="px-6 py-4 whitespace-nowrap">
        <div class="text-sm font-medium text-gray-900">${
          brand.name || "N/A"
        }</div>
      </td>
      
      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${
        brand.productCount || 0
      }</td>
      <td class="px-6 py-4 whitespace-nowrap">
        <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
          brand.status === "Active"
            ? "bg-green-100 text-green-800"
            : "bg-red-100 text-red-800"
        }">
          ${brand.status}
        </span>
      </td>
      <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
        <button onclick="editBrand(${
          brand.id
        })" class="text-blue-600 hover:text-blue-900 mr-3 p-1 rounded" title="Edit Brand">
          <i data-feather="edit" class="w-4 h-4"></i>
        </button>
        <button onclick="deleteBrand(${
          brand.id
        })" class="text-red-600 hover:text-red-900 p-1 rounded" title="Delete Brand">
          <i data-feather="trash-2" class="w-4 h-4"></i>
        </button>
      </td>
    </tr>
  `
    )
    .join("");

  if (pager) {
    pager.innerHTML = buildListPaginationFooter(
      page,
      total,
      "changeBrandsPage"
    );
  }

  setTimeout(() => {
    if (typeof feather !== "undefined") feather.replace();
  }, 50);
}

function changeBrandsPage(page) {
  brandsListPage = page;
  renderBrandsPaged();
}

function filterProducts() {
  loadProductsData();
}

async function openAddProductModal() {
  await populateAddProductModal();
  const modal = document.getElementById("add-product-modal");
  if (modal) modal.classList.remove("hidden");
  setTimeout(() => {
    if (typeof feather !== "undefined") feather.replace();
  }, 50);
}

// populateAddProductModal is defined later (async) and will be used to populate modal

// Handle add product form submission
let isAddProductSubmitting = false;

async function handleAddProduct(event) {
  event.preventDefault();

  if (isAddProductSubmitting) return;

  const submitButton = event.target?.querySelector('button[type="submit"]');
  isAddProductSubmitting = true;
  if (submitButton) {
    submitButton.disabled = true;
    submitButton.classList.add("opacity-60", "cursor-not-allowed");
  }

  const warrantyFields = collectWarrantyFields(
    "product-warranty-value",
    "product-warranty-unit"
  );
  if (warrantyFields === null) {
    isAddProductSubmitting = false;
    if (submitButton) {
      submitButton.disabled = false;
      submitButton.classList.remove("opacity-60", "cursor-not-allowed");
    }
    return;
  }

  const formData = {
    productName: document.getElementById("product-name").value.trim(),
    description:
      document.getElementById("product-description")?.value.trim() || "",
    // categoryId can be selected main category or sub-category
    categoryId: parseInt(document.getElementById("product-subcategory").value),
    brandId: document.getElementById("product-brand").value
      ? parseInt(document.getElementById("product-brand").value)
      : null,
    modelNumber: document.getElementById("product-model").value.trim() || null,
    warrantyValue: warrantyFields.warrantyValue,
    warrantyUnit: warrantyFields.warrantyUnit,
    specifications: collectSpecifications() || null,
  };

  // Validation
  if (!formData.productName) {
    showErrorMessage("Product name is required");
    isAddProductSubmitting = false;
    if (submitButton) {
      submitButton.disabled = false;
      submitButton.classList.remove("opacity-60", "cursor-not-allowed");
    }
    return;
  }
  if (!formData.categoryId) {
    showErrorMessage("Category is required");
    isAddProductSubmitting = false;
    if (submitButton) {
      submitButton.disabled = false;
      submitButton.classList.remove("opacity-60", "cursor-not-allowed");
    }
    return;
  }

  try {
    const response = await makeAuthenticatedRequest(
      `${window.API_BASE_URL}/products`,
      {
        method: "POST",
        body: JSON.stringify(formData),
      }
    );

    if (response.success) {
      showSuccessMessage("Product added successfully");
      closeAddProductModal();
      await loadProductsFromAPI();
      loadProductsData();
      updateStatsDisplay();
    }
  } catch (error) {
    console.error("Error adding product:", error);
    showErrorMessage("Failed to add product: " + error.message);
  } finally {
    isAddProductSubmitting = false;
    if (submitButton) {
      submitButton.disabled = false;
      submitButton.classList.remove("opacity-60", "cursor-not-allowed");
    }
  }
}

// Collect specifications from the add product form
function collectSpecifications() {
  // Product-level specifications are disabled; use variant-level specifications.
  return null;
}

function collectWarrantyFields(valueInputId, unitSelectId) {
  const rawValue = document.getElementById(valueInputId)?.value?.trim() || "";
  const unit = document.getElementById(unitSelectId)?.value || "";

  if (!rawValue && !unit) {
    return { warrantyValue: null, warrantyUnit: null };
  }

  if (!rawValue || !unit) {
    showErrorMessage(
      "Please fill both warranty number and unit, or leave both empty."
    );
    return null;
  }

  const warrantyValue = parseInt(rawValue, 10);
  if (Number.isNaN(warrantyValue) || warrantyValue < 1) {
    showErrorMessage("Warranty value must be a positive number.");
    return null;
  }

  return { warrantyValue, warrantyUnit: unit };
}

function closeAddProductModal() {
  const modal = document.getElementById("add-product-modal");
  if (modal) modal.classList.add("hidden");
  const form = document.getElementById("add-product-form");
  if (form) form.reset();
}

// ─── Main Category Modal Handlers ────────────────────────────────────────────

function openAddMainCategoryModal() {
  const form = document.getElementById("add-main-category-form");
  if (form) form.reset();
  const container = document.getElementById("main-spec-fields-container");
  if (container) container.innerHTML = "";
  document.getElementById("add-main-category-modal").classList.remove("hidden");
  const statusEl = document.getElementById("main-category-isactive");
  if (statusEl) statusEl.value = "true";
}

function closeAddMainCategoryModal() {
  document.getElementById("add-main-category-modal").classList.add("hidden");
  const form = document.getElementById("add-main-category-form");
  if (form) form.reset();
  const container = document.getElementById("main-spec-fields-container");
  if (container) container.innerHTML = "";
}

async function handleAddMainCategory(event) {
  event.preventDefault();

  const name = document.getElementById("main-category-name")?.value.trim();
  const description =
    document.getElementById("main-category-description")?.value.trim() || "";
  const isActive =
    document.getElementById("main-category-isactive")?.value === "true";

  if (!name) {
    showErrorMessage("Main category name is required");
    return;
  }

  // Collect spec fields from builder
  const specFields = collectSpecFieldRows("main-spec-fields-container");
  if (specFields === null) return; // Validation error shown inside collectSpecFieldRows

  // Prevent duplicate
  const exists = allMainCategories.some(
    (mc) => (mc.name || "").trim().toLowerCase() === name.toLowerCase()
  );
  if (exists) {
    showErrorMessage("Main category name already exists");
    return;
  }

  const submitBtn = document.querySelector(
    '#add-main-category-form button[type="submit"]'
  );
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.classList.add("opacity-50", "cursor-not-allowed");
  }

  try {
    const payload = {
      name,
      description,
      isActive,
      parentId: null,
      specFields: specFields.length > 0 ? specFields : null,
    };

    const response = await makeAuthenticatedRequest(
      `${window.API_BASE_URL}/category`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    );

    if (response.success) {
      showSuccessMessage("Main category added successfully");
      closeAddMainCategoryModal();
      await loadMainCategoriesFromAPI();
      loadMainCategoriesData();
      updateStatsDisplay();
      populateFilterOptions();
    } else {
      showErrorMessage(response.message || "Failed to add main category");
    }
  } catch (error) {
    console.error("Error adding main category:", error);
    showErrorMessage(
      "Failed to add main category: " + (error.message || error)
    );
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.classList.remove("opacity-50", "cursor-not-allowed");
    }
  }
}

function editMainCategory(id) {
  const mc = (allMainCategories || []).find((m) => m.id === id);
  if (!mc) {
    showErrorMessage("Main category not found");
    return;
  }

  document.getElementById("edit-main-category-id").value = mc.id;
  document.getElementById("edit-main-category-name").value = mc.name || "";
  document.getElementById("edit-main-category-description").value =
    mc.description || "";
  const statusEl = document.getElementById("edit-main-category-isactive");
  if (statusEl) statusEl.value = mc.isActive !== false ? "true" : "false";

  // Render existing spec fields in the builder
  const container = document.getElementById("edit-main-spec-fields-container");
  if (container) {
    container.innerHTML = "";
    if (Array.isArray(mc.specFields)) {
      mc.specFields.forEach((field) =>
        addSpecFieldRow("edit-main-spec-fields-container", field)
      );
    }
  }

  document
    .getElementById("edit-main-category-modal")
    .classList.remove("hidden");
  setTimeout(() => {
    if (typeof feather !== "undefined") feather.replace();
  }, 50);
}

function closeEditMainCategoryModal() {
  document.getElementById("edit-main-category-modal").classList.add("hidden");
  const container = document.getElementById("edit-main-spec-fields-container");
  if (container) container.innerHTML = "";
}

async function handleEditMainCategory(event) {
  event.preventDefault();

  const id = parseInt(document.getElementById("edit-main-category-id").value);
  const name = document.getElementById("edit-main-category-name")?.value.trim();
  const description =
    document.getElementById("edit-main-category-description")?.value.trim() ||
    "";
  const isActive =
    document.getElementById("edit-main-category-isactive")?.value === "true";

  if (!name) {
    showErrorMessage("Main category name is required");
    return;
  }

  // Check for duplicate names (ignore self)
  const nameExists = allMainCategories.some(
    (mc) =>
      mc.id !== id &&
      (mc.name || "").trim().toLowerCase() === name.toLowerCase()
  );
  if (nameExists) {
    showErrorMessage("Main category name already exists");
    return;
  }

  const specFields = collectSpecFieldRows("edit-main-spec-fields-container");
  if (specFields === null) return;

  const submitBtn = document.querySelector(
    '#edit-main-category-form button[type="submit"]'
  );
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.classList.add("opacity-50", "cursor-not-allowed");
  }

  try {
    const payload = {
      name,
      description,
      isActive,
      specFields: specFields.length > 0 ? specFields : null,
    };

    const response = await makeAuthenticatedRequest(
      `${window.API_BASE_URL}/category/${id}`,
      {
        method: "PUT",
        body: JSON.stringify(payload),
      }
    );

    if (response.success) {
      showSuccessMessage("Main category updated successfully");
      closeEditMainCategoryModal();
      await loadMainCategoriesFromAPI();
      loadMainCategoriesData();
      // Reload sub-categories too (in case name changed)
      await loadCategoriesFromAPI();
      loadCategoriesData();
      await loadProductsFromAPI();
      loadProductsData();
      populateFilterOptions();
    } else {
      showErrorMessage(response.message || "Failed to update main category");
    }
  } catch (error) {
    console.error("Error updating main category:", error);
    showErrorMessage(
      "Failed to update main category: " + (error.message || error)
    );
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.classList.remove("opacity-50", "cursor-not-allowed");
    }
  }
}

// ─── Sub Category Modal Handlers ─────────────────────────────────────────────

// Alias: openAddSubCategoryModal opens the add sub-category modal
function openAddSubCategoryModal() {
  openAddCategoryModal();
}

async function openAddCategoryModal() {
  try {
    if (!allMainCategories || allMainCategories.length === 0) {
      await loadMainCategoriesFromAPI();
    }
  } catch (err) {
    console.error("Error loading main categories before opening modal:", err);
  }

  const addForm = document.getElementById("add-category-form");
  if (addForm) addForm.reset();

  const parentSelect = document.getElementById("parent-category");
  if (parentSelect) {
    parentSelect.innerHTML = '<option value="">Select Main Category</option>';
    (allMainCategories || []).forEach((mc) => {
      const option = document.createElement("option");
      option.value = mc.id;
      option.textContent = mc.name;
      parentSelect.appendChild(option);
    });
  }

  const specContainer = document.getElementById("sub-spec-fields-container");
  if (specContainer) specContainer.innerHTML = "";

  const modal = document.getElementById("add-category-modal");
  if (modal) modal.classList.remove("hidden");
  const statusEl = document.getElementById("category-isactive");
  if (statusEl) statusEl.value = "true";
  setTimeout(() => {
    if (typeof feather !== "undefined") feather.replace();
  }, 50);
}

function closeAddCategoryModal() {
  const modal = document.getElementById("add-category-modal");
  if (modal) modal.classList.add("hidden");
  const form = document.getElementById("add-category-form");
  if (form) form.reset();
  const specContainer = document.getElementById("sub-spec-fields-container");
  if (specContainer) specContainer.innerHTML = "";
}

function renderSubCategorySpecBuilder(
  parentId,
  containerId,
  existingSpecFields = null
) {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = "";

  let fieldsToRender = [];
  if (Array.isArray(existingSpecFields) && existingSpecFields.length > 0) {
    fieldsToRender = existingSpecFields;
  } else {
    const parentMainCat = allMainCategories.find(
      (mc) => Number(mc.id) === Number(parentId)
    );
    if (Array.isArray(parentMainCat?.specFields)) {
      fieldsToRender = parentMainCat.specFields;
    }
  }

  fieldsToRender.forEach((field) => addSpecFieldRow(containerId, field));
}

function handleAddSubCategoryParentChange() {
  const parentVal = document.getElementById("parent-category")?.value || "";
  const parentId = parentVal !== "" ? parseInt(parentVal, 10) : null;
  if (!parentId || Number.isNaN(parentId)) {
    const container = document.getElementById("sub-spec-fields-container");
    if (container) container.innerHTML = "";
    return;
  }
  renderSubCategorySpecBuilder(parentId, "sub-spec-fields-container");
}

async function handleAddCategory(event) {
  event.preventDefault();

  const name = document.getElementById("category-name")?.value.trim();
  const description =
    document.getElementById("category-description")?.value.trim() || "";
  const parentVal = document.getElementById("parent-category")?.value || "";
  const parentId = parentVal !== "" ? parseInt(parentVal, 10) : null;

  if (!name) {
    showErrorMessage("Category name is required");
    return;
  }
  // Require selecting a main category to create a sub category under it
  if (parentId === null || Number.isNaN(parentId)) {
    showErrorMessage("Please select a Main Category");
    return;
  }
  // Prevent duplicate names (backend has unique constraint on Category.name)
  const exists =
    Array.isArray(allCategories) &&
    allCategories.some(
      (c) => (c.name || "").trim().toLowerCase() === name.toLowerCase()
    );
  if (exists) {
    showErrorMessage("Category name already exists");
    return;
  }

  const specFields = collectSpecFieldRows("sub-spec-fields-container");
  if (specFields === null) return;

  try {
    // disable submit to prevent double submits
    const addBtn = document.querySelector(
      '#add-category-form button[type="submit"]'
    );
    if (addBtn) {
      addBtn.disabled = true;
      addBtn.classList.add("opacity-50", "cursor-not-allowed");
    }

    const formData = {
      name,
      description,
      parentId,
      isActive: document.getElementById("category-isactive")?.value === "true",
      specFields: specFields.length > 0 ? specFields : null,
    };

    const response = await makeAuthenticatedRequest(
      `${window.API_BASE_URL}/category`,
      {
        method: "POST",
        body: JSON.stringify(formData),
      }
    );

    if (response.success) {
      showSuccessMessage("Category added successfully");
      const newCategoryId = response.data?.id;
      closeAddCategoryModal();
      await loadMainCategoriesFromAPI();
      await loadCategoriesFromAPI();
      loadCategoriesData();
      updateStatsDisplay();
      populateFilterOptions();
      if (isAddProductModalOpen()) {
        await populateAddProductModal({ selectedCategoryId: newCategoryId });
      }
    } else {
      // Show server error message if provided
      const msg = response.message || "Server error. Please try again later.";
      showErrorMessage(msg);
    }
  } catch (error) {
    console.error("Error adding category:", error);
    const msg = (error && error.message) || "Failed to add category";
    if (
      msg.includes("Unique constraint failed") ||
      msg.toLowerCase().includes("already exists")
    ) {
      showErrorMessage("Category name already exists");
    } else {
      showErrorMessage("Failed to add category: " + msg);
    }
  } finally {
    const addBtn = document.querySelector(
      '#add-category-form button[type="submit"]'
    );
    if (addBtn) {
      addBtn.disabled = false;
      addBtn.classList.remove("opacity-50", "cursor-not-allowed");
    }
  }
}

function openAddBrandModal() {
  const modal = document.getElementById("add-brand-modal");
  if (modal) modal.classList.remove("hidden");
  const statusEl = document.getElementById("brand-isactive");
  if (statusEl && !statusEl.value) statusEl.value = "true";
  setTimeout(() => {
    if (typeof feather !== "undefined") feather.replace();
  }, 50);
}

function closeAddBrandModal() {
  const modal = document.getElementById("add-brand-modal");
  if (modal) modal.classList.add("hidden");
  const form = document.getElementById("add-brand-form");
  if (form) form.reset();
}

// Close edit brand modal
function closeEditBrandModal() {
  const modal = document.getElementById("edit-brand-modal");
  if (modal) modal.classList.add("hidden");
  const form = document.getElementById("edit-brand-form");
  if (form) form.reset();
}

// Handle edit brand form submission
async function handleEditBrand(event) {
  event.preventDefault();

  const id = document.getElementById("edit-brand-id")?.value;
  const name = document.getElementById("edit-brand-name")?.value.trim();
  const isActive =
    document.getElementById("edit-brand-isactive")?.value === "true";

  if (!id) {
    showErrorMessage("Invalid brand id");
    return;
  }
  if (!name) {
    showErrorMessage("Brand name is required");
    return;
  }

  try {
    const payload = { name, isActive };
    const response = await makeAuthenticatedRequest(
      `${window.API_BASE_URL}/brands/${id}`,
      {
        method: "PUT",
        body: JSON.stringify(payload),
      }
    );

    if (response.success) {
      showSuccessMessage("Brand updated successfully");
      closeEditBrandModal();
      await loadBrandsFromAPI();
      loadBrandsData();
      await loadProductsFromAPI();
      loadProductsData();
      updateStatsDisplay();
      populateFilterOptions();
    } else {
      const msg =
        response.error || response.message || "Failed to update brand";
      showErrorMessage(msg);
    }
  } catch (error) {
    console.error("Error updating brand:", error);
    showErrorMessage("Failed to update brand: " + (error.message || error));
  }
}

async function handleAddBrand(event) {
  event.preventDefault();

  const name = document.getElementById("brand-name")?.value.trim();
  const isActive = document.getElementById("brand-isactive")?.value === "true";

  if (!name) {
    showErrorMessage("Brand name is required");
    return;
  }

  try {
    const formData = {
      name: name,
      isActive: isActive,
    };

    const response = await makeAuthenticatedRequest(
      `${window.API_BASE_URL}/brands`,
      {
        method: "POST",
        body: JSON.stringify(formData),
      }
    );

    if (response.success) {
      showSuccessMessage("Brand added successfully");
      const newBrandId = response.data?.id;
      closeAddBrandModal();
      await loadBrandsFromAPI();
      loadBrandsData();
      updateStatsDisplay();
      populateFilterOptions();
      if (isAddProductModalOpen()) {
        await populateAddProductModal({ selectedBrandId: newBrandId });
      }
    }
  } catch (error) {
    console.error("Error adding brand:", error);
    showErrorMessage("Failed to add brand: " + error.message);
  }
}

async function editProduct(id) {
  const product = allProducts.find((p) => p.id === id);
  if (!product) {
    showErrorMessage("Product not found");
    return;
  }

  document.getElementById("edit-product-id").value = product.id;
  document.getElementById("edit-product-name").value = product.name || "";
  document.getElementById("edit-product-description").value =
    product.description || "";
  document.getElementById("edit-product-model").value = product.model || "";
  document.getElementById("edit-product-warranty-value").value =
    product.warrantyValue != null ? String(product.warrantyValue) : "";
  document.getElementById("edit-product-warranty-unit").value =
    product.warrantyUnit || "";

  // Populate subcategory dropdown grouped by main category (active + current selection)
  const subCategorySelect = document.getElementById("edit-product-subcategory");
  if (subCategorySelect) {
    subCategorySelect.innerHTML = '<option value="">Select Category</option>';

    const currentCategoryId = Number(product.categoryId);
    const ensureCurrentCategoryOption = () => {
      const alreadyPresent = Array.from(subCategorySelect.options).some(
        (opt) => Number(opt.value) === currentCategoryId
      );
      if (alreadyPresent || !currentCategoryId) return;

      const currentLeaf = (allCategories || []).find(
        (c) => Number(c.id) === currentCategoryId
      );
      const currentMain = (allMainCategories || []).find(
        (c) => Number(c.id) === currentCategoryId
      );
      const option = document.createElement("option");
      option.value = currentCategoryId;
      option.textContent = currentLeaf?.name || currentMain?.name || "Current category (inactive)";
      option.setAttribute(
        "data-parent-id",
        currentLeaf?.parentId || currentMain?.id || currentCategoryId
      );
      subCategorySelect.appendChild(option);
    };

    (allMainCategories || []).forEach((mc) => {
      const subs = (Array.isArray(mc.children) ? mc.children : []).filter(
        (subCat) =>
          subCat.isActive !== false || Number(subCat.id) === currentCategoryId
      );
      if (subs.length === 0) return;
      if (mc.isActive === false && !subs.some((s) => Number(s.id) === currentCategoryId)) {
        return;
      }

      const group = document.createElement("optgroup");
      group.label = `${mc.name} - Sub Categories`;

      subs.forEach((subCat) => {
        const option = document.createElement("option");
        option.value = subCat.id;
        option.textContent = subCat.name;
        option.setAttribute("data-parent-id", mc.id);
        group.appendChild(option);
      });

      subCategorySelect.appendChild(group);
    });

    (allMainCategories || [])
      .filter(
        (mc) =>
          mc.isActive !== false || Number(mc.id) === currentCategoryId
      )
      .forEach((mc) => {
        const mainOption = document.createElement("option");
        mainOption.value = mc.id;
        mainOption.textContent = `${mc.name} (Main Category)`;
        mainOption.setAttribute("data-parent-id", mc.id);
        subCategorySelect.appendChild(mainOption);
      });

    ensureCurrentCategoryOption();
    subCategorySelect.value = String(product.categoryId);
    handleEditSubcategoryChange();
  }

  // Populate brand dropdown (active + current selection)
  const brandSelect = document.getElementById("edit-product-brand");
  if (brandSelect) {
    brandSelect.innerHTML = '<option value="">Select Brand</option>';
    (allBrands || [])
      .filter(
        (brand) =>
          (brand.isActive !== false && brand.status !== "Inactive") ||
          brand.id === product.brandId
      )
      .forEach((brand) => {
        const option = document.createElement("option");
        option.value = brand.id;
        option.textContent = brand.name;
        option.selected = brand.id === product.brandId;
        brandSelect.appendChild(option);
      });
  }

  document.getElementById("edit-product-modal").classList.remove("hidden");
  setTimeout(() => {
    if (typeof feather !== "undefined") feather.replace();
  }, 100);
}

async function deleteProduct(id) {
  const product = allProducts.find((p) => p.id === id);

  if (!product) {
    showErrorMessage("Product not found");
    return;
  }

  const confirmed = window.confirm
    ? window.confirm(`Are you sure you want to delete "${product.name}"?`)
    : true; // Fallback for environments without confirm

  if (confirmed) {
    try {
      const response = await makeAuthenticatedRequest(
        `${window.API_BASE_URL}/products/${id}`,
        {
          method: "DELETE",
        }
      );

      if (response.success) {
        showSuccessMessage("Product deleted successfully");
        await loadProductsFromAPI();
        loadProductsData();
        updateStatsDisplay();
      }
    } catch (error) {
      console.error("Error deleting product:", error);
      showErrorMessage("Failed to delete product: " + error.message);
    }
  }
}

function editCategory(id) {
  const category = allCategories.find((c) => c.id === id);
  if (category) {
    document.getElementById("edit-category-id").value = category.id;
    document.getElementById("edit-category-name").value = category.name || "";
    document.getElementById("edit-category-description").value =
      category.description || "";
    // Set status select
    const statusEl = document.getElementById("edit-category-isactive");
    if (statusEl) {
      statusEl.value = category.isActive ? "true" : "false";
    }

    // Populate parent category dropdown using dynamic main categories loaded from API
    const parentSelect = document.getElementById("edit-parent-category");
    if (parentSelect) {
      parentSelect.innerHTML =
        '<option value="">No Parent (Main Category)</option>';

      allMainCategories.forEach((mc) => {
        if (mc.id === category.id) return; // don't allow self
        const option = document.createElement("option");
        option.value = mc.id;
        option.textContent = mc.name;
        if (mc.id === category.parentId) option.selected = true;
        parentSelect.appendChild(option);
      });
    }

    renderSubCategorySpecBuilder(
      category.parentId,
      "edit-sub-spec-fields-container",
      category.specFields
    );

    document.getElementById("edit-category-modal").classList.remove("hidden");
    setTimeout(() => feather?.replace(), 50);
  }
}

async function deleteCategory(id) {
  const category = allCategories.find((c) => c.id === id);

  if (!category) {
    showErrorMessage("Category not found");
    return;
  }

  const confirmed = window.confirm
    ? window.confirm(`Are you sure you want to delete "${category.name}"?`)
    : true;

  if (confirmed) {
    try {
      const response = await makeAuthenticatedRequest(
        `${window.API_BASE_URL}/category/${id}`,
        {
          method: "DELETE",
        }
      );

      if (response.success) {
        showSuccessMessage("Category deleted successfully");
        await loadCategoriesFromAPI();
        loadCategoriesData();
        updateStatsDisplay();
        populateFilterOptions();
      }
    } catch (error) {
      console.error("Error deleting category:", error);
      showErrorMessage("Failed to delete category: " + error.message);
    }
  }
}

function editBrand(id) {
  const brand = allBrands.find((b) => b.id === id);
  if (brand) {
    document.getElementById("edit-brand-id").value = brand.id;
    document.getElementById("edit-brand-name").value = brand.name || "";
    const isActiveEl = document.getElementById("edit-brand-isactive");
    if (isActiveEl) isActiveEl.value = brand.isActive ? "true" : "false";
    document.getElementById("edit-brand-modal").classList.remove("hidden");
    setTimeout(() => feather?.replace(), 50);
  }
}

async function deleteBrand(id) {
  const brand = allBrands.find((b) => b.id === id);

  if (!brand) {
    showErrorMessage("Brand not found");
    return;
  }

  const confirmed = window.confirm
    ? window.confirm(`Are you sure you want to delete "${brand.name}"?`)
    : true;

  if (confirmed) {
    try {
      const response = await makeAuthenticatedRequest(
        `${window.API_BASE_URL}/brands/${id}`,
        {
          method: "DELETE",
        }
      );

      if (response.success) {
        showSuccessMessage("Brand deleted successfully");
        await loadBrandsFromAPI();
        loadBrandsData();
        updateStatsDisplay();
        populateFilterOptions();
      }
    } catch (error) {
      console.error("Error deleting brand:", error);
      showErrorMessage("Failed to delete brand: " + error.message);
    }
  }
}

// ─── Spec Field Builder Utilities ───────────────────────────────────────────

/**
 * Adds a spec-field definition row to a builder container (used in main-category modals).
 * Each row lets admin define: field name, label, type (text/select/number), options, placeholder.
 */
function addSpecFieldRow(containerId, existing = null) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const rowId = `spec-row-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const row = document.createElement("div");
  row.className =
    "spec-field-row border border-gray-200 rounded p-3 mb-2 bg-gray-50";
  row.id = rowId;

  const name = existing?.name || "";
  const label = existing?.label || "";
  const type = existing?.type || "text";
  const placeholder = existing?.placeholder || "";
  const optionsStr = Array.isArray(existing?.options)
    ? existing.options.join(", ")
    : "";
  const optionsHidden = type === "select" ? "" : "hidden";

  row.innerHTML = `
    <div class="grid grid-cols-2 gap-2 mb-2">
      <div>
        <label class="block text-xs font-medium text-gray-500 mb-1">Field Name <span class="text-gray-400">(no spaces, e.g. ramSize)</span></label>
        <input type="text" class="spec-name w-full border border-gray-300 rounded px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500" value="${name}" placeholder="e.g. ramSize" />
      </div>
      <div>
        <label class="block text-xs font-medium text-gray-500 mb-1">Label <span class="text-gray-400">(displayed to user)</span></label>
        <input type="text" class="spec-label w-full border border-gray-300 rounded px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500" value="${label}" placeholder="e.g. RAM Size" />
      </div>
    </div>
    <div class="grid grid-cols-2 gap-2 mb-2">
      <div>
        <label class="block text-xs font-medium text-gray-500 mb-1">Field Type</label>
        <select class="spec-type w-full border border-gray-300 rounded px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500" onchange="toggleSpecOptions('${rowId}', this.value)">
          <option value="text" ${
            type === "text" ? "selected" : ""
          }>Text</option>
          <option value="number" ${
            type === "number" ? "selected" : ""
          }>Number</option>
          <option value="select" ${
            type === "select" ? "selected" : ""
          }>Dropdown (select)</option>
        </select>
      </div>
      <div>
        <label class="block text-xs font-medium text-gray-500 mb-1">Placeholder</label>
        <input type="text" class="spec-placeholder w-full border border-gray-300 rounded px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500" value="${placeholder}" placeholder="e.g. Enter RAM size" />
      </div>
    </div>
    <div class="spec-options-row ${optionsHidden} mb-2">
      <label class="block text-xs font-medium text-gray-500 mb-1">Options <span class="text-gray-400">(comma separated)</span></label>
      <input type="text" class="spec-options w-full border border-gray-300 rounded px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500" value="${optionsStr}" placeholder="e.g. Option A, Option B, Option C" />
    </div>
    <div class="flex justify-end">
      <button type="button" onclick="document.getElementById('${rowId}').remove()" class="text-red-500 hover:text-red-700 text-xs flex items-center gap-1">
        <i data-feather="trash-2" class="w-3 h-3"></i> Remove
      </button>
    </div>
  `;

  container.appendChild(row);
  setTimeout(() => {
    if (typeof feather !== "undefined") feather.replace();
  }, 30);
}

/**
 * Toggles visibility of the options input row based on the selected field type.
 */
function toggleSpecOptions(rowId, typeValue) {
  const row = document.getElementById(rowId);
  if (!row) return;
  const optionsRow = row.querySelector(".spec-options-row");
  if (optionsRow) {
    if (typeValue === "select") {
      optionsRow.classList.remove("hidden");
    } else {
      optionsRow.classList.add("hidden");
    }
  }
}

/**
 * Reads all spec-field definition rows from a builder container and returns an array.
 * Returns null if there are validation errors.
 */
function collectSpecFieldRows(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return [];

  const rows = container.querySelectorAll(".spec-field-row");
  const fields = [];

  for (const row of rows) {
    const name = (row.querySelector(".spec-name")?.value || "")
      .trim()
      .replace(/\s+/g, "");
    const label = (row.querySelector(".spec-label")?.value || "").trim();
    const type = row.querySelector(".spec-type")?.value || "text";
    const placeholder = (
      row.querySelector(".spec-placeholder")?.value || ""
    ).trim();
    const optionsRaw = (row.querySelector(".spec-options")?.value || "").trim();

    if (!name || !label) {
      showErrorMessage("Each spec field must have a Field Name and Label");
      return null; // Indicate error
    }
    if (fields.some((f) => f.name.toLowerCase() === name.toLowerCase())) {
      showErrorMessage(
        `Duplicate Field Name "${name}". Each specification field needs a unique Field Name.`
      );
      return null;
    }
    if (!["text", "select", "number"].includes(type)) {
      showErrorMessage("Invalid field type: " + type);
      return null;
    }

    const field = { name, label, type };
    if (placeholder) field.placeholder = placeholder;
    if (type === "select") {
      const options = optionsRaw
        .split(",")
        .map((o) => o.trim())
        .filter(Boolean);
      if (options.length === 0) {
        showErrorMessage(
          `Dropdown field "${label}" must have at least one option`
        );
        return null;
      }
      field.options = options;
    }
    fields.push(field);
  }

  return fields;
}

/**
 * Adds a custom key-value spec field row to a product add/edit form.
 * Used for extra per-product specifications not in the category template.
 */
function addCustomSpecField(containerId, keyVal = null) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const rowId = `custom-spec-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const row = document.createElement("div");
  row.className = "flex items-center gap-2 custom-spec-row";
  row.id = rowId;

  const key = keyVal?.key || "";
  const val = keyVal?.value || "";

  row.innerHTML = `
    <input type="text" class="custom-spec-key flex-1 border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500" value="${key}" placeholder="Field name (e.g. color)" />
    <input type="text" class="custom-spec-value flex-1 border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500" value="${val}" placeholder="Value" />
    <button type="button" onclick="document.getElementById('${rowId}').remove()" class="text-red-400 hover:text-red-600 flex-shrink-0">
      <i data-feather="x-circle" class="w-4 h-4"></i>
    </button>
  `;

  container.appendChild(row);
  setTimeout(() => {
    if (typeof feather !== "undefined") feather.replace();
  }, 30);
}

/**
 * Reads custom spec field rows from a container and returns an object { key: value }.
 */
function collectCustomSpecFields(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return {};

  const result = {};
  const rows = container.querySelectorAll(".custom-spec-row");
  rows.forEach((row) => {
    const key = (row.querySelector(".custom-spec-key")?.value || "")
      .trim()
      .replace(/\s+/g, "");
    const val = (row.querySelector(".custom-spec-value")?.value || "").trim();
    if (key) result[key] = val;
  });
  return result;
}

// ─── Handle subcategory change and show specifications based on parent category ──
/**
 * Renders spec field inputs from the selected sub-category's parent main category's
 * specFields (from DB). Used in Add Product modal.
 */
function handleSubcategoryChange() {
  // Product-level specifications are disabled in Add Product modal.
  // Variant specifications are managed in the Manage Variants modal.
  return;
}

/**
 * Renders spec inputs from the selected sub-category's parent main category's specFields.
 * Used in Edit Product modal. Optionally pre-fills with existingSpecs.
 */
function handleEditSubcategoryChange(_existingSpecs = null) {
  // Product-level specifications are disabled in Edit Product modal.
  // Variant specifications are managed in the Manage Variants modal.
  const specificationsContainer = document.getElementById(
    "edit-specifications-container"
  );
  const categorySpecificationsDiv = document.getElementById(
    "edit-category-specifications"
  );
  if (specificationsContainer) specificationsContainer.innerHTML = "";
  if (categorySpecificationsDiv) {
    categorySpecificationsDiv.classList.add("hidden");
  }
}

/**
 * Internal helper: renders spec field inputs from a specFields array into a container.
 * @param {Array} specFields - Array of {name, label, type, options?, placeholder?}
 * @param {HTMLElement} container - DOM container to append inputs to
 * @param {string} idPrefix - Prefix for element IDs (e.g. "spec" or "edit-spec")
 */
function renderSpecFields(specFields, container, idPrefix) {
  specFields.forEach((spec) => {
    const specDiv = document.createElement("div");

    if (spec.type === "select" && Array.isArray(spec.options)) {
      const optionsHtml = spec.options
        .map((option) => `<option value="${option}">${option}</option>`)
        .join("");
      specDiv.innerHTML = `
        <label class="block text-xs font-medium text-gray-500 mb-1">${spec.label}</label>
        <select name="${spec.name}" id="${idPrefix}-${spec.name}"
               class="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500">
          <option value="">Select ${spec.label}</option>
          ${optionsHtml}
        </select>
      `;
    } else {
      specDiv.innerHTML = `
        <label class="block text-xs font-medium text-gray-500 mb-1">${
          spec.label
        }</label>
        <input type="${spec.type === "number" ? "number" : "text"}" name="${
        spec.name
      }" id="${idPrefix}-${spec.name}"
               class="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500"
               placeholder="${spec.placeholder || ""}" />
      `;
    }
    container.appendChild(specDiv);
  });
}

function updateBrandOptions() {
  const brandSelect = document.getElementById("product-brand");
  if (brandSelect) {
    brandSelect.innerHTML = '<option value="">Select Brand</option>';
    (allBrands || [])
      .filter((brand) => brand.isActive !== false && brand.status !== "Inactive")
      .forEach((brand) => {
        const option = document.createElement("option");
        option.value = brand.id;
        option.textContent = brand.name;
        brandSelect.appendChild(option);
      });
  }
}

function showCategorySpecifications() {
  // Legacy compatibility - no longer needed (we use handleSubcategoryChange)
  handleSubcategoryChange();
}

function showEditCategorySpecifications(existingSpecs = null) {
  handleEditSubcategoryChange(existingSpecs);
}

// ─── Edit / Close Product Modal ───────────────────────────────────────────────

function closeEditProductModal() {
  document.getElementById("edit-product-modal").classList.add("hidden");
  document.getElementById("edit-product-form").reset();
  const specDiv = document.getElementById("edit-category-specifications");
  if (specDiv) specDiv.classList.add("hidden");
}

async function handleEditProduct(event) {
  event.preventDefault();

  const id = parseInt(document.getElementById("edit-product-id").value);
  const warrantyFields = collectWarrantyFields(
    "edit-product-warranty-value",
    "edit-product-warranty-unit"
  );
  if (warrantyFields === null) return;

  const formData = {
    productName: document.getElementById("edit-product-name").value.trim(),
    description:
      document.getElementById("edit-product-description")?.value.trim() || "",
    categoryId: parseInt(
      document.getElementById("edit-product-subcategory").value
    ),
    brandId: document.getElementById("edit-product-brand").value
      ? parseInt(document.getElementById("edit-product-brand").value)
      : null,
    modelNumber:
      document.getElementById("edit-product-model").value.trim() || null,
    warrantyValue: warrantyFields.warrantyValue,
    warrantyUnit: warrantyFields.warrantyUnit,
    // Product-level specifications are managed at variant level; omit so existing value is preserved
  };

  if (!formData.productName) {
    showErrorMessage("Product name is required");
    return;
  }
  if (!formData.categoryId) {
    showErrorMessage("Category is required");
    return;
  }

  try {
    const response = await makeAuthenticatedRequest(
      `${window.API_BASE_URL}/products/${id}`,
      {
        method: "PUT",
        body: JSON.stringify(formData),
      }
    );

    if (response.success) {
      showSuccessMessage("Product updated successfully");
      closeEditProductModal();
      await loadProductsFromAPI();
      loadProductsData();
      updateStatsDisplay();
    } else {
      showErrorMessage(response.message || "Failed to update product");
    }
  } catch (error) {
    console.error("Error updating product:", error);
    showErrorMessage("Failed to update product: " + error.message);
  }
}

/**
 * Collects specifications from the edit product modal
 * (template spec inputs from selected category fields).
 */
function collectEditSpecifications() {
  const specifications = {};

  // Collect template-based spec inputs
  const specContainer = document.getElementById(
    "edit-specifications-container"
  );
  if (specContainer) {
    const inputs = specContainer.querySelectorAll("input[name], select[name]");
    inputs.forEach((input) => {
      if (input.value.trim()) specifications[input.name] = input.value.trim();
    });
  }

  return Object.keys(specifications).length > 0 ? specifications : null;
}

function updateEditBrandOptions() {
  const brandSelect = document.getElementById("edit-product-brand");
  if (brandSelect) {
    brandSelect.innerHTML = '<option value="">Select Brand</option>';
    allBrands.forEach((brand) => {
      const option = document.createElement("option");
      option.value = brand.id;
      option.textContent = brand.name;
      brandSelect.appendChild(option);
    });
  }
}

// ─── Additional sub-category edit/close modal functions ───────────────────────

function closeEditCategoryModal() {
  document.getElementById("edit-category-modal").classList.add("hidden");
  document.getElementById("edit-category-form")?.reset();
  const container = document.getElementById("edit-sub-spec-fields-container");
  if (container) container.innerHTML = "";
}

function handleEditSubCategoryParentChange() {
  const parentVal =
    document.getElementById("edit-parent-category")?.value || "";
  const parentId = parentVal !== "" ? parseInt(parentVal, 10) : null;
  if (!parentId || Number.isNaN(parentId)) {
    const container = document.getElementById("edit-sub-spec-fields-container");
    if (container) container.innerHTML = "";
    return;
  }

  // On parent change, load the selected main category template (admin can still edit further)
  renderSubCategorySpecBuilder(parentId, "edit-sub-spec-fields-container");
}

async function handleEditCategory(event) {
  event.preventDefault();

  const id = parseInt(document.getElementById("edit-category-id").value);
  const specFields = collectSpecFieldRows("edit-sub-spec-fields-container");
  if (specFields === null) return;
  const formData = {
    name: document.getElementById("edit-category-name").value.trim(),
    description:
      document.getElementById("edit-category-description").value.trim() || "",
    parentId: document.getElementById("edit-parent-category").value
      ? parseInt(document.getElementById("edit-parent-category").value)
      : null,
    isActive:
      document.getElementById("edit-category-isactive").value === "true",
    specFields: specFields.length > 0 ? specFields : null,
  };

  if (!formData.name) {
    showErrorMessage("Category name is required");
    return;
  }

  // Prevent duplicate names (ignore the category being edited)
  const nameExists = allCategories.some(
    (c) =>
      c.id !== id &&
      (c.name || "").trim().toLowerCase() === formData.name.toLowerCase()
  );
  if (nameExists) {
    showErrorMessage("Category name already exists");
    return;
  }

  try {
    const response = await makeAuthenticatedRequest(
      `${window.API_BASE_URL}/category/${id}`,
      {
        method: "PUT",
        body: JSON.stringify(formData),
      }
    );

    if (response.success) {
      showSuccessMessage("Category updated successfully");
      closeEditCategoryModal();
      await loadCategoriesFromAPI();
      loadCategoriesData();
      await loadProductsFromAPI();
      loadProductsData();
      populateFilterOptions();
    }
  } catch (error) {
    console.error("Error updating category:", error);
    showErrorMessage("Failed to update category: " + error.message);
  }
}

async function populateAddProductModal(options = {}) {
  const subcategorySelect = document.getElementById("product-subcategory");
  const brandSelect = document.getElementById("product-brand");
  const selectedCategoryId =
    options.selectedCategoryId ?? subcategorySelect?.value;
  const selectedBrandId = options.selectedBrandId ?? brandSelect?.value;

  try {
    if (
      options.reload ||
      !allMainCategories ||
      allMainCategories.length === 0
    ) {
      await loadMainCategoriesFromAPI();
    }
    if (options.reload || !allCategories || allCategories.length === 0) {
      await loadCategoriesFromAPI();
    }
    if (options.reload || !allBrands || allBrands.length === 0) {
      await loadBrandsFromAPI();
    }
  } catch (err) {
    console.error(
      "Error loading categories/brands before populating modal:",
      err
    );
  }

  // Populate category select: sub-category groups first, main categories at bottom
  if (subcategorySelect) {
    subcategorySelect.innerHTML = '<option value="">Select Category</option>';

    (allMainCategories || [])
      .filter((mc) => mc.isActive !== false)
      .forEach((mc) => {
        const subs = (Array.isArray(mc.children) ? mc.children : []).filter(
          (subCat) => subCat.isActive !== false
        );
        if (subs.length === 0) return;

        const group = document.createElement("optgroup");
        group.label = `${mc.name} - Sub Categories`;

        subs.forEach((subCat) => {
          const option = document.createElement("option");
          option.value = subCat.id;
          option.textContent = subCat.name;
          option.setAttribute("data-parent-id", mc.id);
          group.appendChild(option);
        });

        subcategorySelect.appendChild(group);
      });

    (allMainCategories || [])
      .filter((mc) => mc.isActive !== false)
      .forEach((mc) => {
        const mainOption = document.createElement("option");
        mainOption.value = mc.id;
        mainOption.textContent = `${mc.name} (Main Category)`;
        mainOption.setAttribute("data-parent-id", mc.id);
        subcategorySelect.appendChild(mainOption);
      });
  }

  // Populate brands (active only)
  if (brandSelect) {
    brandSelect.innerHTML = '<option value="">Select Brand</option>';
    (allBrands || [])
      .filter((brand) => brand.isActive !== false && brand.status !== "Inactive")
      .forEach((brand) => {
        const option = document.createElement("option");
        option.value = brand.id;
        option.textContent = brand.name;
        brandSelect.appendChild(option);
      });
  }

  if (subcategorySelect && selectedCategoryId) {
    subcategorySelect.value = String(selectedCategoryId);
  }
  if (brandSelect && selectedBrandId) {
    brandSelect.value = String(selectedBrandId);
  }
}

function getProductsExportFilters() {
  const searchTerm = document.getElementById("products-search")?.value?.trim();
  const categoryFilter = document.getElementById(
    "products-category-filter"
  )?.value;
  const brandFilter = document.getElementById("products-brand-filter")?.value;
  const categoryLabel = categoryFilter
    ? document.querySelector(
        `#products-category-filter option[value="${CSS.escape(categoryFilter)}"]`
      )?.textContent?.trim() || categoryFilter
    : "";
  const brandLabel = brandFilter
    ? document.querySelector(
        `#products-brand-filter option[value="${CSS.escape(brandFilter)}"]`
      )?.textContent?.trim() || brandFilter
    : "";
  return [
    searchTerm ? { label: "Search", value: searchTerm } : null,
    categoryFilter ? { label: "Category", value: categoryLabel } : null,
    brandFilter ? { label: "Brand", value: brandLabel } : null,
  ].filter(Boolean);
}

function getProductsExportRows() {
  return (getFilteredProducts() || []).map((product) => [
    product.brand,
    product.model || "—",
    product.name,
    product.category,
    product.status === "Active" ? "Active" : "Inactive",
  ]);
}

function getProductsXlsxRows() {
  const products = getFilteredProducts() || [];
  const rows = [];
  for (const product of products) {
    const variants = Array.isArray(product.variants) ? product.variants : [];
    if (!variants.length) {
      rows.push({
        brand: product.brand || "",
        model: product.model || "—",
        productName: product.name || "",
        category: product.category || "",
        status: product.status === "Active" ? "Active" : "Inactive",
        variantName: "—",
        barcode: "—",
        stock: 0,
        variantStatus: "—",
      });
      continue;
    }
    for (const v of variants) {
      rows.push({
        brand: product.brand || "",
        model: product.model || "—",
        productName: product.name || "",
        category: product.category || "",
        status: product.status === "Active" ? "Active" : "Inactive",
        variantName: v.variantName || "—",
        barcode: v.barcode || "—",
        stock: v.totalStock ?? 0,
        variantStatus: v.isActive === false ? "Inactive" : "Active",
      });
    }
  }
  return rows;
}

function downloadProductsPDF() {
  try {
    const tableData = getProductsExportRows();
    const ok = exportPdfWithTable({
      title: "Products Report",
      filters: getProductsExportFilters(),
      head: ["Brand", "Model", "Product Name", "Category", "Status"],
      body: tableData,
      fileName: `products-report-${new Date().toISOString().split("T")[0]}.pdf`,
      summary: `Total Products: ${tableData.length}`,
      emptyMessage: "No products data available to export",
    });
    if (ok) showNotification("Products PDF downloaded successfully", "success");
  } catch (error) {
    console.error("Error generating PDF:", error);
    showNotification("Error generating PDF", "error");
  }
}

async function downloadProductsXL() {
  try {
    const dataRows = getProductsXlsxRows();
    const headers = [
      "Brand",
      "Model",
      "Product Name",
      "Category",
      "Status",
      "Variant",
      "Barcode",
      "Stock",
      "Variant Status",
    ];
    const rows = dataRows.map((row) => [
      row.brand,
      row.model,
      row.productName,
      row.category,
      row.status,
      row.variantName,
      row.barcode,
      row.stock,
      row.variantStatus,
    ]);
    const ok = await exportXlsxWithTable({
      title: "Products Report",
      filters: getProductsExportFilters(),
      headers,
      rows,
      sheetName: "Products",
      fileName: `products-report-${new Date().toISOString().split("T")[0]}.xlsx`,
      columnWidths: [16, 14, 22, 18, 12, 28, 18, 10, 14],
      emptyMessage: "No products data available to export",
    });
    if (ok) showNotification("Products XL downloaded successfully", "success");
  } catch (error) {
    console.error("Error generating XL:", error);
    showNotification("Error generating XL", "error");
  }
}

function downloadCategoriesPDF() {
  try {
    const categoriesData = allCategories || [];
    const tableData = categoriesData.map((category) => [
      category.name,
      category.parentName || category.description || "No description",
      category.productCount || "0",
      category.status === "Active" ? "Active" : "Inactive",
    ]);
    const ok = exportPdfWithTable({
      title: "Categories Report",
      filters: [],
      head: ["Category Name", "Description", "Products Count", "Status"],
      body: tableData,
      fileName: `categories-report-${new Date().toISOString().split("T")[0]}.pdf`,
      summary: `Total Categories: ${tableData.length}`,
      headStyles: { fillColor: [34, 197, 94] },
      emptyMessage: "No categories data available to export",
    });
    if (ok)
      showNotification("Categories PDF downloaded successfully", "success");
  } catch (error) {
    console.error("Error generating PDF:", error);
    showNotification("Error generating PDF", "error");
  }
}

async function downloadCategoriesXL() {
  try {
    const rows = (allCategories || []).map((category) => [
      category.name,
      category.parentName || category.description || "No description",
      category.productCount || "0",
      category.status === "Active" ? "Active" : "Inactive",
    ]);
    const ok = await exportXlsxWithTable({
      title: "Categories Report",
      filters: [],
      headers: ["Category Name", "Description", "Products Count", "Status"],
      rows,
      sheetName: "Categories",
      fileName: `categories-report-${new Date().toISOString().split("T")[0]}.xlsx`,
      emptyMessage: "No categories data available to export",
    });
    if (ok)
      showNotification("Categories XL downloaded successfully", "success");
  } catch (error) {
    console.error("Error generating XL:", error);
    showNotification("Error generating XL", "error");
  }
}

function downloadBrandsPDF() {
  try {
    const brandsData = allBrands || [];
    const tableData = brandsData.map((brand) => [
      brand.name,
      brand.productCount || "0",
      brand.status === "Active" ? "Active" : "Inactive",
    ]);
    const ok = exportPdfWithTable({
      title: "Brands Report",
      filters: [],
      head: ["Brand Name", "Products Count", "Status"],
      body: tableData,
      fileName: `brands-report-${new Date().toISOString().split("T")[0]}.pdf`,
      summary: `Total Brands: ${tableData.length}`,
      headStyles: { fillColor: [147, 51, 234] },
      emptyMessage: "No brands data available to export",
    });
    if (ok) showNotification("Brands PDF downloaded successfully", "success");
  } catch (error) {
    console.error("Error generating PDF:", error);
    showNotification("Error generating PDF", "error");
  }
}

async function downloadBrandsXL() {
  try {
    const rows = (allBrands || []).map((brand) => [
      brand.name,
      brand.productCount || "0",
      brand.status === "Active" ? "Active" : "Inactive",
    ]);
    const ok = await exportXlsxWithTable({
      title: "Brands Report",
      filters: [],
      headers: ["Brand Name", "Products Count", "Status"],
      rows,
      sheetName: "Brands",
      fileName: `brands-report-${new Date().toISOString().split("T")[0]}.xlsx`,
      emptyMessage: "No brands data available to export",
    });
    if (ok) showNotification("Brands XL downloaded successfully", "success");
  } catch (error) {
    console.error("Error generating XL:", error);
    showNotification("Error generating XL", "error");
  }
}

function getSpecFieldsForProduct(product) {
  if (!product) return [];

  // Prefer embedded category from variants API (most accurate for Manage Variants)
  if (product.category) {
    let embedded = Array.isArray(product.category.specFields)
      ? product.category.specFields
      : [];
    if (
      (!embedded || embedded.length === 0) &&
      product.category.parent &&
      Array.isArray(product.category.parent.specFields)
    ) {
      embedded = product.category.parent.specFields;
    }
    if (embedded.length > 0) return embedded;
  }

  const categoryId = Number(product.categoryId);
  const category =
    (allCategories || []).find((c) => Number(c.id) === categoryId) ||
    (allMainCategories || []).find((c) => Number(c.id) === categoryId);

  let fields = Array.isArray(category?.specFields) ? category.specFields : [];

  if ((!fields || fields.length === 0) && category?.parentId) {
    const parent = (allMainCategories || []).find(
      (c) => Number(c.id) === Number(category.parentId)
    );
    fields = Array.isArray(parent?.specFields) ? parent.specFields : [];
  }

  // Product assigned directly to a main category
  if ((!fields || fields.length === 0) && !category?.parentId) {
    const mainCategory = (allMainCategories || []).find(
      (c) => Number(c.id) === categoryId
    );
    fields = Array.isArray(mainCategory?.specFields)
      ? mainCategory.specFields
      : [];
  }

  return fields || [];
}

function hasVariantSpecFields(product) {
  return getSpecFieldsForProduct(product).length > 0;
}

function sanitizeSpecKey(text) {
  return String(text || "")
    .trim()
    .replace(/[^a-zA-Z0-9]+/g, "");
}

/**
 * Resolve category spec fields into unique storage keys + display labels.
 * Duplicate Field Names (e.g. two fields both named "GB") fall back to the label
 * so Storage/RAM values are not overwritten or mislabeled.
 */
function resolveVariantSpecFields(product) {
  const fields = getSpecFieldsForProduct(product);
  // No fake Color/RAM fallback — no-spec products use a variant name field instead
  if (!fields.length) return [];
  const usedKeys = new Set();

  return fields.map((field, idx) => {
    const label = field.label || field.name || `Field ${idx + 1}`;
    // Prefer label-based keys so Storage/RAM stay distinct even if Field Name is duplicated ("GB")
    let key = sanitizeSpecKey(label) || sanitizeSpecKey(field.name) || `field${idx + 1}`;

    let uniqueKey = key;
    let suffix = 2;
    while (usedKeys.has(uniqueKey.toLowerCase())) {
      uniqueKey = `${key}${suffix++}`;
    }
    usedKeys.add(uniqueKey.toLowerCase());

    return {
      ...field,
      key: uniqueKey,
      label,
      originalName: String(field.name || "").trim(),
      type: field.type || "text",
      placeholder: field.placeholder || label,
      options: Array.isArray(field.options) ? field.options : [],
      index: idx,
    };
  });
}

function getMainCategoryIdForProduct(product) {
  if (!product) return null;

  const categoryId = Number(product.categoryId);
  const category =
    (allCategories || []).find((c) => Number(c.id) === categoryId) ||
    (allMainCategories || []).find((c) => Number(c.id) === categoryId);

  if (!category) return product.categoryId || null;

  return category.parentId || category.id;
}

function renderVariantSpecFields(product) {
  const container = document.getElementById("variant-spec-fields");
  if (!container) return;

  if (!hasVariantSpecFields(product)) {
    container.innerHTML = `
      <div class="md:col-span-3">
        <label class="block text-xs font-medium text-gray-600 mb-1">Variant Name</label>
        <input type="text" id="variant-name-input" class="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500" placeholder="e.g. Standard / product name" />
        <p class="text-xs text-gray-500 mt-1">This category has no specification fields. Enter a variant name to add another variant.</p>
      </div>
    `;
    return;
  }

  const finalFields = resolveVariantSpecFields(product);

  container.innerHTML = finalFields
    .map((field) => {
      const { key, label, type, placeholder, options, originalName } = field;
      const safeKey = String(key).replace(/"/g, "&quot;");
      const safeLabel = String(label).replace(/"/g, "&quot;");
      const safeOriginal = String(originalName || "").replace(/"/g, "&quot;");

      if (type === "select" && options.length) {
        return `
          <div>
            <label class="block text-xs font-medium text-gray-600 mb-1">${label}</label>
            <select data-spec-key="${safeKey}" data-spec-label="${safeLabel}" data-spec-name="${safeOriginal}" class="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500">
              <option value="">Select ${label}</option>
              ${options
                .map(
                  (opt) =>
                    `<option value="${String(opt).replace(
                      /"/g,
                      "&quot;"
                    )}">${opt}</option>`
                )
                .join("")}
            </select>
          </div>
        `;
      }

      return `
        <div>
          <label class="block text-xs font-medium text-gray-600 mb-1">${label}</label>
          <input type="text" data-spec-key="${safeKey}" data-spec-label="${safeLabel}" data-spec-name="${safeOriginal}" class="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500" placeholder="${placeholder}" />
        </div>
      `;
    })
    .join("");
}

function formatVariantSpecText(specifications = {}, product = null) {
  const resolved = resolveVariantSpecFields(product);
  const labelByKey = {};

  resolved.forEach((field) => {
    labelByKey[field.key] = field.label;
    if (field.originalName) {
      // First original name wins so "GB" maps to Storage, not RAM Size
      if (!labelByKey[field.originalName]) {
        labelByKey[field.originalName] = field.label;
      }
      // Legacy unique keys from earlier fix: GB_2 (field index suffix)
      labelByKey[`${field.originalName}_${field.index}`] = field.label;
    }
  });

  return Object.entries(specifications || {})
    .map(([k, v]) => `${labelByKey[k] || k}: ${v}`)
    .join(" | ");
}

function collectVariantSpecificationsFromForm() {
  const nameOnlyInput = document.getElementById("variant-name-input");
  if (nameOnlyInput) {
    const variantName = (nameOnlyInput.value || "").trim() || null;
    return { specifications: {}, variantName };
  }

  const specInputs = document.querySelectorAll(
    "#variant-spec-fields [data-spec-key]"
  );
  const specifications = {};
  const nameParts = [];

  specInputs.forEach((input) => {
    const key = input.getAttribute("data-spec-key");
    const label = input.getAttribute("data-spec-label") || key;
    const value = (input.value || "").trim();
    if (!key || !value) return;

    specifications[key] = value;
    nameParts.push(`${label}: ${value}`);
  });

  let variantName = nameParts.join(" - ");
  if (variantName.length > 100) {
    variantName = `${variantName.slice(0, 97)}...`;
  }

  return { specifications, variantName: variantName || null };
}

function renderProductVariantsTable(variants = []) {
  const tbody = document.getElementById("product-variants-table-body");
  if (!tbody) return;

  if (!variants.length) {
    tbody.innerHTML =
      '<tr><td colspan="5" class="px-4 py-6 text-center text-gray-500">No variants found for this product</td></tr>';
    ensureProductVariantBarcodePrintDelegation();
    return;
  }

  const product = currentVariantModalProduct?.product || null;

  tbody.innerHTML = variants
    .map((variant) => {
      const specText = formatVariantSpecText(variant.specifications || {}, product);
      const modelNumber = product?.modelNumber || "";
      const variantLabel =
        (variant.variantName && String(variant.variantName).trim()) ||
        specText ||
        "";
      const price =
        variant.latestSellingPrice != null &&
        !Number.isNaN(Number(variant.latestSellingPrice))
          ? String(Number(variant.latestSellingPrice))
          : "";
      return `
        <tr>
          <td class="px-4 py-3 text-sm font-medium text-gray-900">${
            variant.variantName || "—"
          }</td>
          <td class="px-4 py-3 text-sm text-gray-600 font-mono">${
            variant.barcode || "—"
          }</td>
          <td class="px-4 py-3 text-sm text-gray-600">${
            variant.minStockLevel
          }</td>
          <td class="px-4 py-3 text-sm text-gray-900 font-semibold">${
            variant.totalStock || 0
          }</td>
          <td class="px-4 py-3 text-sm whitespace-nowrap">
            <button onclick="startEditVariant(${
              variant.id
            })" class="text-blue-600 hover:text-blue-900 mr-3" title="Edit Variant">
              <i data-feather="edit-2" class="w-4 h-4"></i>
            </button>
            <button type="button" class="text-indigo-600 hover:text-indigo-900 mr-3 js-print-variant-barcode" title="Print Barcode" data-vid="${String(variant.id)}" data-b="${encodeURIComponent(String(variant.barcode || ""))}" data-n="${encodeURIComponent(String(variantLabel))}" data-m="${encodeURIComponent(String(modelNumber))}" data-p="${encodeURIComponent(price)}">
              <i data-feather="printer" class="w-4 h-4"></i>
            </button>
            <button onclick="deleteProductVariantFromModal(${
              variant.id
            })" class="text-red-600 hover:text-red-900" title="Delete Variant">
              <i data-feather="trash-2" class="w-4 h-4"></i>
            </button>
          </td>
        </tr>
      `;
    })
    .join("");

  ensureProductVariantBarcodePrintDelegation();
  if (typeof feather !== "undefined") feather.replace();
}

function resetVariantFormMode() {
  currentEditingVariantId = null;

  const editInput = document.getElementById("variant-edit-id");
  if (editInput) editInput.value = "";

  const submitBtn = document.getElementById("variant-submit-btn");
  if (submitBtn) submitBtn.textContent = "Add Variant";

  const cancelBtn = document.getElementById("variant-cancel-edit-btn");
  if (cancelBtn) cancelBtn.classList.add("hidden");

  const form = document.getElementById("add-variant-form");
  if (form) form.reset();

  const minInput = document.getElementById("variant-min-stock");
  if (minInput) minInput.value = "10";
}

function startEditVariant(variantId) {
  if (!currentVariantModalProduct?.variants?.length) return;

  const variant = currentVariantModalProduct.variants.find(
    (v) => Number(v.id) === Number(variantId)
  );
  if (!variant) return;

  currentEditingVariantId = variant.id;

  const editInput = document.getElementById("variant-edit-id");
  if (editInput) editInput.value = String(variant.id);

  const specs = variant.specifications || {};
  const usedSpecKeys = new Set();
  const specInputs = document.querySelectorAll(
    "#variant-spec-fields [data-spec-key]"
  );
  specInputs.forEach((input, idx) => {
    const key = input.getAttribute("data-spec-key");
    const originalName = input.getAttribute("data-spec-name");
    let value = "";

    const take = (specKey) => {
      if (
        specKey &&
        specs[specKey] !== undefined &&
        specs[specKey] !== null &&
        !usedSpecKeys.has(specKey)
      ) {
        usedSpecKeys.add(specKey);
        return String(specs[specKey]);
      }
      return null;
    };

    value =
      take(key) ||
      take(originalName ? `${originalName}_${idx}` : null) ||
      take(originalName) ||
      "";

    input.value = value;
  });

  const nameOnlyInput = document.getElementById("variant-name-input");
  if (nameOnlyInput) {
    nameOnlyInput.value = variant.variantName || "";
  }

  const barcodeInput = document.getElementById("variant-barcode");
  if (barcodeInput) barcodeInput.value = variant.barcode || "";

  const minInput = document.getElementById("variant-min-stock");
  if (minInput) minInput.value = String(variant.minStockLevel ?? 10);

  const submitBtn = document.getElementById("variant-submit-btn");
  if (submitBtn) submitBtn.textContent = "Update Variant";

  const cancelBtn = document.getElementById("variant-cancel-edit-btn");
  if (cancelBtn) cancelBtn.classList.remove("hidden");
}

async function deleteProductVariantFromModal(variantId) {
  const productId = document.getElementById("variant-product-id")?.value;
  if (!productId || !variantId) return;

  const ok = window.confirm(
    "Are you sure you want to delete this variant? This cannot be undone."
  );
  if (!ok) return;

  try {
    await makeAuthenticatedRequest(
      `${window.API_BASE_URL}/products/${productId}/variants/${variantId}`,
      {
        method: "DELETE",
      }
    );

    showSuccessMessage("Variant deleted successfully");
    resetVariantFormMode();
    await loadProductVariants(productId);
    await loadProductsFromAPI();
    loadProductsData();
  } catch (error) {
    showErrorMessage("Failed to delete variant: " + error.message);
  }
}

async function loadProductVariants(productId) {
  const response = await makeAuthenticatedRequest(
    `${window.API_BASE_URL}/products/${productId}/variants`
  );

  const payload = response.data || {};
  currentVariantModalProduct = {
    product: payload.product,
    variants: payload.variants || [],
  };

  const productNameEl = document.getElementById("variant-modal-product-name");
  if (productNameEl) {
    productNameEl.textContent = payload.product?.productName || "Product";
  }

  const hiddenProductId = document.getElementById("variant-product-id");
  if (hiddenProductId) hiddenProductId.value = productId;

  renderVariantSpecFields(payload.product || {});
  renderProductVariantsTable(payload.variants || []);
}

async function openProductVariantsModal(productId) {
  const modal = document.getElementById("product-variants-modal");
  if (!modal) return;

  modal.classList.remove("hidden");
  renderProductVariantsTable([]);

  try {
    await loadProductVariants(productId);
  } catch (error) {
    showErrorMessage("Failed to load product variants: " + error.message);
  }

  if (typeof feather !== "undefined") feather.replace();
}

function closeProductVariantsModal() {
  const modal = document.getElementById("product-variants-modal");
  if (modal) modal.classList.add("hidden");

  const form = document.getElementById("add-variant-form");
  if (form) form.reset();
  resetVariantFormMode();

  const tbody = document.getElementById("product-variants-table-body");
  if (tbody) {
    tbody.innerHTML =
      '<tr><td colspan="5" class="px-4 py-6 text-center text-gray-400">Select a product to view variants</td></tr>';
  }

  currentVariantModalProduct = null;
}

async function handleAddVariant(event) {
  event.preventDefault();

  const productId = document.getElementById("variant-product-id")?.value;
  if (!productId) {
    showErrorMessage("Please select a product first");
    return;
  }

  const { specifications, variantName } = collectVariantSpecificationsFromForm();
  const productForSpecs =
    currentVariantModalProduct?.product ||
    (allProducts || []).find((p) => Number(p.id) === Number(productId));
  const requiresSpecs = hasVariantSpecFields(productForSpecs);

  if (requiresSpecs && !Object.keys(specifications).length) {
    showErrorMessage("Please enter variant specification values");
    return;
  }
  if (!requiresSpecs && !variantName) {
    showErrorMessage("Please enter a variant name");
    return;
  }

  const barcode =
    document.getElementById("variant-barcode")?.value?.trim() || null;
  const minStockRaw = document.getElementById("variant-min-stock")?.value;
  const minStockParsed = parseInt(minStockRaw, 10);
  const minStockLevel =
    minStockRaw === "" || minStockRaw === undefined || Number.isNaN(minStockParsed)
      ? 10
      : minStockParsed;
  const editVariantId = document.getElementById("variant-edit-id")?.value;
  const isEditMode = !!editVariantId;

  try {
    const endpoint = isEditMode
      ? `${window.API_BASE_URL}/products/${productId}/variants/${editVariantId}`
      : `${window.API_BASE_URL}/products/${productId}/variants`;

    await makeAuthenticatedRequest(endpoint, {
      method: isEditMode ? "PUT" : "POST",
      body: JSON.stringify({
        specifications,
        variantName,
        barcode,
        minStockLevel,
      }),
    });

    showSuccessMessage(
      isEditMode ? "Variant updated successfully" : "Variant added successfully"
    );

    resetVariantFormMode();

    await loadProductVariants(productId);
    await loadProductsFromAPI();
    loadProductsData();
  } catch (error) {
    showErrorMessage(
      `Failed to ${isEditMode ? "update" : "add"} variant: ` + error.message
    );
  }
}

function getFilteredProducts() {
  const searchTerm =
    document.getElementById("products-search")?.value.toLowerCase() || "";
  const categoryFilter =
    document.getElementById("products-category-filter")?.value || "";
  const brandFilter =
    document.getElementById("products-brand-filter")?.value || "";

  return allProducts.filter((product) => {
    const matchesSearch =
      !searchTerm ||
      (product.name && product.name.toLowerCase().includes(searchTerm)) ||
      (product.id && product.id.toString().toLowerCase().includes(searchTerm)) ||
      (product.model && product.model.toLowerCase().includes(searchTerm)) ||
      (product.brand && product.brand.toLowerCase().includes(searchTerm));

    const matchesCategory = productMatchesCategoryFilter(
      product,
      categoryFilter
    );
    const matchesBrand = !brandFilter || product.brandId == brandFilter;

    return matchesSearch && matchesCategory && matchesBrand;
  });
}

window.generateProductsContent = generateProductsContent;
window.getCatalogQuickAddModalsHtml = getCatalogQuickAddModalsHtml;
window.bindCatalogQuickAddForms = bindCatalogQuickAddForms;
window.catalogQuickAddButtonHtml = catalogQuickAddButtonHtml;
window.initializeProductsPage = initializeProductsPage;
window.switchProductTab = switchProductTab;
window.openAddProductModal = openAddProductModal;
window.closeAddProductModal = closeAddProductModal;
window.openAddCategoryModal = openAddCategoryModal;
window.handleAddSubCategoryParentChange = handleAddSubCategoryParentChange;
window.openAddBrandModal = openAddBrandModal;
window.editProduct = editProduct;
window.deleteProduct = deleteProduct;
window.updateBrandOptions = updateBrandOptions;
window.showCategorySpecifications = showCategorySpecifications;
window.handleSubcategoryChange = handleSubcategoryChange;
window.handleEditSubcategoryChange = handleEditSubcategoryChange;
window.closeAddCategoryModal = closeAddCategoryModal;
window.handleAddCategory = handleAddCategory;
window.closeAddBrandModal = closeAddBrandModal;
window.handleAddBrand = handleAddBrand;
window.closeEditProductModal = closeEditProductModal;
window.handleEditProduct = handleEditProduct;
window.updateEditBrandOptions = updateEditBrandOptions;
window.showEditCategorySpecifications = showEditCategorySpecifications;
window.editBrand = editBrand;
window.deleteBrand = deleteBrand;
window.editCategory = editCategory;
window.deleteCategory = deleteCategory;
window.closeEditCategoryModal = closeEditCategoryModal;
window.handleEditSubCategoryParentChange = handleEditSubCategoryParentChange;
window.handleEditCategory = handleEditCategory;
window.closeEditBrandModal = closeEditBrandModal;
window.handleEditBrand = handleEditBrand;
// Main category modal exports
window.openAddMainCategoryModal = openAddMainCategoryModal;
window.closeAddMainCategoryModal = closeAddMainCategoryModal;
window.handleAddMainCategory = handleAddMainCategory;
window.editMainCategory = editMainCategory;
window.closeEditMainCategoryModal = closeEditMainCategoryModal;
window.handleEditMainCategory = handleEditMainCategory;
window.openProductVariantsModal = openProductVariantsModal;
window.closeProductVariantsModal = closeProductVariantsModal;
window.handleAddVariant = handleAddVariant;
window.startEditVariant = startEditVariant;
window.resetVariantFormMode = resetVariantFormMode;
window.deleteProductVariantFromModal = deleteProductVariantFromModal;
// Category sub-tab exports
window.switchCategorySubTab = switchCategorySubTab;
window.openAddSubCategoryModal = openAddSubCategoryModal;
// Spec builder utilities exports
window.addSpecFieldRow = addSpecFieldRow;
window.collectSpecFieldRows = collectSpecFieldRows;
window.toggleSpecOptions = toggleSpecOptions;
window.addCustomSpecField = addCustomSpecField;
// Export PDF functions to global scope
window.downloadProductsPDF = downloadProductsPDF;
window.downloadProductsXL = downloadProductsXL;
window.downloadCategoriesPDF = downloadCategoriesPDF;
window.downloadCategoriesXL = downloadCategoriesXL;
window.downloadBrandsPDF = downloadBrandsPDF;
window.downloadBrandsXL = downloadBrandsXL;
window.clearProductFilters = clearProductFilters;
window.changeProductsPage = changeProductsPage;
window.changeMainCategoriesPage = changeMainCategoriesPage;
window.changeSubCategoriesPage = changeSubCategoriesPage;
window.changeBrandsPage = changeBrandsPage;

let productVariantBarcodeDelegated = false;
function ensureProductVariantBarcodePrintDelegation() {
  if (productVariantBarcodeDelegated) return;
  const tbody = document.getElementById("product-variants-table-body");
  if (!tbody) return;
  productVariantBarcodeDelegated = true;
  tbody.addEventListener("click", (e) => {
    const btn = e.target.closest("button.js-print-variant-barcode");
    if (!btn) return;
    e.preventDefault();
    const vid = btn.getAttribute("data-vid");
    const b = btn.getAttribute("data-b");
    const n = btn.getAttribute("data-n");
    const m = btn.getAttribute("data-m");
    const p = btn.getAttribute("data-p");
    const code = b != null && b.length ? decodeURIComponent(b) : "";
    const vname = n != null && n.length ? decodeURIComponent(n) : "";
    const model = m != null && m.length ? decodeURIComponent(m) : "";
    const price = p != null && p.length ? decodeURIComponent(p) : "";
    printVariantBarcode(String(vid || ""), code, vname, model, price);
  });
}

function printVariantBarcode(variantId, barcode, variantName, modelNumber, price) {
  const code = barcode != null ? String(barcode).trim() : "";
  if (!code) {
    showErrorMessage("No barcode available to print");
    return;
  }

  const model = String(modelNumber || "").trim();
  const vname = String(variantName || "").trim();
  const priceNum = price != null && String(price).trim() !== "" ? Number(price) : null;
  const priceText =
    priceNum != null && !Number.isNaN(priceNum)
      ? `Rs.${priceNum.toLocaleString()}`
      : "";

  const codeJson = JSON.stringify(code);
  const shopJson = JSON.stringify("Thilina Mobile Solution");
  const modelJson = JSON.stringify(model);
  const variantJson = JSON.stringify(vname);
  const priceJson = JSON.stringify(priceText);

  const htmlContent = "<!DOCTYPE html><html><head><meta charset=\"utf-8\" /><title>Print Barcode</title>" +
      "<style>" +
      "body{margin:0;padding:16px;text-align:center;font-family:Arial,Helvetica,sans-serif;color:#111;}" +
      ".label{border:1px solid #ccc;padding:16px 20px;display:inline-block;min-width:220px;}" +
      ".shop{font-size:15px;font-weight:700;margin-bottom:6px;letter-spacing:0.02em;}" +
      ".meta{font-size:12px;margin-bottom:4px;color:#222;}" +
      ".meta .model{font-weight:600;}" +
      ".meta .variant{margin-top:2px;}" +
      ".barcode-value{margin-top:6px;font-size:13px;letter-spacing:2px;font-family:Consolas,monospace;}" +
      ".price{margin-top:8px;font-size:14px;font-weight:700;}" +
      "@media print{body{padding:0;}.label{border:none;}}" +
      "</style></head><body>" +
      "<div class=\"label\">" +
      "<div class=\"shop\" id=\"shop\"></div>" +
      "<div class=\"meta\" id=\"meta\"></div>" +
      "<svg id=\"bcsvg\"></svg>" +
      "<div class=\"barcode-value\" id=\"bv\"></div>" +
      "<div class=\"price\" id=\"pr\"></div>" +
      "</div>" +
      "<script>(function(){" +
      "var code=" +
      codeJson +
      ";var shop=" +
      shopJson +
      ";var model=" +
      modelJson +
      ";var variant=" +
      variantJson +
      ";var price=" +
      priceJson +
      ";" +
      "document.getElementById('shop').textContent=shop;" +
      "var meta=document.getElementById('meta');" +
      "var esc=function(t){return String(t||'').replace(/</g,'&lt;');};" +
      "var specValues=function(t){" +
      "var s=String(t||'').trim();if(!s)return'';" +
      "return s.split(/\\s+-\\s+/).map(function(p){" +
      "var m=p.match(/:\\s*(.+)$/);" +
      "return (m?m[1]:p).trim();" +
      "}).filter(Boolean).join(' - ');" +
      "};" +
      "var specs=specValues(variant);" +
      "var line='';" +
      "if(model&&specs)line=esc(model)+': '+esc(specs);" +
      "else if(model)line=esc(model);" +
      "else if(specs)line=esc(specs);" +
      "meta.innerHTML=line?'<div class=\"model\">'+line+'</div>':'';" +
      "document.getElementById('bv').textContent=code;" +
      "document.getElementById('pr').textContent=price;" +
      "var s=document.createElement('script');" +
      "s.src='https://cdn.jsdelivr.net/npm/jsbarcode@3.11.0/dist/JsBarcode.all.min.js';" +
      "s.onload=function(){try{if(typeof JsBarcode!=='undefined'){JsBarcode('#bcsvg',code,{format:'CODE128',lineColor:'#000',width:2,height:48,displayValue:false,margin:4});}}catch(e){console.error(e);}setTimeout(function(){window.print();},350);};" +
      "s.onerror=function(){alert('Could not load barcode library.');};" +
      "document.head.appendChild(s);" +
      "})();<\/script></body></html>";

  if (typeof printHtmlContent === "function") {
    printHtmlContent(htmlContent);
  } else {
    const w = window.open("", "_blank");
    if (w && w.document) {
      w.document.open();
      w.document.write(htmlContent);
      w.document.close();
      w.focus();
    }
  }
}
window.printVariantBarcode = printVariantBarcode;
window.ensureProductVariantBarcodePrintDelegation = ensureProductVariantBarcodePrintDelegation;
