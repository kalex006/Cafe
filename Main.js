// ================= 1. CONFIGURATION (SHEETDB) =================
const SHEETDB_URL = "https://sheetdb.io/api/v1/46gtu09ijoayt";

// ================= 2. CLIENT & STATE MANAGEMENT =================
const urlParams = new URLSearchParams(window.location.search);
const currentClientId = (urlParams.get('id') || 'default').toLowerCase();

// Tracks which entry is being edited (null = brand new entry)
let editingIndex = null;

const STORAGE_KEY = `cafe_entries_${currentClientId}`;
let entries = [];
try {
  entries = JSON.parse(localStorage.getItem(STORAGE_KEY) || localStorage.getItem('cafe_entries') || '[]');
} catch (e) {
  entries = [];
}

// SAMPLE ENTRY (Shows the Edit & Delete buttons immediately on first load)
if (entries.length === 0) {
  entries = [
    {
      id: Date.now(),
      date: new Date().toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }),
      cash: 500,
      upi: 1000,
      sales: 1500,
      expense: 500,
      category: "Sabzi & Veggies",
      profit: 1000,
      timestamp: new Date().toISOString()
    }
  ];
}

// ================= 3. LOCK & UNLOCK SCREEN CONTROLS =================
function triggerKillSwitch(message = 'Subscription Expired') {
  const killScreen = document.getElementById('killSwitchScreen');
  if (killScreen) {
    killScreen.classList.remove('hidden');
    killScreen.style.display = 'flex';
    const desc = killScreen.querySelector('p');
    if (desc) desc.innerText = message;
  }
}

function unlockApp() {
  const killScreen = document.getElementById('killSwitchScreen');
  if (killScreen) {
    killScreen.classList.add('hidden');
    killScreen.style.display = 'none';
  }
}

// Fallback check via URL: ?status=expired
if (urlParams.get('status') === 'expired') {
  triggerKillSwitch('Manual Lockout Activated');
}

// ================= 4. SUBSCRIPTION & CUSTOM INGREDIENTS ENGINE =================
async function checkSubscriptionAndTrial() {
  try {
    const res = await fetch(`${SHEETDB_URL}?sheet=Settings&_t=${Date.now()}`, { cache: "no-store" });
    const data = await res.json();

    if (!Array.isArray(data) || data.length === 0) return;

    // Match cafe by Client ID (from ?id=...) or pick first row
    let client = data.find(row => {
      const id = row['Client ID'] || row['client_id'] || '';
      return id.toString().trim().toLowerCase() === currentClientId;
    });

    if (!client) {
      client = data[0];
    }

    const cafeName = client['Cafe Name'] || 'My Cafe';
    const status = (client['Subscription Status'] || 'ACTIVE').toString().trim().toUpperCase();
    const startDateStr = client['Start Date'] || new Date().toISOString().split('T')[0];
    const planType = (client['Plan Type'] || 'TRIAL').toString().trim().toUpperCase();

    // 1. Update Cafe Name in Header
    const nameElem = document.getElementById('cafeNameDisplay');
    if (nameElem) nameElem.innerText = cafeName;

    // 2. DYNAMICALLY LOAD CAFE'S SPECIFIC INGREDIENTS (Column F)
    const customCatsStr = client['Custom Categories'] || client['Ingredients'] || '';
    if (customCatsStr) {
      const catSelect = document.getElementById('selectCategory');
      if (catSelect) {
        const catList = customCatsStr.split(',').map(c => c.trim()).filter(c => c.length > 0);
        if (catList.length > 0) {
          catSelect.innerHTML = ''; // Clear generic categories
          catList.forEach(cat => {
            const opt = document.createElement('option');
            opt.value = cat;
            opt.innerText = cat;
            catSelect.appendChild(opt);
          });
        }
      }
    }

    // 3. Hard Kill-Switch check from Sheet
    if (status === 'EXPIRED') {
      triggerKillSwitch('Subscription Expired. Please renew to continue.');
      return;
    }

    // 4. Calculate Days Passed
    const startDate = new Date(startDateStr);
    const today = new Date();
    startDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);

    const diffTime = today - startDate;
    const daysPassed = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1; // Start date = Day 1

    const badge = document.getElementById('planBadge');

    // 5. Check Duration by Plan Type (TRIAL = 7 Days, PAID = 28 Days)
    if (planType === 'TRIAL') {
      if (daysPassed <= 7) {
        unlockApp();
        if (badge) {
          badge.className = "text-[11px] font-bold px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-sm";
          badge.innerText = `Trial: Day ${daysPassed > 0 ? daysPassed : 1} of 7`;
        }
      } else {
        // Day 8+: AUTO-LOCK
        triggerKillSwitch('7-Day Free Trial Expired. Please pay ₹349 for a monthly subscription.');
      }
    } else {
      if (daysPassed <= 28) {
        unlockApp();
        if (badge) {
          badge.className = "text-[11px] font-bold px-3 py-1.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 shadow-sm";
          badge.innerText = `Plan: Day ${daysPassed > 0 ? daysPassed : 1} of 28`;
        }
      } else {
        // Day 29+: AUTO-LOCK
        triggerKillSwitch('Monthly Subscription Expired (28 Days). Please renew to continue.');
      }
    }
  } catch (err) {
    console.log('Settings read note:', err);
  }
}

