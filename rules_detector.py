import re
from urllib.parse import urlparse

TRUSTED_PLATFORMS = {
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
}

TRUSTED_HOSTS = {
    "linkedin.com",
    "www.linkedin.com",
    "indeed.com",
    "www.indeed.com",
    "glassdoor.com",
    "www.glassdoor.com",
    "naukri.com",
    "www.naukri.com",
    "monster.com",
    "www.monster.com",
    "ziprecruiter.com",
    "www.ziprecruiter.com",
    "careerbuilder.com",
    "www.careerbuilder.com",
    "simplyhired.com",
    "www.simplyhired.com",
    "dice.com",
    "www.dice.com",
    "stackoverflow.com",
}

JOB_PATH_PATTERNS = [
    r"job",
    r"career",
    r"position",
    r"vacancy",
    r"opening",
    r"apply",
    r"hiring",
    r"recruit",
    r"employment",
    r"work",
    r"internship",
    r"roles",
    r"talent",
    r"jobs/",
    r"careers/",
    r"apply/",
    r"viewjob",
    r"job-posting",
    r"req=",
    r"id=",
]

BRAND_IMPERSONATION_PATTERNS = [
    (r"linkedin(?!\.com$)", 20, "Possible LinkedIn impersonation"),
    (r"indeed(?!\.com$)", 20, "Possible Indeed impersonation"),
    (r"glassdoor(?!\.com$)", 20, "Possible Glassdoor impersonation"),
    (r"naukri(?!\.com$)", 20, "Possible Naukri impersonation"),
]

SUSPICIOUS_PATTERNS = [
    (
        r"(^|[^a-z0-9])(bit\.ly|tinyurl\.com|goo\.gl|t\.co|short\.link)(/|$)",
        25,
        "Shortened URL (hides destination)",
    ),
    (r"free.*job|job.*free", 15, "Suspicious 'free job' pattern"),
    (r"earn.*\d+.*day|\d+.*earn.*day", 20, "Unrealistic earning claims in URL"),
    (r"work.*home.*\d+|\d+.*work.*home", 15, "Suspicious work-from-home pattern"),
    (r"hiring.*now|now.*hiring", 10, "Urgency language in URL"),
    (r"no.*experience|experience.*not.*required", 15, "No experience claims"),
    (r"guaranteed|100%|legitimate", 20, "Suspicious guarantees"),
    (r"whatsapp|telegram|wechat", 25, "Messaging app references"),
    (r"@\w+\.(gmail|yahoo|hotmail|outlook)", 20, "Personal email in URL"),
    (
        r"tel:\+?\d[\d\-]{6,}",
        15,
        "Phone number link (tel: scheme)",
    ),
    (
        r"(?:call|contact|phone|tel)[\s_=:]*\+?\d[\d\-]+",
        15,
        "Phone/contact number explicitly in URL",
    ),
]

SUSPICIOUS_DOMAINS = [
    (r"\.xyz$", 15, ".xyz domain (commonly used for scams)"),
    (r"\.tk$", 20, ".tk domain (free, often abused)"),
    (r"\.ml$", 20, ".ml domain (free, often abused)"),
    (r"\.ga$", 20, ".ga domain (free, often abused)"),
    (r"\.cf$", 20, ".cf domain (free, often abused)"),
    (r"\.gq$", 20, ".gq domain (free, often abused)"),
    (r"\.top$", 10, ".top domain (suspicious TLD)"),
    (r"\.click$", 15, ".click domain (suspicious TLD)"),
    (r"\.loan$", 20, ".loan domain (suspicious TLD)"),
    (r"\.work$", 10, ".work domain (verify legitimacy)"),
]


