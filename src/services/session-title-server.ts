import { createServer, IncomingMessage, Server, ServerResponse } from "http";
import { randomBytes, timingSafeEqual } from "crypto";
import type { AddressInfo } from "net";

/**
 * A small MCP server, offered to agents in session/new (and load, resume,
 * fork), with one tool: set_session_title. It lets the model title its own
 * session, e.g. when the user's instructions say how sessions should be named.
 *
 * It speaks just enough of MCP's Streamable HTTP transport for that (JSON
 * responses to POSTed JSON-RPC, no event streams), on 127.0.0.1 with a random
 * port and a random bearer token, so only agents this plugin starts can call
 * it. The agent says which session a call is for in the request's _meta
 * ("agent-session-id", as Goose sends it) or in a header of the same name.
 *
 * ACP's experimental MCP-over-ACP transport ("acp" servers, mcp/connect and
 * mcp/message) would do the same without a port; once agents support it, the
 * handler can move there.
 */

export const SESSION_TITLE_SERVER_NAME = "agent-client";

const SESSION_ID_KEY = "agent-session-id";
const MAX_BODY_BYTES = 64 * 1024;
const DEFAULT_PROTOCOL_VERSION = "2025-06-18";

const SET_SESSION_TITLE_TOOL = {
	name: "set_session_title",
	title: "Set session title",
	description:
		"Set the title this chat session is listed under (its tab, the session history and the session manager). Use it when your instructions say how to title the session. Call it again to change the title; a title the user sets themselves takes precedence.",
	inputSchema: {
		type: "object",
		properties: {
			title: {
				type: "string",
				description: "The session's new title, a short line of text.",
			},
		},
		required: ["title"],
		additionalProperties: false,
	},
	annotations: {
		readOnlyHint: false,
		destructiveHint: false,
		idempotentHint: true,
		openWorldHint: false,
	},
};

/** The server as ACP describes an HTTP MCP server, for session/new etc. */
export interface HttpMcpServer {
	type: "http";
	name: string;
	url: string;
	headers: { name: string; value: string }[];
}

interface JsonRpcMessage {
	jsonrpc?: string;
	id?: string | number | null;
	method?: string;
	params?: Record<string, unknown>;
}

type JsonRpcReply =
	| { jsonrpc: "2.0"; id: string | number | null; result: unknown }
	| {
			jsonrpc: "2.0";
			id: string | number | null;
			error: { code: number; message: string };
	  };

export class SessionTitleServer {
	private server: Server;
	private token = randomBytes(32).toString("hex");
	private listening: Promise<number>;

	/**
	 * @param setTitle - Titles a session; called for each set_session_title call.
	 * @param version - Reported to agents as the server's version.
	 */
	constructor(
		private setTitle: (sessionId: string, title: string) => Promise<void>,
		private version: string,
	) {
		this.server = createServer((req, res) => {
			void this.handle(req, res);
		});
		this.listening = new Promise((resolve, reject) => {
			this.server.once("error", reject);
			this.server.listen(0, "127.0.0.1", () => {
				resolve((this.server.address() as AddressInfo).port);
			});
		});
	}

	/** The server for an agent's mcpServers list, once it's listening. */
	async mcpServer(): Promise<HttpMcpServer> {
		const port = await this.listening;
		return {
			type: "http",
			name: SESSION_TITLE_SERVER_NAME,
			url: `http://127.0.0.1:${port}/mcp`,
			headers: [{ name: "Authorization", value: `Bearer ${this.token}` }],
		};
	}

	close(): void {
		this.server.close();
	}

	private authorized(req: IncomingMessage): boolean {
		const given = Buffer.from(req.headers.authorization ?? "");
		const expected = Buffer.from(`Bearer ${this.token}`);
		return (
			given.length === expected.length && timingSafeEqual(given, expected)
		);
	}

