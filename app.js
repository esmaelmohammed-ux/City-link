/**
 * Adama City Infrastructure Health Dashboard - Core Script
 * Coordinates state, localStorage persistence, health index calculations, modal updates, and search filters.
 */

// Initial Seed Data
const DEFAULT_SUBCITIES = [
  {
    id: 'bole',
    name: 'Bole Sub-City',
    services: {
      water: { status: 'Green', note: 'Pressure optimal. No pipeline issues reported.' },
      lights: { status: 'Yellow', note: 'Bulb replacements underway on main commercial avenue.' },
      roads: { status: 'Green', note: 'Asphalt paving completed on Ring Road segment.' },
      waste: { status: 'Green', note: 'Collection schedule operating on time.' }
    }
  },
  {
    id: 'melka-adama',
    name: 'Melka Adama Sub-City',
    services: {
      water: { status: 'Red', note: 'Main trunk line pipe burst near Adama University - Repairs ongoing.' },
      lights: { status: 'Green', note: 'Grid operational. All zone streetlights active.' },
      roads: { status: 'Yellow', note: 'Pothole patching underway near local market crossings.' },
      waste: { status: 'Green', note: 'Regular collection completed.' }
    }
  },
  {
    id: 'gadaa',
    name: 'Gadaa Sub-City',
    services: {
      water: { status: 'Green', note: 'Pumping station running at normal capacity.' },
      lights: { status: 'Red', note: 'Transformer explosion on Block 3 - Maintenance crew dispatched.' },
      roads: { status: 'Green', note: 'No road alerts active.' },
      waste: { status: 'Green', note: 'Sanitation operations fully active.' }
    }
  },
  {
    id: 'dambala',
    name: 'Dambala Sub-City',
    services: {
      water: { status: 'Green', note: 'Optimal supply line levels.' },
      lights: { status: 'Green', note: 'LED replacements completed.' },
      roads: { status: 'Green', note: 'No active road reports.' },
      waste: { status: 'Yellow', note: 'Truck breakdown delayed collection in Zone B - Rescheduled for tomorrow.' }
    }
  },
  {
    id: 'biftu',
    name: 'Biftu Sub-City',
    services: {
      water: { status: 'Green', note: 'Supply line normal.' },
      lights: { status: 'Green', note: 'Operational.' },
      roads: { status: 'Green', note: 'All corridors open.' },
      waste: { status: 'Green', note: 'Routine garbage disposal running.' }
    }
  },
  {
    id: 'abbaa-gadaa',
    name: 'Abbaa Gadaa Sub-City',
    services: {
      water: { status: 'Yellow', note: 'Lower water pressure reported in high-altitude zones under investigation.' },
      lights: { status: 'Green', note: 'Standard grid operational.' },
      roads: { status: 'Red', note: 'Main river bridge structural inspection - Lane access restricted.' },
      waste: { status: 'Green', note: 'Operational.' }
    }
  }
];

class DashboardState {
  constructor() {
    this.dbKey = 'adama_infrastructure_subcities';
    this.themeKey = 'adama_theme';
    
    // Auth status is session-based
    this.isOfficialMode = false;
    
    // Load local storage or default data
    const stored = localStorage.getItem(this.dbKey);
    if (stored) {
      try {
        this.subcities = JSON.parse(stored);
      } catch (e) {
        console.error('Failed to parse database, seeding defaults.', e);
        this.subcities = JSON.parse(JSON.stringify(DEFAULT_SUBCITIES));
        this.save();
      }
    } else {
      this.subcities = JSON.parse(JSON.stringify(DEFAULT_SUBCITIES));
      this.save();
    }
    
    this.theme = localStorage.getItem(this.themeKey) || 'light';
  }

  save() {
    localStorage.setItem(this.dbKey, JSON.stringify(this.subcities));
  }

  getSubcities() {
    return this.subcities;
  }

  updateService(subcityId, serviceKey, status, note) {
    const subcity = this.subcities.find(s => s.id === subcityId);
    if (subcity && subcity.services[serviceKey]) {
      subcity.services[serviceKey].status = status;
      subcity.services[serviceKey].note = note || 'No reports';
      this.save();
      return true;
    }
    return false;
  }
}

const State = new DashboardState();

