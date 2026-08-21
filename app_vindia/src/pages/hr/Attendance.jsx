import { API } from "../../services/authService";
import React, { useState, useEffect, useRef, useMemo } from "react";
import "./Attendance.css";

const STATUS_LABEL = {
  present: "Present",
  late: "Late",
  absent: "Absent",
  wfh: "WFH",
  "half day": "Half Day",
  holiday: "Holiday",
};

const REMARKS_SUBLABEL = {
  "afternoon present": "Afternoon Present",
  "afternoon absent": "Afternoon Absent",
  "late + afternoon absent": "Late + Afternoon Absent",
  "full day": "",
  present: "",
};

const getStatusLabel = (status = "") =>
  STATUS_LABEL[status.toLowerCase().trim()] ?? status;

const getRemarkLabel = (remarks = "") => {
  if (!remarks || remarks === "—") return "";

  const key = remarks.toLowerCase().trim();

  if (key in REMARKS_SUBLABEL) {
    return REMARKS_SUBLABEL[key];
  }

  if (
    key === "present" ||
    key === "full day" ||
    key === "on time"
  ) {
    return "";
  }

  return remarks;
};

const getPillClass = (status = "", remarks = "") => {
  const normalizedStatus = status.toLowerCase().trim();
  const normalizedRemarks = (remarks || "").toLowerCase().trim();

  if (normalizedStatus === "half day") {
    if (normalizedRemarks.includes("afternoon absent")) {
      return "am-pill-afternoon-absent";
    }

    if (normalizedRemarks.includes("afternoon present")) {
      return "am-pill-afternoon-present";
    }

    return "am-pill-half-day";
  }

  return `am-pill-${normalizedStatus.replace(/ /g, "-")}`;
};

const formatLate = (minutes) => {
  if (!minutes || minutes <= 0) return null;

  if (minutes < 60) {
    return `${minutes} min late`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  return remainingMinutes > 0
    ? `${hours}h ${remainingMinutes}m late`
    : `${hours}h late`;
};

const fmtTime = (time) => {
  if (!time) return "—";

  const [hours, minutes] = String(time).split(":");
  const parsedHours = parseInt(hours, 10);

  if (Number.isNaN(parsedHours) || !minutes) {
    return "—";
  }

  return `${parsedHours % 12 || 12}:${minutes} ${
    parsedHours >= 12 ? "PM" : "AM"
  }`;
};

const timeToMinutes = (time) => {
  if (!time) return null;

  const [hours, minutes] = String(time).split(":").map(Number);

  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return null;
  }

  return hours * 60 + minutes;
};

/*
  Attendance rules:

  1. No check-in:
     Absent

  2. Check-in from 9:00 AM to 9:30 AM:
     Present - Full Day

  3. Check-in from 9:31 AM to 1:00 PM:
     Late - Full Day

  4. Check-in from 1:01 PM to 2:00 PM:
     Half Day - Afternoon Present

  5. Any late check-in with checkout before 1:00 PM:
     Half Day - Afternoon Absent

  6. Any late check-in with checkout between 1:00 PM and 6:00 PM:
     Half Day - Late + Afternoon Absent
*/

const classifyAttendance = (checkIn, checkOut) => {
  const checkInMinutes = timeToMinutes(checkIn);
  const checkOutMinutes = timeToMinutes(checkOut);

  const START_TIME = 9 * 60; // 9:00 AM
  const GRACE_END = 9 * 60 + 30; // 9:30 AM
  const AFTERNOON_START = 13 * 60; // 1:00 PM
  const HALF_DAY_END = 14 * 60; // 2:00 PM
  const FULL_DAY_END = 18 * 60; // 6:00 PM

  // No check-in at all
  if (checkInMinutes === null) {
    return {
      status: "absent",
      remarks: "No attendance record",
      lateMinutes: 0,
    };
  }

  // Before 9:00 AM is also treated as Present
  if (checkInMinutes < START_TIME) {
    return {
      status: "present",
      remarks: "Full Day",
      lateMinutes: 0,
    };
  }

  // 9:00 AM - 9:30 AM
  // Checkout can be 6:00 PM or still open.
  if (
    checkInMinutes >= START_TIME &&
    checkInMinutes <= GRACE_END
  ) {
    return {
      status: "present",
      remarks: "Full Day",
      lateMinutes: 0,
    };
  }

  // 1:01 PM - 2:00 PM
  // This condition is checked before checkout-based rules.
  if (
    checkInMinutes > AFTERNOON_START &&
    checkInMinutes <= HALF_DAY_END
  ) {
    return {
      status: "half day",
      remarks: "Afternoon Present",
      lateMinutes: checkInMinutes - GRACE_END,
    };
  }

  // 9:31 AM - 1:00 PM
  // Checkout can be 6:00 PM or still open.
  if (
    checkInMinutes > GRACE_END &&
    checkInMinutes <= AFTERNOON_START
  ) {
    return {
      status: "late",
      remarks: "Full Day",
      lateMinutes: checkInMinutes - GRACE_END,
    };
  }

  // Any late check-in with checkout before 1:00 PM
  if (
    checkInMinutes > GRACE_END &&
    checkOutMinutes !== null &&
    checkOutMinutes < AFTERNOON_START
  ) {
    return {
      status: "half day",
      remarks: "Afternoon Absent",
      lateMinutes: checkInMinutes - GRACE_END,
    };
  }

  // Late check-in with checkout between 1:00 PM and 6:00 PM
  if (
    checkInMinutes > GRACE_END &&
    checkOutMinutes !== null &&
    checkOutMinutes >= AFTERNOON_START &&
    checkOutMinutes <= FULL_DAY_END
  ) {
    return {
      status: "half day",
      remarks: "Late + Afternoon Absent",
      lateMinutes: checkInMinutes - GRACE_END,
    };
  }

  // Late check-in without checkout
  return {
    status: "late",
    remarks: "Full Day",
    lateMinutes: checkInMinutes - GRACE_END,
  };
};

