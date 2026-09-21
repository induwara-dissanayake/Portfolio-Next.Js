let employeesData = [];
let positionsData = [];
let payrollData = [];
let filteredEmployees = [];
let addressesData = [];
let payrollPaymentTypes = [];
let payrollAdvanceTargetEmpId = null;
let payrollBankAccounts = [];

window.API_BASE_URL = window.API_BASE_URL || "http://localhost:3000/api";

function getEmployeeAuthToken() {
  return (
    localStorage.getItem("authToken") ||
    sessionStorage.getItem("authToken") ||
    ""
  );
}

function normalizePhoneDigits(value) {
  return String(value || "").replace(/\D/g, "");
}

function validateEmployeeClientFields({
  nic,
  firstName,
  lastName,
  email,
  phone,
  landline,
  birthDate,
  roleId,
  addressLine1,
  addressCity,
  addressPostal,
}) {
  const nicPattern = /^[0-9]{9}[vVxX]$|^[0-9]{12}$/;
  const namePattern = /^[a-zA-Z\s]+$/;
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const phonePattern = /^0[0-9]{9}$/;

  if (!nic || !nicPattern.test(nic)) {
    return "Invalid NIC format (e.g., 123456789V or 123456789012)";
  }
  if (!firstName || !namePattern.test(firstName)) {
    return "First name can only contain letters and spaces";
  }
  if (!lastName || !namePattern.test(lastName)) {
    return "Last name can only contain letters and spaces";
  }
  if (!email || !emailPattern.test(email)) {
    return "Invalid email format";
  }
  if (!phonePattern.test(phone)) {
    return "Mobile number must be 10 digits starting with 0 (e.g., 0712345678)";
  }
  if (landline && !phonePattern.test(landline)) {
    return "Landline must be 10 digits starting with 0 (e.g., 0112345678)";
  }
  if (!birthDate || isNaN(Date.parse(birthDate))) {
    return "Valid date of birth is required";
  }
  const dob = new Date(birthDate);
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  const dayDiff = today.getDate() - dob.getDate();
  if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) age--;
  if (age < 15 || age > 65) {
    return "Employee must be between 15 and 65 years old";
  }
  if (!roleId || !Number.isInteger(roleId) || roleId < 1) {
    return "Please select a valid position";
  }
  if (!addressLine1 || !addressLine1.trim()) {
    return "Address line 1 is required";
  }
  if (!addressCity || !String(addressCity).trim()) {
    return "City is required";
  }
  if (String(addressCity).trim().length > 50) {
    return "City name must not exceed 50 characters";
  }
  if (!addressPostal || !/^[0-9]{5}$/.test(addressPostal)) {
    return "Postal code must be 5 digits (e.g., 10100)";
  }
  return null;
}

function initializeEmployeesModule() {
  const content = generateEmployeesContent();
  document.getElementById("content").innerHTML = content;

  // Initialize after DOM is ready
  setTimeout(() => {
    loadEmployeeDirectoryData();
    if (typeof feather !== "undefined") {
      feather.replace();
    }
  }, 100);
}

function generateEmployeesContent() {
  return `
    <div class="content-fade-in p-6">
      <!-- Page Header -->
      <div class="bg-white border-b border-gray-200 px-6 py-4 -m-6 mb-6">
        <div class="flex justify-between items-center">
          <div>
            <h1 class="text-2xl font-bold text-gray-900">Employee Management</h1>
            <p class="text-gray-600 mt-1">Manage staff information, payroll, and attendance</p>
          </div>
          <div class="flex space-x-3">
            <button onclick="openAddEmployeeModal()" class="btn-primary px-4 py-2 text-white rounded-lg flex items-center">
              <i data-feather="plus" class="w-4 h-4 mr-2"></i>
              Add Employee
            </button>
          </div>
        </div>
      </div>

      <!-- Employee Stats -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div class="card p-6">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-gray-600 text-sm">Total Employees</p>
              <p class="text-3xl font-bold text-gray-800" id="total-employees">0</p>
              <p class="text-sm text-gray-500 mt-1">Active staff</p>
            </div>
            <div class="bg-blue-100 p-3 rounded-full">
              <i data-feather="users" class="w-6 h-6 text-blue-600"></i>
            </div>
          </div>
        </div>
        <div class="card p-6">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-gray-600 text-sm">Present Today</p>
              <p class="text-3xl font-bold text-green-600" id="present-count">0</p>
              <p class="text-sm text-gray-500 mt-1" id="attendance-rate">0% attendance</p>
            </div>
            <div class="bg-green-100 p-3 rounded-full">
              <i data-feather="check-circle" class="w-6 h-6 text-green-600"></i>
            </div>
          </div>
        </div>
        <div class="card p-6">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-gray-600 text-sm">On Leave</p>
              <p class="text-3xl font-bold text-orange-600" id="leave-count">0</p>
              <p class="text-sm text-gray-500 mt-1">Currently away</p>
            </div>
            <div class="bg-orange-100 p-3 rounded-full">
              <i data-feather="calendar" class="w-6 h-6 text-orange-600"></i>
            </div>
          </div>
        </div>
        <div class="card p-6">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-gray-600 text-sm">Monthly Payroll</p>
              <p class="text-3xl font-bold text-purple-600" id="total-payroll">Rs. 0</p>
              <p class="text-sm text-gray-500 mt-1">Current month</p>
            </div>
            <div class="bg-purple-100 p-3 rounded-full">
              <i data-feather="dollar-sign" class="w-6 h-6 text-purple-600"></i>
            </div>
          </div>
        </div>
      </div>

      <!-- Management Tabs -->
      <div class="card mb-6">
        <div class="border-b border-gray-200">
          <nav class="flex space-x-8 px-6" aria-label="Tabs">
            <button onclick="switchEmployeeTab('employees')" class="tab-button active py-4 px-1 border-b-2 font-medium text-sm" id="employees-tab">
              Employees
            </button>
            <button onclick="switchEmployeeTab('attendance')" class="tab-button py-4 px-1 border-b-2 font-medium text-sm" id="attendance-tab">
              Attendance
            </button>
            <button onclick="switchEmployeeTab('payroll')" class="tab-button py-4 px-1 border-b-2 font-medium text-sm" id="payroll-tab">
              Payroll & Salaries
            </button>
          </nav>
        </div>

        <!-- Employee Directory Tab -->
        <div id="employees-content" class="tab-content p-6">
          <div class="space-y-6">
            <div class="flex w-full flex-wrap items-center gap-3">
              <div class="flex flex-wrap gap-3 items-center justify-start flex-1 min-w-0">
                <input type="text" id="employees-search" placeholder="Search employees..." class="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" onkeyup="filterEmployees()">
                <!-- department filter removed per requirements -->
                <select id="employees-status-filter" class="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" onchange="filterEmployees()">
                  <option value="">All Status</option>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
                <button type="button" onclick="clearEmployeeDirectoryFilters()" class="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50">Clear</button>
              </div>
                <div class="shrink-0 ml-auto flex gap-2">
                <button onclick="downloadEmployeesPDF()" class="btn-secondary px-4 py-2 rounded-lg flex items-center">
                  <i data-feather="download" class="w-4 h-4 mr-2"></i>
                  PDF
                </button>
                <button onclick="downloadEmployeesXL()" class="btn-secondary px-4 py-2 rounded-lg flex items-center" title="Opens in Excel">
                  <i data-feather="file-text" class="w-4 h-4 mr-2"></i>
                  XL
                </button>
                </div>
            </div>
            
            <div class="overflow-x-auto">
              <table class="min-w-full bg-white">
                <thead class="bg-gray-50">
                  <tr>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Position</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Salary</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody id="employees-table-body" class="bg-white divide-y divide-gray-200">
                  <!-- Employees will be populated here -->
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- Attendance Tab -->
        <div id="attendance-content" class="tab-content p-6 hidden">
          <div class="space-y-6">
            <div class="flex w-full flex-wrap items-center gap-3">
              <div class="flex flex-wrap gap-3 items-center justify-start flex-1 min-w-0">
                <div class="relative hidden md:block">
                  <input type="text" id="attendance-search" placeholder="Search employees..." class="pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" oninput="filterAttendanceList()" />
                  <i data-feather="search" class="w-4 h-4 text-gray-400 absolute left-3 top-3"></i>
                </div>
                <input type="date" id="attendance-date" class="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" onchange="loadAttendanceForDate()">
                <button type="button" onclick="clearAttendanceTabFilters()" class="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50">Clear</button>
              </div>
                <div class="shrink-0 ml-auto flex gap-2">
                <button onclick="downloadAttendancePDF()" class="btn-secondary px-4 py-2 rounded-lg flex items-center">
                  <i data-feather="download" class="w-4 h-4 mr-2"></i>
                  PDF
                </button>
                </div>
            </div>
            
            <div class="overflow-x-auto">
              <table class="min-w-full bg-white">
                <thead class="bg-gray-50">
                  <tr>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Check In</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Check Out</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hours Worked</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody id="attendance-table-body" class="bg-white divide-y divide-gray-200">
                  <!-- Attendance will be populated here -->
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- Payroll Tab -->
        <div id="payroll-content" class="tab-content p-6 hidden">
          <div class="space-y-6">
            <div class="flex w-full flex-wrap items-center gap-3">
              <div class="flex flex-wrap gap-3 items-center justify-start flex-1 min-w-0">
                <div class="relative hidden md:block">
                  <input type="text" id="payroll-search" placeholder="Search employees..." class="pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" oninput="filterPayrollList()" />
                  <i data-feather="search" class="w-4 h-4 text-gray-400 absolute left-3 top-3"></i>
                </div>
                <input type="month" id="payroll-month" class="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" onchange="loadPayrollData()">
                <button type="button" onclick="clearPayrollTabFilters()" class="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50">Clear</button>
              </div>
                <div class="shrink-0 ml-auto flex gap-2">
                <button onclick="downloadPayrollPDF()" class="btn-secondary px-4 py-2 rounded-lg flex items-center">
                  <i data-feather="download" class="w-4 h-4 mr-2"></i>
                  PDF
                </button>
                <button onclick="downloadPayrollXL()" class="btn-secondary px-4 py-2 rounded-lg flex items-center" title="Opens in Excel">
                  <i data-feather="file-text" class="w-4 h-4 mr-2"></i>
                  XL
                </button>
                </div>
            </div>
            
            <div class="overflow-x-auto">
              <table class="min-w-full bg-white">
                <thead class="bg-gray-50">
                  <tr>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Basic Salary</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Allowances</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Overtime</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Deductions</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Advance</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Net Salary</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody id="payroll-table-body" class="bg-white divide-y divide-gray-200">
                  <!-- Payroll will be populated here -->
                </tbody>
              </table>
            </div>
          </div>
        </div>


      </div>
    </div>

    <!-- Attendance Calendar Modal -->
    <div id="attendance-calendar-modal" class="modal fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center hidden z-50">
      <div class="modal-content bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div class="flex justify-between items-center p-6 border-b border-gray-200">
          <div>
            <h3 class="text-lg font-semibold text-gray-900">Attendance Calendar</h3>
            <p id="attendance-calendar-employee" class="text-gray-600 text-sm"></p>
          </div>
          <div class="flex items-center space-x-4">
            <button onclick="goToPayslipFromCalendar()" class="text-purple-600 hover:text-purple-800" title="Go to Paysheet">
              <i data-feather="file-text" class="w-6 h-6"></i>
            </button>
            <button onclick="closeAttendanceCalendar()" class="text-gray-400 hover:text-gray-600" title="Close">
              <i data-feather="x" class="w-6 h-6"></i>
            </button>
          </div>
        </div>
        <div class="p-6">
          <div class="flex items-center justify-between mb-4">
            <button class="px-3 py-1 rounded hover:bg-gray-100" onclick="changeAttendanceMonth(-1)"><i data-feather="chevron-left" class="w-5 h-5"></i></button>
            <h4 id="attendance-calendar-month" class="text-md font-semibold"></h4>
            <button class="px-3 py-1 rounded hover:bg-gray-100" onclick="changeAttendanceMonth(1)"><i data-feather="chevron-right" class="w-5 h-5"></i></button>
          </div>
          <div id="attendance-calendar-body"></div>
          <div class="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div class="bg-green-50 p-3 rounded">
              <div class="text-sm text-gray-600">Total Present Days</div>
              <div id="attendance-total-present" class="text-xl font-semibold text-green-700">0</div>
            </div>
            <div class="bg-blue-50 p-3 rounded">
              <div class="text-sm text-gray-600">Total Hours</div>
              <div id="attendance-total-hours" class="text-xl font-semibold text-blue-700">0</div>
            </div>
            <div class="bg-purple-50 p-3 rounded">
              <div class="text-sm text-gray-600">Basic Salary</div>
              <div id="attendance-basic-salary" class="text-xl font-semibold text-purple-700">Rs. 0</div>
            </div>
          </div>
          <div id="attendance-day-editor" class="mt-6 hidden">
            <h5 class="font-medium mb-2">Edit Selected Day</h5>
            <div class="flex items-center space-x-3 flex-wrap">
              <div class="text-sm text-gray-600" id="attendance-selected-date">Date:</div>
              <select id="attendance-selected-status" class="px-3 py-2 border border-gray-300 rounded-lg" onchange="onAttendanceStatusChange()">
                <option value="Present">Present</option>
                <option value="Absent">Absent</option>
                <option value="Late">Late</option>
                <option value="Annual Leave">Annual Leave</option>
                <option value="Sick Leave">Sick Leave</option>
                <option value="Not Marked">Not Marked</option>
              </select>
              <div class="flex items-center space-x-2 ml-4">
                <button id="attendance-day-update-btn" onclick="updateSelectedDay()" class="btn-primary px-4 py-2 text-white">Update</button>
                <button id="attendance-day-cancel-btn" onclick="cancelAttendanceSelection()" class="btn-secondary px-4 py-2">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Payroll Edit Modal -->
    <div id="payroll-edit-modal" class="modal fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center hidden z-50">
      <div class="modal-content bg-white rounded-lg shadow-xl max-w-xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div class="flex justify-between items-center p-6 border-b border-gray-200">
          <h3 class="text-lg font-semibold text-gray-900">Edit Payroll</h3>
          <button onclick="closePayrollEditModal()" class="text-gray-400 hover:text-gray-600">
            <i data-feather="x" class="w-6 h-6"></i>
          </button>
        </div>
        <div class="p-6 space-y-4">
          <input type="hidden" id="payroll-edit-emp-id" />
          <div class="text-sm text-gray-600" id="payroll-edit-emp-name"></div>
          <div class="bg-indigo-50 p-3 rounded">
            <div class="text-sm text-gray-600">Attendance (Present Days this month)</div>
            <div id="payroll-edit-present-days" class="text-lg font-semibold text-indigo-700">0</div>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Basic Salary</label>
              <input type="number" id="payroll-basic" class="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50" readonly />
              <div class="text-xs text-gray-500 mt-1">From employee record (read-only)</div>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Allowances</label>
              <input type="text" inputmode="decimal" id="payroll-allowances" class="w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="0.00" oninput="updatePayrollTotalPayment()" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Overtime</label>
              <input type="text" inputmode="decimal" id="payroll-overtime" class="w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="0.00" oninput="updatePayrollTotalPayment()" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Deductions</label>
              <input type="text" inputmode="decimal" id="payroll-deductions" class="w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="0.00" oninput="updatePayrollTotalPayment()" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Salary advance recovery</label>
              <input type="text" inputmode="decimal" id="payroll-advance-deduct" class="w-full px-3 py-2 border border-amber-200 rounded-lg bg-amber-50/50" placeholder="0.00" oninput="updatePayrollTotalPayment()" />
              <div class="text-xs text-amber-800 mt-1 font-medium" id="payroll-advance-suggested">Outstanding advances: Rs. 0.00</div>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select id="payroll-status" onchange="togglePayrollPaymentFields()" class="w-full px-3 py-2 border border-gray-300 rounded-lg">
                <option value="Pending">Pending</option>
                <option value="Paid">Paid</option>
              </select>
            </div>
            <div id="payroll-payment-type-wrap" class="hidden">
              <label class="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
              <select id="payroll-payment-type" onchange="togglePayrollBankAccountField()" class="w-full px-3 py-2 border border-gray-300 rounded-lg">
                <option value="">Select payment method</option>
              </select>
            </div>
            <div id="payroll-bank-account-wrap" class="hidden">
              <label class="block text-sm font-medium text-gray-700 mb-1">Bank Account *</label>
              <select id="payroll-bank-account" class="w-full px-3 py-2 border border-gray-300 rounded-lg">
                <option value="">Select bank account</option>
              </select>
            </div>
            <div id="payroll-cheque-wrap" class="hidden">
              <label class="block text-sm font-medium text-gray-700 mb-1">Cheque Number *</label>
              <input type="text" id="payroll-cheque-number" maxlength="50" class="w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="e.g. 123456" />
            </div>
          </div>
          <div class="bg-green-50 border border-green-100 p-3 rounded">
            <div class="text-sm text-gray-600">Total Payment (Net Salary)</div>
            <div id="payroll-total-payment" class="text-xl font-semibold text-green-700">Rs. 0.00</div>
          </div>
          <div class="flex justify-end space-x-3 pt-2">
            <button class="btn-secondary px-4 py-2" onclick="closePayrollEditModal()">Cancel</button>
            <button class="btn-primary px-4 py-2 text-white" onclick="savePayrollEdit()">Save</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Payroll advance payment modal -->
    <div id="payroll-advance-modal" class="modal fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center hidden z-50">
      <div class="modal-content bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div class="flex justify-between items-center p-6 border-b border-gray-200">
          <h3 class="text-lg font-semibold text-gray-900">Salary advance</h3>
          <button type="button" onclick="closePayrollAdvanceModal()" class="text-gray-400 hover:text-gray-600">
            <i data-feather="x" class="w-6 h-6"></i>
          </button>
        </div>
        <div class="p-6 space-y-4">
          <p class="text-sm text-gray-600" id="payroll-advance-emp-label"></p>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Month</label>
            <input type="month" id="payroll-advance-month" class="w-full px-3 py-2 border border-gray-300 rounded-lg" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Amount (Rs.)</label>
            <input type="number" id="payroll-advance-amount" min="0.01" step="0.01" class="w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="0.00" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Payment method</label>
            <select id="payroll-advance-payment-type" onchange="togglePayrollAdvanceBankField()" class="w-full px-3 py-2 border border-gray-300 rounded-lg">
              <option value="">Select payment method</option>
            </select>
          </div>
          <div id="payroll-advance-bank-wrap" class="hidden">
            <label class="block text-sm font-medium text-gray-700 mb-1">Bank account *</label>
            <select id="payroll-advance-bank-account" class="w-full px-3 py-2 border border-gray-300 rounded-lg">
              <option value="">Select bank account</option>
            </select>
          </div>
          <div id="payroll-advance-cheque-wrap" class="hidden">
            <label class="block text-sm font-medium text-gray-700 mb-1">Cheque number *</label>
            <input type="text" id="payroll-advance-cheque-number" maxlength="50" class="w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="e.g. 123456" />
          </div>
          <div class="flex justify-end space-x-3 pt-2">
            <button type="button" class="btn-secondary px-4 py-2" onclick="closePayrollAdvanceModal()">Cancel</button>
            <button type="button" class="btn-primary px-4 py-2 text-white" onclick="submitPayrollAdvance()">Record advance</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Payslip Modal -->
    <div id="payslip-modal" class="modal fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center hidden z-50">
      <div class="modal-content bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div class="flex justify-between items-center p-6 border-b border-gray-200">
          <h3 class="text-lg font-semibold text-gray-900">Payslip</h3>
          <button onclick="closePayslipModal()" class="text-gray-400 hover:text-gray-600">
            <i data-feather="x" class="w-6 h-6"></i>
          </button>
        </div>
        <div id="payslip-content" class="p-6">
          <!-- Filled dynamically -->
        </div>
      </div>
    </div>

    <!-- Add Employee Modal -->
    <div id="add-employee-modal" class="modal fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center hidden z-50">
      <div class="modal-content bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div class="flex justify-between items-center p-6 border-b border-gray-200">
          <h3 class="text-lg font-semibold text-gray-900">Add New Employee</h3>
          <button onclick="closeAddEmployeeModal()" class="text-gray-400 hover:text-gray-600">
            <i data-feather="x" class="w-6 h-6"></i>
          </button>
        </div>
        <form id="add-employee-form" onsubmit="handleAddEmployee(event)" class="p-6 space-y-6">
          <!-- Basic Information -->
          <div>
            <h4 class="text-md font-medium text-gray-900 mb-4">Basic Information</h4>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">First Name</label>
                <input type="text" id="employee-first-name" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" required>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Last Name</label>
                <input type="text" id="employee-last-name" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" required>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Email</label>
                <input type="email" id="employee-email" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" required>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                <input type="tel" id="employee-phone" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="0712345678" maxlength="10" required>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Land Line Number (optional)</label>
                <input type="tel" id="employee-landline" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="0112345678" maxlength="10">
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">NIC</label>
                <input type="text" id="employee-nic" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="123456789V or 123456789012" required>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Birth Date</label>
                <input type="date" id="employee-birth-date" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" required>
              </div>
            </div>
          </div>

          <!-- Employment Details -->
          <div>
            <h4 class="text-md font-medium text-gray-900 mb-4">Employment Details</h4>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Position</label>
                <select id="employee-position" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" required>
                  <option value="">Select Position</option>
                </select>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Gender</label>
                <select id="employee-gender" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" required>
                  <option value="">Select Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Basic Salary</label>
                <input type="number" id="employee-salary" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" required>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <select id="employee-status" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" required>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
            </div>
          </div>

          <!-- Address -->
          <div>
            <h4 class="text-md font-medium text-gray-900 mb-2">Address</h4>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Address Line 1</label>
                <input type="text" id="employee-address-line1" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="House No, Street" required />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Address Line 2</label>
                <input type="text" id="employee-address-line2" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="Area / Landmark (optional)" />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">City</label>
                <input type="text" id="employee-address-city" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="e.g. Colombo" maxlength="50" required />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Postal Code</label>
                <input type="text" id="employee-address-postalCode" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="e.g. 10200" maxlength="5" required />
              </div>
            </div>
          </div>


          <div class="flex justify-end space-x-3 pt-4">
            <button type="button" onclick="closeAddEmployeeModal()" class="btn-secondary px-4 py-2">Cancel</button>
            <button type="submit" class="btn-primary px-4 py-2 text-white">Add Employee</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Employee Details Modal -->
    <div id="employee-details-modal" class="modal fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center hidden z-50">
      <div class="modal-content bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div class="flex justify-between items-center p-6 border-b border-gray-200">
          <h3 class="text-lg font-semibold text-gray-900">Employee Details</h3>
          <button onclick="closeEmployeeDetailsModal()" class="text-gray-400 hover:text-gray-600">
            <i data-feather="x" class="w-6 h-6"></i>
          </button>
        </div>
        <div id="employee-details-content" class="p-6">
          <!-- Employee details will be populated here -->
        </div>
      </div>
    </div>

    <!-- Edit Employee Modal (expanded) -->
    <div id="edit-employee-modal" class="modal fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center hidden z-50">
      <div class="modal-content bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div class="flex justify-between items-center p-6 border-b border-gray-200">
          <h3 class="text-lg font-semibold text-gray-900">Edit Employee</h3>
          <button onclick="closeEditEmployeeModal()" class="text-gray-400 hover:text-gray-600">
            <i data-feather="x" class="w-6 h-6"></i>
          </button>
        </div>
        <form id="edit-employee-form" onsubmit="handleEditEmployee(event)" class="p-6 space-y-6">
          <input type="hidden" id="edit-employee-id">
          <!-- Basic Information -->
          <div>
            <h4 class="text-md font-medium text-gray-900 mb-4">Basic Information</h4>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">First Name</label>
                <input type="text" id="edit-employee-first-name" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" required>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Last Name</label>
                <input type="text" id="edit-employee-last-name" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" required>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Email</label>
                <input type="email" id="edit-employee-email" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" required>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                <input type="tel" id="edit-employee-phone" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="0712345678" maxlength="10" required>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">NIC</label>
                <input type="text" id="edit-employee-nic" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="123456789V or 123456789012" required>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Barcode</label>
                <input type="text" id="edit-employee-barcode" class="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100" readonly>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Birth Date</label>
                <input type="date" id="edit-employee-birth-date" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" required>
              </div>
            </div>
          </div>
          <!-- Employment Details -->
          <div>
            <h4 class="text-md font-medium text-gray-900 mb-4">Employment Details</h4>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Position</label>
                <select id="edit-employee-position" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" required>
                  <option value="">Select Position</option>
                </select>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Gender</label>
                <select id="edit-employee-gender" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" required>
                  <option value="">Select Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Basic Salary</label>
                <input type="number" id="edit-employee-salary" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" required>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <select id="edit-employee-status" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" required>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
            </div>
          </div>
          <!-- Additional Information -->
          <div>
            <h4 class="text-md font-medium text-gray-900 mb-4">Additional Information</h4>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Address Line 1</label>
                <input type="text" id="edit-employee-address-line1" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" required />
                <label class="block text-sm font-medium text-gray-700 mt-2 mb-1">Address Line 2</label>
                <input type="text" id="edit-employee-address-line2" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                <div class="grid grid-cols-2 gap-4 mt-2">
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">City</label>
                    <input type="text" id="edit-employee-address-city" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="e.g. Colombo" maxlength="50" required />
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Postal Code</label>
                    <input type="text" id="edit-employee-address-postalCode" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="e.g. 10200" maxlength="5" required />
                  </div>
                </div>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Land Line Number (optional)</label>
                <input type="tel" id="edit-employee-landline" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="0112345678" maxlength="10">
              </div>
            </div>
          </div>
          <div class="flex justify-end space-x-3 pt-4">
            <button type="button" onclick="closeEditEmployeeModal()" class="btn-secondary px-4 py-2">Cancel</button>
            <button type="submit" class="btn-primary px-4 py-2 text-white">Update Employee</button>
          </div>
        </form>
      </div>
    </div>
  `;
}

