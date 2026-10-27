interface VoiceSlot {
  name: string;
  buffer: AudioBuffer | null;
  offset: number;
  source: AudioBufferSourceNode | null;
  startedAt: number;
  next: { name: string; done?: () => void } | null;
  done?: () => void;
}
interface VoiceBuffers {
  get(move: string): AudioBuffer | undefined;
  load(move: string): Promise<AudioBuffer>;
}
export function createVoicePlayer(
  context: AudioContext,
  buffers: VoiceBuffers,
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
    if (!slot.buffer || slot.offset >= slot.buffer.duration) {
      complete(side, slot);
      return;
    }
    const source = context.createBufferSource();
    source.buffer = slot.buffer;
    source.connect(gain);
    slot.source = source;
    slot.startedAt = context.currentTime;
    source.onended = () => {
      source.disconnect?.();
      if (channels.get(side) === slot && slot.source === source)
        complete(side, slot);
    };
    source.start(0, slot.offset);
  }
  function complete(side: number, slot: VoiceSlot) {
    if (channels.get(side) !== slot) return;
    channels.delete(side);
    slot.done?.();
    if (slot.next) play(slot.next.name, side, slot.next.done);
  }
  function play(move: string, side: number, done?: () => void) {
    if (!enabled || paused) return false;
    stop(side);
    const slot: VoiceSlot = {
      name: move,
      buffer: buffers.get(move) ?? null,
      offset: 0,
      source: null,
      startedAt: 0,
      next: null,
      done,
    };
    // A pending load owns the channel, preventing overlapping voices while
    // retaining the existing stop/pause/round-transition cancellation rules.
    channels.set(side, slot);
    if (slot.buffer) begin(side, slot);
    else
      void buffers.load(move).then(
        (buffer) => {
          if (channels.get(side) !== slot) return;
          slot.buffer = buffer;
          if (enabled && !paused) begin(side, slot);
        },
        () => complete(side, slot),
      );
    return true;
  }
  function stop(side?: number) {
    for (const [key, slot] of channels)
      if (side === undefined || key === side) {
        halt(slot);
        channels.delete(key);
      }
  }
  return {
    play,
    /** A finish line follows a complete super sentence without overlapping it. */
    playAfterCurrent(move: string, side: number, done?: () => void) {
      if (!enabled || paused) return false;
      const current = channels.get(side);
      if (!current) return play(move, side, done);
      current.next = { name: move, done };
      return true;
    },
    stop,
    playing(side: number) {
      return channels.has(side);
    },
    position(move: string, side: number) {
      const slot = channels.get(side);
      if (!slot || slot.name !== move || !slot.buffer) return null;
      return (
        Math.min(
          slot.buffer.duration,
          slot.offset +
            (slot.source ? context.currentTime - slot.startedAt : 0),
        ) * 1000
      );
    },
    setEnabled(value: boolean) {
      enabled = value;
      if (!value) stop();
    },
    setPaused(value: boolean) {
      if (paused === value) return;
      paused = value;
      for (const [side, slot] of channels) {
        if (value) {
          if (slot.source) slot.offset += context.currentTime - slot.startedAt;
          halt(slot);
        } else if (slot.buffer) begin(side, slot);
      }
    },
    dispose() {
      stop();
      gain.disconnect();
    },
  };
}
