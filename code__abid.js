// Global variables and constants
const PAGES = [
  { id: "home", name: "Home", icon: "fa-house-chimney", content: "home" },
  {
    id: "notice",
    name: "Notice",
    icon: "fa-solid fa-bell",
    content: "notice",
  },
  {
    id: "report",
    name: "Report",
    icon: "fa-solid fa-list-check",
    content: "report",
  },
  {
    id: "account",
    name: "Account",
    icon: "fa-solid fa-user",
    content: "account",
  },
];

const USER_STORAGE_KEY = "usrNameAbid";
const USER_ID_STORAGE_KEY = "usrIDAbid"; // Key for user-provided ID
const AUTH_REQUIRED_PAGES = ["notice", "report", "home"];

let activePageId = "home"; // Initial page
let noticeDataCache = null; // 👈 ADDED: Cache to store fetched notice data
let reportDataCache = null; // addedA

// DOM elements
const headerTitleEl = document.getElementById("header-title");
const contentEl = document.getElementById("page-content");
const navBarEl = document.getElementById("bottom-navbar");
const usernameDisplayEl = document.getElementById("username-display");
const userInitialEl = document.getElementById("user-initial");
// Renamed from spinnerEl to loaderEl
const loaderEl = document.getElementById("loader-container");
const pageTitleEl = document.getElementById("page-title");

// --- Utility Functions ---

/**
 * Converts a string to Proper Case (e.g., 'abid ahmed' -> 'Abid Ahmed').
 * @param {string} str
 * @returns {string} Proper cased string.
 */
