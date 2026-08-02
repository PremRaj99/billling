import React, { useEffect, useState } from "react";
import axios from "axios";
import { useParams, useNavigate } from "react-router-dom";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { message } from "antd";
import "./AdminUsers.css";

const getImageDetails = async (url) => {
  try {
    const res = await fetch(url);
    if (!res.ok) return { dataUrl: url, width: 100, height: 50 };
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result;
        const img = new Image();
        img.onload = () => {
          resolve({
            dataUrl,
            width: img.naturalWidth || img.width || 100,
            height: img.naturalHeight || img.height || 50,
          });
        };
        img.onerror = () => resolve({ dataUrl, width: 100, height: 50 });
        img.src = dataUrl;
      };
      reader.onerror = () => resolve({ dataUrl: url, width: 100, height: 50 });
      reader.readAsDataURL(blob);
    });
  } catch (e) {
    return { dataUrl: url, width: 100, height: 50 };
  }
};

const AdminStaffDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [staff, setStaff] = useState(null);

  // Month & Year state
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [attendance, setAttendance] = useState([]);
  const [loans, setLoans] = useState([]);
  const [pdfUrl, setPdfUrl] = useState(null);

  const topImageUrl = "/estt.jpg";
  const bottomImageUrl = "/add.jpg";

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

  useEffect(() => {
    getStaff();
    getLoans();
  }, [id]);

  useEffect(() => {
    getAttendance();
  }, [id, selectedMonth, selectedYear]);

  const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
  const monthDays = Array.from({ length: daysInMonth }, (_, i) => {
    const day = i + 1;
    return `${selectedYear}-${String(selectedMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  });

  const monthName = new Date(selectedYear, selectedMonth).toLocaleString(
    "default",
    { month: "long" }
  );

  useEffect(() => {
    if (staff) {
      generatePdf();
    }
  }, [staff, attendance, loans, selectedMonth, selectedYear]);

  const generatePdf = async () => {
    try {
      const doc = new jsPDF("p", "mm", "a4");
      const pageHeight = doc.internal.pageSize.height;

      let currentY = 8;

      // Header Image
      const topImg = await getImageDetails(topImageUrl);
      const bottomImg = await getImageDetails(bottomImageUrl);

      try {
        doc.addImage(topImg.dataUrl, "JPEG", 8, currentY, 195, 60);
      } catch (e) {
        console.error("Failed to add top header image:", e);
      }
      currentY += 68;

      // Document Title & Details
      doc.setFontSize(13);
      doc.setFont("helvetica", "bold");
      doc.text("STAFF ATTENDANCE & PAYMENT REPORT", 14, currentY);
      currentY += 8;

      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text(`Staff Name:   ${staff?.name || ""}`, 14, currentY);
      doc.text(`Month & Year: ${monthName} ${selectedYear}`, 130, currentY);
      currentY += 6;

      doc.setFont("helvetica", "normal");
      doc.text(`Mobile:         ${staff?.mobile || "-"}`, 14, currentY);
      const totalPresent = attendance.filter(
        (a) => a.inTime || a.outTime
      ).length;
      doc.text(`Present Days: ${totalPresent} / ${daysInMonth}`, 130, currentY);
      currentY += 8;

      // Table Columns
      const tableColumns = [
        { title: "Date", dataKey: "date" },
        { title: "Day", dataKey: "day" },
        { title: "In Time", dataKey: "inTime" },
        { title: "Out Time", dataKey: "outTime" },
        { title: "Payment Amount", dataKey: "paymentAmount" },
        { title: "Remark", dataKey: "remark" },
      ];

      const tableRows = monthDays.map((day) => {
        const record = attendance.find((a) => a.date === day);
        const dayLoans = loans.filter((l) => l.date === day);
        const loanAmountStr =
          dayLoans.length > 0
            ? dayLoans.map((l) => `${l.amount}`).join(", ")
            : "-";
        const loanRemarkStr =
          dayLoans.length > 0
            ? dayLoans.map((l) => l.remark).filter(Boolean).join(", ") || "-"
            : "-";
        const dayName = new Date(day).toLocaleString("default", {
          weekday: "short",
        });

        return {
          date: day,
          day: dayName,
          inTime: record?.inTime || "-",
          outTime: record?.outTime || "-",
          paymentAmount: loanAmountStr,
          remark: loanRemarkStr,
        };
      });

      autoTable(doc, {
        columns: tableColumns,
        body: tableRows,
        startY: currentY + 2,
        theme: "grid",
        margin: { top: 10, left: 10, right: 10 },
        styles: {
          fontSize: 8.5,
          cellPadding: 2,
          textColor: "#000000",
          fillColor: "#FFFFFF",
        },
        headStyles: {
          fillColor: "#19a9e6",
          textColor: "#FFFFFF",
          fontStyle: "bold",
          fontSize: 9,
        },
        didDrawPage: (d) => {
          currentY = d.cursor.y;
        },
      });

      // Footer Image
      try {
        doc.addImage(bottomImg.dataUrl, "JPEG", 8, pageHeight - 16, 195, 10);
      } catch (e) {
        console.error("Failed to add bottom image:", e);
      }

      const pdfBlob = doc.output("blob");
      const blobUrl = URL.createObjectURL(pdfBlob);
      setPdfUrl(blobUrl);
    } catch (err) {
      console.error("PDF generation failed:", err);
      message.error("PDF generation error: " + err.message);
    }
  };

  return (
    <div style={{ width: "100%", height: "100vh", position: "relative" }}>
      <div
        style={{
          position: "fixed",
          top: "10px",
          right: "20px",
          zIndex: 9999,
          display: "flex",
          alignItems: "center",
          gap: "10px",
          background: "rgba(255, 255, 255, 0.95)",
          padding: "6px 12px",
          borderRadius: "8px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
        }}
      >
        <select
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
          className="form-select form-select-sm"
          style={{ width: "130px" }}
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
          className="form-control form-control-sm"
          style={{ width: "80px" }}
        />
        <button
          onClick={() => navigate("/admin-staff")}
          className="btn btn-secondary btn-sm shadow-sm"
        >
          Back to Staff
        </button>
      </div>

      {pdfUrl ? (
        <iframe
          src={pdfUrl}
          title="Staff Detail PDF"
          style={{ width: "100%", height: "100vh", border: "none" }}
        />
      ) : (
        <div className="d-flex justify-content-center align-items-center vh-100">
          <h4>Generating Staff Detail PDF...</h4>
        </div>
      )}
    </div>
  );
};

export default AdminStaffDetail;
