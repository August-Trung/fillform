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

function toViewForm(link) {
	try {
		const url = new URL(link);
		if (!url.pathname.endsWith("/viewform")) {
			url.pathname = url.pathname.replace(
				/\/(edit|response)?$/,
				"/viewform"
			);
		}
		return url.toString();
	} catch {
		return link;
	}
}

const parseBoolEnv = (value, fallback) => {
	if (value === undefined) return fallback;
	if (value === "true" || value === "1") return true;
	if (value === "false" || value === "0") return false;
	return fallback;
};

const toNumber = (value, fallback) => {
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : fallback;
};

const defaultAutomationOptions = {
	timeout: toNumber(process.env.FORM_FILL_TIMEOUT, 60000),
	headless: parseBoolEnv(process.env.FORM_FILL_HEADLESS, false),
	slowMo: toNumber(
		process.env.FORM_FILL_SLOWMO,
		parseBoolEnv(process.env.FORM_FILL_HEADLESS, false) ? 0 : 50
	),
	typingDelay: toNumber(process.env.FORM_FILL_TYPING_DELAY, 20),
};

const fillFormWithData = async (formLink, values, config, options = {}) => {
	formLink = toViewForm(formLink);

	const payload = {};
	for (const field of config) {
		if (field.entryId && values[field.variable] != null) {
			payload[field.entryId] = values[field.variable];
		}
	}

	const automationOptions = {
		timeout: options.timeout ?? defaultAutomationOptions.timeout,
		headless: options.headless ?? defaultAutomationOptions.headless,
		slowMo: options.slowMo ?? defaultAutomationOptions.slowMo,
		typingDelay: options.typingDelay ?? defaultAutomationOptions.typingDelay,
	};

	const result = await submitGoogleForm(
		formLink,
		payload,
		automationOptions
	);

	if (!result.ok) {
		const errMsg = result.error || "Không rõ lỗi";
		const error = new Error(`Không thể submit form: ${errMsg}`);
		if (result.errorCode === "LOGIN_REQUIRED") {
			error.statusCode = 400;
		}
		throw error;
	}
};

module.exports = {
	parseForm,
	saveFormToDB,
	fillFormWithData,
};
