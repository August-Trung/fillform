import React, { useState } from "react";
import axios from "axios";
import { FieldConfig } from "../types";

interface FormFillerUIProps {
	formLink: string;
	config: FieldConfig[];
}

const FormFillerUI: React.FC<FormFillerUIProps> = ({ formLink, config }) => {
	const [values, setValues] = useState<{ [key: string]: string }>({});
	const [loading, setLoading] = useState(false);

	const handleChange = (variable: string, value: string) => {
		setValues((prev) => ({ ...prev, [variable]: value }));
	};

	const handleSubmit = async () => {
		setLoading(true);
		try {
			const validConfig = config.filter((field) => !!field.entryId);

			await axios.post("http://localhost:5000/api/form/fill", {
				formLink,
				values,
				config: validConfig, // 👈 Gửi kèm cấu hình để ánh xạ biến → entryId
			});
			
			alert("✅ Form đã được điền thành công!");
			console.log("🧩 Config to backend:", config);
		} catch (err) {
			console.error(err);
			console.log("🧩 Config to backend:", config);
			alert("❌ Có lỗi xảy ra khi điền form.");
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="w-full px-4 md:px-8 lg:px-16 xl:px-24 py-6">
			<h2 className="text-3xl font-semibold mb-6 text-gray-800">
				📝 Điền Form
			</h2>

			{config.map((field, index) => (
				<div key={index} className="mb-6">
					<label className="block text-gray-700 font-medium mb-2">
						{field.question}
					</label>
					{field.type === "short-text" ||
					field.type === "paragraph" ? (
						<input
							type="text"
							placeholder={`Nhập giá trị cho biến "${field.variable}"`}
							value={values[field.variable] || ""}
							onChange={(e) =>
								handleChange(field.variable, e.target.value)
							}
							className="w-full border border-gray-300 rounded-lg px-3 py-2"
						/>
					) : field.type === "multiple-choice" ||
					  field.type === "dropdown" ? (
						<select
							title="Chọn một giá trị từ danh sách."
							value={values[field.variable] || ""}
							onChange={(
								e: React.ChangeEvent<HTMLSelectElement>
							) => handleChange(field.variable, e.target.value)}
							className="w-full border border-gray-300 rounded-lg px-3 py-2">
							<option value="">-- Chọn một giá trị --</option>
							{field.options?.map((opt: string, i: number) => (
								<option key={i} value={opt}>
									{opt}
								</option>
							))}
						</select>
					) : field.type === "checkbox" ? (
						<div className="space-y-2">
							{field.options?.map((opt: string, i: number) => (
								<label key={i} className="block">
									<input
										type="checkbox"
										checked={(
											values[field.variable] || ""
										).includes(opt)}
										onChange={(
											e: React.ChangeEvent<HTMLInputElement>
										) => {
											const prev = values[field.variable]
												? values[field.variable].split(
														"||"
													)
												: [];
											const newVal = e.target.checked
												? [...prev, opt]
												: prev.filter((v) => v !== opt);
											handleChange(
												field.variable,
												newVal.join("||")
											);
										}}
										className="mr-2"
									/>
									{opt}
								</label>
							))}
						</div>
					) : (
						<input
							type="text"
							placeholder={`Nhập giá trị cho biến "${field.variable}"`}
							value={values[field.variable] || ""}
							onChange={(e) =>
								handleChange(field.variable, e.target.value)
							}
							className="w-full border border-gray-300 rounded-lg px-3 py-2"
						/>
					)}
				</div>
			))}

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
