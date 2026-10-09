#!/bin/bash
# 一键发布到 GitHub Pages（需要已登录的 gh CLI）
# 用法：bash tools/deploy-pages.sh [仓库名]
set -e
NAME="${1:-english-coach}"
cd "$(dirname "$0")/.."

command -v gh >/dev/null || { echo "请先安装并登录 GitHub CLI：brew install gh && gh auth login"; exit 1; }
gh auth status >/dev/null 2>&1 || { echo "请先执行 gh auth login"; exit 1; }

USER=$(gh api user --jq .login)
rm -rf .git
git init -q
git add -A
git -c user.email="$USER@users.noreply.github.com" -c user.name="$USER" commit -qm "English Coach PWA"

if gh repo view "$USER/$NAME" >/dev/null 2>&1; then
  git remote add origin "https://github.com/$USER/$NAME.git"
  git branch -M main
  git push -u origin main --force
else
  gh repo create "$NAME" --public --source=. --remote=origin --push
fi

if ! gh api "repos/$USER/$NAME/pages" >/dev/null 2>&1; then
  gh api -X POST "repos/$USER/$NAME/pages" -f "source[branch]=main" -f "source[path]=/" >/dev/null
fi

echo
echo "已发布。1~2 分钟后访问："
echo "  https://$USER.github.io/$NAME/"
echo
echo "（用 iPhone Safari 打开该网址 → 分享 → 添加到主屏幕）"
