const API_BASE_STORAGE_KEY = "familyRecordsApiBase";
const API_FALLBACK_BASES = [
  "",
  "http://localhost:8000",
  "http://127.0.0.1:8000",
];
const MYSQL_SAVE_ENDPOINTS = endpointCandidates("api/save_records.php");
const MYSQL_LOAD_ENDPOINTS = endpointCandidates("api/get_records.php");
const MYSQL_DELETE_ENDPOINTS = endpointCandidates("api/delete_record.php");
const AUTH_SESSION_ENDPOINTS = endpointCandidates("api/session.php");
const AUTH_LOGOUT_ENDPOINTS = endpointCandidates("api/logout.php");
const PROFILE_ENDPOINTS = endpointCandidates("api/profile.php");
const ACCOUNT_ENDPOINTS = endpointCandidates("api/accounts.php");
const THEME_STORAGE_KEY = "familyRecordsTheme";
const PDF_PAGE = {
  orientation: "portrait",
  unit: "mm",
  format: "a4",
};

const state = {
  records: [],
  search: "",
  page: 1,
  pageSize: 10,
  currentUser: null,
  accounts: [],
  filters: {
    level: "",
    age: "",
    support: "",
  },
};

const elements = {
  form: document.getElementById("familyForm"),
  recordId: document.getElementById("recordId"),
  motherName: document.getElementById("motherName"),
  motherCin: document.getElementById("motherCin"),
  motherPhone: document.getElementById("motherPhone"),
  motherAddress: document.getElementById("motherAddress"),
  childrenBody: document.getElementById("childrenBody"),
  schoolOptions: document.getElementById("schoolOptions"),
  childRowTemplate: document.getElementById("childRowTemplate"),
  addChildBtn: document.getElementById("addChildBtn"),
  saveNewBtn: document.getElementById("saveNewBtn"),
  newFormBtn: document.getElementById("newFormBtn"),
  generatePdfBtn: document.getElementById("generatePdfBtn"),
  recordsPdfBtn: document.getElementById("recordsPdfBtn"),
  recordsCsvBtn: document.getElementById("recordsCsvBtn"),
  exportCsvBtn: document.getElementById("exportCsvBtn"),
  themeToggleBtn: document.getElementById("themeToggleBtn"),
  logoutBtn: document.getElementById("logoutBtn"),
  profileBtn: document.getElementById("profileBtn"),
  headerProfileAvatar: document.getElementById("headerProfileAvatar"),
  headerProfileName: document.getElementById("headerProfileName"),
  userRoleBadge: document.getElementById("userRoleBadge"),
  profileForm: document.getElementById("profileForm"),
  profileImagePreview: document.getElementById("profileImagePreview"),
  profileDisplayName: document.getElementById("profileDisplayName"),
  profileImageInput: document.getElementById("profileImageInput"),
  profileMeta: document.getElementById("profileMeta"),
  profileSaveBtn: document.getElementById("profileSaveBtn"),
  profileModal: document.getElementById("profileModal"),
  accountsBtn: document.getElementById("accountsBtn"),
  accountsModal: document.getElementById("accountsModal"),
  accountsList: document.getElementById("accountsList"),
  accountForm: document.getElementById("accountForm"),
  accountUsername: document.getElementById("accountUsername"),
  accountRole: document.getElementById("accountRole"),
  accountPassword: document.getElementById("accountPassword"),
  accountGenerateBtn: document.getElementById("accountGenerateBtn"),
  accountCreateBtn: document.getElementById("accountCreateBtn"),
  generatedPasswordBox: document.getElementById("generatedPasswordBox"),
  generatedPasswordValue: document.getElementById("generatedPasswordValue"),
  copyGeneratedPasswordBtn: document.getElementById("copyGeneratedPasswordBtn"),
  clearDbBtn: document.getElementById("clearDbBtn"),
  recordsList: document.getElementById("recordsList"),
  recordsPagination: document.getElementById("recordsPagination"),
  prevPageBtn: document.getElementById("prevPageBtn"),
  nextPageBtn: document.getElementById("nextPageBtn"),
  pageInfo: document.getElementById("pageInfo"),
  pageSizeSelect: document.getElementById("pageSizeSelect"),
  recordCount: document.getElementById("recordCount"),
  searchInput: document.getElementById("searchInput"),
  filterLevel: document.getElementById("filterLevel"),
  filterAge: document.getElementById("filterAge"),
  filterSupport: document.getElementById("filterSupport"),
  clearFiltersBtn: document.getElementById("clearFiltersBtn"),
  formModeBadge: document.getElementById("formModeBadge"),
  toast: document.getElementById("appToast"),
  toastMessage: document.getElementById("toastMessage"),
};

const toast = new bootstrap.Toast(elements.toast, { delay: 2600 });
let profilePreviewObjectUrl = null;

function getStoredApiBase() {
  try {
    return localStorage.getItem(API_BASE_STORAGE_KEY) || "";
  } catch (error) {
    return "";
  }
}

function setStoredApiBase(base) {
  try {
    localStorage.setItem(API_BASE_STORAGE_KEY, base || "");
  } catch (error) {
    // Local storage can be unavailable in private or restricted browser modes.
  }
}

function endpointCandidates(path) {
  if (
    window.location.protocol === "http:" ||
    window.location.protocol === "https:"
  ) {
    return [path];
  }

  const storedBase = getStoredApiBase();
  const bases = [storedBase, ...API_FALLBACK_BASES.filter(Boolean)].filter(
    (base, index, allBases) => allBases.indexOf(base) === index,
  );

  return bases.map((base) => `${base.replace(/\/$/, "")}/${path}`);
}

function apiBaseFromEndpoint(endpoint) {
  if (!/^https?:\/\//i.test(endpoint)) {
    return "";
  }

  try {
    const url = new URL(endpoint);
    url.pathname = url.pathname.replace(/\/api\/[^/]*$/, "");
    url.search = "";
    url.hash = "";
    return url.href.replace(/\/$/, "");
  } catch (error) {
    return "";
  }
}

function showToast(message, tone = "dark") {
  elements.toast.className = `toast align-items-center border-0 text-bg-${tone}`;
  elements.toastMessage.textContent = message;
  toast.show();
}

function getStoredTheme() {
  try {
    return localStorage.getItem(THEME_STORAGE_KEY);
  } catch (error) {
    return null;
  }
}

function setStoredTheme(theme) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch (error) {
    // Local storage can be unavailable in private or restricted browser modes.
  }
}

