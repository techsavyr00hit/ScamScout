// NLP Detector - Ported from Python nlp_detector.js

const SCAM_KEYWORDS = {
  urgency: {
    keywords: [
      "urgent hiring", "immediate start", "apply now", "limited positions",
      "act fast", "don't miss out", "expires today", "last chance",
      "hiring immediately", "start today", "now hiring", "quick apply",
    ],
    weight: 12,
    description: "Urgency pressure tactics",
  },
  payment: {
    keywords: [
      "registration fee", "training fee", "processing fee", "security deposit",
      "pay upfront", "wire money", "send money", "payment required",
      "invest money", "buy equipment", "purchase kit", "starter fee",
      "background check fee", "application fee", "joining fee",
    ],
    weight: 20,
    description: "Payment-related red flags",
  },
  unrealistic: {
    keywords: [
      "earn money fast", "quick money", "easy money", "get rich",
      "no experience needed", "no skills required", "work from home guaranteed",
      "make thousands", "high income", "unlimited earnings", "guaranteed income",
      "$$$", "earn $", "make $", "income guaranteed",
    ],
    weight: 18,
    description: "Unrealistic promises",
  },
  suspicious: {
    keywords: [
      "click here", "limited time offer", "exclusive opportunity",
      "guaranteed job", "100% legitimate", "no interview", "cash payment",
      "money order", "western union", "cryptocurrency", "wire transfer",
      "prepaid card", "gift card",
    ],
    weight: 15,
    description: "Suspicious language",
  },
  contact: {
    keywords: [
      "whatsapp only", "telegram only", "text only", "call now",
      "personal email", "gmail job", "yahoo job", "hotmail job",
      "reply to this email", "send resume to", "contact via",
    ],
    weight: 15,
    description: "Unprofessional contact methods",
  },
  mlm: {
    keywords: [
      "be your own boss", "unlimited potential", "residual income",
      "passive income", "network marketing", "mlm", "multi-level",
      "downline", "upline", "recruit others", "build your team",
    ],
    weight: 17,
    description: "MLM/pyramid scheme indicators",
  },
  data_harvesting: {
    keywords: [
      "verify your identity", "confirm your ssn", "social security",
      "bank account", "credit card", "paypal account", "personal information",
      "full name and address", "date of birth", "mother's maiden",
    ],
    weight: 22,
    description: "Potential data harvesting",
  },
};

const CONTEXT_PATTERNS = [
  [/(?:earn)\s+\$?\d+.*?(?:day|week|month)/i, 20, "Specific earning claims"],
  [/(?:no|without)\s+(?:experience|skills|qualification)/i, 15, "No experience required claims"],
  [/(?:guaranteed|100%)\s+(?:job|income|success)/i, 20, "Guaranteed outcomes"],
  [/(?:only|just)\s+\d+\s+(?:hours?|spots?|positions?)/i, 12, "Artificial scarcity"],
  [/(?:free|no cost)\s+(?:training|equipment|startup)/i, 15, "Free offers (potential bait)"],
  [/(?:work from|working from)\s+(?:home|anywhere)/i, 8, "Work from home emphasis"],
  [/(?:immediate|instant)\s+(?:start|hiring|income)/i, 15, "Immediate gratification promises"],
  [/(?:limited|few)\s+(?:time|spots?|positions?|openings?)/i, 12, "Scarcity tactics"],
  [/(?:must|should)\s+(?:act|apply|respond)\s+(?:now|fast|quickly)/i, 15, "Urgency commands"],
  [/(?:earn|make)\s+(?:money|income|cash)\s+(?:from|while)/i, 12, "Money-making emphasis"],
  [/(?:registration|processing|training|application)\s+fee/i, 25, "Fee request language"],
  [/(?:contact|message)\s+(?:us|me)?\s*(?:on|via)?\s*(?:whatsapp|telegram)/i, 18, "Messaging app contact request"],
  [/(?:submit|send)\s+(?:your)?\s*(?:cv|resume)\s+(?:to|via)\s+(?:gmail|yahoo|hotmail|outlook)/i, 18, "Resume submission to personal email"],
];

