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
  const [pdfDoc, setPdfDoc] = useState(null);

  // const topImageUrl = "/estt.jpg";
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

  const reportTitle = staff?.name
    ? `${staff.name} - ${monthName} ${selectedYear}`
    : `Staff Report - ${monthName} ${selectedYear}`;

  useEffect(() => {
    document.title = reportTitle;
  }, [reportTitle]);

  const generatePdf = async () => {
    try {
      const doc = new jsPDF("p", "mm", "a4");
      doc.setProperties({ title: reportTitle });
      document.title = reportTitle;
      const pageHeight = doc.internal.pageSize.height;

      let currentY = 8;

      // Header Image
      // const topImg = await getImageDetails(topImageUrl);
      const bottomImg = await getImageDetails(bottomImageUrl);

      try {
        // doc.addImage(topImg.dataUrl, "JPEG", 8, currentY, 195, 60);
      } catch (e) {
        console.error("Failed to add top header image:", e);
      }
      currentY += 6;

      // Document Title & Details
      doc.setFontSize(20);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0, 0, 0);
      doc.text("STAFF ATTENDANCE & PAYMENT REPORT", 28, currentY);
      currentY += 8;

      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text(`Name:   ${staff?.name || ""}`, 20, currentY);
      doc.text(`Month & Year: ${monthName} ${selectedYear}`, 130, currentY);
      currentY += 5.5;

      doc.setFont("helvetica", "normal");
      doc.text(`Mobile:         ${staff?.mobile || "-"}`, 20, currentY);
      const totalPresent = attendance.filter(
        (a) => a.inTime || a.outTime
      ).length;
      doc.text(`Present Days: ${totalPresent} / ${daysInMonth}`, 130, currentY);
      currentY += 5.5;

      const totalLoansAmount = loans.reduce(
        (acc, curr) => acc + (curr.amount || 0),
        0
      );
      doc.text(`Total Payments: Rs. ${totalLoansAmount}`, 130, currentY);
      currentY += 6;

      // Table Setup
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
        const dayDate = new Date(day);
        const dayName = dayDate.toLocaleString("default", {
          weekday: "short",
        });

        const formattedDayDate = new Intl.DateTimeFormat("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }).format(dayDate);

        return [
          formattedDayDate,
          dayName,
          record?.inTime || "-",
          record?.outTime || "-",
          loanAmountStr,
          loanRemarkStr,
        ];
      });

      autoTable(doc, {
        head: [
          ["Date", "Day", "In Time", "Out Time", "Payment Amount", "Remark"],
        ],
        body: tableRows,
        startY: currentY,
        theme: "grid",
        showHead: "everyPage",
        margin: { left: 14, right: 14 },
        styles: {
          fontSize: 8.85,
          cellPadding: { top: 2, bottom: 2, left: 2, right: 2 },
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
          fontSize: 9,
          lineWidth: 0.2,
          lineColor: [220, 220, 220],
          halign: "center",
          valign: "middle",
        },
        columnStyles: {
          0: { cellWidth: 28, halign: "center" },
          1: { cellWidth: 20, halign: "center" },
          2: { cellWidth: 24, halign: "center" },
          3: { cellWidth: 24, halign: "center" },
          4: { cellWidth: 32, halign: "center" },
          5: { cellWidth: 54, halign: "left" },
        },
        didDrawCell: (d) => {
          if (d.section === "body") {
            const dayName = d.row.cells[1].text[0];
            const inTime = d.row.cells[2].text[0];

            if (dayName === "Fri") {
              if (d.column.index === 1) {
                doc.setFillColor(255, 243, 205);
                doc.rect(d.cell.x, d.cell.y, d.cell.width, d.cell.height, "F");
                doc.setDrawColor(220, 220, 220);
                doc.rect(d.cell.x, d.cell.y, d.cell.width, d.cell.height, "S");
                doc.setFont("helvetica", "bold");
                doc.setFontSize(8.5);
                doc.setTextColor(133, 100, 4);
                doc.text(
                  "Fri",
                  d.cell.x + d.cell.width / 2,
                  d.cell.y + d.cell.height / 2 + 1,
                  { align: "center" }
                );
              }
            } else if (d.column.index === 2 || d.column.index === 3) {
              if (inTime && inTime !== "-") {
                doc.setFillColor(212, 237, 218);
                doc.rect(d.cell.x, d.cell.y, d.cell.width, d.cell.height, "F");
                doc.setDrawColor(220, 220, 220);
                doc.rect(d.cell.x, d.cell.y, d.cell.width, d.cell.height, "S");
                doc.setFont("helvetica", "bold");
                doc.setFontSize(8.5);
                doc.setTextColor(21, 87, 36);
                doc.text(
                  d.cell.text[0] || "-",
                  d.cell.x + d.cell.width / 2,
                  d.cell.y + d.cell.height / 2 + 1,
                  { align: "center" }
                );
              } else {
                doc.setFillColor(255, 235, 235);
                doc.rect(d.cell.x, d.cell.y, d.cell.width, d.cell.height, "F");
                doc.setDrawColor(220, 220, 220);
                doc.rect(d.cell.x, d.cell.y, d.cell.width, d.cell.height, "S");
                doc.setFont("helvetica", "bold");
                doc.setFontSize(8.5);
                doc.setTextColor(220, 53, 69);
                doc.text(
                  "-",
                  d.cell.x + d.cell.width / 2,
                  d.cell.y + d.cell.height / 2 + 1,
                  { align: "center" }
                );
              }
            }
          }
        },
        didDrawPage: (d) => {
          currentY = d.cursor.y;
        },
      });

      // Footer Image
      // try {
      //   doc.addImage(bottomImg.dataUrl, "JPEG", 8, pageHeight - 16, 195, 10);
      // } catch (e) {
      //   console.error("Failed to add bottom image:", e);
      // }

      setPdfDoc(doc);
      const pdfBlob = doc.output("blob");
      const blobUrl = URL.createObjectURL(pdfBlob);
      setPdfUrl(blobUrl);
    } catch (err) {
      console.error("PDF generation failed:", err);
      message.error("PDF generation error: " + err.message);
    }
  };

  useEffect(() => {
    generatePdf();
  }, [staff, attendance, loans, selectedMonth, selectedYear]);

  return (
    <div style={{ width: "100%", height: "100vh", position: "relative" }}>
      <div
        style={{
          position: "fixed",
          top: "10px",
          left: "20px",
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
        {pdfDoc && (
          <button
            onClick={() =>
              pdfDoc.save(`${reportTitle.replace(/[^a-zA-Z0-9_-]/g, "_")}.pdf`)
            }
            className="btn btn-primary btn-sm shadow-sm"
          >
            Download PDF
          </button>
        )}
      </div>

      {pdfUrl ? (
        <iframe
          src={pdfUrl}
          title={reportTitle}
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
