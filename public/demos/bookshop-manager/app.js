// Bookshop Management System - 1:1 Static Demo Application JS

const DEFAULT_DATA = {
  authors: [
    { id: 1, name: "Martin Wickramasinghe" },
    { id: 2, name: "Kumaratunga Munidasa" },
    { id: 3, name: "F. Scott Fitzgerald" },
    { id: 4, name: "George Orwell" },
    { id: 5, name: "J.K. Rowling" },
    { id: 6, name: "Harper Lee" },
    { id: 7, name: "Jane Austen" }
  ],
  books: [
    { id: 1, name: "Madol Doova", authorId: 1, authorName: "Martin Wickramasinghe", isbn: "9789559013050", price: 850, qty: 45 },
    { id: 2, name: "Gamperaliya", authorId: 1, authorName: "Martin Wickramasinghe", isbn: "9789559013005", price: 950, qty: 30 },
    { id: 3, name: "Heen Seraya", authorId: 2, authorName: "Kumaratunga Munidasa", isbn: "9789559045129", price: 650, qty: 25 },
    { id: 4, name: "The Great Gatsby", authorId: 3, authorName: "F. Scott Fitzgerald", isbn: "9780743273565", price: 1500, qty: 20 },
    { id: 5, name: "1984", authorId: 4, authorName: "George Orwell", isbn: "9780451524935", price: 1800, qty: 15 },
    { id: 6, name: "Harry Potter and the Philosopher's Stone", authorId: 5, authorName: "J.K. Rowling", isbn: "9780747532699", price: 2200, qty: 40 },
    { id: 7, name: "To Kill a Mockingbird", authorId: 6, authorName: "Harper Lee", isbn: "9780061120084", price: 1650, qty: 12 },
    { id: 8, name: "Pride and Prejudice", authorId: 7, authorName: "Jane Austen", isbn: "9780141439518", price: 1400, qty: 28 }
  ],
  customers: [
    { id: 1, name: "Kasun Perera", contact: "0771234567", registrationNo: "CUST-2024-001", date: "2024-01-15" },
    { id: 2, name: "Nimali Fernando", contact: "0719876543", registrationNo: "CUST-2024-002", date: "2024-02-10" },
    { id: 3, name: "Ruwan Jayasinghe", contact: "0755551234", registrationNo: "CUST-2024-003", date: "2024-03-01" },
    { id: 4, name: "Dilini Silva", contact: "0782223344", registrationNo: "CUST-2024-004", date: "2024-04-18" },
    { id: 5, name: "Nuwan Wickramasinghe", contact: "0764449988", registrationNo: "CUST-2024-005", date: "2024-05-22" }
  ],
  orders: [
    {
      id: 1001,
      customerId: 1,
      customerName: "Kasun Perera",
      orderDate: "2024-09-15",
      returnDate: "2024-09-30",
      status: "Completed",
      statusCode: 1,
      totalAmount: 3400,
      bookTitle: "Madol Doova (2x), The Great Gatsby (1x)",
      quantity: 3,
      items: [
        { bookId: 1, bookName: "Madol Doova", authorName: "Martin Wickramasinghe", qty: 2, price: 850, status: 1 },
        { bookId: 4, bookName: "The Great Gatsby", authorName: "F. Scott Fitzgerald", qty: 1, price: 1700, status: 1 }
      ]
    },
    {
      id: 1002,
      customerId: 2,
      customerName: "Nimali Fernando",
      orderDate: "2024-09-18",
      returnDate: "2024-10-02",
      status: "Pending",
      statusCode: 0,
      totalAmount: 1800,
      bookTitle: "1984",
      quantity: 1,
      items: [
        { bookId: 5, bookName: "1984", authorName: "George Orwell", qty: 1, price: 1800, status: 0 }
      ]
    },
    {
      id: 1003,
      customerId: 3,
      customerName: "Ruwan Jayasinghe",
      orderDate: "2024-09-20",
      returnDate: "2024-10-05",
      status: "Pending",
      statusCode: 0,
      totalAmount: 3050,
      bookTitle: "Harry Potter and the Philosopher's Stone, Madol Doova",
      quantity: 2,
      items: [
        { bookId: 6, bookName: "Harry Potter and the Philosopher's Stone", authorName: "J.K. Rowling", qty: 1, price: 2200, status: 0 },
        { bookId: 1, bookName: "Madol Doova", authorName: "Martin Wickramasinghe", qty: 1, price: 850, status: 0 }
      ]
    },
    {
      id: 1004,
      customerId: 4,
      customerName: "Dilini Silva",
      orderDate: "2024-09-21",
      returnDate: "2024-10-06",
      status: "Completed",
      statusCode: 1,
      totalAmount: 2800,
      bookTitle: "Pride and Prejudice",
      quantity: 2,
      items: [
        { bookId: 8, bookName: "Pride and Prejudice", authorName: "Jane Austen", qty: 2, price: 1400, status: 1 }
      ]
    }
  ],
  loans: [
    { customerId: 2, amount: 1800 },
    { customerId: 3, amount: 1500 }
  ]
};

