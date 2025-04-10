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

async function parseGoogleForm(formLink) {
	try {
		function toViewForm(link) {
			try {
				const url = new URL(link);
				// Đảm bảo luôn là đường dẫn đến /viewform
				if (!url.pathname.endsWith("/viewform")) {
					url.pathname = url.pathname.replace(
						/\/(edit|response)$/,
						"/viewform"
					);
				}
				return url.toString();
			} catch {
				return link;
			}
		}

		formLink = toViewForm(formLink);
		console.log("🔻 formLink:", formLink);

		const browser = await puppeteer.launch({
			headless: true,
			args: ["--no-sandbox", "--disable-setuid-sandbox"],
		});
		const page = await browser.newPage();
		await page.goto(formLink, { waitUntil: "networkidle2" });

		await new Promise((resolve) => setTimeout(resolve, 2000));

		const formData = await page.evaluate(() => {
			return typeof FB_PUBLIC_LOAD_DATA_ !== "undefined"
				? FB_PUBLIC_LOAD_DATA_
				: null;
		});

		await browser.close();

		if (!formData || !formData[1] || !Array.isArray(formData[1][1])) {
			throw new Error("Không thể parse dữ liệu từ Google Form.");
		}

		const formTitle =
			formData[1][8]?.trim?.() ||
			formData[1][0]?.trim?.() ||
			"Không rõ tiêu đề";

		const formItems = formData[1][1];
		const fields = formItems.map((item) => {
			const [id, title, , typeCode, optionsRaw] = item;
			const type = mapGoogleType(typeCode);

			let options = [];
			if (
				(type === "multiple-choice" || type === "dropdown") &&
				Array.isArray(optionsRaw?.[0]?.[1])
			) {
				options = optionsRaw[0][1].map((opt) => opt?.[0] ?? "");
			}

			const entryId = `entry.${id}`;
			return {
				id,
				title: title?.trim?.() || "Không rõ tiêu đề",
				type,
				options,
				entryId,
			};
		});

		console.log("✅ Parsed title:", formTitle);
		console.log("✅ Parsed fields:", fields);

		return { title: formTitle, fields };
	} catch (error) {
		console.error("❌ Lỗi khi parse Google Form:", error.message);
		throw error;
	}
}

module.exports = { parseGoogleForm };
