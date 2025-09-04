import { createEl, debounce, crossBasketGradient, newId } from './utils.js';
import { state, loadFromStorage, modifyState, normalizeState, setRenderFunction } from './state.js';
import { applyTheme, getThemeByName, getIconsForTheme, loadSystemThemes, loadUserThemes } from './theme-engine.js';
import { editBook, enableInlineEdit, promptText, confirmAction, showThemesModal, showTagsModal } from './ui.js';

// --- DOM ELEMENT REFERENCES ---
const main = document.getElementById('main');
const tabsStack = document.getElementById('tabsStack');
const globalSearch = document.getElementById('globalSearch');

// --- RENDER FUNCTIONS ---

function render() {
  const icons = getIconsForTheme(getThemeByName(state.activeTheme));
  const searchVal = (globalSearch.value || '').trim().toLowerCase();
  main.innerHTML = '';
  renderTabs(icons);

  const header = renderBookshelfHeader(state.bookshelves[state.active], state.active, icons);
  main.appendChild(header);

  const shelfContainer = createEl('div', { id: 'shelfContainer' });
  if (searchVal) {
    renderSearchResults(searchVal, shelfContainer, icons);
  } else {
    if (!state.bookshelves.length) {
      renderEmptyState(icons);
      return;
    }
    const currentBS = state.bookshelves[state.active];
    if (currentBS && currentBS.shelves) {
      currentBS.shelves.forEach((shelf, shelfIndex) => {
        shelfContainer.appendChild(renderShelf(shelf, state.active, shelfIndex, icons));
      });
    }
  }
  main.appendChild(shelfContainer);
  setTimeout(layoutShelves, 50); // Delay layout to allow DOM to paint
}
// Provide the render function to the state module
setRenderFunction(render);


function renderTabs(icons) {
  tabsStack.innerHTML = '';
  state.bookshelves.forEach((bs, i) => {
    const b = createEl('button', { className: 'tab-btn' + (state.active === i ? ' active' : ''), title: bs.name, textContent: bs.name });
    b.onclick = () => modifyState(s => s.active = i);
    tabsStack.appendChild(b);
  });
  const add = createEl('button', { className: 'tab-btn add', title: 'Add bookshelf', innerHTML: `<span class="icon">${icons.plus}</span>` });
  add.onclick = async () => {
    const name = await promptText('New Bookshelf', 'Bookshelf name');
    if (name) modifyState(s => { s.bookshelves.push({ id: newId(), name, shelves: [] }); s.active = s.bookshelves.length - 1; });
  };
  tabsStack.appendChild(add);
}

function renderEmptyState(icons) {
  const empty = createEl('div', { className: 'bs-header' });
  empty.innerHTML = `<div class="bs-title">No bookshelves yet</div>`;
  const btn = createEl('button', { className: 'btn-header', innerHTML: `<span class="icon">${icons.plus}</span>Create your first bookshelf` });
  btn.onclick = async () => {
    const name = await promptText('New Bookshelf', 'Bookshelf name');
    if (name) modifyState(s => { s.bookshelves.push({ id: newId(), name, shelves: [] }); s.active = 0; });
  };
  empty.appendChild(btn);
  main.innerHTML = '';
  main.appendChild(empty);
}

function renderBookshelfHeader(bs, bsIndex, icons) {
  if (!bs) {
    renderEmptyState(icons);
    return createEl('div');
  }
  const header = createEl('div', { className: 'bs-header' });
  const title = createEl('div', { className: 'bs-title', textContent: bs.name });
  enableInlineEdit(title, (newName) => modifyState(s => s.bookshelves[bsIndex].name = newName));
  const controls = createEl('div', { className: 'bs-controls' });
  const addShelfBtn = createEl('button', { className: 'btn-header', innerHTML: `<span class="icon">${icons.plus}</span>Shelf` });
  addShelfBtn.onclick = async () => {
    const name = await promptText('New Shelf', 'Shelf name');
    if (name) modifyState(s => { s.bookshelves[bsIndex].shelves.push({ id: newId(), name, collapsed: false, books: [] }); });
  };
  const deleteBSBtn = createEl('button', { className: 'btn-header', innerHTML: `<span class="icon">${icons.trash}</span>Delete Bookshelf` });
  deleteBSBtn.onclick = async () => {
    if (await confirmAction(`Delete bookshelf "${bs.name}"?`)) {
      modifyState(s => { s.bookshelves.splice(bsIndex, 1); s.active = Math.max(0, s.active - 1); });
    }
  };
  controls.append(addShelfBtn, deleteBSBtn);
  header.append(title, controls);
  return header;
}

