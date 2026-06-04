/**
 * Municipal ID & Certificate Readiness Tracker - Core Logic
 * Handles state, local database operations, DOM updates, CSV parsing, and UI transitions.
 */

// Initial Seed Data for demonstration
const DEFAULT_APPLICATIONS = [
  {
    code: 'APP-10204',
    applicant: 'Jane Doe',
    documentType: 'Municipal Identity Card',
    status: 'Processing',
    dateFiled: '2026-06-02',
    timeLogged: '09:12 AM',
    timeProcessing: '11:30 AM',
    timeReady: '-'
  },
  {
    code: 'APP-10205',
    applicant: 'John Smith',
    documentType: 'Birth Certificate',
    status: 'Ready for Pickup',
    dateFiled: '2026-06-01',
    timeLogged: '10:45 AM',
    timeProcessing: '02:15 PM',
    timeReady: 'June 3, 2026 - 09:30 AM'
  },
  {
    code: 'APP-10206',
    applicant: 'Alice Johnson',
    documentType: 'Marriage License',
    status: 'Processing',
    dateFiled: '2026-06-03',
    timeLogged: '02:10 PM',
    timeProcessing: '-',
    timeReady: '-'
  },
  {
    code: 'APP-10207',
    applicant: 'Robert Downey',
    documentType: 'Business Permit',
    status: 'Ready for Pickup',
    dateFiled: '2026-05-28',
    timeLogged: '08:30 AM',
    timeProcessing: '10:15 AM',
    timeReady: 'May 29, 2026 - 04:00 PM'
  }
];

// App State Management
class AppState {
  constructor() {
    this.dbKey = 'municipal_tracker_apps';
    this.themeKey = 'municipal_tracker_theme';
    
    // Load or initialize applications database
    const stored = localStorage.getItem(this.dbKey);
    if (stored) {
      try {
        this.apps = JSON.parse(stored);
      } catch (e) {
        console.error('Failed to parse database, reloading default seed data.', e);
        this.apps = [...DEFAULT_APPLICATIONS];
        this.save();
      }
    } else {
      this.apps = [...DEFAULT_APPLICATIONS];
      this.save();
    }

    this.currentMode = 'citizen'; // 'citizen' or 'admin'
    this.theme = localStorage.getItem(this.themeKey) || 'light';
  }

  save() {
    localStorage.setItem(this.dbKey, JSON.stringify(this.apps));
  }

  getApplications() {
    return this.apps;
  }

  findApplication(code) {
    return this.apps.find(a => a.code.toUpperCase() === code.trim().toUpperCase());
  }

  addApplication(app) {
    if (this.findApplication(app.code)) {
      return false;
    }
    this.apps.unshift(app); // Prepend so it appears first in lists
    this.save();
    return true;
  }

  updateStatus(code, newStatus) {
    const app = this.findApplication(code);
    if (!app) return false;
    
    app.status = newStatus;
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    
    if (newStatus === 'Ready for Pickup') {
      app.timeReady = `${dateStr} - ${timeStr}`;
      if (app.timeProcessing === '-') {
        app.timeProcessing = timeStr;
      }
    } else if (newStatus === 'Processing') {
      app.timeReady = '-';
    }
    
    this.save();
    return true;
  }

  deleteApplication(code) {
    const initialLen = this.apps.length;
    this.apps = this.apps.filter(a => a.code.toUpperCase() !== code.toUpperCase());
    this.save();
    return this.apps.length < initialLen;
  }

  importFromCSV(parsedApps) {
    let importedCount = 0;
    parsedApps.forEach(newApp => {
      const existingIdx = this.apps.findIndex(a => a.code.toUpperCase() === newApp.code.toUpperCase());
      if (existingIdx !== -1) {
        // Overwrite existing record
        this.apps[existingIdx] = { ...this.apps[existingIdx], ...newApp };
      } else {
        // Add new record
        this.apps.unshift(newApp);
      }
      importedCount++;
    });
    this.save();
    return importedCount;
  }
}

// Instantiate Global State
const State = new AppState();