function properCase(str) {
  if (!str) return "";
  return str
    .trim()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

/**
 * Calculates the sum of alphabetical positions for all letters in a username.
 * Ignores spaces and non-alphabetic characters. (A=1, B=2, Z=26)
 * @param {string} username
 * @returns {number} The sum of alphabetical positions.
 */
function getAlphabeticalPositionSum(username) {
  let sum = 0;
  // Convert to lowercase and strip all non-alphabetic characters
  const cleanedUsername = username.toLowerCase().replace(/[^a-z]/g, "");

  for (let i = 0; i < cleanedUsername.length; i++) {
    const char = cleanedUsername.charAt(i);
    // Calculate position: 'a' (code 97) - 'a' (code 97) + 1 = 1
    const position = char.charCodeAt(0) - "a".charCodeAt(0) + 1;
    sum += position;
  }
  return sum;
}

/**
 * Calculates a 5-digit ID based on the sum of alphabetical positions of the username.
 * Logic: First 5 digits of (Sum * sqrt(2) * 10^5)
 * @param {string} username
 * @returns {string} 5-digit ID.
 */
function calculateID(username) {
  // Use the new logic: Sum of alphabetical positions (a=1, b=2, etc.)
  const sumOfPositions = getAlphabeticalPositionSum(username);

  // Requires a minimum sum for a valid calculation
  if (sumOfPositions < 4) {
    return "00000";
  }

  // Core Calculation: (Sum of Positions) * Math.sqrt(2) * 100,000
  const baseNumber = sumOfPositions * Math.sqrt(2) * 100000;

  // Take the integer part and convert to string
  const baseString = Math.floor(baseNumber).toString();

  // Extract the first 5 digits
  if (baseString.length >= 5) {
    return baseString.substring(0, 5);
  }
  // Pad with leading zeros if result is too short (unlikely with sum > 4)
  return baseString.padStart(5, "0");
}

// --- Core UI Functions ---

/**
 * Generates the HTML for the bottom navigation bar.
 */
function renderNavBar() {
  navBarEl.innerHTML = PAGES.map(
    (page) => `
        <a class="nav-item ${
          page.id === activePageId ? "active" : ""
        }" data-page-id="${page.id}" onclick="navigateTo('${page.id}')">
          <i class="nav-icon fa-solid ${page.icon}"></i>
          <span>${page.name}</span>
        </a>
      `
  ).join("");
}

/**
 * Updates the header and user info based on current state.
 */
function renderHeader() {
  const activePage = PAGES.find((p) => p.id === activePageId);
  headerTitleEl.textContent = activePage ? activePage.name : "App";
  pageTitleEl.textContent = activePage
    ? `${activePage.name} - Modern App`
    : "Modern App";

  const storedUsername = localStorage.getItem(USER_STORAGE_KEY);
  if (storedUsername) {
    const initial = storedUsername.charAt(0).toUpperCase();
    userInitialEl.textContent = initial;
    usernameDisplayEl.textContent = storedUsername;
  } else {
    userInitialEl.textContent = "?";
    usernameDisplayEl.textContent = "Guest";
  }
}

/**
 * Generates skeleton HTML based on the target page structure.
 */
function getSkeletonHtml(pageId) {
  const listSkeleton = () => `
        <div class="content-section">
          <div class="skeleton-box" style="width: 50%; height: 25px; margin-bottom: 25px;"></div>
          ${Array(3)
            .fill(0)
            .map(
              () => `
            <div class="skeleton-list-item">
              <div class="skeleton-list-header">
                <div class="skeleton-box short" style="height: 14px; width: 30%;"></div>
                <div class="skeleton-box short" style="height: 14px; width: 25%;"></div>
              </div>
              <div class="skeleton-text-line medium skeleton-box"></div>
              <div class="skeleton-text-line short skeleton-box"></div>
            </div>
          `
            )
            .join("")}
        </div>
      `;

  const tableSkeleton = () => `
        <div class="content-section">
          <div class="skeleton-box" style="width: 65%; height: 25px; margin-bottom: 25px;"></div>
          <div class="skeleton-table">
            <div class="skeleton-table-header">
              ${Array(5)
                .fill(0)
                .map(
                  (_, i) =>
                    `<div style="flex: ${
                      i === 4 ? 0.7 : 1
                    };"><div class="skeleton-box"></div></div>`
                )
                .join("")}
            </div>
            ${Array(5)
              .fill(0)
              .map(
                () => `
              <div class="skeleton-table-row">
                ${Array(5)
                  .fill(0)
                  .map(
                    (_, i) =>
                      `<div style="flex: ${
                        i === 4 ? 0.7 : 1
                      };"><div class="skeleton-box"></div></div>`
                  )
                  .join("")}
              </div>
            `
              )
              .join("")}
          </div>
        </div>
      `;

  const simpleSkeleton = () => `
        <div class="content-section">
          <div class="skeleton-box" style="width: 40%; height: 25px; margin-bottom: 25px;"></div>
          <div class="skeleton-text-line medium skeleton-box"></div>
          <div class="skeleton-text-line short skeleton-box"></div>
          <div class="skeleton-box mt-4" style="height: 45px; width: 100%;"></div>
        </div>
      `;

  switch (pageId) {
    case "notice":
      return listSkeleton();
    case "report":
      return tableSkeleton();
    case "account":
    case "home":
    default:
      // For locked pages, display the generic lock structure
      const storedUsername = localStorage.getItem(USER_STORAGE_KEY);
      if (AUTH_REQUIRED_PAGES.includes(pageId) && !storedUsername) {
        return `
            <div id="lock-screen" class="content-section">
              <i class="fa-solid fa-lock lock-icon"></i>
              <h2 style="margin-bottom: 5px;">Access Restricted</h2>
              <p class="mb-4">Loading access message...</p>
              <div class="skeleton-box" style="height: 45px; width: 80%; max-width: 300px; margin-top: 10px;"></div>
            </div>
          `;
      }
      return simpleSkeleton();
  }
}

/**
 * Generates content for the Notice page.
 * @param {Array<Object> | null} data - The notice data array.
 * @returns {string} The HTML content for the notice page.
 */
function getNoticeContent(data) {
  // 👈 MODIFIED: Now takes data as an argument
  const notices = data || []; // Use provided data or an empty array

  if (notices.length === 0) {
    return `<div class="content-section"><h2>Latest Notices</h2><p>No notices available or failed to load notices.</p></div>`;
  }

  const noticeItems = notices
    .map(
      (notice) => `
        <div class="notice-item">
          <div class="notice-header">
            <span class="notice-date"><i class="fa-solid fa-calendar-alt"></i> ${notice.date}</span>
            <span class="notice-title">${notice.title}</span>
          </div>
          <div class="notice-text">${notice.text}</div>
        </div>
      `
    )
    .join("");

  return `<div class="content-section"><h2>Latest Notices</h2><div class="notice-container">${noticeItems}</div></div>`;
}

// Global constant for the Apps Script Web App URL
const noticeSheetWebURL =
  "https://script.google.com/macros/s/AKfycbzkM3kcvTe1OLnQnPmkIbIV4WZBcjaPN0aQz0fito3rOJICNilW3aZ5BMifvIDleg3EXg/exec";

