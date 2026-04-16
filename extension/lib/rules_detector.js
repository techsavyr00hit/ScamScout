// Rules Detector - Ported from Python rules_detector.js

const TRUSTED_PLATFORMS = {
  "linkedin.com": 30,
  "indeed.com": 25,
  "glassdoor.com": 25,
  "naukri.com": 25,
  "monster.com": 20,
  "ziprecruiter.com": 20,
  "careerbuilder.com": 20,
  "simplyhired.com": 15,
  "dice.com": 15,
  "stackoverflow.com/jobs": 25,
};

const TRUSTED_HOSTS = new Set([
  "linkedin.com", "www.linkedin.com",
  "indeed.com", "www.indeed.com",
  "glassdoor.com", "www.glassdoor.com",
  "naukri.com", "www.naukri.com",
  "monster.com", "www.monster.com",
  "ziprecruiter.com", "www.ziprecruiter.com",
  "careerbuilder.com", "www.careerbuilder.com",
  "simplyhired.com", "www.simplyhired.com",
  "dice.com", "www.dice.com",
  "stackoverflow.com",
]);

const JOB_PATH_PATTERNS = [
  "job", "career", "position", "vacancy", "opening", "apply", "hiring",
  "recruit", "employment", "work", "internship", "roles", "talent",
  "jobs/", "careers/", "apply/", "viewjob", "job-posting", "req=", "id=",
];

const BRAND_IMPERSONATION_PATTERNS = [
  [/linkedin(?!\.com$)/i, 20, "Possible LinkedIn impersonation"],
  [/indeed(?!\.com$)/i, 20, "Possible Indeed impersonation"],
  [/glassdoor(?!\.com$)/i, 20, "Possible Glassdoor impersonation"],
  [/naukri(?!\.com$)/i, 20, "Possible Naukri impersonation"],
];

const SUSPICIOUS_PATTERNS = [
  [/(^|[^a-z0-9])(bit\.ly|tinyurl\.com|goo\.gl|t\.co|short\.link)(\/|$)/i, 25, "Shortened URL (hides destination)"],
  [/free.*job|job.*free/i, 15, "Suspicious 'free job' pattern"],
  [/earn.*\d+.*day|\d+.*earn.*day/i, 20, "Unrealistic earning claims in URL"],
  [/work.*home.*\d+|\d+.*work.*home/i, 15, "Suspicious work-from-home pattern"],
  [/hiring.*now|now.*hiring/i, 10, "Urgency language in URL"],
  [/no.*experience|experience.*not.*required/i, 15, "No experience claims"],
  [/guaranteed|100%|legitimate/i, 20, "Suspicious guarantees"],
  [/whatsapp|telegram|wechat/i, 25, "Messaging app references"],
  [/@\w+\.(gmail|yahoo|hotmail|outlook)/i, 20, "Personal email in URL"],
  [/tel:\+?\d[\d\-]{6,}/i, 15, "Phone number link (tel: scheme)"],
  [/(?:call|contact|phone|tel)[\s_=:]*\+?\d[\d\-]+/i, 15, "Phone/contact number explicitly in URL"],
];

const SUSPICIOUS_DOMAINS = [
  [/\.xyz$/i, 15, ".xyz domain (commonly used for scams)"],
  [/\.tk$/i, 20, ".tk domain (free, often abused)"],
  [/\.ml$/i, 20, ".ml domain (free, often abused)"],
  [/\.ga$/i, 20, ".ga domain (free, often abused)"],
  [/\.cf$/i, 20, ".cf domain (free, often abused)"],
  [/\.gq$/i, 20, ".gq domain (free, often abused)"],
  [/\.top$/i, 10, ".top domain (suspicious TLD)"],
  [/\.click$/i, 15, ".click domain (suspicious TLD)"],
  [/\.loan$/i, 20, ".loan domain (suspicious TLD)"],
  [/\.work$/i, 10, ".work domain (verify legitimacy)"],
];

