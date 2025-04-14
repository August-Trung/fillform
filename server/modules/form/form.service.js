const Form = require("./form.model");
const { parseGoogleForm } = require("../../utils/crawler");
const { submitGoogleForm } = require("../../utils/submitter");

const parseForm = async (formLink) => {
	const formData = await parseGoogleForm(formLink);
	return {
		...formData,
		formConfig: formData.config,
		// bỏ fieldConfigs ở bước parse
	};
};

async function saveFormToDB({
	form,
	latest_form_questions,
	formConfig,
	fieldConfigs,
}) {
	const { id, ...formWithoutId } = form;

	const formDoc = new Form({
		...formWithoutId,
		latest_form_questions,
		formConfig,
		fieldConfigs,
	});
	await formDoc.save();
	return formDoc;
}

const fillFormWithData = async (formLink, values, config) => {
	const payload = {};
	for (const field of config) {
		if (field.entryId && values[field.variable] != null) {
			payload[field.entryId] = values[field.variable];
		}
	}

	const result = await submitGoogleForm(formLink, payload, {
		timeout: 30000,
		headless: false,
		slowMo: 500,
	});

	if (!result.ok) {
		throw new Error(`Không thể submit form: ${result.error}`);
	}
};

module.exports = {
	parseForm,
	saveFormToDB,
	fillFormWithData,
};
