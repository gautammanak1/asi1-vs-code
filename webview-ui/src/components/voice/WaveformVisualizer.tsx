import { useEffect, useRef } from "react";

const ACCENT = "79, 70, 229";

export const WaveformVisualizer: React.FC<{
	stream: MediaStream | null;
	className?: string;
}> = ({ stream, className }) => {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const animRef = useRef<number>(0);
	const ctxRef = useRef<AudioContext | null>(null);

	useEffect(() => {
		if (!stream || !canvasRef.current) {
			return;
		}

		const canvas = canvasRef.current;
		const ctx2d = canvas.getContext("2d");
		if (!ctx2d) {
			return;
		}

		const audioCtx = new AudioContext();
		ctxRef.current = audioCtx;
		const analyser = audioCtx.createAnalyser();
		analyser.fftSize = 256;
		const source = audioCtx.createMediaStreamSource(stream);
		source.connect(analyser);

		const bufferLength = analyser.frequencyBinCount;
		const dataArray = new Uint8Array(bufferLength);

		const resize = () => {
			const parent = canvas.parentElement;
			const w = parent?.clientWidth ?? 300;
			canvas.width = Math.max(120, w);
			canvas.height = 40;
		};
		resize();
		const ro = new ResizeObserver(resize);
		if (canvas.parentElement) {
			ro.observe(canvas.parentElement);
		}

		const draw = () => {
			animRef.current = requestAnimationFrame(draw);
			analyser.getByteFrequencyData(dataArray);
			ctx2d.clearRect(0, 0, canvas.width, canvas.height);
			const barWidth = (canvas.width / bufferLength) * 2.5;
			let x = 0;
			for (let i = 0; i < bufferLength; i++) {
				const value = dataArray[i] ?? 0;
				const barHeight = (value / 255) * canvas.height;
				ctx2d.fillStyle = `rgba(${ACCENT}, ${0.25 + (value / 255) * 0.75})`;
				ctx2d.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
				x += barWidth + 1;
			}
		};
		draw();

		return () => {
			cancelAnimationFrame(animRef.current);
			ro.disconnect();
			void audioCtx.close();
			ctxRef.current = null;
		};
	}, [stream]);

	if (!stream) {
		return null;
	}

	return (
		<canvas
			className={className ?? "waveform-canvas w-full max-w-full"}
			height={40}
			ref={canvasRef}
			width={300}
		/>
	);
};
