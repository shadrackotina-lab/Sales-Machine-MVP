// ============================================
// SALES MACHINE - CORE LOGIC
// ============================================

// Data Management
class SalesMachine {
  constructor() {
    this.captures = this.loadData('captures') || [];
    this.visitors = this.loadData('visitors') || [];
    this.dailyStats = this.loadData('dailyStats') || this.initializeDailyStats();
    this.settings = this.loadData('settings') || this.defaultSettings();
    this.init();
  }

  defaultSettings() {
    return {
      productName: 'Digital Sales Machine',
      salePrice: 97,
      gumroadLink: 'https://gumroad.com/your-product',
      campaignActive: true,
    };
  }

  initializeDailyStats() {
    const stats = {};
    for (let i = 0; i < 7; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const key = date.toISOString().split('T')[0];
      stats[key] = { conversions: 0, visits: 0 };
    }
    return stats;
  }

  init() {
    this.trackVisit();
    this.setupEventListeners();
    this.renderDashboard();
    this.loadSettings();
  }

  // ============================================
  // TRACKING & DATA
  // ============================================

  trackVisit() {
    const visitId = `visit_${Date.now()}`;
    const visitor = {
      id: visitId,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
    };
    this.visitors.push(visitor);
    this.saveData('visitors', this.visitors);
    this.updateDailyStats('visits');
  }

  addCapture(email) {
    const capture = {
      id: `capture_${Date.now()}`,
      email: email,
      timestamp: new Date().toISOString(),
      source: document.referrer || 'direct',
    };
    this.captures.push(capture);
    this.saveData('captures', this.captures);
    this.updateDailyStats('conversions');
    return capture;
  }

  updateDailyStats(type) {
    const today = new Date().toISOString().split('T')[0];
    if (!this.dailyStats[today]) {
      this.dailyStats[today] = { conversions: 0, visits: 0 };
    }
    if (type === 'visits') {
      this.dailyStats[today].visits++;
    } else if (type === 'conversions') {
      this.dailyStats[today].conversions++;
    }
    this.saveData('dailyStats', this.dailyStats);
  }

  // ============================================
  // STORAGE UTILITIES
  // ============================================

  saveData(key, value) {
    try {
      localStorage.setItem(`salesMachine_${key}`, JSON.stringify(value));
    } catch (e) {
      console.error('Storage error:', e);
    }
  }

  loadData(key) {
    try {
      const data = localStorage.getItem(`salesMachine_${key}`);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      console.error('Load error:', e);
      return null;
    }
  }

  clearAllData() {
    if (confirm('Are you sure? This will delete all campaign data.')) {
      localStorage.removeItem('salesMachine_captures');
      localStorage.removeItem('salesMachine_visitors');
      localStorage.removeItem('salesMachine_dailyStats');
      this.captures = [];
      this.visitors = [];
      this.dailyStats = this.initializeDailyStats();
      this.saveData('dailyStats', this.dailyStats);
      this.renderDashboard();
      this.showToast('All data cleared');
    }
  }

  // ============================================
  // METRICS CALCULATIONS
  // ============================================

  getMetrics() {
    const totalVisitors = this.visitors.length;
    const totalCaptures = this.captures.length;
    const conversionRate = totalVisitors > 0
      ? ((totalCaptures / totalVisitors) * 100).toFixed(2)
      : 0;
    const estimatedRevenue = totalCaptures * this.settings.salePrice;

    return {
      totalVisitors,
      totalCaptures,
      conversionRate,
      estimatedRevenue,
    };
  }

  getChartData() {
    const labels = [];
    const data = [];

    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const key = date.toISOString().split('T')[0];
      const dayLabel = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
      labels.push(dayLabel);
      data.push(this.dailyStats[key]?.conversions || 0);
    }

