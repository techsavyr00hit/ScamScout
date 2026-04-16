// Overlay UI Component - Creates and manages the in-page risk display

class ScamScoutOverlay {
  constructor() {
    this.overlay = null;
    this.minimized = false;
    this.isVisible = false;
  }

  createStyles() {
    const style = document.createElement("style");
    style.id = "scamscout-styles";
    style.textContent = `
      #scamscout-overlay {
        position: fixed;
        top: 16px;
        right: 16px;
        z-index: 2147483647;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        font-size: 14px;
        line-height: 1.5;
        color: #1a1a2e;
        background: #ffffff;
        border-radius: 12px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15), 0 2px 8px rgba(0, 0, 0, 0.1);
        width: 340px;
        max-height: 80vh;
        overflow: hidden;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        border: 1px solid rgba(0, 0, 0, 0.08);
      }

      #scamscout-overlay.scamscout-minimized {
        width: auto;
        max-height: none;
      }

      #scamscout-overlay.scamscout-minimized .scamscout-content {
        display: none;
      }

      #scamscout-overlay.scamscout-minimized .scamscout-header {
        border-radius: 12px;
      }

      .scamscout-header {
        padding: 16px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        border-bottom: 1px solid rgba(0, 0, 0, 0.06);
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        border-radius: 12px 12px 0 0;
      }

      .scamscout-brand {
        display: flex;
        align-items: center;
        gap: 8px;
        font-weight: 600;
        font-size: 15px;
      }

      .scamscout-brand svg {
        width: 20px;
        height: 20px;
      }

      .scamscout-controls {
        display: flex;
        gap: 8px;
        align-items: center;
      }

      .scamscout-btn {
        background: rgba(255, 255, 255, 0.2);
        border: none;
        color: white;
        cursor: pointer;
        border-radius: 6px;
        padding: 4px 8px;
        font-size: 12px;
        transition: background 0.2s;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .scamscout-btn:hover {
        background: rgba(255, 255, 255, 0.3);
      }

      .scamscout-score-container {
        padding: 20px 16px;
        text-align: center;
      }

      .scamscout-score-ring {
        position: relative;
        width: 120px;
        height: 120px;
        margin: 0 auto 12px;
      }

      .scamscout-score-ring svg {
        transform: rotate(-90deg);
      }

      .scamscout-score-ring-bg {
        fill: none;
        stroke: #e8e8e8;
        stroke-width: 8;
      }

      .scamscout-score-ring-fill {
        fill: none;
        stroke-width: 8;
        stroke-linecap: round;
        transition: stroke-dashoffset 0.6s cubic-bezier(0.4, 0, 0.2, 1), stroke 0.3s;
      }

      .scamscout-score-value {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        font-size: 32px;
        font-weight: 700;
      }

      .scamscout-status {
        font-size: 16px;
        font-weight: 600;
        margin-bottom: 4px;
      }

      .scamscout-subtitle {
        font-size: 12px;
        color: #666;
      }

      .scamscout-content {
        max-height: calc(80vh - 120px);
        overflow-y: auto;
      }

      .scamscout-section {
        padding: 12px 16px;
        border-top: 1px solid rgba(0, 0, 0, 0.06);
      }

      .scamscout-section-title {
        font-size: 12px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        margin-bottom: 8px;
        display: flex;
        align-items: center;
        gap: 6px;
      }

      .scamscout-flag {
        padding: 8px 10px;
        border-radius: 6px;
        margin-bottom: 6px;
        font-size: 12px;
        line-height: 1.4;
      }

      .scamscout-flag.scamscout-red {
        background: #fff1f0;
        border-left: 3px solid #ff4d4f;
        color: #820000;
      }

      .scamscout-flag.scamscout-green {
        background: #f6ffed;
        border-left: 3px solid #52c41a;
        color: #135200;
      }

      .scamscout-suggestions {
        background: #f0f5ff;
        border-radius: 8px;
        padding: 12px;
      }

      .scamscout-suggestion {
        display: flex;
        align-items: flex-start;
        gap: 8px;
        padding: 6px 0;
        font-size: 12px;
        color: #333;
      }

      .scamscout-suggestion:not(:last-child) {
        border-bottom: 1px solid rgba(0, 0, 0, 0.06);
      }

      .scamscout-suggestion-icon {
        flex-shrink: 0;
        width: 16px;
        text-align: center;
      }

      .scamscout-loading {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 32px 16px;
        color: #666;
      }

      .scamscout-spinner {
        width: 32px;
        height: 32px;
        border: 3px solid #e8e8e8;
        border-top-color: #667eea;
        border-radius: 50%;
        animation: scamscout-spin 0.8s linear infinite;
        margin-bottom: 12px;
      }

      @keyframes scamscout-spin {
        to { transform: rotate(360deg); }
      }

      .scamscout-minimized-badge {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 10px 14px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        border-radius: 12px;
        cursor: pointer;
        font-weight: 600;
        font-size: 14px;
        white-space: nowrap;
      }

      .scamscout-minimized-badge .scamscout-mini-score {
        background: rgba(255, 255, 255, 0.25);
        padding: 2px 10px;
        border-radius: 20px;
        font-size: 13px;
        font-weight: 700;
      }

      .scamscout-scroll-indicator {
        text-align: center;
        padding: 8px;
        color: #999;
        font-size: 11px;
        cursor: pointer;
        border-top: 1px solid rgba(0, 0, 0, 0.06);
      }

      .scamscout-scroll-indicator:hover {
        background: #f5f5f5;
      }
    `;
    document.head.appendChild(style);
  }