// Load employees data from backend
function loadEmployeeDirectoryData() {
  (async () => {
    let apiSucceeded = false;
    try {
      const token = getEmployeeAuthToken();
      if (token) {
        const res = await fetch(`${window.API_BASE_URL}/employee`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });
        if (res.ok) {
          const body = await res.json();
          if (body && body.success && Array.isArray(body.data)) {
            apiSucceeded = true;
            employeesData = body.data.map((e) => ({
              id: e.id,
              employeeId: e.id,
              firstName: e.firstName || "",
              lastName: e.lastName || "",
              email: e.email || "",
              phone: e.mobileNumber || e.phone || "",
              landline: e.landlineNumber || e.landline || "",
              position: e.role?.name || e.roleName || e.position || "",
              department: e.role?.department || "",
              roleId: e.role?.id || e.roleId || null,
              gender: e.gender || "",
              salary: parseFloat(e.salary || 0),
              status: e.status?.name || e.status || "",
              hireDate: formatDateTime(e.createdAt) || "",
              // Keep the full address object from API
              address: e.address
                ? {
                    line1: e.address.line1 || "",
                    line2: e.address.line2 || "",
                    cityId: e.address.cityId || "",
                    cityName: e.address.city?.name || "",
                    postalCode: e.address.postalCode || "",
                  }
                : null,
              nic: e.nic || "",
              birthDate: e.dateOfBirth || "",
              attendanceRecord: [],
            }));
          }
        }
      }
    } catch (err) {
      console.error("Failed to load employees from API:", err);
      if (typeof showNotification === "function")
        showNotification(
          "Failed to load employees from server. Please check the backend.",
          "error"
        );
    }

    if (!employeesData || employeesData.length === 0) {
      employeesData = [];
      if (!apiSucceeded && typeof showNotification === "function") {
        showNotification(
          "Failed to load employees from server. Please check the backend.",
          "error"
        );
      }
    }

    filteredEmployees = [...employeesData];
    filterEmployees();

    // Fetch dashboard stats from backend
    try {
      const token = getEmployeeAuthToken();
      const dashRes = await fetch(`${window.API_BASE_URL}/empdashboard`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      if (dashRes.ok) {
        const dashBody = await dashRes.json();
        if (dashBody && dashBody.success && dashBody.data) {
          const d = dashBody.data;
          const totalEl = document.getElementById("total-employees");
          const presentEl = document.getElementById("present-count");
          const leaveEl = document.getElementById("leave-count");
          const payrollEl = document.getElementById("total-payroll");
          const rateEl = document.getElementById("attendance-rate");
          if (totalEl) totalEl.textContent = d.totalEmployees ?? 0;
          if (presentEl) presentEl.textContent = d.presentToday ?? 0;
          if (leaveEl) leaveEl.textContent = d.onLeave ?? 0;
          if (payrollEl) {
            const amount = Number(d.monthlyPayroll || 0);
            payrollEl.textContent =
              amount >= 1000
                ? `Rs. ${Math.round(amount / 1000)}K`
                : `Rs. ${Math.round(amount).toLocaleString()}`;
          }
          if (rateEl)
            rateEl.textContent = `${d.attendancePercentage ?? 0}% attendance`;
        }
      } else {
        updateEmployeeStats(); // fallback to local count
      }
    } catch (e) {
      updateEmployeeStats();
    }

    await populateFormOptions();

    // Set payroll month input to current month
    const payrollMonthInput = document.getElementById("payroll-month");
    if (payrollMonthInput && !payrollMonthInput.value) {
      const now = new Date();
      const currentMonth = `${now.getFullYear()}-${String(
        now.getMonth() + 1
      ).padStart(2, "0")}`;
      payrollMonthInput.value = currentMonth;
    }

    // Set default tab to Employee Directory
    switchEmployeeTab("employees");
  })();
}

// Render employees table
function renderEmployeesTable() {
  const tableBody = document.getElementById("employees-table-body");
  if (!tableBody) return;

  if (!filteredEmployees.length) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="5" class="px-6 py-10 text-center text-gray-500">
          No employees yet. Users and employees are separate — add employees here when you are ready.
        </td>
      </tr>`;
    return;
  }

  tableBody.innerHTML = filteredEmployees
    .map((employee) => {
      // safe initials fallback
      const fn = employee.firstName || "";
      const ln = employee.lastName || "";
      const initials = `${(fn[0] || "").toUpperCase()}${(
        ln[0] || ""
      ).toUpperCase()}`;

      const status = employee.status || "Active";
      const statusColors = {
        Active: "bg-green-100 text-green-800",
        Inactive: "bg-gray-100 text-gray-800",
        Suspended: "bg-red-100 text-red-800",
      };

      const position = employee.position || "";
      const email = employee.email || "";
      const empId = employee.employeeId || employee.id || "";
      const salary = Number(employee.salary || 0);

      return `
        <tr class="hover:bg-gray-50">
          <td class="px-6 py-4 whitespace-nowrap">
            <div class="flex items-center">
              <div class="h-10 w-10 flex-shrink-0">
                <div class="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <span class="text-blue-600 font-medium">${initials}</span>
                </div>
              </div>
              <div class="ml-4">
                <div class="text-sm font-medium text-gray-900">${fn} ${ln}</div>
                <div class="text-sm text-gray-500">Barcode: ${empId}</div>
                <div class="text-sm text-gray-500">${email}</div>
              </div>
            </div>
          </td>
          <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${position}</td>
          <td class="px-6 py-4 whitespace-nowrap text-sm">
            <span class="px-2 py-1 text-xs font-semibold rounded-full ${
              statusColors[status] || "bg-gray-100 text-gray-800"
            }">${status}</span>
          </td>
          <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">Rs. ${salary.toLocaleString()}</td>
          <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
            <button onclick="viewEmployeeDetails('${empId}')" class="text-blue-600 hover:text-blue-900 mr-3 p-1 rounded" title="View Details">
              <i data-feather="eye" class="w-4 h-4"></i>
            </button>
            <button onclick="editEmployee('${empId}')" class="text-green-600 hover:text-green-900 mr-3 p-1 rounded" title="Edit Employee">
              <i data-feather="edit" class="w-4 h-4"></i>
            </button>
            <button onclick="deleteEmployee('${empId}')" class="text-red-600 hover:text-red-900 p-1 rounded" title="Delete Employee">
              <i data-feather="trash-2" class="w-4 h-4"></i>
            </button>
          </td>
        </tr>
      `;
    })
    .join("");

  if (typeof feather !== "undefined") {
    feather.replace();
  }
}

// Update employee statistics
function updateEmployeeStats() {
  const totalEmployees = employeesData.length;
  const presentToday = employeesData.filter(
    (emp) => emp.attendance === "Present"
  ).length;
  const onLeave = employeesData.filter(
    (emp) => emp.attendance === "On Leave" || emp.attendance === "Leave"
  ).length;
  const totalPayroll = employeesData.reduce((sum, emp) => sum + emp.salary, 0);
  const attendanceRate =
    totalEmployees > 0 ? Math.round((presentToday / totalEmployees) * 100) : 0;

  const totalElement = document.getElementById("total-employees");
  const presentElement = document.getElementById("present-count");
  const leaveElement = document.getElementById("leave-count");
  const payrollElement = document.getElementById("total-payroll");
  const rateElement = document.getElementById("attendance-rate");

  if (totalElement) totalElement.textContent = totalEmployees;
  if (presentElement) presentElement.textContent = presentToday;
  if (leaveElement) leaveElement.textContent = onLeave;
  if (payrollElement)
    payrollElement.textContent = `Rs. ${Math.round(totalPayroll / 1000)}K`;
  if (rateElement) rateElement.textContent = `${attendanceRate}% attendance`;
}

// Tab switching functionality
function switchEmployeeTab(tab) {
  // Hide all tab contents
  document.querySelectorAll(".tab-content").forEach((content) => {
    content.classList.add("hidden");
  });

  // Remove active class from all tabs
  document.querySelectorAll(".tab-button").forEach((button) => {
    button.classList.remove("active", "border-blue-500", "text-blue-600");
    button.classList.add("border-transparent", "text-gray-500");
  });

  // Show selected tab content
  const selectedContent = document.getElementById(`${tab}-content`);
  if (selectedContent) {
    selectedContent.classList.remove("hidden");
  }

  // Activate selected tab
  const selectedTab = document.getElementById(`${tab}-tab`);
  if (selectedTab) {
    selectedTab.classList.add("active", "border-blue-500", "text-blue-600");
    selectedTab.classList.remove("border-transparent", "text-gray-500");
  }

  // Load specific tab data and refresh icons
  switch (tab) {
    case "employees":
      renderEmployeesTable();
      break;
    case "attendance":
      loadAttendanceData();
      break;
    case "payroll":
      loadPayrollData();
      break;
  }

  // Refresh feather icons
  setTimeout(() => {
    if (typeof feather !== "undefined") {
      feather.replace();
    }
  }, 100);
}

// Filter employees
function filterEmployees() {
  const searchTerm =
    document.getElementById("employees-search")?.value.toLowerCase() || "";
  const statusFilter =
    document.getElementById("employees-status-filter")?.value || "";

  filteredEmployees = employeesData.filter((employee) => {
    const matchesSearch =
      !searchTerm ||
      String(employee.firstName || "")
        .toLowerCase()
        .includes(searchTerm) ||
      String(employee.lastName || "")
        .toLowerCase()
        .includes(searchTerm) ||
      String(employee.email || "")
        .toLowerCase()
        .includes(searchTerm) ||
      String(employee.id || "")
        .toLowerCase()
        .includes(searchTerm) ||
      String(employee.employeeId || "")
        .toLowerCase()
        .includes(searchTerm);

    const matchesStatus = !statusFilter || employee.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  renderEmployeesTable();
}

function clearEmployeeDirectoryFilters() {
  const s = document.getElementById("employees-search");
  if (s) s.value = "";
  const f = document.getElementById("employees-status-filter");
  if (f) f.value = "";
  filteredEmployees = [...employeesData];
  renderEmployeesTable();
}

function clearAttendanceTabFilters() {
  const s = document.getElementById("attendance-search");
  if (s) s.value = "";
  attendanceFilteredEmployees = [];
  const dateEl = document.getElementById("attendance-date");
  if (dateEl) dateEl.value = new Date().toISOString().split("T")[0];
  loadAttendanceForDate();
}

function clearPayrollTabFilters() {
  const s = document.getElementById("payroll-search");
  if (s) s.value = "";
  const m = document.getElementById("payroll-month");
  if (m) {
    const n = new Date();
    m.value = `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}`;
  }
  loadPayrollData();
}

function openAddEmployeeModal() {
  document.getElementById("add-employee-modal").classList.remove("hidden");
  populateFormOptions().then(() => {
    if (typeof feather !== "undefined") {
      feather.replace();
    }
  });
}

function closeAddEmployeeModal() {
  document.getElementById("add-employee-modal").classList.add("hidden");
  document.getElementById("add-employee-form").reset();
}

function openEditEmployeeModal() {
  document.getElementById("edit-employee-modal").classList.remove("hidden");
  if (typeof feather !== "undefined") {
    feather.replace();
  }
}

function closeEditEmployeeModal() {
  document.getElementById("edit-employee-modal").classList.add("hidden");
  document.getElementById("edit-employee-form").reset();
}

function openEmployeeDetailsModal() {
  document.getElementById("employee-details-modal").classList.remove("hidden");
  if (typeof feather !== "undefined") {
    feather.replace();
  }
}

function closeEmployeeDetailsModal() {
  document.getElementById("employee-details-modal").classList.add("hidden");
}

// Populate form options
async function populateFormOptions() {
  const token = getEmployeeAuthToken();
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  // Load roles from dedicated API (works even when Employee table is empty)
  try {
    const res = await fetch(`${window.API_BASE_URL}/employee/roles`, {
      method: "GET",
      headers,
    });
    const body = await res.json().catch(() => null);
    if (res.ok && body && body.success && Array.isArray(body.data)) {
      positionsData = body.data.map((r) => ({ id: r.id, name: r.name }));
    }
  } catch (err) {
    console.warn("Failed to fetch employee roles:", err);
  }

  // Fallback: derive roles from existing employees if API failed
  if (!positionsData.length) {
    const uniqueRoles = [];
    employeesData.forEach((e) => {
      const rid = e.roleId || (e.role && e.role.id);
      const rname = e.position || (e.role && e.role.name);
      if (rid || rname) {
        if (
          !uniqueRoles.find(
            (r) =>
              String(r.id) === String(rid) || (r.name && r.name === rname)
          )
        ) {
          uniqueRoles.push({ id: rid, name: rname });
        }
      }
    });
    positionsData = uniqueRoles;
  }

  const positionSelects = ["employee-position", "edit-employee-position"];
  positionSelects.forEach((selectId) => {
    const select = document.getElementById(selectId);
    if (!select) return;
    const currentVal = select.value;
    select.innerHTML = '<option value="">Select Position</option>';
    positionsData.forEach((pos) => {
      const val = pos.id !== undefined && pos.id !== null ? pos.id : pos.name;
      select.innerHTML += `<option value="${val}">${pos.name}</option>`;
    });
    if (currentVal) select.value = currentVal;
  });

  // Addresses (optional reuse)
  try {
    const res = await fetch(`${window.API_BASE_URL}/employee/all/addresses`, {
      method: "GET",
      headers,
    });
    const body = await res.json().catch(() => null);
    if (res.ok && body && body.success && Array.isArray(body.data)) {
      addressesData = body.data.map((a) => ({
        id: a.id,
        line1: a.line1,
        line2: a.line2,
        cityId: a.cityId,
        postalCode: a.postalCode,
      }));
    }
  } catch (err) {
    console.warn("Failed to fetch addresses:", err);
  }
}

// Employee actions
function handleAddEmployee(event) {
  event.preventDefault();

  const firstName = document.getElementById("employee-first-name").value.trim();
  const lastName = document.getElementById("employee-last-name").value.trim();
  const email = document.getElementById("employee-email").value.trim();
  const phone = normalizePhoneDigits(
    document.getElementById("employee-phone").value
  );
  const landlineRaw = document.getElementById("employee-landline").value.trim();
  const landline = landlineRaw ? normalizePhoneDigits(landlineRaw) : "";
  const nic = document.getElementById("employee-nic").value.trim();
  const birthDate = document.getElementById("employee-birth-date").value;
  const position = document.getElementById("employee-position").value;
  const gender = document.getElementById("employee-gender").value;
  const salary = parseFloat(document.getElementById("employee-salary").value);
  const status = document.getElementById("employee-status").value;
  const addressLine1 =
    document.getElementById("employee-address-line1")?.value.trim() || "";
  const addressLine2 =
    document.getElementById("employee-address-line2")?.value.trim() || "";
  const addressCity =
    document.getElementById("employee-address-city")?.value.trim() || "";
  const addressPostal =
    document.getElementById("employee-address-postalCode")?.value.trim() || "";

  let resolvedAddRoleId = null;
  if (position !== undefined && position !== null && position !== "") {
    if (/^\d+$/.test(String(position))) resolvedAddRoleId = Number(position);
    else {
      const m = positionsData.find(
        (p) =>
          String(p.name).trim().toLowerCase() ===
          String(position).trim().toLowerCase()
      );
      if (m) resolvedAddRoleId = m.id;
    }
  }

  const clientError = validateEmployeeClientFields({
    nic,
    firstName,
    lastName,
    email,
    phone,
    landline,
    birthDate,
    roleId: resolvedAddRoleId,
    addressLine1,
    addressCity,
    addressPostal,
  });
  if (clientError) {
    showNotification(clientError, "error");
    return;
  }

  if (employeesData.some((emp) => emp.email === email)) {
    showNotification("Email already exists", "error");
    return;
  }

  (async () => {
    try {
      const token = getEmployeeAuthToken();
      const genderNorm = (gender || "").toString().trim().toLowerCase();
      let genderValue = "OTHER";
      if (genderNorm === "m" || genderNorm === "male") genderValue = "MALE";
      else if (genderNorm === "f" || genderNorm === "female")
        genderValue = "FEMALE";

      const addressObj = {
        line1: addressLine1,
        line2: addressLine2 || undefined,
        city: addressCity,
        postalCode: addressPostal,
      };

      const payload = {
        nic,
        firstName,
        lastName,
        email,
        mobileNumber: phone,
        landlineNumber: landline || undefined,
        gender: genderValue,
        dateOfBirth: birthDate,
        roleId: resolvedAddRoleId,
        salary,
        statusId: status === "Active" ? 1 : 2,
        address: addressObj,
      };
      const res = await fetch(`${window.API_BASE_URL}/employee`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const body = await res.json().catch(() => null);
      if (res.ok && body && body.success) {
        showNotification(
          `Employee ${firstName} ${lastName} added successfully`,
          "success"
        );
        await loadEmployeeDirectoryData();
        closeAddEmployeeModal();
      } else {
        showNotification(
          (body && body.message) || "Failed to add employee",
          "error"
        );
      }
    } catch (err) {
      console.error("Error creating employee:", err);
      showNotification("Error creating employee", "error");
    }
  })();
}

function editEmployee(employeeId) {
  const employee = employeesData.find(
    (emp) =>
      String(emp.id) === String(employeeId) ||
      String(emp.employeeId) === String(employeeId)
  );
  if (!employee) return;

  populateFormOptions().then(() => {
    document.getElementById("edit-employee-id").value = employee.id;
    document.getElementById("edit-employee-first-name").value =
      employee.firstName;
    document.getElementById("edit-employee-last-name").value = employee.lastName;
    document.getElementById("edit-employee-email").value = employee.email || "";
    document.getElementById("edit-employee-phone").value = employee.phone || "";
    document.getElementById("edit-employee-nic").value = employee.nic || "";
    const barcodeEl = document.getElementById("edit-employee-barcode");
    if (barcodeEl) barcodeEl.value = employee.employeeId || employee.id || "";
    const birthInput = document.getElementById("edit-employee-birth-date");
    if (employee.birthDate) {
      const bd = new Date(employee.birthDate);
      if (!isNaN(bd)) {
        birthInput.value = bd.toISOString().slice(0, 10);
      } else {
        birthInput.value = String(employee.birthDate).split("T")[0];
      }
    } else {
      birthInput.value = "";
    }
    const editPosSelect = document.getElementById("edit-employee-position");
    if (editPosSelect) {
      if (employee.roleId !== undefined && employee.roleId !== null) {
        editPosSelect.value = String(employee.roleId);
      } else if (employee.position) {
        const pos = positionsData.find(
          (p) =>
            (p.name || "").trim().toLowerCase() ===
            String(employee.position).trim().toLowerCase()
        );
        if (pos) editPosSelect.value = String(pos.id);
        else editPosSelect.value = employee.position;
      }
    }
    const genderSelect = document.getElementById("edit-employee-gender");
    const gRaw = employee.gender ?? "";
    const g = String(gRaw).toString().trim().toLowerCase();
    let desired = "";
    if (g === "m" || g === "male") desired = "Male";
    else if (g === "f" || g === "female") desired = "Female";
    else if (g === "other" || g === "o" || g === "non-binary" || g === "nb")
      desired = "Other";
    let matched = false;
    for (const opt of Array.from(genderSelect.options)) {
      if (
        String(opt.value).trim().toLowerCase() === desired.toLowerCase() &&
        desired
      ) {
        genderSelect.value = opt.value;
        matched = true;
        break;
      }
    }
    if (!matched) {
      for (const opt of Array.from(genderSelect.options)) {
        if (String(opt.value).trim().toLowerCase() === g) {
          genderSelect.value = opt.value;
          matched = true;
          break;
        }
      }
    }
    if (!matched) genderSelect.value = "";
    document.getElementById("edit-employee-salary").value = employee.salary;
    try {
      if (employee.address && typeof employee.address === "object") {
        document.getElementById("edit-employee-address-line1").value =
          employee.address.line1 || "";
        document.getElementById("edit-employee-address-line2").value =
          employee.address.line2 || "";
        const cityInput = document.getElementById("edit-employee-address-city");
        if (cityInput) {
          cityInput.value = employee.address.cityName || "";
        }
        document.getElementById("edit-employee-address-postalCode").value =
          employee.address.postalCode || "";
      } else {
        document.getElementById("edit-employee-address-line1").value =
          employee.address || "";
        document.getElementById("edit-employee-address-line2").value = "";
        const cityInput = document.getElementById("edit-employee-address-city");
        if (cityInput) cityInput.value = "";
        document.getElementById("edit-employee-address-postalCode").value = "";
      }
    } catch (e) {
      document.getElementById("edit-employee-address-line1").value =
        employee.address || "";
      document.getElementById("edit-employee-address-line2").value = "";
      const cityInput = document.getElementById("edit-employee-address-city");
      if (cityInput) cityInput.value = "";
      document.getElementById("edit-employee-address-postalCode").value = "";
    }
    document.getElementById("edit-employee-landline").value =
      employee.landline || "";
    document.getElementById("edit-employee-status").value =
      employee.status || "Active";

    openEditEmployeeModal();
  });
}

function handleEditEmployee(event) {
  event.preventDefault();

  const employeeId = document.getElementById("edit-employee-id").value;
  const firstName = document
    .getElementById("edit-employee-first-name")
    .value.trim();
  const lastName = document
    .getElementById("edit-employee-last-name")
    .value.trim();
  const email = document.getElementById("edit-employee-email").value.trim();
  const phone = normalizePhoneDigits(
    document.getElementById("edit-employee-phone").value
  );
  const nic = document.getElementById("edit-employee-nic").value.trim();
  const birthDate = document.getElementById("edit-employee-birth-date").value;
  const position = document.getElementById("edit-employee-position").value;
  const gender = document.getElementById("edit-employee-gender").value;
  const salary = parseFloat(
    document.getElementById("edit-employee-salary").value
  );
  const addressLine1 =
    document.getElementById("edit-employee-address-line1")?.value.trim() || "";
  const addressLine2 =
    document.getElementById("edit-employee-address-line2")?.value.trim() || "";
  const addressCity =
    document.getElementById("edit-employee-address-city")?.value.trim() || "";
  const addressPostal =
    document.getElementById("edit-employee-address-postalCode")?.value.trim() ||
    "";
  const landlineRaw = document
    .getElementById("edit-employee-landline")
    .value.trim();
  const landline = landlineRaw ? normalizePhoneDigits(landlineRaw) : "";
  const status = document.getElementById("edit-employee-status").value;

  let resolvedRoleId = null;
  if (position !== undefined && position !== null && position !== "") {
    const matchByName = positionsData.find(
      (p) =>
        String(p.name).trim().toLowerCase() ===
        String(position).trim().toLowerCase()
    );
    if (matchByName) resolvedRoleId = matchByName.id;
    else if (/^\d+$/.test(String(position))) resolvedRoleId = Number(position);
  }

  let existingRoleId = null;
  const existing = employeesData.find(
    (emp) =>
      String(emp.id) === String(employeeId) ||
      String(emp.employeeId) === String(employeeId)
  );
  if (existing) {
    existingRoleId =
      existing.roleId || (existing.role && existing.role.id) || null;
  }

  const roleId =
    resolvedRoleId !== null ? resolvedRoleId : existingRoleId;

  const clientError = validateEmployeeClientFields({
    nic,
    firstName,
    lastName,
    email,
    phone,
    landline,
    birthDate,
    roleId,
    addressLine1,
    addressCity,
    addressPostal,
  });
  if (clientError) {
    showNotification(clientError, "error");
    return;
  }

  (async () => {
    try {
      const token = getEmployeeAuthToken();
      const genderNorm = (gender || "").toString().trim().toLowerCase();
      let genderValue = "OTHER";
      if (genderNorm === "m" || genderNorm === "male") genderValue = "MALE";
      else if (genderNorm === "f" || genderNorm === "female")
        genderValue = "FEMALE";

      const addressObj = {
        line1: addressLine1,
        line2: addressLine2 || undefined,
        city: addressCity,
        postalCode: addressPostal,
      };

      const payload = {
        nic,
        firstName,
        lastName,
        email,
        mobileNumber: phone,
        landlineNumber: landline || null,
        gender: genderValue,
        dateOfBirth: birthDate,
        roleId,
        salary,
        statusId: status === "Active" ? 1 : 2,
        address: addressObj,
      };
      const res = await fetch(`${window.API_BASE_URL}/employee/${employeeId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const body = await res.json().catch(() => null);
      if (res.ok && body && body.success) {
        showNotification(
          `Employee ${firstName} ${lastName} updated successfully`,
          "success"
        );
        await loadEmployeeDirectoryData();
        closeEditEmployeeModal();
      } else {
        showNotification(
          (body && body.message) || "Failed to update employee",
          "error"
        );
      }
    } catch (err) {
      console.error("Error updating employee:", err);
      showNotification("Error updating employee", "error");
    }
  })();
}

