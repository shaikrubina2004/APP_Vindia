function EmployeeToolbar({ onAdd, search, setSearch }) {
  return (
    <div className="employee-toolbar">
      <input
        type="text"
        placeholder="Search employees..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <button className="add-btn" onClick={onAdd}>
        + Add Employee
      </button>
    </div>
  );
}

export default EmployeeToolbar;