/* Unified State Model explorer — rendering and state. Model maths lives in model.js. */
(function () {
  "use strict";
  var USM = window.USM;
  var d3 = window.d3;
  var root = document.getElementById("usm");
  var STORAGE_KEY = "usm-explorer-state-v2";
  var help = window.USMHelp || { marker: function () { return ""; }, term: function (key, html) { return html; } };

  function defaults() {
    return {
      view: "state",
      market: "Example market",
      kStatus: "unscreened",
      k2Window: "",
      k2Range: "",
      p: "unclassified",
      showEpisodes: false,
      selected: 0,
      layers: [
        { name: "Binding layer", ed: 0, es: 0, prov: "proxy", w: "W2" },
        { name: "Downstream layer", ed: 0.3, es: 0.6, prov: "proxy", w: "" }
      ],
      capital: { ed: 0, es: 0.5, prov: "proxy" },
      decision: {
        gamma: -0.048, gain: 0.5, loss: 0.25, lambda: 0.2, nu: 0.1, margin: 0, window: 2,
        q: 0.8, budgetFraction: 0.02, capital: 1000000, stressLoss: 0.25, execution: 50000
      },
      scenario: {
        horizon: 15, demandRatio: 1.1, techGrowth: 0.25, demandGrowth: 0.04, coupling: 1, meaningLoss: 0.09,
        capitalStart: 0.15, capitalGrowth: 0.35, utilisation: 0.8, capitalDemandGrowth: 0.18, intensity: 0.8,
        lockupTarget: 0.75, lockupSpeed: 0.35, meaningFloor: 0.5, strainLimit: 0.85
      }
    };
  }

  var state = defaults();
  var episodes = [];

  /* ── persistence: a per-browser convenience only ── */
  function load() {
    try {
      var saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "null");
      if (!saved || typeof saved !== "object") return;
      var base = defaults();
      ["view", "market", "kStatus", "k2Window", "k2Range", "p", "showEpisodes", "selected"].forEach(function (k) {
        if (typeof saved[k] === typeof base[k]) state[k] = saved[k];
      });
      ["capital", "decision", "scenario"].forEach(function (group) {
        Object.keys(base[group]).forEach(function (k) {
          if (saved[group] && typeof saved[group][k] === typeof base[group][k]) state[group][k] = saved[group][k];
        });
      });
      if (Array.isArray(saved.layers) && saved.layers.length) {
        state.layers = saved.layers.slice(0, 12).map(function (l) {
          return {
            name: String(l.name || "Layer"), ed: clamp(+l.ed || 0), es: clamp(+l.es || 0),
            prov: String(l.prov || "proxy"), w: String(l.w || "")
          };
        });
      }
      state.selected = Math.max(0, Math.min(state.layers.length - 1, state.selected | 0));
    } catch (error) { /* storage unavailable: run from defaults */ }
  }
  function save() {
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (error) { /* ignore */ }
  }

  /* ── helpers ── */
  function clamp(v) { return Math.max(-0.95, Math.min(0.95, v)); }
  function fmt(v, digits) {
    if (!Number.isFinite(v)) return v < 0 ? "−∞" : "∞";
    var d = digits === undefined ? 2 : digits;
    var text = (Math.abs(v) < Math.pow(10, -d) / 2 ? 0 : v).toFixed(d);
    return text.replace("-", "−");
  }
  function pct(v, digits) {
    if (!Number.isFinite(v)) return v < 0 ? "−∞" : "∞";
    return (v * 100).toFixed(digits === undefined ? 1 : digits).replace("-", "−") + "%";
  }
  function money(v) {
    if (!Number.isFinite(v)) return "Unbounded";
    return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(v);
  }
  function esc(text) {
    return String(text).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function getPath(path) { return path.split(".").reduce(function (o, k) { return o[k]; }, state); }
  function setPath(path, value) {
    var keys = path.split(".");
    var target = state;
    for (var i = 0; i < keys.length - 1; i += 1) target = target[keys[i]];
    target[keys[keys.length - 1]] = value;
  }
  function isVoid(prov) { return !!USM.VOID_PROVENANCE[prov]; }

  /* ── input binding ── */
  function syncInputs() {
    root.querySelectorAll("[data-bind]").forEach(function (el) {
      var value = getPath(el.dataset.bind);
      if (el.type === "checkbox") el.checked = !!value;
      else if (document.activeElement !== el) el.value = value;
    });
    var layer = state.layers[state.selected];
    root.querySelectorAll("[data-layer]").forEach(function (el) {
      if (document.activeElement !== el || el.type === "range") el.value = layer[el.dataset.layer];
    });
    root.querySelectorAll("[data-show-when='k2']").forEach(function (el) {
      el.hidden = state.kStatus !== "K2-observed";
    });
    document.getElementById("layer-remove").disabled = state.layers.length <= 1;
    document.getElementById("layer-add").disabled = state.layers.length >= 12;
  }

  function bindInputs() {
    root.querySelectorAll("[data-bind]").forEach(function (el) {
      var handler = function () {
        var value;
        if (el.type === "checkbox") value = el.checked;
        else if (el.hasAttribute("data-number")) {
          value = parseFloat(el.value);
          if (!Number.isFinite(value)) return;      // ignore half-typed numbers
        } else value = el.value;
        setPath(el.dataset.bind, value);
        render(true);
      };
      el.addEventListener("input", handler);
      el.addEventListener("change", handler);
    });
    root.querySelectorAll("[data-layer]").forEach(function (el) {
      var handler = function () {
        var key = el.dataset.layer;
        var layer = state.layers[state.selected];
        layer[key] = (key === "ed" || key === "es") ? clamp(parseFloat(el.value) || 0) : el.value;
        render(true);
      };
      el.addEventListener("input", handler);
      el.addEventListener("change", handler);
    });
    root.querySelectorAll(".tabs button").forEach(function (button) {
      button.addEventListener("click", function () { state.view = button.dataset.view; render(true); });
    });
    document.getElementById("layer-add").addEventListener("click", function () {
      if (state.layers.length >= 12) return;
      state.layers.push({ name: "Layer " + (state.layers.length + 1), ed: 0.2, es: 0.2, prov: "UNPLACED", w: "" });
      state.selected = state.layers.length - 1;
      render(true);
    });
    document.getElementById("layer-remove").addEventListener("click", function () {
      if (state.layers.length <= 1) return;
      state.layers.splice(state.selected, 1);
      state.selected = Math.max(0, state.selected - 1);
      render(true);
    });
    document.getElementById("reset").addEventListener("click", function () {
      state = defaults();
      render(true);
    });
    window.addEventListener("resize", function () { renderPlanes(); renderScenario(); });
  }

  /* ── state planes ── */
  var DOMAIN = [-0.95, 0.95];
  var TICKS = [-0.9, -0.45, 0, 0.45, 0.9];
  var CONTOURS = [-0.75, -0.5, -0.25, 0.25, 0.5, 0.75];

  function drawPlane(svg, spec) {
    var size = 348;
    var g = svg.append("g").attr("transform", "translate(" + spec.x + "," + spec.y + ")");
    var x = d3.scaleLinear().domain(DOMAIN).range([52, size - 6]);
    var y = d3.scaleLinear().domain(DOMAIN).range([size - 30, 10]);
    var left = x(DOMAIN[0]), right = x(DOMAIN[1]), top = y(DOMAIN[1]), bottom = y(DOMAIN[0]);

    g.append("text").attr("class", "title").attr("x", left).attr("y", -4).text(spec.title);
    g.append("clipPath").attr("id", "clip-" + spec.id)
      .append("rect").attr("x", left).attr("y", top).attr("width", right - left).attr("height", bottom - top);

    /* Λ < 0: below the anti-diagonal */
    g.append("path")
      .attr("d", "M" + left + "," + y(-DOMAIN[0]) + "L" + right + "," + y(-DOMAIN[1]) + "L" + right + "," + bottom + "L" + left + "," + bottom + "Z")
      .attr("fill", "var(--danger)").attr("fill-opacity", 0.1);

    TICKS.forEach(function (t) {
      g.append("line").attr("x1", x(t)).attr("x2", x(t)).attr("y1", top).attr("y2", bottom).attr("stroke", "var(--rule)");
      g.append("line").attr("x1", left).attr("x2", right).attr("y1", y(t)).attr("y2", y(t)).attr("stroke", "var(--rule)");
      g.append("text").attr("x", x(t)).attr("y", bottom + 14).attr("text-anchor", "middle").text(fmt(t, 2));
      g.append("text").attr("x", left - 6).attr("y", y(t) + 4).attr("text-anchor", "end").text(fmt(t, 2));
    });

    /* contours of Λ: εs = 2Λ − εd */
    var clipped = g.append("g").attr("clip-path", "url(#clip-" + spec.id + ")");
    CONTOURS.forEach(function (level) {
      clipped.append("line")
        .attr("x1", x(-2)).attr("y1", y(2 * level + 2)).attr("x2", x(2)).attr("y2", y(2 * level - 2))
        .attr("stroke", "var(--muted)").attr("stroke-opacity", 0.55).attr("stroke-dasharray", "3 4");
      /* label where the contour meets the right or top edge */
      var atRight = 2 * level - DOMAIN[1];
      var lx, ly;
      if (atRight >= DOMAIN[0] && atRight <= DOMAIN[1]) { lx = right - 4; ly = y(atRight) - 4; }
      else { lx = x(2 * level - DOMAIN[1]) + 14; ly = top + 11; }
      if (level < 0) { lx = x(2 * level - DOMAIN[0]) - 4; ly = bottom - 5; }
      g.append("text").attr("x", lx).attr("y", ly).attr("text-anchor", "end").attr("font-size", 9.5)
        .text("Λ " + fmt(level, 2));
    });
    clipped.append("line").attr("x1", x(-2)).attr("y1", y(-2)).attr("x2", x(2)).attr("y2", y(2)).attr("stroke", "var(--muted)");
    clipped.append("line").attr("x1", x(-2)).attr("y1", y(2)).attr("x2", x(2)).attr("y2", y(-2)).attr("stroke", "var(--ink)").attr("stroke-width", 2);

    g.append("rect").attr("x", left).attr("y", top).attr("width", right - left).attr("height", bottom - top)
      .attr("fill", "none").attr("stroke", "var(--muted)");
    g.append("text").attr("x", (left + right) / 2).attr("y", size + 2).attr("text-anchor", "middle").text("ε_d," + spec.short + "  (demand flexibility)");
    g.append("text").attr("transform", "translate(9 " + ((top + bottom) / 2) + ") rotate(-90)").attr("text-anchor", "middle").text("ε_s," + spec.short + "  (supply flexibility)");

    /* reference rows: legacy episodes, always hollow */
    (spec.reference || []).forEach(function (ep) {
      var m = g.append("g").attr("transform", "translate(" + x(ep.ed) + "," + y(ep.es) + ")");
      m.append("path").attr("d", "M0,-6L6,0L0,6L-6,0Z").attr("fill", "none").attr("stroke", "var(--muted)").attr("stroke-width", 1.5).attr("stroke-dasharray", "2 2");
      m.append("text").attr("x", ep.flip ? -9 : 9).attr("y", 4).attr("text-anchor", ep.flip ? "end" : "start").attr("font-size", 9.5).text(ep.tag);
      m.append("title").text(ep.name + " (" + ep.dates + ") — legacy, void for inference");
    });

    spec.markers.forEach(function (mk) {
      var m = g.append("g").attr("class", mk.draggable ? "marker" : null)
        .attr("transform", "translate(" + x(mk.ed) + "," + y(mk.es) + ")");
      var r = mk.selected ? 8 : 5.5;
      var shape = spec.shape === "square"
        ? m.append("rect").attr("x", -r + 1).attr("y", -r + 1).attr("width", 2 * r - 2).attr("height", 2 * r - 2)
        : m.append("circle").attr("r", r);
      shape.attr("stroke-width", 2)
        .attr("fill", mk.hollow ? "var(--surface)" : spec.color)
        .attr("stroke", mk.hollow ? spec.color : "var(--surface)")
        .attr("fill-opacity", mk.selected || mk.hollow ? 1 : 0.6);
      if (mk.label) m.append("text").attr("x", r + 4).attr("y", 4).attr("font-size", 10).attr("fill", "var(--ink)").text(mk.label);
      m.append("title").text(mk.title);
      if (mk.onSelect && !mk.selected) m.style("cursor", "pointer").on("click", mk.onSelect);
      if (mk.draggable) {
        m.call(d3.drag().on("drag", function (event) {
          /* measure against the persistent <svg>: this <g> is rebuilt on every render */
          var pointer = d3.pointer(event, svg.node());
          mk.onDrag(clamp(x.invert(pointer[0] - spec.x)), clamp(y.invert(pointer[1] - spec.y)));
        }));
      }
    });
  }

  function renderPlanes() {
    var svg = d3.select("#planes");
    svg.selectAll("*").remove();
    var binding = USM.bindingLayerIndex(state.layers);
    /* side by side when there is room, stacked on narrow screens */
    var stacked = (svg.node().getBoundingClientRect().width || 800) < 560;
    svg.attr("viewBox", stacked ? "0 0 400 790" : "0 0 800 392");
    var capitalAt = stacked ? { x: 20, y: 420 } : { x: 420, y: 22 };
    var resourceAt = stacked ? { x: 20, y: 22 } : { x: 10, y: 22 };
    drawPlane(svg, {
      id: "r", title: "Resource leg — " + state.market, short: "R", x: resourceAt.x, y: resourceAt.y, color: "var(--s1)", shape: "circle",
      reference: state.showEpisodes ? episodes.filter(function (e) { return e.resource; }).map(function (e) {
        return { name: e.name, dates: e.dates, ed: e.resource.ed, es: e.resource.es };
      }).map(function (e, i, all) {
        e.tag = "E" + (i + 1);
        /* put the tag on the left when another row sits just to the right */
        e.flip = all.some(function (o) { return o !== e && Math.abs(o.es - e.es) < 0.08 && o.ed > e.ed && o.ed - e.ed < 0.2; });
        return e;
      }) : [],
      markers: state.layers.map(function (layer, index) {
        return {
          ed: layer.ed, es: layer.es, selected: index === state.selected, hollow: isVoid(layer.prov),
          label: "L" + (index + 1) + (index === binding ? " ★" : ""),
          title: layer.name + ": εd " + fmt(layer.ed) + ", εs " + fmt(layer.es) + " (" + layer.prov + ")",
          draggable: index === state.selected,
          onSelect: function () { state.selected = index; render(true); },
          onDrag: function (ed, es) { layer.ed = +ed.toFixed(2); layer.es = +es.toFixed(2); render(false); }
        };
      })
    });
    drawPlane(svg, {
      id: "c", title: "Capital leg", short: "C", x: capitalAt.x, y: capitalAt.y, color: "var(--s2)", shape: "square",
      markers: [{
        ed: state.capital.ed, es: state.capital.es, selected: true, hollow: isVoid(state.capital.prov),
        title: "Capital leg: εd " + fmt(state.capital.ed) + ", εs " + fmt(state.capital.es) + " (" + state.capital.prov + ")",
        draggable: true,
        onDrag: function (ed, es) { state.capital.ed = +ed.toFixed(2); state.capital.es = +es.toFixed(2); render(false); }
      }]
    });
  }

  function renderEpisodeKey() {
    var el = document.getElementById("episode-key");
    var rows = episodes.filter(function (e) { return e.resource; });
    el.hidden = !(state.showEpisodes && rows.length);
    el.innerHTML = "<strong>Legacy rows, void for inference (§7):</strong> " + rows.map(function (e, i) {
      return "E" + (i + 1) + " " + esc(e.name) + " " + esc(e.dates);
    }).join(" · ");
  }

  function renderLayers() {
    var binding = USM.bindingLayerIndex(state.layers);
    var body = root.querySelector("#layer-table tbody");
    body.innerHTML = state.layers.map(function (layer, index) {
      var r = USM.readout(layer.ed, layer.es);
      return "<tr data-index='" + index + "' aria-selected='" + (index === state.selected) + "'>" +
        "<td>L" + (index + 1) + " · " + esc(layer.name) +
          (index === binding ? "<span class='pill binding' data-tip='binding' tabindex='0'>binding ★</span>" : "") +
          "<span class='pill" + (isVoid(layer.prov) ? " void" : "") + "'>" + esc(layer.prov) + "</span></td>" +
        "<td class='num'>" + fmt(r.ed) + "</td><td class='num'>" + fmt(r.es) + "</td>" +
        "<td class='num'>" + fmt(r.delta) + "</td><td class='num'>" + fmt(r.level) + "</td>" +
        "<td class='num'>" + USM.muText(r) + "</td>" +
        "<td>" + r.band + "<br><small>" + USM.BANDS[r.band] + "</small></td><td>" + r.corner + "</td></tr>";
    }).join("");
    body.querySelectorAll("tr").forEach(function (row) {
      row.addEventListener("click", function () { state.selected = +row.dataset.index; render(true); });
    });
    var layer = state.layers[state.selected];
    document.getElementById("out-red").textContent = fmt(layer.ed);
    document.getElementById("out-res").textContent = fmt(layer.es);
    document.getElementById("out-ced").textContent = fmt(state.capital.ed);
    document.getElementById("out-ces").textContent = fmt(state.capital.es);

    var c = USM.readout(state.capital.ed, state.capital.es);
    document.getElementById("capital-readout").innerHTML =
      "<span>" + help.term("eta", "η<sub>d</sub>") + " <strong>" + fmt(c.demandEta) + "</strong></span>" +
      "<span>" + help.term("eta", "η<sub>s</sub>") + " <strong>" + fmt(c.supplyEta) + "</strong></span>" +
      "<span>" + help.term("delta", "Δ<sub>C</sub>") + " <strong>" + fmt(c.delta) + "</strong></span>" +
      "<span>" + help.term("level", "Λ<sub>C</sub>") + " <strong>" + fmt(c.level) + "</strong></span>" +
      "<span>" + help.term("mu", "μ") + " <strong>" + USM.muText(c) + "</strong></span>" +
      "<span>" + help.term("corner", c.corner) + "</span>" +
      "<span class='pill" + (isVoid(state.capital.prov) ? " void" : "") + "'>" + esc(state.capital.prov) + "</span>";
  }

  function renderMap() {
    var binding = USM.bindingLayerIndex(state.layers);
    document.getElementById("map-readout").innerHTML = state.layers.map(function (layer, index) {
      var r = USM.readout(layer.ed, layer.es);
      var entry = USM.mapEntry({
        kStatus: state.kStatus, k2Window: state.k2Window.trim(), k2Range: state.k2Range.trim(),
        band: r.band, p: state.p, provenance: layer.prov, w: layer.w
      });
      var who = "L" + (index + 1) + " · " + esc(layer.name) + (index === binding ? " ★" : "");
      return "<div class='map-row'><span class='who'>" + who + "</span> — " +
        (entry.defined
          ? "<strong>" + entry.key.replace(/\|/g, " · ") + "</strong><br>" + esc(entry.text)
          : "<span class='none'><strong>No position defined.</strong> " + esc(entry.reason) + "</span>") +
        "</div>";
    }).join("") +
      (state.layers.length > 1 ? "<p class='note'>A stack's position is the combination of its layers' entries and is never itself a cell (§2.5). ★ marks the binding layer.</p>" : "");
  }

  /* ── decision overlay ── */
  function renderDecision() {
    var d = USM.decision(state.decision);
    var svg = d3.select("#decision-chart");
    svg.selectAll("*").remove();
    var parts = [
      { label: "λG", value: d.favourable, color: "var(--s1)" },
      { label: "−νD", value: d.adverse, color: "var(--s3)" },
      { label: "Γ", value: state.decision.gamma, color: "var(--s2)" },
      { label: "Edge", value: d.edge, color: "var(--s4)" },
      { label: "m", value: state.decision.margin, color: "var(--muted)" }
    ];
    var max = Math.max(0.02, d3.max(parts, function (p) { return Math.abs(p.value); }) * 1.3);
    var scale = d3.scaleLinear().domain([-max, max]).range([64, 404]);
    var zero = scale(0);
    svg.append("line").attr("x1", zero).attr("x2", zero).attr("y1", 18).attr("y2", 182).attr("stroke", "var(--ink)");
    svg.append("text").attr("x", zero).attr("y", 200).attr("text-anchor", "middle").text("0");
    parts.forEach(function (part, index) {
      var yPos = 26 + index * 32;
      var end = scale(part.value);
      svg.append("text").attr("x", 6).attr("y", yPos + 13).attr("fill", "var(--ink)").text(part.label);
      svg.append("rect").attr("x", Math.min(zero, end)).attr("y", yPos).attr("width", Math.max(Math.abs(end - zero), 1)).attr("height", 18)
        .attr("fill", part.color).attr("fill-opacity", part.label === "m" ? 0.6 : 0.9);
      svg.append("text").attr("x", part.value >= 0 ? Math.min(end + 6, 402) : Math.max(end - 6, 66)).attr("y", yPos + 13)
        .attr("text-anchor", part.value >= 0 ? "start" : "end").text(pct(part.value, 1));
    });

    document.getElementById("decision-readout").innerHTML =
      "<div class='verdict'>" +
        "<span class='badge " + (d.passes ? "pass" : "fail") + "'>" + (d.passes ? "RULE PASSES" : "SIZE ZERO") + "</span>" +
        "<span>" + help.term("out.edge", "λG − νD + Γ") + " = <strong>" + pct(d.edge, 1) + "</strong></span>" +
        "<span>" + help.term("decision.margin", "Margin m") + " = <strong>" + pct(state.decision.margin, 1) + "</strong></span>" +
      "</div>" +
      "<div class='table-wrap'><table><tbody>" +
        "<tr><td>" + help.term("out.ev", "EV over T") + "</td><td class='num'>" + pct(d.ev, 1) + "</td></tr>" +
        "<tr><td>" + help.term("out.tq", "Favourable-transition quantile time T<sub>q</sub>") + "</td><td class='num'>" + (Number.isFinite(d.tQ) ? fmt(d.tQ, 2) + " years" : "Not reached") + "</td></tr>" +
        "<tr><td>" + help.term("out.carry", "Negative carry paid to T<sub>q</sub>") + "</td><td class='num'>" + (Number.isFinite(d.carryCost) ? pct(d.carryCost, 1) : "Unbounded") + "</td></tr>" +
        "<tr><td>" + help.term("out.budget", "Loss-budget bound") + "</td><td class='num'>" + money(d.budgetBound) + "</td></tr>" +
        "<tr><td>" + help.term("decision.execution", "Execution bound") + "</td><td class='num'>" + money(state.decision.execution) + "</td></tr>" +
        "<tr><td><strong>" + help.term("out.size", "Maximum size") + "</strong></td><td class='num'><strong>" + money(d.size) + "</strong></td></tr>" +
      "</tbody></table></div>" +
      "<p class='note'>" + (d.passes
        ? "The rule passing means the stated assumptions clear the margin. It is not a recommendation."
        : "The edge does not exceed the entry margin, so size is zero by rule (§4.2). The bounds above are shown for reference only.") +
      " This is a loss-budget rule at quantile q under one stress scenario, not a zero-ruin guarantee.</p>";
  }

  /* ── scale scenario (exploratory) ── */
  function scenarioParams() {
    var s = state.scenario;
    return {
      horizon: Math.max(1, Math.min(50, s.horizon)),
      demandRatio: Math.max(0.01, s.demandRatio),
      techGrowth: Math.max(0, s.techGrowth),
      demandGrowth: s.demandGrowth,
      coupling: Math.max(0, s.coupling),
      meaningLoss: Math.max(0, Math.min(0.99, s.meaningLoss)),
      capitalStart: Math.max(0.01, Math.min(1, s.capitalStart)),
      capitalGrowth: Math.max(0, s.capitalGrowth),
      utilisation: Math.max(0.01, s.utilisation),
      capitalDemandGrowth: s.capitalDemandGrowth,
      intensity: Math.max(0, s.intensity),
      lockupTarget: Math.max(0, Math.min(1, s.lockupTarget)),
      lockupSpeed: Math.max(0, s.lockupSpeed),
      meaningFloor: Math.max(0.01, Math.min(1, s.meaningFloor)),
      strainLimit: Math.max(0.01, s.strainLimit)
    };
  }

  function renderScenario() {
    var p = scenarioParams();
    var result = USM.scenario(p);
    var points = result.points;
    var node = document.getElementById("scenario-chart");
    var svg = d3.select(node);
    svg.selectAll("*").remove();
    var width = Math.max(320, Math.round(node.getBoundingClientRect().width || 760));
    var left = width <= 440 ? 48 : 62, right = width - 16;
    svg.attr("viewBox", "0 0 " + width + " 560");
    var x = d3.scaleLinear().domain([0, p.horizon]).range([left, right]);
    var logs = points.reduce(function (acc, d) { return acc.concat([d.logSupply, d.logDemand]); }, []);
    var yVolume = d3.scaleLinear().domain([Math.min(0, d3.min(logs)) - 0.2, d3.max(logs) + 0.2]).nice().range([144, 34]);
    var rawMaxCapital = d3.max(points, function (d) { return Math.max(d.capitalDemand, d.capitalSupply); });
    var capitalCeiling = Math.max(1.2, Math.min(rawMaxCapital * 1.1, 3));     // supply is capped at 1; keep it readable
    var yCapital = d3.scaleLinear().domain([0, capitalCeiling]).range([288, 178]);
    svg.append("clipPath").attr("id", "clip-capital").append("rect").attr("x", 0).attr("y", 176).attr("width", width).attr("height", 114);
    var yMeaning = d3.scaleLinear().domain([0, 1]).range([402, 322]);
    var yAllocation = d3.scaleLinear().domain([0, 1]).range([516, 436]);
    var few = width <= 440 ? 2 : 3;

    function strip(scale, top, bottom, title, ticks) {
      svg.append("text").attr("class", "title").attr("x", left).attr("y", top - 8).text(title);
      ticks.forEach(function (t) {
        svg.append("line").attr("x1", left).attr("x2", right).attr("y1", scale(t)).attr("y2", scale(t)).attr("stroke", "var(--rule)");
        svg.append("text").attr("x", left - 8).attr("y", scale(t) + 4).attr("text-anchor", "end").text(fmt(t, 1));
      });
      svg.append("line").attr("x1", left).attr("x2", left).attr("y1", top).attr("y2", bottom).attr("stroke", "var(--muted)");
      svg.append("line").attr("x1", left).attr("x2", right).attr("y1", bottom).attr("y2", bottom).attr("stroke", "var(--muted)");
    }
    function path(scale, accessor, color, widthPx, clipId) {
      var line = d3.line().x(function (d) { return x(d.t); }).y(function (d) { return scale(accessor(d)); });
      var el = svg.append("path").datum(points).attr("d", line).attr("fill", "none").attr("stroke", color).attr("stroke-width", widthPx || 2);
      if (clipId) el.attr("clip-path", "url(#" + clipId + ")");
    }

    strip(yVolume, 34, 144, "Intelligence volume (log₂ index)", yVolume.ticks(few));
    strip(yCapital, 178, 288, "Capital demand and supply (convertible-base index)", yCapital.ticks(few));
    strip(yMeaning, 322, 402, "Unit meaning", [0, 0.5, 1]);
    strip(yAllocation, 436, 516, "Capital converted and lockup", [0, 0.5, 1]);

    path(yVolume, function (d) { return d.logSupply; }, "var(--s1)");
    path(yVolume, function (d) { return d.logDemand; }, "var(--s2)");
    path(yCapital, function (d) { return d.capitalDemand; }, "var(--s3)", 2, "clip-capital");
    if (rawMaxCapital > capitalCeiling) {
      svg.append("text").attr("x", right).attr("y", 170).attr("text-anchor", "end")
        .text("capital demand runs off scale, to " + fmt(rawMaxCapital, 1) + " by year " + fmt(p.horizon, 0));
    }
    path(yCapital, function (d) { return d.capitalSupply; }, "var(--s4)");
    path(yCapital, function (d) { return d.capitalSupply * p.strainLimit; }, "var(--muted)", 1);
    path(yMeaning, function (d) { return d.meaning; }, "var(--s5)");
    path(yAllocation, function (d) { return d.converted; }, "var(--s6)");
    path(yAllocation, function (d) { return d.lockup; }, "var(--s7)");
    svg.append("line").attr("x1", left).attr("x2", right).attr("y1", yMeaning(p.meaningFloor)).attr("y2", yMeaning(p.meaningFloor)).attr("stroke", "var(--muted)");

    d3.ticks(0, p.horizon, width <= 440 ? 3 : Math.min(6, Math.max(2, Math.round(p.horizon / 2)))).forEach(function (t) {
      svg.append("line").attr("x1", x(t)).attr("x2", x(t)).attr("y1", 516).attr("y2", 521).attr("stroke", "var(--muted)");
      svg.append("text").attr("x", x(t)).attr("y", 536).attr("text-anchor", "middle").text(fmt(t, 0));
    });
    svg.append("text").attr("x", (left + right) / 2).attr("y", 555).attr("text-anchor", "middle").text("Years");

    if (result.first) {
      var fx = x(result.first.point.t);
      svg.append("line").attr("x1", fx).attr("x2", fx).attr("y1", 22).attr("y2", 516).attr("stroke", "var(--accent)").attr("stroke-width", 2).attr("stroke-dasharray", "5 3");
      svg.append("text").attr("x", right).attr("y", 14).attr("text-anchor", "end").attr("fill", "var(--ink)")
        .text("First crossing: " + result.first.key + " · " + fmt(result.first.point.t, 1) + " y");
    }

    var rows = result.crossings.map(function (c) {
      return "<tr><td>" + esc(c.label) + "</td><td class='num'>" +
        (c.point ? fmt(c.point.t, 1) + " y" : "not within " + fmt(p.horizon, 0) + " y") + "</td></tr>";
    }).join("");
    var at = result.first ? result.first.point : null;
    document.getElementById("scenario-readout").innerHTML =
      "<div class='table-wrap'><table><tbody>" + rows + "</tbody></table></div>" +
      (at
        ? "<p class='note'>At the first crossing (" + fmt(at.t, 1) + " y): intelligence supply " + fmt(at.supply, 1) + "×, demand " + fmt(at.demand, 1) +
          "×; capital demand / supply " + fmt(at.strain, 2) + "; converted " + pct(at.converted, 0) + "; lockup " + pct(at.lockup, 0) +
          "; unit meaning " + pct(at.meaning, 0) + ".</p>"
        : "<p class='note'>No boundary is crossed within the horizon.</p>") +
      "<p class='note'>A crossing is where an assumed path meets an assumed threshold. It is not a probability, a hazard or a projected date.</p>";

    var lr = result.longRun;
    var forced = [];
    forced.push(lr.capitalDemandRate > 0
      ? "<strong>Capital strain is crossed eventually, whatever the threshold.</strong> Capital supply is capped at 1 while capital demand grows at " + pct(lr.capitalDemandRate, 0) + "/yr (g<sub>CD</sub> + β·g<sub>T</sub>)."
      : "Capital demand does not grow (g<sub>CD</sub> + β·g<sub>T</sub> ≤ 0), so the cap on capital supply never binds through growth.");
    if (lr.capitalDemandRate > 0) {
      forced.push("Once capital binds, intelligence supply grows at <strong>" + pct(lr.supplyRate, 0) + "/yr</strong> (g<sub>T</sub>(1 − β) − g<sub>CD</sub>)" +
        (lr.supplyRate < 0 ? ": it <strong>shrinks</strong>, and unit meaning then recovers instead of decaying." : "."));
    }
    forced.push("Demand / supply then trends at <strong>" + pct(lr.ratioRate, 0) + "/yr</strong> (g<sub>ID</sub> + (α − 1) × supply growth). " +
      (lr.ratioRate < 0 ? "Supply meets demand eventually." : "Supply never meets demand on these assumptions."));
    forced.push("The chart can show <em>when</em> a boundary is crossed. For the outcomes above, <em>whether</em> is fixed by the functional forms, not by the numbers.");
    document.getElementById("scenario-forced").innerHTML = "<ul class='plain'><li>" + forced.join("</li><li>") + "</li></ul>";
  }

  /* ── top level ── */
  function renderView() {
    root.querySelectorAll(".tabs button").forEach(function (button) {
      var active = button.dataset.view === state.view;
      button.setAttribute("aria-selected", active ? "true" : "false");
      document.getElementById("panel-" + button.dataset.view).hidden = !active;
    });
  }

  function render(shouldSave) {
    renderView();
    syncInputs();
    renderPlanes();
    renderEpisodeKey();
    renderLayers();
    renderMap();
    renderDecision();
    renderScenario();
    if (shouldSave) save();
  }

  load();
  bindInputs();
  render(false);

  /* Seed rows are optional; the page works without them (e.g. opened from file://). */
  if (window.fetch) {
    window.fetch("episodes.json").then(function (response) { return response.ok ? response.json() : null; })
      .then(function (data) {
        if (data && Array.isArray(data.episodes)) { episodes = data.episodes; renderPlanes(); renderEpisodeKey(); }
      }).catch(function () { /* no seed rows */ });
  }
}());