function viewEmployeeDetails(employeeId) {
  const employee = employeesData.find(
    (emp) =>
      String(emp.id) === String(employeeId) ||
      String(emp.employeeId) === String(employeeId)
  );
  if (!employee) return;

  const initials = `${employee.firstName.charAt(0)}${employee.lastName.charAt(
    0
  )}`.toUpperCase();
  const detailsContent = document.getElementById("employee-details-content");

  if (detailsContent) {
    detailsContent.innerHTML = `
      <div class="space-y-6">
        <div class="flex items-center space-x-4">
          <div class="h-16 w-16 rounded-full bg-blue-100 flex items-center justify-center">
            <span class="text-blue-600 font-bold text-xl">${initials}</span>
          </div>
          <div>
            <h4 class="text-xl font-semibold text-gray-900">${
              employee.firstName
            } ${employee.lastName}</h4>
            <p class="text-gray-600">${employee.position}</p>
            <p class="text-sm text-gray-500">${employee.employeeId}</p>
          </div>
        </div>
        
        <div class="grid grid-cols-2 gap-6">
          <div>
            <h5 class="font-medium text-gray-900 mb-3">Contact Information</h5>
                <div class="text-sm text-gray-700">
                  ${
                    employee.address && typeof employee.address === "object"
                      ? `
                    <div>${employee.address.line1 || ""}</div>
                    ${
                      employee.address.line2
                        ? `<div>${employee.address.line2}</div>`
                        : ""
                    }
                    <div>${employee.address.cityName || ""} ${
                          employee.address.postalCode
                            ? "- " + employee.address.postalCode
                            : ""
                        }</div>
                  `
                      : `<div>${employee.address || "Not provided"}</div>`
                  }
                </div>
              <div><span class="text-gray-500">Email:</span> ${
                employee.email
              }</div>
              <div><span class="text-gray-500">Phone:</span> ${
                employee.phone
              }</div>
              ${
                employee.landline
                  ? `<div><span class="text-gray-500">Landline:</span> ${employee.landline}</div>`
                  : ""
              }
            </div>
          </div>
                <!-- Address preview / edit is available in the Edit modal -->
          <div>
            <h5 class="font-medium text-gray-900 mb-3">Employment Details</h5>
            <div class="space-y-2 text-sm">
              <div><span class="text-gray-500">Hire Date:</span> ${
                employee.hireDate
              }</div>
              <div><span class="text-gray-500">Salary:</span> Rs. ${employee.salary.toLocaleString()}</div>
              <div><span class="text-gray-500">Status:</span> 
                <span class="px-2 py-1 text-xs rounded-full ${
                  employee.status === "Active"
                    ? "bg-green-100 text-green-800"
                    : "bg-red-100 text-red-800"
                }">${employee.status}</span>
              </div>
            </div>
          </div>
        </div>
        
        ${
          employee.leaves
            ? `
          <div>
            <h5 class="font-medium text-gray-900 mb-3">Leave Balance</h5>
            <div class="grid grid-cols-3 gap-4">
              <div class="bg-blue-50 p-3 rounded-lg">
                <div class="text-sm text-gray-600">Annual Leave</div>
                <div class="font-semibold">${employee.leaves.annual.remaining}/${employee.leaves.annual.total}</div>
              </div>
              <div class="bg-green-50 p-3 rounded-lg">
                <div class="text-sm text-gray-600">Sick Leave</div>
                <div class="font-semibold">${employee.leaves.sick.remaining}/${employee.leaves.sick.total}</div>
              </div>
              <div class="bg-orange-50 p-3 rounded-lg">
                <div class="text-sm text-gray-600">Casual Leave</div>
                <div class="font-semibold">${employee.leaves.casual.remaining}/${employee.leaves.casual.total}</div>
              </div>
            </div>
          </div>
        `
            : ""
        }
      </div>
    `;
  }

  openEmployeeDetailsModal();
}

function deleteEmployee(employeeId) {
  const employee = employeesData.find(
    (emp) =>
      String(emp.id) === String(employeeId) ||
      String(emp.employeeId) === String(employeeId)
  );
  if (!employee) return;
  if (
    confirm(
      `Are you sure you want to delete ${employee.firstName} ${employee.lastName}? This action cannot be undone.`
    )
  ) {
    (async () => {
      try {
        const token =
          localStorage.getItem("authToken") ||
          sessionStorage.getItem("authToken") ||
          "";

        const res = await fetch(
          `${window.API_BASE_URL}/employee/${employee.id}`,
          {
            method: "DELETE",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const body = await res.json().catch(() => null);
        if (res.ok) {
          showNotification(
            `Employee ${employee.firstName} ${employee.lastName} deleted successfully`,
            "success"
          );
          await loadEmployeeDirectoryData();
        } else {
          showNotification(
            (body && body.message) ||
              res.statusText ||
              "Failed to delete employee",
            "error"
          );
        }
      } catch (err) {
        console.error("Error deleting employee:", err);
        showNotification("Error deleting employee", "error");
      }
    })();
  }
}

// Attendance functions
function loadAttendanceData() {
  const today = new Date().toISOString().split("T")[0];
  const attendanceDateInput = document.getElementById("attendance-date");
  if (attendanceDateInput) {
    attendanceDateInput.value = today;
  }
  loadAttendanceForDate();
}

function loadAttendanceForDate() {
  var dateInput = document.getElementById("attendance-date");
  var selectedDate =
    dateInput && dateInput.value
      ? dateInput.value
      : new Date().toISOString().split("T")[0];
  var tableBody = document.getElementById("attendance-table-body");
  if (!tableBody) return;

  var list =
    attendanceFilteredEmployees && attendanceFilteredEmployees.length
      ? attendanceFilteredEmployees
      : employeesData;

  // For attendance, fetch per-employee attendance calendar for the selected month and pick the selected day
  (async () => {
    try {
      const token =
        localStorage.getItem("authToken") ||
        sessionStorage.getItem("authToken") ||
        "";
      const dObj = new Date(selectedDate);
      const month = dObj.getMonth() + 1;
      const year = dObj.getFullYear();
      const rows = await Promise.all(
        list.map(async (employee) => {
          try {
            const res = await fetch(
              `${window.API_BASE_URL}/attendance/employee/${employee.id}?month=${month}&year=${year}`,
              {
                method: "GET",
                cache: "no-store",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${token}`,
                  "Cache-Control": "no-cache",
                },
              }
            );
            const body = await res.json().catch(() => null);
            // Normalize server response and prefer matching by date or checkInTime local/UTC day
            let rec = null;
            const toUTCKey = (inp) => {
              try {
                const d = new Date(inp);
                if (isNaN(d)) return String(inp).split("T")[0];
                return `${d.getUTCFullYear()}-${String(
                  d.getUTCMonth() + 1
                ).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
              } catch {
                return String(inp).split("T")[0];
              }
            };
            const toLocalKey = (inp) => {
              try {
                const d = new Date(inp);
                if (isNaN(d)) return String(inp).split("T")[0];
                return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
                  2,
                  "0"
                )}-${String(d.getDate()).padStart(2, "0")}`;
              } catch {
                return String(inp).split("T")[0];
              }
            };
            const dateKey = String(selectedDate);
            if (body && body.success && body.data) {
              const d = body.data;
              const entries = Array.isArray(d)
                ? d
                : d && Array.isArray(d.calendar)
                ? d.calendar
                : d
                ? [d]
                : [];
              rec =
                entries.find((r) => {
                  const rDate = r.date ? String(r.date).split("T")[0] : null;
                  if (rDate && rDate === dateKey) return true;
                  if (r.checkInTime) {
                    if (toUTCKey(r.checkInTime) === dateKey) return true;
                    if (toLocalKey(r.checkInTime) === dateKey) return true;
                  }
                  return false;
                }) || null;
            }
            const status =
              rec?.attendanceStatus?.name ||
              rec?.status ||
              rec?.attendanceStatusName ||
              "Not Marked";
            const checkIn = formatDateTime(
              rec?.checkInTime || rec?.checkIn || "-"
            );
            const checkOut = formatDateTime(
              rec?.checkOutTime || rec?.checkOut || "-"
            );
            const hoursWorked = rec?.hoursWorked || rec?.hours || "-";

            return (
              `<tr class="hover:bg-gray-50" data-emp-id="${employee.id}">` +
              `<td class="px-6 py-4 whitespace-nowrap"><div class="text-sm font-medium text-gray-900">${employee.firstName} ${employee.lastName}</div><div class="text-sm text-gray-500">${employee.employeeId}</div></td>` +
              `<td class="px-6 py-4 whitespace-nowrap attendance-status-cell"><span class="px-2 py-1 text-xs font-semibold rounded-full ${getAttendanceStatusColor(
                status
              )}">${status}</span></td>` +
              `<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 attendance-checkin-cell">${checkIn}</td>` +
              `<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 attendance-checkout-cell">${checkOut}</td>` +
              `<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 attendance-hours-cell">${
                typeof hoursWorked === "number"
                  ? hoursWorked.toFixed(2)
                  : hoursWorked
              }</td>` +
              `<td class="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">` +
              `<button onclick="markIn('${employee.id}')" class="text-green-600 hover:text-green-900 p-1 rounded" title="Mark In"><i data-feather="log-in" class="w-4 h-4"></i></button>` +
              `<button onclick="markOut('${employee.id}')" class="text-red-600 hover:text-red-900 p-1 rounded" title="Mark Out"><i data-feather="log-out" class="w-4 h-4"></i></button>` +
              `<button onclick="openAttendanceCalendar('${employee.id}')" class="text-blue-600 hover:text-blue-900 p-1 rounded" title="View Calendar"><i data-feather="calendar" class="w-4 h-4"></i></button>` +
              `</td></tr>`
            );
          } catch (err) {
            return `<tr class="hover:bg-gray-50"><td class="px-6 py-4">${employee.firstName} ${employee.lastName}</td><td colspan="5">Error loading attendance</td></tr>`;
          }
        })
      );

      tableBody.innerHTML = rows.join("");
      if (typeof feather !== "undefined") feather.replace();
    } catch (err) {
      console.error("Error loading attendance rows:", err);
      // fallback to client-side records
      tableBody.innerHTML = "";
    }
  })();

  if (typeof feather !== "undefined") {
    feather.replace();
  }
}

function getAttendanceStatusColor(status) {
  const colors = {
    Present: "bg-green-100 text-green-800",
    Absent: "bg-red-100 text-red-800",
    Late: "bg-orange-100 text-orange-800",
    "Annual Leave": "bg-blue-100 text-blue-800",
    "Sick Leave": "bg-yellow-100 text-yellow-800",
    "Not Marked": "bg-gray-100 text-gray-800",
  };
  return colors[status] || "bg-gray-100 text-gray-800";
}

