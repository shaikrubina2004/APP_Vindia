const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const jwt = require("jsonwebtoken");
const express = require("express");

process.env.JWT_SECRET = "site-progress-test-secret";

const projectsByUser = new Map([
  [11, [101]],
  [21, [202]],
]);
const managedProjectsByUser = new Map([[21, [202]]]);
const wbsProjects = new Map([[1001, 101], [2002, 202], [3003, 303]]);
const initialEntries = [
  { id: 1, project_id: 101, wbs_id: 1001, zone: "Block A", percent_complete: 25, planned_percent: 30 },
  { id: 2, project_id: 202, wbs_id: 2002, zone: "Block B", percent_complete: 50, planned_percent: 50 },
  { id: 3, project_id: 303, wbs_id: 3003, zone: "Block C", percent_complete: 75, planned_percent: 70 },
];
let entries;
let created;

const progressStub = {
  async getAll({ projectIds } = {}) {
    return entries.filter(entry => !Array.isArray(projectIds) || projectIds.includes(entry.project_id));
  },
  async getMeasurements(id) {
    return id === 1 ? [{ item: "Concrete", qty: 12, unit: "m³", status: "submitted" }] : [];
  },
  async getById(id) {
    return entries.find(entry => entry.id === id) || null;
  },
  async createWithMeasurements(data, measurements) {
    created = { data, measurements };
    const record = { id: 4, ...data, measurements };
    entries.push(record);
    return record;
  },
  async delete(id) {
    const index = entries.findIndex(entry => entry.id === id);
    return index < 0 ? null : entries.splice(index, 1)[0];
  },
};

const accessStub = {
  async isAssignedProject(userId, projectId) {
    return (projectsByUser.get(userId) || []).includes(projectId);
  },
  async getAssignedProjectIds(userId) {
    return projectsByUser.get(userId) || [];
  },
  async isManagedProject(userId, projectId) {
    return (managedProjectsByUser.get(userId) || []).includes(projectId);
  },
  async getManagedProjectIds(userId) {
    return managedProjectsByUser.get(userId) || [];
  },
  async isWbsInProject(wbsId, projectId) {
    return wbsProjects.get(wbsId) === projectId;
  },
};

const stub = (modulePath, exports) => {
  const resolved = require.resolve(modulePath);
  require.cache[resolved] = { id: resolved, filename: resolved, loaded: true, exports };
};

stub("../models/Progress", progressStub);
stub("../utils/siteEngineerAccess", accessStub);
const siteProgressRoutes = require("../routes/siteProgressRoutes");

const tokenFor = (id, role) => jwt.sign({ id, role }, process.env.JWT_SECRET);
const tokens = {
  engineer: tokenFor(11, "site_engineer"),
  otherEngineer: tokenFor(12, "site_engineer"),
  manager: tokenFor(21, "project_manager"),
  qs: tokenFor(31, "quantity_surveyor"),
  ceo: tokenFor(41, "ceo"),
  unsupported: tokenFor(51, "architect"),
};

let server;
let baseUrl;