def analyze_url_structure(url):
    issues = []
    score = 0

    try:
        parsed = urlparse(url)
        domain = parsed.netloc.lower().split("@")[-1]
        hostname = domain.split(":")[0]
        full_url = url.lower()
        path_and_query = parsed.path + " " + parsed.query
        path_and_query = path_and_query.lower()
        host_and_path = hostname + parsed.path
        host_and_path = host_and_path.lower()

        if re.match(r"\d+\.\d+\.\d+\.\d+", hostname):
            score += 30
            issues.append("Uses IP address instead of domain name")

        for pattern, points, message in SUSPICIOUS_DOMAINS:
            if re.search(pattern, hostname, re.IGNORECASE):
                score += points
                issues.append(message)

        for pattern, points, message in BRAND_IMPERSONATION_PATTERNS:
            if re.search(pattern, hostname, re.IGNORECASE):
                if hostname not in TRUSTED_HOSTS:
                    score += points
                    issues.append(message)

        for pattern, points, message in SUSPICIOUS_PATTERNS:
            if "Shortened URL" in message:
                target_text = full_url
            else:
                target_text = path_and_query
            if re.search(pattern, target_text, re.IGNORECASE):
                score += points
                issues.append(message)

        subdomain_count = hostname.count(".")
        if subdomain_count > 3:
            score += 15
            issues.append("Excessive subdomains (" + str(subdomain_count) + " levels)")

        hyphen_count = hostname.count("-")
        if hyphen_count >= 3:
            score += 10
            issues.append("Excessive hyphens in domain")

        digit_count = 0
        for char in hostname:
            if char.isdigit():
                digit_count += 1
        if digit_count >= 5:
            score += 10
            issues.append("Excessive digits in domain")

        if "@" in parsed.netloc:
            score += 20
            issues.append("Uses @ in URL authority section")

        if re.search(r"(fee|deposit|payment|whatsapp|telegram|quick-money|easy-money)", path_and_query, re.IGNORECASE):
            score += 15
            issues.append("Suspicious job-scam keywords in URL path")

        if re.search(r"(careers|jobs|apply)", host_and_path, re.IGNORECASE):
            if re.search(r"(fee|deposit|payment|whatsapp|telegram)", path_and_query, re.IGNORECASE) == False:
                score -= 8
                issues.append("Recognizable career-page structure")

        if len(url) > 150:
            score += 10
            issues.append("Unusually long URL")

        if re.search(r'[<>"{}|\\^`]', url):
            score += 15
            issues.append("Contains suspicious characters")

        if "%" in url:
            encoded_count = url.count("%")
            if encoded_count > 3:
                score += 10
                issues.append("Multiple encoded characters")

    except Exception as e:
        score += 10
        issues.append("Unable to parse URL structure")

    return score, issues


def analyze_trusted_platforms(url):
    parsed = urlparse(url)
    hostname = parsed.netloc.lower().split("@")[-1].split(":")[0]
    green_flags = []
    score_reduction = 0

    for platform, confidence in TRUSTED_PLATFORMS.items():
        if "/" in platform:
            parts = platform.split("/")
            platform_host = parts[0]
            platform_path = "/" + "/".join(parts[1:])
        else:
            platform_host = platform
            platform_path = ""

        host_match = False
        if hostname == platform_host:
            host_match = True
        if hostname.endswith("." + platform_host):
            host_match = True

        path_match = False
        if platform_path == "":
            path_match = True
        if parsed.path.startswith(platform_path):
            path_match = True

        if host_match and path_match:
            green_flags.append("Trusted platform: " + platform)
            if confidence > score_reduction:
                score_reduction = confidence

    return score_reduction, green_flags


def analyze_url_security(url):
    red_flags = []
    green_flags = []
    score = 0

    if "http://" in url:
        score += 15
        red_flags.append("Not secure (HTTP instead of HTTPS)")
    elif "https://" in url:
        score -= 5
        green_flags.append("Secure connection (HTTPS)")

    parsed = urlparse(url)
    hostname = parsed.netloc.lower().split("@")[-1].split(":")[0]

    if re.search(r"company|corp|inc|ltd|llc", hostname, re.IGNORECASE):
        score -= 5
        green_flags.append("Appears to be company website")

    if re.search(r"job|career|position|vacancy|opening|apply", parsed.path, re.IGNORECASE):
        score -= 5
        green_flags.append("Job-related URL structure")

    if hostname:
        hostname_parts = hostname.split(".")
        if len(hostname_parts) >= 2:
            if re.search(r"[^a-z0-9.-]", hostname) == False:
                score -= 3
                green_flags.append("Clean hostname format")

    return score, red_flags, green_flags