// DOM Elements Cache
const DOM = {
  themeToggleBtn: document.getElementById('theme-toggle'),
  sunIcon: document.getElementById('sun-icon'),
  moonIcon: document.getElementById('moon-icon'),
  portalSwitchBtn: document.getElementById('portal-switch-btn'),
  portalBtnLabel: document.getElementById('portal-btn-label'),
  logoLink: document.getElementById('logo-link'),
  
  citizenSection: document.getElementById('citizen-section'),
  adminSection: document.getElementById('admin-section'),
  
  // Citizen search
  searchForm: document.getElementById('search-form'),
  searchInput: document.getElementById('search-input'),
  btnSearch: document.getElementById('btn-search'),
  resultContainer: document.getElementById('result-container'),
  foundCard: document.getElementById('found-card'),
  notFoundCard: document.getElementById('not-found-card'),
  
  // Found card fields
  resDocType: document.getElementById('res-doc-type'),
  resApplicant: document.getElementById('res-applicant'),
  resCode: document.getElementById('res-code'),
  resDate: document.getElementById('res-date'),
  resBadge: document.getElementById('res-badge'),
  resStatusLabel: document.getElementById('res-status-label'),
  
  // Stepper timeline
  trackerLine: document.getElementById('tracker-line'),
  stepLogged: document.getElementById('step-logged'),
  stepProcessing: document.getElementById('step-processing'),
  stepReady: document.getElementById('step-ready'),
  timeLogged: document.getElementById('time-logged'),
  timeProcessing: document.getElementById('time-processing'),
  timeReady: document.getElementById('time-ready'),
  pickupDetails: document.getElementById('pickup-details'),
  btnPrintReceipt: document.getElementById('btn-print-receipt'),
  
  // Passcode authentication
  passcodeModal: document.getElementById('passcode-modal'),
  btnCloseModal: document.getElementById('btn-close-modal'),
  passcodeForm: document.getElementById('passcode-form'),
  passcodeInput: document.getElementById('admin-passcode-input'),
  passcodeError: document.getElementById('passcode-error'),
  
  // Admin fields
  statTotal: document.getElementById('stat-total'),
  statProcessing: document.getElementById('stat-processing'),
  statReady: document.getElementById('stat-ready'),
  btnExportCsv: document.getElementById('btn-export-csv'),
  btnImportCsv: document.getElementById('btn-import-csv'),
  csvFileInput: document.getElementById('csv-file-input'),
  
  // Admin form
  newAppForm: document.getElementById('new-app-form'),
  inputAppCode: document.getElementById('input-app-code'),
  btnGenerateCode: document.getElementById('btn-generate-code'),
  inputApplicant: document.getElementById('input-applicant'),
  selectDocType: document.getElementById('select-doc-type'),
  selectInitialStatus: document.getElementById('select-initial-status'),
  
  // Admin table
  tableSearchInput: document.getElementById('table-search-input'),
  tableFilterStatus: document.getElementById('table-filter-status'),
  adminTableBody: document.getElementById('admin-table-body'),
  
  toastContainer: document.getElementById('toast-container')
};

