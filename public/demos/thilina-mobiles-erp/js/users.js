// User Management Module
let usersData = [];
let userRolesData = [];
let filteredUsers = [];

// API Configuration (use single global base URL to avoid redeclaration)
window.API_BASE_URL = window.API_BASE_URL || "http://localhost:3000/api";

const PASSWORD_RULE_MESSAGE =
  "Password must be at least 8 characters and include uppercase, lowercase, and a number";

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function isStrongPassword(password) {
  return (
    typeof password === "string" &&
    password.length >= 8 &&
    /(?=.*\d)/.test(password) &&
    /(?=.*[a-z])/.test(password) &&
    /(?=.*[A-Z])/.test(password)
  );
}

function isCurrentUserAdmin() {
  try {
    const raw = sessionStorage.getItem("user") || localStorage.getItem("user");
    if (!raw) return false;
    const user = JSON.parse(raw);
    const role = String(user?.userRoleName || user?.role || "")
      .trim()
      .toLowerCase();
    return role === "admin" || role === "administrator";
  } catch (e) {
    return false;
  }
}

function initializeUsersModule() {
  initializeUsersPage();
}

function generateUsersContent() {
  return `
    <div class="content-fade-in p-6">
      <!-- Page Header -->
      <div class="bg-white border-b border-gray-200 px-6 py-4 -m-6 mb-6">
        <div class="flex justify-between items-center">
          <div>
            <h1 class="text-2xl font-bold text-gray-900">User Management</h1>
            <p class="text-gray-600 mt-1">Manage system users, roles, and permissions</p>
          </div>
          <div class="flex space-x-3">
            <button id="users-add-btn" onclick="openAddUserModal()" class="btn-primary px-4 py-2 text-white rounded-lg flex items-center">
              <i data-feather="plus" class="w-4 h-4 mr-2"></i>
              Add User
            </button>
          </div>
        </div>
      </div>

      <!-- User Stats -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div class="card p-6">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-gray-600 text-sm">Total Users</p>
              <p class="text-3xl font-bold text-gray-800" id="total-users">0</p>
            </div>
            <div class="bg-blue-100 p-3 rounded-full">
              <i data-feather="users" class="w-6 h-6 text-blue-600"></i>
            </div>
          </div>
        </div>
        <div class="card p-6">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-gray-600 text-sm">Administrators</p>
              <p class="text-3xl font-bold text-purple-600" id="admin-count">0</p>
            </div>
            <div class="bg-purple-100 p-3 rounded-full">
              <i data-feather="shield" class="w-6 h-6 text-purple-600"></i>
            </div>
          </div>
        </div>
        <div class="card p-6">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-gray-600 text-sm">Active Users</p>
              <p class="text-3xl font-bold text-green-600" id="active-count">0</p>
            </div>
            <div class="bg-green-100 p-3 rounded-full">
              <i data-feather="activity" class="w-6 h-6 text-green-600"></i>
            </div>
          </div>
        </div>
        <div class="card p-6">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-gray-600 text-sm">User Roles</p>
              <p class="text-3xl font-bold text-orange-600" id="roles-count">0</p>
            </div>
            <div class="bg-orange-100 p-3 rounded-full">
              <i data-feather="briefcase" class="w-6 h-6 text-orange-600"></i>
            </div>
          </div>
        </div>
      </div>

      <!-- Users Table -->
      <div class="card">
        <div class="p-6 border-b border-gray-200">
          <div class="flex w-full flex-wrap items-center gap-3">
              <div class="flex flex-wrap gap-3 items-center justify-start flex-1 min-w-0">
              <input type="text" id="users-search" placeholder="Search users..." class="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" onkeyup="filterUsers()">
              <select id="users-role-filter" class="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" onchange="filterUsers()">
                <option value="">All Roles</option>
              </select>
              <select id="users-status-filter" class="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" onchange="filterUsers()">
                <option value="">All Status</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
              <button type="button" onclick="clearUsersFilters()" class="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50">Clear</button>
              </div>
              <div class="shrink-0 ml-auto flex gap-2">
              <button onclick="downloadUsersPDF()" class="btn-secondary px-4 py-2 rounded-lg flex items-center">
                <i data-feather="download" class="w-4 h-4 mr-2"></i>
                PDF
              </button>
              <button onclick="downloadUsersXL()" class="btn-secondary px-4 py-2 rounded-lg flex items-center" title="Opens in Excel">
                <i data-feather="file-text" class="w-4 h-4 mr-2"></i>
                XL
              </button>
              </div>
          </div>
        </div>
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Login</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody id="users-table-body" class="bg-white divide-y divide-gray-200">
              <!-- Users will be populated here -->
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Add User Modal -->
    <div id="add-user-modal" class="modal fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center hidden z-50">
      <div class="modal-content bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div class="flex justify-between items-center p-6 border-b border-gray-200">
          <h3 class="text-lg font-semibold text-gray-900">Add New User</h3>
          <button onclick="closeAddUserModal()" class="text-gray-400 hover:text-gray-600">
            <i data-feather="x" class="w-6 h-6"></i>
          </button>
        </div>
        <form id="add-user-form" onsubmit="handleAddUser(event)" class="p-6 space-y-4">
          <div>
            <!-- Employee selector: search and choose existing employee to create user for -->
            <label class="block text-sm font-medium text-gray-700 mb-2">Employee (optional)</label>
            <input type="text" id="user-employee-search" autocomplete="off" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="Search employee by name, email or ID" oninput="searchUserEmployees()">
            <input type="hidden" id="user-employee-id">
            <div id="user-employee-results" class="bg-white border border-gray-200 rounded mt-1 max-h-40 overflow-y-auto hidden"></div>

            <label class="block text-sm font-medium text-gray-700 mb-2 mt-4">Username</label>
            <input type="text" id="user-username" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" required placeholder="e.g., thilina.p">
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Password</label>
            <input type="password" id="user-password" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" required minlength="8" placeholder="Min 8 chars, upper, lower, number">
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Role</label>
              <select id="user-role" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" required>
                <option value="">Select Role</option>
                <!-- Roles will be populated dynamically -->
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select id="user-status" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" required>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>
          <div class="flex justify-end space-x-3 pt-4">
            <button type="button" onclick="closeAddUserModal()" class="btn-secondary px-4 py-2">Cancel</button>
            <button type="submit" class="btn-primary px-4 py-2 text-white">Add User</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Edit User Modal -->
    <div id="edit-user-modal" class="modal fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center hidden z-50">
      <div class="modal-content bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div class="flex justify-between items-center p-6 border-b border-gray-200">
          <h3 class="text-lg font-semibold text-gray-900">Edit User</h3>
          <button onclick="closeEditUserModal()" class="text-gray-400 hover:text-gray-600">
            <i data-feather="x" class="w-6 h-6"></i>
          </button>
        </div>
        <form id="edit-user-form" onsubmit="handleEditUser(event)" class="p-6 space-y-4">
          <input type="hidden" id="edit-user-id">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Username</label>
            <input type="text" id="edit-user-username" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" required>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">New Password (optional)</label>
            <input type="password" id="edit-user-password" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" minlength="8" placeholder="Leave blank to keep current password">
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Role</label>
              <select id="edit-user-role" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" required>
                <option value="">Select Role</option>
                <!-- Roles will be populated dynamically -->
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select id="edit-user-status" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" required>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>
          <div class="flex justify-end space-x-3 pt-4">
            <button type="button" onclick="closeEditUserModal()" class="btn-secondary px-4 py-2">Cancel</button>
            <button type="submit" class="btn-primary px-4 py-2 text-white">Update User</button>
          </div>
        </form>
      </div>
    </div>

    <!-- User Details Modal -->
    <div id="user-details-modal" class="modal fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center hidden z-50">
      <div class="modal-content bg-white rounded-lg shadow-xl max-w-lg w-full mx-4">
        <div class="flex justify-between items-center p-6 border-b border-gray-200">
          <h3 class="text-lg font-semibold text-gray-900">User Details</h3>
          <button onclick="closeUserDetailsModal()" class="text-gray-400 hover:text-gray-600">
            <i data-feather="x" class="w-6 h-6"></i>
          </button>
        </div>
        <div id="user-details-content" class="p-6">
          <!-- User details will be populated here -->
        </div>
      </div>
    </div>
  `;
}

