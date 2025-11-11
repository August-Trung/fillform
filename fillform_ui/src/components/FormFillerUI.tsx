import React, { useState } from "react";
import axios from "axios";
import { FieldConfig } from "../types";

interface FormFillerUIProps {
	formLink: string;
	config: FieldConfig[];
}

const FormFillerUI: React.FC<FormFillerUIProps> = ({ formLink, config }) => {
	// Lọc ra chỉ những field có entryId
	const validFields = config.filter((f) => !!f.entryId);

	// Khởi tạo state values: text => "", checkbox => []
	const [values, setValues] = useState<{ [key: string]: any }>(
		validFields.reduce(
			(acc, field) => {
				acc[field.variable] = field.type === "checkbox" ? [] : "";
				return acc;
			},
			{} as { [key: string]: any }
		)
	);

	const [loading, setLoading] = useState(false);

	const handleChange = (variable: string, value: any) => {
		setValues((prev) => ({ ...prev, [variable]: value }));
	};

	const handleCheckboxChange = (
		variable: string,
		option: string,
		checked: boolean
	) => {
		setValues((prev) => {
			const arr: string[] = Array.isArray(prev[variable])
				? prev[variable]
				: [];
			return {
				...prev,
				[variable]: checked
					? [...arr, option]
					: arr.filter((v) => v !== option),
			};
		});
	};

	const handleSubmit = async () => {
		setLoading(true);
		try {
			await axios.post("http://localhost:5000/api/form/fill", {
				formLink,
				values,
				config: validFields,
			});
			alert("✅ Form đã được điền thành công!");
			console.log("🧩 Config to backend:", validFields);
		} catch (err: any) {
			console.error(err);
			console.log("🧩 Config to backend:", validFields);
			const backendMessage =
				err?.response?.data?.error || err?.message || null;
			alert(
				backendMessage
					? `❌ ${backendMessage}`
					: "❌ Có lỗi xảy ra khi điền form."
			);
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="w-full px-4 md:px-8 lg:px-16 xl:px-24 py-6">
			<h2 className="text-3xl font-semibold mb-6 text-gray-800">
				📝 Điền Form
			</h2>

			{validFields.map((field, idx) => {
				const varName = field.variable;
				const value = values[varName];

				return (
					<div key={idx} className="mb-6">
						<label className="block text-gray-700 font-medium mb-2">
							{field.question}
						</label>

						{/* Short text */}
						{field.type === "short-text" && (
							<input
								type="text"
								placeholder={`Nhập "${field.question}"`}
								value={value}
								onChange={(e) =>
									handleChange(varName, e.target.value)
								}
								className="w-full border border-gray-300 rounded-lg px-3 py-2"
							/>
						)}

						{/* Paragraph */}
						{field.type === "paragraph" && (
							<textarea
								placeholder={`Nhập "${field.question}"`}
								value={value}
								onChange={(e) =>
									handleChange(varName, e.target.value)
								}
								className="w-full border border-gray-300 rounded-lg px-3 py-2"
							/>
						)}

						{/* Date */}
						{field.type === "date" && (
							<input
								title="Nhập giá trị cho trường này"
								type="date"
								value={value}
								onChange={(e) =>
									handleChange(varName, e.target.value)
								}
								className="w-full border border-gray-300 rounded-lg px-3 py-2"
							/>
						)}

						{/* Multiple choice / Dropdown */}
						{(field.type === "multiple-choice" ||
							field.type === "dropdown") && (
							<select
								title="Nhập giá trị cho trường này"
								value={value}
								onChange={(e) =>
									handleChange(varName, e.target.value)
								}
								className="w-full border border-gray-300 rounded-lg px-3 py-2">
								<option value="">-- Chọn một giá trị --</option>
								{field.options?.map((opt, i) => (
									<option key={i} value={opt}>
										{opt}
									</option>
								))}
							</select>
						)}

						{/* Checkbox */}
						{field.type === "checkbox" && (
							<div className="space-y-2">
								{field.options?.map((opt, i) => (
									<label
										key={i}
										className="flex items-center">
										<input
											type="checkbox"
											checked={(
												value as string[]
											).includes(opt)}
											onChange={(e) =>
												handleCheckboxChange(
													varName,
													opt,
													e.target.checked
												)
											}
											className="mr-2"
										/>
										{opt}
									</label>
								))}
							</div>
						)}
					</div>
				);
			})}

			<button
				onClick={handleSubmit}
				disabled={loading}
				className={`w-full md:w-auto px-6 py-3 rounded-lg font-semibold text-white transition ${
					loading ? "bg-gray-400" : "bg-blue-500 hover:bg-blue-600"
				}`}>
				{loading ? "Đang gửi..." : "🚀 Gửi dữ liệu"}
			</button>
		</div>
	);
};

export default FormFillerUI;
