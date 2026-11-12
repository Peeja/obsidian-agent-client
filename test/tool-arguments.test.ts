import { describe, it, expect } from "vitest";
import { formatToolArguments } from "../src/utils/tool-arguments";

describe("formatToolArguments", () => {
	it("puts short values on their own line", () => {
		expect(
			formatToolArguments({ id: "ev1", days: 7, all: true, to: null }),
		).toEqual([
			{ name: "id", value: "ev1", block: false },
			{ name: "days", value: "7", block: false },
			{ name: "all", value: "true", block: false },
			{ name: "to", value: "null", block: false },
		]);
	});

	it("shows long or multi-line text as a block", () => {
		const long = "x".repeat(81);
		expect(
			formatToolArguments({
				text: "one\ntwo",
				long,
				short: "x".repeat(80),
			}),
		).toEqual([
			{ name: "text", value: "one\ntwo", block: true },
			{ name: "long", value: long, block: true },
			{ name: "short", value: "x".repeat(80), block: false },
		]);
	});

	it("shows small structured values compactly and large ones as indented JSON", () => {
		const big = {
			items: Array.from({ length: 10 }, (_, i) => `item ${i}`),
		};
		expect(formatToolArguments({ ids: ["a", "b"], big })).toEqual([
			{ name: "ids", value: '["a","b"]', block: false },
			{ name: "big", value: JSON.stringify(big, null, 2), block: true },
		]);
	});

	it("has nothing for no arguments", () => {
		expect(formatToolArguments({})).toEqual([]);
		expect(formatToolArguments({ gone: undefined })).toEqual([]);
	});
});
