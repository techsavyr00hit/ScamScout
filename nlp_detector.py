import re
from urllib.parse import unquote, urlparse

SCAM_KEYWORDS = {
    "urgency": {
        "keywords": [
            "urgent hiring",
            "immediate start",
            "apply now",
            "limited positions",
            "act fast",
            "don't miss out",
            "expires today",
            "last chance",
            "hiring immediately",
            "start today",
            "now hiring",
            "quick apply",
        ],
        "weight": 12,
        "description": "Urgency pressure tactics",
    },
    "payment": {
        "keywords": [
            "registration fee",
            "training fee",
            "processing fee",
            "security deposit",
            "pay upfront",
            "wire money",
            "send money",
            "payment required",
            "invest money",
            "buy equipment",
            "purchase kit",
            "starter fee",
            "background check fee",
            "application fee",
            "joining fee",
        ],
        "weight": 20,
        "description": "Payment-related red flags",
    },
    "unrealistic": {
        "keywords": [
            "earn money fast",
            "quick money",
            "easy money",
            "get rich",
            "no experience needed",
            "no skills required",
            "work from home guaranteed",
            "make thousands",
            "high income",
            "unlimited earnings",
            "guaranteed income",
            "$$$",
            "earn $",
            "make $",
            "income guaranteed",
        ],
        "weight": 18,
        "description": "Unrealistic promises",
    },
    "suspicious": {
        "keywords": [
            "click here",
            "limited time offer",
            "exclusive opportunity",
            "guaranteed job",
            "100% legitimate",
            "no interview",
            "cash payment",
            "money order",
            "western union",
            "cryptocurrency",
            "wire transfer",
            "prepaid card",
            "gift card",
        ],
        "weight": 15,
        "description": "Suspicious language",
    },
    "contact": {
        "keywords": [
            "whatsapp only",
            "telegram only",
            "text only",
            "call now",
            "personal email",
            "gmail job",
            "yahoo job",
            "hotmail job",
            "reply to this email",
            "send resume to",
            "contact via",
        ],
        "weight": 15,
        "description": "Unprofessional contact methods",
    },
    "mlm": {
        "keywords": [
            "be your own boss",
            "unlimited potential",
            "residual income",
            "passive income",
            "network marketing",
            "mlm",
            "multi-level",
            "downline",
            "upline",
            "recruit others",
            "build your team",
        ],
        "weight": 17,
        "description": "MLM/pyramid scheme indicators",
    },
    "data_harvesting": {
        "keywords": [
            "verify your identity",
            "confirm your ssn",
            "social security",
            "bank account",
            "credit card",
            "paypal account",
            "personal information",
            "full name and address",
            "date of birth",
            "mother's maiden",
        ],
        "weight": 22,
        "description": "Potential data harvesting",
    },
}

CONTEXT_PATTERNS = [
    (r"earn\s+\$?\d+.*?(?:day|week|month)", 20, "Specific earning claims"),
    (
        r"(?:no|without)\s+(?:experience|skills|qualification)",
        15,
        "No experience required claims",
    ),
    (r"(?:guaranteed|100%)\s+(?:job|income|success)", 20, "Guaranteed outcomes"),
    (r"(?:only|just)\s+\d+\s+(?:hours?|spots?|positions?)", 12, "Artificial scarcity"),
    (
        r"(?:free|no cost)\s+(?:training|equipment|startup)",
        15,
        "Free offers (potential bait)",
    ),
    (r"(?:work from|working from)\s+(?:home|anywhere)", 8, "Work from home emphasis"),
    (
        r"(?:immediate|instant)\s+(?:start|hiring|income)",
        15,
        "Immediate gratification promises",
    ),
    (r"(?:limited|few)\s+(?:time|spots?|positions?|openings?)", 12, "Scarcity tactics"),
    (
        r"(?:must|should)\s+(?:act|apply|respond)\s+(?:now|fast|quickly)",
        15,
        "Urgency commands",
    ),
    (
        r"(?:earn|make)\s+(?:money|income|cash)\s+(?:from|while)",
        12,
        "Money-making emphasis",
    ),
    (
        r"(?:registration|processing|training|application)\s+fee",
        25,
        "Fee request language",
    ),
    (
        r"(?:contact|message)\s+(?:us|me)?\s*(?:on|via)?\s*(?:whatsapp|telegram)",
        18,
        "Messaging app contact request",
    ),
    (
        r"(?:submit|send)\s+(?:your)?\s*(?:cv|resume)\s+(?:to|via)\s+(?:gmail|yahoo|hotmail|outlook)",
        18,
        "Resume submission to personal email",
    ),
]