/**
 * Fetches notice data from the Google Apps Script Web App.
 * @returns {Promise<Array<Object>>} A promise that resolves with the notice data array.
 */
async function fetchSheetDataForNOTICE() {
  // 👈 MODIFIED: Function now returns a Promise
  if (noticeDataCache) {
    return noticeDataCache; // Return cached data if available
  }

  const sheetUrl = noticeSheetWebURL;
  try {
    const response = await fetch(sheetUrl);

    if (!response.ok) {
      throw new Error(`Failed to fetch data. HTTP Status: ${response.status}.`);
    }

    const result = await response.json();

    if (result.error) {
      throw new Error(`Apps Script Error: ${result.error}`);
    }

    if (!Array.isArray(result)) {
      throw new Error(
        "Data format error: The Apps Script response was not a valid JSON array."
      );
    }

    noticeDataCache = result; // Cache the fetched data
    return result;
  } catch (error) {
    // console.error("Fetch or Parse Error:", error);
    // In a real app, you might show an error message on the page here
    return []; // Return an empty array on error
  }
}

// 👈 REMOVED: The initial, incorrect call to fetchSheetDataForNOTICE();
/////////////////////////////////////////////////////////////

/**
 * Generates content for the Report page (Meal/Payment Table).
 * @param {Array<Object> | null} data - The report data array.
 */
function getReportContent(data) {
  const reportData = data || []; // Use provided data or an empty array

  if (reportData.length === 0) {
    return `<div class="content-section"><h2>Monthly Report Summary</h2><p>No report data available or failed to load reports.</p></div>`;
  }

  const tableRows = reportData
    .map(
      (row) => `
        <tr>
          <td>${row.name}</td>
          <td>${row.totalMeal}</td>
          <td>${row.totalDays}</td>
          <td>${row.pay /*.toLocaleString("en-IN")*/} </td>
          <td class="status-${row.status.toLowerCase()}">${row.status}</td>
        </tr>
      `
    )
    .join("");

  return `
        <div class="content-section">
          <h2>Monthly Report Summary</h2>
          <table class="report-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Total Meal</th>
                <th>Total Days</th>
                <th>Pay</th>
                <th>Due</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>
        </div>
      `;
}

// Global constant for the Apps Script Web App URL
const reportSheetWebURL =
  "https://script.google.com/macros/s/AKfycbwNG7JSVYg9RXpiOBQoJEfqfSH39qe1EIEgNf68X_X0tSsPoi7S4nCTrZGfNGSKQbvi3Q/exec";

async function fetchSheetDataForREPORT() {
  // 👈 MODIFIED: Function now returns a Promise
  if (reportDataCache) {
    return reportDataCache; // Return cached data if available
  }

  const sheetUrl = reportSheetWebURL;
  try {
    const response = await fetch(sheetUrl);

    if (!response.ok) {
      throw new Error(`Failed to fetch data. HTTP Status: ${response.status}.`);
    }

    const result = await response.json();

    if (result.error) {
      throw new Error(`Apps Script Error: ${result.error}`);
    }

    if (!Array.isArray(result)) {
      throw new Error(
        "Data format error: The Apps Script response was not a valid JSON array."
      );
    }

    reportDataCache = result; // Cache the fetched data
    return result;
  } catch (error) {
    // console.error("Fetch or Parse Error:", error);
    // In a real app, you might show an error message on the page here
    return []; // Return an empty array on error
  }
}
/**
 * Generates content for the Account page.
 */
