#!/usr/bin/env node
/* 英语教练 · 本地预览服务器（零依赖）
   用法：node tools/serve.mjs [端口]
   说明：本机 http://localhost 可以正常使用全部功能（含离线缓存）；
        局域网 IP 访问时浏览器不算"安全上下文"，麦克风与离线缓存会被禁用，
        长期使用请用 Safari 打开线上地址并"添加到主屏幕"。 */

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.argv[2] || 8788);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/plain; charset=utf-8',
};

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  let rel = decodeURIComponent(url.pathname);
  if (rel === '/' || rel === '') rel = '/index.html';
  const file = path.join(ROOT, rel);
  if (!file.startsWith(ROOT)) {
    res.writeHead(403).end('forbidden');
    return;
  }
  fs.readFile(file, (err, buf) => {
    if (err) {
      res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' }).end('404 ' + rel);
      return;
    }
    res.writeHead(200, {
      'content-type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream',
      'cache-control': 'no-cache',
    });
    res.end(buf);
  });
});

server.listen(PORT, () => {
  const nets = os.networkInterfaces();
  const ips = Object.values(nets).flat().filter((n) => n && n.family === 'IPv4' && !n.internal).map((n) => n.address);
  console.log('\n  英语教练 · English Coach 本地预览已启动\n');
  console.log(`  本机访问：      http://localhost:${PORT}/`);
  ips.forEach((ip) => console.log(`  局域网访问：    http://${ip}:${PORT}/   （iPhone 需与电脑同一 Wi-Fi）`));
  console.log('\n  提示：浏览器"添加到主屏幕"后即可全屏使用。按 Control + C 停止服务。\n');
});
