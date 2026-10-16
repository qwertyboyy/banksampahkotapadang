import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, rm } from 'node:fs/promises';
import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import express from 'express';
import { Jimp } from 'jimp';
import { processUploadImage } from '../services/uploadImage.js';
import createUploader from '../middlewares/upload.js';

const fixture = name => readFile(new URL(`./fixtures/upload/${name}`, import.meta.url));

test('PNG and WebP become centered transparent PNG without native addons', async () => {
  for (const name of ['landscape.png', 'landscape.webp']) {
    const output = await processUploadImage(await fixture(name));
    const image = await Jimp.fromBuffer(output);
    assert.equal(image.width, 500);
    assert.equal(image.height, 500);
    assert.equal(image.getPixelColor(0, 0), 0);
    const center = image.getPixelColor(250, 250);
    assert((center >>> 24) > 240);
    assert((center & 255) > 100 && (center & 255) < 160);
  }
});

test('JPEG EXIF orientation is applied; small images are not enlarged', async () => {
  const rotated = await Jimp.fromBuffer(await processUploadImage(await fixture('rotated.jpg')));
  assert.equal(rotated.getPixelColor(0, 250), 0);
  assert.notEqual(rotated.getPixelColor(250, 0), 0);
  const small = await Jimp.fromBuffer(await processUploadImage(await fixture('small.png')));
  assert.equal(small.getPixelColor(239, 250), 0);
  assert.equal(small.getPixelColor(240, 245), 0x00ff00ff);
  assert.equal(small.getPixelColor(260, 250), 0);
});

test('invalid content, unsupported formats, oversized pixels and truncated images are rejected', async () => {
  const oversized = Buffer.from(await fixture('small.png'));
  oversized.writeUInt32BE(100000, 16);
  oversized.writeUInt32BE(100000, 20);
  for (const input of [Buffer.from('not an image'), Buffer.from('<svg/>'), oversized, (await fixture('small.png')).subarray(0, 40), Buffer.alloc(2 * 1024 * 1024 + 1)]) {
    await assert.rejects(processUploadImage(input), error => error.status === 400);
  }
});

test('multipart uploader stores PNG, permits no-file updates, and rejects fake images without writing them', async t => {
  const folder = `test-image-${randomUUID()}`;
  const directory = path.resolve('uploads', folder);
  const app = express();
  app.post('/upload', createUploader(folder).single('foto'), (req, res) => res.json({ filename: req.file?.filename || null }));
  const server = createServer(app);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(async () => {
    await new Promise(resolve => server.close(resolve));
    await rm(directory, { recursive: true, force: true });
  });
  const url = `http://127.0.0.1:${server.address().port}/upload`;
  const form = new FormData();
  form.append('foto', new Blob([await fixture('landscape.webp')], { type: 'image/webp' }), 'photo.webp');
  const response = await fetch(url, { method: 'POST', body: form });
  assert.equal(response.status, 200);
  const { filename } = await response.json();
  assert.match(filename, /^[\da-f-]+\.png$/);
  const image = await Jimp.fromBuffer(await readFile(path.join(directory, filename)));
  assert.equal(image.width, 500);
  const empty = await fetch(url, { method: 'POST', body: new FormData() });
  assert.deepEqual(await empty.json(), { filename: null });
  const fake = new FormData();
  fake.append('foto', new Blob(['fake image'], { type: 'image/png' }), 'fake.png');
  assert.equal((await fetch(url, { method: 'POST', body: fake })).status, 400);
});
