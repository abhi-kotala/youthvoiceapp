import { useCallback, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";

const EMOJIS = [
  "🗳️",
  "⚖️",
  "🏛️",
  "📜",
  "✅",
  "🇺🇸",
  "🗽",
  "👩‍⚖️",
  "👨‍⚖️",
  "🔨",
  "📋",
  "🖊️",
  "☑️",
  "📢",
  "🎗️",
  "📰",
  "🎙️",
  "🤝",
  "📊",
  "🗣️",
  "✊",
  "🕊️",
  "📮",
  "🧾",
  "🏢",
  "🗺️",
];

const PIECE_COUNT = 36;
// Everything (stagger + fall) must resolve well under 3s.
const MAX_DELAY_MS = 250;
const MIN_FALL_MS = 1400;
const MAX_FALL_MS = 2200;
const CLEANUP_MS = MAX_DELAY_MS + MAX_FALL_MS + 150;

interface Piece {
  id: number;
  emoji: string;
  left: number; // vw
  size: number; // rem
  delay: number; // ms
  duration: number; // ms
  rotate: number; // deg, end rotation
  drift: number; // vw, horizontal drift while falling
}

function randomBetween(min: number, max: number) {
  return min + Math.random() * (max - min);
}

// Skews toward the low end so most pieces read as small/medium confetti
// with a handful of noticeably larger ones standing out, rather than
// everything clustering around the same mid-size.
function randomSize(min: number, max: number) {
  return min + Math.random() ** 2 * (max - min);
}

function makePieces(batch: number): Piece[] {
  return Array.from({ length: PIECE_COUNT }, (_, i) => ({
    id: batch * PIECE_COUNT + i,
    emoji: EMOJIS[Math.floor(Math.random() * EMOJIS.length)],
    left: randomBetween(0, 96),
    size: randomSize(0.9, 4.4),
    delay: randomBetween(0, MAX_DELAY_MS),
    duration: randomBetween(MIN_FALL_MS, MAX_FALL_MS),
    rotate: randomBetween(-260, 260),
    drift: randomBetween(-8, 8),
  }));
}

/**
 * Hook that provides a `trigger()` function to fire a brief (<3s) rain of
 * legal/election-themed emojis, plus the `overlay` element to render
 * (portaled to document.body so it always sits above page content).
 */
export function useEmojiRain() {
  const [pieces, setPieces] = useState<Piece[] | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const batchRef = useRef(0);

  const trigger = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    batchRef.current += 1;
    // Each batch gets fresh ids (see makePieces) so React always mounts
    // new DOM nodes instead of patching reused ones — reusing the same
    // nodes across clicks left the fall animation unable to restart.
    setPieces(makePieces(batchRef.current));
    timeoutRef.current = setTimeout(() => {
      setPieces(null);
      timeoutRef.current = null;
    }, CLEANUP_MS);
  }, []);

  const overlay =
    pieces && typeof document !== "undefined"
      ? createPortal(
          <div
            aria-hidden="true"
            className="pointer-events-none fixed inset-0 z-[999] overflow-hidden"
          >
            <style>{`
              @keyframes emoji-rain-fall {
                from {
                  transform: translate(0, -10vh) rotate(0deg);
                  opacity: 1;
                }
                to {
                  transform: translate(var(--emoji-drift), 110vh) rotate(var(--emoji-rotate));
                  opacity: 0.85;
                }
              }
            `}</style>
            {pieces.map((p) => (
              <span
                key={p.id}
                style={{
                  position: "absolute",
                  left: `${p.left}vw`,
                  top: 0,
                  fontSize: `${p.size}rem`,
                  lineHeight: 1,
                  "--emoji-drift": `${p.drift}vw`,
                  "--emoji-rotate": `${p.rotate}deg`,
                  animation: `emoji-rain-fall ${p.duration}ms cubic-bezier(0.35, 0, 0.65, 1) ${p.delay}ms both`,
                  willChange: "transform, opacity",
                } as CSSProperties}
              >
                {p.emoji}
              </span>
            ))}
          </div>,
          document.body,
        )
      : null;

  return { trigger, overlay };
}

let sharedAudioContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor = window.AudioContext || (window as any).webkitAudioContext;
  if (!Ctor) return null;
  if (!sharedAudioContext) sharedAudioContext = new Ctor();
  if (sharedAudioContext.state === "suspended") void sharedAudioContext.resume();
  return sharedAudioContext;
}

/**
 * Plays a short, soft "creamy" chime synthesized on the fly (no audio
 * asset needed). Three warm, detuned tones (with a slow vibrato "wobble"
 * for thickness) through a dark lowpass filter, layered over a filtered-
 * noise "slosh" swell so it reads like a soft splash of milk rather than
 * a plain bell.
 */
export function playLogoChime() {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const master = ctx.createGain();
  master.gain.setValueAtTime(0, now);
  master.connect(ctx.destination);

  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  // Start slightly muffled and open up a touch, like a lid lifting off a
  // thick liquid, then settle back down — rounder than a static cutoff.
  filter.frequency.setValueAtTime(900, now);
  filter.frequency.linearRampToValueAtTime(1200, now + 0.08);
  filter.frequency.exponentialRampToValueAtTime(650, now + 0.6);
  filter.Q.value = 0.2;
  filter.connect(master);

  // A soft major-third pair plus a sub-octave for body, gently detuned
  // and wobbling in pitch for a thick, "creamy" (non-static) tone.
  const freqs = [261.63, 523.25, 659.25]; // C4 (body), C5, E5
  freqs.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, now);
    osc.detune.setValueAtTime(i === 0 ? 0 : i === 1 ? -5 : 5, now);

    // Gentle vibrato — slow enough to feel like liquid wobbling, not a
    // synth effect.
    const vibrato = ctx.createOscillator();
    vibrato.type = "sine";
    vibrato.frequency.setValueAtTime(4.5, now);
    const vibratoDepth = ctx.createGain();
    vibratoDepth.gain.setValueAtTime(freq * 0.006, now);
    vibrato.connect(vibratoDepth);
    vibratoDepth.connect(osc.frequency);
    vibrato.start(now);
    vibrato.stop(now + 0.6);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, now);
    osc.connect(gain);
    gain.connect(filter);

    osc.start(now);
    osc.stop(now + 0.55);

    // Individual voice envelope — the sub-octave sits quieter, underneath.
    const peak = i === 0 ? 0.28 : 0.5;
    gain.gain.linearRampToValueAtTime(peak, now + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
  });

  // "Slosh": filtered noise whose bandpass center sweeps up and down like
  // liquid swirling in a glass, swelling in and fading out underneath the
  // chime.
  const noiseDuration = 0.7;
  const noiseBuffer = ctx.createBuffer(
    1,
    Math.ceil(ctx.sampleRate * noiseDuration),
    ctx.sampleRate,
  );
  const noiseData = noiseBuffer.getChannelData(0);
  for (let i = 0; i < noiseData.length; i++) noiseData[i] = Math.random() * 2 - 1;

  const noise = ctx.createBufferSource();
  noise.buffer = noiseBuffer;

  const slosh = ctx.createBiquadFilter();
  slosh.type = "bandpass";
  slosh.Q.value = 1.1;
  slosh.frequency.setValueAtTime(260, now);
  slosh.frequency.linearRampToValueAtTime(520, now + 0.22);
  slosh.frequency.linearRampToValueAtTime(300, now + 0.48);
  slosh.frequency.linearRampToValueAtTime(420, now + noiseDuration);

  const sloshGain = ctx.createGain();
  sloshGain.gain.setValueAtTime(0, now);
  sloshGain.gain.linearRampToValueAtTime(0.16, now + 0.1);
  sloshGain.gain.linearRampToValueAtTime(0.08, now + 0.3);
  sloshGain.gain.linearRampToValueAtTime(0.13, now + 0.42);
  sloshGain.gain.exponentialRampToValueAtTime(0.001, now + noiseDuration);

  noise.connect(slosh);
  slosh.connect(sloshGain);
  sloshGain.connect(master);
  noise.start(now);
  noise.stop(now + noiseDuration);

  // Master envelope: quick soft attack, smooth decay — held open long
  // enough for the slosh tail to be heard.
  master.gain.linearRampToValueAtTime(0.5, now + 0.025);
  master.gain.setValueAtTime(0.5, now + 0.35);
  master.gain.exponentialRampToValueAtTime(0.0001, now + noiseDuration);
}
