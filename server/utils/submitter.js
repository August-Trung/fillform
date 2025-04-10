// utils/submitGoogleForm.js
const puppeteer = require("puppeteer");

// Mặc định timeout 15s nếu không truyền vào
const DEFAULT_TIMEOUT = 15000;
const DEFAULT_SLOWMO = 100;

/**
 * Click selector và chờ navigation (có retry khi timeout)
 */
async function clickAndWait(page, selector, timeout) {
	await page.waitForSelector(selector, { timeout });
	try {
		await Promise.all([
			page.waitForNavigation({ waitUntil: "networkidle2", timeout }),
			page.click(selector),
		]);
	} catch (err) {
		if (err.name === "TimeoutError") {
			console.warn(`⚠️ clickAndWait: timeout, retry click ${selector}`);
			await page.click(selector);
			await page.waitForNavigation({
				waitUntil: "networkidle2",
				timeout,
			});
		} else {
			throw err;
		}
	}
}

/**
 * Submit Google Form bằng Puppeteer
 * @param {string} formLink - link /viewform của Google Form
 * @param {object} payload  - map entry.xxx → value
 * @param {object} options  - { timeout, headless, slowMo }
 * @returns {Promise<{ok: boolean, error?: string}>}
 */
async function submitGoogleForm(formLink, payload, options = {}) {
	const timeout = options.timeout ?? DEFAULT_TIMEOUT;
	const headless = options.headless ?? process.env.NODE_ENV === "production";
	const slowMo = options.slowMo ?? (headless ? 0 : DEFAULT_SLOWMO);

	const browser = await puppeteer.launch({
		headless,
		slowMo,
		args: ["--no-sandbox", "--disable-setuid-sandbox"],
	});
	const page = await browser.newPage();

	try {
		await page.goto(formLink, { waitUntil: "networkidle2", timeout });

		// Bước nhập email nếu có
		const emailSel = 'input[type="email"]';
		if (await page.$(emailSel)) {
			await page.type(emailSel, "example@email.com", { delay: slowMo });
			await clickAndWait(page, emailSel, timeout);
		}

		// Đợi form load đầy đủ
		await page.waitForSelector("form", { timeout });

		// Gõ dữ liệu vào các trường
		for (const [entryId, value] of Object.entries(payload)) {
			const inputSel = `input[name="${entryId}"]`;
			const textSel = `textarea[name="${entryId}"]`;
			let sel = null;

			if (await page.$(inputSel)) {
				sel = inputSel;
			} else if (await page.$(textSel)) {
				sel = textSel;
			} else {
				console.warn(`⚠️ Field ${entryId} không tồn tại, bỏ qua`);
				continue;
			}

			await page.waitForSelector(sel, { timeout });
			await page.click(sel);
			await page.type(sel, value, { delay: slowMo });
			console.log(`✍️  Đã gõ "${value}" vào ${entryId}`);
		}

		console.log("✅ Đã điền dữ liệu vào form");

		// Click Gửi và đợi navigation
		const submitBtnSel = 'form [role="button"], form button[type="submit"]';
		await clickAndWait(page, submitBtnSel, timeout);

		console.log("✅ Form submitted successfully!");
		return { ok: true };
	} catch (err) {
		console.error("❌ Lỗi submitGoogleForm:", err.message);
		return { ok: false, error: err.message };
	} finally {
		await browser.close();
	}
}

module.exports = { submitGoogleForm };
