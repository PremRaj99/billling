import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate, useSearchParams } from "react-router-dom";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { message } from "antd";
import { formatNumber } from "../components/numberUtils";

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

const AdminPrintAllQuotations = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const searchQuery = searchParams.get("searchQuery") || "";
  const query = searchParams.get("query") || "";
  const selectedDate = searchParams.get("date") || "";
  const monthParam = searchParams.get("month");
  const selectedMonth = monthParam !== null && monthParam !== undefined && monthParam !== "" ? parseInt(monthParam, 10) : null;

  const [quotations, setQuotations] = useState([]);
  const [pdfUrl, setPdfUrl] = useState(null);
  const [pdfDoc, setPdfDoc] = useState(null);

  const topImageUrl = "/quoo.jpg";
  const bottomImageUrl = "/add.jpg";
  const signImageUrl = "/artpoint-sign.png";

  const reportTitle = "All Quotations";

  const getAllQuotations = async () => {
    try {
      const res = await axios.get("/api/quotation/get-all-quotation");
      if (res.data.success) {
        let sorted = (res.data.data || []).sort((a, b) => {
          const numA = parseInt((a.quotationId || "").replace("QT", ""), 10) || 0;
          const numB = parseInt((b.quotationId || "").replace("QT", ""), 10) || 0;
          return numB - numA;
        });

        if (searchQuery.trim() !== "") {
          sorted = sorted.filter((item) =>
            item.quotationId?.toLowerCase()?.includes(searchQuery.toLowerCase())
          );
        }
        if (query.trim() !== "") {
          sorted = sorted.filter((item) =>
            item.billingTo?.name?.toLowerCase()?.includes(query.toLowerCase())
          );
        }
        if (selectedDate) {
          sorted = sorted.filter((item) => {
            return (
              new Date(item?.createdAt).toDateString() ===
              new Date(selectedDate).toDateString()
            );
          });
        }
        if (selectedMonth !== null && !isNaN(selectedMonth)) {
          sorted = sorted.filter((item) => {
            return new Date(item?.createdAt).getMonth() === selectedMonth;
          });
        }

        setQuotations(sorted);
      } else {
        message.error(res.data.message);
      }
    } catch (error) {
      console.error(error);
      message.error("Failed to fetch quotations.");
    }
  };

  useEffect(() => {
    getAllQuotations();
  }, [searchQuery, query, selectedDate, selectedMonth]);

  useEffect(() => {
    document.title = reportTitle;
  }, [reportTitle]);

  useEffect(() => {
    if (quotations && quotations.length >= 0) {
      generatePdf();
    }
  }, [quotations]);

  const generatePdf = async () => {
    try {
      const doc = new jsPDF("p", "mm", "a4");
      doc.setProperties({ title: reportTitle });

      const pageHeight = doc.internal.pageSize.height;
      let currentY = 8;

      const topImg = await getImageDetails(topImageUrl);
      const bottomImg = await getImageDetails(bottomImageUrl);
      const signImg = await getImageDetails(signImageUrl);

      // Header Image
      try {
        doc.addImage(topImg.dataUrl, "JPEG", 8, currentY, 195, 60);
      } catch (e) {
        console.error("Failed to add top header image:", e);
      }
      currentY += 68;

      // Report Header Title
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0, 0, 0);
      doc.text("ALL QUOTATION DETAILS", 14, currentY);
      currentY += 5;

      // Filter summary box
      const filterBadges = [];
      if (searchQuery) filterBadges.push(`Search ID: ${searchQuery}`);
      if (query) filterBadges.push(`Name: ${query}`);
      if (selectedDate) filterBadges.push(`Date: ${new Date(selectedDate).toLocaleDateString("en-GB")}`);
      if (selectedMonth !== null && !isNaN(selectedMonth)) {
        const mName = new Date(2000, selectedMonth, 1).toLocaleString("default", { month: "long" });
        filterBadges.push(`Month: ${mName}`);
      }

      if (filterBadges.length > 0) {
        const boxX = 8;
        const boxWidth = 194;
        const boxY = currentY;
        const boxHeight = 7;
        const tagWidth = 34;

        // Tag banner (Cyan background, white text)
        doc.setFillColor(25, 169, 230);
        doc.rect(boxX, boxY, tagWidth, boxHeight, "F");

        doc.setFontSize(8.5);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(255, 255, 255);
        doc.text("Filter Criteria:", boxX + 3, boxY + 4.8);

        // Content box (White background with sharp grid border)
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(220, 220, 220);
        doc.setLineWidth(0.2);
        doc.rect(boxX + tagWidth, boxY, boxWidth - tagWidth, boxHeight, "DF");

        const filterString = filterBadges.join("   |   ");
        doc.setFont("helvetica", "normal");
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(8.5);
        doc.text(filterString, boxX + tagWidth + 4, boxY + 4.8);

        currentY += boxHeight + 4;
      } else {
        currentY += 2;
      }

      // Calculate Totals
      let totalValSum = 0;

      const tableRows = quotations.map((item, index) => {
        const tVal = Number(item?.totalValue) || 0;
        totalValSum += tVal;

        const dateStr = item?.createdAt
          ? new Intl.DateTimeFormat("en-GB", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
            }).format(new Date(item.createdAt))
          : "";

        return [
          item?.quotationId || "",
          item?.products?.length || 0,
          item?.billingTo?.name || "",
          formatNumber(tVal),
          dateStr,
        ];
      });

      // Main Table
      autoTable(doc, {
        head: [
          [
            "Quotation ID",
            "Items",
            "Billing To",
            "Total Value",
            "Date",
          ],
        ],
        body: tableRows,
        startY: currentY,
        theme: "grid",
        showHead: "everyPage",
        margin: { left: 12, right: 12 },
        styles: {
          fontSize: 8.5,
          cellPadding: 2,
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
          0: { cellWidth: 22, halign: "center" },
          1: { cellWidth: 14, halign: "center" },
          2: { cellWidth: 100, halign: "left" },
          3: { cellWidth: 28, halign: "right" },
          4: { cellWidth: 24, halign: "center" },
        },
        didDrawPage: (d) => {
          currentY = d.cursor.y;
        },
      });

      const signWidth = 36;
      const signHeight =
        signImg && signImg.dataUrl && signImg.width
          ? (signImg.height / signImg.width) * signWidth
          : 12;

      const sigTopY = pageHeight - 24 - signHeight;
      const estimatedSummaryHeight = 35;
      const totalNeeded = estimatedSummaryHeight + signHeight + 15;

      currentY += 4;
      if (currentY + totalNeeded > pageHeight - 16) {
        doc.addPage();
        currentY = 15;
      }

      const bottomStartY = currentY;

      // Left Box: Terms & Conditions
      doc.setFillColor(255, 0, 0);
      doc.rect(8, bottomStartY, 105, 7, "F");

      doc.setFontSize(10);
      doc.setTextColor(255, 255, 255);
      doc.text("Terms & Conditions:", 12, bottomStartY + 4.8);

      doc.setTextColor(0, 0, 0);
      let termsY = bottomStartY + 12;
      doc.setFontSize(8.5);
      doc.text("Goods Once Sold will not be taken back or exchanged.", 8, termsY);
      termsY += 5;
      doc.text("All disputes subject to HAZARIBAG Jurisdiction only.", 8, termsY);

      // Right Box: Summary Table (Amount)
      const totalsRows = [["Total Value", formatNumber(totalValSum)]];

      autoTable(doc, {
        head: [["Amount", ""]],
        body: totalsRows,
        startY: bottomStartY,
        theme: "grid",
        margin: { left: 118, right: 8 },
        styles: {
          fontSize: 9.5,
          cellPadding: 2,
          textColor: [0, 0, 0],
          fillColor: [255, 255, 255],
          lineWidth: 0.2,
          lineColor: [220, 220, 220],
        },
        headStyles: {
          fillColor: [25, 169, 230],
          textColor: [255, 255, 255],
          fontStyle: "bold",
          fontSize: 9.5,
          halign: "left",
        },
        columnStyles: {
          0: { cellWidth: 44, halign: "left", fontStyle: "normal" },
          1: { cellWidth: 40, halign: "right", fontStyle: "normal" },
        },
      });

      const totalsFinalY = doc.lastAutoTable
        ? doc.lastAutoTable.finalY
        : bottomStartY + 25;
      const bottomSectionEndY = Math.max(totalsFinalY, termsY);

      if (bottomSectionEndY >= sigTopY - 3) {
        doc.addPage();
      }

      // Signature & Footer Image
      doc.setFontSize(9);
      doc.setTextColor(0, 0, 0);
      doc.text("Authorized Signature", 145, pageHeight - 22);

      if (signImg && signImg.dataUrl) {
        try {
          doc.addImage(
            signImg.dataUrl,
            "PNG",
            142,
            pageHeight - 24 - signHeight,
            signWidth,
            signHeight
          );
        } catch (e) {
          console.error("Failed to add signature image:", e);
        }
      }

      try {
        doc.addImage(bottomImg.dataUrl, "JPEG", 8, pageHeight - 16, 195, 10);
      } catch (e) {
        console.error("Failed to add bottom image:", e);
      }

      setPdfDoc(doc);
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
          left: "20px",
          zIndex: 9999,
          display: "flex",
          gap: "10px",
        }}
      >
        <button
          onClick={() => navigate("/admin-quotation")}
          className="btn btn-secondary shadow-sm"
        >
          Back to List
        </button>
        {pdfDoc && (
          <button
            onClick={() => pdfDoc.save("All_Quotations.pdf")}
            className="btn btn-primary shadow-sm"
          >
            Download PDF
          </button>
        )}
      </div>

      {pdfUrl ? (
        <iframe
          src={pdfUrl}
          title="All Quotations PDF"
          style={{ width: "100%", height: "100vh", border: "none" }}
        />
      ) : (
        <div className="d-flex justify-content-center align-items-center vh-100">
          <h4>Generating Quotations PDF...</h4>
        </div>
      )}
    </div>
  );
};

export default AdminPrintAllQuotations;