// Format ISO-like timestamps to a local date/time string
function formatDateTime(dt) {
  if (!dt || dt === "-" || dt === "N/A") return dt || "-";
  try {
    const d = new Date(dt);
    if (isNaN(d)) return String(dt);
    return d.toLocaleString("en-US", {
      month: "2-digit",
      day: "2-digit",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
  } catch {
    return String(dt);
  }
}

// Format time-only strings or Date-like values to HH:MM
function formatTime(input) {
  if (!input) return "";
  try {
    const d = new Date(input);
    if (!isNaN(d)) {
      return `${String(d.getHours()).padStart(2, "0")}:${String(
        d.getMinutes()
      ).padStart(2, "0")}`;
    }
    // If input is already a time string like "09:00" or "09:00:00"
    const m = String(input).match(/(\d{1,2}:\d{2})/);
    return m ? m[1] : String(input);
  } catch (e) {
    return String(input);
  }
}

// Generate attendance table text for fallback
function generateAttendanceTableText(attendanceRecords, year, monthNum) {
  const daysInMonth = new Date(year, monthNum, 0).getDate();
  const attendanceMap = {};

  // Create a map of attendance records by date
  (attendanceRecords || []).forEach((r) => {
    const dateKey = new Date(r.date).getDate();
    attendanceMap[dateKey] = {
      status: r.status || r.attendanceStatus?.name || "Not Marked",
      checkIn:
        r.checkInTime || r.checkIn
          ? formatTime(r.checkInTime || r.checkIn)
          : "-",
      checkOut:
        r.checkOutTime || r.checkOut
          ? formatTime(r.checkOutTime || r.checkOut)
          : "-",
      hours: r.hoursWorked || r.hours || "0",
    };
  });

  let table = "Date       | Status      | Check In | Check Out| Hours\n";
  table += "--------------------------------------------------------\n";

  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(monthNum).padStart(2, "0")}-${String(
      day
    ).padStart(2, "0")}`;
    const dayData = attendanceMap[day] || {
      status: "Not Marked",
      checkIn: "-",
      checkOut: "-",
      hours: "0",
    };

    table += `${dateStr} | ${dayData.status.padEnd(
      11
    )} | ${dayData.checkIn.padEnd(8)} | ${dayData.checkOut.padEnd(8)}| ${
      dayData.hours
    }\n`;
  }

  // Add summary
  const presentDays = Object.values(attendanceMap).filter(
    (d) => d.status === "Present"
  ).length;
  const totalHours = Object.values(attendanceMap).reduce(
    (sum, d) => sum + parseFloat(d.hours || 0),
    0
  );

  table += "\nSUMMARY:\n";
  table += `Present Days: ${presentDays}\n`;
  table += `Total Hours: ${totalHours.toFixed(2)}\n`;

  return table;
}

// Payroll functions
async function loadPayrollData() {
  const tableBody = document.getElementById("payroll-table-body");
  if (!tableBody) return;

  try {
    const monthValue =
      document.getElementById("payroll-month")?.value ||
      (() => {
        const n = new Date();
        return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(
          2,
          "0"
        )}`;
      })();
    const [year, month] = monthValue.split("-");

    const token =
      localStorage.getItem("authToken") ||
      sessionStorage.getItem("authToken") ||
      "";

    if (!token) {
      showNotification("Authentication required", "error");
      return;
    }

    // Fetch payroll data from backend
    const response = await fetch(
      `${window.API_BASE_URL}/payroll?month=${month}&year=${year}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      let errorMessage = `HTTP error! status: ${response.status}`;
      let errorDetails = "";
      try {
        const errorData = await response.json();
        if (errorData.message) {
          errorMessage += ` - ${errorData.message}`;
        }
        if (errorData.error) {
          errorDetails = errorData.error;
        }
        console.error("Full error response:", errorData);
      } catch (e) {
        // Error response might not be JSON, try to get text
        try {
          const errorText = await response.text();
          errorDetails = errorText;
          console.error("Error response text:", errorText);
        } catch (e2) {
          console.error("Could not parse error response");
        }
      }
      const fullError = new Error(errorMessage);
      fullError.details = errorDetails;
      throw fullError;
    }

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.message || "Failed to fetch payroll data");
    }

    payrollData = result.data.payrolls || [];

    // Apply search filter if active
    const searchTerm =
      document.getElementById("payroll-search")?.value.toLowerCase() || "";
    const filteredPayrolls = payrollData.filter((payroll) => {
      if (!searchTerm) return true;
      return (
        payroll.employeeName.toLowerCase().includes(searchTerm) ||
        payroll.employeeId.toString().includes(searchTerm) ||
        payroll.role.toLowerCase().includes(searchTerm)
      );
    });

    // Show helpful message if no data
    if (filteredPayrolls.length === 0) {
      if (payrollData.length === 0) {
        tableBody.innerHTML = `
          <tr>
            <td colspan="9" class="px-6 py-8 text-center text-gray-500">
              <div class="flex flex-col items-center">
                <i data-feather="users" class="w-8 h-8 mb-2"></i>
                <p class="text-lg font-medium mb-1">No employee data found</p>
                <p class="text-sm">No employees found for ${month}/${year}. Make sure employees are added to the system.</p>
              </div>
            </td>
          </tr>
        `;
      } else {
        tableBody.innerHTML = `
          <tr>
            <td colspan="9" class="px-6 py-8 text-center text-gray-500">
              <div class="flex flex-col items-center">
                <i data-feather="search" class="w-8 h-8 mb-2"></i>
                <p class="text-lg font-medium mb-1">No matching employees found</p>
                <p class="text-sm">Try adjusting your search term or clear the search to see all employees.</p>
              </div>
            </td>
          </tr>
        `;
      }
      if (typeof feather !== "undefined") feather.replace();
      return;
    }

    tableBody.innerHTML = filteredPayrolls
      .map((payroll) => {
        const netSalary = Number(payroll.netSalary) || 0;
        const adv = Number(payroll.salaryAdvanceToRecover) || 0;

        // Default status to "Pending" if it's "Not Created" or any other status
        const displayStatus =
          payroll.status === "Not Created" || !payroll.status
            ? "Pending"
            : payroll.status;

        return `
          <tr class="hover:bg-gray-50">
            <td class="px-6 py-4 whitespace-nowrap">
              <div class="text-sm font-medium text-gray-900">${
                payroll.employeeName
              }</div>
              <div class="text-sm text-gray-500">ID: ${payroll.employeeId} • ${
          payroll.role
        }</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">Rs. ${payroll.basicSalary.toLocaleString()}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">Rs. ${(
              payroll.allowances || 0
            ).toLocaleString()}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">Rs. ${(
              payroll.overtime || 0
            ).toLocaleString()}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">Rs. ${(
              payroll.deductions || 0
            ).toLocaleString()}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-amber-700">Rs. ${adv.toLocaleString()}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Rs. ${netSalary.toLocaleString()}</td>
            <td class="px-6 py-4 whitespace-nowrap">
              <span class="px-2 py-1 text-xs font-semibold rounded-full ${getPayrollStatusColor(
                displayStatus
              )}">${displayStatus}</span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
              <button onclick="openPayrollAdvanceModal('${
                payroll.employeeId
              }')" class="text-amber-600 hover:text-amber-900 mr-2 p-1 rounded" title="Record advance payment">
                <i data-feather="dollar-sign" class="w-4 h-4"></i>
              </button>
              <button onclick="editPayroll('${
                payroll.employeeId
              }')" class="text-green-600 hover:text-green-900 mr-3 p-1 rounded" title="Edit Payroll">
                <i data-feather="edit" class="w-4 h-4"></i>
              </button>
              <button onclick="viewPayslip('${
                payroll.employeeId
              }')" class="text-blue-600 hover:text-blue-900 p-1 rounded" title="View Payslip">
                <i data-feather="eye" class="w-4 h-4"></i>
              </button>
            </td>
          </tr>
        `;
      })
      .join("");

    // Update total payroll stat
    const totalPayroll = filteredPayrolls.reduce(
      (sum, payroll) => sum + payroll.netSalary,
      0
    );
    const totalPayrollElement = document.getElementById("total-payroll");
    if (totalPayrollElement) {
      totalPayrollElement.textContent = `Rs. ${(totalPayroll / 1000).toFixed(
        0
      )}K`;
    }

    if (typeof feather !== "undefined") {
      feather.replace();
    }
  } catch (error) {
    console.error("Error loading payroll data:", error);
    console.error("Full error object:", error);

    // Handle different types of errors
    if (error.message.includes("500")) {
      // Server error - possibly no data in database
      showNotification(
        "Server error: Database might be empty or not properly set up",
        "error"
      );

      // Show empty state and the raw backend error for debugging
      tableBody.innerHTML = `
        <tr>
          <td colspan="9" class="px-6 py-8 text-left text-gray-500">
            <div>
              <i data-feather="database" class="w-8 h-8 mb-2"></i>
              <p class="mb-2">Server Error (500): Unable to load payroll data</p>
              <p class="text-sm text-gray-400 mb-2">Backend service encountered an error. Details below:</p>
              <div class="mb-2">
                <button onclick="loadPayrollData()" class="btn-secondary px-4 py-2">Try Again</button>
              </div>
              <div class="mt-2 p-3 bg-red-50 border-l-4 border-red-400 text-red-700 text-sm">
                <p class="font-medium mb-1">Error Message:</p>
                <pre class="mb-2">${error.message}</pre>
                ${
                  error.details
                    ? `<p class="font-medium mb-1">Additional Details:</p><pre class="whitespace-pre-wrap">${error.details}</pre>`
                    : ""
                }
              </div>
            </div>
          </td>
        </tr>
      `;
    } else if (error.message.includes("401") || error.message.includes("403")) {
      // Authentication error
      showNotification("Authentication required. Please login again.", "error");
      tableBody.innerHTML = `
        <tr>
          <td colspan="9" class="px-6 py-8 text-center text-gray-500">
            <div class="flex flex-col items-center">
              <i data-feather="lock" class="w-8 h-8 mb-2"></i>
              <p>Authentication required</p>
              <button onclick="window.location.reload()" class="mt-2 text-blue-600 hover:text-blue-800">Refresh Page</button>
            </div>
          </td>
        </tr>
      `;
    } else {
      // Other errors
      showNotification(
        "Failed to load payroll data: " + error.message,
        "error"
      );
      tableBody.innerHTML = `
        <tr>
          <td colspan="9" class="px-6 py-8 text-center text-gray-500">
            <div class="flex flex-col items-center">
              <i data-feather="alert-circle" class="w-8 h-8 mb-2"></i>
              <p>Failed to load payroll data</p>
              <p class="text-sm mt-1">${error.message}</p>
              <button onclick="loadPayrollData()" class="mt-2 text-blue-600 hover:text-blue-800">Try Again</button>
            </div>
          </td>
        </tr>
      `;
    }

    if (typeof feather !== "undefined") {
      feather.replace();
    }
  }
}

function getPayrollStatusColor(status) {
  const colors = {
    Paid: "bg-green-100 text-green-800",
    Pending: "bg-yellow-100 text-yellow-800",
    Processing: "bg-blue-100 text-blue-800",
  };
  return colors[status] || "bg-gray-100 text-gray-800";
}

// Utility functions
function markAttendance() {
  // Simulate marking attendance for all employees
  const currentTime = new Date().toLocaleTimeString("en-US", {
    hour12: true,
    hour: "2-digit",
    minute: "2-digit",
  });
  const date =
    document.getElementById("attendance-date")?.value ||
    new Date().toISOString().split("T")[0];
  employeesData.forEach((employee) => {
    const rec = getOrCreateAttendanceRecord(employee, date, true);
    if (!rec.checkIn) {
      rec.checkIn = currentTime;
      rec.status = getStatusFromTime();
    }
  });
  loadAttendanceForDate();
  showNotification("Attendance marked for all employees", "success");
}

async function generatePayroll() {
  try {
    const month =
      document.getElementById("payroll-month")?.value ||
      (() => {
        const n = new Date();
        return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(
          2,
          "0"
        )}`;
      })();
    const token =
      localStorage.getItem("authToken") ||
      sessionStorage.getItem("authToken") ||
      "";

    if (!token) {
      showNotification("Authentication required", "error");
      return;
    }

    // First, get all employees to generate payroll for
    const empResponse = await fetch(`${window.API_BASE_URL}/employee`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    if (!empResponse.ok) {
      throw new Error("Failed to fetch employees");
    }

    const empResult = await empResponse.json();
    if (!empResult.success || !empResult.data) {
      throw new Error("No employees found");
    }

    const employees = empResult.data;
    let successCount = 0;
    let errorCount = 0;

    // Generate payroll for each employee (only if not already exists)
    for (const employee of employees) {
      try {
        const payrollData = {
          employeeId: employee.id,
          month: month,
          allowances: Math.round((employee.salary || 0) * 0.05), // 5% allowances
          overtime: 0, // Default overtime
          deductions: Math.round((employee.salary || 0) * 0.08), // 8% deductions
          statusId: 1, // Assuming 1 is "Pending" status
        };

        const response = await fetch(`${window.API_BASE_URL}/payroll`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payrollData),
        });

        if (response.ok) {
          successCount++;
        } else {
          errorCount++;
          console.error(`Failed to create payroll for employee ${employee.id}`);
        }
      } catch (error) {
        errorCount++;
        console.error(
          `Error creating payroll for employee ${employee.id}:`,
          error
        );
      }
    }

    if (successCount > 0) {
      showNotification(
        `Payroll generated successfully for ${successCount} employees${
          errorCount > 0 ? ` (${errorCount} failed)` : ""
        }`,
        "success"
      );
    } else if (errorCount > 0) {
      showNotification(
        `Failed to generate payroll for ${errorCount} employees`,
        "error"
      );
    }

    // Refresh the payroll data
    await loadPayrollData();
  } catch (error) {
    console.error("Error generating payroll:", error);
    showNotification("Failed to generate payroll: " + error.message, "error");
  }
}

function processPayroll(employeeId) {
  const employee = employeesData.find(
    (emp) =>
      String(emp.id) === String(employeeId) ||
      String(emp.employeeId) === String(employeeId)
  );
  if (employee) {
    showNotification(
      `Payment processed for ${employee.firstName} ${employee.lastName}`,
      "success"
    );
    loadPayrollData();
  }
}

function generatePayslip(employeeId) {
  const employee = employeesData.find(
    (emp) =>
      String(emp.id) === String(employeeId) ||
      String(emp.employeeId) === String(employeeId)
  );
  if (employee) {
    showNotification(
      `Payslip generated for ${employee.firstName} ${employee.lastName}`,
      "success"
    );
  }
}

function viewPayroll(employeeId) {
  switchEmployeeTab("payroll");
  setTimeout(() => {
    const employee = employeesData.find(
      (emp) =>
        String(emp.id) === String(employeeId) ||
        String(emp.employeeId) === String(employeeId)
    );
    if (employee) {
      showNotification(
        `Viewing payroll for ${employee.firstName} ${employee.lastName}`,
        "info"
      );
    }
  }, 300);
}

function markEmployeeAttendance(employeeId) {
  const employee = employeesData.find(
    (emp) =>
      String(emp.id) === String(employeeId) ||
      String(emp.employeeId) === String(employeeId)
  );
  if (employee) {
    const statuses = ["Present", "Late", "Absent"];
    const newStatus = statuses[Math.floor(Math.random() * statuses.length)];
    employee.attendance = newStatus;
    loadAttendanceForDate();
    updateEmployeeStats();
    showNotification(
      `Attendance marked as ${newStatus} for ${employee.firstName} ${employee.lastName}`,
      "success"
    );
  }
}

function initializeEmployeesPage() {
  loadEmployeeDirectoryData();

  // Set up event listeners after the page loads
  setTimeout(() => {
    if (typeof feather !== "undefined") {
      feather.replace();
    }
  }, 100);
}

// =============================
// Attendance helpers & actions
// =============================
let attendanceFilteredEmployees = [];

function filterAttendanceList() {
  const term =
    document.getElementById("attendance-search")?.value.toLowerCase() || "";
  attendanceFilteredEmployees = employeesData.filter((e) => {
    return (
      !term ||
      String(e.firstName || "")
        .toLowerCase()
        .includes(term) ||
      String(e.lastName || "")
        .toLowerCase()
        .includes(term) ||
      String(e.employeeId || e.id || "")
        .toLowerCase()
        .includes(term) ||
      String(e.email || "")
        .toLowerCase()
        .includes(term)
    );
  });
  loadAttendanceForDate();
}

function getOrCreateAttendanceRecord(employee, date, createIfMissing = true) {
  if (!employee.attendanceRecord) employee.attendanceRecord = [];
  let rec = employee.attendanceRecord.find((r) => r.date === date);
  if (!rec && createIfMissing) {
    rec = {
      date,
      status: "Not Marked",
      checkIn: null,
      checkOut: null,
      hours: 0,
    };
    employee.attendanceRecord.push(rec);
  }
  return rec;
}

function getStatusFromTime(dateObj = new Date()) {
  const hour = dateObj.getHours();
  const minute = dateObj.getMinutes();
  // 9:05 threshold
  if (hour > 9 || (hour === 9 && minute > 5)) return "Late";
  return "Present";
}

function markIn(employeeId) {
  const emp = employeesData.find(
    (e) =>
      String(e.id) === String(employeeId) ||
      String(e.employeeId) === String(employeeId)
  );
  if (!emp) return;
  const date =
    document.getElementById("attendance-date")?.value ||
    new Date().toISOString().split("T")[0];
  (async () => {
    try {
      const token =
        localStorage.getItem("authToken") ||
        sessionStorage.getItem("authToken") ||
        "";
      // Query server for existing attendance record for this date by requesting the month calendar
      const dObj = new Date(date);
      const month = dObj.getMonth() + 1;
      const year = dObj.getFullYear();
      const checkRes = await fetch(
        `${window.API_BASE_URL}/attendance/employee/${emp.id}?month=${month}&year=${year}`,
        {
          method: "GET",
          cache: "no-store",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            "Cache-Control": "no-cache",
          },
        }
      );
      const checkBody = await checkRes.json().catch(() => null);
      console.debug(
        "markIn: attendance GET response for",
        emp.id,
        date,
        checkBody
      );
      // Normalize server response: it may be { data: { calendar: [...] } }, an array, or a single record
      let serverDay = null;
      const toUTCKey = (inp) => {
        try {
          const d = new Date(inp);
          if (isNaN(d)) return String(inp).split("T")[0];
          const y = d.getUTCFullYear();
          const m = String(d.getUTCMonth() + 1).padStart(2, "0");
          const dd = String(d.getUTCDate()).padStart(2, "0");
          return `${y}-${m}-${dd}`;
        } catch (e) {
          return String(inp).split("T")[0];
        }
      };
      const dateKey = toUTCKey(date);
      if (checkBody && checkBody.success) {
        const d = checkBody.data;
        if (Array.isArray(d)) {
          serverDay =
            d.find((r) => toUTCKey(r.date) === dateKey) || d[0] || null;
        } else if (d && Array.isArray(d.calendar)) {
          serverDay =
            d.calendar.find((r) => toUTCKey(r.date) === dateKey) || null;
        } else if (d && (d.checkInTime || d.checkIn || d.date)) {
          // assume single record; ensure dates match
          serverDay = toUTCKey(d.date) === dateKey ? d : null;
        }
      }

      // Also consider checkInTime timestamps that may fall on the same local/UTC day
      const toLocalKey = (inp) => {
        try {
          const d = new Date(inp);
          if (isNaN(d)) return String(inp).split("T")[0];
          const y = d.getFullYear();
          const m = String(d.getMonth() + 1).padStart(2, "0");
          const dd = String(d.getDate()).padStart(2, "0");
          return `${y}-${m}-${dd}`;
        } catch (e) {
          return String(inp).split("T")[0];
        }
      };

      if (!serverDay && checkBody && checkBody.success) {
        const d = checkBody.data;
        const allEntries = Array.isArray(d)
          ? d
          : d && d.calendar
          ? d.calendar
          : d
          ? [d]
          : [];
        serverDay =
          allEntries.find((r) => {
            try {
              const rDateKey = toUTCKey(r.date);
              if (rDateKey === dateKey) return true;
              if (r.checkInTime) {
                if (toUTCKey(r.checkInTime) === dateKey) return true;
                if (toLocalKey(r.checkInTime) === dateKey) return true;
              }
              return false;
            } catch (e) {
              return false;
            }
          }) ||
          serverDay ||
          null;
      }

      if (serverDay && (serverDay.checkInTime || serverDay.checkIn)) {
        console.debug("markIn: detected serverDay with checkIn:", serverDay);
        showNotification(
          (checkBody && checkBody.message) ||
            "Employee has already checked in for this date",
          "info"
        );
        return;
      }

      // Proceed to POST check-in
      console.debug("markIn: proceeding to POST check-in for", emp.id, date);
      const res = await fetch(`${window.API_BASE_URL}/attendance/check-in`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ employeeId: String(emp.id), date }),
      });
      const body = await res.json().catch(() => null);
      if (res.ok && body && body.success) {
        showNotification("Marked IN successfully", "success");
        // Update the row cells directly
        try {
          const row = document.querySelector(`tr[data-emp-id="${emp.id}"]`);
          if (row) {
            const checkinCell = row.querySelector(".attendance-checkin-cell");
            const statusCell = row.querySelector(
              ".attendance-status-cell span"
            );
            if (checkinCell)
              checkinCell.textContent = formatDateTime(
                body.data.checkInTime || body.data.checkIn || "-"
              );
            if (statusCell) {
              statusCell.textContent =
                body.data.status ||
                body.data.attendanceStatus?.name ||
                "Present";
              statusCell.className = `px-2 py-1 text-xs font-semibold rounded-full ${getAttendanceStatusColor(
                statusCell.textContent
              )}`;
            }
          }
        } catch (e) {
          console.warn("Failed to update attendance row DOM", e);
        }
        loadAttendanceForDate();
        updateEmployeeStats();
        // If calendar modal open for this employee, re-render
        if (
          attendanceCalendarState.employeeId &&
          String(attendanceCalendarState.employeeId) === String(emp.id)
        ) {
          renderAttendanceCalendar();
        }
      } else {
        // If server reports already checked in, surface as info and refresh
        const errMsg =
          body && (body.error || body.message)
            ? body.error || body.message
            : null;
        if (errMsg && /already checked in/i.test(errMsg)) {
          showNotification(errMsg, "info");
          loadAttendanceForDate();
          if (
            attendanceCalendarState.employeeId &&
            String(attendanceCalendarState.employeeId) === String(emp.id)
          ) {
            renderAttendanceCalendar();
          }
        } else {
          showNotification(errMsg || "Failed to mark IN", "error");
        }
      }
    } catch (err) {
      console.error("Error marking in:", err);
      showNotification("Error marking in", "error");
    }
  })();
}

