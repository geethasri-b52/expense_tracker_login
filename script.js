const CATEGORIES = ["Food", "Travel", "Shopping", "Bills", "Entertainment", "Other"];
const STORAGE_KEY = "expense-tracker-records-v1";
const $ = (id) => document.getElementById(id);

const USERS_KEY = "expense-tracker-users-v1";
let currentUser = null;
let expenses = [];

function readUsers() {
  try {
    const users = JSON.parse(localStorage.getItem(USERS_KEY) || "[]");
    return Array.isArray(users) ? users : [];
  } catch { return []; }
}
function saveUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}
function userStorageKey() {
  return `expense-tracker-records-v1-${currentUser.id}`;
}
function loadExpenses() {
  try {
    const saved = JSON.parse(localStorage.getItem(userStorageKey()) || "[]");
    return Array.isArray(saved) ? saved.filter(isValidExpense) : [];
  } catch { return []; }
}
function showDashboard() {
  $("loginPage").hidden = true;
  $("appContainer").hidden = false;
  $("loginForm").reset();
  $("registerForm").reset();
  expenses = loadExpenses();
  render();
}
$("showRegister").addEventListener("click", () => {
  $("loginForm").hidden = true;
  $("registerForm").hidden = false;
  $("showRegister").parentElement.hidden = true;
  $("backToLoginWrap").hidden = false;
  $("authSubtitle").textContent = "Create your personal account";
  $("loginError").textContent = "";
});
$("showLogin").addEventListener("click", () => {
  $("registerForm").hidden = true;
  $("loginForm").hidden = false;
  $("showRegister").parentElement.hidden = false;
  $("backToLoginWrap").hidden = true;
  $("authSubtitle").textContent = "Login to manage your expenses";
  $("registerError").textContent = "";
});
$("registerForm").addEventListener("submit", event => {
  event.preventDefault();
  const username = $("newUsername").value.trim();
  const password = $("newPassword").value;
  const confirm = $("confirmPassword").value;
  const error = $("registerError");
  const users = readUsers();
  if (username.length < 3) { error.textContent = "Username must contain at least 3 characters."; return; }
  if (password.length < 5) { error.textContent = "Password must contain at least 5 characters."; return; }
  if (password !== confirm) { error.textContent = "Passwords do not match."; return; }
  if (users.some(user => user.username.toLowerCase() === username.toLowerCase())) {
    error.textContent = "That username is already taken."; return;
  }
  const user = { id: (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`), username, password };
  saveUsers([...users, user]);
  currentUser = user;
  showDashboard();
});
$("loginForm").addEventListener("submit", function (event) {
  event.preventDefault();
  const username = $("username").value.trim();
  const password = $("password").value;
  const found = readUsers().find(user => user.username.toLowerCase() === username.toLowerCase() && user.password === password);
  if (!found) { $("loginError").textContent = "Invalid username or password."; return; }
  $("loginError").textContent = "";
  currentUser = found;
  showDashboard();
});
$("logoutBtn").addEventListener("click", () => {
  currentUser = null;
  expenses = [];
  $("appContainer").hidden = true;
  $("loginPage").hidden = false;
  $("loginError").textContent = "";
  $("loginForm").reset();
});

function isValidExpense(item) {
  return item && typeof item.id === "string" && typeof item.title === "string" &&
    Number.isFinite(Number(item.amount)) && Number(item.amount) > 0 &&
    CATEGORIES.includes(item.category) && /^\d{4}-\d{2}-\d{2}$/.test(item.date);
}

function persist() {
  if (currentUser) localStorage.setItem(userStorageKey(), JSON.stringify(expenses));
}

function currency(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2
  }).format(value);
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[char]));
}

function todayISO() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function setupCategories() {
  $("categoryInput").innerHTML = CATEGORIES.map(c => `<option value="${c}">${c}</option>`).join("");
  $("categoryFilter").innerHTML = `<option value="">All categories</option>` +
    CATEGORIES.map(c => `<option value="${c}">${c}</option>`).join("");
}

function visibleExpenses() {
  const term = $("searchInput").value.trim().toLocaleLowerCase();
  const category = $("categoryFilter").value;
  const from = $("fromDate").value;
  const to = $("toDate").value;

  return expenses.filter(item => {
    const matchesTerm = !term ||
      item.title.toLocaleLowerCase().includes(term) ||
      (item.description || "").toLocaleLowerCase().includes(term);

    return matchesTerm &&
      (!category || item.category === category) &&
      (!from || item.date >= from) &&
      (!to || item.date <= to);
  }).sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
}

function render() {
  const records = visibleExpenses();
  const total = records.reduce((sum, item) => sum + Number(item.amount), 0);

  $("totalAmount").textContent = currency(total);
  $("transactionCount").textContent = records.length;

  const totals = {};
  records.forEach(item => {
    totals[item.category] = (totals[item.category] || 0) + Number(item.amount);
  });

  const ranked = Object.entries(totals).sort((a, b) => b[1] - a[1]);
  $("topCategory").textContent = ranked[0]?.[0] || "—";
  $("topCategoryAmount").textContent = ranked[0] ? currency(ranked[0][1]) + " spent" : "No category total yet";

  $("expenseRows").innerHTML = records.map(item => `
    <tr>
      <td><span class="expense-name">${escapeHTML(item.title)}</span>${item.description ? `<span class="expense-desc">${escapeHTML(item.description)}</span>` : ""}</td>
      <td><span class="category-pill">${escapeHTML(item.category)}</span></td>
      <td>${new Date(item.date + "T12:00:00").toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</td>
      <td class="amount-col"><span class="amount">${currency(Number(item.amount))}</span></td>
      <td class="actions-col"><div class="actions"><button class="icon-btn" data-edit="${escapeHTML(item.id)}">Edit</button><button class="icon-btn delete" data-delete="${escapeHTML(item.id)}">Delete</button></div></td>
    </tr>`).join("");

  $("emptyState").classList.toggle("show", records.length === 0);
  $("resultsLabel").textContent = `${records.length} ${records.length === 1 ? "record" : "records"}`;

  const max = ranked[0]?.[1] || 0;
  $("categoryBreakdown").innerHTML = ranked.length ? ranked.map(([category, amount]) => `
    <div class="category-item">
      <div class="category-item-top"><span>${escapeHTML(category)}</span><strong>${currency(amount)}</strong></div>
      <div class="track"><div class="bar" style="width:${max ? Math.max(3, amount / max * 100) : 0}%"></div></div>
    </div>`).join("") :
    `<p class="category-empty">Category totals will appear here after you add expenses.</p>`;
}

function showToast(message) {
  const toast = $("toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove("show"), 2300);
}

function openDialog(item = null) {
  $("expenseForm").reset();
  $("formError").textContent = "";
  $("expenseId").value = item?.id || "";
  $("dialogTitle").textContent = item ? "Edit expense" : "Add expense";
  $("titleInput").value = item?.title || "";
  $("amountInput").value = item?.amount ?? "";
  $("categoryInput").value = item?.category || CATEGORIES[0];
  $("dateInput").value = item?.date || todayISO();
  $("descriptionInput").value = item?.description || "";
  $("expenseDialog").showModal();
  $("titleInput").focus();
}

$("newExpenseBtn").addEventListener("click", () => openDialog());
$("closeDialog").addEventListener("click", () => $("expenseDialog").close());
$("cancelBtn").addEventListener("click", () => $("expenseDialog").close());

$("expenseForm").addEventListener("submit", event => {
  event.preventDefault();

  const id = $("expenseId").value || (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`);
  const title = $("titleInput").value.trim();
  const amount = Number($("amountInput").value);
  const category = $("categoryInput").value;
  const date = $("dateInput").value;
  const description = $("descriptionInput").value.trim();

  if (!title || !Number.isFinite(amount) || amount <= 0 || !CATEGORIES.includes(category) || !date) {
    $("formError").textContent = "Enter a title, a positive amount, category, and date.";
    return;
  }

  const record = { id, title, amount: Math.round(amount * 100) / 100, category, date, description };
  const editing = expenses.some(item => item.id === id);
  expenses = editing ? expenses.map(item => item.id === id ? record : item) : [...expenses, record];

  persist();
  $("expenseDialog").close();
  render();
  showToast(editing ? "Expense updated." : "Expense added.");
});

$("expenseRows").addEventListener("click", event => {
  const editButton = event.target.closest("[data-edit]");
  const deleteButton = event.target.closest("[data-delete]");

  if (editButton) {
    const item = expenses.find(exp => exp.id === editButton.dataset.edit);
    if (item) openDialog(item);
  }

  if (deleteButton) {
    const item = expenses.find(exp => exp.id === deleteButton.dataset.delete);
    if (item && confirm(`Delete "${item.title}"? This cannot be undone.`)) {
      expenses = expenses.filter(exp => exp.id !== item.id);
      persist();
      render();
      showToast("Expense deleted.");
    }
  }
});

["searchInput", "categoryFilter", "fromDate", "toDate"].forEach(id => $(id).addEventListener("input", render));

$("clearFiltersBtn").addEventListener("click", () => {
  $("searchInput").value = "";
  $("categoryFilter").value = "";
  $("fromDate").value = "";
  $("toDate").value = "";
  render();
});

$("todayLabel").textContent = new Date().toLocaleDateString("en-IN", {
  weekday: "short",
  day: "numeric",
  month: "short",
  year: "numeric"
});

setupCategories();
render();
