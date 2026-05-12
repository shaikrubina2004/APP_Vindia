import { useState } from "react";
import "../../styles/Client.css";

const FILES = [
  {
    id: 1,
    name: "Structural drawings – Rev 3.pdf",
    type: "pdf",
    size: "4.2 MB",
    uploaded: "May 5, 2024",
    uploadedBy: "Arjun Mehta",
    category: "Drawings",
  },
  {
    id: 2,
    name: "Architectural floor plans – Rev 2.pdf",
    type: "pdf",
    size: "6.8 MB",
    uploaded: "Apr 20, 2024",
    uploadedBy: "Vikram (Architect)",
    category: "Drawings",
  },
  {
    id: 3,
    name: "MEP schematic – electrical.pdf",
    type: "pdf",
    size: "2.1 MB",
    uploaded: "Apr 15, 2024",
    uploadedBy: "Sanjay (MEP Eng)",
    category: "Drawings",
  },
  {
    id: 4,
    name: "BBMP approval letter.pdf",
    type: "pdf",
    size: "0.8 MB",
    uploaded: "Feb 12, 2024",
    uploadedBy: "Arjun Mehta",
    category: "Approvals",
  },
  {
    id: 5,
    name: "Environmental clearance cert.pdf",
    type: "pdf",
    size: "1.2 MB",
    uploaded: "Jan 28, 2024",
    uploadedBy: "Arjun Mehta",
    category: "Approvals",
  },
  {
    id: 6,
    name: "Fire NOC – pending.pdf",
    type: "pdf",
    size: "0.4 MB",
    uploaded: "Mar 5, 2024",
    uploadedBy: "Arjun Mehta",
    category: "Approvals",
  },
  {
    id: 7,
    name: "Project schedule – Gantt v2.xlsx",
    type: "xlsx",
    size: "1.4 MB",
    uploaded: "Jan 15, 2024",
    uploadedBy: "Arjun Mehta",
    category: "Reports",
  },
  {
    id: 8,
    name: "Monthly progress report – April.pdf",
    type: "pdf",
    size: "3.2 MB",
    uploaded: "May 2, 2024",
    uploadedBy: "Arjun Mehta",
    category: "Reports",
  },
  {
    id: 9,
    name: "Soil investigation report.pdf",
    type: "pdf",
    size: "5.6 MB",
    uploaded: "Jan 8, 2024",
    uploadedBy: "Ravi Kumar",
    category: "Reports",
  },
  {
    id: 10,
    name: "Contract agreement – signed.pdf",
    type: "pdf",
    size: "2.4 MB",
    uploaded: "Jan 3, 2024",
    uploadedBy: "Arjun Mehta",
    category: "Contract",
  },
];

const FILE_ICONS = { pdf: "📄", xlsx: "📊", dwg: "📐", docx: "📝", img: "🖼️" };
const CAT_COLORS = {
  Drawings: "pill--info",
  Approvals: "pill--success",
  Reports: "pill--neutral",
  Contract: "pill--warning",
};

export default function SharedFile() {
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("all");

  const categories = ["all", ...new Set(FILES.map((f) => f.category))];
  const filtered = FILES.filter(
    (f) =>
      (catFilter === "all" || f.category === catFilter) &&
      f.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="cl-page">
      <div className="cl-page-header">
        <div className="cl-page-header__left">
          <div className="cl-eyebrow">Documents</div>
          <h1 className="cl-page-title">Shared Files</h1>
          <p className="cl-page-sub">
            {FILES.length} files shared by the project team
          </p>
        </div>
      </div>

      <div className="cl-toolbar">
        <input
          className="cl-search"
          placeholder="Search files…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="cl-select"
          value={catFilter}
          onChange={(e) => setCatFilter(e.target.value)}
        >
          {categories.map((c) => (
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
          {filtered.length} files
        </span>
      </div>

      <div className="cl-card">
        <div className="cl-table-wrap">
          <table className="cl-table">
            <thead>
              <tr>
                <th>File</th>
                <th>Category</th>
                <th>Size</th>
                <th>Uploaded by</th>
                <th>Date</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length ? (
                filtered.map((f) => (
                  <tr key={f.id}>
                    <td>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                        }}
                      >
                        <span className="sf-file-icon">
                          {FILE_ICONS[f.type] || "📎"}
                        </span>
                        <div>
                          <div className="sf-file-name">{f.name}</div>
                          <div className="sf-file-sub">
                            {f.type.toUpperCase()}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span
                        className={`pill ${CAT_COLORS[f.category] || "pill--neutral"}`}
                      >
                        {f.category}
                      </span>
                    </td>
                    <td style={{ color: "var(--text-muted)", fontSize: 13 }}>
                      {f.size}
                    </td>
                    <td style={{ color: "var(--text-muted)", fontSize: 13 }}>
                      {f.uploadedBy}
                    </td>
                    <td style={{ color: "var(--text-muted)", fontSize: 13 }}>
                      {f.uploaded}
                    </td>
                    <td>
                      <button className="sf-download-btn">↓ Download</button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6}>
                    <div className="cl-empty">
                      <div className="cl-empty__icon">📁</div>No files found.
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