async function loadUsersData() {
  try {
    // Show loading state
    showLoadingState();
    // If there's no auth token, avoid calling protected APIs.
    const token = getAuthToken();
    if (!token) {
      // If the app is running in demo mode (session user present), show a friendly message and load no remote data.
      if (sessionStorage.getItem("user")) {
        console.warn(
          "No auth token found; running in demo/offline mode. Skipping API calls."
        );
        showNotification(
          "Running in demo/offline mode (no auth token).",
          "warning"
        );
        usersData = [];
        userRolesData = [];
        filteredUsers = [];
        renderUsersTable();
        updateUserStats();
        hideLoadingState();
        return;
      }

      // Not authenticated — prompt login and stop further requests
      console.warn("No auth token found; user must login.");
      showNotification(
        "Not authenticated. Please login to load users.",
        "error"
      );
      hideLoadingState();
      return;
    }

    // Fetch users and roles concurrently
    const [usersResponse, rolesResponse] = await Promise.all([
      fetchUsers(),
      fetchUserRoles(),
    ]);

    usersData = usersResponse.success ? usersResponse.data || [] : [];
    userRolesData = rolesResponse.success ? rolesResponse.data || [] : [];

    // Update role filter dropdown and modal dropdowns with real roles
    updateRoleFilterDropdown();
    updateRoleDropdowns();

    filteredUsers = [...usersData];
    filterUsers();
    updateUserStats();
    hideLoadingState();
  } catch (error) {
    console.error("Error loading users data:", error);
    showNotification("Error loading user data", "error");
    hideLoadingState();

    // Fallback to empty arrays
    usersData = [];
    userRolesData = [];
    filteredUsers = [];
    renderUsersTable();
    updateUserStats();
  }
}

// API Functions
async function fetchUsers(filters = {}) {
  try {
    const token = getAuthToken();
    const queryParams = new URLSearchParams();

    // Add filters to query params
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        queryParams.append(key, value);
      }
    });

    const url = `${window.API_BASE_URL}/users${
      queryParams.toString() ? "?" + queryParams.toString() : ""
    }`;

    if (!token) {
      // No token available — treat as unauthorized
      return {
        success: false,
        status: 401,
        message: "Unauthorized: missing auth token",
      };
    }

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    // Try to parse JSON body (some endpoints return raw arrays)
    let body = null;
    try {
      body = await response.json();
    } catch (e) {
      body = null;
    }

    if (!response.ok) {
      if (response.status === 401) handleUnauthorized();
      return {
        success: false,
        status: response.status,
        message:
          (body && (body.message || body.error)) ||
          response.statusText ||
          "Failed to fetch users",
      };
    }

    // Normalize different backend shapes: raw array or { success, data }
    if (Array.isArray(body)) return { success: true, data: body };
    if (body && typeof body === "object") {
      if (body.success !== undefined)
        return {
          success: !!body.success,
          data: body.data,
          message: body.message,
        };
      // If object but not wrapped, assume it's the payload
      return { success: true, data: body };
    }

    return { success: true, data: [] };
  } catch (error) {
    console.error("Error fetching users:", error);
    return { success: false, message: error.message };
  }
}

async function fetchUserRoles() {
  try {
    const token = getAuthToken();
    if (!token) {
      return {
        success: false,
        status: 401,
        message: "Unauthorized: missing auth token",
      };
    }

    const response = await fetch(`${window.API_BASE_URL}/user-roles`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    let body = null;
    try {
      body = await response.json();
    } catch (e) {
      body = null;
    }

    if (!response.ok) {
      if (response.status === 401) handleUnauthorized();
      return {
        success: false,
        status: response.status,
        message: (body && (body.message || body.error)) || response.statusText,
      };
    }

    if (Array.isArray(body)) return { success: true, data: body };
    if (body && typeof body === "object") {
      if (body.success !== undefined)
        return {
          success: !!body.success,
          data: body.data,
          message: body.message,
        };
      return { success: true, data: body };
    }

    return { success: true, data: [] };
  } catch (error) {
    console.error("Error fetching user roles:", error);
    return { success: false, message: error.message };
  }
}

async function createUserAPI(userData) {
  try {
    const token = getAuthToken();
    const response = await fetch(`${window.API_BASE_URL}/users`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(userData),
    });
    let body = null;
    try {
      body = await response.json();
    } catch (e) {
      body = null;
    }

    if (!response.ok) {
      if (response.status === 401) handleUnauthorized();
      return {
        success: false,
        status: response.status,
        message: (body && (body.message || body.error)) || response.statusText,
      };
    }

    if (body && typeof body === "object") {
      if (body.success !== undefined)
        return {
          success: !!body.success,
          data: body.data,
          message: body.message,
        };
      return { success: true, data: body };
    }

    return { success: true, data: body };
  } catch (error) {
    console.error("Error creating user:", error);
    return { success: false, message: error.message };
  }
}

