// Settings Management Module
function initializeSettingsModule() {}

function generateSettingsContent() {
  return `
    <div class="content-fade-in p-6">
      <!-- Page Header -->
      <div class="bg-white border-b border-gray-200 px-6 py-4 -m-6 mb-6">
        <div class="flex justify-between items-center">
          <div>
            <h1 class="text-2xl font-bold text-gray-900">System Settings</h1>
            <p class="text-gray-600 mt-1">Configure system preferences, security, and business settings</p>
          </div>
          <div class="flex space-x-3">
            <button onclick="saveAllSettings()" class="btn-primary px-4 py-2 text-white rounded-lg flex items-center">
              <i data-feather="save" class="w-4 h-4 mr-2"></i>
              Save Changes
            </button>
          </div>
        </div>
      </div>

      <!-- Settings Navigation -->
      <div class="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <!-- Settings Sidebar -->
        <div class="lg:col-span-1">
          <nav class="space-y-2">
            <button onclick="switchSettingsTab('general')" class="settings-tab-btn w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition-colors bg-blue-50 text-blue-700 border border-blue-200">
              <i data-feather="settings" class="w-4 h-4 inline mr-2"></i>
              General
            </button>
            <button onclick="switchSettingsTab('business')" class="settings-tab-btn w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition-colors text-gray-700 hover:bg-gray-50">
              <i data-feather="briefcase" class="w-4 h-4 inline mr-2"></i>
              Business Info
            </button>
            <button onclick="switchSettingsTab('security')" class="settings-tab-btn w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition-colors text-gray-700 hover:bg-gray-50">
              <i data-feather="shield" class="w-4 h-4 inline mr-2"></i>
              Security
            </button>
            <button onclick="switchSettingsTab('notifications')" class="settings-tab-btn w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition-colors text-gray-700 hover:bg-gray-50">
              <i data-feather="bell" class="w-4 h-4 inline mr-2"></i>
              Notifications
            </button>
            <button onclick="switchSettingsTab('backup')" class="settings-tab-btn w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition-colors text-gray-700 hover:bg-gray-50">
              <i data-feather="database" class="w-4 h-4 inline mr-2"></i>
              Backup & Restore
            </button>
            <button onclick="switchSettingsTab('integrations')" class="settings-tab-btn w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition-colors text-gray-700 hover:bg-gray-50">
              <i data-feather="link" class="w-4 h-4 inline mr-2"></i>
              Integrations
            </button>
          </nav>
        </div>

        <!-- Settings Content -->
        <div class="lg:col-span-3">
          <div class="card">
            <div id="settings-content">
              <!-- General Settings (Default) -->
              <div id="general-settings" class="settings-panel p-6">
                <h3 class="text-lg font-semibold text-gray-900 mb-6">General Settings</h3>
                
                <div class="space-y-6">
                  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label class="block text-sm font-medium text-gray-700 mb-2">System Language</label>
                      <select class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                        <option value="en">English</option>
                        <option value="si">සිංහල</option>
                        <option value="ta">தமிழ்</option>
                      </select>
                    </div>
                    <div>
                      <label class="block text-sm font-medium text-gray-700 mb-2">Currency</label>
                      <select class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                        <option value="LKR">Sri Lankan Rupee (LKR)</option>
                        <option value="USD">US Dollar (USD)</option>
                        <option value="EUR">Euro (EUR)</option>
                      </select>
                    </div>
                  </div>

                  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label class="block text-sm font-medium text-gray-700 mb-2">Date Format</label>
                      <select class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                        <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                        <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                        <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                      </select>
                    </div>
                    <div>
                      <label class="block text-sm font-medium text-gray-700 mb-2">Time Zone</label>
                      <select class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                        <option value="Asia/Colombo">Asia/Colombo (+05:30)</option>
                        <option value="UTC">UTC (+00:00)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label class="flex items-center">
                      <input type="checkbox" class="rounded border-gray-300 text-blue-600 focus:ring-blue-500" checked>
                      <span class="ml-2 text-sm text-gray-700">Enable dark mode</span>
                    </label>
                  </div>

                  <div>
                    <label class="flex items-center">
                      <input type="checkbox" class="rounded border-gray-300 text-blue-600 focus:ring-blue-500" checked>
                      <span class="ml-2 text-sm text-gray-700">Show dashboard animations</span>
                    </label>
                  </div>
                </div>
              </div>

              <!-- Other settings panels will be loaded dynamically -->
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

function switchSettingsTab(tabName) {
  // Remove active classes from all tabs
  document.querySelectorAll(".settings-tab-btn").forEach((btn) => {
    btn.classList.remove(
      "bg-blue-50",
      "text-blue-700",
      "border",
      "border-blue-200"
    );
    btn.classList.add("text-gray-700", "hover:bg-gray-50");
  });

  // Add active class to clicked tab
  event.target.classList.remove("text-gray-700", "hover:bg-gray-50");
  event.target.classList.add(
    "bg-blue-50",
    "text-blue-700",
    "border",
    "border-blue-200"
  );

  // Load content based on tab
  let content = "";
  switch (tabName) {
    case "business":
      content = generateBusinessSettings();
      break;
    case "security":
      content = generateSecuritySettings();
      break;
    case "notifications":
      content = generateNotificationSettings();
      break;
    case "backup":
      content = generateBackupSettings();
      break;
    case "integrations":
      content = generateIntegrationSettings();
      break;
    default:
      return; // General settings already loaded
  }

  document.getElementById("settings-content").innerHTML = content;
  feather.replace();
}

function generateBusinessSettings() {
  return `
    <div class="settings-panel p-6">
      <h3 class="text-lg font-semibold text-gray-900 mb-6">Business Information</h3>
      
      <div class="space-y-6">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Business Name</label>
          <input type="text" value="Thilina Mobiles" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Contact Number</label>
            <input type="text" value="+94 77 123 4567" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
            <input type="email" value="info@thilinamobiles.lk" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
          </div>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Business Address</label>
          <textarea rows="3" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">No. 123, Main Street, Colombo 03, Sri Lanka</textarea>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Business Registration No.</label>
            <input type="text" value="PV00123456" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Tax ID (VAT)</label>
            <input type="text" value="114123456789" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
          </div>
        </div>
      </div>
    </div>
  `;
}

function generateSecuritySettings() {
  return `
    <div class="settings-panel p-6">
      <h3 class="text-lg font-semibold text-gray-900 mb-6">Security Settings</h3>
      
      <div class="space-y-6">
        <div>
          <h4 class="text-md font-medium text-gray-900 mb-4">Password Policy</h4>
          <div class="space-y-3">
            <label class="flex items-center">
              <input type="checkbox" class="rounded border-gray-300 text-blue-600 focus:ring-blue-500" checked>
              <span class="ml-2 text-sm text-gray-700">Minimum 8 characters</span>
            </label>
            <label class="flex items-center">
              <input type="checkbox" class="rounded border-gray-300 text-blue-600 focus:ring-blue-500" checked>
              <span class="ml-2 text-sm text-gray-700">Require uppercase and lowercase</span>
            </label>
            <label class="flex items-center">
              <input type="checkbox" class="rounded border-gray-300 text-blue-600 focus:ring-blue-500">
              <span class="ml-2 text-gray-700">Require special characters</span>
            </label>
          </div>
        </div>

        <div>
          <h4 class="text-md font-medium text-gray-900 mb-4">Session Settings</h4>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Session Timeout (minutes)</label>
              <input type="number" value="30" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Max Failed Login Attempts</label>
              <input type="number" value="5" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
            </div>
          </div>
        </div>

        <div>
          <label class="flex items-center">
            <input type="checkbox" class="rounded border-gray-300 text-blue-600 focus:ring-blue-500" checked>
            <span class="ml-2 text-sm text-gray-700">Enable audit logging</span>
          </label>
        </div>
      </div>
    </div>
  `;
}

function generateNotificationSettings() {
  return `
    <div class="settings-panel p-6">
      <h3 class="text-lg font-semibold text-gray-900 mb-6">Notification Settings</h3>
      
      <div class="space-y-6">
        <div>
          <h4 class="text-md font-medium text-gray-900 mb-4">Email Notifications</h4>
          <div class="space-y-3">
            <label class="flex items-center justify-between">
              <span class="text-sm text-gray-700">Low stock alerts</span>
              <input type="checkbox" class="rounded border-gray-300 text-blue-600 focus:ring-blue-500" checked>
            </label>
            <label class="flex items-center justify-between">
              <span class="text-sm text-gray-700">Daily sales summary</span>
              <input type="checkbox" class="rounded border-gray-300 text-blue-600 focus:ring-blue-500" checked>
            </label>
            <label class="flex items-center justify-between">
              <span class="text-sm text-gray-700">System maintenance alerts</span>
              <input type="checkbox" class="rounded border-gray-300 text-blue-600 focus:ring-blue-500">
            </label>
          </div>
        </div>

        <div>
          <h4 class="text-md font-medium text-gray-900 mb-4">SMS Notifications</h4>
          <div class="space-y-3">
            <label class="flex items-center justify-between">
              <span class="text-sm text-gray-700">Critical system alerts</span>
              <input type="checkbox" class="rounded border-gray-300 text-blue-600 focus:ring-blue-500" checked>
            </label>
            <label class="flex items-center justify-between">
              <span class="text-sm text-gray-700">Large transactions</span>
              <input type="checkbox" class="rounded border-gray-300 text-blue-600 focus:ring-blue-500">
            </label>
          </div>
        </div>
      </div>
    </div>
  `;
}

function generateBackupSettings() {
  return `
    <div class="settings-panel p-6">
      <h3 class="text-lg font-semibold text-gray-900 mb-6">Backup & Restore</h3>
      
      <div class="space-y-6">
        <div>
          <h4 class="text-md font-medium text-gray-900 mb-4">Automatic Backup</h4>
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Backup Frequency</label>
              <select class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Backup Location</label>
              <input type="text" value="C:\\Backups\\ThilinaMobiles" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
            </div>
          </div>
        </div>

        <div class="flex space-x-4">
          <button onclick="createBackup()" class="btn-primary px-4 py-2 text-white rounded-lg">
            Create Backup Now
          </button>
          <button onclick="restoreBackup()" class="btn-secondary px-4 py-2 rounded-lg">
            Restore from Backup
          </button>
        </div>

        <div>
          <h4 class="text-md font-medium text-gray-900 mb-4">Recent Backups</h4>
          <div class="space-y-2">
            <div class="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <span class="text-sm">backup_2024_11_15_09_30.sql</span>
              <span class="text-sm text-gray-500">2.3 MB</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

function generateIntegrationSettings() {
  return `
    <div class="settings-panel p-6">
      <h3 class="text-lg font-semibold text-gray-900 mb-6">Integrations</h3>
      
      <div class="space-y-6">
        <div class="border border-gray-200 rounded-lg p-4">
          <div class="flex items-center justify-between mb-3">
            <div class="flex items-center">
              <div class="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <i data-feather="credit-card" class="w-5 h-5 text-blue-600"></i>
              </div>
              <div class="ml-3">
                <h4 class="text-sm font-medium text-gray-900">Payment Gateway</h4>
                <p class="text-xs text-gray-500">Accept online payments</p>
              </div>
            </div>
            <button class="btn-secondary px-3 py-1 text-sm rounded">Configure</button>
          </div>
        </div>

        <div class="border border-gray-200 rounded-lg p-4">
          <div class="flex items-center justify-between mb-3">
            <div class="flex items-center">
              <div class="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <i data-feather="mail" class="w-5 h-5 text-green-600"></i>
              </div>
              <div class="ml-3">
                <h4 class="text-sm font-medium text-gray-900">Email Service</h4>
                <p class="text-xs text-gray-500">Send automated emails</p>
              </div>
            </div>
            <button class="btn-secondary px-3 py-1 text-sm rounded">Configure</button>
          </div>
        </div>

        <div class="border border-gray-200 rounded-lg p-4">
          <div class="flex items-center justify-between mb-3">
            <div class="flex items-center">
              <div class="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <i data-feather="smartphone" class="w-5 h-5 text-purple-600"></i>
              </div>
              <div class="ml-3">
                <h4 class="text-sm font-medium text-gray-900">SMS Gateway</h4>
                <p class="text-xs text-gray-500">Send SMS notifications</p>
              </div>
            </div>
            <button class="btn-secondary px-3 py-1 text-sm rounded">Configure</button>
          </div>
        </div>
      </div>
    </div>
  `;
}

function saveAllSettings() {
  showNotification("Settings saved successfully", "success");
}

function createBackup() {
  showNotification("Creating backup...", "info");
}

function restoreBackup() {
  showNotification("Restore functionality coming soon", "info");
}

function initializeSettingsPage() {
  console.log("⚙️ Settings page initialized");
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    generateSettingsContent,
    initializeSettingsModule,
    initializeSettingsPage,
  };
}
