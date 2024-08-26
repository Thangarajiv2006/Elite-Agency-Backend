const product = require("../models/product");

exports.createProduct = async (req, res) => {
  const { name, MRP, netPrice, price, HSN, SGST, CGST } = req.body;
  const { filename } = req.file;
  if (
    !name ||
    !MRP ||
    !netPrice ||
    !price ||
    !HSN ||
    !SGST ||
    !CGST ||
    !filename
  ) {
    return res
      .status(200)
      .json({ errorCode: 99, errorMessage: "Fill all the inputs." });
  } else {
    const data = {
      name: name,
      MRP: MRP,
      netPrice: netPrice,
      price: price,
      HSN: HSN,
      CGST: CGST,
      SGST: SGST,
      pic: filename,
      createdBy: req.agencyDetails._id,
    };
    const productDetails = await product.create(data).catch(() => {
      res
        .status(200)
        .json({ errorCode: 100, errorMessage: "Sorry Something Wrong" });
    });

    res.status(201).json(productDetails);
  }
};

exports.getProducts = async (req, res) => {
  const { start, end } = req.body;

  const productsData = await product
    .find({ createdBy: req.agencyDetails._id })
    .sort({ createdAt: -1 })
    .skip(start)
    .limit(end)
    .catch(() => {
      res
        .status(100)
        .json({ errorCode: 100, errorMessage: "Sorry, Something Wrong!" });
    });

  res.status(200).json(productsData);
};
