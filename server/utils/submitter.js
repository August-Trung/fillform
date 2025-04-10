const puppeteer = require("puppeteer");

const submitGoogleForm = async (formLink, payload) => {
	const browser = await puppeteer.launch({
		headless: true,
		args: ["--no-sandbox", "--disable-setuid-sandbox"],
	});
	const page = await browser.newPage();
	await page.goto(formLink, { waitUntil: "networkidle2" });

	try {
		// Nếu có bước yêu cầu email
		const emailSelector = 'input[type="email"]';
		if (await page.$(emailSelector)) {
			await page.type(emailSelector, "example@email.com");
			await Promise.all([
				page.waitForNavigation({ waitUntil: "networkidle2" }),
				page.keyboard.press("Enter"),
			]);
		}

		// Đợi toàn bộ form load xong
		await page.waitForSelector("form", { timeout: 5000 });

		// Điền các trường
		await page.evaluate((payload) => {
			for (const [entryId, value] of Object.entries(payload)) {
				const input = document.querySelector(
					`input[name="${entryId}"], textarea[name="${entryId}"]`
				);
				if (input) {
					input.focus();
					input.value = value;
					input.dispatchEvent(new Event("input", { bubbles: true }));
				}
			}
		}, payload);

		console.log("✅ Đã điền dữ liệu vào form");

		// Click nút submit (form button hoặc nút kiểu mới)
		const submitBtnSelector =
			'form [role="button"], form button[type="submit"]';
		await page.waitForSelector(submitBtnSelector, { timeout: 5000 });

		await page.evaluate(() => {
			const btn = document.querySelector(
				'form [role="button"], form button[type="submit"]'
			);
			if (btn) btn.click();
		});

		console.log("🚀 Bấm nút Gửi");

		// Đợi trang cảm ơn
		await page.waitForNavigation({
			waitUntil: "networkidle2",
			timeout: 7000,
		});
		console.log("✅ Form submitted successfully!");
	} catch (err) {
		console.error("❌ Lỗi submitGoogleForm:", { message: err.message });
		throw err;
	} finally {
		await browser.close();
	}
};

module.exports = submitGoogleForm;
