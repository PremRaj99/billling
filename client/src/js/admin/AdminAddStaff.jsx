import React, { useState } from "react";
import AdminLayout from "./components/AdminLayout";
import { message } from "antd";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./AdminUsers.css";

const AdminAddStaff = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    address: "",
    mobile: "",
    aadharNo: "",
    accountNo: "",
    ifscCode: "",
    bankName: "",
    upiId: "",
  });

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name) {
      return message.error("Name is required");
    }
    try {
      const res = await axios.post("/api/staff/add-staff", form);
      if (res.data.success) {
        message.success(res.data.message);
        navigate("/admin-staff");
      } else {
        message.error(res.data.message);
      }
    } catch (error) {
      console.log(error);
    }
  }

  return (
    <AdminLayout>
      <div className="admin-users-container">
        <div className="page-title">
          <h3 className="m-0">Add Staff</h3>
        </div>
        <hr />
        <div style={{ maxWidth: "600px" }}>
          <div className="form-fields mb-3">
            <label>Name *</label>
            <input
              onChange={handleChange}
              value={form.name}
              name="name"
              type="text"
              className="form-control"
              placeholder="Enter name"
            />
          </div>
          <div className="form-fields mb-3">
            <label>Address</label>
            <input
              onChange={handleChange}
              value={form.address}
              name="address"
              type="text"
              className="form-control"
              placeholder="Enter address"
            />
          </div>
          <div className="form-fields mb-3">
            <label>Mobile No</label>
            <input
              onChange={handleChange}
              value={form.mobile}
              name="mobile"
              type="text"
              className="form-control"
              placeholder="Enter mobile number"
            />
          </div>
          <div className="form-fields mb-3">
            <label>Aadhar No</label>
            <input
              onChange={handleChange}
              value={form.aadharNo}
              name="aadharNo"
              type="text"
              className="form-control"
              placeholder="Enter aadhar number"
            />
          </div>
          <div className="form-fields mb-3">
            <label>Account No</label>
            <input
              onChange={handleChange}
              value={form.accountNo}
              name="accountNo"
              type="text"
              className="form-control"
              placeholder="Enter bank account number"
            />
          </div>
          <div className="form-fields mb-3">
            <label>IFSC Code</label>
            <input
              onChange={handleChange}
              value={form.ifscCode}
              name="ifscCode"
              type="text"
              className="form-control"
              placeholder="Enter IFSC code"
            />
          </div>
          <div className="form-fields mb-3">
            <label>Bank Name</label>
            <input
              onChange={handleChange}
              value={form.bankName}
              name="bankName"
              type="text"
              className="form-control"
              placeholder="Enter bank name"
            />
          </div>
          <div className="form-fields mb-3">
            <label>UPI ID</label>
            <input
              onChange={handleChange}
              value={form.upiId}
              name="upiId"
              type="text"
              className="form-control"
              placeholder="Enter UPI ID"
            />
          </div>
          <button onClick={handleSubmit} className="py-3 register-btn">
            Add Staff
          </button>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminAddStaff;