function markOut(employeeId) {
  const emp = employeesData.find(
    (e) =>
      String(e.id) === String(employeeId) ||
      String(e.employeeId) === String(employeeId)
  );
  if (!emp) return;
  const date =
    document.getElementById("attendance-date")?.value ||
    new Date().toISOString().split("T")[0];
  (async () => {
    try {
      const token =
        localStorage.getItem("authToken") ||
        sessionStorage.getItem("authToken") ||
        "";
      // Query server for existing attendance record for this date
      // Query server month calendar for this date
      const dObj = new Date(date);
      const month = dObj.getMonth() + 1;
      const year = dObj.getFullYear();
      const checkRes = await fetch(
        `${window.API_BASE_URL}/attendance/employee/${emp.id}?month=${month}&year=${year}`,
        {
          method: "GET",
          cache: "no-store",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            "Cache-Control": "no-cache",
          },
        }
      );
      const checkBody = await checkRes.json().catch(() => null);
      console.debug(
        "markOut: attendance GET response for",
        emp.id,
        date,
        checkBody
      );
      let serverDay = null;
      const toUTCKey2 = (inp) => {
        try {
          const d = new Date(inp);
          if (isNaN(d)) return String(inp).split("T")[0];
          const y = d.getUTCFullYear();
          const m = String(d.getUTCMonth() + 1).padStart(2, "0");
          const dd = String(d.getUTCDate()).padStart(2, "0");
          return `${y}-${m}-${dd}`;
        } catch (e) {
          return String(inp).split("T")[0];
        }
      };
      const toLocalKey2 = (inp) => {
        try {
          const d = new Date(inp);
          if (isNaN(d)) return String(inp).split("T")[0];
          const y = d.getFullYear();
          const m = String(d.getMonth() + 1).padStart(2, "0");
          const dd = String(d.getDate()).padStart(2, "0");
          return `${y}-${m}-${dd}`;
        } catch (e) {
          return String(inp).split("T")[0];
        }
      };
      const dateKey2 = toUTCKey2(date);
      // Build a unified list of entries and a robust matcher that checks r.date, r.checkInTime, r.checkOutTime
      const buildEntries = (d) =>
        Array.isArray(d) ? d : d && d.calendar ? d.calendar : d ? [d] : [];
      const matchesDateKey = (r, key) => {
        try {
          const candidates = [];
          if (r.date) {
            candidates.push(toUTCKey2(r.date));
            candidates.push(toLocalKey2(r.date));
          }
          if (r.checkInTime) {
            candidates.push(toUTCKey2(r.checkInTime));
            candidates.push(toLocalKey2(r.checkInTime));
          }
          if (r.checkOutTime) {
            candidates.push(toUTCKey2(r.checkOutTime));
            candidates.push(toLocalKey2(r.checkOutTime));
          }
          return candidates.includes(key);
        } catch (e) {
          return false;
        }
      };

      if (checkBody && checkBody.success) {
        const allEntries = buildEntries(checkBody.data);
        serverDay = allEntries.find((r) => matchesDateKey(r, dateKey2)) || null;
        // if still not found, use first entry (fallback) only if it has checkIn
        if (!serverDay)
          serverDay =
            allEntries.find((r) => r.checkInTime || r.checkIn) || null;
      }

      // If still not found, try a cache-busted refetch to avoid 304 responses
      if (!serverDay) {
        try {
          const bustRes = await fetch(
            `${window.API_BASE_URL}/attendance/employee/${
              emp.id
            }?month=${month}&year=${year}&_ts=${Date.now()}`,
            {
              method: "GET",
              cache: "no-store",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
                "Cache-Control": "no-cache",
              },
            }
          );
          const bustBody = await bustRes.json().catch(() => null);
          if (bustBody && bustBody.success) {
            const d2 = bustBody.data;
            const allEntries2 = Array.isArray(d2)
              ? d2
              : d2 && d2.calendar
              ? d2.calendar
              : d2
              ? [d2]
              : [];
            serverDay =
              allEntries2.find((r) => {
                try {
                  if (r.date && toUTCKey2(r.date) === dateKey2) return true;
                  if (r.checkInTime) {
                    if (toUTCKey2(r.checkInTime) === dateKey2) return true;
                    if (toLocalKey2(r.checkInTime) === dateKey2) return true;
                  }
                  return false;
                } catch {
                  return false;
                }
              }) || null;
          }
        } catch (err) {
          console.debug("markOut: cache-busted refetch failed", err);
        }
      }

      if (!serverDay || !(serverDay.checkInTime || serverDay.checkIn)) {
        console.debug("markOut: no serverDay or no checkIn:", serverDay);
        showNotification(
          "Employee has not checked in yet for this date",
          "error"
        );
        return;
      }
      if (serverDay.checkOutTime || serverDay.checkOut) {
        showNotification(
          "Employee has already checked out for this date",
          "info"
        );
        return;
      }

      // Build candidate dates to try for check-out (serverDay.date, selected date, checkInTime-derived)
      const candidates = [];
      if (serverDay && (serverDay.date || serverDay.attendanceDate)) {
        candidates.push(serverDay.date || serverDay.attendanceDate);
      }
      // prefer the selected date as a fallback
      candidates.push(date);
      // derive from checkInTime if present
      const ci = serverDay && (serverDay.checkInTime || serverDay.checkIn);
      if (ci) {
        try {
          const ciUTC = toUTCKey2(ci);
          const ciLocal = toLocalKey2(ci);
          candidates.push(ciUTC);
          candidates.push(ciLocal);
        } catch (e) {
          // ignore
        }
      }
      // dedupe candidates preserving order
      const seen = new Set();
      const uniqCandidates = candidates.filter((c) => {
        if (!c) return false;
        if (seen.has(c)) return false;
        seen.add(c);
        return true;
      });

      console.debug(
        "markOut: trying check-out with candidate dates:",
        uniqCandidates
      );

      let body = null;
      let res = null;
      let succeeded = false;
      let usedDate = null;
      for (const pd of uniqCandidates) {
        try {
          // Normalize pd to YYYY-MM-DD if needed
          const isoDateRegex = /^\d{4}-\d{2}-\d{2}$/;
          const pdNormalized = isoDateRegex.test(pd) ? pd : toUTCKey2(pd);
          console.debug(
            "markOut: attempting check-out",
            emp.id,
            "pd:",
            pd,
            "pdNormalized:",
            pdNormalized
          );
          res = await fetch(`${window.API_BASE_URL}/attendance/check-out`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              employeeId: String(emp.id),
              date: pdNormalized,
            }),
          });
          body = await res.json().catch(() => null);
          if (res.ok && body && body.success) {
            succeeded = true;
            usedDate = pdNormalized;
            break;
          }
          // If server indicates no check-in for this date, try next candidate
          const msg =
            body && (body.error || body.message)
              ? body.error || body.message
              : null;
          if (msg && /no check-in record found/i.test(msg)) {
            console.debug("markOut: try next candidate, server said:", msg);
            continue;
          }
          // otherwise break and surface error
          break;
        } catch (err) {
          console.debug("markOut: attempt failed", err);
          body = { message: err.message };
        }
      }

      if (succeeded && body) {
        showNotification("Marked OUT successfully", "success");
        // Update local attendance record for calendar consistency
        try {
          const recDate =
            usedDate ||
            (body.data && (body.data.date || body.data.attendanceDate)) ||
            (serverDay && serverDay.date) ||
            date;
          const rec = (emp.attendanceRecord || []).find(
            (r) => String(r.date) === String(recDate)
          );
          if (rec) {
            rec.checkOut =
              body.data.checkOutTime || body.data.checkOut || rec.checkOut;
            rec.hours = body.data.hoursWorked || rec.hours;
            rec.status = body.data.status || rec.status || "Present";
          } else {
            // push a new record so calendar shows it
            emp.attendanceRecord = emp.attendanceRecord || [];
            emp.attendanceRecord.push({
              date: recDate,
              status:
                (body.data &&
                  (body.data.status || body.data.attendanceStatus?.name)) ||
                "Present",
              checkIn:
                (serverDay && (serverDay.checkInTime || serverDay.checkIn)) ||
                null,
              checkOut: body.data.checkOutTime || body.data.checkOut || null,
              hours: body.data.hoursWorked || null,
            });
          }
        } catch (e) {
          console.warn(
            "Failed to update emp.attendanceRecord after check-out",
            e
          );
        }
        try {
          const row = document.querySelector(`tr[data-emp-id="${emp.id}"]`);
          if (row) {
            const checkoutCell = row.querySelector(".attendance-checkout-cell");
            const hoursCell = row.querySelector(".attendance-hours-cell");
            const statusCell = row.querySelector(
              ".attendance-status-cell span"
            );
            if (checkoutCell)
              checkoutCell.textContent = formatDateTime(
                body.data.checkOutTime || body.data.checkOut || "-"
              );
            if (hoursCell)
              hoursCell.textContent = body.data.hoursWorked
                ? Number(body.data.hoursWorked).toFixed(2)
                : "-";
            if (statusCell) {
              statusCell.textContent =
                body.data.status ||
                body.data.attendanceStatus?.name ||
                "Present";
              statusCell.className = `px-2 py-1 text-xs font-semibold rounded-full ${getAttendanceStatusColor(
                statusCell.textContent
              )}`;
            }
          }
        } catch (e) {
          console.warn("Failed to update attendance row DOM", e);
        }
        loadAttendanceForDate();
        updateEmployeeStats();
        if (
          attendanceCalendarState.employeeId &&
          String(attendanceCalendarState.employeeId) === String(emp.id)
        ) {
          renderAttendanceCalendar();
        }
      } else {
        showNotification(
          (body && body.message) || "Failed to mark OUT",
          "error"
        );
      }
    } catch (err) {
      console.error("Error marking out:", err);
      showNotification("Error marking out", "error");
    }
  })();
}

// Attendance calendar modal
let attendanceCalendarState = {
  employeeId: null,
  monthDate: new Date(),
  selectedDate: null,
  // staged value while user changes the status in the editor
  pendingStatus: null,
};