const POSITIVE_INDICATORS = [
  [/(?:bachelor|master|phd|degree)\s+(?:required|preferred)/i, -10, "Education requirements"],
  [/(?:\d+\+?\s*years?)\s+(?:experience|background)/i, -8, "Experience requirements"],
  [/(?:benefits|health insurance|401k|pto|vacation)/i, -12, "Benefits mentioned"],
  [/(?:company|organization)\s+(?:description|overview|about)/i, -8, "Company information provided"],
  [/(?:job|position)\s+(?:description|responsibilities|duties)/i, -10, "Job details provided"],
  [/(?:salary|compensation)\s+(?:range|package|DOE)/i, -10, "Salary transparency"],
  [/(?:equal opportunity|diversity|inclusion)/i, -8, "EEO statement"],
  [/(?:background check|drug test|reference)/i, -5, "Standard screening mentioned"],
  [/(?:apply on company site|official careers page|corporate careers)/i, -10, "Official application flow"],
  [/(?:hybrid|onsite|remote within)/i, -5, "Specific work arrangement details"],
];

const NEGATIVE_CONTEXTS = {
  "no experience needed": [
    /entry\s+level/i,
    /training\s+provided/i,
    /intern(ship)?/i,
    /graduate/i,
  ],
  "work from home guaranteed": [
    /hybrid/i,
    /remote\s+within/i,
    /remote\s+role/i,
  ],
};

const URL_POSITIVE_TOKENS = {
  careers: [-6, "Careers page URL"],
  jobs: [-4, "Job listing URL"],
  job: [-3, "Job-related URL"],
  apply: [-3, "Application path"],
  greenhouse: [-8, "Applicant tracking system path"],
  lever: [-8, "Applicant tracking system path"],
  workday: [-8, "Applicant tracking system path"],
};

function normalizeText(textContent = "", url = "") {
  const normalizedParts = [];

  if (textContent) {
    let decodedText;
    try {
      decodedText = decodeURIComponent(textContent);
    } catch (e) {
      // Not URL-encoded text, use as-is
      decodedText = textContent;
    }
    const processedText = decodedText.replace(/[_\-./?=&:%]+/g, " ").toLowerCase();
    const cleanedText = processedText.replace(/\s+/g, " ").trim();
    normalizedParts.push(cleanedText);
  }

  if (url) {
    let decodedUrl;
    try {
      decodedUrl = decodeURIComponent(url);
    } catch (e) {
      decodedUrl = url;
    }
    if (!/^[a-zA-Z]+:\/\//.test(decodedUrl)) {
      decodedUrl = "https://" + decodedUrl;
    }
    try {
      const parsedUrl = new URL(decodedUrl);
      const urlComponents = [];
      if (parsedUrl.hostname) {
        urlComponents.push(parsedUrl.hostname.replace(/[.\-]/g, " "));
      }
      if (parsedUrl.pathname) {
        urlComponents.push(parsedUrl.pathname.replace(/[\/\-]/g, " "));
      }
      if (parsedUrl.search) {
        urlComponents.push(parsedUrl.search.replace(/[&=?]/g, " "));
      }
      if (parsedUrl.hash) {
        urlComponents.push(parsedUrl.hash);
      }
      const processedUrlParts = urlComponents.filter(Boolean).join(" ").toLowerCase();
      const cleanedUrl = processedUrlParts.replace(/\s+/g, " ").trim();
      if (cleanedUrl) {
        normalizedParts.push(cleanedUrl);
      }
    } catch (e) {
      // Invalid URL, skip
    }
  }

  return normalizedParts.join(" ").trim();
}

function analyzeKeywords(url, jobDescription) {
  const issues = [];
  let score = 0;
  const combinedText = normalizeText(jobDescription, url);

  for (const [category, data] of Object.entries(SCAM_KEYWORDS)) {
    const categoryMatches = [];
    for (const keyword of data.keywords) {
      if (combinedText.toLowerCase().includes(keyword.toLowerCase())) {
        categoryMatches.push(keyword);
      }
    }

    if (categoryMatches.length > 0) {
      const matchCount = new Set(categoryMatches).size;
      const categoryScore = Math.min(data.weight * matchCount, data.weight * 2);
      score += categoryScore;
      const matchedText = categoryMatches.slice(0, 3).join(", ");
      issues.push(data.description + ": " + matchedText);
    }
  }

  return { score, issues };
}

function analyzeContextPatterns(url, jobDescription) {
  const issues = [];
  let score = 0;
  const combinedText = normalizeText(jobDescription, url);

  for (const [pattern, points, description] of CONTEXT_PATTERNS) {
    if (pattern.test(combinedText)) {
      score += points;
      issues.push(description);
    }
  }

  return { score, issues };
}

