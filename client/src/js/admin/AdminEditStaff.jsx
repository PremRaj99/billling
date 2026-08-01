import React, { useEffect, useState } from "react";
import AdminLayout from "./components/AdminLayout";
import { message } from "antd";
import axios from "axios";
import { useNavigate, useParams } from "react-router-dom";
import "./AdminUsers.css";

const AdminEditStaff = () => {
  const navigate = useNavigate();
  const { id } = useParams();
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

  async function getStaff() {
    try {
      const res = await axios.post("/api/staff/get-staff-by-id", { id });
      if (res.data.success) {
        setForm(res.data.data);
      } else {
        message.error(res.data.message);
      }
    } catch (error) {
      console.log(error);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name) {
      return message.error("Name is required");
    }
    try {
      const res = await axios.post("/api/staff/update-staff", form);
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

  useEffect(() => {
    getStaff();
  }, []);

  return (
    <AdminLayout>
      <div className="admin-users-container">
        <div className="page-title">
          <h3 className="m-0">Edit Staff</h3>
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
            />
          </div>
          <button onClick={handleSubmit} className="py-3 register-btn">
            Update Staff
          </button>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminEditStaff;
