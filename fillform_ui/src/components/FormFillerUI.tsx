import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { FieldConfig } from "../types";

interface FormFillerUIProps {
	formLink: string;
	config: FieldConfig[];
}

type AutoStrategy = "random" | "sequential";

interface AutoFieldConfig {
	samples: string;
	strategy: AutoStrategy;
}

interface AutomationOptions {
	headless: boolean;
	slowMo: number;
	typingDelay: number;
	timeout: number;
}

interface AutoRunState {
	running: boolean;
	current: number;
	total: number;
	errors: number;
	logs: string[];
}

const DEFAULT_AUTO_OPTIONS: AutomationOptions = {
	headless: true,
	slowMo: 0,
	typingDelay: 5,
	timeout: 45000,
};

const defaultAutoFieldConfig: AutoFieldConfig = {
	samples: "",
	strategy: "random",
};

const sleep = (ms: number) =>
	new Promise((resolve) => setTimeout(resolve, ms));

const FormFillerUI: React.FC<FormFillerUIProps> = ({ formLink, config }) => {
	// Lọc ra chỉ những field có entryId
	const validFields = useMemo(
		() => config.filter((f) => !!f.entryId),
		[config]
	);

	// Khởi tạo state values: text => "", checkbox => []
	const defaultManualValues = useMemo(
		() =>
			validFields.reduce(
				(acc, field) => {
					acc[field.variable] =
						field.type === "checkbox" ? [] : "";
					return acc;
				},
				{} as Record<string, any>
			),
		[validFields]
	);
	const [values, setValues] = useState<Record<string, any>>(
		defaultManualValues
	);
	useEffect(() => {
		setValues(defaultManualValues);
	}, [defaultManualValues]);

	const [loading, setLoading] = useState(false);
	const [mode, setMode] = useState<"manual" | "auto">("manual");

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

	/**
	 * -------------- AUTO FILL STATE --------------
	 */
	const storageKey = useMemo(
		() => `autoFill::${encodeURIComponent(formLink)}`,
		[formLink]
	);
	const optionsStorageKey = `${storageKey}::options`;

	const [autoConfigs, setAutoConfigs] = useState<
		Record<string, AutoFieldConfig>
	>({});
	const [autoRuns, setAutoRuns] = useState(1);
	const [autoDelay, setAutoDelay] = useState(1000);
	const [continueOnError, setContinueOnError] = useState(true);
	const [autoOptions, setAutoOptions] =
		useState<AutomationOptions>(DEFAULT_AUTO_OPTIONS);
	const [autoState, setAutoState] = useState<AutoRunState>({
		running: false,
		current: 0,
		total: 0,
		errors: 0,
		logs: [],
	});
	const cancelAutoRef = useRef(false);

	// Load saved configs/options
	useEffect(() => {
		if (typeof window === "undefined") return;
		try {
			const savedConfigs = window.localStorage.getItem(storageKey);
			if (savedConfigs) {
				setAutoConfigs(JSON.parse(savedConfigs));
			}
			const savedOptions =
				window.localStorage.getItem(optionsStorageKey);
			if (savedOptions) {
				setAutoOptions(JSON.parse(savedOptions));
			}
		} catch (error) {
			console.warn("⚠️ Không thể đọc auto config từ localStorage", error);
		}
	}, [storageKey, optionsStorageKey]);

	// Persist configs/options
	useEffect(() => {
		if (typeof window === "undefined") return;
		try {
			window.localStorage.setItem(
				storageKey,
				JSON.stringify(autoConfigs)
			);
		} catch (error) {
			console.warn("⚠️ Không thể lưu auto config", error);
		}
	}, [autoConfigs, storageKey]);

	useEffect(() => {
		if (typeof window === "undefined") return;
		try {
			window.localStorage.setItem(
				optionsStorageKey,
				JSON.stringify(autoOptions)
			);
		} catch (error) {
			console.warn("⚠️ Không thể lưu auto options", error);
		}
	}, [autoOptions, optionsStorageKey]);

	const getAutoConfig = (variable: string): AutoFieldConfig => {
		return autoConfigs[variable] || defaultAutoFieldConfig;
	};

	const updateAutoConfig = (
		variable: string,
		partial: Partial<AutoFieldConfig>
	) => {
		setAutoConfigs((prev) => ({
			...prev,
			[variable]: {
				...defaultAutoFieldConfig,
				...prev[variable],
				...partial,
			},
		}));
	};

	const parseSamples = (samples?: string) =>
		(samples || "")
			.split("\n")
			.map((line) => line.trim())
			.filter(Boolean);

	const getChoicePool = (field: FieldConfig, cfg: AutoFieldConfig) => {
		const customList = parseSamples(cfg.samples);
		if (customList.length) return customList;
		return field.options ?? [];
	};

	const getTextValue = (
		field: FieldConfig,
		cfg: AutoFieldConfig,
		runIndex: number
	) => {
		const list = parseSamples(cfg.samples);
		if (list.length === 0) {
			if (field.type === "date") {
				const offset = runIndex % 30;
				const date = new Date();
				date.setDate(date.getDate() - offset);
				return date.toISOString().split("T")[0];
			}
			return `${field.question || field.variable || "Trả lời"} #${
				runIndex + 1
			}`;
		}
		if (cfg.strategy === "sequential") {
			return list[runIndex % list.length];
		}
		return list[Math.floor(Math.random() * list.length)];
	};

	const getSingleChoiceValue = (
		field: FieldConfig,
		cfg: AutoFieldConfig,
		runIndex: number
	) => {
		const pool = getChoicePool(field, cfg);
		if (pool.length === 0) {
			return `${field.question || "Chọn"}`;
		}
		if (cfg.strategy === "sequential") {
			return pool[runIndex % pool.length];
		}
		return pool[Math.floor(Math.random() * pool.length)];
	};

	const getCheckboxValue = (
		field: FieldConfig,
		cfg: AutoFieldConfig,
		runIndex: number
	) => {
		const pool = getChoicePool(field, cfg);
		if (pool.length === 0) return [];
		if (cfg.strategy === "sequential") {
			return [pool[runIndex % pool.length]];
		}
		const shuffled = [...pool].sort(() => Math.random() - 0.5);
		const count =
			shuffled.length === 1
				? 1
				: Math.max(
						1,
						Math.min(
							shuffled.length,
							Math.floor(Math.random() * shuffled.length) + 1
						)
				  );
		return shuffled.slice(0, count);
	};

	const generateAutoValues = (runIndex: number) => {
		const generated: Record<string, any> = {};
		for (const field of validFields) {
			const cfg = getAutoConfig(field.variable);
			if (field.type === "checkbox") {
				generated[field.variable] = getCheckboxValue(
					field,
					cfg,
					runIndex
				);
				continue;
			}
			if (
				field.type === "multiple-choice" ||
				field.type === "dropdown"
			) {
				generated[field.variable] = getSingleChoiceValue(
					field,
					cfg,
					runIndex
				);
				continue;
			}
			generated[field.variable] = getTextValue(field, cfg, runIndex);
		}
		return generated;
	};

	const handleAutoOptionsChange = <K extends keyof AutomationOptions>(
		key: K,
		value: AutomationOptions[K]
	) => {
		setAutoOptions((prev) => ({ ...prev, [key]: value }));
	};

	const handleAutoRun = async () => {
		if (validFields.length === 0) {
			alert("Không có câu hỏi nào có entryId hợp lệ.");
			return;
		}
		if (autoRuns <= 0) {
			alert("Số lượt chạy phải lớn hơn 0.");
			return;
		}

		cancelAutoRef.current = false;
		setAutoState({
			running: true,
			current: 0,
			total: autoRuns,
			errors: 0,
			logs: [],
		});

		for (let i = 0; i < autoRuns; i++) {
			if (cancelAutoRef.current) {
				setAutoState((prev) => ({
					...prev,
					running: false,
					logs: [...prev.logs, "⏹️ Đã dừng theo yêu cầu người dùng."],
				}));
				return;
			}

			const generatedValues = generateAutoValues(i);
			try {
				await axios.post("http://localhost:5000/api/form/fill", {
					formLink,
					values: generatedValues,
					config: validFields,
					options: autoOptions,
				});
				setAutoState((prev) => ({
					...prev,
					current: i + 1,
					logs: [
						...prev.logs,
						`✅ Lần ${i + 1}: thành công.`,
					].slice(-200),
				}));
			} catch (err: any) {
				const backendMessage =
					err?.response?.data?.error || err?.message || "Không rõ";
				setAutoState((prev) => ({
					...prev,
					current: i + 1,
					errors: prev.errors + 1,
					logs: [
						...prev.logs,
						`❌ Lần ${i + 1}: ${backendMessage}`,
					].slice(-200),
				}));
				if (!continueOnError) {
					setAutoState((prev) => ({
						...prev,
						running: false,
						logs: [
							...prev.logs,
							"⏹️ Dừng do gặp lỗi và đã tắt chế độ tiếp tục.",
						].slice(-200),
					}));
					return;
				}
			}

			if (autoDelay > 0) {
				await sleep(autoDelay);
			}
		}

		setAutoState((prev) => ({
			...prev,
			running: false,
			logs: [
				...prev.logs,
				"🎉 Hoàn tất chạy tự động.",
			].slice(-200),
		}));
	};

	const stopAutoRun = () => {
		cancelAutoRef.current = true;
	};

	const renderManualMode = () => (
		<>
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
		</>
	);

	const renderAutoFieldConfig = (field: FieldConfig, idx: number) => {
		const cfg = getAutoConfig(field.variable);
		const isChoice =
			field.type === "multiple-choice" ||
			field.type === "dropdown" ||
			field.type === "checkbox";
		const placeholder = isChoice
			? "Nhập mỗi dòng 1 lựa chọn (để trống để dùng danh sách của Google Form)"
			: "Nhập mỗi dòng 1 nội dung mẫu (để trống sẽ tự sinh theo tiêu đề)";

		return (
			<div
				key={`${field.variable}-${idx}`}
				className="border border-gray-200 rounded-xl p-4 shadow-sm bg-white">
				<div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
					<div>
						<p className="font-semibold text-gray-800">
							{field.question}
						</p>
						<p className="text-xs uppercase tracking-wide text-gray-500">
							{field.type}
						</p>
					</div>
					<div className="flex items-center gap-2">
						<label className="text-sm text-gray-600">
							Chiến lược
						</label>
						<select
							className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
							value={cfg.strategy}
							onChange={(e) =>
								updateAutoConfig(field.variable, {
									strategy: e.target
										.value as AutoStrategy,
								})
							}>
							<option value="random">Ngẫu nhiên</option>
							<option value="sequential">Tuần tự</option>
						</select>
					</div>
				</div>

				<div className="mt-3">
					<textarea
						placeholder={placeholder}
						value={cfg.samples}
						onChange={(e) =>
							updateAutoConfig(field.variable, {
								samples: e.target.value,
							})
						}
						className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm h-28 focus:border-blue-400 focus:ring-1 focus:ring-blue-200"
					/>
					{isChoice && field.options?.length ? (
						<p className="text-xs text-gray-500 mt-1">
							Danh sách gốc: {field.options.join(", ")}
						</p>
					) : (
						<p className="text-xs text-gray-500 mt-1">
							Bạn có thể thêm nhiều dòng để random nội dung khác
							nhau.
						</p>
					)}
				</div>
			</div>
		);
	};

	const renderAutoMode = () => (
		<div>
			<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
				<div>
					<label className="block text-sm font-medium text-gray-700 mb-1">
						Số lượt chạy
					</label>
					<input
						type="number"
						min={1}
						value={autoRuns}
						onChange={(e) =>
							setAutoRuns(() => {
								const next = Number(e.target.value);
								return Math.max(1, Number.isFinite(next) ? next : 1);
							})
						}
						className="w-full border border-gray-300 rounded-lg px-3 py-2"
					/>
				</div>
				<div>
					<label className="block text-sm font-medium text-gray-700 mb-1">
						Delay giữa các lượt (ms)
					</label>
					<input
						type="number"
						min={0}
						value={autoDelay}
						onChange={(e) =>
							setAutoDelay(() => {
								const next = Number(e.target.value);
								return Math.max(0, Number.isFinite(next) ? next : 0);
							})
						}
						className="w-full border border-gray-300 rounded-lg px-3 py-2"
					/>
				</div>
				<div>
					<label className="block text-sm font-medium text-gray-700 mb-1">
						Timeout mỗi lượt (ms)
					</label>
					<input
						type="number"
						min={1000}
						value={autoOptions.timeout}
						onChange={(e) =>
							handleAutoOptionsChange(
								"timeout",
								(() => {
									const next = Number(e.target.value);
									return Math.max(
										1000,
										Number.isFinite(next) ? next : 1000
									);
								})()
							)
						}
						className="w-full border border-gray-300 rounded-lg px-3 py-2"
					/>
				</div>
				<div className="flex items-center mt-6 md:mt-0">
					<label className="flex items-center text-sm text-gray-700">
						<input
							type="checkbox"
							checked={continueOnError}
							onChange={(e) =>
								setContinueOnError(e.target.checked)
							}
							className="mr-2"
						/>
						Tiếp tục khi gặp lỗi
					</label>
				</div>
			</div>

			<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
				<div>
					<label className="block text-sm font-medium text-gray-700 mb-1">
						Headless
					</label>
					<select
						value={autoOptions.headless ? "true" : "false"}
						onChange={(e) =>
							handleAutoOptionsChange(
								"headless",
								e.target.value === "true"
							)
						}
						className="w-full border border-gray-300 rounded-lg px-3 py-2">
						<option value="true">Chạy ẩn (headless)</option>
						<option value="false">Hiện cửa sổ</option>
					</select>
				</div>
				<div>
					<label className="block text-sm font-medium text-gray-700 mb-1">
						Puppeteer slowMo (ms)
					</label>
					<input
						type="number"
						min={0}
						value={autoOptions.slowMo}
						onChange={(e) =>
							handleAutoOptionsChange(
								"slowMo",
								(() => {
									const next = Number(e.target.value);
									return Math.max(
										0,
										Number.isFinite(next) ? next : 0
									);
								})()
							)
						}
						className="w-full border border-gray-300 rounded-lg px-3 py-2"
					/>
				</div>
				<div>
					<label className="block text-sm font-medium text-gray-700 mb-1">
						Typing delay (ms)
					</label>
					<input
						type="number"
						min={0}
						value={autoOptions.typingDelay}
						onChange={(e) =>
							handleAutoOptionsChange(
								"typingDelay",
								(() => {
									const next = Number(e.target.value);
									return Math.max(
										0,
										Number.isFinite(next) ? next : 0
									);
								})()
							)
						}
						className="w-full border border-gray-300 rounded-lg px-3 py-2"
					/>
				</div>
				<div className="flex items-end">
					<button
						onClick={() => {
							setAutoOptions(DEFAULT_AUTO_OPTIONS);
							setAutoDelay(1000);
						}}
						className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100">
						Khôi phục mặc định
					</button>
				</div>
			</div>

			<div className="space-y-4 mb-6">
				{validFields.map(renderAutoFieldConfig)}
			</div>

			<div className="flex flex-col md:flex-row md:items-center gap-3">
				<button
					onClick={handleAutoRun}
					disabled={autoState.running}
					className={`px-6 py-3 rounded-lg text-white font-semibold ${
						autoState.running
							? "bg-gray-400 cursor-not-allowed"
							: "bg-green-600 hover:bg-green-700"
					}`}>
					{autoState.running
						? `Đang chạy ${autoState.current}/${autoState.total}`
						: "🤖 Chạy tự động"}
				</button>
				{autoState.running && (
					<button
						onClick={stopAutoRun}
						className="px-6 py-3 rounded-lg border border-red-400 text-red-600 font-semibold hover:bg-red-50">
						Hủy
					</button>
				)}
			</div>

			{autoState.logs.length > 0 && (
				<div className="mt-6 bg-gray-50 border border-gray-200 rounded-xl p-4">
					<p className="font-semibold text-gray-800">
						Tiến trình: {autoState.current}/{autoState.total} | Lỗi:{" "}
						{autoState.errors}
					</p>
					<ul className="text-sm text-gray-700 mt-2 space-y-1 max-h-60 overflow-y-auto">
						{autoState.logs.map((log, idx) => (
							<li key={idx}>{log}</li>
						))}
					</ul>
				</div>
			)}
		</div>
	);

	return (
		<div className="w-full px-4 md:px-8 lg:px-16 xl:px-24 py-6">
			<div className="flex flex-col gap-4 mb-6 md:flex-row md:items-center md:justify-between">
				<h2 className="text-3xl font-semibold text-gray-800">
					📝 Điền Form
				</h2>
				<div className="flex gap-2">
					<button
						className={`px-4 py-2 rounded-lg text-sm font-semibold ${
							mode === "manual"
								? "bg-blue-600 text-white"
								: "bg-gray-200 text-gray-700"
						}`}
						onClick={() => setMode("manual")}>
						Điền thủ công
					</button>
					<button
						className={`px-4 py-2 rounded-lg text-sm font-semibold ${
							mode === "auto"
								? "bg-blue-600 text-white"
								: "bg-gray-200 text-gray-700"
						}`}
						onClick={() => setMode("auto")}>
						Chạy tự động
					</button>
				</div>
			</div>

			{mode === "manual" ? renderManualMode() : renderAutoMode()}
		</div>
	);
};

export default FormFillerUI;
