import { describe, it, expect, afterEach } from "vitest";
import { SessionTitleServer } from "../src/services/session-title-server";

const servers: SessionTitleServer[] = [];
afterEach(() => servers.splice(0).forEach((s) => s.close()));

async function start() {
	const titles: [string, string][] = [];
	const server = new SessionTitleServer(async (sessionId, title) => {
		titles.push([sessionId, title]);
	}, "1.0.0");
	servers.push(server);
	const config = await server.mcpServer();
	const auth = config.headers[0];
	const post = (body: unknown, headers: Record<string, string> = {}) =>
		fetch(config.url, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				[auth.name]: auth.value,
				...headers,
			},
			body: JSON.stringify(body),
		});
	const call = async (method: string, params?: unknown) => {
		const res = await post({ jsonrpc: "2.0", id: 1, method, params });
		return (await res.json()) as { result?: any; error?: any };
	};
	return { config, titles, post, call };
}

describe("SessionTitleServer", () => {
	it("listens on 127.0.0.1 with a bearer token", async () => {
		const { config } = await start();
		expect(config.url).toMatch(/^http:\/\/127\.0\.0\.1:\d+\/mcp$/);
		expect(config.headers[0].value).toMatch(/^Bearer [0-9a-f]{64}$/);
	});

	it("refuses requests without the token", async () => {
		const { config } = await start();
		const res = await fetch(config.url, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				jsonrpc: "2.0",
				id: 1,
				method: "tools/list",
			}),
		});
		expect(res.status).toBe(401);
	});

	it("answers initialize with the client's protocol version", async () => {
		const { call } = await start();
		const { result } = await call("initialize", {
			protocolVersion: "2025-03-26",
			capabilities: {},
			clientInfo: { name: "test", version: "0" },
		});
		expect(result.protocolVersion).toBe("2025-03-26");
		expect(result.capabilities.tools).toBeDefined();
	});

	it("accepts notifications with 202", async () => {
		const { post } = await start();
		const res = await post({
			jsonrpc: "2.0",
			method: "notifications/initialized",
		});
		expect(res.status).toBe(202);
	});

	it("lists set_session_title", async () => {
		const { call } = await start();
		const { result } = await call("tools/list");
		expect(result.tools.map((t: { name: string }) => t.name)).toEqual([
			"set_session_title",
		]);
	});

	it("titles the session named in _meta", async () => {
		const { call, titles } = await start();
		const { result } = await call("tools/call", {
			name: "set_session_title",
			arguments: { title: "  Weekly review 2026-11-13 " },
			_meta: { "agent-session-id": "s1" },
		});
		expect(result.isError).toBe(false);
		expect(titles).toEqual([["s1", "Weekly review 2026-11-13"]]);
	});

	it("falls back to the agent-session-id header", async () => {
		const { post, titles } = await start();
		await post(
			{
				jsonrpc: "2.0",
				id: 1,
				method: "tools/call",
				params: {
					name: "set_session_title",
					arguments: { title: "T" },
				},
			},
			{ "agent-session-id": "s2" },
		);
		expect(titles).toEqual([["s2", "T"]]);
	});

	it("reports an error without a session id or title", async () => {
		const { call, titles } = await start();
		const noSession = await call("tools/call", {
			name: "set_session_title",
			arguments: { title: "T" },
		});
		expect(noSession.result.isError).toBe(true);
		const noTitle = await call("tools/call", {
			name: "set_session_title",
			arguments: { title: " " },
			_meta: { "agent-session-id": "s1" },
		});
		expect(noTitle.result.isError).toBe(true);
		expect(titles).toEqual([]);
	});

	it("refuses other HTTP methods", async () => {
		const { config } = await start();
		const res = await fetch(config.url, {
			headers: { [config.headers[0].name]: config.headers[0].value },
		});
		expect(res.status).toBe(405);
	});
});
