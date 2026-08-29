let context: AudioContext | null = null;
let limiter: DynamicsCompressorNode | null = null;
const connected = new WeakSet<HTMLMediaElement>();

function output() {
  if (!context) {
    context = new AudioContext();
    limiter = context.createDynamicsCompressor();
    // Acts as a peak limiter: normal media is untouched, only extreme peaks are reduced.
    limiter.threshold.value = -3;
    limiter.knee.value = 0;
    limiter.ratio.value = 20;
    limiter.attack.value = 0.003;
    limiter.release.value = 0.1;
    limiter.connect(context.destination);
  }
  return { context, limiter: limiter! };
}

export function limitMedia(element: HTMLMediaElement) {
  if (connected.has(element)) return;
  try {
    const audio = output();
    audio.context.createMediaElementSource(element).connect(audio.limiter);
    connected.add(element);
  } catch (_) {
    // Native playback remains available if Web Audio is unavailable.
  }
}

export function resumeLimitedAudio() {
  if (context?.state === 'suspended') context.resume().catch(() => {});
}
