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

  ctx.strokeStyle = "rgba(220, 53, 69, 0.5)";
  ctx.lineWidth = 8;
  ctx.setLineDash([18, 12]);

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

  ctx.setLineDash([]);

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
        const isSig =
          invoiceData.hasSignature === true ||
          invoiceData.hasSignature === "true" ||
          invoiceData.hasSignature === 1;
        setHasSignature(isSig);

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

      // Billing To Header
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0, 0, 0);
      doc.text("Billing To:", 14, currentY);
      currentY += 6;

      // Billing Details Grid (Left & Right)
      doc.setFontSize(10);

      // Row 1: Name & Invoice No
      doc.setFont("helvetica", "normal");
      doc.text("Name:", 14, currentY);
      doc.setFont("helvetica", "bold");
      doc.text(billingTo?.name || "", 42, currentY);

      doc.setFont("helvetica", "normal");
      doc.text("Invoice No:", 135, currentY);
      doc.setFont("helvetica", "bold");
      doc.text(invoiceId || "", 160, currentY);
      currentY += 5.5;

      // Row 2: Address & Date
      doc.setFont("helvetica", "normal");
      doc.text("Address:", 14, currentY);
      doc.text(billingTo?.address || "", 42, currentY);

      const formattedDate = invoice?.createdAt
        ? new Intl.DateTimeFormat("en-GB", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        }).format(new Date(invoice.createdAt))
        : new Intl.DateTimeFormat("en-GB", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        }).format(new Date());

      doc.text("Date:", 135, currentY);
      doc.text(formattedDate, 160, currentY);
      currentY += 5.5;

      // Row 3: GST & Mobile
      doc.text("GST:", 14, currentY);
      doc.text(billingTo?.userGst || "", 42, currentY);

      doc.text("Mobile:", 135, currentY);
      doc.text(billingTo?.mobile || "", 160, currentY);
      currentY += 5.5;

      // Row 4: Order Date (if present)
      if (billingTo?.orderDate) {
        const orderDateStr = new Intl.DateTimeFormat("en-GB", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        }).format(new Date(billingTo.orderDate));
        doc.text("Order Date:", 135, currentY);
        doc.text(orderDateStr, 160, currentY);
        currentY += 5.5;
      }

      currentY += 2.5;

      // Table Rows
      const tableRows = data.map((item, index) => {
        const sqft = item.length * item.breadth * (quantities[index] || 0);
        const taxable = sqft * item?.price;
        const cgstAmt = (taxable * (item?.cgst || 0)) / 100;
        const sgstAmt = (taxable * (item?.sgst || 0)) / 100;

        return [
          index + 1,
          item.name,
          item.hsnCode || "",
          `${item.length || 0} x ${item.breadth || 0}`,
          quantities[index] || item.quantity || 0,
          formatNumber(sqft),
          formatNumber(item.price),
          formatNumber(taxable),
          `${item?.cgst || 0}%`,
          formatNumber(cgstAmt),
          `${item?.sgst || 0}%`,
          formatNumber(sgstAmt),
        ];
      });

      autoTable(doc, {
        head: [
          [
            "S. No.",
            "Product Details",
            "HSN",
            "Size",
            "Qty",
            "Sqft",
            "Rate",
            "Taxable Amt",
            "CGST %",
            "CGST Amt",
            "SGST %",
            "SGST Amt",
          ],
        ],
        body: tableRows,
        startY: currentY,
        theme: "grid",
        showHead: "everyPage",
        margin: { left: 8, right: 8 },
        styles: {
          fontSize: 8,
          cellPadding: { top: 2.5, bottom: 2.5, left: 1.5, right: 1.5 },
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
          cellPadding: { top: 2.5, bottom: 2.5, left: 1, right: 1 },
        },
        columnStyles: {
          0: { cellWidth: 10, halign: "center" },
          1: { cellWidth: 46, halign: "left" },
          2: { cellWidth: 14, halign: "center" },
          3: { cellWidth: 16, halign: "center" },
          4: { cellWidth: 10, halign: "center" },
          5: { cellWidth: 15, halign: "center" },
          6: { cellWidth: 14, halign: "center" },
          7: { cellWidth: 18, halign: "center" },
          8: { cellWidth: 11, halign: "center" },
          9: { cellWidth: 14, halign: "center" },
          10: { cellWidth: 11, halign: "center" },
          11: { cellWidth: 15, halign: "center" },
        },
        willDrawCell: (d) => {
          if (d.section === "body" && d.column.index === 1) {
            d.cell.customTextLines = [...d.cell.text];
            d.cell.text = [];
          }
        },
        didDrawCell: (d) => {
          if (
            d.section === "body" &&
            d.column.index === 1 &&
            d.cell.customTextLines &&
            d.cell.customTextLines.length > 0
          ) {
            const lines = d.cell.customTextLines;
            const x = d.cell.x + d.cell.padding("left");
            let y = d.cell.y + d.cell.padding("top") + 2.6;

            lines.forEach((line, idx) => {
              if (idx === 0) {
                doc.setFont("helvetica", "bold");
                doc.setFontSize(7.5);
              } else {
                doc.setFont("helvetica", "normal");
                doc.setFontSize(7);
              }
              doc.text(line, x, y);
              y += 3.6;
            });
          }
        },
        didDrawPage: (d) => {
          currentY = d.cursor.y;
        },
      });

      currentY += 10;
      if (currentY + 50 > pageHeight) {
        doc.addPage();
        currentY = 15;
      }

      const bottomStartY = currentY;

      // Left Box: Terms & Conditions
      doc.setFillColor(255, 0, 0);
      doc.rect(14, bottomStartY, 105, 7, "F");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(255, 255, 255);
      doc.text("Terms & Conditions:", 18, bottomStartY + 4.8);

      doc.setTextColor(0, 0, 0);
      let termsY = bottomStartY + 12;
      doc.setFontSize(8.5);
      doc.setFont("helvetica", "normal");
      doc.text("Goods Once Sold will not be taken back or exchanged.", 14, termsY);
      termsY += 5;
      doc.text("All disputes subject to HAZARIBAG Jurisdiction only.", 14, termsY);

      // Right Box: Summary Table (Amount)
      const totalsRows = [
        ["Taxable Amount", formatNumber(totalTaxableValue)],
        ["Total CGST", formatNumber(totalCGST)],
        ["Total SGST", formatNumber(totalSGST)],
        ["Grand Total", formatNumber(grandTotal)],
      ];

      autoTable(doc, {
        head: [["Amount", ""]],
        body: totalsRows,
        startY: bottomStartY,
        theme: "grid",
        margin: { left: 126, right: 14 },
        styles: {
          fontSize: 9,
          cellPadding: 2.5,
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
          0: { cellWidth: 38, halign: "left", fontStyle: "normal" },
          1: { cellWidth: 28, halign: "right", fontStyle: "normal" },
        },
      });

      // Signature & Footer Image
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(0, 0, 0);
      doc.text("Authorized Signature", 145, pageHeight - 22);

      if (hasSignature && signImg && signImg.dataUrl) {
        try {
          const signWidth = 36;
          const signHeight = (signImg.height / signImg.width) * signWidth;
          doc.addImage(
            signImg.dataUrl,
            "PNG",
            145,
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
