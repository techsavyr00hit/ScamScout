// Content Script - Runs on job posting pages, extracts content, and triggers analysis

(function () {
  "use strict";

  // ── Platform-specific extractors ──────────────────────────────────────

  const EXTRACTORS = {
    "linkedin.com": extractLinkedInJob,
    "indeed.com": extractIndeedJob,
    "glassdoor.com": extractGlassdoorJob,
    "naukri.com": extractNaukriJob,
    "monster.com": extractGenericJob,
    "ziprecruiter.com": extractGenericJob,
    "careerbuilder.com": extractGenericJob,
    "simplyhired.com": extractGenericJob,
    "dice.com": extractGenericJob,
    "stackoverflow.com": extractStackOverflowJob,
  };

  function extractLinkedInJob() {
    const jobData = { url: window.location.href, description: "" };

    // Try to find job description section
    const descriptionSelectors = [
      "#job-details",
      "[data-view-name='job-details']",
      ".job-details",
      "[id*='job-details']",
      "section[data-view-name='job-details']",
    ];

    for (const selector of descriptionSelectors) {
      const el = document.querySelector(selector);
      if (el && el.textContent.trim().length > 50) {
        jobData.description = el.textContent.trim();
        break;
      }
    }

    // Fallback: look for content near "About the job" heading
    if (!jobData.description) {
      const allText = document.body.innerText;
      const aboutJobMatch = allText.match(/About the job[\s\S]*?(?=\n\s*(?:About the company|How you match|Job insights|Meet the hiring team|Qualifications|Skills|Benefits)|$)/i);
      if (aboutJobMatch) {
        jobData.description = aboutJobMatch[0].trim();
      }
    }

    // Last resort: grab main content area
    if (!jobData.description) {
      const mainContent = document.querySelector("main, [role='main'], .core-section-container");
      if (mainContent) {
        jobData.description = mainContent.innerText.trim();
      }
    }

    return jobData;
  }

  function extractIndeedJob() {
    const jobData = { url: window.location.href, description: "" };

    const descriptionSelectors = [
      "#jobDescriptionText",
      ".jobsearch-JobDescription",
      "[data-testid='job-details-job-description']",
      "#jobDescriptionText .inline",
      ".jobseen-beacon-container + *",
    ];

    for (const selector of descriptionSelectors) {
      const el = document.querySelector(selector);
      if (el && el.textContent.trim().length > 50) {
        jobData.description = el.textContent.trim();
        break;
      }
    }

    if (!jobData.description) {
      const mainContent = document.querySelector("main, #mosaic-provider-jobcards, .jobsearch-ViewjobComponents");
      if (mainContent) {
        jobData.description = mainContent.innerText.trim();
      }
    }

    return jobData;
  }

  function extractGlassdoorJob() {
    const jobData = { url: window.location.href, description: "" };

    const descriptionSelectors = [
      ".jobDescriptionContent",
      "[data-test='job-details']",
      ".desc",
      ".jobDetails",
    ];

    for (const selector of descriptionSelectors) {
      const el = document.querySelector(selector);
      if (el && el.textContent.trim().length > 50) {
        jobData.description = el.textContent.trim();
        break;
      }
    }

    if (!jobData.description) {
      const mainContent = document.querySelector("main, .details, .jobContainer");
      if (mainContent) {
        jobData.description = mainContent.innerText.trim();
      }
    }

    return jobData;
  }

  function extractNaukriJob() {
    const jobData = { url: window.location.href, description: "" };

    const descriptionSelectors = [
      ".description",
      "#jobDescription",
      ".job-description",
      ".details",
    ];

    for (const selector of descriptionSelectors) {
      const el = document.querySelector(selector);
      if (el && el.textContent.trim().length > 50) {
        jobData.description = el.textContent.trim();
        break;
      }
    }

    if (!jobData.description) {
      const mainContent = document.querySelector("main, .job, .job-details");
      if (mainContent) {
        jobData.description = mainContent.innerText.trim();
      }
    }

    return jobData;
  }

  function extractStackOverflowJob() {
    const jobData = { url: window.location.href, description: "" };

    const descriptionSelectors = [
      ".s-prose",
      ".post-text",
      ".job-description",
      "#job-details",
    ];

    for (const selector of descriptionSelectors) {
      const el = document.querySelector(selector);
      if (el && el.textContent.trim().length > 50) {
        jobData.description = el.textContent.trim();
        break;
      }
    }

    if (!jobData.description) {
      const mainContent = document.querySelector("main, [itemtype='http://schema.org/JobPosting']");
      if (mainContent) {
        jobData.description = mainContent.innerText.trim();
      }
    }

    return jobData;
  }

  function extractGenericJob() {
    const jobData = { url: window.location.href, description: "" };

    // Generic approach: look for common job description patterns
    const descriptionSelectors = [
      ".description",
      ".job-description",
      "#job-description",
      ".job_description",
      "#jobDescription",
      "[class*='job-description']",
      "[id*='job-description']",
      ".details",
      "article",
    ];

    for (const selector of descriptionSelectors) {
      const el = document.querySelector(selector);
      if (el && el.textContent.trim().length > 100) {
        jobData.description = el.textContent.trim();
        break;
      }
    }

    if (!jobData.description) {
      const mainContent = document.querySelector("main, [role='main'], .content, #content");
      if (mainContent) {
        jobData.description = mainContent.innerText.trim();
      }
    }

    return jobData;
  }

  // ── Determine if current page is a job posting ────────────────────────

  function isJobPostingPage() {
    const url = window.location.href;
    const hostname = window.location.hostname.toLowerCase();

    // Strict: only LinkedIn job view pages
    if (hostname.includes("linkedin.com") && /\/jobs\/view\//i.test(url)) {
      return true;
    }

    return false;
  }

  // ── Main analysis flow ────────────────────────────────────────────────

  function extractJobData() {
    const hostname = window.location.hostname.toLowerCase();

    // Try platform-specific extractor
    for (const [domain, extractor] of Object.entries(EXTRACTORS)) {
      if (hostname.includes(domain) || hostname.includes("www." + domain)) {
        return extractor();
      }
    }

    // Fallback to generic extractor
    return extractGenericJob();
  }

  function analyzeAndShowResult() {
    if (isAnalyzing) {
      return;
    }

    if (!isJobPostingPage()) {
      // Close overlay if navigating away from job page
      if (overlay.isVisible) {
        overlay.close();
      }
      return;
    }

    isAnalyzing = true;

    // Wait a bit for dynamic content to load
    setTimeout(() => {
      const jobData = extractJobData();

      if (!jobData.description || jobData.description.length < 30) {
        // Not enough content to analyze, show minimal overlay with URL only
        showResultForData(jobData.url, "");
        isAnalyzing = false;
        return;
      }

      showResultForData(jobData.url, jobData.description);
      isAnalyzing = false;
    }, 1500); // Wait for SPA content to load
  }

  function showResultForData(url, description) {
    // Check if we have a cached result for this URL
    const storageKey = "scamscout_result_" + url;
    chrome.storage.local.get([storageKey], (cachedData) => {
      if (cachedData[storageKey]) {
        // Use cached result immediately
        console.log("[ScamScout] Using cached result for:", url);
        overlay.showResult(cachedData[storageKey]);
        isAnalyzing = false;
        return;
      }

      // No cache, show loading and run analysis
      overlay.showLoading();

      const rulesResult = analyzeRules(url);
      const nlpResult = analyzeJobPosting(url, description);

      let combinedScore = Math.round(rulesResult.score * 0.7 + nlpResult.score * 0.3);
      combinedScore = Math.max(0, Math.min(100, combinedScore));

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

      const analysis = {
        score: combinedScore,
        redFlags,
        greenFlags,
        valid: rulesResult.valid || nlpResult.valid,
      };

      // Cache the result
      chrome.storage.local.set({ [storageKey]: analysis });

      overlay.showResult(analysis);
      isAnalyzing = false;
    });
  }

  // ── Mutation observer for SPAs ────────────────────────────────────────

  function setupSpaObserver() {
    let hasRun = false;

    const observer = new MutationObserver((mutations) => {
      if (hasRun) return;

      // Check if URL changed to a job page
      if (isJobPostingPage()) {
        hasRun = true;
        analyzeAndShowResult();

        // Reset after 3 seconds to allow navigation
        setTimeout(() => {
          hasRun = false;
        }, 3000);
      }
    });

    observer.observe(document.body || document.documentElement, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    // Also listen for history changes (LinkedIn uses pushState)
    // Since pushState/popState don't fire reliably, poll the URL
    let lastUrl = window.location.href;
    setInterval(() => {
      const currentUrl = window.location.href;
      if (currentUrl !== lastUrl) {
        lastUrl = currentUrl;
        if (isJobPostingPage()) {
          analyzeAndShowResult();
        } else {
          if (overlay.isVisible) {
            overlay.close();
          }
        }
      }
    }, 1500);
  }

  // ── Initialize ────────────────────────────────────────────────────────

  const overlay = new ScamScoutOverlay();
  let isAnalyzing = false;

  // Wait for DOM to be ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      analyzeAndShowResult();
      setupSpaObserver();
    });
  } else {
    analyzeAndShowResult();
    setupSpaObserver();
  }

  // Listen for messages from popup
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "analyze") {
      const url = request.url || window.location.href;
      const description = request.description || "";

      const rulesResult = analyzeRules(url);
      const nlpResult = analyzeJobPosting(url, description);

      let combinedScore = Math.round(rulesResult.score * 0.7 + nlpResult.score * 0.3);
      combinedScore = Math.max(0, Math.min(100, combinedScore));

      const redFlags = [...new Set([...rulesResult.redFlags, ...nlpResult.redFlags])];
      const greenFlags = [...new Set([...rulesResult.greenFlags, ...nlpResult.greenFlags])];

      sendResponse({
        score: combinedScore,
        redFlags,
        greenFlags,
        valid: rulesResult.valid || nlpResult.valid,
      });
    }

    if (request.action === "showOverlay") {
      const analysis = request.analysis;
      if (analysis) {
        overlay.showResult(analysis);
      }
    }

    if (request.action === "closeOverlay") {
      overlay.close();
      sendResponse({ closed: true });
    }

    return true; // Keep message channel open for async response
  });
})();