// UI Core Controls
const UI = {
  init() {
    this.applyTheme(State.theme);
    this.bindEvents();
    
    // Check if URL has a code to automatically search (e.g. tracking links)
    const urlParams = new URLSearchParams(window.location.search);
    const trackingCode = urlParams.get('code');
    if (trackingCode) {
      DOM.searchInput.value = trackingCode;
      this.handleCitizenSearch(trackingCode);
    }
  },

  applyTheme(themeName) {
    document.documentElement.setAttribute('data-theme', themeName);
    State.theme = themeName;
    localStorage.setItem(State.themeKey, themeName);

    if (themeName === 'dark') {
      DOM.sunIcon.style.display = 'block';
      DOM.moonIcon.style.display = 'none';
    } else {
      DOM.sunIcon.style.display = 'none';
      DOM.moonIcon.style.display = 'block';
    }
  },

  toggleTheme() {
    const nextTheme = State.theme === 'light' ? 'dark' : 'light';
    this.applyTheme(nextTheme);
  },

  showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let iconSvg = '';
    if (type === 'success') {
      iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" style="width: 20px; height: 20px;"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>`;
    } else if (type === 'warning') {
      iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" style="width: 20px; height: 20px;"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" /></svg>`;
    } else {
      iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" style="width: 20px; height: 20px;"><path stroke-linecap="round" stroke-linejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>`;
    }

    toast.innerHTML = `${iconSvg}<span>${message}</span>`;
    DOM.toastContainer.appendChild(toast);
    
    // Auto remove after animation
    setTimeout(() => {
      toast.style.animation = 'slideInRight var(--transition-fast) reverse forwards';
      toast.addEventListener('animationend', () => {
        toast.remove();
      });
    }, 3500);
  },

  switchMode(targetMode) {
    if (targetMode === 'citizen') {
      State.currentMode = 'citizen';
      DOM.adminSection.classList.remove('active');
      DOM.citizenSection.classList.add('active');
      DOM.portalBtnLabel.textContent = 'Staff Portal';
      DOM.portalSwitchBtn.classList.remove('active');
      
      // Update portal switch icon to lock
      DOM.portalSwitchBtn.querySelector('svg').innerHTML = `
        <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
      `;
    } else {
      State.currentMode = 'admin';
      DOM.citizenSection.classList.remove('active');
      DOM.adminSection.classList.add('active');
      DOM.portalBtnLabel.textContent = 'Citizen Mode';
      DOM.portalSwitchBtn.classList.add('active');
      
      // Update portal switch icon to exit arrow
      DOM.portalSwitchBtn.querySelector('svg').innerHTML = `
        <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
      `;
      
      this.refreshAdminDashboard();
    }
  },

  handleCitizenSearch(query) {
    if (!query || query.trim() === '') return;
    
    // Add visual loading state momentarily for premium feel
    DOM.btnSearch.disabled = true;
    DOM.btnSearch.innerHTML = `
      <svg class="animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" style="width:20px; height:20px; animation: spin 1s linear infinite;">
        <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" style="opacity: 0.25;"></circle>
        <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      <span>Searching...</span>
    `;

    // Add inline keyframe for spin dynamically if not in CSS
    if (!document.getElementById('spin-keyframes')) {
      const style = document.createElement('style');
      style.id = 'spin-keyframes';
      style.innerHTML = `@keyframes spin { to { transform: rotate(360deg); } }`;
      document.head.appendChild(style);
    }

    setTimeout(() => {
      // Revert search button state
      DOM.btnSearch.disabled = false;
      DOM.btnSearch.innerHTML = `<span>Check Status</span>`;

      const app = State.findApplication(query);
      DOM.resultContainer.style.display = 'block';

      if (app) {
        DOM.notFoundCard.style.display = 'none';
        DOM.foundCard.style.display = 'block';

        // Set Text details
        DOM.resDocType.textContent = app.documentType;
        DOM.resCode.textContent = app.code;
        DOM.resDate.textContent = this.formatDateString(app.dateFiled);

        // Privacy Masking for Applicant Name
        // E.g. "Jane Doe" -> "J*** D**"
        DOM.resApplicant.textContent = this.maskName(app.applicant);

        // Timestamps
        DOM.timeLogged.textContent = app.timeLogged || '-';
        DOM.timeProcessing.textContent = app.timeProcessing || '-';
        DOM.timeReady.textContent = app.timeReady ? app.timeReady.split(' - ')[1] || app.timeReady : '-';

        // Render Stepper nodes based on state
        DOM.stepLogged.className = 'step-node completed';
        
        if (app.status === 'Processing') {
          // Status badge
          DOM.resBadge.className = 'badge-status processing';
          DOM.resStatusLabel.textContent = 'Processing';

          // Steps UI
          DOM.stepProcessing.className = 'step-node active';
          DOM.stepReady.className = 'step-node';
          
          DOM.trackerLine.style.width = '50%';
          DOM.pickupDetails.style.display = 'none';
          
          // If processing timestamp isn't set, show standard working time indicator
          if (app.timeProcessing === '-') {
            DOM.timeProcessing.textContent = 'In Progress';
          }
        } else if (app.status === 'Ready for Pickup') {
          // Status badge
          DOM.resBadge.className = 'badge-status ready';
          DOM.resStatusLabel.textContent = 'Ready for Pickup';

          // Steps UI
          DOM.stepProcessing.className = 'step-node completed';
          DOM.stepReady.className = 'step-node completed active';
          
          DOM.trackerLine.style.width = '100%';
          DOM.pickupDetails.style.display = 'flex';
        }

        this.showToast('Application record retrieved.', 'success');
      } else {
        DOM.foundCard.style.display = 'none';
        DOM.notFoundCard.style.display = 'block';
        this.showToast('No record matched the tracking code.', 'warning');
      }

      // Smooth scroll to results
      DOM.resultContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 450);
  },

  maskName(fullName) {
    if (!fullName) return '';
    return fullName.split(' ').map(word => {
      if (word.length <= 1) return word + '*';
      return word[0] + '*'.repeat(word.length - 2) + word[word.length - 1];
    }).join(' ');
  },

  formatDateString(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  },

  refreshAdminDashboard() {
    const apps = State.getApplications();
    
    // 1. Calculate Metrics
    const total = apps.length;
    const processing = apps.filter(a => a.status === 'Processing').length;
    const ready = apps.filter(a => a.status === 'Ready for Pickup').length;
    
    DOM.statTotal.textContent = total;
    DOM.statProcessing.textContent = processing;
    DOM.statReady.textContent = ready;
    
    // 2. Render Table rows
    this.renderAdminTable();
  },

  renderAdminTable() {
    const searchVal = DOM.tableSearchInput.value.toLowerCase().trim();
    const filterStatus = DOM.tableFilterStatus.value;
    let apps = State.getApplications();
    
    // Apply filters
    if (searchVal) {
      apps = apps.filter(a => 
        a.code.toLowerCase().includes(searchVal) || 
        a.applicant.toLowerCase().includes(searchVal)
      );
    }
    
    if (filterStatus !== 'All') {
      apps = apps.filter(a => a.status === filterStatus);
    }
    
    DOM.adminTableBody.innerHTML = '';
    
    if (apps.length === 0) {
      DOM.adminTableBody.innerHTML = `
        <tr>
          <td colspan="6" class="table-empty-row">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 13.5h3.86a2.25 2.25 0 012.008 1.24l.885 1.77a2.25 2.25 0 002.007 1.24h1.98a2.25 2.25 0 002.007-1.24l.885-1.77a2.25 2.25 0 012.007-1.24h3.86m-18 0h18" />
            </svg>
            <p>No matching applications in registry</p>
          </td>
        </tr>
      `;
      return;
    }
    
    apps.forEach(app => {
      const tr = document.createElement('tr');
      
      const badgeClass = app.status === 'Ready for Pickup' ? 'ready' : 'processing';
      const formattedDate = this.formatDateString(app.dateFiled);
      
      tr.innerHTML = `
        <td style="font-weight:700; color:var(--text-primary); font-family:monospace;">${app.code}</td>
        <td style="font-weight:500;">${app.applicant}</td>
        <td>${app.documentType}</td>
        <td>${formattedDate}</td>
        <td>
          <span class="badge-status ${badgeClass}" style="padding: 0.25rem 0.6rem; font-size: 0.75rem; display:inline-flex;">
            ${app.status}
          </span>
        </td>
        <td>
          <div class="table-action-btns">
            ${app.status === 'Processing' ? `
              <button class="btn-table-action ready" onclick="UI.changeStatus('${app.code}', 'Ready for Pickup')" title="Mark Ready for Pickup">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              </button>
            ` : `
              <button class="btn-table-action processing" onclick="UI.changeStatus('${app.code}', 'Processing')" title="Revert to Processing">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                </svg>
              </button>
            `}
            <button class="btn-table-action delete" onclick="UI.deleteApp('${app.code}')" title="Delete Application">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
              </svg>
            </button>
          </div>
        </td>
      `;
      DOM.adminTableBody.appendChild(tr);
    });
  },

  changeStatus(code, status) {
    if (State.updateStatus(code, status)) {
      this.showToast(`Updated ${code} to ${status}.`, 'success');
      this.refreshAdminDashboard();
    } else {
      this.showToast('Could not update status.', 'danger');
    }
  },

  deleteApp(code) {
    if (confirm(`Are you sure you want to permanently delete application ${code}?`)) {
      if (State.deleteApplication(code)) {
        this.showToast(`Application ${code} deleted.`, 'danger');
        this.refreshAdminDashboard();
      }
    }
  },

  generateRandomCode() {
    let uniqueCode = '';
    let isUnique = false;
    while (!isUnique) {
      const randNum = Math.floor(10000 + Math.random() * 90000); // 5 digits
      uniqueCode = `APP-${randNum}`;
      if (!State.findApplication(uniqueCode)) {
        isUnique = true;
      }
    }
    DOM.inputAppCode.value = uniqueCode;
    this.showToast(`Generated unique code: ${uniqueCode}`, 'success');
  },

  handleNewAppSubmit(e) {
    e.preventDefault();
    const code = DOM.inputAppCode.value.toUpperCase().trim();
    const applicant = DOM.inputApplicant.value.trim();
    const documentType = DOM.selectDocType.value;
    const status = DOM.selectInitialStatus.value;
    
    // Validation
    if (!code.match(/^APP-\d{4,8}$/)) {
      this.showToast('Tracking Code must be in the format APP-XXXXX (4 to 8 digits)', 'warning');
      return;
    }

    const now = new Date();
    const dateFiled = now.toISOString().split('T')[0];
    const timeLogged = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const timeProcessing = status === 'Ready for Pickup' ? timeLogged : '-';
    const timeReady = status === 'Ready for Pickup' ? `${now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} - ${timeLogged}` : '-';

    const newApp = {
      code,
      applicant,
      documentType,
      status,
      dateFiled,
      timeLogged,
      timeProcessing,
      timeReady
    };

    if (State.addApplication(newApp)) {
      this.showToast(`Registered application ${code} successfully!`, 'success');
      DOM.newAppForm.reset();
      this.refreshAdminDashboard();
    } else {
      this.showToast(`Filing Code ${code} already exists in registry!`, 'danger');
    }
  },

  exportToCSV() {
    const apps = State.getApplications();
    if (apps.length === 0) {
      this.showToast('No records available to export.', 'warning');
      return;
    }

    const headers = ['Code', 'Applicant', 'DocumentType', 'Status', 'DateFiled', 'TimeLogged', 'TimeProcessing', 'TimeReady'];
    const rows = apps.map(a => [
      a.code,
      `"${a.applicant.replace(/"/g, '""')}"`,
      `"${a.documentType.replace(/"/g, '""')}"`,
      a.status,
      a.dateFiled,
      a.timeLogged,
      a.timeProcessing,
      a.timeReady
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `municipal_tracker_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    this.showToast('Database exported to CSV file.', 'success');
  },

  importFromCSVFile(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      const lines = text.split('\n');
      if (lines.length <= 1) {
        this.showToast('CSV file is empty or missing data.', 'warning');
        return;
      }

      // Check header presence
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      const hasCorrectHeaders = headers.includes('code') && headers.includes('applicant') && headers.includes('status');
      
      if (!hasCorrectHeaders) {
        this.showToast('Invalid CSV format. Must contain Code, Applicant, Status columns.', 'danger');
        return;
      }

      const parsedApps = [];
      
      // Basic CSV parser (handles quotes)
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        // RegEx to split by comma ignoring commas inside quotes
        const matches = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || line.split(',');
        if (matches.length < 3) continue;

        const cleanVal = (val) => val ? val.replace(/^["']|["']$/g, '').replace(/""/g, '"').trim() : '';

        // Columns mappings based on header indices
        const code = cleanVal(matches[headers.indexOf('code')]) || `APP-${Math.floor(10000 + Math.random()*90000)}`;
        const applicant = cleanVal(matches[headers.indexOf('applicant')]) || 'Unknown Applicant';
        const documentType = cleanVal(matches[headers.indexOf('documenttype')]) || 'Municipal Identity Card';
        const status = cleanVal(matches[headers.indexOf('status')]) || 'Processing';
        const dateFiled = cleanVal(matches[headers.indexOf('datefiled')]) || new Date().toISOString().split('T')[0];
        const timeLogged = cleanVal(matches[headers.indexOf('timelogged')]) || '08:00 AM';
        const timeProcessing = cleanVal(matches[headers.indexOf('timeprocessing')]) || '-';
        const timeReady = cleanVal(matches[headers.indexOf('timeready')]) || '-';

        parsedApps.push({
          code,
          applicant,
          documentType,
          status,
          dateFiled,
          timeLogged,
          timeProcessing,
          timeReady
        });
      }

      if (parsedApps.length > 0) {
        const count = State.importFromCSV(parsedApps);
        this.showToast(`Imported/Merged ${count} filings.`, 'success');
        this.refreshAdminDashboard();
      } else {
        this.showToast('No valid records parsed from CSV.', 'warning');
      }
    };
    reader.readAsText(file);
  },

  handlePrintReceipt() {
    window.print();
  },

  bindEvents() {
    // Theme toggle
    DOM.themeToggleBtn.addEventListener('click', () => this.toggleTheme());
    
    // Logo navigation reset
    DOM.logoLink.addEventListener('click', (e) => {
      e.preventDefault();
      this.switchMode('citizen');
      DOM.resultContainer.style.display = 'none';
      DOM.searchInput.value = '';
    });

    // Portal Switch trigger (Toggle Citizen/Admin view)
    DOM.portalSwitchBtn.addEventListener('click', () => {
      if (State.currentMode === 'citizen') {
        // Show authentication modal
        DOM.passcodeModal.classList.add('active');
        DOM.passcodeError.style.display = 'none';
        DOM.passcodeInput.value = '';
        setTimeout(() => DOM.passcodeInput.focus(), 100);
      } else {
        // Log out admin
        this.switchMode('citizen');
        this.showToast('Logged out of Admin Portal.', 'warning');
      }
    });

    // Close Auth modal
    DOM.btnCloseModal.addEventListener('click', () => {
      DOM.passcodeModal.classList.remove('active');
    });

    // Handle Passcode verification
    DOM.passcodeForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const code = DOM.passcodeInput.value;
      if (code === 'admin123') {
        DOM.passcodeModal.classList.remove('active');
        this.switchMode('admin');
        this.showToast('Access granted to Staff Portal.', 'success');
      } else {
        DOM.passcodeError.style.display = 'block';
        DOM.passcodeInput.select();
      }
    });

    // Citizen Search submit
    DOM.searchForm.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleCitizenSearch(DOM.searchInput.value);
    });

    // Generate random code button
    DOM.btnGenerateCode.addEventListener('click', () => this.generateRandomCode());

    // Register new application form submit
    DOM.newAppForm.addEventListener('submit', (e) => this.handleNewAppSubmit(e));

    // Toolbar filters
    DOM.tableSearchInput.addEventListener('input', () => this.renderAdminTable());
    DOM.tableFilterStatus.addEventListener('change', () => this.renderAdminTable());

    // CSV Exports/Imports
    DOM.btnExportCsv.addEventListener('click', () => this.exportToCSV());
    DOM.btnImportCsv.addEventListener('click', () => DOM.csvFileInput.click());
    DOM.csvFileInput.addEventListener('change', (e) => {
      if (e.target.files.length > 0) {
        this.importFromCSVFile(e.target.files[0]);
        e.target.value = ''; // Reset file input
      }
    });

    // Print Receipt
    DOM.btnPrintReceipt.addEventListener('click', () => this.handlePrintReceipt());
  }
};

// Initialize App on DOM Content Loaded
document.addEventListener('DOMContentLoaded', () => UI.init());

// Expose some functions to the global scope for inline button handlers
window.UI = {
  changeStatus: (code, status) => UI.changeStatus(code, status),
  deleteApp: (code) => UI.deleteApp(code)
};
