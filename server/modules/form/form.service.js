const Form = require("./form.model");
const { parseGoogleForm } = require("../../utils/crawler");
const submitGoogleForm = require("../../utils/submitter");

const parseForm = async (formLink) => {
	const formData = await parseGoogleForm(formLink);
	return formData;
};

const saveFormConfig = async (formLink, config) => {
	const newForm = new Form({ formLink, config });
	await newForm.save();
	return newForm;
};

const fillFormWithData = async (formLink, values, config) => {
	const payload = {};
	for (const field of config) {
		const { variable, entryId } = field;
		if (entryId && values[variable] !== undefined) {
			payload[entryId] = values[variable];
		}
	}
	console.log("🟡 Payload sẽ gửi:", payload);
	console.log("📮 Form link:", formLink);
	console.log("📋 Config:", config);
	console.log("🧾 Values:", values);

	// Sử dụng Puppeteer để submit form
	await submitGoogleForm(formLink, payload);
};

module.exports = { parseForm, saveFormConfig, fillFormWithData };
