const mongoose = require("mongoose");

const FormSchema = new mongoose.Schema({
	formLink: { type: String, required: true },
	config: { type: Array, required: true },
	createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Form", FormSchema);