POSITIVE_INDICATORS = [
    (
        r"(?:bachelor|master|phd|degree)\s+(?:required|preferred)",
        -10,
        "Education requirements",
    ),
    (r"(?:\d+\+?\s*years?)\s+(?:experience|background)", -8, "Experience requirements"),
    (r"(?:benefits|health insurance|401k|pto|vacation)", -12, "Benefits mentioned"),
    (
        r"(?:company|organization)\s+(?:description|overview|about)",
        -8,
        "Company information provided",
    ),
    (
        r"(?:job|position)\s+(?:description|responsibilities|duties)",
        -10,
        "Job details provided",
    ),
    (r"(?:salary|compensation)\s+(?:range|package|DOE)", -10, "Salary transparency"),
    (r"(?:equal opportunity|diversity|inclusion)", -8, "EEO statement"),
    (r"(?:background check|drug test|reference)", -5, "Standard screening mentioned"),
    (
        r"(?:apply on company site|official careers page|corporate careers)",
        -10,
        "Official application flow",
    ),
    (r"(?:hybrid|onsite|remote within)", -5, "Specific work arrangement details"),
]

NEGATIVE_CONTEXTS = {
    "no experience needed": [
        r"entry\s+level",
        r"training\s+provided",
        r"intern(ship)?",
        r"graduate",
    ],
    "work from home guaranteed": [
        r"hybrid",
        r"remote\s+within",
        r"remote\s+role",
    ],
}

URL_POSITIVE_TOKENS = {
    "careers": (-6, "Careers page URL"),
    "jobs": (-4, "Job listing URL"),
    "job": (-3, "Job-related path"),
    "apply": (-3, "Application path"),
    "greenhouse": (-8, "Applicant tracking system path"),
    "lever": (-8, "Applicant tracking system path"),
    "workday": (-8, "Applicant tracking system path"),
}


def normalize_text(text_content="", url=""):
    normalized_parts = []

    if text_content:
        decoded_text = unquote(text_content)
        processed_text = re.sub(r"[_\-./?=&:%]+", " ", decoded_text).lower()
        processed_text = re.sub(r"\s+", " ", processed_text).strip()
        normalized_parts.append(processed_text)

    if url:
        decoded_url = unquote(url)
        if re.match(r"^[a-zA-Z]+://", decoded_url) == False:
            decoded_url = "https://" + decoded_url
        parsed_url = urlparse(decoded_url)

        url_components = []
        if parsed_url.netloc:
            url_components.append(parsed_url.netloc.replace(".", " ").replace("-", " "))
        if parsed_url.path:
            url_components.append(parsed_url.path.replace("/", " ").replace("-", " "))
        if parsed_url.query:
            url_components.append(parsed_url.query.replace("&", " ").replace("=", " "))
        if parsed_url.fragment:
            url_components.append(parsed_url.fragment)

        processed_url_parts = " ".join(part for part in url_components if part).lower()
        processed_url_parts = re.sub(r"\s+", " ", processed_url_parts).strip()
        if processed_url_parts:
            normalized_parts.append(processed_url_parts)

    return " ".join(normalized_parts).strip()


def analyze_keywords(url, job_description):
    issues = []
    score = 0

    combined_text = normalize_text(text_content=job_description, url=url)

    for category, data in SCAM_KEYWORDS.items():
        category_matches = []
        for keyword in data["keywords"]:
            if keyword.lower() in combined_text:
                category_matches.append(keyword)

        if len(category_matches) > 0:
            match_count = len(set(category_matches))
            category_score = min(data["weight"] * match_count, data["weight"] * 2)
            score += category_score
            matched_text = ", ".join(category_matches[:3])
            issues.append(data["description"] + ": " + matched_text)

    return score, issues


def analyze_context_patterns(url, job_description):
    issues = []
    score = 0

    combined_text = normalize_text(text_content=job_description, url=url)
    for pattern, points, description in CONTEXT_PATTERNS:
        if re.search(pattern, combined_text, re.IGNORECASE):
            score += points
            issues.append(description)

    return score, issues


