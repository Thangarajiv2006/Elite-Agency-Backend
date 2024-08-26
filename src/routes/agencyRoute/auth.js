const router = require("express").Router();
const { signup, login } = require("../../controllers/Agency/auth");
const { requireLogin } = require("../../middleware/middleware");
const agencyData = require("../../models/agency");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

router.post("/sign-up", signup);

router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (email && password) {
    const existUser = await agencyData.findOne({ email: email });
    if (existUser) {
      const checkPassword = await bcrypt.compare(password, existUser.password);
      if (checkPassword) {
        const token = jwt.sign(
          { agencyDetails: existUser },
          process.env.JWT_SECRET_KEY,
          { expiresIn: "1d" }
        );

        return res.status(201).json({ token: token, agencyDetails: existUser });
      } else {
        return res
          .status(200)
          .json({ errorCode: 103, errorMessage: "Incorrect Password" });
      }
    } else {
      return res
        .status(200)
        .json({ errorCode: 102, errorMessage: "User not found" });
    }
  } else {
    return res
      .status(200)
      .json({ errorCode: 99, errorMessage: "Fill all elements" });
  }
});

router.post("/isAldreadyLogin", (req, res) => {
  if (req.body.token) {
    const token = req.body.token;
    const agencyDetails = jwt.verify(token, process.env.JWT_SECRET_KEY);
    return res
      .status(201)
      .json({ token: token, agencyDetails: agencyDetails.agencyDetails });
  } else {
    return res.status(500).json({ message: "Authorization required" });
  }
});

module.exports = router;
