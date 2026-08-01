import React from "react";
import GroupIcon from "@mui/icons-material/Group";
import ReceiptIcon from "@mui/icons-material/Receipt";
import InventoryIcon from "@mui/icons-material/Inventory";
import DashboardIcon from "@mui/icons-material/Dashboard";
import HistoryIcon from "@mui/icons-material/History";
import { Link, useLocation } from "react-router-dom";
import "./AdminSidebar.css";

const AdminSidebar = () => {
  const location = useLocation();

  const isActive = (path) => {
    const currentPath = location.pathname;
    if (currentPath === path) return true;
    if (
      path === "/admin-products" &&
      (currentPath.startsWith("/admin-add-product") ||
        currentPath.startsWith("/admin-edit-product"))
    )
      return true;
    if (
      path === "/admin-quotation" &&
      (currentPath.startsWith("/admin-add-quotation") ||
        currentPath.startsWith("/admin-edit-quotation") ||
        currentPath.startsWith("/admin-print-quotation"))
    )
      return true;
    if (
      path === "/admin-estimate" &&
      (currentPath.startsWith("/admin-add-estimate") ||
        currentPath.startsWith("/admin-edit-estimate") ||
        currentPath.startsWith("/admin-print-estimate"))
    )
      return true;
    if (
      path === "/admin-invoice" &&
      (currentPath.startsWith("/admin-add-invoice") ||
        currentPath.startsWith("/admin-edit-invoice") ||
        currentPath.startsWith("/admin-print-invoice"))
    )
      return true;
    if (
      path === "/admin-users" &&
      currentPath.startsWith("/admin-edit-user")
    )
      return true;
    return false;
  };

  return (
    <div className="admin-sidebar-container">
      <span className="text-white">
        <small>MAIN</small>
      </span>
      <ul>
        <li
          className={`${isActive("/admin-dashboard") ? "active" : ""}`}
        >
          <Link to="/admin-dashboard">
            <DashboardIcon className="me-2" />
            Dashboard
          </Link>
        </li>
      </ul>
      <span className="text-white">
        <small>LISTS</small>
      </span>
      <ul>
        <li
          className={`${isActive("/admin-products") ? "active" : ""}`}
        >
          <Link to="/admin-products">
            <InventoryIcon className="me-2" />
            Products
          </Link>
        </li>
        <li
          className={`${isActive("/admin-quotation") ? "active" : ""}`}
        >
          <Link to="/admin-quotation">
            <ReceiptIcon className="me-2" />
            Quotation
          </Link>
        </li>
        <li
          className={`${isActive("/admin-estimate") ? "active" : ""}`}
        >
          <Link to="/admin-estimate">
            <ReceiptIcon className="me-2" />
            Estimate
          </Link>
        </li>
        <li className={`${isActive("/admin-invoice") ? "active" : ""}`}>
          <Link to="/admin-invoice">
            <ReceiptIcon className="me-2" />
            GST Bill
          </Link>
        </li>
        <li className={`${isActive("/admin-users") ? "active" : ""}`}>
          <Link to="/admin-users">
            <GroupIcon className="me-2" />
            Customers
          </Link>
        </li>
      </ul>
    </div>
  );
};

export default AdminSidebar;