	private async handle(
		req: IncomingMessage,
		res: ServerResponse,
	): Promise<void> {
		if (!this.authorized(req)) {
			res.writeHead(401).end();
			return;
		}
		if (req.url !== "/mcp") {
			res.writeHead(404).end();
			return;
		}
		// No event stream (GET) or session to end (DELETE): POST only.
		if (req.method !== "POST") {
			res.writeHead(405, { Allow: "POST" }).end();
			return;
		}

		let body: unknown;
		try {
			body = JSON.parse(await readBody(req));
		} catch {
			sendJson(res, {
				jsonrpc: "2.0",
				id: null,
				error: { code: -32700, message: "Parse error" },
			});
			return;
		}

		const messages = (
			Array.isArray(body) ? body : [body]
		) as JsonRpcMessage[];
		const replies: JsonRpcReply[] = [];
		for (const message of messages) {
			// Notifications and responses get no reply.
			if (
				message?.id === undefined ||
				message.id === null ||
				!message.method
			) {
				continue;
			}
			replies.push(await this.reply(message, req));
		}

		if (replies.length === 0) {
			res.writeHead(202).end();
		} else {
			sendJson(res, Array.isArray(body) ? replies : replies[0]);
		}
	}

	private async reply(
		message: JsonRpcMessage,
		req: IncomingMessage,
	): Promise<JsonRpcReply> {
		const id = message.id ?? null;
		const params = message.params ?? {};
		const result = (value: unknown): JsonRpcReply => ({
			jsonrpc: "2.0",
			id,
			result: value,
		});
		const error = (code: number, text: string): JsonRpcReply => ({
			jsonrpc: "2.0",
			id,
			error: { code, message: text },
		});

		switch (message.method) {
			case "initialize":
				return result({
					protocolVersion:
						typeof params.protocolVersion === "string"
							? params.protocolVersion
							: DEFAULT_PROTOCOL_VERSION,
					capabilities: { tools: { listChanged: false } },
					serverInfo: {
						name: SESSION_TITLE_SERVER_NAME,
						version: this.version,
					},
				});
			case "ping":
				return result({});
			case "tools/list":
				return result({ tools: [SET_SESSION_TITLE_TOOL] });
			case "tools/call": {
				if (params.name !== SET_SESSION_TITLE_TOOL.name) {
					return error(
						-32602,
						`Unknown tool: ${String(params.name)}`,
					);
				}
				const args = (params.arguments ?? {}) as Record<
					string,
					unknown
				>;
				const title =
					typeof args.title === "string" ? args.title.trim() : "";
				if (!title) {
					return result(toolText("The title can't be empty.", true));
				}
				const sessionId = sessionIdOf(params, req);
				if (!sessionId) {
					return result(
						toolText(
							"Couldn't tell which session this is: the agent didn't send its session id.",
							true,
						),
					);
				}
				try {
					await this.setTitle(sessionId, title);
				} catch (e) {
					return result(
						toolText(
							`The title wasn't saved: ${e instanceof Error ? e.message : String(e)}`,
							true,
						),
					);
				}
				return result(toolText(`Titled the session "${title}".`));
			}
			default:
				return error(-32601, `Method not found: ${message.method}`);
		}
	}
}

function toolText(text: string, isError = false) {
	return { content: [{ type: "text", text }], isError };
}

/** The session a call is for: from the request's _meta, else its header. */
function sessionIdOf(
	params: Record<string, unknown>,
	req: IncomingMessage,
): string | undefined {
	const meta = params._meta as Record<string, unknown> | undefined;
	const fromMeta = meta?.[SESSION_ID_KEY];
	if (typeof fromMeta === "string" && fromMeta) return fromMeta;
	const fromHeader = req.headers[SESSION_ID_KEY];
	return typeof fromHeader === "string" && fromHeader
		? fromHeader
		: undefined;
}

function readBody(req: IncomingMessage): Promise<string> {
	return new Promise((resolve, reject) => {
		const chunks: Buffer[] = [];
		let size = 0;
		req.on("data", (chunk: Buffer) => {
			size += chunk.length;
			if (size > MAX_BODY_BYTES) {
				reject(new Error("Request too large"));
				req.destroy();
				return;
			}
			chunks.push(chunk);
		});
		req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
		req.on("error", reject);
	});
}

function sendJson(res: ServerResponse, value: unknown): void {
	res.writeHead(200, { "Content-Type": "application/json" }).end(
		JSON.stringify(value),
	);
}