// Open the attendance calendar modal for an employee
function openAttendanceCalendar(employeeId) {
  const emp = employeesData.find(
    (e) =>
      String(e.id) === String(employeeId) ||
      String(e.employeeId) === String(employeeId)
  );
  if (!emp) return;

  attendanceCalendarState.employeeId = emp.id;
  attendanceCalendarState.monthDate = new Date();
  attendanceCalendarState.selectedDate = null;
  attendanceCalendarState.pendingStatus = null;

  // Try to load monthly attendance calendar for this employee from server
  (async () => {
    try {
      const token =
        localStorage.getItem("authToken") ||
        sessionStorage.getItem("authToken") ||
        "";
      const year = attendanceCalendarState.monthDate.getFullYear();
      const month = attendanceCalendarState.monthDate.getMonth() + 1;
      if (token) {
        const res = await fetch(
          `${window.API_BASE_URL}/attendance/employee/${emp.id}?month=${month}&year=${year}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          }
        );
        const body = await res.json().catch(() => null);
        if (res.ok && body && body.success && body.data) {
          const d = body.data;
          emp.attendanceRecord = Array.isArray(d)
            ? d
            : d && d.calendar
            ? d.calendar
            : [];
        }
      }
    } catch (err) {
      console.warn("openAttendanceCalendar: failed to fetch calendar", err);
    } finally {
      const nameEl = document.getElementById("attendance-calendar-employee");
      if (nameEl)
        nameEl.textContent = `${emp.firstName || ""} ${
          emp.lastName || ""
        }`.trim();
      const modal = document.getElementById("attendance-calendar-modal");
      if (modal) modal.classList.remove("hidden");
      renderAttendanceCalendar();
      if (typeof feather !== "undefined") feather.replace();
    }
  })();
}

function closeAttendanceCalendar() {
  const modal = document.getElementById("attendance-calendar-modal");
  if (modal) modal.classList.add("hidden");
  attendanceCalendarState.employeeId = null;
  attendanceCalendarState.selectedDate = null;
  attendanceCalendarState.pendingStatus = null;
}

async function downloadPayslipPDF(empId) {
  try {
    const payrollRecord = payrollData.find((p) => p.employeeId == empId);

    if (!payrollRecord) {
      showNotification("No payroll data found for this employee", "error");
      return;
    }

    showNotification("Generating PDF with attendance calendar...", "info");

    const monthValue =
      document.getElementById("payroll-month")?.value || "2025-12";
    const [year, monthNum] = monthValue.split("-");
    const monthName = new Date(year, monthNum - 1).toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });

    // Fetch attendance data for the calendar
    let attendanceRecords = [];
    try {
      const token =
        localStorage.getItem("authToken") ||
        sessionStorage.getItem("authToken") ||
        "";
      if (token) {
        const response = await fetch(
          `${window.API_BASE_URL}/attendance/employee/${empId}?month=${monthNum}&year=${year}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data) {
            attendanceRecords = result.data.calendar || result.data || [];
          }
        }
      }
    } catch (error) {
      console.warn("Could not fetch attendance data:", error);
    }

    // Calculate salary details (net & advance recovery from stored payroll)
    const gross =
      (payrollRecord.basicSalary || 0) +
      (payrollRecord.allowances || 0) +
      (payrollRecord.overtime || 0);
    const dedPdf = Number(payrollRecord.deductions) || 0;
    const netStored = Number(payrollRecord.netSalary) || 0;
    const advRec = Math.max(
      0,
      Math.round((gross - dedPdf - netStored + Number.EPSILON) * 100) / 100
    );
    const net = netStored > 0 ? netStored : Math.max(0, gross - dedPdf - advRec);

    // If jsPDF is not available, fallback to text download
    if (typeof window.jspdf === "undefined") {
      const attendanceTable = generateAttendanceTableText(
        attendanceRecords,
        year,
        monthNum
      );
      const payslipContent = `PAYSLIP WITH ATTENDANCE DETAILS\n\nEmployee: ${
        payrollRecord.employeeName
      }\nID: ${payrollRecord.employeeId}\nPosition: ${
        payrollRecord.role
      }\nPeriod: ${monthName}\nPresent Days: ${
        payrollRecord.presentDays || 0
      }\n\nEARNINGS:\nBasic Salary: Rs. ${(
        payrollRecord.basicSalary || 0
      ).toLocaleString()}\nAllowances: Rs. ${(
        payrollRecord.allowances || 0
      ).toLocaleString()}\nOvertime: Rs. ${(
        payrollRecord.overtime || 0
      ).toLocaleString()}\nGross Pay: Rs. ${gross.toLocaleString()}\n\nDEDUCTIONS:\nTotal Deductions: Rs. ${(
        payrollRecord.deductions || 0
      ).toLocaleString()}\nSalary advance recovery: Rs. ${advRec.toLocaleString()}\n\nNET PAY: Rs. ${net.toLocaleString()}\n\nATTENDANCE DETAILS:\n${attendanceTable}`;

      const blob = new Blob([payslipContent], { type: "text/plain" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `payslip_with_attendance_${payrollRecord.employeeName.replace(
        /\s+/g,
        "_"
      )}_${monthValue}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      showNotification(
        "Payslip with attendance details downloaded (text fallback)",
        "success"
      );
      return;
    }

    // Generate PDF using jsPDF
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const margin = 40;
    let cursorY = margin;

    // Header
    doc.setFontSize(18);
    const shop = typeof SHOP_DETAILS !== "undefined" ? SHOP_DETAILS : { name: "Thilina Mobiles", address: "", phone: "" };
    doc.text(shop.name, margin, cursorY);
    cursorY += 14;
    if (shop.address) {
      doc.setFontSize(9);
      doc.text(shop.address, margin, cursorY);
      cursorY += 12;
    }
    if (shop.phone) {
      doc.text(`Tel: ${shop.phone}`, margin, cursorY);
      cursorY += 14;
    }
    doc.setFontSize(12);
    doc.text("Payslip", 500, cursorY);
    cursorY += 24;

    doc.setFontSize(10);
    doc.text(`Period: ${monthName}`, margin, cursorY);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 350, cursorY);
    cursorY += 18;

    // Employee info
    doc.setFontSize(11);
    doc.text(`Employee: ${payrollRecord.employeeName}`, margin, cursorY);
    doc.text(`ID: ${payrollRecord.employeeId}`, 350, cursorY);
    cursorY += 16;
    doc.text(`Position: ${payrollRecord.role || ""}`, margin, cursorY);
    doc.text(`Present Days: ${payrollRecord.presentDays || 0}`, 350, cursorY);
    cursorY += 20;

    // Salary breakdown box
    doc.setDrawColor(230);
    doc.rect(margin, cursorY, 520, 90, "S");
    cursorY += 20;

    doc.setFontSize(10);
    doc.text("Basic Salary", margin + 8, cursorY);
    doc.text(
      `Rs. ${(payrollRecord.basicSalary || 0).toLocaleString()}`,
      200,
      cursorY
    );
    cursorY += 16;
    doc.text("Allowances", margin + 8, cursorY);
    doc.text(
      `+ Rs. ${(payrollRecord.allowances || 0).toLocaleString()}`,
      200,
      cursorY
    );
    cursorY += 16;
    doc.text("Overtime", margin + 8, cursorY);
    doc.text(
      `+ Rs. ${(payrollRecord.overtime || 0).toLocaleString()}`,
      200,
      cursorY
    );
    cursorY += 16;
    doc.text("Deductions", margin + 8, cursorY);
    doc.text(
      `- Rs. ${(payrollRecord.deductions || 0).toLocaleString()}`,
      200,
      cursorY
    );
    cursorY += 16;
    doc.setFontSize(10);
    doc.setTextColor(120, 80, 0);
    doc.text("Salary advance recovery", margin + 8, cursorY);
    doc.text(
      advRec > 0 ? `- Rs. ${advRec.toLocaleString()}` : "Rs. 0",
      200,
      cursorY
    );
    doc.setTextColor(0, 0, 0);
    cursorY += 26;

    // Gross and Net
    doc.setFontSize(12);
    doc.text(`Gross Salary: Rs. ${gross.toLocaleString()}`, margin, cursorY);
    doc.text(`Net Pay: Rs. ${net.toLocaleString()}`, 350, cursorY);
    cursorY += 28;

    // Attendance table using autoTable - show all days of the month
    doc.setFontSize(12);
    doc.text("Attendance Details:", margin, cursorY);
    cursorY += 20;

    // Generate table for all days in the month
    const daysInMonth = new Date(year, monthNum, 0).getDate();
    const attendanceMap = {};

    // Create a map of attendance records by date
    (attendanceRecords || []).forEach((r) => {
      const dateKey = new Date(r.date).getDate();
      attendanceMap[dateKey] = {
        status: r.status || r.attendanceStatus?.name || "Not Marked",
        checkIn:
          r.checkInTime || r.checkIn
            ? formatTime(r.checkInTime || r.checkIn)
            : "-",
        checkOut:
          r.checkOutTime || r.checkOut
            ? formatTime(r.checkOutTime || r.checkOut)
            : "-",
        hours: r.hoursWorked || r.hours || "0",
      };
    });

    // Generate table rows for all days
    const tableRows = [];
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(monthNum).padStart(2, "0")}-${String(
        day
      ).padStart(2, "0")}`;
      const dayData = attendanceMap[day] || {
        status: "Not Marked",
        checkIn: "-",
        checkOut: "-",
        hours: "0",
      };

      tableRows.push([
        dateStr,
        dayData.status,
        dayData.checkIn,
        dayData.checkOut,
        dayData.hours,
      ]);
    }

    // Create the table
    doc.autoTable({
      startY: cursorY,
      head: [["Date", "Status", "Check In", "Check Out", "Hours"]],
      body: tableRows,
      styles: {
        fontSize: 8,
        cellPadding: 2,
      },
      headStyles: {
        fillColor: [200, 200, 200],
        fontSize: 9,
        fontStyle: "bold",
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245],
      },
      margin: { left: margin, right: margin },
      columnStyles: {
        0: { cellWidth: 80 }, // Date
        1: { cellWidth: 80 }, // Status
        2: { cellWidth: 60 }, // Check In
        3: { cellWidth: 60 }, // Check Out
        4: { cellWidth: 40 }, // Hours
      },
    });

    // Save PDF
    const fileName = `payslip_with_attendance_${payrollRecord.employeeName.replace(
      /\s+/g,
      "_"
    )}_${monthValue}.pdf`;
    doc.save(fileName);

    showNotification("Payslip with attendance PDF downloaded", "success");
  } catch (error) {
    console.error("Error downloading payslip PDF:", error);
    showNotification(
      "Failed to generate payslip PDF: " + error.message,
      "error"
    );
  }
}

function renderAttendanceCalendar() {
  const emp = employeesData.find(
    (e) => e.id === attendanceCalendarState.employeeId
  );
  if (!emp) return;

  const year = attendanceCalendarState.monthDate.getFullYear();
  const monthIndex = attendanceCalendarState.monthDate.getMonth();

  // Try to load monthly attendance calendar for this employee from server
  try {
    const token =
      localStorage.getItem("authToken") ||
      sessionStorage.getItem("authToken") ||
      "";
    if (token) {
      // Load attendance data and ensure local date variants are present for checkInTime matches
      emp.attendanceRecord.forEach((rec) => {
        if (!rec.date && rec.checkIn) {
          rec.date = String(rec.checkIn).split("T")[0];
        }
      });
    }
  } catch (err) {
    console.warn("Could not load monthly attendance for calendar", err);
  }

  const monthStart = new Date(year, monthIndex, 1);
  const monthEnd = new Date(year, monthIndex + 1, 0);
  const startDay = monthStart.getDay(); // 0=Sun
  const daysInMonth = monthEnd.getDate();
  const monthLabel = monthStart.toLocaleString("default", {
    month: "long",
    year: "numeric",
  });
  document.getElementById("attendance-calendar-month").textContent = monthLabel;

  const weeks = [];
  let dayCounter = 1;
  // build calendar rows
  while (dayCounter <= daysInMonth) {
    const week = [];
    for (let dow = 0; dow < 7; dow++) {
      if ((weeks.length === 0 && dow < startDay) || dayCounter > daysInMonth) {
        week.push(null);
      } else {
        week.push(dayCounter);
        dayCounter++;
      }
    }
    weeks.push(week);
  }

  // build HTML
  let html =
    `<div class=\"grid grid-cols-7 gap-2 text-center text-sm text-gray-600 mb-2\">` +
    ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
      .map((d) => `<div class=\"py-1\">${d}</div>`)
      .join("") +
    `</div>`;
  html += `<div class=\"grid grid-cols-7 gap-2\">`;
  const dateStrFor = (d) =>
    `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(d).padStart(
      2,
      "0"
    )}`;
  let totalPresent = 0;
  let totalHours = 0;
  weeks.forEach((week) => {
    week.forEach((d) => {
      if (!d) {
        html += `<div class=\"h-16 bg-gray-50 rounded\"></div>`;
      } else {
        const ds = dateStrFor(d);
        const rec = getOrCreateAttendanceRecord(emp, ds, false);
        const status = rec?.status || "Not Marked";
        const color = getAttendanceStatusColor(status);
        if (status === "Present" || status === "Late") totalPresent++;
        if (typeof rec?.hours === "number") totalHours += rec.hours;
        const selected =
          attendanceCalendarState.selectedDate === ds
            ? "ring-2 ring-blue-500"
            : "";
        const isToday = (() => {
          const t = new Date();
          const todayStr = `${t.getFullYear()}-${String(
            t.getMonth() + 1
          ).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
          return ds === todayStr;
        })();
        const todayRing = isToday ? " ring-2 ring-blue-400" : "";
        html +=
          `<button class=\"h-16 rounded border text-left p-2 ${selected}${todayRing}\" style=\"${statusColorToBg(
            color
          )}\" onclick=\"selectAttendanceDay('${ds}')\">` +
          `<div class=\"text-xs text-gray-700\">${d}</div>` +
          `<div class=\"text-[10px] mt-1\">${status}</div>` +
          `</button>`;
      }
    });
  });
  html += `</div>`;

  document.getElementById("attendance-calendar-body").innerHTML = html;
  document.getElementById("attendance-total-present").textContent =
    totalPresent;
  document.getElementById("attendance-total-hours").textContent = (
    Math.round(totalHours * 100) / 100
  ).toFixed(2);
  document.getElementById(
    "attendance-basic-salary"
  ).textContent = `Rs. ${emp.salary.toLocaleString()}`;

  // hide editor if no selection
  const editor = document.getElementById("attendance-day-editor");
  if (!attendanceCalendarState.selectedDate) {
    editor.classList.add("hidden");
  }
  if (typeof feather !== "undefined") feather.replace();
}

// Navigate months in the attendance calendar (delta: -1 for prev, 1 for next)
async function changeAttendanceMonth(delta) {
  try {
    // Ensure monthDate exists
    if (
      !attendanceCalendarState.monthDate ||
      isNaN(attendanceCalendarState.monthDate)
    ) {
      attendanceCalendarState.monthDate = new Date();
    }

    // Adjust month
    const current = attendanceCalendarState.monthDate;
    const year = current.getFullYear();
    const month = current.getMonth();
    // Create new date with adjusted month, keeping day = 1 to avoid DST/day overflow
    const next = new Date(year, month + (delta || 0), 1);
    attendanceCalendarState.monthDate = next;

    // Clear any selected day when switching months
    attendanceCalendarState.selectedDate = null;
    attendanceCalendarState.pendingStatus = null;

    // Try to re-fetch monthly attendance data for the employee for the new month
    const emp = employeesData.find(
      (e) =>
        String(e.id) === String(attendanceCalendarState.employeeId) ||
        String(e.employeeId) === String(attendanceCalendarState.employeeId)
    );
    if (emp) {
      try {
        const token =
          localStorage.getItem("authToken") ||
          sessionStorage.getItem("authToken") ||
          "";
        if (token) {
          const yr = next.getFullYear();
          const mn = next.getMonth() + 1; // 1-12
          const res = await fetch(
            `${window.API_BASE_URL}/attendance/employee/${emp.id}?month=${mn}&year=${yr}`,
            {
              method: "GET",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
            }
          );
          const body = await res.json().catch(() => null);
          if (res.ok && body && body.success && body.data) {
            const d = body.data;
            emp.attendanceRecord = Array.isArray(d)
              ? d
              : d?.calendar
              ? d.calendar
              : [];
          }
        }
      } catch (err) {
        // Non-fatal: we'll still render with whatever we have
        console.warn("changeAttendanceMonth: fetch failed", err);
      }
    }

    // Re-render calendar for the new month
    renderAttendanceCalendar();
    if (typeof feather !== "undefined") feather.replace();
  } catch (err) {
    console.error("Failed to change attendance month", err);
    if (typeof showNotification === "function")
      showNotification("Couldn't change month", "error");
  }
}

function statusColorToBg(colorClasses) {
  // map badge classes to subtle background
  if (colorClasses.includes("green")) return "background-color:#dcfce7"; // green-100
  if (colorClasses.includes("red")) return "background-color:#fee2e2"; // red-100
  if (colorClasses.includes("orange")) return "background-color:#ffedd5"; // orange-100
  if (colorClasses.includes("blue")) return "background-color:#dbeafe"; // blue-100
  if (colorClasses.includes("yellow")) return "background-color:#fef9c3"; // yellow-100
  return "background-color:#ffffff"; // white for Not Marked
}

function selectAttendanceDay(dateStr) {
  attendanceCalendarState.selectedDate = dateStr;
  // reset any previously staged status
  attendanceCalendarState.pendingStatus = null;
  const emp = employeesData.find(
    (e) => e.id === attendanceCalendarState.employeeId
  );
  // Prefer the server-provided monthly calendar record if available
  let rec = (emp.attendanceRecord || []).find(
    (r) => String(r.date) === String(dateStr)
  );
  if (!rec) rec = getOrCreateAttendanceRecord(emp, dateStr, true);
  document.getElementById(
    "attendance-selected-date"
  ).textContent = `Date: ${dateStr}`;
  const sel = document.getElementById("attendance-selected-status");
  sel.value = rec.status || "Not Marked";
  document.getElementById("attendance-day-editor").classList.remove("hidden");
  renderAttendanceCalendar();
}

async function updateSelectedDay() {
  const emp = employeesData.find(
    (e) =>
      String(e.id) === String(attendanceCalendarState.employeeId) ||
      String(e.employeeId) === String(attendanceCalendarState.employeeId)
  );
  if (!emp || !attendanceCalendarState.selectedDate) return;
  // choose staged pendingStatus if user changed select but didn't press Update
  const status =
    attendanceCalendarState.pendingStatus ||
    document.getElementById("attendance-selected-status").value;

  // Persist change to server
  (async () => {
    try {
      const token =
        localStorage.getItem("authToken") ||
        sessionStorage.getItem("authToken") ||
        "";
      // If admin marks Present from calendar, send explicit 09:00-17:00 times and hours=8
      let triedUpdate = false;
      try {
        if (status === "Present") {
          // Build ISO-like local timestamps for 09:00 and 17:00 on the selected date
          const dt = attendanceCalendarState.selectedDate; // YYYY-MM-DD
          // send only HH:MM strings — server will combine with target date to create local Date
          const checkInISO = "09:00";
          const checkOutISO = "17:00";
          const res = await fetch(`${window.API_BASE_URL}/attendance/update`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({
              employeeId: String(emp.id),
              date: attendanceCalendarState.selectedDate,
              status: status,
              checkInTime: checkInISO,
              checkOutTime: checkOutISO,
              hoursWorked: 8,
            }),
          });
          triedUpdate = true;
          const body = await res.json().catch(() => null);
          if (res.ok && body && body.success) {
            // Update local attendance record so calendar reflects change immediately
            try {
              const recDate = attendanceCalendarState.selectedDate;
              if (recDate) {
                emp.attendanceRecord = emp.attendanceRecord || [];
                let rec = emp.attendanceRecord.find(
                  (r) => String(r.date) === String(recDate)
                );
                if (!rec) {
                  rec = { date: recDate };
                  emp.attendanceRecord.push(rec);
                }
                rec.status = status;
                if (body.data) {
                  if (body.data.checkInTime)
                    rec.checkIn = body.data.checkInTime;
                  if (body.data.checkOutTime)
                    rec.checkOut = body.data.checkOutTime;
                  if (body.data.checkIn) rec.checkIn = body.data.checkIn;
                  if (body.data.checkOut) rec.checkOut = body.data.checkOut;
                  if (body.data.hoursWorked !== undefined)
                    rec.hours = body.data.hoursWorked;
                  if (body.data.hours !== undefined)
                    rec.hours = body.data.hours;
                }
              }
            } catch (e) {
              console.warn(
                "Failed to update local attendanceRecord after server update",
                e
              );
            }

            attendanceCalendarState.pendingStatus = null;
            attendanceCalendarState.selectedDate = null;
            const editor = document.getElementById("attendance-day-editor");
            if (editor) editor.classList.add("hidden");
            await renderAttendanceCalendar();
            if (typeof showNotification === "function")
              showNotification("Attendance updated (09:00 - 17:00)", "success");
            return;
          }
        } else {
          // try generic update endpoint for other statuses
          const res = await fetch(`${window.API_BASE_URL}/attendance/update`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({
              employeeId: String(emp.id),
              date: attendanceCalendarState.selectedDate,
              status: status,
            }),
          });
          triedUpdate = true;
          const body = await res.json().catch(() => null);
          if (res.ok && body && body.success) {
            // Update local attendance record so calendar reflects change immediately
            try {
              const recDate = attendanceCalendarState.selectedDate;
              if (recDate) {
                emp.attendanceRecord = emp.attendanceRecord || [];
                let rec = emp.attendanceRecord.find(
                  (r) => String(r.date) === String(recDate)
                );
                if (!rec) {
                  rec = { date: recDate };
                  emp.attendanceRecord.push(rec);
                }
                rec.status = status;
                if (body.data) {
                  if (body.data.checkInTime)
                    rec.checkIn = body.data.checkInTime;
                  if (body.data.checkOutTime)
                    rec.checkOut = body.data.checkOutTime;
                  if (body.data.checkIn) rec.checkIn = body.data.checkIn;
                  if (body.data.checkOut) rec.checkOut = body.data.checkOut;
                  if (body.data.hoursWorked !== undefined)
                    rec.hours = body.data.hoursWorked;
                  if (body.data.hours !== undefined)
                    rec.hours = body.data.hours;
                }
              }
            } catch (e) {
              console.warn(
                "Failed to update local attendanceRecord after server update",
                e
              );
            }

            attendanceCalendarState.pendingStatus = null;
            attendanceCalendarState.selectedDate = null;
            const editor = document.getElementById("attendance-day-editor");
            if (editor) editor.classList.add("hidden");
            await renderAttendanceCalendar();
            if (typeof showNotification === "function")
              showNotification("Attendance updated", "success");
            return;
          }
        }
      } catch (e) {
        // ignore and fallback
      }

      // Fallbacks when generic update endpoint is not available or failed
      if (status === "Present" || status === "Late") {
        // Use existing check-in endpoint to create a present record
        try {
          const res2 = await fetch(
            `${window.API_BASE_URL}/attendance/check-in`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
              },
              body: JSON.stringify({
                employeeId: String(emp.id),
                date: attendanceCalendarState.selectedDate,
              }),
            }
          );
          const body2 = await res2.json().catch(() => null);
          if (res2.ok && body2 && body2.success) {
            attendanceCalendarState.pendingStatus = null;
            attendanceCalendarState.selectedDate = null;
            const editor = document.getElementById("attendance-day-editor");
            if (editor) editor.classList.add("hidden");
            await renderAttendanceCalendar();
            if (typeof showNotification === "function")
              showNotification(
                "Marked Present (check-in) successfully",
                "success"
              );
            return;
          } else {
            const err =
              (body2 && (body2.error || body2.message)) ||
              "Failed to mark check-in";
            if (typeof showNotification === "function")
              showNotification(err, "error");
            return;
          }
        } catch (err2) {
          console.error("Error calling check-in fallback:", err2);
          if (typeof showNotification === "function")
            showNotification("Error marking check-in", "error");
          return;
        }
      }

      // For statuses that backend doesn't support via public endpoints (Absent, Annual Leave, Sick Leave, Not Marked)
      // update local attendanceRecord so calendar shows the change immediately, but the change is not persisted server-side
      try {
        const rec = getOrCreateAttendanceRecord(
          emp,
          attendanceCalendarState.selectedDate,
          true
        );
        rec.status = status;
        attendanceCalendarState.pendingStatus = null;
        attendanceCalendarState.selectedDate = null;
        const editor = document.getElementById("attendance-day-editor");
        if (editor) editor.classList.add("hidden");
        await renderAttendanceCalendar();
        if (typeof showNotification === "function") {
          const msg = triedUpdate
            ? "Update endpoint failed; changed locally only"
            : "Server update not available; changed locally only";
          showNotification(msg, "warning");
        }
      } catch (err3) {
        console.error("Error applying local attendance change fallback:", err3);
        if (typeof showNotification === "function")
          showNotification("Failed to apply attendance change", "error");
      }
    } catch (err) {
      console.error("Error updating attendance:", err);
      if (typeof showNotification === "function")
        showNotification("Error updating attendance", "error");
    }
  })();
}

// Called when select changes to stage a pending value (does not persist until Update)
function onAttendanceStatusChange() {
  const val = document.getElementById("attendance-selected-status").value;
  attendanceCalendarState.pendingStatus = val;
}

// Cancel editing: discard staged change and close editor
async function cancelAttendanceSelection() {
  attendanceCalendarState.pendingStatus = null;
  attendanceCalendarState.selectedDate = null;
  const editor = document.getElementById("attendance-day-editor");
  if (editor) editor.classList.add("hidden");
  await renderAttendanceCalendar();
}

// =============================
// Payroll helpers & actions
// =============================

function filterPayrollList() {
  // The filtering is now handled directly in loadPayrollData()
  loadPayrollData();
}

async function loadPayrollPaymentOptions() {
  try {
    const token =
      localStorage.getItem("authToken") ||
      sessionStorage.getItem("authToken") ||
      "";
    if (!token) return;

    const [paymentTypeRes, accountRes] = await Promise.all([
      fetch(`${window.API_BASE_URL}/grn/payment-types`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      }),
      fetch(`${window.API_BASE_URL}/accounts/accounts`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      }),
    ]);

    if (paymentTypeRes.ok) {
      const paymentTypeBody = await paymentTypeRes.json();
      if (paymentTypeBody?.success && Array.isArray(paymentTypeBody.data)) {
        payrollPaymentTypes = paymentTypeBody.data.filter((pt) =>
          /^(cash|cheque|bank\s*transfer)$/i.test((pt.name || "").trim())
        );
      }
    }

    if (accountRes.ok) {
      const accountBody = await accountRes.json();
      const accounts = accountBody?.data || [];
      payrollBankAccounts =
        typeof filterBankSubAccounts === "function"
          ? filterBankSubAccounts(accounts)
          : accounts;
    }

    const paymentSel = document.getElementById("payroll-payment-type");
    if (paymentSel) {
      paymentSel.innerHTML =
        '<option value="">Select payment method</option>' +
        payrollPaymentTypes
          .map((pt) => `<option value="${pt.id}">${pt.name}</option>`)
          .join("");
      const cashType = payrollPaymentTypes.find((pt) =>
        /^cash$/i.test(pt.name)
      );
      if (cashType) paymentSel.value = String(cashType.id);
    }

    const bankSel = document.getElementById("payroll-bank-account");
    if (bankSel) {
      bankSel.innerHTML =
        '<option value="">Select bank account</option>' +
        payrollBankAccounts
          .map(
            (acc) =>
              `<option value="${acc.id}">${acc.accountCode} - ${acc.accountName}</option>`
          )
          .join("");
    }

    const advPaySel = document.getElementById("payroll-advance-payment-type");
    if (advPaySel) {
      advPaySel.innerHTML =
        '<option value="">Select payment method</option>' +
        payrollPaymentTypes
          .map((pt) => `<option value="${pt.id}">${pt.name}</option>`)
          .join("");
      const cashType = payrollPaymentTypes.find((pt) =>
        /^cash$/i.test(pt.name)
      );
      if (cashType) advPaySel.value = String(cashType.id);
    }
    const advBank = document.getElementById("payroll-advance-bank-account");
    if (advBank) {
      advBank.innerHTML =
        '<option value="">Select bank account</option>' +
        payrollBankAccounts
          .map(
            (acc) =>
              `<option value="${acc.id}">${acc.accountCode} - ${acc.accountName}</option>`
          )
          .join("");
    }

    togglePayrollPaymentFields();
    togglePayrollAdvanceBankField();
  } catch (error) {
    console.warn("Failed to load payroll payment options:", error.message);
  }
}

function togglePayrollPaymentFields() {
  const statusSel = document.getElementById("payroll-status");
  const paymentWrap = document.getElementById("payroll-payment-type-wrap");
  if (!statusSel || !paymentWrap) return;

  const selectedStatusName = (
    statusSel.options[statusSel.selectedIndex]?.text || ""
  ).trim();
  const isPaid = /^paid$/i.test(selectedStatusName);
  paymentWrap.classList.toggle("hidden", !isPaid);

  if (!isPaid) {
    const bankWrap = document.getElementById("payroll-bank-account-wrap");
    const bankSel = document.getElementById("payroll-bank-account");
    const chqWrap = document.getElementById("payroll-cheque-wrap");
    const chq = document.getElementById("payroll-cheque-number");
    if (bankWrap) bankWrap.classList.add("hidden");
    if (bankSel) bankSel.value = "";
    if (chqWrap) chqWrap.classList.add("hidden");
    if (chq) chq.value = "";
  }

  togglePayrollBankAccountField();
}

function togglePayrollBankAccountField() {
  const statusSel = document.getElementById("payroll-status");
  const paymentSel = document.getElementById("payroll-payment-type");
  const bankWrap = document.getElementById("payroll-bank-account-wrap");
  const chqWrap = document.getElementById("payroll-cheque-wrap");
  if (!statusSel || !paymentSel || !bankWrap) return;

  const selectedStatusName = (
    statusSel.options[statusSel.selectedIndex]?.text || ""
  ).trim();
  const isPaid = /^paid$/i.test(selectedStatusName);
  const selectedPaymentType = payrollPaymentTypes.find(
    (pt) => String(pt.id) === String(paymentSel.value)
  );
  const isBankTransfer = /^bank\s*transfer$/i.test(
    selectedPaymentType?.name || ""
  );
  const isCheque = /^cheque$/i.test(selectedPaymentType?.name || "");
  const needBank = isPaid && (isBankTransfer || isCheque);

  bankWrap.classList.toggle("hidden", !needBank);
  if (chqWrap) {
    chqWrap.classList.toggle("hidden", !(isPaid && isCheque));
    const chq = document.getElementById("payroll-cheque-number");
    if (chq && !isCheque) chq.value = "";
  }
}

