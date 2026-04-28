import { useState } from "react";
import { createTask } from "../../services/taskService";

export default function CreateTask() {
  const [form, setForm] = useState({
    title: "",
    description: "",
    project_id: "",
    status: "pending"
  });

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      await createTask(form);

      alert("Task Created ✅");

      // reset form
      setForm({
        title: "",
        description: "",
        project_id: "",
        status: "pending"
      });

    } catch (err) {
      console.error(err);
      alert("Error creating task ❌");
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        placeholder="Title"
        value={form.title}
        onChange={(e) => setForm({ ...form, title: e.target.value })}
      />

      <input
        placeholder="Description"
        value={form.description}
        onChange={(e) => setForm({ ...form, description: e.target.value })}
      />

      <input
        placeholder="Project ID"
        value={form.project_id}
        onChange={(e) => setForm({ ...form, project_id: e.target.value })}
      />

      <select
        value={form.status}
        onChange={(e) => setForm({ ...form, status: e.target.value })}
      >
        <option value="pending">Pending</option>
        <option value="in_progress">In Progress</option>
        <option value="done">Done</option>
        <option value="blocked">Blocked</option>
      </select>

      <button type="submit">Create Task</button>
    </form>
  );
}