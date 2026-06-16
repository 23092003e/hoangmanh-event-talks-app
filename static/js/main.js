// State Management
let allNotes = [];
let selectedNotes = new Map(); // stores Map of id -> note object
let currentTypeFilter = 'all';
let searchQuery = '';

// DOM Elements
const notesContainer = document.getElementById('notes-container');
const loadingSkeleton = document.getElementById('loading-skeleton');
const errorView = document.getElementById('error-view');
const errorMessage = document.getElementById('error-message');
const emptyState = document.getElementById('empty-state');
const refreshBtn = document.getElementById('refresh-btn');
const retryBtn = document.getElementById('retry-btn');
const themeToggle = document.getElementById('theme-toggle');
const syncStatus = document.getElementById('sync-status');
const topLoadingBar = document.getElementById('top-loading-bar');

// Filters and Stats Elements
const searchInput = document.getElementById('search-input');
const typeFilters = document.getElementById('type-filters');
const totalCountEl = document.getElementById('total-count');
const featureCountEl = document.getElementById('feature-count');
const issueCountEl = document.getElementById('issue-count');

// Selection Bar Elements
const selectionBar = document.getElementById('selection-bar');
const selectedCountEl = document.getElementById('selected-count');
const tweetSelectedBtn = document.getElementById('tweet-selected-btn');
const cancelSelectionBtn = document.getElementById('cancel-selection-btn');
const selectAllBtn = document.getElementById('select-all-btn');
const clearSelectionBtn = document.getElementById('clear-selection-btn');

// Modal Elements
const detailModal = document.getElementById('detail-modal');
const detailTag = document.getElementById('detail-tag');
const detailDate = document.getElementById('detail-date');
const detailContent = document.getElementById('detail-content');
const detailLink = document.getElementById('detail-link');
const detailTweetBtn = document.getElementById('detail-tweet-btn');

const tweetModal = document.getElementById('tweet-modal');
const tweetTextarea = document.getElementById('tweet-textarea');
const tweetTemplate = document.getElementById('tweet-template');
const charCountText = document.getElementById('char-count-text');
const charWarning = document.getElementById('char-warning');
const tweetPreviewText = document.getElementById('tweet-preview-text');
const copyTweetBtn = document.getElementById('copy-tweet-btn');
const postTweetBtn = document.getElementById('post-tweet-btn');
const progressRingIndicator = document.querySelector('.progress-ring-indicator');
const toast = document.getElementById('toast');

// Constant Configuration
const TWEET_LIMIT = 280;

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  setupEventListeners();
  setupDialogPolyfills();
  fetchNotes();
});

// Theme Management
function initTheme() {
  const savedTheme = localStorage.getItem('theme') || 'dark';
  if (savedTheme === 'light') {
    document.body.classList.remove('dark-theme');
    document.body.classList.add('light-theme');
  } else {
    document.body.classList.remove('light-theme');
    document.body.classList.add('dark-theme');
  }
}

function toggleTheme() {
  if (document.body.classList.contains('dark-theme')) {
    document.body.classList.remove('dark-theme');
    document.body.classList.add('light-theme');
    localStorage.setItem('theme', 'light');
  } else {
    document.body.classList.remove('light-theme');
    document.body.classList.add('dark-theme');
    localStorage.setItem('theme', 'dark');
  }
}

// Dialog (Modal) Setup & Safari Polyfills
function setupDialogPolyfills() {
  // Bind close buttons for all dialog elements
  document.querySelectorAll('dialog').forEach(dialog => {
    dialog.querySelectorAll('[data-close]').forEach(btn => {
      btn.addEventListener('click', () => dialog.close());
    });
    
    // Light dismiss fallback for Safari
    if (!('closedBy' in HTMLDialogElement.prototype)) {
      dialog.addEventListener('click', (event) => {
        if (event.target !== dialog) return;
        const rect = dialog.getBoundingClientRect();
        const isDialogContent = (
          rect.top <= event.clientY &&
          event.clientY <= rect.top + rect.height &&
          rect.left <= event.clientX &&
          event.clientX <= rect.left + rect.width
        );
        if (isDialogContent) return;
        dialog.close();
      });
    }
  });
}