function checkPositiveIndicators(url, jobDescription) {
  const positiveFlags = [];
  let scoreReduction = 0;
  const combinedText = normalizeText(jobDescription, url);

  for (const [pattern, points, description] of POSITIVE_INDICATORS) {
    if (pattern.test(combinedText)) {
      scoreReduction += points;
      positiveFlags.push(description);
    }
  }

  if (url) {
    try {
      let parsed;
      if (/^[a-zA-Z]+:\/\//.test(url)) {
        parsed = new URL(url);
      } else {
        parsed = new URL("https://" + url);
      }

      const urlText = parsed.hostname + " " + parsed.pathname;
      const urlTokens = urlText.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);

      const suspiciousWords = ["whatsapp", "telegram", "fee", "deposit", "urgent", "guaranteed"];
      const suspiciousUrlContext = urlTokens.some(token => suspiciousWords.includes(token));

      for (const [token, [points, description]] of Object.entries(URL_POSITIVE_TOKENS)) {
        if (urlTokens.includes(token)) {
          if (!suspiciousUrlContext) {
            scoreReduction += points;
            positiveFlags.push(description);
          }
        }
      }
    } catch (e) {
      // Invalid URL, skip
    }
  }

  return { scoreReduction, positiveFlags };
}

function analyzeSentimentIndicators(jobDescription) {
  const issues = [];
  let score = 0;

  if (!jobDescription) {
    return { score, issues };
  }

  let uppercaseCount = 0;
  for (const char of jobDescription) {
    if (char === char.toUpperCase() && char !== char.toLowerCase()) {
      uppercaseCount++;
    }
  }
  const capsRatio = uppercaseCount / Math.max(jobDescription.length, 1);
  if (capsRatio > 0.3) {
    score += 10;
    issues.push("Excessive use of capital letters in description");
  }

  const exclamationCount = (jobDescription.match(/!/g) || []).length;
  if (exclamationCount > 3) {
    score += 8;
    issues.push("Excessive exclamation marks in description");
  }

  const dollarCount = (jobDescription.match(/\$/g) || []).length;
  if (dollarCount > 2) {
    score += 10;
    issues.push("Excessive dollar signs in description");
  }

  return { score, issues };
}

function adjustForBalancedContext(text, score, redFlags, greenFlags) {
  const normalizedText = normalizeText(text);
  let reduction = 0;

  for (const [phrase, safePatterns] of Object.entries(NEGATIVE_CONTEXTS)) {
    if (normalizedText.includes(phrase)) {
      for (const pattern of safePatterns) {
        if (pattern.test(normalizedText)) {
          reduction += 8;
          greenFlags.push("Potentially legitimate context around '" + phrase + "'");
          break;
        }
      }
    }
  }

  const tokenCount = normalizedText.split(/\s+/).filter(Boolean).length;
  if (tokenCount > 25) {
    reduction += 5;
    greenFlags.push("Detailed posting text");
  }

  const filteredRedFlags = [];
  for (const flag of redFlags) {
    let shouldRemove = false;
    for (const greenFlag of greenFlags) {
      if (greenFlag.includes("Potentially legitimate context around 'no experience needed'")) {
        if (flag === "No experience required claims" || flag.includes("Unrealistic promises: no experience needed")) {
          shouldRemove = true;
        }
      }
    }
    if (!shouldRemove) {
      filteredRedFlags.push(flag);
    }
  }

  const finalScore = Math.max(0, score - reduction);
  return { score: finalScore, redFlags: filteredRedFlags, greenFlags };
}

function analyzeJobPosting(url = "", jobDescription = "") {
  const redFlags = [];
  const greenFlags = [];
  let score = 0;

  if (!url && !jobDescription) {
    return { score: 0, redFlags: [], greenFlags: [], valid: false };
  }

  const { score: keywordScore, issues: keywordIssues } = analyzeKeywords(url, jobDescription);
  score += keywordScore;
  redFlags.push(...keywordIssues);

  const { score: patternScore, issues: patternIssues } = analyzeContextPatterns(url, jobDescription);
  score += patternScore;
  redFlags.push(...patternIssues);

  const { scoreReduction, positiveFlags } = checkPositiveIndicators(url, jobDescription);
  score += scoreReduction;
  greenFlags.push(...positiveFlags);

  const { score: sentimentScore, issues: sentimentIssues } = analyzeSentimentIndicators(jobDescription);
  score += sentimentScore;
  redFlags.push(...sentimentIssues);

  const adjusted = adjustForBalancedContext(jobDescription, score, redFlags, greenFlags);
  score = adjusted.score;
  redFlags.length = 0;
  redFlags.push(...adjusted.redFlags);
  greenFlags.length = 0;
  greenFlags.push(...adjusted.greenFlags);

  score = Math.max(0, Math.min(100, score));

  return { score, redFlags, greenFlags, valid: true };
}

// Export for use in other scripts
if (typeof module !== "undefined" && module.exports) {
  module.exports = { analyzeJobPosting, normalizeText };
}
