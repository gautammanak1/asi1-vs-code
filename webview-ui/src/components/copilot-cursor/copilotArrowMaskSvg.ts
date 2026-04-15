/**
 * Smooth rounded pointer — adapted from Lucide "mouse-pointer-2" (ISC).
 * 24×24 viewBox; soft corners, no sharp tip.
 */
export const COPILOT_CURSOR_ARROW_PATH =
	"M4.037 4.688a.495.495 0 0 1 .651-.651l16 6.5a.5.5 0 0 1-.063.947l-6.124 1.58a2 2 0 0 0-1.438 1.435l-1.579 6.126a.5.5 0 0 1-.947.063z";

export function copilotCursorMaskDataUrl(pathD: string): string {
	const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="white" d="${pathD}"/></svg>`;
	return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}
