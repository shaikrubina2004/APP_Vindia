import { useEffect, useState } from "react";
import axios from "axios";
import "./Drawings.css";

const Drawings = () => {
  const [drawings, setDrawings] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState({
    name: "",
    version: "",
    file: null,
  });

  // FETCH
  const fetchDrawings = async () => {
    try {
      const res = await axios.get(
        "http://localhost:5000/api/structural/drawings"
      );
      setDrawings(res.data);
      setFiltered(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDrawings();
  }, []);

  // SEARCH
  useEffect(() => {
    const result = drawings.filter((d) =>
      d.name.toLowerCase().includes(search.toLowerCase())
    );
    setFiltered(result);
  }, [search, drawings]);

  // UPLOAD
  const handleUpload = async (e) => {
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

    try {
      await axios.post(
        "http://localhost:5000/api/structural/upload-drawing",
        formData
      );
      setForm({ name: "", version: "", file: null });
      fetchDrawings();
    } catch (err) {
      console.error(err);
    }
  };

  // DELETE
  const handleDelete = async (id) => {
    if (!window.confirm("Delete this drawing?")) return;
    await axios.delete(
      `http://localhost:5000/api/structural/drawings/${id}`
    );
    fetchDrawings();
  };

  const updateStatus = async (id, status) => {
    await axios.put(
      `http://localhost:5000/api/structural/drawings/${id}/status`,
      { status }
    );
    fetchDrawings();
  };

  return (
    <div className="drawings-container">
      {/* HEADER */}
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

      {/* UPLOAD CARD */}
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

          <button type="submit">Upload</button>
        </form>
      </div>

      {/* TABLE */}
      <div className="drawings-table-card">
        {loading ? (
          <div className="loader"></div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Version</th>
                <th>Status</th>
                <th>Preview</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {filtered.map((d) => (
                <tr key={d.id}>
                  <td>{d.name}</td>
                  <td>{d.version}</td>

                  <td>
                    <span className={`status ${d.status?.toLowerCase()}`}>
                      {d.status || "Draft"}
                    </span>
                  </td>

                  {/* FIXED PREVIEW */}
                  <td>
                    <button
                      className="btn view"
                      onClick={() => {
                        if (!d.file_url) {
                          alert("No file available");
                          return;
                        }
                        setSelectedFile(
                          `http://localhost:5000/uploads/${d.file_url}`
                        );
                      }}
                    >
                      View
                    </button>
                  </td>

                  <td className="actions">
                    <button
                      className="btn approve"
                      onClick={() => updateStatus(d.id, "Approved")}
                    >
                      ✔
                    </button>

                    <button
                      className="btn reject"
                      onClick={() => updateStatus(d.id, "Rejected")}
                    >
                      ✖
                    </button>

                    <button
                      className="btn delete"
                      onClick={() => handleDelete(d.id)}
                    >
                      🗑
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* MODAL */}
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