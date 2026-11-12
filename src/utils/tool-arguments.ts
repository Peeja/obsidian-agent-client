/**
 * Arguments of a tool call, as the agent sent them in `rawInput`, laid out
 * for display: short values on one line, long or multi-line text and
 * structured values as a block.
 */

/** Longest value shown on the argument's own line */
const INLINE_LIMIT = 80;

export interface ToolArgument {
	name: string;
	value: string;
	/** Show as a block (long or multi-line text, nested values) */
	block: boolean;
}

export function formatToolArguments(rawInput: {
	[k: string]: unknown;
}): ToolArgument[] {
	return Object.entries(rawInput)
		.filter(([, value]) => value !== undefined)
		.map(([name, value]) => {
			if (typeof value === "string") {
				return {
					name,
					value,
					block: value.includes("\n") || value.length > INLINE_LIMIT,
				};
			}
			if (value === null || typeof value !== "object") {
				return { name, value: String(value), block: false };
			}
			const compact = JSON.stringify(value);
			return compact.length <= INLINE_LIMIT
				? { name, value: compact, block: false }
				: { name, value: JSON.stringify(value, null, 2), block: true };
		});
}
