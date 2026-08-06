import "../css/App.css";
import 'bootstrap/dist/css/bootstrap.min.css';
import { BrowserRouter, Route, Routes } from "react-router-dom";
import Login from "./pages/Login";
import ForgotPass from "./pages/ForgotPass";
import ProtectedRoute from "./components/ProtectedRoute";
import PublicRoute from "./components/PublicRoute";
import AdminDashboard from "./admin/AdminDashboard";
import AdminUsers from "./admin/AdminUsers";
import EditUser from "./admin/EditUser";
// import AdminLogin from "./admin/AdminLogin";
import AdminProduct from "./admin/AdminProduct";
import AdminAddProduct from "./admin/AdminAddProduct";
import AdminEditProduct from "./admin/AdminEditProduct";
import AdminInvoice from "./admin/AdminInvoice";
import AdminAddInvoice from "./admin/AdminAddInvoice";
import AdminEditInvoice from "./admin/AdminEditInvoice";
import AdminPrintInvoice from "./admin/AdminPrintInvoice";
import AdminPrintAllInvoices from "./admin/AdminPrintAllInvoices";
import AdminEstimate from "./admin/AdminEstimate";
import AdminAddEstimate from "./admin/AdminAddEstimate";
import AdminEditEstimate from "./admin/AdminEditEstimate";
import AdminPrintEstimate from "./admin/AdminPrintEstimate";
import AdminPrintAllEstimates from "./admin/AdminPrintAllEstimates";
// import AdminEstimateHistory from "./admin/AdminEstimateHistory";
import AdminQuotation from "./admin/AdminQuotation";
import AdminAddQuotation from "./admin/AdminAddQuotation";
import AdminEditQuotation from "./admin/AdminEditQuotation";
import AdminPrintQuotation from "./admin/AdminPrintQuotation";
import AdminPrintAllQuotations from "./admin/AdminPrintAllQuotations";
import AdminStaff from "./admin/AdminStaff";
import AdminAddStaff from "./admin/AdminAddStaff";
import AdminEditStaff from "./admin/AdminEditStaff";
import AdminStaffDetail from "./admin/AdminStaffDetail";
import AdminStaffAttendance from "./admin/AdminStaffAttendance";
import AdminStaffMonthlyReport from "./admin/AdminStaffMonthlyReport";


function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* PAGES */}
        <Route path="/" element={<Login />} />
        <Route
          path="/forgot-password"
          element={
            <PublicRoute>
              <ForgotPass />
            </PublicRoute>
          }
        />
        <Route
          path="/login"
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          }
        />
        <Route
          path="/admin-dashboard"
          element={
            <ProtectedRoute>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin-products"
          element={
            <ProtectedRoute>
              <AdminProduct />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin-add-product"
          element={
            <ProtectedRoute>
              <AdminAddProduct />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin-edit-product/:id?"
          element={
            <ProtectedRoute>
              <AdminEditProduct />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin-invoice"
          element={
            <ProtectedRoute>
              <AdminInvoice />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin-add-invoice"
          element={
            <ProtectedRoute>
              <AdminAddInvoice />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin-edit-invoice/:invoiceId?"
          element={
            <ProtectedRoute>
              <AdminEditInvoice />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin-print-invoice/:invoiceId?"
          element={
            <ProtectedRoute>
              <AdminPrintInvoice />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin-print-all-invoices"
          element={
            <ProtectedRoute>
              <AdminPrintAllInvoices />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin-estimate"
          element={
            <ProtectedRoute>
              <AdminEstimate />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin-add-estimate"
          element={
            <ProtectedRoute>
              <AdminAddEstimate />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin-edit-estimate/:estimateId?"
          element={
            <ProtectedRoute>
              <AdminEditEstimate />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin-print-estimate/:estimateId?"
          element={
            <ProtectedRoute>
              <AdminPrintEstimate />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin-print-all-estimates"
          element={
            <ProtectedRoute>
              <AdminPrintAllEstimates />
            </ProtectedRoute>
          }
        />
        {/* <Route
          path="/admin-estimate-history"
          element={
            <ProtectedRoute>
              <AdminEstimateHistory />
            </ProtectedRoute>
          }
        /> */}
        <Route
          path="/admin-quotation"
          element={
            <ProtectedRoute>
              <AdminQuotation />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin-add-quotation"
          element={
            <ProtectedRoute>
              <AdminAddQuotation />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin-edit-quotation/:quotationId?"
          element={
            <ProtectedRoute>
              <AdminEditQuotation />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin-print-quotation/:quotationId?"
          element={
            <ProtectedRoute>
              <AdminPrintQuotation />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin-print-all-quotations"
          element={
            <ProtectedRoute>
              <AdminPrintAllQuotations />
            </ProtectedRoute>
          }
        />
        {/* STAFF */}
        <Route
          path="/admin-staff"
          element={
            <ProtectedRoute>
              <AdminStaff />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin-add-staff"
          element={
            <ProtectedRoute>
              <AdminAddStaff />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin-edit-staff/:id?"
          element={
            <ProtectedRoute>
              <AdminEditStaff />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin-staff-detail/:id?"
          element={
            <ProtectedRoute>
              <AdminStaffDetail />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin-staff-attendance"
          element={
            <ProtectedRoute>
              <AdminStaffAttendance />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin-staff-monthly-report"
          element={
            <ProtectedRoute>
              <AdminStaffMonthlyReport />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin-users"
          element={
            <ProtectedRoute>
              <AdminUsers />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin-edit-user/:id?"
          element={
            <ProtectedRoute>
              <EditUser />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