function renderShelf(shelf, bsIndex, shelfIndex, icons) {
  const wrap = createEl('div', { className: 'shelf-wrap', 'data-shelf-id': shelf.id });
  const bar = createEl('div', { className: 'shelf-bar' });
  const name = createEl('div', { className: 'shelf-name', textContent: shelf.name });
  enableInlineEdit(name, (newName) => modifyState(s => s.bookshelves[bsIndex].shelves[shelfIndex].name = newName));
  if (shelfIndex < 10) {
    const shortcut = createEl('div', { className: 'shelf-shortcut', textContent: shelfIndex === 9 ? '0' : (shelfIndex + 1).toString() });
    bar.appendChild(shortcut);
  }
  const ctrls = createEl('div', { className: 'shelf-controls' });
  const [addG1, addG2] = shelf.addGradient || (shelf.addGradient = crossBasketGradient());
  const addB = createEl('button', { className: 'add-book-btn', innerHTML: `<span class="icon">${icons.plus}</span>` });
  addB.style.background = `linear-gradient(135deg, ${addG1}, ${addG2})`;
  addB.onclick = () => createBookInShelf(shelfIndex);

  const delShelf = createEl('button', { className: 'btn-shelf delete-btn', innerHTML: `<span class="icon">${icons.trash}</span>` });
  delShelf.onclick = async () => {
    if (await confirmAction(`Delete shelf "${shelf.name}"?`)) {
      modifyState(s => s.bookshelves[bsIndex].shelves.splice(shelfIndex, 1));
    }
  };
  const collIcon = shelf.collapsed ? icons.chevronRight : icons.chevronDown;
  const coll = createEl('button', { className: 'btn-shelf', innerHTML: `<span class="icon">${collIcon}</span>` });
  coll.onclick = () => {
    modifyState(s => s.bookshelves[bsIndex].shelves[shelfIndex].collapsed = !s.bookshelves[bsIndex].shelves[shelfIndex].collapsed);
  };
  ctrls.append(addB, delShelf, coll);
  bar.append(name, ctrls);
  wrap.appendChild(bar);

  if (!shelf.collapsed) {
    const body = createEl('div', { className: 'shelf-body', 'data-shelf-id': shelf.id });
    (shelf.books || []).forEach((book, bookIndex) => body.appendChild(renderBook(book, bsIndex, shelfIndex, bookIndex, icons)));
    const addTile = createEl('div', { className: 'book-add', innerHTML: `<span class="icon">${icons.plus}</span>` });
    addTile.style.background = `linear-gradient(135deg, ${addG1}, ${addG2})`;
    addTile.onclick = addB.onclick;
    body.appendChild(addTile);
    wrap.appendChild(body);
  }
  return wrap;
}

function renderBook(book, bsIndex, shelfIndex, bookIndex, icons) {
  const [a, b] = book.gradient || crossBasketGradient();
  const el = createEl('div', { className: 'book', textContent: book.title, 'data-book-id': book.id });
  el.style.background = `linear-gradient(135deg, ${a}, ${b})`;
  el.onclick = () => editBook(book, bsIndex, shelfIndex, bookIndex);
  return el;
}

