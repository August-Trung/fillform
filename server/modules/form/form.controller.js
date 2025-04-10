const {
	parseForm,
	saveFormConfig,
	fillFormWithData,
} = require("./form.service");
const { validateFormConfig } = require("./form.validator");

const parseFormController = async (req, res, next) => {
	try {
		const { formLink } = req.body;
		console.log("Nhận link từ frontend:", formLink);
		if (!formLink) {
			return res.status(400).json({ error: "Missing formLink" });
		}
		const formData = await parseForm(formLink);
		console.log("✅ BE gửi về FE:", formData); // THÊM DÒNG NÀY
		res.json(formData);
	} catch (error) {
		console.error("❌ BE lỗi parseFormController:", error); // THÊM DÒNG NÀY
		next(error);
	}
};

const saveFormConfigController = async (req, res, next) => {
	try {
		const { formLink, config } = req.body;
		validateFormConfig({ formLink, config });
		const result = await saveFormConfig(formLink, config);
		res.json({ message: "Configuration saved successfully", data: result });
	} catch (error) {
		next(error);
	}
};

const fillFormController = async (req, res, next) => {
	try {
		const { formLink, values, config } = req.body;
		await fillFormWithData(formLink, values, config);
		console.log("🔻 formLink:", req.body.formLink);
		console.log("🔻 values:", req.body.values);
		console.log("🔻 config:", req.body.config);
		res.json({ message: "Form submitted successfully" });
	} catch (error) {
		console.log("🔻 formLink:", req.body.formLink);
		console.log("🔻 values:", req.body.values);
		console.log("🔻 config:", req.body.config);
		console.error("❌ Lỗi fillFormController:", error);
		next(error);
	}
};

module.exports = {
	parseFormController,
	saveFormConfigController,
	fillFormController,
};
