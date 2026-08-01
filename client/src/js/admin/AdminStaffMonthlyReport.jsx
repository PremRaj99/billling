import React, { useEffect, useState } from "react";
import AdminLayout from "./components/AdminLayout";
import { message } from "antd";
import axios from "axios";
import "./AdminUsers.css";

const AdminStaffMonthlyReport = () => {
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [report, setReport] = useState([]);
  const [showOnlyTable, setShowOnlyTable] = useState(false);

  const getMonthlyReport = async () => {
    try {
      const res = await axios.post("/api/staff/get-monthly-report", {
        month: selectedMonth,
        year: selectedYear,
      });
      if (res.data.success) {
        setReport(res.data.data);
      }
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    getMonthlyReport();
  }, [selectedMonth, selectedYear]);

  const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const monthName = new Date(selectedYear, selectedMonth).toLocaleString(
    "default",
    { month: "long" }
  );

  return (
    <AdminLayout showOnlyTable={showOnlyTable}>
      <div className="admin-users-container">
        {!showOnlyTable && (
          <>
            <div className="page-title">
              <h3 className="m-0">Monthly Attendance Report</h3>
              <button
                className="b-btn"
                onClick={() => {
                  setShowOnlyTable(true);
                  const originalTitle = document.title;
                  setTimeout(() => {
                    document.title = `Staff Attendance - ${monthName} ${selectedYear}`;
                    window.print();
                    document.title = originalTitle;
                    setShowOnlyTable(false);
                  }, 0);
                }}
              >
                Print
              </button>
            </div>
            <hr />
            <div className="tools">
              <div className="form-fields">
                <select
                  value={selectedMonth}
                  onChange={(e) =>
                    setSelectedMonth(parseInt(e.target.value))
                  }
                  className="form-control"
                >
                  {Array.from({ length: 12 }).map((_, i) => (
                    <option key={i} value={i}>
                      {new Date(null, i).toLocaleString("default", {
                        month: "long",
                      })}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-fields">
                <input
                  type="number"
                  value={selectedYear}
                  onChange={(e) =>
                    setSelectedYear(parseInt(e.target.value))
                  }
                  className="form-control"
                  style={{ maxWidth: "100px" }}
                />
              </div>
            </div>
          </>
        )}

        {showOnlyTable && (
          <div className="text-center mb-3">
            <h4>
              Staff Attendance Report — {monthName} {selectedYear}
            </h4>
          </div>
        )}

        <div style={{ overflowX: "auto" }}>
          <table
            className="table table-bordered"
            style={{ fontSize: "11px", whiteSpace: "nowrap" }}
          >
            <thead>
              <tr>
                <th
                  style={{
                    position: "sticky",
                    left: 0,
                    background: "#fff",
                    zIndex: 1,
                  }}
                >
                  Staff Name
                </th>
                {days.map((d) => {
                  const dateStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
                  const isSunday = new Date(dateStr).getDay() === 0;
                  return (
                    <th
                      key={d}
                      style={{
                        textAlign: "center",
                        backgroundColor: isSunday ? "#fff3cd" : "#f8f9fa",
                        minWidth: "32px",
                      }}
                    >
                      {d}
                    </th>
                  );
                })}
                <th style={{ textAlign: "center", background: "#d4edda" }}>
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {report?.map((item, index) => {
                let presentCount = 0;
                return (
                  <tr key={index}>
                    <td
                      style={{
                        position: "sticky",
                        left: 0,
                        background: "#fff",
                        zIndex: 1,
                        fontWeight: "bold",
                      }}
                    >
                      {item.staff.name}
                    </td>
                    {days.map((d) => {
                      const dateStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
                      const record = item.attendance.find(
                        (a) => a.date === dateStr
                      );
                      const isSunday = new Date(dateStr).getDay() === 0;
                      const isPresent = record?.inTime;
                      if (isPresent) presentCount++;
                      return (
                        <td
                          key={d}
                          style={{
                            textAlign: "center",
                            backgroundColor: isSunday
                              ? "#fff3cd"
                              : isPresent
                                ? "#d4edda"
                                : "#f8d7da",
                            fontWeight: "bold",
                            color: isPresent ? "#155724" : "#721c24",
                          }}
                          title={
                            record
                              ? `In: ${record.inTime || "-"} | Out: ${record.outTime || "-"}`
                              : "Absent"
                          }
                        >
                          {isSunday ? "S" : isPresent ? "P" : "A"}
                        </td>
                      );
                    })}
                    <td
                      style={{
                        textAlign: "center",
                        fontWeight: "bold",
                        background: "#d4edda",
                      }}
                    >
                      {presentCount}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminStaffMonthlyReport;