// API Interaction
async function fetchNotes(forceRefresh = false) {
  setLoadingState(true);
  
  try {
    const url = `/api/releases${forceRefresh ? '?refresh=true' : ''}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    
    const data = await response.json();
    
    if (data.status === 'success') {
      allNotes = data.items;
      updateSyncStatus(data.updated_at, data.source);
      renderTypeFilters();
      renderNotes();
      updateStats();
      setErrorState(false);
    } else {
      throw new Error(data.message || 'Failed to parse feed');
    }
  } catch (err) {
    console.error('Fetch error:', err);
    setErrorState(true, err.message);
  } finally {
    setLoadingState(false);
  }
}

function updateSyncStatus(timestamp, source) {
  if (!timestamp) {
    syncStatus.textContent = "Updates unavailable";
    return;
  }
  const date = new Date(timestamp * 1000);
  const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const sourceStr = source === 'cache' ? 'cached' : 'live';
  syncStatus.textContent = `Last synced: ${timeStr} (${sourceStr})`;
}

// UI State Management
function setLoadingState(isLoading) {
  if (isLoading) {
    topLoadingBar.classList.add('loading');
    topLoadingBar.classList.remove('done');
    refreshBtn.disabled = true;
    refreshBtn.querySelector('.refresh-icon').classList.add('spinning');
    loadingSkeleton.classList.remove('hidden');
    notesContainer.classList.add('hidden');
    emptyState.classList.add('hidden');
    errorView.classList.add('hidden');
    
    // Update status indicator
    const dot = document.querySelector('.status-dot');
    dot.className = 'status-dot spinning';
  } else {
    topLoadingBar.classList.remove('loading');
    topLoadingBar.classList.add('done');
    setTimeout(() => topLoadingBar.classList.remove('done'), 500);
    
    refreshBtn.disabled = false;
    refreshBtn.querySelector('.refresh-icon').classList.remove('spinning');
    loadingSkeleton.classList.add('hidden');
    notesContainer.classList.remove('hidden');
    
    const dot = document.querySelector('.status-dot');
    dot.className = 'status-dot green';
  }
}

function setErrorState(isError, message = '') {
  if (isError) {
    errorView.classList.remove('hidden');
    notesContainer.classList.add('hidden');
    emptyState.classList.add('hidden');
    errorMessage.textContent = message;
  } else {
    errorView.classList.add('hidden');
  }
}

// Setup Event Listeners
function setupEventListeners() {
  refreshBtn.addEventListener('click', () => fetchNotes(true));
  retryBtn.addEventListener('click', () => fetchNotes(true));
  themeToggle.addEventListener('click', toggleTheme);
  
  // Real-time Search
  searchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value.toLowerCase().trim();
    renderNotes();
  });
  
  // Filters
  typeFilters.addEventListener('click', (e) => {
    const button = e.target.closest('button');
    if (!button) return;
    
    // Toggle active classes
    typeFilters.querySelectorAll('button').forEach(btn => btn.classList.remove('active'));
    button.classList.add('active');
    
    currentTypeFilter = button.dataset.type;
    renderNotes();
  });
  
  // Multi-Selection Logic
  cancelSelectionBtn.addEventListener('click', clearAllSelection);
  tweetSelectedBtn.addEventListener('click', () => openTweetModal(null));
  
  selectAllBtn.addEventListener('click', selectAllVisible);
  clearSelectionBtn.addEventListener('click', clearAllSelection);
  
  // Tweet composer text area logic
  tweetTextarea.addEventListener('input', handleTweetTextareaInput);
  tweetTemplate.addEventListener('change', updateTweetDraft);
  
  copyTweetBtn.addEventListener('click', copyTweetToClipboard);
  postTweetBtn.addEventListener('click', postTweetToTwitter);
  
  // CSV Export
  const exportCsvBtn = document.getElementById('export-csv-btn');
  if (exportCsvBtn) {
    exportCsvBtn.addEventListener('click', exportToCSV);
  }
}

// Dynamic Type Filters Generation
function renderTypeFilters() {
  const container = document.getElementById('type-filters');
  const activeType = currentTypeFilter;
  
  // Keep "All" button
  container.innerHTML = `<button class="pill ${activeType === 'all' ? 'active' : ''}" data-type="all">All</button>`;
  
  // Get unique types and sort them
  const types = [...new Set(allNotes.map(note => note.type))].sort();
  
  types.forEach(type => {
    // Map to user-friendly label
    const label = type === 'Feature' ? 'Features' 
                : type === 'Issue' ? 'Issues' 
                : type === 'Deprecated' ? 'Deprecated' 
                : type === 'Announcement' ? 'Announcements'
                : type === 'Breaking' ? 'Breaking'
                : type === 'Change' ? 'Changes'
                : type;
    
    container.innerHTML += `<button class="pill ${activeType === type ? 'active' : ''}" data-type="${type}">${label}</button>`;
  });
}

// Rendering Logic
function renderNotes() {
  notesContainer.innerHTML = '';
  
  // Filter notes
  const filteredNotes = allNotes.filter(note => {
    // Type Filter
    if (currentTypeFilter !== 'all' && note.type !== currentTypeFilter) {
      return false;
    }
    
    // Search Query
    if (searchQuery) {
      const inTitle = note.date.toLowerCase().includes(searchQuery);
      const inType = note.type.toLowerCase().includes(searchQuery);
      const inContent = note.content_text.toLowerCase().includes(searchQuery);
      return inTitle || inType || inContent;
    }
    
    return true;
  });
  
  // Toggle empty state
  if (filteredNotes.length === 0) {
    emptyState.classList.remove('hidden');
    selectAllBtn.classList.add('hidden');
    return;
  } else {
    emptyState.classList.add('hidden');
    selectAllBtn.classList.remove('hidden');
  }
  
  // Render cards
  filteredNotes.forEach((note, index) => {
    const isSelected = selectedNotes.has(note.id);
    const card = document.createElement('article');
    card.className = `note-card ${isSelected ? 'selected' : ''}`;
    card.dataset.id = note.id;
    card.setAttribute('tabindex', '0');
    
    const tagClass = note.type.toLowerCase();
    
    card.innerHTML = `
      <div class="note-header">
        <div class="note-meta">
          <span class="note-tag ${tagClass}">${note.type}</span>
          <span class="note-date">${note.date}</span>
        </div>
        <div class="selection-checkbox" title="Select to Tweet" aria-label="Select update to share"></div>
      </div>
      
      <div class="note-content">
        ${note.content_html}
      </div>
      
      <div class="note-footer">
        <button class="card-action-btn copy-card-btn" title="Copy text to clipboard">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 13px; height: 13px;">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
          </svg>
          <span>Copy</span>
        </button>
        <button class="card-action-btn read-more-btn">
          <span>Read Full</span>
        </button>
        <button class="card-action-btn tweet-btn">
          <svg class="twitter-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
          </svg>
          <span>Tweet</span>
        </button>
      </div>
    `;
    
    // Click events
    card.addEventListener('click', (e) => {
      const checkbox = e.target.closest('.selection-checkbox');
      const tweetBtn = e.target.closest('.tweet-btn');
      const readMoreBtn = e.target.closest('.read-more-btn');
      const copyBtn = e.target.closest('.copy-card-btn');
      
      if (checkbox) {
        toggleSelection(note, card);
      } else if (tweetBtn) {
        e.stopPropagation();
        openTweetModal(note);
      } else if (readMoreBtn) {
        e.stopPropagation();
        openDetailModal(note);
      } else if (copyBtn) {
        e.stopPropagation();
        copyCardToClipboard(note);
      } else {
        // Toggle selection on general card click to make it easy
        toggleSelection(note, card);
      }
    });
    
    // Add entry animation delays
    card.style.animation = `slideIn 0.3s ease forwards ${index * 0.04}s`;
    
    notesContainer.appendChild(card);
  });
  
  // Show / hide the floating selection bar
  updateSelectionBar();
}

function updateStats() {
  totalCountEl.textContent = allNotes.length;
  
  const features = allNotes.filter(n => n.type === 'Feature').length;
  const issues = allNotes.filter(n => n.type === 'Issue').length;
  
  featureCountEl.textContent = features;
  issueCountEl.textContent = issues;
}

// Selection Logic
function toggleSelection(note, cardElement) {
  if (selectedNotes.has(note.id)) {
    selectedNotes.delete(note.id);
    cardElement.classList.remove('selected');
  } else {
    selectedNotes.set(note.id, note);
    cardElement.classList.add('selected');
  }
  updateSelectionBar();
}

function selectAllVisible() {
  const visibleCards = notesContainer.querySelectorAll('.note-card');
  visibleCards.forEach(card => {
    const id = card.dataset.id;
    const note = allNotes.find(n => n.id === id);
    if (note && !selectedNotes.has(id)) {
      selectedNotes.set(id, note);
      card.classList.add('selected');
    }
  });
  updateSelectionBar();
}

function clearAllSelection() {
  selectedNotes.clear();
  notesContainer.querySelectorAll('.note-card').forEach(card => {
    card.classList.remove('selected');
  });
  updateSelectionBar();
}

function updateSelectionBar() {
  const count = selectedNotes.size;
  selectedCountEl.textContent = count;
  
  if (count > 0) {
    selectionBar.classList.remove('hidden');
    clearSelectionBtn.classList.remove('hidden');
  } else {
    selectionBar.classList.add('hidden');
    clearSelectionBtn.classList.add('hidden');
  }
}

// Detail Modal
function openDetailModal(note) {
  detailTag.textContent = note.type;
  detailTag.className = `note-tag ${note.type.toLowerCase()}`;
  detailDate.textContent = note.date;
  detailContent.innerHTML = note.content_html;
  
  // Configure external link
  detailLink.href = note.link || 'https://cloud.google.com/bigquery/docs/release-notes';
  
  // Action Button
  detailTweetBtn.onclick = () => {
    detailModal.close();
    openTweetModal(note);
  };
  
  detailModal.showModal();
}

// Tweet Logic
let activeTweetNote = null; // if tweeting a single item

function openTweetModal(singleNote = null) {
  activeTweetNote = singleNote;
  
  // Update template options depending on single vs multiple
  if (activeTweetNote) {
    tweetTemplate.innerHTML = `
      <option value="brief">Brief Spotlight (Default)</option>
      <option value="hype">Excited / Dev Style</option>
      <option value="detailed">Highlights Details</option>
    `;
  } else {
    tweetTemplate.innerHTML = `
      <option value="multi-brief">Daily Digest (Default)</option>
      <option value="multi-hype">BigQuery Upgrades 🔥</option>
    `;
  }
  
  // Generate initial draft
  updateTweetDraft();
  tweetModal.showModal();
}

function updateTweetDraft() {
  const style = tweetTemplate.value;
  let text = '';
  
  if (activeTweetNote) {
    const date = activeTweetNote.date;
    const type = activeTweetNote.type;
    const desc = activeTweetNote.content_text;
    const link = activeTweetNote.link || 'https://cloud.google.com/bigquery/docs/release-notes';
    
    // Truncate desc if too long for initial templates
    const maxDescLen = 140;
    const cleanDesc = desc.replace(/\s+/g, ' ');
    const truncatedDesc = cleanDesc.length > maxDescLen 
      ? cleanDesc.substring(0, maxDescLen) + '...' 
      : cleanDesc;
      
    if (style === 'brief') {
      text = `BigQuery Update [${date}] (${type}):\n${truncatedDesc}\n\nDetails: ${link} #BigQuery #GCP`;
    } else if (style === 'hype') {
      text = `New Google BigQuery feature dropped! 🚀🔥\n\n"${truncatedDesc}"\n\nCheck the release notes: ${link} #GCP #BigQuery #DataEngineering`;
    } else if (style === 'detailed') {
      text = `Google BigQuery release note (${date})\nCategory: [${type}]\n\n${cleanDesc.substring(0, 160)}...\n\nRead documentation here: ${link}`;
    }
  } else {
    // Multi-select Tweet draft
    const notesArray = Array.from(selectedNotes.values());
    const dateStr = notesArray[0]?.date || 'Recent';
    const link = 'https://cloud.google.com/bigquery/docs/release-notes';
    
    if (style === 'multi-brief') {
      text = `Latest Google BigQuery updates summary (${dateStr}):\n\n`;
      notesArray.forEach(n => {
        const titleText = n.content_text.replace(/\s+/g, ' ');
        const truncated = titleText.length > 55 ? titleText.substring(0, 52) + '...' : titleText;
        text += `• [${n.type}] ${truncated}\n`;
      });
      text += `\nRead more: ${link} #GCP`;
    } else if (style === 'multi-hype') {
      text = `Google Cloud just released some awesome new BigQuery features! 🚀\n\n`;
      notesArray.forEach(n => {
        const titleText = n.content_text.replace(/\s+/g, ' ');
        const truncated = titleText.length > 50 ? titleText.substring(0, 47) + '...' : titleText;
        text += `⚡ [${n.type}] ${truncated}\n`;
      });
      text += `\nFull updates here: ${link} #BigQuery #GoogleCloud`;
    }
  }
  
  tweetTextarea.value = text;
  handleTweetTextareaInput();
}

