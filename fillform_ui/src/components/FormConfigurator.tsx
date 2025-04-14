import React, { useState, useEffect } from "react";
import axios from "axios";
import { ParsedForm, FieldConfig } from "../types";
import FormFillerUI from "./FormFillerUI";

interface FormConfiguratorProps {
	parsedForm: ParsedForm;
}

const FormConfigurator: React.FC<FormConfiguratorProps> = ({ parsedForm }) => {
	const { form, latest_form_questions, formConfig } = parsedForm;

	const [fieldConfigs, setFieldConfigs] = useState<FieldConfig[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [step, setStep] = useState<"config" | "fill">("config");

	useEffect(() => {
		if (!Array.isArray(latest_form_questions)) {
			setError("Dữ liệu form không hợp lệ.");
			return;
		}
		if (latest_form_questions.length === 0) {
			setError(
				"Form hiện tại không thể đọc được vì có thể đang bật tính năng 'Thu thập địa chỉ email'.\n\n👉 Hãy vào Google Form → Cài đặt (biểu tượng bánh răng) → Bỏ chọn 'Thu thập địa chỉ email'."
			);
			return;
		}

		const fallbackConfig: FieldConfig[] = latest_form_questions.map(
			(field, index) => ({
				id: index,
				type: field.type,
				question: field.question || "",
				sectionTitle: field.sectionTitle || "",
				variable:
					field.question
						?.toLowerCase()
						.replace(/[^a-z0-9]/g, "_")
						.replace(/_+/g, "_")
						.replace(/^_+|_+$/g, "") || "",
				customOptions: {},
				options: field.options ?? [],
				entryId: field.entryId || "",
			})
		);

		setFieldConfigs(fallbackConfig);
		setError(null);
	}, [latest_form_questions]);

	const handleConfigChange = <K extends keyof FieldConfig>(
		index: number,
		key: K,
		value: FieldConfig[K]
	) => {
		setFieldConfigs((prev) =>
			prev.map((f, i) => (i === index ? { ...f, [key]: value } : f))
		);
	};

	const handleCustomOptionChange = (
		index: number,
		key: keyof FieldConfig["customOptions"],
		value: number
	) => {
		setFieldConfigs((prev) =>
			prev.map((f, i) =>
				i === index
					? {
							...f,
							customOptions: {
								...f.customOptions,
								[key]: value,
							},
						}
					: f
			)
		);
	};

	const handleSubmitConfig = async () => {
		setLoading(true);
		try {
			console.log("📤 Gửi payload:", {
				form,
				latest_form_questions,
				formConfig,
				fieldConfigs,
			});
			const res = await axios.post(
				"http://localhost:5000/api/form/save-config",
				{
					form,
					latest_form_questions,
					formConfig,
					fieldConfigs,
				}
			);
			console.log("✅ Response từ backend:", res.data);
			alert("✅ Cấu hình đã được lưu thành công!");
			setStep("fill");
		} catch (err: any) {
			console.error(
				"❌ Lỗi khi lưu:",
				err?.response?.data || err.message
			);
			alert("❌ Có lỗi xảy ra khi lưu cấu hình.");
		}
		setLoading(false);
	};

	if (step === "fill") {
		return <FormFillerUI formLink={form.urlMain} config={fieldConfigs} />;
	}

	return (
		<div className="w-full px-4 md:px-8 lg:px-16 xl:px-24 py-6">
			<h2 className="text-3xl font-semibold mb-6 text-gray-800">
				Cấu hình Form
			</h2>

			{error && (
				<div className="bg-red-50 border border-red-300 text-red-700 px-4 py-3 rounded mb-4 whitespace-pre-wrap">
					<strong className="block font-semibold">
						⚠️ Lỗi khi đọc Form:
					</strong>
					{error}
				</div>
			)}

			{!error &&
				fieldConfigs.map((field, index) => (
					<div
						key={index}
						className="bg-white border border-gray-200 rounded-2xl shadow-md p-6 mb-6 w-full">
						{field.sectionTitle && (
							<p className="text-sm text-blue-600 font-medium mb-1">
								📂 Section: {field.sectionTitle}
							</p>
						)}
						<h3 className="text-xl font-bold text-gray-800 mb-1">
							{field.question}
						</h3>
						<p className="text-sm text-gray-500 mb-3">
							🔢 Kiểu trường:{" "}
							<span className="font-medium">{field.type}</span>
						</p>

						{/* Entry ID */}
						<div className="mb-4">
							<label className="block text-gray-700 font-medium mb-1">
								Entry ID:
							</label>
							<input
								title="Nhập entry ID của trường này"
								type="text"
								value={field.entryId || ""}
								onChange={(e) =>
									handleConfigChange(
										index,
										"entryId",
										e.target.value
									)
								}
								className="w-full border border-gray-300 rounded-lg px-3 py-2"
							/>
						</div>

						{/* Variable */}
						<div className="mb-4">
							<label className="block text-gray-700 font-medium mb-1">
								Tên biến (variable):
							</label>
							<input
								title="Nhập tên biến để ánh xạ với entry ID"
								type="text"
								value={field.variable}
								onChange={(e) =>
									handleConfigChange(
										index,
										"variable",
										e.target.value
									)
								}
								className="w-full border border-gray-300 rounded-lg px-3 py-2"
							/>
						</div>

						{/* Nếu multiple-choice */}
						{field.type === "multiple-choice" &&
							(field.options ?? []).length > 0 && (
								<div className="mt-4">
									<p className="text-sm font-medium text-gray-700 mb-2">
										Danh sách lựa chọn:
									</p>
									<ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
										{(field.options ?? []).map((opt, i) => (
											<li
												key={i}
												className="bg-gray-100 px-3 py-2 rounded-md text-gray-800 text-sm shadow-sm">
												{opt}
											</li>
										))}
									</ul>

									<div className="mt-4">
										<label className="block text-sm text-gray-700">
											Số lượt chọn (mặc định):
										</label>
										<input
											title="Nhập số lượt chọn mặc định"
											type="number"
											min={0}
											value={
												field.customOptions
													.defaultCount || 0
											}
											onChange={(e) =>
												handleCustomOptionChange(
													index,
													"defaultCount",
													parseInt(e.target.value, 10)
												)
											}
											className="w-full border border-gray-300 rounded-lg px-3 py-2 mt-1"
										/>
									</div>

									<div className="mt-4">
										<label className="block text-sm text-gray-700">
											Số lượt chọn tối đa:
										</label>
										<input
											title="Nhập số lượt chọn tối đa"
											type="number"
											min={1}
											value={
												field.customOptions.maxSelect ||
												1
											}
											onChange={(e) =>
												handleCustomOptionChange(
													index,
													"maxSelect",
													parseInt(e.target.value, 10)
												)
											}
											className="w-full border border-gray-300 rounded-lg px-3 py-2 mt-1"
										/>
									</div>

									<div className="flex items-center mt-4">
										<input
											title="Xáo trộn các lựa chọn"
											type="checkbox"
											checked={
												field.customOptions
													.shuffleOptions === 1
											}
											onChange={(e) =>
												handleCustomOptionChange(
													index,
													"shuffleOptions",
													e.target.checked ? 1 : 0
												)
											}
											className="mr-2"
										/>
										<label className="text-sm text-gray-700">
											Xáo trộn options
										</label>
									</div>
								</div>
							)}
					</div>
				))}

			{!error && (
				<button
					onClick={handleSubmitConfig}
					className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-xl mt-4 shadow transition disabled:opacity-50"
					disabled={loading}>
					{loading ? "Đang lưu..." : "💾 Lưu cấu hình & Bắt đầu điền"}
				</button>
			)}
		</div>
	);
};

export default FormConfigurator;
