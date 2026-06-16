(function () {
  "use strict";

  var DATA = window.CALC_DATA;
  if (!DATA) return;

  var fmt = new Intl.NumberFormat("ru-RU");
  var state = {
    market: "used",
    gpuBrand: "nvidia",
    cpuBrand: "intel",
    gpuId: "",
    cpuId: "",
    ramId: "ram-16ddr4",
    storageId: "ssd-1tb",
    mbId: "",
    psuId: "psu-600",
    caseId: "case-mid",
    coolerId: "cool-tower-basic",
    includeAssembly: true
  };

  var els = {};

  var SLOT_SELECT = {
    gpu: "gpuSelect",
    cpu: "cpuSelect",
    mb: "mbSelect",
    ram: "ramSelect",
    storage: "storageSelect",
    psu: "psuSelect",
    case: "caseSelect",
    cooler: "coolerSelect"
  };

  function shortName(name, maxLen) {
    if (!name) return "—";
    var max = maxLen || 26;
    if (name.length <= max) return name;
    return name.slice(0, max - 1) + "…";
  }

  function getSlotItem(slot) {
    switch (slot) {
      case "gpu": return state.gpuId ? findGpu(state.gpuId) : null;
      case "cpu": return state.cpuId ? findCpu(state.cpuId) : null;
      case "mb": return state.mbId ? findExtra(getMotherboards(), state.mbId) : null;
      case "ram": return findExtra(DATA.extras.ram, state.ramId);
      case "storage": return findExtra(DATA.extras.storage, state.storageId);
      case "psu": return findExtra(DATA.extras.psu, state.psuId);
      case "case": return findExtra(DATA.extras.case, state.caseId);
      case "cooler": return findExtra(DATA.extras.cooler, state.coolerId);
      default: return null;
    }
  }

  function isSlotEmpty(slot) {
    if (slot === "gpu") return !state.gpuId;
    if (slot === "cpu") return !state.cpuId;
    if (slot === "mb") return !state.mbId;
    return false;
  }

  function highlightSlot(slot, on) {
    var node = document.querySelector('.pc-slot[data-slot="' + slot + '"]');
    var field = document.querySelector('.calc-field[data-focus-slot="' + slot + '"]');
    if (node) node.classList.toggle("is-highlight-missing", on && isSlotEmpty(slot));
    if (field) field.classList.toggle("is-highlighting-empty", on && isSlotEmpty(slot));
  }

  function clearSlotHighlights() {
    document.querySelectorAll(".pc-slot.is-highlight-missing").forEach(function (n) {
      n.classList.remove("is-highlight-missing");
    });
    document.querySelectorAll(".calc-field.is-highlighting-empty").forEach(function (n) {
      n.classList.remove("is-highlighting-empty");
    });
  }

  function renderPcVisual() {
    if (!els.pcSlots) return;

    els.pcSlots.forEach(function (node) {
      var slot = node.getAttribute("data-slot");
      var item = getSlotItem(slot);
      var empty = isSlotEmpty(slot);
      var nameEl = node.querySelector(".pc-slot-name");

      node.classList.toggle("is-empty", empty);
      node.classList.toggle("is-filled", !empty);

      if (slot === "cooler") {
        node.classList.toggle("is-aio", item && item.type === "aio");
      } else {
        node.classList.remove("is-aio");
      }

      if (empty) {
        nameEl.textContent = "Пусто";
      } else if (item) {
        nameEl.textContent = shortName(item.name);
      } else {
        nameEl.textContent = "—";
      }
    });

    var missingRequired = [];
    if (!state.gpuId) missingRequired.push("видеокарту");
    if (!state.cpuId) missingRequired.push("процессор");
    if (!state.mbId && state.cpuId) missingRequired.push("материнскую плату");

    if (els.pcVisualHint) {
      if (missingRequired.length) {
        els.pcVisualHint.textContent = "Не хватает: " + missingRequired.join(", ") + ". Наведите на красный слот.";
      } else {
        els.pcVisualHint.textContent = "Сборка заполнена. Можно отправить расчёт в WhatsApp.";
      }
    }
  }

  function bindPcVisual() {
    els.pcSlots = document.querySelectorAll(".pc-slot[data-slot]");
    els.pcVisualHint = document.getElementById("pcVisualHint");

    document.querySelectorAll(".calc-field[data-focus-slot]").forEach(function (field) {
      var slot = field.getAttribute("data-focus-slot");
      field.addEventListener("mouseenter", function () { highlightSlot(slot, true); });
      field.addEventListener("mouseleave", clearSlotHighlights);
      field.addEventListener("focusin", function () { highlightSlot(slot, true); });
      field.addEventListener("focusout", clearSlotHighlights);
    });

    els.pcSlots.forEach(function (node) {
      var slot = node.getAttribute("data-slot");
      node.addEventListener("mouseenter", function () {
        clearSlotHighlights();
        highlightSlot(slot, true);
      });
      node.addEventListener("mouseleave", clearSlotHighlights);
      node.addEventListener("click", function () {
        var selectId = SLOT_SELECT[slot];
        var select = selectId ? document.getElementById(selectId) : null;
        if (select) {
          select.focus();
          select.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      });
    });
  }

  function avgRange(range) {
    if (!range) return 0;
    return Math.round((range[0] + range[1]) / 2);
  }

  var GPU_CPU_DISCOUNT = 0.9;

  function applyGpuCpuDiscount(range) {
    if (!range) return null;
    return [
      Math.round(range[0] * GPU_CPU_DISCOUNT),
      Math.round(range[1] * GPU_CPU_DISCOUNT)
    ];
  }

  function getMarketRange(item, discounted) {
    if (!item) return null;
    var range = state.market === "new" ? item.new : item.used;
    if (!range && state.market === "new") range = item.used;
    if (discounted && range) range = applyGpuCpuDiscount(range);
    return range;
  }

  function formatMoney(n) {
    return fmt.format(n) + " сом";
  }

  function formatRange(range) {
    if (!range) return "—";
    if (range[0] === range[1]) return formatMoney(range[0]);
    return fmt.format(range[0]) + " – " + fmt.format(range[1]) + " сом";
  }

  function findGpu(id) {
    return DATA.gpus.nvidia.concat(DATA.gpus.amd).find(function (g) { return g.id === id; });
  }

  function findCpu(id) {
    if (!id) return null;
    return DATA.cpus.intel.concat(DATA.cpus.amd).find(function (c) { return c.id === id; });
  }

  function findExtra(list, id) {
    return list.find(function (x) { return x.id === id; });
  }

  function getMotherboards() {
    var cpu = findCpu(state.cpuId);
    if (!cpu) return [];
    return DATA.extras.motherboard[cpu.socket] || [];
  }

  function suggestPsu(gpu) {
    if (!gpu) return "psu-500";
    var usedAvg = avgRange(gpu.used);
    if (usedAvg >= 90000) return "psu-850";
    if (usedAvg >= 45000) return "psu-750";
    if (usedAvg >= 18000) return "psu-600";
    return "psu-500";
  }

  function fillSelect(select, items, getLabel, selectedId, placeholder) {
    select.innerHTML = "";
    if (placeholder) {
      var ph = document.createElement("option");
      ph.value = "";
      ph.textContent = placeholder;
      select.appendChild(ph);
    }
    items.forEach(function (item) {
      var opt = document.createElement("option");
      opt.value = item.id;
      opt.textContent = getLabel(item);
      if (item.id === selectedId) opt.selected = true;
      select.appendChild(opt);
    });
  }

  function fillCpuSelect() {
    var list = DATA.cpus[state.cpuBrand];
    var groups = {};
    list.forEach(function (cpu) {
      if (!groups[cpu.gen]) groups[cpu.gen] = [];
      groups[cpu.gen].push(cpu);
    });
    els.cpuSelect.innerHTML = "";
    var placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "Выберите процессор";
    els.cpuSelect.appendChild(placeholder);
    Object.keys(groups).forEach(function (gen) {
      var og = document.createElement("optgroup");
      og.label = gen;
      groups[gen].forEach(function (cpu) {
        var opt = document.createElement("option");
        opt.value = cpu.id;
        var range = getMarketRange(cpu, true);
        opt.textContent = cpu.name + " · " + formatRange(range);
        if (cpu.id === state.cpuId) opt.selected = true;
        og.appendChild(opt);
      });
      els.cpuSelect.appendChild(og);
    });
    if (state.cpuId && !findCpu(state.cpuId)) {
      state.cpuId = "";
    }
  }

  function refreshGpuSelect() {
    var list = DATA.gpus[state.gpuBrand];
    fillSelect(els.gpuSelect, list, function (gpu) {
      return gpu.name + " · " + formatRange(getMarketRange(gpu, true));
    }, state.gpuId, "Выберите видеокарту");
  }

  function refreshMotherboardSelect() {
    var boards = getMotherboards();
    if (!boards.length) {
      els.mbSelect.innerHTML = '<option value="">Сначала выберите процессор</option>';
      state.mbId = "";
      return;
    }
    if (!boards.some(function (b) { return b.id === state.mbId; })) {
      state.mbId = boards[1] ? boards[1].id : boards[0].id;
    }
    fillSelect(els.mbSelect, boards, function (mb) {
      return mb.name + " · " + formatRange(getMarketRange(mb));
    }, state.mbId);
  }

  function lineItem(label, item, note, discounted) {
    var range = getMarketRange(item, discounted);
    return {
      label: label,
      name: item ? item.name : "—",
      range: range,
      avg: avgRange(range),
      note: note || ""
    };
  }

  function buildSummary() {
    var gpu = findGpu(state.gpuId);
    var cpu = findCpu(state.cpuId);
    var ram = findExtra(DATA.extras.ram, state.ramId);
    var storage = findExtra(DATA.extras.storage, state.storageId);
    var mb = findExtra(getMotherboards(), state.mbId);
    var psu = findExtra(DATA.extras.psu, state.psuId);
    var pcCase = findExtra(DATA.extras.case, state.caseId);
    var cooler = findExtra(DATA.extras.cooler, state.coolerId);
    var assembly = state.includeAssembly ? DATA.assemblyFee : null;

    var lines = [
      lineItem("Видеокарта", gpu, "", true),
      lineItem("Процессор", cpu, "", true),
      lineItem("Материнская плата", mb, cpu ? cpu.socket : ""),
      lineItem("Оперативная память", ram),
      lineItem("Накопитель", storage),
      lineItem("Блок питания", psu),
      lineItem("Корпус", pcCase),
      lineItem("Охлаждение", cooler)
    ];

    if (state.includeAssembly) {
      lines.push(lineItem("Сборка CYBER SPACE", { name: "Тест + Windows + кабели", new: DATA.assemblyFee.new, used: DATA.assemblyFee.used }));
    }

    var totalMin = 0;
    var totalMax = 0;
    var totalAvg = 0;
    var missing = false;

    lines.forEach(function (line) {
      if (!line.range) {
        missing = true;
        return;
      }
      totalMin += line.range[0];
      totalMax += line.range[1];
      totalAvg += line.avg;
    });

    return { lines: lines, totalMin: totalMin, totalMax: totalMax, totalAvg: totalAvg, missing: missing, gpu: gpu, cpu: cpu };
  }

  function renderSummary() {
    var summary = buildSummary();
    var marketLabel = state.market === "new" ? "Новые магазины" : "Б/У рынок";

    els.summaryMarket.textContent = marketLabel;

    if (summary.missing) {
      els.summaryTotal.textContent = "—";
      els.summaryRange.textContent = "Выберите видеокарту и процессор";
    } else {
      els.summaryTotal.textContent = formatMoney(summary.totalAvg);
      els.summaryRange.textContent = fmt.format(summary.totalMin) + " – " + fmt.format(summary.totalMax) + " сом";
    }

    els.summaryList.innerHTML = summary.lines.map(function (line) {
      var price = line.range ? formatRange(line.range) : '<span class="calc-missing">не выбрано</span>';
      return (
        '<li class="calc-summary-row">' +
          '<div class="calc-summary-row-top">' +
            '<span class="calc-summary-label">' + line.label + '</span>' +
            '<span class="calc-summary-price">' + price + '</span>' +
          '</div>' +
          '<span class="calc-summary-name">' + line.name + (line.note ? ' · ' + line.note : '') + '</span>' +
        '</li>'
      );
    }).join("");

    if (summary.gpu) {
      var psuHint = suggestPsu(summary.gpu);
      var psuItem = findExtra(DATA.extras.psu, psuHint);
      els.psuHint.textContent = psuItem
        ? "Рекомендуем БП от " + formatMoney(getMarketRange(psuItem)[0]) + " для " + summary.gpu.name
        : "";
    } else {
      els.psuHint.textContent = "";
    }

    els.waBtn.disabled = summary.missing;
    els.waBtn.onclick = function () {
      if (summary.missing) return;
      var msg = "Запрос расчёта сборки CYBER SPACE\n";
      msg += "Рынок: " + marketLabel + "\n";
      msg += "Итого (средняя): ~" + formatMoney(summary.totalAvg) + "\n";
      msg += "Диапазон: " + fmt.format(summary.totalMin) + " – " + fmt.format(summary.totalMax) + " сом\n\n";
      summary.lines.forEach(function (line) {
        if (line.range) msg += line.label + ": " + line.name + " (" + formatRange(line.range) + ")\n";
      });
      msg += "\nХочу уточнить сборку и заказать.";
      window.open("https://wa.me/996556024449?text=" + encodeURIComponent(msg), "_blank");
    };

    renderPcVisual();
  }

  function bindMarketToggle() {
    els.marketBtns.forEach(function (btn) {
      btn.addEventListener("click", function () {
        state.market = btn.getAttribute("data-market");
        els.marketBtns.forEach(function (b) {
          b.classList.toggle("is-active", b === btn);
          b.setAttribute("aria-pressed", b === btn ? "true" : "false");
        });
        fillCpuSelect();
        refreshGpuSelect();
        refreshMotherboardSelect();
        renderSummary();
      });
    });
  }

  function bindGpuBrandTabs() {
    els.gpuTabs.forEach(function (tab) {
      tab.addEventListener("click", function () {
        state.gpuBrand = tab.getAttribute("data-brand");
        state.gpuId = "";
        els.gpuTabs.forEach(function (t) {
          t.classList.toggle("is-active", t === tab);
        });
        refreshGpuSelect();
        renderSummary();
      });
    });
  }

  function bindCpuBrandTabs() {
    els.cpuTabs.forEach(function (tab) {
      tab.addEventListener("click", function () {
        state.cpuBrand = tab.getAttribute("data-cpu-brand");
        state.cpuId = "";
        state.mbId = "";
        els.cpuTabs.forEach(function (t) {
          t.classList.toggle("is-active", t === tab);
          t.setAttribute("aria-selected", t === tab ? "true" : "false");
        });
        fillCpuSelect();
        refreshMotherboardSelect();
        renderSummary();
      });
    });
  }

  function bindSelects() {
    els.gpuSelect.addEventListener("change", function () {
      state.gpuId = els.gpuSelect.value;
      if (state.gpuId) state.psuId = suggestPsu(findGpu(state.gpuId));
      fillSelect(els.psuSelect, DATA.extras.psu, function (p) {
        return p.name + " · " + formatRange(getMarketRange(p));
      }, state.psuId);
      renderSummary();
    });

    els.cpuSelect.addEventListener("change", function () {
      state.cpuId = els.cpuSelect.value;
      refreshMotherboardSelect();
      renderSummary();
    });

    [
      ["ramSelect", "ramId", DATA.extras.ram],
      ["storageSelect", "storageId", DATA.extras.storage],
      ["psuSelect", "psuId", DATA.extras.psu],
      ["caseSelect", "caseId", DATA.extras.case],
      ["coolerSelect", "coolerId", DATA.extras.cooler]
    ].forEach(function (cfg) {
      els[cfg[0]].addEventListener("change", function () {
        state[cfg[1]] = els[cfg[0]].value;
        renderSummary();
      });
    });

    els.mbSelect.addEventListener("change", function () {
      state.mbId = els.mbSelect.value;
      renderSummary();
    });

    els.assemblyCheck.addEventListener("change", function () {
      state.includeAssembly = els.assemblyCheck.checked;
      renderSummary();
    });
  }

  function initSelects() {
    fillSelect(els.ramSelect, DATA.extras.ram, function (x) {
      return x.name + " · " + formatRange(getMarketRange(x));
    }, state.ramId);
    fillSelect(els.storageSelect, DATA.extras.storage, function (x) {
      return x.name + " · " + formatRange(getMarketRange(x));
    }, state.storageId);
    fillSelect(els.psuSelect, DATA.extras.psu, function (x) {
      return x.name + " · " + formatRange(getMarketRange(x));
    }, state.psuId);
    fillSelect(els.caseSelect, DATA.extras.case, function (x) {
      return x.name + " · " + formatRange(getMarketRange(x));
    }, state.caseId);
    fillSelect(els.coolerSelect, DATA.extras.cooler, function (x) {
      return x.name + " · " + formatRange(getMarketRange(x));
    }, state.coolerId);
    fillCpuSelect();
    refreshGpuSelect();
    refreshMotherboardSelect();
  }

  function cacheElements() {
    els.marketBtns = document.querySelectorAll("[data-market]");
    els.gpuTabs = document.querySelectorAll("[data-brand]");
    els.cpuTabs = document.querySelectorAll("[data-cpu-brand]");
    els.gpuSelect = document.getElementById("gpuSelect");
    els.cpuSelect = document.getElementById("cpuSelect");
    els.ramSelect = document.getElementById("ramSelect");
    els.storageSelect = document.getElementById("storageSelect");
    els.mbSelect = document.getElementById("mbSelect");
    els.psuSelect = document.getElementById("psuSelect");
    els.caseSelect = document.getElementById("caseSelect");
    els.coolerSelect = document.getElementById("coolerSelect");
    els.assemblyCheck = document.getElementById("assemblyCheck");
    els.summaryMarket = document.getElementById("summaryMarket");
    els.summaryTotal = document.getElementById("summaryTotal");
    els.summaryRange = document.getElementById("summaryRange");
    els.summaryList = document.getElementById("summaryList");
    els.psuHint = document.getElementById("psuHint");
    els.waBtn = document.getElementById("calcWhatsApp");
  }

  document.addEventListener("DOMContentLoaded", function () {
    cacheElements();
    bindMarketToggle();
    bindGpuBrandTabs();
    bindCpuBrandTabs();
    bindSelects();
    bindPcVisual();
    initSelects();
    renderSummary();
  });
})();