function handleTweetTextareaInput() {
  const text = tweetTextarea.value;
  const currentLen = text.length;
  const remaining = TWEET_LIMIT - currentLen;
  
  charCountText.textContent = remaining;
  tweetPreviewText.textContent = text || 'Draft preview will appear here...';
  
  // Update character progress ring
  const circleRadius = 10;
  const circumference = 2 * Math.PI * circleRadius;
  
  // Calculate percentage (clamped between 0 and 100)
  const percent = Math.min(100, Math.max(0, (currentLen / TWEET_LIMIT) * 100));
  const strokeDashoffset = circumference - (percent / 100) * circumference;
  
  progressRingIndicator.style.strokeDasharray = `${circumference} ${circumference}`;
  progressRingIndicator.style.strokeDashoffset = strokeDashoffset;
  
  // Color code the counter and warning states
  if (remaining < 0) {
    progressRingIndicator.style.stroke = '#ef4444'; // Red
    charCountText.style.color = '#ef4444';
    charWarning.classList.remove('hidden');
    postTweetBtn.disabled = true;
  } else if (remaining <= 20) {
    progressRingIndicator.style.stroke = '#f59e0b'; // Amber
    charCountText.style.color = '#f59e0b';
    charWarning.classList.add('hidden');
    postTweetBtn.disabled = false;
  } else {
    progressRingIndicator.style.stroke = 'var(--accent-color)'; // Default
    charCountText.style.color = 'var(--text-secondary)';
    charWarning.classList.add('hidden');
    postTweetBtn.disabled = false;
  }
}

