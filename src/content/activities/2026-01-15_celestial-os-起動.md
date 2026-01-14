---
type: "activity"
source: "internal"
title: "CELESTIAL OS 起動"
description: ""
publishAt: "2026-01-15T00:56:35+09:00"
createdAt: "2026-01-15T00:56:35+09:00"
visibility: "public"

tagsV1:
  world: []
  system: ["astro","git","automation"]
  activity: ["devlog","ops","release"]
  theme: []

relations: []
---

# CELESTIAL OS 起動
## Summary
CELESTIAL OS v1（対話ログ / 行動ログ / 予約投稿・自動化基盤）の骨格を確定し、正式運用を開始した。

## What shipped (v1)
- **Frontmatter Schema v1** を確定（互換アップグレード）
- **dialogues / activities の二層コレクション**を導入（思想と行動を分離）
- **生成CLI**
  - `new:dialogue`：対話ログを v1 で生成
  - `new:activity`：行動ログを v1 で生成（tagsV1 / external スロット含む）
- すべてが **publishAt / createdAt / visibility / relations / tagsV1** を備え、将来の自動処理に耐える形になった

## Why this design
- いま大変でも、将来の管理コストを最小化するため  
- 外部連携（YouTube / Twitch / VRChat / Kakuyomu / X など）を **activity 側に吸収**し、対話ログを汚さないため  
- relations/tagsV1 を最初から標準化し、年表化・検索・自動投稿を “作業ゲー” にするため

## Next
- **Phase1-③：司令塔CLI（celestial.mjs）** を導入し、生成・取り込み・公開を1コマンド化
- 外部活動の取り込み（YouTube/Twitch等）を activity へ統合
- 連携が増えても破綻しない「文明運用」へ移行

## Links / Notes
- Repo: celestial_site/celestial
- Launch date: 2026-01-15 (JST)

