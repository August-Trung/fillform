// utils/fetchFormFields.ts

export const fetchFormFields = async (formUrl: string) => {
	try {
		const response = await fetch(formUrl);
		const html = await response.text();
		const parser = new DOMParser();
		const doc = parser.parseFromString(html, "text/html");

		// 🔍 Kiểm tra nếu form có input type="email"
		const emailInput = doc.querySelector('input[type="email"]');
		const emailLabel = Array.from(doc.querySelectorAll("div")).find((div) =>
			div.textContent?.toLowerCase().includes("email")
		);

		if (emailInput || emailLabel) {
			throw new Error(
				"Google Form của bạn đang bật thu thập địa chỉ email. Vui lòng tắt tính năng này trong phần 'Cài đặt' của Google Form để tiếp tục."
			);
		}

		// 🔎 Tìm thẻ script chứa dữ liệu form
		const scriptTag = Array.from(doc.querySelectorAll("script")).find(
			(script) => script.textContent?.includes("FB_PUBLIC_LOAD_DATA_")
		);

		if (!scriptTag) {
			throw new Error(
				"Không thể tìm thấy dữ liệu form từ liên kết đã cung cấp."
			);
		}

		const scriptContent = scriptTag.textContent || "";
		const match = scriptContent.match(
			/FB_PUBLIC_LOAD_DATA_\s*=\s*(.*?);\s*<\/script>/s
		);
		if (!match || match.length < 2) {
			throw new Error("Dữ liệu form không hợp lệ hoặc đã bị mã hóa.");
		}

		const formJson = JSON.parse(match[1]);
		const fieldsRaw = formJson[1][1];

		const fields = fieldsRaw.map((field: any) => ({
			id: field[0],
			title: field[1],
			type: field[3],
			options: field[4]?.map((opt: any) => opt[0]) || [],
		}));

		return fields;
	} catch (error: any) {
		throw new Error(
			error.message || "Đã có lỗi xảy ra khi tải dữ liệu form."
		);
	}
};
