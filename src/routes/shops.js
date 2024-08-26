const { requireLogin } = require("../middleware/middleware");
const { createShops, getShops } = require("../controllers/shops");
const route = require("express").Router();

route.post("/create", requireLogin, createShops);

route.post("/get", requireLogin, getShops);

module.exports = route;