test.before(async () => {
  entries = initialEntries.map(entry => ({ ...entry }));
  const app = express();
  app.use(express.json());
  app.use("/api/site-progress", siteProgressRoutes);
  server = http.createServer(app);
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}/api/site-progress`;
});

test.after(async () => {
  if (server) await new Promise(resolve => server.close(resolve));
});

async function request(method, path, { token, body } = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: response.status, json: await response.json() };
}

test("requires authentication and an allowed role", async () => {
  assert.equal((await request("GET", "/")).status, 401);
  assert.equal((await request("GET", "/", { token: tokens.unsupported })).status, 403);
});

test("returns only assigned or managed projects for site engineers and managers", async () => {
  const engineer = await request("GET", "/", { token: tokens.engineer });
  assert.deepEqual(engineer.json.data.map(row => row.project_id), [101]);

  const manager = await request("GET", "/", { token: tokens.manager });
  assert.deepEqual(manager.json.data.map(row => row.project_id), [202]);

  assert.equal((await request("GET", "/", { token: tokens.otherEngineer })).json.data.length, 0);
});

test("allows QS and CEO global reads, while honoring an explicit project filter", async () => {
  for (const token of [tokens.qs, tokens.ceo]) {
    const all = await request("GET", "/", { token });
    assert.deepEqual(all.json.data.map(row => row.project_id), [101, 202, 303]);

    const oneProject = await request("GET", "/?project_id=202", { token });
    assert.deepEqual(oneProject.json.data.map(row => row.project_id), [202]);
  }
});

test("rejects out-of-scope project filters and invalid project IDs", async () => {
  assert.equal((await request("GET", "/?project_id=202", { token: tokens.engineer })).status, 403);
  assert.equal((await request("GET", "/?project_id=not-a-number", { token: tokens.ceo })).status, 400);
  assert.equal((await request("GET", "/?project_id=", { token: tokens.ceo })).status, 400);
});

test("enforces project scope for single-entry reads", async () => {
  assert.equal((await request("GET", "/2", { token: tokens.engineer })).status, 404);
  assert.equal((await request("GET", "/1", { token: tokens.manager })).status, 404);

  const qsEntry = await request("GET", "/1", { token: tokens.qs });
  assert.equal(qsEntry.status, 200);
  assert.deepEqual(qsEntry.json.data.measurements, [
    { item: "Concrete", qty: 12, unit: "m³", status: "submitted" },
  ]);
});

test("creates progress and measurements only for a matching accessible WBS project", async () => {
  const response = await request("POST", "/", {
    token: tokens.engineer,
    body: {
      project_id: 101,
      wbs_id: 1001,
      date: "2026-11-14",
      zone: "Block A",
      morning_note: "Pump checked",
      percent_complete: 25,
      planned_percent: 30,
      measurements: [
        { item: "Concrete", qty: "12.5", unit: "m³", status: "submitted" },
        { item: "", qty: "", unit: "sqft", status: "draft" },
      ],
    },
  });

  assert.equal(response.status, 201);
  assert.equal(created.data.morning_note, "Pump checked");
  assert.equal(created.data.sqft_completed, null);
  assert.deepEqual(created.measurements, [
    { item: "Concrete", qty: 12.5, unit: "m³", status: "submitted" },
  ]);
  assert.deepEqual(response.json.data.measurements, created.measurements);
});

test("allows a quantity surveyor to approve a measurement", async () => {
  const response = await request("POST", "/", {
    token: tokens.qs,
    body: {
      project_id: 303,
      wbs_id: 3003,
      date: "2026-11-14",
      zone: "Block C",
      measurements: [{ item: "Concrete", qty: 10, status: "approved" }],
    },
  });

  assert.equal(response.status, 201);
  assert.equal(response.json.data.measurements[0].status, "approved");
});

test("rejects mismatched WBS, unassigned projects, invalid progress, and invalid approvals", async () => {
  const valid = {
    project_id: 101,
    wbs_id: 1001,
    date: "2026-11-14",
    zone: "Block A",
    percent_complete: 10,
    planned_percent: 10,
    measurements: [],
  };
  const before = entries.length;

  assert.equal((await request("POST", "/", {
    token: tokens.engineer,
    body: { ...valid, wbs_id: 2002 },
  })).status, 400);
  assert.equal((await request("POST", "/", {
    token: tokens.engineer,
    body: { ...valid, project_id: 202, wbs_id: 2002 },
  })).status, 403);
  assert.equal((await request("POST", "/", {
    token: tokens.engineer,
    body: { ...valid, percent_complete: 101 },
  })).status, 400);
  assert.equal((await request("POST", "/", {
    token: tokens.engineer,
    body: { ...valid, sqft_completed: -1 },
  })).status, 400);
  assert.equal((await request("POST", "/", {
    token: tokens.engineer,
    body: { ...valid, date: "2026-02-30" },
  })).status, 400);
  assert.equal((await request("POST", "/", {
    token: tokens.engineer,
    body: { ...valid, measurements: [{ item: "Concrete", qty: 0, status: "submitted" }] },
  })).status, 400);
  assert.equal((await request("POST", "/", {
    token: tokens.engineer,
    body: { ...valid, measurements: [{ item: "Concrete", qty: 10, status: "approved" }] },
  })).status, 403);
  assert.equal(entries.length, before);
});
