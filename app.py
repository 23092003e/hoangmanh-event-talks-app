import os
import json
import time
import hashlib
import requests
import feedparser
from bs4 import BeautifulSoup
from flask import Flask, jsonify, render_template, request

app = Flask(__name__)

FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"
CACHE_FILE = "cache.json"
CACHE_EXPIRY = 3600  # 1 hour in seconds

def generate_item_id(date_str, type_str, content_html):
    """Generate a stable, unique ID for a release note item."""
    hash_input = f"{date_str}-{type_str}-{content_html}"
    return hashlib.md5(hash_input.encode('utf-8')).hexdigest()

def fetch_and_parse_feed():
    """Fetches the Atom feed and parses it into structured update items."""
    try:
        # Fetch using requests to handle headers and potential timeouts
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        response = requests.get(FEED_URL, headers=headers, timeout=15)
        response.raise_for_status()
        
        # Parse using feedparser
        feed = feedparser.parse(response.content)
        
        items = []
        for entry in feed.entries:
            date_str = entry.title if hasattr(entry, 'title') else "Unknown Date"
            date_iso = entry.updated if hasattr(entry, 'updated') else ""
            link = entry.link if hasattr(entry, 'link') else ""
            
            content_html = entry.content[0].value if hasattr(entry, 'content') else ""
            if not content_html:
                continue
                
            soup = BeautifulSoup(content_html, 'html.parser')
            
            # Split the entry content by h3/h4 headings to isolate individual items
            current_type = None
            current_html = []
            
            # Helper to append an item
            def append_current_item():
                if current_type and current_html:
                    html_str = "".join(str(e) for e in current_html).strip()
                    if not html_str:
                        return
                    item_soup = BeautifulSoup(html_str, 'html.parser')
                    text_str = item_soup.get_text().strip()
                    if not text_str:
                        return
                    
                    items.append({
                        'id': generate_item_id(date_str, current_type, html_str),
                        'date': date_str,
                        'date_iso': date_iso,
                        'type': current_type,
                        'content_html': html_str,
                        'content_text': text_str,
                        'link': link
                    })

            for element in soup.contents:
                if element.name in ['h3', 'h4']:
                    append_current_item()
                    current_type = element.get_text().strip()
                    current_html = []
                else:
                    if current_type is None:
                        current_type = "Update"
                    current_html.append(element)
                    
            append_current_item()
            
        return {
            'status': 'success',
            'updated_at': time.time(),
            'items': items
        }
    except Exception as e:
        return {
            'status': 'error',
            'message': str(e),
            'updated_at': 0,
            'items': []
        }

def get_release_notes(force_refresh=False):
    """Retrieve release notes, using cache if valid, or fetching from feed."""
    now = time.time()
    
    # Check if cache file exists and is not expired
    if not force_refresh and os.path.exists(CACHE_FILE):
        try:
            with open(CACHE_FILE, 'r') as f:
                cache_data = json.load(f)
                
            # If cache is valid and has items, return it
            if now - cache_data.get('updated_at', 0) < CACHE_EXPIRY and cache_data.get('status') == 'success':
                cache_data['source'] = 'cache'
                return cache_data
        except Exception:
            pass # Fallback to fetch on cache read error
            
    # Cache is missing, expired, or force refresh requested
    data = fetch_and_parse_feed()
    if data['status'] == 'success':
        try:
            with open(CACHE_FILE, 'w') as f:
                json.dump(data, f)
        except Exception as e:
            print(f"Failed to write cache: {e}")
            
    data['source'] = 'network'
    return data

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/releases', methods=['GET'])
def api_releases():
    force = request.args.get('refresh', 'false').lower() == 'true'
    data = get_release_notes(force_refresh=force)
    return jsonify(data)

if __name__ == '__main__':
    # Run on localhost:5001 to avoid default port conflicts
    app.run(host='0.0.0.0', port=5001, debug=True)
