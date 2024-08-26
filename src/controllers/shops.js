const shops = require("../models/shops");

exports.createShops = async (req, res) => {
  const shopData = req.body;
  if (
    !shopData.shopName.trim() ||
    !shopData.village.trim() ||
    !shopData.district.trim() ||
    !shopData.state.trim() ||
    !shopData.stateCode.trim() ||
    !shopData.pincode.trim() ||
    !shopData.name.trim() ||
    !shopData.mobile.trim()
  ) {
    return res
      .status(200)
      .json({ errorCode: 99, errorMessage: "FILL ALL INPUTS" });
  } else {
    const data = {
      shopName: shopData.shopName.toUpperCase(),
      name: shopData.name,
      address: {
        village: shopData.village,
        district: shopData.district,
        state: shopData.state,
        stateCode: shopData.stateCode,
        pincode: shopData.pincode,
      },
      mobile: shopData.mobile,
      createdBy: req.agencyDetails._id,
      ...shopData,
    };
    const shopDetails = await shops.create(data).catch((err) => {
      res
        .status(200)
        .json({ errorCode: 100, errorMessage: "Sorry Something Wrong" });
    });
    res.status(201).json(shopDetails);
  }
};

exports.getShops = async (req, res) => {
  const { start, end } = req.body;

  const shopData = await shops
    .find({ createdBy: req.agencyDetails._id })
    .sort({ createdAt: -1 })
    .skip(start)
    .limit(end)
    .catch(() => {
      res
        .status(100)
        .json({ errorCode: 100, errorMessage: "Sorry, Something Wrong!" });
    });

  res.status(200).json(shopData);
};
