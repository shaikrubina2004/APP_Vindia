// pages/structural-engineer/Drawings.jsx
import {  useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchDrawings, uploadDrawing, updateDrawingStatus, QUERY_KEYS } from "../../api/structuralApi";
import "./Drawings.css";

const Drawings = () => {
  
  const queryClient = useQueryClient();
  const [search, setSearch]         = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [form, setForm] = useState({ name: "", version: "", file: null });

  const userRole = "architect"; // replace with auth context later

  // ✅ useQuery — cached, instant revisit, no duplicate fetches
  const {
    data: drawings = [],
    isLoading,
  } = useQuery({
    queryKey: QUERY_KEYS.drawings,
    queryFn: fetchDrawings,
  });

  // ─── Derived filtered list (no separate useEffect needed) ───────────────
  const filtered = drawings.filter((d) =>
    d.name.toLowerCase().includes(search.toLowerCase())
  );

  // ✅ useMutation for upload — auto-invalidates cache on success
  const uploadMutation = useMutation({
    mutationFn: uploadDrawing,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.drawings });
      setForm({ name: "", version: "", file: null });
    },
    onError: (err) => console.error("Upload failed:", err),
  });

  // ✅ useMutation for status update — optimistic update approach
  const statusMutation = useMutation({
    mutationFn: updateDrawingStatus,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.drawings });
    },
    onError: (err) => console.error("Status update failed:", err),
  });

  const handleUpload = (e) => {
    e.preventDefault();
    if (!form.name || !form.version || !form.file) {
      alert("Fill all fields");
      return;
    }
    const formData = new FormData();
    formData.append("name", form.name);
    formData.append("version", form.version);
    formData.append("file", form.file);
    formData.append("uploaded_by", "Structural Engineer");
    uploadMutation.mutate(formData);
  };

  const updateStatus = (id, role, status) => {
    statusMutation.mutate({ id, role, status });
  };

  return (
    <div className="drawings-container">
      {/* ── HEADER ──────────────────────────────────────────────────── */}
      <div className="drawings-header">
        <div>
          <h1>📄 Drawings Management</h1>
          <p>Upload, manage and approve structural drawings</p>
        </div>
        <input
          className="search-box"
          placeholder="🔍 Search drawings..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* ── UPLOAD CARD ─────────────────────────────────────────────── */}
      <div className="drawings-upload-card">
        <form onSubmit={handleUpload}>
          <input
            placeholder="Drawing Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <input
            placeholder="Version (v1.0)"
            value={form.version}
            onChange={(e) => setForm({ ...form, version: e.target.value })}
          />
          <input
            type="file"
            onChange={(e) => setForm({ ...form, file: e.target.files[0] })}
          />
          <button type="submit" disabled={uploadMutation.isPending}>
            {uploadMutation.isPending ? "Uploading..." : "Upload"}
          </button>
        </form>
      </div>

      {/* ── TABLE ───────────────────────────────────────────────────── */}
      <div className="drawings-table-card">
        {isLoading ? (
          <div className="loader"></div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Name</th><th>Version</th><th>Status</th>
                <th>Preview</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((d) => (
                <tr key={d.id}>
                  <td>{d.name}</td>
                  <td>{d.version}</td>

                  <td>
                    <div className="status-stack">
                      <div className="status-row">
                        <span>Architect</span>
                        <span className={`badge ${d.architect_status?.toLowerCase()}`}>
                          {d.architect_status}
                        </span>
                      </div>
                      <div className="status-row">
                        <span>MEP</span>
                        <span className={`badge ${d.mep_status?.toLowerCase()}`}>
                          {d.mep_status}
                        </span>
                      </div>
                      <div className="status-row">
                        <span>PM</span>
                        <span className={`badge ${d.manager_status?.toLowerCase()}`}>
                          {d.manager_status}
                        </span>
                      </div>
                    </div>
                  </td>

                  <td>
                    <button
                      className="btn view"
                      onClick={() => {
                        if (!d.file_url) { alert("No file available"); return; }
                        setSelectedFile(`http://localhost:5000/uploads/${d.file_url}`);
                      }}
                    >
                      View
                    </button>
                  </td>

                  <td className="actions">
                    {userRole === "architect" && (
                      <>
                        <button className="btn approve" onClick={() => updateStatus(d.id, "architect", "Approved")}>Approve</button>
                        <button className="btn reject"  onClick={() => updateStatus(d.id, "architect", "Rejected")}>Reject</button>
                      </>
                    )}
                    {userRole === "mep" && (
                      <>
                        <button className="btn approve" onClick={() => updateStatus(d.id, "mep", "Approved")}>Approve</button>
                        <button className="btn reject"  onClick={() => updateStatus(d.id, "mep", "Rejected")}>Reject</button>
                      </>
                    )}
                    {userRole === "manager" && (
                      <button className="btn approve" onClick={() => updateStatus(d.id, "manager", "Approved")}>Final Approve</button>
                    )}
                    {userRole === "structural" && (
                      <button className="btn delete">Delete</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── MODAL ───────────────────────────────────────────────────── */}
      {selectedFile && (
        <div className="modal">
          <div className="modal-content">
            <button onClick={() => setSelectedFile(null)}>✖</button>
            <iframe src={selectedFile} title="Preview"></iframe>
          </div>
        </div>
      )}
    </div>
  );
};

export default Drawings;