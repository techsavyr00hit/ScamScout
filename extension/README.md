# ScamScout Browser Extension 🔍

A powerful browser extension that detects fake job postings on the spot. Rates the "fakeness" of job listings across LinkedIn, Indeed, Glassdoor, and more.

## Features

- **Real-time Analysis**: Automatically detects and analyzes job posting pages
- **Smart Detection**: Uses both URL analysis and NLP text analysis
- **Visual Risk Score**: Clear 0-100 score with color-coded indicators
- **In-page Overlay**: See results directly on the job page
- **Popup Analyzer**: Manually analyze any URL or job description
- **Multi-Platform Support**: Works on LinkedIn, Indeed, Glassdoor, Naukri, Monster, ZipRecruiter, CareerBuilder, SimplyHired, Dice, StackOverflow Jobs, and more
- **Red Flags & Green Flags**: Detailed breakdown of suspicious and legitimate indicators
- **Actionable Tips**: Get safety recommendations based on analysis results

## How It Works

The extension uses two complementary analysis engines:

### 1. URL Rules Analysis (70% weight)
- Detects suspicious domain patterns
- Identifies brand impersonation attempts
- Checks for scam keywords in URLs
- Verifies trusted platforms
- Analyzes URL structure and security

### 2. NLP Text Analysis (30% weight)
- Scans job descriptions for scam keywords
- Detects urgency pressure tactics
- Identifies unrealistic promises
- Checks for payment requests
- Analyzes sentiment and language patterns

### Score Interpretation
- **0-29**: ✅ Likely Genuine - Low risk
- **30-49**: ⚠️ Exercise Caution - Some concerns
- **50-69**: 🔶 Suspicious - Verify carefully
- **70-100**: 🚨 High Risk - Likely Scam

## Installation

### Chrome / Edge / Brave

1. Open your browser and navigate to `chrome://extensions/` (or `edge://extensions/` for Edge)
2. Enable **Developer mode** (toggle in the top right)
3. Click **Load unpacked**
4. Select the `extension` folder from this project
5. The extension icon will appear in your toolbar

### Firefox

1. Open Firefox and navigate to `about:debugging`
2. Click **This Firefox** in the left sidebar
3. Click **Load Temporary Add-on**
4. Select any file inside the `extension` folder
5. The extension will be loaded temporarily (needs reloading after browser restart)

## Usage

### Automatic Mode
1. Navigate to any job posting page (LinkedIn, Indeed, etc.)
2. Wait a moment for the page to load
3. The ScamScout overlay will appear automatically with the analysis
4. You can minimize, drag, or close the overlay

### Manual Mode
1. Click the ScamScout extension icon in your toolbar
2. Paste a job URL (auto-filled if you're on a job page)
3. Optionally paste the job description for deeper analysis
4. Click **Analyze**
5. View the risk score, flags, and recommendations

## Detection Categories

### Red Flags Detected
- **Urgency Tactics**: "Apply now", "Limited positions", "Hiring immediately"
- **Payment Requests**: Registration fees, training fees, security deposits
- **Unrealistic Promises**: "Easy money", "No experience needed", "Guaranteed income"
- **Suspicious Language**: Wire transfers, cryptocurrency, gift cards
- **Unprofessional Contact**: WhatsApp-only, personal email addresses
- **MLM/Pyramid Schemes**: "Be your own boss", "Build your team"
- **Data Harvesting**: Requests for SSN, bank accounts, personal info
- **Brand Impersonation**: Fake LinkedIn/Indeed domains
- **URL Red Flags**: Shortened URLs, suspicious TLDs, excessive subdomains

### Positive Indicators
- Education requirements
- Experience requirements
- Benefits mentioned
- Salary transparency
- Company information
- Official application flows
- EEO statements
- Secure connections (HTTPS)

## File Structure

```
extension/
├── manifest.json          # Extension configuration
├── background.js          # Service worker for badges
├── content.js             # Main content script
├── content.css            # Content styles
├── popup.html             # Popup UI
├── popup.css              # Popup styles
├── popup.js               # Popup logic
├── icons/                 # Extension icons
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
├── lib/
│   ├── nlp_detector.js    # NLP analysis engine
│   ├── rules_detector.js  # URL rules engine
│   └── overlay.js         # In-page overlay UI
└── generate_icons.html    # Icon generator (development)
```

## Technical Details

### Content Script Injection
The extension injects a content script on all pages that:
- Detects if the page is a job posting
- Extracts job description text using platform-specific selectors
- Runs the analysis engines
- Displays the overlay with results

### Platform Support
Platform-specific extractors for:
- LinkedIn (`linkedin.com/jobs`)
- Indeed (`indeed.com/viewjob`)
- Glassdoor (`glassdoor.com/Job`)
- Naukri (`naukri.com/job`)
- Monster, ZipRecruiter, CareerBuilder, SimplyHired, Dice, StackOverflow

### Privacy
- **No data collection**: All analysis happens locally in your browser
- **No external requests**: Everything runs client-side
- **No tracking**: Your job search activity stays private

## Known Limitations

1. **Dynamic Content**: Some SPAs may take a moment to load job descriptions. The extension waits 1.5 seconds before extracting content.

2. **LinkedIn Restrictions**: LinkedIn may block automated content extraction. The extension works best when you paste the full job description text.

3. **Content Extraction**: On unsupported platforms, the extension falls back to generic extraction which may not capture all job details.

## Troubleshooting

### Overlay doesn't appear
- Refresh the page
- Make sure the extension is enabled
- Check if you're on a recognized job posting URL

### Analysis seems inaccurate
- Try pasting the full job description in the popup
- Check both URL and description for comprehensive analysis
- The extension weighs URL analysis at 70% and text at 30%

### Extension icon shows badge
- The "SS" badge indicates you're on a recognized job posting page
- Click the icon to see detailed analysis

## Development

### Modifying Detection Rules
Edit the keyword lists and patterns in:
- `lib/nlp_detector.js` - Text analysis patterns
- `lib/rules_detector.js` - URL analysis patterns

### Testing Changes
1. Make your changes
2. Go to `chrome://extensions/`
3. Click the refresh icon on the ScamScout extension
4. Test on job posting pages

## License

This project is open source and available for educational purposes.

## Support

For issues, suggestions, or improvements, please contribute to the project repository.

---

**Stay safe from job scams! 🔒**