function renderSearchResults(query, container, icons) {
  const tagMatches = [], otherMatches = [], matchedBookIds = new Set();
  state.bookshelves.forEach((bs, bi) => (bs.shelves || []).forEach((sh, si) => (sh.books || []).forEach((bk, ki) => {
    if ((bk.tags || []).some(tag => tag.toLowerCase().includes(query))) {
      tagMatches.push({ bi, si, ki, bs, sh, bk });
      matchedBookIds.add(bk.id);
    }
  })));
  state.bookshelves.forEach((bs, bi) => (bs.shelves || []).forEach((sh, si) => (sh.books || []).forEach((bk, ki) => {
    if (matchedBookIds.has(bk.id)) return;
    if ((bk.title || '').toLowerCase().includes(query) || (bk.content || '').toLowerCase().includes(query)) {
      otherMatches.push({ bi, si, ki, bs, sh, bk });
    }
  })));
  const results = [...tagMatches, ...otherMatches];
  main.querySelector('.bs-header .bs-title').textContent = `Search results for “${query}” — ${results.length} found`;
  const body = createEl('div', { className: 'shelf-body', style: 'display: flex; flex-wrap: wrap; gap: 16px;' });
  results.forEach(({ bk, bi, si, ki, bs, sh }) => {
    const card = renderBook(bk, bi, si, ki, icons);
    card.title = `${bs.name} › ${sh.name} › ${bk.title}`;
    card.style.width = 'calc(33.333% - 11px)';
    body.appendChild(card);
  });
  container.appendChild(body);
}


// --- UTILITY & HELPER FUNCTIONS ---

function layoutShelves() {
  const shelfContainer = document.getElementById('shelfContainer');
  if (!shelfContainer) return;
  if (window.innerWidth < 721 || globalSearch.value) {
    shelfContainer.style.height = 'auto';
    shelfContainer.querySelectorAll('.shelf-wrap').forEach(shelf => {
      shelf.style.position = ''; shelf.style.left = ''; shelf.style.top = ''; shelf.style.width = ''; shelf.style.opacity = '';
    });
    return;
  }
  const shelves = Array.from(shelfContainer.querySelectorAll('.shelf-wrap'));
  if (shelves.length === 0) { shelfContainer.style.height = '0px'; return; }
  const gap = 24; const shelfWidth = 380; const containerWidth = shelfContainer.offsetWidth;
  const numColumns = Math.max(1, Math.floor((containerWidth + gap) / (shelfWidth + gap)));
  const columnHeights = new Array(numColumns).fill(0);
  shelves.forEach(shelf => {
    shelf.style.width = shelfWidth + 'px';
    const shelfHeight = shelf.offsetHeight;
    let minColIndex = 0;
    for (let i = 1; i < numColumns; i++) if (columnHeights[i] < columnHeights[minColIndex]) minColIndex = i;
    shelf.style.position = 'absolute';
    shelf.style.left = (minColIndex * (shelfWidth + gap)) + 'px';
    shelf.style.top = columnHeights[minColIndex] + 'px';
    shelf.style.opacity = '1';
    columnHeights[minColIndex] += shelfHeight + gap;
  });
  shelfContainer.style.height = Math.max(...columnHeights) + 'px';
}
const debouncedLayout = debounce(layoutShelves, 250);

async function createBookInShelf(shelfIndex) {
  const currentBS = state.bookshelves[state.active];
  if (!currentBS || !currentBS.shelves || !currentBS.shelves[shelfIndex]) return;
  
  const title = await promptText('New Book', 'Book title');
  if (title) {
    modifyState(s => {
      s.bookshelves[state.active].shelves[shelfIndex].books.push({
        id: newId(), title, content: '', tags: [], gradient: crossBasketGradient()
      });
    });
  }
}

function saveToFile() {
  const dataStr = JSON.stringify(state, null, 2);
  const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
  const exportFileDefaultName = 'aethernote-backup.json';
  const linkElement = document.createElement('a');
  linkElement.setAttribute('href', dataUri);
  linkElement.setAttribute('download', exportFileDefaultName);
  linkElement.click();
}

