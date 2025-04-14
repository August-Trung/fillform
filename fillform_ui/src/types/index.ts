import { SVGProps } from "react";

// Icon SVG chung
export type IconSvgProps = SVGProps<SVGSVGElement> & {
	size?: number;
};

// Dữ liệu câu hỏi lấy từ Google Form
export type FormField = {
	id: number;
	type:
		| "text"
		| "paragraph"
		| "multiple-choice"
		| "checkbox"
		| "dropdown"
		| string;
	question?: string;
	options?: string[];
	entryId?: string;
	sectionTitle?: string;
	description?: string;
	required?: boolean;
	section?: string;
	imageUrl?: string;
};

// Cấu hình chung của form (từ BE)
export interface ParsedFormConfig {
	isValidCollectEmail: boolean;
	isValidEditAnswer: boolean;
	isValidLimitRes: boolean;
	isValidPublished: boolean;
	lang: string;
}

// Cấu hình từng trường để điền form
export interface FieldConfig {
	id: number;
	type: string;
	variable: string;
	question?: string;
	options?: string[];
	customOptions: {
		defaultCount?: number;
		maxSelect?: number;
		shuffleOptions?: number;
		[key: string]: any;
	};
	entryId?: string;
	sectionTitle?: string;
}

// ParsedForm tổng thể
export interface ParsedForm {
	form: {
		slug: string;
		idviewform: string;
		name: string;
		urlMain: string;
		urlCopy: string;
		loaddata: FormField[];
		sections: { id: number; index: number }[];
		page_histories: any[];
		owner: string | null;
		owner_id: string | null;
		version: string;
		createdAt: string;
		updatedAt: string;
		id: string;
	};
	latest_form_questions: FormField[];
	formConfig: ParsedFormConfig;
}
