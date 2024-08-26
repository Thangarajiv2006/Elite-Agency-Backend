const crypto = require("crypto");

function generateUnique6DigitNumber() {
  const hash = crypto
    .createHash("sha256")
    .update(Date.now().toString())
    .digest("hex");
  return (Number(hash.slice(0, 6)) % 900000) + 100000; // Ensure it's 6 digits
}

function formatDateToDDMMYYYY(date) {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0"); // getMonth() is zero-based
  const year = date.getFullYear();

  return `${day}-${month}-${year}`;
}

const calculatePersentage = (taxable, persentage) => {
  return parseFloat(((taxable * persentage) / 100).toFixed(2));
};

const tableElement = (data) => {
  let element = "";
  let grandTotal = 0;

  for (let i = 0; i < data.length; i++) {
    const product = data[i];
    const taxable = parseFloat(
      (product._doc.price * product.quentity).toFixed(2)
    );
    const CGST = calculatePersentage(taxable, product._doc.CGST);
    const SGST = calculatePersentage(taxable, product._doc.SGST);
    const discount = calculatePersentage(
      taxable + CGST + SGST,
      product.discount
    );
    const total = parseFloat((taxable + CGST + SGST - discount).toFixed(2));

    const rowHTML = `
    <tr>
              <td>${product._doc.MRP}</td>
              <td>${i + 1}</td>
              <td>${product._doc.name}</td>
              <td>${product.quentity}</td>
              <td>${product.free}</td>
              <td>${product._doc.price}</td>
              <td>${taxable}</td>
              <td>${product._doc.HSN}</td>
              <td>${product.discount}</td>
              <td>${product._doc.CGST + product._doc.SGST}</td>
              <td>${CGST}</td>
              <td>${SGST}</td>
              <td>${total}</td>
            </tr>
    `;
    element += rowHTML;
    grandTotal += total;
  }
  return {
    JSX: element,
    grandTotal: grandTotal,
  };
};

const numToINCurrency = (amount) => {
  const formattedAmount = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
  }).format(amount);
  return formattedAmount;
};

exports.billLayout = (agencyDetails, shopData, productData) => {
  const date = new Date();

  const tableRows = tableElement(productData);

  return `
    <html>
      <head>
        <style>
@import url("https://fonts.googleapis.com/css2?family=Poppins:ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,100;1,200;1,300;1,400;1,500;1,600;1,700;1,800;1,900&display=swap");

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
  font-family: "Poppins", sans-serif;
}

.app {
  /* display: flex; */
  align-items: center;
  justify-content: center;
  /* width: 100vw; */
  /* height: 100vh; */
  padding: 10px;
  border: 1px solid;
}

.app .container {
  width: 100%;
  height: min-content;
  border: 1px solid;
}

.app .container .header {
  width: 100%;
  height: 100px;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  border-bottom: 1px solid black;
}

.app .container .header .subHeader {
  width: 100%;
  height: 100%;
  border-left: 1px solid;
  padding-left: 10px;
}

.app .container .header .subHeader.invoice {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-around;
  font-weight: 500;
}

.app .container .header .subHeader p.head {
  font-weight: 700;
}
.app .container .header .subHeader p {
  font-size: 10px;
}

.app .container .header .subHeader:first-child {
  border: none;
}

table {
  width: 100%;
  height: min-content;
  border-bottom: 1px solid;
  border-collapse: collapse;
}

tr {
  height: 35px;
}

table thead tr th {
  font-size: 13px;
  border-right: 1px solid;
  border-collapse: collapse;
}

table thead tr th:first-child {
  width: 5%;
}

table thead tr th:nth-child(2) {
  width: 1%;
}
table thead tr th:nth-child(3) {
  width: 25%;
}
table thead tr th:nth-child(4) {
  width: 4%;
}
table thead tr th:nth-child(5) {
  width: 4%;
}
table thead tr th:nth-child(6) {
  width: 7%;
}
table thead tr th:nth-child(7) {
  width: 8%;
}

table thead tr th:nth-child(8) {
  width: 14%;
}

table thead tr th:nth-child(9) {
  width: 4%;
}
table thead tr th:nth-child(10) {
  width: 4%;
}
table thead tr th:nth-child(11) {
  width: 8%;
}
table thead tr th:nth-child(12) {
  width: 8%;
}
table thead tr th:last-child {
  width: 12%;
  border: none;
}

table tbody {
  border-top: 1px solid black;
}

table tbody tr td {
  border-right: 1px solid;
  border-bottom: 1px solid;
  vertical-align: middle;
  text-align: center;
  padding: 9px;
  font-size: 10px;
}

table tbody tr td:last-child {
  border-right: none;
  text-align: end;
}

.app .container .footer {
  width: 100%;
  height: 58px;
  font-size: 12px;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  padding-right: 15px;
}

.app .container .footer .fooContainer {
  display: flex;
  width: 180px;
  justify-content: space-between;
}


        </style>
      </head>
      <body>
      <div class="app">
      <div class="container">
        <div class="header">
          <div class="subHeader">
            <p class="head">${agencyDetails.AgencyName}SVV Agency</p>
            <p>${agencyDetails.address.houseNo}, ${
    agencyDetails.address.street
  }</p>
            <p>${agencyDetails.address.village} - ${
    agencyDetails.address.pincode
  }</p>
            <p>${agencyDetails.mobile}</p>
            <p>GSTIN: ${agencyDetails.GSTIN}</p>
            <p>FSSAI: ${agencyDetails.FSSAI}</p>
          </div>
          <div class="subHeader">
            <p class="head">${shopData.shopName}</p>
            <p>${shopData.address.village} - ${shopData.address.pincode}</p>
            <p>${shopData.mobile}</p>
            <p>GSTIN: ${shopData.GSTIN ?? ""}</p>
            <p>FSSAI: ${shopData.FSSAI ?? ""}</p>
          </div>
          <div class="subHeader invoice">
            <p class="head">INVOICE DETAILS</p>
            <div>
              <p>Invoice No: ${Date.now()}</p>
              <p>Invoice Date: ${formatDateToDDMMYYYY(date)}</p>
            </div>
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th>MRP</th>
              <th>S.NO</th>
              <th>PRODUCTS</th>
              <th>QTY</th>
              <th>FREE</th>
              <th>PRICE</th>
              <th>TAXABLE</th>
              <th>HSN</th>
              <th>DIS%</th>
              <th>GST%</th>
              <th>CGST AMT</th>
              <th>SGST AMT</th>
              <th>TOTAL</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows.JSX}
          </tbody>
        </table>
        <div class="footer">
          <div class="fooContainer">
            <div class="head">Total: </div>
            <div class="p">${numToINCurrency(tableRows.grandTotal)}</div>
          </div>
          <div class="fooContainer">
            <div class="head">Round off:</div>
            <div class="p">${numToINCurrency(
              Math.ceil(tableRows.grandTotal) - tableRows.grandTotal
            )}</div>
          </div>
          <div class="fooContainer">
            <div class="head">Grand Total:</div>
            <div class="p">${numToINCurrency(
              Math.ceil(tableRows.grandTotal)
            )}</div>
          </div>
        </div>
      </div>
    </div>
      </body>
    </html>
    `;
};
