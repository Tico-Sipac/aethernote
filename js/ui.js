import { createEl, safe } from './utils.js';
import { state, modifyState, userThemes, updateUserThemes } from './state.js';
import { applyTheme, getAllThemes, getThemeByName, getIconsForTheme, saveUserThemes } from './theme-engine.js';

const overlay = document.getElementById('overlay');
let isModalOpen = false;
let activeModalCloseHandler = null;

export function showOverlay(content, closeHandler = null) {
  activeModalCloseHandler = closeHandler;
  overlay.innerHTML = '';
  overlay.appendChild(content);
  overlay.classList.add('show');
  if (!isModalOpen) {
    history.pushState({ modal: true }, null);
    isModalOpen = true;
  }
}

export function hideOverlay() {
  activeModalCloseHandler = null;
  overlay.classList.remove('show');
  overlay.innerHTML = '';
  if (isModalOpen) {
    if (history.state && history.state.modal) history.back();
    isModalOpen = false;
  }
}

window.addEventListener('popstate', (event) => {
  if (isModalOpen) {
    if (typeof activeModalCloseHandler === 'function') {
      activeModalCloseHandler();
    }
    isModalOpen = false;
    overlay.classList.remove('show');
    overlay.innerHTML = '';
  }
});

document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
      if (isModalOpen && typeof activeModalCloseHandler === 'function') {
        activeModalCloseHandler();
      }
    }
});


export function promptText(title, placeholder = 'Name', initial = '') {
  return new Promise(resolve => {
    const modal = createEl('div', { className: 'modal' });
    modal.innerHTML = `<h3>${safe(title)}</h3>
      <div class="row input-wrapper"><input type="text" id="promptInput" placeholder="${safe(placeholder)}" value="${safe(initial)}"/></div>
      <div class="actions"><div class="left-actions"></div><div class="right-actions">
        <button class="btn ghost" id="cancelBtn">Cancel</button>
        <button class="btn primary" id="okBtn">OK</button>
      </div></div>`;
    const close = (value) => { hideOverlay(); resolve(value); };
    showOverlay(modal, () => close(null));
    const input = document.getElementById('promptInput');
    input.focus();
    input.select();
    modal.querySelector('#cancelBtn').onclick = () => close(null);
    modal.querySelector('#okBtn').onclick = () => close(input.value.trim() || null);
    input.onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); modal.querySelector('#okBtn').click(); } };
  });
}

export function confirmAction(message) {
  return new Promise(resolve => {
    const modal = createEl('div', { className: 'modal' });
    modal.innerHTML = `<h3>Confirm Action</h3><p>${safe(message)}</p>
      <div class="actions"><div></div><div class="right-actions">
        <button class="btn ghost" id="cancelBtn">Cancel</button>
        <button class="btn danger" id="okBtn">Confirm</button>
      </div></div>`;
    const close = (value) => { hideOverlay(); resolve(value); };
    showOverlay(modal, () => close(false));
    modal.querySelector('#cancelBtn').onclick = () => close(false);
    modal.querySelector('#okBtn').onclick = () => close(true);
  });
}