    return { labels, data };
  }

  // ============================================
  // EVENT LISTENERS
  // ============================================

  setupEventListeners() {
    // Navigation
    document.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', (e) => this.handleNavigation(e));
    });

    // Email form
    const emailForm = document.getElementById('emailForm');
    if (emailForm) {
      emailForm.addEventListener('submit', (e) => this.handleEmailSubmit(e));
    }

    // Dashboard buttons
    const copyBtn = document.getElementById('copyLinkBtn');
    if (copyBtn) {
      copyBtn.addEventListener('click', () => this.copyTrackingLink());
    }

    // Settings
    const exportBtn = document.getElementById('exportBtn');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => this.exportDataAsCSV());
    }

    const clearBtn = document.getElementById('clearBtn');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => this.clearAllData());
    }

    // Settings form
    document.getElementById('productName')?.addEventListener('change', (e) => {
      this.settings.productName = e.target.value;
      this.saveSettings();
    });

    document.getElementById('salePrice')?.addEventListener('change', (e) => {
      this.settings.salePrice = parseFloat(e.target.value) || 0;
      this.saveSettings();
      this.renderDashboard();
    });

    document.getElementById('gumroadLink')?.addEventListener('change', (e) => {
      this.settings.gumroadLink = e.target.value;
      this.saveSettings();
    });

    document.getElementById('campaignActive')?.addEventListener('change', (e) => {
      this.settings.campaignActive = e.target.checked;
      this.saveSettings();
    });
  }

  handleNavigation(e) {
    const section = e.target.dataset.section;
    if (!section) return;

    // Update active nav link
    document.querySelectorAll('.nav-link').forEach(link => {
      link.classList.remove('active');
    });
    e.target.classList.add('active');

    // Update active section
    document.querySelectorAll('.section').forEach(sec => {
      sec.classList.remove('active');
    });
    document.getElementById(`${section}-section`).classList.add('active');

    // Render dashboard if navigating to it
    if (section === 'dashboard') {
      this.renderDashboard();
    }
  }

  handleEmailSubmit(e) {
    e.preventDefault();
    const emailInput = document.getElementById('emailInput');
    const email = emailInput.value.trim();

    if (!email) {
      this.showToast('Please enter an email', 'error');
      return;
    }

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      this.showToast('Invalid email address', 'error');
      return;
    }

    // Add capture
    this.addCapture(email);
    this.showToast('✓ Access granted! Check your email.');
    emailInput.value = '';

    // Redirect to Gumroad after 1.5s
    setTimeout(() => {
      window.open(this.settings.gumroadLink, '_blank');
    }, 1500);

    // Update dashboard
    this.renderDashboard();
  }

  copyTrackingLink() {
    const baseUrl = window.location.href.split('?')[0].split('#')[0];
    const trackingUrl = `${baseUrl}?utm_source=newsletter&utm_medium=email`;

    navigator.clipboard.writeText(trackingUrl).then(() => {
      const feedback = document.getElementById('linkFeedback');
      if (feedback) {
        feedback.textContent = '✓ Link copied to clipboard!';
        setTimeout(() => {
          feedback.textContent = '';
        }, 3000);
      }
    });
  }

  exportDataAsCSV() {
    const headers = ['Email', 'Timestamp', 'Source'];
    const rows = this.captures.map(capture => [
      capture.email,
      new Date(capture.timestamp).toLocaleString(),
      capture.source || 'direct',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `sales_machine_export_${Date.now()}.csv`;
    link.click();

    this.showToast('✓ Data exported!');
  }

  // ============================================
  // RENDERING
  // ============================================

  renderDashboard() {
    const metrics = this.getMetrics();

    document.getElementById('visitorCount').textContent = metrics.totalVisitors;
    document.getElementById('captureCount').textContent = metrics.totalCaptures;
    document.getElementById('conversionRate').textContent = `${metrics.conversionRate}%`;
    document.getElementById('revenueEst').textContent = `$${metrics.estimatedRevenue.toLocaleString()}`;

    this.renderCapturesList();
    this.renderChart();
  }

  renderCapturesList() {
    const list = document.getElementById('capturesList');
    if (!list) return;

    if (this.captures.length === 0) {
      list.innerHTML = '<p class="empty-state">No captures yet. Share your link to start tracking!</p>';
      return;
    }

    const recentCaptures = [...this.captures].reverse().slice(0, 10);
    list.innerHTML = recentCaptures.map(capture => {
      const date = new Date(capture.timestamp);
      const timeStr = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
      const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

      return `
        <div class="capture-item">
          <span class="capture-email">${capture.email}</span>
          <span class="capture-time">${dateStr} ${timeStr}</span>
        </div>
      `;
    }).join('');
  }

  renderChart() {
    const canvas = document.getElementById('conversionChart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const data = this.getChartData();

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Set canvas size
    canvas.width = canvas.offsetWidth;
    canvas.height = 300;

    // Draw chart
    this.drawLineChart(ctx, data.labels, data.data);
  }

  drawLineChart(ctx, labels, data) {
    const padding = 40;
    const width = ctx.canvas.width - padding * 2;
    const height = ctx.canvas.height - padding * 2;
    const maxValue = Math.max(...data, 5);
    const stepX = width / (data.length - 1 || 1);
    const stepY = height / maxValue;

    // Draw grid
    ctx.strokeStyle = '#1f2a44';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 5; i++) {
      const y = padding + (height / 5) * i;
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(width + padding, y);
      ctx.stroke();
    }

    // Draw data line
    ctx.strokeStyle = '#4f7cff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    data.forEach((value, index) => {
      const x = padding + index * stepX;
      const y = padding + height - value * stepY;
      if (index === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Draw points
    ctx.fillStyle = '#4f7cff';
    data.forEach((value, index) => {
      const x = padding + index * stepX;
      const y = padding + height - value * stepY;
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, Math.PI * 2);
      ctx.fill();
    });

    // Draw labels
    ctx.fillStyle = '#a0aec0';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    labels.forEach((label, index) => {
      const x = padding + index * stepX;
      ctx.fillText(label, x, ctx.canvas.height - 10);
    });

    // Draw Y-axis labels
    ctx.textAlign = 'right';
    for (let i = 0; i <= 5; i++) {
      const value = Math.round((maxValue / 5) * i);
      const y = padding + (height / 5) * (5 - i);
      ctx.fillText(value, padding - 10, y + 4);
    }
  }

  loadSettings() {
    document.getElementById('productName').value = this.settings.productName;
    document.getElementById('salePrice').value = this.settings.salePrice;
    document.getElementById('gumroadLink').value = this.settings.gumroadLink;
    document.getElementById('campaignActive').checked = this.settings.campaignActive;
  }

  saveSettings() {
    this.saveData('settings', this.settings);
  }

  showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => {
      toast.classList.remove('show');
    }, 3000);
  }
}

// ============================================
// INITIALIZE APP
// ============================================

document.addEventListener('DOMContentLoaded', () => {
  window.salesMachine = new SalesMachine();
  console.log('🚀 Sales Machine loaded. Turn attention into income.');
});
