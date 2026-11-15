/**
 * The label for a mode or config option choice: its name, unless the agent
 * sent its identifier as its name (e.g. "smart_approve" for a mode whose id is
 * "smart_approve"), in which case the identifier as words ("Smart approve").
 * Only lowercase words joined by underscores count as identifiers, so names
 * like "gpt-4" or "deepseek/deepseek-v4.1-flash" are shown as sent.
 */
export function readableChoiceName(name: string, id: string): string {
	if (name !== id || !/^[a-z]+(_[a-z]+)*$/.test(name)) return name;
	const words = name.replace(/_/g, " ");
	return words.charAt(0).toUpperCase() + words.slice(1);
}
