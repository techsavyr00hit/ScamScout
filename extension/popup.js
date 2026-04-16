// Popup Script - Handles user interaction and analysis

(function () {
  "use strict";

  const urlInput = document.getElementById("url-input");
  const descriptionInput = document.getElementById("description-input");
  const analyzeBtn = document.getElementById("analyze-btn");
  const resultSection = document.getElementById("result-section");
  const loadingSection = document.getElementById("loading-section");
  const scoreRing = document.getElementById("score-ring");
  const scoreValue = document.getElementById("score-value");
  const statusText = document.getElementById("status-text");
  const redFlagsContainer = document.getElementById("red-flags");
  const greenFlagsContainer = document.getElementById("green-flags");
  const suggestionsSection = document.getElementById("suggestions-section");
  const suggestionsList = document.getElementById("suggestions-list");
  const scrapingToggle = document.getElementById("scraping-toggle");
  const scrapingConfig = document.getElementById("scraping-config");
  const apiKeyInput = document.getElementById("api-key-input");
  const toggleApiKeyBtn = document.getElementById("toggle-api-key");
  const apiUsageCount = document.getElementById("api-usage-count");

  // Load saved settings
  chrome.storage.sync.get(["scrapingEnabled", "scrapingApiKey", "apiUsageCount"], (result) => {
    if (result.scrapingEnabled !== undefined) {
      scrapingToggle.checked = result.scrapingEnabled;
    }
    if (result.scrapingApiKey) {
      apiKeyInput.value = result.scrapingApiKey;
    }
    if (result.apiUsageCount !== undefined) {
      apiUsageCount.textContent = result.apiUsageCount;
    }
    updateScrapingConfigVisibility();
  });

  scrapingToggle.addEventListener("change", () => {
    updateScrapingConfigVisibility();
    chrome.storage.sync.set({ scrapingEnabled: scrapingToggle.checked });
  });

  apiKeyInput.addEventListener("input", () => {
    chrome.storage.sync.set({ scrapingApiKey: apiKeyInput.value });
  });

  toggleApiKeyBtn.addEventListener("click", () => {
    const isPassword = apiKeyInput.type === "password";
    apiKeyInput.type = isPassword ? "text" : "password";
  });

  function updateScrapingConfigVisibility() {
    if (scrapingToggle.checked) {
      scrapingConfig.classList.add("visible");
    } else {
      scrapingConfig.classList.remove("visible");
    }
  }

  function isJobPostingUrl(url) {
    if (!url) return false;
    try {
      const parsed = new URL(url);
      const host = parsed.host.toLowerCase();
      // Strict: only LinkedIn job view pages
      return host.includes("linkedin.com") && /\/jobs\/view\//i.test(url);
    } catch (e) {
      return false;
    }
  }

  function showNotJobPosting() {
    hideLoading();
    resultSection.style.display = "block";

    // Set a clear "not a job posting" result
    statusText.textContent = "ℹ️ Not a Job Posting";
    statusText.style.color = "#999";
    scoreValue.textContent = "—";
    scoreValue.style.color = "#999";

    const radius = 42;
    const circumference = 2 * Math.PI * radius;
    scoreRing.style.strokeDasharray = circumference.toFixed(2);
    scoreRing.style.strokeDashoffset = "0";
    scoreRing.style.stroke = "#999";

    renderFlags(redFlagsContainer, ["This page is not recognized as a job posting URL"], "red");
    renderFlags(greenFlagsContainer, [], "green");
    renderSuggestions([]);
  }

  // Auto-fill URL if on a job page and auto-analyze
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs && tabs[0] && tabs[0].url) {
      const url = tabs[0].url;
      urlInput.value = url;
      // Auto-trigger analysis after a short delay (only if it's a job posting URL)
      setTimeout(() => {
        const trimmedUrl = urlInput.value.trim();
        if (trimmedUrl && isJobPostingUrl(trimmedUrl)) {
          handleAnalyze();
        }
      }, 300);
    }
  });

  analyzeBtn.addEventListener("click", handleAnalyze);

  // Also allow Enter key to trigger analysis
  urlInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleAnalyze();
    }
  });

  async function handleAnalyze() {
    const url = urlInput.value.trim();
    const description = descriptionInput.value.trim();

    if (!url && !description) {
      showError("Please enter a job URL or description");
      return;
    }

    // Ensure URL has scheme
    let analysisUrl = url;
    if (analysisUrl && !analysisUrl.startsWith("http://") && !analysisUrl.startsWith("https://")) {
      analysisUrl = "https://" + analysisUrl;
    }

    // Check if it's a job posting URL
    if (!isJobPostingUrl(analysisUrl)) {
      showNotJobPosting();
      return;
    }

    // Show loading
    showLoading();

    // Safety timeout - if analysis takes longer than 35s, show error
    const timeoutId = setTimeout(() => {
      showError("Analysis timed out. Check the popup console for details (right-click → Inspect).");
    }, 35000);

    try {
      let scrapedContent = null;

      // Step 1: Scraping (if enabled)
      if (scrapingToggle.checked && apiKeyInput.value.trim() && analysisUrl) {
        console.log("[ScamScout] Scraping enabled, fetching:", analysisUrl);
        scrapedContent = await scrapeWithScrappingAnt(analysisUrl);
      }

      // Step 2: Try content script (if on the same page)
      let contentScriptResult = null;
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

      if (tab && tab.url) {
        const samePage = tab.url === analysisUrl || tab.url === urlInput.value.trim();
        if (samePage) {
          console.log("[ScamScout] Trying content script for:", tab.url);
          try {
            contentScriptResult = await chrome.tabs.sendMessage(tab.id, {
              action: "analyze",
              url: analysisUrl,
              description: scrapedContent || description,
            });
            console.log("[ScamScout] Content script result:", contentScriptResult);
          } catch (e) {
            console.log("[ScamScout] Content script not available:", e.message);
          }
        }
      }

      // Step 3: Determine what to analyze
      if (contentScriptResult && contentScriptResult.valid) {
        clearTimeout(timeoutId);
        displayResult(contentScriptResult);
        return;
      }

      if (scrapedContent && scrapedContent.length > 50) {
        console.log("[ScamScout] Using scraped content, length:", scrapedContent.length);
        const result = performLocalAnalysis(analysisUrl, scrapedContent);
        clearTimeout(timeoutId);
        displayResult(result);
        return;
      }

      if (description) {
        console.log("[ScamScout] Using manual description input");
        const result = performLocalAnalysis(analysisUrl, description);
        clearTimeout(timeoutId);
        displayResult(result);
        return;
      }

      // Step 4: If nothing worked, show error with guidance
      clearTimeout(timeoutId);
      showError("Could not analyze this URL. Try pasting the job description text below, or check the console for errors (right-click → Inspect).");
    } catch (error) {
      clearTimeout(timeoutId);
      console.error("[ScamScout] Analysis error:", error);
      showError("Analysis failed: " + error.message);
    }
  }

  async function scrapeWithScrappingAnt(url) {
    try {
      // Validate and clean the URL
      let cleanUrl;
      try {
        cleanUrl = new URL(url).toString();
      } catch (e) {
        console.error("[ScamScout] Invalid URL:", url, e.message);
        return null;
      }

      // Call ScrappingAnt API directly from popup
      const apiUrl = "https://api.scrappingant.com/v2/general";
      const params = new URLSearchParams();
      params.set("api_key", apiKeyInput.value.trim());
      params.set("url", cleanUrl);
      params.set("render_js", "true");
      params.set("proxy_country", "us");

      console.log("[ScamScout] Calling ScrappingAnt API for:", cleanUrl);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 25000); // 25s timeout

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          api_key: apiKeyInput.value.trim(),
          url: cleanUrl,
          render_js: true,
          proxy_country: "us",
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      console.log("[ScamScout] API response status:", response.status);

      if (!response.ok) {
        const errorBody = await response.text();
        console.error("[ScamScout] API error:", response.status, errorBody);
        return null;
      }

      const html = await response.text();
      console.log("[ScamScout] Received HTML, length:", html.length);

      // Track usage count locally
      const currentCount = parseInt(apiUsageCount.textContent || "0", 10);
      const newCount = currentCount + 1;
      apiUsageCount.textContent = newCount;
      chrome.storage.sync.set({ apiUsageCount: newCount });

      // Extract job-related text from the scraped HTML
      const jobContent = extractJobContent(html);
      console.log("[ScamScout] Extracted job content length:", jobContent.length);
      return jobContent;
    } catch (error) {
      console.error("[ScamScout] Scraping error:", error);
      return null;
    }
  }

  function extractJobContent(html) {
    // Parse HTML and extract meaningful job content
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");

    // Remove scripts, styles, nav, footer, sidebar noise
    const removeSelectors = [
      "script", "style", "nav", "footer", "aside", "header",
      ".sidebar", ".nav", ".menu", ".breadcrumb", ".related-jobs",
      ".similar-jobs", ".job-search-suggestion", ".ads",
    ];
    removeSelectors.forEach((sel) => {
      doc.querySelectorAll(sel).forEach((el) => el.remove());
    });

    // Try to find main job content area
    const contentSelectors = [
      "main", "[role='main']", "article", ".job-details", "#job-details",
      ".jobDescriptionContent", "#jobDescriptionText", ".description",
      ".job_description", ".posting-content", ".job-view",
    ];

    for (const selector of contentSelectors) {
      const el = doc.querySelector(selector);
      if (el && el.innerText.trim().length > 100) {
        return el.innerText.trim();
      }
    }

    // Fallback: grab body text
    const body = doc.body;
    if (body) {
      return body.innerText.trim();
    }

    return "";
  }

  function performLocalAnalysis(url, description) {
    const rulesResult = analyzeRules(url);
    const nlpResult = analyzeJobPosting(url, description);

    // Combine scores (70% rules, 30% NLP)
    let combinedScore = Math.round(rulesResult.score * 0.7 + nlpResult.score * 0.3);
    combinedScore = Math.max(0, Math.min(100, combinedScore));

    // Merge flags
    const redFlags = [];
    const greenFlags = [];

    for (const flag of rulesResult.redFlags) {
      if (!redFlags.includes(flag)) redFlags.push(flag);
    }
    for (const flag of nlpResult.redFlags) {
      if (!redFlags.includes(flag)) redFlags.push(flag);
    }

    for (const flag of rulesResult.greenFlags) {
      if (!greenFlags.includes(flag)) greenFlags.push(flag);
    }
    for (const flag of nlpResult.greenFlags) {
      if (!greenFlags.includes(flag)) greenFlags.push(flag);
    }

    return {
      score: combinedScore,
      redFlags,
      greenFlags,
      valid: rulesResult.valid || nlpResult.valid,
    };
  }

  function showLoading() {
    loadingSection.style.display = "block";
    resultSection.style.display = "none";
    analyzeBtn.disabled = true;
  }

  function hideLoading() {
    loadingSection.style.display = "none";
    analyzeBtn.disabled = false;
  }

  function displayResult(analysis) {
    hideLoading();

    const { score, redFlags, greenFlags } = analysis;

    // Determine status text and color
    const statusInfo = getStatusInfo(score);
    statusText.textContent = statusInfo.text;
    statusText.style.color = statusInfo.color;
    scoreValue.textContent = score;
    scoreValue.style.color = statusInfo.color;

    // Update ring
    const radius = 42;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (score / 100) * circumference;

    scoreRing.style.strokeDasharray = circumference.toFixed(2);
    scoreRing.style.strokeDashoffset = offset.toFixed(2);
    scoreRing.style.stroke = statusInfo.color;

    // Render red flags
    renderFlags(redFlagsContainer, redFlags, "red");

    // Render green flags
    renderFlags(greenFlagsContainer, greenFlags, "green");

    // Render suggestions
    const suggestions = generateSuggestions(score, redFlags, greenFlags);
    renderSuggestions(suggestions);

    // Show result section
    resultSection.style.display = "block";
  }

  function renderFlags(container, flags, type) {
    container.innerHTML = "";

    if (flags.length === 0) {
      container.innerHTML = '<div class="empty-state">No ' + type + ' flags found</div>';
      return;
    }

    flags.slice(0, 5).forEach((flag) => {
      const item = document.createElement("div");
      item.className = "flag-item " + type;
      item.textContent = flag;
      container.appendChild(item);
    });

    if (flags.length > 5) {
      const more = document.createElement("div");
      more.className = "empty-state";
      more.textContent = "+" + (flags.length - 5) + " more";
      container.appendChild(more);
    }
  }

  function renderSuggestions(suggestions) {
    suggestionsList.innerHTML = "";

    if (suggestions.length === 0) {
      suggestionsSection.style.display = "none";
      return;
    }

    suggestions.slice(0, 4).forEach((suggestion) => {
      const parts = suggestion.split(" ");
      const icon = parts[0];
      const text = parts.slice(1).join(" ");

      const item = document.createElement("div");
      item.className = "suggestion-item";
      item.innerHTML = '<span class="suggestion-icon">' + icon + '</span><span>' + escapeHtml(text) + "</span>";
      suggestionsList.appendChild(item);
    });

    suggestionsSection.style.display = "block";
  }

  function getStatusInfo(score) {
    if (score < 30) {
      return { text: "✅ Likely Genuine", color: "#52c41a" };
    }
    if (score < 50) {
      return { text: "⚠️ Exercise Caution", color: "#faad14" };
    }
    if (score < 70) {
      return { text: "🔶 Suspicious", color: "#fa8c16" };
    }
    return { text: "🚨 High Risk - Likely Scam", color: "#ff4d4f" };
  }

  function generateSuggestions(score, redFlags, greenFlags) {
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

  function showError(message) {
    hideLoading();
    resultSection.style.display = "none";

    // Create a temporary error message
    const errorDiv = document.createElement("div");
    errorDiv.className = "suggestion-item";
    errorDiv.style.background = "#fff1f0";
    errorDiv.style.color = "#820000";
    errorDiv.innerHTML = '<span class="suggestion-icon">⚠️</span><span>' + escapeHtml(message) + "</span>";

    // Insert after input section
    const inputSection = document.querySelector(".input-section");
    const existingError = inputSection.parentNode.querySelector(".temp-error");
    if (existingError) existingError.remove();

    errorDiv.classList.add("temp-error");
    inputSection.parentNode.insertBefore(errorDiv, inputSection.nextSibling);

    setTimeout(() => {
      errorDiv.remove();
    }, 4000);
  }

  function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }
})();
