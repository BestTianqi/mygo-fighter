interface VoiceSlot {
  buffer: AudioBuffer;
  offset: number;
  source: AudioBufferSourceNode | null;
  startedAt: number;
}
export function createVoicePlayer(
  context: AudioContext,
  buffers: Record<string, AudioBuffer>,
) {
  const channels = new Map<number, VoiceSlot>();
  const gain = context.createGain();
  gain.gain.value = 0.8;
  gain.connect(context.destination);
  let enabled = false,
    paused = false;
  function halt(slot: VoiceSlot) {
    const source = slot.source;
    slot.source = null;
    if (source) {
      source.onended = null;
      source.stop();
      source.disconnect?.();
    }
  }
  function begin(side: number, slot: VoiceSlot) {
    const source = context.createBufferSource();
    source.buffer = slot.buffer;
    source.connect(gain);
    slot.source = source;
    slot.startedAt = context.currentTime;
    source.onended = () => {
      source.disconnect?.();
      if (channels.get(side) === slot && slot.source === source)
        channels.delete(side);
    };
    source.start(0, slot.offset);
  }
  function stop(side?: number) {
    for (const [key, slot] of channels)
      if (side === undefined || key === side) {
        halt(slot);
        channels.delete(key);
      }
  }
  return {
    play(move: string, side: number) {
      if (!enabled || paused || !buffers[move]) return false;
      stop(side);
      const slot: VoiceSlot = {
        buffer: buffers[move],
        offset: 0,
        source: null,
        startedAt: 0,
      };
      channels.set(side, slot);
      begin(side, slot);
      return true;
    },
    stop,
    setEnabled(value: boolean) {
      enabled = value;
      if (!value) stop();
    },
    setPaused(value: boolean) {
      if (paused === value) return;
      paused = value;
      for (const [side, slot] of channels) {
        if (value) {
          slot.offset += context.currentTime - slot.startedAt;
          halt(slot);
        } else if (slot.offset < slot.buffer.duration) begin(side, slot);
        else channels.delete(side);
      }
    },
  };
}
