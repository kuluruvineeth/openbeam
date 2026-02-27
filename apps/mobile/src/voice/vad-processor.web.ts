const SPEECH_THRESHOLD = 0.02;
const SILENCE_FRAMES = 20;
const SPEECH_FRAMES = 3;

const VAD_WORKLET_CODE = `
class VADProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this._speechCount = 0;
    this._silenceCount = 0;
    this._isSpeaking = false;
  }

  process(inputs) {
    const input = inputs[0]?.[0];
    if (!input) return true;

    const rms = Math.sqrt(
      input.reduce((sum, s) => sum + s * s, 0) / input.length
    );

    const isSpeech = rms > ${SPEECH_THRESHOLD};

    if (isSpeech) {
      this._speechCount++;
      this._silenceCount = 0;
    } else {
      this._silenceCount++;
      this._speechCount = 0;
    }

    if (!this._isSpeaking && this._speechCount >= ${SPEECH_FRAMES}) {
      this._isSpeaking = true;
      this.port.postMessage({ type: "speech_start", rms });
    } else if (this._isSpeaking && this._silenceCount >= ${SILENCE_FRAMES}) {
      this._isSpeaking = false;
      this.port.postMessage({ type: "speech_end", rms });
    }

    this.port.postMessage({ type: "volume", isSpeech, rms });
    return true;
  }
}

registerProcessor("vad-processor", VADProcessor);
`;

type VADEvent =
  | { type: "speech_start"; rms: number }
  | { type: "speech_end"; rms: number }
  | { type: "volume"; isSpeech: boolean; rms: number };

type VADCallback = (event: VADEvent) => void;

export async function createVADNode(
  audioContext: AudioContext,
  sourceNode: AudioNode,
  onEvent: VADCallback
): Promise<AudioWorkletNode | null> {
  const blob = new Blob([VAD_WORKLET_CODE], { type: "application/javascript" });
  const url = URL.createObjectURL(blob);

  try {
    await audioContext.audioWorklet.addModule(url);
  } catch {
    return createFallbackVAD(audioContext, sourceNode, onEvent);
  } finally {
    URL.revokeObjectURL(url);
  }

  const vadNode = new AudioWorkletNode(audioContext, "vad-processor");

  vadNode.port.onmessage = (e: MessageEvent<VADEvent>) => {
    onEvent(e.data);
  };

  sourceNode.connect(vadNode);
  vadNode.connect(audioContext.destination);

  return vadNode;
}

function createFallbackVAD(
  audioContext: AudioContext,
  sourceNode: AudioNode,
  onEvent: VADCallback
): null {
  const analyser = audioContext.createAnalyser();
  analyser.fftSize = 1024;
  sourceNode.connect(analyser);

  const buffer = new Float32Array(analyser.fftSize);
  let isSpeaking = false;
  let speechCount = 0;
  let silenceCount = 0;

  const poll = () => {
    analyser.getFloatTimeDomainData(buffer);

    const rms = Math.sqrt(
      buffer.reduce((sum, s) => sum + s * s, 0) / buffer.length
    );

    const isSpeech = rms > SPEECH_THRESHOLD;

    if (isSpeech) {
      // biome-ignore lint/nursery/noIncrementDecrement: increment in loop
      speechCount++;
      silenceCount = 0;
    } else {
      // biome-ignore lint/nursery/noIncrementDecrement: increment in loop
      silenceCount++;
      speechCount = 0;
    }

    if (!isSpeaking && speechCount >= SPEECH_FRAMES) {
      isSpeaking = true;
      onEvent({ type: "speech_start", rms });
    } else if (isSpeaking && silenceCount >= SILENCE_FRAMES) {
      isSpeaking = false;
      onEvent({ type: "speech_end", rms });
    }

    onEvent({ type: "volume", isSpeech, rms });
    requestAnimationFrame(poll);
  };

  requestAnimationFrame(poll);
  return null;
}

export type { VADEvent, VADCallback };