// DOM Cache
const DOM = {
  themeToggleBtn: document.getElementById('theme-toggle'),
  sunIcon: document.getElementById('sun-icon'),
  moonIcon: document.getElementById('moon-icon'),
  
  btnAuthSwitch: document.getElementById('btn-auth-switch'),
  authBtnLabel: document.getElementById('auth-btn-label'),
  modeBadge: document.getElementById('mode-badge'),
  
  // Modals
  passcodeModal: document.getElementById('passcode-modal'),
  btnClosePasscodeModal: document.getElementById('btn-close-passcode-modal'),
  passcodeForm: document.getElementById('passcode-form'),
  passcodeInput: document.getElementById('admin-passcode-input'),
  passcodeError: document.getElementById('passcode-error'),
  
  updateStatusModal: document.getElementById('update-status-modal'),
  btnCloseUpdateModal: document.getElementById('btn-close-update-modal'),
  updateStatusForm: document.getElementById('update-status-form'),
  updateSubcityId: document.getElementById('update-subcity-id'),
  updateServiceId: document.getElementById('update-service-id'),
  updateModalSubtitle: document.getElementById('update-modal-subtitle'),
  updateNotesInput: document.getElementById('update-notes-input'),
  
  // Dashboard indicators
  cityHealthGauge: document.getElementById('city-health-gauge'),
  cityHealthPercentage: document.getElementById('city-health-percentage'),
  cityHealthSummary: document.getElementById('city-health-summary'),
  
  statGreen: document.getElementById('stat-green'),
  statYellow: document.getElementById('stat-yellow'),
  statRed: document.getElementById('stat-red'),
  
  // Filtering & Search
  searchInput: document.getElementById('search-input'),
  filterButtons: document.querySelectorAll('.btn-filter'),
  gridContainer: document.getElementById('grid-container'),
  
  toastContainer: document.getElementById('toast-container')
};