// Clipboard copying
function copyTweetToClipboard() {
  const text = tweetTextarea.value;
  navigator.clipboard.writeText(text).then(() => {
    showToast("Tweet text copied to clipboard!");
  }).catch(err => {
    console.error("Clipboard copy failed:", err);
    showToast("Failed to copy text");
  });
}

// X Post Redirect
function postTweetToTwitter() {
  const text = tweetTextarea.value;
  if (text.length > TWEET_LIMIT) {
    showToast("Post is too long. Please shorten to under 280 characters.");
    return;
  }
  const xUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
  window.open(xUrl, '_blank', 'noopener,noreferrer');
  tweetModal.close();
}

// Toast Notifications
function showToast(message) {
  toast.querySelector('#toast-message').textContent = message;
  toast.classList.remove('hidden');
  
  // Pop up animation
  toast.style.transform = 'translateY(0)';
  toast.style.opacity = '1';
  
  setTimeout(() => {
    toast.style.transform = 'translateY(100px)';
    toast.style.opacity = '0';
    setTimeout(() => {
      toast.classList.add('hidden');
    }, 300);
  }, 3000);
}

// Copy single release note text
function copyCardToClipboard(note) {
  const text = `BigQuery Update (${note.date}) - [${note.type}]:\n${note.content_text}`;
  navigator.clipboard.writeText(text).then(() => {
    showToast("Update copied to clipboard!");
  }).catch(err => {
    console.error("Failed to copy update:", err);
    showToast("Failed to copy update");
  });
}

