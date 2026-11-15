import { describe, expect, it } from "vitest";
import { shouldFollow } from "../src/utils/scroll-follow";

const at = (top: number, height = 2000, client = 500) => ({
	top,
	height,
	client,
});

describe("shouldFollow", () => {
	it("follows near the bottom", () => {
		expect(shouldFollow(null, at(1500))).toBe(true);
		expect(shouldFollow(at(1400), at(1480))).toBe(true);
	});

	it("stops following on any scroll up, even a few pixels from the bottom", () => {
		expect(shouldFollow(at(1500), at(1496))).toBe(false);
	});

	it("doesn't count the position falling as scrolling up when the content shrank", () => {
		expect(shouldFollow(at(1500), at(1400, 1900))).toBe(true);
	});

	it("doesn't follow far from the bottom, and picks up again on scrolling back down", () => {
		expect(shouldFollow(at(800), at(900))).toBe(false);
		expect(shouldFollow(at(1450), at(1490))).toBe(true);
	});
});
