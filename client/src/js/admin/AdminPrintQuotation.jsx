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

const AdminPrintQuotation = () => {
  const params = useParams();
  const navigate = useNavigate();
  const [invoiceId, setInvoiceId] = useState(null);
  const [invoice, setInvoice] = useState(null);
  const [billingTo, setBillingTo] = useState("");
  const [data, setData] = useState([]);
  const [hasSignature, setHasSignature] = useState(false);
  const [pdfUrl, setPdfUrl] = useState(null);

  const topImageUrl = "/quoo.jpg";
  const bottomImageUrl = "/add.jpg";
  const signImageUrl = "/artpoint-sign.png";

  const getInvoiceById = async () => {
    try {
      const res = await axios.post("/api/quotation/get-quotation-by-id", {
        quotationId: params?.quotationId,
      });
      if (res.data.success) {
        const qData = res.data.data;
        setData(qData.products || []);
        setBillingTo(qData.billingTo || {});
        setInvoice(qData.invoice || {});
        setInvoiceId(qData.quotationId);
        setHasSignature(Boolean(qData.hasSignature));
      } else {
        message.error(res.data.message);
      }
    } catch (error) {
      console.error(error);
      message.error("Failed to fetch quotation data.");
    }
  };

  useEffect(() => {
    getInvoiceById();
  }, [params?.quotationId]);

  useEffect(() => {
    if (data && data.length >= 0 && invoiceId) {
      generatePdf();
    }
  }, [data, invoiceId]);

  const formatParticularsForPdf = (nameStr) => {
    if (!nameStr) return "";
    const lines = String(nameStr)
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length === 0) return "";
    const [mainTitle, ...subItems] = lines;
    if (subItems.length === 0) return mainTitle;
    const bulletedSubs = subItems.map((sub) => `  • ${sub}`).join("\n");
    return `${mainTitle}\n${bulletedSubs}`;
  };

  const [pdfDoc, setPdfDoc] = useState(null);

  useEffect(() => {
    if (invoiceId || params?.quotationId) {
      document.title = invoiceId || params?.quotationId;
    }
  }, [invoiceId, params?.quotationId]);

  const generatePdf = async () => {
    try {
      const doc = new jsPDF("p", "mm", "a4");
      const quoTitle = invoiceId || params?.quotationId || "Quotation";
      doc.setProperties({ title: quoTitle });
      document.title = quoTitle;
      const pageHeight = doc.internal.pageSize.height;

      let currentY = 8;

      // Load images
      const topImg = await getImageDetails(topImageUrl);
      const bottomImg = await getImageDetails(bottomImageUrl);
      const signImg = await getImageDetails(signImageUrl);

      // Header Image Banner
      try {
        doc.addImage(topImg.dataUrl, "JPEG", 8, currentY, 195, 60);
      } catch (e) {
        console.error("Failed to add header image:", e);
      }
      currentY += 68;

      // Ref and Date
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0, 0, 0);

      doc.text(`Ref.  ${invoiceId || ""}`, 14, currentY);
      doc.setLineWidth(0.3);
      doc.line(24, currentY + 1, 65, currentY + 1);

      const formattedDate = invoice?.createdAt
        ? new Intl.DateTimeFormat("en-GB", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        }).format(new Date(invoice.createdAt)).replace(/\//g, "-")
        : new Intl.DateTimeFormat("en-GB", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        }).format(new Date()).replace(/\//g, "-");

      doc.text(`Date  ${formattedDate}`, 140, currentY);
      doc.line(152, currentY + 1, 190, currentY + 1);
      currentY += 10;

      // To Section
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text("To,", 16, currentY);
      currentY += 6;

      if (billingTo?.name) {
        doc.setFont("helvetica", "bolditalic");
        doc.setFontSize(11);
        doc.text(billingTo.name, 22, currentY);
        currentY += 5;
      }
      if (billingTo?.address) {
        doc.setFont("helvetica", "italic");
        doc.setFontSize(10);
        doc.text(billingTo.address, 22, currentY);
        currentY += 6;
      }

      currentY += 4;

      // Table Columns
      const tableColumns = [
        { title: "S. No.", dataKey: "srNo" },
        { title: "Product Details", dataKey: "productDetails" },
        { title: "Rate", dataKey: "rate" },
      ];

      const tableRows = data.map((item, index) => {
        let rateStr = "-";
        if (item?.price != null && item?.price !== "") {
          const formatted = String(formatNumber(item.price)).trim();
          rateStr = formatted.endsWith("/-") ? formatted : `${formatted}/-`;
        }
        return {
          srNo: index + 1,
          productDetails: formatParticularsForPdf(item?.name),
          rate: rateStr,
        };
      });

      autoTable(doc, {
        head: [["S. No.", "Product Details", "Rate"]],
        body: tableRows.map((row) => [row.srNo, row.productDetails, row.rate]),
        startY: currentY,
        theme: "grid",
        showHead: "everyPage",
        margin: { left: 16, right: 16 },
        styles: {
          fontSize: 9.5,
          cellPadding: 3,
          textColor: [0, 0, 0],
          fillColor: [255, 255, 255],
          lineWidth: 0.2,
          lineColor: [0, 0, 0],
          overflow: "linebreak",
        },
        headStyles: {
          fillColor: [25, 169, 230],
          textColor: [255, 255, 255],
          fontStyle: "bold",
          fontSize: 10,
          lineWidth: 0.2,
          lineColor: [0, 0, 0],
          halign: "center",
          valign: "middle",
        },
        columnStyles: {
          0: { cellWidth: 16, halign: "center" },
          1: { cellWidth: 126, halign: "left" },
          2: { cellWidth: 36, halign: "center" },
        },
        willDrawCell: (data) => {
          if (data.section === "body" && data.column.index === 1) {
            data.cell.customTextLines = [...data.cell.text];
            data.cell.text = [];
          }
        },
        didDrawCell: (data) => {
          if (
            data.section === "body" &&
            data.column.index === 1 &&
            data.cell.customTextLines &&
            data.cell.customTextLines.length > 0
          ) {
            const lines = data.cell.customTextLines;
            const x = data.cell.x + data.cell.padding("left");
            let y = data.cell.y + data.cell.padding("top") + 3.2;

            lines.forEach((line, idx) => {
              if (idx === 0) {
                doc.setFont("helvetica", "bold");
                doc.setFontSize(9.5);
              } else {
                doc.setFont("helvetica", "normal");
                doc.setFontSize(9);
              }
              doc.text(line, x, y);
              y += 4.2;
            });
          }
        },
        didDrawPage: (d) => {
          currentY = d.cursor.y;
        },
      });

      currentY += 12;

      // Red Note at Bottom Left
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(200, 0, 0);
      doc.text("Note:- GST Extra", 16, pageHeight - 24);

      // Signature Stamp at Bottom Right
      if (hasSignature && signImg && signImg.dataUrl) {
        try {
          const signWidth = 36;
          const signHeight = (signImg.height / signImg.width) * signWidth;
          doc.addImage(
            signImg.dataUrl,
            "PNG",
            150,
            pageHeight - 20 - signHeight,
            signWidth,
            signHeight
          );
        } catch (e) {
          console.error("Failed to add signature image:", e);
        }
      }

      // Footer Banner Image
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
            onClick={() =>
              pdfDoc.save(`${invoiceId || params?.quotationId || "Quotation"}.pdf`)
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
          title={invoiceId || params?.quotationId || "Quotation PDF"}
          style={{ width: "100%", height: "100vh", border: "none" }}
        />
      ) : (
        <div className="d-flex justify-content-center align-items-center vh-100">
          <h4>Generating Quotation PDF...</h4>
        </div>
      )}
    </div>
  );
};

export default AdminPrintQuotation;
