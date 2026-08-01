import React, { useEffect, useRef, useState } from "react";
import AdminLayout from "./components/AdminLayout";
import axios from "axios";
import { message } from "antd";
import { useParams } from "react-router-dom";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
// import { useReactToPrint } from "react-to-print";
import "./AdminAddInvoice.css";
import "./AdminPrint.css";
import { formatNumber } from "../components/numberUtils";

const renderParticulars = (nameStr) => {
  if (!nameStr) return null;
  const lines = String(nameStr)
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) return null;
  const [mainTitle, ...subItems] = lines;
  return (
    <div>
      <div style={{ fontWeight: 500 }}>{mainTitle}</div>
      {subItems.length > 0 && (
        <ul
          style={{
            margin: "4px 0 0 0",
            paddingLeft: "15px",
            fontSize: "0.9em",
            textAlign: "left",
            listStyleType: "disc",
            listStylePosition: "inside",
          }}
        >
          {subItems.map((sub, idx) => (
            <li
              style={{
                listStyleType: "disc",
                display: "list-item",
              }}
              key={idx}
            >
              {sub}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

const AdminEditQuotation = () => {
  const params = useParams();
  // const componentRef = useRef();
  const pdfRef = useRef();
  const [quantities, setQuantities] = useState({});
  const [invoiceId, setInvoiceId] = useState(null);
  const [invoice, setInvoice] = useState(null);
  const [billingTo, setBillingTo] = useState("");
  const [totalTaxableValue, setTotalTaxableValue] = useState(0);
  const [data, setData] = useState([]);



  async function getInvoiceById() {
    try {
      const res = await axios.post("/api/quotation/get-quotation-by-id", {
        quotationId: params?.quotationId,
      });
      if (res.data.success) {
        setData(res.data.data.products);
        setBillingTo(res.data.data.billingTo);
        setInvoice(res.data.data.invoice);
        setInvoiceId(res.data.data.quotationId);
        const qty = {};
        res.data.data.products.forEach((product, index) => {
          const { quantity } = product;
          qty[index] = quantity;
        });
        setQuantities(qty);
      } else {
        message.error(res.data.message);
      }
    } catch (error) {
      console.log(error);
    }
  }

  useEffect(() => {
    getInvoiceById();
  }, []);

  // Calculate Total Taxable Value, CGST, SGST, and Grand Total
  useEffect(() => {
    let taxableValue = 0;
    let cgst = 0;
    let sgst = 0;
    data.forEach((item, index) => {
      const sqft = item.length * item.breadth * (quantities[index] || 0);
      const subtotal = sqft * item.price;
      const itemCGST = (subtotal * item.cgst) / 100;
      const itemSGST = (subtotal * item.sgst) / 100;

      taxableValue += subtotal;
      cgst += itemCGST;
      sgst += itemSGST;
    });
    setTotalTaxableValue(taxableValue);
  }, [data, quantities]);

  //! PDF
  function downloadPdf() {
    const input = pdfRef.current;
    if (input) {
      html2canvas(input, { scale: 2 }).then((canvas) => {
        const imgData = canvas.toDataURL("image/png");
        const pdf = new jsPDF("p", "mm", "a4", true);
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const imgWidth = canvas.width;
        const imgHeight = canvas.height;
        const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
        const imgX = (pdfWidth - imgWidth * ratio) / 2;
        const imgY = 0;
        pdf.addImage(
          imgData,
          "PNG",
          imgX,
          imgY,
          imgWidth * ratio,
          imgHeight * ratio
        );
        pdf.save(`${params?.quotationId}`);
        window.close();
      });
    } else {
      console.error("PDF reference is not available.");
    }
  }

  setTimeout(() => {
    downloadPdf();
  }, 1000);

  const dateObject = new Date(invoice?.createdAt);
  const day = dateObject.getDate();
  const month = dateObject.toLocaleString("default", { month: "long" });
  const year = dateObject.getFullYear();
  const formattedDate = `${day} ${month} ${year}`;

  
  return (
    <AdminLayout>
      <div
        className="preview-container"
        ref={pdfRef}
        // ref={componentRef}
      >
        <div className="invoice-container preview">
          <div className="invoice-img quotaion-img"></div>
          <div className="ref-and-date">
            <div className="ref">
              <h5 className="m-0">REF:{invoiceId}</h5>
            </div>
            <div className="qdate">
              <div className="center gap-2 form-fields">
                <h5 className="m-0">Date:</h5>
                <h5 className="m-0">{formattedDate}</h5>
              </div>
            </div>
          </div>
          {/* Billing Details */}
          <div className="bill-to-details">
            <div className="center mb-3">
              <h5 className="m-0 me-2">To,</h5>
            </div>
            <div className="form-fields mb-3 center">
              <h5 className="w-100 m-0 text-start">{billingTo?.name}</h5>
            </div>
            <div className="form-fields mb-3 center">
              <h5 className="m-0 w-100 text-start">{billingTo?.address}</h5>
            </div>
          </div>
          {/* Invoice Details  */}
          <div className="product-details quot">
            <table className="table tb table-bordered">
              <thead>
                <tr>
                  <th>
                    <small>Sr No</small>
                  </th>
                  <th>
                    <small>Product Details</small>
                  </th>
                  <th>
                    <small>Rate</small>
                  </th>
                </tr>
              </thead>
              <tbody>
                {data &&
                  data?.map((item, index) => {
                    return (
                      <tr key={index}>
                        <td>{index + 1}</td>
                        <td>{renderParticulars(item?.name)}</td>
                        <td>{item?.price}</td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
          <div className="address-container w-100">
            <div className="address">
              <h5 className="text-danger">
                <i>GST Charge Extra</i>
              </h5>
              <b>Authorized Signature</b>
            </div>
            <div className="add-img"></div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminEditQuotation;
