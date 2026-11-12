# CoRL 2026 Austin — Interactive Session & Video Archive

A 100% static, serverless web archive for rewatching **CoRL 2026** (Nov 9–11, 2026 · Austin, TX), built from the official schedule and livestreams at <https://www.corl.org/program>.

## Features

- **Exact Video + Audio + Slide Timestamps**: Multimodal analysis across all 4 conference livestreams (`Day 1`, `Day 2`, `Day 3 Morning`, `Day 3 Afternoon`) locates the exact second every talk and subsection begins.
- **Visual Subsections & Summaries**: Every talk (Keynotes, Fireside Chat, Early Career Keynotes, Orals, Spotlights, Special Panel Debate, Diamond Sponsor Talks, and Awards) is broken into navigable subsections with concise summaries and **extracted 640×360 WebP key visuals** (slides, architecture diagrams, and real-robot demos) plus a full-frame zoom lightbox.
- **Built-in YouTube Player**: Embedded YouTube IFrame Player with proportional chapter timeline scrubbing, live active-chapter tracking, playback speed controls (`1×`–`2×`), and shareable timestamp deep-links (`#talk=...&t=...`).
- **Instant Deep Search**: Search presenters, paper titles, topics, affiliations, session chairs, subsection summaries, and all **687 accepted CoRL 2026 papers** (including poster board numbers and OpenReview links).
- **Zero-Build GitHub Pages (`github.io`) Ready**: Pure static HTML, CSS, JS, JSON, and WebP assets with `.nojekyll` included.

## Live Site

Once GitHub Pages is enabled, the site is hosted at:
**https://sippeyxp.github.io/corl26_postgame/**

## Deploying to GitHub Pages (`sippeyxp/corl26_postgame`)

```bash
cd /usr/local/google/home/pengxu/corl2026-sessions
git push -u origin main
```

Then in **https://github.com/sippeyxp/corl26_postgame/settings/pages**:
Set **Build and deployment → Source** to **GitHub Actions** (using the included `.github/workflows/deploy-pages.yml`) or **Deploy from a branch (`main` / `/ (root)`)**.

## Google Analytics (GA4)

Google Analytics 4 (`gtag.js` + custom events for talk views, subsection jumps, visual zooms, searches, filters, moment shares, and OpenReview clicks) is configured in `analytics-config.js`:

```js
window.GA_MEASUREMENT_ID = 'G-XXXXXXXXXX';
```

Replace `'G-XXXXXXXXXX'` with your GA4 Measurement ID from <https://analytics.google.com/>.

## Local Preview

```bash
python3 -m http.server 8765 --directory /usr/local/google/home/pengxu/corl2026-sessions
```