async function updateUserAPI(userId, userData) {
  try {
    const token = getAuthToken();
    const response = await fetch(`${window.API_BASE_URL}/users/${userId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(userData),
    });
    let body = null;
    try {
      body = await response.json();
    } catch (e) {
      body = null;
    }

    if (!response.ok) {
      if (response.status === 401) handleUnauthorized();
      return {
        success: false,
        status: response.status,
        message: (body && (body.message || body.error)) || response.statusText,
      };
    }

    if (body && typeof body === "object") {
      if (body.success !== undefined)
        return {
          success: !!body.success,
          data: body.data,
          message: body.message,
        };
      return { success: true, data: body };
    }

    return { success: true, data: body };
  } catch (error) {
    console.error("Error updating user:", error);
    return { success: false, message: error.message };
  }
}

function handleUnauthorized() {
  localStorage.removeItem("authToken");
  sessionStorage.removeItem("authToken");
  localStorage.removeItem("user");
  sessionStorage.removeItem("user");
  showNotification(
    "Session expired or unauthorized. Please login again.",
    "error"
  );
  setTimeout(() => {
    window.location.href = "login.html";
  }, 800);
}

// Helper functions
function getAuthToken() {
  // Get token from localStorage or sessionStorage
  return (
    localStorage.getItem("authToken") ||
    sessionStorage.getItem("authToken") ||
    ""
  );
}

function showLoadingState() {
  const tableBody = document.getElementById("users-table-body");
  if (tableBody) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="5" class="px-6 py-12 text-center">
          <div class="flex flex-col items-center">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
            <p class="text-gray-500">Loading users...</p>
          </div>
        </td>
      </tr>
    `;
  }
}

function hideLoadingState() {
  // Loading state will be replaced by renderUsersTable()
}

function updateRoleFilterDropdown() {
  const roleFilter = document.getElementById("users-role-filter");
  if (roleFilter) {
    // Clear existing options except "All Roles"
    roleFilter.innerHTML = '<option value="">All Roles</option>';

    // Add roles from API
    userRolesData.forEach((role) => {
      const option = document.createElement("option");
      option.value = role.id || role.roleId; // use id for filtering
      option.textContent = role.name || role.roleName;
      roleFilter.appendChild(option);
    });
  }
}

function updateRoleDropdowns() {
  // Update Add User modal role dropdown
  const addRoleSelect = document.getElementById("user-role");
  if (addRoleSelect) {
    // Clear existing options except the first one
    addRoleSelect.innerHTML = '<option value="">Select Role</option>';

    // Add roles from API
    userRolesData.forEach((role) => {
      const option = document.createElement("option");
      option.value = role.id || role.roleId;
      option.textContent = role.name || role.roleName;
      addRoleSelect.appendChild(option);
    });
  }

  // Update Edit User modal role dropdown
  const editRoleSelect = document.getElementById("edit-user-role");
  if (editRoleSelect) {
    // Clear existing options except the first one
    editRoleSelect.innerHTML = '<option value="">Select Role</option>';

    // Add roles from API
    userRolesData.forEach((role) => {
      const option = document.createElement("option");
      option.value = role.id || role.roleId;
      option.textContent = role.name || role.roleName;
      editRoleSelect.appendChild(option);
    });
  }
}

function renderUsersTable() {
  const tableBody = document.getElementById("users-table-body");
  if (!tableBody) return;

  if (filteredUsers.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="5" class="px-6 py-12 text-center">
          <div class="flex flex-col items-center">
            <i data-feather="users" class="w-12 h-12 text-gray-400 mb-2"></i>
            <p class="text-gray-500">No users found</p>
          </div>
        </td>
      </tr>
    `;
    if (typeof feather !== "undefined") {
      feather.replace();
    }
    return;
  }

  tableBody.innerHTML = filteredUsers
    .map((user) => {
      // Handle different API response structures
      const username = user.username || user.userName || "";
      const email =
        user.Employee?.email || user.employee?.email || user.email || "";
      const employeeName = user.Employee
        ? `${user.Employee.firstName || ""} ${
            user.Employee.lastName || ""
          }`.trim()
        : user.employee
        ? `${user.employee.firstName || ""} ${
            user.employee.lastName || ""
          }`.trim()
        : "";
      const employeeId =
        user.Employee?.id || user.employee?.id || user.employeeId || "";

      // Resolve role name from userRoleId when possible
      const roleIdFromUser =
        user.userRoleId ??
        user.userRole?.id ??
        user.UserRole?.id ??
        user.userRoleId;
      let roleName = "";
      if (roleIdFromUser) {
        const roleObj = userRolesData.find(
          (r) => Number(r.id) === Number(roleIdFromUser)
        );
        roleName = roleObj?.name || roleObj?.roleName || "";
      }
      // Fallbacks for different API shapes
      if (!roleName) {
        roleName =
          user.UserRole?.name ||
          user.UserRole?.roleName ||
          user.userRole?.name ||
          user.userRole?.roleName ||
          user.role ||
          user.roleName ||
          "";
      }

      // Resolve status name from statusId when possible
      const statusIdFromUser =
        user.statusId ??
        user.status?.id ??
        user.UserStatus?.id ??
        user.userStatusId ??
        user.statusId;
      let statusName = "";
      if (statusIdFromUser !== undefined && statusIdFromUser !== null) {
        // Common mapping
        if (Number(statusIdFromUser) === 1) statusName = "Active";
        else if (Number(statusIdFromUser) === 2) statusName = "Inactive";
        else statusName = user.status?.name || user.statusName || "";
      }
      if (!statusName) {
        statusName =
          user.UserStatus?.statusName ||
          user.userStatus?.statusName ||
          user.status ||
          user.statusName ||
          "";
      }

      // Create initials
      const initials = username
        ? username.slice(0, 2).toUpperCase()
        : employeeName
        ? employeeName
            .split(" ")
            .map((n) => n.charAt(0))
            .join("")
            .slice(0, 2)
            .toUpperCase()
        : "UN";

      // Status colors
      const statusColor =
        statusName === "Active" || statusName === "1"
          ? "bg-green-100 text-green-800"
          : "bg-red-100 text-red-800";

      // Role colors
      const roleColors = {
        Administrator: "bg-purple-100 text-purple-800",
        Admin: "bg-purple-100 text-purple-800",
        Manager: "bg-blue-100 text-blue-800",
        Cashier: "bg-green-100 text-green-800",
        Accountant: "bg-yellow-100 text-yellow-800",
      };

      // Display name priority: employeeName > username > email
      const displayName = employeeName || username || email || "Unknown User";

      // Format last login or join date using lastLoginAt
      const rawLastLogin =
        user.lastLoginAt || user.lastLogin || user.updatedAt || user.updatedAt;
      const lastLoginDisplay = rawLastLogin
        ? new Date(rawLastLogin).toLocaleString()
        : user.createdAt
        ? formatRelativeTime(user.createdAt)
        : "Never";

      const safeDisplayName = escapeHtml(displayName);
      const safeUsername = escapeHtml(username);
      const safeEmployeeId = escapeHtml(employeeId);
      const safeEmail = escapeHtml(email);
      const safeRoleName = escapeHtml(roleName);
      const safeStatusName = escapeHtml(statusName);
      const safeLastLogin = escapeHtml(lastLoginDisplay);
      const isActive =
        statusName === "Active" ||
        statusName === "1" ||
        Number(statusIdFromUser) === 1;
      const canManage = isCurrentUserAdmin();

      return `
        <tr class="hover:bg-gray-50">
          <td class="px-6 py-4 whitespace-nowrap">
            <div class="flex items-center">
              <div class="h-10 w-10 flex-shrink-0">
                <div class="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <span class="text-blue-600 font-medium">${escapeHtml(initials)}</span>
                </div>
              </div>
              <div class="ml-4">
                <div class="text-sm font-medium text-gray-900">${safeDisplayName}</div>
                ${
                  username
                    ? `<div class="text-sm text-gray-500">@${safeUsername}</div>`
                    : ""
                }
                ${
                  employeeId
                    ? `<div class="text-sm text-gray-500">ID: ${safeEmployeeId}</div>`
                    : ""
                }
                ${
                  email
                    ? `<div class="text-sm text-gray-500">${safeEmail}</div>`
                    : ""
                }
              </div>
            </div>
          </td>
          <td class="px-6 py-4 whitespace-nowrap">
            <span class="px-2 py-1 text-xs font-semibold rounded-full ${
              roleColors[roleName] || "bg-gray-100 text-gray-800"
            }">${safeRoleName}</span>
          </td>
          <td class="px-6 py-4 whitespace-nowrap">
            <span class="px-2 py-1 text-xs font-semibold rounded-full ${statusColor}">${safeStatusName}</span>
          </td>
          <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">${safeLastLogin}</td>
          <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
            <button onclick="viewUserDetails(${
              user.id
            })" class="text-blue-600 hover:text-blue-900 mr-3 p-1 rounded" title="View Details">
              <i data-feather="eye" class="w-4 h-4"></i>
            </button>
            ${
              canManage
                ? `<button onclick="editUser(${
                    user.id
                  })" class="text-green-600 hover:text-green-900 mr-3 p-1 rounded" title="Edit User">
              <i data-feather="edit" class="w-4 h-4"></i>
            </button>
            <button onclick="toggleUserActiveStatus(${user.id})" class="${
                    isActive
                      ? "text-orange-600 hover:text-orange-900"
                      : "text-emerald-600 hover:text-emerald-900"
                  } p-1 rounded" title="${
                    isActive ? "Deactivate User" : "Activate User"
                  }">
              <i data-feather="${
                isActive ? "user-x" : "user-check"
              }" class="w-4 h-4"></i>
            </button>`
                : ""
            }
          </td>
        </tr>
      `;
    })
    .join("");

  if (typeof feather !== "undefined") {
    feather.replace();
  }
}

// Helper function to format relative time
function formatRelativeTime(dateString) {
  if (!dateString) return "Never";

  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMinutes = Math.floor(diffMs / (1000 * 60));

  if (diffDays > 0) {
    return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
  } else if (diffHours > 0) {
    return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
  } else if (diffMinutes > 0) {
    return `${diffMinutes} minute${diffMinutes > 1 ? "s" : ""} ago`;
  } else {
    return "Just now";
  }
}

function updateUserStats() {
  const totalUsers = usersData.length;

  // Count administrators by role id (prefer id-based lookup)
  const adminRole = userRolesData.find((r) =>
    (r.name || r.roleName || "").toLowerCase().includes("admin")
  );
  const adminRoleId = adminRole ? adminRole.id || adminRole.roleId : null;
  const adminCount = usersData.filter((user) => {
    const uidRoleId =
      user.userRoleId ??
      user.userRole?.id ??
      user.UserRole?.id ??
      user.userRoleId;
    return adminRoleId
      ? Number(uidRoleId) === Number(adminRoleId)
      : (
          user.UserRole?.roleName ||
          user.userRole?.roleName ||
          user.role ||
          user.roleName ||
          ""
        )
          .toLowerCase()
          .includes("admin");
  }).length;

  // Count active users via statusId / status.name
  const activeCount = usersData.filter((user) => {
    const uidStatusId =
      user.statusId ??
      user.status?.id ??
      user.UserStatus?.id ??
      user.userStatusId;
    const statusName =
      (typeof user.status === "object" && user.status?.name) ||
      user.UserStatus?.statusName ||
      user.userStatus?.statusName ||
      user.statusName ||
      (typeof user.status === "string" ? user.status : "");
    return Number(uidStatusId) === 1 || statusName === "Active";
  }).length;

  const rolesCount = userRolesData.length;

  const totalElement = document.getElementById("total-users");
  const adminElement = document.getElementById("admin-count");
  const activeElement = document.getElementById("active-count");
  const rolesElement = document.getElementById("roles-count");

  if (totalElement) totalElement.textContent = totalUsers;
  if (adminElement) adminElement.textContent = adminCount;
  if (activeElement) activeElement.textContent = activeCount;
  if (rolesElement) rolesElement.textContent = rolesCount;
}

function clearUsersFilters() {
  const s = document.getElementById("users-search");
  if (s) s.value = "";
  const r = document.getElementById("users-role-filter");
  if (r) r.value = "";
  const st = document.getElementById("users-status-filter");
  if (st) st.value = "";
  filteredUsers = [...usersData];
  renderUsersTable();
}

function filterUsers() {
  const searchTerm =
    document.getElementById("users-search")?.value.toLowerCase() || "";
  const roleFilter = document.getElementById("users-role-filter")?.value || "";
  const statusFilter =
    document.getElementById("users-status-filter")?.value || "";

  // parse numeric filters if provided
  const roleFilterId = roleFilter ? Number(roleFilter) : null;
  const statusFilterName = statusFilter || null;

  filteredUsers = usersData.filter((user) => {
    // Handle search across multiple fields with different API structures
    const username = user.username || user.userName || "";
    const email =
      user.Employee?.email || user.employee?.email || user.email || "";
    const employeeName = user.Employee
      ? `${user.Employee.firstName || ""} ${
          user.Employee.lastName || ""
        }`.trim()
      : user.employee
      ? `${user.employee.firstName || ""} ${
          user.employee.lastName || ""
        }`.trim()
      : "";
    const employeeId = String(
      user.Employee?.id || user.employee?.id || user.employeeId || ""
    );

    const matchesSearch =
      !searchTerm ||
      username.toLowerCase().includes(searchTerm) ||
      email.toLowerCase().includes(searchTerm) ||
      employeeName.toLowerCase().includes(searchTerm) ||
      employeeId.toLowerCase().includes(searchTerm);

    // Handle role filtering by id when possible
    const uidRoleId =
      user.userRoleId ??
      user.userRole?.id ??
      user.UserRole?.id ??
      user.userRoleId;
    const matchesRole =
      !roleFilterId || Number(uidRoleId) === Number(roleFilterId);

    // Handle status filtering (statusFilter is a name like 'Active'/'Inactive')
    const uidStatusId =
      user.statusId ??
      user.status?.id ??
      user.UserStatus?.id ??
      user.userStatusId ??
      user.statusId;
    const uidStatusName =
      uidStatusId !== undefined && uidStatusId !== null
        ? Number(uidStatusId) === 1
          ? "Active"
          : Number(uidStatusId) === 2
          ? "Inactive"
          : user.status?.name || user.statusName || ""
        : user.status || user.statusName || "";
    const matchesStatus =
      !statusFilterName || uidStatusName === statusFilterName;

    return matchesSearch && matchesRole && matchesStatus;
  });

  renderUsersTable();
}

function openAddUserModal() {
  if (!isCurrentUserAdmin()) {
    showNotification("Only Admin can add users", "error");
    return;
  }
  // Ensure role dropdowns are populated
  updateRoleDropdowns();

  document.getElementById("add-user-modal").classList.remove("hidden");
  if (typeof feather !== "undefined") {
    feather.replace();
  }
}

function closeAddUserModal() {
  document.getElementById("add-user-modal").classList.add("hidden");
  document.getElementById("add-user-form").reset();
}

function openEditUserModal() {
  // Populate role dropdowns only if roles are not already loaded
  if (!userRolesData || userRolesData.length === 0) updateRoleDropdowns();

  document.getElementById("edit-user-modal").classList.remove("hidden");
  if (typeof feather !== "undefined") {
    feather.replace();
  }
}

function closeEditUserModal() {
  document.getElementById("edit-user-modal").classList.add("hidden");
  document.getElementById("edit-user-form").reset();
  const passwordField = document.getElementById("edit-user-password");
  if (passwordField) passwordField.value = "";
}

function openUserDetailsModal() {
  document.getElementById("user-details-modal").classList.remove("hidden");
  if (typeof feather !== "undefined") {
    feather.replace();
  }
}

function closeUserDetailsModal() {
  document.getElementById("user-details-modal").classList.add("hidden");
}

async function handleAddUser(event) {
  event.preventDefault();

  const username = document.getElementById("user-username").value.trim();
  const password = document.getElementById("user-password").value.trim();
  const role = document.getElementById("user-role").value;
  const status = document.getElementById("user-status").value;
  const selectedEmployeeId = document.getElementById("user-employee-id").value;

  if (!username || !password || !role || !status) {
    showNotification("Please fill in all required fields", "error");
    return;
  }

  if (!isStrongPassword(password)) {
    showNotification(PASSWORD_RULE_MESSAGE, "error");
    return;
  }

  // Check if username already exists
  if (
    usersData.some(
      (u) =>
        (u.username || u.userName || "").toLowerCase() ===
        username.toLowerCase()
    )
  ) {
    showNotification("Username already exists", "error");
    return;
  }

  // Prepare user data for API
  const userData = {
    username,
    password,
    roleId: getRoleIdByName(role),
    statusId: getStatusIdByName(status),
    employeeId: selectedEmployeeId || null,
  };

  // Stable submit button reference and original text must be in outer scope
  const submitButton = event.target.querySelector('button[type="submit"]');
  const originalText = submitButton ? submitButton.textContent : "Add User";

  try {
    // Disable form while creating
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = "Creating...";
    }

    const response = await createUserAPI(userData);

    if (response.success) {
      showNotification(`User ${username} created successfully`, "success");
      closeAddUserModal();
      // Reload users data to get the updated list
      await loadUsersData();
    } else {
      showNotification(response.message || "Failed to create user", "error");
    }
  } catch (error) {
    console.error("Error creating user:", error);
    showNotification("Error creating user", "error");
  } finally {
    // Re-enable form and restore original text safely
    if (submitButton) {
      submitButton.disabled = false;
      submitButton.textContent = originalText;
    }
  }
}

// Helper functions to get role and status IDs
function getRoleIdByName(roleName) {
  if (!roleName && roleName !== 0) return null;
  // If an id (number or numeric string) is passed, return it
  if (typeof roleName === "number" || /^\d+$/.test(String(roleName))) {
    return Number(roleName);
  }
  const role = userRolesData.find(
    (r) =>
      (r.name || r.roleName || "").toLowerCase() ===
      String(roleName).toLowerCase()
  );
  return role ? role.id || role.roleId : null;
}

function getStatusIdByName(statusName) {
  // Map status names to IDs based on common patterns
  const statusMap = {
    Active: 1,
    Inactive: 2,
    Disabled: 2,
    Suspended: 3,
  };
  return statusMap[statusName] || 1; // Default to Active
}

// Helper to get role name by id
function getRoleNameById(roleId) {
  if (!roleId && roleId !== 0) return null;
  const r = userRolesData.find(
    (rr) =>
      String(rr.id) === String(roleId) || String(rr.roleId) === String(roleId)
  );
  return r ? r.name || r.roleName || null : null;
}

// Helper to get status name by id
function getStatusNameById(statusId) {
  if (statusId === undefined || statusId === null) return null;
  const id = Number(statusId);
  if (id === 1) return "Active";
  if (id === 2) return "Inactive";
  if (id === 3) return "Suspended";
  return null;
}

// Resolve status name from a user object with many possible shapes
function resolveStatusNameFromUser(user) {
  if (!user) return "";
  // Prefer explicit statusId
  if (user.statusId !== undefined && user.statusId !== null) {
    const name = getStatusNameById(user.statusId);
    if (name) return name;
  }
  // Check nested UserStatus
  if (user.UserStatus && (user.UserStatus.statusName || user.UserStatus.name)) {
    return user.UserStatus.statusName || user.UserStatus.name;
  }
  // Check user.status which may be object or string
  if (user.status) {
    if (typeof user.status === "string") return user.status;
    if (typeof user.status === "object")
      return (
        user.status.statusName ||
        user.status.name ||
        JSON.stringify(user.status)
      );
  }
  // Other possible fields
  if (user.userStatus && typeof user.userStatus === "object")
    return user.userStatus.statusName || user.userStatus.name || "";
  return "";
}

async function editUser(userId) {
  const user = usersData.find((u) => u.id === userId);
  if (!user) return;

  document.getElementById("edit-user-id").value = user.id;
  document.getElementById("edit-user-username").value =
    user.username || user.userName || "";

  // Ensure role data is loaded, then populate dropdowns
  if (!userRolesData || userRolesData.length === 0) {
    // try fetching roles from API
    try {
      const rolesResp = await fetchUserRoles();
      if (rolesResp && rolesResp.success && Array.isArray(rolesResp.data)) {
        userRolesData = rolesResp.data;
      }
    } catch (e) {
      console.warn("Could not load user roles before opening edit modal", e);
    }
  }
  // Populate dropdowns
  updateRoleDropdowns();
  const roleSelect = document.getElementById("edit-user-role");
  // Collect candidate ids/names from common shapes
  const candidates = [];
  if (user.userRoleId !== undefined && user.userRoleId !== null)
    candidates.push(user.userRoleId);
  if (user.roleId !== undefined && user.roleId !== null)
    candidates.push(user.roleId);
  if (user.userRole && (user.userRole.id || user.userRole.roleId))
    candidates.push(user.userRole.id || user.userRole.roleId);
  if (user.UserRole && (user.UserRole.id || user.UserRole.roleId))
    candidates.push(user.UserRole.id || user.UserRole.roleId);
  // Also try to resolve by name to id
  const nameToTry =
    user.UserRole?.name ||
    user.UserRole?.roleName ||
    user.userRoleName ||
    user.role ||
    user.roleName ||
    null;
  if (nameToTry) {
    const resolved = getRoleIdByName(nameToTry);
    if (resolved) candidates.push(resolved);
  }

  if (roleSelect) {
    let matched = false;
    const targetVal = candidates.length
      ? String(candidates[0])
      : nameToTry
      ? ""
      : "";
    // Try direct query selector by value
    try {
      if (targetVal) {
        const opt = roleSelect.querySelector(`option[value="${targetVal}"]`);
        if (opt) {
          opt.selected = true;
          roleSelect.value = opt.value;
          matched = true;
        }
      }
    } catch (e) {
      // ignore invalid selector
    }

    // If not matched, iterate candidates and options (numeric-safe)
    if (!matched) {
      for (const c of candidates) {
        if (c === undefined || c === null) continue;
        for (let i = 0; i < roleSelect.options.length; i++) {
          const opt = roleSelect.options[i];
          if (
            String(opt.value) === String(c) ||
            Number(opt.value) === Number(c)
          ) {
            opt.selected = true;
            roleSelect.selectedIndex = i;
            roleSelect.value = opt.value;
            matched = true;
            break;
          }
        }
        if (matched) break;
      }
    }

    // Fallback: match by option text
    if (!matched && nameToTry) {
      for (let i = 0; i < roleSelect.options.length; i++) {
        const opt = roleSelect.options[i];
        if (
          (opt.textContent || opt.label || "").trim().toLowerCase() ===
          String(nameToTry).trim().toLowerCase()
        ) {
          opt.selected = true;
          roleSelect.selectedIndex = i;
          roleSelect.value = opt.value;
          matched = true;
          break;
        }
      }
    }

    if (matched) {
      roleSelect.dispatchEvent(new Event("change", { bubbles: true }));
    } else {
      // Retry after a short delay in case options are added later
      setTimeout(() => {
        let retried = false;
        for (const c of candidates) {
          if (c === undefined || c === null) continue;
          const optByVal = roleSelect.querySelector(
            `option[value="${String(c)}"]`
          );
          if (optByVal) {
            optByVal.selected = true;
            roleSelect.value = optByVal.value;
            retried = true;
            break;
          }
        }
        if (!retried && nameToTry) {
          for (let i = 0; i < roleSelect.options.length; i++) {
            const opt = roleSelect.options[i];
            if (
              (opt.textContent || opt.label || "").trim().toLowerCase() ===
              String(nameToTry).trim().toLowerCase()
            ) {
              opt.selected = true;
              roleSelect.selectedIndex = i;
              roleSelect.value = opt.value;
              retried = true;
              break;
            }
          }
        }
        if (retried)
          roleSelect.dispatchEvent(new Event("change", { bubbles: true }));
      }, 50);
    }
  }

  // Determine status id/name and set the select appropriately
  const statusId =
    user.statusId ||
    user.status?.id ||
    user.UserStatus?.id ||
    getStatusIdByName(user.Status?.name || user.status || user.statusName);
  const statusSelect = document.getElementById("edit-user-status");
  if (statusSelect) {
    // If select options use numeric ids, try to set by id, otherwise set by name
    if (
      Array.from(statusSelect.options).some((o) => o.value === String(statusId))
    ) {
      statusSelect.value = String(statusId);
    } else {
      const statusName =
        getStatusNameById(statusId) ||
        user.Status?.name ||
        user.status ||
        user.statusName ||
        "";
      statusSelect.value = statusName;
    }
  }

  openEditUserModal();
}

async function handleEditUser(event) {
  event.preventDefault();

  const userId = parseInt(document.getElementById("edit-user-id").value);
  const username = document.getElementById("edit-user-username").value.trim();
  const password = document.getElementById("edit-user-password")?.value || "";
  const role = document.getElementById("edit-user-role").value;
  const status = document.getElementById("edit-user-status").value;

  if (!username || !role || !status) {
    showNotification("Please fill in all required fields", "error");
    return;
  }

  if (password.trim() && !isStrongPassword(password)) {
    showNotification(PASSWORD_RULE_MESSAGE, "error");
    return;
  }

  // Check if username already exists for other users
  if (
    usersData.some(
      (u) =>
        (u.username || u.userName || "").toLowerCase() ===
          username.toLowerCase() && u.id !== userId
    )
  ) {
    showNotification("Username already exists", "error");
    return;
  }

  // Prepare update data
  const updateData = {
    username,
    roleId: getRoleIdByName(role),
    statusId: getStatusIdByName(status),
  };
  if (password.trim()) {
    updateData.password = password.trim();
  }

  // Stable submit button reference and original text
  const submitButton = event.target.querySelector('button[type="submit"]');
  const originalText = submitButton ? submitButton.textContent : "Update User";

  try {
    // Disable form while updating
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = "Updating...";
    }

    const response = await updateUserAPI(userId, updateData);

    if (response.success) {
      showNotification(`User ${username} updated successfully`, "success");
      // Restore button state before closing
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = originalText;
      }
      closeEditUserModal();
      // Reload users data to get the updated list
      await loadUsersData();
    } else {
      showNotification(response.message || "Failed to update user", "error");
    }
  } catch (error) {
    console.error("Error updating user:", error);
    showNotification("Error updating user", "error");
  } finally {
    // Re-enable form and restore button text (in case of errors)
    const submitButtonFinal = event.target.querySelector(
      'button[type="submit"]'
    );
    if (submitButtonFinal) {
      submitButtonFinal.disabled = false;
      submitButtonFinal.textContent = originalText;
    }
  }
}

function viewUserDetails(userId) {
  const user = usersData.find((u) => u.id === userId);
  if (!user) return;

  // Extract data from API response structure
  const username = user.username || user.userName || "";
  const email =
    user.Employee?.email || user.employee?.email || user.email || "";
  const employeeName = user.Employee
    ? `${user.Employee.firstName || ""} ${user.Employee.lastName || ""}`.trim()
    : user.employee
    ? `${user.employee.firstName || ""} ${user.employee.lastName || ""}`.trim()
    : "";
  const employeeId =
    user.Employee?.id || user.employee?.id || user.employeeId || "";
  // Resolve role and status using ids when available
  const roleId =
    user.userRoleId || user.userRole?.id || user.UserRole?.id || null;
  const roleName = roleId
    ? getRoleNameById(roleId)
    : user.UserRole?.name ||
      user.UserRole?.roleName ||
      user.userRole?.name ||
      user.userRole?.roleName ||
      user.role ||
      user.roleName ||
      "";
  const statusName =
    resolveStatusNameFromUser(user) || getStatusNameById(user.statusId) || "";
  const roleDescription =
    user.UserRole?.description || user.userRole?.description || "";

  // Create initials
  const initials = username
    ? username.slice(0, 2).toUpperCase()
    : employeeName
    ? employeeName
        .split(" ")
        .map((n) => n.charAt(0))
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "UN";

  // Display name
  const displayName = employeeName || username || email || "Unknown User";

  // Format dates
  const joinDate = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString()
    : "N/A";
  const lastLogin =
    user.lastLoginAt ||
    user.lastLogin ||
    (user.updatedAt ? formatRelativeTime(user.updatedAt) : "Never");

  const detailsContent = document.getElementById("user-details-content");
  if (detailsContent) {
    detailsContent.innerHTML = `
      <div class="space-y-4">
        <div class="flex items-center space-x-4">
          <div class="h-16 w-16 rounded-full bg-blue-100 flex items-center justify-center">
            <span class="text-blue-600 font-bold text-xl">${escapeHtml(initials)}</span>
          </div>
          <div>
            <h4 class="text-xl font-semibold text-gray-900">${escapeHtml(displayName)}</h4>
            <p class="text-gray-600">${escapeHtml(roleName)}</p>
            ${
              username
                ? `<p class="text-sm text-gray-500">@${escapeHtml(username)}</p>`
                : ""
            }
          </div>
        </div>
        
        <div class="grid grid-cols-2 gap-4">
          ${
            email
              ? `
            <div>
              <label class="block text-sm font-medium text-gray-500">Email</label>
              <p class="text-gray-900">${escapeHtml(email)}</p>
            </div>
          `
              : ""
          }
          ${
            employeeId
              ? `
            <div>
              <label class="block text-sm font-medium text-gray-500">Employee ID</label>
              <p class="text-gray-900">${escapeHtml(employeeId)}</p>
            </div>
          `
              : ""
          }
          <div>
            <label class="block text-sm font-medium text-gray-500">Role</label>
            <p class="text-gray-900">${escapeHtml(roleName)}</p>
            ${
              roleDescription
                ? `<p class="text-xs text-gray-500">${escapeHtml(roleDescription)}</p>`
                : ""
            }
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-500">Status</label>
            <p class="text-gray-900">
              <span class="px-2 py-1 text-xs font-semibold rounded-full ${
                statusName === "Active" || statusName === "1"
                  ? "bg-green-100 text-green-800"
                  : "bg-red-100 text-red-800"
              }">${escapeHtml(statusName)}</span>
            </p>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-500">Join Date</label>
            <p class="text-gray-900">${escapeHtml(joinDate)}</p>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-500">Last Login</label>
            <p class="text-gray-900">${escapeHtml(
              typeof lastLogin === "string"
                ? lastLogin
                : lastLogin
                ? new Date(lastLogin).toLocaleString()
                : "Never"
            )}</p>
          </div>
        </div>
        
        ${
          roleDescription
            ? `
          <div>
            <label class="block text-sm font-medium text-gray-500 mb-2">Role Description</label>
            <p class="text-gray-900 bg-gray-50 p-3 rounded-lg">${escapeHtml(roleDescription)}</p>
          </div>
        `
            : ""
        }
      </div>
    `;
  }

  openUserDetailsModal();
}

async function toggleUserActiveStatus(userId) {
  const user = usersData.find((u) => u.id === userId);
  if (!user) return;

  if (!isCurrentUserAdmin()) {
    showNotification("Only Admin can activate or deactivate users", "error");
    return;
  }

  const displayName = user.employee
    ? `${user.employee.firstName || ""} ${user.employee.lastName || ""}`.trim()
    : user.Employee
    ? `${user.Employee.firstName || ""} ${user.Employee.lastName || ""}`.trim()
    : user.username || user.userName || "Unknown User";

  const currentStatusId =
    user.statusId ?? user.status?.id ?? user.UserStatus?.id ?? null;
  const isActive =
    Number(currentStatusId) === 1 ||
    resolveStatusNameFromUser(user) === "Active";
  const nextStatusId = isActive ? 2 : 1;
  const actionLabel = isActive ? "deactivate" : "activate";

  if (!confirm(`Are you sure you want to ${actionLabel} user ${displayName}?`)) {
    return;
  }

  try {
    const response = await updateUserAPI(userId, { statusId: nextStatusId });
    if (!response.success) {
      showNotification(
        response.message || `Failed to ${actionLabel} user`,
        "error"
      );
      return;
    }

    showNotification(
      `User ${displayName} has been ${isActive ? "deactivated" : "activated"}`,
      "success"
    );
    await loadUsersData();
  } catch (error) {
    console.error(`Error trying to ${actionLabel} user:`, error);
    showNotification(`Error trying to ${actionLabel} user`, "error");
  }
}

async function initializeUsersPage() {
  const addBtn = document.getElementById("users-add-btn");
  if (addBtn) {
    addBtn.classList.toggle("hidden", !isCurrentUserAdmin());
  }

  // Load users data from API
  await loadUsersData();

  // Load employee data for the Add User employee search
  // This will fetch from the employees API if available
  await loadEmployeesData();

  // Set up event listeners after the page loads
  setTimeout(() => {
    if (typeof feather !== "undefined") {
      feather.replace();
    }
  }, 100);
}

// Load employees data for employee search functionality
async function loadEmployeesData() {
  try {
    // Try to fetch employees from API if not already loaded
    if (
      typeof employeesData === "undefined" ||
      !employeesData ||
      employeesData.length === 0
    ) {
      // Assume there's an employee API endpoint
      const token = getAuthToken();
      const response = await fetch(`${window.API_BASE_URL}/employee`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          window.employeesData = result.data;
        }
      }
    }
  } catch (error) {
    console.log("Could not load employees data:", error);
    // Set fallback employee data if API fails
    if (typeof employeesData === "undefined" || !employeesData) {
      window.employeesData = [];
    }
  }
}

// Employee search/select helpers for Add User modal
function searchUserEmployees() {
  const q = document
    .getElementById("user-employee-search")
    ?.value.trim()
    .toLowerCase();
  const resultsEl = document.getElementById("user-employee-results");
  if (!resultsEl) return;

  if (!q) {
    resultsEl.classList.add("hidden");
    resultsEl.innerHTML = "";
    document.getElementById("user-employee-id").value = "";
    return;
  }

  const list = typeof employeesData !== "undefined" ? employeesData : [];
  const matches = list
    .filter((e) => {
      const full = `${e.firstName || ""} ${e.lastName || ""}`.toLowerCase();
      return (
        full.includes(q) ||
        (e.email || "").toLowerCase().includes(q) ||
        (e.id || "").toLowerCase().includes(q)
      );
    })
    .slice(0, 8);

  if (!matches.length) {
    resultsEl.classList.remove("hidden");
    resultsEl.innerHTML = `<div class="px-3 py-2 text-sm text-gray-500">No employees found</div>`;
    return;
  }

  resultsEl.classList.remove("hidden");
  resultsEl.innerHTML = matches
    .map((e) => {
      const fullName = escapeHtml(`${e.firstName || ""} ${e.lastName || ""}`.trim());
      const empId = escapeHtml(e.id || "");
      const email = escapeHtml(e.email || "");
      const safeIdAttr = escapeHtml(String(e.id || "").replace(/'/g, ""));
      return `<div class="px-3 py-2 hover:bg-gray-100 cursor-pointer" onclick="selectUserEmployee('${safeIdAttr}')">${fullName} <span class='text-xs text-gray-400'>(${empId})</span><div class='text-xs text-gray-500'>${email}</div></div>`;
    })
    .join("");
}

function selectUserEmployee(id) {
  const emp = (typeof employeesData !== "undefined" ? employeesData : []).find(
    (e) => String(e.id) === String(id) || String(e.employeeId) === String(id)
  );
  const searchEl = document.getElementById("user-employee-search");
  const resultsEl = document.getElementById("user-employee-results");
  const hiddenId = document.getElementById("user-employee-id");
  if (!emp || !searchEl || !resultsEl || !hiddenId) return;

  searchEl.value = `${emp.firstName} ${emp.lastName} (${
    emp.employeeId || emp.id
  })`;
  hiddenId.value = emp.id;
  resultsEl.classList.add("hidden");

  // Prefill username/email when appropriate
  const usernameEl = document.getElementById("user-username");
  if (emp.email && usernameEl && !usernameEl.value) {
    usernameEl.value = emp.email.split("@")[0];
  }
}

// PDF / XL export for Users
function getUsersExportFilters() {
  const filters = [];
  const searchTerm = document.getElementById("users-search")?.value?.trim();
  const roleFilter = document.getElementById("users-role-filter")?.value;
  const statusFilter = document.getElementById("users-status-filter")?.value;
  if (searchTerm) filters.push({ label: "Search", value: searchTerm });
  if (roleFilter) {
    filters.push({
      label: "Role",
      value: getRoleNameById(roleFilter) || roleFilter,
    });
  }
  if (statusFilter) filters.push({ label: "Status", value: statusFilter });
  return filters;
}

function mapUserToExportRow(user) {
  const username = user.username || user.userName || "";
  const email =
    user.Employee?.email || user.employee?.email || user.email || "";
  const employeeName = user.Employee
    ? `${user.Employee.firstName || ""} ${user.Employee.lastName || ""}`.trim()
    : user.employee
    ? `${user.employee.firstName || ""} ${user.employee.lastName || ""}`.trim()
    : "";
  const displayName =
    username || employeeName || (email ? email.split("@")[0] : "") || "N/A";

  const roleIdFromUser =
    user.userRoleId ??
    user.userRole?.id ??
    user.UserRole?.id ??
    user.userRoleId;
  let roleName = "";
  if (roleIdFromUser) roleName = getRoleNameById(roleIdFromUser) || "";
  if (!roleName) {
    roleName =
      user.UserRole?.roleName ||
      user.userRole?.roleName ||
      user.role ||
      user.roleName ||
      "";
  }

  const statusName =
    resolveStatusNameFromUser(user) ||
    getStatusNameById(user.statusId) ||
    user.status ||
    user.statusName ||
    "";

  const lastLoginRaw =
    user.lastLoginAt || user.lastLogin || user.updatedAt || null;
  const lastLogin = lastLoginRaw ? formatRelativeTime(lastLoginRaw) : "Never";
  const joinDate = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString()
    : "N/A";

  return [
    displayName,
    email || "N/A",
    roleName || "N/A",
    statusName || "N/A",
    lastLogin,
    joinDate,
  ];
}

function mapUserToExportCsvRow(user) {
  const username = user.username || user.userName || "";
  const email =
    user.Employee?.email || user.employee?.email || user.email || "";
  const employeeName = user.Employee
    ? `${user.Employee.firstName || ""} ${user.Employee.lastName || ""}`.trim()
    : user.employee
    ? `${user.employee.firstName || ""} ${user.employee.lastName || ""}`.trim()
    : "";
  const displayName =
    username || employeeName || (email ? email.split("@")[0] : "") || "";

  const roleIdFromUser =
    user.userRoleId ??
    user.userRole?.id ??
    user.UserRole?.id ??
    user.userRoleId;
  let roleName = "";
  if (roleIdFromUser) roleName = getRoleNameById(roleIdFromUser) || "";
  if (!roleName) {
    roleName =
      user.UserRole?.roleName ||
      user.userRole?.roleName ||
      user.role ||
      user.roleName ||
      "";
  }

  const statusName =
    resolveStatusNameFromUser(user) ||
    getStatusNameById(user.statusId) ||
    user.status ||
    user.statusName ||
    "";

  const lastLoginRaw =
    user.lastLoginAt || user.lastLogin || user.updatedAt || null;
  const joinDate = user.createdAt
    ? new Date(user.createdAt).toISOString().slice(0, 10)
    : "";

  return [
    displayName,
    email,
    roleName,
    statusName,
    lastLoginRaw ? new Date(lastLoginRaw).toISOString() : "",
    joinDate,
  ];
}

function downloadUsersPDF() {
  try {
    const usersToExport = getFilteredUsersData();
    const activeUsers = usersToExport.filter((user) => {
      const s =
        resolveStatusNameFromUser(user) ||
        user.status ||
        getStatusNameById(user.statusId);
      return s === "Active";
    }).length;
    const inactiveUsers = usersToExport.filter((user) => {
      const s =
        resolveStatusNameFromUser(user) ||
        user.status ||
        getStatusNameById(user.statusId);
      return s === "Inactive";
    }).length;

    const ok = exportPdfWithTable({
      title: "System Users Report",
      filters: getUsersExportFilters(),
      head: ["Username", "Email", "Role", "Status", "Last Login", "Join Date"],
      body: usersToExport.map(mapUserToExportRow),
      fileName: `system-users-report-${new Date().toISOString().split("T")[0]}.pdf`,
      summary: `Total Users: ${usersToExport.length}  |  Active: ${activeUsers}  |  Inactive: ${inactiveUsers}`,
      emptyMessage: "No users data available to export",
    });
    if (ok) showNotification("System Users PDF downloaded successfully", "success");
  } catch (error) {
    console.error("Error generating PDF:", error);
    showNotification("Error generating PDF", "error");
  }
}

async function downloadUsersXL() {
  try {
    const usersToExport = getFilteredUsersData();
    const ok = await exportXlsxWithTable({
      title: "System Users Report",
      filters: getUsersExportFilters(),
      headers: ["Username", "Email", "Role", "Status", "Last Login", "Join Date"],
      rows: usersToExport.map(mapUserToExportCsvRow),
      sheetName: "Users",
      fileName: `system-users-report-${new Date().toISOString().split("T")[0]}.xlsx`,
      emptyMessage: "No users data available to export",
    });
    if (ok) showNotification("System Users XL downloaded successfully", "success");
  } catch (error) {
    console.error("Error generating XL:", error);
    showNotification("Error generating XL", "error");
  }
}

// Helper function to get filtered users data based on current search and filter criteria
function getFilteredUsersData() {
  if (!usersData || !Array.isArray(usersData)) {
    return [];
  }

  const searchTerm =
    document.getElementById("users-search")?.value?.toLowerCase() || "";
  const roleFilter = document.getElementById("users-role-filter")?.value || "";
  const statusFilter =
    document.getElementById("users-status-filter")?.value || "";

  return usersData.filter((user) => {
    const username = (user.username || user.userName || "").toString();
    const email = (
      user.Employee?.email ||
      user.employee?.email ||
      user.email ||
      ""
    ).toString();
    const employeeName = user.Employee
      ? `${user.Employee.firstName || ""} ${
          user.Employee.lastName || ""
        }`.trim()
      : user.employee
      ? `${user.employee.firstName || ""} ${
          user.employee.lastName || ""
        }`.trim()
      : "";
    const department =
      user.Employee?.department ||
      user.employee?.department ||
      user.department ||
      user.departmentName ||
      "";

    const roleIdFromUser =
      user.userRoleId ??
      user.userRole?.id ??
      user.UserRole?.id ??
      user.userRoleId;
    let roleName = "";
    if (roleIdFromUser) roleName = getRoleNameById(roleIdFromUser) || "";
    if (!roleName)
      roleName =
        user.UserRole?.roleName ||
        user.userRole?.roleName ||
        user.role ||
        user.roleName ||
        "";

    const statusName =
      resolveStatusNameFromUser(user) ||
      getStatusNameById(user.statusId) ||
      user.status ||
      user.statusName ||
      "";

    const matchesSearch =
      !searchTerm ||
      username.toLowerCase().includes(searchTerm) ||
      email.toLowerCase().includes(searchTerm) ||
      employeeName.toLowerCase().includes(searchTerm) ||
      department.toLowerCase().includes(searchTerm) ||
      roleName.toLowerCase().includes(searchTerm);

    const matchesRole =
      !roleFilter ||
      String(roleIdFromUser) === String(roleFilter) ||
      roleName === roleFilter ||
      roleName.toLowerCase() === roleFilter.toLowerCase();

    const matchesStatus =
      !statusFilter ||
      String(statusName) === String(statusFilter) ||
      statusName.toLowerCase() === statusFilter.toLowerCase();

    return matchesSearch && matchesRole && matchesStatus;
  });
}

// Export functions to global scope
window.generateUsersContent = generateUsersContent;
window.initializeUsersModule = initializeUsersModule;
window.initializeUsersPage = initializeUsersPage;
window.openAddUserModal = openAddUserModal;
window.closeAddUserModal = closeAddUserModal;
window.openEditUserModal = openEditUserModal;
window.closeEditUserModal = closeEditUserModal;
window.openUserDetailsModal = openUserDetailsModal;
window.closeUserDetailsModal = closeUserDetailsModal;
window.handleAddUser = handleAddUser;
window.handleEditUser = handleEditUser;
window.editUser = editUser;
window.viewUserDetails = viewUserDetails;
window.toggleUserActiveStatus = toggleUserActiveStatus;
window.clearUsersFilters = clearUsersFilters;
window.filterUsers = filterUsers;
window.searchUserEmployees = searchUserEmployees;
window.selectUserEmployee = selectUserEmployee;
window.downloadUsersPDF = downloadUsersPDF;
window.downloadUsersXL = downloadUsersXL;

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    generateUsersContent,
    initializeUsersModule,
    initializeUsersPage,
  };
}
