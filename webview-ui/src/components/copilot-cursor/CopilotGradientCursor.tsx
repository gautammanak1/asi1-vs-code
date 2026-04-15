import {
	type CSSProperties,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import {
	COPILOT_CURSOR_ARROW_PATH,
	copilotCursorMaskDataUrl,
} from "./copilotArrowMaskSvg";
import "./copilot-gradient-cursor.css";

export type CopilotGradientCursorProps = {
	/** When false, nothing is rendered and no listeners run. */
	enabled?: boolean;
	/** Faint motion trail (gradient wisps). Default true. */
	trail?: boolean;
	/** Adds `copilot-cursor-scope` to `document.getElementById(rootId)` for `cursor: none`. Default true when enabled. */
	applyScopeClass?: boolean;
	rootId?: string;
};

const MASK = copilotCursorMaskDataUrl(COPILOT_CURSOR_ARROW_PATH);

/** Pointer tip in 24×24 viewBox (Lucide mouse-pointer-2) — aligns click hotspot. */
const HOTSPOT_X = 4;
const HOTSPOT_Y = 5;

function isTextualElement(el: Element | null): boolean {
	if (!el) {
		return false;
	}
	const tag = el.tagName;
	if (tag === "TEXTAREA" || tag === "SELECT") {
		return true;
	}
	if (tag === "INPUT") {
		const t = (el as HTMLInputElement).type;
		return (
			t === "text" ||
			t === "search" ||
			t === "email" ||
			t === "password" ||
			t === "url" ||
			t === "tel" ||
			t === "number"
		);
	}
	if (
		el.hasAttribute("contenteditable") &&
		el.getAttribute("contenteditable") === "true"
	) {
		return true;
	}
	if (
		el.classList.contains("cm-editor") ||
		el.getAttribute("role") === "textbox"
	) {
		return true;
	}
	return false;
}

function isInteractiveElement(el: Element | null): boolean {
	if (!el) {
		return false;
	}
	const tag = el.tagName;
	if (tag === "A" || tag === "BUTTON" || tag === "SUMMARY") {
		return true;
	}
	const role = el.getAttribute("role");
	if (
		role === "button" ||
		role === "link" ||
		role === "menuitem" ||
		role === "tab"
	) {
		return true;
	}
	return Boolean(
		el.closest("button,a[href],[role='button'],[data-copilot-cursor-bright]"),
	);
}

export function CopilotGradientCursor({
	enabled = true,
	trail = true,
	applyScopeClass = true,
	rootId = "root",
}: CopilotGradientCursorProps) {
	const [pos, setPos] = useState({ x: 0, y: 0 });
	const [hidden, setHidden] = useState(true);
	const [bright, setBright] = useState(false);
	const trailSeq = useRef(0);
	const lastTrailAt = useRef(0);
	const [trailDots, setTrailDots] = useState<
		{ id: number; x: number; y: number }[]
	>([]);

	const maskStyle = useMemo(
		(): CSSProperties => ({
			maskImage: MASK,
			WebkitMaskImage: MASK,
		}),
		[],
	);

	const pushTrailDot = useCallback((x: number, y: number) => {
		const now = performance.now();
		if (now - lastTrailAt.current < 42) {
			return;
		}
		lastTrailAt.current = now;
		const id = trailSeq.current++;
		setTrailDots((prev) => [...prev.slice(-7), { id, x, y }]);
		window.setTimeout(() => {
			setTrailDots((prev) => prev.filter((d) => d.id !== id));
		}, 520);
	}, []);

	const onMove = useCallback(
		(e: MouseEvent) => {
			const x = e.clientX;
			const y = e.clientY;
			setPos({ x, y });
			setHidden(false);

			const target = e.target as Element | null;
			if (isTextualElement(target)) {
				setHidden(true);
				setBright(false);
				return;
			}
			setBright(isInteractiveElement(target));

			if (trail) {
				pushTrailDot(x, y);
			}
		},
		[trail, pushTrailDot],
	);

	const onLeave = useCallback(() => {
		setHidden(true);
	}, []);

	useEffect(() => {
		if (!enabled) {
			return;
		}
		window.addEventListener("mousemove", onMove, { passive: true });
		document.addEventListener("mouseleave", onLeave);
		return () => {
			window.removeEventListener("mousemove", onMove);
			document.removeEventListener("mouseleave", onLeave);
		};
	}, [enabled, onMove, onLeave]);

	useEffect(() => {
		if (!enabled || !applyScopeClass) {
			return;
		}
		const root = document.getElementById(rootId);
		if (!root) {
			return;
		}
		root.classList.add("copilot-cursor-scope");
		return () => {
			root.classList.remove("copilot-cursor-scope");
		};
	}, [enabled, applyScopeClass, rootId]);

	if (!enabled) {
		return null;
	}

	return (
		<>
			{trail ? (
				<div className="copilot-gradient-cursor-trail" aria-hidden>
					{trailDots.map((d) => (
						<div
							key={d.id}
							className="copilot-gradient-cursor-trail__dot"
							style={{ transform: `translate(${d.x}px, ${d.y}px)` }}
						/>
					))}
				</div>
			) : null}
			<div
				className="copilot-gradient-cursor"
				data-hidden={hidden}
				data-bright={bright}
				style={{
					transform: `translate(${pos.x - HOTSPOT_X}px, ${pos.y - HOTSPOT_Y}px)`,
				}}
				aria-hidden
			>
				<div className="copilot-gradient-cursor__glow" style={maskStyle} />
				<div className="copilot-gradient-cursor__body" style={maskStyle}>
					<div className="copilot-gradient-cursor__gradient" />
				</div>
			</div>
		</>
	);
}
