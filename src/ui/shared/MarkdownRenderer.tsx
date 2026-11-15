import * as React from "react";
const { useRef, useEffect } = React;
import {
	Component,
	FileSystemAdapter,
	getLinkpath,
	MarkdownRenderer as ObsidianMarkdownRenderer,
	parseLinktext,
	resolveSubpath,
	Platform,
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

		// Note views mark links to notes that don't exist yet, but the renderer
		// doesn't; mark them so the theme styles them the same way, and again
		// whenever notes are created, renamed or deleted, as note views do.
		const markUnresolved = () => {
			el.querySelectorAll("a.internal-link").forEach((link) => {
				const rawHref = link.getAttribute("data-href");
				if (!rawHref) return;
				const href = decodeURIComponent(rawHref);
				if (isAbsolutePath(href)) return;
				const dest = plugin.app.metadataCache.getFirstLinkpathDest(
					getLinkpath(href),
					"",
				);
				link.classList.toggle("is-unresolved", !dest);
			});
		};

		// Rendered outside a note view, Obsidian embeds the whole note when an
		// embed's heading or block isn't in it. That's rarely what's wanted in a
		// chat, so say it's missing instead, as note views do.
		const replaceMissingSections = () => {
			el.querySelectorAll(".internal-embed[src*='#']").forEach((embed) => {
				const { path, subpath } = parseLinktext(
					embed.getAttribute("src") ?? "",
				);
				const file = plugin.app.metadataCache.getFirstLinkpathDest(
					path,
					"",
				);
				if (!file || file.extension !== "md" || !subpath) return;
				const cache = plugin.app.metadataCache.getFileCache(file);
				if (!cache || resolveSubpath(cache, subpath)) return;
				const missing = createSpan({
					cls: "agent-client-missing-section",
					text: `Unable to find “${subpath.slice(1)}” in `,
				});
				missing.createEl("a", {
					cls: "internal-link",
					text: file.basename,
					attr: { "data-href": file.path, href: file.path },
				});
				embed.replaceWith(missing);
			});
		};

		// Render markdown
		void ObsidianMarkdownRenderer.render(
			plugin.app,
			text,
			el,
			"",
			component,
		).then(() => {
			replaceMissingSections();
			markUnresolved();
		});

		component.registerEvent(
			plugin.app.metadataCache.on("resolved", markUnresolved),
		);

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
