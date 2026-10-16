import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import express from 'express';
import { attachKontainerRealtime, notifyKontainerWrites } from '../services/kontainerRealtime.js';

test('realtime broadcasts only successful writes, with no private payload or client write access', async t => {
  const app = express();
  const server = createServer(app);
  const realtime = attachKontainerRealtime(server, ['http://localhost:5173']);
  app.use('/api/kontainer', notifyKontainerWrites(realtime.notify));
  app.post('/api/kontainer/report', (req, res) => res.status(201).json({ nama_petugas: 'private' }));
  app.post('/api/kontainer/failed', (req, res) => res.sendStatus(403));
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => realtime.close());
  const base = `http://127.0.0.1:${server.address().port}`;
  const endpoint = `${base}/socket.io/?EIO=4&transport=polling`;
  const denied = await fetch(endpoint, { headers: { Origin: 'https://untrusted.example' } });
  assert.equal(denied.status, 403);
  const open = await (await fetch(endpoint)).text();
  const { sid } = JSON.parse(open.slice(1));
  const url = `${endpoint}&sid=${sid}`;
  await fetch(url, { method: 'POST', body: '40/kontainer,', headers: { 'Content-Type': 'text/plain' } });
  assert.match(await (await fetch(url)).text(), /40\/kontainer,/);
  const notification = fetch(url).then(res => res.text());
  await fetch(`${base}/api/kontainer/failed`, { method: 'POST' });
  await fetch(`${base}/api/kontainer/report`, { method: 'POST' });
  assert.equal(await notification, '42/kontainer,["kontainer:changed"]');
  await fetch(url, { method: 'POST', body: '42/kontainer,["kontainer:changed",{"nama_petugas":"spoof"}]', headers: { 'Content-Type': 'text/plain' } });
  const next = fetch(url).then(res => res.text());
  realtime.notify();
  assert.equal(await next, '42/kontainer,["kontainer:changed"]');
  await fetch(url, { method: 'POST', body: '1', headers: { 'Content-Type': 'text/plain' } });
});

test('native WebSocket transport receives container invalidations', async t => {
  const server = createServer();
  const realtime = attachKontainerRealtime(server, []);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => realtime.close());
  const socket = new WebSocket(`ws://127.0.0.1:${server.address().port}/socket.io/?EIO=4&transport=websocket`);
  t.after(() => socket.close());
  const packets = [];
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('WebSocket event timeout')), 5000);
    socket.addEventListener('message', event => {
      const packet = String(event.data);
      packets.push(packet);
      if (packet.startsWith('0')) socket.send('40/kontainer,');
      else if (packet.startsWith('40/kontainer,')) realtime.notify();
      else if (packet.startsWith('42/kontainer,')) { clearTimeout(timeout); resolve(); }
    });
    socket.addEventListener('error', reject, { once: true });
  });
  assert.equal(packets.at(-1), '42/kontainer,["kontainer:changed"]');
});
