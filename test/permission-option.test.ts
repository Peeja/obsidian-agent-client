import { describe, it, expect } from "vitest";
import { permissionOptionLabel } from "../src/utils/permission-option";

describe("permissionOptionLabel", () => {
	it("keeps a name written for people", () => {
		expect(
			permissionOptionLabel({
				optionId: "allow",
				name: "Allow",
				kind: "allow_once",
			}),
		).toBe("Allow");
	});

	it("labels an option whose name is its own kind", () => {
		expect(
			permissionOptionLabel({
				optionId: "allow_always",
				name: "allow_always",
				kind: "allow_always",
			}),
		).toBe("Always allow");
		expect(
			permissionOptionLabel({
				optionId: "x",
				name: "reject_once",
				kind: "reject_once",
			}),
		).toBe("Reject once");
	});

	it("shows a name that is a different kind as sent", () => {
		expect(
			permissionOptionLabel({
				optionId: "reject_once",
				name: "reject_once",
				kind: "allow_once",
			}),
		).toBe("reject_once");
	});
});
