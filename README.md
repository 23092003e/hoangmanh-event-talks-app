# BigQuery Release Notes Explorer

[![Live Demo](https://img.shields.io/badge/demo-live-blueviolet?style=for-the-badge)](https://hoangmanh-event-talks-app.vercel.app/)

A modern, responsive, and feature-rich web application built with Python Flask and vanilla HTML5, CSS3, and JavaScript. The application fetches, caches, and parses Google BigQuery's release notes, providing real-time search, category filtering, and a custom Composer to tweet about specific updates.

## 🌐 Live Deployment

The application is deployed on Vercel and can be accessed at:
👉 **[hoangmanh-event-talks-app.vercel.app](https://hoangmanh-event-talks-app.vercel.app/)**

## 🚀 Features

- **Granular Update Cards**: Parses the Atom feed and splits daily notes by headings (Features, Issues, Announcements, Breaking, Changes) to generate individual, categorised cards.
- **Robust Local Cache**: Saves parsed feeds locally (`cache.json`) for 1 hour to maximize performance and prevent redundant network requests. Clicking the **Refresh** button in the header forces a live feed check.
- **Dynamic Category Filtering**: Sidebar filter pills are dynamically generated based on categories actually present in the data (e.g. *Features*, *Issues*, *Announcements*, *Changes*, *Breaking*).
- **Real-Time Keyword Search**: Search titles, dates, tags, and description texts instantly.
- **Floating Multi-Selection Footer**: Select multiple cards to perform bulk actions, such as compiling a summary tweet.
- **Custom X (Twitter) Composer Modal**: 
  - Templates: *Brief Spotlight*, *Excited/Hype Style*, *Highlights Details*, and *Daily Digests* (for multi-selection).
  - Character counter displaying remaining characters (X post limit is 280) with a live circular progress bar.
  - Social card preview box syncing in real-time.
  - One-click **Copy Text** or **Post to X** integration.
- **Dark & Light Mode Toggles**: Full-page styling switcher with choice persistence in `localStorage`.

---

## 🛠️ Technology Stack

- **Backend**: Python 3, Flask, Requests, feedparser, BeautifulSoup4
- **Frontend**: Semantic HTML5, Vanilla CSS3 (Custom properties/variables, flex layouts, and keyframe animations), Plain Vanilla JavaScript (ES6+, Fetch API, Event delegation, Dialog controllers)

---

## 📂 Project Structure

- `app.py`: Flask application server and Atom feed parsing/caching engine.
- `requirements.txt`: Python package dependencies.
- `templates/index.html`: Core HTML skeleton and layout structures.
- `static/css/style.css`: Theme configuration and component styling.
- `static/js/main.js`: Main state manager, filter handlers, and composer logic.
- `.gitignore`: Specifying excluded virtualenv, cache files, and system files.

---

## 📥 Installation & Running Locally

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/23092003e/hoangmanh-event-talks-app.git
   cd hoangmanh-event-talks-app
   ```

2. **Set up Virtual Environment**:
   ```bash
   python3 -m venv venv
   source venv/bin/activate
   ```

3. **Install Dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

4. **Run the Server**:
   ```bash
   python3 app.py
   ```
   The application will start on **`http://localhost:5001`**.