function togglePayrollAdvanceBankField() {
  const paymentSel = document.getElementById("payroll-advance-payment-type");
  const bankWrap = document.getElementById("payroll-advance-bank-wrap");
  const chqWrap = document.getElementById("payroll-advance-cheque-wrap");
  if (!paymentSel || !bankWrap) return;
  const selectedPaymentType = payrollPaymentTypes.find(
    (pt) => String(pt.id) === String(paymentSel.value)
  );
  const isBankTransfer = /^bank\s*transfer$/i.test(
    selectedPaymentType?.name || ""
  );
  const isCheque = /^cheque$/i.test(selectedPaymentType?.name || "");
  const needBank = isBankTransfer || isCheque;
  bankWrap.classList.toggle("hidden", !needBank);
  if (chqWrap) {
    chqWrap.classList.toggle("hidden", !isCheque);
    const chq = document.getElementById("payroll-advance-cheque-number");
    if (chq && !isCheque) chq.value = "";
  }
}

async function openPayrollAdvanceModal(employeeId) {
  payrollAdvanceTargetEmpId = String(employeeId || "").trim();
  if (!payrollAdvanceTargetEmpId) return;
  const rec = payrollData.find(
    (p) => String(p.employeeId) === payrollAdvanceTargetEmpId
  );
  const monthEl = document.getElementById("payroll-advance-month");
  const month =
    document.getElementById("payroll-month")?.value ||
    (() => {
      const n = new Date();
      return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}`;
    })();
  if (monthEl) monthEl.value = month;
  const label = document.getElementById("payroll-advance-emp-label");
  if (label) {
    label.textContent = rec
      ? `${rec.employeeName} (${rec.employeeId})`
      : `Employee: ${payrollAdvanceTargetEmpId}`;
  }
  const amt = document.getElementById("payroll-advance-amount");
  if (amt) amt.value = "";
  const chq = document.getElementById("payroll-advance-cheque-number");
  if (chq) chq.value = "";
  await loadPayrollPaymentOptions();
  document.getElementById("payroll-advance-modal")?.classList.remove("hidden");
  if (typeof feather !== "undefined") feather.replace();
}

function closePayrollAdvanceModal() {
  document.getElementById("payroll-advance-modal")?.classList.add("hidden");
  payrollAdvanceTargetEmpId = null;
}

async function submitPayrollAdvance() {
  if (!payrollAdvanceTargetEmpId) {
    showNotification("No employee selected", "error");
    return;
  }
  const month = document.getElementById("payroll-advance-month")?.value;
  const amount = parseFloat(
    document.getElementById("payroll-advance-amount")?.value
  );
  if (!month) {
    showNotification("Select month", "error");
    return;
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    showNotification("Enter a valid advance amount", "error");
    return;
  }
  const paymentTypeId = parseInt(
    document.getElementById("payroll-advance-payment-type")?.value
  );
  const selected = payrollPaymentTypes.find(
    (pt) => String(pt.id) === String(paymentTypeId)
  );
  const isBank = /^bank\s*transfer$/i.test(selected?.name || "");
  const isChq = /^cheque$/i.test(selected?.name || "");
  const bankAccountId = parseInt(
    document.getElementById("payroll-advance-bank-account")?.value
  );
  const chequeNumber = String(
    document.getElementById("payroll-advance-cheque-number")?.value || ""
  ).trim();
  if (!paymentTypeId) {
    showNotification("Select payment method", "error");
    return;
  }
  if ((isBank || isChq) && !bankAccountId) {
    showNotification("Select bank account", "error");
    return;
  }
  if (isChq && !chequeNumber) {
    showNotification("Enter cheque number", "error");
    return;
  }
  const token =
    localStorage.getItem("authToken") ||
    sessionStorage.getItem("authToken") ||
    "";
  if (!token) {
    showNotification("Authentication required", "error");
    return;
  }
  try {
    const res = await fetch(`${window.API_BASE_URL}/payroll/advance`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        employeeId: payrollAdvanceTargetEmpId,
        amount,
        month,
        paymentTypeId,
        bankAccountId: isBank || isChq ? bankAccountId : undefined,
        chequeNumber: isChq ? chequeNumber : undefined,
      }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.message || "Failed to record advance");
    showNotification(
      body.message || "Advance recorded successfully",
      "success"
    );
    closePayrollAdvanceModal();
    await loadPayrollData();
  } catch (e) {
    showNotification(e.message || "Failed to record advance", "error");
  }
}

// Legacy function - no longer used with real API data
// function getOrCreatePayrollRecord(empId, month, basic) {
//   // This function has been replaced with real API calls
// }

async function editPayroll(empId) {
  try {
    const month =
      document.getElementById("payroll-month")?.value ||
      (() => {
        const n = new Date();
        return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(
          2,
          "0"
        )}`;
      })();
    const [year, monthNum] = month.split("-");

    const token =
      localStorage.getItem("authToken") ||
      sessionStorage.getItem("authToken") ||
      "";

    // Find the payroll record from current data (works with both real and mock data)
    const payrollRecord = payrollData.find((p) => p.employeeId == empId); // Use == to handle string/number comparison

    if (!payrollRecord) {
      showNotification("Payroll record not found", "error");
      return;
    }

    // Try to load payroll statuses for dropdown (if backend is available)
    let statusOptions = "";

    if (token) {
      try {
        const statusResponse = await fetch(
          `${window.API_BASE_URL}/payroll/statuses`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (statusResponse.ok) {
          const statusResult = await statusResponse.json();
          if (statusResult.success && statusResult.data) {
            statusOptions = statusResult.data
              .map(
                (status) =>
                  `<option value="${status.id}" ${
                    status.id === payrollRecord.statusId ? "selected" : ""
                  }>${status.name}</option>`
              )
              .join("");
          }
        }
      } catch (error) {
        console.log(
          "Could not load payroll statuses from backend, using fallback"
        );
      }
    }

    if (!statusOptions) {
      // Fallback options
      statusOptions = `
        <option value="1" ${
          payrollRecord.status === "Pending" ? "selected" : ""
        }>Pending</option>
        <option value="2" ${
          payrollRecord.status === "Paid" ? "selected" : ""
        }>Paid</option>
      `;
    }

    // Populate the edit modal
    document.getElementById("payroll-edit-emp-id").value = empId;
    document.getElementById(
      "payroll-edit-emp-name"
    ).textContent = `${payrollRecord.employeeName} • ${month}`;
    document.getElementById("payroll-edit-present-days").textContent =
      payrollRecord.presentDays || 0;
    document.getElementById("payroll-basic").value = payrollRecord.basicSalary;
    document.getElementById("payroll-allowances").value =
      payrollRecord.allowances;
    document.getElementById("payroll-overtime").value = payrollRecord.overtime;
    document.getElementById("payroll-deductions").value =
      payrollRecord.deductions;
    const advOut = Number(payrollRecord.salaryAdvanceToRecover) || 0;
    const advIn = document.getElementById("payroll-advance-deduct");
    if (advIn) advIn.value = advOut > 0 ? String(advOut) : "0";
    const advSug = document.getElementById("payroll-advance-suggested");
    if (advSug) {
      advSug.textContent = `Outstanding advances (this month, max to recover here): Rs. ${advOut.toLocaleString(
        undefined,
        { minimumFractionDigits: 2, maximumFractionDigits: 2 }
      )}`;
    }
    updatePayrollTotalPayment();

    // Update status dropdown with options
    const statusSelect = document.getElementById("payroll-status");
    statusSelect.innerHTML = statusOptions;

    await loadPayrollPaymentOptions();
    togglePayrollPaymentFields();

    document.getElementById("payroll-edit-modal").classList.remove("hidden");

    if (typeof feather !== "undefined") feather.replace();
  } catch (error) {
    console.error("Error loading payroll for edit:", error);
    showNotification("Failed to load payroll data: " + error.message, "error");
  }
}

function getPayrollInputAmount(elementId) {
  const value = parseFloat(document.getElementById(elementId)?.value);
  return Number.isFinite(value) ? value : 0;
}

function updatePayrollTotalPayment() {
  const totalEl = document.getElementById("payroll-total-payment");
  if (!totalEl) return;

  const basicSalary = getPayrollInputAmount("payroll-basic");
  const allowances = getPayrollInputAmount("payroll-allowances");
  const overtime = getPayrollInputAmount("payroll-overtime");
  const deductions = getPayrollInputAmount("payroll-deductions");
  const advanceRec = getPayrollInputAmount("payroll-advance-deduct");
  const netSalary = basicSalary + allowances + overtime - deductions - advanceRec;

  totalEl.textContent = `Rs. ${netSalary.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function closePayrollEditModal() {
  document.getElementById("payroll-edit-modal").classList.add("hidden");
}

function closePayslipModal() {
  document.getElementById("payslip-modal").classList.add("hidden");
}

// showMockPayrollData removed - mock data is no longer used. Payroll UI now relies solely on backend data.

async function updatePayrollStatus(payrollId, statusId) {
  try {
    const token =
      localStorage.getItem("authToken") ||
      sessionStorage.getItem("authToken") ||
      "";

    if (!token) {
      showNotification("Authentication required", "error");
      return;
    }

    const response = await fetch(
      `${window.API_BASE_URL}/payroll/${payrollId}/status`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ statusId: statusId }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Failed to update payroll status");
    }

    const result = await response.json();
    if (!result.success) {
      throw new Error(result.message || "Failed to update payroll status");
    }

    showNotification("Payroll status updated successfully", "success");
    await loadPayrollData(); // Reload the data
  } catch (error) {
    console.error("Error updating payroll status:", error);
    showNotification(
      "Failed to update payroll status: " + error.message,
      "error"
    );
  }
}

function generatePayrollTextReport(
  filteredPayrolls,
  selectedMonth,
  searchTerm
) {
  const [year, month] = selectedMonth.split("-");
  const monthName = new Date(year, month - 1, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  let report = `THILINA MOBILES - PAYROLL REPORT\n`;
  report += `========================================\n\n`;
  report += `Period: ${monthName}\n`;
  report += `Generated: ${new Date().toLocaleString()}\n`;
  if (searchTerm) {
    report += `Filter: ${searchTerm}\n`;
  }
  report += `Total Employees: ${filteredPayrolls.length}\n\n`;

  let totalGross = 0;
  let totalNet = 0;

  filteredPayrolls.forEach((payroll) => {
    const gross =
      (payroll.basicSalary || 0) +
      (payroll.allowances || 0) +
      (payroll.overtime || 0);
    totalGross += gross;
    totalNet += payroll.netSalary || 0;

    report += `Employee: ${payroll.employeeName}\n`;
    report += `ID: ${payroll.employeeId} | Role: ${payroll.role}\n`;
    report += `Basic Salary: Rs. ${(
      payroll.basicSalary || 0
    ).toLocaleString()}\n`;
    report += `Allowances: Rs. ${(payroll.allowances || 0).toLocaleString()}\n`;
    report += `Overtime: Rs. ${(payroll.overtime || 0).toLocaleString()}\n`;
    report += `Deductions: Rs. ${(payroll.deductions || 0).toLocaleString()}\n`;
    report += `Advance recovery: Rs. ${(
      payroll.salaryAdvanceToRecover || 0
    ).toLocaleString()}\n`;
    report += `Net Pay: Rs. ${(payroll.netSalary || 0).toLocaleString()}\n`;
    report += `Status: ${payroll.status}\n`;
    report += `----------------------------------------\n`;
  });

  report += `\nSUMMARY:\n`;
  report += `Total Gross Pay: Rs. ${totalGross.toLocaleString()}\n`;
  report += `Total Net Pay: Rs. ${totalNet.toLocaleString()}\n`;

  return report;
}

async function savePayrollEdit() {
  try {
    const empId = document.getElementById("payroll-edit-emp-id").value;
    const month =
      document.getElementById("payroll-month")?.value ||
      (() => {
        const n = new Date();
        return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(
          2,
          "0"
        )}`;
      })();

    if (!empId) {
      showNotification("Employee ID is required", "error");
      return;
    }

    const allowances =
      parseFloat(document.getElementById("payroll-allowances").value) || 0;
    const overtime =
      parseFloat(document.getElementById("payroll-overtime").value) || 0;
    const deductions =
      parseFloat(document.getElementById("payroll-deductions").value) || 0;
    const statusId =
      parseInt(document.getElementById("payroll-status").value) || 1;
    const statusName = (
      document.getElementById("payroll-status")?.options[
        document.getElementById("payroll-status")?.selectedIndex
      ]?.text || ""
    ).trim();
    const isPaid = /^paid$/i.test(statusName);

    const paymentTypeId = parseInt(
      document.getElementById("payroll-payment-type")?.value
    );
    const selectedPaymentType = payrollPaymentTypes.find(
      (pt) => String(pt.id) === String(paymentTypeId)
    );
    const isBankTransfer = /^bank\s*transfer$/i.test(
      selectedPaymentType?.name || ""
    );
    const isCheque = /^cheque$/i.test(selectedPaymentType?.name || "");
    const bankAccountId = parseInt(
      document.getElementById("payroll-bank-account")?.value
    );
    const chequeNumber = String(
      document.getElementById("payroll-cheque-number")?.value || ""
    ).trim();

    if (isPaid) {
      if (!paymentTypeId) {
        showNotification("Select a payment method for salary payment", "error");
        return;
      }
      if ((isBankTransfer || isCheque) && !bankAccountId) {
        showNotification("Select a bank account for this payment", "error");
        return;
      }
      if (isCheque && !chequeNumber) {
        showNotification("Enter the cheque number", "error");
        return;
      }
    }

    const token =
      localStorage.getItem("authToken") ||
      sessionStorage.getItem("authToken") ||
      "";

    if (!token) {
      showNotification("Authentication required", "error");
      return;
    }

    // Find existing payroll record
    const existingPayroll = payrollData.find((p) => p.employeeId === empId);

    const salaryAdvanceDeduct =
      parseFloat(document.getElementById("payroll-advance-deduct")?.value) || 0;

    if (existingPayroll && existingPayroll.id) {
      // Update existing payroll
      const updateData = {
        employeeId: empId,
        month: month,
        allowances: allowances,
        overtime: overtime,
        deductions: deductions,
        salaryAdvanceDeduct,
        statusId: statusId,
        paymentTypeId: isPaid ? paymentTypeId : undefined,
        bankAccountId: isPaid && (isBankTransfer || isCheque) ? bankAccountId : undefined,
        chequeNumber: isPaid && isCheque ? chequeNumber : undefined,
      };

      const response = await fetch(`${window.API_BASE_URL}/payroll`, {
        method: "POST", // The backend handles both create and update
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to update payroll");
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.message || "Failed to update payroll");
      }

      showNotification("Payroll updated successfully", "success");
    } else {
      // Create new payroll record
      const createData = {
        employeeId: empId,
        month: month,
        allowances: allowances,
        overtime: overtime,
        deductions: deductions,
        salaryAdvanceDeduct,
        statusId: statusId,
        paymentTypeId: isPaid ? paymentTypeId : undefined,
        bankAccountId: isPaid && (isBankTransfer || isCheque) ? bankAccountId : undefined,
        chequeNumber: isPaid && isCheque ? chequeNumber : undefined,
      };

      const response = await fetch(`${window.API_BASE_URL}/payroll`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(createData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to create payroll");
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.message || "Failed to create payroll");
      }

      showNotification("Payroll created successfully", "success");
    }

    closePayrollEditModal();
    await loadPayrollData(); // Reload the data
  } catch (error) {
    console.error("Error saving payroll:", error);
    showNotification("Failed to save payroll: " + error.message, "error");
  }
}

async function viewPayslip(empId) {
  try {
    const month =
      document.getElementById("payroll-month")?.value ||
      (() => {
        const n = new Date();
        return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(
          2,
          "0"
        )}`;
      })();
    const token =
      localStorage.getItem("authToken") ||
      sessionStorage.getItem("authToken") ||
      "";

    if (!token) {
      showNotification("Authentication required", "error");
      return;
    }

    // Find the payroll record from current data
    const payrollRecord = payrollData.find((p) => p.employeeId == empId);

    if (!payrollRecord) {
      showNotification("No payroll data found for this employee", "error");
      return;
    }

    // If we have a payroll ID, fetch detailed data from backend
    let detailedPayroll = payrollRecord;

    if (payrollRecord.id) {
      try {
        const response = await fetch(
          `${window.API_BASE_URL}/payroll/${payrollRecord.id}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data) {
            detailedPayroll = result.data;
          }
        }
      } catch (error) {
        console.log("Could not fetch detailed payroll, using cached data");
      }
    }

    const basic =
      Number(detailedPayroll.basicSalary ?? payrollRecord.basicSalary) || 0;
    const alw = Number(detailedPayroll.allowances ?? payrollRecord.allowances) || 0;
    const ovt = Number(detailedPayroll.overtime ?? payrollRecord.overtime) || 0;
    const ded = Number(detailedPayroll.deductions ?? payrollRecord.deductions) || 0;
    const gross = basic + alw + ovt;
    const advRec = Number(
      detailedPayroll.salaryAdvanceRecoveredOnPayslip != null
        ? detailedPayroll.salaryAdvanceRecoveredOnPayslip
        : Math.max(0, gross - ded - (Number(detailedPayroll.netSalary) || 0))
    ) || 0;
    const net = Number(detailedPayroll.netSalary) || Math.max(0, gross - ded - advRec);
    const presentDays =
      detailedPayroll.presentDays || payrollRecord.presentDays || 0;
    const pending = Array.isArray(detailedPayroll.pendingAdvanceDetails)
      ? detailedPayroll.pendingAdvanceDetails
      : [];
    const pendingListHtml =
      pending.length > 0
        ? `<ul class="text-sm list-disc pl-5 mt-2 text-gray-700">
            ${pending
              .map(
                (r) =>
                  `<li>Ref ${r.referenceId || r.id} — balance Rs. ${Number(
                    r.amount
                  ).toLocaleString()}</li>`
              )
              .join("")}
          </ul>`
        : '<p class="text-sm text-gray-500">No open advance entries for this pay month.</p>';

    const html = `
      <div class="mb-4">
        <div class="flex justify-between items-start">
          <div>
            <h4 class="text-xl font-semibold text-gray-900">${
              detailedPayroll.employeeName || payrollRecord.employeeName
            }</h4>
            <p class="text-gray-600 text-sm">ID: ${
              detailedPayroll.employeeId || payrollRecord.employeeId
            } • ${month}</p>
            <p class="text-gray-600 text-sm">Present Days: <span class="font-semibold">${presentDays}</span></p>
          </div>
          <div class="text-right text-sm text-gray-600">
            <div>Position: ${detailedPayroll.role || payrollRecord.role}</div>
            <div>Status: <span class="font-semibold text-${
              detailedPayroll.status === "Paid" ||
              payrollRecord.status === "Paid"
                ? "green"
                : "yellow"
            }-600">${
      detailedPayroll.status && detailedPayroll.status !== "Not Created"
        ? detailedPayroll.status
        : payrollRecord.status && payrollRecord.status !== "Not Created"
        ? payrollRecord.status
        : "Pending"
    }</span></div>
          </div>
        </div>
      </div>
      
      <div class="bg-gray-50 rounded p-4 mb-4">
        <h5 class="font-medium mb-3 text-gray-700">Salary Breakdown</h5>
        <div class="grid grid-cols-2 gap-4">
          <div><div class="text-gray-600 text-sm">Basic Salary</div><div class="font-semibold">Rs. ${basic.toLocaleString()}</div></div>
          <div><div class="text-gray-600 text-sm">Allowances</div><div class="font-semibold text-green-600">+ Rs. ${alw.toLocaleString()}</div></div>
          <div><div class="text-gray-600 text-sm">Overtime</div><div class="font-semibold text-green-600">+ Rs. ${ovt.toLocaleString()}</div></div>
          <div><div class="text-gray-600 text-sm">Deductions</div><div class="font-semibold text-red-600">- Rs. ${ded.toLocaleString()}</div></div>
          <div class="col-span-2"><div class="text-gray-600 text-sm">Salary advance recovered on this slip</div><div class="font-semibold text-amber-800">- Rs. ${advRec.toLocaleString()}</div></div>
        </div>
      </div>
      
      <div class="bg-amber-50 border border-amber-100 rounded p-4 mb-4">
        <h5 class="font-medium text-gray-800 mb-1">Advance details (this pay month)</h5>
        <p class="text-sm text-gray-600">Still outstanding to recover: <span class="font-semibold">Rs. ${(
          Number(detailedPayroll.salaryAdvanceToRecover) || 0
        ).toLocaleString()}</span></p>
        ${pendingListHtml}
      </div>
      
      <div class="border-t pt-4">
        <div class="flex justify-between items-center">
          <div class="text-gray-600">Gross Salary: <span class="font-semibold">Rs. ${gross.toLocaleString()}</span></div>
          <div class="text-gray-900 font-bold text-xl">Net Pay: Rs. ${net.toLocaleString()}</div>
        </div>
      </div>
      
      <div class="mt-4 flex justify-end space-x-2">
        <button onclick="downloadPayslipPDF('${empId}')" class="btn-secondary px-4 py-2 rounded-lg flex items-center">
          <i data-feather="download" class="w-4 h-4 mr-2"></i>
          Download PDF
        </button>
        <button onclick="printPayslip()" class="btn-primary px-4 py-2 text-white rounded-lg flex items-center">
          <i data-feather="printer" class="w-4 h-4 mr-2"></i>
          Print
        </button>
      </div>
    `;

    const cont = document.getElementById("payslip-content");
    cont.innerHTML = html;
    document.getElementById("payslip-modal").classList.remove("hidden");

    if (typeof feather !== "undefined") feather.replace();
  } catch (error) {
    console.error("Error loading payslip:", error);
    showNotification("Failed to load payslip: " + error.message, "error");
  }
}