const isToday = (dateObject) => {
  const now = new Date();

  return (
    dateObject.getFullYear() === now.getFullYear() &&
    dateObject.getMonth() === now.getMonth() &&
    dateObject.getDate() === now.getDate()
  );
};

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const SHORT_MONTH = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const toDateKey = (date) => {
  if (!date) return "";

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return "";
  }

  return parsedDate.toLocaleDateString("en-CA");
};

// Keep this in sync with backend/controllers/payrollController.js HOLIDAYS
const HOLIDAYS = new Set([
  "2024-01-26","2024-08-15","2024-10-02","2024-12-25",
  "2025-01-01","2025-01-14","2025-01-26","2025-03-17",
  "2025-04-14","2025-05-01","2025-08-15","2025-10-02","2025-12-25",
  "2026-01-01","2026-01-15","2026-01-26","2026-03-19",
  "2026-04-15","2026-05-01","2026-08-26","2026-09-14",
  "2026-10-20","2026-12-25",
]);

// Sunday or a listed public holiday = not a working day, so we never
// synthesize an "Absent — No attendance record" row for it.
const isNonWorkingDay = (dateKey) => {
  if (HOLIDAYS.has(dateKey)) return true;
  const d = new Date(`${dateKey}T00:00:00`);
  return d.getDay() === 0; // Sunday
};

