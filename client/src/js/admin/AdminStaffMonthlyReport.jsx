import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
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

const AdminStaffMonthlyReport = () => {
  const navigate = useNavigate();
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [report, setReport] = useState([]);
  const [pdfUrl, setPdfUrl] = useState(null);

  const topImageUrl = "/estt.jpg";
  const bottomImageUrl = "/add.jpg";

  const getMonthlyReport = async () => {
    try {
      const res = await axios.post("/api/staff/get-monthly-report", {
        month: selectedMonth,
        year: selectedYear,
      });
      if (res.data.success) {
        setReport(res.data.data || []);
      } else {
        message.error(res.data.message);
      }
    } catch (error) {
      console.error(error);
      message.error("Failed to fetch monthly attendance report.");
    }
  };

  useEffect(() => {
    getMonthlyReport();
  }, [selectedMonth, selectedYear]);

  const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const monthName = new Date(selectedYear, selectedMonth).toLocaleString(
    "default",
    { month: "long" }
  );

  useEffect(() => {
    if (report && report.length >= 0) {
      generatePdf();
    }
  }, [report, selectedMonth, selectedYear]);

  const generatePdf = async () => {
    try {
      // Landscape A4 for wide table fit
      const doc = new jsPDF("l", "mm", "a4");
      const pageWidth = doc.internal.pageSize.width; // 297 mm
      const pageHeight = doc.internal.pageSize.height; // 210 mm

      let currentY = 8;

      // Header Image
      const topImg = await getImageDetails(topImageUrl);
      const bottomImg = await getImageDetails(bottomImageUrl);

      try {
        doc.addImage(topImg.dataUrl, "JPEG", 8, currentY, pageWidth - 16, 45);
      } catch (e) {
        console.error("Failed to add top header image:", e);
      }
      currentY += 50;

      // Document Title
      doc.setFontSize(13);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0, 0, 0);
      doc.text(
        `MONTHLY STAFF ATTENDANCE REPORT — ${monthName.toUpperCase()} ${selectedYear}`,
        14,
        currentY
      );
      currentY += 8;

      // Table Setup
      const tableRows = report.map((item) => {
        let presentCount = 0;
        const row = [item.staff?.name || ""];
        days.forEach((d) => {
          const dateStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
          const record = item.attendance?.find((a) => a.date === dateStr);
          const isFriday = new Date(dateStr).getDay() === 5;
          const isPresent = Boolean(record?.inTime);
          if (isPresent) presentCount++;
          row.push(isFriday ? "F" : isPresent ? "P" : "A");
        });
        row.push(presentCount);
        return row;
      });

      const dayColWidth = (281 - 45 - 16) / daysInMonth;

      const columnStyles = {
        0: { cellWidth: 45, halign: "left", fontStyle: "bold" },
      };
      days.forEach((_, idx) => {
        columnStyles[idx + 1] = { cellWidth: dayColWidth, halign: "center" };
      });
      columnStyles[daysInMonth + 1] = {
        cellWidth: 16,
        halign: "center",
        fontStyle: "bold",
      };

      autoTable(doc, {
        head: [["Staff Name", ...days.map(String), "Total"]],
        body: tableRows,
        startY: currentY,
        theme: "grid",
        margin: { left: 8, right: 8 },
        styles: {
          fontSize: 7.5,
          cellPadding: { top: 3.5, bottom: 3.5, left: 1, right: 1 },
          textColor: [0, 0, 0],
          fillColor: [255, 255, 255],
          lineWidth: 0.2,
          lineColor: [220, 220, 220],
          overflow: "linebreak",
        },
        headStyles: {
          fillColor: [25, 169, 230],
          textColor: [255, 255, 255],
          fontStyle: "bold",
          fontSize: 8,
          lineWidth: 0.2,
          lineColor: [220, 220, 220],
          halign: "center",
          valign: "middle",
          cellPadding: { top: 3.5, bottom: 3.5, left: 1, right: 1 },
        },
        columnStyles,
        didDrawCell: (d) => {
          if (
            d.section === "body" &&
            d.column.index > 0 &&
            d.column.index <= daysInMonth
          ) {
            const text = d.cell.raw;
            if (text === "P") {
              doc.setFillColor(212, 237, 218);
              doc.rect(d.cell.x, d.cell.y, d.cell.width, d.cell.height, "F");
              doc.setDrawColor(220, 220, 220);
              doc.rect(d.cell.x, d.cell.y, d.cell.width, d.cell.height, "S");
              doc.setFont("helvetica", "bold");
              doc.setFontSize(7.5);
              doc.setTextColor(21, 87, 36);
              doc.text(
                "P",
                d.cell.x + d.cell.width / 2,
                d.cell.y + d.cell.height / 2 + 1,
                { align: "center" }
              );
            } else if (text === "A") {
              doc.setFillColor(255, 235, 235);
              doc.rect(d.cell.x, d.cell.y, d.cell.width, d.cell.height, "F");
              doc.setDrawColor(220, 220, 220);
              doc.rect(d.cell.x, d.cell.y, d.cell.width, d.cell.height, "S");
              doc.setFont("helvetica", "bold");
              doc.setFontSize(7.5);
              doc.setTextColor(220, 53, 69);
              doc.text(
                "A",
                d.cell.x + d.cell.width / 2,
                d.cell.y + d.cell.height / 2 + 1,
                { align: "center" }
              );
            } else if (text === "F") {
              doc.setFillColor(255, 243, 205);
              doc.rect(d.cell.x, d.cell.y, d.cell.width, d.cell.height, "F");
              doc.setDrawColor(220, 220, 220);
              doc.rect(d.cell.x, d.cell.y, d.cell.width, d.cell.height, "S");
              doc.setFont("helvetica", "bold");
              doc.setFontSize(7.5);
              doc.setTextColor(133, 100, 4);
              doc.text(
                "F",
                d.cell.x + d.cell.width / 2,
                d.cell.y + d.cell.height / 2 + 1,
                { align: "center" }
              );
            }
          }
        },
        didDrawPage: (d) => {
          currentY = d.cursor.y;
        },
      });

      // Footer Banner
      try {
        doc.addImage(bottomImg.dataUrl, "JPEG", 8, pageHeight - 14, pageWidth - 16, 10);
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
          title="Monthly Attendance PDF"
          style={{ width: "100%", height: "100vh", border: "none" }}
        />
      ) : (
        <div className="d-flex justify-content-center align-items-center vh-100">
          <h4>Generating Monthly Attendance PDF...</h4>
        </div>
      )}
    </div>
  );
};

export default AdminStaffMonthlyReport;
