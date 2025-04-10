const validateFormConfig = (data) => {
	if (!data.formLink || !data.config) {
		throw new Error("Invalid input: formLink and config are required.");
	}
};

module.exports = { validateFormConfig };