def check_positive_indicators(url, job_description):
    positive_flags = []
    score_reduction = 0

    combined_text = normalize_text(text_content=job_description, url=url)
    for pattern, points, description in POSITIVE_INDICATORS:
        if re.search(pattern, combined_text, re.IGNORECASE):
            score_reduction += points
            positive_flags.append(description)

    if url:
        if re.match(r"^[a-zA-Z]+://", url):
            parsed = urlparse(url)
        else:
            parsed = urlparse("https://" + url)

        url_text = parsed.netloc + " " + parsed.path
        url_tokens = re.split(r"[^a-zA-Z0-9]+", url_text.lower())
        url_tokens = [token for token in url_tokens if token != ""]

        suspicious_words = ["whatsapp", "telegram", "fee", "deposit", "urgent", "guaranteed"]
        suspicious_url_context = False
        for token in url_tokens:
            if token in suspicious_words:
                suspicious_url_context = True

        for token, (points, description) in URL_POSITIVE_TOKENS.items():
            if token in url_tokens:
                if suspicious_url_context == False:
                    score_reduction += points
                    positive_flags.append(description)

    return score_reduction, positive_flags


def analyze_sentiment_indicators(job_description):
    issues = []
    score = 0

    if job_description == "":
        return 0, []

    uppercase_count = 0
    for char in job_description:
        if char.isupper():
            uppercase_count += 1
    caps_ratio = uppercase_count / max(len(job_description), 1)
    if caps_ratio > 0.3:
        score += 10
        issues.append("Excessive use of capital letters in description")

    exclamation_count = job_description.count("!")
    if exclamation_count > 3:
        score += 8
        issues.append("Excessive exclamation marks in description")

    dollar_count = job_description.count("$")
    if dollar_count > 2:
        score += 10
        issues.append("Excessive dollar signs in description")

    return score, issues


def adjust_for_balanced_context(text, score, red_flags, green_flags):
    normalized_text = normalize_text(text)
    reduction = 0

    for phrase, safe_patterns in NEGATIVE_CONTEXTS.items():
        if phrase in normalized_text:
            for pattern in safe_patterns:
                if re.search(pattern, normalized_text, re.IGNORECASE):
                    reduction += 8
                    green_flags.append("Potentially legitimate context around '" + phrase + "'")
                    break

    token_count = len(normalized_text.split())
    if token_count > 25:
        reduction += 5
        green_flags.append("Detailed posting text")

    filtered_red_flags = []
    for flag in red_flags:
        should_remove = False
        for green_flag in green_flags:
            if "Potentially legitimate context around 'no experience needed'" in green_flag:
                if flag == "No experience required claims" or flag == "Unrealistic promises: no experience needed":
                    should_remove = True
        if should_remove == False:
            filtered_red_flags.append(flag)

    final_score = max(0, score - reduction)
    return final_score, filtered_red_flags, green_flags


def analyze_job_posting(url="", job_description=""):
    red_flags = []
    green_flags = []
    score = 0

    if url == "" and job_description == "":
        return {"score": 0, "red_flags": [], "green_flags": [], "valid": False}

    keyword_score, keyword_issues = analyze_keywords(url, job_description)
    score += keyword_score
    for flag in keyword_issues:
        red_flags.append(flag)

    pattern_score, pattern_issues = analyze_context_patterns(url, job_description)
    score += pattern_score
    for flag in pattern_issues:
        red_flags.append(flag)

    positive_reduction, positive_flags = check_positive_indicators(url, job_description)
    score += positive_reduction
    for flag in positive_flags:
        green_flags.append(flag)

    sentiment_score, sentiment_issues = analyze_sentiment_indicators(job_description)
    score += sentiment_score
    for flag in sentiment_issues:
        red_flags.append(flag)

    score, red_flags, green_flags = adjust_for_balanced_context(
        job_description, score, red_flags, green_flags
    )

    if score < 0:
        score = 0
    if score > 100:
        score = 100

    return {
        "score": score,
        "red_flags": red_flags,
        "green_flags": green_flags,
        "valid": True,
    }


def get_keyword_categories():
    categories = {}
    for category, data in SCAM_KEYWORDS.items():
        categories[category] = data["description"]
    return categories
