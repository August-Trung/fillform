const mongoose = require("mongoose");

const AnswerOptionSchema = new mongoose.Schema(
	{
		id: String,
		data: String,
		count: String,
		options: [String],
	},
	{ _id: false }
);

const QuestionSchema = new mongoose.Schema(
	{
		question: String,
		id: Number,
		entryId: String,
		description: String,
		type: String,
		isMulti: Number,
		required: Number,
		section: {
			id: Number,
			index: Number,
		},
		totalAnswer: Number,
		answer: [AnswerOptionSchema],
	},
	{ _id: false }
);

const SectionSchema = new mongoose.Schema(
	{
		id: Number,
		index: Number,
	},
	{ _id: false }
);

const FieldConfigSchema = new mongoose.Schema(
	{
		id: Number,
		type: String,
		variable: String,
		question: String,
		options: [String],
		customOptions: {
			defaultCount: Number,
			maxSelect: Number,
			shuffleOptions: Number,
		},
		entryId: String,
		sectionTitle: String,
	},
	{ _id: false }
);

const FormSchema = new mongoose.Schema({
	slug: String,
	idviewform: String,
	name: String,
	urlMain: String,
	urlCopy: String,
	loaddata: [QuestionSchema],
	latest_form_questions: [QuestionSchema],
	sections: [SectionSchema],
	page_histories: [mongoose.Schema.Types.Mixed],
	owner: String,
	owner_id: String,
	version: String,
	formConfig: {
		isValidCollectEmail: Boolean,
		isValidEditAnswer: Boolean,
		isValidLimitRes: Boolean,
		isValidPublished: Boolean,
		lang: String,
	},
	fieldConfigs: [FieldConfigSchema],
	createdAt: { type: Date, default: Date.now },
	updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Form", FormSchema);