function loadFromFile() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.onchange = e => {
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = event => {
      try {
        const newState = JSON.parse(event.target.result);
        if (!newState.bookshelves || !Array.isArray(newState.bookshelves)) throw new Error('Invalid data structure');
        normalizeState(newState);
        modifyState(s => {
          s.bookshelves = newState.bookshelves;
          s.active = newState.active || 0;
          if (newState.activeTheme) s.activeTheme = newState.activeTheme;
        }, false); // prevent double render
        applyTheme(getThemeByName(newState.activeTheme));
      } catch (err) {
        alert('Could not load file. It might be corrupted or in the wrong format.');
        console.error('Load error:', err);
      }
    };
    reader.readAsText(file);
  };
  input.click();
}

async function updateApp() {
  if (!('serviceWorker' in navigator)) {
    alert('This browser does not support updates.');
    return;
  }
  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration) {
      alert('No service worker found. Cannot update.');
      return;
    }
    await registration.update();
    if (registration.waiting) {
      alert('A new version is ready. The app will now reload.');
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      window.location.reload();
    } else if (registration.installing) {
      alert('Update found! The app will reload automatically when it is ready.');
    } else {
      alert('You already have the latest version of the app.');
    }
  } catch (error) {
    console.error('Update failed:', error);
    alert('Failed to check for updates. Please check your network connection.');
  }
}


// --- INITIALIZATION ---

async function initApp() {
  // Load data and themes
  loadFromStorage();
  loadUserThemes();
  await loadSystemThemes();
  
  // Apply the current theme and render the UI
  applyTheme(getThemeByName(state.activeTheme));
  
  // Set up all event listeners
  const icons = getIconsForTheme(getThemeByName(state.activeTheme));
  document.getElementById('menuBtn').innerHTML = `<span class="icon">${icons.menu}</span>`;
  document.getElementById('saveBtn').innerHTML = `<span class="icon">${icons.save}</span> Save`;
  document.getElementById('loadBtn').innerHTML = `<span class="icon">${icons.load}</span> Load`;
  document.getElementById('themesBtn').innerHTML = `<span class="icon">${icons.themes}</span> Themes`;
  document.getElementById('tagsBtn').innerHTML = `<span class="icon">${icons.tags}</span> Tags`;
  document.getElementById('updateBtn').innerHTML = `<span class="icon">${icons.update}</span> Update`;

  document.getElementById('menuBtn').onclick = function(e) { e.stopPropagation(); document.getElementById('menuDropdown').classList.toggle('show'); };
  window.onclick = () => document.getElementById('menuDropdown').classList.remove('show');
  
  const clearSearchBtn = document.getElementById('clearSearchBtn');
  globalSearch.addEventListener('input', () => {
    render();
    clearSearchBtn.style.display = globalSearch.value.length > 0 ? 'block' : 'none';
  });
  clearSearchBtn.addEventListener('click', () => {
    globalSearch.value = '';
    clearSearchBtn.style.display = 'none';
    render();
    globalSearch.focus();
  });

  document.getElementById('saveBtn').onclick = saveToFile;
  document.getElementById('loadBtn').onclick = loadFromFile;
  document.getElementById('updateBtn').onclick = updateApp;
  document.getElementById('themesBtn').onclick = showThemesModal;
  document.getElementById('tagsBtn').onclick = showTagsModal;
  
  window.addEventListener('resize', debouncedLayout);
  
  window.addEventListener('keydown', e => {
    if (document.querySelector('.overlay.show') || e.target.matches('input, textarea')) return;
    const key = e.key.toLowerCase();
    if (key === 'n') { e.preventDefault(); main.querySelector('.bs-controls .btn-header')?.click(); } 
    else if (key >= '1' && key <= '9') { e.preventDefault(); createBookInShelf(parseInt(key) - 1); } 
    else if (key === '0') { e.preventDefault(); createBookInShelf(9); }
  });

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js')
      .then(reg => console.log('Service Worker registered!'))
      .catch(err => console.log('Service Worker registration failed: ', err));
  }
}

// Start the application
initApp();
