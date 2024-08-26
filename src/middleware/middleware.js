const jwt = require("jsonwebtoken");

exports.requireLogin = (req, res, next) => {
  if (req.headers.authorization) {
    const token = req.headers.authorization.split(" ")[1];
    const agencyDetails = jwt.verify(token, process.env.JWT_SECRET_KEY);
    req.agencyDetails = agencyDetails.agencyDetails;
  } else {
    return res.status(500).json({ message: "Authorization required" });
  }
  next();
};
