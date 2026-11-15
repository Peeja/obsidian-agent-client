import { describe, expect, it } from "vitest";
import { readableChoiceName } from "../src/utils/choice-label";

describe("readableChoiceName", () => {
	it("turns an identifier sent as the name into words", () => {
		expect(readableChoiceName("smart_approve", "smart_approve")).toBe(
			"Smart approve",
		);
		expect(readableChoiceName("auto", "auto")).toBe("Auto");
		expect(readableChoiceName("off", "off")).toBe("Off");
	});

	it("shows real names as sent", () => {
		expect(readableChoiceName("Plan", "plan")).toBe("Plan");
		expect(readableChoiceName("Ask before edits", "default")).toBe(
			"Ask before edits",
		);
	});

	it("leaves names that aren't plain identifiers alone, such as model ids", () => {
		expect(readableChoiceName("gpt-4", "gpt-4")).toBe("gpt-4");
		expect(
			readableChoiceName(
				"deepseek/deepseek-v4.1-flash",
				"deepseek/deepseek-v4.1-flash",
			),
		).toBe("deepseek/deepseek-v4.1-flash");
		expect(readableChoiceName("o3", "o3")).toBe("o3");
	});
});
