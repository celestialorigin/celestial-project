#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { execSync } from "node:child_process";

function makeRl() {
  return readline.createInterface({ input: process.stdin, output: process.stdout });
}
function ask(rl, q) {
  return new Promise((resolve) => rl.question(q, (ans) => resolve(ans.trim())));
}

// 例: "未来 テスト" -> "future-test"（日本語も残す）
function slugify(input) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}\s-]/gu, "") // 記号を削除（日本語も残す）
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function pad2(n) {
  return String(n).padStart(2, "0");
}
function formatDateYmd(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}
function formatDateYmdHms(d) {
  return `${formatDateYmd(d)}_${pad2(d.getHours())}${pad2(d.getMinutes())}${pad2(
    d.getSeconds()
  )}`;
}

// ローカルTZ(+09:00等)を含む ISO 文字列
function formatIsoWithOffset(d) {
  const yyyy = d.getFullYear();
  const mm = pad2(d.getMonth() + 1);
  const dd = pad2(d.getDate());
  const HH = pad2(d.getHours());
  const MM = pad2(d.getMinutes());
  const SS = pad2(d.getSeconds());

  const offsetMin = -d.getTimezoneOffset();
  const sign = offsetMin >= 0 ? "+" : "-";
  const abs = Math.abs(offsetMin);
  const oh = pad2(Math.floor(abs / 60));
  const om = pad2(abs % 60);

  return `${yyyy}-${mm}-${dd}T${HH}:${MM}:${SS}${sign}${oh}:${om}`;
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}
function fileExists(p) {
  try {
    fs.accessSync(p, fs.constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

function parsePublishAtRaw(publishAtRaw) {
  // "YYYY-MM-DD HH:mm" or "YYYY-MM-DD" をローカルとして解釈
  const m = publishAtRaw.match(
    /^(\d{4})-(\d{2})-(\d{2})(?:\s+(\d{2}):(\d{2}))?$/
  );
  if (!m) return null;
  const yyyy = Number(m[1]);
  const mm = Number(m[2]) - 1;
  const dd = Number(m[3]);
  const HH = m[4] ? Number(m[4]) : 0;
  const MM = m[5] ? Number(m[5]) : 0;
  return new Date(yyyy, mm, dd, HH, MM, 0);
}

/**
 * CLI
 *   npm run new:dialogue -- "タイトル"
 *
 * Options:
 *   --desc "説明"
 *   --slug "custom-slug"
 *   --publish "YYYY-MM-DD HH:mm"   (空なら今)
 *   --visibility public|private
 *   --open                         (生成後にファイルパス表示のみ。エディタ起動はしない)
 *   --git                           (git add/commit まで実行)
 *   --push                          (--git と併用で git push もする)
 *
 * Filename policy:
 *   1) 2026-01-14_hello.md の形式は維持
 *   2) 衝突したら _01,_02... を自動付与（永久に被らない）
 */
function parseArgs(argv) {
  const args = argv.slice(2);
  const out = {
    title: "",
    desc: "",
    slug: "",
    publish: "",
    visibility: "public",
    open: false,
    git: false,
    push: false,
    help: false,
  };

  // タイトル：最初に -- なしで来た “塊” を採用（npm run ... -- "title" の想定）
  // ※オプションが先に来てもOKにする
  const takeValue = (i) => (i + 1 < args.length ? args[i + 1] : "");
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--help" || a === "-h") out.help = true;
    else if (a === "--desc") out.desc = takeValue(i), i++;
    else if (a === "--slug") out.slug = takeValue(i), i++;
    else if (a === "--publish") out.publish = takeValue(i), i++;
    else if (a === "--visibility") out.visibility = takeValue(i), i++;
    else if (a === "--open") out.open = true;
    else if (a === "--git") out.git = true;
    else if (a === "--push") out.push = true;
    else if (!a.startsWith("--") && !out.title) out.title = a;
  }

  if (out.push) out.git = true;

  if (!["public", "private"].includes(out.visibility)) out.visibility = "public";
  return out;
}

function usage() {
  return `
Usage:
  npm run new:dialogue -- "Title"
  npm run new:dialogue -- "Title" --desc "..." --publish "2026-02-01 21:00"
  npm run new:dialogue -- "Title" --slug "my-slug" --git --push

Options:
  --desc "..."               Description（任意）
  --slug "..."               slug を指定（任意）
  --publish "YYYY-MM-DD HH:mm"  publishAt（任意。省略で今）
  --visibility public|private
  --git                      git add/commit まで実行
  --push                     （--git含む）git push も実行
  --help
`.trim();
}

function uniqueFilePath(dir, baseName) {
  // baseName: "2026-01-14_slug.md"
  const ext = path.extname(baseName);
  const stem = baseName.slice(0, -ext.length);

  let p = path.join(dir, baseName);
  if (!fileExists(p)) return p;

  for (let i = 1; i <= 99; i++) {
    const suffix = `_${String(i).padStart(2, "0")}`;
    const candidate = path.join(dir, `${stem}${suffix}${ext}`);
    if (!fileExists(candidate)) return candidate;
  }
  // それでもダメなら時刻を足して確実にユニーク
  const now = new Date();
  return path.join(dir, `${stem}_${formatDateYmdHms(now)}${ext}`);
}

function safeExec(cmd) {
  execSync(cmd, { stdio: "inherit" });
}

async function interactiveFallback(current) {
  const rl = makeRl();
  try {
    const title = current.title || (await ask(rl, "Title（必須）: "));
    if (!title) return { ...current, title: "" };

    const desc = current.desc || (await ask(rl, "Description（任意・空でOK）: "));
    const publish = current.publish || (await ask(rl, 'publishAt（任意）: 空=今 / 例 "2026-02-01 21:00": '));
    const slugSeed = current.slug || (await ask(rl, "slug（任意）: 空=タイトルから自動生成: "));
    const visibility = current.visibility || "public";

    return { ...current, title, desc, publish, slug: slugSeed, visibility };
  } finally {
    rl.close();
  }
}

async function main() {
  const opts0 = parseArgs(process.argv);
  if (opts0.help) {
    console.log(usage());
    return;
  }

  // 引数が薄いなら対話で補完（互換維持）
  const needInteractive = !opts0.title;
  const opts = needInteractive ? await interactiveFallback(opts0) : opts0;

  if (!opts.title) {
    console.error("❌ Title は必須です。");
    process.exitCode = 1;
    return;
  }

  const contentDir = path.join(process.cwd(), "src", "content", "dialogues");
  ensureDir(contentDir);

  const now = new Date();

  // publishAt
  let publishAtDate = now;
  if (opts.publish) {
    const d = parsePublishAtRaw(opts.publish);
    if (!d) {
      console.error('❌ publishAt形式が不正です。例: "2026-02-01 21:00" または空');
      process.exitCode = 1;
      return;
    }
    publishAtDate = d;
  }

  // slug
  const slug = slugify(opts.slug || opts.title);
  if (!slug) {
    console.error("❌ slug を生成できませんでした（タイトルが特殊すぎる可能性）");
    process.exitCode = 1;
    return;
  }

  // filename: ymd_slug.md（衝突したら _01,_02...）
  const ymd = formatDateYmd(now);
  const baseName = `${ymd}_${slug}.md`;
  const filepath = uniqueFilePath(contentDir, baseName);

  const publishAtIso = formatIsoWithOffset(publishAtDate);

  const body = `---
title: ${JSON.stringify(opts.title)}
description: ${opts.desc ? JSON.stringify(opts.desc) : '""'}
publishAt: "${publishAtIso}"
visibility: "${opts.visibility}"
---

# ${opts.title}

（ここに本文）
`;

  fs.writeFileSync(filepath, body, "utf8");

  console.log("✅ Created:");
  console.log(`- ${filepath}`);

  // ここから任意で git まで（「未来の自分が楽」）
  if (opts.git) {
    const rel = path.relative(process.cwd(), filepath).replaceAll("\\", "/");
    console.log("");
    console.log("🔧 git automation:");

    // add
    safeExec(`git add "${rel}"`);

    // commit message: feat: add dialogue <slug>
    const msg = `feat: add dialogue ${slug}`;
    safeExec(`git commit -m "${msg}"`);

    if (opts.push) {
      safeExec(`git push`);
    }

    console.log("✅ git done.");
  } else {
    console.log("");
    console.log("Next:");
    console.log("1) 内容を書く");
    console.log('2) git add . && git commit -m "feat: add dialogue" && git push');
  }

  if (opts.open) {
    console.log("");
    console.log("Open (path):");
    console.log(filepath);
  }
}

main();
