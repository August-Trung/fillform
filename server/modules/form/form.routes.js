const express = require("express");
const router = express.Router();
const {
	parseFormController,
	saveFormConfigController,
	fillFormController,
} = require("./form.controller");

router.post("/parse", parseFormController);
router.post("/save-config", saveFormConfigController);
router.post("/fill", fillFormController);

module.exports = router;
