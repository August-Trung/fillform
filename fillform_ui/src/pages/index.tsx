import React, { useState } from "react";
import axios from "axios";
import FormConfigurator from "../components/FormConfigurator";
import { ParsedForm } from "../types";

const Home: React.FC = () => {
	const [formLink, setFormLink] = useState("");
	const [parsedForm, setParsedForm] = useState<ParsedForm | null>(null);
	const [loading, setLoading] = useState(false);
	const [fetchError, setFetchError] = useState<string | null>(null);

	const handleParseForm = async () => {
		setLoading(true);
		setParsedForm(null);
		try {
			const res = await axios.post(
				"http://localhost:5000/api/form/parse",
				{
					formLink,
				}
			);

			const { form, latest_form_questions, config } = res.data;

			if (form && Array.isArray(latest_form_questions) && config) {
				setParsedForm({
					form,
					latest_form_questions,
					formConfig: config,
				});
				setFetchError(null);
				console.log("✅ Parsed form:", res.data);
			} else {
				setFetchError("Form không hợp lệ.");
			}
		} catch (error) {
			console.error("❌ Error parsing form", error);
			setFetchError(
				"Không thể đọc được form. Có thể do bật 'Thu thập địa chỉ email'."
			);
			alert(
				"❌ Không thể đọc được form.\n\n👉 Hãy vào Google Form → Cài đặt (biểu tượng bánh răng) → Bỏ chọn 'Thu thập địa chỉ email'."
			);
		}
		setLoading(false);
	};

	return (
		<div className="w-full px-4 md:px-8 lg:px-16 xl:px-24 py-10 bg-white">
			<h1 className="text-3xl font-bold mb-8 text-gray-800">
				Tự động điền Google Form
			</h1>

			<label className="block text-gray-700 mb-2">
				Nhập link viewform của Google Form:
			</label>

			<div className="flex flex-col md:flex-row gap-3 md:items-center">
				<input
					type="text"
					value={formLink}
					onChange={(e) => setFormLink(e.target.value)}
					placeholder="https://docs.google.com/forms/d/e/xxx/viewform"
					className="flex-1 border border-gray-300 p-3 rounded-lg"
				/>
				<button
					onClick={handleParseForm}
					className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition"
					disabled={loading}>
					{loading ? "Đang xử lý..." : "Parse"}
				</button>
			</div>

			{fetchError && (
				<div className="bg-red-50 border border-red-300 text-red-700 px-4 py-3 rounded mt-6">
					⚠️ {fetchError}
				</div>
			)}

			{parsedForm && (
				<div className="mt-8">
					<h2 className="text-2xl font-semibold text-gray-800 mb-4">
						📝 Tên form:{" "}
						{parsedForm.form?.name || "Không rõ tên form"}
					</h2>
					<FormConfigurator parsedForm={parsedForm} />
				</div>
			)}
		</div>
	);
};

export default Home;