function printPayslip() {
  try {
    const content = document.getElementById("payslip-content").innerHTML;

    // Remove action buttons from the content for printing
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = content;

    // Remove the button container
    const buttonContainer = tempDiv.querySelector(".mt-4");
    if (buttonContainer) {
      buttonContainer.remove();
    }

    const cleanContent = tempDiv.innerHTML;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Payslip</title>
        <style>
          body { 
            font-family: Arial, Helvetica, sans-serif; 
            padding: 24px; 
            color: #333;
          }
          .grid { 
            display: grid; 
            grid-template-columns: 1fr 1fr; 
            gap: 12px; 
          }
          .bg-gray-50 { 
            background-color: #f9fafb; 
          }
          .rounded { 
            border-radius: 8px; 
          }
          .p-4 { 
            padding: 16px; 
          }
          .mb-4 { 
            margin-bottom: 16px; 
          }
          .mb-3 { 
            margin-bottom: 12px; 
          }
          .text-xl { 
            font-size: 1.25rem; 
          }
          .text-lg { 
            font-size: 1.125rem; 
          }
          .text-sm { 
            font-size: 0.875rem; 
          }
          .font-semibold { 
            font-weight: 600; 
          }
          .font-bold { 
            font-weight: 700; 
          }
          .font-medium { 
            font-weight: 500; 
          }
          .text-gray-900 { 
            color: #111827; 
          }
          .text-gray-600 { 
            color: #4b5563; 
          }
          .text-gray-700 { 
            color: #374151; 
          }
          .text-green-600 { 
            color: #059669; 
          }
          .text-red-600 { 
            color: #dc2626; 
          }
          .text-yellow-600 { 
            color: #d97706; 
          }
          .border-t { 
            border-top: 1px solid #e5e7eb; 
          }
          .pt-4 { 
            padding-top: 16px; 
          }
          .flex { 
            display: flex; 
          }
          .justify-between { 
            justify-content: space-between; 
          }
          .items-center { 
            align-items: center; 
          }
          .items-start { 
            align-items: flex-start; 
          }
          .text-right { 
            text-align: right; 
          }
          @media print {
            body { margin: 0; padding: 20px; }
            .no-print { display: none !important; }
          }
        </style>
      </head>
      <body>
        <div style="max-width: 600px; margin: 0 auto;">
          <div style="text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px;">
            <h1 style="margin: 0; color: #333;">PAYSLIP</h1>
            <p style="margin: 5px 0; color: #666;">Thilina Mobiles</p>
          </div>
          ${cleanContent}
        </div>
      </body>
      </html>
    `;

    if (typeof printHtmlContent === "function") {
      printHtmlContent(htmlContent);
    } else {
      const w = window.open("", "_blank");
      if (w && w.document) {
        w.document.write(htmlContent);
        w.document.close();
        w.focus();
        setTimeout(() => {
          w.print();
        }, 500);
      }
    }
  } catch (error) {
    console.error("Error printing payslip:", error);
    showNotification("Failed to print payslip: " + error.message, "error");
  }
}

// Helper to count present days for payroll month (Present or Late count as present)
function getAttendancePresentDays(emp, monthStr) {
  if (!emp || !emp.attendanceRecord || !Array.isArray(emp.attendanceRecord))
    return 0;
  return emp.attendanceRecord.filter(function (r) {
    return (
      r.date &&
      r.date.indexOf(monthStr) === 0 &&
      (r.status === "Present" || r.status === "Late")
    );
  }).length;
}

function goToPayslipFromCalendar() {
  const empId = attendanceCalendarState.employeeId;
  closeAttendanceCalendar();
  switchEmployeeTab("payroll");
  setTimeout(function () {
    viewPayslip(empId);
  }, 300);
}

// PDF / XL export for Employee Management
function getEmployeesExportFilters() {
  const filters = [];
  const searchTerm = document.getElementById("employees-search")?.value?.trim();
  const statusFilter = document.getElementById("employees-status-filter")?.value;
  if (searchTerm) filters.push({ label: "Search", value: searchTerm });
  if (statusFilter) filters.push({ label: "Status", value: statusFilter });
  return filters;
}

function downloadEmployeesPDF() {
  try {
    const employeesToExport = getFilteredEmployeesData();
    const activeEmployees = employeesToExport.filter(
      (emp) => emp.status === "Active"
    ).length;
    const totalSalary = employeesToExport.reduce(
      (sum, emp) => sum + (emp.salary || 0),
      0
    );
    const ok = exportPdfWithTable({
      title: "Employee Directory Report",
      filters: getEmployeesExportFilters(),
      head: ["Employee Name", "ID", "Position", "Status", "Salary", "Hire Date"],
      body: employeesToExport.map((emp) => [
        `${emp.firstName} ${emp.lastName}`,
        emp.employeeId,
        emp.position,
        emp.status,
        `Rs. ${emp.salary?.toLocaleString() || "N/A"}`,
        emp.hireDate || "N/A",
      ]),
      fileName: `employee-directory-report-${new Date().toISOString().split("T")[0]}.pdf`,
      summary: `Total: ${employeesToExport.length}  |  Active: ${activeEmployees}  |  Monthly Payroll: Rs. ${totalSalary.toLocaleString()}`,
      emptyMessage: "No employees data available to export",
    });
    if (ok) {
      showNotification("Employee Directory PDF downloaded successfully", "success");
    }
  } catch (error) {
    console.error("Error generating PDF:", error);
    showNotification("Error generating PDF", "error");
  }
}

async function downloadEmployeesXL() {
  try {
    const employeesToExport = getFilteredEmployeesData();
    const ok = await exportXlsxWithTable({
      title: "Employee Directory Report",
      filters: getEmployeesExportFilters(),
      headers: ["Employee Name", "ID", "Position", "Status", "Salary", "Hire Date"],
      rows: employeesToExport.map((emp) => [
        `${emp.firstName} ${emp.lastName}`,
        emp.employeeId,
        emp.position,
        emp.status,
        emp.salary || 0,
        emp.hireDate || "",
      ]),
      sheetName: "Employees",
      fileName: `employee-directory-report-${new Date().toISOString().split("T")[0]}.xlsx`,
      emptyMessage: "No employees data available to export",
    });
    if (ok) {
      showNotification("Employee Directory XL downloaded successfully", "success");
    }
  } catch (error) {
    console.error("Error generating XL:", error);
    showNotification("Error generating XL", "error");
  }
}

async function downloadAttendancePDF() {
  try {
    const selectedDate =
      document.getElementById("attendance-date")?.value ||
      new Date().toISOString().split("T")[0];
    const attendanceData = await getAttendanceForDate(selectedDate);

    const filters = [
      {
        label: "Date",
        value: new Date(selectedDate).toLocaleDateString("en-US", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        }),
      },
    ];
    const searchTerm = document.getElementById("attendance-search")?.value?.trim();
    if (searchTerm) filters.push({ label: "Search", value: searchTerm });

    const presentCount = attendanceData.filter((r) => r.status === "Present").length;
    const lateCount = attendanceData.filter((r) => r.status === "Late").length;
    const absentCount = attendanceData.filter(
      (r) => !r.status || r.status === "Absent"
    ).length;
    const totalHours = attendanceData.reduce(
      (sum, record) => sum + (parseFloat(record.hoursWorked) || 0),
      0
    );

    const ok = exportPdfWithTable({
      title: "Daily Attendance Report",
      filters,
      head: [
        "Employee Name",
        "ID",
        "Status",
        "Check In",
        "Check Out",
        "Hours Worked",
      ],
      body: attendanceData.map((record) => [
        `${record.firstName} ${record.lastName}`,
        record.employeeId,
        record.status || "Absent",
        record.checkIn || "N/A",
        record.checkOut || "N/A",
        record.hoursWorked || "0.00",
      ]),
      fileName: `attendance-report-${selectedDate}.pdf`,
      summary: `Present: ${presentCount} | Late: ${lateCount} | Absent: ${absentCount} | Hours: ${totalHours.toFixed(2)} | Rate: ${(
        ((presentCount + lateCount) / (attendanceData.length || 1)) *
        100
      ).toFixed(1)}%`,
      headStyles: { fillColor: [34, 197, 94] },
      emptyMessage: "No attendance data available for selected date",
    });
    if (ok) showNotification("Attendance PDF downloaded successfully", "success");
  } catch (error) {
    console.error("Error generating PDF:", error);
    showNotification("Error generating PDF", "error");
  }
}

function getPayrollExportFilters() {
  const filters = [];
  const selectedMonth =
    document.getElementById("payroll-month")?.value ||
    (() => {
      const n = new Date();
      return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}`;
    })();
  const monthYear = new Date(selectedMonth + "-01").toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
  });
  filters.push({ label: "Month", value: monthYear });
  const searchTerm = document.getElementById("payroll-search")?.value?.trim();
  if (searchTerm) filters.push({ label: "Search", value: searchTerm });
  return filters;
}

function getPayrollExportData() {
  return getFilteredPayrollData();
}

async function downloadPayrollPDF() {
  try {
    const selectedMonth =
      document.getElementById("payroll-month")?.value ||
      (() => {
        const n = new Date();
        return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}`;
      })();

    if (!payrollData || payrollData.length === 0) {
      showNotification("No payroll data available for selected month", "warning");
      return;
    }

    const filteredPayrolls = getPayrollExportData();
    const totalNet = filteredPayrolls.reduce((sum, p) => sum + (p.netSalary || 0), 0);
    const paidCount = filteredPayrolls.filter((p) => p.status === "Paid").length;

    const ok = exportPdfWithTable({
      title: "Payroll Report",
      filters: getPayrollExportFilters(),
      head: [
        "Employee",
        "ID",
        "Basic Salary",
        "Allowances",
        "Overtime",
        "Deductions",
        "Net Salary",
        "Status",
      ],
      body: filteredPayrolls.map((payroll) => [
        payroll.employeeName,
        payroll.employeeId,
        `Rs. ${payroll.basicSalary?.toLocaleString() || "0"}`,
        `Rs. ${payroll.allowances?.toLocaleString() || "0"}`,
        `Rs. ${payroll.overtime?.toLocaleString() || "0"}`,
        `Rs. ${payroll.deductions?.toLocaleString() || "0"}`,
        `Rs. ${payroll.netSalary?.toLocaleString() || "0"}`,
        payroll.status || "Pending",
      ]),
      fileName: `payroll-report-${selectedMonth}.pdf`,
      summary: `Employees: ${filteredPayrolls.length}  |  Paid: ${paidCount}  |  Net Total: Rs. ${totalNet.toLocaleString()}`,
      headStyles: { fillColor: [147, 51, 234] },
      emptyMessage: "No payroll data available for selected month",
    });
    if (ok) showNotification("Payroll PDF downloaded successfully", "success");
  } catch (error) {
    console.error("Error generating PDF:", error);
    showNotification("Error generating PDF", "error");
  }
}

async function downloadPayrollXL() {
  try {
    const selectedMonth =
      document.getElementById("payroll-month")?.value ||
      (() => {
        const n = new Date();
        return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}`;
      })();

    if (!payrollData || payrollData.length === 0) {
      showNotification("No payroll data available for selected month", "warning");
      return;
    }

    const filteredPayrolls = getPayrollExportData();
    const ok = await exportXlsxWithTable({
      title: "Payroll Report",
      filters: getPayrollExportFilters(),
      headers: [
        "Employee",
        "ID",
        "Basic Salary",
        "Allowances",
        "Overtime",
        "Deductions",
        "Net Salary",
        "Status",
      ],
      rows: filteredPayrolls.map((payroll) => [
        payroll.employeeName,
        payroll.employeeId,
        payroll.basicSalary || 0,
        payroll.allowances || 0,
        payroll.overtime || 0,
        payroll.deductions || 0,
        payroll.netSalary || 0,
        payroll.status || "Pending",
      ]),
      sheetName: "Payroll",
      fileName: `payroll-report-${selectedMonth}.xlsx`,
      emptyMessage: "No payroll data available for selected month",
    });
    if (ok) showNotification("Payroll XL downloaded successfully", "success");
  } catch (error) {
    console.error("Error generating XL:", error);
    showNotification("Error generating XL", "error");
  }
}

// Helper functions to get filtered data
function getFilteredEmployeesData() {
  if (!employeesData || !Array.isArray(employeesData)) {
    return [];
  }

  const searchTerm =
    document.getElementById("employees-search")?.value?.toLowerCase() || "";
  const statusFilter =
    document.getElementById("employees-status-filter")?.value || "";

  return employeesData.filter((employee) => {
    const matchesSearch =
      !searchTerm ||
      employee.firstName.toLowerCase().includes(searchTerm) ||
      employee.lastName.toLowerCase().includes(searchTerm) ||
      employee.employeeId.toLowerCase().includes(searchTerm) ||
      employee.position.toLowerCase().includes(searchTerm) ||
      (employee.email && employee.email.toLowerCase().includes(searchTerm));

    const matchesStatus = !statusFilter || employee.status === statusFilter;
    return matchesSearch && matchesStatus;
  });
}

async function getAttendanceForDate(selectedDate) {
  if (!employeesData || !Array.isArray(employeesData)) {
    return [];
  }

  const searchTerm =
    document.getElementById("attendance-search")?.value?.toLowerCase() || "";

  try {
    const token =
      localStorage.getItem("authToken") ||
      sessionStorage.getItem("authToken") ||
      "";
    const dObj = new Date(selectedDate);
    const month = dObj.getMonth() + 1;
    const year = dObj.getFullYear();

    const employeeList =
      attendanceFilteredEmployees && attendanceFilteredEmployees.length
        ? attendanceFilteredEmployees
        : employeesData;

    const attendancePromises = employeeList.map(async (employee) => {
      try {
        const res = await fetch(
          `${window.API_BASE_URL}/attendance/employee/${employee.id}?month=${month}&year=${year}`,
          {
            method: "GET",
            cache: "no-store",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
              "Cache-Control": "no-cache",
            },
          }
        );
        const body = await res.json().catch(() => null);

        // Find attendance record for the specific date
        let rec = null;
        const dateKey = selectedDate;

        if (body && body.success && body.data) {
          const entries = Array.isArray(body.data)
            ? body.data
            : body.data.calendar && Array.isArray(body.data.calendar)
            ? body.data.calendar
            : body.data
            ? [body.data]
            : [];

          rec =
            entries.find((r) => {
              const rDate = r.date ? String(r.date).split("T")[0] : null;
              if (rDate && rDate === dateKey) return true;
              if (r.checkInTime) {
                const checkInDate = new Date(r.checkInTime);
                const checkInDateKey = `${checkInDate.getFullYear()}-${String(
                  checkInDate.getMonth() + 1
                ).padStart(2, "0")}-${String(checkInDate.getDate()).padStart(
                  2,
                  "0"
                )}`;
                if (checkInDateKey === dateKey) return true;
              }
              return false;
            }) || null;
        }

        const status =
          rec?.attendanceStatus?.name ||
          rec?.status ||
          rec?.attendanceStatusName ||
          "Absent";
        const checkIn = rec?.checkInTime
          ? formatDateTime(rec.checkInTime)
          : "N/A";
        const checkOut = rec?.checkOutTime
          ? formatDateTime(rec.checkOutTime)
          : "N/A";
        const hoursWorked = rec?.hoursWorked || rec?.hours || "0.00";

        return {
          firstName: employee.firstName,
          lastName: employee.lastName,
          employeeId: employee.employeeId,
          status: status,
          checkIn: checkIn,
          checkOut: checkOut,
          hoursWorked:
            typeof hoursWorked === "number"
              ? hoursWorked.toFixed(2)
              : String(hoursWorked),
        };
      } catch (err) {
        // Fallback for employee if API fails
        return {
          firstName: employee.firstName,
          lastName: employee.lastName,
          employeeId: employee.employeeId,
          status: "Not Marked",
          checkIn: "N/A",
          checkOut: "N/A",
          hoursWorked: "0.00",
        };
      }
    });

    const attendanceRecords = await Promise.all(attendancePromises);

    return attendanceRecords.filter((record) => {
      if (!searchTerm) return true;
      return (
        record.firstName.toLowerCase().includes(searchTerm) ||
        record.lastName.toLowerCase().includes(searchTerm) ||
        record.employeeId.toLowerCase().includes(searchTerm)
      );
    });
  } catch (err) {
    console.error("Error fetching attendance data:", err);
    if (typeof showNotification === "function")
      showNotification(
        "Failed to fetch attendance from server. Attendance data may be incomplete.",
        "error"
      );
    // Do not fabricate attendance records. Return empty list so UI reflects real data.
    return [];
  }
}

function getFilteredPayrollData(selectedMonth) {
  // Return the current payroll data from API, filtered if needed
  if (!payrollData || !Array.isArray(payrollData)) {
    return [];
  }

  const searchTerm =
    document.getElementById("payroll-search")?.value?.toLowerCase() || "";

  return payrollData.filter((payroll) => {
    if (!searchTerm) return true;
    return (
      payroll.employeeName.toLowerCase().includes(searchTerm) ||
      payroll.employeeId.toString().includes(searchTerm) ||
      payroll.role.toLowerCase().includes(searchTerm)
    );
  });
}

// Generate payroll for all employees who don't have payroll records yet
async function generateAllPayrolls() {
  try {
    const month = document.getElementById("payroll-month")?.value || "2025-12";
    const token =
      localStorage.getItem("authToken") ||
      sessionStorage.getItem("authToken") ||
      "";

    if (!token) {
      showNotification("Authentication required", "error");
      return;
    }

    if (!payrollData || payrollData.length === 0) {
      showNotification("No employee data found for this month", "warning");
      return;
    }

    // Find employees without payroll records (status "Not Created" or no ID)
    const employeesWithoutPayroll = payrollData.filter(
      (p) => !p.id || p.status === "Not Created" || !p.status
    );

    if (employeesWithoutPayroll.length === 0) {
      showNotification(
        "All employees already have payroll records for this month",
        "info"
      );
      return;
    }

    const confirmMessage = `Generate payroll records for ${employeesWithoutPayroll.length} employees without payroll for ${month}?`;
    if (!confirm(confirmMessage)) {
      return;
    }

    let successCount = 0;
    let errorCount = 0;
    const errors = [];

    // Show progress
    showNotification(
      `Generating payroll for ${employeesWithoutPayroll.length} employees...`,
      "info"
    );

    for (const emp of employeesWithoutPayroll) {
      try {
        const payrollData = {
          employeeId: emp.employeeId,
          month: month,
          allowances: 0,
          overtime: 0,
          deductions: 0,
          statusId: 1, // Pending status
        };

        const response = await fetch(`${window.API_BASE_URL}/payroll`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payrollData),
        });

        if (response.ok) {
          const result = await response.json();
          if (result.success) {
            successCount++;
          } else {
            errorCount++;
            errors.push(`${emp.employeeName}: ${result.message}`);
          }
        } else {
          errorCount++;
          const errorData = await response.json();
          errors.push(
            `${emp.employeeName}: ${
              errorData.message || "Failed to create payroll"
            }`
          );
        }
      } catch (error) {
        errorCount++;
        errors.push(`${emp.employeeName}: ${error.message}`);
      }
    }

    // Show results
    if (successCount > 0) {
      showNotification(
        `Successfully generated ${successCount} payroll record(s)`,
        "success"
      );
    }

    if (errorCount > 0) {
      console.error("Payroll generation errors:", errors);
      showNotification(
        `${errorCount} errors occurred. Check console for details.`,
        "error"
      );
    }

    // Reload payroll data to show updated records
    await loadPayrollData();
  } catch (error) {
    console.error("Error generating payrolls:", error);
    showNotification("Failed to generate payrolls: " + error.message, "error");
  }
}

// Export functions to global scope
window.loadEmployeeDirectoryData = loadEmployeeDirectoryData;
window.downloadEmployeesPDF = downloadEmployeesPDF;
window.downloadEmployeesXL = downloadEmployeesXL;
window.downloadAttendancePDF = downloadAttendancePDF;
window.downloadPayrollPDF = downloadPayrollPDF;
window.downloadPayrollXL = downloadPayrollXL;
window.generateAllPayrolls = generateAllPayrolls;
window.printPayslip = printPayslip;
window.openPayrollAdvanceModal = openPayrollAdvanceModal;
window.closePayrollAdvanceModal = closePayrollAdvanceModal;
window.submitPayrollAdvance = submitPayrollAdvance;
window.togglePayrollAdvanceBankField = togglePayrollAdvanceBankField;
