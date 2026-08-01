import React, { useEffect, useState } from "react";
import AdminLayout from "./components/AdminLayout";
import { message } from "antd";
import axios from "axios";
import "./AdminUsers.css";

const AdminStaffAttendance = () => {
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().substring(0, 10)
  );
  const [report, setReport] = useState([]);
  const [timeEntries, setTimeEntries] = useState({});

  const getDailyAttendance = async () => {
    try {
      const res = await axios.post("/api/staff/get-daily-attendance", {
        date: selectedDate,
      });
      if (res.data.success) {
        setReport(res.data.data);
        // Pre-populate time entries from existing attendance
        const entries = {};
        res.data.data.forEach((item) => {
          entries[item.staff._id] = {
            inTime: item.attendance?.inTime || "",
            outTime: item.attendance?.outTime || "",
          };
        });
        setTimeEntries(entries);
      }
    } catch (error) {
      console.log(error);
    }
  };

  const handleTimeChange = (staffId, field, value) => {
    setTimeEntries((prev) => ({
      ...prev,
      [staffId]: {
        ...prev[staffId],
        [field]: value,
      },
    }));
  };

  const handleSaveAttendance = async (staffId) => {
    const entry = timeEntries[staffId];
    if (!entry?.inTime && !entry?.outTime) {
      return message.warning("Please enter at least in-time or out-time");
    }
    try {
      const res = await axios.post("/api/staff/mark-attendance", {
        staffId,
        date: selectedDate,
        inTime: entry?.inTime || "",
        outTime: entry?.outTime || "",
      });
      if (res.data.success) {
        message.success(res.data.message);
        getDailyAttendance();
      } else {
        message.error(res.data.message);
      }
    } catch (error) {
      console.log(error);
    }
  };

  const handleSaveAll = async () => {
    try {
      let count = 0;
      for (const item of report) {
        const staffId = item.staff._id;
        const entry = timeEntries[staffId];
        if (entry?.inTime || entry?.outTime) {
          await axios.post("/api/staff/mark-attendance", {
            staffId,
            date: selectedDate,
            inTime: entry?.inTime || "",
            outTime: entry?.outTime || "",
          });
          count++;
        }
      }
      message.success(`Saved attendance for ${count} staff members`);
      getDailyAttendance();
    } catch (error) {
      console.log(error);
      message.error("Failed to save attendance");
    }
  };

  useEffect(() => {
    getDailyAttendance();
  }, [selectedDate]);

  return (
    <AdminLayout>
      <div className="admin-users-container">
        <div className="page-title">
          <h3 className="m-0">Daily Staff Attendance</h3>
          <button className="b-btn" onClick={handleSaveAll}>
            Save All
          </button>
        </div>
        <hr />
        <div className="tools">
          <div className="form-fields">
            <label>Select Date</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="form-control"
            />
          </div>
        </div>
        <div className="table-containerr">
          <table className="table user-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>In Time</th>
                <th>Out Time</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {report?.map((item, index) => {
                const staffId = item.staff._id;
                return (
                  <tr
                    key={index}
                    style={{
                      backgroundColor: item.attendance?.inTime
                        ? "#d4edda"
                        : "transparent",
                    }}
                  >
                    <td>
                      <small>
                        <strong>{item.staff.name}</strong>
                      </small>
                    </td>
                    <td>
                      <input
                        type="time"
                        value={timeEntries[staffId]?.inTime || ""}
                        onChange={(e) =>
                          handleTimeChange(staffId, "inTime", e.target.value)
                        }
                        style={{ border: "1px solid #ccc", padding: "4px 8px", borderRadius: "4px" }}
                      />
                    </td>
                    <td>
                      <input
                        type="time"
                        value={timeEntries[staffId]?.outTime || ""}
                        onChange={(e) =>
                          handleTimeChange(staffId, "outTime", e.target.value)
                        }
                        style={{ border: "1px solid #ccc", padding: "4px 8px", borderRadius: "4px" }}
                      />
                    </td>
                    <td>
                      <button
                        className="b-btn py-1"
                        style={{ fontSize: "12px" }}
                        onClick={() => handleSaveAttendance(staffId)}
                      >
                        Save
                      </button>
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

export default AdminStaffAttendance;