function analyzeUrlStructure(url) {
  const issues = [];
  let score = 0;

  try {
    let parsed;
    if (/^[a-zA-Z]+:\/\//.test(url)) {
      parsed = new URL(url);
    } else {
      parsed = new URL("https://" + url);
    }

    const domain = parsed.host.toLowerCase().split("@").pop();
    const hostname = domain.split(":")[0];
    const fullUrl = url.toLowerCase();
    const pathAndQuery = (parsed.pathname + " " + parsed.search).toLowerCase();
    const hostAndPath = (hostname + parsed.pathname).toLowerCase();

    if (/^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {
      score += 30;
      issues.push("Uses IP address instead of domain name");
    }

    for (const [pattern, points, message] of SUSPICIOUS_DOMAINS) {
      if (pattern.test(hostname)) {
        score += points;
        issues.push(message);
      }
    }

    for (const [pattern, points, message] of BRAND_IMPERSONATION_PATTERNS) {
      if (pattern.test(hostname)) {
        if (!TRUSTED_HOSTS.has(hostname)) {
          score += points;
          issues.push(message);
        }
      }
    }

    for (const [pattern, points, message] of SUSPICIOUS_PATTERNS) {
      const targetText = message.includes("Shortened URL") ? fullUrl : pathAndQuery;
      if (pattern.test(targetText)) {
        score += points;
        issues.push(message);
      }
    }

    const subdomainCount = (hostname.match(/\./g) || []).length;
    if (subdomainCount > 3) {
      score += 15;
      issues.push("Excessive subdomains (" + subdomainCount + " levels)");
    }

    const hyphenCount = (hostname.match(/-/g) || []).length;
    if (hyphenCount >= 3) {
      score += 10;
      issues.push("Excessive hyphens in domain");
    }

    const digitCount = (hostname.match(/\d/g) || []).length;
    if (digitCount >= 5) {
      score += 10;
      issues.push("Excessive digits in domain");
    }

    if (parsed.host.includes("@")) {
      score += 20;
      issues.push("Uses @ in URL authority section");
    }

    if (/fee|deposit|payment|whatsapp|telegram|quick-money|easy-money/i.test(pathAndQuery)) {
      score += 15;
      issues.push("Suspicious job-scam keywords in URL path");
    }

    if (/careers|jobs|apply/i.test(hostAndPath)) {
      if (!/fee|deposit|payment|whatsapp|telegram/i.test(pathAndQuery)) {
        score -= 8;
        issues.push("Recognizable career-page structure");
      }
    }

    if (url.length > 150) {
      score += 10;
      issues.push("Unusually long URL");
    }

    if (/[<>"{}|\\^`]/.test(url)) {
      score += 15;
      issues.push("Contains suspicious characters");
    }

    const encodedCount = (url.match(/%/g) || []).length;
    if (encodedCount > 3) {
      score += 10;
      issues.push("Multiple encoded characters");
    }
  } catch (e) {
    score += 10;
    issues.push("Unable to parse URL structure");
  }

  return { score, issues };
}

function analyzeTrustedPlatforms(url) {
  let parsed;
  try {
    if (/^[a-zA-Z]+:\/\//.test(url)) {
      parsed = new URL(url);
    } else {
      parsed = new URL("https://" + url);
    }
  } catch (e) {
    return { scoreReduction: 0, greenFlags: [] };
  }

  const hostname = parsed.host.toLowerCase().split("@").pop().split(":")[0];
  const greenFlags = [];
  let scoreReduction = 0;

  for (const [platform, confidence] of Object.entries(TRUSTED_PLATFORMS)) {
    let platformHost, platformPath;
    if (platform.includes("/")) {
      const parts = platform.split("/");
      platformHost = parts[0];
      platformPath = "/" + parts.slice(1).join("/");
    } else {
      platformHost = platform;
      platformPath = "";
    }

    const hostMatch = hostname === platformHost || hostname.endsWith("." + platformHost);
    const pathMatch = platformPath === "" || parsed.pathname.startsWith(platformPath);

    if (hostMatch && pathMatch) {
      greenFlags.push("Trusted platform: " + platform);
      if (confidence > scoreReduction) {
        scoreReduction = confidence;
      }
    }
  }

  return { scoreReduction, greenFlags };
}

function analyzeUrlSecurity(url) {
  const redFlags = [];
  const greenFlags = [];
  let score = 0;

  if (url.startsWith("http://")) {
    score += 15;
    redFlags.push("Not secure (HTTP instead of HTTPS)");
  } else if (url.startsWith("https://")) {
    score -= 5;
    greenFlags.push("Secure connection (HTTPS)");
  }

  try {
    let parsed;
    if (/^[a-zA-Z]+:\/\//.test(url)) {
      parsed = new URL(url);
    } else {
      parsed = new URL("https://" + url);
    }

    const hostname = parsed.host.toLowerCase().split("@").pop().split(":")[0];

    if (/company|corp|inc|ltd|llc/i.test(hostname)) {
      score -= 5;
      greenFlags.push("Appears to be company website");
    }

    if (/job|career|position|vacancy|opening|apply/i.test(parsed.pathname)) {
      score -= 5;
      greenFlags.push("Job-related URL structure");
    }

    if (hostname) {
      const hostnameParts = hostname.split(".");
      if (hostnameParts.length >= 2) {
        if (!/[^a-z0-9.-]/.test(hostname)) {
          score -= 3;
          greenFlags.push("Clean hostname format");
        }
      }
    }
  } catch (e) {
    // Ignore
  }

  return { score, redFlags, greenFlags };
}

function analyzeBrandImpersonation(url) {
  const redFlags = [];
  let score = 0;

  try {
    let parsed;
    if (/^[a-zA-Z]+:\/\//.test(url)) {
      parsed = new URL(url);
    } else {
      parsed = new URL("https://" + url);
    }

    const hostname = parsed.host.toLowerCase().split("@").pop().split(":")[0];

    for (const platform of Object.keys(TRUSTED_PLATFORMS)) {
      const platformDomain = platform.split("/")[0];

      if (hostname.length === platformDomain.length) {
        let differences = 0;
        for (let i = 0; i < hostname.length; i++) {
          if (hostname[i] !== platformDomain[i]) {
            differences++;
          }
        }
        if (differences === 1) {
          score += 30;
          redFlags.push("Possible typo/impersonation of " + platformDomain);
        }
      }

      const platformWithoutDots = platformDomain.replace(/\./g, "");
      const hostnameWithoutDots = hostname.replace(/\./g, "");
      if (hostnameWithoutDots.includes(platformWithoutDots)) {
        if (!TRUSTED_HOSTS.has(hostname)) {
          score += 25;
          redFlags.push("Potential brand impersonation: '" + platformDomain + "' related pattern found in non-trusted host.");
        }
      }
    }

    if (/[01]/.test(hostname)) {
      const hasOtherChars = [...hostname].some(c => c !== "0" && c !== "1");
      if (!hasOtherChars) {
        for (const trustedHost of TRUSTED_HOSTS) {
          const substituted = trustedHost.replace(/o/g, "0").replace(/l/g, "1");
          if (substituted === hostname) {
            score += 20;
            redFlags.push("Suspicious character substitution (e.g., '0' for 'o', '1' for 'l')");
            break;
          }
        }
      }
    }
  } catch (e) {
    // Ignore
  }

  return { score, redFlags };
}

function isJobPostingUrl(url) {
  try {
    let parsed;
    if (/^[a-zA-Z]+:\/\//.test(url)) {
      parsed = new URL(url);
    } else {
      parsed = new URL("https://" + url);
    }

    const pathAndQuery = (parsed.pathname + "?" + parsed.search).toLowerCase();

    for (const pattern of JOB_PATH_PATTERNS) {
      if (pathAndQuery.includes(pattern.toLowerCase())) {
        return true;
      }
    }

    if (parsed.pathname === "/" || parsed.pathname === "") {
      return false;
    }

    return false;
  } catch (e) {
    return false;
  }
}

function analyzeDomainAgeIndicators(url) {
  const issues = [];
  let score = 0;

  try {
    let parsed;
    if (/^[a-zA-Z]+:\/\//.test(url)) {
      parsed = new URL(url);
    } else {
      parsed = new URL("https://" + url);
    }

    const hostname = parsed.host.toLowerCase().split("@").pop().split(":")[0];
    const domainParts = hostname.split(".");
    const firstPart = domainParts[0];

    if (firstPart.length < 5) {
      if (!TRUSTED_HOSTS.has(hostname)) {
        score += 10;
        issues.push("Short, generic domain name (might be recently registered)");
      }
    }
  } catch (e) {
    // Ignore
  }

  return { score, issues };
}

function analyzeRules(url) {
  const redFlags = [];
  const greenFlags = [];
  let score = 0;

  if (!url) {
    return { score: 0, redFlags: [], greenFlags: [], valid: false };
  }

  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    url = "https://" + url;
  }

  if (!isJobPostingUrl(url)) {
    return {
      score: 0,
      redFlags: ["Not a recognized job posting URL (no job-related path found)"],
      greenFlags: [],
      valid: false,
    };
  }

  const { score: structureScore, issues: structureIssues } = analyzeUrlStructure(url);
  score += structureScore;
  redFlags.push(...structureIssues);

  const { score: securityScore, redFlags: securityRed, greenFlags: securityGreen } = analyzeUrlSecurity(url);
  score += securityScore;
  redFlags.push(...securityRed);
  greenFlags.push(...securityGreen);

  const { score: impersonationScore, redFlags: impersonationFlags } = analyzeBrandImpersonation(url);
  score += impersonationScore;
  redFlags.push(...impersonationFlags);

  const { score: domainScore, issues: domainIssues } = analyzeDomainAgeIndicators(url);
  score += domainScore;
  redFlags.push(...domainIssues);

  const { scoreReduction, greenFlags: trustedFlags } = analyzeTrustedPlatforms(url);
  score -= scoreReduction;
  greenFlags.push(...trustedFlags);

  score = Math.max(0, Math.min(100, score));

  return { score, redFlags, greenFlags, valid: true };
}

// Export for use in other scripts
if (typeof module !== "undefined" && module.exports) {
  module.exports = { analyzeRules, isJobPostingUrl };
}
