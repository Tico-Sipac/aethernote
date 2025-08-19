(function(){
  /* ===== Color baskets for book covers ===== */
  const BASKETS = [
    /* A - blues */
    ['#4a90e2','#5dade2','#2874a6','#1b4d97'],
    /* B - earthy/orange */
    ['#d35400','#e67e22','#ca6f1e','#7e5109'],
    /* C - greens/teal */
    ['#27ae60','#2ecc71','#16a085','#196f3d'],
    /* D - purples/roses */
    ['#8e44ad','#9b59b6','#c39bd3','#d98880']
  ];
  function pickFrom(arr){ return arr[Math.floor(Math.random()*arr.length)]; }
  function pickTwoDifferentIndexes(n){
    const a = Math.floor(Math.random()*n);
    let b = Math.floor(Math.random()*n);
    if(b === a) b = (b+1)%n;
    return [a,b];
  }
  function crossBasketGradient(){
    // pick two different baskets, then one color from each
    const [bi, bj] = pickTwoDifferentIndexes(BASKETS.length);
    const c1 = pickFrom(BASKETS[bi]);
    const c2 = pickFrom(BASKETS[bj]);
    return [c1, c2];
  }

  const APP_KEY = 'aethernote.v2';
  let state = { bookshelves: [], active: 0 };

  const main = document.getElementById('main');
  const tabsStack = document.getElementById('tabsStack');
  const overlay = document.getElementById('overlay');
  const globalSearch = document.getElementById('globalSearch');

  /* ===== small helpers ===== */
  function newId(){ return Math.random().toString(36).slice(2); }
  function safe(s) { return (s || '').replace(/"/g, '&quot;'); }
  function createEl(tag, props = {}) {
    const el = document.createElement(tag);
    Object.entries(props).forEach(([k, v]) => {
      if (k in el) el[k] = v;
      else el.setAttribute(k, v);
    });
    return el;
  }

  /* ===== ensure gradients exist when loading old state ===== */
  function normalizeStateGradients(s) {
    (s.bookshelves || []).forEach(bs => {
      (bs.shelves || []).forEach(sh => {
        if (!sh.addGradient) sh.addGradient = crossBasketGradient();
        (sh.books || []).forEach(bk => {
          if (!bk.gradient) bk.gradient = crossBasketGradient();
        });
      });
    });
  }

  /* ===== Persistence ===== */
  function saveToStorage(){ localStorage.setItem(APP_KEY, JSON.stringify(state)); }
  function loadFromStorage(){
    const raw = localStorage.getItem(APP_KEY);
    if(raw){
      try {
        state = JSON.parse(raw);
        normalizeStateGradients(state);
      } catch (e) {
        console.error("Failed to parse state from localStorage", e);
        state = { bookshelves: [], active: 0 };
      }
    }
  }
  function modifyState(callback) {
    callback(state);
    saveToStorage();
    render();
  }

  /* ===== Generic Modals ===== */
  function showOverlay(content) {
    overlay.innerHTML = '';
    overlay.appendChild(content);
    overlay.classList.add('show');
  }
  function hideOverlay() {
    overlay.classList.remove('show');
    overlay.innerHTML = '';
  }

  function promptText(title, placeholder='Name', initial=''){
    return new Promise(resolve => {
      const modal = createEl('div', { className: 'modal' });
      modal.innerHTML = `
        <h3>${safe(title)}</h3>
        <div class="row"><input type="text" id="promptInput" placeholder="${safe(placeholder)}" value="${safe(initial)}"/></div>
        <div class="actions"><div></div><div class="right-actions"><button class="btn ghost" id="cancelBtn">Cancel</button><button class="btn primary" id="okBtn">OK</button></div></div>`;
      showOverlay(modal);

      const input = document.getElementById('promptInput');
      input.focus(); input.select();

      const close = (value) => { hideOverlay(); resolve(value); };
      modal.querySelector('#cancelBtn').onclick = () => close(null);
      modal.querySelector('#okBtn').onclick = () => close(input.value.trim() || null);
      overlay.onclick = e => { if(e.target === overlay) close(null); };
      input.onkeydown = e => { if(e.key === 'Enter') { e.preventDefault(); modal.querySelector('#okBtn').click(); }};
    });
  }

  function confirmAction(message) {
    return new Promise(resolve => {
      const modal = createEl('div', { className: 'modal' });
      modal.innerHTML = `
        <h3>Confirm Action</h3>
        <p>${safe(message)}</p>
        <div class="actions"><div></div><div class="right-actions"><button class="btn ghost" id="cancelBtn">Cancel</button><button class="btn danger" id="okBtn">Confirm</button></div></div>`;
      showOverlay(modal);

      const close = (value) => { hideOverlay(); resolve(value); };
      modal.querySelector('#cancelBtn').onclick = () => close(false);
      modal.querySelector('#okBtn').onclick = () => close(true);
      overlay.onclick = e => { if(e.target === overlay) close(false); };
    });
  }

  /* ===== Note Editor (updated symbols, shorter textarea) ===== */
  function editBook(book, bsIndex, shelfIndex, bookIndex){
    const modal = createEl('div', { className: 'modal' });
    const h3 = createEl('h3'); h3.textContent = book.title;

    const textarea = createEl('textarea', { id: 'noteArea', placeholder: 'Write your note…' });
    textarea.value = book.content || '';

    const actions = createEl('div', { className: 'actions' });
    const leftActions = createEl('div', { className: 'left-actions' });
    const rightActions = createEl('div', { className: 'right-actions' });
    actions.append(leftActions, rightActions);
    const renameBtn = createEl('button', {className: 'btn ghost', textContent: '[ ]'});
    const deleteBtn = createEl('button', {className: 'btn danger', textContent: 'X'});
    const closeBtn  = createEl('button', {className: 'btn ghost', textContent: '▼'});
    const saveBtn   = createEl('button', {className: 'btn primary', textContent: '✓'});

    leftActions.append(renameBtn, deleteBtn);
    rightActions.append(closeBtn, saveBtn);

    modal.append(h3, textarea, actions);
    showOverlay(modal);
    textarea.focus();
    const doSave = () => { book.content = textarea.value; saveToStorage(); };
    renameBtn.onclick = async () => {
      const newTitle = await promptText('Rename Book', 'New book title', book.title);
      if (newTitle) {
        modifyState(s => s.bookshelves[bsIndex].shelves[shelfIndex].books[bookIndex].title = newTitle);
        h3.textContent = newTitle;
      }
    };

    deleteBtn.onclick = async () => {
      if (await confirmAction(`Are you sure you want to delete the book "${book.title}" forever?`)) {
        modifyState(s => s.bookshelves[bsIndex].shelves[shelfIndex].books.splice(bookIndex, 1));
        hideOverlay();
      }
    };

    closeBtn.onclick = hideOverlay;
    saveBtn.onclick = () => { doSave(); hideOverlay(); };
    overlay.onclick = e => { if(e.target === overlay) { doSave(); hideOverlay(); } };
  }

  /* ===== inline edit helper ===== */
  function enableInlineEdit(element, onSave) {
    element.onclick = () => {
      const currentText = element.textContent;
      const input = document.createElement('input');
      input.type = 'text'; input.value = currentText;
      element.replaceWith(input);
      input.focus(); input.select();
      const save = () => {
        const newText = input.value.trim();
        if (newText && newText !== currentText) onSave(newText);
        else input.replaceWith(element);
      };
      input.onblur = save;
      input.onkeydown = (e) => {
        if (e.key === 'Enter') input.blur();
        if (e.key === 'Escape') input.replaceWith(element);
      };
    };
  }

  /* ===== Render ===== */
  function render() {
    renderTabs();
    main.innerHTML = '';
    const searchVal = (globalSearch.value || '').trim().toLowerCase();

    if (searchVal) {
      renderSearchResults(searchVal);
      return;
    }

    if (!state.bookshelves.length) {
      renderEmptyState();
      return;
    }

    const currentBS = state.bookshelves[state.active] || state.bookshelves[0];
    if (!currentBS) { renderEmptyState(); return; }

    const header = renderBookshelfHeader(currentBS, state.active);
    main.appendChild(header);

    const shelfContainer = createEl('div');
    (currentBS.shelves || []).forEach((shelf, shelfIndex) => {
      shelfContainer.appendChild(renderShelf(shelf, state.active, shelfIndex));
    });
    main.appendChild(shelfContainer);
  }

  function renderTabs() {
    tabsStack.innerHTML = '';
    state.bookshelves.forEach((bs, i) => {
      const b = createEl('button', {
        className: 'tab-btn' + (state.active === i ? ' active' : ''),
        title: bs.name,
        textContent: bs.name.slice(0, 10) + (bs.name.length > 10 ? '…' : '')
      });
      b.onclick = () => { modifyState(s => s.active = i); };
      tabsStack.appendChild(b);
    });
    const add = createEl('button', { className: 'tab-btn add', textContent: '+', title: 'Add bookshelf' });
    add.onclick = async () => {
      const name = await promptText('New Bookshelf', 'Bookshelf name');
      if (!name) return;
      modifyState(s => {
        s.bookshelves.push({ name, shelves: [] });
        s.active = s.bookshelves.length - 1;
      });
    };
    tabsStack.appendChild(add);
  }

  function renderEmptyState() {
    main.innerHTML = '';
    const empty = createEl('div', { className: 'bs-header' });
    const title = createEl('div', { className: 'bs-title', textContent: 'No bookshelves yet' });
    const btn = createEl('button', { className: 'btn-header', textContent: 'Create your first bookshelf' });
    btn.onclick = async () => {
      const name = await promptText('New Bookshelf', 'Bookshelf name');
      if (!name) return;
      modifyState(s => {
        s.bookshelves.push({ name, shelves: [] });
        s.active = 0;
      });
    };
    empty.append(title, btn);
    main.appendChild(empty);
  }

  function renderBookshelfHeader(bs, bsIndex) {
    const header = createEl('div', { className: 'bs-header' });
    const title = createEl('div', { className: 'bs-title', textContent: bs.name });
    enableInlineEdit(title, (newName) => {
      modifyState(s => s.bookshelves[bsIndex].name = newName);
    });
    const controls = createEl('div', { className: 'bs-controls' });

    const addShelfBtn = createEl('button', { className: 'btn-header', textContent: '+ Shelf' });
    addShelfBtn.onclick = async () => {
      const name = await promptText('New Shelf', 'Shelf name');
      if (!name) return;
      modifyState(s => {
        s.bookshelves[bsIndex].shelves.push({ name, collapsed: false, books: [], addGradient: crossBasketGradient() });
      });
    };

    const deleteBSBtn = createEl('button', { className: 'btn-header', textContent: 'Delete Bookshelf' });
    deleteBSBtn.onclick = async () => {
      if (await confirmAction(`Delete the bookshelf "${bs.name}" and all its contents? This cannot be undone.`)) {
        modifyState(s => {
          s.bookshelves.splice(bsIndex, 1);
          s.active = Math.max(0, s.active - 1);
        });
      }
    };

    controls.append(addShelfBtn, deleteBSBtn);
    header.append(title, controls);
    return header;
  }

  function renderShelf(shelf, bsIndex, shelfIndex) {
    const wrap = createEl('div', { className: 'shelf-wrap' });
    const bar = createEl('div', { className: 'shelf-bar' });
    const name = createEl('div', { className: 'shelf-name', textContent: shelf.name });
    enableInlineEdit(name, (newName) => {
      modifyState(s => s.bookshelves[bsIndex].shelves[shelfIndex].name = newName);
    });
    const ctrls = createEl('div', { className: 'shelf-controls' });

    if (!shelf.addGradient) {
      const g = crossBasketGradient();
      shelf.addGradient = g;
      saveToStorage();
    }
    const [addG1, addG2] = shelf.addGradient;
    const addB = createEl('button', { className: 'add-book-btn', textContent: '+' });
    addB.style.background = `linear-gradient(135deg, ${addG1}, ${addG2})`;
    addB.style.color = '#fff';
    addB.onclick = async () => {
      const title = await promptText('New Book', 'Book title');
      if (!title) return;
      const newBookGradient = crossBasketGradient();
      modifyState(s => s.bookshelves[bsIndex].shelves[shelfIndex].books.push({
        id: newId(),
        title,
        content: '',
        gradient: newBookGradient
      }));
    };

    const delShelf = createEl('button', { className: 'btn-shelf delete-btn', textContent: 'X' });
    delShelf.onclick = async () => {
      if (await confirmAction(`Are you sure you want to delete the shelf "${shelf.name}"?`)) {
        modifyState(s => s.bookshelves[bsIndex].shelves.splice(shelfIndex, 1));
      }
    };

    const coll = createEl('button', { className: 'btn-shelf', textContent: shelf.collapsed ? '▶' : '▼' });
    coll.onclick = () => modifyState(s => s.bookshelves[bsIndex].shelves[shelfIndex].collapsed = !shelf.collapsed);

    ctrls.append(addB, delShelf, coll);
    bar.append(name, ctrls);
    wrap.appendChild(bar);
    if (!shelf.collapsed) {
      const body = createEl('div', { className: 'shelf-body' });
      (shelf.books || []).forEach((book, bookIndex) => {
        body.appendChild(renderBook(book, bsIndex, shelfIndex, bookIndex));
      });
      const addTile = createEl('div', { className: 'book-add', textContent: '+' });
      addTile.style.background = `linear-gradient(135deg, ${addG1}, ${addG2})`;
      addTile.style.color = '#fff';
      addTile.onclick = addB.onclick;
      body.appendChild(addTile);
      wrap.appendChild(body);
    }
    return wrap;
  }

  function renderBook(book, bsIndex, shelfIndex, bookIndex) {
    const [a, b] = (book.gradient && book.gradient.length === 2) ?
    book.gradient : (book.gradient = crossBasketGradient());
    const el = createEl('div', { className: 'book', textContent: book.title });
    el.style.background = `linear-gradient(135deg, ${a}, ${b})`;
    el.onclick = () => editBook(book, bsIndex, shelfIndex, bookIndex);
    return el;
  }

  function renderSearchResults(query) {
    const results = [];
    state.bookshelves.forEach((bs, bi) => {
      (bs.shelves || []).forEach((sh, si) => {
        (sh.books || []).forEach((bk, ki) => {
          if ((bk.title || '').toLowerCase().includes(query) || (bk.content || '').toLowerCase().includes(query)) {
            results.push({ bi, si, ki, bs, sh, bk });
          }
        });
      });
    });
    const header = createEl('div', { className: 'bs-header' });
    const title = createEl('div', { className: 'bs-title' });
    title.textContent = `Search results for “${query}” — ${results.length} match(es)`;
    header.appendChild(title);
    main.appendChild(header);

    const body = createEl('div', { className: 'shelf-body' });
    results.forEach(({ bk, bi, si, ki, bs, sh }) => {
      const card = renderBook(bk, bi, si, ki);
      card.title = `${bs.name} › ${sh.name} › ${bk.title}`;
      body.appendChild(card);
    });
    main.appendChild(body);
  }

  /* ===== File Operations ===== */
  function saveToFile() {
    const data = JSON.stringify(state, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = createEl('a', { href: url, download: 'aethernote_backup.json' });
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function loadFromFile() {
    const input = createEl('input', { type: 'file', accept: '.json' });
    input.onchange = e => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const newState = JSON.parse(event.target.result);
          if (newState && Array.isArray(newState.bookshelves)) {
            normalizeStateGradients(newState);
            if (await confirmAction('This will overwrite your current notes. Are you sure?')) {
              state = newState;
              saveToStorage();
              render();
            }
          } else {
            alert('Invalid file format.');
          }
        } catch (err) {
          alert('Could not read file. It may be corrupted.');
          console.error(err);
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }

  /* ===== Event Listeners ===== */
  document.getElementById('menuBtn').onclick = function() {
    document.getElementById('menuDropdown').classList.toggle('show');
  };

  window.onclick = function(event) {
    if (!event.target.matches('#menuBtn')) {
      var dropdowns = document.getElementsByClassName("dropdown-content");
      for (var i = 0; i < dropdowns.length; i++) {
        var openDropdown = dropdowns[i];
        if (openDropdown.classList.contains('show')) {
          openDropdown.classList.remove('show');
        }
      }
    }
  }

  globalSearch.addEventListener('input', () => render());
  document.getElementById('saveBtn').onclick = saveToFile;
  document.getElementById('loadBtn').onclick = loadFromFile;

  /* ===== Init ===== */
  loadFromStorage();
  render();
})();
