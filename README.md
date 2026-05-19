# DarkScope

DarkScope is a Chrome extension for detecting deceptive interface patterns on live web pages. It scans the active tab, highlights suspicious UI elements directly on the page, and summarizes how strongly the page may be pushing, confusing, or steering the user.

It is built for two audiences:

- `User mode` explains how a pattern may affect a person using the site.
- `Designer mode` keeps the scan more audit-oriented and adds interface-focused suggestions.

![DarkScope home view](images\image.png)

## How It Helps

- Warns users before they commit to a purchase, sign-up flow, or consent action.
- Helps designers and researchers review pages for manipulative patterns with visible evidence.
- Turns raw detections into a simple risk/impact summary plus principle-level scoring.
- Makes findings easier to inspect by drawing an on-page overlay around detected elements.

## Results You Get

After a scan, the popup shows:

- number of detected issues
- a user risk level or designer impact score
- the most affected ethical principle
- per-rule explanations
- per-rule suggestions in `Designer mode`
- an overlay toggle to show or hide highlights on the page


![Results summary | User mode](images\image-4.png)
![Explanation of a deceptive pattern | User mode](images\image-5.png)

The principle scoring maps findings to seven principles:

- `P1` Intent clarity
- `P2` Ethical intent
- `P3` No forced persuasion
- `P4` Privacy
- `P5` Third-party sharing
- `P6` Unbiased outcomes
- `P7` Designer responsibility

![Profile Scoring](images\image-3.png)

## Setup

### Requirements

- Node.js
- npm
- Google Chrome or another Chromium browser that supports Manifest V3

### Install Dependencies

```bash
npm install
```

### Configure Gemini (Optional but Recommended)

DarkScope can run without Gemini, but some features degrade without it.

Gemini is used for:

- explanation and recommendation generation
- some page-classification fallback cases
- the language inconsistency rule (`KO-13`)

Set your API key in `src/config/secrets.ts`:

```ts
export const GEMINI_API_KEY = 'your-gemini-api-key';
```

If you leave the key empty, the core scan still runs, but LLM-backed features may be skipped or show fallback messages.

## Build

Create the extension bundle:

```bash
npm run build
```

The build output is written to `dist/`.

## Load Unpacked In Chrome

1. Run `npm run build`.
2. Open `chrome://extensions`.
3. Enable `Developer mode` in the top-right corner.
4. Click `Load unpacked`.
5. Select the repo's `dist` folder.
6. Pin the extension if you want quicker access from the toolbar.

## How To Use

1. Open a normal `http` or `https` webpage.
2. Click the DarkScope extension icon.
3. Choose `User mode` or `Designer mode`.
4. Click `Run analysis`.
5. Review the summary and open the detailed findings.
6. Use the focus action in the details view to jump to a detected issue.

## Notes

- Chrome internal pages, extension pages, and similar restricted tabs cannot be scanned.
- Most detection is rule-based, so results are best treated as a review aid, not a legal or compliance verdict.
- When Gemini is enabled, selected page text and evidence are sent to the Gemini API through the background worker for LLM-backed features.
