const puppeteer = require("puppeteer");

async function fillForm(formLink, values, config) {
	if (formLink.includes("viewform")) {
		formLink = formLink.replace("viewform", "formResponse");
	}

	const formData = new URLSearchParams();

	for (const field of config) {
		const variable = field.variable;
		const entryId = field.entryId;
		const value = values[variable];
		if (value !== undefined && entryId) {
			formData.append(entryId, value);
		}
	}

	// Sử dụng Puppeteer để submit form
	const browser = await puppeteer.launch({
		headless: true,
		args: ["--no-sandbox", "--disable-setuid-sandbox"],
	});
	const page = await browser.newPage();
	await page.goto(formLink, { waitUntil: "networkidle2" });

	// Điền dữ liệu vào form
	for (const [entryId, value] of formData.entries()) {
		await page.type(`[name="${entryId}"]`, value);
	}

	// Click submit button
	await page.click("button[type='submit']"); // Tìm và click nút submit
	await page.waitForNavigation();

	await browser.close();

	return true;
}

module.exports = fillForm;
