#!/bin/bash
# 双击本文件即可在浏览器中打开英语教练（本地预览）
cd "$(dirname "$0")" || exit 1
PORT=8788
NODE=$(command -v node || echo "/usr/local/bin/node")
if [ ! -x "$NODE" ]; then
  echo "未找到 Node.js。可以直接双击 index.html 预览，或用任意静态服务器托管本文件夹。"
  exit 1
fi
("$NODE" tools/serve.mjs $PORT) &
SERVER_PID=$!
sleep 1.2
open "http://localhost:$PORT/"
echo "英语教练已在浏览器打开。关闭本窗口或按 Control + C 停止服务。"
wait $SERVER_PID
