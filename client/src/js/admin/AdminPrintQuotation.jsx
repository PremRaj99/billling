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
  const [pdfUrl, setPdfUrl] = useState(null);

  const topImageUrl = "/quoo.jpg";
  const bottomImageUrl = "/add.jpg";

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

  const generatePdf = async () => {
    try {
      const doc = new jsPDF("p", "mm", "a4");
      const pageHeight = doc.internal.pageSize.height;

      let currentY = 8;

      // Load images with natural dimensions
      const topImg = await getImageDetails(topImageUrl);
      const bottomImg = await getImageDetails(bottomImageUrl);

      // Header Image
      try {
        doc.addImage(topImg.dataUrl, "JPEG", 8, currentY, 195, 60);
      } catch (e) {
        console.error("Failed to add header image:", e);
      }
      currentY += 68;

      // Ref and Date
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text(`REF: ${invoiceId || ""}`, 14, currentY);

      const formattedDate = invoice?.createdAt
        ? new Intl.DateTimeFormat("en-IN", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
          }).format(new Date(invoice.createdAt))
        : "";
      doc.text(`Date: ${formattedDate}`, 140, currentY);
      currentY += 8;

      // Billing Details
      doc.setFont("helvetica", "bold");
      doc.text("To,", 14, currentY);
      doc.setFont("helvetica", "normal");
      currentY += 6;

      if (billingTo?.name) {
        doc.text(billingTo.name, 14, currentY);
        currentY += 6;
      }
      if (billingTo?.address) {
        doc.text(billingTo.address, 14, currentY);
        currentY += 6;
      }

      // Table Columns
      const tableColumns = [
        { title: "Sr No", dataKey: "srNo" },
        { title: "Product Details", dataKey: "productDetails" },
        { title: "Rate", dataKey: "rate" },
      ];

      const tableRows = data.map((item, index) => ({
        srNo: index + 1,
        productDetails: formatParticularsForPdf(item?.name),
        rate: formatNumber(item?.price),
      }));

      autoTable(doc, {
        columns: tableColumns,
        body: tableRows,
        startY: currentY + 2,
        theme: "grid",
        margin: { top: 10, left: 10, right: 10 },
        styles: {
          fontSize: 9,
          cellPadding: 3,
          textColor: "#000000",
          fillColor: "#FFFFFF",
          overflow: "linebreak",
        },
        headStyles: {
          fillColor: "#19a9e6",
          textColor: "#FFFFFF",
          fontStyle: "bold",
          fontSize: 9,
        },
        columnStyles: {
          0: { cellWidth: 20 },
          1: { cellWidth: 140 },
          2: { cellWidth: 30, halign: "right" },
        },
        didDrawPage: (d) => {
          currentY = d.cursor.y;
        },
      });

      currentY += 12;
      if (currentY + 30 > pageHeight) {
        doc.addPage();
        currentY = 15;
      }

      doc.setFont("helvetica", "bolditalic");
      doc.setFontSize(10);
      doc.setTextColor(220, 53, 69);
      doc.text("GST Charge Extra", 14, currentY);

      doc.setTextColor(0, 0, 0);

      // Bottom Image and Signature
      try {
        doc.addImage(bottomImg.dataUrl, "JPEG", 8, pageHeight - 16, 195, 10);
      } catch (e) {
        console.error("Failed to add bottom image:", e);
      }

      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.text("Authorized Signature", 150, pageHeight - 16);

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
          onClick={() => navigate("/admin-quotation")}
          className="btn btn-secondary shadow-sm"
        >
          Back to List
        </button>
      </div>

      {pdfUrl ? (
        <iframe
          src={pdfUrl}
          title="Quotation PDF"
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
