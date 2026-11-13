import { describe, it, expect } from "vitest";
import {
	renderTitleTemplate,
	titleUnderBase,
} from "../src/utils/session-title";

describe("renderTitleTemplate", () => {
	it("fills in {date} as the local date", () => {
		expect(
			renderTitleTemplate("Weekly review {date}", new Date(2026, 10, 3)),
		).toBe("Weekly review 2026-11-03");
	});

	it("leaves a template without {date} as it is", () => {
		expect(renderTitleTemplate("Inbox", new Date())).toBe("Inbox");
	});
});

describe("titleUnderBase", () => {
	const base = "Weekly review 2026-11-13";

	it("adds the agent's title after the base", () => {
		expect(titleUnderBase(base, "Garden beds and taxes")).toBe(
			"Weekly review 2026-11-13 · Garden beds and taxes",
		);
	});

	it("drops the template's words where the agent's title repeats them", () => {
		expect(titleUnderBase(base, "weekly review: garden beds")).toBe(
			"Weekly review 2026-11-13 · garden beds",
		);
	});

	it("keeps just the base when the agent's title is only those words", () => {
		expect(titleUnderBase(base, "Weekly Review")).toBe(base);
	});
});
