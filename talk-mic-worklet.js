// Downmix is requested on the MediaStream source. Transfer copies, never a browser-owned rendering buffer.
class DialogueCapture extends AudioWorkletProcessor {
  constructor() {
    super();
    this.port.onmessage = (e) => {
      if (e.data !== "finish" || this.closed) return;
      this.closed = true;
      if (this.used) this.port.postMessage(this.block.slice(0, this.used));
      this.port.postMessage("done");
    };
  }
  process(inputs) {
    if (this.closed) return false;
    const samples = inputs[0]?.[0];
    if (samples?.length) {
      if (!this.block) {
        this.block = new Float32Array(2048);
        this.used = 0;
      }
      let from = 0;
      while (from < samples.length) {
        const count = Math.min(
          this.block.length - this.used,
          samples.length - from,
        );
        this.block.set(samples.subarray(from, from + count), this.used);
        this.used += count;
        from += count;
        if (this.used === this.block.length) {
          this.port.postMessage(this.block, [this.block.buffer]);
          this.block = new Float32Array(2048);
          this.used = 0;
        }
      }
    }
    return true;
  }
}
registerProcessor("dialogue-capture", DialogueCapture);