const UI = {
  currentFilter: 'All',

  init() {
    this.applyTheme(State.theme);
    this.bindEvents();
    this.refreshDashboard();
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
    
    setTimeout(() => {
      toast.style.animation = 'slideInRight var(--transition-fast) reverse forwards';
      toast.addEventListener('animationend', () => toast.remove());
    }, 3500);
  },

  switchMode(isOfficial) {
    State.isOfficialMode = isOfficial;
    
    if (isOfficial) {
      DOM.modeBadge.className = 'badge-mode official';
      DOM.modeBadge.textContent = 'Official View';
      DOM.authBtnLabel.textContent = 'Exit Official Mode';
      DOM.btnAuthSwitch.classList.add('active');
      DOM.gridContainer.classList.add('official-mode-active');
      this.showToast('Official Editing Access Unlocked.', 'success');
    } else {
      DOM.modeBadge.className = 'badge-mode public';
      DOM.modeBadge.textContent = 'Public View';
      DOM.authBtnLabel.textContent = 'Official Login';
      DOM.btnAuthSwitch.classList.remove('active');
      DOM.gridContainer.classList.remove('official-mode-active');
      this.showToast('Returned to Public Dashboard.', 'warning');
    }
    
    this.renderGrid();
  },

  refreshDashboard() {
    const subcities = State.getSubcities();
    
    // Score system: Green = 1.0, Yellow = 0.5, Red = 0.0
    let totalServices = 0;
    let scoreSum = 0;
    
    let greenCount = 0;
    let yellowCount = 0;
    let redCount = 0;
    
    subcities.forEach(sc => {
      Object.keys(sc.services).forEach(sKey => {
        totalServices++;
        const status = sc.services[sKey].status;
        if (status === 'Green') {
          scoreSum += 1.0;
          greenCount++;
        } else if (status === 'Yellow') {
          scoreSum += 0.5;
          yellowCount++;
        } else if (status === 'Red') {
          scoreSum += 0.0;
          redCount++;
        }
      });
    });

    const healthPercentage = totalServices > 0 ? Math.round((scoreSum / totalServices) * 100) : 0;
    
    // Update Indicators
    DOM.cityHealthPercentage.textContent = `${healthPercentage}%`;
    DOM.statGreen.textContent = greenCount;
    DOM.statYellow.textContent = yellowCount;
    DOM.statRed.textContent = redCount;

    // Circle circumference is 283 (radius 45)
    // Offset ranges from 283 (0%) to 0 (100%)
    const offset = 283 - (283 * healthPercentage) / 100;
    DOM.cityHealthGauge.style.strokeDashoffset = offset;

    // Apply color representation on overall health stroke
    if (healthPercentage >= 85) {
      DOM.cityHealthGauge.style.stroke = 'var(--color-green)';
    } else if (healthPercentage >= 65) {
      DOM.cityHealthGauge.style.stroke = 'var(--color-yellow)';
    } else {
      DOM.cityHealthGauge.style.stroke = 'var(--color-red)';
    }

    // Set brief description
    if (redCount === 0 && yellowCount === 0) {
      DOM.cityHealthSummary.textContent = 'All systems healthy. No infrastructure service outages reported.';
    } else {
      DOM.cityHealthSummary.textContent = `${greenCount}/${totalServices} services operational. ${redCount} active outage${redCount !== 1 ? 's' : ''} reported.`;
    }

    this.renderGrid();
  },

  renderGrid() {
    const searchVal = DOM.searchInput.value.toLowerCase().trim();
    const subcities = State.getSubcities();
    
    DOM.gridContainer.innerHTML = '';
    
    // Filter and loop
    subcities.forEach(sc => {
      // Apply Search Filter (Sub-city name match)
      if (searchVal && !sc.name.toLowerCase().includes(searchVal)) {
        return;
      }

      // Calculate Sub-city local health rating
      let localScore = 0;
      let hasRed = false;
      let hasYellow = false;
      let allGreen = true;
      
      const sKeys = Object.keys(sc.services);
      sKeys.forEach(k => {
        const s = sc.services[k];
        if (s.status === 'Green') {
          localScore += 1.0;
        } else if (s.status === 'Yellow') {
          localScore += 0.5;
          hasYellow = true;
          allGreen = false;
        } else if (s.status === 'Red') {
          localScore += 0.0;
          hasRed = true;
          allGreen = false;
        }
      });
      const localPercentage = Math.round((localScore / sKeys.length) * 100);

      // Apply Button filter categories
      if (this.currentFilter === 'Outages' && !hasRed) return;
      if (this.currentFilter === 'Maintenance' && !hasYellow) return;
      if (this.currentFilter === 'Healthy' && !allGreen) return;

      // Card Element
      const card = document.createElement('div');
      card.className = `subcity-card ${hasRed ? 'has-outage' : ''}`;
      
      // Health Pill styling
      let healthPillClass = 'high';
      if (localPercentage < 60) healthPillClass = 'low';
      else if (localPercentage < 90) healthPillClass = 'med';

      card.innerHTML = `
        <div class="subcity-header">
          <h3>${sc.name}</h3>
          <span class="health-pill ${healthPillClass}">${localPercentage}% Healthy</span>
        </div>
        <div class="services-layout">
          ${this.generateServiceBlock(sc.id, 'water', '💧', 'Water Supply', sc.services.water)}
          ${this.generateServiceBlock(sc.id, 'lights', '💡', 'Streetlights', sc.services.lights)}
          ${this.generateServiceBlock(sc.id, 'roads', '🛣️', 'Roads', sc.services.roads)}
          ${this.generateServiceBlock(sc.id, 'waste', '🗑️', 'Waste Mgmt', sc.services.waste)}
        </div>
      `;
      DOM.gridContainer.appendChild(card);
    });

    if (DOM.gridContainer.children.length === 0) {
      DOM.gridContainer.innerHTML = `
        <div class="glass-card" style="grid-column: 1 / -1; text-align: center; padding: 3rem; color: var(--text-muted);">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" style="width: 48px; height: 48px; margin: 0 auto 1rem; color: var(--text-muted);">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
          <p style="font-weight:600; font-size:1.1rem; color:var(--text-secondary);">No sub-cities match your filter settings.</p>
        </div>
      `;
    }
  },

  generateServiceBlock(subcityId, serviceKey, icon, label, serviceObj) {
    const statusClass = serviceObj.status.toLowerCase();
    
    // Escape quote marks to avoid template issues
    const safeNote = serviceObj.note.replace(/"/g, '&quot;');
    
    return `
      <div class="service-block ${statusClass}" onclick="UI.handleServiceClick('${subcityId}', '${serviceKey}')">
        <div class="service-meta">
          <span class="service-icon-label">${icon}</span>
          <span class="status-indicator-dot ${statusClass}"></span>
        </div>
        <span class="service-label">${label}</span>
        
        <!-- Interactive Tooltip Overlay -->
        <span class="custom-tooltip">
          <strong>${label}</strong><br>
          Status: ${serviceObj.status}<br>
          <em>${safeNote}</em>
        </span>
      </div>
    `;
  },

  handleServiceClick(subcityId, serviceKey) {
    if (!State.isOfficialMode) return; // Clicking only acts in official mode

    const subcity = State.getSubcities().find(s => s.id === subcityId);
    if (!subcity) return;

    const service = subcity.services[serviceKey];
    
    let prettyLabel = 'Water Supply';
    if (serviceKey === 'lights') prettyLabel = 'Streetlights';
    else if (serviceKey === 'roads') prettyLabel = 'Road Maintenance';
    else if (serviceKey === 'waste') prettyLabel = 'Waste Management';

    // Populate editing fields
    DOM.updateSubcityId.value = subcityId;
    DOM.updateServiceId.value = serviceKey;
    DOM.updateModalSubtitle.textContent = `${subcity.name} • ${prettyLabel}`;
    
    // Select status radio button
    const checkedRadio = document.querySelector(`input[name="status-option"][value="${service.status}"]`);
    if (checkedRadio) checkedRadio.checked = true;
    
    DOM.updateNotesInput.value = service.note;
    
    // Open editor modal
    DOM.updateStatusModal.classList.add('active');
    setTimeout(() => DOM.updateNotesInput.focus(), 150);
  },

  handleStatusUpdate(e) {
    e.preventDefault();
    const subcityId = DOM.updateSubcityId.value;
    const serviceKey = DOM.updateServiceId.value;
    
    const selectedStatus = document.querySelector('input[name="status-option"]:checked').value;
    const note = DOM.updateNotesInput.value.trim() || 'Operational. No alerts reported.';

    if (State.updateService(subcityId, serviceKey, selectedStatus, note)) {
      this.showToast(`Updated service details successfully.`, 'success');
      DOM.updateStatusModal.classList.remove('active');
      this.refreshDashboard();
    } else {
      this.showToast('Update failed. Record invalid.', 'danger');
    }
  },

  bindEvents() {
    // Theme toggle
    DOM.themeToggleBtn.addEventListener('click', () => this.toggleTheme());

    // Official Mode switch
    DOM.btnAuthSwitch.addEventListener('click', () => {
      if (State.isOfficialMode) {
        this.switchMode(false); // Log out
      } else {
        DOM.passcodeModal.classList.add('active');
        DOM.passcodeError.style.display = 'none';
        DOM.passcodeInput.value = '';
        setTimeout(() => DOM.passcodeInput.focus(), 100);
      }
    });

    // Close passcode modal
    DOM.btnClosePasscodeModal.addEventListener('click', () => {
      DOM.passcodeModal.classList.remove('active');
    });

    // Close update modal
    DOM.btnCloseUpdateModal.addEventListener('click', () => {
      DOM.updateStatusModal.classList.remove('active');
    });

    // Submit passcode authentication
    DOM.passcodeForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const code = DOM.passcodeInput.value;
      if (code === 'adama2026') {
        DOM.passcodeModal.classList.remove('active');
        this.switchMode(true);
      } else {
        DOM.passcodeError.style.display = 'block';
        DOM.passcodeInput.select();
      }
    });

    // Submit update status form
    DOM.updateStatusForm.addEventListener('submit', (e) => this.handleStatusUpdate(e));

    // Live search
    DOM.searchInput.addEventListener('input', () => this.renderGrid());

    // Button Filters click listeners
    DOM.filterButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        DOM.filterButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.currentFilter = btn.getAttribute('data-filter');
        this.renderGrid();
      });
    });
  }
};

// Initialize App
document.addEventListener('DOMContentLoaded', () => UI.init());

// Expose click handler utility globally
window.UI = {
  handleServiceClick: (subId, serKey) => UI.handleServiceClick(subId, serKey)
};
