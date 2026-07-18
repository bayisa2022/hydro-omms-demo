(() => {
  "use strict";

  const STORAGE_KEY = "hydro.omms.public-demo.v1";
  const TOKEN = "hydro-public-demo-token";
  const currentUserId = "demo-admin";
  const roles = {
    "System Administrator": ["*"],
    "Plant Manager": ["work_order.create", "work_order.update", "work_order.close", "work_order.approve", "logbook.create", "operations.approve", "inventory.adjust", "report.export", "file.upload", "file.delete", "production.manage", "production.entry", "production.export", "production.submit", "production.approve", "plant.verify"],
    "Operation Manager": ["plant_operations.control", "operations.approve", "production.manage", "production.entry", "production.export", "production.submit", "production.approve"],
    "Maintenance Manager": ["work_order.create", "work_order.update", "work_order.close", "logbook.create", "report.export", "file.upload", "work_order.approve"],
    "Operator": ["production.entry", "production.export", "production.submit", "logbook.create", "logbook.submit"],
    "Mechanical Engineer": ["work_order.create", "work_order.update", "logbook.create", "report.export", "file.upload"],
    "Electrical Engineer": ["work_order.create", "work_order.update", "logbook.create", "report.export", "file.upload"],
    "I&C Technician": ["logbook.create", "file.upload", "file.download", "report.export", "performance.report"],
    "Stores Officer": ["work_order.create", "logbook.create", "inventory.adjust", "report.export", "file.upload"],
    "Safety Engineer": ["work_order.create", "safety.issue", "safety.report_accident", "report.export", "file.upload"],
    "Viewer/Auditor": ["file.download", "report.export"]
  };

  function dateValue(offset = 0) {
    const date = new Date();
    date.setHours(12, 0, 0, 0);
    date.setDate(date.getDate() + offset);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  }

  function dateTime(offset, hour, minute = 0) {
    return `${dateValue(offset)}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00.000Z`;
  }

  function id(prefix) {
    return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  }

  function productionRows(dayIndex) {
    const generation = [1995400 + dayIndex * 8200, 2012300 + dayIndex * 6700, 1987700 + dayIndex * 7400];
    const auxiliary = [3450 + dayIndex * 8, 3375 + dayIndex * 7, 3290 + dayIndex * 6];
    const makeUnits = (base, differences) => differences.map((difference, index) => {
      const initial = base + dayIndex * 2200000 + index * 14000000;
      return { initial: String(initial), final: String(initial + difference) };
    });
    return [
      { key: "auxKwh", label: "Auxiliary (KWH)", units: makeUnits(6700000, auxiliary) },
      { key: "productionKwh", label: "Production (KWH)", units: makeUnits(204000000, generation) },
      { key: "auxKvarh", label: "Auxiliary (KVARH)", units: makeUnits(2600000, auxiliary.map(value => Math.round(value * 0.42))) },
      { key: "productionKvarh", label: "Production (KVARH)", units: makeUnits(41000000, generation.map(value => Math.round(value * 0.061))) }
    ];
  }

  function createDemoData() {
    const users = [
      { id: currentUserId, name: "Demo Administrator", username: "demo", email: "demo@example.invalid", role: "System Administrator", discipline: "IT", active: true, mustChangePassword: false },
      { id: "demo-ops-manager", name: "Demo Operation Manager", username: "demo.operations", email: "operations@example.invalid", role: "Operation Manager", discipline: "Operations", active: true, mustChangePassword: false },
      { id: "demo-maint-manager", name: "Demo Maintenance Manager", username: "demo.maintenance", email: "maintenance@example.invalid", role: "Maintenance Manager", discipline: "Maintenance", active: true, mustChangePassword: false },
      { id: "demo-operator", name: "Demo Shift Operator", username: "demo.operator", email: "operator@example.invalid", role: "Operator", discipline: "Operations", active: true, mustChangePassword: false },
      { id: "demo-mechanical", name: "Demo Mechanical Engineer", username: "demo.mechanical", email: "mechanical@example.invalid", role: "Mechanical Engineer", discipline: "Mechanical", active: true, mustChangePassword: false },
      { id: "demo-electrical", name: "Demo Electrical Engineer", username: "demo.electrical", email: "electrical@example.invalid", role: "Electrical Engineer", discipline: "Electrical", active: true, mustChangePassword: false },
      { id: "demo-stores", name: "Demo Stores Officer", username: "demo.stores", email: "stores@example.invalid", role: "Stores Officer", discipline: "Stores", active: true, mustChangePassword: false }
    ];

    const assets = [
      { id: "asset-plant", parentId: null, code: "HYDRO-DEMO", name: "Hydro Plant", type: "Plant", location: "Site", criticality: "High", status: "Operational", manufacturer: "", model: "", commissioned: "2016-01-01" },
      { id: "asset-u1", parentId: "asset-plant", code: "HYDRO-U1", name: "Generating Unit 1", type: "Generating Unit", location: "Powerhouse", criticality: "Critical", status: "Online", manufacturer: "Demo OEM", model: "Francis 84.7 MW", commissioned: "2016-01-01" },
      { id: "asset-u2", parentId: "asset-plant", code: "HYDRO-U2", name: "Generating Unit 2", type: "Generating Unit", location: "Powerhouse", criticality: "Critical", status: "Online", manufacturer: "Demo OEM", model: "Francis 84.7 MW", commissioned: "2016-01-01" },
      { id: "asset-u3", parentId: "asset-plant", code: "HYDRO-U3", name: "Generating Unit 3", type: "Generating Unit", location: "Powerhouse", criticality: "Critical", status: "Standby", manufacturer: "Demo OEM", model: "Francis 84.7 MW", commissioned: "2016-01-01" },
      { id: "asset-turbine-1", parentId: "asset-u1", code: "HYDRO-U1-TUR", name: "Unit 1 Francis Turbine", type: "Turbine", location: "Powerhouse", criticality: "Critical", status: "Operational", manufacturer: "Demo OEM", model: "Vertical Francis", commissioned: "2016-01-01" },
      { id: "asset-generator-2", parentId: "asset-u2", code: "HYDRO-U2-GEN", name: "Unit 2 Generator", type: "Generator", location: "Powerhouse", criticality: "Critical", status: "Operational", manufacturer: "Demo OEM", model: "13.8 kV synchronous", commissioned: "2016-01-01" },
      { id: "asset-transformer-1", parentId: "asset-plant", code: "HYDRO-GSU-1", name: "Generator Step-up Transformer 1", type: "Transformer", location: "Switchyard", criticality: "Critical", status: "Operational", manufacturer: "Demo OEM", model: "100 MVA", commissioned: "2016-01-01" },
      { id: "asset-spillway", parentId: "asset-plant", code: "HYDRO-SPW", name: "Spillway Gate System", type: "Civil/Hydraulic", location: "Dam", criticality: "High", status: "Operational", manufacturer: "Demo Civil Works", model: "Radial gates", commissioned: "2016-01-01" }
    ];

    const workOrders = [
      { id: "demo-wo-1", number: "WO-DEMO-0001", title: "Inspect Unit 1 guide bearing oil cooler", description: "Inspect cooler differential pressure, leakage and heat-transfer condition.", assetId: "asset-turbine-1", type: "Preventive Maintenance", maintenanceType: "PM - Preventive Maintenance", priority: "High", status: "Requested", assignedTo: "demo-mechanical", assignedToList: ["demo-mechanical", "demo-operator"], createdBy: currentUserId, createdByName: "Demo Administrator", plannedStart: dateTime(0, 8), dueDate: dateValue(2), safetyRequired: true, lotoRequired: true, estimatedHours: 6, materialsRequired: "Cleaning solvent; gasket kit", downtimeHours: 0, completionNotes: "", createdAt: dateTime(-1, 9) },
      { id: "demo-wo-2", number: "WO-DEMO-0002", title: "Unit 2 generator brush inspection", description: "Inspect brush wear and clean collector ring enclosure.", assetId: "asset-generator-2", type: "Corrective Maintenance", maintenanceType: "CM - Corrective Maintenance", priority: "Critical", status: "In Progress", assignedTo: "demo-electrical", assignedToList: ["demo-electrical"], createdBy: "demo-maint-manager", createdByName: "Demo Maintenance Manager", plannedStart: dateTime(-1, 10), dueDate: dateValue(0), safetyRequired: true, lotoRequired: true, estimatedHours: 4, materialsRequired: "Carbon brush set; lint-free cloth", downtimeHours: 1.25, completionNotes: "Inspection in progress.", createdAt: dateTime(-2, 14) },
      { id: "demo-wo-3", number: "WO-DEMO-0003", title: "Transformer 1 infrared inspection", description: "Thermal scan of bushings, cable terminations and cooling banks.", assetId: "asset-transformer-1", type: "Inspection", maintenanceType: "INSP - Inspection", priority: "Medium", status: "Approved", assignedTo: "demo-electrical", assignedToList: ["demo-electrical", "demo-operator"], createdBy: currentUserId, createdByName: "Demo Administrator", plannedStart: dateTime(3, 11), dueDate: dateValue(3), safetyRequired: true, lotoRequired: false, estimatedHours: 3, materialsRequired: "Thermal camera", downtimeHours: 0, completionNotes: "", createdAt: dateTime(-1, 11) },
      { id: "demo-wo-4", number: "WO-DEMO-0004", title: "Quarterly spillway gate exercise", description: "Verify local and remote gate movement, limits and backup power.", assetId: "asset-spillway", type: "Preventive Maintenance", maintenanceType: "PM - Preventive Maintenance", priority: "Medium", status: "Closed", assignedTo: "demo-mechanical", assignedToList: ["demo-mechanical", "demo-electrical"], createdBy: "demo-maint-manager", createdByName: "Demo Maintenance Manager", plannedStart: dateTime(-7, 8), dueDate: dateValue(-7), safetyRequired: true, lotoRequired: false, estimatedHours: 5, materialsRequired: "Hydraulic oil sample bottles", downtimeHours: 0, completionNotes: "Gate travel and limit switches satisfactory.", createdAt: dateTime(-9, 8) }
    ];

    const productionMeterReadings = {};
    for (let offset = -13; offset <= 0; offset += 1) productionMeterReadings[dateValue(offset)] = productionRows(offset + 13);
    const monthKey = `${dateValue().slice(0, 7)}-01`;
    const [year, month] = monthKey.split("-").map(Number);
    const daysInMonth = new Date(year, month, 0).getDate();
    const waterRows = Array.from({ length: daysInMonth }, (_, index) => ({
      day: index + 1,
      reservoir: index + 1 <= new Date().getDate() ? (1114.72 + index * 0.018).toFixed(3) : "",
      tailrace: index + 1 <= new Date().getDate() ? (1054.31 + index * 0.004).toFixed(3) : ""
    }));

    return {
      meta: { plantName: "Hydro Plant", version: "1.1.0-demo", generatedAt: new Date().toISOString() },
      users,
      assets,
      assetTypes: ["Plant", "Generating Unit", "Turbine", "Generator", "Transformer", "Governor", "Switchgear", "Protection", "Civil/Hydraulic"].map((name, index) => ({ id: `demo-type-${index + 1}`, code: name.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 8), name, active: true })),
      workOrders,
      pmSchedules: [
        { id: "demo-pm-1", name: "Monthly turbine bearing inspection", assetId: "asset-turbine-1", frequency: "Monthly", nextDue: dateValue(2), jobPlan: "Check oil level, temperatures, leakage, vibration and alarms.", active: true },
        { id: "demo-pm-2", name: "Quarterly spillway gate exercise", assetId: "asset-spillway", frequency: "Quarterly", nextDue: dateValue(12), jobPlan: "Exercise gates and verify travel times, limits and backup power.", active: true },
        { id: "demo-pm-3", name: "Transformer oil sampling", assetId: "asset-transformer-1", frequency: "Semiannual", nextDue: dateValue(25), jobPlan: "Collect DGA and moisture samples and inspect oil system.", active: true }
      ],
      maintenanceTypes: [
        { id: "demo-mt-1", code: "PM", name: "Preventive Maintenance", category: "Planned", description: "Scheduled maintenance intended to prevent failure.", active: true },
        { id: "demo-mt-2", code: "CM", name: "Corrective Maintenance", category: "Corrective", description: "Repair of identified defects.", active: true },
        { id: "demo-mt-3", code: "INSP", name: "Inspection", category: "Condition", description: "Condition and compliance inspection.", active: true },
        { id: "demo-mt-4", code: "CAL", name: "Calibration", category: "Instrumentation", description: "Calibration and functional verification.", active: true }
      ],
      commissioningReportTypes: [
        { id: "demo-crt-1", code: "FAT", name: "Factory Acceptance Test", active: true },
        { id: "demo-crt-2", code: "SAT", name: "Site Acceptance Test", active: true },
        { id: "demo-crt-3", code: "COMM", name: "Commissioning Test", active: true }
      ],
      logEntries: [
        { id: "demo-log-1", category: "operations", shift: "Morning", entryTime: dateTime(0, 6, 15), unit: "Unit 1", assetId: "asset-u1", type: "Status", severity: "Info", description: "Unit 1 synchronized and carrying 82.4 MW. All monitored parameters normal.", createdBy: "demo-operator", status: "Submitted" },
        { id: "demo-log-2", category: "operations", shift: "Morning", entryTime: dateTime(0, 8, 40), unit: "Unit 2", assetId: "asset-u2", type: "Abnormal Observation", severity: "Warning", description: "Minor governor pressure fluctuation observed during load change; trend under review.", createdBy: "demo-operator", status: "Submitted" },
        { id: "demo-log-3", category: "maintenance", shift: "Day", entryTime: dateTime(-1, 14, 20), unit: "Switchyard", assetId: "asset-transformer-1", type: "Inspection", severity: "Info", description: "Transformer cooling fans tested in manual and automatic modes.", createdBy: "demo-electrical", status: "Approved" }
      ],
      inventory: [
        { id: "demo-inv-1", code: "SP-OIL-ISO68", name: "Turbine bearing oil ISO VG 68", category: "Lubricant", unit: "L", qty: 420, min: 300, max: 1000, location: "Stores A-01", critical: true, compatibleAssets: ["asset-turbine-1"] },
        { id: "demo-inv-2", code: "SP-GOV-FLTR", name: "Governor hydraulic filter 10 micron", category: "Mechanical", unit: "EA", qty: 6, min: 8, max: 24, location: "Stores B-04", critical: true, compatibleAssets: ["asset-u2"] },
        { id: "demo-inv-3", code: "SP-RELAY-230", name: "Protection relay spare module", category: "Electrical", unit: "EA", qty: 2, min: 1, max: 4, location: "Stores C-02", critical: true, compatibleAssets: ["asset-transformer-1"] },
        { id: "demo-inv-4", code: "SP-GATE-SEAL", name: "Spillway gate seal kit", category: "Civil/Hydraulic", unit: "SET", qty: 1, min: 2, max: 6, location: "Stores D-01", critical: true, compatibleAssets: ["asset-spillway"] }
      ],
      kpiTargets: { pmCompliance: 90, mttrHours: 8, criticalSpareAvailability: 95, overdueWorkOrders: 0 },
      productionSheets: {}, productionMetas: {}, shuntReactorSheets: {}, lineParameterSheets: {},
      productionMeterReadings, energyMeterReadings: {}, waterLevelSheets: { [monthKey]: waterRows }, dailyGenerationReports: {}, productionSubmissions: {},
      outageRecords: [
        { id: "demo-outage-1", unit: "Unit 3", category: "System Power Constraint", from: `${dateValue(-5)}T01:20`, to: `${dateValue(-5)}T03:45`, durationHours: 2.42, energyLossKwh: 205700, reason: "Demonstration dispatch constraint record" },
        { id: "demo-outage-2", unit: "Unit 2", category: "Emergency Outage", from: `${dateValue(-2)}T11:10`, to: `${dateValue(-2)}T12:00`, durationHours: 0.83, energyLossKwh: 70550, reason: "Demonstration protection inspection record" }
      ],
      archiveFolders: [
        { id: "demo-folder-1", name: "Turbine Inspection", createdBy: currentUserId, createdByName: "Demo Administrator", createdAt: dateTime(-20, 9), manual: true },
        { id: "demo-folder-2", name: "Turbine Inspection / Unit 1", createdBy: currentUserId, createdByName: "Demo Administrator", createdAt: dateTime(-19, 9), manual: true },
        { id: "demo-folder-3", name: "Technical Drawings", createdBy: currentUserId, createdByName: "Demo Administrator", createdAt: dateTime(-18, 9), manual: true }
      ],
      attachments: [],
      auditLogs: [{ id: "demo-audit-1", at: new Date().toISOString(), user: "Demo System", action: "Loaded generated public demonstration dataset", entity: "system" }]
    };
  }

  function loadDatabase() {
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      if (stored && stored.meta?.version === "1.1.0-demo") return stored;
    } catch {
      // Reset malformed browser data below.
    }
    const created = createDemoData();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(created));
    return created;
  }

  let database = loadDatabase();
  const saveDatabase = () => localStorage.setItem(STORAGE_KEY, JSON.stringify(database));
  const userName = userId => database.users.find(user => user.id === userId)?.name || "Demo User";
  const assetName = assetId => database.assets.find(asset => asset.id === assetId)?.name || "General Plant";
  const publicUser = user => ({ ...user, permissions: roles[user.role] || [] });

  function dashboard() {
    const today = dateValue();
    const open = database.workOrders.filter(order => !["Closed", "Cancelled", "Verified"].includes(order.status));
    const overdue = open.filter(order => order.dueDate && order.dueDate < today);
    const critical = open.filter(order => order.priority === "Critical");
    const duePm = database.pmSchedules.filter(plan => plan.nextDue <= today);
    const lowStock = database.inventory.filter(item => Number(item.qty) <= Number(item.min));
    const criticalSpares = database.inventory.filter(item => item.critical);
    const available = criticalSpares.filter(item => Number(item.qty) > 0).length;
    return {
      plantName: "Hydro Plant - Public Demo",
      cards: [
        { label: "Open Work Orders", value: open.length, tone: "blue" }, { label: "Critical Open", value: critical.length, tone: critical.length ? "red" : "green" },
        { label: "Overdue Work", value: overdue.length, tone: overdue.length ? "red" : "green" }, { label: "PM Due Today", value: duePm.length, tone: duePm.length ? "amber" : "green" },
        { label: "Low Stock Items", value: lowStock.length, tone: lowStock.length ? "amber" : "green" }, { label: "Critical Spare Availability", value: `${Math.round((available / Math.max(criticalSpares.length, 1)) * 100)}%`, tone: "blue" }
      ],
      maintenanceMix: {
        preventive: database.workOrders.filter(order => String(order.type).includes("Preventive")).length,
        corrective: database.workOrders.filter(order => String(order.type).includes("Corrective")).length,
        inspection: database.workOrders.filter(order => order.type === "Inspection").length,
        completed: database.workOrders.filter(order => ["Closed", "Verified"].includes(order.status)).length
      },
      recentLogEntries: database.logEntries.slice().sort((a, b) => b.entryTime.localeCompare(a.entryTime)).slice(0, 5),
      unitStatus: database.assets.filter(asset => asset.type === "Generating Unit").map(asset => ({ name: asset.name, status: asset.status, criticality: asset.criticality }))
    };
  }

  function bootstrap() {
    return {
      currentUser: publicUser(database.users.find(user => user.id === currentUserId) || database.users[0]), rolePermissions: roles, dashboard: dashboard(),
      assets: database.assets, assetTypes: database.assetTypes,
      workOrders: database.workOrders.map(order => ({ ...order, assetName: assetName(order.assetId), assignedName: userName(order.assignedTo), assignedNames: (order.assignedToList?.length ? order.assignedToList : [order.assignedTo]).filter(Boolean).map(userName) })),
      pmSchedules: database.pmSchedules.map(plan => ({ ...plan, assetName: assetName(plan.assetId) })), maintenanceTypes: database.maintenanceTypes,
      commissioningReportTypes: database.commissioningReportTypes,
      logEntries: database.logEntries.map(entry => ({ ...entry, assetName: assetName(entry.assetId), createdByName: userName(entry.createdBy) })),
      inventory: database.inventory, attachments: database.attachments, archiveFolders: database.archiveFolders,
      productionSheets: database.productionSheets, productionMetas: database.productionMetas, shuntReactorSheets: database.shuntReactorSheets,
      lineParameterSheets: database.lineParameterSheets, productionMeterReadings: database.productionMeterReadings,
      energyMeterReadings: database.energyMeterReadings, waterLevelSheets: database.waterLevelSheets,
      dailyGenerationReports: database.dailyGenerationReports, productionSubmissions: database.productionSubmissions,
      outageRecords: database.outageRecords, users: database.users, auditLogs: database.auditLogs.slice(-20).reverse()
    };
  }

  function parseBody(options) {
    if (!options?.body || typeof options.body !== "string") return {};
    try { return JSON.parse(options.body); } catch { return {}; }
  }

  function jsonResponse(payload, status = 200, extraHeaders = {}) {
    return Promise.resolve(new Response(JSON.stringify(payload), { status, headers: { "Content-Type": "application/json", ...extraHeaders } }));
  }

  function updateDateStore(pathname, body) {
    const routes = {
      "/api/production/": "productionSheets", "/api/shunt-reactor/": "shuntReactorSheets", "/api/line-parameter/": "lineParameterSheets",
      "/api/production-meter/": "productionMeterReadings", "/api/energy-meter/": "energyMeterReadings", "/api/water-level/": "waterLevelSheets", "/api/daily-generation/": "dailyGenerationReports"
    };
    const prefix = Object.keys(routes).find(candidate => pathname.startsWith(candidate));
    if (!prefix) return null;
    const date = decodeURIComponent(pathname.slice(prefix.length));
    const key = routes[prefix];
    if (key === "productionSheets") {
      database[key][date] = Array.isArray(body.rows) ? body.rows : [];
      database.productionMetas[date] = { ...(body.meta || {}), updatedAt: new Date().toISOString(), updatedBy: currentUserId, updatedByName: "Demo Administrator" };
      saveDatabase();
      return { date, rows: database[key][date], meta: database.productionMetas[date] };
    }
    database[key][date] = key === "dailyGenerationReports"
      ? { fields: body.fields || {}, updatedAt: new Date().toISOString(), updatedBy: currentUserId, updatedByName: "Demo Administrator" }
      : { rows: body.rows || [], updatedAt: new Date().toISOString(), updatedBy: currentUserId, updatedByName: "Demo Administrator" };
    saveDatabase();
    return { date, ...database[key][date] };
  }

  async function demoFetch(input, options = {}) {
    const target = typeof input === "string" ? input : input.url;
    const pathname = new URL(target, window.location.href).pathname;
    if (!pathname.startsWith("/api/")) return window.__hydroOriginalFetch(input, options);
    const method = String(options.method || "GET").toUpperCase();
    const body = parseBody(options);

    if (pathname === "/api/health") return jsonResponse({ status: "ok", service: "Hydro OMMS Public Demo", version: "1.1.0-demo", storageReady: true, demo: true });
    if (pathname === "/api/auth/login") return jsonResponse({ token: TOKEN, user: publicUser(database.users[0]) });
    if (pathname === "/api/auth/logout") return jsonResponse({ message: "Logged out of the browser demo" });
    if (pathname === "/api/auth/register") return jsonResponse({ error: "Account creation is disabled in the public demo" }, 403);
    if (pathname === "/api/auth/forgot-password") return jsonResponse({ message: "Email is disabled in the public demo. Use demo / demo." });
    if (pathname === "/api/auth/reset-password" || pathname === "/api/auth/change-password") return jsonResponse({ message: "Password changes are simulated in the public demo." });
    if (pathname === "/api/bootstrap") return jsonResponse(bootstrap());
    if (pathname === "/api/email/status") return jsonResponse({ enabled: false, configured: false, host: "", from: "", demo: true });
    if (pathname === "/api/email/test") return jsonResponse({ sent: false, reason: "Email is disabled in the public demo" });

    if (method === "PUT") {
      const updated = updateDateStore(pathname, body);
      if (updated) return jsonResponse(updated);
    }

    if (pathname.startsWith("/api/production-submissions/") && method === "POST") {
      const [, , , moduleName, date] = pathname.split("/");
      database.productionSubmissions[moduleName] = database.productionSubmissions[moduleName] || {};
      const submission = { status: "Pending", submittedAt: new Date().toISOString(), submittedBy: currentUserId, submittedByName: "Demo Administrator", approvedAt: "", approvedBy: "", approvedByName: "", rejectedAt: "", rejectedBy: "", rejectedByName: "", reviewComment: "" };
      database.productionSubmissions[moduleName][date] = submission;
      saveDatabase();
      return jsonResponse(submission);
    }

    if (pathname.startsWith("/api/production-reviews/") && method === "POST") {
      const [, , , moduleName, date] = pathname.split("/");
      let review;
      if (moduleName === "hourly") review = database.productionMetas[date] = database.productionMetas[date] || {};
      else {
        database.productionSubmissions[moduleName] = database.productionSubmissions[moduleName] || {};
        review = database.productionSubmissions[moduleName][date] = database.productionSubmissions[moduleName][date] || { submittedAt: new Date().toISOString(), submittedByName: "Demo Operator" };
      }
      if (body.action === "revert") Object.assign(review, { status: "Draft", submittedAt: "", approvedAt: "", rejectedAt: "", reviewComment: body.comment || "Reverted in demo" });
      else if (body.action === "reject") Object.assign(review, { status: "Rejected", rejectedAt: new Date().toISOString(), rejectedBy: currentUserId, rejectedByName: "Demo Administrator", approvedAt: "", reviewComment: body.comment || "Demo rejection" });
      else Object.assign(review, { status: "Approved", approvedAt: new Date().toISOString(), approvedBy: currentUserId, approvedByName: "Demo Administrator", rejectedAt: "", reviewComment: body.comment || "Approved in demo" });
      saveDatabase();
      return jsonResponse(review);
    }

    if (pathname === "/api/outages" && method === "POST") {
      const durationHours = Math.max(0, (new Date(body.to) - new Date(body.from)) / 3600000);
      const record = { ...body, id: id("demo-outage"), durationHours: Number(durationHours.toFixed(2)), energyLossKwh: Number((durationHours * 85000).toFixed(2)) };
      database.outageRecords.push(record); saveDatabase(); return jsonResponse(record, 201);
    }
    if (pathname.startsWith("/api/outages/") && ["PATCH", "DELETE"].includes(method)) {
      const recordId = decodeURIComponent(pathname.split("/")[3] || "");
      const index = database.outageRecords.findIndex(record => record.id === recordId);
      if (method === "DELETE") database.outageRecords.splice(index, 1); else if (index >= 0) Object.assign(database.outageRecords[index], body);
      saveDatabase(); return jsonResponse(method === "DELETE" ? { deleted: true, id: recordId } : database.outageRecords[index]);
    }

    if (pathname === "/api/assets/quick" && method === "POST") {
      const asset = { id: id("demo-asset"), status: "Operational", criticality: "Medium", ...body };
      database.assets.push(asset); saveDatabase(); return jsonResponse(asset, 201);
    }
    if (pathname === "/api/commissioning-report-types" && method === "POST") {
      const record = { id: id("demo-report-type"), active: true, ...body };
      database.commissioningReportTypes.push(record); saveDatabase(); return jsonResponse(record, 201);
    }
    if (pathname === "/api/archive-folders" && method === "POST") {
      const folder = { id: id("demo-folder"), name: body.name, createdBy: currentUserId, createdByName: "Demo Administrator", createdAt: new Date().toISOString(), manual: true };
      database.archiveFolders.push(folder); saveDatabase(); return jsonResponse(folder, 201);
    }

    if (pathname === "/api/attachments/stream" && method === "POST") {
      const attachment = { id: id("demo-file"), name: "Demo_Upload.pdf", category: "PDF", module: "documents", folder: "Demo", description: "Browser-only demonstration upload", size: 1024, uploadedAt: new Date().toISOString(), uploadedBy: currentUserId, uploadedByName: "Demo Administrator", status: "Pending" };
      database.attachments.push(attachment); saveDatabase(); return jsonResponse(attachment, 201);
    }
    if (pathname.includes("/download") && method === "GET") return Promise.resolve(new Response("This is a browser-only demonstration file.", { status: 200, headers: { "Content-Type": "text/plain", "Content-Disposition": "attachment; filename=HYDRO_OMMS_Demo_File.txt" } }));
    if (pathname.startsWith("/api/attachments/") && method === "DELETE") {
      const attachmentId = pathname.split("/")[3]; database.attachments = database.attachments.filter(file => file.id !== attachmentId); saveDatabase(); return jsonResponse({ deleted: true, id: attachmentId });
    }
    if (pathname.endsWith("/approve") && pathname.startsWith("/api/attachments/") && method === "PATCH") {
      const attachment = database.attachments.find(file => file.id === pathname.split("/")[3]); if (attachment) attachment.status = "Approved"; saveDatabase(); return jsonResponse(attachment || { approved: true });
    }

    if (pathname === "/api/work-orders" && method === "POST") {
      const order = { id: id("demo-wo"), number: `WO-DEMO-${String(database.workOrders.length + 1).padStart(4, "0")}`, status: "Requested", createdAt: new Date().toISOString(), createdBy: currentUserId, createdByName: "Demo Administrator", ...body };
      database.workOrders.push(order); saveDatabase(); return jsonResponse(order, 201);
    }
    if (pathname.startsWith("/api/work-orders/") && ["PATCH", "DELETE"].includes(method)) {
      const parts = pathname.split("/"); const orderId = decodeURIComponent(parts[3] || ""); const action = parts[4] || "";
      const index = database.workOrders.findIndex(order => order.id === orderId);
      if (method === "DELETE") database.workOrders.splice(index, 1);
      else if (index >= 0) {
        Object.assign(database.workOrders[index], body);
        if (action === "complete") database.workOrders[index].status = "Completed";
        if (action === "revert") database.workOrders[index].status = "Requested";
        if (action === "review" || action === "approval") database.workOrders[index].status = body.action === "reject" ? "Rejected" : "Approved";
      }
      saveDatabase(); return jsonResponse(method === "DELETE" ? { deleted: true, id: orderId } : database.workOrders[index]);
    }

    if (pathname === "/api/log-entries" && method === "POST") {
      const entry = { id: id("demo-log"), entryTime: new Date().toISOString(), createdBy: currentUserId, status: "Draft", ...body };
      database.logEntries.push(entry); saveDatabase(); return jsonResponse(entry, 201);
    }
    if (pathname.startsWith("/api/log-entries/") && ["PATCH", "DELETE"].includes(method)) {
      const parts = pathname.split("/"); const entryId = decodeURIComponent(parts[3] || ""); const action = parts[4] || "";
      const index = database.logEntries.findIndex(entry => entry.id === entryId);
      if (method === "DELETE") database.logEntries.splice(index, 1);
      else if (index >= 0) {
        Object.assign(database.logEntries[index], body);
        if (action === "review") database.logEntries[index].status = body.action === "reject" ? "Rejected" : "Approved";
        if (action === "revert") database.logEntries[index].status = "Draft";
      }
      saveDatabase(); return jsonResponse(method === "DELETE" ? { deleted: true, id: entryId } : database.logEntries[index]);
    }

    if (pathname.startsWith("/api/inventory/") && method === "PATCH") {
      const item = database.inventory.find(candidate => candidate.id === pathname.split("/")[3]); if (item) Object.assign(item, body); saveDatabase(); return jsonResponse(item || {});
    }
    if (pathname === "/api/users" && method === "POST") {
      const user = { id: id("demo-user"), active: true, mustChangePassword: false, ...body }; database.users.push(user); saveDatabase(); return jsonResponse(user, 201);
    }
    if (pathname.includes("/password") && pathname.startsWith("/api/users/") && method === "POST") return jsonResponse({ message: "Demo password reset recorded. No real credentials were changed." });
    if (pathname.startsWith("/api/users/") && method === "PATCH") {
      const parts = pathname.split("/"); const user = database.users.find(candidate => candidate.id === parts[3]); const action = parts[4];
      if (user) { if (action === "username") user.username = body.username; else if (action === "role") user.role = body.role; else if (action === "active") user.active = body.active; }
      saveDatabase(); return jsonResponse(user || {});
    }

    if (pathname.startsWith("/api/manage/")) {
      const parts = pathname.split("/"); const collection = parts[3]; const recordId = parts[4]; database[collection] = Array.isArray(database[collection]) ? database[collection] : [];
      if (method === "POST") { const record = { id: id(`demo-${collection}`), ...body }; database[collection].push(record); saveDatabase(); return jsonResponse(record, 201); }
      const index = database[collection].findIndex(record => record.id === recordId);
      if ((method === "PUT" || method === "PATCH") && index >= 0) Object.assign(database[collection][index], body);
      if (method === "DELETE" && index >= 0) database[collection].splice(index, 1);
      saveDatabase(); return jsonResponse(method === "DELETE" ? { deleted: true, id: recordId } : database[collection][index]);
    }

    return jsonResponse({ demo: true, message: "Action completed in the browser-only demo" });
  }

  window.__hydroOriginalFetch = window.fetch.bind(window);
  window.fetch = demoFetch;
  window.HYDRO_OMMS_DEMO = { reset: () => { localStorage.removeItem(STORAGE_KEY); location.reload(); } };
  if (!sessionStorage.getItem("cmms.authToken")) sessionStorage.setItem("cmms.authToken", TOKEN);
  document.addEventListener("click", event => {
    if (!event.target.closest("#reset-demo")) return;
    localStorage.removeItem(STORAGE_KEY);
    Object.keys(localStorage).filter(key => key.startsWith("cmms.")).forEach(key => localStorage.removeItem(key));
    sessionStorage.setItem("cmms.authToken", TOKEN);
    location.reload();
  });
})();
