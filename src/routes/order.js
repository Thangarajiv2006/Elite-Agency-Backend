const { createOrder, getOrder } = require("../controllers/order");
const { requireLogin } = require("../middleware/middleware");

const router = require("express").Router();

router.post("/create", requireLogin, createOrder);

router.post("/get", requireLogin, getOrder);

module.exports = router;