  getScoreColor(score) {
    if (score < 30) return "#52c41a";
    if (score < 50) return "#faad14";
    if (score < 70) return "#fa8c16";
    return "#ff4d4f";
  }

  getStatusText(score) {
    if (score < 30) return "✅ Likely Genuine";
    if (score < 50) return "⚠️ Exercise Caution";
    if (score < 70) return "🔶 Suspicious";
    return "🚨 High Risk - Likely Scam";
  }

  showLoading() {
    this.createStyles();

    // Remove existing overlay if present
    if (this.overlay) {
      this.overlay.remove();
    }
    const existingOverlay = document.getElementById("scamscout-overlay");
    if (existingOverlay) {
      existingOverlay.remove();
    }

    this.overlay = document.createElement("div");
    this.overlay.id = "scamscout-overlay";
    this.overlay.innerHTML = `
      <div class="scamscout-header">
        <div class="scamscout-brand">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          </svg>
          ScamScout
        </div>
        <div class="scamscout-controls">
          <button class="scamscout-btn" id="scamscout-minimize" title="Minimize">−</button>
          <button class="scamscout-btn" id="scamscout-close" title="Close">×</button>
        </div>
      </div>
      <div class="scamscout-loading">
        <div class="scamscout-spinner"></div>
        <div>Analyzing job posting...</div>
      </div>
    `;

    document.body.appendChild(this.overlay);
    this.isVisible = true;

    document.getElementById("scamscout-minimize").addEventListener("click", () => this.toggleMinimize());
    document.getElementById("scamscout-close").addEventListener("click", () => this.close());

    // Make draggable
    this.makeDraggable();
  }

  showResult(analysis) {
    const { score, redFlags, greenFlags } = analysis;
    const statusText = this.getStatusText(score);
    const scoreColor = this.getScoreColor(score);

    // Remove existing overlay if present
    if (this.overlay) {
      this.overlay.remove();
    }
    const existingOverlay = document.getElementById("scamscout-overlay");
    if (existingOverlay) {
      existingOverlay.remove();
    }
    this.overlay = document.createElement("div");
    this.overlay.id = "scamscout-overlay";

    // Calculate SVG ring
    const radius = 52;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (score / 100) * circumference;

    const circumferenceStr = circumference.toFixed(2);
    const offsetStr = offset.toFixed(2);

    let contentHTML = `
      <div class="scamscout-header">
        <div class="scamscout-brand">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          </svg>
          ScamScout
        </div>
        <div class="scamscout-controls">
          <button class="scamscout-btn" id="scamscout-minimize" title="Minimize">−</button>
          <button class="scamscout-btn" id="scamscout-close" title="Close">×</button>
        </div>
      </div>
      <div class="scamscout-score-container">
        <div class="scamscout-score-ring">
          <svg width="120" height="120" viewBox="0 0 120 120">
            <circle class="scamscout-score-ring-bg" cx="60" cy="60" r="${radius}" stroke-dasharray="${circumferenceStr}"/>
            <circle class="scamscout-score-ring-fill" cx="60" cy="60" r="${radius}" 
              stroke="${scoreColor}" 
              stroke-dasharray="${circumferenceStr}" 
              stroke-dashoffset="${offsetStr}"/>
          </svg>
          <div class="scamscout-score-value" style="color: ${scoreColor}">${score}</div>
        </div>
        <div class="scamscout-status" style="color: ${scoreColor}">${statusText}</div>
        <div class="scamscout-subtitle">Fakeness Score</div>
      </div>
      <div class="scamscout-content">
    `;

    if (redFlags.length > 0) {
      contentHTML += `
        <div class="scamscout-section">
          <div class="scamscout-section-title">
            <span style="color: #ff4d4f;">⚠️</span> Red Flags (${redFlags.length})
          </div>
          ${redFlags.slice(0, 5).map(flag => `<div class="scamscout-flag scamscout-red">${this.escapeHtml(flag)}</div>`).join("")}
          ${redFlags.length > 5 ? `<div style="text-align: center; color: #999; font-size: 11px; padding: 4px;">+${redFlags.length - 5} more</div>` : ""}
        </div>
      `;
    }

    if (greenFlags.length > 0) {
      contentHTML += `
        <div class="scamscout-section">
          <div class="scamscout-section-title">
            <span style="color: #52c41a;">✓</span> Positive Signs (${greenFlags.length})
          </div>
          ${greenFlags.slice(0, 5).map(flag => `<div class="scamscout-flag scamscout-green">${this.escapeHtml(flag)}</div>`).join("")}
          ${greenFlags.length > 5 ? `<div style="text-align: center; color: #999; font-size: 11px; padding: 4px;">+${greenFlags.length - 5} more</div>` : ""}
        </div>
      `;
    }

    // Add suggestions
    const suggestions = this.generateSuggestions(score, redFlags, greenFlags);
    contentHTML += `
      <div class="scamscout-section">
        <div class="scamscout-section-title">💡 Tips</div>
        <div class="scamscout-suggestions">
          ${suggestions.slice(0, 4).map(s => `
            <div class="scamscout-suggestion">
              <span class="scamscout-suggestion-icon">${s.split(" ")[0]}</span>
              <span>${s.split(" ").slice(1).join(" ")}</span>
            </div>
          `).join("")}
        </div>
      </div>
    `;

    contentHTML += `</div>`;

    this.overlay.innerHTML = contentHTML;

    document.getElementById("scamscout-minimize").addEventListener("click", () => this.toggleMinimize());
    document.getElementById("scamscout-close").addEventListener("click", () => this.close());
  }

