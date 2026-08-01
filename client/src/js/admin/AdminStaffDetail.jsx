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
              <div>
                <strong>Aadhar:</strong> {staff.aadharNo}
              </div>
              <div>
                <strong>Bank:</strong> {staff.bankName}
              </div>
              <div>
                <strong>Account:</strong> {staff.accountNo}
              </div>
              <div>
                <strong>IFSC:</strong> {staff.ifscCode}
              </div>
              <div>
                <strong>UPI:</strong> {staff.upiId}
              </div>
              <div>
                <strong>Address:</strong> {staff.address}
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="d-flex gap-2 mb-3">
          <button
            className={`b-btn py-2 ${activeTab !== "attendance" ? "bb-btn" : ""}`}
            onClick={() => setActiveTab("attendance")}
          >
            Attendance
          </button>
          <button
            className={`b-btn py-2 ${activeTab !== "loans" ? "bb-btn" : ""}`}
            onClick={() => setActiveTab("loans")}
          >
            Loans / Finance
          </button>
        </div>

        {/* Attendance Tab */}
        {activeTab === "attendance" && (
          <div>
            {/* Mark Attendance Form */}
            <div
              style={{
                background: "#f8f9fa",
                padding: "15px",
                borderRadius: "8px",
                marginBottom: "20px",
              }}
            >
              <h6>Mark Attendance</h6>
              <div className="d-flex flex-wrap gap-3 align-items-end">
                <div className="form-fields">
                  <label>Date</label>
                  <input
                    type="date"
                    value={attDate}
                    onChange={(e) => setAttDate(e.target.value)}
                    className="form-control"
                  />
                </div>
                <div className="form-fields">
                  <label>In Time</label>
                  <input
                    type="time"
                    value={inTime}
                    onChange={(e) => setInTime(e.target.value)}
                    className="form-control"
                  />
                </div>
                <div className="form-fields">
                  <label>Out Time</label>
                  <input
                    type="time"
                    value={outTime}
                    onChange={(e) => setOutTime(e.target.value)}
                    className="form-control"
                  />
                </div>
                <button className="b-btn py-2" onClick={handleMarkAttendance}>
                  Save
                </button>
              </div>
            </div>

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
                </tr>
              </thead>
              <tbody>
                {monthDays.map((day, index) => {
                  const record = attendance.find((a) => a.date === day);
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
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Loans Tab */}
        {activeTab === "loans" && (
          <div>
            {/* Add Loan Form */}
            <div
              style={{
                background: "#f8f9fa",
                padding: "15px",
                borderRadius: "8px",
                marginBottom: "20px",
              }}
            >
              <h6>Add Loan / Finance Entry</h6>
              <div className="d-flex flex-wrap gap-3 align-items-end">
                <div className="form-fields">
                  <label>Amount</label>
                  <input
                    type="number"
                    value={loanAmount}
                    onChange={(e) => setLoanAmount(e.target.value)}
                    className="form-control"
                    placeholder="Enter amount"
                  />
                </div>
                <div className="form-fields">
                  <label>Date</label>
                  <input
                    type="date"
                    value={loanDate}
                    onChange={(e) => setLoanDate(e.target.value)}
                    className="form-control"
                  />
                </div>
                <div className="form-fields">
                  <label>Remark / Reason</label>
                  <input
                    type="text"
                    value={loanRemark}
                    onChange={(e) => setLoanRemark(e.target.value)}
                    className="form-control"
                    placeholder="Enter remark"
                  />
                </div>
                <button className="b-btn py-2" onClick={handleAddLoan}>
                  Add
                </button>
              </div>
            </div>

            {/* Summary */}
            <div className="mb-3">
              <strong>Total Loan Amount: ₹{totalLoan.toLocaleString()}</strong>
            </div>

            {/* Loans Table */}
            <table className="table user-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Amount</th>
                  <th>Remark</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {loans?.map((loan, index) => (
                  <tr key={index}>
                    <td>
                      <small>
                        {new Date(loan.date).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })}
                      </small>
                    </td>
                    <td>
                      <small>₹{loan.amount?.toLocaleString()}</small>
                    </td>
                    <td>
                      <small>{loan.remark || "-"}</small>
                    </td>
                    <td>
                      <DeleteIcon
                        style={{ cursor: "pointer" }}
                        onClick={() => handleDeleteLoan(loan._id)}
                        className="text-danger"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminStaffDetail;
