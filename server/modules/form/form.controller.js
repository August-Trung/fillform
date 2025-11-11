const { parseForm, saveFormToDB, fillFormWithData } = require("./form.service");

const parseFormController = async (req, res, next) => {
	try {
		const { formLink } = req.body;
		if (!formLink) {
			return res.status(400).json({ error: "Thiếu formLink" });
		}
		const formData = await parseForm(formLink);
		console.log("✅ Dữ liệu form parse được:", formData);
		res.json(formData);
	} catch (error) {
		console.error("❌ Lỗi parseFormController:", error);
		next(error);
	}
};

const saveFormController = async (req, res, next) => {
	try {
		const { form, latest_form_questions, formConfig, fieldConfigs } =
			req.body;
		if (
			!form ||
			!Array.isArray(latest_form_questions) ||
			!formConfig ||
			!Array.isArray(fieldConfigs)
		) {
			return res.status(400).json({ error: "Dữ liệu form không hợp lệ" });
		}

		const savedForm = await saveFormToDB({
			form,
			latest_form_questions,
			formConfig,
			fieldConfigs,
		});

		res.json({ message: "Đã lưu form thành công", data: savedForm });
	} catch (error) {
		console.error("❌ Lỗi saveFormController:", error);
		next(error);
	}
};

const fillFormController = async (req, res, next) => {
	try {
		const { formLink, values, config, options } = req.body;
		await fillFormWithData(formLink, values, config, options);
		res.json({ message: "Đã submit form thành công" });
	} catch (error) {
		console.error("❌ Lỗi fillFormController:", error);
		next(error);
	}
};

module.exports = {
	parseFormController,
	saveFormController,
	fillFormController,
};
