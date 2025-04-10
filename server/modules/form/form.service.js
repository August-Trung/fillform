// File: server/modules/form/form.service.js
require("dotenv").config();
const Form = require("./form.model");
const { parseGoogleForm } = require("../../utils/crawler");
const { submitGoogleForm } = require("../../utils/submitter");

const parseForm = async (formLink) => {
	const formData = await parseGoogleForm(formLink);
	return formData;
};

const saveFormConfig = async (formLink, config) => {
	const newForm = new Form({ formLink, config });
	await newForm.save();
	return newForm;
};

async function fillFormWithData(formLink, values, config) {
	// Build payload như trước
	const payload = {};
	for (const field of config) {
		if (field.entryId && values[field.variable] != null) {
			payload[field.entryId] = values[field.variable];
		}
	}

	// Gọi submit với timeout 20 s, headless=false khi dev
	const result = await submitGoogleForm(formLink, payload, {
		timeout: 30000,
		headless: false,
		slowMo: 500,
	});

	if (!result.ok) {
		throw new Error(`Không thể submit form: ${result.error}`);
	}
}

module.exports = { parseForm, saveFormConfig, fillFormWithData };
