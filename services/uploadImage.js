import { Worker } from 'node:worker_threads';
import { imageSize } from 'image-size';

const invalidImage = () => Object.assign(new Error('Gambar tidak valid atau melebihi batas 16 megapiksel'), { status: 400 });
let running = 0;

export function processUploadImage(buffer) {
  try {
    if (!Buffer.isBuffer(buffer) || buffer.length > 2 * 1024 * 1024) throw invalidImage();
    const { width, height, type } = imageSize(buffer);
    if (!['jpg', 'png', 'webp'].includes(type) || !width || !height || width * height > 16000000) throw invalidImage();
  } catch {
    return Promise.reject(invalidImage());
  }
  if (running >= 2) {
    return Promise.reject(Object.assign(new Error('Pengolahan gambar sedang sibuk. Coba beberapa saat lagi.'), { status: 503 }));
  }
  running++;
  return new Promise((resolve, reject) => {
    let worker, timer, settled = false;
    const finish = (error, output) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      running--;
      worker?.terminate();
      if (error) reject(error);
      else resolve(Buffer.from(output));
    };
    try {
      worker = new Worker(new URL('./uploadImageWorker.js', import.meta.url), {
        workerData: buffer,
        execArgv: process.execArgv.includes('--no-addons') ? ['--no-addons'] : [],
        resourceLimits: { maxOldGenerationSizeMb: 256 },
      });
      timer = setTimeout(() => finish(invalidImage()), 15000);
      worker.once('message', result => finish(result.error ? invalidImage() : null, result.output));
      worker.once('error', () => finish(invalidImage()));
      worker.once('exit', () => { if (!settled) finish(invalidImage()); });
    } catch (error) { finish(error); }
  });
}