function applyTheme(theme) {
  const selectedTheme = theme === "dark" ? "dark" : "light";
  const isDark = selectedTheme === "dark";
  document.documentElement.dataset.theme = selectedTheme;

  if (!elements.themeToggleBtn) return;

  elements.themeToggleBtn.setAttribute("aria-pressed", String(isDark));
  elements.themeToggleBtn.setAttribute(
    "aria-label",
    isDark ? "تبديل الوضع النهاري" : "تبديل الوضع الليلي",
  );
  elements.themeToggleBtn.title = isDark
    ? "تبديل الوضع النهاري"
    : "تبديل الوضع الليلي";

  const icon = elements.themeToggleBtn.querySelector("i");
  if (icon) {
    icon.className = isDark ? "bi bi-sun" : "bi bi-moon-stars";
  }

  const label = elements.themeToggleBtn.querySelector(".theme-label");
  if (label) {
    label.textContent = isDark ? "نهاري" : "ليلي";
  }
}

function toggleTheme() {
  const nextTheme =
    document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  setStoredTheme(nextTheme);
  applyTheme(nextTheme);
}

function redirectToLogin() {
  window.location.replace("login.html");
}

function isAdmin() {
  return state.currentUser?.role === "admin";
}

function updateUserRoleBadge() {
  if (!elements.userRoleBadge) return;

  elements.userRoleBadge.textContent = "";
  elements.userRoleBadge.hidden = true;
}

function avatarInitial() {
  const name =
    state.currentUser?.profile?.displayName ||
    state.currentUser?.username ||
    "?";
  return Array.from(String(name).trim())[0] || "?";
}

function setAvatarElement(element, imageUrl) {
  if (!element) return;

  if (imageUrl) {
    element.textContent = "";
    element.classList.add("has-image");
    element.style.backgroundImage = `url("${String(imageUrl).replace(/"/g, '\\"')}")`;
    return;
  }

  element.classList.remove("has-image");
  element.style.backgroundImage = "";
  element.textContent = avatarInitial();
}

function applyProfileToUi() {
  const profile = state.currentUser?.profile || {};
  const displayName = profile.displayName || state.currentUser?.username || "";
  const imageUrl = profile.imageUrl || "";

  if (elements.headerProfileName) {
    elements.headerProfileName.textContent = displayName || "الملف";
  }
  setAvatarElement(elements.headerProfileAvatar, imageUrl);
  setAvatarElement(elements.profileImagePreview, imageUrl);

  if (elements.profileDisplayName) {
    elements.profileDisplayName.value = displayName;
  }
  if (elements.profileMeta) {
    elements.profileMeta.textContent = `${state.currentUser?.username || ""} · ${state.currentUser?.role || ""}`;
  }

  updateUserRoleBadge();
  applyRolePermissions();
}

async function refreshProfile() {
  const result = await fetchJsonFromEndpoints(PROFILE_ENDPOINTS);
  state.currentUser.profile = result.profile || state.currentUser.profile || {};
  applyProfileToUi();
}

async function saveProfile(event) {
  event.preventDefault();
  if (!state.currentUser) return;

  const formData = new FormData();
  formData.append(
    "displayName",
    elements.profileDisplayName?.value.trim() || "",
  );
  const file = elements.profileImageInput?.files?.[0];
  if (file) {
    formData.append("profileImage", file);
  }

  elements.profileSaveBtn.disabled = true;
  try {
    const result = await fetchJsonFromEndpoints(PROFILE_ENDPOINTS, {
      method: "POST",
      body: formData,
    });
    state.currentUser.profile = result.profile || {};
    if (elements.profileImageInput) elements.profileImageInput.value = "";
    applyProfileToUi();
    bootstrap.Modal.getInstance(elements.profileModal)?.hide();
    showToast("تم حفظ الملف الشخصي.", "success");
  } catch (error) {
    showToast(`تعذر حفظ الملف الشخصي: ${error.message}`, "danger");
  } finally {
    elements.profileSaveBtn.disabled = false;
  }
}

function previewSelectedProfileImage() {
  const file = elements.profileImageInput?.files?.[0];
  if (!file) {
    setAvatarElement(
      elements.profileImagePreview,
      state.currentUser?.profile?.imageUrl || "",
    );
    return;
  }

  if (profilePreviewObjectUrl) {
    URL.revokeObjectURL(profilePreviewObjectUrl);
  }
  profilePreviewObjectUrl = URL.createObjectURL(file);
  setAvatarElement(elements.profileImagePreview, profilePreviewObjectUrl);
}

function roleLabel(role) {
  return role === "admin" ? "مدير" : "كاتب";
}

function generateLocalPassword(length = 12) {
  const alphabet =
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789@$%#";
  const values = new Uint32Array(length);

  if (window.crypto?.getRandomValues) {
    window.crypto.getRandomValues(values);
    return [...values]
      .map((value) => alphabet[value % alphabet.length])
      .join("");
  }

  return Array.from(
    { length },
    () => alphabet[Math.floor(Math.random() * alphabet.length)],
  ).join("");
}

function showGeneratedPassword(password = "") {
  if (!elements.generatedPasswordBox || !elements.generatedPasswordValue)
    return;

  elements.generatedPasswordValue.textContent = password;
  elements.generatedPasswordBox.hidden = !password;
}

async function copyGeneratedPassword() {
  const password = elements.generatedPasswordValue?.textContent || "";
  if (!password) return;

  try {
    await navigator.clipboard.writeText(password);
    showToast("تم نسخ كلمة المرور.", "success");
  } catch (error) {
    showToast("تعذر نسخ كلمة المرور.", "warning");
  }
}

