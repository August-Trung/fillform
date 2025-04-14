const express = require("express");
const router = express.Router();
const {
	parseFormController,
	saveFormController,
	fillFormController,
} = require("./form.controller");

router.post("/parse", parseFormController);
router.post("/save-config", saveFormController);
router.post("/fill", fillFormController);

module.exports = router;
