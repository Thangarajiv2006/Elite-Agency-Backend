const order = require("../models/order");
const productData = require("../models/product");
const shopData = require("../models/shops");
const { billLayout } = require("../pdf/pdf");
const { generatePDF } = require("../utils/puppeteer");
const short = require("short-uuid");

exports.createOrder = async (req, res) => {
  for (let i = 0; i < req.body.orderedProducts.length; i++) {
    const element = req.body.orderedProducts[i];
    if (!element.quentity.trim()) {
      return res
        .status(200)
        .json({ errorCode: 99, errorMessage: "Pealse Fill Quentities" });
    }
  }

  if (req.body.orderedProducts.length == 0) {
    return res
      .status(200)
      .json({ errorCode: 99, errorMessage: "Pealse Fill Quentities" });
  }
  const shop = await shopData.findById(req.body.shop);
  let products = [];
  for (let i = 0; i < req.body.orderedProducts.length; i++) {
    const element = req.body.orderedProducts[i];
    let product = await productData.findById(element.product);

    const data = {
      ...product,
      free: parseInt(element.free),
      quentity: parseInt(element.quentity),
      discount: parseInt(element.discount),
    };
    products.push(data);
  }

  let location = `${shop.shopName}${short.generate()}`;
  let isCreated = false;

  const html = billLayout(req.agencyDetails, shop, products);
  await generatePDF(html, location)
    .then(() => {
      isCreated = false;
    })
    .catch((err) => {
      console.log(err);
      return res
        .status(200)
        .json({ errorCode: 100, errorMessage: "Sorry Something went wrong!" });
    });

  if (isCreated) {
    return res
      .status(200)
      .json({ errorCode: 100, errorMessage: "Sorry Something went wrong!" });
  }

  let product = [];
  for (let i = 0; i < req.body.orderedProducts.length; i++) {
    const element = req.body.orderedProducts[i];
    const data = {
      product: element.product,
      free: parseInt(element.free),
      quentity: parseInt(element.quentity),
      discount: parseInt(element.discount),
    };
    product.push(data);
  }
  const data = {
    orderedProducts: product,
    createdBy: req.agencyDetails._id,
    shop: req.body.shop,
    pdf: location,
  };

  const createdOrder = await (
    await (await order.create(data)).populate("orderedProducts.product")
  )
    .populate("shop")
    .catch((err) => {
      console.log(err);
      return res
        .status(200)
        .json({ errorCode: 100, errorMessage: "Sorry Something went wrong!" });
    });
  res.status(201).json(createdOrder);
};

exports.getOrder = async (req, res) => {
  const { start, end } = req.body;

  const orderData = await order
    .find({ createdBy: req.agencyDetails._id })
    .sort({ createdAt: -1 })
    .skip(start)
    .limit(end)
    .populate("orderedProducts.product")
    .populate("shop")
    .catch(() => {
      res
        .status(100)
        .json({ errorCode: 100, errorMessage: "Sorry, Something Wrong!" });
    });

  res.status(200).json(orderData);
};