async function accountRequest(payload) {
  return fetchJsonFromEndpoints(ACCOUNT_ENDPOINTS, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

async function loadAccounts() {
  if (!isAdmin() || !elements.accountsList) return;

  elements.accountsList.innerHTML = `
    <div class="empty-state">
      <i class="bi bi-arrow-repeat fs-3 d-block mb-2"></i>
      جاري تحميل الحسابات...
    </div>
  `;

  try {
    const result = await fetchJsonFromEndpoints(ACCOUNT_ENDPOINTS);
    state.accounts = Array.isArray(result.accounts) ? result.accounts : [];
    renderAccounts();
  } catch (error) {
    elements.accountsList.innerHTML = `
      <div class="empty-state text-danger">
        <i class="bi bi-exclamation-triangle fs-3 d-block mb-2"></i>
        تعذر تحميل الحسابات.
      </div>
    `;
    showToast(`تعذر تحميل الحسابات: ${error.message}`, "danger");
  }
}

function renderAccounts() {
  if (!elements.accountsList) return;

  if (!state.accounts.length) {
    elements.accountsList.innerHTML = `
      <div class="empty-state">
        <i class="bi bi-people fs-3 d-block mb-2"></i>
        لا توجد حسابات بعد.
      </div>
    `;
    return;
  }

  const adminCount = state.accounts.filter(
    (account) => account.role === "admin",
  ).length;
  elements.accountsList.innerHTML = state.accounts
    .map((account) => {
      const username = String(account.username || "");
      const profile = account.profile || {};
      const displayName = profile.displayName || username;
      const isSelf = username === state.currentUser?.username;
      const isLastAdmin = account.role === "admin" && adminCount <= 1;
      const initial = Array.from(String(displayName).trim())[0] || "?";
      const roleOptions = ["writer", "admin"]
        .map(
          (role) =>
            `<option value="${role}"${account.role === role ? " selected" : ""}>${roleLabel(role)}</option>`,
        )
        .join("");

      return `
        <article class="account-item" data-username="${escapeHtml(username)}">
          <div class="account-summary">
            <span class="account-avatar">${escapeHtml(initial)}</span>
            <div>
              <h3 class="h6 mb-1">${escapeHtml(displayName)}</h3>
              <div class="record-meta">
                ${escapeHtml(username)}
                ${isSelf ? '<span class="badge text-bg-light border ms-2">أنت</span>' : ""}
              </div>
            </div>
          </div>
          <div class="account-controls">
            <select class="form-select form-select-sm account-role-select" data-role-control${isSelf ? " disabled" : ""}>
              ${roleOptions}
            </select>
            <button class="btn btn-outline-primary btn-sm" type="button" data-account-action="saveRole"${isSelf ? " disabled" : ""}>
              <i class="bi bi-check2"></i>
              حفظ الدور
            </button>
            <button class="btn btn-outline-secondary btn-sm" type="button" data-account-action="resetPassword">
              <i class="bi bi-key"></i>
              توليد كلمة مرور
            </button>
            <button class="btn btn-outline-danger btn-sm" type="button" data-account-action="delete"${isSelf || isLastAdmin ? " disabled" : ""}>
              <i class="bi bi-trash3"></i>
              حذف
            </button>
          </div>
        </article>
      `;
    })
    .join("");
}

async function createAccount(event) {
  event.preventDefault();
  if (!isAdmin()) return;

  const username = elements.accountUsername?.value.trim() || "";
  const role = elements.accountRole?.value || "writer";
  const password = elements.accountPassword?.value || "";

  elements.accountCreateBtn.disabled = true;
  try {
    const result = await accountRequest({
      action: "create",
      username,
      role,
      password,
    });
    state.accounts = Array.isArray(result.accounts)
      ? result.accounts
      : state.accounts;
    renderAccounts();
    showGeneratedPassword(result.generatedPassword || password);
    elements.accountForm?.reset();
    if (elements.accountRole) elements.accountRole.value = "writer";
    showToast("تم إنشاء الحساب.", "success");
  } catch (error) {
    showToast(`تعذر إنشاء الحساب: ${error.message}`, "danger");
  } finally {
    elements.accountCreateBtn.disabled = false;
  }
}

async function handleAccountAction(event) {
  const button = event.target.closest("[data-account-action]");
  const item = event.target.closest(".account-item");
  if (!button || !item || !isAdmin()) return;

  const username = item.dataset.username || "";
  const action = button.dataset.accountAction;
  button.disabled = true;

  try {
    if (action === "saveRole") {
      const role = item.querySelector("[data-role-control]")?.value || "writer";
      const result = await accountRequest({ action: "update", username, role });
      state.accounts = Array.isArray(result.accounts)
        ? result.accounts
        : state.accounts;
      renderAccounts();
      showToast("تم تحديث الدور.", "success");
    }

    if (action === "resetPassword") {
      const confirmed = confirm(
        `هل تريد توليد كلمة مرور جديدة لحساب ${username}؟`,
      );
      if (!confirmed) return;
      const result = await accountRequest({
        action: "resetPassword",
        username,
      });
      state.accounts = Array.isArray(result.accounts)
        ? result.accounts
        : state.accounts;
      renderAccounts();
      showGeneratedPassword(result.generatedPassword || "");
      showToast("تم توليد كلمة مرور جديدة.", "success");
    }

    if (action === "delete") {
      const confirmed = confirm(`هل تريد حذف حساب ${username}؟`);
      if (!confirmed) return;
      const result = await accountRequest({ action: "delete", username });
      state.accounts = Array.isArray(result.accounts)
        ? result.accounts
        : state.accounts;
      renderAccounts();
      showGeneratedPassword("");
      showToast("تم حذف الحساب.", "success");
    }
  } catch (error) {
    showToast(`تعذر تنفيذ العملية: ${error.message}`, "danger");
  } finally {
    button.disabled = false;
  }
}

async function fetchJsonFromEndpoints(endpoints, options = {}) {
  let lastError = null;

  for (const endpoint of endpoints) {
    try {
      const isFormData = options.body instanceof FormData;
      const response = await fetch(endpoint, {
        credentials: "include",
        ...options,
        headers: isFormData
          ? { ...(options.headers || {}) }
          : {
              "Content-Type": "application/json",
              ...(options.headers || {}),
            },
      });
      const contentType = response.headers.get("content-type") || "";
      const result = contentType.includes("application/json")
        ? await response.json()
        : null;

      if (!response.ok || !result?.success) {
        throw new Error(result?.message || `HTTP ${response.status}`);
      }

      setStoredApiBase(apiBaseFromEndpoint(endpoint));
      return result;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error("Request failed.");
}

async function ensureAuthenticated() {
  try {
    const session = await fetchJsonFromEndpoints(AUTH_SESSION_ENDPOINTS);
    if (session.authenticated) {
      state.currentUser = {
        username: session.username || "",
        role: session.role || "writer",
        profile: session.profile || {
          displayName: session.username || "",
          imageUrl: "",
        },
      };
      applyProfileToUi();
      return true;
    }
  } catch (error) {
    console.warn(error);
  }

  redirectToLogin();
  return false;
}

async function logout() {
  try {
    await fetchJsonFromEndpoints(AUTH_LOGOUT_ENDPOINTS, { method: "POST" });
  } finally {
    redirectToLogin();
  }
}

function numericFamilyCode(value) {
  const text = String(value || "").trim();
  return /^\d+$/.test(text) ? Number(text) : 0;
}

function sortRecordsByNumber(records) {
  return [...records].sort((a, b) => {
    const aNumber = numericFamilyCode(a.familyCode);
    const bNumber = numericFamilyCode(b.familyCode);
    if (aNumber && bNumber) return aNumber - bNumber;
    if (aNumber) return -1;
    if (bNumber) return 1;
    return String(a.createdAt || "").localeCompare(String(b.createdAt || ""));
  });
}

function createId() {
  if (crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function setSelectValue(select, value) {
  const cleanValue = value || "";
  if (
    cleanValue &&
    ![...select.options].some((option) => option.value === cleanValue)
  ) {
    select.add(new Option(cleanValue, cleanValue));
  }
  select.value = cleanValue;
}

function initDatePicker(input) {
  if (!window.flatpickr) return;

  const updateMonthNumber = (selectedDates, dateStr, instance) => {
    const monthLabel = instance.calendarContainer.querySelector(".cur-month");
    if (!monthLabel) return;
    monthLabel.dataset.monthNumber = String(instance.currentMonth + 1).padStart(
      2,
      "0",
    );
  };

  flatpickr(input, {
    dateFormat: "Y-m-d",
    altInput: true,
    altFormat: "Y-m-d",
    allowInput: true,
    disableMobile: true,
    monthSelectorType: "static",
    locale: window.flatpickr.l10ns?.ar || "default",
    onReady: updateMonthNumber,
    onMonthChange: updateMonthNumber,
    onYearChange: updateMonthNumber,
    onOpen: updateMonthNumber,
  });
}

function getRepeatedChildDefaults() {
  const rows = [...elements.childrenBody.querySelectorAll(".child-row")];
  const firstChildName =
    rows[0]?.querySelector(".child-name")?.value.trim() || "";
  const familyName = firstChildName.split(/\s+/).filter(Boolean)[0] || "";

  return {
    name: familyName ? `${familyName} ` : "",
  };
}

function addChildRow(child = {}) {
  const row =
    elements.childRowTemplate.content.firstElementChild.cloneNode(true);
  row.querySelector(".child-name").value = child.name || "";
  const birthInput = row.querySelector(".child-birth");
  birthInput.value = child.birthDate || "";
  setSelectValue(row.querySelector(".child-level"), child.level);
  row.querySelector(".child-school").value =
    child.school || child.schoolName || "";
  initDatePicker(birthInput);
  row.querySelector(".remove-child").addEventListener("click", () => {
    if (elements.childrenBody.children.length === 1) {
      row.querySelectorAll("input, select").forEach((field) => {
        if (field._flatpickr) {
          field._flatpickr.clear();
        } else {
          field.value = "";
        }
      });
      return;
    }
    row.remove();
  });
  elements.childrenBody.appendChild(row);
}

function resetForm() {
  elements.form.reset();
  elements.recordId.value = "";
  elements.childrenBody.innerHTML = "";
  addChildRow();
  elements.formModeBadge.textContent = "إضافة جديدة";
  document
    .querySelectorAll(".record-item.active")
    .forEach((item) => item.classList.remove("active"));
  elements.motherName.focus();
}

function collectChildren() {
  return [...elements.childrenBody.querySelectorAll(".child-row")]
    .map((row) => ({
      name: row.querySelector(".child-name").value.trim(),
      birthDate: row.querySelector(".child-birth").value,
      level: row.querySelector(".child-level").value.trim(),
      school: row.querySelector(".child-school").value.trim(),
    }))
    .filter(
      (child) => child.name || child.birthDate || child.level || child.school,
    );
}

function validateChildren(children) {
  if (!children.length) {
    showToast("أضف على الأقل ابنا واحدا.", "warning");
    return false;
  }

  const isComplete = children.every(
    (child) => child.name && child.birthDate && child.level && child.school,
  );
  if (!isComplete) {
    showToast(
      "أكمل اسم الابن، تاريخ الازدياد، المستوى الدراسي، والمدرسة لكل سطر.",
      "warning",
    );
    return false;
  }

  return true;
}

function getFormRecord() {
  const now = new Date().toISOString();
  const existingId = elements.recordId.value;
  const existing = state.records.find((record) => record.id === existingId);

  return {
    id: existingId || createId(),
    motherName: elements.motherName.value.trim(),
    motherCin: elements.motherCin.value.trim(),
    motherPhone: elements.motherPhone.value.trim(),
    motherAddress: elements.motherAddress.value.trim(),
    familyCode: existing?.familyCode || "",
    children: collectChildren(),
    notes: existing?.notes || "",
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  };
}

async function refreshRecords() {
  state.records = (await loadRecordsFromMySql()).sort((a, b) =>
    String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")),
  );
  renderSchoolOptions();
  renderAgeOptions();
  renderRecords();
}

async function loadRecordsFromMySql() {
  let lastError = null;

  for (const endpoint of MYSQL_LOAD_ENDPOINTS) {
    try {
      const response = await fetch(endpoint, { credentials: "include" });
      const contentType = response.headers.get("content-type") || "";
      const result = contentType.includes("application/json")
        ? await response.json()
        : null;

      if (!response.ok || !result?.success) {
        throw new Error(result?.message || `HTTP ${response.status}`);
      }

      setStoredApiBase(apiBaseFromEndpoint(endpoint));
      return Array.isArray(result.records) ? result.records : [];
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error("تعذر تحميل البيانات من MySQL.");
}

function getChildSchool(child, record = {}) {
  return child.school || child.schoolName || record.notes || "";
}

function normalizeStudyLevel(level) {
  return String(level || "")
    .trim()
    .replace(/[\u064B-\u065F\u0670]/g, "")
    .replace(/\s+/g, " ");
}

function isFinishedStudyLevel(level) {
  const normalizedLevel = normalizeStudyLevel(level);
  if (!normalizedLevel) return false;

  return [
    "جامعي",
    "غير متمدرس",
    "منقطع",
    "لا يدرس",
    "لم يعد يدرس",
    "بدون دراسة",
  ].some((finishedLevel) => normalizedLevel.includes(finishedLevel));
}

function familySupportStatus(record) {
  const children = Array.isArray(record.children) ? record.children : [];
  const isSupported =
    children.length > 0 &&
    children.some((child) => !isFinishedStudyLevel(child.level));

  return {
    isSupported,
    label: isSupported ? "مدعومة" : "غير مدعومة",
    title: isSupported
      ? "مازالت الأسرة مدعومة لأن أحد الأبناء يدرس"
      : "غير مدعومة لأن جميع الأبناء أنهوا الدراسة",
    icon: isSupported ? "bi-check-circle-fill" : "bi-x-circle-fill",
    className: isSupported ? "is-supported" : "is-not-supported",
  };
}

function renderSchoolOptions() {
  if (!elements.schoolOptions) return;

  const schools = new Set();
  state.records.forEach((record) => {
    if (record.notes) schools.add(record.notes);
    record.children.forEach((child) => {
      const school = getChildSchool(child, record);
      if (school) schools.add(school);
    });
  });

  elements.schoolOptions.innerHTML = "";
  [...schools]
    .sort((a, b) => a.localeCompare(b, "ar"))
    .forEach((school) => {
      const option = document.createElement("option");
      option.value = school;
      elements.schoolOptions.appendChild(option);
    });
}

function renderAgeOptions() {
  const select = elements.filterAge;
  if (!select) return;

  const current = select.value || "";
  const ages = new Set();
  state.records.forEach((record) => {
    record.children.forEach((child) => {
      const age = calculateAgeFromBirthDate(child.birthDate);
      if (age) ages.add(age);
    });
  });

  select.innerHTML = "";
  const allOpt = document.createElement("option");
  allOpt.value = "";
  allOpt.textContent = "كل الأعمار";
  select.appendChild(allOpt);

  [...ages]
    .sort((a, b) => Number(a) - Number(b))
    .forEach((age) => {
      const opt = document.createElement("option");
      opt.value = age;
      opt.textContent = age;
      select.appendChild(opt);
    });

  if (current && ages.has(current)) {
    select.value = current;
  } else if (current) {
    state.filters.age = "";
  }
}

function recordMatches(record) {
  const query = state.search.trim().toLowerCase();
  // Note: do not early-return when query is empty — still apply field filters.

  const normalizedQuery = query.replace(/\s+/g, "");
  const motherCin = String(record.motherCin || "")
    .toLowerCase()
    .replace(/\s+/g, "");

  // If the user typed a compact token (likely a CIN), match against the normalized CIN first
  const isLikelyCin =
    /^[\w\-\u0600-\u06FF]+$/.test(normalizedQuery) &&
    normalizedQuery.length >= 3 &&
    !/\s/.test(query);
  if (isLikelyCin && motherCin && motherCin.includes(normalizedQuery))
    return true;

  const values = [
    record.motherName,
    record.motherCin,
    record.motherPhone,
    record.motherAddress,
    record.familyCode,
    record.notes,
    record.createdAt,
    record.updatedAt,
    formatDate(record.createdAt),
    formatDate(record.updatedAt),
    ...record.children.flatMap((child) => [
      child.name,
      child.birthDate,
      calculateAgeFromBirthDate(child.birthDate),
      child.level,
      getChildSchool(child, record),
    ]),
  ];

  // Apply field filters (level, age, support)
  try {
    const { level, age, support } = state.filters || {};
    if (level) {
      const levelMatched = record.children.some((child) =>
        normalizeStudyLevel(child.level)
          .toLowerCase()
          .includes(normalizeStudyLevel(level).toLowerCase()),
      );
      if (!levelMatched) return false;
    }

    if (age) {
      const ageMatched = record.children.some(
        (child) => calculateAgeFromBirthDate(child.birthDate) === String(age),
      );
      if (!ageMatched) return false;
    }

    if (support) {
      const supportStatus = familySupportStatus(record).isSupported
        ? "supported"
        : "unsupported";
      if (support !== supportStatus) return false;
    }
  } catch (e) {
    // ignore filter errors
  }

  return values.some((value) => {
    const text = String(value || "").toLowerCase();
    const compactText = text.replace(/\s+/g, "");
    return (
      text.includes(query) ||
      (normalizedQuery.length >= 2 && compactText.includes(normalizedQuery))
    );
  });
}

function studyLevelMatchesQuery(level, query) {
  const normalizedQuery = normalizeStudyLevel(query).toLowerCase();
  if (!normalizedQuery) return false;

  const normalizedLevel = normalizeStudyLevel(level).toLowerCase();
  const compactQuery = normalizedQuery.replace(/\s+/g, "");
  const compactLevel = normalizedLevel.replace(/\s+/g, "");

  return (
    normalizedLevel.includes(normalizedQuery) ||
    (compactQuery.length >= 2 && compactLevel.includes(compactQuery))
  );
}

function searchLooksLikeLevelFilter(records, query) {
  if (!query.trim()) return false;

  return records.some((record) =>
    record.children.some((child) => studyLevelMatchesQuery(child.level, query)),
  );
}

function filterPdfChildrenByLevelSearch(records, query) {
  if (!searchLooksLikeLevelFilter(records, query)) return records;

  return records
    .map((record) => ({
      ...record,
      children: record.children.filter((child) =>
        studyLevelMatchesQuery(child.level, query),
      ),
    }))
    .filter((record) => record.children.length > 0);
}

function hasActiveChildDropdownFilters() {
  return Boolean(state.filters?.level || state.filters?.age);
}

function childMatchesActiveDropdownFilters(child, record) {
  const { level, age } = state.filters || {};

  if (
    level &&
    !normalizeStudyLevel(child.level)
      .toLowerCase()
      .includes(normalizeStudyLevel(level).toLowerCase())
  ) {
    return false;
  }

  if (age && calculateAgeFromBirthDate(child.birthDate) !== String(age)) {
    return false;
  }

  return true;
}

function applyChildDropdownFilters(record) {
  if (!hasActiveChildDropdownFilters()) return record;

  return {
    ...record,
    children: record.children.filter((child) =>
      childMatchesActiveDropdownFilters(child, record),
    ),
  };
}

function currentSearchRecords() {
  return state.records
    .filter(recordMatches)
    .map(applyChildDropdownFilters)
    .filter(
      (record) =>
        !hasActiveChildDropdownFilters() || record.children.length > 0,
    );
}

function renderRecords() {
  const visibleRecords = currentSearchRecords();
  elements.recordCount.textContent = String(state.records.length);
  const totalPages = Math.max(
    1,
    Math.ceil(visibleRecords.length / state.pageSize),
  );
  state.page = Math.min(Math.max(state.page, 1), totalPages);
  const pageStart = (state.page - 1) * state.pageSize;
  const pageRecords = visibleRecords.slice(
    pageStart,
    pageStart + state.pageSize,
  );

  if (!visibleRecords.length) {
    elements.recordsList.innerHTML = `
      <div class="empty-state">
        <i class="bi bi-inbox fs-3 d-block mb-2"></i>
        لا توجد بيانات مطابقة حاليا.
      </div>
    `;
    renderPagination(visibleRecords.length, totalPages);
    return;
  }

  elements.recordsList.innerHTML = pageRecords
    .map((record) => {
      const activeClass =
        record.id === elements.recordId.value ? " active" : "";
      const childrenNames = record.children
        .map((child) => escapeHtml(child.name))
        .join("، ");
      const code = record.familyCode
        ? `<span>رقم السجل: ${escapeHtml(record.familyCode)}</span>`
        : "";
      const support = familySupportStatus(record);
      const motherDetails = [
        record.motherCin ? `البطاقة: ${escapeHtml(record.motherCin)}` : "",
        record.motherPhone ? `الهاتف: ${escapeHtml(record.motherPhone)}` : "",
        record.motherAddress
          ? `العنوان: ${escapeHtml(record.motherAddress)}`
          : "",
      ]
        .filter(Boolean)
        .join(" · ");
      return `
      <article class="record-item${activeClass}" data-id="${record.id}">
        <div class="record-title">
          <div class="record-heading">
            <span class="record-avatar">${escapeHtml((record.motherName || "؟").trim().charAt(0) || "؟")}</span>
            <div>
              <h3 class="h6 mb-1">${escapeHtml(record.motherName)}</h3>
              <div class="record-meta">${record.children.length} أبناء ${code}</div>
            </div>
          </div>
          <div class="record-badges">
            <span
              class="support-status ${support.className}"
              title="${escapeHtml(support.title)}"
              aria-label="${escapeHtml(support.title)}"
            >
              <i class="bi ${support.icon}"></i>
              <span>${escapeHtml(support.label)}</span>
            </span>
            <span class="badge text-bg-light border">${formatDate(record.updatedAt)}</span>
          </div>
        </div>
        ${motherDetails ? `<p class="record-meta mb-0 mt-2">${motherDetails}</p>` : ""}
        <p class="record-meta mb-0 mt-2">${childrenNames || "بدون أبناء"}</p>
        <div class="record-actions">
          <button class="btn btn-outline-primary btn-sm" type="button" data-action="edit">
            <i class="bi bi-pencil-square"></i>
            تعديل
          </button>
          <button class="btn btn-outline-secondary btn-sm" type="button" data-action="pdf">
            <i class="bi bi-file-earmark-pdf"></i>
            PDF
          </button>
          <button class="btn btn-outline-danger btn-sm" type="button" data-action="delete">
            <i class="bi bi-trash3"></i>
            حذف
          </button>
        </div>
      </article>
    `;
    })
    .join("");
  renderPagination(visibleRecords.length, totalPages);
  applyRolePermissions();
}

function renderPagination(totalVisible, totalPages) {
  if (!elements.recordsPagination) return;

  elements.recordsPagination.hidden = state.records.length === 0;
  elements.pageInfo.textContent = `${state.page} / ${totalPages}`;
  elements.prevPageBtn.disabled = state.page <= 1 || totalVisible === 0;
  elements.nextPageBtn.disabled =
    state.page >= totalPages || totalVisible === 0;
  elements.pageSizeSelect.value = String(state.pageSize);
}

function applyRolePermissions() {
  if (elements.accountsBtn) {
    elements.accountsBtn.hidden = !isAdmin();
  }

  document.querySelectorAll('[data-action="delete"]').forEach((button) => {
    button.hidden = !isAdmin();
  });
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatDate(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat("ar-MA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}

function calculateAgeFromBirthDate(value) {
  if (!value) return "";

  const [year, month, day] = String(value).split("-").map(Number);
  if (!year || !month || !day) return "";

  const today = new Date();
  let age = today.getFullYear() - year;
  const hasBirthdayPassed =
    today.getMonth() + 1 > month ||
    (today.getMonth() + 1 === month && today.getDate() >= day);

  if (!hasBirthdayPassed) age -= 1;

  return age >= 0 ? String(age) : "";
}

function fillForm(record) {
  elements.recordId.value = record.id;
  elements.motherName.value = record.motherName;
  elements.motherCin.value = record.motherCin || "";
  elements.motherPhone.value = record.motherPhone || "";
  elements.motherAddress.value = record.motherAddress || "";
  elements.childrenBody.innerHTML = "";
  record.children.forEach((child) =>
    addChildRow({
      ...child,
      school: getChildSchool(child, record),
    }),
  );
  if (!record.children.length) addChildRow();
  elements.formModeBadge.textContent = "تعديل بيانات";
  renderRecords();
  elements.motherName.focus();
}

async function handleSave({ startNew = false } = {}) {
  if (!elements.form.reportValidity()) return null;

  const record = getFormRecord();
  if (!validateChildren(record.children)) return null;

  const mysqlResult = await syncRecordsToMySql([record], { silent: true });
  if (!mysqlResult) {
    showToast("تعذر الحفظ في MySQL. لم يتم حفظ السجل.", "danger");
    return null;
  }

  const savedRecord =
    mysqlResult.records?.find((entry) => entry.id === record.id) || record;
  await refreshRecords();
  showToast("تم حفظ البيانات في MySQL/phpMyAdmin.", "success");

  if (startNew) {
    resetForm();
  } else {
    fillForm(savedRecord);
  }

  return savedRecord;
}

async function syncRecordsToMySql(
  records = state.records,
  { silent = false } = {},
) {
  if (!records.length) {
    if (!silent) showToast("لا توجد بيانات لإرسالها إلى MySQL.", "warning");
    return false;
  }

  let lastError = null;
  try {
    for (const endpoint of MYSQL_SAVE_ENDPOINTS) {
      try {
        const response = await fetch(endpoint, {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ records }),
        });

        const contentType = response.headers.get("content-type") || "";
        const result = contentType.includes("application/json")
          ? await response.json()
          : null;

        if (!response.ok || !result?.success) {
          throw new Error(result?.message || `HTTP ${response.status}`);
        }

        setStoredApiBase(apiBaseFromEndpoint(endpoint));
        if (!silent) {
          showToast(
            `تم حفظ ${result.saved} سجل في MySQL/phpMyAdmin.`,
            "success",
          );
        }
        return result;
      } catch (error) {
        lastError = error;
      }
    }

    throw lastError || new Error("MySQL sync failed.");
  } catch (error) {
    console.warn(error);
    if (!silent) {
      showToast(`تعذر الحفظ في MySQL: ${error.message}`, "danger");
    }
    return null;
  }
}

async function deleteRecordFromMySql(id, { silent = false } = {}) {
  if (!id) return false;

  let lastError = null;
  try {
    for (const endpoint of MYSQL_DELETE_ENDPOINTS) {
      try {
        const response = await fetch(endpoint, {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ id }),
        });

        const contentType = response.headers.get("content-type") || "";
        const result = contentType.includes("application/json")
          ? await response.json()
          : null;

        if (!response.ok || !result?.success) {
          throw new Error(result?.message || `HTTP ${response.status}`);
        }

        setStoredApiBase(apiBaseFromEndpoint(endpoint));
        return true;
      } catch (error) {
        lastError = error;
      }
    }

    throw lastError || new Error("MySQL delete failed.");
  } catch (error) {
    console.warn(error);
    if (!silent) {
      showToast(`تعذر الحذف من MySQL: ${error.message}`, "warning");
    }
    return false;
  }
}

async function generatePdf(record) {
  if (!record || !record.children.length) {
    showToast("لا توجد بيانات جاهزة لإنشاء PDF.", "warning");
    return;
  }

  await generatePdfFromHtml([record], {
    title: "جدول الأسرة",
    fileName: `family-${safeFileName(record.motherName)}.pdf`,
    meta: [
      `اسم الأم: ${record.motherName}`,
      record.motherCin ? `رقم البطاقة الوطنية: ${record.motherCin}` : "",
      record.motherPhone ? `الهاتف: ${record.motherPhone}` : "",
      record.motherAddress ? `العنوان: ${record.motherAddress}` : "",
      record.familyCode ? `رقم السجل: ${record.familyCode}` : "",
    ].filter(Boolean),
  });
}

async function generateAllRecordsPdf(records) {
  if (!records || !records.length) {
    showToast("لا توجد بيانات محفوظة لتصديرها.", "warning");
    return;
  }

  const orderedRecords = sortRecordsByNumber(records);
  const childrenCount = orderedRecords.reduce(
    (total, record) => total + record.children.length,
    0,
  );
  await generatePdfFromHtml(orderedRecords, {
    title: "لائحة أطفال المؤسسة 2025-2026 موسم",
    fileName: "all-family-records.pdf",
    meta: [
      `عدد الأسر: ${records.length}`,
      `عدد الأبناء: ${childrenCount}`,
      `تاريخ التصدير: ${formatDate(new Date().toISOString())}`,
    ],
  });
}

async function generatePdfFromHtml(records, options = {}) {
  if (!window.html2canvas) {
    showToast("تعذر تحميل مكتبة PDF. افتح الصفحة عبر خادم محلي.", "danger");
    return;
  }

  const pagesContainer = buildPdfPages(records, options);
  document.body.appendChild(pagesContainer);

  try {
    await document.fonts?.ready;
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF(PDF_PAGE);
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const pages = [...pagesContainer.querySelectorAll(".pdf-capture-sheet")];

    for (const [index, page] of pages.entries()) {
      const canvas = await html2canvas(page, {
        backgroundColor: "#ffffff",
        scale: 2,
        useCORS: true,
      });
      const imageData = canvas.toDataURL("image/png");

      if (index > 0) pdf.addPage();
      pdf.addImage(imageData, "PNG", 0, 0, pageWidth, pageHeight);
    }

    pdf.save(options.fileName || "family-records.pdf");
  } finally {
    pagesContainer.remove();
  }
}

function buildPdfPages(records, options = {}) {
  const allRows = flattenPdfRows(records);
  const pageRows = paginatePdfRows(allRows, options);
  const pagesContainer = document.createElement("div");
  pagesContainer.className = "pdf-pages-container";
  pageRows.forEach((rows, index) => {
    pagesContainer.appendChild(
      buildPdfSheet(rows, options, index + 1, pageRows.length),
    );
  });
  return pagesContainer;
}

function flattenPdfRows(records) {
  return records.flatMap((record, recordIndex) => {
    const children = record.children.length
      ? record.children
      : [{ name: "", birthDate: "", level: "", school: "" }];
    return children.map((child, childIndex) => ({
      record,
      recordIndex,
      child,
      childIndex,
    }));
  });
}

function paginatePdfRows(rows, options = {}) {
  const probe = document.createElement("div");
  probe.className = "pdf-pages-container";
  document.body.appendChild(probe);

  const pages = [];
  let currentRows = [];

  try {
    rows.forEach((row) => {
      const candidateRows = [...currentRows, row];
      const candidateSheet = buildPdfSheet(
        candidateRows,
        options,
        pages.length + 1,
        1,
      );
      probe.replaceChildren(candidateSheet);

      if (sheetFitsPage(candidateSheet) || currentRows.length === 0) {
        currentRows = candidateRows;
        return;
      }

      pages.push(currentRows);
      currentRows = [row];
    });

    if (currentRows.length) {
      pages.push(currentRows);
    }
  } finally {
    probe.remove();
  }

  return pages.length ? pages : [[]];
}

function sheetFitsPage(sheet) {
  return sheet.scrollHeight <= sheet.clientHeight + 2;
}

function buildPdfSheet(rows, options = {}, pageNumber = 1, totalPages = 1) {
  const recordsCount = new Set(rows.map((row) => row.record.id)).size;
  const meta = options.meta || [`عدد الأسر: ${recordsCount}`];
  const sheet = document.createElement("section");
  sheet.className = "pdf-capture-sheet";
  sheet.innerHTML = `
    <div class="pdf-sheet-header">
      <img class="pdf-logo" src="logo.png" alt="">
      <div class="pdf-title-block">
        <h2>${escapeHtml(options.title || "جدول الأسر")}</h2>
        <div class="pdf-meta">
          ${meta.map((item) => `<strong>${escapeHtml(item)}</strong>`).join("")}
          <strong>صفحة ${pageNumber} / ${totalPages}</strong>
        </div>
      </div>
      <div class="pdf-logo-spacer"></div>
    </div>
    <table>
      <thead>
        <tr>
          <th>الرقم</th>
          <th>اسم الأم</th>
          <th>رقم البطاقة الوطنية</th>
          <th>الهاتف</th>
          <th>العنوان</th>
          <th>الأبناء</th>
          <th>سن</th>
          <th>المستوى الدراسي</th>
          <th>المدرسة</th>
        </tr>
      </thead>
      <tbody>
        ${buildPageRows(rows)}
      </tbody>
    </table>
  `;
  return sheet;
}

function buildPageRows(rows) {
  let html = "";
  let index = 0;

  while (index < rows.length) {
    const group = [rows[index]];
    index += 1;

    while (
      index < rows.length &&
      rows[index].record.id === group[0].record.id
    ) {
      group.push(rows[index]);
      index += 1;
    }

    html += buildMotherRows(group);
  }

  return html;
}

function buildMotherRows(groupRows) {
  const rowSpan = groupRows.length;

  return groupRows
    .map((row, index) => {
      const { record, recordIndex, child } = row;
      const groupClass = index === 0 ? ' class="mother-group-start"' : "";
      const continuedText =
        row.childIndex > 0 ? ' <span class="continued-label">تابع</span>' : "";
      const motherCells =
        index === 0
          ? `
      <td rowspan="${rowSpan}" class="group-number">${escapeHtml(record.familyCode || recordIndex + 1)}</td>
      <td rowspan="${rowSpan}" class="mother-cell">${escapeHtml(record.motherName)}${continuedText}</td>
      <td rowspan="${rowSpan}" class="mother-cell">${escapeHtml(record.motherCin)}</td>
      <td rowspan="${rowSpan}" class="mother-cell phone-cell">${escapeHtml(record.motherPhone)}</td>
      <td rowspan="${rowSpan}" class="mother-cell">${escapeHtml(record.motherAddress)}</td>
    `
          : "";
      const schoolCell = `<td class="school-cell">${escapeHtml(getChildSchool(child, record))}</td>`;

      return `
      <tr${groupClass}>
        ${motherCells}
        <td>${escapeHtml(child.name)}</td>
        <td class="age-cell">${escapeHtml(calculateAgeFromBirthDate(child.birthDate))}</td>
        <td>${escapeHtml(child.level)}</td>
        ${schoolCell}
      </tr>
    `;
    })
    .join("");
}

function safeFileName(value) {
  return (
    String(value || "record")
      .trim()
      .replace(/[\\/:*?"<>|]+/g, "-")
      .replace(/\s+/g, "-")
      .slice(0, 80) || "record"
  );
}

function exportCsv() {
  const records = currentSearchRecords();
  if (!records.length) {
    showToast("لا توجد بيانات لتصديرها.", "warning");
    return;
  }

  const headers = [
    "رقم السجل",
    "اسم الأم",
    "رقم البطاقة الوطنية",
    "الهاتف",
    "العنوان",
    "اسم الابن",
    "العمر",
    "المستوى الدراسي",
    "المدرسة",
    "تاريخ الحفظ",
  ];
  const rows = sortRecordsByNumber(records).flatMap((record) => {
    if (!record.children.length) {
      return [
        [
          record.familyCode,
          record.motherName,
          record.motherCin,
          record.motherPhone,
          record.motherAddress,
          "",
          "",
          "",
          record.notes,
          record.createdAt,
        ],
      ];
    }
    return record.children.map((child) => [
      record.familyCode,
      record.motherName,
      record.motherCin,
      record.motherPhone,
      record.motherAddress,
      child.name,
      calculateAgeFromBirthDate(child.birthDate),
      child.level,
      getChildSchool(child, record),
      record.createdAt,
    ]);
  });

  const csv = [headers, ...rows]
    .map((row) => row.map(csvCell).join(","))
    .join("\r\n");

  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" });
  downloadBlob(blob, "family-records.csv");
  showToast("تم تصدير ملف Excel.", "success");
}

function csvCell(value) {
  return `"${String(value || "").replace(/"/g, '""')}"`;
}

function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function currentFormHasData() {
  return Boolean(
    elements.motherName.value.trim() ||
    elements.motherCin.value.trim() ||
    elements.motherPhone.value.trim() ||
    elements.motherAddress.value.trim() ||
    collectChildren().some(
      (child) => child.name || child.birthDate || child.level || child.school,
    ),
  );
}

async function getRecordsForFullPdf() {
  if (currentFormHasData()) {
    const savedRecord = await handleSave();
    if (!savedRecord) return null;
  }

  if (!state.records.length) {
    showToast("أدخل البيانات واحفظها أولا، ثم أنشئ PDF.", "warning");
    return null;
  }

  const records = filterPdfChildrenByLevelSearch(
    currentSearchRecords(),
    state.search,
  );
  if (state.search.trim() && !records.length) {
    showToast("لا توجد بيانات مطابقة للبحث لإنشاء PDF.", "warning");
    return null;
  }

  return records;
}

function bindEvents() {
  elements.themeToggleBtn?.addEventListener("click", toggleTheme);
  elements.logoutBtn?.addEventListener("click", logout);
  elements.profileForm?.addEventListener("submit", saveProfile);
  elements.profileImageInput?.addEventListener(
    "change",
    previewSelectedProfileImage,
  );
  elements.profileModal?.addEventListener("show.bs.modal", () => {
    applyProfileToUi();
    refreshProfile().catch(() => {});
  });
  elements.accountsModal?.addEventListener("show.bs.modal", () => {
    showGeneratedPassword("");
    if (elements.accountPassword) elements.accountPassword.value = "";
    loadAccounts();
  });
  elements.accountForm?.addEventListener("submit", createAccount);
  elements.accountGenerateBtn?.addEventListener("click", () => {
    const password = generateLocalPassword();
    if (elements.accountPassword) elements.accountPassword.value = password;
    showGeneratedPassword(password);
  });
  elements.copyGeneratedPasswordBtn?.addEventListener(
    "click",
    copyGeneratedPassword,
  );
  elements.accountsList?.addEventListener("click", handleAccountAction);

  elements.addChildBtn.addEventListener("click", () =>
    addChildRow(getRepeatedChildDefaults()),
  );

  elements.form.addEventListener("submit", async (event) => {
    event.preventDefault();
    await handleSave();
  });

  elements.saveNewBtn.addEventListener("click", async () => {
    await handleSave({ startNew: true });
  });

  elements.newFormBtn.addEventListener("click", resetForm);

  elements.generatePdfBtn?.addEventListener("click", async () => {
    const records = await getRecordsForFullPdf();
    await generateAllRecordsPdf(records);
  });
  elements.recordsPdfBtn?.addEventListener("click", async () => {
    const records = await getRecordsForFullPdf();
    await generateAllRecordsPdf(records);
  });
  elements.recordsCsvBtn?.addEventListener("click", exportCsv);

  elements.exportCsvBtn?.addEventListener("click", exportCsv);

  elements.searchInput.addEventListener("input", (event) => {
    state.search = event.target.value;
    state.page = 1;
    renderRecords();
  });

  // Field filter handlers
  elements.filterLevel?.addEventListener("change", (event) => {
    state.filters.level = event.target.value || "";
    state.page = 1;
    renderRecords();
  });

  elements.filterAge?.addEventListener("change", (event) => {
    state.filters.age = event.target.value || "";
    state.page = 1;
    renderRecords();
  });

  elements.filterSupport?.addEventListener("change", (event) => {
    state.filters.support = event.target.value || "";
    state.page = 1;
    renderRecords();
  });

  elements.clearFiltersBtn?.addEventListener("click", () => {
    state.filters = { level: "", age: "", support: "" };
    if (elements.filterLevel) elements.filterLevel.value = "";
    if (elements.filterAge) elements.filterAge.value = "";
    if (elements.filterSupport) elements.filterSupport.value = "";
    state.page = 1;
    renderRecords();
  });

  elements.prevPageBtn.addEventListener("click", () => {
    state.page -= 1;
    renderRecords();
  });

  elements.nextPageBtn.addEventListener("click", () => {
    state.page += 1;
    renderRecords();
  });

  elements.pageSizeSelect.addEventListener("change", (event) => {
    state.pageSize = Number(event.target.value) || 10;
    state.page = 1;
    renderRecords();
  });

  elements.recordsList.addEventListener("click", async (event) => {
    const button = event.target.closest("button[data-action]");
    const item = event.target.closest(".record-item");
    if (!button || !item) return;

    const record = state.records.find((entry) => entry.id === item.dataset.id);
    const visibleRecord = currentSearchRecords().find(
      (entry) => entry.id === item.dataset.id,
    );
    if (!record) return;

    const action = button.dataset.action;
    if (action === "edit") {
      fillForm(record);
    }

    if (action === "pdf") {
      await generatePdf(visibleRecord || record);
    }

    if (action === "delete") {
      if (!isAdmin()) {
        showToast("Delete is only allowed for admin users.", "warning");
        return;
      }
      const confirmed = confirm(`هل تريد حذف سجل ${record.motherName}؟`);
      if (!confirmed) return;
      const mysqlDeleted = await deleteRecordFromMySql(record.id, {
        silent: true,
      });
      if (!mysqlDeleted) {
        showToast("تعذر حذف السجل من MySQL.", "danger");
        return;
      }
      if (elements.recordId.value === record.id) resetForm();
      await refreshRecords();
      showToast("تم حذف السجل من MySQL.", "success");
    }
  });
}

async function init() {
  try {
    applyTheme(getStoredTheme() || document.documentElement.dataset.theme);
    if (!(await ensureAuthenticated())) return;
    bindEvents();
    resetForm();
    await refreshRecords();
  } catch (error) {
    console.error(error);
    showToast(
      "تعذر تحميل البيانات من MySQL. تأكد أن Apache و MySQL يعملان.",
      "danger",
    );
  }
}

init();
