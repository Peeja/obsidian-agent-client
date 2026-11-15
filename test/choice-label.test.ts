import { describe, expect, it } from "vitest";
import {
	choiceDescription,
	readableChoiceName,
} from "../src/utils/choice-label";

describe("readableChoiceName", () => {
	it("turns an identifier sent as the name into words", () => {
		expect(readableChoiceName("smart_approve", "smart_approve")).toBe(
			"Smart Approve",
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

describe("choiceDescription", () => {
	it("drops an opening that repeats the label", () => {
		expect(choiceDescription("Chat only, no tool calls", "Chat")).toBe(
			"No tool calls",
		);
	});

	it("keeps descriptions that don't repeat the label", () => {
		expect(choiceDescription("Ask before every tool call", "Approve")).toBe(
			"Ask before every tool call",
		);
		expect(
			choiceDescription("Automatically approve tool calls", "Auto"),
		).toBe("Automatically approve tool calls");
		expect(choiceDescription("Chatty, but careful", "Chat")).toBe(
			"Chatty, but careful",
		);
		expect(choiceDescription("Chat only", "Chat")).toBe("Chat only");
	});
});
