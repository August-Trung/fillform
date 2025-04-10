import { SVGProps } from "react";

export type IconSvgProps = SVGProps<SVGSVGElement> & {
	size?: number;
};

export type FormField = {
	id: number;
	title: string;
	type: string; // e.g. "text", "multiple-choice"
	options?: string[];
	entryId?: string;
};

export interface FieldConfig {
	options: any;
	id: number;
	title: string;
	type: string;
	variable: string;
	customOptions: {
		defaultCount?: number;
		maxSelect?: number;
		shuffleOptions?: number;
		[key: string]: any;
	};
	entryId?: string;
}