  showMinimized(analysis) {
    const { score } = analysis;
    const scoreColor = this.getScoreColor(score);

    // Remove existing overlay if present
    const existingOverlay = document.getElementById("scamscout-overlay");
    if (existingOverlay) {
      existingOverlay.remove();
    }
    this.overlay = null;

    this.createStyles();
    this.overlay = document.createElement("div");
    this.overlay.id = "scamscout-overlay";
    document.body.appendChild(this.overlay);
    this.isVisible = true;

    this.overlay.className = "scamscout-minimized";
    this.overlay.innerHTML = `
      <div class="scamscout-minimized-badge" id="scamscout-expand">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
        </svg>
        ScamScout
        <span class="scamscout-mini-score" style="border: 1px solid ${scoreColor}">${score}/100</span>
      </div>
    `;

    document.getElementById("scamscout-expand").addEventListener("click", () => this.expand());
    this.makeDraggable();
  }

  toggleMinimize() {
    this.minimized = !this.minimized;
    if (this.minimized) {
      // Store current analysis data
      const currentContent = this.overlay.innerHTML;
      this.overlay.classList.add("scamscout-minimized");
    } else {
      this.overlay.classList.remove("scamscout-minimized");
    }
  }

  expand() {
    this.minimized = false;
    this.overlay.classList.remove("scamscout-minimized");
    // Re-show the full result - this will be called with analysis data
  }

  close() {
    if (this.overlay) {
      this.overlay.remove();
      this.overlay = null;
      this.isVisible = false;
    }
  }

  makeDraggable() {
    if (!this.overlay) return;

    const header = this.overlay.querySelector(".scamscout-header, .scamscout-minimized-badge");
    if (!header) return;

    let isDragging = false;
    let startX, startY, startLeft, startTop;

    const onMouseDown = (e) => {
      if (e.target.classList.contains("scamscout-btn")) return;
      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;

      const rect = this.overlay.getBoundingClientRect();
      startLeft = rect.left;
      startTop = rect.top;

      this.overlay.style.transition = "none";
      e.preventDefault();
    };

    const onMouseMove = (e) => {
      if (!isDragging) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      this.overlay.style.left = (startLeft + dx) + "px";
      this.overlay.style.top = (startTop + dy) + "px";
      this.overlay.style.right = "auto";
    };

    const onMouseUp = () => {
      isDragging = false;
      this.overlay.style.transition = "";
    };

    header.addEventListener("mousedown", onMouseDown);
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  }

  generateSuggestions(score, redFlags, greenFlags) {
    const suggestions = [];

    if (score > 60) {
      suggestions.push("🔍 Research the company independently");
      suggestions.push("🚫 Never pay fees for job applications");
      suggestions.push("📞 Verify contact through official channels");
      suggestions.push("👀 Check reviews on Glassdoor");
    } else if (score > 40) {
      suggestions.push("✅ Verify the company exists");
      suggestions.push("📋 Cross-reference on other job sites");
      suggestions.push("💼 Research typical salary range");
      suggestions.push("📧 Use official company email");
    } else {
      suggestions.push("👍 Appears to be legitimate");
      suggestions.push("📝 Research company before interview");
      suggestions.push("🤝 Prepare for standard interview");
      suggestions.push("📄 Have resume and references ready");
    }

    for (const flag of redFlags) {
      const flagLower = flag.toLowerCase();
      if (flagLower.includes("payment") || flagLower.includes("fee")) {
        const msg = "⚠️ Legitimate employers never ask for payment";
        if (!suggestions.includes(msg)) suggestions.push(msg);
      }
      if (flagLower.includes("whatsapp") || flagLower.includes("telegram")) {
        const msg = "📱 Professional companies use official channels";
        if (!suggestions.includes(msg)) suggestions.push(msg);
      }
    }

    suggestions.push("🔒 Never share personal financial info");
    return suggestions;
  }

  escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }
}

// Export for use in content scripts
if (typeof module !== "undefined" && module.exports) {
  module.exports = { ScamScoutOverlay };
}
