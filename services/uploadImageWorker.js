import { parentPort, workerData } from 'node:worker_threads';
import { readFile } from 'node:fs/promises';
import { Jimp } from 'jimp';
import { imageSize } from 'image-size';

try {
  const buffer = Buffer.from(workerData);
  let image;
  if (imageSize(buffer).type === 'webp') {
    const { default: decode, init } = await import('@jsquash/webp/decode.js');
    const wasm = await readFile(new URL('./codec/dec/webp_dec.wasm', import.meta.resolve('@jsquash/webp/decode.js')));
    await init(await WebAssembly.compile(wasm));
    const bitmap = await decode(buffer);
    image = Jimp.fromBitmap({ ...bitmap, data: Buffer.from(bitmap.data) });
  } else {
    image = await Jimp.fromBuffer(buffer);
  }
  const scale = Math.min(1, 500 / image.width, 500 / image.height);
  if (scale < 1) image.resize({ w: Math.max(1, Math.round(image.width * scale)), h: Math.max(1, Math.round(image.height * scale)) });
  const canvas = new Jimp({ width: 500, height: 500, color: 0x00000000 });
  canvas.composite(image, Math.floor((500 - image.width) / 2), Math.floor((500 - image.height) / 2));
  parentPort.postMessage({ output: await canvas.getBuffer('image/png', { deflateLevel: 9 }) });
} catch {
  parentPort.postMessage({ error: true });
}
