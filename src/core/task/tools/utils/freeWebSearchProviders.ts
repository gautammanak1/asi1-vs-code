import axios from "axios";
import { getAxiosSettings } from "@/shared/net";
import { Logger } from "@/shared/services/Logger";

export type WebSearchHit = { title: string; url: string };

const DDG_HTML = "https://html.duckduckgo.com/html/";
const MAX_RESULTS = 12;

/**
 * Free, no-API-key web search via DuckDuckGo HTML results (best-effort parsing).
 * Used when the hosted /api/v1/search/websearch endpoint is unavailable or fails.
 */
export async function searchDuckDuckGoHtml(
	query: string,
): Promise<WebSearchHit[]> {
	const q = query.trim();
	if (!q) {
		return [];
	}

	let html: string;
	try {
		const res = await axios.get<string>(DDG_HTML, {
			params: { q },
			headers: {
				"User-Agent":
					"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
				Accept: "text/html,application/xhtml+xml",
				"Accept-Language": "en-US,en;q=0.9",
			},
			timeout: 20000,
			...getAxiosSettings(),
		});
		html = res.data;
	} catch (e) {
		Logger.warn(
			`[freeWebSearch] DuckDuckGo HTML request failed: ${(e as Error).message}`,
		);
		return searchDuckDuckGoJson(q);
	}

	const fromHtml = parseDuckDuckGoResultHtml(html);
	if (fromHtml.length > 0) {
		return fromHtml;
	}
	Logger.warn(
		"[freeWebSearch] DuckDuckGo HTML returned 0 parsed links; trying JSON API",
	);
	return searchDuckDuckGoJson(q);
}

/** Fallback: DuckDuckGo Instant Answer JSON (fewer links, but works when HTML layout changes). */
async function searchDuckDuckGoJson(query: string): Promise<WebSearchHit[]> {
	try {
		const { data } = await axios.get<DdgJsonResponse>(
			"https://api.duckduckgo.com/",
			{
				params: {
					q: query,
					format: "json",
					no_html: 1,
					skip_disambig: 1,
				},
				headers: {
					"User-Agent":
						"Mozilla/5.0 (compatible; FetchCoder/1.0; +https://github.com/gautammanak1/asi1-vs-code)",
				},
				timeout: 15000,
				...getAxiosSettings(),
			},
		);
		return ddgJsonToHits(data);
	} catch (e) {
		Logger.warn(
			`[freeWebSearch] DuckDuckGo JSON failed: ${(e as Error).message}`,
		);
		return [];
	}
}

interface DdgJsonTopic {
	FirstURL?: string;
	Text?: string;
	Topics?: DdgJsonTopic[];
}

interface DdgJsonResponse {
	AbstractURL?: string;
	Heading?: string;
	RelatedTopics?: DdgJsonTopic[];
}

function ddgJsonToHits(data: DdgJsonResponse): WebSearchHit[] {
	const out: WebSearchHit[] = [];
	if (data.AbstractURL && data.Heading) {
		out.push({ title: data.Heading, url: data.AbstractURL });
	}
	const walk = (topics: DdgJsonTopic[] | undefined) => {
		if (!topics) {
			return;
		}
		for (const t of topics) {
			if (out.length >= MAX_RESULTS) {
				return;
			}
			if (t.FirstURL && t.Text) {
				const title = t.Text.replace(/\s+/g, " ").trim().slice(0, 220);
				if (title) {
					out.push({ title, url: t.FirstURL });
				}
			}
			if (t.Topics) {
				walk(t.Topics);
			}
		}
	};
	walk(data.RelatedTopics);
	return out;
}

function unwrapDdgRedirect(href: string): string {
	try {
		if (href.includes("uddg=")) {
			const u = new URL(href, "https://duckduckgo.com");
			const uddg = u.searchParams.get("uddg");
			if (uddg) {
				return decodeURIComponent(uddg);
			}
		}
	} catch {
		/* keep href */
	}
	if (href.startsWith("//")) {
		return `https:${href}`;
	}
	return href;
}

/**
 * Parses DuckDuckGo HTML result links (class result__a).
 */
export function parseDuckDuckGoResultHtml(html: string): WebSearchHit[] {
	const out: WebSearchHit[] = [];
	const re = /class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
	let m: RegExpExecArray | null;
	while ((m = re.exec(html)) !== null) {
		const rawHref = m[1];
		const title = m[2]
			.replace(/<[^>]+>/g, "")
			.replace(/\s+/g, " ")
			.trim();
		if (!title) {
			continue;
		}
		const url = unwrapDdgRedirect(rawHref);
		if (!url.startsWith("http")) {
			continue;
		}
		out.push({ title, url });
		if (out.length >= MAX_RESULTS) {
			break;
		}
	}

	if (out.length === 0) {
		Logger.warn(
			"[freeWebSearch] DuckDuckGo HTML parse returned 0 results (markup may have changed)",
		);
	}
	return out;
}

/** Apply allowed/blocked domain filters client-side (hosted API applies these server-side). */
export function filterHitsByDomains(
	hits: WebSearchHit[],
	allowedDomains: string[],
	blockedDomains: string[],
): WebSearchHit[] {
	if (allowedDomains.length > 0) {
		return hits.filter((h) =>
			allowedDomains.some((d) =>
				h.url
					.toLowerCase()
					.includes(d.replace(/^https?:\/\//, "").toLowerCase()),
			),
		);
	}
	if (blockedDomains.length > 0) {
		return hits.filter(
			(h) =>
				!blockedDomains.some((d) =>
					h.url
						.toLowerCase()
						.includes(d.replace(/^https?:\/\//, "").toLowerCase()),
				),
		);
	}
	return hits;
}

export function formatWebSearchHits(
	prefix: string,
	results: WebSearchHit[],
): string {
	const n = results.length;
	let text = `${prefix} (${n} results found)`;
	if (n === 0) {
		return `${text}.\n\nNo links parsed — try a different query or use the hosted search when signed in.`;
	}
	text += ":\n\n";
	results.forEach((result, index) => {
		text += `${index + 1}. ${result.title}\n   ${result.url}\n\n`;
	});
	return text;
}