// ================= 5. TAB SWITCHER =================
window.switchTab = function(tab) {
  const tabHome = document.getElementById('tabHome');
  const tabEntries = document.getElementById('tabEntries');
  const btnHome = document.getElementById('btnHome');
  const btnEntries = document.getElementById('btnEntries');

  if (!tabHome || !tabEntries) return;

  if (tab === 'home') {
    tabHome.classList.remove('hidden');
    tabEntries.classList.add('hidden');
    if (btnHome) btnHome.className = "flex items-center space-x-2 px-5 py-2.5 rounded-full bg-gray-100 text-black font-semibold text-xs transition-all pointer-events-auto";
    if (btnEntries) btnEntries.className = "flex items-center space-x-2 px-5 py-2.5 rounded-full text-gray-500 font-medium text-xs hover:text-black transition-all pointer-events-auto";
  } else {
    tabHome.classList.add('hidden');
    tabEntries.classList.remove('hidden');
    if (btnEntries) btnEntries.className = "flex items-center space-x-2 px-5 py-2.5 rounded-full bg-gray-100 text-black font-semibold text-xs transition-all pointer-events-auto";
    if (btnHome) btnHome.className = "flex items-center space-x-2 px-5 py-2.5 rounded-full text-gray-500 font-medium text-xs hover:text-black transition-all pointer-events-auto";
  }
};

// ================= 6. SAVE & UPDATE ENTRY HANDLER =================
window.saveEntry = function() {
  const cashInput = document.getElementById('inputCash');
  const upiInput = document.getElementById('inputUPI');
  const expenseInput = document.getElementById('inputExpense');
  const catInput = document.getElementById('selectCategory');
  const saveBtn = document.querySelector('#tabEntries button[onclick="saveEntry()"]');

  const cash = parseFloat(cashInput?.value) || 0;
  const upi = parseFloat(upiInput?.value) || 0;
  const expense = parseFloat(expenseInput?.value) || 0;
  const category = catInput ? catInput.value : 'Miscellaneous';

  if (cash === 0 && upi === 0 && expense === 0) {
    alert("Please enter at least sales or expenses.");
    return;
  }

  const totalSales = cash + upi;
  const netProfit = totalSales - expense;
  const todayDate = new Date().toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });

  // CASE 1: UPDATING AN EXISTING ENTRY (IN-PLACE WITHOUT DELETING)
  if (editingIndex !== null && entries[editingIndex]) {
    entries[editingIndex].cash = cash;
    entries[editingIndex].upi = upi;
    entries[editingIndex].sales = totalSales;
    entries[editingIndex].expense = expense;
    entries[editingIndex].category = category;
    entries[editingIndex].profit = netProfit;
    
    editingIndex = null; // Reset edit mode
    if (saveBtn) saveBtn.innerText = "Save today's entry";
  } 
  // CASE 2: CREATING A BRAND NEW ENTRY
  else {
    const newEntry = {
      id: Date.now(),
      date: todayDate,
      cash: cash,
      upi: upi,
      sales: totalSales,
      expense: expense,
      category: category,
      profit: netProfit,
      timestamp: new Date().toISOString()
    };

    entries.unshift(newEntry);

    // Write to Sheet 1 via SheetDB
    fetch(SHEETDB_URL, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        data: [
          {
            'Date': newEntry.date,
            'Cash Sales': newEntry.cash,
            'UPI Sales': newEntry.upi,
            'Expense Amount': newEntry.expense,
            'Expense Category': newEntry.category,
            'Net Profit': newEntry.profit
          }
        ]
      })
    }).catch(err => console.log('SheetDB write note:', err));
  }

  // Save changes to phone storage
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch (e) {}

  // Clear inputs & return to Home
  if (cashInput) cashInput.value = '';
  if (upiInput) upiInput.value = '';
  if (expenseInput) expenseInput.value = '';

  renderDashboard();
  window.switchTab('home');
};

