const { createProduct, getProducts } = require("../controllers/product");
const { requireLogin } = require("../middleware/middleware");
const uploads = require("../utils/multer");

const router = require("express").Router();

router.post("/create", requireLogin, uploads.single("pic"), createProduct);
router.post("/get", requireLogin, getProducts);

module.exports = router;