export function editBook(book, bsIndex, shelfIndex, bookIndex) {
    const modal = createEl('div', { className: 'modal' });
    modal.innerHTML = `<h3>${safe(book.title)}</h3>`;
    
    const textarea = createEl('textarea', { id: 'noteArea', placeholder: 'Write your note...' });
    textarea.value = book.content || '';
    
    const tagsInputWrapper = createEl('div', { className: 'tags-input-wrapper' });
    const tagsInput = createEl('input', { type: 'text', placeholder: 'Add a tag and press Enter...' });
    const tagsDisplay = createEl('div', { className: 'tags-display' });
    tagsInputWrapper.append(tagsInput);

    const editorWrapper = createEl('div', { className: 'editor-wrapper' });
    
    editorWrapper.append(textarea, tagsDisplay, tagsInputWrapper);

    const renderTags = () => {
      tagsDisplay.innerHTML = '';
      (book.tags || []).forEach((tag, tagIndex) => {
        const tagItem = createEl('div', { className: 'tag-item', textContent: tag });
        const deleteTagBtn = createEl('span', { className: 'delete-tag', innerHTML: '&times;', title: 'Remove tag' });
        deleteTagBtn.onclick = () => { book.tags.splice(tagIndex, 1); renderTags(); };
        tagItem.append(deleteTagBtn);
        tagsDisplay.append(tagItem);
      });
    };
    renderTags();

    const addPendingTag = () => {
      const newTag = tagsInput.value.trim().toLowerCase();
      if (newTag && !(book.tags || []).includes(newTag)) { book.tags.push(newTag); renderTags(); }
      tagsInput.value = '';
    };
    tagsInput.onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); addPendingTag(); } };

    const actions = createEl('div', { className: 'actions' });
    const leftActions = createEl('div', { className: 'left-actions' });
    const rightActions = createEl('div', { className: 'right-actions' });
    actions.append(leftActions, rightActions);
    const icons = getIconsForTheme(getThemeByName(state.activeTheme));
    const renameBtn = createEl('button', { className: 'btn ghost icon-btn', title: 'Rename', innerHTML: `<span class="icon">${icons.rename}</span>` });
    const deleteBtn = createEl('button', { className: 'btn danger icon-btn', title: 'Delete', innerHTML: `<span class="icon">${icons.trash}</span>` });
    const closeBtn = createEl('button', { className: 'btn ghost icon-btn', title: 'Close', innerHTML: `<span class="icon">${icons.chevronDown}</span>` });
    const saveBtn = createEl('button', { className: 'btn primary icon-btn', title: 'Save', innerHTML: `<span class="icon">${icons.check}</span>` });
    leftActions.append(renameBtn, deleteBtn);
    rightActions.append(closeBtn, saveBtn);

    modal.append(editorWrapper, actions);

    const doSaveAndClose = () => {
      book.content = textarea.value;
      addPendingTag();
      modifyState(s => { s.bookshelves[bsIndex].shelves[shelfIndex].books[bookIndex] = book; });
      hideOverlay();
    };

    showOverlay(modal, doSaveAndClose);
    textarea.focus();

    // --- THIS IS THE CORRECTED SECTION ---
    renameBtn.onclick = async () => {
      const newTitle = await promptText('Rename Book', 'New book title', book.title);
      if (newTitle) {
        book.title = newTitle; // Update the object in memory
        modal.querySelector('h3').textContent = newTitle; // Update the modal UI
        
        // THIS IS THE FIX: Force a save and re-render of the main app
        modifyState(() => {}); 
      }
    };
    // --- END OF CORRECTED SECTION ---
    
    deleteBtn.onclick = async () => {
      if (await confirmAction(`Delete "${book.title}"?`)) {
        hideOverlay();
        modifyState(s => s.bookshelves[bsIndex].shelves[shelfIndex].books.splice(bookIndex, 1));
      }
    };
    closeBtn.onclick = doSaveAndClose;
    saveBtn.onclick = doSaveAndClose;
    overlay.onclick = e => { if (e.target === overlay) doSaveAndClose(); };
}

export function enableInlineEdit(element, onSave) {
  element.onclick = (e) => {
    e.stopPropagation();
    if (element.querySelector('input')) return;
    const currentText = element.textContent;
    const input = createEl('input', { type: 'text', value: currentText });
    element.innerHTML = '';
    element.appendChild(input);
    input.focus();
    input.select();
    const save = () => {
      const newText = input.value.trim();
      element.textContent = (newText && newText !== currentText) ? newText : currentText;
      if (newText && newText !== currentText) onSave(newText);
      input.removeEventListener('blur', save);
      input.removeEventListener('keydown', handleKeydown);
    };
    const handleKeydown = (e) => {
      if (e.key === 'Enter') { e.preventDefault(); input.blur(); }
      if (e.key === 'Escape') { input.value = currentText; input.blur(); }
    };
    input.addEventListener('blur', save);
    input.addEventListener('keydown', handleKeydown);
  };
}