// ================= 7. EDIT & DELETE HANDLERS =================
// Delete an entry
window.deleteEntry = function(index) {
  if (confirm("Are you sure you want to delete this entry?")) {
    entries.splice(index, 1);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    } catch (e) {}
    renderDashboard();
  }
};

// Edit an entry (Loads data into form WITHOUT deleting it)
window.editEntry = function(index) {
  const item = entries[index];
  if (!item) return;

  editingIndex = index; // Remember this row

  const cashInput = document.getElementById('inputCash');
  const upiInput = document.getElementById('inputUPI');
  const expenseInput = document.getElementById('inputExpense');
  const catInput = document.getElementById('selectCategory');
  const saveBtn = document.querySelector('#tabEntries button[onclick="saveEntry()"]');

  if (cashInput) cashInput.value = item.cash;
  if (upiInput) upiInput.value = item.upi;
  if (expenseInput) expenseInput.value = item.expense;
  if (catInput) catInput.value = item.category;

  // Change button text to indicate editing mode
  if (saveBtn) saveBtn.innerText = "Update this entry";

  window.switchTab('entries');
};

// ================= 8. DASHBOARD RENDERER =================
function renderDashboard() {
  const heroProfit = document.getElementById('heroNetProfit');
  const kpiSales = document.getElementById('kpiSales');
  const kpiExpenses = document.getElementById('kpiExpenses');

  if (entries.length === 0) {
    if (heroProfit) heroProfit.innerText = '₹0';
    if (kpiSales) kpiSales.innerText = '₹0';
    if (kpiExpenses) kpiExpenses.innerText = '₹0';
    
    const catContainer = document.getElementById('categoryContainer');
    if (catContainer) catContainer.innerHTML = '<p class="py-6 text-center text-sm text-gray-400 font-medium">No data yet</p>';
    
    const recentContainer = document.getElementById('recentEntriesContainer');
    if (recentContainer) recentContainer.innerHTML = `
      <div class="py-8 text-center flex flex-col items-center justify-center">
        <div class="w-12 h-12 bg-gray-100 text-gray-400 rounded-xl flex items-center justify-center mb-3">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2zM10 8.5a.5.5 0 11-1 0 .5.5 0 011 0zm5 5a.5.5 0 11-1 0 .5.5 0 011 0z"></path></svg>
        </div>
        <p class="font-bold text-gray-800 text-sm">No entries yet</p>
        <p class="text-xs text-gray-400 mt-1 max-w-[220px]">Daily sales and expenses you record appear here.</p>
      </div>`;
      
    const allEntriesContainer = document.getElementById('allEntriesContainer');
    if (allEntriesContainer) allEntriesContainer.innerHTML = '<p class="py-8 text-center text-sm text-gray-400 font-medium">Nothing here yet.</p>';
    return;
  }

  const latest = entries[0];
  if (heroProfit) heroProfit.innerText = `₹${latest.profit.toLocaleString('en-IN')}`;
  if (kpiSales) kpiSales.innerText = `₹${latest.sales.toLocaleString('en-IN')}`;
  if (kpiExpenses) kpiExpenses.innerText = `₹${latest.expense.toLocaleString('en-IN')}`;

  // Update Category Breakdown
  const categoryCounts = {};
  entries.forEach(e => {
    categoryCounts[e.category] = (categoryCounts[e.category] || 0) + e.expense;
  });

  let catHtml = '<div class="space-y-2">';
  for (const [cat, amt] of Object.entries(categoryCounts)) {
    catHtml += `
      <div class="flex justify-between items-center text-xs py-1.5 border-b border-gray-50">
        <span class="font-medium text-gray-700">${cat}</span>
        <span class="font-bold text-gray-900">₹${amt.toLocaleString('en-IN')}</span>
      </div>`;
  }
  catHtml += '</div>';
  const catContainer = document.getElementById('categoryContainer');
  if (catContainer) catContainer.innerHTML = catHtml;

  // 1. RECENT ENTRIES (HOME TAB) WITH ✏️ AND 🗑️
  let recentHtml = '<div class="divide-y divide-gray-100 text-left w-full">';
  entries.slice(0, 5).forEach((e, idx) => {
    recentHtml += `
      <div class="py-3 flex justify-between items-center text-xs">
        <div>
          <p class="font-bold text-gray-900">${e.date} • ${e.category}</p>
          <p class="text-gray-400 mt-0.5">Sales: ₹${e.sales.toLocaleString('en-IN')} | Exp: ₹${e.expense.toLocaleString('en-IN')}</p>
        </div>
        <div class="flex items-center space-x-2">
          <span class="font-bold text-sm ${e.profit >= 0 ? 'text-green-600' : 'text-red-500'}">
            ₹${e.profit.toLocaleString('en-IN')}
          </span>
          <button onclick="editEntry(${idx})" class="p-1.5 bg-gray-50 rounded-lg active:scale-95 text-sm" title="Edit">✏️</button>
          <button onclick="deleteEntry(${idx})" class="p-1.5 bg-gray-50 rounded-lg active:scale-95 text-sm" title="Delete">🗑️</button>
        </div>
      </div>`;
  });
  recentHtml += '</div>';
  const recentContainer = document.getElementById('recentEntriesContainer');
  if (recentContainer) recentContainer.innerHTML = recentHtml;

  // 2. ALL ENTRIES TABLE (ENTRIES TAB) WITH ✏️ AND 🗑️
  let tableHtml = `
    <table class="w-full text-left text-xs">
      <thead>
        <tr class="border-b text-gray-400 uppercase text-[10px]">
          <th class="py-2">Date</th>
          <th class="py-2">Sales</th>
          <th class="py-2">Exp</th>
          <th class="py-2">Profit</th>
          <th class="py-2 text-right">Action</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-gray-100">`;
  entries.forEach((e, index) => {
    tableHtml += `
      <tr class="py-2">
        <td class="py-2 font-medium">${e.date}</td>
        <td class="py-2">₹${e.sales}</td>
        <td class="py-2 text-red-500">₹${e.expense}</td>
        <td class="py-2 font-bold ${e.profit >= 0 ? 'text-green-600' : 'text-red-500'}">₹${e.profit}</td>
        <td class="py-2 text-right space-x-1 whitespace-nowrap">
          <button onclick="editEntry(${index})" class="p-1 text-xs">✏️</button>
          <button onclick="deleteEntry(${index})" class="p-1 text-xs">🗑️</button>
        </td>
      </tr>`;
  });
  tableHtml += `</tbody></table>`;
  const allEntriesContainer = document.getElementById('allEntriesContainer');
  if (allEntriesContainer) allEntriesContainer.innerHTML = tableHtml;
}

// ================= 9. INITIAL BOOT =================
document.addEventListener('DOMContentLoaded', () => {
  renderDashboard();
  checkSubscriptionAndTrial();
});
renderDashboard();
checkSubscriptionAndTrial();
        
