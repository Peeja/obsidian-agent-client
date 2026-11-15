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

/**
 * A choice's description as shown after its label: without an opening that
 * just repeats the label ("Chat only, no tool calls" for "Chat" becomes "No
 * tool calls"). Only an opening up to the first comma is dropped, and only when
 * it starts with the label as a whole word.
 */
export function choiceDescription(description: string, label: string): string {
	const comma = description.indexOf(",");
	const opening = comma < 0 ? "" : description.slice(0, comma);
	const repeats =
		opening.toLowerCase() === label.toLowerCase() ||
		opening.toLowerCase().startsWith(`${label.toLowerCase()} `);
	if (!repeats) return description;
	const rest = description.slice(comma + 1).trim();
	return rest ? rest.charAt(0).toUpperCase() + rest.slice(1) : description;
}
