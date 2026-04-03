import { useState } from "react";
import "../../../styles/TeamManagement.css";
export default function TeamManagement() {
  const [team, setTeam] = useState([
    {
      id: 1,
      name: "Ravi Kumar",
      role: "Site Engineer",
      project: "Villa Project",
      status: "Active",
    },
  ]);

  const [showModal, setShowModal] = useState(false);

  const [newMember, setNewMember] = useState({
    name: "",
    role: "",
    project: "",
  });

  // ✅ Add Member
  const handleAdd = () => {
    if (!newMember.name || !newMember.role) {
      alert("Fill required fields");
      return;
    }

    const member = {
      id: Date.now(),
      ...newMember,
      status: "Active",
    };

    setTeam([...team, member]);

    setNewMember({ name: "", role: "", project: "" });
    setShowModal(false);
  };

  // ✅ Delete Member
  const handleDelete = (id) => {
    setTeam(team.filter((m) => m.id !== id));
  };

  return (
    <div className="team-page">
      {/* HEADER */}
      <div className="team-header">
        <h2>👷 Team Management</h2>
        <button className="btn-primary" onClick={() => setShowModal(true)}>
          + Add Member
        </button>
      </div>

      {/* TABLE */}
      <div className="team-table">
        <div className="table-header">
          <div>Name</div>
          <div>Role</div>
          <div>Project</div>
          <div>Status</div>
          <div>Action</div>
        </div>

        {team.map((m) => (
          <div key={m.id} className="table-row">
            <div>{m.name}</div>
            <div>{m.role}</div>
            <div>{m.project || "-"}</div>
            <div>
              <span className="status active">{m.status}</span>
            </div>
            <div>
              <button
                className="btn-delete"
                onClick={() => handleDelete(m.id)}
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* MODAL */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <h3>Add Team Member</h3>

            <div className="form-group">
              <label>Name *</label>
              <input
                type="text"
                value={newMember.name}
                onChange={(e) =>
                  setNewMember({ ...newMember, name: e.target.value })
                }
              />
            </div>

            <div className="form-group">
              <label>Role *</label>
              <select
                value={newMember.role}
                onChange={(e) =>
                  setNewMember({ ...newMember, role: e.target.value })
                }
              >
                <option value="">Select Role</option>
                <option>Project Manager</option>
                <option>Site Engineer</option>
                <option>Architect</option>
                <option>Worker</option>
              </select>
            </div>

            <div className="form-group">
              <label>Project</label>
              <input
                type="text"
                placeholder="Project name"
                value={newMember.project}
                onChange={(e) =>
                  setNewMember({ ...newMember, project: e.target.value })
                }
              />
            </div>

            <div className="modal-actions">
              <button onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn-primary" onClick={handleAdd}>
                Add Member
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}