import * as React from "react";
const { useRef, useEffect } = React;
import {
	Component,
	FileSystemAdapter,
	Keymap,
	MarkdownRenderer as ObsidianMarkdownRenderer,
	Platform,
	setIcon,
	setTooltip,
} from "obsidian";
import { convertWslPathToWindows } from "../../utils/platform";
import { isAbsolutePath } from "../../utils/paths";
import type AgentClientPlugin from "../../plugin";

interface MarkdownRendererProps {
	text: string;
	plugin: AgentClientPlugin;
}

export function MarkdownRenderer({ text, plugin }: MarkdownRendererProps) {
	const containerRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const el = containerRef.current;
		if (!el) return;
		el.empty?.();
		el.classList.add("markdown-rendered");

		// Create a temporary component for the markdown renderer lifecycle
		const component = new Component();
		component.load();

		// Note views give each embedded note an "Open link" button in its corner;
		// the embeds the renderer makes don't have one. Add it, with the same
		// markup, so the theme draws it the same way.
		const addEmbedLinks = () => {
			el.querySelectorAll<HTMLElement>(
				".internal-embed.markdown-embed[src]",
			).forEach((embed) => {
				if (embed.querySelector(":scope > .markdown-embed-link")) return;
				const src = embed.getAttribute("src")!;
				const link = embed.createDiv("markdown-embed-link");
				setIcon(link, "lucide-maximize-2");
				setTooltip(link, "Open link");
				link.addEventListener("click", (e) => {
					e.preventDefault();
					e.stopPropagation();
					void plugin.app.workspace.openLinkText(
						src,
						"",
						Keymap.isModEvent(e),
					);
				});
			});
		};

		// Render markdown
		void ObsidianMarkdownRenderer.render(
			plugin.app,
			text,
			el,
			"",
			component,
		).then(addEmbedLinks);

		// Handle internal link clicks
		const vaultBasePath =
			plugin.app.vault.adapter instanceof FileSystemAdapter
				? plugin.app.vault.adapter.getBasePath()
				: null;

		// Prepare normalized vault base path for comparison (forward slashes)
		const isWslMode = Platform.isWin && plugin.settings.windowsWslMode;
		const normalizedVaultBase = vaultBasePath
			? vaultBasePath.replace(/\\/g, "/").replace(/\/+$/, "")
			: null;

		const handleInternalLinkClick = (e: MouseEvent) => {
			const target = e.target as HTMLElement;
			const link = target.closest("a.internal-link");
			if (link) {
				e.preventDefault();
				const rawHref = link.getAttribute("data-href");
				if (rawHref) {
					let href = decodeURIComponent(rawHref);

					// WSL mode: convert /mnt/c/... paths to Windows format
					if (isWslMode && href.startsWith("/mnt/")) {
						href = convertWslPathToWindows(href);
					}

					// Normalize for comparison (forward slashes)
					const normalizedHref = href.replace(/\\/g, "/");

					if (
						normalizedVaultBase &&
						normalizedHref.startsWith(normalizedVaultBase + "/")
					) {
						// Absolute vault path → convert to relative
						const relativePath = normalizedHref.slice(
							normalizedVaultBase.length + 1,
						);
						void plugin.app.workspace.openLinkText(
							relativePath,
							"",
						);
					} else if (!isAbsolutePath(href)) {
						// Already relative or wiki-link style — pass through
						void plugin.app.workspace.openLinkText(href, "");
					}
					// Absolute path outside vault — ignore
				}
			}
		};
		el.addEventListener("click", handleInternalLinkClick);

		return () => {
			el.removeEventListener("click", handleInternalLinkClick);
			component.unload();
		};
	}, [text, plugin]);

	return (
		<div
			ref={containerRef}
			className="agent-client-markdown-text-renderer"
		/>
	);
}