export function showThemesModal() {
    const modal = createEl('div', { className: 'modal' });
    modal.innerHTML = `<h3>Themes</h3>`;
    const themeList = createEl('div', { className: 'theme-list' });

    const renderThemeList = () => {
        themeList.innerHTML = '';
        getAllThemes().forEach(theme => {
            const card = createEl('div', { className: 'theme-card' + (state.activeTheme === theme.name ? ' active' : '') });
            card.onclick = () => {
                applyTheme(theme);
                document.querySelectorAll('.theme-card').forEach(c => c.classList.remove('active'));
                card.classList.add('active');
            };
            card.innerHTML = `<h4>${safe(theme.name)}</h4>`;
            const swatches = createEl('div', { className: 'theme-swatches' });
            ['--bg-1', '--bg-2', '--accent', '--ink'].forEach(key => {
                if (theme.styles.colors[key]) {
                    const swatch = createEl('div', { className: 'swatch' });
                    swatch.style.backgroundColor = theme.styles.colors[key];
                    swatches.appendChild(swatch);
                }
            });
            card.append(swatches);
            if (!theme.isSystem) {
                const deleteBtn = createEl('button', { className: 'delete-theme-btn', innerHTML: '&times;' });
                deleteBtn.onclick = async (e) => {
                    e.stopPropagation();
                    if (await confirmAction(`Delete theme "${theme.name}"?`)) {
                        const updatedUserThemes = userThemes.filter(t => t.name !== theme.name);
                        updateUserThemes(updatedUserThemes);
                        saveUserThemes();
                        renderThemeList();
                    }
                };
                card.appendChild(deleteBtn);
            }
            themeList.appendChild(card);
        });
    };

    renderThemeList();
    const actions = createEl('div', { className: 'actions' });
    const rightActions = createEl('div', { className: 'right-actions' });
    const loadBtn = createEl('button', { className: 'btn', textContent: 'Load Theme' });
    const closeBtn = createEl('button', { className: 'btn ghost', textContent: 'Close' });
    loadBtn.onclick = () => {
        const input = createEl('input', { type: 'file', accept: '.json' });
        input.onchange = e => {
            const file = e.target.files[0]; if (!file) return;
            const reader = new FileReader();
            reader.onload = async (event) => {
                try {
                    const newTheme = JSON.parse(event.target.result);
                    if (!newTheme.name || !newTheme.styles) { alert('Invalid theme file: Missing "name" or "styles" property.'); return; }
                    const existingUserThemeIndex = userThemes.findIndex(t => t.name.toLowerCase() === newTheme.name.toLowerCase());
                    let finalUserThemes = [...userThemes];
                    if (existingUserThemeIndex > -1) {
                        if (await confirmAction(`A custom theme named "${newTheme.name}" already exists. Do you want to overwrite it?`)) {
                            finalUserThemes[existingUserThemeIndex] = newTheme;
                        } else { return; }
                    } else {
                        finalUserThemes.push(newTheme);
                    }
                    updateUserThemes(finalUserThemes);
                    saveUserThemes();
                    renderThemeList();
                    applyTheme(newTheme);
                } catch (err) { alert(`Could not load theme. Error: ${err.message}`); console.error("Theme load error:", err); }
            };
            reader.readAsText(file);
        };
        input.click();
    };
    closeBtn.onclick = hideOverlay;
    rightActions.append(loadBtn, closeBtn);
    actions.append(createEl('div'), rightActions);
    modal.append(themeList, actions);
    showOverlay(modal, hideOverlay);
}

export function showTagsModal() {
    const globalSearch = document.getElementById('globalSearch');
    const modal = createEl('div', { className: 'modal' });
    modal.innerHTML = `<h3>All Tags</h3>`;
    const allTags = new Set();
    state.bookshelves.forEach(bs => {
        (bs.shelves || []).forEach(sh => {
            (sh.books || []).forEach(bk => {
                (bk.tags || []).forEach(tag => allTags.add(tag));
            });
        });
    });
    const tagsContainer = createEl('div', { className: 'global-tags-list' });
    if (allTags.size === 0) {
        tagsContainer.innerHTML = '<p>No tags yet.</p>';
    } else {
        Array.from(allTags).sort().forEach(tag => {
            const tagBtn = createEl('button', {
                className: 'tag-btn',
                textContent: `#${tag}`,
                onclick: () => {
                    globalSearch.value = tag;
                    globalSearch.dispatchEvent(new Event('input', { bubbles: true }));
                    hideOverlay();
                }
            });
            tagsContainer.appendChild(tagBtn);
        });
    }
    const actions = createEl('div', { className: 'actions' });
    const closeBtn = createEl('button', { className: 'btn primary', textContent: 'Close' });
    closeBtn.onclick = hideOverlay;
    actions.appendChild(createEl('div'));
    actions.appendChild(closeBtn);
    modal.append(tagsContainer, actions);
    showOverlay(modal, hideOverlay);
}