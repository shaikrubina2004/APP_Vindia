import { useEffect, useState } from "react";
import axios from "axios";

const Drawings = () => {
  const [drawings, setDrawings] = useState([]);
  const [form, setForm] = useState({
    name: "",
    version: "",
    file: null,
  });

  // 📥 Fetch drawings
  useEffect(() => {
    fetchDrawings();
  }, []);

  const fetchDrawings = async () => {
    try {
      const res = await axios.get(
        "http://localhost:5000/api/structural/drawings"
      );
      setDrawings(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  // 📤 Upload drawing
  const handleUpload = async (e) => {
    e.preventDefault();

    if (!form.name || !form.version || !form.file) {
      alert("Please fill all fields");
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

      alert("Uploaded successfully ✅");

      setForm({ name: "", version: "", file: null });
      fetchDrawings(); // refresh
    } catch (err) {
      console.error(err);
      alert("Upload failed ❌");
    }
  };

  return (
    <div style={{ padding: "20px" }}>
      <h2>📄 Drawings Module</h2>

      {/* Upload Form */}
      <form onSubmit={handleUpload} style={{ marginBottom: "20px" }}>
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

      {/* Drawings Table */}
      <table border="1" cellPadding="10">
        <thead>
          <tr>
            <th>Name</th>
            <th>Version</th>
            <th>Uploaded By</th>
            <th>File</th>
          </tr>
        </thead>
        <tbody>
          {drawings.length === 0 ? (
            <tr>
              <td colSpan="4">No drawings available</td>
            </tr>
          ) : (
            drawings.map((d) => (
              <tr key={d.id}>
                <td>{d.name}</td>
                <td>{d.version}</td>
                <td>{d.uploaded_by}</td>
                <td>
                  <a
                    href={`http://localhost:5000/uploads/${d.file_url}`}
                    target="_blank"
                  >
                    View
                  </a>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default Drawings;