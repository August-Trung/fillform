import React, { useState, useEffect } from "react";
import axios from "axios";
import { FormField, FieldConfig } from "../types";
import FormFillerUI from "./FormFillerUI";

interface FormConfiguratorProps {
	formLink: string;
	formData: FormField[];
	error?: string | null;
}

const FormConfigurator: React.FC<FormConfiguratorProps> = ({
	formLink,
	formData,
}) => {
	const [config, setConfig] = useState<FieldConfig[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [step, setStep] = useState<"config" | "fill">("config");

	useEffect(() => {
		if (!Array.isArray(formData)) {
			setError("Dữ liệu form không hợp lệ.");
			return;
		}
		if (formData.length === 0) {
			setError(
				"Form hiện tại không thể đọc được vì có thể đang bật tính năng 'Thu thập địa chỉ email'.\n\n👉 Hãy vào Google Form → Cài đặt (biểu tượng bánh răng) → Bỏ chọn 'Thu thập địa chỉ email'."
			);
			return;
		}

		const initialConfig: FieldConfig[] = formData.map((field, index) => ({
			id: index,
			title: field.title,
			type: field.type,
			variable: field.title.toLowerCase().replace(/\s+/g, "_"),
			customOptions: {},
			options: field.options || [],
			entryId: field.entryId || "",
		}));
		setConfig(initialConfig);
		setError(null);
	}, [formData]);

	const handleConfigChange = <K extends keyof FieldConfig>(
		index: number,
		key: K,
		value: FieldConfig[K]
	) => {
		setConfig((prev) =>
			prev.map((f, i) => (i === index ? { ...f, [key]: value } : f))
		);
	};

	const handleCustomOptionChange = (
		index: number,
		key: keyof NonNullable<FieldConfig["customOptions"]>,
		value: number
	) => {
		setConfig((prev) =>
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
			await axios.post("http://localhost:5000/api/form/save-config", {
				formLink,
				config,
			});
			alert("✅ Cấu hình đã được lưu thành công!");
		} catch (err) {
			console.error(err);
			alert("❌ Có lỗi xảy ra khi lưu cấu hình.");
		} finally {
			setLoading(false);
		}
	};

	return step === "config" ? (
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
				config.map((field, index) => (
					<div
						key={index}
						className="bg-white border border-gray-200 rounded-2xl shadow-md p-6 mb-6 w-full">
						<div className="mb-4">
							<label className="block text-gray-700 font-medium mb-1">
								Entry ID (entry.xxx):
							</label>
							<input
								title="Entry ID chính là mã entry.xxx tương ứng với trường này trên Google Form."
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
						<div className="mb-4">
							<h3 className="text-xl font-bold text-gray-800 mb-1">
								{field.title}
							</h3>
							<p className="text-sm text-gray-500">
								Loại trường:{" "}
								<span className="font-medium">
									{field.type}
								</span>
							</p>
						</div>

						<div className="mb-4">
							<label className="block text-gray-700 font-medium mb-1">
								Tên biến (variable):
							</label>
							<input
								title="Tên biến (variable) sẽ được sử dụng để điền vào form."
								type="text"
								value={field.variable}
								onChange={(e) =>
									handleConfigChange(
										index,
										"variable",
										e.target.value
									)
								}
								className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
							/>
						</div>

						{field.type === "multiple-choice" &&
							field.options?.length > 0 && (
								<div className="mt-3">
									{/* Danh sách options */}
									<p className="text-sm font-medium text-gray-700 mb-2">
										Options:
									</p>
									<ul className="pl-5 list-disc text-sm text-gray-800 mb-2">
										{field.options.map(
											(opt: string, i: number) => (
												<li key={i}>{opt}</li>
											)
										)}
									</ul>

									{/* defaultCount */}
									<label className="block mt-2 text-sm text-gray-700">
										Số lượt chọn (mặc định):
									</label>
									<input
										title="Số lượt chọn (mặc định) sẽ được tự động điền vào form."
										type="number"
										min={0}
										value={
											field.customOptions?.defaultCount ||
											0
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

									{/* maxSelect */}
									<label className="block mt-4 text-sm text-gray-700">
										Số lượt chọn tối đa:
									</label>
									<input
										title="Số lượt chọn tối đa sẽ được tự động điền vào form."
										type="number"
										min={1}
										value={
											field.customOptions?.maxSelect || 1
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

									{/* shuffleOptions */}
									<div className="flex items-center mt-4">
										<input
											title="Xáo trộn options sẽ làm cho các lựa chọn trong form được hiển thị ngẫu nhiên."
											type="checkbox"
											checked={
												field.customOptions
													?.shuffleOptions === 1
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
					onClick={async () => {
						await handleSubmitConfig();
						setStep("fill");
					}}
					className={`...`}>
					{loading ? "Đang lưu..." : "💾 Lưu & Tiếp tục"}
				</button>
			)}
		</div>
	) : (
		<FormFillerUI formLink={formLink} config={config} />
	);
};

export default FormConfigurator;
