const bcrypt = require("bcrypt");
const agencyData = require("../../models/agency");
const jwt = require("jsonwebtoken");

exports.signup = async (req, res) => {
  const agencyExist = await agencyData
    .findOne({ email: req.body.email })
    .catch(() =>
      res
        .status(200)
        .json({ errorCode: 100, errorMessage: "Sorry Somthing Wrong" })
    );

  if (agencyExist) {
    res
      .status(200)
      .json({ errorCode: 101, errorMessage: "Email Aldready Exist" });
  } else {
    const password = await bcrypt.hash(req.body.password, 10);
    const formData = {
      AgencyName: req.body.agencyName,
      name: req.body.name,
      password: password,
      address: {
        houseNo: req.body.houseNo,
        street: req.body.street,
        village: req.body.village,
        district: req.body.district,
        state: req.body.state,
        stateCode: req.body.stateCode,
        pincode: req.body.pincode,
      },
      FSSAI: req.body.FSSAI,
      GSTIN: req.body.GSTIN,
      PAN: req.body.PAN,
      mobile: req.body.mobile,
      email: req.body.email,
    };
    await agencyData
      .create(formData)
      .then((data) => {
        res.status(201).json(data);
      })
      .catch((err) => {
        return res
          .status(200)
          .json({ errorCode: 100, errorMessage: "Sorry Somthing Wrong" });
      });
  }
};
