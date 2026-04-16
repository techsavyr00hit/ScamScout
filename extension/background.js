// Background Service Worker

chrome.runtime.onInstalled.addListener(() => {
  console.log("ScamScout extension installed");
});

// Handle ScrappingAnt API requests
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "scrapeUrl") {
    handleScrapeRequest(request, sender, sendResponse);
    return true; // Keep message channel open for async response
  }
});

async function handleScrapeRequest(request, sender, sendResponse) {
  const { url, apiKey } = request;

  console.log("[ScamScout] Scrape request for:", url);

  if (!url || !apiKey) {
    console.error("[ScamScout] Missing URL or API key");
    sendResponse({ success: false, error: "Missing URL or API key" });
    return;
  }

  try {
    // ScrappingAnt API endpoint
    const apiUrl = "https://api.scrappingant.com/v2/general";
    const params = new URLSearchParams({
      api_key: apiKey,
      url: url,
      render_js: "true",
      proxy_country: "us",
    });

    const fullUrl = apiUrl + "?" + params.toString();
    console.log("[ScamScout] Calling ScrappingAnt API...");

    // Add timeout using AbortController
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

    const response = await fetch(fullUrl, {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    console.log("[ScamScout] API response status:", response.status);

    if (!response.ok) {
      const errorBody = await response.text();
      console.error("[ScamScout] API error:", response.status, errorBody);
      sendResponse({ success: false, error: "API error: " + response.status + " - " + errorBody.substring(0, 200) });
      return;
    }

    const html = await response.text();
    console.log("[ScamScout] Received HTML, length:", html.length);

    // Track usage count
    const result = await chrome.storage.sync.get(["apiUsageCount"]);
    const newCount = (result.apiUsageCount || 0) + 1;
    await chrome.storage.sync.set({ apiUsageCount: newCount });

    sendResponse({ success: true, html: html, usageCount: newCount });
  } catch (error) {
    console.error("[ScamScout] Request failed:", error);
    const errorMsg = error.name === "AbortError" ? "Request timed out (30s)" : error.message;
    sendResponse({ success: false, error: errorMsg });
  }
}

// Optional: Show a badge when on a LinkedIn job posting page
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" && tab.url) {
    const isLinkedInJob = tab.url.includes("linkedin.com") && /\/jobs\/view\//i.test(tab.url);

    if (isLinkedInJob) {
      chrome.action.setBadgeText({ text: "SS", tabId: tabId });
      chrome.action.setBadgeBackgroundColor({ color: "#667eea", tabId: tabId });
    } else {
      chrome.action.setBadgeText({ text: "", tabId: tabId });
    }
  }
});
