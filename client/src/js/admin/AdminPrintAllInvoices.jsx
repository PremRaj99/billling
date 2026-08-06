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

const AdminPrintAllInvoices = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const searchQuery = searchParams.get("searchQuery") || "";
  const query = searchParams.get("query") || "";
  const selectedFrom = searchParams.get("from") || "";
  const selectedTo = searchParams.get("to") || "";
  const monthParam = searchParams.get("month");
  const selectedMonth = monthParam !== null && monthParam !== undefined && monthParam !== "" ? parseInt(monthParam, 10) : null;

  const [invoices, setInvoices] = useState([]);
  const [pdfUrl, setPdfUrl] = useState(null);
  const [pdfDoc, setPdfDoc] = useState(null);

  const topImageUrl = "/inn.jpg";
  const bottomImageUrl = "/add.jpg";
  const signImageUrl = "/artpoint-sign.png";

  const reportTitle = "All GST Invoices";

  const getAllInvoices = async () => {
    try {
      const res = await axios.get("/api/invoice/get-all-invoice");
      if (res.data.success) {
        let sorted = (res.data.data || []).sort((a, b) => {
          const numA = parseInt((a.invoiceId || "").replace("IN", ""), 10) || 0;
          const numB = parseInt((b.invoiceId || "").replace("IN", ""), 10) || 0;
          return numB - numA;
        });

        if (searchQuery.trim() !== "") {
          sorted = sorted.filter((item) =>
            item.invoiceId?.toLowerCase()?.includes(searchQuery.toLowerCase())
          );
        }
        if (query.trim() !== "") {
          sorted = sorted.filter((item) =>
            item.billingTo?.name?.toLowerCase()?.includes(query.toLowerCase())
          );
        }
        if (selectedFrom || selectedTo) {
          sorted = sorted.filter((item) => {
            const itemDate = new Date(item?.createdAt);
            if (selectedFrom && selectedTo) {
              return itemDate >= new Date(selectedFrom) && itemDate <= new Date(selectedTo);
            } else if (selectedFrom) {
              return itemDate >= new Date(selectedFrom);
            } else if (selectedTo) {
              return itemDate <= new Date(selectedTo);
            }
            return true;
          });
        }
        if (selectedMonth !== null && !isNaN(selectedMonth)) {
          sorted = sorted.filter((item) => {
            const cDate = item?.invoice?.createdAt || item?.createdAt;
            return new Date(cDate).getMonth() === selectedMonth;
          });
        }

        setInvoices(sorted);
      } else {
        message.error(res.data.message);
      }
    } catch (error) {
      console.error(error);
      message.error("Failed to fetch invoices.");
    }
  };

  useEffect(() => {
    getAllInvoices();
  }, [searchQuery, query, selectedFrom, selectedTo, selectedMonth]);

  useEffect(() => {
    document.title = reportTitle;
  }, [reportTitle]);

  useEffect(() => {
    if (invoices && invoices.length >= 0) {
      generatePdf();
    }
  }, [invoices]);

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
      doc.text("ALL GST INVOICES DETAILS", 14, currentY);
      currentY += 5;

      // Filter summary box
      const filterBadges = [];
      if (searchQuery) filterBadges.push(`Search ID: ${searchQuery}`);
      if (query) filterBadges.push(`Name: ${query}`);
      if (selectedFrom) filterBadges.push(`From: ${new Date(selectedFrom).toLocaleDateString("en-GB")}`);
      if (selectedTo) filterBadges.push(`To: ${new Date(selectedTo).toLocaleDateString("en-GB")}`);
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
      let taxableSum = 0;
      let cgstSum = 0;
      let sgstSum = 0;
      let grandTotalSum = 0;

      const tableRows = invoices.map((item, index) => {
        const tTaxable = Number(item?.totalTaxableValue) || 0;
        const cgst = Number(item?.totalCgst) || 0;
        const sgst = Number(item?.totalSgst) || 0;
        const gTotal = Number(item?.grandTotal) || 0;

        taxableSum += tTaxable;
        cgstSum += cgst;
        sgstSum += sgst;
        grandTotalSum += gTotal;

        const dateObj = item?.invoice?.createdAt || item?.createdAt;
        const dateStr = dateObj
          ? new Intl.DateTimeFormat("en-GB", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
            }).format(new Date(dateObj))
          : "";

        const statusLabel =
          item?.isCancelled || item?.status === "cancelled"
            ? `Cancelled (${item?.status || ""})`
            : item?.status || "";

        return [
          item?.invoiceId || "",
          item?.products?.length || 0,
          item?.billingTo?.name || "",
          formatNumber(tTaxable),
          formatNumber(cgst),
          formatNumber(sgst),
          formatNumber(gTotal),
          statusLabel,
          dateStr,
        ];
      });

      // Main Table
      autoTable(doc, {
        head: [
          [
            "Invoice ID",
            "Items",
            "Billing To",
            "Taxable Value",
            "CGST",
            "SGST",
            "Grand Total",
            "Status",
            "Date",
          ],
        ],
        body: tableRows,
        startY: currentY,
        theme: "grid",
        showHead: "everyPage",
        margin: { left: 8, right: 8 },
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
          0: { cellWidth: 20, halign: "center" },
          1: { cellWidth: 12, halign: "center" },
          2: { cellWidth: 46, halign: "left" },
          3: { cellWidth: 16, halign: "right" },
          4: { cellWidth: 18, halign: "right" },
          5: { cellWidth: 18, halign: "right" },
          6: { cellWidth: 24, halign: "right" },
          7: { cellWidth: 20, halign: "center" },
          8: { cellWidth: 20, halign: "center" },
        },
        didParseCell: (data) => {
          if (data.section === "body" && data.column.index === 7) {
            const statusVal = String(data.cell.raw || "").toLowerCase();
            if (statusVal.includes("cancelled")) {
              data.cell.styles.fillColor = [248, 215, 218];
              data.cell.styles.textColor = [220, 53, 69];
              data.cell.styles.fontStyle = "bold";
            } else if (statusVal.includes("paid") && !statusVal.includes("unpaid")) {
              data.cell.styles.fillColor = [209, 231, 221];
              data.cell.styles.textColor = [25, 135, 84];
              data.cell.styles.fontStyle = "bold";
            } else {
              data.cell.styles.fillColor = [226, 227, 229];
              data.cell.styles.textColor = [108, 117, 125];
              data.cell.styles.fontStyle = "bold";
            }
          }
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
      const estimatedSummaryHeight = 45;
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
      const totalsRows = [
        ["Total Taxable Value", formatNumber(taxableSum)],
        ["Total CGST", formatNumber(cgstSum)],
        ["Total SGST", formatNumber(sgstSum)],
        ["Grand Total", formatNumber(grandTotalSum)],
      ];

      autoTable(doc, {
        head: [["Amount", ""]],
        body: totalsRows,
        startY: bottomStartY,
        theme: "grid",
        margin: { left: 118, right: 8 },
        styles: {
          fontSize: 9,
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
        : bottomStartY + 35;
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
          onClick={() => navigate("/admin-invoice")}
          className="btn btn-secondary shadow-sm"
        >
          Back to List
        </button>
        {pdfDoc && (
          <button
            onClick={() => pdfDoc.save("All_Invoices.pdf")}
            className="btn btn-primary shadow-sm"
          >
            Download PDF
          </button>
        )}
      </div>

      {pdfUrl ? (
        <iframe
          src={pdfUrl}
          title="All GST Invoices PDF"
          style={{ width: "100%", height: "100vh", border: "none" }}
        />
      ) : (
        <div className="d-flex justify-content-center align-items-center vh-100">
          <h4>Generating Invoice PDF...</h4>
        </div>
      )}
    </div>
  );
};

export default AdminPrintAllInvoices;
