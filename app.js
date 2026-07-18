const state = {
  data: null,
  view: "dashboard",
  search: "",
  currentUserId: "",
  authToken: sessionStorage.getItem("cmms.authToken") || "",
  dataCollection: "assets",
  archiveCurrentFolder: "",
  archiveSearch: "",
  commissioningNotice: "",
  generationMonthlySheet: "summary",
  outageFilters: {},
  dashboardDate: "",
  productionSyncTimers: {},
  shuntReactorSyncTimers: {},
  dailyGenerationSyncTimers: {}
};

const titles = {
  dashboard: "Dashboard",
  dailyGenerationReport: "Daily Generation Report",
  productionSummary: "Daily Production",
  monthlyProduction: "Generation Monthly Report",
  operationWorkbook: "Operation Workbook",
  energyMeter: "Energy Meter",
  waterLevel: "Water Level",
  production: "Hourly Report",
  shuntReactor1: "Shunt Reactor",
  lineParameter: "Line Parameter",
  assets: "Asset Management",
  work: "Work Orders",
  pm: "Plant Maintenance Types",
  commissioningReports: "Commissioning and Test Report",
  logbook: "Operations Logbook",
  maintenanceLogbook: "Maintenance Logbook",
  inventory: "Spare Parts Inventory",
  maintenanceArchive: "Digital Archive",
  documents: "Documents and Attachments",
  data: "Data Control",
  reports: "Reports and KPIs",
  users: "User Management"
};

const plantOperationModuleOrder = [
  "production",
  "shuntReactor1",
  "lineParameter",
  "waterLevel",
  "energyMeter",
  "productionSummary",
  "dailyGenerationReport",
  "logbook",
  "monthlyProduction",
  "operationWorkbook"
];

const statusTone = {
  Critical: "red",
  High: "amber",
  Medium: "blue",
  Low: "green",
  Online: "green",
  Operational: "green",
  Standby: "blue",
  Watch: "amber",
  "In Progress": "blue",
  Scheduled: "amber",
  Requested: "amber",
  Approved: "green",
  Closed: "green",
  Warning: "amber",
  Info: "blue"
};

const productionStorageKey = "cmms.productionSheets";
const productionMetaStorageKey = "cmms.productionSheetMeta";
const shuntReactorStorageKey = "cmms.shuntReactorSheets";
const lineParameterStorageKey = "cmms.lineParameterSheets";
const productionMeterStorageKey = "cmms.productionMeterReadings";
const energyMeterStorageKey = "cmms.energyMeterReadings";
const waterLevelStorageKey = "cmms.waterLevelSheets";
const dailyGenerationStorageKey = "cmms.dailyGenerationReports";
const productionMeterBaselineDate = "2026-06-24";
const waterUtilizedCumecFactor = 1.66;
const maxAttachmentSize = 500 * 1024 * 1024;
const legacyArchiveDirectoryNames = [
  "Audio-Visual-Datas",
  "Calculations",
  "HYDRO-Backup-Soft-ware",
  "HYDRO-Dam-monitoring",
  "HYDRO-HEPP-Training-Material-",
  "HYDRO-Test-scheme",
  "HYDRO-User-Manual",
  "Operation-and-Maintenance-Manuals",
  "Reference-book-for-hydropower(HYDRO)",
  "Technical-Drawings"
];
const legacyArchiveDirectoryKeys = new Set(legacyArchiveDirectoryNames.map(name => name.toLowerCase()));

function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[char]));
}

function fmtDate(value) {
  if (!value) return "";
  return new Date(value).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function fmtArchiveDateTime(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = number => String(number).padStart(2, "0");
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} - ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function badge(label, tone) {
  return `<span class="badge ${tone || statusTone[label] || "blue"}">${esc(label)}</span>`;
}

function moduleHead(title, subtitle, meta = "", eyebrow = "Hydro OMMS") {
  return `
    <div class="module-head">
      <div>
        <p class="eyebrow">${esc(eyebrow)}</p>
        <h2>${esc(title)}</h2>
        ${subtitle ? `<p class="module-subtitle">${esc(subtitle)}</p>` : ""}
      </div>
      ${meta ? `<div class="module-actions">${meta}</div>` : ""}
    </div>
  `;
}

function operationHead(title, meta = "", subtitle = "") {
  return moduleHead(title, subtitle, meta, "Plant Operation Report");
}

function summaryStrip(items) {
  return `
    <div class="summary-strip">
      ${items.map(item => `
        <div class="summary-tile ${item.tone ? `summary-${esc(item.tone)}` : ""}">
          <span>${esc(item.label)}</span>
          <strong>${esc(item.value)}</strong>
          ${item.note ? `<small>${esc(item.note)}</small>` : ""}
        </div>
      `).join("")}
    </div>
  `;
}

const operationShiftBlocks = [
  { name: "Morning", range: "00:00 - 08:00" },
  { name: "Evening", range: "08:00 - 16:00" },
  { name: "Night", range: "16:00 - 24:00" }
];

function operationShiftLabel(shift) {
  const block = operationShiftBlocks.find(item => item.name === shift);
  return block ? `${block.name} (${block.range})` : shift;
}

function operationShiftOptions(selected = "Morning") {
  return operationShiftBlocks.map(block => `
    <option value="${esc(block.name)}" ${selected === block.name ? "selected" : ""}>${esc(block.name)} (${esc(block.range)})</option>
  `).join("");
}

function productionTimes() {
  return ["1:00", "2:00", "3:00", "4:00", "5:00", "6:00", "7:00", "8:00", "9:00", ":15", ":30", ":45", "10:00", ":15", ":30", ":45", "11:00", ":15", ":30", ":45", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", ":15", ":30", ":45", "19:00", ":15", ":30", ":45", "20:00", ":15", ":30", ":45", "21:00", ":15", ":30", ":45", "22:00", "23:00", "24:00"];
}

function todayDateValue() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

function formatSheetDate(value) {
  return (value || todayDateValue()).split("-").reverse().join("/");
}

function nextDateValue(value = state.productionDate || todayDateValue()) {
  const date = new Date(`${value || todayDateValue()}T00:00:00`);
  date.setDate(date.getDate() + 1);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function previousDateValue(value = state.productionDate || todayDateValue()) {
  const date = new Date(`${value || todayDateValue()}T00:00:00`);
  date.setDate(date.getDate() - 1);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function emptyUnitReadings() {
  return { mw: "", mvar: "", kv: "", current: "" };
}

function makeProductionSheetRow(time) {
  return {
    time,
    freq: "",
    busKv: "",
    u1: emptyUnitReadings(),
    u2: emptyUnitReadings(),
    u3: emptyUnitReadings(),
    highlight: false
  };
}

function emptyReactorReadings() {
  return { mw: "", mvar: "", kv: "", current: "" };
}

function makeShuntReactorRow(time) {
  return {
    time,
    freq: "",
    busKv: "",
    sr1: emptyReactorReadings(),
    sr2: emptyReactorReadings()
  };
}

const shuntReactorFields = [
  "freq", "busKv",
  "sr1.mw", "sr1.mvar", "sr1.kv", "sr1.current",
  "sr2.mw", "sr2.mvar", "sr2.kv", "sr2.current"
];

function shuntReactorSheets() {
  if (!state.shuntReactorSheets) {
    const serverSheets = state.data?.shuntReactorSheets || {};
    let localSheets = {};
    try {
      localSheets = JSON.parse(localStorage.getItem(shuntReactorStorageKey) || "{}");
    } catch {
      localSheets = {};
    }
    state.shuntReactorSheets = { ...localSheets, ...serverSheets };
  }
  return state.shuntReactorSheets;
}

function shuntReactorRows(date = state.shuntReactorDate || todayDateValue()) {
  state.shuntReactorDate = date || todayDateValue();
  const sheets = shuntReactorSheets();
  const stored = sheets[state.shuntReactorDate];
  const rows = Array.isArray(stored) ? stored : stored?.rows;
  if (!rows?.[0]?.sr1) {
    sheets[state.shuntReactorDate] = productionTimes().map(time => makeShuntReactorRow(time));
    saveShuntReactorSheets();
  } else if (!Array.isArray(stored)) {
    sheets[state.shuntReactorDate] = rows;
  }
  return sheets[state.shuntReactorDate];
}

function saveShuntReactorSheets() {
  localStorage.setItem(shuntReactorStorageKey, JSON.stringify(shuntReactorSheets()));
  persistShuntReactorDate();
}

function persistShuntReactorDate(date = state.shuntReactorDate || todayDateValue()) {
  if (!state.currentUserId || !date) return;
  clearTimeout(state.shuntReactorSyncTimers[date]);
  state.shuntReactorSyncTimers[date] = setTimeout(() => {
    api(`/api/shunt-reactor/${encodeURIComponent(date)}`, {
      method: "PUT",
      body: JSON.stringify({ rows: shuntReactorSheets()[date] || [] })
    }).catch(error => {
      state.shuntReactorNotice = `Server save failed: ${error.message}`;
    });
  }, 250);
}

function resetShuntReactorSheet(date = state.shuntReactorDate || todayDateValue()) {
  state.shuntReactorDate = date;
  shuntReactorSheets()[date] = productionTimes().map(time => makeShuntReactorRow(time));
  saveShuntReactorSheets();
}

function exactNumericEntry(value) {
  return String(value ?? "").replace(/,/g, "").trim();
}

function decimalParts(value) {
  const text = exactNumericEntry(value);
  const match = /^([+-]?)(\d*)(?:\.(\d*))?$/.exec(text);
  if (!match || (!match[2] && !match[3])) return null;
  const fraction = match[3] || "";
  const digits = `${match[2] || "0"}${fraction}`.replace(/^0+(?=\d)/, "") || "0";
  return {
    integer: BigInt(`${match[1] === "-" ? "-" : ""}${digits}`),
    scale: fraction.length
  };
}

function decimalText(integer, scale) {
  const negative = integer < 0n;
  const digits = (negative ? -integer : integer).toString().padStart(scale + 1, "0");
  const value = scale > 0 ? `${digits.slice(0, -scale)}.${digits.slice(-scale)}` : digits;
  return negative && integer !== 0n ? `-${value}` : value;
}

function exactDecimalSum(values) {
  const parts = values.map(decimalParts);
  if (parts.some(part => !part)) {
    const result = values.reduce((sum, value) => sum + Number(value || 0), 0);
    return Number.isFinite(result) ? String(result) : "";
  }
  const scale = Math.max(0, ...parts.map(part => part.scale));
  const total = parts.reduce((sum, part) => sum + part.integer * (10n ** BigInt(scale - part.scale)), 0n);
  return decimalText(total, scale);
}

function exactDecimalDifference(finalValue, initialValue) {
  const finalPart = decimalParts(finalValue);
  const initialPart = decimalParts(initialValue);
  if (!finalPart || !initialPart) {
    const result = Number(finalValue) - Number(initialValue);
    return Number.isFinite(result) ? String(result) : "";
  }
  const scale = Math.max(finalPart.scale, initialPart.scale);
  const finalInteger = finalPart.integer * (10n ** BigInt(scale - finalPart.scale));
  const initialInteger = initialPart.integer * (10n ** BigInt(scale - initialPart.scale));
  return decimalText(finalInteger - initialInteger, scale);
}

function setNestedNumericValue(row, field, value) {
  const cleanValue = exactNumericEntry(value);
  if (field.includes(".")) {
    const [group, metric] = field.split(".");
    row[group][metric] = cleanValue;
  } else {
    row[field] = cleanValue;
  }
}

function pasteShuntReactorCells(startInput, clipboardText) {
  if (!canEditSubmittedProductionModule("shunt-reactor", state.shuntReactorDate || todayDateValue())) return false;
  const table = parseClipboardTable(clipboardText);
  if (!table.length) return false;
  const rows = shuntReactorRows();
  const startRowIndex = Number(startInput.dataset.shuntIndex || 0);
  const startFieldIndex = Math.max(0, shuntReactorFields.indexOf(startInput.dataset.shuntField));
  table.forEach((clipboardRow, rowOffset) => {
    const targetRow = rows[startRowIndex + rowOffset];
    if (!targetRow) return;
    clipboardRow.forEach((cell, columnOffset) => {
      const field = shuntReactorFields[startFieldIndex + columnOffset];
      if (field) setNestedNumericValue(targetRow, field, cell);
    });
  });
  saveShuntReactorSheets();
  state.shuntReactorNotice = `Pasted ${table.length} row${table.length === 1 ? "" : "s"}.`;
  renderShuntReactor1();
  return true;
}

function shuntReactorStat(rows, field, type) {
  const values = rows.map(row => {
    if (field.includes(".")) {
      const [group, metric] = field.split(".");
      return row[group]?.[metric];
    }
    return row[field];
  }).filter(value => value !== "" && Number.isFinite(Number(value))).map(Number);
  if (!values.length) return "";
  return type === "max" ? Math.max(...values) : Math.min(...values);
}

function shuntReactorExportRows(rows = shuntReactorRows()) {
  const headers = ["Time", "System Frequency Hz", "Bus Voltage kV", "SR1 Active Power MW", "SR1 Reactive Power MVAR", "SR1 Voltage kV", "SR1 Current A", "SR2 Active Power MW", "SR2 Reactive Power MVAR", "SR2 Voltage kV", "SR2 Current A"];
  const values = rows.map(row => [row.time, row.freq, row.busKv, row.sr1.mw, row.sr1.mvar, row.sr1.kv, row.sr1.current, row.sr2.mw, row.sr2.mvar, row.sr2.kv, row.sr2.current]);
  const stat = (label, type) => [label, ...shuntReactorFields.map(field => shuntReactorStat(rows, field, type))];
  return [
    ["Hydro Plant Shunt Reactor Report"],
    ["Date", formatSheetDate(state.shuntReactorDate)],
    headers,
    ...values,
    stat("MAX", "max"),
    stat("MIN", "min")
  ];
}

const lineParameterFields = [
  "freq", "busKv",
  "line1.mw", "line1.mvar", "line1.kv", "line1.current",
  "line2.mw", "line2.mvar", "line2.kv", "line2.current"
];

function makeLineParameterRow(time) {
  return { time, freq: "", busKv: "", line1: emptyReactorReadings(), line2: emptyReactorReadings() };
}

function lineParameterSheets() {
  if (!state.lineParameterSheets) {
    const serverSheets = state.data?.lineParameterSheets || {};
    let localSheets = {};
    try {
      localSheets = JSON.parse(localStorage.getItem(lineParameterStorageKey) || "{}");
    } catch {
      localSheets = {};
    }
    state.lineParameterSheets = { ...localSheets, ...serverSheets };
  }
  return state.lineParameterSheets;
}

function lineParameterRows(date = state.lineParameterDate || todayDateValue()) {
  state.lineParameterDate = date || todayDateValue();
  const sheets = lineParameterSheets();
  const stored = sheets[state.lineParameterDate];
  const rows = Array.isArray(stored) ? stored : stored?.rows;
  if (!rows?.length || !rows[0]?.line1 || !rows[0]?.line2) {
    sheets[state.lineParameterDate] = productionTimes().map(time => makeLineParameterRow(time));
    saveLineParameterSheets();
  } else if (!Array.isArray(stored)) {
    sheets[state.lineParameterDate] = rows;
  }
  return sheets[state.lineParameterDate];
}

function saveLineParameterSheets() {
  localStorage.setItem(lineParameterStorageKey, JSON.stringify(lineParameterSheets()));
  const date = state.lineParameterDate || todayDateValue();
  clearTimeout(state.lineParameterSyncTimers?.[date]);
  state.lineParameterSyncTimers = state.lineParameterSyncTimers || {};
  state.lineParameterSyncTimers[date] = setTimeout(() => {
    api(`/api/line-parameter/${encodeURIComponent(date)}`, {
      method: "PUT",
      body: JSON.stringify({ rows: lineParameterSheets()[date] || [] })
    }).catch(error => {
      state.lineParameterNotice = `Server save failed: ${error.message}`;
    });
  }, 250);
}

function resetLineParameterSheet(date = state.lineParameterDate || todayDateValue()) {
  state.lineParameterDate = date;
  lineParameterSheets()[date] = productionTimes().map(time => makeLineParameterRow(time));
  saveLineParameterSheets();
}

function pasteLineParameterCells(startInput, clipboardText) {
  if (!canEditSubmittedProductionModule("line-parameter", state.lineParameterDate || todayDateValue())) return false;
  const table = parseClipboardTable(clipboardText);
  if (!table.length) return false;
  const fields = lineParameterFields;
  const rows = lineParameterRows();
  const startRowIndex = Number(startInput.dataset.lineIndex || 0);
  const startFieldIndex = Math.max(0, fields.indexOf(startInput.dataset.lineField));
  table.forEach((clipboardRow, rowOffset) => {
    const targetRow = rows[startRowIndex + rowOffset];
    if (!targetRow) return;
    clipboardRow.forEach((cell, columnOffset) => {
      const field = fields[startFieldIndex + columnOffset];
      if (!field) return;
      setNestedNumericValue(targetRow, field, cell);
    });
  });
  saveLineParameterSheets();
  state.lineParameterNotice = `Pasted ${table.length} row${table.length === 1 ? "" : "s"}.`;
  renderLineParameter();
  return true;
}

function lineParameterStat(rows, field, type) {
  const values = rows.map(row => {
    if (field.includes(".")) {
      const [group, metric] = field.split(".");
      return row[group]?.[metric];
    }
    return row[field];
  }).filter(value => value !== "" && Number.isFinite(Number(value))).map(Number);
  if (!values.length) return "";
  return type === "max" ? Math.max(...values) : Math.min(...values);
}

function lineParameterExportRows(rows = lineParameterRows()) {
  const headers = ["TIME", "System Frequency Hz", "Bus Voltage kV", "Line Parameter 1 Active Power MW", "Line Parameter 1 Reactive Power MVAR", "Line Parameter 1 Voltage kV", "Line Parameter 1 Current A", "Line Parameter 2 Active Power MW", "Line Parameter 2 Reactive Power MVAR", "Line Parameter 2 Voltage kV", "Line Parameter 2 Current A"];
  return [
    ["Hydro Plant Line Parameter"],
    ["Date", formatSheetDate(state.lineParameterDate)],
    headers,
    ...rows.map(row => [row.time, row.freq, row.busKv, row.line1.mw, row.line1.mvar, row.line1.kv, row.line1.current, row.line2.mw, row.line2.mvar, row.line2.kv, row.line2.current]),
    ["MAX", ...lineParameterFields.map(field => lineParameterStat(rows, field, "max"))],
    ["MIN", ...lineParameterFields.map(field => lineParameterStat(rows, field, "min"))]
  ];
}

function downloadLineParameterXlsx() {
  const rows = lineParameterRows();
  const labels = ["ACTIVE POWER MW", "REACTIVE POWER MVAR", "VOLTAGE kV", "CURRENT Amp"];
  const workbookRows = [
    ["", "", "", "", "", "", "", `DATE: ${formatSheetDate(state.lineParameterDate)}`, "", "", ""],
    ["TIME", "System Frequency Hz", "Bus Voltage kV", "LINE PARAMETER 1", "", "", "", "LINE PARAMETER 2", "", "", ""],
    ["", "", "", ...labels, ...labels],
    ...rows.map(row => [row.time === "24:00" ? "24:00:00" : row.time, row.freq, row.busKv, row.line1.mw, row.line1.mvar, row.line1.kv, row.line1.current, row.line2.mw, row.line2.mvar, row.line2.kv, row.line2.current]),
    ["MAX", ...lineParameterFields.map(field => lineParameterStat(rows, field, "max"))],
    ["MIN", ...lineParameterFields.map(field => lineParameterStat(rows, field, "min"))]
  ];
  downloadXlsx(`Hydro_Line_Parameter_${state.lineParameterDate || todayDateValue()}.xlsx`, workbookRows, {
    sheetName: "Line Parameter",
    headerRows: [2, 3],
    greenHeader: true,
    summaryRows: [rows.length + 4, rows.length + 5],
    merges: ["H1:K1", "A2:A3", "B2:B3", "C2:C3", "D2:G2", "H2:K2"]
  });
}

function defaultProductionMeterRows() {
  return [
    { key: "auxKwh", label: "Auxiliary (KWH)", units: [{ initial: "", final: "" }, { initial: "", final: "" }, { initial: "", final: "" }] },
    { key: "productionKwh", label: "Production (KWH)", units: [{ initial: "", final: "" }, { initial: "", final: "" }, { initial: "", final: "" }] },
    { key: "auxKvarh", label: "Auxiliary (KVARH)", units: [{ initial: "", final: "" }, { initial: "", final: "" }, { initial: "", final: "" }] },
    { key: "productionKvarh", label: "Production (KVARH)", units: [{ initial: "", final: "" }, { initial: "", final: "" }, { initial: "", final: "" }] }
  ];
}

function productionMeterReadings() {
  if (!state.productionMeterReadings) {
    const serverReadings = state.data?.productionMeterReadings || {};
    state.productionMeterReadings = { ...serverReadings };
    localStorage.setItem(productionMeterStorageKey, JSON.stringify(state.productionMeterReadings));
  }
  return state.productionMeterReadings;
}

function productionMeterRows(date = state.productionDate || todayDateValue()) {
  const readings = productionMeterReadings();
  const stored = readings[date];
  const rows = Array.isArray(stored) ? stored : stored?.rows;
  if (!Array.isArray(rows) || rows.length !== 4) {
    const newRows = defaultProductionMeterRows();
    const previousStored = date > productionMeterBaselineDate ? readings[previousDateValue(date)] : null;
    const previousRows = Array.isArray(previousStored) ? previousStored : previousStored?.rows;
    if (Array.isArray(previousRows)) {
      newRows.forEach((row, rowIndex) => {
        row.units.forEach((unit, unitIndex) => {
          const previousFinal = previousRows[rowIndex]?.units?.[unitIndex]?.final;
          if (previousFinal !== "" && previousFinal !== undefined) unit.initial = previousFinal;
        });
      });
    }
    readings[date] = newRows;
    saveProductionMeterRows(date);
  } else if (!Array.isArray(stored)) {
    readings[date] = rows;
  }
  const approved = productionSubmission("meter", date)?.approvedAt;
  const previousStored = !approved && date > productionMeterBaselineDate ? readings[previousDateValue(date)] : null;
  const previousRows = Array.isArray(previousStored) ? previousStored : previousStored?.rows;
  if (Array.isArray(previousRows)) {
    let changed = false;
    readings[date].forEach((row, rowIndex) => {
      row.units.forEach((unit, unitIndex) => {
        const previousFinal = previousRows[rowIndex]?.units?.[unitIndex]?.final ?? "";
        if (unit.initial !== previousFinal) {
          unit.initial = previousFinal;
          changed = true;
        }
      });
    });
    if (changed) {
      localStorage.setItem(productionMeterStorageKey, JSON.stringify(readings));
      syncProductionMeterDate(date);
    }
  }
  return readings[date];
}

function productionMeterDifference(unit) {
  if (unit?.initial === "" || unit?.final === "") return "";
  return exactDecimalDifference(unit.final, unit.initial);
}

function productionMeterTotal(row) {
  const differences = row.units.map(productionMeterDifference);
  return differences.some(value => value === "") ? "" : exactDecimalSum(differences);
}

function syncProductionMeterDate(date) {
  state.productionMeterSyncTimers = state.productionMeterSyncTimers || {};
  clearTimeout(state.productionMeterSyncTimers[date]);
  state.productionMeterSyncTimers[date] = setTimeout(() => {
    api(`/api/production-meter/${encodeURIComponent(date)}`, {
      method: "PUT",
      body: JSON.stringify({ rows: productionMeterReadings()[date] || [] })
    }).catch(error => {
      state.productionMeterNotice = `Server save failed: ${error.message}`;
    });
  }, 250);
}

function saveProductionMeterRows(date = state.productionDate || todayDateValue()) {
  localStorage.setItem(productionMeterStorageKey, JSON.stringify(productionMeterReadings()));
  syncProductionMeterDate(date);
  carryProductionMeterForward(date);
}

function carryProductionMeterForward(date = state.productionDate || todayDateValue()) {
  const currentRows = productionMeterRows(date);
  const nextDate = nextDateValue(date);
  if (productionSubmission("meter", nextDate)?.approvedAt) return nextDate;
  const nextStored = productionMeterReadings()[nextDate];
  const nextRows = Array.isArray(nextStored) ? nextStored : nextStored?.rows;
  const targetRows = Array.isArray(nextRows) && nextRows.length === 4 ? nextRows : defaultProductionMeterRows();
  currentRows.forEach((row, rowIndex) => {
    row.units.forEach((unit, unitIndex) => {
      targetRows[rowIndex].units[unitIndex].initial = unit.final ?? "";
    });
  });
  productionMeterReadings()[nextDate] = targetRows;
  localStorage.setItem(productionMeterStorageKey, JSON.stringify(productionMeterReadings()));
  syncProductionMeterDate(nextDate);
  return nextDate;
}

function createNextProductionMeterRows(date = state.productionDate || todayDateValue()) {
  return carryProductionMeterForward(date);
}

function resetProductionMeterRows(date = state.productionDate || todayDateValue()) {
  productionMeterReadings()[date] = defaultProductionMeterRows();
  saveProductionMeterRows(date);
}

function pasteProductionMeterCells(startInput, clipboardText) {
  if (!canEditSubmittedProductionModule("meter", state.productionDate || todayDateValue())) return false;
  const table = parseClipboardTable(clipboardText);
  if (!table.length) return false;
  const rows = productionMeterRows();
  const fields = [];
  [0, 1, 2].forEach(unitIndex => ["initial", "final"].forEach(field => fields.push({ unitIndex, field })));
  const startRow = Number(startInput.dataset.meterRow || 0);
  const startField = fields.findIndex(item => item.unitIndex === Number(startInput.dataset.meterUnit) && item.field === startInput.dataset.meterField);
  table.forEach((clipboardRow, rowOffset) => {
    const targetRow = rows[startRow + rowOffset];
    if (!targetRow) return;
    clipboardRow.forEach((cell, columnOffset) => {
      const target = fields[startField + columnOffset];
      if (!target) return;
      targetRow.units[target.unitIndex][target.field] = exactNumericEntry(cell);
    });
  });
  saveProductionMeterRows();
  state.productionMeterNotice = `Pasted ${table.length} row${table.length === 1 ? "" : "s"}.`;
  renderProductionSummary();
  return true;
}

function productionMeterExportRows(rows = productionMeterRows()) {
  return [
    ["DATE", formatSheetDate(state.productionDate), "", "", "PRODUCTION AND AUXILIARY METER READING"],
    ["", "Unit #1", "", "", "Unit #2", "", "", "Unit #3", "", "", "TOTAL KWH/KVARH (1+2+3)"],
    ["Meter", "Initial reading at 00:00 Hrs (preceding)", "Final Reading at 24 Hrs", "Difference", "Initial reading at 00:00 Hrs (preceding)", "Final Reading at 24 Hrs", "Difference", "Initial reading at 00:00 Hrs (preceding)", "Final Reading at 24 Hrs", "Difference", "Total"],
    ...rows.map(row => [
      row.label,
      row.units[0].initial, row.units[0].final, productionMeterDifference(row.units[0]),
      row.units[1].initial, row.units[1].final, productionMeterDifference(row.units[1]),
      row.units[2].initial, row.units[2].final, productionMeterDifference(row.units[2]),
      productionMeterTotal(row)
    ])
  ];
}

function downloadProductionMeterXlsx() {
  const rows = productionMeterExportRows();
  downloadXlsx(`Hydro_Production_Meter_${state.productionDate || todayDateValue()}.xlsx`, rows, {
    sheetName: "Production Meter",
    headerRows: [1, 2, 3],
    greenHeader: true,
    merges: ["B1:D1", "E1:K1", "B2:D2", "E2:G2", "H2:J2", "K2:K3"]
  });
}

function energyMeterReadings() {
  if (!state.energyMeterReadings) {
    const serverReadings = state.data?.energyMeterReadings || {};
    let localReadings = {};
    try {
      localReadings = JSON.parse(localStorage.getItem(energyMeterStorageKey) || "{}");
    } catch {
      localReadings = {};
    }
    state.energyMeterReadings = { ...localReadings, ...serverReadings };
  }
  return state.energyMeterReadings;
}

function defaultEnergyMeterData() {
  const makeRows = sourceCount => ["KWH", "KVARH"].flatMap(power =>
    ["IMP.", "EXP.", "NET"].map(item => ({
      power,
      item,
      meters: Array.from({ length: sourceCount }, () => ({ initial: "", final: "" }))
    }))
  );
  return { transformers: makeRows(3), lines: makeRows(2) };
}

function energyMeterRows(date = state.energyMeterDate || todayDateValue()) {
  state.energyMeterDate = date;
  const readings = energyMeterReadings();
  const stored = readings[date];
  const rows = stored?.rows || stored;
  if (!rows?.transformers || !rows?.lines) {
    readings[date] = defaultEnergyMeterData();
    saveEnergyMeterRows(date);
  } else if (stored?.rows) {
    readings[date] = rows;
  }
  return readings[date];
}

function syncEnergyMeterDate(date) {
  state.energyMeterSyncTimers = state.energyMeterSyncTimers || {};
  clearTimeout(state.energyMeterSyncTimers[date]);
  state.energyMeterSyncTimers[date] = setTimeout(() => {
    api(`/api/energy-meter/${encodeURIComponent(date)}`, {
      method: "PUT",
      body: JSON.stringify({ rows: energyMeterReadings()[date] || [] })
    }).catch(error => {
      state.energyMeterNotice = `Server save failed: ${error.message}`;
    });
  }, 250);
}

function saveEnergyMeterRows(date = state.energyMeterDate || todayDateValue()) {
  localStorage.setItem(energyMeterStorageKey, JSON.stringify(energyMeterReadings()));
  syncEnergyMeterDate(date);
}

function createNextEnergyMeterRows(date = state.energyMeterDate || todayDateValue()) {
  const current = energyMeterRows(date);
  const nextDate = nextDateValue(date);
  const existing = energyMeterReadings()[nextDate];
  const existingRows = existing?.rows || existing;
  const target = existingRows?.transformers && existingRows?.lines ? existingRows : defaultEnergyMeterData();
  ["transformers", "lines"].forEach(section => {
    current[section].forEach((row, rowIndex) => {
      row.meters.forEach((meter, meterIndex) => {
        target[section][rowIndex].meters[meterIndex].initial = meter.final ?? "";
      });
    });
  });
  energyMeterReadings()[nextDate] = target;
  saveEnergyMeterRows(nextDate);
  return nextDate;
}

function pasteEnergyMeterCells(startInput, clipboardText) {
  if (!canEditSubmittedProductionModule("energy-meter", state.energyMeterDate || todayDateValue())) return false;
  const table = parseClipboardTable(clipboardText);
  if (!table.length) return false;
  const data = energyMeterRows();
  const section = startInput.dataset.energySection;
  const rows = data[section];
  if (!rows) return false;
  const fields = [];
  const sourceCount = section === "transformers" ? 3 : 2;
  Array.from({ length: sourceCount }, (_, sourceIndex) => sourceIndex).forEach(sourceIndex => ["initial", "final"].forEach(field => fields.push({ sourceIndex, field })));
  const startRow = Number(startInput.dataset.energyRow || 0);
  const startField = fields.findIndex(item => item.sourceIndex === Number(startInput.dataset.energySource) && item.field === startInput.dataset.energyField);
  table.forEach((clipboardRow, rowOffset) => {
    const targetRow = rows[startRow + rowOffset];
    if (!targetRow) return;
    clipboardRow.forEach((cell, columnOffset) => {
      const target = fields[startField + columnOffset];
      if (!target) return;
      targetRow.meters[target.sourceIndex][target.field] = exactNumericEntry(cell);
    });
  });
  saveEnergyMeterRows();
  state.energyMeterNotice = `Pasted ${table.length} row${table.length === 1 ? "" : "s"}.`;
  renderEnergyMeter();
  return true;
}

function energyMeterProduction(meter) {
  return productionMeterDifference(meter);
}

function energyMeterLineTotal(row) {
  const values = row.meters.map(energyMeterProduction);
  return values.some(value => value === "") ? "" : exactDecimalSum(values);
}

function energyMeterExportRows(data = energyMeterRows()) {
  return [
    ["", "", "", "", "", "", "", "", `DATE ${formatSheetDate(state.energyMeterDate)} E.C`, "", ""],
    ["POWER", "ITEM", "TRANSFORMER #1", "", "", "TRANSFORMER #2", "", "", "TRANSFORMER #3", "", ""],
    ["", "", "INITIAL READING", "FINAL READING", "PRODUCTION 1", "INITIAL READING", "FINAL READING", "PRODUCTION 2", "INITIAL READING", "FINAL READING", "PRODUCTION 3"],
    ...data.transformers.map(row => [row.power, row.item, row.meters[0].initial, row.meters[0].final, energyMeterProduction(row.meters[0]), row.meters[1].initial, row.meters[1].final, energyMeterProduction(row.meters[1]), row.meters[2].initial, row.meters[2].final, energyMeterProduction(row.meters[2])]),
    [],
    ["POWER", "ITEM", "LINE #1", "", "", "LINE #2", "", "", "TOTAL"],
    ["", "", "INITIAL READING AT 00:00 HRS (preceding)", "FINAL READING AT 24:00 HRS (present)", "PRODUCTION 1", "INITIAL READING AT 00:00 HRS", "FINAL READING AT 24:00 HRS", "PRODUCTION 2", ""],
    ...data.lines.map(row => [row.power, row.item, row.meters[0].initial, row.meters[0].final, energyMeterProduction(row.meters[0]), row.meters[1].initial, row.meters[1].final, energyMeterProduction(row.meters[1]), energyMeterLineTotal(row)])
  ];
}

function downloadEnergyMeterXlsx() {
  downloadXlsx(`Hydro_Energy_Meter_${state.energyMeterDate || todayDateValue()}.xlsx`, energyMeterExportRows(), {
    sheetName: "Energy Meter",
    headerRows: [1, 2, 3, 11, 12],
    merges: ["I1:K1", "C2:E2", "F2:H2", "I2:K2", "A4:A6", "A7:A9", "C11:E11", "F11:H11", "I11:I12", "A13:A15", "A16:A18"]
  });
}

function waterLevelMonthKey(value = state.waterLevelDate || todayDateValue()) {
  return String(value || todayDateValue()).slice(0, 7);
}

function waterLevelStorageDate(value = state.waterLevelDate || todayDateValue()) {
  return `${waterLevelMonthKey(value)}-01`;
}

function waterLevelMonthLabel(value = state.waterLevelDate || todayDateValue()) {
  return new Date(`${waterLevelStorageDate(value)}T00:00:00`).toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

function waterLevelDays(value = state.waterLevelDate || todayDateValue()) {
  const [year, month] = waterLevelMonthKey(value).split("-").map(Number);
  return new Date(year, month, 0).getDate();
}

function nextWaterLevelMonth(value = state.waterLevelDate || todayDateValue()) {
  const date = new Date(`${waterLevelStorageDate(value)}T00:00:00`);
  date.setMonth(date.getMonth() + 1);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${date.getFullYear()}-${month}-01`;
}

function makeWaterLevelRow(day) {
  return { day, reservoir: "", tailrace: "" };
}

function waterLevelSheets() {
  if (!state.waterLevelSheets) {
    const serverSheets = state.data?.waterLevelSheets || {};
    let localSheets = {};
    try {
      localSheets = JSON.parse(localStorage.getItem(waterLevelStorageKey) || "{}");
    } catch {
      localSheets = {};
    }
    state.waterLevelSheets = { ...localSheets, ...serverSheets };
  }
  return state.waterLevelSheets;
}

function waterLevelAvailableMonths() {
  const keys = new Set([
    ...Object.keys(waterLevelSheets()),
    ...Object.keys(state.data?.productionSubmissions?.["water-level"] || {})
  ]);
  keys.add(waterLevelStorageDate(state.waterLevelDate || todayDateValue()));
  return Array.from(keys)
    .filter(key => /^\d{4}-\d{2}-01$/.test(key))
    .sort()
    .reverse();
}

function waterLevelRows(date = state.waterLevelDate || todayDateValue()) {
  date = waterLevelStorageDate(date);
  state.waterLevelDate = date;
  const sheets = waterLevelSheets();
  const stored = sheets[date];
  const rows = Array.isArray(stored) ? stored : stored?.rows;
  const days = waterLevelDays(date);
  if (!Array.isArray(rows) || rows.length !== days || !Object.prototype.hasOwnProperty.call(rows[0] || {}, "day")) {
    const existingByDay = new Map((Array.isArray(rows) ? rows : []).map(row => [Number(row.day), row]));
    sheets[date] = Array.from({ length: days }, (_, index) => existingByDay.get(index + 1) || makeWaterLevelRow(index + 1));
    saveWaterLevelRows(date);
  } else if (!Array.isArray(stored)) {
    sheets[date] = rows;
  }
  return sheets[date];
}

function waterLevelStat(rows, field, type) {
  const values = rows.map(row => row[field]).filter(value => value !== "" && Number.isFinite(Number(value))).map(Number);
  if (!values.length) return "";
  return type === "max" ? Math.max(...values) : Math.min(...values);
}

function syncWaterLevelDate(date) {
  state.waterLevelSyncTimers = state.waterLevelSyncTimers || {};
  clearTimeout(state.waterLevelSyncTimers[date]);
  state.waterLevelSyncTimers[date] = setTimeout(() => {
    api(`/api/water-level/${encodeURIComponent(date)}`, {
      method: "PUT",
      body: JSON.stringify({ rows: waterLevelSheets()[date] || [] })
    }).catch(error => {
      state.waterLevelNotice = `Server save failed: ${error.message}`;
    });
  }, 250);
}

function saveWaterLevelRows(date = state.waterLevelDate || todayDateValue()) {
  localStorage.setItem(waterLevelStorageKey, JSON.stringify(waterLevelSheets()));
  syncWaterLevelDate(date);
}

async function saveWaterLevelRowsNow(date = state.waterLevelDate || todayDateValue()) {
  date = waterLevelStorageDate(date);
  state.waterLevelSyncTimers = state.waterLevelSyncTimers || {};
  clearTimeout(state.waterLevelSyncTimers[date]);
  localStorage.setItem(waterLevelStorageKey, JSON.stringify(waterLevelSheets()));
  return api(`/api/water-level/${encodeURIComponent(date)}`, {
    method: "PUT",
    body: JSON.stringify({ rows: waterLevelSheets()[date] || [] })
  });
}

function resetWaterLevelRows(date = state.waterLevelDate || todayDateValue()) {
  date = waterLevelStorageDate(date);
  waterLevelSheets()[date] = Array.from({ length: waterLevelDays(date) }, (_, index) => makeWaterLevelRow(index + 1));
  saveWaterLevelRows(date);
}

function pasteWaterLevelCells(startInput, clipboardText) {
  if (!canEditSubmittedProductionModule("water-level", state.waterLevelDate || todayDateValue())) return false;
  const table = parseClipboardTable(clipboardText);
  if (!table.length) return false;
  const fields = ["reservoir", "tailrace"];
  const rows = waterLevelRows();
  const startRow = Number(startInput.dataset.waterRow || 0);
  const startField = fields.indexOf(startInput.dataset.waterField);
  table.forEach((clipboardRow, rowOffset) => {
    const targetRow = rows[startRow + rowOffset];
    if (!targetRow) return;
    clipboardRow.forEach((cell, columnOffset) => {
      const field = fields[startField + columnOffset];
      if (field) targetRow[field] = exactNumericEntry(cell);
    });
  });
  saveWaterLevelRows();
  state.waterLevelNotice = `Pasted ${table.length} row${table.length === 1 ? "" : "s"}.`;
  renderWaterLevel();
  return true;
}

function waterLevelExportRows(rows = waterLevelRows()) {
  return [
    [waterLevelMonthLabel()],
    ["DATE", "Reservoir WATER LEVEL (m.a.s.l)", "Tail Race Water Level (m.a.s.l)"],
    ...rows.map(row => [row.day, row.reservoir, row.tailrace])
  ];
}

function downloadWaterLevelXlsx() {
  downloadXlsx(`Hydro_Water_Level_${waterLevelMonthKey()}.xlsx`, waterLevelExportRows(), {
    sheetName: "Water Level",
    headerRows: [1, 2],
    merges: ["A1:C1"]
  });
}

function renderWaterLevelChart(rows) {
  const reservoirValues = rows.map(row => Number(row.reservoir)).filter(Number.isFinite);
  const tailraceValues = rows.map(row => Number(row.tailrace)).filter(Number.isFinite);
  const values = [...reservoirValues, ...tailraceValues];
  const hasValues = values.length > 0;
  const minimum = hasValues ? Math.min(...values) : 0;
  const maximum = hasValues ? Math.max(...values) : 1;
  const range = Math.max(maximum - minimum, 0.001);
  const height = value => value === "" || !Number.isFinite(Number(value))
    ? 0
    : Math.max(3, ((Number(value) - minimum) / range) * 88 + 8);
  return `
    <section class="panel water-chart-panel">
      <div class="toolbar">
        <h2>Monthly Water Level Chart</h2>
        <div class="water-chart-legend"><span class="reservoir"></span>Reservoir <span class="tailrace"></span>Tailrace</div>
      </div>
      ${hasValues ? `
        <div class="water-chart-scale"><span>${maximum.toFixed(3)} m</span><span>${minimum.toFixed(3)} m</span></div>
        <div class="water-level-chart">
          ${rows.map(row => `
            <div class="water-day-bars" title="Day ${esc(row.day)} | Reservoir: ${esc(row.reservoir || "-")} | Tailrace: ${esc(row.tailrace || "-")}">
              <div class="water-bars">
                <span class="reservoir-bar" style="height:${height(row.reservoir)}%"></span>
                <span class="tailrace-bar" style="height:${height(row.tailrace)}%"></span>
              </div>
              <small>${esc(row.day)}</small>
            </div>
          `).join("")}
        </div>
      ` : `<p class="muted">No water-level readings for this month.</p>`}
    </section>
  `;
}

function productionSheets() {
  if (!state.productionSheets) {
    const serverSheets = state.data?.productionSheets || {};
    state.productionSheets = { ...serverSheets };
    localStorage.setItem(productionStorageKey, JSON.stringify(state.productionSheets));
  }
  return state.productionSheets;
}

function defaultProductionMeta() {
  return {
    mwh: ["", "", ""],
    totalProduction: "",
    auxiliary: "",
    service: ["", "", ""],
    outage: ["", "", ""],
    gcbOpen: ["", "", ""],
    gcbClose: ["", "", ""],
    waterLevel: "",
    shifts: [
      { name: "Morning", operators: "", group: "" },
      { name: "Evening", operators: "", group: "" },
      { name: "Night", operators: "", group: "" }
    ],
    submittedAt: "",
    submittedBy: "",
    submittedByName: "",
    approvedAt: "",
    approvedBy: "",
    approvedByName: "",
    rejectedAt: "",
    rejectedBy: "",
    rejectedByName: "",
    reviewComment: "",
    status: "Draft"
  };
}

function productionMetas() {
  if (!state.productionMetas) {
    const serverMetas = state.data?.productionMetas || {};
    state.productionMetas = { ...serverMetas };
    localStorage.setItem(productionMetaStorageKey, JSON.stringify(state.productionMetas));
  }
  return state.productionMetas;
}

function hourlyReportLinkedValues(date = state.productionDate || todayDateValue()) {
  const meterRows = productionMeterRowsForReport(date);
  const productionRow = meterRows.find(row => row.key === "productionKwh");
  const auxiliaryRow = meterRows.find(row => row.key === "auxKwh");
  const productionKwh = [0, 1, 2].map(index => {
    const value = productionRow ? productionMeterDifference(productionRow.units?.[index]) : "";
    return value === "" || !Number.isFinite(Number(value)) ? "" : Number(value);
  });
  const productionMwh = productionKwh.map(value => value === "" ? "" : Number((value / 1000).toFixed(3)));
  const totalProductionKwh = productionRow ? productionMeterTotal(productionRow) : "";
  const totalAuxiliaryKwh = auxiliaryRow ? productionMeterTotal(auxiliaryRow) : "";
  const waterRows = waterLevelRowsForReport(date);
  const day = Math.max(1, Number(String(date).slice(8, 10)) || 1);
  const waterRow = waterRows[day - 1] || {};
  return {
    productionMwh,
    totalProductionMwh: totalProductionKwh === "" ? "" : Number((Number(totalProductionKwh) / 1000).toFixed(3)),
    auxiliaryKwh: totalAuxiliaryKwh === "" ? "" : Number(Number(totalAuxiliaryKwh).toFixed(3)),
    waterLevel: hasValue(waterRow.reservoir) ? Number(waterRow.reservoir) : ""
  };
}

function applyHourlyReportLinks(meta, date = state.productionDate || todayDateValue()) {
  const linked = hourlyReportLinkedValues(date);
  meta.mwh = linked.productionMwh;
  meta.totalProduction = linked.totalProductionMwh;
  meta.auxiliary = linked.auxiliaryKwh;
  meta.waterLevel = linked.waterLevel;
  return meta;
}

function productionMeta(date = state.productionDate || todayDateValue()) {
  state.productionDate = date || todayDateValue();
  const metas = productionMetas();
  if (!metas[state.productionDate]) {
    metas[state.productionDate] = defaultProductionMeta();
    saveProductionMetas();
  }
  const defaults = defaultProductionMeta();
  const storedMeta = metas[state.productionDate];
  if (!Object.prototype.hasOwnProperty.call(storedMeta, "mwh")) {
    metas[state.productionDate] = {
      ...defaults,
      submittedAt: storedMeta.submittedAt || "",
      submittedBy: storedMeta.submittedBy || "",
      submittedByName: storedMeta.submittedByName || "",
      approvedAt: storedMeta.approvedAt || "",
      approvedBy: storedMeta.approvedBy || "",
      approvedByName: storedMeta.approvedByName || ""
    };
    saveProductionMetas();
  } else {
    metas[state.productionDate] = { ...defaults, ...storedMeta };
  }
  metas[state.productionDate].shifts = metas[state.productionDate].shifts || defaults.shifts;
  return applyHourlyReportLinks(metas[state.productionDate], state.productionDate);
}

function saveProductionSheets() {
  localStorage.setItem(productionStorageKey, JSON.stringify(productionSheets()));
  persistProductionDate();
}

function saveProductionMetas() {
  localStorage.setItem(productionMetaStorageKey, JSON.stringify(productionMetas()));
  persistProductionDate();
}

function persistProductionDate(date = state.productionDate || todayDateValue()) {
  if (!state.currentUserId || !date) return;
  state.productionSyncTimers = state.productionSyncTimers || {};
  clearTimeout(state.productionSyncTimers[date]);
  state.productionSyncTimers[date] = setTimeout(() => {
    const rows = productionSheets()[date] || [];
    const meta = productionMetas()[date] || defaultProductionMeta();
    api(`/api/production/${encodeURIComponent(date)}`, {
      method: "PUT",
      body: JSON.stringify({ rows, meta })
    }).catch(error => {
      state.productionNotice = `Production sheet saved in this browser, but server sync failed: ${error.message}`;
    });
  }, 250);
}

async function saveProductionDateNow(date = state.productionDate || todayDateValue()) {
  if (!state.currentUserId || !date) return;
  state.productionSyncTimers = state.productionSyncTimers || {};
  clearTimeout(state.productionSyncTimers[date]);
  const rows = productionSheets()[date] || [];
  const meta = productionMetas()[date] || defaultProductionMeta();
  await api(`/api/production/${encodeURIComponent(date)}`, {
    method: "PUT",
    body: JSON.stringify({ rows, meta })
  });
}

function setProductionMetaValue(meta, field, value) {
  const parts = field.split(".");
  let target = meta;
  for (let index = 0; index < parts.length - 1; index += 1) {
    const part = parts[index];
    const nextPart = parts[index + 1];
    if (target[part] === undefined) target[part] = /^\d+$/.test(nextPart) ? [] : {};
    target = target[part];
  }
  target[parts[parts.length - 1]] = value;
}

const productionSheetFields = [
  "freq", "busKv",
  "u1.mw", "u1.mvar", "u1.kv", "u1.current",
  "u2.mw", "u2.mvar", "u2.kv", "u2.current",
  "u3.mw", "u3.mvar", "u3.kv", "u3.current"
];

function parseClipboardTable(text) {
  return String(text || "")
    .replace(/\r/g, "")
    .split("\n")
    .filter(row => row.trim() !== "")
    .map(row => row.split("\t").map(cell => cell.trim()));
}

function pasteDailyGenerationCells(startInput, clipboardText) {
  if (!canEditDailyGenerationReport()) return false;
  const table = parseClipboardTable(clipboardText);
  if (!table.length) return false;
  const date = dailyGenerationDate();
  const manual = dailyGenerationManual(date);
  const editableCells = dailyGenerationEditableCells();
  const startRow = Number(startInput.dataset.dailyGenerationRow || 0);
  const startCol = Number(startInput.dataset.dailyGenerationCol || 0);
  let changed = 0;
  table.forEach((clipboardRow, rowOffset) => {
    clipboardRow.forEach((cell, columnOffset) => {
      const target = editableCells.get(`${startRow + rowOffset}:${startCol + columnOffset}`);
      if (!target) return;
      manual[target.key] = cell;
      changed += 1;
    });
  });
  if (!changed) return false;
  saveDailyGenerationReport(date);
  state.dailyGenerationNotice = `Pasted ${changed} editable cell${changed === 1 ? "" : "s"}. Linked cells were skipped.`;
  renderDailyGenerationReport();
  return true;
}

function setProductionRowValue(row, field, value) {
  const cleanValue = exactNumericEntry(value);
  if (field.includes(".")) {
    const [unit, metric] = field.split(".");
    row[unit][metric] = cleanValue;
  } else {
    row[field] = cleanValue;
  }
}

function productionRows(date = state.productionDate || todayDateValue()) {
  state.productionDate = date || todayDateValue();
  const sheets = productionSheets();
  if (!sheets[state.productionDate] || !sheets[state.productionDate][0]?.u1) {
    sheets[state.productionDate] = productionTimes().map(time => makeProductionSheetRow(time));
    saveProductionSheets();
  }
  return sheets[state.productionDate];
}

function resetProductionSheet(date = state.productionDate || todayDateValue()) {
  state.productionDate = date || todayDateValue();
  productionSheets()[state.productionDate] = productionTimes().map(time => makeProductionSheetRow(time));
  productionMetas()[state.productionDate] = defaultProductionMeta();
  saveProductionSheets();
  saveProductionMetas();
}

function pasteProductionCells(startInput, clipboardText) {
  if (!canEditProductionSheet()) return false;
  const table = parseClipboardTable(clipboardText);
  if (!table.length) return false;
  const rows = productionRows();
  const startRowIndex = Number(startInput.dataset.productionIndex || 0);
  const startFieldIndex = Math.max(0, productionSheetFields.indexOf(startInput.dataset.productionField));
  table.forEach((clipboardRow, rowOffset) => {
    const targetRow = rows[startRowIndex + rowOffset];
    if (!targetRow) return;
    clipboardRow.forEach((cell, columnOffset) => {
      const field = productionSheetFields[startFieldIndex + columnOffset];
      if (!field) return;
      setProductionRowValue(targetRow, field, cell);
    });
  });
  saveProductionSheets();
  state.productionNotice = `Pasted ${table.length} Excel row${table.length === 1 ? "" : "s"} into the Production sheet.`;
  renderProduction();
  return true;
}

function pasteProductionMetaCells(startInput, clipboardText) {
  if (!canEditProductionSheet()) return false;
  const table = parseClipboardTable(clipboardText);
  if (!table.length) return false;
  const inputs = Array.from(document.querySelectorAll("[data-production-meta]"));
  const startIndex = inputs.indexOf(startInput);
  if (startIndex < 0) return false;
  const maxColumns = Math.max(...table.map(row => row.length), 1);
  const meta = productionMeta();
  table.forEach((clipboardRow, rowOffset) => {
    clipboardRow.forEach((cell, columnOffset) => {
      const target = inputs[startIndex + rowOffset * maxColumns + columnOffset];
      if (!target) return;
      setProductionMetaValue(meta, target.dataset.productionMeta, cell);
    });
  });
  saveProductionMetas();
  state.productionNotice = `Pasted ${table.length} Excel row${table.length === 1 ? "" : "s"} into the daily footer table.`;
  renderProduction();
  return true;
}

function productionApprovalReady(date = state.productionDate || todayDateValue()) {
  const start = new Date(`${date || todayDateValue()}T00:00:00`);
  if (Number.isNaN(start.getTime())) return false;
  start.setDate(start.getDate() + 1);
  return Date.now() >= start.getTime();
}

function hasValue(value) {
  return value !== "" && value !== null && value !== undefined;
}

function displayNumber(value, decimals) {
  if (!hasValue(value)) return "";
  if (typeof value === "string") return value;
  const number = Number(value);
  return Number.isFinite(number) ? String(number) : "";
}

function rowProductionTotal(row) {
  return {
    mw: exactDecimalSum([row.u1.mw || 0, row.u2.mw || 0, row.u3.mw || 0]),
    mvar: exactDecimalSum([row.u1.mvar || 0, row.u2.mvar || 0, row.u3.mvar || 0])
  };
}

function rowHasPowerData(row) {
  return ["u1", "u2", "u3"].some(unit => hasValue(row[unit].mw) || hasValue(row[unit].mvar));
}

function rowHasAnyReading(row) {
  return hasValue(row.freq) || hasValue(row.busKv) || ["u1", "u2", "u3"].some(unit =>
    ["mw", "mvar", "kv", "current"].some(metric => hasValue(row[unit][metric]))
  );
}

function rowTotalDisplay(row, metric) {
  return rowHasPowerData(row) ? rowProductionTotal(row)[metric] : "";
}

function productionValues(rows, selector) {
  return rows.map(selector).filter(hasValue).map(Number).filter(value => Number.isFinite(value));
}

function productionStat(rows, selector, type) {
  const values = productionValues(rows, selector);
  if (!values.length) return 0;
  if (type === "max") return Math.max(...values);
  if (type === "min") return Math.min(...values);
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function productionTotals(rows = productionRows()) {
  const latest = rows.slice().reverse().find(row => rowProductionTotal(row).mw > 0) || rows[0];
  const avgMw = productionStat(rows, row => rowHasPowerData(row) ? rowProductionTotal(row).mw : "", "avg");
  const hasReadings = rows.some(rowHasAnyReading);
  return {
    currentMw: Number(rowProductionTotal(latest).mw || 0),
    currentMvar: Number(rowProductionTotal(latest).mvar || 0),
    maxMw: productionStat(rows, row => rowHasPowerData(row) ? rowProductionTotal(row).mw : "", "max"),
    avgMw,
    mwh: avgMw * 24,
    serviceHour: hasReadings ? "22:24:00" : "",
    outageHour: hasReadings ? "1:36" : "",
    waterLevel: hasReadings ? "1114.871" : ""
  };
}

function productionEnergyForRows(rows = [], meta = {}) {
  const metaUnits = [0, 1, 2].map(index => Number(meta.mwh?.[index] || 0));
  const hasMetaUnits = metaUnits.some(value => value > 0);
  if (hasMetaUnits || Number(meta.totalProduction || 0) > 0) {
    return {
      units: metaUnits,
      total: Number(meta.totalProduction || metaUnits.reduce((sum, value) => sum + value, 0))
    };
  }
  const unitEnergy = ["u1", "u2", "u3"].map(unit => {
    const values = productionValues(rows, row => row[unit]?.mw);
    if (!values.length) return 0;
    return values.reduce((sum, value) => sum + value, 0) / values.length * 24;
  });
  return {
    units: unitEnergy,
    total: unitEnergy.reduce((sum, value) => sum + value, 0)
  };
}

function productionChartData() {
  const sheets = productionSheets();
  const metas = productionMetas();
  const entries = Object.keys(sheets)
    .sort()
    .map(date => ({ date, ...productionEnergyForRows(sheets[date] || [], metas[date] || {}) }))
    .filter(entry => entry.total > 0);
  const currentMonth = (state.productionDate || todayDateValue()).slice(0, 7);
  const currentYear = (state.productionDate || todayDateValue()).slice(0, 4);
  const monthEntries = entries.filter(entry => entry.date.startsWith(currentMonth));
  const yearEntries = entries.filter(entry => entry.date.startsWith(currentYear));
  const monthlyTotals = Array.from({ length: 12 }, (_, index) => {
    const month = `${currentYear}-${String(index + 1).padStart(2, "0")}`;
    return {
      label: new Date(`${month}-01T00:00:00`).toLocaleString(undefined, { month: "short" }),
      total: entries.filter(entry => entry.date.startsWith(month)).reduce((sum, entry) => sum + entry.total, 0)
    };
  });
  return { entries, monthEntries, yearEntries, monthlyTotals, currentMonth, currentYear };
}

function productionBars(items, valueKey = "total", labelKey = "label") {
  const maxValue = Math.max(...items.map(item => Number(item[valueKey] || 0)), 1);
  return `
    <div class="production-graph-bars">
      ${items.map(item => {
        const value = Number(item[valueKey] || 0);
        return `
          <div class="graph-bar" style="--bar-height:${Math.max(4, Math.round((value / maxValue) * 100))}%">
            <strong>${value ? value.toFixed(0) : ""}</strong>
            <span></span>
            <small>${esc(item[labelKey] || "")}</small>
          </div>
        `;
      }).join("")}
    </div>
  `;
}

function renderProductionGraphs(rows, totals) {
  const energy = productionEnergyForRows(rows, productionMeta());
  const chart = productionChartData();
  const dailyUnits = ["Unit 1", "Unit 2", "Unit 3"].map((label, index) => ({ label, total: energy.units[index] || 0 }));
  const monthDays = chart.monthEntries.map(entry => ({ label: entry.date.slice(8), total: entry.total }));
  const yearMonths = chart.monthlyTotals;
  return `
    <section class="panel production-panel">
      <div class="toolbar">
        <div>
          <h2>Production Graphs</h2>
        </div>
        <span class="status-pill">${totals.mwh.toFixed(1)} MWh selected day</span>
      </div>
      <div class="production-graph-grid">
        <article class="production-graph-card">
          <div class="toolbar"><h3>Daily Unit Energy</h3><span>${esc(formatSheetDate(state.productionDate))}</span></div>
          ${productionBars(dailyUnits)}
        </article>
        <article class="production-graph-card">
          <div class="toolbar"><h3>Monthly Daily Totals</h3><span>${esc(chart.currentMonth)}</span></div>
          ${monthDays.length ? productionBars(monthDays) : `<p class="muted">No saved production data for this month yet.</p>`}
        </article>
        <article class="production-graph-card wide">
          <div class="toolbar"><h3>Yearly Monthly Totals</h3><span>${esc(chart.currentYear)}</span></div>
          ${productionBars(yearMonths)}
        </article>
      </div>
    </section>
  `;
}

function productionMissingFields(rows = productionRows(), meta = productionMeta()) {
  meta = applyHourlyReportLinks(meta, state.productionDate || todayDateValue());
  const missing = [];
  const rowFields = [
    ["freq", "Frequency"],
    ["busKv", "Bus voltage"]
  ];
  const unitFields = [
    ["mw", "MW"],
    ["mvar", "MVAR"],
    ["kv", "Voltage"],
    ["current", "Current"]
  ];
  rows.forEach(row => {
    rowFields.forEach(([field, label]) => {
      if (!hasValue(row[field])) missing.push(`${row.time} ${label}`);
    });
    ["u1", "u2", "u3"].forEach((unit, unitIndex) => {
      unitFields.forEach(([field, label]) => {
        if (!hasValue(row[unit]?.[field])) missing.push(`${row.time} Unit ${unitIndex + 1} ${label}`);
      });
    });
  });
  ["service", "outage", "gcbOpen", "gcbClose"].forEach(section => {
    [0, 1, 2].forEach(index => {
      if (!hasValue(meta[section]?.[index])) missing.push(`${section} Unit ${index + 1}`);
    });
  });
  [0, 1, 2].forEach(index => {
    if (!hasValue(meta.mwh?.[index])) missing.push(`MWh Unit ${index + 1}`);
  });
  if (!hasValue(meta.totalProduction)) missing.push("Total Production");
  if (!hasValue(meta.auxiliary)) missing.push("Auxiliary");
  if (!hasValue(meta.waterLevel)) missing.push("Water level");
  (meta.shifts || []).forEach(shift => {
    if (!hasValue(shift.operators)) missing.push(`${shift.name} operators`);
    if (!hasValue(shift.group)) missing.push(`${shift.name} group`);
  });
  return missing;
}

function productionExportRows(rows = productionRows(), meta = productionMeta()) {
  meta = applyHourlyReportLinks(meta, state.productionDate || todayDateValue());
  const totals = productionTotals(rows);
  const csvStat = (selector, type, decimals = 1) => productionValues(rows, selector).length ? productionStat(rows, selector, type).toFixed(decimals) : "";
  const csvEnergy = selector => productionValues(rows, selector).length ? (productionStat(rows, selector, "avg") * 24).toFixed(1) : "";
  const statCsvRow = (label, type) => [
    label,
    csvStat(row => row.freq, type, 2),
    csvStat(row => row.busKv, type, 2),
    csvStat(row => row.u1.mw, type, 1),
    csvStat(row => row.u1.mvar, type, 1),
    csvStat(row => row.u1.kv, type, 2),
    csvStat(row => row.u1.current, type, 0),
    csvStat(row => row.u2.mw, type, 1),
    csvStat(row => row.u2.mvar, type, 1),
    csvStat(row => row.u2.kv, type, 2),
    csvStat(row => row.u2.current, type, 0),
    csvStat(row => row.u3.mw, type, 1),
    csvStat(row => row.u3.mvar, type, 1),
    csvStat(row => row.u3.kv, type, 2),
    csvStat(row => row.u3.current, type, 0),
    csvStat(row => rowHasPowerData(row) ? rowProductionTotal(row).mw : "", type, 1),
    csvStat(row => rowHasPowerData(row) ? rowProductionTotal(row).mvar : "", type, 1)
  ];
  return [
    ["Hydro Plant Production Report"],
    ["Date", formatSheetDate(state.productionDate)],
    ["Generated At", new Date().toLocaleString()],
    ["Submitted By", meta.submittedByName || "", meta.submittedAt || ""],
    ["Approved By", meta.approvedByName || "", meta.approvedAt || ""],
    [],
    ["TIME Hrs.", "Generator Frequency Hz.", "Bus voltage KV.", "UNIT 1 Active Power MW", "UNIT 1 Reactive Power MVAR", "UNIT 1 Voltage KV", "UNIT 1 Current A", "UNIT 2 Active Power MW", "UNIT 2 Reactive Power MVAR", "UNIT 2 Voltage KV", "UNIT 2 Current A", "UNIT 3 Active Power MW", "UNIT 3 Reactive Power MVAR", "UNIT 3 Voltage KV", "UNIT 3 Current A", "Total MW", "Total MVAR"],
    ...rows.map(row => [
      row.time,
      displayNumber(row.freq, 2),
      displayNumber(row.busKv, 2),
      displayNumber(row.u1.mw, 1),
      displayNumber(row.u1.mvar, 1),
      displayNumber(row.u1.kv, 2),
      displayNumber(row.u1.current, 0),
      displayNumber(row.u2.mw, 1),
      displayNumber(row.u2.mvar, 1),
      displayNumber(row.u2.kv, 2),
      displayNumber(row.u2.current, 0),
      displayNumber(row.u3.mw, 1),
      displayNumber(row.u3.mvar, 1),
      displayNumber(row.u3.kv, 2),
      displayNumber(row.u3.current, 0),
      rowTotalDisplay(row, "mw"),
      rowTotalDisplay(row, "mvar")
    ]),
    [],
    statCsvRow("Max", "max"),
    statCsvRow("Min", "min"),
    statCsvRow("AVR", "avg"),
    [],
    ["Production MWh", meta.mwh?.[0] || "", meta.mwh?.[1] || "", meta.mwh?.[2] || "", meta.totalProduction || ""],
    ["Service Hour", meta.service?.[0] || "", meta.service?.[1] || "", meta.service?.[2] || "", "Auxiliary", meta.auxiliary || ""],
    ["Outage Hour", meta.outage?.[0] || "", meta.outage?.[1] || "", meta.outage?.[2] || ""],
    ["GCB Open", meta.gcbOpen?.[0] || "", meta.gcbOpen?.[1] || "", meta.gcbOpen?.[2] || "", "WATER LEVEL"],
    ["GCB Close", meta.gcbClose?.[0] || "", meta.gcbClose?.[1] || "", meta.gcbClose?.[2] || "", meta.waterLevel || ""],
    [],
    ["Shift", "Operators Name", "Group"],
    ...(meta.shifts || defaultProductionMeta().shifts).map(shift => [shift.name, shift.operators, shift.group])
  ];
}

function downloadCsv(filename, rows) {
  const csv = rows.map(row => row.map(cell => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function downloadJson(filename, payload) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: "application/json;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function pdfText(value) {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/[^\x20-\x7e]/g, "")
    .replace(/([\\()])/g, "\\$1");
}

function buildTablePdf(title, date, headers, rows) {
  const pageWidth = 842;
  const pageHeight = 595;
  const margin = 28;
  const tableWidth = pageWidth - margin * 2;
  const firstWidths = [48, 68, 68];
  const remainingWidth = tableWidth - firstWidths.reduce((sum, value) => sum + value, 0);
  const columnWidths = [...firstWidths, ...Array(headers.length - 3).fill(remainingWidth / (headers.length - 3))];
  const rowsPerPage = 22;
  const pages = [];

  for (let offset = 0; offset < rows.length; offset += rowsPerPage) {
    const pageRows = rows.slice(offset, offset + rowsPerPage);
    const commands = [
      "0 G",
      "0 g",
      "0.6 w",
      `BT /F1 13 Tf ${margin} ${pageHeight - 30} Td (${pdfText(title)}) Tj ET`,
      `BT /F1 9 Tf ${pageWidth - 150} ${pageHeight - 30} Td (Date: ${pdfText(date)}) Tj ET`
    ];
    const top = pageHeight - 48;
    const headerHeight = 46;
    const rowHeight = 19;
    let x = margin;

    headers.forEach((header, index) => {
      const width = columnWidths[index];
      commands.push(`${x.toFixed(2)} ${(top - headerHeight).toFixed(2)} ${width.toFixed(2)} ${headerHeight} re S`);
      const words = String(header).split(" ");
      const lines = [];
      let line = "";
      words.forEach(word => {
        const next = line ? `${line} ${word}` : word;
        if (next.length > 12 && line) {
          lines.push(line);
          line = word;
        } else {
          line = next;
        }
      });
      if (line) lines.push(line);
      lines.slice(0, 4).forEach((text, lineIndex) => {
        commands.push(`BT /F1 5.5 Tf ${(x + 3).toFixed(2)} ${(top - 11 - lineIndex * 9).toFixed(2)} Td (${pdfText(text)}) Tj ET`);
      });
      x += width;
    });

    pageRows.forEach((row, rowIndex) => {
      const y = top - headerHeight - (rowIndex + 1) * rowHeight;
      x = margin;
      headers.forEach((_, columnIndex) => {
        const width = columnWidths[columnIndex];
        commands.push(`${x.toFixed(2)} ${y.toFixed(2)} ${width.toFixed(2)} ${rowHeight} re S`);
        const text = pdfText(row[columnIndex] ?? "").slice(0, 15);
        commands.push(`BT /F1 6.5 Tf ${(x + 3).toFixed(2)} ${(y + 6).toFixed(2)} Td (${text}) Tj ET`);
        x += width;
      });
    });

    const pageNumber = pages.length + 1;
    commands.push(`BT /F1 7 Tf ${pageWidth / 2 - 18} 14 Td (Page ${pageNumber}) Tj ET`);
    pages.push(commands.join("\n"));
  }

  const objects = [];
  const pageRefs = pages.map((_, index) => `${5 + index * 2} 0 R`).join(" ");
  objects[1] = "<< /Type /Catalog /Pages 2 0 R >>";
  objects[2] = `<< /Type /Pages /Kids [${pageRefs}] /Count ${pages.length} >>`;
  objects[3] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>";
  pages.forEach((content, index) => {
    const contentId = 4 + index * 2;
    const pageId = contentId + 1;
    objects[contentId] = `<< /Length ${new TextEncoder().encode(content).length} >>\nstream\n${content}\nendstream`;
    objects[pageId] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 3 0 R >> >> /Contents ${contentId} 0 R >>`;
  });

  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  for (let index = 1; index < objects.length; index += 1) {
    offsets[index] = new TextEncoder().encode(pdf).length;
    pdf += `${index} 0 obj\n${objects[index]}\nendobj\n`;
  }
  const xrefOffset = new TextEncoder().encode(pdf).length;
  pdf += `xref\n0 ${objects.length}\n0000000000 65535 f \n`;
  for (let index = 1; index < objects.length; index += 1) {
    pdf += `${String(offsets[index]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return new Blob([pdf], { type: "application/pdf" });
}

function downloadShuntReactorPdf() {
  printWebSheet("#shuntReactor1 .shunt-reactor-table", `Hydro Plant Shunt Reactor ${formatSheetDate(state.shuntReactorDate)}`);
}

function downloadHourlyReportPdf() {
  printWebSheet(
    "#production .production-excel, #production .production-day-table, #production .production-shift-table",
    `Hydro Plant Hourly Report ${formatSheetDate(state.productionDate)}`,
    {
      pageGroups: [[0], [1, 2]],
      printClass: "hourly-report-print"
    }
  );
}

function printWebSheet(selector, title, options = {}) {
  const sourceTables = Array.from(document.querySelectorAll(selector));
  if (!sourceTables.length) return;
  const printWindow = window.open("", "_blank", "width=1200,height=800");
  if (!printWindow) {
    state.productionNotice = "Allow browser pop-ups to create the PDF.";
    render();
    return;
  }
  const tables = sourceTables.map(table => {
    const clone = table.cloneNode(true);
    clone.querySelectorAll("input").forEach(input => {
      const value = document.createElement("span");
      value.className = "print-value";
      value.textContent = input.value;
      input.replaceWith(value);
    });
    return clone.outerHTML;
  });
  const pageGroups = Array.isArray(options.pageGroups) && options.pageGroups.length
    ? options.pageGroups
    : tables.map((_, index) => [index]);
  const printClass = String(options.printClass || "").replace(/[^a-zA-Z0-9_-]/g, "");
  const content = pageGroups.map((group, pageIndex) => {
    const pageTables = group.map(index => tables[index] || "").join("");
    return `<div class="print-sheet ${printClass} print-page-${pageIndex + 1}">${pageTables}</div>`;
  }).join("");
  printWindow.document.write(`<!doctype html>
    <html><head><meta charset="utf-8"><title>${esc(title)}</title>
    <link rel="stylesheet" href="/styles.css">
    <style>
      @page { size: A3 landscape; margin: 8mm; }
      body { margin: 0; background: #fff; color: #000; }
      .print-sheet { break-after: page; }
      .print-sheet:last-child { break-after: auto; }
      table { width: 100% !important; min-width: 0 !important; table-layout: fixed; }
      th, td { overflow-wrap: anywhere; }
      .sheet-wrap { overflow: visible; }
      .print-value { display: block; min-height: 16px; text-align: center; font-weight: 800; }
      .hourly-report-print.print-page-1 .production-excel { font-size: 7px; line-height: 1; }
      .hourly-report-print.print-page-1 .production-excel th,
      .hourly-report-print.print-page-1 .production-excel td { height: auto; padding: 1px 2px; }
      .hourly-report-print.print-page-1 .production-excel .print-value { min-height: 10px; line-height: 10px; }
      .hourly-report-print.print-page-2 { display: grid; align-content: start; gap: 5mm; break-inside: avoid-page; }
      .hourly-report-print.print-page-2 table { break-inside: avoid-page; font-size: 11px; }
      .hourly-report-print.print-page-2 th,
      .hourly-report-print.print-page-2 td { padding: 5px 7px; }
      .hourly-report-print .linked-sheet-input { min-height: 18px; }
    </style></head><body>${content}
    <script>window.addEventListener("load",()=>setTimeout(()=>window.print(),300));<\/script>
    </body></html>`);
  printWindow.document.close();
}

function xmlEsc(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&apos;"
  }[char]));
}

function columnName(index) {
  let name = "";
  let current = index + 1;
  while (current > 0) {
    const mod = (current - 1) % 26;
    name = String.fromCharCode(65 + mod) + name;
    current = Math.floor((current - mod) / 26);
  }
  return name;
}

function crc32(bytes) {
  let crc = -1;
  for (const byte of bytes) {
    crc ^= byte;
    for (let index = 0; index < 8; index += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ -1) >>> 0;
}

function writeUint32(value) {
  return [value & 255, (value >>> 8) & 255, (value >>> 16) & 255, (value >>> 24) & 255];
}

function writeUint16(value) {
  return [value & 255, (value >>> 8) & 255];
}

function concatBytes(parts) {
  const total = parts.reduce((sum, part) => sum + part.length, 0);
  const output = new Uint8Array(total);
  let offset = 0;
  parts.forEach(part => {
    output.set(part, offset);
    offset += part.length;
  });
  return output;
}

function zipFiles(files) {
  const encoder = new TextEncoder();
  const locals = [];
  const centrals = [];
  let offset = 0;
  files.forEach(file => {
    const nameBytes = encoder.encode(file.name);
    const dataBytes = typeof file.data === "string" ? encoder.encode(file.data) : file.data;
    const crc = crc32(dataBytes);
    const localHeader = new Uint8Array([
      ...writeUint32(0x04034b50), ...writeUint16(20), ...writeUint16(0), ...writeUint16(0),
      ...writeUint16(0), ...writeUint16(0), ...writeUint32(crc),
      ...writeUint32(dataBytes.length), ...writeUint32(dataBytes.length),
      ...writeUint16(nameBytes.length), ...writeUint16(0)
    ]);
    locals.push(localHeader, nameBytes, dataBytes);
    const centralHeader = new Uint8Array([
      ...writeUint32(0x02014b50), ...writeUint16(20), ...writeUint16(20), ...writeUint16(0),
      ...writeUint16(0), ...writeUint16(0), ...writeUint16(0), ...writeUint32(crc),
      ...writeUint32(dataBytes.length), ...writeUint32(dataBytes.length),
      ...writeUint16(nameBytes.length), ...writeUint16(0), ...writeUint16(0),
      ...writeUint16(0), ...writeUint16(0), ...writeUint32(0), ...writeUint32(offset)
    ]);
    centrals.push(centralHeader, nameBytes);
    offset += localHeader.length + nameBytes.length + dataBytes.length;
  });
  const centralStart = offset;
  const centralBytes = concatBytes(centrals);
  const end = new Uint8Array([
    ...writeUint32(0x06054b50), ...writeUint16(0), ...writeUint16(0),
    ...writeUint16(files.length), ...writeUint16(files.length),
    ...writeUint32(centralBytes.length), ...writeUint32(centralStart),
    ...writeUint16(0)
  ]);
  return concatBytes([...locals, centralBytes, end]);
}

function worksheetXml(rows, options = {}) {
  const columnCount = Math.max(...rows.map(row => row.length), 1);
  const styleForRow = (row, rowIndex) => {
    if ((options.headerRows || []).includes(rowIndex + 1)) return options.greenHeader ? 3 : 2;
    if ((options.summaryRows || []).includes(rowIndex + 1)) return 3;
    const first = String(row[0] ?? "").trim().toUpperCase();
    if (first.includes("HYDRO PLANT") || first === "GENERATION DAILY REPORT") return 1;
    if (first === "TIME HRS." || first === "TIME") return 2;
    if (["MAX", "MIN", "AVR"].includes(first)) return 3;
    if (["DATE", "GENERATED AT", "SUBMITTED BY", "APPROVED BY", "PRODUCTION MWH", "SERVICE HOUR", "OUTAGE HOUR", "GCB OPEN", "GCB CLOSE", "SHIFT"].includes(first)) return 4;
    return 0;
  };
  const sheetRows = rows.map((row, rowIndex) => `
    <row r="${rowIndex + 1}" ${styleForRow(row, rowIndex) === 1 ? 'ht="24" customHeight="1"' : ""}>
      ${row.map((cell, columnIndex) => `<c r="${columnName(columnIndex)}${rowIndex + 1}" s="${styleForRow(row, rowIndex)}" t="inlineStr"><is><t>${xmlEsc(cell)}</t></is></c>`).join("")}
    </row>
  `).join("");
  const mergeCells = (options.merges || []).length
    ? `<mergeCells count="${options.merges.length}">${options.merges.map(ref => `<mergeCell ref="${ref}"/>`).join("")}</mergeCells>`
    : "";
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
  <worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
    <sheetViews><sheetView workbookViewId="0"/></sheetViews>
    <sheetFormatPr defaultRowHeight="16"/>
    <cols>${Array.from({ length: columnCount }, (_, index) => `<col min="${index + 1}" max="${index + 1}" width="${index === 0 ? 15 : index < 3 ? 18 : 17}" customWidth="1"/>`).join("")}</cols>
    <sheetData>${sheetRows}</sheetData>
    ${mergeCells}
    <pageMargins left="0.25" right="0.25" top="0.4" bottom="0.4" header="0.2" footer="0.2"/>
    <pageSetup orientation="landscape" fitToWidth="1" fitToHeight="0" paperSize="9"/>
  </worksheet>`;
}

function downloadXlsx(filename, rows, options = {}) {
  const files = [
    { name: "[Content_Types].xml", data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>` },
    { name: "_rels/.rels", data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>` },
    { name: "xl/workbook.xml", data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="${xmlEsc(options.sheetName || "Production")}" sheetId="1" r:id="rId1"/></sheets></workbook>` },
    { name: "xl/_rels/workbook.xml.rels", data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>` },
    { name: "xl/styles.xml", data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="4"><font><sz val="10"/><name val="Calibri"/></font><font><b/><sz val="15"/><color rgb="FF0B2F2A"/><name val="Calibri"/></font><font><b/><sz val="10"/><color rgb="FFC40000"/><name val="Calibri"/></font><font><b/><sz val="10"/><name val="Calibri"/></font></fonts><fills count="4"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFFFFFFF"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFD9E3EC"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FF8CCC4D"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="2"><border/><border><left style="thin"><color rgb="FF111111"/></left><right style="thin"><color rgb="FF111111"/></right><top style="thin"><color rgb="FF111111"/></top><bottom style="thin"><color rgb="FF111111"/></bottom></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="5"><xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0"><alignment horizontal="center" vertical="center" wrapText="1"/></xf><xf numFmtId="0" fontId="1" fillId="1" borderId="0" xfId="0"><alignment horizontal="left" vertical="center"/></xf><xf numFmtId="0" fontId="2" fillId="2" borderId="1" xfId="0"><alignment horizontal="center" vertical="center" wrapText="1"/></xf><xf numFmtId="0" fontId="3" fillId="3" borderId="1" xfId="0"><alignment horizontal="center" vertical="center"/></xf><xf numFmtId="0" fontId="3" fillId="1" borderId="1" xfId="0"><alignment horizontal="left" vertical="center" wrapText="1"/></xf></cellXfs></styleSheet>` },
    { name: "xl/worksheets/sheet1.xml", data: worksheetXml(rows, options) }
  ];
  const blob = new Blob([zipFiles(files)], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function workbookSheetName(name, usedNames) {
  const clean = String(name || "Sheet")
    .replace(/[\[\]:*?/\\]/g, " ")
    .replace(/\s+/g, " ")
    .trim() || "Sheet";
  const base = clean.slice(0, 31);
  let candidate = base;
  let suffix = 2;
  while (usedNames.has(candidate.toLowerCase())) {
    const tail = ` ${suffix++}`;
    candidate = `${base.slice(0, 31 - tail.length)}${tail}`;
  }
  usedNames.add(candidate.toLowerCase());
  return candidate;
}

function downloadWorkbookXlsx(filename, sheets) {
  const usedNames = new Set();
  const safeSheets = sheets.map((sheet, index) => ({
    name: workbookSheetName(sheet.name || sheet.options?.sheetName || `Sheet ${index + 1}`, usedNames),
    rows: sheet.rows?.length ? sheet.rows : [["No data"]],
    options: sheet.options || {}
  }));
  const worksheetOverrides = safeSheets.map((_, index) =>
    `<Override PartName="/xl/worksheets/sheet${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`
  ).join("");
  const workbookSheets = safeSheets.map((sheet, index) =>
    `<sheet name="${xmlEsc(sheet.name)}" sheetId="${index + 1}" r:id="rId${index + 1}"/>`
  ).join("");
  const worksheetRelationships = safeSheets.map((_, index) =>
    `<Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${index + 1}.xml"/>`
  ).join("");
  const styleRelationshipId = `rId${safeSheets.length + 1}`;
  const files = [
    { name: "[Content_Types].xml", data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>${worksheetOverrides}<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>` },
    { name: "_rels/.rels", data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>` },
    { name: "xl/workbook.xml", data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${workbookSheets}</sheets></workbook>` },
    { name: "xl/_rels/workbook.xml.rels", data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${worksheetRelationships}<Relationship Id="${styleRelationshipId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>` },
    { name: "xl/styles.xml", data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="4"><font><sz val="10"/><name val="Calibri"/></font><font><b/><sz val="15"/><color rgb="FF0B2F2A"/><name val="Calibri"/></font><font><b/><sz val="10"/><color rgb="FFC40000"/><name val="Calibri"/></font><font><b/><sz val="10"/><name val="Calibri"/></font></fonts><fills count="4"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFFFFFFF"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFD9E3EC"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FF8CCC4D"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="2"><border/><border><left style="thin"><color rgb="FF111111"/></left><right style="thin"><color rgb="FF111111"/></right><top style="thin"><color rgb="FF111111"/></top><bottom style="thin"><color rgb="FF111111"/></bottom></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="5"><xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0"><alignment horizontal="center" vertical="center" wrapText="1"/></xf><xf numFmtId="0" fontId="1" fillId="1" borderId="0" xfId="0"><alignment horizontal="left" vertical="center"/></xf><xf numFmtId="0" fontId="2" fillId="2" borderId="1" xfId="0"><alignment horizontal="center" vertical="center" wrapText="1"/></xf><xf numFmtId="0" fontId="3" fillId="3" borderId="1" xfId="0"><alignment horizontal="center" vertical="center"/></xf><xf numFmtId="0" fontId="3" fillId="1" borderId="1" xfId="0"><alignment horizontal="left" vertical="center" wrapText="1"/></xf></cellXfs></styleSheet>` },
    ...safeSheets.map((sheet, index) => ({
      name: `xl/worksheets/sheet${index + 1}.xml`,
      data: worksheetXml(sheet.rows, sheet.options)
    }))
  ];
  const blob = new Blob([zipFiles(files)], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function hourlyReportWorkbookRows(rows = productionRows(), meta = productionMeta()) {
  const headers = ["Active Power MW", "Reactive Power MVAR", "Voltage kV", "Current A"];
  const sheetBody = productionExportRows(rows, meta).slice(7);
  sheetBody.splice(rows.length, 1);
  return [
    ["", "", "", "", "", "", "", "", "", "", "", "", `Date: ${formatSheetDate(state.productionDate)}`, "", "", "", ""],
    ["TIME Hrs.", "Generator Frequency Hz.", "Bus voltage kV", "UNIT 1", "", "", "", "UNIT 2", "", "", "", "UNIT 3", "", "", "", "Total MW", "Total MVAR"],
    ["", "", "", ...headers, ...headers, ...headers, "", ""],
    ...sheetBody
  ];
}

function hourlyReportWorkbookOptions(rowCount = productionRows().length) {
  return {
    sheetName: "Hourly Report",
    headerRows: [1, 2, 3],
    summaryRows: [rowCount + 4, rowCount + 5, rowCount + 6],
    merges: ["M1:Q1", "A2:A3", "B2:B3", "C2:C3", "D2:G2", "H2:K2", "L2:O2", "P2:P3", "Q2:Q3"]
  };
}

function shuntReactorWorkbookRows(rows = shuntReactorRows()) {
  const labels = ["ACTIVE POWER MW", "REACTIVE POWER MVAR", "VOLTAGE kV", "CURRENT Amp"];
  const stat = (label, type) => [label, ...shuntReactorFields.map(field => shuntReactorStat(rows, field, type))];
  return [
    ["", "", "", "", "", "", "", `DATE: ${formatSheetDate(state.shuntReactorDate)}`, "", "", ""],
    ["TIME", "System Frequency Hz", "Bus Voltage kV", "SHUNT REACTOR 1", "", "", "", "SHUNT REACTOR 2", "", "", ""],
    ["", "", "", ...labels, ...labels],
    ...rows.map(row => [row.time === "24:00" ? "24:00:00" : row.time, row.freq, row.busKv, row.sr1.mw, row.sr1.mvar, row.sr1.kv, row.sr1.current, row.sr2.mw, row.sr2.mvar, row.sr2.kv, row.sr2.current]),
    stat("MAX", "max"),
    stat("MIN", "min")
  ];
}

function reactorWorkbookOptions(rowCount, sheetName = "Shunt Reactor") {
  return {
    sheetName,
    headerRows: [1, 2, 3],
    greenHeader: sheetName === "Line Parameter",
    summaryRows: [rowCount + 4, rowCount + 5],
    merges: ["H1:K1", "A2:A3", "B2:B3", "C2:C3", "D2:G2", "H2:K2"]
  };
}

function lineParameterWorkbookRows(rows = lineParameterRows()) {
  const labels = ["ACTIVE POWER MW", "REACTIVE POWER MVAR", "VOLTAGE kV", "CURRENT Amp"];
  return [
    ["", "", "", "", "", "", "", `DATE: ${formatSheetDate(state.lineParameterDate)}`, "", "", ""],
    ["TIME", "System Frequency Hz", "Bus Voltage kV", "LINE PARAMETER 1", "", "", "", "LINE PARAMETER 2", "", "", ""],
    ["", "", "", ...labels, ...labels],
    ...rows.map(row => [row.time === "24:00" ? "24:00:00" : row.time, row.freq, row.busKv, row.line1.mw, row.line1.mvar, row.line1.kv, row.line1.current, row.line2.mw, row.line2.mvar, row.line2.kv, row.line2.current]),
    ["MAX", ...lineParameterFields.map(field => lineParameterStat(rows, field, "max"))],
    ["MIN", ...lineParameterFields.map(field => lineParameterStat(rows, field, "min"))]
  ];
}

function operationsLogbookWorkbookRows() {
  return [
    ["Entry Time", "Shift", "Unit/System", "Asset", "Type", "Severity", "Status", "Description", "Submitted By", "Approved By", "Review Comment"],
    ...((state.data.logEntries || [])
      .filter(entry => (entry.category || "operations") === "operations")
      .map(entry => [
        entry.entryTime || entry.submittedAt || "",
        operationShiftLabel(entry.shift || ""),
        entry.unit || "",
        state.data.assets.find(asset => asset.id === entry.assetId)?.name || "",
        entry.type || "",
        entry.severity || "",
        entry.status || "",
        entry.description || "",
        entry.submittedByName || "",
        entry.approvedByName || "",
        entry.reviewComment || ""
      ]))
  ];
}

function operationWorkbookMonth() {
  return state.monthlyProductionMonth || todayDateValue().slice(0, 7);
}

function firstDayAfterMonth(month = operationWorkbookMonth()) {
  const [year, monthNumber] = String(month || todayDateValue().slice(0, 7)).split("-").map(Number);
  if (!year || !monthNumber) return todayDateValue();
  const date = new Date(year, monthNumber, 1);
  const nextMonth = String(date.getMonth() + 1).padStart(2, "0");
  const nextDay = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${nextMonth}-${nextDay}`;
}

function operationWorkbookMonthClosed(month = operationWorkbookMonth()) {
  return todayDateValue() >= firstDayAfterMonth(month);
}

function operationWorkbookDownloadStatus(month = operationWorkbookMonth()) {
  return operationWorkbookMonthClosed(month)
    ? `${monthlyProductionMonthLabel(month)} workbook ready`
    : `Available from ${formatSheetDate(firstDayAfterMonth(month))}`;
}

function workbookBar(value, maxValue, width = 32) {
  const number = Number(value || 0);
  const max = Math.max(Number(maxValue || 0), 1);
  const length = Math.max(number > 0 ? 1 : 0, Math.round((number / max) * width));
  return "#".repeat(length);
}

function workbookChartSection(title, rows, unit = "") {
  const values = rows.map(row => Number(row.value || 0));
  const maxValue = Math.max(...values, 1);
  return [
    [],
    [title],
    ["Item", "Value", "Unit", "Chart"],
    ...rows.map(row => [
      row.label,
      Number(row.value || 0).toFixed(row.decimals ?? 1),
      unit || row.unit || "",
      workbookBar(row.value, maxValue)
    ])
  ];
}

function operationWorkbookChartRows(month, monthlyRows, dailyProductionRows, shuntRows, lineRows) {
  const monthlyTotals = monthlyProductionTotals(monthlyRows);
  const selectedEnergy = productionEnergyForRows(dailyProductionRows, productionMeta());
  const dailyTotals = productionTotals(dailyProductionRows);
  const waterStored = waterLevelSheets()[waterLevelStorageDate(`${month}-01`)];
  const waterRows = Array.isArray(waterStored) ? waterStored : waterStored?.rows || [];
  const reservoirValues = waterRows.map(row => Number(row.reservoir)).filter(Number.isFinite);
  const tailraceValues = waterRows.map(row => Number(row.tailrace)).filter(Number.isFinite);
  const energyData = energyMeterRows();
  const transformerKwh = (energyData.transformers || [])
    .filter(row => row.power === "KWH")
    .map(row => (row.meters || []).reduce((sum, meter) => sum + Number(energyMeterProduction(meter) || 0), 0))
    .reduce((sum, value) => sum + value, 0);
  const operationLogs = (state.data.logEntries || []).filter(entry => (entry.category || "operations") === "operations");
  const approvedLogs = operationLogs.filter(entry => entry.status === "Approved").length;
  const rows = [
    ["Hydro Plant Operation Workbook"],
    [`Chart Dashboard - ${monthlyProductionMonthLabel(month)}`],
    ["Generated At", new Date().toLocaleString()],
    ["Workbook Month", monthlyProductionMonthLabel(month)],
    ["Selected Daily Sheet", formatSheetDate(state.productionDate || todayDateValue())]
  ];
  rows.push(...workbookChartSection("Generation Monthly Report by Unit", [
    { label: "Unit #1 Production", value: monthlyTotals.production[0], unit: "KWH" },
    { label: "Unit #2 Production", value: monthlyTotals.production[1], unit: "KWH" },
    { label: "Unit #3 Production", value: monthlyTotals.production[2], unit: "KWH" },
    { label: "Total Production", value: monthlyTotals.totalProduction, unit: "KWH" },
    { label: "Total Auxiliary", value: monthlyTotals.totalAuxiliary, unit: "KWH" }
  ]));
  rows.push(...workbookChartSection("Daily Production for Selected Day", [
    { label: "Unit #1", value: selectedEnergy.units[0], unit: "MWh" },
    { label: "Unit #2", value: selectedEnergy.units[1], unit: "MWh" },
    { label: "Unit #3", value: selectedEnergy.units[2], unit: "MWh" },
    { label: "Total", value: selectedEnergy.total, unit: "MWh" }
  ]));
  rows.push(...workbookChartSection("Hourly Output Summary", [
    { label: "Current MW", value: dailyTotals.currentMw, unit: "MW" },
    { label: "Maximum MW", value: dailyTotals.maxMw, unit: "MW" },
    { label: "Average MW", value: dailyTotals.avgMw, unit: "MW" },
    { label: "Estimated MWh", value: dailyTotals.mwh, unit: "MWh" }
  ]));
  rows.push(...workbookChartSection("Water Level Summary", [
    { label: "Reservoir Minimum", value: reservoirValues.length ? Math.min(...reservoirValues) : 0, unit: "m.a.s.l", decimals: 3 },
    { label: "Reservoir Maximum", value: reservoirValues.length ? Math.max(...reservoirValues) : 0, unit: "m.a.s.l", decimals: 3 },
    { label: "Tail Race Minimum", value: tailraceValues.length ? Math.min(...tailraceValues) : 0, unit: "m.a.s.l", decimals: 3 },
    { label: "Tail Race Maximum", value: tailraceValues.length ? Math.max(...tailraceValues) : 0, unit: "m.a.s.l", decimals: 3 }
  ]));
  rows.push(...workbookChartSection("Electrical Operation Summary", [
    { label: "Shunt Reactor 1 Max MW", value: shuntReactorStat(shuntRows, "sr1.mw", "max"), unit: "MW" },
    { label: "Shunt Reactor 2 Max MW", value: shuntReactorStat(shuntRows, "sr2.mw", "max"), unit: "MW" },
    { label: "Line Parameter 1 Max MW", value: lineParameterStat(lineRows, "line1.mw", "max"), unit: "MW" },
    { label: "Line Parameter 2 Max MW", value: lineParameterStat(lineRows, "line2.mw", "max"), unit: "MW" },
    { label: "Energy Meter KWH Production", value: transformerKwh, unit: "KWH" }
  ]));
  rows.push(...workbookChartSection("Operations Logbook Status", [
    { label: "Total Entries", value: operationLogs.length, unit: "entries", decimals: 0 },
    { label: "Approved Entries", value: approvedLogs, unit: "entries", decimals: 0 },
    { label: "Pending/Rejected Entries", value: operationLogs.length - approvedLogs, unit: "entries", decimals: 0 }
  ]));
  return rows;
}

function downloadPlantOperationWorkbook(month = operationWorkbookMonth()) {
  if (!operationWorkbookMonthClosed(month)) {
    alert(`Plant Operation Workbook download opens on ${formatSheetDate(firstDayAfterMonth(month))}.`);
    return;
  }
  const productionRowsForDate = productionRows();
  const shuntRows = shuntReactorRows();
  const lineRows = lineParameterRows();
  const monthlyRows = monthlyProductionRows(month);
  downloadWorkbookXlsx(`Hydro_Plant_Operation_Workbook_${month}.xlsx`, [
    {
      name: "Operation Charts",
      rows: operationWorkbookChartRows(month, monthlyRows, productionRowsForDate, shuntRows, lineRows),
      options: { sheetName: "Operation Charts", headerRows: [1, 2, 7, 15, 22, 29, 36, 44] }
    },
    {
      name: "Daily Generation Report",
      rows: dailyGenerationReportRows(state.productionDate || todayDateValue()),
      options: dailyGenerationReportXlsxOptions()
    },
    {
      name: "Daily Production",
      rows: productionMeterExportRows(),
      options: {
        sheetName: "Daily Production",
        headerRows: [1, 2, 3],
        greenHeader: true,
        merges: ["B1:D1", "E1:K1", "B2:D2", "E2:G2", "H2:J2", "K2:K3"]
      }
    },
    {
      name: "Generation Monthly Report",
      rows: monthlyProductionExportRows(monthlyRows),
      options: {
        sheetName: "Generation Monthly Report",
        headerRows: [1, 2, 3],
        summaryRows: [monthlyRows.length + 4],
        merges: ["A1:M1", "A2:A3", "B2:D2", "E2:G2", "H2:J2", "K2:M2"]
      }
    },
    {
      name: "Hourly Report",
      rows: hourlyReportWorkbookRows(productionRowsForDate, productionMeta()),
      options: hourlyReportWorkbookOptions(productionRowsForDate.length)
    },
    {
      name: "Energy Meter",
      rows: energyMeterExportRows(),
      options: {
        sheetName: "Energy Meter",
        headerRows: [1, 2, 3, 11, 12],
        merges: ["I1:K1", "C2:E2", "F2:H2", "I2:K2", "A4:A6", "A7:A9", "C11:E11", "F11:H11", "I11:I12", "A13:A15", "A16:A18"]
      }
    },
    {
      name: "Water Level",
      rows: waterLevelExportRows(),
      options: { sheetName: "Water Level", headerRows: [1, 2], merges: ["A1:C1"] }
    },
    {
      name: "Shunt Reactor",
      rows: shuntReactorWorkbookRows(shuntRows),
      options: reactorWorkbookOptions(shuntRows.length, "Shunt Reactor")
    },
    {
      name: "Line Parameter",
      rows: lineParameterWorkbookRows(lineRows),
      options: reactorWorkbookOptions(lineRows.length, "Line Parameter")
    },
    {
      name: "Operations Logbook",
      rows: operationsLogbookWorkbookRows(),
      options: { sheetName: "Operations Logbook", headerRows: [1] }
    }
  ]);
}

function maintenanceLogbookWorkbookRows() {
  return [
    ["Entry Time", "Shift", "Unit/System", "Asset", "Type", "Severity", "Status", "Description", "Submitted By", "Approved By", "Review Comment"],
    ...((state.data.logEntries || [])
      .filter(entry => (entry.category || "operations") === "maintenance")
      .map(entry => [
        entry.entryTime || entry.submittedAt || "",
        entry.shift || "",
        entry.unit || "",
        state.data.assets.find(asset => asset.id === entry.assetId)?.name || "",
        entry.type || "",
        entry.severity || "",
        entry.status || "",
        entry.description || "",
        entry.submittedByName || "",
        entry.approvedByName || "",
        entry.reviewComment || ""
      ]))
  ];
}

function maintenanceDocumentsWorkbookRows() {
  const maintenanceModules = new Set(["plant-maintenance-report", "plant-maintenance-archive", "commissioning-test-reports", "work-orders", "assets", "preventive", "maintenance-types", "inventory"]);
  return [
    ["File", "Module", "Category", "Folder", "Linked Record", "Size", "Uploaded By", "Uploaded At", "Description"],
    ...((state.data.attachments || [])
      .filter(file => maintenanceModules.has(file.module))
      .map(file => [
        file.name || "",
        moduleNameLabel(file.module),
        file.category || "",
        file.folder || "",
        file.linkedName || "",
        fileSize(file.size),
        file.uploadedByName || "",
        file.uploadedAt || "",
        file.description || file.mimeType || ""
      ]))
  ];
}

function maintenanceReportWorkbookSheets() {
  return [
    {
      name: "Work Orders",
      rows: workOrderExportRows(),
      options: { sheetName: "Work Orders", headerRows: [1] }
    },
    {
      name: "Maintenance Logbook",
      rows: maintenanceLogbookWorkbookRows(),
      options: { sheetName: "Maintenance Logbook", headerRows: [1] }
    },
    {
      name: "PM Schedules",
      rows: [
        ["Name", "Asset", "Frequency", "Next Due", "Active", "Job Plan"],
        ...((state.data.pmSchedules || []).map(pm => [
          pm.name || "",
          pm.assetName || state.data.assets.find(asset => asset.id === pm.assetId)?.name || "",
          pm.frequency || "",
          pm.nextDue || "",
          pm.active === false ? "No" : "Yes",
          pm.jobPlan || ""
        ]))
      ],
      options: { sheetName: "PM Schedules", headerRows: [1] }
    },
    {
      name: "Maintenance Types",
      rows: [
        ["Code", "Name", "Category", "Active", "Description"],
        ...((state.data.maintenanceTypes || []).map(type => [
          type.code || "",
          type.name || "",
          type.category || "",
          type.active === false ? "No" : "Yes",
          type.description || ""
        ]))
      ],
      options: { sheetName: "Maintenance Types", headerRows: [1] }
    },
    {
      name: "Assets",
      rows: [
        ["Code", "Name", "Type", "Location", "Criticality", "Status", "Manufacturer", "Model", "Commissioned", "Parent Asset"],
        ...((state.data.assets || []).map(asset => [
          asset.code || "",
          asset.name || "",
          asset.type || "",
          asset.location || "",
          asset.criticality || "",
          asset.status || "",
          asset.manufacturer || "",
          asset.model || "",
          asset.commissioned || "",
          state.data.assets.find(parent => parent.id === asset.parentId)?.name || ""
        ]))
      ],
      options: { sheetName: "Assets", headerRows: [1] }
    },
    {
      name: "Asset Types",
      rows: [
        ["Code", "Name", "Group", "Active", "Description"],
        ...((state.data.assetTypes || []).map(type => [
          type.code || "",
          type.name || "",
          type.group || "",
          type.active === false ? "No" : "Yes",
          type.description || ""
        ]))
      ],
      options: { sheetName: "Asset Types", headerRows: [1] }
    },
    {
      name: "Inventory",
      rows: [
        ["Code", "Name", "Category", "Quantity", "Unit", "Minimum", "Maximum", "Location", "Critical"],
        ...((state.data.inventory || []).map(item => [
          item.code || "",
          item.name || "",
          item.category || "",
          item.qty ?? "",
          item.unit || "",
          item.min ?? "",
          item.max ?? "",
          item.location || "",
          item.critical ? "Yes" : "No"
        ]))
      ],
      options: { sheetName: "Inventory", headerRows: [1] }
    },
    {
      name: "Maintenance Documents",
      rows: maintenanceDocumentsWorkbookRows(),
      options: { sheetName: "Maintenance Documents", headerRows: [1] }
    }
  ];
}

function downloadMaintenanceReportWorkbook() {
  downloadWorkbookXlsx(`Hydro_Maintenance_Report_${todayDateValue()}.xlsx`, maintenanceReportWorkbookSheets());
}

function dailyGenerationDate() {
  return state.dailyGenerationDate || state.productionDate || todayDateValue();
}

function dailyGenerationReports() {
  if (!state.dailyGenerationReports) {
    const serverReports = state.data?.dailyGenerationReports || {};
    state.dailyGenerationReports = { ...serverReports };
    localStorage.setItem(dailyGenerationStorageKey, JSON.stringify(state.dailyGenerationReports));
  }
  return state.dailyGenerationReports;
}

function dailyGenerationManual(date = dailyGenerationDate()) {
  const reports = dailyGenerationReports();
  if (!reports[date]) reports[date] = { fields: {} };
  if (!reports[date].fields || typeof reports[date].fields !== "object" || Array.isArray(reports[date].fields)) {
    reports[date].fields = {};
  }
  return reports[date].fields;
}

function dailyGenerationManualValue(date, key, fallback = "") {
  const value = dailyGenerationManual(date)[key];
  return value === undefined || value === null || value === "" ? fallback : value;
}

function canEditDailyGenerationReport() {
  if (productionSubmission("daily-generation", dailyGenerationDate())?.approvedAt) return false;
  return canAdminOverride() || canControlPlantOperations() || canEnterProduction();
}

function saveDailyGenerationReport(date = dailyGenerationDate()) {
  localStorage.setItem(dailyGenerationStorageKey, JSON.stringify(dailyGenerationReports()));
  if (!state.currentUserId || !date) return;
  state.dailyGenerationSyncTimers = state.dailyGenerationSyncTimers || {};
  clearTimeout(state.dailyGenerationSyncTimers[date]);
  state.dailyGenerationSyncTimers[date] = setTimeout(() => {
    api(`/api/daily-generation/${encodeURIComponent(date)}`, {
      method: "PUT",
      body: JSON.stringify({ fields: dailyGenerationManual(date) })
    }).catch(error => {
      state.dailyGenerationNotice = `Daily Generation Report saved in this browser, but server sync failed: ${error.message}`;
    });
  }, 250);
}

async function saveDailyGenerationReportNow(date = dailyGenerationDate()) {
  state.dailyGenerationSyncTimers = state.dailyGenerationSyncTimers || {};
  clearTimeout(state.dailyGenerationSyncTimers[date]);
  const saved = await api(`/api/daily-generation/${encodeURIComponent(date)}`, {
    method: "PUT",
    body: JSON.stringify({ fields: dailyGenerationManual(date) })
  });
  dailyGenerationReports()[date] = saved;
  localStorage.setItem(dailyGenerationStorageKey, JSON.stringify(dailyGenerationReports()));
  return saved;
}

function productionRowsForReport(date) {
  const stored = productionSheets()[date];
  return Array.isArray(stored) ? stored : productionTimes().map(time => makeProductionSheetRow(time));
}

function productionMetaForReport(date) {
  return applyHourlyReportLinks(productionMetas()[date] || defaultProductionMeta(), date);
}

function productionMeterRowsForReport(date) {
  const stored = productionMeterReadings()[date];
  const rows = Array.isArray(stored) ? stored : stored?.rows;
  return Array.isArray(rows) ? rows : defaultProductionMeterRows();
}

function dailyGenerationUnitRows(date = dailyGenerationDate()) {
  const rows = productionRowsForReport(date);
  const meta = productionMetaForReport(date);
  const meterRows = productionMeterRowsForReport(date);
  const energy = productionEnergyForRows(rows, meta);
  const productionKwh = meterRows.find(row => row.key === "productionKwh");
  const auxiliaryKwh = meterRows.find(row => row.key === "auxKwh");
  return ["u1", "u2", "u3"].map((unit, index) => {
    const meterProduction = productionKwh ? productionMeterDifference(productionKwh.units?.[index]) : "";
    const auxiliary = auxiliaryKwh ? productionMeterDifference(auxiliaryKwh.units?.[index]) : "";
    const mwh = Number(energy.units[index] || 0);
    return {
      unit: `Unit #${index + 1}`,
      avgMw: productionStat(rows, row => hasValue(row[unit]?.mw) ? row[unit].mw : "", "avg"),
      maxMw: productionStat(rows, row => hasValue(row[unit]?.mw) ? row[unit].mw : "", "max"),
      minMw: productionStat(rows, row => hasValue(row[unit]?.mw) ? row[unit].mw : "", "min"),
      mwh,
      service: meta.service?.[index] || "",
      outage: meta.outage?.[index] || "",
      gcbOpen: meta.gcbOpen?.[index] || "",
      gcbClose: meta.gcbClose?.[index] || "",
      productionKwh: meterProduction === "" ? mwh * 1000 : meterProduction,
      auxiliaryKwh: auxiliary === "" ? 0 : auxiliary
    };
  });
}

function numericReportValue(value) {
  if (!hasValue(value) || String(value).trim() === "") return null;
  const number = Number(String(value).replace(/,/g, ""));
  return Number.isFinite(number) ? number : null;
}

function formatReportNumber(value, decimals = 1) {
  const number = numericReportValue(value);
  return number === null ? "" : number.toFixed(decimals);
}

function formatReportDecimal(value) {
  if (!hasValue(value) || String(value).trim() === "") return "";
  if (typeof value === "string") return exactNumericEntry(value);
  const number = Number(value);
  return Number.isFinite(number) ? String(Number(number.toPrecision(15))) : "";
}

function hoursFromDuration(value) {
  if (!hasValue(value) || String(value).trim() === "") return null;
  const text = String(value).trim();
  const parts = text.split(":").map(part => Number(part));
  if (parts.length > 1 && parts.every(part => Number.isFinite(part))) {
    return (parts[0] || 0) + (parts[1] || 0) / 60 + (parts[2] || 0) / 3600;
  }
  const number = Number(text);
  return Number.isFinite(number) ? number : null;
}

function formatDurationHours(hours) {
  if (!Number.isFinite(hours)) return "";
  let totalMinutes = Math.round(hours * 60);
  const prefix = totalMinutes < 0 ? "-" : "";
  totalMinutes = Math.abs(totalMinutes);
  const hourPart = Math.floor(totalMinutes / 60);
  const minutePart = String(totalMinutes % 60).padStart(2, "0");
  return `${prefix}${hourPart}:${minutePart}`;
}

function sumDurationValues(values) {
  const hours = values.map(hoursFromDuration).filter(value => value !== null);
  if (!hours.length) return "";
  return formatDurationHours(hours.reduce((sum, value) => sum + value, 0));
}

function outageOverlapHoursForDate(record, date) {
  const start = new Date(record.from);
  const end = new Date(record.to);
  const dayStart = new Date(`${date}T00:00:00`);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);
  if ([start, end, dayStart, dayEnd].some(item => Number.isNaN(item.getTime()))) return null;
  const overlapStart = Math.max(start.getTime(), dayStart.getTime());
  const overlapEnd = Math.min(end.getTime(), dayEnd.getTime());
  const hours = (overlapEnd - overlapStart) / 3600000;
  return hours > 0 ? hours : null;
}

function systemPowerConstraintHoursForUnitDate(date, unitIndex) {
  const unit = `Unit ${unitIndex + 1}`;
  const values = outageRecords()
    .filter(record => record.unit === unit && record.category === "System Power Constraint")
    .map(record => outageOverlapHoursForDate(record, date))
    .filter(value => value !== null);
  return values.length ? values.reduce((sum, value) => sum + value, 0) : null;
}

function durationPaf(value) {
  const hours = hoursFromDuration(value);
  if (hours === null) return "";
  return Math.max(0, Math.min(100, (hours / 24) * 100));
}

function reportNumberForDate(date = dailyGenerationDate()) {
  return `HYDRO-DGR-${String(date || todayDateValue()).replace(/-/g, "")}`;
}

function mwhToMu(value) {
  const parts = decimalParts(value);
  if (parts) return decimalText(parts.integer, parts.scale + 3);
  const number = numericReportValue(value);
  return number === null ? "" : number / 1000;
}

function kwhToMu(value) {
  const parts = decimalParts(value);
  if (parts) return decimalText(parts.integer, parts.scale + 6);
  const number = numericReportValue(value);
  return number === null ? "" : number / 1000000;
}

function mwhToKwh(value) {
  const parts = decimalParts(value);
  if (!parts) {
    const number = numericReportValue(value);
    return number === null ? "" : number * 1000;
  }
  if (parts.scale >= 3) return decimalText(parts.integer, parts.scale - 3);
  return decimalText(parts.integer * (10n ** BigInt(3 - parts.scale)), 0);
}

function waterLevelRowsForReport(date = dailyGenerationDate()) {
  const monthDate = waterLevelStorageDate(date);
  const stored = waterLevelSheets()[monthDate];
  const rows = Array.isArray(stored) ? stored : stored?.rows;
  const days = waterLevelDays(monthDate);
  if (!Array.isArray(rows)) return Array.from({ length: days }, (_, index) => makeWaterLevelRow(index + 1));
  return rows;
}

function energyMeterRowsForReport(date = dailyGenerationDate()) {
  const stored = energyMeterReadings()[date];
  const rows = stored?.rows || stored;
  return rows?.transformers && rows?.lines ? rows : defaultEnergyMeterData();
}

function productionKwhForDate(date) {
  const meterRows = productionMeterRowsForReport(date);
  const productionRow = meterRows.find(row => row.key === "productionKwh");
  const meterTotal = productionRow ? productionMeterTotal(productionRow) : "";
  if (hasValue(meterTotal)) return meterTotal;
  const rows = productionRowsForReport(date);
  const meta = productionMetaForReport(date);
  return mwhToKwh(productionEnergyForRows(rows, meta).total);
}

function cumulativeGenerationKwh(date, mode) {
  const keys = [...new Set([
    ...Object.keys(productionSheets()),
    ...Object.keys(productionMeterReadings())
  ])].filter(key => {
    if (key > date) return false;
    return mode === "month" ? key.slice(0, 7) === date.slice(0, 7) : key.slice(0, 4) === date.slice(0, 4);
  });
  return exactDecimalSum(keys.map(productionKwhForDate));
}

function dailyGenerationReportData(date = dailyGenerationDate()) {
  const rows = productionRowsForReport(date);
  const meta = productionMetaForReport(date);
  const manual = dailyGenerationManual(date);
  const unitRows = dailyGenerationUnitRows(date).map((row, index) => {
    const paf = durationPaf(row.service);
    const unitNumber = index + 1;
    return {
      ...row,
      unitLabel: `Unit ${index + 1}`,
      actualMu: mwhToMu(row.mwh),
      plannedOutage: manual[`plannedOutageU${unitNumber}`] || "",
      forcedOutage: manual[`forcedOutageU${unitNumber}`] || "",
      miscOutage: row.outage,
      availability: row.service,
      paf,
      deemedEnergyMu: "",
      remarks: hasValue(row.outage) ? "" : "Available"
    };
  });
  const total = field => exactDecimalSum(unitRows.map(row => row[field] || 0));
  const serviceHours = unitRows.map(row => hoursFromDuration(row.service)).filter(value => value !== null);
  const totalServiceHours = serviceHours.reduce((sum, value) => sum + value, 0);
  const totalPaf = serviceHours.length ? (totalServiceHours / (24 * unitRows.length)) * 100 : "";
  const energyMeter = energyMeterRowsForReport(date);
  const lineNet = energyMeter.lines.find(row => row.power === "KWH" && row.item === "NET");
  const lineKwh = [0, 1, 2].map(index => index < 2
    ? (lineNet ? energyMeterProduction(lineNet.meters[index]) : "")
    : (manual.line3ExportKwh || manual.line3ExportMu || ""));
  const hasLineExport = lineKwh.some(hasValue);
  const transmittedKwh = exactDecimalSum(lineKwh.filter(hasValue));
  const dailyExportKwh = hasLineExport ? transmittedKwh : total("productionKwh");
  const shiftRows = (meta.shifts || defaultProductionMeta().shifts).slice(0, 3);
  const condition = type => ({
    label: type.toUpperCase(),
    weather: "",
    loadMw: productionStat(rows, row => rowHasPowerData(row) ? rowProductionTotal(row).mw : "", type),
    mvar: productionStat(rows, row => rowHasPowerData(row) ? rowProductionTotal(row).mvar : "", type),
    busKv: productionStat(rows, row => hasValue(row.busKv) ? row.busKv : "", type),
    freq: productionStat(rows, row => hasValue(row.freq) ? row.freq : "", type)
  });
  const waterRows = waterLevelRowsForReport(date);
  const dateDay = Math.max(1, Number(String(date).slice(8, 10)) || 1);
  const waterRowsToDate = waterRows.slice(0, dateDay);
  const selectedWater = waterRows[dateDay - 1] || {};
  const totalActualMu = total("actualMu");
  const hydro = {
    totalInflow: manual.totalInflow || "",
    waterUtilized: hasValue(totalActualMu) ? totalActualMu * waterUtilizedCumecFactor : "",
    spilledWater: manual.spilledWater || "",
    maxReservoir: waterLevelStat(waterRowsToDate, "reservoir", "max") || selectedWater.reservoir || "",
    minReservoir: waterLevelStat(waterRowsToDate, "reservoir", "min") || selectedWater.reservoir || "",
    maxTailrace: waterLevelStat(waterRowsToDate, "tailrace", "max") || selectedWater.tailrace || "",
    silt: manual.silt || ""
  };
  const nightShift = shiftRows.find(shift => String(shift.name || "").toLowerCase() === "night") || shiftRows[2] || {};
  const outageRows = unitRows.map((row, index) => ({
    unitLine: row.unitLabel,
    outageType: hasValue(row.miscOutage) ? "MISC" : "-",
    openTime: row.gcbOpen || "-",
    closeTime: row.gcbClose || "-",
    outageTime: row.miscOutage || "-",
    energyLoss: manual[`energyLossU${index + 1}`] || "",
    reason: manual[`reasonU${index + 1}`] || ""
  }));
  return {
    date,
    manual,
    meta,
    unitRows,
    targetDailyKwh: manual.targetDailyKwh || manual.targetDailyMu || "",
    targetMonthlyKwh: manual.targetMonthlyKwh || manual.targetMonthlyMu || "",
    targetYearlyKwh: manual.targetYearlyKwh || manual.targetYearlyMu || "",
    totalActualMu,
    totalPlannedOutage: sumDurationValues(unitRows.map(row => row.plannedOutage)),
    totalForcedOutage: sumDurationValues(unitRows.map(row => row.forcedOutage)),
    totalService: sumDurationValues(unitRows.map(row => row.service)),
    totalMiscOutage: sumDurationValues(unitRows.map(row => row.miscOutage)),
    totalAvailability: sumDurationValues(unitRows.map(row => row.availability)),
    totalPaf,
    totalDeemedEnergyMu: "",
    totalMwh: total("mwh"),
    totalProductionKwh: total("productionKwh"),
    totalAuxiliaryKwh: total("auxiliaryKwh"),
    lineKwh,
    dailyExportKwh,
    transmittedKwh,
    monthlyCumulativeKwh: cumulativeGenerationKwh(date, "month"),
    yearlyCumulativeKwh: cumulativeGenerationKwh(date, "year"),
    conditionRows: ["max", "min", "avg"].map((type, index) => ({
      ...condition(type),
      auxKwh: type === "max" ? total("auxiliaryKwh") : "",
      shift: shiftRows[index]?.name || "",
      operators: shiftRows[index]?.operators || "",
      remarks: shiftRows[index]?.group ? `Group ${shiftRows[index].group}` : "",
      weather: index === 0 ? manual.weatherCondition || "" : ""
    })),
    hydro,
    outageRows,
    shiftIncharge: nightShift.name ? `${nightShift.name} shift` : "",
    shiftGroup: nightShift.group ? `Group ${nightShift.group}` : "",
    shiftOperators: nightShift.operators || ""
  };
}

function dailyGenerationReportRows(date = dailyGenerationDate()) {
  const report = dailyGenerationReportData(date);
  const conditionByLabel = Object.fromEntries(report.conditionRows.map(row => [row.label, row]));
  return [
    ["", "", "", "", "", "", "", "", ""],
    ["NO.", "", "", "", "", "", `Date:(DD/MM) ${formatSheetDate(date)} E.C`, "", ""],
    [],
    ["GENERATION AT A GLANCE", "", "", "DAILY", "", "MONT. CUMM.", "", "YEARLY CUMM.", ""],
    ["ACTUAL", "", "", formatReportDecimal(report.totalProductionKwh), "KWH", formatReportDecimal(report.monthlyCumulativeKwh), "KWH", formatReportDecimal(report.yearlyCumulativeKwh), "KWH"],
    ["TARGET", "", "", report.targetDailyKwh, "KWH", report.targetMonthlyKwh, "KWH", report.targetYearlyKwh, "KWH"],
    ["UNIT NO.", "Unit Production in KWH", "Service R/HOURS\nHR:MIN", "OUTAGES HOURS (Hr : Min)", "", "", "AVAILABILITY\nHR:MIN", "PAF (%)", ""],
    ["", "", "", "PLANNED", "FORCED", "MISC.", "", "DAILY", formatReportNumber(report.totalPaf, 1)],
    ...report.unitRows.map((row, index) => [
      row.unitLabel,
      formatReportDecimal(row.productionKwh),
      row.service,
      row.plannedOutage,
      row.forcedOutage,
      row.miscOutage,
      row.availability,
      index === 0 ? "CUMM." : index === 1 ? "DEEMED (MU)" : "",
      ""
    ]),
    ["TOTAL", formatReportDecimal(report.totalProductionKwh), report.totalService, report.totalPlannedOutage, report.totalForcedOutage, report.totalMiscOutage, report.totalAvailability, "MONT. CUMM.", ""],
    ["", "", "", "", "", "", "", "YEARLY CUMM.", ""],
    ["DAILY", formatReportDecimal(report.dailyExportKwh), "KWH", "MONTH. CUMM.", formatReportDecimal(report.monthlyCumulativeKwh), "KWH", "YEARLY CUMM.", formatReportDecimal(report.yearlyCumulativeKwh), "KWH"],
    ["", "LINE-I\n(KWH)", "", "LINE-II\n(KWH)", "", "LINE-III\n(KWH)", "", "NET TRANSMITTED\n(KWH)", ""],
    ["EXPORT", formatReportDecimal(report.lineKwh[0]), "", formatReportDecimal(report.lineKwh[1]), "", formatReportDecimal(report.lineKwh[2]), "", formatReportDecimal(report.transmittedKwh), ""],
    [],
    ["WEATHER", "LOAD", "", "", "", "", "BUS VOLTAGE\nKV", "FREQUENCY\nHz", "AUX. CONSUMPTION\nkWh"],
    ["", "", "MW", "", "MVAR", "", "", "", ""],
    [conditionByLabel.MAX?.weather || "", "MAX", formatReportNumber(conditionByLabel.MAX?.loadMw, 1), "", formatReportNumber(conditionByLabel.MAX?.mvar, 1), "", formatReportNumber(conditionByLabel.MAX?.busKv, 2), formatReportNumber(conditionByLabel.MAX?.freq, 2), formatReportDecimal(conditionByLabel.MAX?.auxKwh)],
    ["", "MIN", formatReportNumber(conditionByLabel.MIN?.loadMw, 1), "", formatReportNumber(conditionByLabel.MIN?.mvar, 1), "", formatReportNumber(conditionByLabel.MIN?.busKv, 2), formatReportNumber(conditionByLabel.MIN?.freq, 2), ""],
    ["", "AVG", formatReportNumber(conditionByLabel.AVG?.loadMw, 1), "", formatReportNumber(conditionByLabel.AVG?.mvar, 1), "", formatReportNumber(conditionByLabel.AVG?.busKv, 2), formatReportNumber(conditionByLabel.AVG?.freq, 2), ""],
    ["TOTAL INFLOW\nCumecs", "", "", "WATER UTILIZED\nCumec", "", "", "", "", "Spilled water (m3/s)"],
    [report.hydro.totalInflow, "", "", formatReportNumber(report.hydro.waterUtilized, 8) || `Total Production x ${waterUtilizedCumecFactor.toFixed(2)}`, "", "", "", "", report.hydro.spilledWater],
    ["MAX RESERVOIR LEVEL (MTR.)", "", "", "MIN RESERVOIR LEVEL (MTR.)", "", "", "MAX TRT LEVEL\n(MTR.)", "", "SILT\n(PPM)"],
    [formatReportDecimal(report.hydro.maxReservoir), "", "", formatReportDecimal(report.hydro.minReservoir), "", "", formatReportDecimal(report.hydro.maxTailrace), "", report.hydro.silt],
    [],
    ["UNIT / LINE", "OUTAGE TYPE\nPO/FO/MISC", "OPEN TIME\nHr : Min", "CLOSE AT\nHr : Min", "OUTAGE TIME\nHr : Min", "ENERGY LOSS\nMU", "REASONS", "", ""],
    ["", "", "", "", "", "", "", "", ""],
    ...report.outageRows.flatMap(row => [
      [row.unitLine, row.outageType, row.openTime, row.closeTime, row.outageTime, row.energyLoss, row.reason, "", ""],
      ["", "", "", "", "", "", "", "", ""]
    ]),
    [],
    ["", "Shift Incharge;", report.shiftIncharge, "", "", "", "", "", ""],
    ["", report.shiftGroup, report.shiftOperators, "", "", "", "", "", ""]
  ];
}

function dailyGenerationReportXlsxOptions() {
  return {
    sheetName: "Daily Generation",
    headerRows: [2, 4, 5, 6, 7, 8, 13, 14, 15, 17, 18, 19, 23, 25, 28, 29],
    summaryRows: [],
    merges: [
      "A2:B2", "G2:I2",
      "A4:C4", "D4:E4", "F4:G4", "H4:I4",
      "A5:C5", "D5:E5", "F5:G5", "H5:I5",
      "A6:C6", "D6:E6", "F6:G6", "H6:I6",
      "A7:A8", "B7:B8", "C7:C8", "D7:F7", "G7:G8", "H7:I7",
      "H9:I9", "H10:I10", "H12:I12", "A13:G13", "H13:I13",
      "B15:C15", "D15:E15", "F15:G15", "H15:I15",
      "B16:C16", "D16:E16", "F16:G16", "H16:I16",
      "A18:A19", "B18:F18", "G18:G19", "H18:H19", "I18:I19",
      "C19:D19", "E19:F19", "A20:A22", "I20:I22",
      "A23:C23", "D23:H23", "A24:C24", "D24:H24",
      "A25:C25", "D25:F25", "G25:H25", "A26:C26", "D26:F26", "G26:H26",
      "A27:I27", "A28:A29", "B28:B29", "C28:C29", "D28:D29", "E28:E29", "F28:F29", "G28:I29",
      "G30:I31", "G32:I33", "G34:I35"
    ]
  };
}

function dailyGenerationReportRowClass(row, index) {
  const first = String(row[0] ?? "").trim().toUpperCase();
  const text = row.join(" ").toUpperCase();
  const rowNumber = index + 1;
  if (!text.trim()) return [17, 27].includes(rowNumber) ? "report-separator-row" : "report-gap-row";
  if (rowNumber === 2) return "report-meta-row";
  if ([4, 5, 6, 13, 14, 15, 18, 19, 23, 25].includes(rowNumber)) return "report-section-row";
  if ([7, 8, 28, 29].includes(rowNumber)) return "report-header-row";
  if (first === "TOTAL") return "report-total-row";
  return "";
}

function reportColumnIndex(columnLetters) {
  return String(columnLetters).toUpperCase().split("").reduce((sum, letter) => sum * 26 + letter.charCodeAt(0) - 64, 0) - 1;
}

function reportCellPosition(address) {
  const match = /^([A-Z]+)(\d+)$/i.exec(String(address).trim());
  if (!match) return null;
  return { col: reportColumnIndex(match[1]), row: Number(match[2]) - 1 };
}

function reportMergeInfo(merges = []) {
  const anchors = new Map();
  const covered = new Set();
  merges.forEach(ref => {
    const [startRef, endRef] = String(ref).split(":");
    const start = reportCellPosition(startRef);
    const end = reportCellPosition(endRef);
    if (!start || !end) return;
    const rowspan = end.row - start.row + 1;
    const colspan = end.col - start.col + 1;
    anchors.set(`${start.row}:${start.col}`, { rowspan, colspan });
    for (let row = start.row; row <= end.row; row += 1) {
      for (let col = start.col; col <= end.col; col += 1) {
        if (row !== start.row || col !== start.col) covered.add(`${row}:${col}`);
      }
    }
  });
  return { anchors, covered };
}

function dailyGenerationReportColgroup() {
  return `<colgroup>${[70, 165, 190, 155, 150, 150, 230, 180, 220].map(width => `<col style="width:${width}px">`).join("")}</colgroup>`;
}

function dailyGenerationEditableCells() {
  const cells = new Map([
    ["5:3", { key: "targetDailyKwh", placeholder: "Daily target KWH" }],
    ["5:5", { key: "targetMonthlyKwh", placeholder: "Monthly target KWH" }],
    ["5:7", { key: "targetYearlyKwh", placeholder: "Yearly target KWH" }],
    ["15:5", { key: "line3ExportKwh", placeholder: "Line-III KWH" }],
    ["19:0", { key: "weatherCondition", placeholder: "Weather" }],
    ["23:0", { key: "totalInflow", placeholder: "Inflow" }],
    ["23:8", { key: "spilledWater", placeholder: "Spill" }],
    ["25:8", { key: "silt", placeholder: "Silt" }]
  ]);
  [1, 2, 3].forEach((unit, offset) => {
    cells.set(`${8 + offset}:3`, { key: `plannedOutageU${unit}`, placeholder: "Planned" });
    cells.set(`${8 + offset}:4`, { key: `forcedOutageU${unit}`, placeholder: "Forced" });
    cells.set(`${29 + offset * 2}:5`, { key: `energyLossU${unit}`, placeholder: "MU" });
    cells.set(`${29 + offset * 2}:6`, { key: `reasonU${unit}`, placeholder: "Reason" });
  });
  return cells;
}

function dailyGenerationInputCell(date, cellInfo, value) {
  if (!canEditDailyGenerationReport()) return esc(value).replace(/\n/g, "<br>");
  return `<input class="report-cell-input" data-daily-generation-field="${esc(cellInfo.key)}" data-daily-generation-row="${esc(cellInfo.row)}" data-daily-generation-col="${esc(cellInfo.col)}" placeholder="${esc(cellInfo.placeholder || "")}" value="${esc(value)}">`;
}

function renderDailyGenerationReportSheetRows(rows, date = dailyGenerationDate()) {
  const { anchors, covered } = reportMergeInfo(dailyGenerationReportXlsxOptions().merges);
  const editableCells = dailyGenerationEditableCells();
  const columnCount = Math.max(...rows.map(row => row.length), 9);
  return rows.map((row, index) => {
    const className = dailyGenerationReportRowClass(row, index);
    if (className === "report-gap-row") return `<tr class="${className}"><td colspan="${columnCount}"></td></tr>`;
    if (className === "report-separator-row") return `<tr class="${className}"><td colspan="${columnCount}"></td></tr>`;
    const padded = [...row, ...Array.from({ length: Math.max(0, columnCount - row.length) }, () => "")];
    return `<tr class="${className}">${padded.map((cell, cellIndex) => {
      if (covered.has(`${index}:${cellIndex}`)) return "";
      const isHeaderCell = className || cellIndex === 0;
      const tag = isHeaderCell ? "th" : "td";
      const span = anchors.get(`${index}:${cellIndex}`);
      const spanAttributes = span ? ` colspan="${span.colspan}" rowspan="${span.rowspan}"` : "";
      const cellClass = index === 1 && cellIndex === 6 ? ` class="report-date-cell"` : "";
      const editable = editableCells.get(`${index}:${cellIndex}`);
      const content = editable ? dailyGenerationInputCell(date, { ...editable, row: index, col: cellIndex }, cell) : esc(cell).replace(/\n/g, "<br>");
      return `<${tag}${spanAttributes}${cellClass}>${content}</${tag}>`;
    }).join("")}</tr>`;
  }).join("");
}

function productionXlsxFilename(date = state.productionDate || todayDateValue()) {
  return `Hydro_Hourly_Report_${date || todayDateValue()}.xlsx`;
}

function downloadProductionXlsx() {
  const rows = productionRows();
  const meta = productionMeta();
  const headers = ["Active Power MW", "Reactive Power MVAR", "Voltage kV", "Current A"];
  const sheetBody = productionExportRows(rows, meta).slice(7);
  sheetBody.splice(rows.length, 1);
  const workbookRows = [
    ["", "", "", "", "", "", "", "", "", "", "", "", `Date: ${formatSheetDate(state.productionDate)}`, "", "", "", ""],
    ["TIME Hrs.", "Generator Frequency Hz.", "Bus voltage kV", "UNIT 1", "", "", "", "UNIT 2", "", "", "", "UNIT 3", "", "", "", "Total MW", "Total MVAR"],
    ["", "", "", ...headers, ...headers, ...headers, "", ""],
    ...sheetBody
  ];
  downloadXlsx(productionXlsxFilename(), workbookRows, {
    sheetName: "Hourly Report",
    headerRows: [1, 2, 3],
    summaryRows: [rows.length + 4, rows.length + 5, rows.length + 6],
    merges: ["M1:Q1", "A2:A3", "B2:B3", "C2:C3", "D2:G2", "H2:K2", "L2:O2", "P2:P3", "Q2:Q3"]
  });
}

function downloadShuntReactorXlsx() {
  const rows = shuntReactorRows();
  const labels = ["ACTIVE POWER MW", "REACTIVE POWER MVAR", "VOLTAGE kV", "CURRENT Amp"];
  const dataRows = rows.map(row => [
    row.time === "24:00" ? "24:00:00" : row.time,
    row.freq, row.busKv,
    row.sr1.mw, row.sr1.mvar, row.sr1.kv, row.sr1.current,
    row.sr2.mw, row.sr2.mvar, row.sr2.kv, row.sr2.current
  ]);
  const stat = (label, type) => [label, ...shuntReactorFields.map(field => shuntReactorStat(rows, field, type))];
  const workbookRows = [
    ["", "", "", "", "", "", "", `DATE: ${formatSheetDate(state.shuntReactorDate)}`, "", "", ""],
    ["TIME", "System Frequency Hz", "Bus Voltage kV", "SHUNT REACTOR 1", "", "", "", "SHUNT REACTOR 2", "", "", ""],
    ["", "", "", ...labels, ...labels],
    ...dataRows,
    stat("MAX", "max"),
    stat("MIN", "min")
  ];
  downloadXlsx(`Hydro_Shunt_Reactor_${state.shuntReactorDate || todayDateValue()}.xlsx`, workbookRows, {
    sheetName: "Shunt Reactor",
    headerRows: [1, 2, 3],
    summaryRows: [rows.length + 4, rows.length + 5],
    merges: ["H1:K1", "A2:A3", "B2:B3", "C2:C3", "D2:G2", "H2:K2"]
  });
}

async function api(path, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...(state.authToken ? { Authorization: `Bearer ${state.authToken}` } : {}),
    ...(options.headers || {})
  };
  const response = await fetch(path, {
    ...options,
    headers
  });
  if (!response.ok) {
    const payload = await response.json();
    if (response.status === 401 && path !== "/api/auth/login" && path !== "/api/auth/register") {
      logout();
    }
    throw new Error(payload.error || payload.reason || "Request failed");
  }
  return response.json();
}

function encodeUploadMetadata(metadata) {
  const bytes = new TextEncoder().encode(JSON.stringify(metadata));
  let binary = "";
  bytes.forEach(byte => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

async function uploadAttachmentFile(file, metadata) {
  if (file.size > maxAttachmentSize) throw new Error("File exceeds the 500 MB upload limit");
  const response = await fetch("/api/attachments/stream", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${state.authToken}`,
      "Content-Type": file.type || "application/octet-stream",
      "X-Upload-Metadata": encodeUploadMetadata({ ...metadata, name: file.name, mimeType: file.type })
    },
    body: file
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || "Upload failed");
  return payload;
}

async function load() {
  if (!state.authToken) {
    renderAuth();
    return;
  }
  state.data = await api("/api/bootstrap");
  state.productionSheets = null;
  state.productionMetas = null;
  state.shuntReactorSheets = null;
  state.lineParameterSheets = null;
  state.productionMeterReadings = null;
  state.energyMeterReadings = null;
  state.waterLevelSheets = null;
  state.dailyGenerationReports = null;
  state.currentUserId = state.data.currentUser.id;
  document.getElementById("auth-screen").hidden = true;
  document.getElementById("app-shell").hidden = false;
  render();
  if (state.data.currentUser.mustChangePassword) {
    const passwordDialog = document.getElementById("first-password-dialog");
    if (!passwordDialog.open) passwordDialog.showModal();
  }
}

function can(permission) {
  const permissions = state.data?.currentUser?.permissions || [];
  return permissions.includes("*") || permissions.includes(permission);
}

function canAny(permissions) {
  return permissions.some(permission => can(permission));
}

function currentRoleIs(...roles) {
  return roles.includes(state.data?.currentUser?.role);
}

function canAdminOverride() {
  return can("*") || currentRoleIs("System Administrator");
}

function canControlPlantOperations() {
  return can("plant_operations.control") || currentRoleIs("System Administrator", "Operation Manager");
}

function canEnterProduction() {
  return canControlPlantOperations() || canAny(["production.entry", "production.manage"]) || currentRoleIs("Operator");
}

function canManageProduction() {
  return canControlPlantOperations() || can("production.manage");
}

function canExportProduction() {
  return canControlPlantOperations() || canAny(["production.export", "production.manage"]) || currentRoleIs("Operator");
}

function canExportMaintenanceReport() {
  return can("report.export") || can("work_order.approve") || currentRoleIs("System Administrator", "Maintenance Manager");
}

function canSubmitProduction() {
  return canControlPlantOperations() || canAny(["production.submit", "production.manage"]) || currentRoleIs("Operator");
}

function canCreateLogbook() {
  return canAny(["logbook.create", "logbook.submit"]) || currentRoleIs("Operator");
}

function canCreateOperationsLogbook() {
  return currentRoleIs("Operator", "System Administrator");
}

function canCreateMaintenanceLogbook() {
  return currentRoleIs("Mechanical Engineer", "Electrical Engineer", "I&C Technician", "System Administrator");
}

function canApproveOperations() {
  return canControlPlantOperations() || canAny(["operations.approve", "production.approve"]);
}

function keepSubmittedReportOpenForReview() {
  return canApproveOperations();
}

function canApproveMaintenance() {
  return can("work_order.approve") || currentRoleIs("Maintenance Manager");
}

function isProductionOnlyOperator() {
  return currentRoleIs("Operator");
}

function isPlantOperationsOnlyManager() {
  return currentRoleIs("Operation Manager");
}

function plantOperationViews() {
  return plantOperationModuleOrder;
}

function canManageDataControl() {
  return can("*") || currentRoleIs("System Administrator");
}

function canManageUserManagement() {
  return can("*") || currentRoleIs("System Administrator");
}

function canEditProductionSheet(meta = productionMeta()) {
  return canAdminOverride() || (canEnterProduction() && !meta.approvedAt);
}

function productionSubmission(moduleName, date) {
  return state.data?.productionSubmissions?.[moduleName]?.[date] || null;
}

function canEditSubmittedProductionModule(moduleName, date) {
  return canAdminOverride() || (canEnterProduction() && !productionSubmission(moduleName, date)?.approvedAt);
}

function canEditOutageRecords() {
  return canEnterProduction();
}

function canDeleteOutageRecords() {
  return canAdminOverride() || canManageProduction() || canControlPlantOperations();
}

function submissionStatus(record) {
  if (!record?.submittedAt) return "Draft";
  if (record.approvedAt) return "Approved";
  if (record.rejectedAt) return "Rejected";
  return "Pending";
}

function submissionBadge(record) {
  const status = submissionStatus(record);
  const tone = status === "Approved" ? "green" : status === "Rejected" ? "red" : status === "Pending" ? "amber" : "blue";
  return badge(status, tone);
}

function productionModuleActions({ moduleName, date, submission, submitId, exports = "", extra = "" }) {
  const canSubmit = canSubmitProduction() && (!submission || submission.rejectedAt || (!submission.submittedAt && !submission.approvedAt));
  const pending = submissionStatus(submission) === "Pending";
  return `
    ${exports}
    ${canSubmit ? `<button class="button" id="${esc(submitId)}" type="button">${submission?.rejectedAt ? "Resubmit" : "Submit"}</button>` : ""}
    ${pending ? `<button class="secondary-button" type="button" disabled>Pending</button>` : ""}
    ${extra}
    <span class="operation-status">${submissionBadge(submission)}</span>
  `;
}

function productionExportButtons(prefix) {
  if (!canExportProduction()) return "";
  return `
    <button class="button" id="export-${esc(prefix)}-xlsx" type="button">Download XLSX</button>
    <button class="button light" id="export-${esc(prefix)}-csv" type="button">Download CSV</button>
    <button class="button light" id="export-${esc(prefix)}-pdf" type="button">Download PDF</button>
  `;
}

async function submitProductionModule(moduleName, date) {
  const submission = await api(`/api/production-submissions/${encodeURIComponent(moduleName)}/${encodeURIComponent(date)}`, {
    method: "POST",
    body: JSON.stringify({})
  });
  state.data.productionSubmissions = state.data.productionSubmissions || {};
  state.data.productionSubmissions[moduleName] = state.data.productionSubmissions[moduleName] || {};
  state.data.productionSubmissions[moduleName][date] = submission;
  return submission;
}

async function reviewProductionModule(moduleName, date, action, comment) {
  const review = await api(`/api/production-reviews/${encodeURIComponent(moduleName)}/${encodeURIComponent(date)}`, {
    method: "POST",
    body: JSON.stringify({ action, comment })
  });
  if (moduleName === "hourly") {
    productionMetas()[date] = review;
  } else {
    state.data.productionSubmissions[moduleName][date] = review;
  }
  return review;
}

function productionReviewPanel(moduleName, date, record) {
  if (!record?.submittedAt) return "";
  const status = record.approvedAt ? "Approved" : record.rejectedAt ? "Rejected" : "Pending";
  const tone = status === "Approved" ? "green" : status === "Rejected" ? "red" : "amber";
  const commentId = `review-comment-${moduleName}-${date}`.replace(/[^a-zA-Z0-9_-]/g, "-");
  return `
    <div class="review-panel review-${tone}">
      <div class="toolbar">
        <div>
          ${badge(status, tone)}
          <span class="muted">Submitted by ${esc(record.submittedByName || "Operator")} at ${esc(new Date(record.submittedAt).toLocaleString())}</span>
        </div>
        ${record.approvedByName ? `<span class="muted">Approved by ${esc(record.approvedByName)}</span>` : record.rejectedByName ? `<span class="muted">Rejected by ${esc(record.rejectedByName)}</span>` : ""}
      </div>
      ${record.reviewComment ? `<p class="review-comment"><strong>Manager comment:</strong> ${esc(record.reviewComment)}</p>` : ""}
      ${canApproveOperations() && status === "Pending" ? `
        <label class="review-comment-field">Comment
          <textarea id="${esc(commentId)}" rows="2" placeholder="Enter review comment"></textarea>
        </label>
        <div class="actions-row">
          <button class="button" data-production-review="approve" data-review-module="${esc(moduleName)}" data-review-date="${esc(date)}" data-review-comment="${esc(commentId)}">Approve</button>
          <button class="danger-button" data-production-review="reject" data-review-module="${esc(moduleName)}" data-review-date="${esc(date)}" data-review-comment="${esc(commentId)}">Reject</button>
        </div>
      ` : ""}
      ${canAdminOverride() ? `
        <div class="actions-row">
          <button class="danger-button" data-production-review="revert" data-review-module="${esc(moduleName)}" data-review-date="${esc(date)}" data-review-comment="${esc(commentId)}">Admin Revert to Draft</button>
        </div>
      ` : ""}
    </div>
  `;
}

function filtered(items, fields) {
  const q = state.search.trim().toLowerCase();
  if (!q) return items;
  return items.filter(item => fields.some(field => String(item[field] ?? "").toLowerCase().includes(q)));
}

function enforcePlantOperationMenuOrder() {
  const submenu = document.getElementById("production-submenu");
  if (!submenu) return;
  plantOperationModuleOrder
    .map(view => submenu.querySelector(`[data-view="${CSS.escape(view)}"]`))
    .filter(Boolean)
    .forEach(button => submenu.appendChild(button));
}

function render() {
  enforcePlantOperationMenuOrder();
  if (state.view === "maintenanceTypes") state.view = "pm";
  if (isProductionOnlyOperator() && !["dashboard", ...plantOperationModuleOrder].includes(state.view)) state.view = "productionSummary";
  if (state.view === "data" && !canManageDataControl()) state.view = "dashboard";
  if (state.view === "users" && !canManageUserManagement()) state.view = "dashboard";
  if (isPlantOperationsOnlyManager() && !plantOperationViews().includes(state.view)) state.view = "productionSummary";
  document.querySelectorAll(".view").forEach(view => view.classList.toggle("active", view.id === state.view));
  document.querySelectorAll(".nav-button").forEach(button => {
    if (!button.dataset.view) return;
    const operatorAllowed = ["dashboard", ...plantOperationModuleOrder].includes(button.dataset.view);
    const managerAllowed = plantOperationViews().includes(button.dataset.view);
    button.hidden = (isProductionOnlyOperator() && !operatorAllowed) || (isPlantOperationsOnlyManager() && !managerAllowed) || (button.dataset.view === "data" && !canManageDataControl()) || (button.dataset.view === "users" && !canManageUserManagement());
    button.classList.toggle("active", button.dataset.view === state.view);
  });
  const productionMenuToggle = document.getElementById("production-menu-toggle");
  productionMenuToggle.classList.toggle("active-parent", plantOperationViews().includes(state.view));
  const maintenanceMenuToggle = document.getElementById("maintenance-menu-toggle");
  const hideMaintenance = isProductionOnlyOperator() || isPlantOperationsOnlyManager();
  maintenanceMenuToggle.hidden = hideMaintenance;
  document.getElementById("maintenance-submenu").hidden = hideMaintenance || maintenanceMenuToggle.getAttribute("aria-expanded") !== "true";
  maintenanceMenuToggle.classList.toggle("active-parent", ["assets", "work", "pm", "commissioningReports", "inventory", "maintenanceArchive", "documents", "maintenanceLogbook"].includes(state.view));
  document.getElementById("global-search").hidden = isPlantOperationsOnlyManager();
  document.getElementById("page-title").textContent = titles[state.view];
  renderCurrentUser();

  renderDailyGenerationReport();
  renderProductionSummary();
  renderMonthlyProduction();
  renderOperationWorkbook();
  renderEnergyMeter();
  renderWaterLevel();
  renderProduction();
  renderShuntReactor1();
  renderLineParameter();
  renderLogbook();
  if (isPlantOperationsOnlyManager()) return;

  renderDashboard();
  renderAssets();
  renderWork();
  renderPm();
  renderCommissioningReports();
  renderMaintenanceLogbook();
  renderInventory();
  renderMaintenanceArchive();
  renderDocuments();
  renderDataControl();
  renderReports();
  renderUsers();
}

function renderWaterLevel() {
  const date = waterLevelStorageDate(state.waterLevelDate || todayDateValue());
  const rows = waterLevelRows(date);
  const submission = productionSubmission("water-level", date);
  const editable = canEditSubmittedProductionModule("water-level", date);
  const disabled = editable ? "" : "disabled";
  const monthOptions = waterLevelAvailableMonths();
  const input = (index, field, value) => `<input class="sheet-input" data-water-row="${index}" data-water-field="${field}" type="number" step="any" value="${esc(value)}" ${disabled}>`;
  document.getElementById("waterLevel").innerHTML = `
    ${operationHead("Water Level", productionModuleActions({
      moduleName: "water-level",
      date,
      submission,
      submitId: "submit-water-report",
      exports: productionExportButtons("water")
    }))}
    <div class="date-actions production-summary-date">
      <label class="date-field">Month <input id="water-level-date" type="month" value="${esc(waterLevelMonthKey(date))}"></label>
      <label class="date-field">Saved Months
        <select id="water-level-saved-month">
          ${monthOptions.map(monthDate => `<option value="${esc(monthDate)}" ${monthDate === date ? "selected" : ""}>${esc(waterLevelMonthLabel(monthDate))}${productionSubmission("water-level", monthDate) ? ` - ${esc(submissionStatus(productionSubmission("water-level", monthDate)))}` : ""}</option>`).join("")}
        </select>
      </label>
      <button class="button light" id="water-level-today" type="button">Current Month</button>
      ${canManageProduction() && (!submission?.approvedAt || canAdminOverride()) ? `<button class="secondary-button" id="water-level-clear" type="button">Empty Table</button>` : ""}
    </div>
    ${state.waterLevelNotice ? `<p class="notice-line">${esc(state.waterLevelNotice)}</p>` : ""}
    ${productionReviewPanel("water-level", date, submission)}
    <section class="panel production-panel">
      <div class="sheet-wrap">
        <table class="sheet-table production-excel water-level-table">
          <thead>
            <tr><th colspan="3" class="water-month-title">${esc(waterLevelMonthLabel(date))}</th></tr>
            <tr><th>DATE</th><th>Reservoir WATER LEVEL (m.a.s.l)</th><th>Tail Race Water Level (m.a.s.l)</th></tr>
          </thead>
          <tbody>
            ${rows.map((row, index) => `<tr><th>${esc(row.day)}</th><td>${input(index, "reservoir", row.reservoir)}</td><td>${input(index, "tailrace", row.tailrace)}</td></tr>`).join("")}
          </tbody>
        </table>
      </div>
    </section>
    ${renderWaterLevelChart(rows)}
  `;
}

function renderDailyGenerationReport() {
  const date = dailyGenerationDate();
  const report = dailyGenerationReportData(date);
  const sheetRows = dailyGenerationReportRows(date);
  const submission = productionSubmission("daily-generation", date);
  const exportActions = canExportProduction() ? `
    <button class="button" id="export-daily-generation-xlsx" type="button">Download XLSX</button>
    <button class="button light" id="export-daily-generation-csv" type="button">Download CSV</button>
    <button class="button light" id="export-daily-generation-pdf" type="button">Download PDF</button>
  ` : "";
  document.getElementById("dailyGenerationReport").innerHTML = `
    ${operationHead("Daily Generation Report", productionModuleActions({
      moduleName: "daily-generation",
      date,
      submission,
      submitId: "submit-daily-generation-report",
      exports: exportActions
    }))}
    <div class="date-actions production-summary-date">
      <label class="date-field">Date <input id="daily-generation-date" type="date" value="${esc(date)}"></label>
      <button class="button light" id="daily-generation-today" type="button">Today</button>
      <button class="secondary-button" data-view-jump="production">Open Hourly Report</button>
    </div>
    ${state.dailyGenerationNotice ? `<p class="notice-line">${esc(state.dailyGenerationNotice)}</p>` : ""}
    ${productionReviewPanel("daily-generation", date, submission)}
    ${summaryStrip([
      { label: "Actual KWH", value: formatReportDecimal(report.totalProductionKwh), tone: "green" },
      { label: "Production KWH", value: formatReportDecimal(report.totalProductionKwh) },
      { label: "Auxiliary KWH", value: formatReportDecimal(report.totalAuxiliaryKwh), tone: "amber" },
      { label: "PAF", value: formatReportNumber(report.totalPaf, 1) ? `${formatReportNumber(report.totalPaf, 1)}%` : "-" }
    ])}
    <section class="panel production-panel">
      <div class="sheet-wrap">
        <table class="sheet-table daily-generation-table professional-report-table">
          ${dailyGenerationReportColgroup()}
          <tbody>${renderDailyGenerationReportSheetRows(sheetRows, date)}</tbody>
        </table>
      </div>
      ${productionBars(report.unitRows.map(row => ({ label: row.unitLabel.replace("Unit ", "U"), total: row.mwh })))}
    </section>
  `;
}

function renderEnergyMeter() {
  const date = state.energyMeterDate || todayDateValue();
  const data = energyMeterRows(date);
  const submission = productionSubmission("energy-meter", date);
  const editable = canEditSubmittedProductionModule("energy-meter", date);
  const disabled = editable ? "" : "disabled";
  const input = (section, rowIndex, sourceIndex, field, value) => `<input class="sheet-input" data-energy-section="${section}" data-energy-row="${rowIndex}" data-energy-source="${sourceIndex}" data-energy-field="${field}" type="number" step="any" value="${esc(value)}" ${disabled}>`;
  const sourceCells = (section, row, rowIndex, sourceIndex) => {
    const meter = row.meters[sourceIndex];
    const production = energyMeterProduction(meter);
    return `<td>${input(section, rowIndex, sourceIndex, "initial", meter.initial)}</td><td>${input(section, rowIndex, sourceIndex, "final", meter.final)}</td><td class="energy-production">${production === "" ? "" : esc(displayNumber(production, 1))}</td>`;
  };
  const sectionRows = (section, rows, sourceCount, withTotal = false) => rows.map((row, rowIndex) => `
    <tr class="${row.power === "KVARH" ? "energy-kvarh" : "energy-kwh"}">
      ${row.item === "IMP." ? `<th rowspan="3" class="energy-power">${esc(row.power)}</th>` : ""}
      <th>${esc(row.item)}</th>
      ${Array.from({ length: sourceCount }, (_, sourceIndex) => sourceCells(section, row, rowIndex, sourceIndex)).join("")}
      ${withTotal ? `<td class="energy-total">${energyMeterLineTotal(row) === "" ? "" : esc(displayNumber(energyMeterLineTotal(row), 1))}</td>` : ""}
    </tr>
  `).join("");
  document.getElementById("energyMeter").innerHTML = `
    ${operationHead("Energy Meter", productionModuleActions({
      moduleName: "energy-meter",
      date,
      submission,
      submitId: "submit-energy-report",
      exports: productionExportButtons("energy")
    }))}
    <div class="date-actions production-summary-date">
      <label class="date-field">Date <input id="energy-meter-date" type="date" value="${esc(date)}"></label>
      <button class="button light" id="energy-meter-today" type="button">Today</button>
      ${canManageProduction() && (!submission?.approvedAt || canAdminOverride()) ? `<button class="secondary-button" id="energy-meter-clear" type="button">Empty Table</button>` : ""}
    </div>
    ${state.energyMeterNotice ? `<p class="notice-line">${esc(state.energyMeterNotice)}</p>` : ""}
    ${productionReviewPanel("energy-meter", date, submission)}
    <section class="panel production-panel">
      <div class="sheet-wrap">
        <table class="sheet-table energy-meter-table energy-transformer-table">
          <thead>
            <tr><th colspan="8"></th><th colspan="3" class="energy-date">DATE ${esc(formatSheetDate(date))} E.C</th></tr>
            <tr><th>POWER</th><th>ITEM</th><th colspan="3" class="transformer-one">TRANSFORMER #1</th><th colspan="3" class="transformer-two">TRANSFORMER #2</th><th colspan="3">TRANSFORMER #3</th></tr>
            <tr><th></th><th></th>${[1, 2, 3].map((_, index) => `<th class="${index < 2 ? "energy-red" : ""}">INITIAL READING</th><th class="${index < 2 ? "energy-red" : ""}">FINAL READING</th><th class="${index < 2 ? "energy-red" : ""}">PRODUCTION ${index + 1}</th>`).join("")}</tr>
          </thead>
          <tbody>${sectionRows("transformers", data.transformers, 3)}</tbody>
        </table>
      </div>
      <div class="sheet-wrap energy-line-wrap">
        <table class="sheet-table energy-meter-table energy-line-table">
          <thead>
            <tr><th>POWER</th><th>ITEM</th><th colspan="3">LINE #1</th><th colspan="3">LINE #2</th><th rowspan="2">TOTAL</th></tr>
            <tr><th></th><th></th><th>INITIAL READING AT 00:00 HRS (preceding)</th><th>FINAL READING AT 24:00 HRS (present)</th><th>PRODUCTION 1</th><th>INITIAL READING AT 00:00 HRS</th><th>FINAL READING AT 24:00 HRS</th><th>PRODUCTION 2</th></tr>
          </thead>
          <tbody>${sectionRows("lines", data.lines, 2, true)}</tbody>
        </table>
      </div>
    </section>
  `;
}

function renderProductionSummary() {
  const rows = productionRows();
  const meta = productionMeta();
  const totals = productionTotals(rows);
  const energy = productionEnergyForRows(rows, meta);
  const units = energy.units.map((value, index) => ({ label: `Unit ${index + 1}`, total: Number(value || 0) }));
  const meterRows = productionMeterRows();
  const meterSubmission = productionSubmission("meter", state.productionDate || todayDateValue());
  const editable = canEditSubmittedProductionModule("meter", state.productionDate || todayDateValue());
  const disabled = editable ? "" : "disabled";
  const meterInput = (rowIndex, unitIndex, field, value) => `<input class="sheet-input" data-meter-row="${rowIndex}" data-meter-unit="${unitIndex}" data-meter-field="${field}" type="number" step="any" value="${esc(value)}" ${disabled}>`;
  const unitCells = (row, rowIndex, unitIndex) => {
    const unit = row.units[unitIndex];
    const difference = productionMeterDifference(unit);
    return `
      <td>${meterInput(rowIndex, unitIndex, "initial", unit.initial)}</td>
      <td>${meterInput(rowIndex, unitIndex, "final", unit.final)}</td>
      <td class="meter-difference">${difference === "" ? "" : esc(displayNumber(difference, 1))}</td>
    `;
  };
  document.getElementById("productionSummary").innerHTML = `
    ${operationHead("Daily Production", productionModuleActions({
      moduleName: "meter",
      date: state.productionDate || todayDateValue(),
      submission: meterSubmission,
      submitId: "submit-meter-report",
      exports: productionExportButtons("meter"),
      extra: `<button class="secondary-button" data-view-jump="production">Open Hourly Report</button>`
    }))}
    <div class="date-actions production-summary-date">
      <label class="date-field">Date <input id="production-summary-date" type="date" value="${esc(state.productionDate || todayDateValue())}"></label>
      <button class="button light" id="production-summary-today" type="button">Today</button>
      ${canManageProduction() && (!meterSubmission?.approvedAt || canAdminOverride()) ? `<button class="secondary-button" id="production-meter-clear" type="button">Empty Table</button>` : ""}
    </div>
    ${state.productionMeterNotice ? `<p class="notice-line">${esc(state.productionMeterNotice)}</p>` : ""}
    ${productionReviewPanel("meter", state.productionDate || todayDateValue(), meterSubmission)}
    <section class="panel production-panel">
      <div class="sheet-wrap">
        <table class="sheet-table production-meter-table">
          <thead>
            <tr>
              <th></th>
              <th colspan="3" class="meter-date">DATE: ${esc(formatSheetDate(state.productionDate))}</th>
              <th colspan="7" class="meter-title">PRODUCTION AND AUXILIARY METER READING</th>
            </tr>
            <tr>
              <th></th>
              <th colspan="3" class="meter-unit">Unit #1</th>
              <th colspan="3" class="meter-unit">Unit #2</th>
              <th colspan="3" class="meter-unit">Unit #3</th>
              <th rowspan="2" class="meter-total-head">TOTAL KWH/<br>KVARH (1+2+3)</th>
            </tr>
            <tr>
              <th></th>
              ${[1, 2, 3].map(() => `<th>Initial reading at 00:00 Hrs<br>(preceding)</th><th>Final Reading at 24 Hrs</th><th class="meter-diff-head">Difference</th>`).join("")}
            </tr>
          </thead>
          <tbody>
            ${meterRows.map((row, rowIndex) => `
              <tr class="meter-row-${esc(row.key)}">
                <th>${esc(row.label)}</th>
                ${unitCells(row, rowIndex, 0)}
                ${unitCells(row, rowIndex, 1)}
                ${unitCells(row, rowIndex, 2)}
                <td class="meter-total">${productionMeterTotal(row) === "" ? "" : esc(displayNumber(productionMeterTotal(row), 1))}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    </section>
    <section class="panel production-panel">
      <div class="toolbar">
        <h2>Unit Production</h2>
        <span class="status-pill">${esc(formatSheetDate(state.productionDate))}</span>
      </div>
      ${productionBars(units)}
    </section>
  `;
}

function monthlyProductionRows(month = state.monthlyProductionMonth || todayDateValue().slice(0, 7)) {
  state.monthlyProductionMonth = month;
  const sheets = productionSheets();
  const metas = productionMetas();
  const meterReadings = productionMeterReadings();
  const [year, monthNumber] = month.split("-").map(Number);
  const daysInMonth = new Date(year, monthNumber, 0).getDate();
  const waterRows = waterLevelRowsForReport(`${month}-01`);
  const previousMonthWaterRows = waterLevelRowsForReport(previousDateValue(`${month}-01`));
  const previousMonthLastWater = previousMonthWaterRows[previousMonthWaterRows.length - 1] || {};
  return Array.from({ length: daysInMonth }, (_, dayIndex) => {
    const day = dayIndex + 1;
    const date = `${month}-${String(day).padStart(2, "0")}`;
    const storedMeter = meterReadings[date];
    const meterRows = Array.isArray(storedMeter) ? storedMeter : storedMeter?.rows;
    const productionRow = meterRows?.find(row => row.key === "productionKwh");
    const auxiliaryRow = meterRows?.find(row => row.key === "auxKwh");
    const hourlyEnergy = productionEnergyForRows(sheets[date] || [], metas[date] || {});
    const hasHourlyData = (sheets[date] || []).some(row =>
      ["u1", "u2", "u3"].some(unit => row?.[unit]?.mw !== "" && row?.[unit]?.mw !== undefined)
    );
    const production = [0, 1, 2].map(unitIndex => {
      const meterValue = productionRow ? productionMeterDifference(productionRow.units?.[unitIndex]) : "";
      if (meterValue !== "") return Number(meterValue);
      return hasHourlyData ? Number(hourlyEnergy.units[unitIndex] || 0) * 1000 : null;
    });
    const auxiliary = [0, 1, 2].map(unitIndex => {
      const value = auxiliaryRow ? productionMeterDifference(auxiliaryRow.units?.[unitIndex]) : "";
      return value === "" ? null : Number(value);
    });
    const sumAvailable = values => values.some(value => value !== null)
      ? values.reduce((sum, value) => sum + Number(value || 0), 0)
      : null;
    const serviceHours = [0, 1, 2].map(unitIndex => (metas[date] || {}).service?.[unitIndex] || "");
    const serviceHour = sumDurationValues(serviceHours);
    const totalProduction = sumAvailable(production);
    const waterRow = waterRows[dayIndex] || {};
    const previousWaterRow = dayIndex > 0 ? waterRows[dayIndex - 1] || {} : previousMonthLastWater;
    const reservoirPresent = numericReportValue(waterRow.reservoir);
    const reservoirPrevious = numericReportValue(previousWaterRow.reservoir);
    const availability = [0, 1, 2].map(unitIndex => {
      const serviceHours = hoursFromDuration((metas[date] || {}).service?.[unitIndex]);
      const constraintHours = systemPowerConstraintHoursForUnitDate(date, unitIndex);
      if (serviceHours === null && constraintHours === null) return null;
      return ((Number(serviceHours || 0) + Number(constraintHours || 0)) * 100) / 24;
    });
    return {
      day,
      date,
      production,
      auxiliary,
      serviceHours,
      totalProduction,
      totalAuxiliary: sumAvailable(auxiliary),
      serviceHour,
      reservoirPresent,
      reservoirPrevious,
      availability,
      totalAvailability: availability.some(value => value !== null)
        ? availability.reduce((sum, value) => sum + Number(value || 0), 0)
        : null,
      waterUtilized: totalProduction === null ? null : totalProduction * 1.66,
      waterSpillage: reservoirPresent !== null && reservoirPrevious !== null ? reservoirPresent - reservoirPrevious : null
    };
  });
}

function monthlyProductionTotals(rows) {
  const sumField = (group, unitIndex) => rows.reduce((sum, row) => sum + Number(row[group][unitIndex] || 0), 0);
  const sumNumericField = (selector) => {
    const values = rows.map(selector).filter(value => value !== null && value !== undefined && value !== "" && Number.isFinite(Number(value))).map(Number);
    return values.length ? values.reduce((sum, value) => sum + value, 0) : null;
  };
  return {
    production: [0, 1, 2].map(unitIndex => sumField("production", unitIndex)),
    auxiliary: [0, 1, 2].map(unitIndex => sumField("auxiliary", unitIndex)),
    serviceHours: [0, 1, 2].map(unitIndex => sumDurationValues(rows.map(row => row.serviceHours?.[unitIndex]))),
    totalProduction: rows.reduce((sum, row) => sum + Number(row.totalProduction || 0), 0),
    totalAuxiliary: rows.reduce((sum, row) => sum + Number(row.totalAuxiliary || 0), 0),
    serviceHour: sumDurationValues(rows.map(row => row.serviceHour)),
    availability: [0, 1, 2].map(unitIndex => sumNumericField(row => row.availability?.[unitIndex])),
    totalAvailability: sumNumericField(row => row.totalAvailability),
    waterUtilized: rows.reduce((sum, row) => sum + Number(row.waterUtilized || 0), 0),
    waterSpillage: rows.reduce((sum, row) => sum + Number(row.waterSpillage || 0), 0)
  };
}

function monthlyProductionCell(value, decimals = 1) {
  return value === null || value === undefined || value === "" ? "" : Number(value).toFixed(decimals);
}

function monthlyProductionMonthLabel(month = state.monthlyProductionMonth || todayDateValue().slice(0, 7)) {
  const [year, monthNumber] = month.split("-").map(Number);
  return new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" }).format(new Date(year, monthNumber - 1, 1));
}

function monthlyProductionExportRows(rows = monthlyProductionRows()) {
  const totals = monthlyProductionTotals(rows);
  return [
    [`MONTH: ${monthlyProductionMonthLabel().toUpperCase()}`],
    ["Day", "Unit #1", "", "", "Unit #2", "", "", "Unit #3", "", "", "Total (1+2+3)", "", ""],
    ["", "Production (KWH)", "Auxiliary (KWH)", "Service Hour", "Production (KWH)", "Auxiliary (KWH)", "Service Hour", "Production (KWH)", "Auxiliary (KWH)", "Service Hour", "Production (KWH)", "Auxiliary (KWH)", "Service Hour"],
    ...rows.map(row => [
      row.day,
      monthlyProductionCell(row.production[0]), monthlyProductionCell(row.auxiliary[0]), row.serviceHours?.[0] || "",
      monthlyProductionCell(row.production[1]), monthlyProductionCell(row.auxiliary[1]), row.serviceHours?.[1] || "",
      monthlyProductionCell(row.production[2]), monthlyProductionCell(row.auxiliary[2]), row.serviceHours?.[2] || "",
      monthlyProductionCell(row.totalProduction), monthlyProductionCell(row.totalAuxiliary),
      row.serviceHour
    ]),
    [
      "TOTAL",
      totals.production[0].toFixed(1), totals.auxiliary[0].toFixed(1), totals.serviceHours?.[0] || "",
      totals.production[1].toFixed(1), totals.auxiliary[1].toFixed(1), totals.serviceHours?.[1] || "",
      totals.production[2].toFixed(1), totals.auxiliary[2].toFixed(1), totals.serviceHours?.[2] || "",
      totals.totalProduction.toFixed(1), totals.totalAuxiliary.toFixed(1),
      totals.serviceHour
    ]
  ];
}

const generationMonthlySheets = [
  { id: "summary", label: "Generation Summary" },
  { id: "waterUtilized", label: "Water Utilized (CCM)" },
  { id: "availability", label: "Units' Daily Availability (%)" },
  { id: "dashboard", label: "Dashboard" },
  { id: "outage", label: "Outage Management" },
  { id: "backdown", label: "Backdown Report" }
];

function generationMonthlySheetTabs(active = state.generationMonthlySheet || "summary") {
  return `
    <div class="sheet-tabs" role="tablist" aria-label="Generation monthly report sheets">
      ${generationMonthlySheets.map(sheet => `
        <button class="sheet-tab ${active === sheet.id ? "active" : ""}" type="button" data-generation-monthly-sheet="${esc(sheet.id)}" role="tab" aria-selected="${active === sheet.id ? "true" : "false"}">
          ${esc(sheet.label)}
        </button>
      `).join("")}
    </div>
  `;
}

function renderGenerationSummarySheet(month, rows, totals) {
  return `
    ${summaryStrip([
      { label: "Unit 1 Production", value: `${totals.production[0].toFixed(1)} KWH`, tone: "green" },
      { label: "Unit 2 Production", value: `${totals.production[1].toFixed(1)} KWH` },
      { label: "Unit 3 Production", value: `${totals.production[2].toFixed(1)} KWH` },
      { label: "Total Production", value: `${totals.totalProduction.toFixed(1)} KWH`, tone: "green" },
      { label: "Total Auxiliary", value: `${totals.totalAuxiliary.toFixed(1)} KWH`, tone: "amber" }
    ])}
    <section class="panel production-panel monthly-production-report">
      <div class="sheet-wrap">
        <table class="sheet-table monthly-production-table generation-summary-table">
          <thead>
            <tr class="monthly-title-row"><th colspan="13">${esc(monthlyProductionMonthLabel(month))}</th></tr>
            <tr>
              <th rowspan="2">Day</th>
              <th colspan="3">Unit #1</th>
              <th colspan="3">Unit #2</th>
              <th colspan="3">Unit #3</th>
              <th colspan="3">Total (1+2+3)</th>
            </tr>
            <tr class="monthly-subhead-row">
              ${Array.from({ length: 4 }, () => `<th>Production (KWH)</th><th>Auxiliary (KWH)</th><th>Service Hour</th>`).join("")}
            </tr>
          </thead>
          <tbody>
            ${rows.map(row => `
              <tr>
                <th>${row.day}</th>
                <td>${monthlyProductionCell(row.production[0])}</td><td>${monthlyProductionCell(row.auxiliary[0])}</td><td>${esc(row.serviceHours?.[0] || "")}</td>
                <td>${monthlyProductionCell(row.production[1])}</td><td>${monthlyProductionCell(row.auxiliary[1])}</td><td>${esc(row.serviceHours?.[1] || "")}</td>
                <td>${monthlyProductionCell(row.production[2])}</td><td>${monthlyProductionCell(row.auxiliary[2])}</td><td>${esc(row.serviceHours?.[2] || "")}</td>
                <td class="monthly-total-cell">${monthlyProductionCell(row.totalProduction)}</td>
                <td class="monthly-total-cell">${monthlyProductionCell(row.totalAuxiliary)}</td>
                <td>${esc(row.serviceHour)}</td>
              </tr>
            `).join("")}
            <tr class="excel-summary">
              <th>TOTAL</th>
              <td>${totals.production[0].toFixed(1)}</td><td>${totals.auxiliary[0].toFixed(1)}</td><td>${esc(totals.serviceHours?.[0] || "")}</td>
              <td>${totals.production[1].toFixed(1)}</td><td>${totals.auxiliary[1].toFixed(1)}</td><td>${esc(totals.serviceHours?.[1] || "")}</td>
              <td>${totals.production[2].toFixed(1)}</td><td>${totals.auxiliary[2].toFixed(1)}</td><td>${esc(totals.serviceHours?.[2] || "")}</td>
              <td>${totals.totalProduction.toFixed(1)}</td><td>${totals.totalAuxiliary.toFixed(1)}</td>
              <td>${esc(totals.serviceHour)}</td>
            </tr>
          </tbody>
        </table>
      </div>
      ${productionBars(rows.map(row => ({ label: String(row.day), total: Number(row.totalProduction || 0) })))}
    </section>
  `;
}

function renderGenerationMonthlyDashboard(rows, totals) {
  const highest = rows.reduce((best, row) => Number(row.totalProduction || 0) > Number(best.totalProduction || 0) ? row : best, rows[0] || {});
  const activeDays = rows.filter(row => Number(row.totalProduction || 0) > 0).length;
  return `
    ${summaryStrip([
      { label: "Generated Days", value: String(activeDays), tone: "green" },
      { label: "Best Day", value: highest.day ? `Day ${highest.day}` : "-", note: `${monthlyProductionCell(highest.totalProduction)} KWH` },
      { label: "Monthly Total", value: `${totals.totalProduction.toFixed(1)} KWH`, tone: "green" },
      { label: "Auxiliary Total", value: `${totals.totalAuxiliary.toFixed(1)} KWH`, tone: "amber" }
    ])}
    <section class="panel production-panel">
      <div class="toolbar"><h2>Daily Generation Chart</h2></div>
      ${productionBars(rows.map(row => ({ label: String(row.day), total: Number(row.totalProduction || 0) })))}
    </section>
  `;
}

function renderGenerationMonthlyWaterUtilized(month, rows, totals) {
  const activeRows = rows.filter(row => Number(row.waterUtilized || 0) > 0);
  const highest = rows.reduce((best, row) => Number(row.waterUtilized || 0) > Number(best.waterUtilized || 0) ? row : best, rows[0] || {});
  const average = activeRows.length ? totals.waterUtilized / activeRows.length : 0;
  return `
    ${summaryStrip([
      { label: "Total Water Utilized", value: `${monthlyProductionCell(totals.waterUtilized, 3)} CCM`, tone: "green" },
      { label: "Total Spillage", value: `${monthlyProductionCell(totals.waterSpillage, 3)} m`, tone: "amber" },
      { label: "Average Daily", value: `${monthlyProductionCell(average, 3)} CCM` },
      { label: "Highest Day", value: highest.day ? `Day ${highest.day}` : "-", note: `${monthlyProductionCell(highest.waterUtilized, 3)} CCM` }
    ])}
    <section class="panel production-panel monthly-production-report">
      <div class="sheet-wrap">
        <table class="sheet-table monthly-production-table monthly-sub-sheet-table">
          <thead>
            <tr class="monthly-title-row"><th colspan="5">WATER UTILIZED (CCM) - ${esc(monthlyProductionMonthLabel(month))}</th></tr>
            <tr>
              <th rowspan="2">Day</th>
              <th colspan="2">RESERVOIR LEVEL<br>M</th>
              <th rowspan="2">WATER UTILIZED (CCM)</th>
              <th rowspan="2">WATER SPILLAGE (METER)</th>
            </tr>
            <tr class="monthly-subhead-row">
              <th>(Present)</th>
              <th>(Previous)</th>
            </tr>
          </thead>
          <tbody>
            ${rows.map(row => `
              <tr>
                <th>${row.day}</th>
                <td>${monthlyProductionCell(row.reservoirPresent, 3)}</td>
                <td>${monthlyProductionCell(row.reservoirPrevious, 3)}</td>
                <td class="monthly-total-cell">${monthlyProductionCell(row.waterUtilized, 3)}</td>
                <td>${monthlyProductionCell(row.waterSpillage, 3)}</td>
              </tr>
            `).join("")}
            <tr class="excel-summary">
              <th>TOTAL</th>
              <td></td>
              <td></td>
              <td>${totals.waterUtilized.toFixed(3)}</td>
              <td>${totals.waterSpillage.toFixed(3)}</td>
            </tr>
          </tbody>
        </table>
      </div>
      ${productionBars(rows.map(row => ({ label: String(row.day), total: Number(row.waterUtilized || 0) })))}
    </section>
  `;
}

function renderGenerationMonthlyAvailability(month, rows, totals) {
  return `
    ${summaryStrip([
      { label: "U1 Total", value: `${monthlyProductionCell(totals.availability?.[0], 2)} %`, tone: "green" },
      { label: "U2 Total", value: `${monthlyProductionCell(totals.availability?.[1], 2)} %` },
      { label: "U3 Total", value: `${monthlyProductionCell(totals.availability?.[2], 2)} %` },
      { label: "Plant Total", value: `${monthlyProductionCell(totals.totalAvailability, 2)} %`, tone: "green" }
    ])}
    <section class="panel production-panel monthly-production-report">
      <div class="sheet-wrap">
        <table class="sheet-table monthly-production-table monthly-sub-sheet-table">
          <thead>
            <tr class="monthly-title-row"><th colspan="5">UNITS' DAILY AVAILABILITY (%) - ${esc(monthlyProductionMonthLabel(month))}</th></tr>
            <tr>
              <th>Day</th>
              <th>U1</th>
              <th>U2</th>
              <th>U3</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            ${rows.map(row => `
              <tr>
                <th>${row.day}</th>
                <td>${monthlyProductionCell(row.availability?.[0], 2)}</td>
                <td>${monthlyProductionCell(row.availability?.[1], 2)}</td>
                <td>${monthlyProductionCell(row.availability?.[2], 2)}</td>
                <td class="monthly-total-cell">${monthlyProductionCell(row.totalAvailability, 2)}</td>
              </tr>
            `).join("")}
            <tr class="excel-summary">
              <th>TOTAL</th>
              <td>${monthlyProductionCell(totals.availability?.[0], 2)}</td>
              <td>${monthlyProductionCell(totals.availability?.[1], 2)}</td>
              <td>${monthlyProductionCell(totals.availability?.[2], 2)}</td>
              <td>${monthlyProductionCell(totals.totalAvailability, 2)}</td>
            </tr>
          </tbody>
        </table>
      </div>
      ${productionBars(rows.map(row => ({ label: String(row.day), total: Number(row.totalAvailability || 0) })))}
    </section>
  `;
}

const outageCategories = [
  "System Power Constraint",
  "Forced Outage - Internal",
  "Forced Outage - External",
  "Emergency Outage",
  "Miscellaneous Outage"
];
const outageLossKwhPerHour = 85000;

function outageRecords() {
  return Array.isArray(state.data?.outageRecords) ? state.data.outageRecords : [];
}

function outageFilterValue(name, fallback = "") {
  const filters = state.outageFilters || {};
  return Object.prototype.hasOwnProperty.call(filters, name) ? filters[name] : fallback;
}

function outageNumber(value, decimals = 2) {
  const number = Number(value || 0);
  return number.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function outageDurationHoursFromValues(from, to) {
  const range = normalizedOutageDateRange(from, to);
  if (!range) return null;
  const duration = (range.end - range.start) / 3600000;
  return Number.isFinite(duration) && duration > 0 ? Number(duration.toFixed(2)) : null;
}

function outageEnergyLossFromValues(from, to) {
  const duration = outageDurationHoursFromValues(from, to);
  return duration === null ? "" : Number((duration * outageLossKwhPerHour).toFixed(2));
}

function updateOutageEnergyPreview() {
  const from = outageDateTimeFromParts("outage-from-date", "outage-from-time");
  const to = outageDateTimeFromParts("outage-to-date", "outage-to-time");
  const energyInput = document.getElementById("outage-energy");
  const durationPreview = document.getElementById("outage-duration-preview");
  if (!energyInput) return;
  const duration = outageDurationHoursFromValues(from, to);
  const energy = outageEnergyLossFromValues(from, to);
  const range = normalizedOutageDateRange(from, to);
  energyInput.value = energy === "" ? "" : energy.toFixed(2);
  if (durationPreview) {
    const nextDay = range && String(from || "").slice(0, 10) !== formatOutageDateInput(range.end).slice(0, 10);
    durationPreview.textContent = duration === null
      ? "Duration: -"
      : `Duration: ${duration.toFixed(2)} h${nextDay ? " (next day)" : ""}`;
  }
}

function outageApiErrorMessage(error) {
  if (/API route not found|not found/i.test(error?.message || "")) {
    return "Outage Management needs a local server restart. Close the old server window, run restart-local.cmd, then refresh with Ctrl + F5.";
  }
  return error?.message || "Request failed";
}

function outageDateTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = number => String(number).padStart(2, "0");
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function outageDatePart(value, fallback = todayDateValue()) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value || fallback).slice(0, 10);
  const pad = number => String(number).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function outageTimePart(value, fallback = "00:00") {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value || fallback).slice(11, 16) || fallback;
  const pad = number => String(number).padStart(2, "0");
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function isValidOutageTime(value) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(String(value || ""));
}

function outageDateTimeFromParts(dateId, timeId) {
  const date = document.getElementById(dateId)?.value || "";
  const time = document.getElementById(timeId)?.value || "";
  return date && isValidOutageTime(time) ? `${date}T${time}` : "";
}

function formatOutageDateInput(date) {
  const pad = number => String(number).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function normalizedOutageDateRange(from, to) {
  const start = new Date(from);
  const end = new Date(to);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
  const normalizedEnd = new Date(end);
  if (String(from || "").slice(0, 10) === String(to || "").slice(0, 10) && normalizedEnd <= start) {
    normalizedEnd.setDate(normalizedEnd.getDate() + 1);
  }
  return { start, end: normalizedEnd };
}

function filteredOutageRecords(month) {
  const filterMonth = outageFilterValue("month", month);
  const filterUnit = outageFilterValue("unit", "All");
  const filterCategory = outageFilterValue("category", "All");
  const search = outageFilterValue("search", "").trim().toLowerCase();
  return outageRecords()
    .filter(record => {
      const monthOk = !filterMonth || String(record.from || "").slice(0, 7) === filterMonth;
      const unitOk = filterUnit === "All" || record.unit === filterUnit;
      const categoryOk = filterCategory === "All" || record.category === filterCategory;
      const target = `${record.unit || ""} ${record.category || ""} ${record.reason || ""} ${record.createdByName || ""}`.toLowerCase();
      return monthOk && unitOk && categoryOk && (!search || target.includes(search));
    })
    .sort((left, right) => new Date(left.from) - new Date(right.from));
}

function outageSummary(records) {
  return ["Unit 1", "Unit 2", "Unit 3"].map(unit => {
    const unitRows = records.filter(record => record.unit === unit);
    const hours = predicate => unitRows
      .filter(predicate)
      .reduce((sum, record) => sum + Number(record.durationHours || 0), 0);
    return {
      unit,
      outages: unitRows.length,
      constraint: hours(record => record.category === "System Power Constraint"),
      emergency: hours(record => record.category === "Emergency Outage"),
      forced: hours(record => String(record.category || "").startsWith("Forced Outage")),
      totalHours: hours(() => true),
      energyMwh: unitRows.reduce((sum, record) => sum + Number(record.energyLossKwh || 0), 0) / 1000
    };
  });
}

function outageStatus(item) {
  if (item.totalHours === 0) return ["No Outage", "green"];
  if (item.totalHours < 4) return ["Monitor", "amber"];
  return ["Outage Recorded", "red"];
}

function outageExportRows(records = filteredOutageRecords(state.monthlyProductionMonth || todayDateValue().slice(0, 7))) {
  return [
    ["No", "Unit", "Category", "From", "To", "Duration Hours", "Energy Loss kWh", "Energy Loss MWh", "Reason", "Recorded By"],
    ...records.map((record, index) => [
      index + 1,
      record.unit || "",
      record.category || "",
      record.from || "",
      record.to || "",
      outageNumber(record.durationHours),
      outageNumber(record.energyLossKwh, 0),
      outageNumber(Number(record.energyLossKwh || 0) / 1000, 3),
      record.reason || "",
      record.createdByName || ""
    ])
  ];
}

function renderGenerationMonthlyOutage(month) {
  const filterMonth = outageFilterValue("month", month);
  const filterUnit = outageFilterValue("unit", "All");
  const filterCategory = outageFilterValue("category", "All");
  const filterSearch = outageFilterValue("search", "");
  const records = filteredOutageRecords(month);
  const summary = outageSummary(records);
  const totalOutages = summary.reduce((sum, item) => sum + item.outages, 0);
  const totalHours = summary.reduce((sum, item) => sum + item.totalHours, 0);
  const totalEnergy = summary.reduce((sum, item) => sum + item.energyMwh, 0);
  const affected = summary.slice().sort((left, right) => right.totalHours - left.totalHours)[0];
  const canEditOutage = canEditOutageRecords();
  const canDeleteOutage = canDeleteOutageRecords();
  const note = totalHours
    ? `${affected.unit} has the highest outage time with ${outageNumber(affected.totalHours)} hours and ${outageNumber(affected.energyMwh, 3)} MWh estimated loss.`
    : "No outage was recorded for the selected filters.";

  return `
    ${summaryStrip([
      { label: "Total Outages", value: String(totalOutages), tone: totalOutages ? "amber" : "green" },
      { label: "Outage Time", value: `${outageNumber(totalHours)} h`, tone: totalHours ? "amber" : "green" },
      { label: "Energy Loss", value: `${outageNumber(totalEnergy, 3)} MWh`, tone: totalEnergy ? "amber" : "green" },
      { label: "Most Affected", value: affected && affected.totalHours > 0 ? affected.unit : "No outage" }
    ])}
    <section class="panel production-panel outage-management-panel">
      <div class="toolbar outage-toolbar">
        <div>
          <h2>Outage Management</h2>
        </div>
        <div class="actions-row">
          <button class="button light" id="export-outage-csv" type="button">Download CSV</button>
          <button class="button light" id="export-outage-json" type="button">Download JSON</button>
          <button class="button light" id="print-outage-report" type="button">Download PDF</button>
          ${canEditOutage ? `<button class="button" id="new-outage-record" type="button">Add Outage</button>` : ""}
        </div>
      </div>
      ${state.outageNotice ? `<p class="muted">${esc(state.outageNotice)}</p>` : ""}
      <div class="outage-filter-grid">
        <label>Month <input data-outage-filter="month" type="month" value="${esc(filterMonth)}"></label>
        <label>Unit
          <select data-outage-filter="unit">
            ${["All", "Unit 1", "Unit 2", "Unit 3"].map(unit => `<option value="${esc(unit)}" ${filterUnit === unit ? "selected" : ""}>${esc(unit)}</option>`).join("")}
          </select>
        </label>
        <label>Category
          <select data-outage-filter="category">
            ${["All", ...outageCategories].map(category => `<option value="${esc(category)}" ${filterCategory === category ? "selected" : ""}>${esc(category)}</option>`).join("")}
          </select>
        </label>
        <label>Search <input data-outage-filter="search" type="search" value="${esc(filterSearch)}" placeholder="Reason, unit, operator"></label>
        <button class="secondary-button" id="clear-outage-filters" type="button">Clear</button>
      </div>
      <div class="outage-chart-grid">
        <div class="outage-chart-card">
          <h3>Outage Hours by Unit</h3>
          ${productionBars(summary.map(item => ({ label: item.unit.replace("Unit ", "U"), total: item.totalHours })))}
        </div>
        <div class="outage-chart-card">
          <h3>Energy Loss by Unit</h3>
          ${productionBars(summary.map(item => ({ label: item.unit.replace("Unit ", "U"), total: item.energyMwh })))}
        </div>
      </div>
      <div class="sheet-wrap">
        <table class="sheet-table outage-summary-table">
          <thead>
            <tr>
              <th>Unit</th>
              <th>Outages</th>
              <th>Constraint (h)</th>
              <th>Emergency (h)</th>
              <th>Forced (h)</th>
              <th>Total (h)</th>
              <th>Energy (MWh)</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${summary.map(item => {
              const [status, tone] = outageStatus(item);
              return `
                <tr>
                  <th>${esc(item.unit)}</th>
                  <td>${item.outages}</td>
                  <td>${outageNumber(item.constraint)}</td>
                  <td>${outageNumber(item.emergency)}</td>
                  <td>${outageNumber(item.forced)}</td>
                  <td><strong>${outageNumber(item.totalHours)}</strong></td>
                  <td>${outageNumber(item.energyMwh, 3)}</td>
                  <td>${badge(status, tone)}</td>
                </tr>
              `;
            }).join("")}
          </tbody>
        </table>
      </div>
      <div class="toolbar outage-register-head">
        <h2>Outage Register</h2>
        <span class="status-pill">${records.length} record${records.length === 1 ? "" : "s"}</span>
      </div>
      <div class="sheet-wrap outage-register-wrap">
        <table class="sheet-table outage-register-table">
          <thead>
            <tr>
              <th>No.</th>
              <th>Unit</th>
              <th>Category</th>
              <th>From</th>
              <th>To</th>
              <th>Duration (h)</th>
              <th>Energy (kWh)</th>
              <th>Reason</th>
              <th>Recorded By</th>
              ${(canEditOutage || canDeleteOutage) ? `<th>Actions</th>` : ""}
            </tr>
          </thead>
          <tbody>
            ${records.length ? records.map((record, index) => `
              <tr>
                <td>${index + 1}</td>
                <td><strong>${esc(record.unit)}</strong></td>
                <td>${esc(record.category)}</td>
                <td>${esc(outageDateTime(record.from))}</td>
                <td>${esc(outageDateTime(record.to))}</td>
                <td>${outageNumber(record.durationHours)}</td>
                <td>${outageNumber(record.energyLossKwh, 0)}</td>
                <td>${esc(record.reason)}</td>
                <td>${esc(record.createdByName || record.updatedByName || "")}</td>
                ${(canEditOutage || canDeleteOutage) ? `
                  <td>
                    <div class="archive-file-actions">
                      ${canEditOutage ? `<button class="secondary-button" data-edit-outage="${esc(record.id)}" type="button">Edit</button>` : ""}
                      ${canDeleteOutage ? `<button class="danger-button" data-delete-outage="${esc(record.id)}" type="button">Delete</button>` : ""}
                    </div>
                  </td>
                ` : ""}
              </tr>
            `).join("") : `
              <tr><td colspan="${(canEditOutage || canDeleteOutage) ? 10 : 9}" class="muted">No outage records match the selected filters.</td></tr>
            `}
          </tbody>
        </table>
      </div>
      <section class="outage-note">
        <h3>Management Note</h3>
        <p>${esc(note)}</p>
      </section>
    </section>
  `;
}

function openOutageRecordModal(record = {}) {
  const defaultMonth = state.monthlyProductionMonth || todayDateValue().slice(0, 7);
  const fromValue = record.from || `${defaultMonth}-01T00:00`;
  const toValue = record.to || `${defaultMonth}-01T01:00`;
  const categoryOptions = outageCategories.map(category =>
    `<option value="${esc(category)}" ${record.category === category ? "selected" : ""}>${esc(category)}</option>`
  ).join("");
  openModal(record.id ? "Edit Outage Record" : "Add Outage Record", `
    <div class="form-grid">
      <input id="outage-record-id" type="hidden" value="${esc(record.id || "")}">
      <label>Unit
        <select id="outage-unit" required>
          <option value="">Select unit</option>
          ${["Unit 1", "Unit 2", "Unit 3"].map(unit => `<option value="${esc(unit)}" ${record.unit === unit ? "selected" : ""}>${esc(unit)}</option>`).join("")}
        </select>
      </label>
      <label>Category
        <select id="outage-category" required>
          <option value="">Select category</option>
          ${categoryOptions}
        </select>
      </label>
      <label>From Date <input id="outage-from-date" type="date" value="${esc(outageDatePart(fromValue))}" required></label>
      <label>From Time <input id="outage-from-time" type="text" inputmode="numeric" pattern="^([01]\\d|2[0-3]):[0-5]\\d$" title="Use 24-hour time, for example 00:00 or 17:30" placeholder="HH:mm" value="${esc(outageTimePart(fromValue))}" required><small>00:00 - 23:59</small></label>
      <label>To Date <input id="outage-to-date" type="date" value="${esc(outageDatePart(toValue))}" required></label>
      <label>To Time <input id="outage-to-time" type="text" inputmode="numeric" pattern="^([01]\\d|2[0-3]):[0-5]\\d$" title="Use 24-hour time, for example 00:00 or 17:30" placeholder="HH:mm" value="${esc(outageTimePart(toValue))}" required><small>00:00 - 23:59</small></label>
      <label>Energy Loss (kWh) <input id="outage-energy" type="number" value="${esc(record.energyLossKwh ?? "")}" readonly><small>85,000 x outage hours</small></label>
      <div class="outage-duration-preview" id="outage-duration-preview">Duration: -</div>
      <label class="full">Reason / Description <textarea id="outage-reason" rows="4" required>${esc(record.reason || "")}</textarea></label>
    </div>
    <div class="actions-row">
      <button class="button" id="save-outage-record" type="button">${record.id ? "Save Changes" : "Save Record"}</button>
    </div>
  `);
  updateOutageEnergyPreview();
}

async function saveOutageRecordFromModal() {
  if (!validateModalForm()) return;
  const recordId = document.getElementById("outage-record-id").value;
  const from = outageDateTimeFromParts("outage-from-date", "outage-from-time");
  const to = outageDateTimeFromParts("outage-to-date", "outage-to-time");
  const range = normalizedOutageDateRange(from, to);
  const payload = {
    unit: document.getElementById("outage-unit").value,
    category: document.getElementById("outage-category").value,
    from,
    to: range ? formatOutageDateInput(range.end) : to,
    reason: document.getElementById("outage-reason").value
  };
  const saved = await api(recordId ? `/api/outages/${encodeURIComponent(recordId)}` : "/api/outages", {
    method: recordId ? "PUT" : "POST",
    body: JSON.stringify(payload)
  });
  state.data.outageRecords = state.data.outageRecords || [];
  const index = state.data.outageRecords.findIndex(record => record.id === saved.id);
  if (index >= 0) state.data.outageRecords[index] = saved;
  else state.data.outageRecords.push(saved);
  state.data.outageRecords.sort((left, right) => new Date(left.from) - new Date(right.from));
  state.outageNotice = recordId ? "Outage record updated." : "Outage record saved.";
  document.getElementById("modal").close();
  renderMonthlyProduction();
}

async function deleteOutageRecord(recordId) {
  const record = outageRecords().find(item => item.id === recordId);
  if (!record) return;
  if (!confirm(`Delete ${record.unit} outage record dated ${outageDateTime(record.from)}?`)) return;
  await api(`/api/outages/${encodeURIComponent(recordId)}`, { method: "DELETE" });
  state.data.outageRecords = outageRecords().filter(item => item.id !== recordId);
  state.outageNotice = "Outage record deleted.";
  renderMonthlyProduction();
}

function renderGenerationMonthlyBackdown(month, rows) {
  return `
    <section class="panel production-panel monthly-production-report">
      <div class="sheet-wrap">
        <table class="sheet-table monthly-production-table monthly-sub-sheet-table">
          <thead>
            <tr class="monthly-title-row"><th colspan="7">Monthly Backdown Report - ${esc(monthlyProductionMonthLabel(month))}</th></tr>
            <tr>
              <th>Day</th>
              <th>Unit</th>
              <th>Backdown MW</th>
              <th>Hours</th>
              <th>Energy Loss (KWH)</th>
              <th>Reason</th>
              <th>Remark</th>
            </tr>
          </thead>
          <tbody>
            ${rows.map(row => [1, 2, 3].map(unit => `
              <tr>
                <th>${row.day}</th>
                <td>Unit #${unit}</td>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
              </tr>
            `).join("")).join("")}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

function renderMonthlyProduction() {
  const month = state.monthlyProductionMonth || todayDateValue().slice(0, 7);
  const rows = monthlyProductionRows(month);
  const totals = monthlyProductionTotals(rows);
  const activeSheet = state.generationMonthlySheet || "summary";
  const sheetBody = activeSheet === "dashboard"
    ? renderGenerationMonthlyDashboard(rows, totals)
    : activeSheet === "waterUtilized"
      ? renderGenerationMonthlyWaterUtilized(month, rows, totals)
    : activeSheet === "availability"
      ? renderGenerationMonthlyAvailability(month, rows, totals)
    : activeSheet === "outage"
      ? renderGenerationMonthlyOutage(month, rows)
      : activeSheet === "backdown"
        ? renderGenerationMonthlyBackdown(month, rows)
        : renderGenerationSummarySheet(month, rows, totals);
  document.getElementById("monthlyProduction").innerHTML = `
    ${operationHead("Generation Monthly Report", canExportProduction() ? `
      <button class="button" id="export-monthly-xlsx" type="button">Download XLSX</button>
      <button class="button light" id="export-monthly-csv" type="button">Download CSV</button>
      <button class="button light" id="export-monthly-pdf" type="button">Download PDF</button>
    ` : "")}
    <div class="date-actions production-summary-date">
      <label class="date-field">Month <input id="monthly-production-month" type="month" value="${esc(month)}"></label>
      <button class="button light" id="monthly-production-current" type="button">Current Month</button>
    </div>
    ${generationMonthlySheetTabs(activeSheet)}
    ${sheetBody}
  `;
}

function renderOperationWorkbook() {
  const month = operationWorkbookMonth();
  const ready = operationWorkbookMonthClosed(month);
  document.getElementById("operationWorkbook").innerHTML = `
    ${operationHead("Operation Workbook", canExportProduction() ? `
      <button class="button" id="export-operation-workbook" type="button" ${ready ? "" : "disabled"}>Download Operation Workbook</button>
      <span class="status-pill">${esc(operationWorkbookDownloadStatus(month))}</span>
    ` : `<span class="status-pill">Read only</span>`)}
    <section class="panel production-workflow">
      <div class="toolbar">
        <div>
          <h2>Plant Operation Workbook</h2>
        </div>
        <div class="date-actions">
          <label class="date-field">Workbook Month <input id="operation-workbook-month" type="month" value="${esc(month)}"></label>
          <span class="status-pill">${esc(operationWorkbookDownloadStatus(month))}</span>
        </div>
      </div>
      ${summaryStrip([
        { label: "Workbook", value: monthlyProductionMonthLabel(month), note: ready ? "ready to download" : "locked until month end", tone: ready ? "green" : "amber" },
        { label: "Charts", value: "Included", note: "dashboard sheet", tone: "green" },
        { label: "Daily Production", value: "Included", note: "KWH meter sheet" },
        { label: "Operation Sheets", value: "Included", note: "hourly, energy, water, line, shunt" },
        { label: "Logbook", value: "Included", note: "operations entries" }
      ])}
    </section>
  `;
}

function renderShuntReactor1() {
  const rows = shuntReactorRows();
  const selectedDate = state.shuntReactorDate || todayDateValue();
  const submission = productionSubmission("shunt-reactor", selectedDate);
  const editable = canEditSubmittedProductionModule("shunt-reactor", selectedDate);
  const disabled = editable ? "" : "disabled";
  const input = (index, field, value) => `<input class="sheet-input" data-shunt-field="${esc(field)}" data-shunt-index="${index}" type="number" step="any" value="${esc(value)}" ${disabled}>`;
  const reactorCells = (row, index, key) => `
    <td>${input(index, `${key}.mw`, row[key].mw)}</td>
    <td>${input(index, `${key}.mvar`, row[key].mvar)}</td>
    <td>${input(index, `${key}.kv`, row[key].kv)}</td>
    <td>${input(index, `${key}.current`, row[key].current)}</td>
  `;
  const statRow = (label, type) => `
    <tr class="excel-summary">
      <th>${label}</th>
      ${shuntReactorFields.map(field => `<th>${esc(shuntReactorStat(rows, field, type))}</th>`).join("")}
    </tr>
  `;
  document.getElementById("shuntReactor1").innerHTML = `
    ${operationHead("Shunt Reactor", productionModuleActions({
      moduleName: "shunt-reactor",
      date: selectedDate,
      submission,
      submitId: "submit-shunt-report",
      exports: productionExportButtons("shunt")
    }))}
    <section class="panel production-panel">
      <div class="toolbar">
        <h2>Daily Shunt Reactor Sheet</h2>
        <div class="date-actions">
          <label class="date-field">Date <input id="shunt-reactor-date" type="date" value="${esc(state.shuntReactorDate || todayDateValue())}"></label>
          <button class="button light" id="shunt-reactor-today" type="button">Today</button>
          ${canManageProduction() && (!submission?.approvedAt || canAdminOverride()) ? `<button class="secondary-button" id="shunt-reactor-clear" type="button">Empty Table</button>` : `<span class="status-pill">${editable ? "Operator entry enabled" : "Approved - read only"}</span>`}
        </div>
      </div>
      ${state.shuntReactorNotice ? `<p class="notice-line">${esc(state.shuntReactorNotice)}</p>` : ""}
      ${productionReviewPanel("shunt-reactor", selectedDate, submission)}
      <div class="sheet-wrap">
        <table class="sheet-table production-excel shunt-reactor-table">
          <thead>
            <tr>
              <th colspan="7"></th>
              <th colspan="4" class="excel-date">DATE: ${esc(formatSheetDate(state.shuntReactorDate))}</th>
            </tr>
            <tr>
              <th rowspan="2">TIME</th>
              <th rowspan="2">System<br>Frequency<br>Hz</th>
              <th rowspan="2">Bus Voltage<br>kV</th>
              <th colspan="4" class="excel-group">SHUNT REACTOR 1</th>
              <th colspan="4" class="excel-group">SHUNT REACTOR 2</th>
            </tr>
            <tr>
              <th>ACTIVE<br>POWER<br>MW</th>
              <th>REACTIVE<br>POWER<br>MVAR</th>
              <th>VOLTAGE<br>kV</th>
              <th>CURRENT<br>Amp</th>
              <th>ACTIVE<br>POWER<br>MW</th>
              <th>REACTIVE<br>POWER<br>MVAR</th>
              <th>VOLTAGE<br>kV</th>
              <th>CURRENT<br>Amp</th>
            </tr>
          </thead>
          <tbody>
            ${rows.map((row, index) => `
              <tr>
                <th>${esc(row.time === "24:00" ? "24:00:00" : row.time)}</th>
                <td>${input(index, "freq", row.freq)}</td>
                <td>${input(index, "busKv", row.busKv)}</td>
                ${reactorCells(row, index, "sr1")}
                ${reactorCells(row, index, "sr2")}
              </tr>
            `).join("")}
            ${statRow("MAX", "max")}
            ${statRow("MIN", "min")}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

function renderLineParameter() {
  const rows = lineParameterRows();
  const selectedDate = state.lineParameterDate || todayDateValue();
  const submission = productionSubmission("line-parameter", selectedDate);
  const editable = canEditSubmittedProductionModule("line-parameter", selectedDate);
  const disabled = editable ? "" : "disabled";
  const input = (index, field, value) => `<input class="sheet-input" data-line-field="${esc(field)}" data-line-index="${index}" type="number" step="any" value="${esc(value)}" ${disabled}>`;
  const statRow = (label, type) => `
    <tr class="excel-summary">
      <th>${label}</th>
      ${lineParameterFields.map(field => `<th>${esc(lineParameterStat(rows, field, type))}</th>`).join("")}
    </tr>
  `;
  const lineCells = (row, index, key) => `
    <td>${input(index, `${key}.mw`, row[key].mw)}</td>
    <td>${input(index, `${key}.mvar`, row[key].mvar)}</td>
    <td>${input(index, `${key}.kv`, row[key].kv)}</td>
    <td>${input(index, `${key}.current`, row[key].current)}</td>
  `;
  document.getElementById("lineParameter").innerHTML = `
    ${operationHead("Line Parameter", productionModuleActions({
      moduleName: "line-parameter",
      date: selectedDate,
      submission,
      submitId: "submit-line-report",
      exports: productionExportButtons("line")
    }))}
    <section class="panel production-panel">
      <div class="toolbar">
        <h2>Daily Line Parameter Sheet</h2>
        <div class="date-actions">
          <label class="date-field">Date <input id="line-parameter-date" type="date" value="${esc(state.lineParameterDate || todayDateValue())}"></label>
          <button class="button light" id="line-parameter-today" type="button">Today</button>
          ${canManageProduction() && (!submission?.approvedAt || canAdminOverride()) ? `<button class="secondary-button" id="line-parameter-clear" type="button">Empty Table</button>` : `<span class="status-pill">${editable ? "Operator entry enabled" : "Approved - read only"}</span>`}
        </div>
      </div>
      ${state.lineParameterNotice ? `<p class="notice-line">${esc(state.lineParameterNotice)}</p>` : ""}
      ${productionReviewPanel("line-parameter", state.lineParameterDate || todayDateValue(), submission)}
      <div class="sheet-wrap">
        <table class="sheet-table production-excel line-parameter-table">
          <thead>
            <tr><th colspan="7"></th><th colspan="4" class="excel-date">DATE: ${esc(formatSheetDate(state.lineParameterDate))}</th></tr>
            <tr>
              <th rowspan="2">TIME</th>
              <th rowspan="2">System<br>Frequency<br>Hz</th>
              <th rowspan="2">Bus Voltage<br>kV</th>
              <th colspan="4" class="excel-group">LINE PARAMETER 1</th>
              <th colspan="4" class="excel-group">LINE PARAMETER 2</th>
            </tr>
            <tr>
              <th>ACTIVE<br>POWER MW</th>
              <th>REACTIVE POWER<br>MVAR</th>
              <th>VOLTAGE<br>kV</th>
              <th>CURRENT Amp</th>
              <th>ACTIVE<br>POWER MW</th>
              <th>REACTIVE<br>POWER MVAR</th>
              <th>VOLTAGE<br>kV</th>
              <th>CURRENT<br>Amp</th>
            </tr>
          </thead>
          <tbody>
            ${rows.map((row, index) => `
              <tr>
                <th>${esc(row.time === "24:00" ? "24:00:00" : row.time)}</th>
                <td>${input(index, "freq", row.freq)}</td>
                <td>${input(index, "busKv", row.busKv)}</td>
                ${lineCells(row, index, "line1")}
                ${lineCells(row, index, "line2")}
              </tr>
            `).join("")}
            ${statRow("MAX", "max")}
            ${statRow("MIN", "min")}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

function renderCurrentUser() {
  document.getElementById("current-user-label").textContent = `${state.data.currentUser.name} - ${state.data.currentUser.role}`;
}

function renderAuth(message = "") {
  document.getElementById("auth-screen").hidden = false;
  document.getElementById("app-shell").hidden = true;
  document.getElementById("auth-message").textContent = message;
}

function showAuthForm(formId, message = "", success = false) {
  ["login-form", "register-form", "forgot-password-form", "reset-password-form"].forEach(id => {
    document.getElementById(id).hidden = id !== formId;
  });
  const tabs = document.querySelector(".auth-tabs");
  tabs.hidden = formId === "forgot-password-form" || formId === "reset-password-form";
  document.getElementById("show-login").classList.toggle("active", formId === "login-form");
  document.getElementById("show-register").classList.toggle("active", formId === "register-form");
  const authMessage = document.getElementById("auth-message");
  authMessage.textContent = message;
  authMessage.classList.toggle("success", success);
}

function logout() {
  if (state.authToken) {
    fetch("/api/auth/logout", {
      method: "POST",
      headers: { Authorization: `Bearer ${state.authToken}` }
    }).catch(() => {});
  }
  state.currentUserId = "";
  state.authToken = "";
  state.data = null;
  sessionStorage.removeItem("cmms.authToken");
  renderAuth();
}

function dashboardNumber(value, decimals = 1, suffix = "") {
  const number = Number(value);
  if (!Number.isFinite(number)) return "-";
  return `${number.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}${suffix ? ` ${suffix}` : ""}`;
}

function dashboardInteger(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number.toLocaleString("en-US", { maximumFractionDigits: 0 }) : "0";
}

function dashboardEnergyMeterTotal(row) {
  if (!row?.meters?.length) return "";
  const values = row.meters
    .map(energyMeterProduction)
    .filter(value => value !== "" && Number.isFinite(Number(value)))
    .map(Number);
  return values.length ? values.reduce((sum, value) => sum + value, 0) : "";
}

function latestWaterLevelReading(rows) {
  return rows.slice().reverse().find(row => hasValue(row.reservoir) || hasValue(row.tailrace)) || {};
}

function dashboardCanOpenModule(view) {
  if (view === "data") return canManageDataControl();
  if (view === "users") return canManageUserManagement();
  if (isProductionOnlyOperator()) return view === "dashboard" || plantOperationModuleOrder.includes(view);
  if (isPlantOperationsOnlyManager()) return plantOperationViews().includes(view);
  return true;
}

function dashboardOpenControl(view) {
  return dashboardCanOpenModule(view)
    ? `<button class="secondary-button compact-button" data-view-jump="${esc(view)}" type="button">Open</button>`
    : `<span class="status-pill">Restricted</span>`;
}

function dashboardModuleRow(item) {
  return `
    <tr>
      <td><strong>${esc(item.module)}</strong></td>
      <td>${esc(item.output)}</td>
      <td>${badge(item.status || "Ready", item.tone || "blue")}</td>
      <td>${dashboardOpenControl(item.view)}</td>
    </tr>
  `;
}

function dashboardModuleOutputs() {
  const today = todayDateValue();
  const month = state.monthlyProductionMonth || today.slice(0, 7);
  const workOrders = state.data.workOrders || [];
  const inventory = state.data.inventory || [];
  const assets = state.data.assets || [];
  const pms = state.data.pmSchedules || [];
  const users = state.data.users || [];
  const logs = state.data.logEntries || [];
  const attachments = state.data.attachments || [];
  const monthlyRows = monthlyProductionRows(month);
  const monthlyTotals = monthlyProductionTotals(monthlyRows);
  const hourlyTotals = productionTotals(productionRows(state.productionDate || today));
  const meterRows = productionMeterRows(state.productionDate || today);
  const productionKwhRow = meterRows.find(row => row.key === "productionKwh");
  const auxiliaryKwhRow = meterRows.find(row => row.key === "auxKwh");
  const dailyReport = dailyGenerationReportData(dailyGenerationDate());
  const energyData = energyMeterRows(state.energyMeterDate || today);
  const transformerNet = energyData.transformers.find(row => row.power === "KWH" && row.item === "NET");
  const lineNet = energyData.lines.find(row => row.power === "KWH" && row.item === "NET");
  const waterRows = waterLevelRows(state.waterLevelDate || today);
  const waterLatest = latestWaterLevelReading(waterRows);
  const shuntRows = shuntReactorRows(state.shuntReactorDate || today);
  const lineRows = lineParameterRows(state.lineParameterDate || today);
  const operationLogs = logs.filter(log => (log.category || "operations") === "operations");
  const maintenanceLogs = logs.filter(log => (log.category || "operations") === "maintenance");
  const archiveFiles = maintenanceArchiveFiles();
  const commissioningFiles = attachments.filter(file => file.module === "commissioning-test-reports");
  const documentFiles = attachments.filter(file => file.module !== "plant-maintenance-archive");
  const openWork = workOrders.filter(wo => !["Closed", "Cancelled", "Verified"].includes(wo.status));
  const pmDue = pms.filter(pm => pm.nextDue && pm.nextDue <= today);
  const lowStock = inventory.filter(item => Number(item.qty || 0) <= Number(item.min || 0));
  const outageHours = outageRecords()
    .filter(record => String(record.from || "").slice(0, 7) === month)
    .reduce((sum, record) => sum + Number(record.durationHours || 0), 0);
  const submissions = Object.values(state.data.productionSubmissions || {}).flatMap(moduleRecords => Object.values(moduleRecords || {}));
  const pendingApprovals = submissions.filter(record => record?.submittedAt && !record.approvedAt && !record.rejectedAt).length;

  return [
    { module: "Hourly Report", output: `${dashboardNumber(hourlyTotals.currentMw, 1, "MW")} current, ${dashboardNumber(hourlyTotals.mwh, 1, "MWh")} estimated`, status: "Live", tone: "green", view: "production" },
    { module: "Shunt Reactor", output: `SR1 max ${dashboardNumber(shuntReactorStat(shuntRows, "sr1.mw", "max"), 1, "MW")}, SR2 max ${dashboardNumber(shuntReactorStat(shuntRows, "sr2.mw", "max"), 1, "MW")}`, status: "Daily", view: "shuntReactor1" },
    { module: "Line Parameter", output: `Line 1 max ${dashboardNumber(lineParameterStat(lineRows, "line1.mw", "max"), 1, "MW")}, Line 2 max ${dashboardNumber(lineParameterStat(lineRows, "line2.mw", "max"), 1, "MW")}`, status: "Daily", view: "lineParameter" },
    { module: "Water Level", output: `Reservoir ${hasValue(waterLatest.reservoir) ? `${waterLatest.reservoir} m` : "-"}, tailrace ${hasValue(waterLatest.tailrace) ? `${waterLatest.tailrace} m` : "-"}`, status: "Monthly", tone: "green", view: "waterLevel" },
    { module: "Energy Meter", output: `Transformer NET ${dashboardNumber(dashboardEnergyMeterTotal(transformerNet), 1, "KWH")}, Line NET ${dashboardNumber(dashboardEnergyMeterTotal(lineNet), 1, "KWH")}`, status: "Daily", view: "energyMeter" },
    { module: "Daily Production", output: `Production ${dashboardNumber(productionMeterTotal(productionKwhRow), 1, "KWH")}, auxiliary ${dashboardNumber(productionMeterTotal(auxiliaryKwhRow), 1, "KWH")}`, status: "Daily", tone: "green", view: "productionSummary" },
    { module: "Daily Generation Report", output: `${dashboardNumber(dailyReport.totalProductionKwh, 1, "KWH")}, PAF ${dashboardNumber(dailyReport.totalPaf, 1, "%")}`, status: "Report", view: "dailyGenerationReport" },
    { module: "Operations Logbook", output: `${dashboardInteger(operationLogs.length)} entries, ${dashboardInteger(operationLogs.filter(log => (log.status || "Pending") !== "Approved").length)} pending`, status: "Shift", view: "logbook" },
    { module: "Generation Monthly Report", output: `${dashboardNumber(monthlyTotals.totalProduction, 1, "KWH")}, service ${monthlyTotals.serviceHour || "-"}`, status: "Monthly", tone: "green", view: "monthlyProduction" },
    { module: "Operation Workbook", output: operationWorkbookDownloadStatus(month), status: operationWorkbookMonthClosed(month) ? "Ready" : "Locked", tone: operationWorkbookMonthClosed(month) ? "green" : "amber", view: "operationWorkbook" },
    { module: "Outage Management", output: `${dashboardNumber(outageHours, 2, "h")} outage, ${dashboardInteger(pendingApprovals)} operation approvals`, status: outageHours ? "Monitor" : "Ready", tone: outageHours ? "amber" : "green", view: "monthlyProduction" },
    { module: "Assets", output: `${dashboardInteger(assets.length)} assets, ${dashboardInteger(assets.filter(asset => asset.criticality === "Critical").length)} critical`, status: "Registry", view: "assets" },
    { module: "Work Orders", output: `${dashboardInteger(openWork.length)} open, ${dashboardInteger(openWork.filter(wo => wo.priority === "Critical").length)} critical`, status: openWork.length ? "Action" : "Ready", tone: openWork.length ? "amber" : "green", view: "work" },
    { module: "Plant Maintenance Types", output: `${dashboardInteger(pms.length)} PM plans, ${dashboardInteger(pmDue.length)} due`, status: pmDue.length ? "Due" : "Ready", tone: pmDue.length ? "amber" : "green", view: "pm" },
    { module: "Commissioning and Test Report", output: `${dashboardInteger(new Set(commissioningFiles.map(file => file.reportNumber || file.id)).size)} reports, ${dashboardInteger(commissioningFiles.length)} files`, status: "Register", tone: "green", view: "commissioningReports" },
    { module: "Inventory", output: `${dashboardInteger(inventory.length)} items, ${dashboardInteger(lowStock.length)} low stock`, status: lowStock.length ? "Action" : "Ready", tone: lowStock.length ? "amber" : "green", view: "inventory" },
    { module: "Maintenance Logbook", output: `${dashboardInteger(maintenanceLogs.length)} entries, ${dashboardInteger(maintenanceLogs.filter(log => (log.status || "Pending") !== "Approved").length)} pending`, status: "Maintenance", view: "maintenanceLogbook" },
    { module: "Digital Archive", output: `${dashboardInteger((state.data.archiveFolders || []).length)} folders, ${dashboardInteger(archiveFiles.length)} files`, status: "Archive", view: "maintenanceArchive" },
    { module: "Documents", output: `${dashboardInteger(documentFiles.length)} files, ${fileSize(documentFiles.reduce((sum, file) => sum + Number(file.size || 0), 0))}`, status: "Files", view: "documents" },
    { module: "Data Control", output: `${dashboardInteger(assets.length + inventory.length + pms.length + workOrders.length)} master records`, status: "Admin", view: "data" },
    { module: "Reports", output: `${dashboardInteger(openWork.length)} backlog, ${dashboardInteger(lowStock.length)} stock alerts`, status: "KPI", view: "reports" },
    { module: "Users", output: `${dashboardInteger(users.filter(user => user.active).length)} active, ${dashboardInteger(users.filter(user => !user.active).length)} disabled`, status: "Admin", view: "users" }
  ];
}

function dashboardDateOffset(value, days) {
  const date = new Date(`${value || todayDateValue()}T12:00:00`);
  date.setDate(date.getDate() + days);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function dashboardWeekDates(value) {
  const selected = new Date(`${value || todayDateValue()}T12:00:00`);
  const mondayOffset = -((selected.getDay() + 6) % 7);
  const start = dashboardDateOffset(value, mondayOffset);
  return Array.from({ length: 7 }, (_, index) => dashboardDateOffset(start, index));
}

function dashboardStoredMeterRows(date) {
  const stored = productionMeterReadings()[date];
  if (Array.isArray(stored)) return stored;
  return Array.isArray(stored?.rows) ? stored.rows : [];
}

function dashboardDailyProduction(date) {
  const meterRows = dashboardStoredMeterRows(date);
  const productionRow = meterRows.find(row => row.key === "productionKwh");
  const meterUnits = productionRow?.units?.map(unit => {
    const difference = productionMeterDifference(unit);
    return difference === "" || !Number.isFinite(Number(difference)) ? 0 : Math.max(0, Number(difference));
  }) || [0, 0, 0];
  const meterTotal = meterUnits.reduce((sum, value) => sum + value, 0);
  const rows = productionSheets()[date] || [];
  const meta = productionMetas()[date] || defaultProductionMeta();
  const hourlyEnergy = productionEnergyForRows(rows, meta);
  const units = meterTotal > 0 ? meterUnits : hourlyEnergy.units.map(value => Math.max(0, Number(value || 0) * 1000));
  const totalKwh = meterTotal > 0 ? meterTotal : units.reduce((sum, value) => sum + value, 0);
  const loadValues = rows
    .filter(rowHasPowerData)
    .map(row => rowProductionTotal(row).mw)
    .filter(value => Number.isFinite(value));
  return {
    date,
    units,
    totalKwh,
    maxMw: loadValues.length ? Math.max(...loadValues) : null,
    minMw: loadValues.length ? Math.min(...loadValues) : null,
    avgMw: loadValues.length ? loadValues.reduce((sum, value) => sum + value, 0) / loadValues.length : null
  };
}

function dashboardSelectedDate() {
  if (state.dashboardDate) return state.dashboardDate;
  const dates = new Set([
    ...Object.keys(productionSheets()),
    ...Object.keys(productionMeterReadings())
  ]);
  const latest = Array.from(dates)
    .filter(date => date <= todayDateValue() && dashboardDailyProduction(date).totalKwh > 0)
    .sort()
    .pop();
  state.dashboardDate = latest || todayDateValue();
  return state.dashboardDate;
}

function dashboardShortDate(date, weekday = false) {
  const options = weekday
    ? { weekday: "short", day: "2-digit" }
    : { day: "2-digit", month: "short", year: "numeric" };
  return new Date(`${date}T12:00:00`).toLocaleDateString("en-GB", options);
}

function dashboardUnitBars(units) {
  const maximum = Math.max(...units, 1);
  return `
    <div class="dashboard-unit-bars" aria-label="Production by generating unit">
      ${units.map((value, index) => `
        <div class="dashboard-unit-bar">
          <strong>${value > 0 ? dashboardNumber(value, 0) : "-"}</strong>
          <div class="dashboard-bar-track"><span style="height:${value > 0 ? Math.max(5, value / maximum * 100) : 0}%"></span></div>
          <small>Unit ${index + 1}</small>
        </div>
      `).join("")}
    </div>
  `;
}

function dashboardProductionPie(units) {
  const total = units.reduce((sum, value) => sum + value, 0);
  const percentages = units.map(value => total > 0 ? value / total * 100 : 0);
  const first = percentages[0];
  const second = first + percentages[1];
  const style = total > 0
    ? `background:conic-gradient(#147d68 0 ${first}%, #2c6eaa ${first}% ${second}%, #d39a2c ${second}% 100%)`
    : "background:#e5ece9";
  return `
    <div class="dashboard-pie-layout">
      <div class="dashboard-pie" style="${style}" role="img" aria-label="Generating unit production contribution">
        <div><strong>${total > 0 ? "100%" : "0%"}</strong><span>Plant</span></div>
      </div>
      <div class="dashboard-pie-legend">
        ${percentages.map((value, index) => `<span class="unit-${index + 1}"><i></i>Unit ${index + 1}<strong>${value.toFixed(1)}%</strong></span>`).join("")}
      </div>
    </div>
  `;
}

function dashboardProductionTrend(items) {
  const values = items.map(item => Number(item.totalKwh || 0));
  const maximum = Math.max(...values, 1);
  const width = 720;
  const height = 220;
  const left = 42;
  const right = 18;
  const top = 22;
  const bottom = 42;
  const chartWidth = width - left - right;
  const chartHeight = height - top - bottom;
  const points = items.map((item, index) => {
    const x = left + (chartWidth / Math.max(items.length - 1, 1)) * index;
    const y = top + chartHeight - (Number(item.totalKwh || 0) / maximum) * chartHeight;
    return { ...item, x, y };
  });
  const polyline = points.map(point => `${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(" ");
  return `
    <div class="dashboard-trend-chart">
      <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Daily production trend for the selected week">
        <line class="chart-grid-line" x1="${left}" y1="${top}" x2="${width - right}" y2="${top}"></line>
        <line class="chart-grid-line" x1="${left}" y1="${top + chartHeight / 2}" x2="${width - right}" y2="${top + chartHeight / 2}"></line>
        <line class="chart-axis-line" x1="${left}" y1="${top + chartHeight}" x2="${width - right}" y2="${top + chartHeight}"></line>
        <polyline class="chart-production-line" points="${polyline}"></polyline>
        ${points.map(point => `
          <circle class="chart-production-point" cx="${point.x}" cy="${point.y}" r="5"><title>${dashboardShortDate(point.date)}: ${dashboardNumber(point.totalKwh, 0, "kWh")}</title></circle>
          <text class="chart-date-label" x="${point.x}" y="${height - 14}" text-anchor="middle">${esc(dashboardShortDate(point.date, true))}</text>
        `).join("")}
        <text class="chart-scale-label" x="${left - 8}" y="${top + 4}" text-anchor="end">${dashboardInteger(maximum)}</text>
        <text class="chart-scale-label" x="${left - 8}" y="${top + chartHeight + 4}" text-anchor="end">0</text>
      </svg>
    </div>
  `;
}

function dashboardMaintenanceReports(selectedDate, weekDates) {
  const workReports = (state.data.workOrders || [])
    .filter(workOrder => workOrder.completionReportId || workOrder.completionSubmittedAt)
    .map(workOrder => ({
      date: String(workOrder.completionSubmittedAt || workOrder.approvedAt || workOrder.updatedAt || "").slice(0, 10),
      time: workOrder.completionSubmittedAt || workOrder.approvedAt || workOrder.updatedAt || "",
      reference: workOrder.number || "Work order",
      title: workOrder.title || "Maintenance report",
      type: workOrder.type || "Work Order",
      status: workOrder.status || "Submitted"
    }));
  const logbookReports = (state.data.logEntries || [])
    .filter(log => (log.category || "operations") === "maintenance")
    .map(log => ({
      date: String(log.entryTime || log.submittedAt || "").slice(0, 10),
      time: log.entryTime || log.submittedAt || "",
      reference: `${log.shift || "Shift"} Logbook`,
      title: log.description || log.type || "Maintenance logbook entry",
      type: log.type || "Logbook",
      status: log.status || "Pending"
    }));
  const all = [...workReports, ...logbookReports].filter(item => item.date).sort((a, b) => String(b.time).localeCompare(String(a.time)));
  const weekSet = new Set(weekDates);
  const today = all.filter(item => item.date === selectedDate);
  const week = all.filter(item => weekSet.has(item.date));
  return {
    today,
    week,
    approved: week.filter(item => ["Approved", "Verified", "Closed"].includes(item.status)).length,
    pending: week.filter(item => !["Approved", "Verified", "Closed"].includes(item.status)).length,
    dailyCounts: weekDates.map(date => ({ date, count: week.filter(item => item.date === date).length }))
  };
}

function dashboardMaintenanceBars(items) {
  const maximum = Math.max(...items.map(item => item.count), 1);
  return `
    <div class="maintenance-week-bars" aria-label="Maintenance reports by day">
      ${items.map(item => `
        <div class="maintenance-day-bar" title="${esc(dashboardShortDate(item.date))}: ${item.count} report${item.count === 1 ? "" : "s"}">
          <strong>${item.count || ""}</strong>
          <div><span style="height:${item.count ? Math.max(12, item.count / maximum * 100) : 0}%"></span></div>
          <small>${esc(dashboardShortDate(item.date, true))}</small>
        </div>
      `).join("")}
    </div>
  `;
}

function dashboardMaintenanceRows(items) {
  if (!items.length) return `<div class="dashboard-empty-state">No maintenance report recorded for this period.</div>`;
  return `
    <div class="dashboard-maintenance-list">
      ${items.slice(0, 7).map(item => `
        <article>
          <div><strong>${esc(item.reference)}</strong><span>${esc(item.title)}</span></div>
          <div><small>${esc(dashboardShortDate(item.date))}</small>${badge(item.status, ["Approved", "Verified", "Closed"].includes(item.status) ? "green" : "amber")}</div>
        </article>
      `).join("")}
    </div>
  `;
}

function renderDashboard() {
  const { dashboard } = state.data;
  const openWork = dashboard.cards.find(card => card.label === "Open Work Orders")?.value ?? 0;
  const lowStock = dashboard.cards.find(card => card.label === "Low Stock Items")?.value ?? 0;
  const pmDue = dashboard.cards.find(card => card.label === "PM Due Today")?.value ?? 0;
  const moduleOutputs = dashboardModuleOutputs();
  const operationOutputs = moduleOutputs.slice(0, 11);
  const maintenanceOutputs = moduleOutputs.slice(11);
  const selectedDate = dashboardSelectedDate();
  const weekDates = dashboardWeekDates(selectedDate);
  const weekProduction = weekDates.map(dashboardDailyProduction);
  const selectedProduction = dashboardDailyProduction(selectedDate);
  const productionDays = weekProduction.filter(item => item.totalKwh > 0);
  const weeklyMaximum = productionDays.length ? Math.max(...productionDays.map(item => item.totalKwh)) : 0;
  const weeklyMinimum = productionDays.length ? Math.min(...productionDays.map(item => item.totalKwh)) : 0;
  const maintenanceReports = dashboardMaintenanceReports(selectedDate, weekDates);
  document.getElementById("dashboard").innerHTML = `
    <div class="ops-hero">
      <section class="panel hero-panel">
        <p class="eyebrow">Live Plant Overview</p>
        <h2 class="hero-title">${esc(dashboard.plantName)}</h2>
        <p class="muted">Maintenance, operations, inventory, and asset reliability in one local plant system.</p>
        <div class="hero-stats">
          <div class="hero-stat"><span>Open Work</span><strong>${esc(openWork)}</strong></div>
          <div class="hero-stat"><span>PM Due</span><strong>${esc(pmDue)}</strong></div>
          <div class="hero-stat"><span>Stock Alerts</span><strong>${esc(lowStock)}</strong></div>
        </div>
      </section>
      <section class="panel">
        <div class="toolbar">
          <h2>Generating Units</h2>
          <span class="status-pill">${dashboard.unitStatus.length} units</span>
        </div>
        <div class="timeline">
          ${dashboard.unitStatus.map(unit => `
            <div class="timeline-item">
              <div class="toolbar">
                <strong>${esc(unit.name)}</strong>
                ${badge(unit.status)}
              </div>
              <span class="muted">${esc(unit.criticality)} equipment group</span>
            </div>
          `).join("")}
        </div>
      </section>
    </div>
    <div class="grid cards">
      ${dashboard.cards.map(card => `
        <article class="card metric">
          <span class="muted">${esc(card.label)}</span>
          <strong>${esc(card.value)}</strong>
          ${badge(card.tone === "green" ? "Healthy" : card.tone === "red" ? "Action" : "Monitor", card.tone)}
        </article>
      `).join("")}
    </div>

    <section class="panel dashboard-analytics-panel">
      <div class="toolbar dashboard-analytics-toolbar">
        <div>
          <p class="eyebrow">Plant Performance</p>
          <h2>Production and Maintenance</h2>
        </div>
        <div class="dashboard-date-controls">
          <label for="dashboard-date">Report date</label>
          <input id="dashboard-date" type="date" value="${esc(selectedDate)}" max="${esc(todayDateValue())}">
          <button class="secondary-button" id="dashboard-today" type="button">Today</button>
        </div>
      </div>

      <div class="dashboard-performance-kpis">
        <article><span>Daily Production</span><strong>${dashboardNumber(selectedProduction.totalKwh, 0, "kWh")}</strong><small>${esc(dashboardShortDate(selectedDate))}</small></article>
        <article><span>Daily Maximum</span><strong>${dashboardNumber(weeklyMaximum, 0, "kWh")}</strong><small>Selected week</small></article>
        <article><span>Daily Minimum</span><strong>${dashboardNumber(weeklyMinimum, 0, "kWh")}</strong><small>Days with reports</small></article>
        <article><span>Maximum Plant Load</span><strong>${selectedProduction.maxMw === null ? "-" : dashboardNumber(selectedProduction.maxMw, 1, "MW")}</strong><small>Hourly report</small></article>
      </div>

      <div class="dashboard-chart-grid">
        <section class="dashboard-chart-card trend-card">
          <div class="dashboard-chart-heading"><div><span>Weekly Trend</span><h3>Daily Production</h3></div><strong>kWh</strong></div>
          ${dashboardProductionTrend(weekProduction)}
        </section>
        <section class="dashboard-chart-card">
          <div class="dashboard-chart-heading"><div><span>Selected Day</span><h3>Production by Unit</h3></div><strong>kWh</strong></div>
          ${dashboardUnitBars(selectedProduction.units)}
        </section>
        <section class="dashboard-chart-card">
          <div class="dashboard-chart-heading"><div><span>Selected Day</span><h3>Unit Contribution</h3></div><strong>Share</strong></div>
          ${dashboardProductionPie(selectedProduction.units)}
        </section>
      </div>

      <section class="dashboard-maintenance-section">
        <div class="dashboard-section-heading">
          <div><span>Maintenance Reporting</span><h3>Daily and Weekly Activity</h3></div>
          ${dashboardOpenControl("work")}
        </div>
        <div class="maintenance-report-summary">
          <article><span>Selected Day</span><strong>${dashboardInteger(maintenanceReports.today.length)}</strong><small>reports</small></article>
          <article><span>This Week</span><strong>${dashboardInteger(maintenanceReports.week.length)}</strong><small>${esc(dashboardShortDate(weekDates[0]))} - ${esc(dashboardShortDate(weekDates[6]))}</small></article>
          <article><span>Approved</span><strong>${dashboardInteger(maintenanceReports.approved)}</strong><small>weekly reports</small></article>
          <article><span>Pending</span><strong>${dashboardInteger(maintenanceReports.pending)}</strong><small>weekly reports</small></article>
        </div>
        <div class="maintenance-report-grid">
          <div class="maintenance-chart-wrap">
            <h4>Reports by Day</h4>
            ${dashboardMaintenanceBars(maintenanceReports.dailyCounts)}
          </div>
          <div class="maintenance-list-wrap">
            <h4>Reports This Week</h4>
            ${dashboardMaintenanceRows(maintenanceReports.week)}
          </div>
        </div>
      </section>
    </section>

    <section class="panel dashboard-output-panel">
      <div class="toolbar">
        <h2>All Module Outputs</h2>
        <span class="status-pill">${moduleOutputs.length} modules</span>
      </div>
      <div class="dashboard-output-grid">
        <section>
          <h3>Plant Operation Report</h3>
          <table class="dashboard-output-table">
            <thead><tr><th>Module</th><th>Latest Output</th><th>Status</th><th></th></tr></thead>
            <tbody>${operationOutputs.map(dashboardModuleRow).join("")}</tbody>
          </table>
        </section>
        <section>
          <h3>Plant Maintenance and Admin</h3>
          <table class="dashboard-output-table">
            <thead><tr><th>Module</th><th>Latest Output</th><th>Status</th><th></th></tr></thead>
            <tbody>${maintenanceOutputs.map(dashboardModuleRow).join("")}</tbody>
          </table>
        </section>
      </div>
    </section>

    <div class="grid two-col" style="margin-top:14px">
      <section class="panel">
        <div class="toolbar">
          <h2>Maintenance Mix</h2>
          <button class="secondary-button" data-view-jump="work">Open Work</button>
        </div>
        ${progressRow("Preventive", dashboard.maintenanceMix.preventive, 4)}
        ${progressRow("Corrective", dashboard.maintenanceMix.corrective, 4)}
        ${progressRow("Inspection", dashboard.maintenanceMix.inspection, 4)}
      </section>

      <section class="panel">
        <h2>Recent Operations Log</h2>
        <div class="timeline" style="margin-top:13px">
          ${dashboard.recentLogEntries.map(entry => `
            <div class="timeline-item">
              <div class="toolbar">
                <strong>${esc(entry.unit)} - ${esc(entry.type)}</strong>
                ${badge(entry.severity)}
              </div>
              <p>${esc(entry.description)}</p>
              <span class="muted">${fmtDate(entry.entryTime)}</span>
            </div>
          `).join("")}
        </div>
      </section>
    </div>
  `;
}

function renderProduction() {
  const rows = productionRows();
  const meta = productionMeta();
  const totals = productionTotals(rows);
  const canProductionEntry = canEnterProduction();
  const canProductionManage = canManageProduction();
  const canProductionExport = canExportProduction();
  const canProductionSubmit = canSubmitProduction();
  const isRejected = Boolean(meta.rejectedAt);
  const isSubmitted = Boolean(meta.submittedAt) && !isRejected;
  const isApproved = Boolean(meta.approvedAt);
  const isPending = isSubmitted && !isApproved;
  const approvalReady = productionApprovalReady(state.productionDate);
  const canEditProduction = canEditProductionSheet(meta);
  const actionTitle = approvalReady ? "Ready now" : "Available after the 24-hour production day is complete";
  const workflowActions = [
    canProductionExport ? `<button class="button" id="export-production-xlsx" type="button" title="${esc(actionTitle)}">Download XLSX</button>` : "",
    canProductionExport ? `<button class="button light" id="export-production-csv" type="button" title="${esc(actionTitle)}">Download CSV</button>` : "",
    canProductionExport ? `<button class="button light" id="export-production-pdf" type="button" title="${esc(actionTitle)}">Download PDF</button>` : "",
    canProductionSubmit && canEditProduction && !isSubmitted && !isApproved ? `<button class="button" id="submit-production" type="button" title="${esc(actionTitle)}">${isRejected ? "Resubmit Sheet" : "Submit Sheet"}</button>` : "",
    canProductionSubmit && isSubmitted ? `<button class="button" id="create-next-production" type="button">Create Next Day Empty Sheet</button>` : "",
    isPending ? `<button class="secondary-button" type="button" disabled>Pending</button>` : "",
    `<span class="operation-status">${submissionBadge(meta)}</span>`
  ].filter(Boolean).join("");
  const workflowStatus = isApproved ? "Approved" : isRejected ? "Rejected" : isPending ? "Pending" : "Draft";
  const latestRow = rows.slice().reverse().find(row => rowProductionTotal(row).mw > 0) || rows[0];
  const latestUnits = ["u1", "u2", "u3"].map((key, index) => ({ label: `Unit ${index + 1}`, mw: Number(latestRow[key].mw || 0) }));
  const maxUnitMw = Math.max(...latestUnits.map(unit => unit.mw), 1);
  const productionDisabled = canEditProduction ? "" : "disabled";
  const sheetInput = (index, field, value, step = "any", extra = "") => `<input class="sheet-input ${extra}" data-production-field="${esc(field)}" data-production-index="${index}" type="number" step="${esc(step)}" value="${esc(value)}" ${productionDisabled}>`;
  const metaInput = (field, value, extra = "") => `<input class="sheet-input ${extra}" data-production-meta="${esc(field)}" type="text" value="${esc(value)}" ${productionDisabled}>`;
  const linkedValue = (value, decimals, source) => {
    const number = Number(value);
    const display = hasValue(value) && Number.isFinite(number) ? number.toFixed(decimals) : "";
    return `<output class="sheet-input linked-sheet-input" title="Linked from ${esc(source)}">${esc(display)}</output>`;
  };
  const energyCell = selector => productionValues(rows, selector).length ? (productionStat(rows, selector, "avg") * 24).toFixed(1) : "";
  const unitCells = (row, index, key) => `
    <td>${sheetInput(index, `${key}.mw`, row[key].mw)}</td>
    <td>${sheetInput(index, `${key}.mvar`, row[key].mvar)}</td>
    <td>${sheetInput(index, `${key}.kv`, row[key].kv)}</td>
    <td>${sheetInput(index, `${key}.current`, row[key].current)}</td>
  `;
  const statCell = (selector, type, decimals = 1) => productionValues(rows, selector).length ? Number(productionStat(rows, selector, type)).toFixed(decimals) : "";
  const statRow = (label, type) => `
    <tr class="excel-summary">
      <th>${esc(label)}</th>
      <th>${statCell(row => row.freq, type, 2)}</th>
      <th>${statCell(row => row.busKv, type, 2)}</th>
      <th>${statCell(row => row.u1.mw, type, 1)}</th>
      <th>${statCell(row => row.u1.mvar, type, 1)}</th>
      <th>${statCell(row => row.u1.kv, type, 2)}</th>
      <th>${statCell(row => row.u1.current, type, 0)}</th>
      <th>${statCell(row => row.u2.mw, type, 1)}</th>
      <th>${statCell(row => row.u2.mvar, type, 1)}</th>
      <th>${statCell(row => row.u2.kv, type, 2)}</th>
      <th>${statCell(row => row.u2.current, type, 0)}</th>
      <th>${statCell(row => row.u3.mw, type, 1)}</th>
      <th>${statCell(row => row.u3.mvar, type, 1)}</th>
      <th>${statCell(row => row.u3.kv, type, 2)}</th>
      <th>${statCell(row => row.u3.current, type, 0)}</th>
      <th>${statCell(row => rowHasPowerData(row) ? rowProductionTotal(row).mw : "", type, 1)}</th>
      <th>${statCell(row => rowHasPowerData(row) ? rowProductionTotal(row).mvar : "", type, 1)}</th>
    </tr>
  `;
  document.getElementById("production").innerHTML = `
    ${operationHead("Hourly Report", workflowActions || `<span class="status-pill">Read only</span>`)}
    ${summaryStrip([
      { label: "Total Output", value: `${totals.currentMw.toFixed(1)} MW`, note: "current plant generation", tone: "green" },
      { label: "Daily Energy", value: hasValue(meta.totalProduction) ? `${Number(meta.totalProduction).toFixed(3)} MWh` : "-", note: "Daily Production", tone: "green" },
      { label: "Max Output", value: `${totals.maxMw.toFixed(1)} MW`, note: "highest recorded total", tone: "green" },
      { label: "Water Level", value: meta.waterLevel || "-", note: "meter reading" }
    ])}
    <section class="panel production-workflow">
      <div class="toolbar">
        <div>
          <h2>Production Approval</h2>
          <p class="muted" style="margin-bottom:0">
            Status: ${esc(workflowStatus)}
            ${isSubmitted ? ` | Submitted by ${esc(meta.submittedByName || "Operator")} at ${esc(new Date(meta.submittedAt).toLocaleString())}` : ""}
            ${isApproved ? ` | Approved by ${esc(meta.approvedByName || "Operation Manager")} at ${esc(new Date(meta.approvedAt).toLocaleString())}` : ""}
          </p>
        </div>
        <span class="status-pill">${isApproved ? "Locked approved sheet" : isRejected ? "Returned to operator" : isPending ? "Pending Operation Manager review" : approvalReady ? "Ready to submit and download" : "Operator entry open until 24 hours"}</span>
      </div>
      ${state.productionNotice ? `<p class="notice-line">${esc(state.productionNotice)}</p>` : ""}
      ${productionReviewPanel("hourly", state.productionDate || todayDateValue(), meta)}
    </section>
    <section class="panel production-panel">
      <div class="toolbar">
        <div>
          <h2>Daily Generation Sheet</h2>
        </div>
        <div class="date-actions">
          <label class="date-field">Date <input id="production-date" type="date" value="${esc(state.productionDate || todayDateValue())}"></label>
          <button class="button light" id="production-today" type="button">Today</button>
          ${canProductionManage && (!isApproved || canAdminOverride()) ? `<button class="secondary-button" id="production-clear" type="button">Empty Table</button>` : `<span class="status-pill">${canEditProduction ? "Operator entry enabled" : isApproved ? "Approved locked" : "Read only for this role"}</span>`}
        </div>
      </div>
      <div class="sheet-wrap">
        <table class="sheet-table production-excel">
          <thead>
            <tr>
              <th colspan="12"></th>
              <th colspan="5" class="excel-date">Date: ${esc(formatSheetDate(state.productionDate))}</th>
            </tr>
            <tr>
              <th rowspan="2">TIME<br>Hrs.</th>
              <th rowspan="2">Generator<br>Frequency<br>Hz.</th>
              <th rowspan="2">Bus voltage<br>KV.</th>
              <th colspan="4" class="excel-group">UNIT 1</th>
              <th colspan="4" class="excel-group">UNIT 2</th>
              <th colspan="4" class="excel-group">UNIT 3</th>
              <th rowspan="2">Total<br>MW</th>
              <th rowspan="2">Total<br>MVAR</th>
            </tr>
            <tr>
              ${["Active Power MW", "Reactive Power MVAR", "Voltage KV", "Current A"].map(label => `<th>${esc(label)}</th>`).join("")}
              ${["Active Power MW", "Reactive Power MVAR", "Voltage KV", "Current A"].map(label => `<th>${esc(label)}</th>`).join("")}
              ${["Active Power MW", "Reactive Power MVAR", "Voltage KV", "Current A"].map(label => `<th>${esc(label)}</th>`).join("")}
            </tr>
          </thead>
          <tbody>
            ${rows.map((row, index) => {
              const total = rowProductionTotal(row);
              return `
                  <tr class="${row.highlight ? "excel-highlight" : ""}">
                  <th>${esc(row.time)}</th>
                  <td>${sheetInput(index, "freq", row.freq)}</td>
                  <td>${sheetInput(index, "busKv", row.busKv)}</td>
                  ${unitCells(row, index, "u1")}
                  ${unitCells(row, index, "u2")}
                  ${unitCells(row, index, "u3")}
                  <th>${rowTotalDisplay(row, "mw")}</th>
                  <th>${rowTotalDisplay(row, "mvar")}</th>
                </tr>
              `;
            }).join("")}
          </tbody>
          <tfoot>
            ${statRow("Max", "max")}
            ${statRow("Min", "min")}
            ${statRow("AVR", "avg")}
          </tfoot>
        </table>
      </div>
    </section>
    <section class="panel production-sheet-footer">
      <div class="production-bottom-grid">
        <table class="sheet-table production-mini-table production-day-table">
          <tbody>
            <tr><th>Production</th><th>Unit #1</th><th>Unit #2</th><th>Unit #3</th><th>Total Production</th></tr>
            <tr class="excel-summary"><td>MWh <small class="linked-source">Linked</small></td><td>${linkedValue(meta.mwh?.[0], 3, "Daily Production")}</td><td>${linkedValue(meta.mwh?.[1], 3, "Daily Production")}</td><td>${linkedValue(meta.mwh?.[2], 3, "Daily Production")}</td><td>${linkedValue(meta.totalProduction, 3, "Daily Production")}</td></tr>
            <tr><th>Service<br>Hour</th><td>${metaInput("service.0", meta.service?.[0] || "")}</td><td>${metaInput("service.1", meta.service?.[1] || "")}</td><td>${metaInput("service.2", meta.service?.[2] || "")}</td><td rowspan="2" class="aux-cell">Auxiliary (kWh)<br>${linkedValue(meta.auxiliary, 3, "Daily Production")}</td></tr>
            <tr><th>Outage Hour</th><td>${metaInput("outage.0", meta.outage?.[0] || "")}</td><td>${metaInput("outage.1", meta.outage?.[1] || "")}</td><td>${metaInput("outage.2", meta.outage?.[2] || "")}</td></tr>
            <tr><th rowspan="2">GCB</th><td><strong class="red-text">Open</strong> ${metaInput("gcbOpen.0", meta.gcbOpen?.[0] || "")}</td><td>${metaInput("gcbOpen.1", meta.gcbOpen?.[1] || "")}</td><td>${metaInput("gcbOpen.2", meta.gcbOpen?.[2] || "")}</td><td rowspan="2" class="aux-cell">WATER LEVEL (m.a.s.l)<br>${linkedValue(meta.waterLevel, 3, "Water Level")}</td></tr>
            <tr><td><strong class="blue-text">Close</strong> ${metaInput("gcbClose.0", meta.gcbClose?.[0] || "")}</td><td>${metaInput("gcbClose.1", meta.gcbClose?.[1] || "")}</td><td>${metaInput("gcbClose.2", meta.gcbClose?.[2] || "")}</td></tr>
          </tbody>
        </table>
        <table class="sheet-table production-mini-table production-shift-table">
          <tbody>
            <tr><th>Shift</th><th>Operators Name</th><th>Group</th></tr>
            ${meta.shifts.map((shift, index) => `
              <tr>
                <th>${esc(shift.name)}</th>
                <td>${metaInput(`shifts.${index}.operators`, shift.operators, "wide")}</td>
                <td>${metaInput(`shifts.${index}.group`, shift.group)}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    </section>
    ${renderProductionGraphs(rows, totals)}
  `;
}

function progressRow(label, value, total) {
  const pct = Math.min(100, Math.round((value / Math.max(total, 1)) * 100));
  return `
    <div style="margin:14px 0">
      <div class="toolbar" style="margin-bottom:7px"><span>${esc(label)}</span><strong>${value}</strong></div>
      <div class="bar"><span style="width:${pct}%"></span></div>
    </div>
  `;
}

function renderAssets() {
  const assets = filtered(state.data.assets, ["code", "name", "type", "location", "status"]);
  const assetTypes = state.data.assetTypes || Array.from(new Set(state.data.assets.map(asset => asset.type).filter(Boolean))).map(type => ({ id: type, code: type, name: type, group: "Existing", active: true }));
  const critical = assets.filter(asset => asset.criticality === "Critical").length;
  const inService = assets.filter(asset => ["Operational", "Online", "Available"].includes(asset.status)).length;
  const locations = new Set(assets.map(asset => asset.location).filter(Boolean)).size;
  const activeTypes = assetTypes.filter(type => type.active !== false).length;
  const depthFor = asset => {
    let depth = 0;
    let current = asset;
    while (current?.parentId) {
      depth += 1;
      current = state.data.assets.find(candidate => candidate.id === current.parentId);
    }
    return Math.min(depth, 3);
  };
  document.getElementById("assets").innerHTML = `
    ${moduleHead("Asset Management", "Structured plant asset registry for turbines, generators, switchyard, auxiliaries, civil structures, and control systems.", `<span class="status-pill">${assets.length} visible</span>`)}
    ${summaryStrip([
      { label: "Total Assets", value: assets.length, note: "registered equipment" },
      { label: "Critical", value: critical, note: "high consequence items", tone: "red" },
      { label: "In Service", value: inService, note: "available or operational", tone: "green" },
      { label: "Asset Types", value: activeTypes, note: `${locations} plant areas` }
    ])}
    <section class="panel" style="margin-bottom:14px">
      <div class="toolbar">
        <div>
          <h2>Asset Types</h2>
        </div>
        ${canManageDataControl() ? `<button class="button" id="new-asset-type">Add Asset Type</button>` : `<span class="status-pill">Read only for this role</span>`}
      </div>
      <div class="type-grid">
        ${assetTypes.map(type => `
          <div class="type-chip">
            <strong>${esc(type.name)}</strong>
            <span>${esc(type.code || "")}${type.group ? ` - ${esc(type.group)}` : ""}</span>
          </div>
        `).join("")}
      </div>
    </section>
    <section class="archive-shell">
      <div class="toolbar">
        <h2>Asset Registry</h2>
        <span class="status-pill">${assets.length} assets</span>
      </div>
      <div class="asset-tree">
        ${assets.map(asset => `
          <div class="asset-row indent-${depthFor(asset)}">
            <div>
              <strong>${esc(asset.code)} - ${esc(asset.name)}</strong>
              <p class="muted">${esc(asset.type)} - ${esc(asset.location)} - ${esc(asset.manufacturer)} ${esc(asset.model)}</p>
            </div>
            <div>
              ${badge(asset.criticality)}
              ${badge(asset.status)}
            </div>
          </div>
        `).join("")}
      </div>
    </section>
  `;
}

function renderWork() {
  const workOrders = filtered(state.data.workOrders, ["number", "title", "assetName", "status", "priority", "type", "assignedName", "createdByName", "description", "materialsRequired"])
    .sort(compareWorkOrdersForDisplay);
  const open = workOrders.filter(wo => !["Closed", "Cancelled", "Verified"].includes(wo.status));
  const newOrders = open.filter(isNewWorkOrder);
  const dueSoon = open.filter(wo => workOrderDueInfo(wo).isDueSoon);
  const overdue = open.filter(wo => workOrderDueInfo(wo).isOverdue);
  const critical = open.filter(wo => wo.priority === "Critical").length;
  const inProgress = workOrders.filter(wo => wo.status === "In Progress").length;
  const closed = workOrders.filter(wo => ["Closed", "Verified"].includes(wo.status)).length;
  const assignedPeople = new Set(workOrders.flatMap(workOrderAssigneeIds)).size;
  const canExportWorkOrders = can("report.export") || can("work_order.create") || can("work_order.update");
  const headActions = `
    ${can("work_order.create") || canExportWorkOrders ? `<div class="work-order-head-actions">
      ${can("work_order.create") ? `<button class="button" id="new-work-order">Create Work Order</button>` : ""}
      ${canExportWorkOrders ? `
        <button class="button light" id="export-work-xlsx" type="button">Download Excel</button>
        <button class="button light" id="export-work-word" type="button">Download Word</button>
        <button class="button light" id="export-work-pdf" type="button">Print PDF</button>
      ` : ""}
    </div>` : ""}
    ${!can("work_order.create") && !(can("report.export") || can("work_order.update")) ? `<span class="status-pill">Read only</span>` : ""}
  `;
  document.getElementById("work").innerHTML = `
    ${moduleHead("Work Orders", "Control corrective, preventive, emergency, inspection, calibration, and overhaul work from request to closure.", headActions)}
    ${summaryStrip([
      { label: "Open", value: open.length, note: "active work orders" },
      { label: "New", value: newOrders.length, note: "created in last 3 days", tone: "green" },
      { label: "Due in 3 Days", value: dueSoon.length, note: "upcoming deadlines", tone: "amber" },
      { label: "Overdue", value: overdue.length, note: "past due date", tone: "red" },
      { label: "Critical", value: critical, note: "priority attention", tone: "red" },
      { label: "In Progress", value: inProgress, note: "being executed", tone: "amber" },
      { label: "Closed", value: closed, note: "completed records", tone: "green" },
      { label: "Assigned People", value: assignedPeople, note: "current list" }
    ])}
    ${state.workNotice ? `<p class="notice-line">${esc(state.workNotice)}</p>` : ""}
    <section class="panel">
      <div class="toolbar">
        <h2>Work Control</h2>
        ${can("work_order.create") ? `<span class="status-pill">Planner controls enabled</span>` : `<span class="status-pill">Read only for this role</span>`}
      </div>
      <table class="work-order-table">
        <thead>
          <tr><th>No.</th><th>Work Order</th><th>Asset</th><th>Type</th><th>Priority</th><th>Status</th><th>Assigned People</th><th>Due</th><th>Controls</th><th></th></tr>
        </thead>
        <tbody>
          ${workOrders.map(wo => {
            const due = workOrderDueInfo(wo);
            const isNew = isNewWorkOrder(wo);
            const isOwn = String(wo.createdBy || "") === String(state.currentUserId || "");
            return `
            <tr class="${isNew ? "work-order-new-row" : ""}">
              <td><strong>${esc(wo.number)}</strong></td>
              <td>
                <div class="work-order-title-line"><strong>${esc(wo.title)}</strong>${isNew ? badge("New", "green") : ""}${isOwn ? badge("Mine", "green") : ""}</div>
                <div class="work-order-creator">Created by <strong>${esc(wo.createdByName || "Unknown")}</strong></div>
                ${wo.description ? `<p class="muted">${esc(wo.description)}</p>` : ""}
                ${wo.completionNotes ? `<p class="muted">Notes: ${esc(wo.completionNotes)}</p>` : ""}
              </td>
              <td>${esc(wo.assetName)}</td>
              <td>${esc(wo.type)}</td>
              <td>${badge(wo.priority)}</td>
              <td>${badge(wo.status, workOrderStatusTone(wo.status))}</td>
              <td>${esc(workOrderAssigneeNames(wo))}</td>
              <td><div class="due-date-stack"><strong>${esc(fmtDate(wo.dueDate) || "No due date")}</strong>${wo.dueDate ? badge(due.label, due.tone) : ""}</div></td>
              <td>${wo.safetyRequired ? badge("Safety", "amber") : badge("Safety N/A", "blue")} ${wo.lotoRequired ? badge("LOTO", "red") : badge("No LOTO", "blue")}</td>
              <td>
                <div class="actions-row">
                  <button class="secondary-button" data-view-wo="${esc(wo.id)}" type="button">Details</button>
                  <button class="secondary-button" data-print-wo="${esc(wo.id)}" type="button">Print One</button>
                  ${canAdminOverride() ? `<button class="secondary-button" data-edit-wo="${esc(wo.id)}" type="button">Edit</button><button class="danger-button" data-revert-wo="${esc(wo.id)}" type="button">Revert</button><button class="danger-button" data-delete-wo="${esc(wo.id)}" type="button">Delete</button>` : ""}
                  ${canApproveWorkOrderStart(wo) ? `<button class="button" data-approve-wo="${esc(wo.id)}" data-work-action="approve" type="button">Approve</button><button class="danger-button" data-approve-wo="${esc(wo.id)}" data-work-action="reject" type="button">Reject</button>` : ""}
                  ${canSubmitWorkOrderCompletion(wo) ? `<button class="button" data-complete-wo="${esc(wo.id)}" type="button">Submit Report</button>` : ""}
                  ${canApproveMaintenance() && wo.status === "Pending Review" ? `<button class="button" data-view-wo="${esc(wo.id)}" type="button">Final Review</button>` : ""}
                </div>
              </td>
            </tr>
          `}).join("")}
        </tbody>
      </table>
    </section>
  `;
}

function renderPm() {
  const pms = filtered(state.data.pmSchedules, ["name", "assetName", "frequency", "jobPlan"]);
  const types = filtered(state.data.maintenanceTypes || [], ["code", "name", "category", "description"]);
  const today = new Date().toISOString().slice(0, 10);
  const due = pms.filter(pm => pm.nextDue && pm.nextDue <= today).length;
  const active = pms.filter(pm => pm.active !== false).length;
  const assetCount = new Set(pms.map(pm => pm.assetId || pm.assetName).filter(Boolean)).size;
  const activeTypes = types.filter(type => type.active !== false).length;
  const plannedTypes = types.filter(type => ["Planned", "Planned Outage", "Compliance", "Condition-Based"].includes(type.category)).length;
  document.getElementById("pm").innerHTML = `
    ${moduleHead("Plant Maintenance Types", "PM schedules and maintenance classification are managed together for cleaner planning, work order reporting, and KPI grouping.", canManageDataControl() ? `<button class="button" data-view-jump="data" data-collection-jump="maintenanceTypes">Add Types</button>` : `<span class="status-pill">${active} active plans</span>`)}
    ${summaryStrip([
      { label: "Schedules", value: pms.length, note: "visible PM plans" },
      { label: "Due Now", value: due, note: "needs planning", tone: due ? "amber" : "green" },
      { label: "Active PM", value: active, note: `${assetCount} assets covered`, tone: "green" },
      { label: "Active Types", value: activeTypes, note: `${plannedTypes} planned classes` }
    ])}
    <section class="panel" style="margin-bottom:14px">
      <div class="toolbar">
        <div>
          <h2>Preventive Schedules</h2>
        </div>
        <span class="status-pill">${active} active plans</span>
      </div>
    </section>
    <div class="grid three-col">
      ${pms.map(pm => `
        <article class="card">
          <div class="toolbar">
            <h2>${esc(pm.name)}</h2>
            ${badge(pm.frequency)}
          </div>
          <p><strong>${esc(pm.assetName)}</strong></p>
          <p>${esc(pm.jobPlan)}</p>
          <p class="muted">Next due ${fmtDate(pm.nextDue)}</p>
        </article>
      `).join("")}
    </div>
    <section class="panel" style="margin-top:14px">
      <div class="toolbar">
        <div>
          <h2>Maintenance Type Master</h2>
        </div>
        <span class="status-pill">${types.length} types</span>
      </div>
      <table>
        <thead><tr><th>Code</th><th>Name</th><th>Category</th><th>Description</th><th>Status</th></tr></thead>
        <tbody>
          ${types.map(type => `
            <tr>
              <td><strong>${esc(type.code)}</strong></td>
              <td>${esc(type.name)}</td>
              <td>${badge(type.category || "General")}</td>
              <td>${esc(type.description || "")}</td>
              <td>${type.active !== false ? badge("Active", "green") : badge("Inactive", "red")}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </section>
  `;
}

function commissioningReportFiles() {
  return filtered(
    (state.data.attachments || []).filter(file => file.module === "commissioning-test-reports"),
    ["name", "reportNumber", "reportTitle", "category", "testResult", "witnessedBy", "linkedName", "description", "uploadedByName"]
  );
}

function commissioningReportGroups() {
  const grouped = new Map();
  commissioningReportFiles().forEach(file => {
    const key = String(file.reportNumber || file.id);
    if (!grouped.has(key)) {
      grouped.set(key, {
        reportNumber: file.reportNumber || "Unnumbered",
        reportTitle: file.reportTitle || fileBaseName(file.name),
        category: file.category || "Test Report",
        testResult: file.testResult || "Pending",
        witnessedBy: file.witnessedBy || "",
        linkedId: file.linkedId || "",
        linkedName: file.linkedName || "General plant",
        documentDate: file.documentDate || "",
        description: file.description || "",
        uploadedByName: file.uploadedByName || "",
        uploadedAt: file.uploadedAt || "",
        files: []
      });
    }
    grouped.get(key).files.push(file);
  });
  return Array.from(grouped.values()).sort((left, right) => {
    const leftDate = left.documentDate || left.uploadedAt || "";
    const rightDate = right.documentDate || right.uploadedAt || "";
    return String(rightDate).localeCompare(String(leftDate));
  });
}

function commissioningResultTone(result) {
  if (result === "Passed") return "green";
  if (result === "Failed") return "red";
  if (result === "Passed with Observations") return "amber";
  return "blue";
}

function commissioningReportWorkbookRows() {
  return [
    ["Report Number", "Report Title", "Asset / System", "Report Type", "Test Date", "Result", "Witnessed By", "Files", "Uploaded By", "Uploaded At", "Notes"],
    ...commissioningReportGroups().map(report => [
      report.reportNumber,
      report.reportTitle,
      report.linkedName,
      report.category,
      report.documentDate,
      report.testResult,
      report.witnessedBy,
      report.files.map(file => file.name).join("; "),
      report.uploadedByName,
      report.uploadedAt,
      report.description
    ])
  ];
}

function renderCommissioningReports() {
  const reports = commissioningReportGroups();
  const totalFiles = reports.reduce((sum, report) => sum + report.files.length, 0);
  const passed = reports.filter(report => report.testResult === "Passed").length;
  const attention = reports.filter(report => ["Failed", "Passed with Observations"].includes(report.testResult)).length;
  const assets = new Set(reports.map(report => report.linkedId).filter(Boolean)).size;
  const canUpload = can("file.upload");
  const canExport = can("report.export");
  const actions = `
    ${canUpload ? `<button class="button" id="new-commissioning-report" type="button">Add Report</button>` : ""}
    ${canExport ? `<button class="button light" id="export-commissioning-register" type="button">Download Register</button>` : ""}
    ${reports.length ? `<button class="button light" id="print-commissioning-register" type="button">Print Register</button>` : ""}
  `;
  document.getElementById("commissioningReports").innerHTML = `
    ${moduleHead("Commissioning and Test Report", "Commissioning, acceptance, functional, protection, and performance test records.", actions, "Plant Maintenance Report")}
    ${summaryStrip([
      { label: "Reports", value: reports.length, note: `${totalFiles} stored files` },
      { label: "Passed", value: passed, note: "accepted results", tone: "green" },
      { label: "Attention", value: attention, note: "observations or failures", tone: attention ? "amber" : "green" },
      { label: "Assets", value: assets, note: "covered systems" }
    ])}
    ${state.commissioningNotice ? `<p class="notice-line">${esc(state.commissioningNotice)}</p>` : ""}
    <section class="panel">
      <div class="toolbar">
        <h2>Report Register</h2>
        <span class="status-pill">Locked after upload</span>
      </div>
      <table class="commissioning-report-table">
        <thead><tr><th>Report</th><th>Asset / System</th><th>Type</th><th>Test Date</th><th>Result</th><th>Witnessed By</th><th>Files</th><th>Actions</th></tr></thead>
        <tbody>
          ${reports.length ? reports.map(report => `
            <tr>
              <td><strong>${esc(report.reportNumber)}</strong><p class="muted">${esc(report.reportTitle)}</p>${report.description ? `<p class="muted">${esc(report.description)}</p>` : ""}</td>
              <td>${esc(report.linkedName)}</td>
              <td>${badge(report.category)}</td>
              <td>${esc(fmtDate(report.documentDate) || "-")}</td>
              <td>${badge(report.testResult, commissioningResultTone(report.testResult))}</td>
              <td>${esc(report.witnessedBy || "-")}</td>
              <td>${report.files.map(file => `<div><strong>${esc(file.name)}</strong><small class="muted"> ${esc(fileSize(file.size))}</small></div>`).join("")}</td>
              <td><div class="actions-row">
                ${report.files.map(file => `<button class="secondary-button" data-download-attachment="${esc(file.id)}" type="button">Download</button>${canAdminOverride() ? `<button class="danger-button" data-delete-attachment="${esc(file.id)}" type="button">Delete</button>` : ""}`).join("")}
              </div></td>
            </tr>
          `).join("") : `<tr><td colspan="8"><div class="dashboard-empty-state">No commissioning or test report recorded.</div></td></tr>`}
        </tbody>
      </table>
    </section>
  `;
}

function renderLogbookCategory(viewId, category, title) {
  const logs = filtered(state.data.logEntries.filter(log => (log.category || "operations") === category), ["unit", "type", "severity", "description", "assetName"]);
  const today = new Date().toISOString().slice(0, 10);
  const todayLogs = logs.filter(log => String(log.entryTime || "").slice(0, 10) === today).length;
  const warnings = logs.filter(log => ["Warning", "Alarm"].includes(log.severity)).length;
  const critical = logs.filter(log => log.severity === "Critical").length;
  const pendingApproval = logs.filter(log => (log.status || "Pending") === "Pending" || (log.status || "") === "Submitted").length;
  const canApprove = category === "maintenance" ? canApproveMaintenance() : canApproveOperations();
  const canCreate = category === "maintenance" ? canCreateMaintenanceLogbook() : canCreateOperationsLogbook();
  const headActions = canCreate ? `<button class="button" data-new-log-entry="${esc(category)}">Add Log Entry</button>` : `<span class="status-pill">Read only</span>`;
  const entryHtml = log => `
    <div class="timeline-item">
      <div class="toolbar">
        <strong>${esc(log.unit)} - ${esc(log.type)}</strong>
        <span>${badge(log.severity)} ${badge(log.status === "Submitted" ? "Pending" : log.status || "Pending", log.status === "Approved" ? "green" : log.status === "Rejected" ? "red" : "amber")}</span>
      </div>
      <p>${esc(log.description)}</p>
      <span class="muted">${fmtDate(log.entryTime)} - ${esc(category === "operations" ? operationShiftLabel(log.shift) : `${log.shift} shift`)} - ${esc(log.createdByName)}${log.approvedByName ? ` - approved by ${esc(log.approvedByName)}` : ""}</span>
      ${log.reviewComment ? `<p class="review-comment"><strong>Manager comment:</strong> ${esc(log.reviewComment)}</p>` : ""}
      ${canApprove && !["Approved", "Rejected"].includes(log.status || "Submitted") ? `
        <div class="review-panel review-amber">
          <label class="review-comment-field">Comment
            <textarea id="log-review-comment-${esc(log.id)}" rows="2" placeholder="Enter review comment"></textarea>
          </label>
          <div class="actions-row">
            <button class="button" data-review-log="${esc(log.id)}" data-log-action="approve" data-log-category="${esc(category)}">Approve</button>
            <button class="danger-button" data-review-log="${esc(log.id)}" data-log-action="reject" data-log-category="${esc(category)}">Reject</button>
          </div>
        </div>
      ` : ""}
      ${canAdminOverride() ? `
        <div class="actions-row">
          <button class="secondary-button" data-edit-log="${esc(log.id)}" data-log-category="${esc(category)}" type="button">Edit</button>
          <button class="danger-button" data-revert-log="${esc(log.id)}" data-log-category="${esc(category)}" type="button">Revert</button>
          <button class="danger-button" data-delete-log="${esc(log.id)}" data-log-category="${esc(category)}" type="button">Delete</button>
        </div>
      ` : ""}
    </div>
  `;
  const shiftContent = category === "operations" ? `
    <div class="shift-log-grid">
      ${operationShiftBlocks.map(block => {
        const shiftLogs = logs.filter(log => log.shift === block.name);
        return `
          <section class="shift-log-block">
            <div class="shift-log-head">
              <div>
                <h3>${esc(block.name)} Shift</h3>
                <span>${esc(block.range)}</span>
              </div>
              ${badge(`${shiftLogs.length} entries`, shiftLogs.length ? "blue" : "green")}
            </div>
            <div class="timeline">
              ${shiftLogs.length ? shiftLogs.map(entryHtml).join("") : `<p class="empty-state">No entries for this shift.</p>`}
            </div>
          </section>
        `;
      }).join("")}
      ${logs.some(log => !operationShiftBlocks.some(block => block.name === log.shift)) ? `
        <section class="shift-log-block">
          <div class="shift-log-head">
            <div>
              <h3>Other Entries</h3>
              <span>Older Day/Night records</span>
            </div>
          </div>
          <div class="timeline">
            ${logs.filter(log => !operationShiftBlocks.some(block => block.name === log.shift)).map(entryHtml).join("")}
          </div>
        </section>
      ` : ""}
    </div>
  ` : `
    <div class="timeline">
      ${logs.length ? logs.map(entryHtml).join("") : `<p class="empty-state">No logbook entries.</p>`}
    </div>
  `;
  document.getElementById(viewId).innerHTML = `
    ${category === "operations" ? operationHead(title, headActions) : moduleHead(title, "", headActions)}
    ${summaryStrip([
      { label: "Entries", value: logs.length, note: "visible records" },
      { label: "Today", value: todayLogs, note: "current shift activity" },
      { label: "Warnings", value: warnings, note: "watch items", tone: "amber" },
      { label: "Pending Approval", value: pendingApproval, note: `${critical} critical`, tone: pendingApproval ? "amber" : "green" }
    ])}
    <section class="panel">
      <div class="toolbar">
        <h2>Shift Logbook</h2>
        ${canCreate ? `<span class="status-pill">Entry enabled</span>` : canApprove ? `<span class="status-pill">Approval enabled</span>` : `<span class="status-pill">Read only for this role</span>`}
      </div>
      ${shiftContent}
    </section>
  `;
}

function renderLogbook() {
  renderLogbookCategory("logbook", "operations", "Operations Logbook");
}

function renderMaintenanceLogbook() {
  renderLogbookCategory("maintenanceLogbook", "maintenance", "Maintenance Logbook");
}

function openLogEntryEditModal(log) {
  const category = log.category === "maintenance" ? "maintenance" : "operations";
  const typeOptions = category === "maintenance"
    ? ["Maintenance Activity", "Inspection", "Defect", "Testing", "Work Handover"]
    : ["Observation", "Status", "Abnormal Observation", "Inspection", "Dispatch Instruction"];
  const shiftOptions = category === "maintenance"
    ? ["Day", "Night"]
    : operationShiftBlocks.map(block => block.name);
  const statuses = ["Pending", "Approved", "Rejected"];
  openModal(`Edit ${category === "maintenance" ? "Maintenance" : "Operations"} Log Entry`, `
    <div class="form-grid">
      <label>Shift <select id="edit-log-shift">${shiftOptions.map(value => `<option ${value === log.shift ? "selected" : ""}>${esc(value)}</option>`).join("")}</select></label>
      <label>Entry Time <input id="edit-log-time" type="datetime-local" value="${esc(String(log.entryTime || "").slice(0, 16))}"></label>
      <label>Asset <select id="edit-log-asset">${optionList(state.data.assets, log.assetId)}</select></label>
      <label>Unit/System <input id="edit-log-unit" value="${esc(log.unit || "")}"></label>
      <label>Type <select id="edit-log-type">${typeOptions.map(value => `<option ${value === log.type ? "selected" : ""}>${esc(value)}</option>`).join("")}</select></label>
      <label>Severity <select id="edit-log-severity">${["Info", "Warning", "Critical"].map(value => `<option ${value === log.severity ? "selected" : ""}>${value}</option>`).join("")}</select></label>
      <label>Status <select id="edit-log-status">${statuses.map(value => `<option ${value === (log.status || "Pending") ? "selected" : ""}>${value}</option>`).join("")}</select></label>
      <label class="full">Description <textarea id="edit-log-description">${esc(log.description || "")}</textarea></label>
    </div>
    <div class="actions-row">
      <button class="button" id="save-log-entry-edit" data-log-id="${esc(log.id)}" data-log-category="${esc(category)}" type="button">Save Changes</button>
    </div>
  `);
}

function renderInventory() {
  const items = filtered(state.data.inventory, ["code", "name", "category", "location"]);
  const low = items.filter(item => item.qty <= item.min).length;
  const critical = items.filter(item => item.critical).length;
  const categories = new Set(items.map(item => item.category).filter(Boolean)).size;
  const totalQty = items.reduce((sum, item) => sum + Number(item.qty || 0), 0);
  document.getElementById("inventory").innerHTML = `
    ${moduleHead("Spare Parts Inventory", "Stores control for critical spares, consumables, tools, bearings, electrical parts, and station service materials.", `<span class="status-pill">${low} below minimum</span>`)}
    ${summaryStrip([
      { label: "Items", value: items.length, note: "catalog records" },
      { label: "Low Stock", value: low, note: "reorder required", tone: low ? "amber" : "green" },
      { label: "Critical Spares", value: critical, note: "plant reliability items", tone: "red" },
      { label: "Total Qty", value: totalQty, note: `${categories} categories` }
    ])}
    <section class="panel">
      <div class="toolbar">
        <h2>Stores and Critical Spares</h2>
        <span class="status-pill">${low} below minimum</span>
      </div>
      <table>
        <thead>
          <tr><th>Code</th><th>Item</th><th>Category</th><th>Stock</th><th>Minimum</th><th>Location</th><th>Critical</th><th></th></tr>
        </thead>
        <tbody>
          ${items.map(item => `
            <tr>
              <td><strong>${esc(item.code)}</strong></td>
              <td>${esc(item.name)}</td>
              <td>${esc(item.category)}</td>
              <td>${badge(`${item.qty} ${item.unit}`, item.qty <= item.min ? "amber" : "green")}</td>
              <td>${esc(item.min)} ${esc(item.unit)}</td>
              <td>${esc(item.location)}</td>
              <td>${item.critical ? badge("Critical", "red") : badge("Standard", "blue")}</td>
              <td>${can("inventory.adjust") ? `<button class="secondary-button" data-adjust-stock="${item.id}">Adjust</button>` : ""}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </section>
  `;
}

function renderReports() {
  const open = state.data.workOrders.filter(wo => !["Closed", "Cancelled", "Verified"].includes(wo.status));
  const low = state.data.inventory.filter(item => item.qty <= item.min);
  const criticalOpen = open.filter(wo => wo.priority === "Critical").length;
  const activePm = state.data.pmSchedules.filter(pm => pm.active !== false).length;
  const maintenanceExport = canExportMaintenanceReport();
  const reportActions = `
    ${maintenanceExport ? `<button class="button" id="export-maintenance-report" type="button">Download Maintenance Report</button>` : ""}
    <span class="status-pill">Live from local data</span>
  `;
  document.getElementById("reports").innerHTML = `
    ${moduleHead("Reports and KPI Dashboard", "Operational summaries for maintenance backlog, PM compliance, stores risk, audit trail, and management review.", reportActions)}
    <section class="panel production-workflow">
      <div class="toolbar">
        <div>
          <h2>Plant Maintenance Report</h2>
          <p class="muted">XLSX workbook for work orders, maintenance logbook, PM records, inventory, assets, and maintenance documents.</p>
        </div>
        ${maintenanceExport ? `<button class="button" id="export-maintenance-report-panel" type="button">Download Maintenance Report</button>` : `<span class="status-pill">Read only</span>`}
      </div>
    </section>
    ${summaryStrip([
      { label: "Open Work", value: open.length, note: "backlog load" },
      { label: "Critical Work", value: criticalOpen, note: "priority risk", tone: "red" },
      { label: "Active PM", value: activePm, note: "maintenance program", tone: "green" },
      { label: "Low Stock", value: low.length, note: "stores action", tone: low.length ? "amber" : "green" }
    ])}
    <div class="grid two-col">
      <section class="panel">
        <h2>Monthly O&M Summary</h2>
        <table>
          <tbody>
            <tr><th>Open work orders</th><td>${open.length}</td></tr>
            <tr><th>Critical work orders</th><td>${open.filter(wo => wo.priority === "Critical").length}</td></tr>
            <tr><th>Preventive schedules</th><td>${state.data.pmSchedules.length}</td></tr>
            <tr><th>Low stock items</th><td>${low.length}</td></tr>
            <tr><th>Logbook records</th><td>${state.data.logEntries.length}</td></tr>
          </tbody>
        </table>
      </section>
      <section class="panel">
        <h2>Recent Audit Trail</h2>
        <div class="timeline">
          ${state.data.auditLogs.map(log => `
            <div class="timeline-item">
              <strong>${esc(log.action)}</strong>
              <p class="muted">${fmtDate(log.at)} - ${esc(log.entity)} - ${esc(log.user)}</p>
            </div>
          `).join("")}
        </div>
      </section>
    </div>
  `;
}

function fileSize(bytes) {
  const value = Number(bytes || 0);
  if (value >= 1024 * 1024) return `${(value / (1024 * 1024)).toFixed(1)} MB`;
  if (value >= 1024) return `${Math.round(value / 1024)} KB`;
  return `${value} B`;
}

function attachmentLinkOptions() {
  const groups = [
    ["asset", "Asset", state.data.assets, item => `${item.code} - ${item.name}`],
    ["workOrder", "Work Order", state.data.workOrders, item => `${item.number} - ${item.title}`],
    ["maintenanceType", "Maintenance Type", state.data.maintenanceTypes || [], item => `${item.code} - ${item.name}`],
    ["pm", "PM Schedule", state.data.pmSchedules, item => item.name],
    ["inventory", "Inventory", state.data.inventory, item => `${item.code} - ${item.name}`],
    ["logbook", "Logbook", state.data.logEntries, item => `${item.unit} - ${item.type}`]
  ];
  return `<option value="">General library</option>${groups.map(([type, label, rows, text]) => `
    <optgroup label="${esc(label)}">
      ${rows.map(row => `<option value="${esc(type)}:${esc(row.id)}">${esc(text(row))}</option>`).join("")}
    </optgroup>
  `).join("")}`;
}

function attachmentModuleOptions(selected = "") {
  const modules = [
    ["", "Auto"],
    ["assets", "Assets"],
    ["work-orders", "Work Orders"],
    ["preventive", "Preventive"],
    ["maintenance-types", "Maintenance Types"],
    ["commissioning-test-reports", "Commissioning and Test Report"],
    ["logbook", "Logbook"],
    ["inventory", "Inventory"],
    ["plant-maintenance-archive", "Plant Maintenance Archive"],
    ["production", "Production"],
    ["reports", "Reports"],
    ["general", "General"]
  ];
  return modules.map(([value, label]) => `<option value="${esc(value)}" ${value === selected ? "selected" : ""}>${esc(label)}</option>`).join("");
}

function moduleNameLabel(value = "general") {
  if (value === "commissioning-test-reports") return "Commissioning and Test Report";
  return String(value || "general").split("-").map(part => part ? part[0].toUpperCase() + part.slice(1) : "").join(" ");
}

function isLegacyArchiveFolderName(name) {
  return legacyArchiveDirectoryKeys.has(String(name || "").trim().toLowerCase());
}

function hasUserArchiveFolderRecord(name) {
  const key = String(name || "").trim().toLowerCase();
  return (state.data.archiveFolders || []).some(folder => (
    String(folder.name || "").trim().toLowerCase() === key
    && folder.manual === true
  ));
}

function maintenanceArchiveFiles() {
  return (state.data.attachments || []).filter(file => (
    file.module === "plant-maintenance-archive"
    && file.archiveFolder
    && (!isLegacyArchiveFolderName(file.archiveFolder) || hasUserArchiveFolderRecord(file.archiveFolder))
  ));
}

function archiveFolderLabel(file) {
  if (file.archiveFolder) return file.archiveFolder;
  const parts = String(file.folder || "").split(/[\\/]+/).filter(Boolean);
  if (parts[0] === "plant-maintenance-archive") {
    const categoryLabel = moduleNameLabel(file.category || "").toLowerCase();
    const lastLabel = moduleNameLabel(parts[parts.length - 1] || "").toLowerCase();
    if (parts.length > 2 && lastLabel === categoryLabel) return moduleNameLabel(parts.slice(1, -1).join(" "));
    if (parts.length > 2) return moduleNameLabel(parts.slice(2).join(" "));
    if (parts.length > 1) return moduleNameLabel(parts.slice(1).join(" "));
  }
  return parts.length > 2 ? moduleNameLabel(parts.slice(2).join(" ")) : "General Archive";
}

function archiveFileKind(file) {
  const name = String(file.name || "");
  if (/\.(png|jpe?g|gif|bmp|webp|tif|tiff)$/i.test(name)) return "Photo";
  if (/\.pdf$/i.test(name)) return "PDF";
  if (/\.(doc|docx)$/i.test(name)) return "Word";
  if (/\.(xls|xlsx|csv)$/i.test(name)) return "Excel";
  if (/\.(ppt|pptx)$/i.test(name)) return "PowerPoint";
  if (/\.(zip|rar|7z)$/i.test(name)) return "Compressed";
  return file.category || "File";
}

function maintenanceArchiveFolderRecords() {
  const byName = new Map();
  const configuredFolders = Array.isArray(state.data.archiveFolders) ? state.data.archiveFolders : [];
  configuredFolders.forEach(folder => {
    const name = String(folder.name || "").trim();
    const legacySystemFolder = isLegacyArchiveFolderName(name) && folder.manual !== true;
    if (name && !legacySystemFolder) byName.set(name.toLowerCase(), { ...folder, name });
  });
  maintenanceArchiveFiles().forEach(file => {
    const name = archiveFolderLabel(file);
    const key = name.toLowerCase();
    if (!byName.has(key)) {
      byName.set(key, {
        id: `folder-${key}`,
        name,
        createdAt: file.uploadedAt,
        createdByName: file.uploadedByName || ""
      });
    }
  });
  return Array.from(byName.values()).sort((a, b) => a.name.localeCompare(b.name));
}

function maintenanceArchiveFolders() {
  return maintenanceArchiveFolderRecords().map(folder => folder.name);
}

function currentArchiveFolder(folders = maintenanceArchiveFolders()) {
  return folders.includes(state.archiveCurrentFolder) ? state.archiveCurrentFolder : folders[0] || "";
}

function archiveCategoryOptions(selected = "PDF") {
  return ["Photo", "PDF", "Drawing", "Manual", "Report", "Certificate", "Excel", "Word", "PowerPoint", "Archive", "Other"]
    .map(option => `<option ${option === selected ? "selected" : ""}>${esc(option)}</option>`)
    .join("");
}

function cleanArchiveFolderPart(value) {
  return String(value || "").replace(/[<>:"/\\|?*\x00-\x1f]/g, " ").replace(/\s+/g, " ").trim();
}

function combineArchiveFolderPath(parent, child) {
  const parentParts = String(parent || "").split(/[\\/]+| \/ /).map(cleanArchiveFolderPart).filter(Boolean);
  const childParts = String(child || "").split(/[\\/]+| \/ /).map(cleanArchiveFolderPart).filter(Boolean);
  const parentTail = parentParts.at(-1)?.toLowerCase();
  if (parentTail && childParts[0]?.toLowerCase() === parentTail) childParts.shift();
  if (parentTail && childParts.length === 1 && childParts[0].toLowerCase().startsWith(`${parentTail} `)) {
    childParts[0] = childParts[0].slice(parentTail.length).trim();
  }
  return [...parentParts, ...childParts].join(" / ");
}

function archiveFolderPathChain(name) {
  const parts = String(name || "").split(" / ").map(cleanArchiveFolderPart).filter(Boolean);
  return parts.map((_, index) => parts.slice(0, index + 1).join(" / "));
}

function folderDepth(name) {
  return String(name || "").split(" / ").filter(Boolean).length - 1;
}

function archiveParentFolder(name) {
  const parts = String(name || "").split(" / ").filter(Boolean);
  return parts.slice(0, -1).join(" / ");
}

function archiveFolderIsAncestor(folderName, targetFolder) {
  return Boolean(folderName && targetFolder && targetFolder.startsWith(`${folderName} / `));
}

function shouldShowArchiveFolder(folderName, currentFolder, searching = false) {
  if (searching) return true;
  if (!folderDepth(folderName)) return true;
  return folderName === currentFolder
    || archiveParentFolder(folderName) === currentFolder
    || archiveFolderIsAncestor(folderName, currentFolder);
}

function archiveFolderDisplayName(name) {
  const parts = String(name || "").split(" / ").filter(Boolean);
  return parts.at(-1) || name;
}

function fileBaseName(name) {
  return String(name || "").replace(/\.[^.]+$/, "");
}

function archiveSelectedFileRows(files) {
  return files.map((file, index) => `
    <label class="archive-selected-file">
      <span>${esc(file.name)}</span>
      <input data-archive-display-name="${index}" value="${esc(fileBaseName(file.name))}" placeholder="Clear document name">
    </label>
  `).join("");
}

function renderArchiveSelectedFiles(files) {
  const panel = document.getElementById("archive-selected-files");
  if (!panel) return;
  panel.innerHTML = files.length ? archiveSelectedFileRows(files) : "";
}

function archiveSearchText(file) {
  return [
    file.name,
    file.category,
    file.description,
    file.documentDate,
    file.archiveFolder,
    file.uploadedByName,
    archiveFileKind(file)
  ].join(" ").toLowerCase();
}

function renderMaintenanceArchive() {
  const allFiles = filtered(maintenanceArchiveFiles(), ["name", "category", "description", "documentDate", "archiveFolder", "uploadedByName", "folder"]);
  const archiveQuery = String(state.archiveSearch || "").trim().toLowerCase();
  const files = archiveQuery ? allFiles.filter(file => archiveSearchText(file).includes(archiveQuery)) : allFiles;
  const allFolderRecords = maintenanceArchiveFolderRecords();
  const folderRecords = archiveQuery
    ? allFolderRecords.filter(folder => folder.name.toLowerCase().includes(archiveQuery) || files.some(file => archiveFolderLabel(file) === folder.name))
    : allFolderRecords;
  const allFolders = allFolderRecords.map(folder => folder.name);
  const folders = folderRecords.map(folder => folder.name);
  const canUpload = can("file.upload");
  const totalSize = allFiles.reduce((sum, file) => sum + Number(file.size || 0), 0);
  const photoCount = allFiles.filter(file => archiveFileKind(file) === "Photo").length;
  const pdfCount = allFiles.filter(file => archiveFileKind(file) === "PDF").length;
  const currentFolder = currentArchiveFolder(folders.length ? folders : allFolders);
  const folderOptions = allFolders.map(folder => `<option value="${esc(folder)}"></option>`).join("");
  const parentFolderOptions = [
    `<option value="">Plant Digital Archive</option>`,
    ...allFolders.map(folder => `<option value="${esc(folder)}" ${folder === currentFolder ? "selected" : ""}>${esc(folder)}</option>`)
  ].join("");
  const canManageArchive = canAdminOverride();
  const grouped = folderRecords.filter(folder => shouldShowArchiveFolder(folder.name, currentFolder, Boolean(archiveQuery))).map(folder => {
    const folderFiles = files.filter(file => archiveFolderLabel(file) === folder.name);
    const childCount = allFolderRecords.filter(candidate => archiveParentFolder(candidate.name) === folder.name).length;
    const latestDate = folderFiles.reduce((latest, file) => {
      const time = new Date(file.uploadedAt || 0).getTime();
      return time > latest ? time : latest;
    }, new Date(folder.createdAt || 0).getTime());
    return {
      ...folder,
      files: folderFiles,
      childCount,
      typeCount: new Set(folderFiles.map(file => archiveFileKind(file))).size,
      size: folderFiles.reduce((sum, file) => sum + Number(file.size || 0), 0),
      updatedAt: latestDate ? new Date(latestDate).toISOString() : folder.createdAt
    };
  });
  const currentFiles = files.filter(file => archiveFolderLabel(file) === currentFolder);
  document.getElementById("maintenanceArchive").innerHTML = `
    ${moduleHead("Digital Archive", "", canUpload ? `<span class="status-pill">Upload enabled</span>` : `<span class="status-pill">Download only</span>`)}
    ${summaryStrip([
      { label: "Folders", value: folders.length, note: "archive groups", tone: "green" },
      { label: "Files", value: files.length, note: fileSize(totalSize) },
      { label: "Photos", value: photoCount, note: "image records" },
      { label: "PDF", value: pdfCount, note: "document records" }
    ])}
    <section class="panel">
      <div class="toolbar">
        <div>
          <h2>Plant Digital Archive</h2>
        </div>
        <span class="status-pill">Locked after upload</span>
      </div>
      ${state.archiveNotice ? `<p class="notice-line">${esc(state.archiveNotice)}</p>` : ""}
      <div class="archive-breadcrumb">
        <span class="archive-tree-icon"></span>
        <span>Plant Digital Archive</span>
        ${currentFolder ? `<span>/</span><strong>${esc(currentFolder)}</strong>` : ""}
      </div>
      <div class="archive-search-row">
        <input id="archive-search" value="${esc(state.archiveSearch || "")}" placeholder="Search folder, document, type, date, or note">
        <button class="secondary-button" id="archive-search-button" type="button">Search</button>
        ${state.archiveSearch ? `<button class="ghost-button" id="archive-clear-search" type="button">Clear</button>` : ""}
        <span class="muted">${files.length} result${files.length === 1 ? "" : "s"}</span>
      </div>
      ${canUpload ? `
        <div class="archive-action-bar">
          <section class="archive-action-card archive-upload-card">
            <div class="archive-action-title">
              <strong>Upload Document</strong>
              <span>${currentFolder ? `Current folder: ${esc(currentFolder)}` : "Create a folder first"}</span>
            </div>
            <div class="archive-upload-grid">
              <label class="archive-file-picker">
                <span id="archive-file-label">Select file(s)</span>
                <input id="archive-file" type="file" multiple>
              </label>
              <input id="archive-date" type="date" value="${esc(todayDateValue())}">
              <select id="archive-category">${archiveCategoryOptions()}</select>
              <input id="archive-description" placeholder="Write note">
              <button class="button" id="upload-archive" type="button">Upload</button>
              <div id="archive-selected-files" class="archive-selected-files"></div>
            </div>
          </section>
          <section class="archive-action-card archive-folder-card-form">
            <div class="archive-action-title">
              <strong>Create Folder / Subfolder</strong>
              <span>Choose parent, then name the new folder</span>
            </div>
            <div class="archive-folder-create-grid">
              <select id="archive-parent-folder">${parentFolderOptions}</select>
              <input id="archive-folder" list="archive-folder-options" placeholder="Folder or subfolder name">
              <datalist id="archive-folder-options">${folderOptions}</datalist>
              <button class="secondary-button" id="archive-create-folder" type="button">Create</button>
            </div>
            <p class="archive-help-text">Use slash for subfolders, for example Generator/stator.</p>
          </section>
        </div>
      ` : ""}
      <div class="archive-workspace">
        <aside class="archive-sidebar">
          <div class="archive-sidebar-head">
            <strong>Folders</strong>
            <span>${grouped.length}</span>
          </div>
          <div class="archive-directory-list">
            ${grouped.length ? grouped.map(folder => `
              <button class="archive-directory-item ${folder.name === currentFolder ? "active-directory" : ""}" style="padding-left:${14 + Math.min(folderDepth(folder.name), 5) * 18}px" data-archive-folder="${esc(folder.name)}" type="button">
                <span class="archive-folder-icon"></span>
                <span class="archive-directory-text">
                  <strong>${esc(archiveFolderDisplayName(folder.name))}</strong>
                  <small>${folderDepth(folder.name) ? `${esc(folder.name)} - ` : ""}${folder.files.length} file${folder.files.length === 1 ? "" : "s"} - ${esc(fileSize(folder.size))}${folder.childCount ? ` - ${folder.childCount} subfolder${folder.childCount === 1 ? "" : "s"}` : ""}</small>
                </span>
              </button>
            `).join("") : `<div class="archive-empty-folder">Create the first folder to begin.</div>`}
          </div>
        </aside>
        <section class="archive-current-files">
          <div class="toolbar">
            <div>
              <h3>${esc(currentFolder)}</h3>
              <p class="muted">${currentFolder ? `${currentFiles.length} file${currentFiles.length === 1 ? "" : "s"} in this folder` : "No folder selected"}</p>
            </div>
            <span class="status-pill">Locked after upload</span>
          </div>
          <div class="archive-browser">
            <div class="archive-browser-head">
              <span>File</span>
              <span>Type</span>
              <span>Document Date</span>
              <span>Status</span>
              <span>Actions</span>
            </div>
            ${currentFiles.length ? currentFiles.map(file => `
              <div class="archive-file-row">
                <div>
                  <strong>${esc(file.name)}</strong>
                  <p class="muted">${esc(file.description || file.mimeType || "")}</p>
                </div>
                <span>${badge(archiveFileKind(file))}</span>
                <span>${esc(file.documentDate || "")}</span>
                <span title="${esc(file.approvedAt ? `Approved ${fmtArchiveDateTime(file.approvedAt)}` : `Uploaded ${fmtArchiveDateTime(file.uploadedAt)}`)}">${file.approvedAt ? badge("Approved", "green") : badge("Pending", "amber")}</span>
                <div class="archive-file-actions">
                  <button class="secondary-button" data-download-attachment="${esc(file.id)}" type="button">Download</button>
                  ${canManageArchive && !file.approvedAt ? `<button class="button" data-approve-archive="${esc(file.id)}" type="button">Approve</button>` : ""}
                  ${canManageArchive ? `<button class="danger-button" data-delete-attachment="${esc(file.id)}" type="button">Delete</button>` : ""}
                </div>
              </div>
            `).join("") : `<div class="archive-empty-folder">${currentFolder ? "No files in this folder yet." : "Create or select a folder first."}</div>`}
          </div>
        </section>
      </div>
    </section>
  `;
}

function renderDocuments() {
  const attachments = filtered(state.data.attachments || [], ["name", "category", "description", "linkedName", "uploadedByName"]);
  const canUpload = can("file.upload");
  const canDeleteFile = can("file.delete");
  const totalSize = attachments.reduce((sum, file) => sum + Number(file.size || 0), 0);
  const documentCount = attachments.filter(file => /\.(pdf|doc|docx|ppt|pptx)$/i.test(file.name || "")).length;
  const spreadsheetCount = attachments.filter(file => /\.(xls|xlsx|csv)$/i.test(file.name || "")).length;
  const linkedCount = attachments.filter(file => file.linkedType && file.linkedId).length;
  document.getElementById("documents").innerHTML = `
    ${moduleHead("Document Library", "Attach and download manuals, drawings, reports, certificates, photos, spreadsheets, presentations, and any plant file type.", canUpload ? `<span class="status-pill">Upload enabled</span>` : `<span class="status-pill">Download only</span>`)}
    ${summaryStrip([
      { label: "Files", value: attachments.length, note: fileSize(totalSize) },
      { label: "Docs", value: documentCount, note: "PDF Word PPT" },
      { label: "Sheets", value: spreadsheetCount, note: "Excel CSV data" },
      { label: "Linked", value: linkedCount, note: "connected to records", tone: "green" }
    ])}
    <section class="panel">
      <div class="toolbar">
        <div>
          <h2>Document Library</h2>
        </div>
        <span class="status-pill">${attachments.length} files</span>
      </div>
      ${canUpload ? `
        <div class="panel" style="box-shadow:none;margin-bottom:14px;background:#f8fbf9">
          <div class="form-grid">
            <label class="full">Choose Files <input id="attachment-file" type="file" multiple></label>
            <label>Category
              <select id="attachment-category">
                <option>Manual</option>
                <option>Drawing</option>
                <option>Report</option>
                <option>Certificate</option>
                <option>Photo</option>
                <option>Spreadsheet</option>
                <option>Presentation</option>
                <option>Archive</option>
                <option>Other</option>
              </select>
            </label>
            <label>Module <select id="attachment-module">${attachmentModuleOptions()}</select></label>
            <label>Link To <select id="attachment-link">${attachmentLinkOptions()}</select></label>
            <label class="full">Description <textarea id="attachment-description" placeholder="Short note about this file"></textarea></label>
          </div>
          <div class="actions-row">
            <button class="button" id="upload-attachment">Upload Files</button>
            <span class="muted">Maximum file size: 500 MB each</span>
          </div>
        </div>
      ` : ""}
      <table>
        <thead>
          <tr><th>File</th><th>Module</th><th>Category</th><th>Source Folder</th><th>Linked Record</th><th>Size</th><th>Uploaded By</th><th>Date</th><th></th></tr>
        </thead>
        <tbody>
          ${attachments.map(file => `
            <tr>
              <td><strong>${esc(file.name)}</strong><p class="muted">${esc(file.description || file.mimeType || "")}</p></td>
              <td>${esc(moduleNameLabel(file.module))}</td>
              <td>${badge(file.category || "General")}</td>
              <td>${esc(file.folder || "attachments")}</td>
              <td>${esc(file.linkedName || "General library")}</td>
              <td>${fileSize(file.size)}</td>
              <td>${esc(file.uploadedByName || "")}</td>
              <td>${fmtDate(file.uploadedAt)}</td>
              <td>
                <button class="secondary-button" data-download-attachment="${esc(file.id)}">Download</button>
                ${canDeleteFile && !file.immutable ? `<button class="danger-button" data-delete-attachment="${esc(file.id)}">Delete</button>` : ""}
              </td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </section>
  `;
}

const dataCollections = {
  assets: {
    label: "Assets",
    rows: () => state.data.assets,
    columns: ["code", "name", "type", "location", "criticality", "status"],
    fields: [
      ["parentId", "Parent Asset", "asset"],
      ["code", "Code", "text"],
      ["name", "Name", "text"],
      ["type", "Type", "assetType"],
      ["location", "Location", "text"],
      ["criticality", "Criticality", "select:Critical,High,Medium,Low"],
      ["status", "Status", "text"],
      ["manufacturer", "Manufacturer", "text"],
      ["model", "Model", "text"],
      ["commissioned", "Commissioned", "date"]
    ]
  },
  inventory: {
    label: "Inventory",
    rows: () => state.data.inventory,
    columns: ["code", "name", "category", "qty", "min", "location"],
    fields: [
      ["code", "Code", "text"],
      ["name", "Name", "text"],
      ["category", "Category", "text"],
      ["unit", "Unit", "text"],
      ["qty", "Quantity", "number"],
      ["min", "Minimum", "number"],
      ["max", "Maximum", "number"],
      ["location", "Location", "text"],
      ["critical", "Critical", "boolean"]
    ]
  },
  pmSchedules: {
    label: "PM Schedules",
    rows: () => state.data.pmSchedules,
    columns: ["name", "assetName", "frequency", "nextDue", "active"],
    fields: [
      ["name", "Name", "text"],
      ["assetId", "Asset", "asset"],
      ["frequency", "Frequency", "select:Daily,Weekly,Monthly,Quarterly,Semiannual,Annual,Runtime"],
      ["nextDue", "Next Due", "date"],
      ["jobPlan", "Job Plan", "textarea"],
      ["active", "Active", "boolean"]
    ]
  },
  maintenanceTypes: {
    label: "Maintenance Types",
    rows: () => state.data.maintenanceTypes || [],
    columns: ["code", "name", "category", "active"],
    fields: [
      ["code", "Code", "text"],
      ["name", "Name", "text"],
      ["category", "Category", "select:Planned,Unplanned,Urgent,Compliance,Condition-Based,Planned Outage"],
      ["description", "Description", "textarea"],
      ["active", "Active", "boolean"]
    ]
  },
  assetTypes: {
    label: "Asset Types",
    rows: () => state.data.assetTypes || [],
    columns: ["code", "name", "group", "active"],
    fields: [
      ["code", "Code", "text"],
      ["name", "Name", "text"],
      ["group", "Group", "select:Site,Generation,Mechanical,Electrical,Civil,Automation,Balance of Plant,Safety,Existing Assets,Other"],
      ["description", "Description", "textarea"],
      ["active", "Active", "boolean"]
    ]
  },
  workOrders: {
    label: "Work Orders",
    rows: () => state.data.workOrders,
    columns: ["number", "title", "assetName", "type", "priority", "status"],
    fields: [
      ["number", "Number", "text"],
      ["title", "Title", "text"],
      ["assetId", "Asset", "asset"],
      ["type", "Type", "maintenanceType"],
      ["priority", "Priority", "select:Critical,High,Medium,Low"],
      ["status", "Status", "select:Requested,Approved,Scheduled,In Progress,On Hold,Closed,Cancelled"],
      ["assignedTo", "Assigned To", "user"],
      ["dueDate", "Due Date", "date"],
      ["safetyRequired", "Safety Required", "boolean"],
      ["lotoRequired", "LOTO Required", "boolean"],
      ["downtimeHours", "Downtime Hours", "number"],
      ["completionNotes", "Completion Notes", "textarea"]
    ]
  }
};

function renderDataControl() {
  const canCreateData = canManageDataControl();
  const canEditData = canManageDataControl();
  const canDeleteData = canManageDataControl();
  const collectionOptions = Object.entries(dataCollections).map(([key, cfg]) => `<option value="${key}">${esc(cfg.label)}</option>`).join("");
  document.getElementById("data").innerHTML = `
    ${moduleHead("Data Control", "Controller-backed feeding, editing, and controlled deletion for the local CMMS master data tables.", canCreateData ? `<span class="status-pill">Create enabled</span>` : `<span class="status-pill">Read only</span>`)}
    ${summaryStrip([
      { label: "Assets", value: state.data.assets.length, note: "equipment records" },
      { label: "Asset Types", value: (state.data.assetTypes || []).length, note: "equipment classes" },
      { label: "Inventory", value: state.data.inventory.length, note: "stores records" },
      { label: "PM Plans", value: state.data.pmSchedules.length, note: "schedule records" },
      { label: "Work Orders", value: state.data.workOrders.length, note: "maintenance records" }
    ])}
    <section class="panel">
      <div class="toolbar">
        <h2>Backend Data Feeding</h2>
        ${canCreateData ? `<span class="status-pill">${canDeleteData ? "Create, edit, delete enabled" : canEditData ? "Create and edit enabled" : "Create only - delete disabled"}</span>` : `<span class="status-pill">Read only for this role</span>`}
      </div>
      <div class="toolbar">
        <label>Record Type <select id="data-collection">${collectionOptions}</select></label>
        ${canCreateData ? `<button class="button" id="new-data-record">Add Record</button>` : ""}
      </div>
      <div id="data-control-table"></div>
    </section>
  `;
  document.getElementById("data-collection").value = state.dataCollection || "assets";
  renderDataControlTable();
}

function renderDataControlTable() {
  const collection = state.dataCollection || "assets";
  const cfg = dataCollections[collection];
  const rows = cfg.rows();
  const canEditData = canManageDataControl();
  const canDeleteData = canManageDataControl();
  document.getElementById("data-control-table").innerHTML = `
    <table>
      <thead>
        <tr>
          ${cfg.columns.map(column => `<th>${esc(column)}</th>`).join("")}
          <th></th>
        </tr>
      </thead>
      <tbody>
        ${rows.map(row => `
          <tr>
            ${cfg.columns.map(column => `<td>${esc(row[column] ?? "")}</td>`).join("")}
            <td>
              ${canEditData ? `
                <button class="secondary-button" data-edit-record="${esc(row.id)}">Edit</button>
              ` : ""}
              ${canDeleteData ? `
                <button class="danger-button" data-delete-record="${esc(row.id)}">Delete</button>
              ` : ""}
            </td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}

function dataFieldHtml(field, record = {}) {
  const [name, label, type] = field;
  const value = record[name] ?? "";
  if (type === "maintenanceType") {
    return `<label>${esc(label)} <select data-field="${esc(name)}">${(state.data.maintenanceTypes || []).filter(item => item.active !== false).map(item => `<option value="${esc(item.name)}" ${item.name === value ? "selected" : ""}>${esc(item.code)} - ${esc(item.name)}</option>`).join("")}</select></label>`;
  }
  if (type === "assetType") {
    const types = state.data.assetTypes || [];
    const activeTypes = types.filter(item => item.active !== false);
    const hasCurrentValue = value && activeTypes.some(item => item.name === value);
    const currentOption = hasCurrentValue || !value ? "" : `<option value="${esc(value)}" selected>${esc(value)} - existing value</option>`;
    return `<label>${esc(label)} <select data-field="${esc(name)}">${currentOption}${activeTypes.map(item => `<option value="${esc(item.name)}" ${item.name === value ? "selected" : ""}>${esc(item.code)} - ${esc(item.name)}</option>`).join("")}</select></label>`;
  }
  if (type === "asset") {
    return `<label>${esc(label)} <select data-field="${esc(name)}"><option value="">None</option>${state.data.assets.map(asset => `<option value="${esc(asset.id)}" ${asset.id === value ? "selected" : ""}>${esc(asset.code)} - ${esc(asset.name)}</option>`).join("")}</select></label>`;
  }
  if (type === "user") {
    return `<label>${esc(label)} <select data-field="${esc(name)}"><option value="">Unassigned</option>${state.data.users.map(user => `<option value="${esc(user.id)}" ${user.id === value ? "selected" : ""}>${esc(user.name)}</option>`).join("")}</select></label>`;
  }
  if (type === "boolean") {
    return `<label>${esc(label)} <select data-field="${esc(name)}"><option value="false" ${!value ? "selected" : ""}>No</option><option value="true" ${value ? "selected" : ""}>Yes</option></select></label>`;
  }
  if (type === "textarea") {
    return `<label class="full">${esc(label)} <textarea data-field="${esc(name)}">${esc(value)}</textarea></label>`;
  }
  if (type.startsWith("select:")) {
    const options = type.slice(7).split(",");
    return `<label>${esc(label)} <select data-field="${esc(name)}">${options.map(option => `<option value="${esc(option)}" ${option === value ? "selected" : ""}>${esc(option)}</option>`).join("")}</select></label>`;
  }
  return `<label>${esc(label)} <input data-field="${esc(name)}" type="${esc(type)}" value="${esc(value)}"></label>`;
}

function openDataRecordModal(mode, collection, record = {}, returnView = "data") {
  const cfg = dataCollections[collection];
  openModal(`${mode === "create" ? "Add" : "Edit"} ${cfg.label}`, `
    <div class="form-grid" id="data-record-form">
      ${cfg.fields.map(field => dataFieldHtml(field, record)).join("")}
    </div>
    <div class="actions-row">
      <button class="button" id="save-data-record" type="button" data-mode="${esc(mode)}" data-collection="${esc(collection)}" data-record="${esc(record.id || "")}" data-return-view="${esc(returnView)}">Save</button>
    </div>
  `);
}

function collectDataRecordForm() {
  const payload = {};
  document.querySelectorAll("#data-record-form [data-field]").forEach(input => {
    const field = input.dataset.field;
    if (input.tagName === "SELECT" && (input.value === "true" || input.value === "false")) {
      payload[field] = input.value === "true";
    } else {
      payload[field] = input.value;
    }
  });
  return payload;
}

function renderUsers() {
  const roles = Object.keys(state.data.rolePermissions || {});
  const canManageUsers = canManageUserManagement();
  const activeUsers = state.data.users.filter(user => user.active).length;
  const disabledUsers = state.data.users.filter(user => !user.active).length;
  const adminUsers = state.data.users.filter(user => {
    const permissions = state.data.rolePermissions?.[user.role] || [];
    return permissions.includes("*");
  }).length;
  document.getElementById("users").innerHTML = `
    ${moduleHead("Users and Permissions", "Username/email login, role assignment, account enable/disable controls, and SMTP test tools.", canManageUsers ? `<button class="button" id="new-user-account">Create User</button>` : `<span class="status-pill">Read only</span>`)}
    ${summaryStrip([
      { label: "Users", value: state.data.users.length, note: "total accounts" },
      { label: "Active", value: activeUsers, note: "allowed login", tone: "green" },
      { label: "Disabled", value: disabledUsers, note: "blocked login", tone: disabledUsers ? "red" : "green" },
      { label: "Admin Roles", value: adminUsers, note: `${roles.length} roles configured` }
    ])}
    <section class="panel" style="margin-bottom:14px">
      <div class="toolbar">
        <div>
          <h2>Role Permissions</h2>
        </div>
        ${canManageUsers ? `<span class="status-pill">Role assignment enabled</span>` : `<span class="status-pill">Read only</span>`}
      </div>
      <table>
        <thead><tr><th>Role</th><th>Access Level</th><th>Permissions</th></tr></thead>
        <tbody>
          ${roles.map(role => {
            const permissions = state.data.rolePermissions[role] || [];
            const fullAccess = permissions.includes("*");
            return `
              <tr>
                <td><strong>${esc(role)}</strong></td>
                <td>${fullAccess ? badge("Full Access", "red") : badge("Standard", "blue")}</td>
                <td>${fullAccess ? "All modules and administration" : permissions.map(permission => esc(permission)).join(", ")}</td>
              </tr>
            `;
          }).join("")}
        </tbody>
      </table>
    </section>
    ${canManageUsers ? `
      <section class="panel" style="margin-bottom:14px">
        <div class="toolbar">
          <h2>Email Service</h2>
          <button class="secondary-button" id="refresh-email-status">Check Status</button>
        </div>
        <div class="grid two-col">
          <div>
            <p id="email-status" class="muted">SMTP status not checked yet.</p>
          </div>
          <div class="form-grid">
            <label class="full">Test Email Address <input id="test-email-to" type="email" value="${esc(state.data.currentUser.email || "")}"></label>
            <div class="actions-row"><button class="button" id="send-test-email">Send Test Email</button></div>
          </div>
        </div>
      </section>
    ` : ""}
    <section class="panel">
      <div class="toolbar">
        <h2>Roles and Users</h2>
        ${canManageUsers ? `<button class="button" id="new-user-account-secondary">Create User</button>` : `<span class="status-pill">Read only for this role</span>`}
      </div>
      <table>
        <thead><tr><th>Name</th><th>Username</th><th>Email</th><th>Role</th><th>Module Access</th><th>Discipline</th><th>Status</th><th></th></tr></thead>
        <tbody>
          ${state.data.users.map(user => `
            <tr>
              <td><strong>${esc(user.name)}</strong></td>
              <td>
                ${canManageUsers ? `
                  <input id="username-input-${esc(user.id)}" value="${esc(user.username || "")}" autocomplete="username" aria-label="Username for ${esc(user.name)}">
                ` : esc(user.username || "")}
              </td>
              <td>${esc(user.email || "")}</td>
              <td>
                ${canManageUsers ? `
                  <select id="role-select-${esc(user.id)}" data-user-role-select="${esc(user.id)}" aria-label="Role for ${esc(user.name)}" ${user.id === state.data.currentUser.id ? "disabled" : ""}>
                    ${roles.map(role => `<option value="${esc(role)}" ${role === user.role ? "selected" : ""}>${esc(role)}</option>`).join("")}
                  </select>
                ` : esc(user.role)}
              </td>
              <td><span class="role-access">${esc(roleAccessSummary(user.role))}</span></td>
              <td>${esc(user.discipline)}</td>
              <td>
                ${user.active ? badge("Active", "green") : badge("Disabled", "red")}
                ${user.mustChangePassword ? badge("Password Change Required", "amber") : ""}
              </td>
              <td>
                ${canManageUsers ? `<button class="secondary-button" data-save-username="${esc(user.id)}" data-username-input="username-input-${esc(user.id)}">Save Username</button>` : ""}
                ${canManageUsers && user.id !== state.data.currentUser.id ? `
                  <button class="secondary-button" data-save-user-role="${esc(user.id)}" data-role-select="role-select-${esc(user.id)}">Save Role</button>
                  <button class="${user.active ? "danger-button" : "secondary-button"}" data-toggle-user="${esc(user.id)}" data-active="${user.active ? "false" : "true"}">
                    ${user.active ? "Disable" : "Enable"}
                  </button>
                  <button class="secondary-button" data-reset-user-password="${esc(user.id)}">Reset Password</button>
                ` : ""}
              </td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </section>
  `;
}

function optionList(items, selected) {
  return items.map(item => `<option value="${esc(item.id)}" ${item.id === selected ? "selected" : ""}>${esc(item.code || item.name)} - ${esc(item.name)}</option>`).join("");
}

function workOrderAssigneeIds(wo) {
  return Array.isArray(wo.assignedToList) && wo.assignedToList.length ? wo.assignedToList : [wo.assignedTo].filter(Boolean);
}

function workOrderAssigneeNames(wo) {
  const names = Array.isArray(wo.assignedNames) && wo.assignedNames.length
    ? wo.assignedNames
    : workOrderAssigneeIds(wo).map(userId => state.data.users.find(user => user.id === userId)?.name).filter(Boolean);
  return names.join(", ") || wo.assignedName || "";
}

function isNewWorkOrder(wo) {
  const createdAt = new Date(wo.createdAt || 0).getTime();
  if (!Number.isFinite(createdAt) || createdAt <= 0) return false;
  const age = Date.now() - createdAt;
  return age >= -60_000 && age < 3 * 24 * 60 * 60 * 1000;
}

function workOrderDueInfo(wo) {
  if (!wo.dueDate) return { days: null, label: "", tone: "blue", isDueSoon: false, isOverdue: false };
  const due = new Date(`${String(wo.dueDate).slice(0, 10)}T00:00:00`);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const days = Math.round((due.getTime() - today.getTime()) / 86_400_000);
  if (!Number.isFinite(days)) return { days: null, label: "", tone: "blue", isDueSoon: false, isOverdue: false };
  if (days < 0) {
    const overdueDays = Math.abs(days);
    return { days, label: `Overdue ${overdueDays} ${overdueDays === 1 ? "day" : "days"}`, tone: "red", isDueSoon: false, isOverdue: true };
  }
  if (days === 0) return { days, label: "Due today", tone: "amber", isDueSoon: true, isOverdue: false };
  if (days <= 3) return { days, label: `Due in ${days} ${days === 1 ? "day" : "days"}`, tone: "amber", isDueSoon: true, isOverdue: false };
  return { days, label: `${days} days remaining`, tone: "blue", isDueSoon: false, isOverdue: false };
}

function compareWorkOrdersForDisplay(left, right) {
  const leftClosed = ["Closed", "Cancelled", "Verified"].includes(left.status) ? 1 : 0;
  const rightClosed = ["Closed", "Cancelled", "Verified"].includes(right.status) ? 1 : 0;
  if (leftClosed !== rightClosed) return leftClosed - rightClosed;
  const newDifference = Number(isNewWorkOrder(right)) - Number(isNewWorkOrder(left));
  if (newDifference) return newDifference;
  const leftDue = workOrderDueInfo(left).days;
  const rightDue = workOrderDueInfo(right).days;
  if (leftDue !== null && rightDue !== null && leftDue !== rightDue) return leftDue - rightDue;
  if (leftDue === null && rightDue !== null) return 1;
  if (leftDue !== null && rightDue === null) return -1;
  return new Date(right.createdAt || 0).getTime() - new Date(left.createdAt || 0).getTime();
}

function workOrderExportRows(items = state.data.workOrders) {
  return [
    ["No.", "Title", "Asset", "Type", "Priority", "Status", "Assigned People", "Due Date", "Safety", "LOTO", "Estimated Work Hrs", "Materials Required", "Downtime Hrs", "Description", "Completion Notes"],
    ...items.map(wo => [
      wo.number,
      wo.title,
      wo.assetName || state.data.assets.find(asset => asset.id === wo.assetId)?.name || "",
      wo.type,
      wo.priority,
      wo.status,
      workOrderAssigneeNames(wo),
      wo.dueDate || "",
      wo.safetyRequired ? "Yes" : "No",
      wo.lotoRequired ? "Yes" : "No",
      wo.estimatedHours ?? 0,
      wo.materialsRequired || "",
      wo.downtimeHours || 0,
      wo.description || "",
      wo.completionNotes || ""
    ])
  ];
}

function workOrderAttachments(wo) {
  return (state.data.attachments || []).filter(file => file.linkedType === "workOrder" && file.linkedId === wo.id);
}

function workOrderCompletionReport(wo) {
  const files = workOrderAttachments(wo);
  return files.find(file => file.id === wo.completionReportId) || files.find(file =>
    String(file.category || "").toLowerCase().includes("completion") &&
    (String(file.mimeType || "").toLowerCase().includes("pdf") || String(file.name || "").toLowerCase().endsWith(".pdf"))
  );
}

function canSubmitWorkOrderCompletion(wo) {
  if (canAdminOverride()) return true;
  return (can("work_order.update") || can("work_order.create")) && !["Requested", "Rejected", "Pending Review", "Verified", "Closed"].includes(wo.status);
}

function canApproveWorkOrderStart(wo) {
  return canApproveMaintenance() && ["Requested", "Rejected"].includes(wo.status);
}

function workOrderStatusTone(status) {
  if (status === "Approved" || status === "Approved for Work" || status === "Verified" || status === "Closed") return "green";
  if (status === "Rejected" || status === "Critical") return "red";
  if (status === "Pending Review" || status === "In Progress") return "amber";
  return "blue";
}

function openWorkOrderDetails(wo) {
  const files = workOrderAttachments(wo);
  const report = workOrderCompletionReport(wo);
  const canInitialReview = canApproveWorkOrderStart(wo);
  const canFinalReview = canApproveMaintenance() && wo.status === "Pending Review";
  openModal(`${wo.number} Details`, `
    <div class="work-detail">
      <div class="summary-strip">
        <div class="summary-tile"><span>Status</span><strong>${esc(wo.status)}</strong></div>
        <div class="summary-tile"><span>Priority</span><strong>${esc(wo.priority)}</strong></div>
        <div class="summary-tile"><span>Due Date</span><strong>${esc(fmtDate(wo.dueDate) || "-")}</strong></div>
        <div class="summary-tile"><span>Assigned</span><strong>${esc(workOrderAssigneeIds(wo).length || 0)}</strong></div>
      </div>
      <div class="work-detail-actions">
        <button class="secondary-button" data-print-wo="${esc(wo.id)}" type="button">Print Work Order</button>
      </div>
      <table>
        <tbody>
          <tr><th>Title</th><td>${esc(wo.title)}</td></tr>
          <tr><th>Asset</th><td>${esc(wo.assetName || "")}</td></tr>
          <tr><th>Type</th><td>${esc(wo.type)}</td></tr>
          <tr><th>Assigned People</th><td>${esc(workOrderAssigneeNames(wo))}</td></tr>
          <tr><th>Estimated Work Hours</th><td>${esc(wo.estimatedHours ?? 0)} hours</td></tr>
          <tr><th>Materials Required</th><td class="work-order-long-text">${esc(wo.materialsRequired || "Not specified")}</td></tr>
          <tr><th>Safety / LOTO</th><td>${wo.safetyRequired ? "Safety required" : "Safety not required"} / ${wo.lotoRequired ? "LOTO required" : "LOTO not required"}</td></tr>
          <tr><th>Description</th><td>${esc(wo.description || "")}</td></tr>
          <tr><th>Completion Notes</th><td>${esc(wo.completionNotes || "")}</td></tr>
          <tr><th>Work Approval</th><td>${wo.workApprovedByName ? `Approved by ${esc(wo.workApprovedByName)} at ${esc(new Date(wo.workApprovedAt).toLocaleString())}` : wo.workRejectedByName ? `Rejected by ${esc(wo.workRejectedByName)} at ${esc(new Date(wo.workRejectedAt).toLocaleString())}` : "Not reviewed yet"}</td></tr>
          <tr><th>Approval Comment</th><td>${esc(wo.approvalComment || "")}</td></tr>
          <tr><th>Completion Report</th><td>${report ? `<button class="secondary-button" data-download-attachment="${esc(report.id)}" type="button">${esc(report.name)}</button>` : "No completion PDF attached"}</td></tr>
          <tr><th>Submitted By</th><td>${esc(wo.completionSubmittedByName || "")} ${wo.completionSubmittedAt ? `at ${esc(new Date(wo.completionSubmittedAt).toLocaleString())}` : ""}</td></tr>
          <tr><th>Final Review</th><td>${wo.approvedByName ? `Verified by ${esc(wo.approvedByName)} at ${esc(new Date(wo.approvedAt).toLocaleString())}` : wo.rejectedByName ? `Rejected by ${esc(wo.rejectedByName)} at ${esc(new Date(wo.rejectedAt).toLocaleString())}` : ""}</td></tr>
          <tr><th>Final Comment</th><td>${esc(wo.reviewComment || "")}</td></tr>
        </tbody>
      </table>
      ${files.length ? `
        <section class="panel" style="margin-top:12px">
          <h2>Linked Files</h2>
          <div class="timeline">
            ${files.map(file => `<div class="timeline-item"><strong>${esc(file.name)}</strong><span class="muted">${esc(file.category || "")}</span><button class="secondary-button" data-download-attachment="${esc(file.id)}" type="button">Download</button></div>`).join("")}
          </div>
        </section>
      ` : ""}
      ${canAdminOverride() ? `
        <section class="review-panel review-red">
          <div class="toolbar">
            <strong>System Administrator Override</strong>
            <span class="status-pill">Edit, revert, delete enabled</span>
          </div>
          <div class="actions-row">
            <button class="secondary-button" data-edit-wo="${esc(wo.id)}" type="button">Edit Work Order</button>
            <button class="danger-button" data-revert-wo="${esc(wo.id)}" type="button">Revert to Requested</button>
            <button class="danger-button" data-delete-wo="${esc(wo.id)}" type="button">Delete Work Order</button>
          </div>
        </section>
      ` : ""}
      ${canInitialReview ? `
        <section class="review-panel review-amber">
          <label class="review-comment-field">Maintenance Manager Comment
            <textarea id="work-approval-comment-${esc(wo.id)}" rows="3">${esc(wo.approvalComment || "")}</textarea>
          </label>
          <div class="actions-row">
            <button class="button" data-approve-wo="${esc(wo.id)}" data-work-action="approve" type="button">Approve Work Order</button>
            <button class="danger-button" data-approve-wo="${esc(wo.id)}" data-work-action="reject" type="button">Reject Work Order</button>
          </div>
        </section>
      ` : ""}
      ${canFinalReview ? `
        <section class="review-panel review-amber">
          <label class="review-comment-field">Maintenance Manager Comment
            <textarea id="work-review-comment-${esc(wo.id)}" rows="3"></textarea>
          </label>
          <div class="actions-row">
            <button class="button" data-review-wo="${esc(wo.id)}" data-work-action="approve" type="button">Final Approve</button>
            <button class="danger-button" data-review-wo="${esc(wo.id)}" data-work-action="reject" type="button">Reject After Report</button>
          </div>
        </section>
      ` : ""}
    </div>
  `);
}

function openWorkOrderCompletionModal(wo) {
  openModal(`Submit Completion - ${wo.number}`, `
    <div class="form-grid">
      <label class="full">Completion Notes <textarea id="wo-completion-notes">${esc(wo.completionNotes || "")}</textarea></label>
      <label class="full">Completion PDF Report <input id="wo-completion-file" type="file" accept="application/pdf,.pdf" required></label>
    </div>
    <p class="muted">Attach the final maintenance report as PDF. The Maintenance Manager will approve or reject after review.</p>
    <div class="actions-row"><button class="button" id="submit-work-completion" data-work-id="${esc(wo.id)}" type="button">Submit to Manager</button></div>
  `);
}

function openWorkOrderEditModal(wo) {
  const typeOptions = (state.data.maintenanceTypes || [])
    .filter(item => item.active !== false)
    .map(item => `<option value="${esc(item.name)}" ${item.name === wo.type ? "selected" : ""}>${esc(item.code)} - ${esc(item.name)}</option>`)
    .join("");
  const assigneeIds = new Set(workOrderAssigneeIds(wo));
  const assigneeOptions = state.data.users
    .filter(user => user.active !== false)
    .map(user => `<option value="${esc(user.id)}" ${assigneeIds.has(user.id) ? "selected" : ""}>${esc(user.name)} - ${esc(user.role)}</option>`)
    .join("");
  const statuses = ["Requested", "Approved for Work", "In Progress", "Pending Review", "Rejected", "Verified", "Closed", "Cancelled"];
  openModal(`Edit ${wo.number}`, `
    <div class="form-grid">
      <label class="full">Title <input id="edit-wo-title" value="${esc(wo.title || "")}" required></label>
      <label class="full">Work Description <textarea id="edit-wo-description">${esc(wo.description || "")}</textarea></label>
      <label>Asset <select id="edit-wo-asset">${optionList(state.data.assets, wo.assetId)}</select></label>
      <label>Maintenance Type <select id="edit-wo-type">${typeOptions}</select></label>
      <label>Priority <select id="edit-wo-priority">${["Low", "Medium", "High", "Critical"].map(value => `<option ${value === wo.priority ? "selected" : ""}>${value}</option>`).join("")}</select></label>
      <label>Status <select id="edit-wo-status">${statuses.map(value => `<option ${value === wo.status ? "selected" : ""}>${value}</option>`).join("")}</select></label>
      <label class="full">Assigned People <select id="edit-wo-assigned" multiple size="8">${assigneeOptions}</select></label>
      <label>Due Date <input id="edit-wo-due" type="date" value="${esc(wo.dueDate || "")}"></label>
      <label>Estimated Work Hours <input id="edit-wo-estimated-hours" type="number" step="0.25" min="0" value="${esc(wo.estimatedHours ?? 0)}"></label>
      <label>Downtime Hours <input id="edit-wo-downtime" type="number" step="any" min="0" value="${esc(wo.downtimeHours || 0)}"></label>
      <label><span>Safety Required</span><select id="edit-wo-safety"><option value="false" ${wo.safetyRequired ? "" : "selected"}>No</option><option value="true" ${wo.safetyRequired ? "selected" : ""}>Yes</option></select></label>
      <label><span>LOTO Required</span><select id="edit-wo-loto"><option value="false" ${wo.lotoRequired ? "" : "selected"}>No</option><option value="true" ${wo.lotoRequired ? "selected" : ""}>Yes</option></select></label>
      <label class="full">Materials Required <textarea id="edit-wo-materials" placeholder="List materials, spare parts, tools, and quantities">${esc(wo.materialsRequired || "")}</textarea></label>
      <label class="full">Completion Notes <textarea id="edit-wo-completion">${esc(wo.completionNotes || "")}</textarea></label>
    </div>
    <div class="actions-row">
      <button class="button" id="save-work-order-edit" data-work-id="${esc(wo.id)}" type="button">Save Changes</button>
    </div>
  `);
}

function downloadWorkOrdersWord(items = state.data.workOrders) {
  const rows = workOrderExportRows(items);
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Hydro Plant Work Orders</title>
    <style>
      body { font-family: Calibri, Arial, sans-serif; color:#111; }
      h1 { color:#0b2f2a; }
      table { width:100%; border-collapse:collapse; }
      th, td { border:1px solid #555; padding:6px; vertical-align:top; }
      th { background:#dcebe5; }
    </style></head><body>
      <h1>Hydro Plant Work Orders</h1>
      <p>Generated: ${esc(new Date().toLocaleString())}</p>
      <table>
        <thead><tr>${rows[0].map(cell => `<th>${esc(cell)}</th>`).join("")}</tr></thead>
        <tbody>${rows.slice(1).map(row => `<tr>${row.map(cell => `<td>${esc(cell)}</td>`).join("")}</tr>`).join("")}</tbody>
      </table>
    </body></html>`;
  const url = URL.createObjectURL(new Blob([html], { type: "application/msword;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = "Hydro_Work_Orders.doc";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function printWorkOrders() {
  printWebSheet("#work .work-order-table", "Hydro Plant Work Orders");
}

function printWorkOrder(wo) {
  const printWindow = window.open("", "_blank", "width=980,height=900");
  if (!printWindow) {
    state.workNotice = "Allow browser pop-ups to print the work order.";
    render();
    return;
  }
  const due = workOrderDueInfo(wo);
  const report = workOrderCompletionReport(wo);
  const formatPrintDateTime = value => {
    if (!value) return "-";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "-" : date.toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };
  const checkbox = checked => `<span class="check-box">${checked ? "X" : ""}</span>`;
  const workApprovalStatus = wo.workApprovedByName ? "Approved" : wo.workRejectedByName ? "Rejected" : "Pending";
  const workApprovalBy = wo.workApprovedByName || wo.workRejectedByName || "Not reviewed";
  const workApprovalAt = wo.workApprovedAt || wo.workRejectedAt;
  const finalReviewStatus = wo.approvedByName ? "Verified" : wo.rejectedByName ? "Rejected" : "Pending";
  const finalReviewBy = wo.approvedByName || wo.rejectedByName || "Not reviewed";
  const finalReviewAt = wo.approvedAt || wo.rejectedAt;
  const assetName = wo.assetName || state.data.assets.find(asset => asset.id === wo.assetId)?.name || "Not specified";
  printWindow.document.write(`<!doctype html>
    <html><head><meta charset="utf-8"><title>${esc(wo.number)} - Work Order</title>
    <style>
      @page { size: A4 portrait; margin: 0; }
      * { box-sizing: border-box; }
      html, body { width: 210mm; min-height: 297mm; margin: 0; background: #fff; }
      body {
        padding: 10mm 12mm 9mm;
        color: #17211e;
        font-family: "Segoe UI", Arial, sans-serif;
        font-size: 10px;
        line-height: 1.35;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      .document { display: flex; min-height: 278mm; flex-direction: column; }
      .doc-header { display: grid; grid-template-columns: 56px minmax(0, 1fr) 155px; gap: 12px; align-items: center; padding-bottom: 9px; border-bottom: 3px solid #0f5b4e; }
      .print-logo { display: grid; width: 52px; height: 52px; place-items: center; border-radius: 6px; background: #0f5b4e; color: #fff; font-size: 22px; font-weight: 900; }
      .organization { margin: 0 0 2px; color: #4e5f59; font-size: 8.5px; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; }
      h1 { margin: 0; color: #0b2f2a; font-size: 19px; line-height: 1.1; }
      .document-title { margin: 4px 0 0; color: #315869; font-size: 12px; font-weight: 800; text-transform: uppercase; }
      .document-number { padding: 8px 10px; border: 2px solid #0f5b4e; text-align: right; }
      .document-number span { display: block; color: #61716c; font-size: 8px; font-weight: 800; letter-spacing: .08em; }
      .document-number strong { display: block; margin: 3px 0; color: #0b2f2a; font-size: 14px; overflow-wrap: anywhere; }
      .document-number small { color: #61716c; font-size: 8px; }
      .control-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); margin-top: 9px; border: 1px solid #9eb1aa; }
      .control-item { min-height: 45px; padding: 7px 8px; border-right: 1px solid #9eb1aa; }
      .control-item:last-child { border-right: 0; }
      .control-item span { display: block; color: #61716c; font-size: 8px; font-weight: 900; letter-spacing: .06em; text-transform: uppercase; }
      .control-item strong { display: block; margin-top: 4px; color: #17211e; font-size: 10.5px; }
      .section { margin-top: 10px; break-inside: avoid; }
      .section.description-section { break-inside: auto; }
      .section h2 { margin: 0 0 5px; padding: 4px 7px; color: #0f5b4e; border-left: 4px solid #0f5b4e; border-bottom: 1px solid #9eb1aa; font-size: 10px; letter-spacing: .05em; text-transform: uppercase; }
      table { width: 100%; border-collapse: collapse; table-layout: fixed; }
      th, td { padding: 5.5px 7px; border: 1px solid #a6b7b1; vertical-align: top; overflow-wrap: anywhere; }
      th { width: 18%; color: #173c34; background: #f1f5f3; text-align: left; font-size: 9px; }
      .wide-label { width: 18%; }
      .description-box { min-height: 58px; white-space: pre-wrap; }
      .materials-list { min-height: 30px; white-space: pre-wrap; }
      .safety-list { display: flex; gap: 18px; align-items: center; flex-wrap: wrap; }
      .safety-item { display: inline-flex; gap: 6px; align-items: center; font-weight: 700; }
      .check-box { display: inline-grid; width: 14px; height: 14px; place-items: center; border: 1.5px solid #0f5b4e; color: #0f5b4e; font-size: 9px; font-weight: 900; }
      .review-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); border: 1px solid #a6b7b1; border-bottom: 0; }
      .review-card { min-height: 63px; padding: 7px; border-right: 1px solid #a6b7b1; border-bottom: 1px solid #a6b7b1; }
      .review-card:nth-child(2n) { border-right: 0; }
      .review-card span { display: block; color: #61716c; font-size: 8px; font-weight: 900; letter-spacing: .05em; text-transform: uppercase; }
      .review-card strong { display: block; margin-top: 4px; color: #173c34; font-size: 10px; }
      .review-card small { display: block; margin-top: 3px; color: #4e5f59; font-size: 8.5px; }
      .signatures { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; margin-top: 13px; break-inside: avoid; }
      .signature { min-height: 47px; padding-top: 27px; border-bottom: 1px solid #43514d; color: #43514d; text-align: center; font-size: 8.5px; }
      .doc-footer { display: grid; grid-template-columns: 1fr auto 1fr; gap: 10px; margin-top: auto; padding-top: 6px; border-top: 1px solid #9eb1aa; color: #61716c; font-size: 7.5px; }
      .doc-footer span:nth-child(2) { text-align: center; }
      .doc-footer span:last-child { text-align: right; }
      @media print {
        body { padding: 10mm 12mm 9mm; }
        .section, .control-grid, .review-grid, .signatures { page-break-inside: avoid; }
        .description-section { page-break-inside: auto; }
      }
    </style></head><body>
      <div class="document">
        <header class="doc-header">
          <div class="print-logo" aria-hidden="true">H</div>
          <div>
            <p class="organization">Hydro Utility</p>
            <h1>Hydro Plant</h1>
            <p class="document-title">Maintenance Work Order</p>
          </div>
          <div class="document-number"><span>Work Order Number</span><strong>${esc(wo.number)}</strong><small>Revision 0</small></div>
        </header>

        <div class="control-grid">
          <div class="control-item"><span>Status</span><strong>${esc(wo.status)}</strong></div>
          <div class="control-item"><span>Priority</span><strong>${esc(wo.priority)}</strong></div>
          <div class="control-item"><span>Created</span><strong>${esc(formatPrintDateTime(wo.createdAt))}</strong></div>
          <div class="control-item"><span>Due</span><strong>${esc(fmtDate(wo.dueDate) || "Not set")} ${wo.dueDate ? `- ${esc(due.label)}` : ""}</strong></div>
        </div>

        <section class="section">
          <h2>1. Work Identification</h2>
          <table><tbody>
            <tr><th>Work Title</th><td colspan="3"><strong>${esc(wo.title)}</strong></td></tr>
            <tr><th>Asset / System</th><td>${esc(assetName)}</td><th>Maintenance Type</th><td>${esc(wo.type || "Not specified")}</td></tr>
            <tr><th>Assigned Personnel</th><td colspan="3">${esc(workOrderAssigneeNames(wo) || "Unassigned")}</td></tr>
            <tr><th>Safety Controls</th><td colspan="3"><div class="safety-list"><span class="safety-item">${checkbox(wo.safetyRequired)} Safety clearance required</span><span class="safety-item">${checkbox(wo.lotoRequired)} LOTO required</span></div></td></tr>
            <tr><th>Estimated Work</th><td>${esc(wo.estimatedHours ?? 0)} hours</td><th>Planned Downtime</th><td>${esc(wo.downtimeHours || 0)} hours</td></tr>
            <tr><th>Materials Required</th><td colspan="3" class="materials-list">${esc(wo.materialsRequired || "Not specified")}</td></tr>
            <tr><th>Completion Report</th><td colspan="3">${esc(report?.name || "Not attached")}</td></tr>
          </tbody></table>
        </section>

        <section class="section description-section">
          <h2>2. Scope of Work</h2>
          <table><tbody><tr><td class="description-box">${esc(wo.description || "No work description recorded.")}</td></tr></tbody></table>
        </section>

        <section class="section">
          <h2>3. Authorization and Completion</h2>
          <div class="review-grid">
            <div class="review-card"><span>Prepared By</span><strong>${esc(wo.createdByName || "Not recorded")}</strong><small>${esc(formatPrintDateTime(wo.createdAt))}</small></div>
            <div class="review-card"><span>Work Authorization - ${esc(workApprovalStatus)}</span><strong>${esc(workApprovalBy)}</strong><small>${esc(formatPrintDateTime(workApprovalAt))}</small></div>
            <div class="review-card"><span>Completion Submitted By</span><strong>${esc(wo.completionSubmittedByName || "Not submitted")}</strong><small>${esc(formatPrintDateTime(wo.completionSubmittedAt))}</small></div>
            <div class="review-card"><span>Final Review - ${esc(finalReviewStatus)}</span><strong>${esc(finalReviewBy)}</strong><small>${esc(formatPrintDateTime(finalReviewAt))}</small></div>
          </div>
          <table><tbody>
            <tr><th>Approval Comment</th><td>${esc(wo.approvalComment || "No comment")}</td></tr>
            <tr><th>Completion Notes</th><td>${esc(wo.completionNotes || "Not submitted")}</td></tr>
            <tr><th>Final Comment</th><td>${esc(wo.reviewComment || "No comment")}</td></tr>
          </tbody></table>
        </section>

        <div class="signatures">
          <div class="signature">Prepared / Assigned - Signature and Date</div>
          <div class="signature">Maintenance Manager - Signature and Date</div>
          <div class="signature">Completion Verification - Signature and Date</div>
        </div>

        <footer class="doc-footer">
          <span>Document: HYDRO-OMMS-WO</span>
          <span>Printed ${esc(formatPrintDateTime(new Date()))}</span>
          <span>Hydro OMMS V01.1.0</span>
        </footer>
      </div>
      <script>window.addEventListener("load",()=>setTimeout(()=>window.print(),450));<\/script>
    </body></html>`);
  printWindow.document.close();
}

function roleOptions(selected = "Viewer/Auditor") {
  return Object.keys(state.data.rolePermissions || {})
    .map(role => `<option value="${esc(role)}" ${role === selected ? "selected" : ""}>${esc(role)}</option>`)
    .join("");
}

function roleAccessSummary(role) {
  const permissions = state.data.rolePermissions?.[role] || [];
  if (permissions.includes("*")) return "All modules and administration";
  const modules = [];
  const controlsPlantOperations = permissions.includes("plant_operations.control");
  if (controlsPlantOperations) modules.push("All Plant Operation Reports");
  if (permissions.includes("plant.verify")) modules.push("Final Verification");
  if (permissions.some(permission => permission.startsWith("work_order"))) modules.push("Work Orders");
  if (!controlsPlantOperations && permissions.some(permission => permission.startsWith("production"))) modules.push("Production");
  if (permissions.some(permission => permission.startsWith("logbook"))) modules.push("Logbook");
  if (!controlsPlantOperations && permissions.includes("operations.approve")) modules.push("Operations Approval");
  if (permissions.includes("inventory.adjust")) modules.push("Inventory");
  if (permissions.some(permission => permission.startsWith("data"))) modules.push("Data Control");
  if (permissions.some(permission => permission.startsWith("file"))) modules.push("Documents");
  if (permissions.includes("report.export")) modules.push("Reports");
  if (permissions.some(permission => permission.startsWith("safety"))) modules.push("Safety");
  if (permissions.includes("performance.report")) modules.push("Performance");
  return modules.length ? modules.join(", ") : "View only";
}

function openModal(title, content) {
  document.getElementById("modal-title").textContent = title;
  document.getElementById("modal-content").innerHTML = content;
  document.getElementById("modal").showModal();
}

function validateModalForm() {
  const form = document.querySelector("#modal form");
  if (!form) return true;
  if (form.checkValidity()) return true;
  form.reportValidity();
  return false;
}

function sheetInputSelector(input) {
  const view = input.closest(".view");
  const viewPrefix = view?.id ? `#${CSS.escape(view.id)} ` : "";
  const keys = [
    ["productionField", "productionIndex"],
    ["productionMeta"],
    ["shuntField", "shuntIndex"],
    ["lineField", "lineIndex"],
    ["meterField", "meterRow", "meterUnit"],
    ["energyField", "energySection", "energyRow", "energySource"],
    ["waterField", "waterRow"],
    ["dailyGenerationField"]
  ];
  for (const keySet of keys) {
    if (input.dataset[keySet[0]] === undefined) continue;
    const attributes = keySet
      .map(key => `[data-${key.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`)}="${CSS.escape(input.dataset[key])}"]`)
      .join("");
    return `${viewPrefix}${attributes}`;
  }
  return "";
}

function neighboringSheetInput(input, key) {
  const table = input.closest("table");
  if (!table) return null;
  const current = input.getBoundingClientRect();
  const currentX = current.left + current.width / 2;
  const currentY = current.top + current.height / 2;
  const candidates = Array.from(table.querySelectorAll("input:not([disabled])")).filter(candidate => candidate !== input);
  const directions = {
    ArrowLeft: candidate => candidate.x < currentX - 2,
    ArrowRight: candidate => candidate.x > currentX + 2,
    ArrowUp: candidate => candidate.y < currentY - 2,
    ArrowDown: candidate => candidate.y > currentY + 2
  };
  const direction = directions[key];
  if (!direction) return null;
  return candidates
    .map(candidate => {
      const rect = candidate.getBoundingClientRect();
      const x = rect.left + rect.width / 2;
      const y = rect.top + rect.height / 2;
      const horizontal = Math.abs(x - currentX);
      const vertical = Math.abs(y - currentY);
      const primary = key === "ArrowLeft" || key === "ArrowRight" ? horizontal : vertical;
      const secondary = key === "ArrowLeft" || key === "ArrowRight" ? vertical : horizontal;
      return { candidate, x, y, score: primary + secondary * 6 };
    })
    .filter(direction)
    .sort((left, right) => left.score - right.score)[0]?.candidate || null;
}

function bindEvents() {
  document.querySelector("#modal form")?.addEventListener("submit", event => {
    event.preventDefault();
  });

  document.addEventListener("click", async event => {
    const closeModal = event.target.closest("[data-close-modal]");
    if (closeModal) {
      const modal = document.getElementById("modal");
      if (modal?.open) modal.close();
      return;
    }

    const submenuToggle = event.target.closest("[data-submenu-toggle]");
    if (submenuToggle) {
      const submenu = document.getElementById(submenuToggle.dataset.submenuToggle);
      const open = submenuToggle.getAttribute("aria-expanded") === "true";
      submenuToggle.setAttribute("aria-expanded", String(!open));
      submenu.hidden = open;
      return;
    }

    if (event.target.id === "dashboard-today") {
      state.dashboardDate = todayDateValue();
      renderDashboard();
      return;
    }

    const generationMonthlySheet = event.target.closest("[data-generation-monthly-sheet]");
    if (generationMonthlySheet) {
      state.generationMonthlySheet = generationMonthlySheet.dataset.generationMonthlySheet || "summary";
      renderMonthlyProduction();
      return;
    }

    if (event.target.id === "new-outage-record") {
      if (!canEditOutageRecords()) return;
      openOutageRecordModal({
        from: `${state.monthlyProductionMonth || todayDateValue().slice(0, 7)}-01T00:00`,
        to: `${state.monthlyProductionMonth || todayDateValue().slice(0, 7)}-01T01:00`
      });
      return;
    }

    if (event.target.id === "save-outage-record") {
      if (!canEditOutageRecords()) return;
      try {
        await saveOutageRecordFromModal();
      } catch (error) {
        alert(outageApiErrorMessage(error));
      }
      return;
    }

    if (event.target.id === "clear-outage-filters") {
      state.outageFilters = { month: "", unit: "All", category: "All", search: "" };
      state.outageNotice = "";
      renderMonthlyProduction();
      return;
    }

    if (event.target.id === "export-outage-csv") {
      if (!canExportProduction()) return;
      const month = state.monthlyProductionMonth || todayDateValue().slice(0, 7);
      downloadCsv(`Hydro_Outage_Management_${outageFilterValue("month", month) || "All"}.csv`, outageExportRows(filteredOutageRecords(month)));
      return;
    }

    if (event.target.id === "export-outage-json") {
      if (!canExportProduction()) return;
      const month = state.monthlyProductionMonth || todayDateValue().slice(0, 7);
      downloadJson(`Hydro_Outage_Management_${outageFilterValue("month", month) || "All"}.json`, filteredOutageRecords(month));
      return;
    }

    if (event.target.id === "print-outage-report") {
      if (!canExportProduction()) return;
      printWebSheet("#monthlyProduction .outage-summary-table, #monthlyProduction .outage-register-table", `Hydro Plant Outage Management ${outageFilterValue("month", state.monthlyProductionMonth || todayDateValue().slice(0, 7)) || ""}`);
      return;
    }

    const editOutage = event.target.closest("[data-edit-outage]");
    if (editOutage) {
      if (!canEditOutageRecords()) return;
      const record = outageRecords().find(item => item.id === editOutage.dataset.editOutage);
      if (record) openOutageRecordModal(record);
      return;
    }

    const deleteOutage = event.target.closest("[data-delete-outage]");
    if (deleteOutage) {
      if (!canDeleteOutageRecords()) return;
      try {
        await deleteOutageRecord(deleteOutage.dataset.deleteOutage);
      } catch (error) {
        alert(outageApiErrorMessage(error));
      }
      return;
    }

    const nav = event.target.closest("[data-view], [data-view-jump]");
    if (nav) {
      if (nav.dataset.collectionJump) state.dataCollection = nav.dataset.collectionJump;
      state.view = nav.dataset.view || nav.dataset.viewJump;
      render();
      return;
    }

    const productionReview = event.target.closest("[data-production-review]");
    if (productionReview) {
      if (!canApproveOperations()) return;
      const action = productionReview.dataset.productionReview;
      const moduleName = productionReview.dataset.reviewModule;
      const date = productionReview.dataset.reviewDate;
      const comment = document.getElementById(productionReview.dataset.reviewComment)?.value.trim() || "";
      if (action === "reject" && !comment) {
        alert("Enter a comment before rejecting.");
        return;
      }
      await reviewProductionModule(moduleName, date, action, comment);
      const message = action === "approve" ? "approved and locked." : action === "revert" ? "reverted to draft and unlocked for admin editing." : "rejected and returned to the operator.";
      if (moduleName === "hourly") {
        state.productionNotice = `Hourly Report ${message}`;
        renderProduction();
      } else if (moduleName === "meter") {
        state.productionMeterNotice = `Daily Production ${message}`;
        renderProductionSummary();
      } else if (moduleName === "energy-meter") {
        state.energyMeterNotice = `Energy Meter ${message}`;
        renderEnergyMeter();
      } else if (moduleName === "water-level") {
        state.waterLevelNotice = `Water Level ${message}`;
        renderWaterLevel();
      } else if (moduleName === "shunt-reactor") {
        state.shuntReactorNotice = `Shunt Reactor ${message}`;
        renderShuntReactor1();
      } else if (moduleName === "line-parameter") {
        state.lineParameterNotice = `Line Parameter ${message}`;
        renderLineParameter();
      } else if (moduleName === "daily-generation") {
        state.dailyGenerationNotice = `Daily Generation Report ${message}`;
        renderDailyGenerationReport();
      }
      return;
    }

    if (event.target.id === "new-data-record") {
      if (!canManageDataControl()) return;
      openDataRecordModal("create", state.dataCollection || "assets");
      return;
    }

    if (event.target.id === "production-today") {
      state.productionDate = todayDateValue();
      state.productionNotice = "";
      renderProduction();
      return;
    }

    if (event.target.id === "production-summary-today") {
      state.productionDate = todayDateValue();
      renderProductionSummary();
      return;
    }

    if (event.target.id === "daily-generation-today") {
      state.dailyGenerationDate = todayDateValue();
      renderDailyGenerationReport();
      return;
    }

    if (event.target.id === "submit-daily-generation-report") {
      if (!canSubmitProduction() || !canEditDailyGenerationReport()) return;
      const date = dailyGenerationDate();
      await saveDailyGenerationReportNow(date);
      await submitProductionModule("daily-generation", date);
      state.dailyGenerationNotice = `${formatSheetDate(date)} submitted for Operation Manager approval.`;
      renderDailyGenerationReport();
      return;
    }

    if (event.target.id === "export-daily-generation-xlsx") {
      if (!canExportProduction()) return;
      const date = dailyGenerationDate();
      downloadXlsx(`Hydro_Daily_Generation_Report_${date}.xlsx`, dailyGenerationReportRows(date), dailyGenerationReportXlsxOptions());
      return;
    }

    if (event.target.id === "export-daily-generation-csv") {
      if (!canExportProduction()) return;
      const date = dailyGenerationDate();
      downloadCsv(`Hydro_Daily_Generation_Report_${date}.csv`, dailyGenerationReportRows(date));
      return;
    }

    if (event.target.id === "export-daily-generation-pdf") {
      if (!canExportProduction()) return;
      printWebSheet("#dailyGenerationReport .daily-generation-table", `Hydro Plant Daily Generation Report ${formatSheetDate(dailyGenerationDate())}`);
      return;
    }

    if (event.target.id === "monthly-production-current") {
      state.monthlyProductionMonth = todayDateValue().slice(0, 7);
      renderMonthlyProduction();
      return;
    }

    if (event.target.id === "export-operation-workbook") {
      if (!canExportProduction()) return;
      downloadPlantOperationWorkbook(operationWorkbookMonth());
      return;
    }

    if (event.target.id === "export-maintenance-report" || event.target.id === "export-maintenance-report-panel") {
      if (!canExportMaintenanceReport()) return;
      downloadMaintenanceReportWorkbook();
      return;
    }

    if (event.target.id === "export-monthly-xlsx") {
      if (!canExportProduction()) return;
      downloadXlsx(`Hydro_Generation_Monthly_Report_${state.monthlyProductionMonth}.xlsx`, monthlyProductionExportRows(), {
        sheetName: "Generation Monthly Report",
        headerRows: [1, 2, 3],
        summaryRows: [monthlyProductionRows().length + 4],
        merges: ["A1:M1", "A2:A3", "B2:D2", "E2:G2", "H2:J2", "K2:M2"]
      });
      return;
    }

    if (event.target.id === "export-monthly-csv") {
      if (!canExportProduction()) return;
      downloadCsv(`Hydro_Generation_Monthly_Report_${state.monthlyProductionMonth}.csv`, monthlyProductionExportRows());
      return;
    }

    if (event.target.id === "export-monthly-pdf") {
      if (!canExportProduction()) return;
      printWebSheet("#monthlyProduction .monthly-production-table", `Hydro Plant Generation Monthly Report ${state.monthlyProductionMonth}`);
      return;
    }

    if (event.target.id === "production-meter-clear") {
      if (!canManageProduction()) return;
      resetProductionMeterRows();
      state.productionMeterNotice = "Meter reading sheet cleared.";
      renderProductionSummary();
      return;
    }

    if (event.target.id === "submit-meter-report") {
      if (!canSubmitProduction()) return;
      const date = state.productionDate || todayDateValue();
      const stayForReview = keepSubmittedReportOpenForReview();
      await submitProductionModule("meter", date);
      const nextDate = createNextProductionMeterRows(date);
      state.productionDate = stayForReview ? date : nextDate;
      state.productionMeterNotice = stayForReview
        ? `${formatSheetDate(date)} submitted. Approve or reject this report. Next day sheet is ready.`
        : `${formatSheetDate(date)} submitted. Next day opened.`;
      renderProductionSummary();
      return;
    }

    if (event.target.id === "energy-meter-today") {
      state.energyMeterDate = todayDateValue();
      state.energyMeterNotice = "";
      renderEnergyMeter();
      return;
    }

    if (event.target.id === "energy-meter-clear") {
      if (!canManageProduction()) return;
      energyMeterReadings()[state.energyMeterDate || todayDateValue()] = defaultEnergyMeterData();
      saveEnergyMeterRows();
      state.energyMeterNotice = "Energy Meter sheet cleared.";
      renderEnergyMeter();
      return;
    }

    if (event.target.id === "export-energy-xlsx") {
      if (!canExportProduction()) return;
      downloadEnergyMeterXlsx();
      return;
    }

    if (event.target.id === "export-energy-csv") {
      if (!canExportProduction()) return;
      downloadCsv(`Hydro_Energy_Meter_${state.energyMeterDate || todayDateValue()}.csv`, energyMeterExportRows());
      return;
    }

    if (event.target.id === "export-energy-pdf") {
      if (!canExportProduction()) return;
      printWebSheet("#energyMeter .energy-transformer-table, #energyMeter .energy-line-table", `Hydro Plant Energy Meter ${formatSheetDate(state.energyMeterDate)}`);
      return;
    }

    if (event.target.id === "submit-energy-report") {
      if (!canSubmitProduction()) return;
      const date = state.energyMeterDate || todayDateValue();
      const stayForReview = keepSubmittedReportOpenForReview();
      await submitProductionModule("energy-meter", date);
      const nextDate = createNextEnergyMeterRows(date);
      state.energyMeterDate = stayForReview ? date : nextDate;
      state.energyMeterNotice = stayForReview
        ? `${formatSheetDate(date)} submitted. Approve or reject this report. Next day sheet is ready.`
        : `${formatSheetDate(date)} submitted. Next day opened.`;
      renderEnergyMeter();
      return;
    }

    if (event.target.id === "water-level-today") {
      state.waterLevelDate = todayDateValue();
      state.waterLevelNotice = "";
      renderWaterLevel();
      return;
    }

    if (event.target.id === "water-level-clear") {
      if (!canManageProduction()) return;
      resetWaterLevelRows();
      state.waterLevelNotice = "Water Level sheet cleared.";
      renderWaterLevel();
      return;
    }

    if (event.target.id === "export-water-xlsx") {
      if (!canExportProduction()) return;
      downloadWaterLevelXlsx();
      return;
    }

    if (event.target.id === "export-water-csv") {
      if (!canExportProduction()) return;
      downloadCsv(`Hydro_Water_Level_${waterLevelMonthKey()}.csv`, waterLevelExportRows());
      return;
    }

    if (event.target.id === "export-water-pdf") {
      if (!canExportProduction()) return;
      printWebSheet("#waterLevel .water-level-table", `Hydro Plant Water Level ${waterLevelMonthLabel()}`);
      return;
    }

    if (event.target.id === "submit-water-report") {
      if (!canSubmitProduction()) return;
      const date = waterLevelStorageDate();
      const stayForReview = keepSubmittedReportOpenForReview();
      await saveWaterLevelRowsNow(date);
      await submitProductionModule("water-level", date);
      const nextDate = nextWaterLevelMonth(date);
      waterLevelRows(nextDate);
      state.waterLevelDate = stayForReview ? date : nextDate;
      state.waterLevelNotice = stayForReview
        ? `${waterLevelMonthLabel(date)} submitted. Approve or reject this report. Next month sheet is ready.`
        : `${waterLevelMonthLabel(date)} submitted. Next month opened.`;
      renderWaterLevel();
      return;
    }

    if (event.target.id === "export-meter-xlsx") {
      if (!canExportProduction()) return;
      downloadProductionMeterXlsx();
      return;
    }

    if (event.target.id === "export-meter-csv") {
      if (!canExportProduction()) return;
      downloadCsv(`Hydro_Production_Meter_${state.productionDate || todayDateValue()}.csv`, productionMeterExportRows());
      return;
    }

    if (event.target.id === "export-meter-pdf") {
      if (!canExportProduction()) return;
      printWebSheet("#productionSummary .production-meter-table", `Hydro Plant Production and Auxiliary Meter Reading ${formatSheetDate(state.productionDate)}`);
      return;
    }

    if (event.target.id === "shunt-reactor-today") {
      state.shuntReactorDate = todayDateValue();
      state.shuntReactorNotice = "";
      renderShuntReactor1();
      return;
    }

    if (event.target.id === "shunt-reactor-clear") {
      if (!canManageProduction()) return;
      resetShuntReactorSheet();
      state.shuntReactorNotice = "Shunt Reactor sheet cleared.";
      renderShuntReactor1();
      return;
    }

    if (event.target.id === "export-shunt-xlsx") {
      if (!canExportProduction()) return;
      downloadShuntReactorXlsx();
      return;
    }

    if (event.target.id === "export-shunt-csv") {
      if (!canExportProduction()) return;
      downloadCsv(`Hydro_Shunt_Reactor_${state.shuntReactorDate || todayDateValue()}.csv`, shuntReactorExportRows());
      return;
    }

    if (event.target.id === "export-shunt-pdf") {
      if (!canExportProduction()) return;
      downloadShuntReactorPdf();
      return;
    }

    if (event.target.id === "submit-shunt-report") {
      if (!canSubmitProduction()) return;
      const date = state.shuntReactorDate || todayDateValue();
      const stayForReview = keepSubmittedReportOpenForReview();
      await submitProductionModule("shunt-reactor", date);
      const nextDate = nextDateValue(date);
      shuntReactorRows(nextDate);
      state.shuntReactorDate = stayForReview ? date : nextDate;
      state.shuntReactorNotice = stayForReview
        ? `${formatSheetDate(date)} submitted. Approve or reject this report. Next day empty sheet is ready.`
        : `${formatSheetDate(date)} submitted. Next day empty sheet opened.`;
      renderShuntReactor1();
      return;
    }

    if (event.target.id === "line-parameter-today") {
      state.lineParameterDate = todayDateValue();
      state.lineParameterNotice = "";
      renderLineParameter();
      return;
    }

    if (event.target.id === "line-parameter-clear") {
      if (!canManageProduction()) return;
      resetLineParameterSheet();
      state.lineParameterNotice = "Line Parameter sheet cleared.";
      renderLineParameter();
      return;
    }

    if (event.target.id === "export-line-xlsx") {
      if (!canExportProduction()) return;
      downloadLineParameterXlsx();
      return;
    }

    if (event.target.id === "export-line-csv") {
      if (!canExportProduction()) return;
      downloadCsv(`Hydro_Line_Parameter_${state.lineParameterDate || todayDateValue()}.csv`, lineParameterExportRows());
      return;
    }

    if (event.target.id === "export-line-pdf") {
      if (!canExportProduction()) return;
      printWebSheet("#lineParameter .line-parameter-table", `Hydro Plant Line Parameter ${formatSheetDate(state.lineParameterDate)}`);
      return;
    }

    if (event.target.id === "submit-line-report") {
      if (!canSubmitProduction()) return;
      const date = state.lineParameterDate || todayDateValue();
      const stayForReview = keepSubmittedReportOpenForReview();
      await submitProductionModule("line-parameter", date);
      const nextDate = nextDateValue(date);
      lineParameterRows(nextDate);
      state.lineParameterDate = stayForReview ? date : nextDate;
      state.lineParameterNotice = stayForReview
        ? `${formatSheetDate(date)} submitted. Approve or reject this report. Next day empty sheet is ready.`
        : `${formatSheetDate(date)} submitted. Next day empty sheet opened.`;
      renderLineParameter();
      return;
    }

    if (event.target.id === "production-clear") {
      if (!canManageProduction()) return;
      resetProductionSheet();
      state.productionNotice = "Production sheet was cleared for the selected date.";
      renderProduction();
      return;
    }

    if (event.target.id === "export-production-xlsx") {
      if (!canExportProduction()) return;
      if (!productionApprovalReady(state.productionDate)) {
        state.productionNotice = "Download opens after 24 hours.";
        renderProduction();
        return;
      }
      downloadProductionXlsx();
      return;
    }

    if (event.target.id === "export-production-pdf") {
      if (!canExportProduction()) return;
      if (!productionApprovalReady(state.productionDate)) {
        state.productionNotice = "PDF opens after 24 hours.";
        renderProduction();
        return;
      }
      downloadHourlyReportPdf();
      return;
    }

    if (event.target.id === "submit-production") {
      if (!canSubmitProduction() || !canEditProductionSheet()) return;
      if (!productionApprovalReady(state.productionDate)) {
        state.productionNotice = "Submit opens after 24 hours.";
        renderProduction();
        return;
      }
      const rows = productionRows();
      const meta = productionMeta();
      const missing = productionMissingFields(rows, meta);
      if (missing.length) {
        openModal("Production Sheet Incomplete", `
          <p>Complete the daily sheet first.</p>
          <p class="muted">${esc(missing.slice(0, 20).join(", "))}${missing.length > 20 ? `, and ${missing.length - 20} more fields` : ""}</p>
        `);
        return;
      }
      meta.submittedAt = new Date().toISOString();
      meta.submittedBy = state.data.currentUser.id;
      meta.submittedByName = state.data.currentUser.name;
      meta.approvedAt = "";
      meta.approvedBy = "";
      meta.approvedByName = "";
      meta.rejectedAt = "";
      meta.rejectedBy = "";
      meta.rejectedByName = "";
      meta.reviewComment = "";
      meta.status = "Pending";
      saveProductionMetas();
      const submittedDate = state.productionDate;
      const stayForReview = keepSubmittedReportOpenForReview();
      await saveProductionDateNow(submittedDate);
      downloadProductionXlsx();
      const nextDate = nextDateValue(submittedDate);
      productionRows(nextDate);
      productionMeta(nextDate);
      state.productionDate = stayForReview ? submittedDate : nextDate;
      state.productionNotice = stayForReview
        ? `${formatSheetDate(submittedDate)} submitted. Approve or reject this report. Next day empty sheet is ready.`
        : `${formatSheetDate(submittedDate)} submitted. Next day empty sheet opened.`;
      renderProduction();
      return;
    }

    if (event.target.id === "create-next-production") {
      if (!canSubmitProduction()) return;
      const currentDate = state.productionDate;
      const meta = productionMeta();
      if (!meta.submittedAt) {
        state.productionNotice = "Submit this sheet first, then create the next day sheet.";
        renderProduction();
        return;
      }
      const nextDate = nextDateValue(currentDate);
      resetProductionSheet(nextDate);
      state.productionDate = nextDate;
      state.productionNotice = `New empty Production sheet opened for ${formatSheetDate(nextDate)}.`;
      renderProduction();
      return;
    }

    if (event.target.id === "export-production-csv") {
      if (!canExportProduction()) return;
      if (!productionApprovalReady(state.productionDate)) {
        state.productionNotice = "CSV opens after 24 hours.";
        renderProduction();
        return;
      }
      downloadCsv(`Hydro_Hourly_Report_${state.productionDate || todayDateValue()}.csv`, productionExportRows());
      return;
    }

    if (event.target.id === "new-asset-type") {
      if (!canManageDataControl()) return;
      openDataRecordModal("create", "assetTypes", {}, "assets");
      return;
    }

    if (event.target.id === "new-user-account" || event.target.id === "new-user-account-secondary") {
      if (!canManageUserManagement()) return;
      openModal("Create User Account", `
        <div class="form-grid">
          <label>Full Name <input id="admin-user-name" autocomplete="name" required></label>
          <label>Username <input id="admin-user-username" autocomplete="username" placeholder="operator1" required></label>
          <label>Email <input id="admin-user-email" type="email" autocomplete="email" required></label>
          <label>Temporary Password <input id="admin-user-password" type="text" value="DemoPass123!" minlength="8" required></label>
          <label>Role <select id="admin-user-role">${roleOptions("Viewer/Auditor")}</select></label>
          <label>Discipline
            <select id="admin-user-discipline">
              <option>General</option>
              <option>Operations</option>
              <option>Mechanical</option>
              <option>Electrical</option>
              <option>I&C</option>
              <option>Civil</option>
              <option>Stores</option>
              <option>Safety</option>
              <option>IT</option>
              <option>Management</option>
            </select>
          </label>
          <label>Status <select id="admin-user-active"><option value="true">Active</option><option value="false">Disabled</option></select></label>
        </div>
        <div class="actions-row">
          <button class="button" id="save-user-account" type="button">Create User</button>
        </div>
      `);
      return;
    }

    const editRecord = event.target.closest("[data-edit-record]");
    if (editRecord) {
      if (!canManageDataControl()) return;
      const collection = state.dataCollection || "assets";
      const record = dataCollections[collection].rows().find(item => item.id === editRecord.dataset.editRecord);
      openDataRecordModal("edit", collection, record);
      return;
    }

    const deleteRecord = event.target.closest("[data-delete-record]");
    if (deleteRecord) {
      if (!canManageDataControl()) return;
      const collection = state.dataCollection || "assets";
      const record = dataCollections[collection].rows().find(item => item.id === deleteRecord.dataset.deleteRecord);
      if (!confirm(`Delete ${record?.name || record?.title || record?.code || "this record"}?`)) return;
      await api(`/api/manage/${collection}/${deleteRecord.dataset.deleteRecord}`, { method: "DELETE" });
      await load();
      state.view = "data";
      render();
      return;
    }

    if (event.target.id === "save-data-record") {
      if (!canManageDataControl()) return;
      if (!validateModalForm()) return;
      const collection = event.target.dataset.collection;
      const mode = event.target.dataset.mode;
      const recordId = event.target.dataset.record;
      const payload = collectDataRecordForm();
      await api(mode === "create" ? `/api/manage/${collection}` : `/api/manage/${collection}/${recordId}`, {
        method: mode === "create" ? "POST" : "PATCH",
        body: JSON.stringify(payload)
      });
      document.getElementById("modal").close();
      await load();
      state.view = event.target.dataset.returnView || "data";
      render();
      return;
    }

    if (event.target.id === "save-user-account") {
      if (!canManageUserManagement()) return;
      if (!validateModalForm()) return;
      await api("/api/users", {
        method: "POST",
        body: JSON.stringify({
          name: document.getElementById("admin-user-name").value,
          username: document.getElementById("admin-user-username").value,
          email: document.getElementById("admin-user-email").value,
          password: document.getElementById("admin-user-password").value,
          role: document.getElementById("admin-user-role").value,
          discipline: document.getElementById("admin-user-discipline").value,
          active: document.getElementById("admin-user-active").value === "true"
        })
      });
      document.getElementById("modal").close();
      await load();
      state.view = "users";
      render();
      return;
    }

    if (event.target.id === "new-commissioning-report") {
      const nextNumber = `CTR-${new Date().getFullYear()}-${String(commissioningReportGroups().length + 1).padStart(4, "0")}`;
      const reportTypes = (state.data.commissioningReportTypes || [
        { name: "Commissioning" },
        { name: "Acceptance Test" },
        { name: "Functional Test" },
        { name: "Protection Test" },
        { name: "Performance Test" },
        { name: "Calibration" },
        { name: "Other Test" }
      ]).filter(type => type.active !== false);
      const reportTypeOptions = reportTypes.map(type => `<option value="${esc(type.name)}">${esc(type.name)}</option>`).join("");
      const assetTypeOptions = (state.data.assetTypes || [])
        .filter(type => type.active !== false)
        .map(type => `<option value="${esc(type.name)}">${esc(type.code)} - ${esc(type.name)}</option>`)
        .join("");
      const plantRootId = state.data.assets.find(asset => !asset.parentId)?.id || "";
      openModal("Add Commissioning or Test Report", `
        <div class="form-grid">
          <label>Report Number <input id="commissioning-report-number" value="${esc(nextNumber)}" required></label>
          <label>Test Date <input id="commissioning-test-date" type="date" value="${esc(todayDateValue())}" required></label>
          <label class="full">Report Title <input id="commissioning-report-title" placeholder="Generator Unit 1 protection functional test" required></label>
          <div class="full-field asset-selector-row">
            <label>Asset / System <select id="commissioning-asset" required>${optionList(state.data.assets)}</select></label>
            <button class="secondary-button" id="toggle-quick-commissioning-asset" type="button">Add Asset</button>
          </div>
          <section class="quick-asset-panel full-field" id="quick-commissioning-asset-panel" hidden>
            <div class="quick-asset-head"><strong>Add Asset to Registry</strong><span>Saved for future reports and work orders</span></div>
            <div class="form-grid">
              <label>Asset Code <input id="commissioning-asset-code" placeholder="HYDRO-U1-PRT"></label>
              <label>Asset Name <input id="commissioning-asset-name" placeholder="Unit 1 protection panel"></label>
              <label>Asset Type <select id="commissioning-asset-type">${assetTypeOptions}</select></label>
              <label>Parent Asset <select id="commissioning-asset-parent"><option value="">No parent</option>${optionList(state.data.assets, plantRootId)}</select></label>
              <label>Location <input id="commissioning-asset-location" placeholder="Powerhouse"></label>
              <label>Criticality <select id="commissioning-asset-criticality"><option>Medium</option><option>High</option><option>Critical</option><option>Low</option></select></label>
            </div>
            <div class="actions-row"><button class="button" id="save-quick-commissioning-asset" type="button">Save Asset</button></div>
          </section>
          <div class="full-field asset-selector-row">
            <label>Report Type <select id="commissioning-report-type" required>${reportTypeOptions}</select></label>
            <button class="secondary-button" id="toggle-quick-commissioning-type" type="button">Add Report Type</button>
          </div>
          <section class="quick-asset-panel full-field" id="quick-commissioning-type-panel" hidden>
            <div class="quick-asset-head"><strong>Add Report Type</strong><span>Saved for future reports</span></div>
            <div class="form-grid"><label class="full">Report Type Name <input id="commissioning-new-report-type" maxlength="120" placeholder="Excitation system test"></label></div>
            <div class="actions-row"><button class="button" id="save-quick-commissioning-type" type="button">Save Report Type</button></div>
          </section>
          <label>Result
            <select id="commissioning-test-result">
              <option>Passed</option>
              <option>Passed with Observations</option>
              <option>Failed</option>
              <option>Pending</option>
            </select>
          </label>
          <label>Witnessed By <input id="commissioning-witness" placeholder="Name, team, or contractor"></label>
          <label class="full">Notes <textarea id="commissioning-notes" placeholder="Scope, observations, punch-list reference, or acceptance notes"></textarea></label>
          <label class="full">Report Files <input id="commissioning-files" type="file" multiple required accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.ppt,.pptx,.jpg,.jpeg,.png,.zip"></label>
        </div>
        <div class="actions-row"><button class="button" id="save-commissioning-report" type="button">Upload Report</button></div>
      `);
      return;
    }

    if (event.target.id === "toggle-quick-commissioning-asset") {
      const panel = document.getElementById("quick-commissioning-asset-panel");
      panel.hidden = !panel.hidden;
      event.target.textContent = panel.hidden ? "Add Asset" : "Close Asset Form";
      if (!panel.hidden) document.getElementById("commissioning-asset-code").focus();
      return;
    }

    if (event.target.id === "save-quick-commissioning-asset") {
      const code = document.getElementById("commissioning-asset-code").value.trim();
      const name = document.getElementById("commissioning-asset-name").value.trim();
      const type = document.getElementById("commissioning-asset-type").value;
      if (!code || !name || !type) {
        alert("Enter the asset code, asset name, and asset type.");
        return;
      }
      const saveButton = event.target;
      saveButton.disabled = true;
      saveButton.textContent = "Saving...";
      try {
        const asset = await api("/api/assets/quick", {
          method: "POST",
          body: JSON.stringify({
            code,
            name,
            type,
            parentId: document.getElementById("commissioning-asset-parent").value,
            location: document.getElementById("commissioning-asset-location").value,
            criticality: document.getElementById("commissioning-asset-criticality").value
          })
        });
        state.data.assets.push(asset);
        const assetSelect = document.getElementById("commissioning-asset");
        const option = document.createElement("option");
        option.value = asset.id;
        option.textContent = `${asset.code} - ${asset.name}`;
        option.selected = true;
        assetSelect.appendChild(option);
        document.getElementById("quick-commissioning-asset-panel").hidden = true;
        document.getElementById("toggle-quick-commissioning-asset").textContent = "Asset Added";
      } catch (error) {
        alert(error.message);
      } finally {
        saveButton.disabled = false;
        saveButton.textContent = "Save Asset";
      }
      return;
    }

    if (event.target.id === "toggle-quick-commissioning-type") {
      const panel = document.getElementById("quick-commissioning-type-panel");
      panel.hidden = !panel.hidden;
      event.target.textContent = panel.hidden ? "Add Report Type" : "Close Type Form";
      if (!panel.hidden) document.getElementById("commissioning-new-report-type").focus();
      return;
    }

    if (event.target.id === "save-quick-commissioning-type") {
      const name = document.getElementById("commissioning-new-report-type").value.trim();
      if (!name) {
        alert("Enter the report type name.");
        return;
      }
      const saveButton = event.target;
      saveButton.disabled = true;
      saveButton.textContent = "Saving...";
      try {
        const reportType = await api("/api/commissioning-report-types", {
          method: "POST",
          body: JSON.stringify({ name })
        });
        state.data.commissioningReportTypes = state.data.commissioningReportTypes || [];
        state.data.commissioningReportTypes.push(reportType);
        const typeSelect = document.getElementById("commissioning-report-type");
        const option = document.createElement("option");
        option.value = reportType.name;
        option.textContent = reportType.name;
        option.selected = true;
        typeSelect.appendChild(option);
        document.getElementById("quick-commissioning-type-panel").hidden = true;
        document.getElementById("toggle-quick-commissioning-type").textContent = "Type Added";
      } catch (error) {
        alert(error.message);
      } finally {
        saveButton.disabled = false;
        saveButton.textContent = "Save Report Type";
      }
      return;
    }

    if (event.target.id === "save-commissioning-report") {
      if (!validateModalForm()) return;
      const input = document.getElementById("commissioning-files");
      const files = Array.from(input.files || []);
      if (!files.length) {
        alert("Choose one or more report files.");
        return;
      }
      const reportNumber = document.getElementById("commissioning-report-number").value.trim();
      const duplicate = (state.data.attachments || []).some(file => file.module === "commissioning-test-reports" && String(file.reportNumber || "").toLowerCase() === reportNumber.toLowerCase());
      if (duplicate) {
        alert("This report number already exists. Use a unique report number.");
        return;
      }
      const reportTitle = document.getElementById("commissioning-report-title").value.trim();
      const assetId = document.getElementById("commissioning-asset").value;
      const uploadButton = event.target;
      const metadata = {
        module: "commissioning-test-reports",
        category: document.getElementById("commissioning-report-type").value,
        linkedType: "asset",
        linkedId: assetId,
        description: document.getElementById("commissioning-notes").value,
        documentDate: document.getElementById("commissioning-test-date").value,
        reportNumber,
        reportTitle,
        testResult: document.getElementById("commissioning-test-result").value,
        witnessedBy: document.getElementById("commissioning-witness").value,
        immutable: true
      };
      uploadButton.disabled = true;
      try {
        for (let index = 0; index < files.length; index += 1) {
          const displayName = files.length === 1 ? reportTitle : `${reportTitle} - ${fileBaseName(files[index].name)}`;
          uploadButton.textContent = `Uploading ${index + 1} of ${files.length}`;
          await uploadAttachmentFile(files[index], { ...metadata, displayName });
        }
      } finally {
        uploadButton.disabled = false;
        uploadButton.textContent = "Upload Report";
      }
      document.getElementById("modal").close();
      await load();
      state.view = "commissioningReports";
      state.commissioningNotice = `${reportNumber} uploaded and locked.`;
      render();
      return;
    }

    if (event.target.id === "export-commissioning-register") {
      downloadXlsx(`HYDRO_Commissioning_Test_Report_Register_${todayDateValue()}.xlsx`, commissioningReportWorkbookRows(), {
        sheetName: "Commissioning Tests",
        headerRows: [1]
      });
      return;
    }

    if (event.target.id === "print-commissioning-register") {
      printWebSheet("#commissioningReports .commissioning-report-table", "Hydro Plant Commissioning and Test Report Register");
      return;
    }

    if (event.target.id === "upload-attachment") {
      const input = document.getElementById("attachment-file");
      const files = Array.from(input.files || []);
      if (!files.length) {
        alert("Choose one or more files first.");
        return;
      }
      const oversizedFiles = files.filter(file => file.size > maxAttachmentSize);
      if (oversizedFiles.length) {
        alert(`These files exceed the 500 MB limit: ${oversizedFiles.map(file => file.name).join(", ")}`);
        return;
      }
      const linkValue = document.getElementById("attachment-link").value;
      const [linkedType, linkedId] = linkValue ? linkValue.split(":") : ["", ""];
      const uploadButton = event.target;
      const metadata = {
        module: document.getElementById("attachment-module").value,
        category: document.getElementById("attachment-category").value,
        linkedType,
        linkedId,
        description: document.getElementById("attachment-description").value
      };
      uploadButton.disabled = true;
      try {
        for (let index = 0; index < files.length; index += 1) {
          uploadButton.textContent = `Uploading ${index + 1} of ${files.length}`;
          await uploadAttachmentFile(files[index], metadata);
        }
      } finally {
        uploadButton.disabled = false;
        uploadButton.textContent = "Upload Files";
      }
      await load();
      state.view = "documents";
      render();
      return;
    }

    const archiveFolderButton = event.target.closest("[data-archive-folder]");
    if (archiveFolderButton) {
      state.archiveCurrentFolder = archiveFolderButton.dataset.archiveFolder;
      state.archiveNotice = `Current folder: ${state.archiveCurrentFolder}`;
      renderMaintenanceArchive();
      return;
    }

    if (event.target.id === "archive-use-current-folder") {
      const folderInput = document.getElementById("archive-folder");
      if (folderInput) {
        folderInput.value = currentArchiveFolder();
        folderInput.focus();
      }
      return;
    }

    if (event.target.id === "archive-new-folder") {
      const folderInput = document.getElementById("archive-folder");
      if (folderInput) {
        folderInput.value = "";
        folderInput.focus();
      }
      return;
    }

    if (event.target.id === "archive-create-folder") {
      const folderInput = document.getElementById("archive-folder");
      const parentFolder = document.getElementById("archive-parent-folder")?.value || "";
      const folderName = combineArchiveFolderPath(parentFolder, folderInput?.value || "");
      if (!folderName) {
        alert("Enter a new directory name first.");
        folderInput?.focus();
        return;
      }
      let folder;
      let permanent = true;
      try {
        folder = await api("/api/archive-folders", {
          method: "POST",
          body: JSON.stringify({ name: folderName })
        });
        await load();
      } catch (error) {
        if (!/API route not found|not found/i.test(error.message || "")) throw error;
        permanent = false;
        state.data.archiveFolders = Array.isArray(state.data.archiveFolders) ? state.data.archiveFolders : [];
        archiveFolderPathChain(folderName).forEach((pathName, index) => {
          if (state.data.archiveFolders.some(item => String(item.name || "").toLowerCase() === pathName.toLowerCase())) return;
          state.data.archiveFolders.push({
            id: `local-${Date.now()}-${index}`,
            name: pathName,
            createdByName: state.data.currentUser?.name || "",
            createdAt: new Date().toISOString(),
            manual: true
          });
        });
        folder = { name: folderName };
      }
      state.view = "maintenanceArchive";
      state.archiveCurrentFolder = folder.name || folderName;
      state.archiveNotice = permanent
        ? `Directory ready: ${state.archiveCurrentFolder}`
        : `Directory ready: ${state.archiveCurrentFolder}. Restart the local server to save empty directories permanently.`;
      render();
      return;
    }

    if (event.target.id === "archive-search-button") {
      state.archiveSearch = document.getElementById("archive-search")?.value.trim() || "";
      renderMaintenanceArchive();
      return;
    }

    if (event.target.id === "archive-clear-search") {
      state.archiveSearch = "";
      renderMaintenanceArchive();
      return;
    }

    if (event.target.id === "upload-archive") {
      const input = document.getElementById("archive-file");
      const files = Array.from(input.files || []);
      const archiveFolder = currentArchiveFolder();
      if (!archiveFolder) {
        alert("Create or select a folder first.");
        return;
      }
      if (!files.length) {
        alert("Choose one or more files first.");
        return;
      }
      const oversizedFiles = files.filter(file => file.size > maxAttachmentSize);
      if (oversizedFiles.length) {
        alert(`These files exceed the 500 MB limit: ${oversizedFiles.map(file => file.name).join(", ")}`);
        return;
      }
      const documentDate = document.getElementById("archive-date")?.value || "";
      const note = document.getElementById("archive-description")?.value.trim() || "";
      if (!documentDate) {
        alert("Select the document date first.");
        return;
      }
      if (!note) {
        alert("Write a note for this upload first.");
        return;
      }
      const missingNames = files.filter((file, index) => !(document.querySelector(`[data-archive-display-name="${index}"]`)?.value.trim() || fileBaseName(file.name)));
      if (missingNames.length) {
        alert("Check the clear document name for each selected file.");
        return;
      }
      const uploadButton = event.target;
      const baseMetadata = {
        module: "plant-maintenance-archive",
        category: document.getElementById("archive-category").value,
        linkedType: "",
        linkedId: "",
        archiveFolder,
        immutable: true,
        description: note,
        documentDate
      };
      uploadButton.disabled = true;
      try {
        for (let index = 0; index < files.length; index += 1) {
          const displayName = document.querySelector(`[data-archive-display-name="${index}"]`)?.value.trim() || fileBaseName(files[index].name);
          uploadButton.textContent = `Uploading ${index + 1} of ${files.length}`;
          await uploadAttachmentFile(files[index], { ...baseMetadata, displayName });
        }
        state.archiveNotice = `${files.length} file${files.length === 1 ? "" : "s"} uploaded to ${archiveFolder}.`;
        state.archiveCurrentFolder = archiveFolder;
      } finally {
        uploadButton.disabled = false;
        uploadButton.textContent = "Upload to Current Folder";
      }
      await load();
      state.view = "maintenanceArchive";
      render();
      return;
    }

    const approveArchive = event.target.closest("[data-approve-archive]");
    if (approveArchive) {
      if (!canAdminOverride()) return;
      await api(`/api/attachments/${approveArchive.dataset.approveArchive}/approve`, { method: "PATCH" });
      await load();
      state.view = "maintenanceArchive";
      render();
      return;
    }

    const downloadAttachment = event.target.closest("[data-download-attachment]");
    if (downloadAttachment) {
      const file = (state.data.attachments || []).find(item => item.id === downloadAttachment.dataset.downloadAttachment);
      const response = await fetch(`/api/attachments/${downloadAttachment.dataset.downloadAttachment}/download`, {
        headers: { Authorization: `Bearer ${state.authToken}` }
      });
      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload.error || "Download failed");
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = file?.name || "attachment";
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      return;
    }

    const deleteAttachment = event.target.closest("[data-delete-attachment]");
    if (deleteAttachment) {
      const file = (state.data.attachments || []).find(item => item.id === deleteAttachment.dataset.deleteAttachment);
      if (!confirm(`Delete ${file?.name || "this file"}?`)) return;
      await api(`/api/attachments/${deleteAttachment.dataset.deleteAttachment}`, { method: "DELETE" });
      await load();
      state.view = file?.module === "plant-maintenance-archive"
        ? "maintenanceArchive"
        : file?.module === "commissioning-test-reports"
          ? "commissioningReports"
          : "documents";
      render();
      return;
    }

    if (event.target.id === "export-work-xlsx") {
      const rows = workOrderExportRows(filtered(state.data.workOrders, ["number", "title", "assetName", "status", "priority", "type", "assignedName", "description", "materialsRequired"]));
      downloadXlsx("Hydro_Work_Orders.xlsx", rows, { sheetName: "Work Orders", headerRows: [1] });
      return;
    }

    if (event.target.id === "export-work-word") {
      downloadWorkOrdersWord(filtered(state.data.workOrders, ["number", "title", "assetName", "status", "priority", "type", "assignedName", "description", "materialsRequired"]));
      return;
    }

    if (event.target.id === "export-work-pdf") {
      printWorkOrders();
      return;
    }

    const printWorkOrderButton = event.target.closest("[data-print-wo]");
    if (printWorkOrderButton) {
      const wo = state.data.workOrders.find(item => item.id === printWorkOrderButton.dataset.printWo);
      if (wo) printWorkOrder(wo);
      return;
    }

    const viewWorkOrder = event.target.closest("[data-view-wo]");
    if (viewWorkOrder) {
      const wo = state.data.workOrders.find(item => item.id === viewWorkOrder.dataset.viewWo);
      if (wo) openWorkOrderDetails(wo);
      return;
    }

    const completeWorkOrder = event.target.closest("[data-complete-wo]");
    if (completeWorkOrder) {
      const wo = state.data.workOrders.find(item => item.id === completeWorkOrder.dataset.completeWo);
      if (wo) openWorkOrderCompletionModal(wo);
      return;
    }

    const editWorkOrder = event.target.closest("[data-edit-wo]");
    if (editWorkOrder) {
      if (!canAdminOverride()) return;
      const wo = state.data.workOrders.find(item => item.id === editWorkOrder.dataset.editWo);
      if (wo) openWorkOrderEditModal(wo);
      return;
    }

    if (event.target.id === "save-work-order-edit") {
      if (!canAdminOverride()) return;
      const workOrderId = event.target.dataset.workId;
      const assignedToList = Array.from(document.getElementById("edit-wo-assigned").selectedOptions).map(option => option.value);
      await api(`/api/work-orders/${encodeURIComponent(workOrderId)}`, {
        method: "PATCH",
        body: JSON.stringify({
          title: document.getElementById("edit-wo-title").value,
          description: document.getElementById("edit-wo-description").value,
          assetId: document.getElementById("edit-wo-asset").value,
          type: document.getElementById("edit-wo-type").value,
          priority: document.getElementById("edit-wo-priority").value,
          status: document.getElementById("edit-wo-status").value,
          assignedTo: assignedToList[0] || "",
          assignedToList,
          dueDate: document.getElementById("edit-wo-due").value,
          estimatedHours: Number(document.getElementById("edit-wo-estimated-hours").value || 0),
          materialsRequired: document.getElementById("edit-wo-materials").value,
          downtimeHours: Number(document.getElementById("edit-wo-downtime").value || 0),
          safetyRequired: document.getElementById("edit-wo-safety").value === "true",
          lotoRequired: document.getElementById("edit-wo-loto").value === "true",
          completionNotes: document.getElementById("edit-wo-completion").value
        })
      });
      document.getElementById("modal").close();
      await load();
      state.view = "work";
      state.workNotice = "Work order updated by System Administrator.";
      render();
      return;
    }

    const revertWorkOrder = event.target.closest("[data-revert-wo]");
    if (revertWorkOrder) {
      if (!canAdminOverride()) return;
      const comment = prompt("Admin revert comment", "Reverted by System Administrator") || "";
      await api(`/api/work-orders/${encodeURIComponent(revertWorkOrder.dataset.revertWo)}/revert`, {
        method: "POST",
        body: JSON.stringify({ status: "Requested", comment })
      });
      const modal = document.getElementById("modal");
      if (modal.open) modal.close();
      await load();
      state.view = "work";
      state.workNotice = "Work order reverted to Requested.";
      render();
      return;
    }

    const deleteWorkOrder = event.target.closest("[data-delete-wo]");
    if (deleteWorkOrder) {
      if (!canAdminOverride()) return;
      const wo = state.data.workOrders.find(item => item.id === deleteWorkOrder.dataset.deleteWo);
      if (!confirm(`Delete ${wo?.number || "this work order"} permanently?`)) return;
      await api(`/api/work-orders/${encodeURIComponent(deleteWorkOrder.dataset.deleteWo)}`, { method: "DELETE" });
      const modal = document.getElementById("modal");
      if (modal.open) modal.close();
      await load();
      state.view = "work";
      state.workNotice = "Work order deleted by System Administrator.";
      render();
      return;
    }

    if (event.target.id === "submit-work-completion") {
      const workOrderId = event.target.dataset.workId;
      const file = document.getElementById("wo-completion-file").files?.[0];
      if (!file) {
        alert("Attach the completion PDF report first.");
        return;
      }
      if (!file.name.toLowerCase().endsWith(".pdf") && !String(file.type || "").toLowerCase().includes("pdf")) {
        alert("Completion report must be a PDF file.");
        return;
      }
      const uploaded = await uploadAttachmentFile(file, {
        module: "Work Orders",
        category: "Completion Report",
        linkedType: "workOrder",
        linkedId: workOrderId,
        description: "Work order completion report"
      });
      await api(`/api/work-orders/${encodeURIComponent(workOrderId)}/complete`, {
        method: "POST",
        body: JSON.stringify({
          completionNotes: document.getElementById("wo-completion-notes").value,
          reportId: uploaded.id
        })
      });
      document.getElementById("modal").close();
      await load();
      state.view = "work";
      render();
      return;
    }

    const reviewWorkOrder = event.target.closest("[data-review-wo]");
    if (reviewWorkOrder) {
      if (!canApproveMaintenance()) return;
      const action = reviewWorkOrder.dataset.workAction;
      const comment = document.getElementById(`work-review-comment-${reviewWorkOrder.dataset.reviewWo}`)?.value.trim() || "";
      if (action === "reject" && !comment) {
        alert("Enter a comment before rejecting.");
        return;
      }
      try {
        await api(`/api/work-orders/${encodeURIComponent(reviewWorkOrder.dataset.reviewWo)}/review`, {
          method: "POST",
          body: JSON.stringify({ action, comment })
        });
        document.getElementById("modal").close();
        await load();
        state.view = "work";
        state.workNotice = action === "approve" ? "Work order final approved and verified." : "Work order completion rejected.";
        render();
      } catch (error) {
        alert(error.message);
      }
      return;
    }

    const approveWorkOrder = event.target.closest("[data-approve-wo]");
    if (approveWorkOrder) {
      if (!canApproveMaintenance()) return;
      const action = approveWorkOrder.dataset.workAction;
      let comment = document.getElementById(`work-approval-comment-${approveWorkOrder.dataset.approveWo}`)?.value.trim() || "";
      if (action === "reject" && !comment) {
        comment = prompt("Enter rejection comment")?.trim() || "";
        if (!comment) return;
      }
      try {
        await api(`/api/work-orders/${encodeURIComponent(approveWorkOrder.dataset.approveWo)}/approval`, {
          method: "POST",
          body: JSON.stringify({
            action,
            comment
          })
        });
        const modal = document.getElementById("modal");
        if (modal.open) modal.close();
        await load();
        state.view = "work";
        state.workNotice = action === "approve" ? "Work order approved. The worker can now submit the PDF report." : "Work order rejected.";
        render();
      } catch (error) {
        alert(error.message);
      }
      return;
    }

    if (event.target.id === "new-work-order") {
      const typeOptions = (state.data.maintenanceTypes || [])
        .filter(item => item.active !== false)
        .map(item => `<option value="${esc(item.name)}">${esc(item.code)} - ${esc(item.name)}</option>`)
        .join("");
      const assigneeOptions = state.data.users
        .filter(user => user.active !== false)
        .map(user => `<option value="${esc(user.id)}">${esc(user.name)} - ${esc(user.role)}</option>`)
        .join("");
      const assetTypeOptions = (state.data.assetTypes || [])
        .filter(item => item.active !== false)
        .map(item => `<option value="${esc(item.name)}">${esc(item.code)} - ${esc(item.name)}</option>`)
        .join("");
      const plantRootId = state.data.assets.find(asset => !asset.parentId)?.id || "";
      openModal("Create Work Order", `
        <div class="form-grid">
          <label class="full">Title <input id="wo-title" required></label>
          <label class="full">Work Description <textarea id="wo-description"></textarea></label>
          <div class="full-field asset-selector-row">
            <label>Asset <select id="wo-asset" required>${optionList(state.data.assets)}</select></label>
            <button class="secondary-button" id="toggle-quick-work-asset" type="button">Add Asset</button>
          </div>
          <section class="quick-asset-panel full-field" id="quick-work-asset-panel" hidden>
            <div class="quick-asset-head"><strong>Add Asset to Registry</strong><span>Saved for future work orders</span></div>
            <div class="form-grid">
              <label>Asset Code <input id="quick-asset-code" placeholder="HYDRO-U1-AUX"></label>
              <label>Asset Name <input id="quick-asset-name" placeholder="Unit 1 auxiliary pump"></label>
              <label>Asset Type <select id="quick-asset-type">${assetTypeOptions}</select></label>
              <label>Parent Asset <select id="quick-asset-parent"><option value="">No parent</option>${optionList(state.data.assets, plantRootId)}</select></label>
              <label>Location <input id="quick-asset-location" placeholder="Powerhouse"></label>
              <label>Criticality <select id="quick-asset-criticality"><option>Medium</option><option>High</option><option>Critical</option><option>Low</option></select></label>
            </div>
            <div class="actions-row"><button class="button" id="save-quick-work-asset" type="button">Save Asset</button></div>
          </section>
          <label>Maintenance Type <select id="wo-type">${typeOptions}</select></label>
          <label>Priority <select id="wo-priority"><option>Medium</option><option>Critical</option><option>High</option><option>Low</option></select></label>
          <label class="full">Assigned People <select id="wo-assigned" multiple size="8">${assigneeOptions}</select></label>
          <label>Due Date <input id="wo-due" type="date"></label>
          <label>Estimated Work Hours <input id="wo-estimated-hours" type="number" min="0" step="0.25" placeholder="0"></label>
          <label><span>Safety Required</span><select id="wo-safety"><option value="false">No</option><option value="true">Yes</option></select></label>
          <label><span>LOTO Required</span><select id="wo-loto"><option value="false">No</option><option value="true">Yes</option></select></label>
          <label class="full">Materials Required <textarea id="wo-materials" placeholder="List materials, spare parts, tools, and quantities"></textarea></label>
        </div>
        <div class="actions-row"><button class="button" id="save-work-order" type="button">Create</button></div>
      `);
      return;
    }

    if (event.target.id === "toggle-quick-work-asset") {
      const panel = document.getElementById("quick-work-asset-panel");
      panel.hidden = !panel.hidden;
      event.target.textContent = panel.hidden ? "Add Asset" : "Close Asset Form";
      if (!panel.hidden) document.getElementById("quick-asset-code").focus();
      return;
    }

    if (event.target.id === "save-quick-work-asset") {
      const code = document.getElementById("quick-asset-code").value.trim();
      const name = document.getElementById("quick-asset-name").value.trim();
      const type = document.getElementById("quick-asset-type").value;
      if (!code || !name || !type) {
        alert("Enter the asset code, asset name, and asset type.");
        return;
      }
      const saveButton = event.target;
      saveButton.disabled = true;
      saveButton.textContent = "Saving...";
      try {
        const asset = await api("/api/assets/quick", {
          method: "POST",
          body: JSON.stringify({
            code,
            name,
            type,
            parentId: document.getElementById("quick-asset-parent").value,
            location: document.getElementById("quick-asset-location").value,
            criticality: document.getElementById("quick-asset-criticality").value
          })
        });
        state.data.assets.push(asset);
        const assetSelect = document.getElementById("wo-asset");
        const option = document.createElement("option");
        option.value = asset.id;
        option.textContent = `${asset.code} - ${asset.name}`;
        option.selected = true;
        assetSelect.appendChild(option);
        document.getElementById("quick-work-asset-panel").hidden = true;
        document.getElementById("toggle-quick-work-asset").textContent = "Asset Added";
      } catch (error) {
        alert(error.message);
      } finally {
        saveButton.disabled = false;
        saveButton.textContent = "Save Asset";
      }
      return;
    }

    if (event.target.id === "save-work-order") {
      if (!validateModalForm()) return;
      const assignedToList = Array.from(document.getElementById("wo-assigned").selectedOptions).map(option => option.value);
      await api("/api/work-orders", {
        method: "POST",
        body: JSON.stringify({
          title: document.getElementById("wo-title").value,
          description: document.getElementById("wo-description").value,
          assetId: document.getElementById("wo-asset").value,
          type: document.getElementById("wo-type").value,
          priority: document.getElementById("wo-priority").value,
          assignedTo: assignedToList[0] || "",
          assignedToList,
          dueDate: document.getElementById("wo-due").value,
          estimatedHours: Number(document.getElementById("wo-estimated-hours").value || 0),
          materialsRequired: document.getElementById("wo-materials").value,
          safetyRequired: document.getElementById("wo-safety").value === "true",
          lotoRequired: document.getElementById("wo-loto").value === "true"
        })
      });
      document.getElementById("modal").close();
      await load();
      state.view = "work";
      render();
      return;
    }

    const closeButton = event.target.closest("[data-close-wo]");
    if (closeButton) {
      await api(`/api/work-orders/${closeButton.dataset.closeWo}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "Closed", completionNotes: "Closed from dashboard quick action." })
      });
      await load();
      return;
    }

    const newLogEntry = event.target.closest("[data-new-log-entry]");
    if (newLogEntry) {
      const category = newLogEntry.dataset.newLogEntry === "maintenance" ? "maintenance" : "operations";
      const typeOptions = category === "maintenance"
        ? ["Maintenance Activity", "Inspection", "Defect", "Testing", "Work Handover"]
        : ["Observation", "Status", "Abnormal Observation", "Inspection", "Dispatch Instruction"];
      const shiftOptions = category === "maintenance"
        ? "<option>Day</option><option>Night</option>"
        : operationShiftOptions();
      openModal(`Add ${category === "maintenance" ? "Maintenance" : "Operations"} Log Entry`, `
        <div class="form-grid">
          <input id="log-category" type="hidden" value="${esc(category)}">
          <label>Shift <select id="log-shift">${shiftOptions}</select></label>
          <label>Asset <select id="log-asset">${optionList(state.data.assets)}</select></label>
          <label>Unit/System <input id="log-unit" placeholder="Unit 1"></label>
          <label>Type <select id="log-type">${typeOptions.map(type => `<option>${esc(type)}</option>`).join("")}</select></label>
          <label>Severity <select id="log-severity"><option>Info</option><option>Warning</option><option>Critical</option></select></label>
          <label class="full">Description <textarea id="log-description"></textarea></label>
        </div>
        <div class="actions-row"><button class="button" id="save-log-entry" type="button">Submit Log Entry</button></div>
      `);
      return;
    }

    if (event.target.id === "save-log-entry") {
      if (!validateModalForm()) return;
      await api("/api/log-entries", {
        method: "POST",
        body: JSON.stringify({
          shift: document.getElementById("log-shift").value,
          assetId: document.getElementById("log-asset").value,
          unit: document.getElementById("log-unit").value,
          type: document.getElementById("log-type").value,
          severity: document.getElementById("log-severity").value,
          description: document.getElementById("log-description").value,
          category: document.getElementById("log-category").value
        })
      });
      const category = document.getElementById("log-category").value;
      document.getElementById("modal").close();
      await load();
      state.view = category === "maintenance" ? "maintenanceLogbook" : "logbook";
      render();
      return;
    }

    const reviewLog = event.target.closest("[data-review-log]");
    if (reviewLog) {
      const category = reviewLog.dataset.logCategory === "maintenance" ? "maintenance" : "operations";
      if (category === "maintenance" ? !canApproveMaintenance() : !canApproveOperations()) return;
      const comment = document.getElementById(`log-review-comment-${reviewLog.dataset.reviewLog}`)?.value.trim() || "";
      if (reviewLog.dataset.logAction === "reject" && !comment) {
        alert("Enter a comment before rejecting.");
        return;
      }
      await api(`/api/log-entries/${reviewLog.dataset.reviewLog}/review`, {
        method: "PATCH",
        body: JSON.stringify({ action: reviewLog.dataset.logAction, comment })
      });
      await load();
      state.view = category === "maintenance" ? "maintenanceLogbook" : "logbook";
      render();
      return;
    }

    const editLog = event.target.closest("[data-edit-log]");
    if (editLog) {
      if (!canAdminOverride()) return;
      const log = state.data.logEntries.find(item => item.id === editLog.dataset.editLog);
      if (log) openLogEntryEditModal(log);
      return;
    }

    if (event.target.id === "save-log-entry-edit") {
      if (!canAdminOverride()) return;
      const category = event.target.dataset.logCategory === "maintenance" ? "maintenance" : "operations";
      await api(`/api/log-entries/${encodeURIComponent(event.target.dataset.logId)}`, {
        method: "PATCH",
        body: JSON.stringify({
          shift: document.getElementById("edit-log-shift").value,
          entryTime: document.getElementById("edit-log-time").value || new Date().toISOString(),
          assetId: document.getElementById("edit-log-asset").value,
          unit: document.getElementById("edit-log-unit").value,
          type: document.getElementById("edit-log-type").value,
          severity: document.getElementById("edit-log-severity").value,
          status: document.getElementById("edit-log-status").value,
          description: document.getElementById("edit-log-description").value,
          category
        })
      });
      document.getElementById("modal").close();
      await load();
      state.view = category === "maintenance" ? "maintenanceLogbook" : "logbook";
      render();
      return;
    }

    const revertLog = event.target.closest("[data-revert-log]");
    if (revertLog) {
      if (!canAdminOverride()) return;
      const category = revertLog.dataset.logCategory === "maintenance" ? "maintenance" : "operations";
      const comment = prompt("Admin revert comment", "Reverted by System Administrator") || "";
      await api(`/api/log-entries/${encodeURIComponent(revertLog.dataset.revertLog)}/revert`, {
        method: "PATCH",
        body: JSON.stringify({ comment })
      });
      await load();
      state.view = category === "maintenance" ? "maintenanceLogbook" : "logbook";
      render();
      return;
    }

    const deleteLog = event.target.closest("[data-delete-log]");
    if (deleteLog) {
      if (!canAdminOverride()) return;
      const category = deleteLog.dataset.logCategory === "maintenance" ? "maintenance" : "operations";
      if (!confirm("Delete this logbook entry permanently?")) return;
      await api(`/api/log-entries/${encodeURIComponent(deleteLog.dataset.deleteLog)}`, { method: "DELETE" });
      await load();
      state.view = category === "maintenance" ? "maintenanceLogbook" : "logbook";
      render();
      return;
    }

    const stockButton = event.target.closest("[data-adjust-stock]");
    if (stockButton) {
      const item = state.data.inventory.find(candidate => candidate.id === stockButton.dataset.adjustStock);
      openModal("Adjust Stock", `
        <p><strong>${esc(item.code)}</strong> - ${esc(item.name)}</p>
        <label class="form-grid">Quantity <input id="stock-qty" type="number" step="any" min="0" value="${esc(item.qty)}"></label>
        <div class="actions-row"><button class="button" id="save-stock" type="button" data-item="${esc(item.id)}">Update</button></div>
      `);
      return;
    }

    if (event.target.id === "save-stock") {
      if (!validateModalForm()) return;
      await api(`/api/inventory/${event.target.dataset.item}`, {
        method: "PATCH",
        body: JSON.stringify({ qty: document.getElementById("stock-qty").value })
      });
      document.getElementById("modal").close();
      await load();
      return;
    }

    const saveUsername = event.target.closest("[data-save-username]");
    if (saveUsername) {
      if (!canManageUserManagement()) return;
      const usernameInput = document.getElementById(saveUsername.dataset.usernameInput);
      if (!usernameInput) return;
      await api(`/api/users/${saveUsername.dataset.saveUsername}/username`, {
        method: "PATCH",
        body: JSON.stringify({ username: usernameInput.value })
      });
      await load();
      state.view = "users";
      render();
      return;
    }

    const saveRole = event.target.closest("[data-save-user-role]");
    if (saveRole) {
      if (!canManageUserManagement()) return;
      const roleSelect = document.getElementById(saveRole.dataset.roleSelect);
      if (!roleSelect) return;
      await api(`/api/users/${saveRole.dataset.saveUserRole}/role`, {
        method: "PATCH",
        body: JSON.stringify({ role: roleSelect.value })
      });
      await load();
      return;
    }

    const toggleUser = event.target.closest("[data-toggle-user]");
    if (toggleUser) {
      if (!canManageUserManagement()) return;
      await api(`/api/users/${toggleUser.dataset.toggleUser}/active`, {
        method: "PATCH",
        body: JSON.stringify({ active: toggleUser.dataset.active === "true" })
      });
      await load();
      return;
    }

    const resetUserPassword = event.target.closest("[data-reset-user-password]");
    if (resetUserPassword) {
      if (!canManageUserManagement()) return;
      const targetUser = state.data.users.find(candidate => candidate.id === resetUserPassword.dataset.resetUserPassword);
      openModal("Reset Password", `
        <p><strong>${esc(targetUser?.name || "User")}</strong></p>
        <div class="form-grid">
          <label>Temporary Password <input id="temporary-user-password" type="password" minlength="8" autocomplete="new-password" required></label>
          <label>Confirm Temporary Password <input id="confirm-temporary-user-password" type="password" minlength="8" autocomplete="new-password" required></label>
        </div>
        <div class="actions-row"><button class="button" id="save-user-password" type="button" data-user="${esc(resetUserPassword.dataset.resetUserPassword)}">Save Password</button></div>
        <p id="password-reset-message" class="password-reset-message" aria-live="polite"></p>
      `);
      return;
    }

    if (event.target.id === "save-user-password") {
      if (!validateModalForm()) return;
      const password = document.getElementById("temporary-user-password").value;
      const confirmation = document.getElementById("confirm-temporary-user-password").value;
      const message = document.getElementById("password-reset-message");
      message.classList.remove("success", "error");
      if (password !== confirmation) {
        message.textContent = "Temporary passwords do not match.";
        message.classList.add("error");
        document.getElementById("confirm-temporary-user-password").focus();
        return;
      }
      try {
        const result = await api(`/api/users/${event.target.dataset.user}/password`, {
          method: "PATCH",
          body: JSON.stringify({ password })
        });
        message.textContent = `${result.message} The user must change this temporary password at next login.`;
        message.classList.add("success");
        event.target.disabled = true;
      } catch (error) {
        message.textContent = error.message || "Password reset failed.";
        message.classList.add("error");
      }
      return;
    }

    if (event.target.id === "refresh-email-status") {
      if (!canManageUserManagement()) return;
      const status = await api("/api/email/status");
      document.getElementById("email-status").textContent = `Enabled: ${status.enabled}. Configured: ${status.configured}. Host: ${status.host}:${status.port}. From: ${status.from}.`;
      return;
    }

    if (event.target.id === "send-test-email") {
      if (!canManageUserManagement()) return;
      try {
        const result = await api("/api/email/test", {
          method: "POST",
          body: JSON.stringify({ to: document.getElementById("test-email-to").value })
        });
        document.getElementById("email-status").textContent = result.sent ? "Test email sent." : `Email not sent: ${result.reason}`;
      } catch (error) {
        document.getElementById("email-status").textContent = error.message;
      }
    }
  });

  document.getElementById("global-search").addEventListener("input", event => {
    state.search = event.target.value;
    render();
  });

  document.addEventListener("input", event => {
    if (event.target.closest("#outage-from-date, #outage-from-time, #outage-to-date, #outage-to-time")) {
      updateOutageEnergyPreview();
      return;
    }
    const dailyGenerationInput = event.target.closest("[data-daily-generation-field]");
    if (!dailyGenerationInput || !canEditDailyGenerationReport()) return;
    const date = dailyGenerationDate();
    dailyGenerationManual(date)[dailyGenerationInput.dataset.dailyGenerationField] = dailyGenerationInput.value;
    saveDailyGenerationReport(date);
  });

  document.addEventListener("paste", event => {
    const productionInput = event.target.closest("[data-production-field]");
    const productionMetaInput = event.target.closest("[data-production-meta]");
    const shuntInput = event.target.closest("[data-shunt-field]");
    const lineInput = event.target.closest("[data-line-field]");
    const meterInput = event.target.closest("[data-meter-field]");
    const energyInput = event.target.closest("[data-energy-field]");
    const waterInput = event.target.closest("[data-water-field]");
    const dailyGenerationInput = event.target.closest("[data-daily-generation-field]");
    if (!productionInput && !productionMetaInput && !shuntInput && !lineInput && !meterInput && !energyInput && !waterInput && !dailyGenerationInput) return;
    const text = event.clipboardData?.getData("text/plain") || "";
    if (!text.includes("\t") && !text.includes("\n")) return;
    const pasted = waterInput
      ? pasteWaterLevelCells(waterInput, text)
      : dailyGenerationInput
      ? pasteDailyGenerationCells(dailyGenerationInput, text)
      : energyInput
      ? pasteEnergyMeterCells(energyInput, text)
      : meterInput
      ? pasteProductionMeterCells(meterInput, text)
      : lineInput
      ? pasteLineParameterCells(lineInput, text)
      : shuntInput
      ? pasteShuntReactorCells(shuntInput, text)
      : productionInput
      ? pasteProductionCells(productionInput, text)
      : pasteProductionMetaCells(productionMetaInput, text);
    if (pasted) event.preventDefault();
  });

  document.addEventListener("keydown", event => {
    if (event.key === "Enter" && event.target.id === "archive-search") {
      event.preventDefault();
      state.archiveSearch = event.target.value.trim();
      renderMaintenanceArchive();
      return;
    }
    const outageSearch = event.target.closest('[data-outage-filter="search"]');
    if (event.key === "Enter" && outageSearch) {
      event.preventDefault();
      state.outageFilters = { ...(state.outageFilters || {}), search: outageSearch.value };
      state.outageNotice = "";
      renderMonthlyProduction();
      return;
    }
    if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return;
    const input = event.target.closest("[data-production-field], [data-production-meta], [data-shunt-field], [data-line-field], [data-meter-field], [data-energy-field], [data-water-field], [data-daily-generation-field]");
    if (!input || input.disabled) return;
    const nextInput = neighboringSheetInput(input, event.key);
    if (!nextInput) return;
    const nextSelector = sheetInputSelector(nextInput);
    if (!nextSelector) return;
    event.preventDefault();
    input.dispatchEvent(new Event("change", { bubbles: true }));
    setTimeout(() => {
      const next = document.querySelector(nextSelector);
      if (!next) return;
      next.focus();
      next.select();
    }, 0);
  });

  document.addEventListener("change", event => {
    if (event.target.id === "dashboard-date") {
      state.dashboardDate = event.target.value || todayDateValue();
      renderDashboard();
      return;
    }
    if (event.target.closest("#outage-from-date, #outage-from-time, #outage-to-date, #outage-to-time")) {
      updateOutageEnergyPreview();
      return;
    }
    const outageFilter = event.target.closest("[data-outage-filter]");
    if (outageFilter) {
      state.outageFilters = {
        ...(state.outageFilters || {}),
        [outageFilter.dataset.outageFilter]: outageFilter.value
      };
      state.outageNotice = "";
      renderMonthlyProduction();
      return;
    }
    if (event.target.id === "archive-file") {
      const label = document.getElementById("archive-file-label");
      const files = Array.from(event.target.files || []);
      if (label) label.textContent = files.length ? `${files.length} file${files.length === 1 ? "" : "s"} selected` : "Select file(s)";
      renderArchiveSelectedFiles(files);
      return;
    }
    if (event.target.id === "data-collection") {
      if (!canManageDataControl()) return;
      state.dataCollection = event.target.value;
      renderDataControlTable();
    }
    if (event.target.id === "production-date") {
      state.productionDate = event.target.value;
      state.productionNotice = "";
      renderProduction();
      return;
    }
    if (event.target.id === "production-summary-date") {
      state.productionDate = event.target.value;
      renderProductionSummary();
      return;
    }
    if (event.target.id === "daily-generation-date") {
      state.dailyGenerationDate = event.target.value || todayDateValue();
      state.dailyGenerationNotice = "";
      renderDailyGenerationReport();
      return;
    }
    if (event.target.id === "monthly-production-month") {
      state.monthlyProductionMonth = event.target.value;
      renderMonthlyProduction();
      return;
    }
    if (event.target.id === "operation-workbook-month") {
      state.monthlyProductionMonth = event.target.value || todayDateValue().slice(0, 7);
      renderOperationWorkbook();
      return;
    }
    if (event.target.id === "energy-meter-date") {
      state.energyMeterDate = event.target.value;
      state.energyMeterNotice = "";
      renderEnergyMeter();
      return;
    }
    if (event.target.id === "water-level-date") {
      state.waterLevelDate = `${event.target.value}-01`;
      state.waterLevelNotice = "";
      renderWaterLevel();
      return;
    }
    if (event.target.id === "water-level-saved-month") {
      state.waterLevelDate = event.target.value;
      state.waterLevelNotice = "";
      renderWaterLevel();
      return;
    }
    if (event.target.id === "shunt-reactor-date") {
      state.shuntReactorDate = event.target.value;
      state.shuntReactorNotice = "";
      renderShuntReactor1();
      return;
    }
    if (event.target.id === "line-parameter-date") {
      state.lineParameterDate = event.target.value;
      state.lineParameterNotice = "";
      renderLineParameter();
      return;
    }
    const dailyGenerationInput = event.target.closest("[data-daily-generation-field]");
    if (dailyGenerationInput) {
      if (!canEditDailyGenerationReport()) return;
      const date = dailyGenerationDate();
      dailyGenerationManual(date)[dailyGenerationInput.dataset.dailyGenerationField] = dailyGenerationInput.value;
      saveDailyGenerationReport(date);
      renderDailyGenerationReport();
      return;
    }
    const lineInput = event.target.closest("[data-line-field]");
    if (lineInput) {
      if (!canEditSubmittedProductionModule("line-parameter", state.lineParameterDate || todayDateValue())) return;
      const row = lineParameterRows()[Number(lineInput.dataset.lineIndex)];
      if (!row) return;
      setNestedNumericValue(row, lineInput.dataset.lineField, lineInput.value);
      saveLineParameterSheets();
      renderLineParameter();
      return;
    }
    const meterInput = event.target.closest("[data-meter-field]");
    if (meterInput) {
      if (!canEditSubmittedProductionModule("meter", state.productionDate || todayDateValue())) return;
      const row = productionMeterRows()[Number(meterInput.dataset.meterRow)];
      const unit = row?.units?.[Number(meterInput.dataset.meterUnit)];
      if (!unit) return;
      unit[meterInput.dataset.meterField] = exactNumericEntry(meterInput.value);
      saveProductionMeterRows();
      renderProductionSummary();
      return;
    }
    const energyInput = event.target.closest("[data-energy-field]");
    if (energyInput) {
      if (!canEditSubmittedProductionModule("energy-meter", state.energyMeterDate || todayDateValue())) return;
      const data = energyMeterRows();
      const row = data[energyInput.dataset.energySection]?.[Number(energyInput.dataset.energyRow)];
      const meter = row?.meters?.[Number(energyInput.dataset.energySource)];
      if (!meter) return;
      meter[energyInput.dataset.energyField] = exactNumericEntry(energyInput.value);
      saveEnergyMeterRows();
      renderEnergyMeter();
      return;
    }
    const waterInput = event.target.closest("[data-water-field]");
    if (waterInput) {
      if (!canEditSubmittedProductionModule("water-level", state.waterLevelDate || todayDateValue())) return;
      const row = waterLevelRows()[Number(waterInput.dataset.waterRow)];
      if (!row) return;
      row[waterInput.dataset.waterField] = exactNumericEntry(waterInput.value);
      saveWaterLevelRows();
      renderWaterLevel();
      return;
    }
    const shuntInput = event.target.closest("[data-shunt-field]");
    if (shuntInput) {
      if (!canEditSubmittedProductionModule("shunt-reactor", state.shuntReactorDate || todayDateValue())) return;
      const row = shuntReactorRows()[Number(shuntInput.dataset.shuntIndex)];
      if (!row) return;
      setNestedNumericValue(row, shuntInput.dataset.shuntField, shuntInput.value);
      saveShuntReactorSheets();
      renderShuntReactor1();
      return;
    }
    const productionMetaInput = event.target.closest("[data-production-meta]");
    if (productionMetaInput) {
      if (!canEditProductionSheet()) return;
      setProductionMetaValue(productionMeta(), productionMetaInput.dataset.productionMeta, productionMetaInput.value);
      saveProductionMetas();
      renderProduction();
      return;
    }
    const productionInput = event.target.closest("[data-production-field]");
    if (productionInput) {
      if (!canEditProductionSheet()) return;
      const rows = productionRows();
      const row = rows[Number(productionInput.dataset.productionIndex)];
      const field = productionInput.dataset.productionField;
      if (!row || !field) return;
      const value = exactNumericEntry(productionInput.value);
      if (field.includes(".")) {
        const [unit, metric] = field.split(".");
        row[unit][metric] = value;
      } else {
        row[field] = value;
      }
      saveProductionSheets();
      renderProduction();
    }
  });

  document.getElementById("logout-button").addEventListener("click", () => {
    logout();
  });

  document.getElementById("first-password-dialog").addEventListener("cancel", event => {
    event.preventDefault();
  });

  document.getElementById("first-password-logout").addEventListener("click", () => {
    document.getElementById("first-password-dialog").close();
    logout();
  });

  document.getElementById("first-password-form").addEventListener("submit", async event => {
    event.preventDefault();
    const currentPassword = document.getElementById("first-current-password").value;
    const newPassword = document.getElementById("first-new-password").value;
    const confirmPassword = document.getElementById("first-confirm-password").value;
    const message = document.getElementById("first-password-message");
    if (newPassword !== confirmPassword) {
      message.textContent = "New passwords do not match.";
      return;
    }
    try {
      await api("/api/auth/change-password", {
        method: "PATCH",
        body: JSON.stringify({ currentPassword, newPassword })
      });
      document.getElementById("first-password-dialog").close();
      await load();
    } catch (error) {
      message.textContent = error.message;
    }
  });

  document.getElementById("show-login").addEventListener("click", () => {
    showAuthForm("login-form");
  });

  document.getElementById("show-register").addEventListener("click", () => {
    showAuthForm("register-form");
  });

  document.getElementById("show-forgot-password").addEventListener("click", () => {
    const identity = document.getElementById("login-identity").value;
    document.getElementById("forgot-password-email").value = identity.includes("@") ? identity : "";
    showAuthForm("forgot-password-form");
  });

  document.getElementById("back-to-login").addEventListener("click", () => {
    history.replaceState({}, "", location.pathname);
    showAuthForm("login-form");
  });

  document.getElementById("login-form").addEventListener("submit", async event => {
    event.preventDefault();
    try {
      const identity = document.getElementById("login-identity").value;
      const payload = await api("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({
          identity,
          email: identity,
          password: document.getElementById("login-password").value
        })
      });
      state.authToken = payload.token;
      state.currentUserId = payload.user.id;
      sessionStorage.setItem("cmms.authToken", state.authToken);
      await load();
    } catch (error) {
      renderAuth(error.message);
    }
  });

  document.getElementById("register-form").addEventListener("submit", async event => {
    event.preventDefault();
    try {
      const payload = await api("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({
          name: document.getElementById("register-name").value,
          email: document.getElementById("register-email").value,
          password: document.getElementById("register-password").value
        })
      });
      state.authToken = payload.token;
      state.currentUserId = payload.user.id;
      sessionStorage.setItem("cmms.authToken", state.authToken);
      await load();
    } catch (error) {
      renderAuth(error.message);
    }
  });

  document.getElementById("forgot-password-form").addEventListener("submit", async event => {
    event.preventDefault();
    try {
      const payload = await api("/api/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email: document.getElementById("forgot-password-email").value })
      });
      showAuthForm("forgot-password-form", payload.message, true);
    } catch (error) {
      showAuthForm("forgot-password-form", error.message);
    }
  });

  document.getElementById("reset-password-form").addEventListener("submit", async event => {
    event.preventDefault();
    const password = document.getElementById("reset-password").value;
    const confirmPassword = document.getElementById("reset-password-confirm").value;
    if (password !== confirmPassword) {
      showAuthForm("reset-password-form", "Passwords do not match.");
      return;
    }
    try {
      const token = new URLSearchParams(location.search).get("reset") || "";
      const payload = await api("/api/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ token, password })
      });
      history.replaceState({}, "", location.pathname);
      showAuthForm("login-form", payload.message, true);
    } catch (error) {
      showAuthForm("reset-password-form", error.message);
    }
  });
}

bindEvents();
if (new URLSearchParams(location.search).has("reset")) {
  state.currentUserId = "";
  state.authToken = "";
  sessionStorage.removeItem("cmms.authToken");
  showAuthForm("reset-password-form");
}
load().catch(error => {
  if (!state.authToken || error.message === "Login required") {
    renderAuth("Please login again.");
    return;
  }
  document.body.innerHTML = `<main class="panel"><h1>Unable to load OMMS</h1><p>${esc(error.message)}</p></main>`;
});
