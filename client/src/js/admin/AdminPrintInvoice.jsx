import React, { useEffect, useState } from "react";
import axios from "axios";
import { useParams, useNavigate } from "react-router-dom";
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

const createCancelledStamp = () => {
  const canvas = document.createElement("canvas");
  canvas.width = 750;
  canvas.height = 240;
  const ctx = canvas.getContext("2d");

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Dashed border matching 8px dashed rgba(220, 53, 69, 0.4)
  ctx.strokeStyle = "rgba(220, 53, 69, 0.5)";
  ctx.lineWidth = 8;
  ctx.setLineDash([18, 12]);

  // Rounded rectangle
  const x = 12;
  const y = 12;
  const w = canvas.width - 24;
  const h = canvas.height - 24;
  const r = 24;

  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
  ctx.stroke();

  // Reset line dash
  ctx.setLineDash([]);

  // Text matching color: rgba(220, 53, 69, 0.6), letterSpacing
  ctx.font = "900 68px Arial, sans-serif";
  ctx.fillStyle = "rgba(220, 53, 69, 0.6)";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("C A N C E L L E D", canvas.width / 2, canvas.height / 2 + 2);

  return canvas.toDataURL("image/png");
};

const AdminPrintInvoice = () => {
  const params = useParams();
  const navigate = useNavigate();
  const [quantities, setQuantities] = useState({});
  const [invoiceId, setInvoiceId] = useState(null);
  const [invoice, setInvoice] = useState({
    createdAt: new Date().toISOString().substr(0, 10),
  });
  const [billingTo, setBillingTo] = useState("");
  const [totalTaxableValue, setTotalTaxableValue] = useState(0);
  const [totalCGST, setTotalCGST] = useState(0);
  const [totalSGST, setTotalSGST] = useState(0);
  const [grandTotal, setGrandTotal] = useState(0);
  const [data, setData] = useState([]);
  const [status, setStatus] = useState("unpaid");
  const [isCancelled, setIsCancelled] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [pdfUrl, setPdfUrl] = useState(null);

  const topImageUrl = "/inn.jpg";
  const bottomImageUrl = "/add.jpg";
  const signImageUrl = "/artpoint-sign.png";

  const getInvoiceById = async () => {
    try {
      const res = await axios.post("/api/invoice/get-invoice-by-id", {
        invoiceId: params?.invoiceId,
      });
      if (res.data.success) {
        const invoiceData = res.data.data;
        setData(invoiceData.products || []);
        setBillingTo(invoiceData.billingTo || {});
        setInvoice(invoiceData.invoice || {});
        setInvoiceId(invoiceData.invoiceId);
        setTotalCGST(invoiceData.totalCgst || 0);
        setTotalSGST(invoiceData.totalSgst || 0);
        setGrandTotal(invoiceData.grandTotal || 0);
        setTotalTaxableValue(invoiceData.totalTaxableValue || 0);
        setStatus(invoiceData.status || "unpaid");
        setIsCancelled(
          invoiceData.isCancelled !== undefined
            ? invoiceData.isCancelled
            : invoiceData.status === "cancelled"
        );
        setHasSignature(Boolean(invoiceData.hasSignature));

        const qty = {};
        (invoiceData.products || []).forEach((product, index) => {
          qty[index] = product.quantity || 0;
        });
        setQuantities(qty);
      } else {
        message.error(res.data.message);
      }
    } catch (error) {
      console.error(error);
      message.error("Failed to fetch invoice data.");
    }
  };

  useEffect(() => {
    getInvoiceById();
  }, [params?.invoiceId]);

  useEffect(() => {
    if (data && data.length >= 0 && invoiceId) {
      generatePdf();
    }
  }, [data, invoiceId, hasSignature, isCancelled]);

  const generatePdf = async () => {
    try {
      const doc = new jsPDF("p", "mm", "a4");
      const pageHeight = doc.internal.pageSize.height;

      let currentY = 8;

      // Load banner images with natural dimensions
      const topImg = await getImageDetails(topImageUrl);
      const bottomImg = await getImageDetails(bottomImageUrl);
      const signImg = hasSignature ? await getImageDetails(signImageUrl) : null;

      // Header Image
      try {
        doc.addImage(topImg.dataUrl, "JPEG", 8, currentY, 195, 60);
      } catch (e) {
        console.error("Failed to add top header image to PDF:", e);
      }
      currentY += 68;

      // Billing Details
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("Billing To:", 14, currentY);
      doc.setFont("helvetica", "normal");
      currentY += 6;

      doc.text(`Name:          ${billingTo?.name || ""}`, 14, currentY);
      doc.text(`Invoice No:     ${invoiceId || ""}`, 140, currentY);
      currentY += 6;

      doc.text(`Address:      ${billingTo?.address || ""}`, 14, currentY);
      const formattedDate = invoice?.createdAt
        ? new Intl.DateTimeFormat("en-IN", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
          }).format(new Date(invoice.createdAt))
        : "";
      doc.text(`Date:              ${formattedDate}`, 140, currentY);
      currentY += 6;

      doc.text(`GST:           ${billingTo?.userGst || ""}`, 14, currentY);
      doc.text(`Mobile:           ${billingTo?.mobile || ""}`, 140, currentY);
      currentY += 6;

      if (billingTo?.orderDate) {
        const orderDateStr = new Intl.DateTimeFormat("en-IN", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        }).format(new Date(billingTo.orderDate));
        doc.text(`Order Date:   ${orderDateStr}`, 140, currentY);
        currentY += 6;
      }

      // Table Columns
      const tableColumns = [
        { title: "Sr No", dataKey: "srNo" },
        { title: "Product Details", dataKey: "productDetails" },
        { title: "HSN Code", dataKey: "hsnCode" },
        { title: "Size", dataKey: "size" },
        { title: "Qty", dataKey: "qty" },
        { title: "Total Sqft", dataKey: "totalSqft" },
        { title: "Rate", dataKey: "rate" },
        { title: "Taxable Amount", dataKey: "totalTaxableValue" },
        { title: "CGST Rate", dataKey: "cgst" },
        { title: "CGST Amount", dataKey: "CGSTamount" },
        { title: "SGST Rate", dataKey: "sgst" },
        { title: "SGST Amount", dataKey: "SGSTamount" },
      ];

      const tableRows = data.map((item, index) => {
        const sqft = item.length * item.breadth * (quantities[index] || 0);
        const taxable = sqft * item?.price;
        const cgstAmt = (taxable * (item?.cgst || 0)) / 100;
        const sgstAmt = (taxable * (item?.sgst || 0)) / 100;

        return {
          srNo: index + 1,
          productDetails: item.name || "",
          hsnCode: item.hsnCode || "",
          size: `${item.length} x ${item.breadth}`,
          qty: quantities[index] || 0,
          totalSqft: formatNumber(sqft),
          rate: formatNumber(item.price),
          totalTaxableValue: formatNumber(taxable),
          cgst: `${item?.cgst || 0}%`,
          CGSTamount: formatNumber(cgstAmt),
          sgst: `${item?.sgst || 0}%`,
          SGSTamount: formatNumber(sgstAmt),
        };
      });

      autoTable(doc, {
        columns: tableColumns,
        body: tableRows,
        startY: currentY + 2,
        theme: "grid",
        margin: { top: 10, left: 10, right: 10 },
        styles: {
          fontSize: 8,
          cellPadding: 2,
          textColor: "#000000",
          fillColor: "#FFFFFF",
        },
        headStyles: {
          fillColor: "#19a9e6",
          textColor: "#FFFFFF",
          fontStyle: "bold",
          fontSize: 8,
        },
        didDrawPage: (d) => {
          currentY = d.cursor.y;
        },
      });

      currentY += 8;
      if (currentY + 65 > pageHeight) {
        doc.addPage();
        currentY = 15;
      }

      // Terms Header
      doc.setFillColor("#FF0000");
      doc.rect(14, currentY - 4, 110, 8, "F");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(255, 255, 255);
      doc.text("Terms & Conditions:", 18, currentY + 1.5);

      doc.setTextColor(0, 0, 0);
      currentY += 8;
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.text("Goods Once Sold will not be taken back or exchanged.", 16, currentY);
      currentY += 5;
      doc.text("All disputes subject to HAZARIBAG Jurisdiction only.", 16, currentY);

      // Totals Table
      const totalsColumns = [
        { title: "Total Summary", dataKey: "description" },
        { title: "Amount (INR)", dataKey: "amount" },
      ];

      const totalsRows = [
        { description: "Taxable Amount", amount: formatNumber(totalTaxableValue) },
        { description: "Total CGST", amount: formatNumber(totalCGST) },
        { description: "Total SGST", amount: formatNumber(totalSGST) },
        { description: "Grand Total", amount: formatNumber(grandTotal) },
      ];

      autoTable(doc, {
        columns: totalsColumns,
        body: totalsRows,
        startY: currentY - 17,
        theme: "grid",
        margin: { left: 135, right: 10 },
        styles: {
          fontSize: 9,
          cellPadding: 2,
          textColor: "#000000",
          fillColor: "#FFFFFF",
        },
        headStyles: {
          fillColor: "#19a9e6",
          textColor: "#FFFFFF",
          fontStyle: "bold",
        },
        tableWidth: "wrap",
      });

      currentY += 8;

      // Account Details Header
      doc.setFillColor("#FF0000");
      doc.rect(14, currentY - 4, 110, 8, "F");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(255, 255, 255);
      doc.text("Account Details:", 18, currentY + 1.5);

      doc.setTextColor(0, 0, 0);
      currentY += 8;
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.text("Bank of India", 16, currentY);
      currentY += 5;
      doc.text("A/C No: 469920110000164", 16, currentY);
      currentY += 5;
      doc.text("IFSC Code: BKID0004699", 16, currentY);

      // Signature & Footer Image (Preserving natural aspect ratio for signature)
      if (hasSignature && signImg && signImg.dataUrl) {
        try {
          const signWidth = 38;
          const signHeight = (signImg.height / signImg.width) * signWidth;
          doc.addImage(
            signImg.dataUrl,
            "PNG",
            152,
            pageHeight - 20 - signHeight,
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

      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.text("Authorized Signature", 150, pageHeight - 16);

      // Cancelled stamp watermark overlay if applicable
      if (isCancelled || status === "cancelled") {
        try {
          const stampDataUrl = createCancelledStamp();
          doc.addImage(stampDataUrl, "PNG", 38, 110, 134, 43, undefined, "FAST", -30);
        } catch (e) {
          console.error("Failed to add CANCELLED stamp:", e);
        }
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
          gap: "10px",
        }}
      >
        <button
          onClick={() => navigate("/admin-invoice")}
          className="btn btn-secondary shadow-sm"
        >
          Back to List
        </button>
      </div>

      {pdfUrl ? (
        <iframe
          src={pdfUrl}
          title="GST Invoice PDF"
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

export default AdminPrintInvoice;
