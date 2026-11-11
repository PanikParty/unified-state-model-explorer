/*
 * Help tips. Any element carrying data-tip="<key>" explains itself on hover,
 * keyboard focus or tap, using the glossary in tips.js. Works for content
 * rendered later, because events are delegated from the document.
 */
(function () {
  "use strict";
  var TIPS = window.USM_TIPS || {};
  var popup = null;
  var current = null;

  function marker(key) {
    var tip = TIPS[key];
    if (!tip) return "";
    return "<span class='tip' data-tip='" + key + "' tabindex='0' role='button' aria-label='Explain: " +
      tip.term.replace(/'/g, "&#39;") + "'>?</span>";
  }

  function term(key, html) {
    if (!TIPS[key]) return html;
    return "<span class='term' data-tip='" + key + "' tabindex='0'>" + html + "</span>";
  }

  /* Add a “?” after the label text of every bound input that has a glossary entry. */
  function decorate(scope) {
    (scope || document).querySelectorAll("[data-bind], [data-layer]").forEach(function (input) {
      var key = input.dataset.bind || ("layer." + input.dataset.layer);
      var label = input.closest("label");
      if (!TIPS[key] || !label || label.querySelector(".tip")) return;
      var host = label.querySelector(":scope > span > span") || label.querySelector(":scope > span") || label;
      host.insertAdjacentHTML("beforeend", " " + marker(key));
    });
  }

  function ensurePopup() {
    if (popup) return popup;
    popup = document.createElement("div");
    popup.className = "tip-pop";
    popup.id = "usm-tip-pop";
    popup.setAttribute("role", "tooltip");
    popup.hidden = true;
    document.body.appendChild(popup);
    return popup;
  }

  function show(target) {
    var tip = TIPS[target.dataset.tip];
    if (!tip) return;
    var el = ensurePopup();
    el.innerHTML = "";
    var head = document.createElement("strong");
    head.textContent = tip.term;
    var body = document.createElement("span");
    body.textContent = tip.text;
    el.appendChild(head);
    el.appendChild(body);
    el.hidden = false;
    current = target;
    target.setAttribute("aria-describedby", el.id);

    /* place below the target, flipped above and clamped so it stays on screen */
    var box = target.getBoundingClientRect();
    var width = Math.min(320, window.innerWidth - 16);
    el.style.width = width + "px";
    var left = Math.max(8, Math.min(window.innerWidth - width - 8, box.left + box.width / 2 - width / 2));
    var top = box.bottom + 8;
    if (top + el.offsetHeight > window.innerHeight - 8 && box.top - el.offsetHeight - 8 > 0) {
      top = box.top - el.offsetHeight - 8;
    }
    el.style.left = left + "px";
    el.style.top = top + "px";
  }

  function hide() {
    if (!popup || popup.hidden) return;
    popup.hidden = true;
    if (current) current.removeAttribute("aria-describedby");
    current = null;
  }

  function tipTarget(event) {
    return event.target && event.target.closest ? event.target.closest("[data-tip]") : null;
  }

  document.addEventListener("mouseover", function (event) {
    var target = tipTarget(event);
    if (target && target !== current) show(target);
  });
  document.addEventListener("mouseout", function (event) {
    var target = tipTarget(event);
    if (target && !target.contains(event.relatedTarget)) hide();
  });
  document.addEventListener("focusin", function (event) {
    var target = tipTarget(event);
    if (target) show(target); else hide();
  });
  document.addEventListener("focusout", function (event) { if (tipTarget(event)) hide(); });
  document.addEventListener("click", function (event) {
    var target = tipTarget(event);
    if (!target) { hide(); return; }
    if (target.classList.contains("tip")) event.preventDefault();   // do not activate the enclosing label
    if (current === target && event.detail !== 0 && target.dataset.tapped === "1") { target.dataset.tapped = ""; hide(); return; }
    target.dataset.tapped = "1";
    show(target);
  });
  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") hide();
    var target = tipTarget(event);
    if (target && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); show(target); }
  });
  /* keep an open tip attached to its target while the page moves */
  window.addEventListener("scroll", function () { if (current) show(current); }, true);
  window.addEventListener("resize", hide);

  window.USMHelp = { marker: marker, term: term, decorate: decorate };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", function () { decorate(); });
  else decorate();
}());