function getAccountContent() {
  const storedUsername = localStorage.getItem(USER_STORAGE_KEY);
  const storedID = localStorage.getItem(USER_ID_STORAGE_KEY); // Get the stored ID
  let html = "";

  if (!storedUsername) {
    // User is NOT logged in - Show account creation form
    html = `
          <div class="content-section account-form-container">
            <h2>Sing in</h2>
            <div id="form-message" class="form-message"></div>
            
            <p class="mb-4 text-center text-lg">[Make sure to have a proper internet connection.]</p>
            
            <label for="reg-name">Name:</label>
            <input type="text" id="reg-name" placeholder="Minimum 4 characters">
            
            <label for="reg-id">Your ID:</label>
            <input type="number" id="reg-id" required placeholder="Enter the ID given by Admin" maxlength="5">
            
            <button onclick="handleLogin()">Sign in</button>
            
            <a class="form-link" onclick="handleForgetID()">Forgot ID? Try to recover it.</a>

            <div id="forget-id-area" style="display:none; margin-top: 20px; padding: 15px; border: 1px dashed var(--color-primary); border-radius: 8px;">
              <p class="text-lg mb-2">ID Recovery</p>
              <label for="admin-name">Admin Key:</label>
              <input type="text" id="admin-name" placeholder="Enter Admin Key">
              <label for="target-name">Your Registered Name:</label>
              <input type="text" id="target-name" placeholder="Enter your name">
              <button onclick="showRetrievedID()">Calculate Recovery ID</button>
              <div id="retrieved-id-message" class="form-message"></div>
            </div>
          </div>
        `;
  } else {
    // User IS logged in - Show account details
    html = `
          <div class="content-section account-form-container">
            <h2>Your Account Details</h2>
            <p class="text-lg">Welcome back, <strong>${storedUsername}</strong>!</p>
            <p class="mt-4"><strong>Your Name:</strong> ${storedUsername}</p>
            <p><strong>Your ID:</strong> ${storedID || "N/A"}</p>
            <p class="mt-4 text-center">Your account is active and secured.</p>
            <button class="mt-4" style="background-color: #e74c3c;" onclick="handleLogout()">Log Out</button>
          </div>
        `;
  }

  return `<div id="account-page-content">${html}</div>`;
}

/**
 * Handles the dynamic content for the active page.
 * @param {string} pageId - The ID of the page to render.
 */
async function renderPageContent(pageId) {
  // 👈 MODIFIED: Made async and accepts pageId
  const storedUsername = localStorage.getItem(USER_STORAGE_KEY);
  const activePage = PAGES.find((p) => p.id === pageId); // Use passed pageId

  // 1. Check for Authentication Lock
  if (AUTH_REQUIRED_PAGES.includes(pageId) && !storedUsername) {
    const lockScreenHtml = `
            <div id="lock-screen" class="content-section">
              <i class="fa-solid fa-lock lock-icon"></i>
              <h2 style="margin-bottom: 5px;">Access Restricted</h2>
              <p class="mb-4">Please log in to view the ${activePage.name} section.</p>
              <button class="lock-button" onclick="navigateTo('account')">
                Create an Account to Access ${activePage.name}
              </button>
            </div>
          `;
    contentEl.innerHTML = lockScreenHtml;
    return;
  }

  // 2. Render Page Specific Content
  let contentHtml = "";
  switch (
    pageId // Use passed pageId
  ) {
    case "home":
      contentHtml = `<div class="content-section"><h2>Welcome Home!</h2><p>This is the main dashboard content. Your current status is up-to-date.</p><p class="mt-4">Feel free to navigate using the menu below.</p></div>`;
      break;
    case "notice":
      // FIX: Await data fetch and pass it to getNoticeContent
      const noticeData = await fetchSheetDataForNOTICE();
      contentHtml = getNoticeContent(noticeData);
      break;
    case "report":
      // 🐛 FIX HERE: Await data fetch and pass it to getReportContent
      const reportData = await fetchSheetDataForREPORT();
      contentHtml = getReportContent(reportData); // Pass the fetched data
      break;
    case "account":
      contentHtml = getAccountContent();
      break;
    default:
      contentHtml = `<div class="content-section"><h2>404 Not Found</h2><p>The requested page does not exist.</p></div>`;
  }

  contentEl.innerHTML = contentHtml;
}

/**
 * Handles page navigation with a skeleton loader effect.
 * @param {string} pageId - The ID of the page to navigate to.
 */
function navigateTo(pageId) {
  // Only proceed if navigating to a different page ID
  if (activePageId === pageId) return;

  activePageId = pageId;

  // 1. Show Skeleton and hide content
  contentEl.style.opacity = "0";
  loaderEl.style.display = "block";
  loaderEl.innerHTML = getSkeletonHtml(pageId); // Render the skeleton based on the page

  // 2. Update Header and Navbar immediately
  renderHeader();
  renderNavBar();

  // 3. Simulate loading time (500ms for user feedback) before rendering new content
  // Note: We'll wait 500ms *plus* the time it takes for renderPageContent (which includes fetching notice data)
  setTimeout(async () => {
    // 👈 MODIFIED: Made the callback async
    await renderPageContent(activePageId); // 👈 FIX: Call with activePageId and await it

    // 4. Hide Skeleton and show new content with a fade effect
    loaderEl.style.display = "none";
    contentEl.style.opacity = "1";
    window.scrollTo(0, 0); // Scroll to top
  }, 500);
}

