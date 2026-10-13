// ===== FILE: APP_Vindia/app_vindia/src/pages/operations/manager/OperationsWbsControl.jsx =====
import { useEffect, useMemo, useState } from "react";
import operationsWbsService from "../../../services/operationsWbsService";
import "./OperationsWbsControl.css";

const flattenWbs = (rows = []) => {
  const result = [];

  const visit = (row, level = 0) => {
    result.push({ ...row, _level: level });
    (row.tasks || []).forEach((task) => visit(task, level + 1));
  };

  rows.forEach((row) => visit(row, 0));
  return result;
};

const formatMoney = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 0,
  })}`;

export default function OperationsWbsControl() {
  const [projects, setProjects] = useState([]);
  const [projectId, setProjectId] = useState("");
  const [rows, setRows] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [loadingWbs, setLoadingWbs] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const res = await operationsWbsService.getProjects();
        const list = Array.isArray(res.data) ? res.data : [];

        if (!alive) return;

        setProjects(list);

        if (list.length) {
          setProjectId(String(list[0].id));
        }
      } catch (err) {
        if (alive) {
          setError(
            err.response?.data?.error ||
              "Failed to load WBS projects"
          );
        }
      } finally {
        if (alive) setLoadingProjects(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!projectId) {
      setRows([]);
      return;
    }

    let alive = true;

    (async () => {
      setLoadingWbs(true);
      setError("");

      try {
        const res =
          await operationsWbsService.getProjectWbs(
            projectId
          );

        if (alive) {
          setRows(Array.isArray(res.data) ? res.data : []);
        }
      } catch (err) {
        if (alive) {
          setRows([]);
          setError(
            err.response?.data?.error ||
              "Failed to load operational WBS"
          );
        }
      } finally {
        if (alive) setLoadingWbs(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [projectId]);

  const flatRows = useMemo(
    () => flattenWbs(rows),
    [rows]
  );

  const summary = useMemo(
    () =>
      flatRows.reduce(
        (acc, row) => {
          acc.requests += Number(
            row.material_request_count || 0
          );
          acc.pos += Number(row.po_count || 0);
          acc.poValue += Number(row.po_value || 0);
          acc.deliveries += Number(
            row.delivery_count || 0
          );
          acc.delayed += Number(
            row.delayed_delivery_count || 0
          );
          acc.pending += Number(
            row.pending_po_count || 0
          );
          return acc;
        },
        {
          requests: 0,
          pos: 0,
          poValue: 0,
          deliveries: 0,
          delayed: 0,
          pending: 0,
        }
      ),
    [flatRows]
  );

  return (
    <div className="ops-wbs-page">
      <div className="ops-wbs-header">
        <div>
          <div className="ops-wbs-eyebrow">
            Project Control
          </div>
          <h1>WBS / Project Control</h1>
          <p>
            Read-only operational visibility across WBS,
            material requests, purchase orders and deliveries.
          </p>
        </div>

        <label className="ops-wbs-project">
          <span>Project</span>
          <select
            value={projectId}
            onChange={(e) =>
              setProjectId(e.target.value)
            }
            disabled={loadingProjects}
          >
            {!projects.length && (
              <option value="">
                No WBS projects available
              </option>
            )}

            {projects.map((project) => (
              <option
                key={project.id}
                value={project.id}
              >
                {project.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      {error && (
        <div className="ops-wbs-error">
          {error}
        </div>
      )}

      <div className="ops-wbs-kpis">
        <div>
          <span>Material Requests</span>
          <strong>{summary.requests}</strong>
        </div>

        <div>
          <span>Purchase Orders</span>
          <strong>{summary.pos}</strong>
        </div>

        <div>
          <span>PO Value</span>
          <strong>{formatMoney(summary.poValue)}</strong>
        </div>

        <div>
          <span>Deliveries</span>
          <strong>{summary.deliveries}</strong>
        </div>

        <div>
          <span>Pending PO Approval</span>
          <strong>{summary.pending}</strong>
        </div>

        <div>
          <span>Delayed Deliveries</span>
          <strong>{summary.delayed}</strong>
        </div>
      </div>

      <div className="ops-wbs-card">
        <div className="ops-wbs-card-header">
          <div>
            <strong>WBS Activities</strong>
            <span>
              {flatRows.length} activities
            </span>
          </div>

          <span className="ops-wbs-readonly">
            Read only
          </span>
        </div>

        {loadingWbs ? (
          <div className="ops-wbs-empty">
            Loading WBS…
          </div>
        ) : !flatRows.length ? (
          <div className="ops-wbs-empty">
            No WBS activities found for this project.
          </div>
        ) : (
          <div className="ops-wbs-table-wrap">
            <table className="ops-wbs-table">
              <thead>
                <tr>
                  <th>WBS</th>
                  <th>Activity</th>
                  <th>Status</th>
                  <th>Progress</th>
                  <th>Requests</th>
                  <th>POs</th>
                  <th>PO Value</th>
                  <th>Deliveries</th>
                  <th>Delayed</th>
                </tr>
              </thead>

              <tbody>
                {flatRows.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <span className="ops-wbs-code">
                        {row.code || "—"}
                      </span>
                    </td>

                    <td>
                      <div
                        className="ops-wbs-name"
                        style={{
                          paddingLeft: row._level * 18,
                        }}
                      >
                        {row._level > 0 && (
                          <span className="ops-wbs-branch">
                            ↳
                          </span>
                        )}
                        {row.name}
                      </div>
                    </td>

                    <td>
                      <span className="ops-wbs-status">
                        {row.status || "Not Started"}
                      </span>
                    </td>

                    <td>
                      <div className="ops-wbs-progress">
                        <span>
                          {Number(
                            row.progress || 0
                          )}%
                        </span>
                        <div>
                          <i
                            style={{
                              width: `${Math.max(
                                0,
                                Math.min(
                                  100,
                                  Number(
                                    row.progress || 0
                                  )
                                )
                              )}%`,
                            }}
                          />
                        </div>
                      </div>
                    </td>

                    <td>
                      {row.material_request_count || 0}
                    </td>

                    <td>{row.po_count || 0}</td>

                    <td>
                      {formatMoney(row.po_value)}
                    </td>

                    <td>{row.delivery_count || 0}</td>

                    <td>
                      <span
                        className={
                          Number(
                            row.delayed_delivery_count || 0
                          ) > 0
                            ? "ops-wbs-danger"
                            : ""
                        }
                      >
                        {row.delayed_delivery_count || 0}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
