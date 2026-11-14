const test = require("node:test");
const assert = require("node:assert/strict");

const calls = [];
let failMeasurementInsert = false;
let releaseCount = 0;
const client = {
  async query(sql, values = []) {
    calls.push({ sql, values });
    if (failMeasurementInsert && sql.includes("INSERT INTO site_progress_measurements")) {
      throw new Error("measurement insert failed");
    }
    if (sql.includes("INSERT INTO site_progress")) return { rows: [{ id: 501 }] };
    return { rows: [] };
  },
  release() {
    releaseCount += 1;
  },
};
const pool = {
  async connect() {
    return client;
  },
  async query(sql, values = []) {
    calls.push({ sql, values });
    return { rows: [] };
  },
};

const dbPath = require.resolve("../config/db");
require.cache[dbPath] = {
  id: dbPath,
  filename: dbPath,
  loaded: true,
  exports: pool,
};
const Progress = require("../models/Progress");

test.beforeEach(() => {
  calls.length = 0;
  failMeasurementInsert = false;
  releaseCount = 0;
});

test("persists progress notes and measurements in one transaction", async () => {
  const data = {
    project_id: 101,
    wbs_id: 1001,
    date: "2026-11-14",
    zone: "Block A",
    morning_note: "Pump checked",
  };
  const measurements = [
    { item: "Concrete", qty: 12.5, unit: "m³", status: "submitted" },
  ];

  await Progress.createWithMeasurements(data, measurements);

  assert.deepEqual(calls.map(call => call.sql.trim().split(/\s+/).slice(0, 3).join(" ")), [
    "BEGIN",
    "INSERT INTO site_progress",
    "INSERT INTO site_progress_measurements",
    "COMMIT",
  ]);
  assert.match(calls[1].sql, /morning_note/);
  assert.ok(calls[1].values.includes("Pump checked"));
  assert.ok(!calls.some(call => /\bINSERT INTO measurements\b/.test(call.sql)));
  assert.equal(releaseCount, 1);
});

test("rolls back the progress row if a measurement insert fails", async () => {
  failMeasurementInsert = true;

  await assert.rejects(
    Progress.createWithMeasurements(
      { project_id: 101, wbs_id: 1001, date: "2026-11-14", zone: "Block A" },
      [{ item: "Concrete", qty: 12.5, unit: "m³", status: "submitted" }]
    ),
    /measurement insert failed/
  );

  assert.equal(calls[calls.length - 1].sql, "ROLLBACK");
  assert.equal(releaseCount, 1);
});

test("loads progress-page measurements from their dedicated table", async () => {
  await Progress.getMeasurements(501);
  assert.match(calls[0].sql, /FROM site_progress_measurements/);
});
