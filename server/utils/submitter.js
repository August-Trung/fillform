// utils/submitGoogleForm.js
const puppeteer = require("puppeteer");

// Mặc định timeout 15s nếu không truyền vào
const DEFAULT_TIMEOUT = 15000;
const DEFAULT_SLOWMO = 100;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function detectSubmissionState(page) {
	if (!page) return null;
	try {
		return await page.evaluate(() => {
			const isVisible = (node) => {
				if (!node) return false;
				const element = /** @type {HTMLElement} */ (node);
				return !!(
					element.offsetParent || element.getClientRects()?.length
				);
			};

			const successEl = document.querySelector(
				".freebirdFormviewerViewResponseConfirmationMessage"
			);
			if (isVisible(successEl)) {
				return "success";
			}

			const bodyText =
				document.body.innerText?.toLowerCase() || "";
			if (
				bodyText.includes("your response has been recorded") ||
				bodyText.includes("câu trả lời của bạn đã được ghi nhận")
			) {
				return "success";
			}

			const errorEls = Array.from(
				document.querySelectorAll(
					'[role="alert"], [aria-live="assertive"]'
				)
			).filter((el) => isVisible(el));
			if (errorEls.length > 0) {
				return "error";
			}

			if (window.location.pathname.includes("/formresponse")) {
				return "success";
			}

			return null;
		});
	} catch {
		return null;
	}
}

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

async function ensureEditableSelector(page, entryId, timeout) {
	const attr = "data-entry-target";
	const existingHandle = await page.$(`[${attr}="${entryId}"]`);
	if (existingHandle) {
		await existingHandle.dispose();
		return `[${attr}="${entryId}"]`;
	}

	return await page.evaluate(
		(attrName, entry) => {
			const numericId = entry.replace("entry.", "");

			const mark = (el) => {
				if (!el) return null;
				el.setAttribute(attrName, entry);
				return `[${attrName}="${entry}"]`;
			};

			const direct = document.querySelector(
				`input[name="${entry}"]:not([type="hidden"])`
			);
			if (direct) return mark(direct);

			const directTextarea = document.querySelector(
				`textarea[name="${entry}"]`
			);
			if (directTextarea) return mark(directTextarea);

			const listItems = Array.from(
				document.querySelectorAll('div[role="listitem"]')
			);
			for (const item of listItems) {
				const dataNode = item.querySelector("[data-params]");
				const params =
					dataNode?.getAttribute("data-params") ||
					item.getAttribute("data-params") ||
					"";
				if (!params.includes(numericId)) continue;

				const editable =
					item.querySelector(
						'textarea, input:not([type="hidden"]), div[contenteditable="true"]'
					) || null;
				if (editable) {
					return mark(editable);
				}
			}

			return null;
		},
		attr,
		entryId
	);
}

async function setFieldValue(page, entryId, value, timeout, typingDelay) {
	const selector = await ensureEditableSelector(page, entryId, timeout);
	if (!selector) {
		throw new Error(`Không tìm thấy input cho ${entryId}`);
	}

	const textValue = `${value ?? ""}`;
	const delay = Math.min(
		typeof typingDelay === "number" ? typingDelay : 20,
		150
	);

	await page.waitForSelector(selector, { timeout });

	const elementHandle = await page.$(selector);
	if (!elementHandle) {
		throw new Error(`Không thể truy cập ${selector}`);
	}

	await elementHandle.focus();
	try {
		await page.click(selector, { clickCount: 3, delay: 50 });
		await page.keyboard.press("Backspace");
	} catch (err) {
		console.warn(
			`⚠️  Không thể click ${selector} (${err.message}). Dùng fallback set trực tiếp.`
		);
	}

	if (textValue) {
		await page.keyboard.type(textValue, { delay });
	}

	await page.evaluate((sel) => {
		const el = document.querySelector(sel);
		if (!el) return;
		const fire = (event) =>
			el.dispatchEvent(new Event(event, { bubbles: true }));

		if ("value" in el) {
			fire("input");
			fire("change");
		} else if (el.isContentEditable) {
			fire("input");
		}
	}, selector);

	const finalValue = await page.$eval(
		selector,
		(el) =>
			el?.isContentEditable
				? el.textContent || ""
				: "value" in el
				? el.value
				: ""
	);

	if (finalValue !== textValue) {
		console.warn(
			`⚠️  Giá trị trong ${selector} sau khi gõ là "${finalValue}", kỳ vọng "${textValue}". Dùng fallback setValue.`
		);
		await page.$eval(
			selector,
			(el, v) => {
				if (el.isContentEditable) {
					el.textContent = v;
				} else if ("value" in el) {
					el.value = v;
				}
				const fire = (event) =>
					el.dispatchEvent(new Event(event, { bubbles: true }));
				fire("input");
				fire("change");
			},
			textValue
		);
	}

	await page.$eval(
		`input[name="${entryId}"]`,
		(hidden, v) => {
			if (hidden) hidden.value = v;
		},
		textValue
	);
}

