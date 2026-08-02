import React, { useEffect, useState } from "react";
import AdminLayout from "./components/AdminLayout";
import { message } from "antd";
import DeleteIcon from "@mui/icons-material/Delete";
import axios from "axios";
import { useParams } from "react-router-dom";
import "./AdminUsers.css";

const AdminStaffDetail = () => {
  const { id } = useParams();
  const [staff, setStaff] = useState(null);
  const [activeTab, setActiveTab] = useState("attendance");

  // Attendance state
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [attendance, setAttendance] = useState([]);
  const [attDate, setAttDate] = useState(
    new Date().toISOString().substring(0, 10)
  );
  const [inTime, setInTime] = useState("");
  const [outTime, setOutTime] = useState("");

  // Loan state
  const [loans, setLoans] = useState([]);
  const [loanAmount, setLoanAmount] = useState("");
  const [loanDate, setLoanDate] = useState(
    new Date().toISOString().substring(0, 10)
  );
  const [loanRemark, setLoanRemark] = useState("");

  const getStaff = async () => {
    try {
      const res = await axios.post("/api/staff/get-staff-by-id", { id });
      if (res.data.success) {
        setStaff(res.data.data);
      }
    } catch (error) {
      console.log(error);
    }
  };

  const getAttendance = async () => {
    try {
      const res = await axios.post("/api/staff/get-attendance-by-staff", {
        staffId: id,
        month: selectedMonth,
        year: selectedYear,
      });
      if (res.data.success) {
        setAttendance(res.data.data);
      }
    } catch (error) {
      console.log(error);
    }
  };

  const getLoans = async () => {
    try {
      const res = await axios.post("/api/staff/get-loans-by-staff", {
        staffId: id,
      });
      if (res.data.success) {
        setLoans(res.data.data);
      }
    } catch (error) {
      console.log(error);
    }
  };

  const handleMarkAttendance = async () => {
    if (!attDate) return message.error("Please select a date");
    try {
      const res = await axios.post("/api/staff/mark-attendance", {
        staffId: id,
        date: attDate,
        inTime,
        outTime,
      });
      if (res.data.success) {
        message.success(res.data.message);
        setInTime("");
        setOutTime("");
        getAttendance();
      } else {
        message.error(res.data.message);
      }
    } catch (error) {
      console.log(error);
    }
  };

  const handleAddLoan = async () => {
    if (!loanAmount || !loanDate) {
      return message.error("Amount and Date are required");
    }
    try {
      const res = await axios.post("/api/staff/add-loan", {
        staffId: id,
        amount: parseFloat(loanAmount),
        date: loanDate,
        remark: loanRemark,
      });
      if (res.data.success) {
        message.success(res.data.message);
        setLoanAmount("");
        setLoanRemark("");
        getLoans();
      } else {
        message.error(res.data.message);
      }
    } catch (error) {
      console.log(error);
    }
  };

  const handleDeleteLoan = async (loanId) => {
    const confirm = window.confirm("Delete this loan entry?");
    if (confirm) {
      try {
        const res = await axios.post("/api/staff/delete-loan", { id: loanId });
        if (res.data.success) {
          message.success(res.data.message);
          getLoans();
        } else {
          message.error(res.data.message);
        }
      } catch (error) {
        console.log(error);
      }
    }
  };

  useEffect(() => {
    getStaff();
    getLoans();
  }, []);

  useEffect(() => {
    getAttendance();
  }, [selectedMonth, selectedYear]);

  // Generate days of the selected month
  const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
  const monthDays = Array.from({ length: daysInMonth }, (_, i) => {
    const day = i + 1;
    return `${selectedYear}-${String(selectedMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  });

  const totalLoan = loans.reduce((acc, l) => acc + (l.amount || 0), 0);
  const totalPresent = attendance.filter(
    (a) => a.inTime || a.outTime
  ).length;

  return (
    <AdminLayout>
      <div className="admin-users-container">
        <div className="page-title">
          <h3 className="m-0">Staff Detail</h3>
        </div>
        <hr />

        {/* Staff Info */}
        {staff && (
          <div
            style={{
              background: "#f8f9fa",
              padding: "15px",
              borderRadius: "8px",
              marginBottom: "20px",
            }}
          >
            <div className="d-flex flex-wrap gap-4">
              <div>
                <strong>Name:</strong> {staff.name}
              </div>
              <div>
                <strong>Mobile:</strong> {staff.mobile}
              </div>
            </div>
          </div>
        )}

        <div>

          {/* Month/Year Filter */}
          <div className="d-flex gap-3 mb-3 align-items-center">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
              className="form-control"
              style={{ maxWidth: "150px" }}
            >
              {Array.from({ length: 12 }).map((_, i) => (
                <option key={i} value={i}>
                  {new Date(null, i).toLocaleString("default", {
                    month: "long",
                  })}
                </option>
              ))}
            </select>
            <input
              type="number"
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="form-control"
              style={{ maxWidth: "100px" }}
            />
            <small>
              <strong>Present Days: {totalPresent}</strong> /{" "}
              {daysInMonth}
            </small>
          </div>

          {/* Attendance Table */}
          <table className="table user-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Day</th>
                <th>In Time</th>
                <th>Out Time</th>
                <th>Payment Amount</th>
                <th>Remark</th>
              </tr>
            </thead>
            <tbody>
              {monthDays.map((day, index) => {
                const record = attendance.find((a) => a.date === day);
                const dayLoans = loans.filter((l) => l.date === day);
                const loanAmountStr =
                  dayLoans.length > 0
                    ? dayLoans.map((l) => `₹${l.amount}`).join(", ")
                    : "-";
                const loanRemarkStr =
                  dayLoans.length > 0
                    ? dayLoans.map((l) => l.remark).filter(Boolean).join(", ") || "-"
                    : "-";

                const dayName = new Date(day).toLocaleString("default", {
                  weekday: "short",
                });
                const isFriday = new Date(day).getDay() === 5;
                return (
                  <tr
                    key={index}
                    style={{
                      backgroundColor: isFriday
                        ? "#fff3cd"
                        : record?.inTime
                          ? "#d4edda"
                          : "transparent",
                    }}
                  >
                    <td>
                      <small>{day}</small>
                    </td>
                    <td>
                      <small>{dayName}</small>
                    </td>
                    <td>
                      <small>{record?.inTime || "-"}</small>
                    </td>
                    <td>
                      <small>{record?.outTime || "-"}</small>
                    </td>
                    <td>
                      <small>{loanAmountStr}</small>
                    </td>
                    <td>
                      <small>{loanRemarkStr}</small>
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

export default AdminStaffDetail;
