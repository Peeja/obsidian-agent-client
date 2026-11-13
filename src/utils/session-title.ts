/**
 * Per-agent session titles: a custom agent's "Session title" template (e.g.
 * "Weekly review {date}") titles its new sessions, and a title the agent
 * sends later is added after it.
 */

/** Fill in a session title template. {date} is the local date, YYYY-MM-DD. */
export function renderTitleTemplate(template: string, now: Date): string {
	const pad = (n: number) => String(n).padStart(2, "0");
	const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
	return template.replace(/\{date\}/g, date).trim();
}

/**
 * The title for an agent-given title under a template's title. Where the
 * agent's title repeats the template's words ("Weekly review: garden beds"
 * under "Weekly review 2026-11-13"), they're dropped.
 */
export function titleUnderBase(base: string, agentTitle: string): string {
	const lead = base.replace(/\d{4}-\d{2}-\d{2}/g, "").trim();
	let rest = agentTitle.trim();
	if (lead && rest.toLowerCase().startsWith(lead.toLowerCase())) {
		rest = rest.slice(lead.length).replace(/^[\s:;,·–—-]+/, "");
	}
	return rest ? `${base} · ${rest}` : base;
}
