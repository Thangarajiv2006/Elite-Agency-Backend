const express = require("express");
const app = express();
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
const cookieParser = require("cookie-parser");
require("dotenv").config();

//Data Base Connection conection

mongoose
  .connect(process.env.MongoDB)
  .then(() => console.log("Database connected sucessfully"))
  .catch((err) => console.log(err));

app.use(express.json());
app.use("/api/public/", express.static(path.join(__dirname, "uploads")));
app.use(cookieParser());

const AgencyAuth = require("./routes/agencyRoute/auth");
const shopsRoute = require("./routes/shops");
const productRoute = require("./routes/product");
const orderRoute = require("./routes/order");

//Api Routes
app.use(cors());

app.use("/api/agency/auth", AgencyAuth);
app.use("/api/shops", shopsRoute);
app.use("/api/product", productRoute);
app.use("/api/order", orderRoute);

app.listen(process.env.PORT, () =>
  console.log(`Server running on ${process.env.PORT}`)
);
