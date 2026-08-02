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

const AdminPrintEstimate = () => {
  const params = useParams();
  const navigate = useNavigate();
  const [quantities, setQuantities] = useState({});
  const [invoiceId, setInvoiceId] = useState(null);
  const [invoice, setInvoice] = useState(null);
  const [billingTo, setBillingTo] = useState("");
  const [advancePayment, setAdvancePayment] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [balancePayment, setBalancePayment] = useState(0);
  const [totalTaxableValue, setTotalTaxableValue] = useState(0);
  const [hasSignature, setHasSignature] = useState(false);
  const [data, setData] = useState([]);
  const [pdfUrl, setPdfUrl] = useState(null);

  const topImageUrl = "/estt.jpg";
  const bottomImageUrl = "/add.jpg";
  const signImageUrl = "/artpoint-sign.png";

  const getInvoiceById = async () => {
    try {
      const res = await axios.post("/api/estimate/get-estimate-by-id", {
        estimateId: params?.estimateId,
      });
      if (res.data.success) {
        const estData = res.data.data;
        setData(estData.products || []);
        setBillingTo(estData.billingTo || {});
        setInvoice(estData.invoice || {});
        setInvoiceId(estData.estimateId);
        setAdvancePayment(estData.advancePayment || 0);
        setDiscount(estData.discount || 0);
        setBalancePayment(estData.balancePayment || 0);
        const isSig =
          estData.hasSignature === true ||
          estData.hasSignature === "true" ||
          estData.hasSignature === 1;
        setHasSignature(isSig);

        const qty = {};
        (estData.products || []).forEach((product, index) => {
          qty[index] = product.quantity || 0;
        });
        setQuantities(qty);
      } else {
        message.error(res.data.message);
      }
    } catch (error) {
      console.error(error);
      message.error("Failed to fetch estimate data.");
    }
  };

  useEffect(() => {
    getInvoiceById();
  }, [params?.estimateId]);

  useEffect(() => {
    if (data && data.length >= 0 && invoiceId) {
      generatePdf();
    }
  }, [data, invoiceId, hasSignature]);

  const [pdfDoc, setPdfDoc] = useState(null);

  useEffect(() => {
    if (invoiceId || params?.estimateId) {
      document.title = invoiceId || params?.estimateId;
    }
  }, [invoiceId, params?.estimateId]);

  const generatePdf = async () => {
    try {
      const doc = new jsPDF("p", "mm", "a4");
      const estTitle = invoiceId || params?.estimateId || "Estimate";
      doc.setProperties({ title: estTitle });
      document.title = estTitle;

      const pageHeight = doc.internal.pageSize.height;

      let currentY = 8;

      // Load images with natural dimensions
      const topImg = await getImageDetails(topImageUrl);
      const bottomImg = await getImageDetails(bottomImageUrl);
      const signImg = hasSignature ? await getImageDetails(signImageUrl) : null;

      // Header Image
      try {
        doc.addImage(topImg.dataUrl, "JPEG", 8, currentY, 195, 60);
      } catch (e) {
        console.error("Failed to add top header image:", e);
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

      // Row 3: Matter Name & Mobile
      doc.text("Matter Name:", 14, currentY);
      doc.text(billingTo?.matterName || "", 42, currentY);

      doc.text("Mobile:", 135, currentY);
      doc.text(billingTo?.mobile || "", 160, currentY);
      currentY += 8;

      // Calculate total taxable value
      let calculatedTotal = 0;
      data.forEach((item, index) => {
        const sqft = item.length * item.breadth * (quantities[index] || 0);
        calculatedTotal += sqft * item.price;
      });
      setTotalTaxableValue(calculatedTotal);

      // Main Table
      const tableRows = data.map((item, index) => {
        const sqft = item.length * item.breadth * (quantities[index] || 0);
        const itemTotal = sqft * item.price;

        return [
          index + 1,
          item?.name,
          `${item.length || 0} x ${item.breadth || 0}`,
          quantities[index] || item.quantity || 0,
          formatNumber(sqft),
          formatNumber(item.price),
          formatNumber(itemTotal),
        ];
      });

      autoTable(doc, {
        head: [["Sr No", "Product Details", "Size", "Qty", "Total Sqft", "Rate", "Total Value"]],
        body: tableRows,
        startY: currentY,
        theme: "grid",
        showHead: "everyPage",
        margin: { left: 14, right: 14 },
        styles: {
          fontSize: 9,
          cellPadding: 3,
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
          fontSize: 9.5,
          lineWidth: 0.2,
          lineColor: [220, 220, 220],
          halign: "center",
          valign: "middle",
        },
        columnStyles: {
          0: { cellWidth: 12, halign: "center" },
          1: { cellWidth: 74, halign: "left" },
          2: { cellWidth: 20, halign: "center" },
          3: { cellWidth: 14, halign: "center" },
          4: { cellWidth: 20, halign: "center" },
          5: { cellWidth: 18, halign: "center" },
          6: { cellWidth: 24, halign: "center" },
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
            let y = d.cell.y + d.cell.padding("top") + 3.2;

            lines.forEach((line, idx) => {
              if (idx === 0) {
                doc.setFont("helvetica", "bold");
                doc.setFontSize(9);
              } else {
                doc.setFont("helvetica", "normal");
                doc.setFontSize(8.5);
              }
              doc.text(line, x, y);
              y += 4;
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
        ["Total Value", formatNumber(calculatedTotal)],
        ["Advance Payment", formatNumber(advancePayment)],
        ["Rounding Off", formatNumber(discount)],
        ["Balance Payment", formatNumber(balancePayment)],
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
          onClick={() => navigate("/admin-estimate")}
          className="btn btn-secondary shadow-sm"
        >
          Back to List
        </button>
        {pdfDoc && (
          <button
            onClick={() =>
              pdfDoc.save(`${invoiceId || params?.estimateId || "Estimate"}.pdf`)
            }
            className="btn btn-primary shadow-sm"
          >
            Download PDF
          </button>
        )}
      </div>

      {pdfUrl ? (
        <iframe
          src={pdfUrl}
          title={invoiceId || params?.estimateId || "Estimate PDF"}
          style={{ width: "100%", height: "100vh", border: "none" }}
        />
      ) : (
        <div className="d-flex justify-content-center align-items-center vh-100">
          <h4>Generating Estimate PDF...</h4>
        </div>
      )}
    </div>
  );
};

export default AdminPrintEstimate;