let db = loadData();
let isLoggedIn = false;
let currentView = 'dashboard';

function loadData() {
  const saved = localStorage.getItem('bookshop_demo_data');
  if (saved) {
    try { return JSON.parse(saved); } catch (e) {}
  }
  saveData(DEFAULT_DATA);
  return JSON.parse(JSON.stringify(DEFAULT_DATA));
}

function saveData(data = db) {
  localStorage.setItem('bookshop_demo_data', JSON.stringify(data));
}

// Authentication Handlers
function handleLoginSubmit(e) {
  e.preventDefault();
  isLoggedIn = true;
  document.getElementById('view-login').classList.add('hidden');
  document.getElementById('app-wrapper').classList.remove('hidden');
  navTo('dashboard');
}

function handleLogout() {
  isLoggedIn = false;
  document.getElementById('app-wrapper').classList.add('hidden');
  document.getElementById('view-login').classList.remove('hidden');
}

// Navigation Handler
function navTo(viewId) {
  currentView = viewId;

  document.querySelectorAll('.page-view').forEach(p => p.classList.add('hidden'));
  const target = document.getElementById(`page-${viewId}`);
  if (target) target.classList.remove('hidden');

  // Update navbar items
  document.querySelectorAll('.nav-item').forEach(btn => {
    if (btn.getAttribute('data-nav') === viewId) {
      btn.className = 'nav-item text-gray-900 font-bold px-3 py-2 rounded-md text-sm transition-colors';
    } else {
      btn.className = 'nav-item text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium transition-colors';
    }
  });

  // Hide mobile menu
  document.getElementById('mobile-menu').classList.add('hidden');

  // Render current view
  renderCurrentView();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function toggleMobileMenu() {
  document.getElementById('mobile-menu').classList.toggle('hidden');
}

function renderCurrentView() {
  switch (currentView) {
    case 'dashboard': break;
    case 'orders': renderOrdersList(); break;
    case 'books': renderBooksGrid(); break;
    case 'customers': renderCustomersTable(); break;
    case 'authors': renderAuthorsTable(); break;
    case 'loan': renderLoanTable(); break;
    case 'finance': renderFinancePage(); break;
    case 'reports': break;
  }
  if (window.lucide) window.lucide.createIcons();
}

function formatDate(dateString) {
  if (!dateString) return '-';
  const date = new Date(dateString);
  const localDate = new Date(date.getTime() + (date.getTimezoneOffset() * 60000));
  return localDate.toLocaleDateString('en-LK', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

function formatCurrency(amt) {
  return `Rs. ${(amt || 0).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/* ================= ORDERS PAGE ================= */
function renderOrdersList() {
  const tbody = document.getElementById('orders-table-body');
  const search = (document.getElementById('order-search').value || '').toLowerCase().trim();
  const statusFilter = document.getElementById('order-status-filter').value;
  const dateFilter = document.getElementById('order-date-filter').value;

  const filtered = db.orders.filter(o => {
    const matchSearch = !search || o.customerName.toLowerCase().includes(search) || String(o.id).includes(search);
    const matchStatus = statusFilter === '' || String(o.statusCode) === statusFilter;
    const matchDate = !dateFilter || o.returnDate === dateFilter || o.orderDate === dateFilter;
    return matchSearch && matchStatus && matchDate;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colSpan="8" class="text-center py-8 bg-white">
          <p class="text-gray-500">No orders found</p>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = filtered.map(order => `
    <tr class="hover:bg-gray-50 cursor-pointer" onclick="openOrderDetailsModal(${order.id})">
      <td class="px-6 py-4 text-sm font-medium text-gray-900">#${order.id}</td>
      <td class="px-6 py-4 text-sm font-medium text-gray-900">${order.customerName}</td>
      <td class="px-6 py-4 text-sm text-gray-900 truncate">${order.bookTitle}</td>
      <td class="px-6 py-4 text-sm text-gray-900">${formatDate(order.orderDate)}</td>
      <td class="px-6 py-4 text-sm text-gray-900">${formatDate(order.returnDate)}</td>
      <td class="px-6 py-4 text-sm text-gray-900">
        <span class="font-medium">Rs. ${(order.totalAmount || 0).toLocaleString()}</span>
      </td>
      <td class="px-6 py-4">
        <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
          order.status === 'Completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
        }">
          ${order.status}
        </span>
      </td>
      <td class="px-6 py-4 text-sm font-medium">
        <button 
          onclick="event.stopPropagation(); openOrderDetailsModal(${order.id})"
          class="text-indigo-600 hover:text-indigo-900 transition-colors"
        >
          View Details
        </button>
      </td>
    </tr>
  `).join('');
}

function clearOrderDateFilter() {
  document.getElementById('order-date-filter').value = '';
  renderOrdersList();
}

// Order Form Modal
let orderDraftItems = [];

function openOrderFormModal() {
  const custSelect = document.getElementById('of-customer-select');
  custSelect.innerHTML = db.customers.map(c => `<option value="${c.id}">${c.name} (${c.contact})</option>`).join('');

  const bookSelect = document.getElementById('of-book-select');
  bookSelect.innerHTML = db.books.map(b => `<option value="${b.id}">[Rs. ${b.price}] ${b.name} - by ${b.authorName} (Stock: ${b.qty})</option>`).join('');

  orderDraftItems = [];
  renderOrderDraftItems();

  document.getElementById('modal-order-form').classList.remove('hidden');
}

function closeOrderFormModal() {
  document.getElementById('modal-order-form').classList.add('hidden');
}

function addBookToOrderDraft() {
  const bookId = parseInt(document.getElementById('of-book-select').value);
  const qty = parseInt(document.getElementById('of-qty-input').value) || 1;
  const book = db.books.find(b => b.id === bookId);

  if (!book) return;

  const existing = orderDraftItems.find(i => i.bookId === bookId);
  if (existing) {
    existing.quantity += qty;
  } else {
    orderDraftItems.push({ bookId, quantity: qty, book });
  }

  renderOrderDraftItems();
}

function renderOrderDraftItems() {
  const container = document.getElementById('of-items-list');
  if (orderDraftItems.length === 0) {
    container.innerHTML = `<p class="text-xs text-gray-500 py-2">No books added to order yet.</p>`;
    return;
  }

  container.innerHTML = orderDraftItems.map((item, idx) => `
    <div class="flex items-center justify-between bg-gray-50 p-3 rounded">
      <div class="text-sm">
        <span class="font-medium">${item.book.name}</span>
        <span class="text-xs text-gray-500 ml-2">by ${item.book.authorName} • Qty: ${item.quantity} • Rs. ${(item.book.price * item.quantity).toLocaleString()}</span>
      </div>
      <button type="button" onclick="orderDraftItems.splice(${idx}, 1); renderOrderDraftItems();" class="text-red-600 text-xs font-medium hover:underline">Remove</button>
    </div>
  `).join('');
}

function handleOrderFormSubmit(e) {
  e.preventDefault();
  const customerId = parseInt(document.getElementById('of-customer-select').value);
  const customer = db.customers.find(c => c.id === customerId);

  if (orderDraftItems.length === 0) {
    alert("Please add at least one book!");
    return;
  }

  let total = 0;
  const items = orderDraftItems.map(item => {
    total += item.book.price * item.quantity;
    return {
      bookId: item.bookId,
      bookName: item.book.name,
      authorName: item.book.authorName,
      qty: item.quantity,
      price: item.book.price,
      status: 0
    };
  });

  const returnD = new Date();
  returnD.setDate(returnD.getDate() + 14);

  const newOrder = {
    id: db.orders.length ? Math.max(...db.orders.map(o => o.id)) + 1 : 1001,
    customerId,
    customerName: customer ? customer.name : 'Customer',
    orderDate: new Date().toISOString().split('T')[0],
    returnDate: returnD.toISOString().split('T')[0],
    status: "Pending",
    statusCode: 0,
    totalAmount: total,
    bookTitle: items.map(i => i.bookName).join(', '),
    quantity: items.reduce((s, i) => s + i.qty, 0),
    items
  };

  db.orders.unshift(newOrder);
  saveData();
  closeOrderFormModal();
  renderOrdersList();
}

// Order Details Modal (OrderDetails.tsx)
let currentModalOrderId = null;
let selectedModalBookIds = [];

function openOrderDetailsModal(orderId) {
  const order = db.orders.find(o => o.id === orderId);
  if (!order) return;

  currentModalOrderId = orderId;
  selectedModalBookIds = [];

  const body = document.getElementById('od-modal-body');
  const isPending = order.statusCode === 0;

  const pendingItems = (order.items || []).filter(i => i.status === 0);

  body.innerHTML = `
    <!-- Order Summary -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 bg-gray-50 p-3 sm:p-4 rounded-lg">
      <div>
        <h4 class="font-semibold text-gray-700 text-sm">Customer Name</h4>
        <p class="text-gray-900 text-sm sm:text-base truncate">${order.customerName}</p>
      </div>
      <div>
        <h4 class="font-semibold text-gray-700 text-sm">Order Date</h4>
        <p class="text-gray-900 text-sm sm:text-base">${formatDate(order.orderDate)}</p>
      </div>
      <div>
        <h4 class="font-semibold text-gray-700 text-sm">Total Books</h4>
        <p class="text-gray-900 text-sm sm:text-base">${order.items ? order.items.length : 1}</p>
      </div>
      <div>
        <h4 class="font-semibold text-gray-700 text-sm">Total Payment</h4>
        <div class="flex items-center justify-between gap-2">
          <div class="text-gray-900 text-sm sm:text-base font-semibold">
            Rs. ${(order.totalAmount || 0).toFixed(2)}
          </div>
        </div>
      </div>
    </div>

    <!-- Current Payment Display -->
    <div class="bg-blue-50 p-3 sm:p-4 rounded-lg">
      <h4 class="font-semibold text-blue-700 text-sm sm:text-base">Current Payment: Rs. 50.00</h4>
    </div>

    <!-- Books Table -->
    <div class="space-y-4">
      <div class="bg-white rounded-lg shadow overflow-hidden">
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                ${isPending ? `
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <input type="checkbox" onchange="toggleSelectAllModalBooks(this.checked)" class="rounded border-gray-300 text-indigo-600" />
                    <span class="ml-2">Select All</span>
                  </th>
                ` : ''}
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Book ID</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Book Name</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Author</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              ${(order.items || []).map(item => `
                <tr class="hover:bg-gray-50">
                  ${isPending ? `
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      <input type="checkbox" value="${item.bookId}" onchange="toggleModalBookSelect(${item.bookId}, this.checked)" class="modal-book-cb rounded border-gray-300 text-indigo-600" />
                    </td>
                  ` : ''}
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">#${item.bookId}</td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 truncate">${item.bookName}</td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${item.authorName || 'Author'}</td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">Rs. ${(item.price || 0).toFixed(2)}</td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm">
                    <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      item.status === 1 || order.statusCode === 1 ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                    }">
                      ${item.status === 1 || order.statusCode === 1 ? 'Completed' : 'Pending'}
                    </span>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Footer Buttons -->
      <div class="flex justify-end gap-3 pt-4 border-t border-gray-200">
        <button onclick="closeOrderDetailsModal()" class="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
          Cancel
        </button>
        ${isPending ? `
          <button onclick="submitCompletePaymentFromModal()" class="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700">
            Complete Payment
          </button>
        ` : ''}
      </div>
    </div>
  `;

  document.getElementById('modal-order-details').classList.remove('hidden');
}

function closeOrderDetailsModal() {
  document.getElementById('modal-order-details').classList.add('hidden');
}

function toggleSelectAllModalBooks(checked) {
  document.querySelectorAll('.modal-book-cb').forEach(cb => {
    cb.checked = checked;
  });
}

function submitCompletePaymentFromModal() {
  const order = db.orders.find(o => o.id === currentModalOrderId);
  if (order) {
    order.status = "Completed";
    order.statusCode = 1;
    if (order.items) {
      order.items.forEach(i => i.status = 1);
    }
    saveData();
    closeOrderDetailsModal();
    renderOrdersList();
  }
}

/* ================= BOOKS PAGE (BookList.tsx Card Grid) ================= */
function renderBooksGrid() {
  const container = document.getElementById('books-grid');
  const search = (document.getElementById('book-search').value || '').toLowerCase().trim();

  const filtered = db.books.filter(b => 
    !search || b.name.toLowerCase().includes(search) || b.authorName.toLowerCase().includes(search) || b.isbn.includes(search)
  );

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="col-span-full text-center py-12">
        <i data-lucide="package" class="mx-auto h-12 w-12 text-gray-400"></i>
        <h3 class="mt-2 text-sm font-medium text-gray-900">No books found</h3>
        <p class="mt-1 text-sm text-gray-500">Get started by adding a new book.</p>
      </div>
    `;
    if (window.lucide) window.lucide.createIcons();
    return;
  }

  container.innerHTML = filtered.map(book => `
    <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
      <div class="flex justify-between items-start mb-4">
        <div class="flex-1 min-w-0 pr-2">
          <h3 class="text-base sm:text-lg font-semibold text-gray-900 mb-1 truncate">${book.name}</h3>
          <p class="text-xs sm:text-sm text-gray-600 truncate">by ${book.authorName}</p>
        </div>
        <div class="flex space-x-1 sm:space-x-2 flex-shrink-0">
          <button
            onclick="editBook(${book.id})"
            class="p-2 text-blue-600 hover:bg-blue-50 rounded-md transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            title="Edit book"
          >
            <i data-lucide="edit" class="h-4 w-4"></i>
          </button>
          <button
            onclick="deleteBook(${book.id})"
            class="p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            title="Delete book"
          >
            <i data-lucide="trash-2" class="h-4 w-4"></i>
          </button>
        </div>
      </div>
      
      <div class="space-y-2 text-xs sm:text-sm">
        <div class="flex justify-between">
          <span class="text-gray-600">ISBN:</span>
          <span class="font-medium text-right truncate ml-2">${book.isbn}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-gray-600">Price:</span>
          <span class="font-medium">Rs. ${(book.price || 0).toLocaleString()}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-gray-600">Available:</span>
          <span class="font-medium ${book.qty > 0 ? 'text-green-600' : 'text-red-600'}">
            ${book.qty} copies
          </span>
        </div>
      </div>
    </div>
  `).join('');

  if (window.lucide) window.lucide.createIcons();
}

function openBookModal(book = null) {
  const authorSelect = document.getElementById('book-form-author');
  authorSelect.innerHTML = db.authors.map(a => `<option value="${a.id}">${a.name}</option>`).join('');

  if (book) {
    document.getElementById('modal-book-title').textContent = 'Edit Book';
    document.getElementById('book-form-id').value = book.id;
    document.getElementById('book-form-name').value = book.name;
    document.getElementById('book-form-author').value = book.authorId;
    document.getElementById('book-form-isbn').value = book.isbn;
    document.getElementById('book-form-price').value = book.price;
    document.getElementById('book-form-qty').value = book.qty;
  } else {
    document.getElementById('modal-book-title').textContent = 'Add New Book';
    document.getElementById('book-form-id').value = '';
    document.getElementById('book-form-name').value = '';
    document.getElementById('book-form-isbn').value = '';
    document.getElementById('book-form-price').value = '';
    document.getElementById('book-form-qty').value = '10';
  }

  document.getElementById('modal-book').classList.remove('hidden');
}

function closeBookModal() {
  document.getElementById('modal-book').classList.add('hidden');
}

function handleBookSubmit(e) {
  e.preventDefault();
  const id = document.getElementById('book-form-id').value;
  const name = document.getElementById('book-form-name').value.trim();
  const authorId = parseInt(document.getElementById('book-form-author').value);
  const author = db.authors.find(a => a.id === authorId);
  const isbn = document.getElementById('book-form-isbn').value.trim();
  const price = parseFloat(document.getElementById('book-form-price').value) || 0;
  const qty = parseInt(document.getElementById('book-form-qty').value) || 0;

  if (id) {
    const idx = db.books.findIndex(b => b.id === parseInt(id));
    if (idx !== -1) {
      db.books[idx] = { id: parseInt(id), name, authorId, authorName: author ? author.name : '', isbn, price, qty };
    }
  } else {
    const newId = db.books.length ? Math.max(...db.books.map(b => b.id)) + 1 : 1;
    db.books.unshift({ id: newId, name, authorId, authorName: author ? author.name : '', isbn, price, qty });
  }

  saveData();
  closeBookModal();
  renderBooksGrid();
}

function editBook(id) {
  const book = db.books.find(b => b.id === id);
  if (book) openBookModal(book);
}

function deleteBook(id) {
  if (confirm("Are you sure you want to delete this book?")) {
    db.books = db.books.filter(b => b.id !== id);
    saveData();
    renderBooksGrid();
  }
}

/* ================= CUSTOMERS PAGE (CustomerList.tsx Avatar Circle) ================= */
function renderCustomersTable() {
  const tbody = document.getElementById('customers-table-body');
  const search = (document.getElementById('customer-search').value || '').toLowerCase().trim();

  const filtered = db.customers.filter(c =>
    !search || c.name.toLowerCase().includes(search) || c.contact.includes(search) || c.registrationNo.toLowerCase().includes(search)
  );

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colSpan="6" class="text-center py-8 bg-white"><p class="text-gray-500">No customers found</p></td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(customer => {
    const orderCount = db.orders.filter(o => o.customerId === customer.id).length;
    return `
      <tr class="hover:bg-gray-50">
        <td class="px-6 py-4 whitespace-nowrap">
          <div class="flex items-center">
            <div class="flex-shrink-0 h-10 w-10">
              <div class="h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center">
                <span class="text-white font-medium text-sm">
                  ${customer.name.charAt(0).toUpperCase()}
                </span>
              </div>
            </div>
            <div class="ml-4">
              <div class="text-sm font-medium text-gray-900">${customer.name}</div>
              <div class="text-sm text-gray-500">ID: #${customer.id}</div>
            </div>
          </div>
        </td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${customer.contact}</td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${customer.registrationNo}</td>
        <td class="px-6 py-4 whitespace-nowrap">
          <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            ${orderCount} orders
          </span>
        </td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${formatDate(customer.date)}</td>
        <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
          <div class="flex space-x-3">
            <button onclick="editCustomer(${customer.id})" class="text-indigo-600 hover:text-indigo-900" title="Edit Customer">
              <i data-lucide="edit" class="w-4 h-4"></i>
            </button>
            <button onclick="deleteCustomer(${customer.id})" class="text-red-600 hover:text-red-900" title="Delete Customer">
              <i data-lucide="trash-2" class="w-4 h-4"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  if (window.lucide) window.lucide.createIcons();
}

function openCustomerModal(cust = null) {
  if (cust) {
    document.getElementById('modal-customer-title').textContent = 'Edit Customer';
    document.getElementById('customer-form-id').value = cust.id;
    document.getElementById('customer-form-name').value = cust.name;
    document.getElementById('customer-form-contact').value = cust.contact;
    document.getElementById('customer-form-regno').value = cust.registrationNo;
    document.getElementById('customer-form-date').value = cust.date;
  } else {
    document.getElementById('modal-customer-title').textContent = 'Add New Customer';
    document.getElementById('customer-form-id').value = '';
    document.getElementById('customer-form-name').value = '';
    document.getElementById('customer-form-contact').value = '';
    document.getElementById('customer-form-regno').value = `CUST-${new Date().getFullYear()}-00${db.customers.length + 1}`;
    document.getElementById('customer-form-date').value = new Date().toISOString().split('T')[0];
  }
  document.getElementById('modal-customer').classList.remove('hidden');
}

function closeCustomerModal() {
  document.getElementById('modal-customer').classList.add('hidden');
}

function handleCustomerSubmit(e) {
  e.preventDefault();
  const id = document.getElementById('customer-form-id').value;
  const name = document.getElementById('customer-form-name').value.trim();
  const contact = document.getElementById('customer-form-contact').value.trim();
  const registrationNo = document.getElementById('customer-form-regno').value.trim();
  const date = document.getElementById('customer-form-date').value;

  if (id) {
    const idx = db.customers.findIndex(c => c.id === parseInt(id));
    if (idx !== -1) db.customers[idx] = { id: parseInt(id), name, contact, registrationNo, date };
  } else {
    const newId = db.customers.length ? Math.max(...db.customers.map(c => c.id)) + 1 : 1;
    db.customers.unshift({ id: newId, name, contact, registrationNo, date });
  }

  saveData();
  closeCustomerModal();
  renderCustomersTable();
}

function editCustomer(id) {
  const cust = db.customers.find(c => c.id === id);
  if (cust) openCustomerModal(cust);
}

function deleteCustomer(id) {
  if (confirm("Are you sure you want to delete this customer? This will also delete all their orders.")) {
    db.customers = db.customers.filter(c => c.id !== id);
    saveData();
    renderCustomersTable();
  }
}

/* ================= AUTHORS PAGE (AuthorList.tsx) ================= */
function renderAuthorsTable() {
  const tbody = document.getElementById('authors-table-body');
  const search = (document.getElementById('author-search').value || '').toLowerCase().trim();

  const filtered = db.authors.filter(a => !search || a.name.toLowerCase().includes(search));

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colSpan="3" class="text-center py-8 text-gray-500">No authors found.</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(author => {
    const bookCount = db.books.filter(b => b.authorId === author.id).length;
    return `
      <tr class="hover:bg-gray-50">
        <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${author.name}</td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${bookCount}</td>
        <td class="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-3">
          <button onclick="editAuthor(${author.id})" class="text-indigo-600 hover:text-indigo-900" title="Edit">✏️</button>
          <button onclick="deleteAuthor(${author.id})" class="text-red-600 hover:text-red-900" title="Delete">🗑️</button>
        </td>
      </tr>
    `;
  }).join('');
}

function openAuthorModal(author = null) {
  if (author) {
    document.getElementById('modal-author-title').textContent = 'Edit Author';
    document.getElementById('author-form-id').value = author.id;
    document.getElementById('author-form-name').value = author.name;
  } else {
    document.getElementById('modal-author-title').textContent = 'Add New Author';
    document.getElementById('author-form-id').value = '';
    document.getElementById('author-form-name').value = '';
  }
  document.getElementById('modal-author').classList.remove('hidden');
}

function closeAuthorModal() {
  document.getElementById('modal-author').classList.add('hidden');
}

function handleAuthorSubmit(e) {
  e.preventDefault();
  const id = document.getElementById('author-form-id').value;
  const name = document.getElementById('author-form-name').value.trim();

  if (id) {
    const idx = db.authors.findIndex(a => a.id === parseInt(id));
    if (idx !== -1) db.authors[idx].name = name;
  } else {
    const newId = db.authors.length ? Math.max(...db.authors.map(a => a.id)) + 1 : 1;
    db.authors.push({ id: newId, name });
  }

  saveData();
  closeAuthorModal();
  renderAuthorsTable();
}

function editAuthor(id) {
  const author = db.authors.find(a => a.id === id);
  if (author) openAuthorModal(author);
}

function deleteAuthor(id) {
  if (confirm("Are you sure you want to delete this author?")) {
    db.authors = db.authors.filter(a => a.id !== id);
    saveData();
    renderAuthorsTable();
  }
}

/* ================= LOAN PAGE (app/dashboard/loan/page.tsx) ================= */
let currentLoanView = 'pending';

function changeLoanView(val) {
  currentLoanView = val;
  renderLoanTable();
}

function renderLoanTable() {
  const thead = document.getElementById('loan-thead');
  const tbody = document.getElementById('loan-table-body');
  const search = (document.getElementById('loan-search').value || '').toLowerCase().trim();

  if (currentLoanView === 'pending') {
    thead.innerHTML = `
      <tr>
        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Loan Amount</th>
        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
      </tr>
    `;

    const pendingLoans = db.loans.map(l => {
      const c = db.customers.find(cust => cust.id === l.customerId);
      return { ...l, customer: c };
    }).filter(l => l.customer && (!search || l.customer.name.toLowerCase().includes(search) || l.customer.contact.includes(search)));

    if (pendingLoans.length === 0) {
      tbody.innerHTML = `<tr><td colSpan="4" class="px-6 py-8 text-center text-gray-500">No pending loans</td></tr>`;
      return;
    }

    tbody.innerHTML = pendingLoans.map(l => `
      <tr class="hover:bg-gray-50">
        <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${l.customer.name}</td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">${l.customer.contact}</td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-red-600 font-semibold">Rs. ${l.amount.toLocaleString()}</td>
        <td class="px-6 py-4 whitespace-nowrap text-sm">
          <button onclick="completeLoanRecord(${l.customerId})" class="px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700">Complete</button>
        </td>
      </tr>
    `).join('');

  } else {
    thead.innerHTML = `
      <tr>
        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
      </tr>
    `;

    const filtered = db.customers.filter(c => !search || c.name.toLowerCase().includes(search) || c.contact.includes(search));

    if (filtered.length === 0) {
      tbody.innerHTML = `<tr><td colSpan="3" class="px-6 py-8 text-center text-gray-500">No customers found</td></tr>`;
      return;
    }

    tbody.innerHTML = filtered.map(c => `
      <tr class="hover:bg-gray-50">
        <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${c.name}</td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">${c.contact}</td>
        <td class="px-6 py-4 whitespace-nowrap text-sm">
          <button onclick="openAddLoanModal(${c.id})" class="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Add Loan</button>
        </td>
      </tr>
    `).join('');
  }
}

function completeLoanRecord(customerId) {
  if (confirm("Mark loan as completed and remove record?")) {
    db.loans = db.loans.filter(l => l.customerId !== customerId);
    saveData();
    renderLoanTable();
  }
}

let activeLoanCustomerId = null;
function openAddLoanModal(custIdx) {
  const c = db.customers.find(cust => cust.id === custIdx);
  if (!c) return;
  activeLoanCustomerId = c.id;
  document.getElementById('loan-cust-name').textContent = c.name;
  document.getElementById('loan-input-amount').value = '';
  document.getElementById('modal-add-loan').classList.remove('hidden');
}

function closeAddLoanModal() {
  document.getElementById('modal-add-loan').classList.add('hidden');
}

function submitNewLoan() {
  const amt = parseFloat(document.getElementById('loan-input-amount').value) || 0;
  if (amt <= 0 || !activeLoanCustomerId) return;

  const existing = db.loans.find(l => l.customerId === activeLoanCustomerId);
  if (existing) {
    existing.amount += amt;
  } else {
    db.loans.push({ customerId: activeLoanCustomerId, amount: amt });
  }

  saveData();
  closeAddLoanModal();
  currentLoanView = 'pending';
  document.getElementById('loan-view-select').value = 'pending';
  renderLoanTable();
}

/* ================= FINANCE PAGE (app/dashboard/finance/page.tsx) ================= */
let finTabMode = 'daily';

function switchFinanceTab(mode) {
  finTabMode = mode;
  document.getElementById('fin-btn-daily').className = mode === 'daily'
    ? 'px-4 py-2 rounded-md text-sm font-medium transition-colors bg-white text-blue-600 shadow'
    : 'px-4 py-2 rounded-md text-sm font-medium transition-colors text-gray-500 hover:text-gray-700';

  document.getElementById('fin-btn-monthly').className = mode === 'monthly'
    ? 'px-4 py-2 rounded-md text-sm font-medium transition-colors bg-white text-blue-600 shadow'
    : 'px-4 py-2 rounded-md text-sm font-medium transition-colors text-gray-500 hover:text-gray-700';

  document.getElementById('fin-month-select').style.display = mode === 'daily' ? 'inline-block' : 'none';
  renderFinancePage();
}

function renderFinancePage() {
  const m = parseInt(document.getElementById('fin-month-select').value);
  const y = parseInt(document.getElementById('fin-year-select').value);
  const tbody = document.getElementById('fin-table-body');
  const thPeriod = document.getElementById('fin-th-period');
  const title = document.getElementById('fin-table-title');

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  if (finTabMode === 'daily') {
    thPeriod.textContent = 'Date';
    title.textContent = `Daily Payments - ${months[m - 1]} ${y}`;

    const map = {};
    db.orders.forEach(o => {
      const [oY, oM] = o.orderDate.split('-').map(Number);
      if (oY === y && oM === m) {
        if (!map[o.orderDate]) map[o.orderDate] = { total: 0, count: 0, customers: new Set() };
        map[o.orderDate].total += o.totalAmount;
        map[o.orderDate].count += 1;
        map[o.orderDate].customers.add(o.customerId);
      }
    });

    const dates = Object.keys(map).sort().reverse();
    let totalRev = 0, totalOrd = 0;
    dates.forEach(d => {
      totalRev += map[d].total;
      totalOrd += map[d].count;
    });

    document.getElementById('fin-stat-total').textContent = `Rs. ${totalRev.toFixed(2)}`;
    document.getElementById('fin-stat-orders').textContent = totalOrd;
    document.getElementById('fin-stat-avg').textContent = totalOrd ? `Rs. ${(totalRev / totalOrd).toFixed(2)}` : 'Rs. 0.00';

    if (dates.length === 0) {
      tbody.innerHTML = `<tr><td colSpan="5" class="px-6 py-8 text-center text-gray-500">No payment data available for this period</td></tr>`;
      return;
    }

    tbody.innerHTML = dates.map(d => `
      <tr class="hover:bg-gray-50">
        <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${formatDate(d)}</td>
        <td class="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-600">Rs. ${map[d].total.toFixed(2)}</td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${map[d].count}</td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${map[d].customers.size}</td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">Rs. ${(map[d].total / map[d].count).toFixed(2)}</td>
      </tr>
    `).join('');

  } else {
    thPeriod.textContent = 'Month';
    title.textContent = `Monthly Payments - ${y}`;

    const map = {};
    for (let i = 1; i <= 12; i++) map[i] = { total: 0, count: 0, customers: new Set() };

    db.orders.forEach(o => {
      const [oY, oM] = o.orderDate.split('-').map(Number);
      if (oY === y && map[oM]) {
        map[oM].total += o.totalAmount;
        map[oM].count += 1;
        map[oM].customers.add(o.customerId);
      }
    });

    let totalRev = 0, totalOrd = 0;
    for (let i = 1; i <= 12; i++) {
      totalRev += map[i].total;
      totalOrd += map[i].count;
    }

    document.getElementById('fin-stat-total').textContent = `Rs. ${totalRev.toFixed(2)}`;
    document.getElementById('fin-stat-orders').textContent = totalOrd;
    document.getElementById('fin-stat-avg').textContent = totalOrd ? `Rs. ${(totalRev / totalOrd).toFixed(2)}` : 'Rs. 0.00';

    tbody.innerHTML = Array.from({ length: 12 }, (_, i) => i + 1).map(mon => `
      <tr class="hover:bg-gray-50">
        <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${months[mon - 1]} ${y}</td>
        <td class="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-600">Rs. ${map[mon].total.toFixed(2)}</td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${map[mon].count}</td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${map[mon].customers.size}</td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">${map[mon].count ? `Rs. ${(map[mon].total / map[mon].count).toFixed(2)}` : 'Rs. 0.00'}</td>
      </tr>
    `).join('');
  }
}

/* ================= REPORTS EXPORT ================= */
function exportExcelReport() {
  const selectedType = document.querySelector('input[name="reportType"]:checked')?.value || 'all';
  let csv = "data:text/csv;charset=utf-8,";

  if (selectedType === 'all' || selectedType === 'orders') {
    csv += "=== ORDERS ===\nOrder ID,Customer Name,Order Date,Return Date,Total Amount,Status\n";
    db.orders.forEach(o => {
      csv += `"${o.id}","${o.customerName}","${o.orderDate}","${o.returnDate}","${o.totalAmount}","${o.status}"\n`;
    });
    csv += "\n";
  }

  if (selectedType === 'all' || selectedType === 'books') {
    csv += "=== BOOKS ===\nBook ID,Book Name,Author,ISBN,Price,Quantity\n";
    db.books.forEach(b => {
      csv += `"${b.id}","${b.name}","${b.authorName}","${b.isbn}","${b.price}","${b.qty}"\n`;
    });
    csv += "\n";
  }

  if (selectedType === 'all' || selectedType === 'customers') {
    csv += "=== CUSTOMERS ===\nCustomer ID,Name,Contact,Registration No,Registration Date\n";
    db.customers.forEach(c => {
      csv += `"${c.id}","${c.name}","${c.contact}","${c.registrationNo}","${c.date}"\n`;
    });
  }

  const encodedUri = encodeURI(csv);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `bookshop-report-${selectedType}-${new Date().toISOString().split('T')[0]}.xlsx`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Initial Boot
document.addEventListener('DOMContentLoaded', () => {
  if (window.lucide) window.lucide.createIcons();
  isLoggedIn = true;
  document.getElementById('view-login')?.classList.add('hidden');
  document.getElementById('app-wrapper')?.classList.remove('hidden');
  navTo('dashboard');
});
