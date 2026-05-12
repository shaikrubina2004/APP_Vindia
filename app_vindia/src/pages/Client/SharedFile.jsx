import { useState } from "react";
import {
  useClientAPI,
  PageLoader,
  PageError,
  fmtDate,
} from "../../hooks/Useclientapi.jsx";
import "../../styles/Client.css";

const BASE_URL = import.meta.env.VITE_API_BASE || "http://localhost:5000";

// Derive category + icon from drawing type / discipline
function getFileMeta(drawing) {
  const disc = (drawing.discipline || drawing.drawing_type || "").toUpperCase();
  if (["ARCH", "ARCHITECTURAL"].includes(disc))
    return { icon: "📐", cat: "Architectural" };
  if (disc === "MEP") return { icon: "🔧", cat: "MEP" };
  if (["STR", "STRUCTURAL"].includes(disc))
    return { icon: "🏗️", cat: "Structural" };
  return { icon: "📄", cat: "Drawing" };
}

const CAT_PILL = {
  Architectural: "pill--info",
  MEP: "pill--warning",
  Structural: "pill--success",
  Drawing: "pill--neutral",
};

const STATUS_PILL = {
  "Issued for Construction": "pill--success",
  "Issued for Coordination": "pill--info",
  Approved: "pill--success",
  Finalized: "pill--success",
};

export default function SharedFile() {
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("all");

  // Shared drawings come from the drawings table — versions visible to client
  // We reuse /client/boq-style endpoint; for drawings we need a new controller fn.
  // For now we call the drawings project endpoint scoped by client token.
  // The clientController doesn't have a drawings endpoint yet — this page
  // is ready to wire once you add getClientDrawings to the controller.
  // Fallback to empty while that's added.
  const { data, loading, error, refetch } = useClientAPI(
    "/client/shared-files",
  );

  if (loading) return <PageLoader />;
  if (error) return <PageError message={error} onRetry={refetch} />;

  const files = data?.files || data?.drawings || [];

  const allCats = ["all", ...new Set(files.map((f) => getFileMeta(f).cat))];

  const filtered = files.filter((f) => {
    const { cat } = getFileMeta(f);
    const matchCat = catFilter === "all" || cat === catFilter;
    const matchSearch =
      (f.name || "").toLowerCase().includes(search.toLowerCase()) ||
      (f.drawing_number || "").toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <div className="cl-page">
      <div className="cl-page-header">
        <div className="cl-page-header__left">
          <div className="cl-eyebrow">Documents</div>
          <h1 className="cl-page-title">Shared Files</h1>
          <p className="cl-page-sub">
            {files.length} file{files.length !== 1 ? "s" : ""} shared by the
            project team
          </p>
        </div>
      </div>

      <div className="cl-toolbar">
        <input
          className="cl-search"
          placeholder="Search by name or drawing number…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="cl-select"
          value={catFilter}
          onChange={(e) => setCatFilter(e.target.value)}
        >
          {allCats.map((c) => (
            <option key={c} value={c}>
              {c === "all" ? "All categories" : c}
            </option>
          ))}
        </select>
        <span
          style={{
            fontSize: 13,
            color: "var(--text-muted)",
            marginLeft: "auto",
          }}
        >
          {filtered.length} file{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="cl-card">
        <div className="cl-table-wrap">
          <table className="cl-table">
            <thead>
              <tr>
                <th>File</th>
                <th>Category</th>
                <th>Drawing No.</th>
                <th>Revision</th>
                <th>Status</th>
                <th>Uploaded</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length ? (
                filtered.map((f) => {
                  const { icon, cat } = getFileMeta(f);
                  const fileUrl = f.file_url || f.latest_version_url;
                  const status = f.display_status || f.status || "—";
                  return (
                    <tr key={f.id}>
                      <td>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                          }}
                        >
                          <span className="sf-file-icon">{icon}</span>
                          <div>
                            <div className="sf-file-name">{f.name}</div>
                            <div className="sf-file-sub">
                              {f.sub_discipline || f.drawing_type || ""}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span
                          className={`pill ${CAT_PILL[cat] || "pill--neutral"}`}
                        >
                          {cat}
                        </span>
                      </td>
                      <td>
                        <span className="cl-mono">
                          {f.drawing_number || f.drawing_no || "—"}
                        </span>
                      </td>
                      <td style={{ color: "var(--text-muted)" }}>
                        {f.current_revision || f.revision_number || "—"}
                      </td>
                      <td>
                        <span
                          className={`pill ${STATUS_PILL[status] || "pill--neutral"}`}
                        >
                          {status}
                        </span>
                      </td>
                      <td style={{ color: "var(--text-muted)", fontSize: 12 }}>
                        {fmtDate(f.uploaded_at || f.updated_at)}
                      </td>
                      <td>
                        {fileUrl ? (
                          <a
                            href={`${BASE_URL}${fileUrl}`}
                            download
                            className="sf-download-btn"
                            target="_blank"
                            rel="noreferrer"
                          >
                            ↓ Download
                          </a>
                        ) : (
                          <span
                            style={{ fontSize: 12, color: "var(--text-muted)" }}
                          >
                            —
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7}>
                    <div className="cl-empty">
                      <div className="cl-empty__icon">📁</div>
                      <p>No files found.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
