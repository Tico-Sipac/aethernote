export function newId() {
  return 'id-' + Math.random().toString(36).slice(2);
}

export function safe(s) {
  return (s || '').replace(/"/g, '&quot;');
}

export function createEl(tag, props = {}) {
  const el = document.createElement(tag);
  Object.entries(props).forEach(([k, v]) => {
    if (k === 'innerHTML') el.innerHTML = v;
    else if (k in el) el[k] = v;
    else el.setAttribute(k, v);
  });
  return el;
}

export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

const BASKETS = [
  ['#0057bd', '#5213c8', '#0fa5a6', '#4a24ac'], // Blues
  ['#e35a00', '#e67e22', '#b9ca00', '#cba432'], // Oranges
  ['#14b23a', '#199608', '#468e08', '#75ac11'], // Greens
  ['#ac117e', '#b32c9a', '#9d00a4', '#7a16a7'], // Purples/Pinks
  ['#ff2c0a', '#ff3e54', '#ff417d', '#f100a9'], // Fiery Reds/Pinks
  ['#f050ff', '#b500ff', '#6800e2', '#5938ff'], // Electric Purples/Violets
  ['#507bff', '#00a0ff', '#00f6ff', '#00d8c2'], // Vivid Blues/Cyans
  ['#00d58a', '#00ff72', '#26d04f', '#26d028'], // Lush Greens/Limes
  ['#bfff4b', '#b7d300', '#bfb133', '#ff9600']  // Radiant Yellows/Oranges
];


function pickFrom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickTwoDifferentIndexes(n) {
  const a = Math.floor(Math.random() * n);
  let b = Math.floor(Math.random() * n);
  if (b === a) b = (b + 1) % n;
  return [a, b];
}

export function crossBasketGradient() {
  const [bi, bj] = pickTwoDifferentIndexes(BASKETS.length);
  return [pickFrom(BASKETS[bi]), pickFrom(BASKETS[bj])];
}
