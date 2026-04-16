import React, { useState } from "react";
import IncidentManagement from "./IncidentManagement";
import TaskQueue from "./taskQueue";
import { MOCK_INCIDENTS } from "./incidentConfig";

export default function AppShell() {
  const [incidents, setIncidents] = useState(MOCK_INCIDENTS);
  const [page, setPage] = useState("incidents"); // "incidents" | "taskqueue"

  return (
    <>
      {page === "incidents" ? (
        <IncidentManagement
          incidents={incidents}
          setIncidents={setIncidents}
          onNavigateToQueue={() => setPage("taskqueue")}
        />
      ) : (
        <TaskQueue
          incidents={incidents}
          setIncidents={setIncidents}
          onNavigateBack={() => setPage("incidents")}
        />
      )}
    </>
  );
}
