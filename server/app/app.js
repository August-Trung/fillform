const express = require("express");
const formRoutes = require("../modules/form/form.routes");
const errorHandler = require("../middlewares/errorHandler");
const cors = require("cors");
const bodyParser = require("body-parser");

const app = express();

// Sử dụng các middleware toàn cục
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Định tuyến
app.use("/api/form", formRoutes);

// Middleware xử lý lỗi
app.use(errorHandler);

module.exports = app;