// --- Account Logic Handlers ---

/**
 * Handles the login/account creation process.
 * Now validates the user-entered ID against the ID calculated from the name.
 */
function handleLogin() {
  const nameInput = document.getElementById("reg-name");
  const idInput = document.getElementById("reg-id");
  const messageEl = document.getElementById("form-message");

  const rawUsername = nameInput.value.trim();
  const properUsername = properCase(rawUsername);
  const rawID = idInput.value.trim();

  messageEl.className = "form-message";
  messageEl.textContent = "";

  // 1. Validation: Check if the name contains at least 4 letters (sum of 4)
  if (getAlphabeticalPositionSum(rawUsername) < 4) {
    messageEl.classList.add("error");
    messageEl.textContent = "Invalid Username or ID.";
    return;
  }

  // 2. Validation: ID format (must be exactly 5 digits)
  if (!/^\d{5}$/.test(rawID)) {
    messageEl.classList.add("error");
    messageEl.textContent =
      "ID must be exactly 5 digits and contain only numbers.";
    return;
  }

  // 3. Core Logic: Calculate the expected ID based on the entered name
  const expectedID = calculateID(rawUsername);

  // 4. Check if the entered ID matches the calculated ID
  if (rawID !== expectedID) {
    messageEl.classList.add("error");
    messageEl.textContent = `Login failed. The entered ID does not match the ID calculated for this name. (Calculated ID for your name: ${expectedID})`;
    return;
  }

  // 5. Successful Login/Registration
  localStorage.setItem(USER_STORAGE_KEY, properUsername);
  localStorage.setItem(USER_ID_STORAGE_KEY, rawID); // Store the validated ID

  messageEl.classList.add("success");
  messageEl.textContent = `Login successful! Welcome, ${properUsername}. Your ID ${rawID} has been verified. Redirecting...`;

  // Reload state after a short delay
  setTimeout(() => {
    navigateTo("home");
    renderHeader();
    renderNavBar();
  }, 1000);
}

/**
 * Toggles the Forget ID area visibility.
 */
function handleForgetID() {
  const forgetArea = document.getElementById("forget-id-area");
  forgetArea.style.display =
    forgetArea.style.display === "none" ? "block" : "none";
}

/**
 * Shows the retrieved ID based on admin check.
 */
function showRetrievedID() {
  const adminNameInput = document.getElementById("admin-name").value.trim();
  const targetNameInput = document.getElementById("target-name").value.trim();
  const messageEl = document.getElementById("retrieved-id-message");

  messageEl.className = "form-message";
  messageEl.textContent = "";

  if (adminNameInput !== "@@id") {
    messageEl.classList.add("error");
    messageEl.textContent = "Incorrect Admin key provided.";
    return;
  }

  if (getAlphabeticalPositionSum(targetNameInput) < 4) {
    messageEl.classList.add("error");
    messageEl.textContent =
      "Please enter a valid name (must contain enough letters).";
    return;
  }

  // Retrieve and calculate ID based on the provided name (using the same formula for recovery)
  const recoveryID = calculateID(targetNameInput);

  messageEl.classList.add("success");
  messageEl.textContent = `The ID calculated for '${properCase(
    targetNameInput
  )}' is: ${recoveryID}.`;
}

/**
 * Handles user logout.
 * Now forces a full page reload for a clean session reset.
 */
function handleLogout() {
  localStorage.removeItem(USER_STORAGE_KEY);
  localStorage.removeItem(USER_ID_STORAGE_KEY);
  // Reload the page to reset the entire application state
  window.location.reload();
}

// --- Initialization ---

/**
 * Initializes the application.
 */
function initApp() {
  renderHeader();
  renderNavBar();

  // 1. Show Skeleton and hide content for the initial page load
  // contentEl.style.opacity is set to '0' in HTML style attribute
  loaderEl.style.display = "block";
  loaderEl.innerHTML = getSkeletonHtml(activePageId); // Render skeleton for 'home'

  // 2. Simulate loading time (500ms for user feedback) before rendering initial content
  setTimeout(async () => {
    // 👈 MODIFIED: Made the callback async
    await renderPageContent(activePageId); // 👈 FIX: Call with activePageId and await it

    // 3. Hide Skeleton and show new content with a fade effect
    loaderEl.style.display = "none";
    contentEl.style.opacity = "1";
    window.scrollTo(0, 0); // Scroll to top
  }, 500);
}

// Run the initialization when the window loads
window.onload = initApp;
