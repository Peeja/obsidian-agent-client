import type { PermissionOption } from "../types/chat";

const KIND_LABELS: Record<PermissionOption["kind"], string> = {
	allow_once: "Allow once",
	allow_always: "Always allow",
	reject_once: "Reject once",
	reject_always: "Always reject",
};

/**
 * The label for a permission option: its name, unless the agent sent the
 * option's own kind as its name (e.g. "allow_always"), in which case a
 * readable label for that kind. A name that is a different kind is shown as
 * sent, since the label would then be a guess at what the option does.
 */
export function permissionOptionLabel(option: PermissionOption): string {
	return option.name === option.kind ? KIND_LABELS[option.kind] : option.name;
}
