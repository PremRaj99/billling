import React, { useEffect, useState } from "react";
import AdminLayout from "./components/AdminLayout";
import { message } from "antd";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import PrintIcon from "@mui/icons-material/Print";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./AdminUsers.css";
import { useScrollRestore } from "../hooks/useScrollRestore";

const AdminStaff = () => {
  const navigate = useNavigate();
  const [staff, setStaff] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredStaff, setFilteredStaff] = useState(null);

  useScrollRestore(Boolean(staff && staff.length > 0));

  const handleSearch = () => {
    if (searchQuery.trim() === "") {
      setFilteredStaff(null);
    } else {
      const filtered = staff?.filter((s) =>
        s?.name?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredStaff(filtered);
    }
  };

  const handleDelete = async (id) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this staff member?"
    );
    if (confirmDelete) {
      try {
        const res = await axios.post("/api/staff/delete-staff", { id });
        if (res.data.success) {
          message.success(res.data.message);
          getAllStaff();
        } else {
          message.error(res.data.message);
        }
      } catch (error) {
        console.error(error);
      }
    }
  };

  const getAllStaff = async () => {
    try {
      const res = await axios.get("/api/staff/get-all-staff");
      if (res.data.success) {
        setStaff(res.data.data);
      } else {
        message.error(res.data.message);
      }
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    handleSearch();
  }, [searchQuery, staff]);

  useEffect(() => {
    getAllStaff();
  }, []);

  const displayStaff = filteredStaff ? filteredStaff : staff;

  return (
    <AdminLayout>
      <div className="admin-users-container">
        <div className="page-title">
          <h3 className="m-0">Staff Members</h3>
          <button
            className="b-btn"
            onClick={() => navigate("/admin-add-staff")}
          >
            Add New
          </button>
        </div>
        <hr />
        <div className="table-containerr">
          <div className="tools">
            <div className="form-fields">
              <input
                className="mb-4 py-2"
                type="search"
                name="search"
                placeholder="Search by name"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          <table className="table user-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Mobile</th>
                <th>Aadhar No</th>
                <th>Bank Name</th>
                <th>UPI ID</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {displayStaff?.map((s, index) => (
                <tr key={index}>
                  <td>
                    <small>{s?.name}</small>
                  </td>
                  <td>
                    <small>{s?.mobile}</small>
                  </td>
                  <td>
                    <small>{s?.aadharNo}</small>
                  </td>
                  <td>
                    <small>{s?.bankName}</small>
                  </td>
                  <td>
                    <small>{s?.upiId}</small>
                  </td>
                  <td>
                    <div className="d-flex gap-2">
                      <PrintIcon
                        style={{ cursor: "pointer" }}
                        onClick={() =>
                          window.open(`/admin-staff-detail/${s?._id}`, "_blank")
                        }
                        className="text-primary"
                      />
                      <EditIcon
                        style={{ cursor: "pointer" }}
                        onClick={() =>
                          navigate(`/admin-edit-staff/${s?._id}`)
                        }
                      />
                      <DeleteIcon
                        style={{ cursor: "pointer" }}
                        onClick={() => handleDelete(s?._id)}
                        className="text-danger"
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminStaff;
