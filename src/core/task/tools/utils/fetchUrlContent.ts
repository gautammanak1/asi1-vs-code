import * as cheerio from "cheerio"
import axios from "axios"
import TurndownService from "turndown"
import { UrlContentFetcher } from "@/services/browser/UrlContentFetcher"
import { Logger } from "@/shared/services/Logger"

/**
 * Fetch URL as markdown: try lightweight HTTP + Turndown first; fall back to headless Chromium.
 */
export async function fetchUrlContentAsMarkdown(url: string): Promise<string> {
	try {
		const res = await axios.get<string>(url, {
			timeout: 20_000,
			maxRedirects: 5,
			headers: {
				"User-Agent":
					"Mozilla/5.0 (compatible; FetchCoder/1.0; +https://asi1.ai) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
				Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
			},
			validateStatus: (s) => s >= 200 && s < 400,
			responseType: "text",
		})
		const html = typeof res.data === "string" ? res.data : String(res.data)
		const $ = cheerio.load(html)
		$("script, style, noscript, iframe, svg").remove()
		const htmlSnippet = $("body").length ? $("body").html() || "" : $.html() || ""
		const md = new TurndownService().turndown(htmlSnippet)
		if (md.trim().length > 120) {
			return md.trim()
		}
		throw new Error("Insufficient text from HTTP response")
	} catch (e) {
		Logger.log(`[fetchUrlContentAsMarkdown] HTTP path failed for ${url}, trying browser:`, e)
		const fetcher = new UrlContentFetcher()
		try {
			await fetcher.launchBrowser()
			const md = await fetcher.urlToMarkdown(url)
			await fetcher.closeBrowser()
			return md.trim()
		} catch (err) {
			await fetcher.closeBrowser().catch(() => {})
			throw err
		}
	}
}