async function submitGoogleForm(formLink, payload, options = {}) {
	const timeout = options.timeout ?? DEFAULT_TIMEOUT;
	const headless = options.headless ?? process.env.NODE_ENV === "production";
	const slowMo = options.slowMo ?? (headless ? 0 : DEFAULT_SLOWMO);
	const typingDelay =
		options.typingDelay ??
		(slowMo ? Math.min(slowMo, 150) : DEFAULT_SLOWMO / 2);

	const browser = await puppeteer.launch({
		headless,
		args: ["--no-sandbox", "--disable-setuid-sandbox"],
	});
	const page = await browser.newPage();

	try {
		await page.goto(formLink, { waitUntil: "networkidle2", timeout });

		const redirectedUrl = page.url();
		const needsLogin =
			/accounts\.google\.com/i.test(redirectedUrl) ||
			(await page.evaluate(() => {
				const guardSelectors = [
					"input#identifierId",
					"form[action*='ServiceLogin']",
				];
				if (
					guardSelectors.some((selector) =>
						document.querySelector(selector)
					)
				) {
					return true;
				}
				const bodyText = document.body.innerText.toLowerCase();
				return (
					bodyText.includes("sign in to continue") ||
					bodyText.includes("phải đăng nhập") ||
					bodyText.includes("bạn cần đăng nhập")
				);
			}));
		if (needsLogin) {
			return {
				ok: false,
				errorCode: "LOGIN_REQUIRED",
				error:
					"Form yêu cầu đăng nhập Google. Hãy tắt 'Giới hạn người trả lời/Collect email' hoặc cung cấp bản public.",
			};
		}

		// Bước nhập email nếu có
		const emailSel = 'input[type="email"]';
		if (await page.$(emailSel)) {
			await page.type(emailSel, "example@email.com", { delay: slowMo });
			await clickAndWait(page, emailSel, timeout);
		}

		// Đợi form load đầy đủ
		await page.waitForSelector("form", { timeout });

		// Gõ dữ liệu vào các trường
		for (const [entryId, rawValue] of Object.entries(payload)) {
			const hiddenSelector = `input[name="${entryId}"]`;
			if (!(await page.$(hiddenSelector))) {
				console.warn(`⚠️ Field ${entryId} không tồn tại, bỏ qua`);
				continue;
			}

			const value =
				Array.isArray(rawValue) && rawValue.length > 0
					? rawValue.join(", ")
					: `${rawValue ?? ""}`;
			await setFieldValue(page, entryId, value, timeout, typingDelay);
			if (slowMo > 0) {
				await sleep(Math.min(slowMo, 200));
			}
			console.log(`✍️  Đã nhập "${value}" vào ${entryId}`);
		}

		console.log("✅ Đã điền dữ liệu vào form");

		const submitBtnSel = 'form div[role="button"]';
		await page.waitForSelector(submitBtnSel, { timeout });

		const clickedSubmit = await page.evaluate((sel) => {
			const candidates = Array.from(document.querySelectorAll(sel));
			const preferredTexts = [
				"submit",
				"gửi",
				"send",
				"tiếp theo",
				"next",
				"done",
			];

			const normalizeText = (text = "") =>
				text
					.toLowerCase()
					.normalize("NFD")
					.replace(/[\u0300-\u036f]/g, "")
					.trim();

			const normalizedPreferred = preferredTexts.map((word) =>
				normalizeText(word)
			);

			const pickByText =
				candidates
					.slice()
					.reverse()
					.find((btn) =>
						normalizedPreferred.some((word) =>
							normalizeText(btn.textContent).includes(word)
						)
					) || null;

			const target = pickByText || candidates.at(-1) || null;
			if (!target) return false;
			target.scrollIntoView({ behavior: "smooth", block: "center" });
			target.click();
			return true;
		}, submitBtnSel);

		if (!clickedSubmit) {
			throw new Error("Không tìm thấy nút gửi trên Google Form.");
		}

		async function waitForCompletion() {
			const checkState = () => detectSubmissionState(page);

			const start = Date.now();
			while (Date.now() - start < timeout) {
				const state = await checkState();
				if (state) return state;
				await sleep(500);
			}
			return null;
		}

		const navPromise = page
			.waitForNavigation({ waitUntil: "networkidle2", timeout })
			.catch((err) => {
				const ignorable =
					err?.message?.includes("frame was detached") ||
					err?.message?.includes("Timeout");
				if (!ignorable) {
					throw err;
				}
				return null;
			});

		const resultState = await Promise.race([
			navPromise.then(() => "success"),
			waitForCompletion(),
		]);

		if (resultState === "error") {
			return {
				ok: false,
				errorCode: "VALIDATION_FAILED",
				error: "Form báo thiếu dữ liệu. Hãy kiểm tra các trường bắt buộc.",
			};
		}

		if (!resultState) {
			return {
				ok: false,
				errorCode: "UNKNOWN_STATE",
				error: "Không xác định được trạng thái submit sau khi nhấn Gửi.",
			};
		}

		console.log("✅ Form submitted successfully!");
		return { ok: true };
	} catch (err) {
		const message = err?.message || "Unknown error";
		if (
			message.includes("Navigation timeout") ||
			message.includes("frame was detached")
		) {
			const state = await detectSubmissionState(page);
			if (state === "success") {
				console.warn(
					"⚠️ Navigation timeout nhưng phát hiện form đã submit thành công."
				);
				return {
					ok: true,
					warning: message,
				};
			}
		}
		console.error("❌ Lỗi submitGoogleForm:", message);
		return { ok: false, error: message };
	} finally {
		await browser.close();
	}
}

module.exports = { submitGoogleForm };