const dateRange = (start, end) => {
  const dates = [];

  const currentDate = new Date(start);
  currentDate.setHours(0, 0, 0, 0);

  const lastDate = new Date(end);
  lastDate.setHours(0, 0, 0, 0);

  while (currentDate <= lastDate) {
    dates.push(toDateKey(currentDate));
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return dates;
};

const fmtFilterDate = (date) =>
  date
    ? date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "";

const synthesizeAbsentRow = (employee, dateKey) => ({
  id: `absent-${employee.id}-${dateKey}`,
  employee_id: employee.id,
  name: employee.name,
  designation: employee.designation || "—",
  department: employee.department || "—",
  status: "absent",
  checkIn: "—",
  checkOut: "—",
  shift: "—",
  shiftTime: "",
  lateMinutes: 0,
  remarks: "No attendance record",
  date: dateKey,
  checkInLat: null,
  checkInLng: null,
  checkInAddress: null,
  checkOutLat: null,
  checkOutLng: null,
  checkOutAddress: null,
});

const expandEmployeeFullRange = (rows, employee) => {
  const employeeId = employee.id;

  const existingForEmployee = new Map(
    rows
      .filter((row) => row.employee_id === employeeId)
      .map((row) => [row.date, row])
  );

  const fullDates = dateRange(employee.join_date, new Date());

  const expandedForEmployee = fullDates
    .map((dateKey) => {
      const existing = existingForEmployee.get(dateKey);
      if (existing) return existing;
      // Sundays / public holidays are not working days — don't
      // synthesize an "Absent" row when there's no attendance record.
      if (isNonWorkingDay(dateKey)) return null;
      return synthesizeAbsentRow(employee, dateKey);
    })
    .filter(Boolean);

  const otherRows = rows.filter(
    (row) => row.employee_id !== employeeId
  );

  return [...otherRows, ...expandedForEmployee];
};

// Fills in "Absent" rows for every employee across every working day in
// [fromDate, toDate], so the range filter and CSV download reflect a
// complete picture even for days nobody checked in.
const expandAllEmployeesForRange = (rows, employees, fromDate, toDate) => {
  const dateKeys = dateRange(fromDate, toDate).filter(
    (key) => !isNonWorkingDay(key)
  );

  const existingKeys = new Set(
    rows.map((row) => `${row.employee_id}-${row.date}`)
  );

  const additions = [];

  dateKeys.forEach((dateKey) => {
    employees.forEach((employee) => {
      if (
        employee.join_date &&
        new Date(employee.join_date) > new Date(dateKey)
      ) {
        return;
      }

      const key = `${employee.id}-${dateKey}`;
      if (!existingKeys.has(key)) {
        additions.push(synthesizeAbsentRow(employee, dateKey));
        existingKeys.add(key);
      }
    });
  });

  return [...rows, ...additions];
};

function AttendanceManagement() {
  const calendarRef = useRef(null);

  const [calNav, setCalNav] = useState(new Date());
  // Date-range selection for filtering + CSV download. First click sets
  // dateFrom, second click sets dateTo (or swaps if it's earlier).
  const [dateFrom, setDateFrom] = useState(null);
  const [dateTo, setDateTo] = useState(null);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const [searchName, setSearchName] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);

  const rowsPerPage = 10;

  const [todayRows, setTodayRows] = useState([]);
  const [historyMap, setHistoryMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState([]);

  // Whoever is viewing THIS page (HR / CEO / etc) — used only to decide
  // whether raw check-in/check-out coordinates should be requested and
  // whether the map pin icon renders. The backend independently strips
  // coordinates for any viewer who isn't declared CEO, so hiding the
  // icon here is a UI nicety, not the actual enforcement point.
  const viewer = JSON.parse(localStorage.getItem("user") || "{}");
  const viewerDesignation = viewer?.designation || viewer?.role || "";
  const isCEOViewer =
    viewerDesignation.trim().toLowerCase() === "ceo";

  useEffect(() => {
    loadAll();

    API.get("/employees")
      .then((response) => {
        setEmployees(response.data || []);
      })
      .catch((error) => {
        console.error("Failed to load employees:", error);
      });
  }, []);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (
        calendarRef.current &&
        !calendarRef.current.contains(event.target)
      ) {
        setCalendarOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, []);

  const loadAll = async () => {
    setLoading(true);

    try {
      const [todayResponse, historyResponse] = await Promise.all([
        API.get("/attendance/today/all", {
          params: { viewer_designation: viewerDesignation },
        }),
        API.get("/attendance", {
          params: { viewer_designation: viewerDesignation },
        }),
      ]);

      const mappedToday = (todayResponse.data || []).map((row) => {
        const attendance = classifyAttendance(
          row.check_in,
          row.check_out
        );

        return {
          id:
            row.attendance_id ??
            `emp-${row.employee_id}`,

          employee_id: row.employee_id,
          name:
            row.name ||
            `Employee ${row.employee_id}`,

          designation: row.designation || "—",
          department: row.department || "—",

          status: attendance.status,
          empStatus: (row.emp_status || "").toLowerCase(),

          checkIn: fmtTime(row.check_in),
          checkOut: fmtTime(row.check_out),

          shift: row.shift || "Morning",
          shiftTime:
            row.shift_timing ||
            "09:00 AM – 06:00 PM",

          lateMinutes: attendance.lateMinutes,
          remarks: attendance.remarks,

          hasRecord: !!row.attendance_id,
          date: toDateKey(new Date()),

          checkInLat: row.check_in_lat ?? null,
          checkInLng: row.check_in_lng ?? null,
          checkInAddress: row.check_in_address ?? null,
          checkOutLat: row.check_out_lat ?? null,
          checkOutLng: row.check_out_lng ?? null,
          checkOutAddress: row.check_out_address ?? null,
        };
      });

      const map = {};

      (historyResponse.data || []).forEach((row) => {
        const dateKey = toDateKey(row.date);

        if (!map[dateKey]) {
          map[dateKey] = [];
        }

        const attendance = classifyAttendance(
          row.check_in,
          row.check_out
        );

        map[dateKey].push({
          id: row.id,
          employee_id: row.employee_id,

          name:
            row.name ||
            `Employee ${row.employee_id}`,

          designation: row.designation || "—",
          department: row.department || "—",

          status: attendance.status,

          checkIn: fmtTime(row.check_in),
          checkOut: fmtTime(row.check_out),

          shift: row.shift || "Morning",
          shiftTime:
            row.shift_timing ||
            "09:00 AM – 06:00 PM",

          lateMinutes: attendance.lateMinutes,
          remarks: attendance.remarks,

          date: dateKey,

          checkInLat: row.check_in_lat ?? null,
          checkInLng: row.check_in_lng ?? null,
          checkInAddress: row.check_in_address ?? null,
          checkOutLat: row.check_out_lat ?? null,
          checkOutLng: row.check_out_lng ?? null,
          checkOutAddress: row.check_out_address ?? null,
        });
      });

      setTodayRows(mappedToday);
      setHistoryMap(map);
    } catch (error) {
      console.error("Failed to load attendance:", error);
    } finally {
      setLoading(false);
    }
  };

  const allRows = useMemo(() => {
    const historyRows = Object.values(historyMap).flat();
    const todayKey = toDateKey(new Date());

    const todayIds = new Set(
      todayRows.map(
        (row) => `${row.employee_id}-${todayKey}`
      )
    );

    const uniqueHistory = historyRows.filter(
      (row) =>
        !todayIds.has(
          `${row.employee_id}-${row.date}`
        )
    );

    return [...todayRows, ...uniqueHistory];
  }, [todayRows, historyMap]);

  const effectiveRows = useMemo(() => {
    let rows = allRows;

    const nameQuery = searchName.trim().toLowerCase();

    if (nameQuery) {
      const matches = employees.filter(
        (employee) =>
          (employee.name || "")
            .toLowerCase()
            .includes(nameQuery) ||
          (employee.employee_code || "")
            .toLowerCase()
            .includes(nameQuery)
      );

      if (
        matches.length === 1 &&
        matches[0].join_date
      ) {
        rows = expandEmployeeFullRange(
          rows,
          matches[0]
        );
      }
    }

    if (dateFrom) {
      const rangeEnd = dateTo || dateFrom;
      rows = expandAllEmployeesForRange(
        rows,
        employees,
        dateFrom,
        rangeEnd
      );
    }

    return rows;
  }, [
    allRows,
    employees,
    searchName,
    dateFrom,
    dateTo,
  ]);

  const filtered = useMemo(() => {
    const nameQuery = searchName.trim().toLowerCase();
    const statusQuery = selectedStatus.trim().toLowerCase();
    const fromKey = dateFrom ? toDateKey(dateFrom) : "";
    const toKey = dateTo ? toDateKey(dateTo) : "";

    const rows = effectiveRows.filter((row) => {
      const name = (row.name || "").toLowerCase();
      const status = (row.status || "")
        .toLowerCase()
        .trim();

      const rowDate = (row.date || "")
        .toLowerCase();

      const nameMatch =
        !nameQuery || name.includes(nameQuery);

      const statusMatch =
        !statusQuery ||
        statusQuery === "all" ||
        status === statusQuery;

      let dateMatch = true;
      if (fromKey && toKey) {
        dateMatch = rowDate >= fromKey && rowDate <= toKey;
      } else if (fromKey) {
        dateMatch = rowDate === fromKey;
      }

      return nameMatch && statusMatch && dateMatch;
    });

    return rows.sort((first, second) =>
      first.date < second.date
        ? 1
        : first.date > second.date
        ? -1
        : 0
    );
  }, [
    effectiveRows,
    searchName,
    selectedStatus,
    dateFrom,
    dateTo,
  ]);

  const activeFilterChips = useMemo(() => {
    const chips = [];

    if (searchName.trim()) {
      chips.push({
        key: "name",
        label: `Name: "${searchName.trim()}"`,
      });
    }

    if (dateFrom) {
      const sameDay =
        !dateTo || toDateKey(dateTo) === toDateKey(dateFrom);

      chips.push({
        key: "date",
        label: sameDay
          ? `Date: ${fmtFilterDate(dateFrom)}`
          : `Date: ${fmtFilterDate(dateFrom)} – ${fmtFilterDate(dateTo)}`,
      });
    }

    if (
      selectedStatus &&
      selectedStatus !== "all"
    ) {
      chips.push({
        key: "status",
        label: `Status: ${getStatusLabel(
          selectedStatus
        )}`,
      });
    }

    return chips;
  }, [
    searchName,
    selectedStatus,
    dateFrom,
    dateTo,
  ]);

  const hasActiveFilters =
    activeFilterChips.length > 0;

  const clearFilters = () => {
    setSearchName("");
    setSelectedStatus("all");
    setDateFrom(null);
    setDateTo(null);
    setCurrentPage(1);
  };

  const emptyStateMessage = hasActiveFilters
    ? `No attendance records found for ${activeFilterChips
        .map((chip) =>
          chip.label.replace(": ", " ")
        )
        .join(", ")}.`
    : "No attendance records found";

  const counts = useMemo(() => {
    return filtered.reduce(
      (result, row) => {
        const status = row.status
          .toLowerCase()
          .trim();

        const remarks = (row.remarks || "")
          .toLowerCase()
          .trim();

        if (status === "present") {
          result.present++;
        } else if (status === "late") {
          result.late++;
          result.present++;
        } else if (status === "absent") {
          result.absent++;
        } else if (status === "wfh") {
          result.wfh++;
        } else if (status === "half day") {
          result.halfDay++;

          if (
            remarks.includes("afternoon absent")
          ) {
            result.afternoonAbsent++;
          } else if (
            remarks.includes("afternoon present")
          ) {
            result.afternoonPresent++;
          }
        }

        return result;
      },
      {
        present: 0,
        absent: 0,
        late: 0,
        wfh: 0,
        halfDay: 0,
        afternoonAbsent: 0,
        afternoonPresent: 0,
      }
    );
  }, [filtered]);

  const total = filtered.length;

  const totalPages = Math.max(
    1,
    Math.ceil(filtered.length / rowsPerPage)
  );

  const paginated = filtered.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [
    searchName,
    selectedStatus,
    dateFrom,
    dateTo,
  ]);

  const daysInMonth = new Date(
    calNav.getFullYear(),
    calNav.getMonth() + 1,
    0
  ).getDate();

  const firstDay = new Date(
    calNav.getFullYear(),
    calNav.getMonth(),
    1
  ).getDay();

  const monthDays = [];

  for (let index = 0; index < firstDay; index++) {
    monthDays.push(null);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    monthDays.push(day);
  }

  // First click starts a fresh range. Second click completes it — if the
  // second date is earlier than the first, they're swapped automatically.
  const handleDateClick = (day) => {
    if (!day) return;

    const pickedDate = new Date(
      calNav.getFullYear(),
      calNav.getMonth(),
      day
    );

    if (!dateFrom || (dateFrom && dateTo)) {
      setDateFrom(pickedDate);
      setDateTo(null);
      return;
    }

    if (pickedDate < dateFrom) {
      setDateTo(dateFrom);
      setDateFrom(pickedDate);
    } else {
      setDateTo(pickedDate);
    }

    setCalendarOpen(false);
  };

  const clearRange = () => {
    setDateFrom(null);
    setDateTo(null);
  };

  // CSV download for the selected range — only enabled once both a
  // from-date and to-date are picked.
  const handleDownload = async () => {
    if (!dateFrom || !dateTo) return;

    setDownloading(true);

    try {
      const from = toDateKey(dateFrom);
      const to = toDateKey(dateTo);

      const response = await API.get("/attendance/export/range", {
        params: { from, to },
        responseType: "blob",
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `attendance_${from}_to_${to}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Failed to download attendance:", error);
    } finally {
      setDownloading(false);
    }
  };

  const today = new Date();

  const mapLink = (lat, lng) =>
    `https://www.google.com/maps?q=${lat},${lng}`;

  return (
    <div className="am-page">
      <div className="am-cards">
        <div className="am-card am-card-blue">
          <div className="am-card-top">
            <span className="am-card-title">
              Total Employees
            </span>

            <span className="am-card-pct am-pct-blue">
              All staff
            </span>
          </div>

          <div className="am-card-value">
            {total}
          </div>

          <div className="am-card-sub">
            Filtered employees
          </div>
        </div>

        <div className="am-card am-card-green">
          <div className="am-card-top">
            <span className="am-card-title">
              Present
            </span>

            <span className="am-card-pct am-pct-green">
              {total > 0
                ? Math.round(
                    (counts.present / total) * 100
                  )
                : 0}
              %
            </span>
          </div>

          <div className="am-card-value">
            {counts.present}
          </div>

          <div className="am-card-sub">
            On time + late arrivals
          </div>
        </div>

        <div className="am-card am-card-amber">
          <div className="am-card-top">
            <span className="am-card-title">
              Late Arrivals
            </span>

            <span className="am-card-pct am-pct-amber">
              {total > 0
                ? Math.round(
                    (counts.late / total) * 100
                  )
                : 0}
              %
            </span>
          </div>

          <div className="am-card-value">
            {counts.late}
          </div>

          <div className="am-card-sub">
            Checked in late
          </div>
        </div>

        <div className="am-card am-card-red">
          <div className="am-card-top">
            <span className="am-card-title">
              Absent
            </span>

            <span className="am-card-pct am-pct-red">
              {total > 0
                ? Math.round(
                    (counts.absent / total) * 100
                  )
                : 0}
              %
            </span>
          </div>

          <div className="am-card-value">
            {counts.absent}
          </div>

          <div className="am-card-sub">
            No attendance record
          </div>
        </div>

        <div className="am-card am-card-wfh">
          <div className="am-card-top">
            <span className="am-card-title">
              Work From Home
            </span>

            <span className="am-card-pct am-pct-wfh">
              {total > 0
                ? Math.round(
                    (counts.wfh / total) * 100
                  )
                : 0}
              %
            </span>
          </div>

          <div className="am-card-value">
            {counts.wfh}
          </div>

          <div className="am-card-sub">
            Remote employees
          </div>
        </div>
      </div>

      <div className="am-toolbar">
        <div className="am-toolbar-left">
          <div className="am-search-wrap">
            <svg
              className="am-search-icon"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <circle cx="11" cy="11" r="8" />
              <line
                x1="21"
                y1="21"
                x2="16.65"
                y2="16.65"
              />
            </svg>

            <input
              className="am-search"
              placeholder="Search employee name…"
              value={searchName}
              onChange={(event) =>
                setSearchName(event.target.value)
              }
            />
          </div>

          <select
            className="am-filter-select"
            value={selectedStatus}
            onChange={(event) =>
              setSelectedStatus(event.target.value)
            }
          >
            <option value="all">All Status</option>
            <option value="present">Present</option>
            <option value="late">Late</option>
            <option value="absent">Absent</option>
            <option value="half day">Half Day</option>
            <option value="wfh">WFH</option>
            <option value="holiday">Holiday</option>
          </select>

          <button
            className="am-search-btn"
            onClick={() => setCurrentPage(1)}
          >
            Search
          </button>

          {hasActiveFilters && (
            <button
              className="am-search-btn"
              style={{
                background: "#fff",
                color: "#475569",
                border: "1px solid #e2e8f0",
              }}
              onClick={clearFilters}
            >
              Clear Filters
            </button>
          )}
        </div>

        <div className="am-toolbar-right">
          <div
            className="am-cal-wrap"
            ref={calendarRef}
          >
            <button
              className="am-cal-btn"
              onClick={() =>
                setCalendarOpen((value) => !value)
              }
            >
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <rect
                  x="3"
                  y="4"
                  width="18"
                  height="18"
                  rx="2"
                  ry="2"
                />
                <line
                  x1="16"
                  y1="2"
                  x2="16"
                  y2="6"
                />
                <line
                  x1="8"
                  y1="2"
                  x2="8"
                  y2="6"
                />
                <line
                  x1="3"
                  y1="10"
                  x2="21"
                  y2="10"
                />
              </svg>

              {dateFrom && dateTo ? (
                <>
                  {dateFrom.getDate()}{" "}
                  {SHORT_MONTH[dateFrom.getMonth()]}
                  {" – "}
                  {dateTo.getDate()}{" "}
                  {SHORT_MONTH[dateTo.getMonth()]}{" "}
                  {dateTo.getFullYear()}
                </>
              ) : dateFrom ? (
                <>
                  {dateFrom.getDate()}{" "}
                  {SHORT_MONTH[dateFrom.getMonth()]}{" "}
                  {dateFrom.getFullYear()}
                  {" – …"}
                </>
              ) : (
                <>Select Date Range</>
              )}

              {dateFrom &&
                !dateTo &&
                isToday(dateFrom) && (
                  <span className="am-today-badge">
                    Today
                  </span>
                )}

              <svg
                width="10"
                height="10"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                style={{
                  transition: "transform .2s",
                  transform: calendarOpen
                    ? "rotate(180deg)"
                    : "rotate(0)",
                }}
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            {calendarOpen && (
              <div className="am-cal-dropdown">
                <div className="am-cal-nav">
                  <button
                    className="am-cal-nav-btn"
                    onClick={(event) => {
                      event.stopPropagation();

                      setCalNav(
                        new Date(
                          calNav.getFullYear(),
                          calNav.getMonth() - 1
                        )
                      );
                    }}
                  >
                    &#8592;
                  </button>

                  <span className="am-cal-month-label">
                    {MONTH_NAMES[calNav.getMonth()]}{" "}
                    {calNav.getFullYear()}
                  </span>

                  <button
                    className="am-cal-nav-btn"
                    onClick={(event) => {
                      event.stopPropagation();

                      setCalNav(
                        new Date(
                          calNav.getFullYear(),
                          calNav.getMonth() + 1
                        )
                      );
                    }}
                  >
                    &#8594;
                  </button>
                </div>

                <div className="am-cal-hint">
                  {!dateFrom
                    ? "Pick a start date"
                    : !dateTo
                    ? "Pick an end date"
                    : "Range selected"}
                </div>

                <div className="am-cal-grid">
                  {[
                    "Su",
                    "Mo",
                    "Tu",
                    "We",
                    "Th",
                    "Fr",
                    "Sa",
                  ].map((dayName) => (
                    <div
                      key={dayName}
                      className="am-cal-head"
                    >
                      {dayName}
                    </div>
                  ))}

                  {monthDays.map((day, index) => {
                    const cellDate = day
                      ? new Date(
                          calNav.getFullYear(),
                          calNav.getMonth(),
                          day
                        )
                      : null;
                    const cellKey = cellDate
                      ? toDateKey(cellDate)
                      : "";
                    const fromKey = dateFrom
                      ? toDateKey(dateFrom)
                      : "";
                    const toKey = dateTo
                      ? toDateKey(dateTo)
                      : "";

                    const isTodayDate =
                      day &&
                      today.getFullYear() ===
                        calNav.getFullYear() &&
                      today.getMonth() ===
                        calNav.getMonth() &&
                      today.getDate() === day;

                    const isStart =
                      day && cellKey === fromKey;
                    const isEnd =
                      day && toKey && cellKey === toKey;
                    const isInRange =
                      day &&
                      fromKey &&
                      toKey &&
                      cellKey > fromKey &&
                      cellKey < toKey;

                    return (
                      <div
                        key={index}
                        className={`am-cal-day${
                          !day ? " empty" : ""
                        }${
                          isTodayDate
                            ? " is-today"
                            : ""
                        }${
                          isStart || isEnd
                            ? " is-selected"
                            : ""
                        }${
                          isInRange
                            ? " is-in-range"
                            : ""
                        }`}
                        onClick={() =>
                          handleDateClick(day)
                        }
                      >
                        {day}
                      </div>
                    );
                  })}
                </div>

                <button
                  className="am-clear-date-btn"
                  onClick={clearRange}
                >
                  Clear Dates
                </button>
              </div>
            )}
          </div>

          <button
            className="am-download-btn"
            disabled={!dateFrom || !dateTo || downloading}
            onClick={handleDownload}
            title={
              !dateFrom || !dateTo
                ? "Select a from and to date to enable download"
                : "Download attendance for the selected range"
            }
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M12 3v12" />
              <path d="M7 10l5 5 5-5" />
              <path d="M5 21h14" />
            </svg>
            {downloading ? "Preparing…" : "Download"}
          </button>
        </div>
      </div>

      {hasActiveFilters && (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 8,
            alignItems: "center",
            margin: "12px 0",
          }}
        >
          <span
            style={{
              fontSize: 12,
              color: "#64748b",
              fontWeight: 600,
            }}
          >
            Filtered by:
          </span>

          {activeFilterChips.map((chip) => (
            <span
              key={chip.key}
              style={{
                fontSize: 12,
                color: "#334155",
                background: "#f1f5f9",
                border: "1px solid #e2e8f0",
                borderRadius: 999,
                padding: "4px 10px",
              }}
            >
              {chip.label}
            </span>
          ))}

          <span
            style={{
              fontSize: 12,
              color: "#94a3b8",
            }}
          >
            ({total} result
            {total !== 1 ? "s" : ""})
          </span>
        </div>
      )}

      <div className="am-table-wrap">
        <table className="am-table">
          <thead>
            <tr className="am-thead-row">
              <th className="am-th am-th-check">
                <input
                  type="checkbox"
                  className="am-checkbox"
                />
              </th>

              <th className="am-th">Employee</th>
              <th className="am-th">Department</th>
              <th className="am-th">Date</th>
              <th className="am-th">Check In</th>
              <th className="am-th">Check Out</th>
              <th className="am-th">Shift</th>
              <th className="am-th">Late By</th>
              <th className="am-th">Status</th>
              <th className="am-th">Location</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan={10}
                  className="am-empty-cell"
                >
                  <div className="am-empty-inner">
                    Loading…
                  </div>
                </td>
              </tr>
            ) : paginated.length > 0 ? (
              paginated.map((record) => (
                <tr
                  key={record.id}
                  className="am-tr"
                >
                  <td className="am-td am-td-check">
                    <input
                      type="checkbox"
                      className="am-checkbox"
                    />
                  </td>

                  <td className="am-td">
                    <div className="am-emp-cell">
                      <div
                        className={`am-avatar${
                          record.empStatus ===
                          "work_from_home"
                            ? " am-avatar-wfh"
                            : ""
                        }`}
                      >
                        {record.name
                          ?.trim()
                          .charAt(0)
                          .toUpperCase() || "?"}
                      </div>

                      <div className="am-emp-info">
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                          }}
                        >
                          <span className="am-emp-name">
                            {record.name}
                          </span>

                          {record.empStatus ===
                            "work_from_home" && (
                            <span className="am-wfh-badge">
                              WFH
                            </span>
                          )}
                        </div>

                        {record.designation &&
                          record.designation !== "—" && (
                            <span className="am-emp-designation">
                              {record.designation}
                            </span>
                          )}
                      </div>
                    </div>
                  </td>

                  <td
                    className="am-td"
                    style={{
                      color: "#64748b",
                      fontSize: 13,
                    }}
                  >
                    {record.department}
                  </td>

                  <td className="am-td am-td-mono">
                    {record.date}
                  </td>

                  <td className="am-td am-td-mono">
                    {record.checkIn}
                  </td>

                  <td className="am-td am-td-mono">
                    {record.checkOut}
                  </td>

                  <td className="am-td">
                    {record.shift}
                  </td>

                  <td className="am-td">
                    {formatLate(record.lateMinutes) ? (
                      <span className="am-late-tag">
                        {formatLate(record.lateMinutes)}
                      </span>
                    ) : (
                      <span className="am-late-none">
                        —
                      </span>
                    )}
                  </td>

                  <td className="am-td">
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 3,
                      }}
                    >
                      <span
                        className={getPillClass(
                          record.status,
                          record.remarks
                        )}
                      >
                        {getStatusLabel(
                          record.status
                        )}
                      </span>

                      {getRemarkLabel(
                        record.remarks
                      ) && (
                        <span
                          style={{
                            fontSize: 10,
                            color: "#64748b",
                            lineHeight: 1.3,
                          }}
                        >
                          {getRemarkLabel(
                            record.remarks
                          )}
                        </span>
                      )}
                    </div>
                  </td>

                  <td className="am-td">
                    <div className="am-location-cell">
                      <div className="am-location-row">
                        <span className="am-location-text">
                          {record.checkInAddress
                            ? `In · ${record.checkInAddress}`
                            : "In · —"}
                        </span>

                        {isCEOViewer &&
                          record.checkInLat != null &&
                          record.checkInLng != null && (
                            <a
                              href={mapLink(
                                record.checkInLat,
                                record.checkInLng
                              )}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="am-map-icon"
                              title="View check-in location"
                            >
                              <svg
                                width="13"
                                height="13"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                              >
                                <path d="M21 10c0 6-9 12-9 12s-9-6-9-12a9 9 0 0 1 18 0Z" />
                                <circle cx="12" cy="10" r="3" />
                              </svg>
                            </a>
                          )}
                      </div>

                      <div className="am-location-row">
                        <span className="am-location-text">
                          {record.checkOutAddress
                            ? `Out · ${record.checkOutAddress}`
                            : "Out · —"}
                        </span>

                        {isCEOViewer &&
                          record.checkOutLat != null &&
                          record.checkOutLng != null && (
                            <a
                              href={mapLink(
                                record.checkOutLat,
                                record.checkOutLng
                              )}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="am-map-icon"
                              title="View check-out location"
                            >
                              <svg
                                width="13"
                                height="13"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                              >
                                <path d="M21 10c0 6-9 12-9 12s-9-6-9-12a9 9 0 0 1 18 0Z" />
                                <circle cx="12" cy="10" r="3" />
                              </svg>
                            </a>
                          )}
                      </div>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={10}
                  className="am-empty-cell"
                >
                  <div className="am-empty-inner">
                    <svg
                      width="38"
                      height="38"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.2"
                    >
                      <circle
                        cx="12"
                        cy="12"
                        r="10"
                      />
                      <line
                        x1="8"
                        y1="12"
                        x2="16"
                        y2="12"
                      />
                    </svg>

                    <p>{emptyStateMessage}</p>

                    {hasActiveFilters && (
                      <button
                        className="am-search-btn"
                        style={{ marginTop: 8 }}
                        onClick={clearFilters}
                      >
                        Clear Filters
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="am-pagination">
          <button
            onClick={() =>
              setCurrentPage((page) =>
                Math.max(1, page - 1)
              )
            }
            disabled={currentPage === 1}
            className="am-page-btn"
          >
            ‹
          </button>

          {Array.from(
            { length: totalPages },
            (_, index) => index + 1
          ).map((page) => (
            <button
              key={page}
              onClick={() => setCurrentPage(page)}
              className={`am-page-btn ${
                page === currentPage
                  ? "active"
                  : ""
              }`}
            >
              {page}
            </button>
          ))}

          <button
            onClick={() =>
              setCurrentPage((page) =>
                Math.min(totalPages, page + 1)
              )
            }
            disabled={currentPage === totalPages}
            className="am-page-btn"
          >
            ›
          </button>
        </div>
      )}
    </div>
  );
}

export default AttendanceManagement;