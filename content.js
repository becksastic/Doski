const WORDS_REGEX = new RegExp(FAMILY_WORDS.join("|"), "giu");

let observerPaused = false;

// Helper: is inline element
function isInline(el) {
  if (!(el instanceof HTMLElement)) return false;
  const display = window.getComputedStyle(el).display;
  return display.startsWith("inline") || display === "contents";
}

// Create span with native click handler
function makeMaskSpan(word) {
  const span = document.createElement("span");
  span.className = "trans-mask masked";
  span.setAttribute("data-word", word);
  span.textContent = "🏳️‍⚧️";
  span.addEventListener("click", function (e) {
    e.stopPropagation();
    if (span.classList.contains("masked")) {
      span.textContent = word;
      span.classList.remove("masked");
      span.classList.add("revealed");
    } else {
      span.textContent = "🏳️‍⚧️";
      span.classList.remove("revealed");
      span.classList.add("masked");
    }
    // Pause observer for 1 second to prevent instant re-masking
    observerPaused = true;
    setTimeout(() => { observerPaused = false; }, 1000);
  });
  return span;
}

// Mask split-letter (inline sibling) words
function maskInlineSequence(startEl) {
  let nodes = [];
  let text = "";
  let el = startEl;
  while (el && isInline(el) && !el.classList?.contains("trans-mask")) {
    nodes.push(el);
    text += el.innerText || "";
    el = el.nextSibling;
    if (!el || el.nodeType !== 1) break;
  }
  if (WORDS_REGEX.test(text)) {
    const span = makeMaskSpan(text);
    nodes[0].parentNode.insertBefore(span, nodes[0]);
    nodes.forEach(n => n.remove());
  }
}

// Mask normal text node
function maskTextNode(node) {
  const text = node.nodeValue;
  if (!text || !WORDS_REGEX.test(text)) return;
  const frag = document.createDocumentFragment();
  let lastIndex = 0;
  text.replace(WORDS_REGEX, (match, offset) => {
    frag.appendChild(document.createTextNode(text.slice(lastIndex, offset)));
    frag.appendChild(makeMaskSpan(match));
    lastIndex = offset + match.length;
  });
  frag.appendChild(document.createTextNode(text.slice(lastIndex)));
  node.parentNode.replaceChild(frag, node);
}

// Main scan
function deepScan(root) {
  if (!root.querySelectorAll) return;
  root.querySelectorAll("p, span, div, h1, h2, h3, li").forEach(el => {
    // Skip already masked
    if (el.classList?.contains("trans-mask")) return;
    if (el.childNodes.length === 1 && el.childNodes[0].nodeType === 3) {
      maskTextNode(el.childNodes[0]);
    } else if (isInline(el)) {
      maskInlineSequence(el);
    }
  });
  root.querySelectorAll("*").forEach(el => {
    if (el.shadowRoot) deepScan(el.shadowRoot);
  });
}

// Protected observer (pauses after click)
const obs = new MutationObserver(muts => {
  if (observerPaused) return;
  muts.forEach(m => {
    m.addedNodes.forEach(n => {
      if (n.nodeType === 1) deepScan(n);
      else if (n.nodeType === 3) maskTextNode(n);
    });
  });
});

deepScan(document.body);
obs.observe(document.body, { childList: true, subtree: true });