def analyze_brand_impersonation(url):
    red_flags = []
    score = 0
    parsed = urlparse(url)
    hostname = parsed.netloc.lower().split("@")[-1].split(":")[0]

    for platform in TRUSTED_PLATFORMS.keys():
        platform_domain = platform.split("/")[0]

        if len(hostname) == len(platform_domain):
            differences = 0
            for a, b in zip(hostname, platform_domain):
                if a != b:
                    differences += 1
            if differences == 1:
                score += 30
                red_flags.append("Possible typo/impersonation of " + platform_domain)

        platform_without_dots = platform_domain.replace(".", "")
        hostname_without_dots = hostname.replace(".", "")
        if platform_without_dots in hostname_without_dots:
            if hostname not in TRUSTED_HOSTS:
                score += 25
                red_flags.append("Potential brand impersonation: '" + platform_domain + "' related pattern found in non-trusted host.")

    if re.search(r"[01]", hostname):
        has_other_chars = False
        for char in hostname:
            if char != "0" and char != "1":
                has_other_chars = True
        if has_other_chars == False:
            for trusted_host in TRUSTED_HOSTS:
                substituted = trusted_host.replace("o", "0").replace("l", "1")
                if substituted == hostname:
                    score += 20
                    red_flags.append("Suspicious character substitution (e.g., '0' for 'o', '1' for 'l')")
                    break

    return score, red_flags


def is_job_posting_url(url):
    parsed = urlparse(url)
    path = parsed.path.lower()
    query = parsed.query.lower()
    path_and_query = path + "?" + query

    for pattern in JOB_PATH_PATTERNS:
        if pattern.lower() in path_and_query:
            return True

    if parsed.path == "/" or parsed.path == "":
        return False

    return False


def analyze_domain_age_indicators(url):
    issues = []
    score = 0

    parsed = urlparse(url)
    hostname = parsed.netloc.lower().split("@")[-1].split(":")[0]

    domain_parts = hostname.split(".")
    first_part = domain_parts[0]
    if len(first_part) < 5:
        if hostname not in TRUSTED_HOSTS:
            score += 10
            issues.append("Short, generic domain name (might be recently registered)")

    return score, issues


def analyze_rules(url):
    red_flags = []
    green_flags = []
    score = 0

    if url == "":
        return {"score": 0, "red_flags": [], "green_flags": [], "valid": False}

    if not url.startswith(("http://", "https://")):
        url = "https://" + url

    if is_job_posting_url(url) == False:
        return {
            "score": 0,
            "red_flags": ["Not a recognized job posting URL (no job-related path found)"],
            "green_flags": [],
            "valid": False,
        }

    structure_score, structure_issues = analyze_url_structure(url)
    score += structure_score
    for flag in structure_issues:
        red_flags.append(flag)

    security_score, security_red, security_green = analyze_url_security(url)
    score += security_score
    for flag in security_red:
        red_flags.append(flag)
    for flag in security_green:
        green_flags.append(flag)

    impersonation_score, impersonation_flags = analyze_brand_impersonation(url)
    score += impersonation_score
    for flag in impersonation_flags:
        red_flags.append(flag)

    domain_score, domain_issues = analyze_domain_age_indicators(url)
    score += domain_score
    for flag in domain_issues:
        red_flags.append(flag)

    trusted_reduction, trusted_flags = analyze_trusted_platforms(url)
    score -= trusted_reduction
    for flag in trusted_flags:
        green_flags.append(flag)

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
