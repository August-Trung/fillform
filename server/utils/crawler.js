const puppeteer = require("puppeteer");

function mapGoogleType(type) {
	switch (type) {
		case 0:
			return "short-text";
		case 1:
			return "paragraph";
		case 2:
			return "multiple-choice";
		case 3:
			return "checkbox";
		case 4:
			return "dropdown";
		case 9:
			return "date";
		default:
			return "unknown";
	}
}

function normalizeText(text) {
	return (
		text
			?.toLowerCase()
			?.normalize("NFD")
			?.replace(/[\u0300-\u036f]/g, "")
			?.replace(/[^a-zA-Z0-9 ]/g, "")
			?.replace(/\s+/g, " ")
			?.trim() || ""
	);
}

async function parseGoogleForm(formLink) {
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

	formLink = toViewForm(formLink);
	const slug = formLink.match(/\/d\/([a-zA-Z0-9_-]+)\//)?.[1] || null;

	const browser = await puppeteer.launch({
		headless: true,
		args: ["--no-sandbox", "--disable-setuid-sandbox"],
	});
	const page = await browser.newPage();
	await page.goto(formLink, { waitUntil: "networkidle2" });

	await page.evaluate(async () => {
		const delay = (ms) => new Promise((res) => setTimeout(res, ms));
		for (let pos = 0; pos < document.body.scrollHeight; pos += 100) {
			window.scrollTo(0, pos);
			await delay(50);
		}
		window.scrollTo(0, 0);
	});
	await new Promise((res) => setTimeout(res, 2000));

	const formData = await page.evaluate(() => {
		return typeof FB_PUBLIC_LOAD_DATA_ !== "undefined"
			? FB_PUBLIC_LOAD_DATA_
			: null;
	});

	const configData = await page.evaluate(() => {
		return {
			isValidCollectEmail: !!document.querySelector(
				'input[type="email"]'
			),
			isValidEditAnswer: !!document.querySelector("a[href*='edit']"),
			isValidLimitRes: document.body.innerText.includes(
				"mỗi người chỉ được gửi một phản hồi"
			),
			isValidPublished: true,
			lang: document.documentElement.lang || "vi",
		};
	});

	const domFields = await page.evaluate(() => {
		const fields = [];
		document.querySelectorAll("form [name^='entry.']").forEach((el) => {
			let rawEntryId = el.name.replace(/_(year|month|day|sentinel)$/, "");
			if (!/^entry\.\d+$/.test(rawEntryId)) return;

			const labelEl = el.closest("div[role='listitem']");
			let label = "";
			if (labelEl) {
				label =
					labelEl
						.querySelector("div[data-item-title]")
						?.innerText?.trim() ||
					labelEl
						.querySelector(
							"div.freebirdFormviewerComponentsQuestionBaseTitle"
						)
						?.innerText?.trim() ||
					labelEl.innerText?.trim() ||
					"";
			}

			if (!fields.find((f) => f.rawEntryId === rawEntryId)) {
				fields.push({ entryId: el.name, rawEntryId, label });
			}
		});
		return fields;
	});

	await browser.close();

	if (!formData || !formData[1] || !Array.isArray(formData[1][1])) {
		throw new Error("Không thể parse dữ liệu từ Google Form.");
	}

	const formTitle =
		formData[1][8]?.trim?.() ||
		formData[1][0]?.trim?.() ||
		"Không rõ tiêu đề";
	const rawFields = formData[1][1];
	const usedEntryIds = new Set();
	const sections = formData[1][10]?.map((section, index) => ({
		id: index,
		index,
	})) || [{ id: 0, index: 0 }];

	function getEntryIdFromDOMFields(field, domFields, usedEntryIds) {
		const cleanedTitle = normalizeText(field.title);
		if (["multiple-choice", "dropdown", "checkbox"].includes(field.type)) {
			const sentinelField = domFields.find((f) => {
				const labelText = normalizeText(
					f.label.replace(/_(sentinel|year|month|day)/g, "")
				);
				return (
					f.entryId.endsWith("_sentinel") &&
					labelText.includes(cleanedTitle)
				);
			});
			if (sentinelField && !usedEntryIds.has(sentinelField.rawEntryId)) {
				return sentinelField.rawEntryId;
			}
		}
		const matchedField = domFields.find((f) => {
			const labelText = normalizeText(
				f.label.replace(/_(sentinel|year|month|day)/g, "")
			);
			const raw = f.rawEntryId;
			if (usedEntryIds.has(raw)) return false;
			return (
				labelText.includes(cleanedTitle) ||
				cleanedTitle.includes(labelText)
			);
		});
		return matchedField?.rawEntryId || null;
	}

	const loaddata = rawFields.map((item, index) => {
		const [
			fieldId,
			titleRaw,
			,
			typeCodeRaw,
			optionsRaw,
			,
			isRequired,
			,
			description,
		] = item;
		const title = titleRaw?.trim?.() || "Không rõ tiêu đề";
		const type = mapGoogleType(typeCodeRaw);
		const isMulti = type === "checkbox" ? 1 : 0;
		const required = isRequired ? 1 : 0;

		let options = [];
		if (
			["multiple-choice", "dropdown", "checkbox"].includes(type) &&
			Array.isArray(optionsRaw?.[0]?.[1])
		) {
			options = optionsRaw[0][1]
				.map((opt) => opt?.[0] ?? "")
				.filter(Boolean);
		}

		const entryId = getEntryIdFromDOMFields(
			{ title, type },
			domFields,
			usedEntryIds
		);
		if (entryId) usedEntryIds.add(entryId);

		return {
			question: title,
			id: fieldId,
			entryId: entryId || null,
			description: description || null,
			type: type,
			isMulti,
			required,
			section: sections?.[0] || { id: 0, index: 0 },
			totalAnswer: 1,
			answer: [
				{
					id: `answer_${fieldId}_0`,
					data: "",
					count: "",
					options: [
						"other (bỏ qua-không điền)",
						"name",
						"email",
						"phone",
						"custom (nội dung tùy chỉnh)",
					],
				},
			],
		};
	});

	const idviewform = formLink.match(/\/e\/([a-zA-Z0-9_-]+)$/)?.[1] || "";
	const now = new Date().toISOString();

	return {
		form: {
			slug,
			idviewform,
			name: formTitle,
			urlMain: `https://docs.google.com/forms/d/${slug}/edit`,
			urlCopy: `https://docs.google.com/forms/d/${slug}/edit`,
			loaddata,
			sections,
			page_histories: [],
			owner: null,
			owner_id: null,
			version: "25.4.1",
			createdAt: now,
			updatedAt: now,
			id: slug,
		},
		latest_form_questions: loaddata,
		config: configData,
		code: 1,
	};
}

module.exports = { parseGoogleForm };
