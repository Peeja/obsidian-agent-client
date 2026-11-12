import * as React from "react";
import { formatToolArguments } from "../utils/tool-arguments";

const { useMemo } = React;

interface ToolArgumentsProps {
	rawInput: { [k: string]: unknown };
}

/**
 * The arguments of a tool call, as the agent sent them. Shared by the
 * transcript and the permission dialog, so a request shows what it will do.
 */
export function ToolArguments({ rawInput }: ToolArgumentsProps) {
	const toolArguments = useMemo(
		() => formatToolArguments(rawInput),
		[rawInput],
	);
	if (toolArguments.length === 0) return null;

	return (
		<div className="agent-client-message-tool-call-arguments">
			{toolArguments.map((arg) => (
				<div key={arg.name}>
					<span className="agent-client-message-tool-call-argument-name">
						{arg.name}:
					</span>
					{arg.block ? (
						<pre>{arg.value}</pre>
					) : (
						<>
							{" "}
							<code>{arg.value}</code>
						</>
					)}
				</div>
			))}
		</div>
	);
}
