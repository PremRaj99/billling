import React, { useEffect, useState } from "react";
import AdminLayout from "./components/AdminLayout";
import { message, Modal } from "antd";
import axios from "axios";
import "./AdminUsers.css";

const AdminStaffAttendance = () => {
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().substring(0, 10)
  );
  const [report, setReport] = useState([]);
  const [timeEntries, setTimeEntries] = useState({});
  const [selectedStaffIds, setSelectedStaffIds] = useState([]);

  // Loan/Finance Modal State
  const [isLoanModalOpen, setIsLoanModalOpen] = useState(false);
  const [loanStaff, setLoanStaff] = useState(null);
  const [loanAmount, setLoanAmount] = useState("");
  const [loanRemark, setLoanRemark] = useState("");
  const [loanDate, setLoanDate] = useState(
    new Date().toISOString().substring(0, 10)
  );

  const getDailyAttendance = async () => {
    try {
      const res = await axios.post("/api/staff/get-daily-attendance", {
        date: selectedDate,
      });
      if (res.data.success) {
        setReport(res.data.data);
        // Pre-populate time entries from existing attendance or default 10:30 AM / 08:30 PM
        const entries = {};
        const staffIds = [];
        res.data.data.forEach((item) => {
          const id = item.staff._id;
          staffIds.push(id);
          entries[id] = {
            inTime: item.attendance?.inTime || "10:30",
            outTime: item.attendance?.outTime || "20:30",
          };
        });
        setTimeEntries(entries);
        setSelectedStaffIds(staffIds);
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

  const toggleSelectStaff = (staffId) => {
    setSelectedStaffIds((prev) =>
      prev.includes(staffId)
        ? prev.filter((id) => id !== staffId)
        : [...prev, staffId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedStaffIds.length === report.length) {
      setSelectedStaffIds([]);
    } else {
      setSelectedStaffIds(report.map((item) => item.staff._id));
    }
  };

  const handleSaveAttendance = async (staffId) => {
    const entry = timeEntries[staffId];
    const inTime = entry?.inTime || "10:30";
    const outTime = entry?.outTime || "20:30";
    try {
      const res = await axios.post("/api/staff/mark-attendance", {
        staffId,
        date: selectedDate,
        inTime,
        outTime,
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
    if (selectedStaffIds.length === 0) {
      return message.warning("Please select at least one staff member to mark present");
    }
    try {
      let count = 0;
      for (const item of report) {
        const staffId = item.staff._id;
        if (!selectedStaffIds.includes(staffId)) continue;
        const entry = timeEntries[staffId];
        const inTime = entry?.inTime || "10:30";
        const outTime = entry?.outTime || "20:30";
        await axios.post("/api/staff/mark-attendance", {
          staffId,
          date: selectedDate,
          inTime,
          outTime,
        });
        count++;
      }
      message.success(`Marked attendance for ${count} staff member(s)`);
      getDailyAttendance();
    } catch (error) {
      console.log(error);
      message.error("Failed to mark attendance");
    }
  };

  const handleOpenLoanModal = (staff) => {
    setLoanStaff(staff);
    setLoanAmount("");
    setLoanRemark("");
    setLoanDate(selectedDate || new Date().toISOString().substring(0, 10));
    setIsLoanModalOpen(true);
  };

  const handleAddLoanSubmit = async (e) => {
    e.preventDefault();
    if (!loanAmount || parseFloat(loanAmount) <= 0) {
      return message.error("Please enter a valid amount");
    }
    if (!loanStaff?._id) {
      return message.error("No staff member selected");
    }
    try {
      const res = await axios.post("/api/staff/add-loan", {
        staffId: loanStaff._id,
        amount: parseFloat(loanAmount),
        date: loanDate,
        remark: loanRemark,
      });
      if (res.data.success) {
        message.success(res.data.message || "Loan Entry Added Successfully");
        setIsLoanModalOpen(false);
        setLoanAmount("");
        setLoanRemark("");
      } else {
        message.error(res.data.message || "Failed to add loan entry");
      }
    } catch (error) {
      console.log(error);
      message.error("Error adding loan entry");
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
            Mark All Present ({selectedStaffIds.length})
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
                <th style={{ width: "40px", textAlign: "center" }}>
                  <input
                    type="checkbox"
                    checked={
                      report.length > 0 &&
                      selectedStaffIds.length === report.length
                    }
                    onChange={toggleSelectAll}
                  />
                </th>
                <th>Name</th>
                <th>In Time</th>
                <th>Out Time</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {report?.map((item, index) => {
                const staffId = item.staff._id;
                const isSelected = selectedStaffIds.includes(staffId);
                return (
                  <tr
                    key={index}
                    style={{
                      backgroundColor: item.attendance?.inTime
                        ? "#d4edda"
                        : "transparent",
                    }}
                  >
                    <td style={{ textAlign: "center" }}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectStaff(staffId)}
                      />
                    </td>
                    <td>
                      <small>
                        <strong>{item.staff.name}</strong>
                      </small>
                    </td>
                    <td>
                      <input
                        type="time"
                        value={timeEntries[staffId]?.inTime || "10:30"}
                        onChange={(e) =>
                          handleTimeChange(staffId, "inTime", e.target.value)
                        }
                        style={{ border: "1px solid #ccc", padding: "4px 8px", borderRadius: "4px" }}
                      />
                    </td>
                    <td>
                      <input
                        type="time"
                        value={timeEntries[staffId]?.outTime || "20:30"}
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
                        Present
                      </button>
                      <button
                        className="b-btn py-1 ms-2"
                        style={{ fontSize: "12px", backgroundColor: "#0d6efd" }}
                        onClick={() => handleOpenLoanModal(item.staff)}
                      >
                        Add Loan / Finance
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        title={`Add Loan / Finance Entry ${loanStaff ? `- ${loanStaff.name}` : ""}`}
        open={isLoanModalOpen}
        onCancel={() => setIsLoanModalOpen(false)}
        footer={null}
      >
        <form onSubmit={handleAddLoanSubmit}>
          <div className="mb-3">
            <label className="form-label">Date</label>
            <input
              type="date"
              className="form-control"
              value={loanDate}
              onChange={(e) => setLoanDate(e.target.value)}
              required
            />
          </div>
          <div className="mb-3">
            <label className="form-label">Amount (₹)</label>
            <input
              type="number"
              className="form-control"
              placeholder="Enter Amount"
              value={loanAmount}
              onChange={(e) => setLoanAmount(e.target.value)}
              required
            />
          </div>
          <div className="mb-3">
            <label className="form-label">Remark / Reason</label>
            <textarea
              className="form-control"
              placeholder="Enter Remark / Reason"
              value={loanRemark}
              onChange={(e) => setLoanRemark(e.target.value)}
              rows={3}
            />
          </div>
          <div className="d-flex justify-content-end gap-2">
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setIsLoanModalOpen(false)}
            >
              Cancel
            </button>
            <button type="submit" className="b-btn">
              Add Entry
            </button>
          </div>
        </form>
      </Modal>
    </AdminLayout>
  );
};

export default AdminStaffAttendance;