// Export filtered notes to CSV
function exportToCSV() {
  // Filter allNotes exactly like renderNotes does
  const filteredNotes = allNotes.filter(note => {
    if (currentTypeFilter !== 'all' && note.type !== currentTypeFilter) {
      return false;
    }
    if (searchQuery) {
      const inTitle = note.date.toLowerCase().includes(searchQuery);
      const inType = note.type.toLowerCase().includes(searchQuery);
      const inContent = note.content_text.toLowerCase().includes(searchQuery);
      return inTitle || inType || inContent;
    }
    return true;
  });

  if (filteredNotes.length === 0) {
    showToast("No notes to export!");
    return;
  }

  // Build CSV content
  const headers = ["Date", "Type", "Text Content", "Link"];
  const rows = [headers];

  filteredNotes.forEach(note => {
    // Escape double quotes by doubling them
    const escape = (text) => `"${text.replace(/"/g, '""')}"`;
    rows.push([
      escape(note.date),
      escape(note.type),
      escape(note.content_text),
      escape(note.link)
    ]);
  });

  const csvContent = "\uFEFF" + rows.map(r => r.join(",")).join("\n"); // \uFEFF for BOM UTF-8

  // Trigger download
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  
  const dateStr = new Date().toISOString().split('T')[0];
  link.setAttribute("download", `bigquery_release_notes_${dateStr}.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  showToast("CSV exported successfully!");
}
