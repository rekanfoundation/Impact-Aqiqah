// Hasilkan icon PNG PWA dari public/icon-master.svg memakai sharp.
// Jalankan: node scripts/gen-icons.mjs
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "public", "icons");

async function main() {
  let sharp;
  try {
    sharp = (await import("sharp")).default;
  } catch {
    console.error("sharp tidak terpasang. Jalankan: npm i -D sharp");
    process.exit(1);
  }
  await mkdir(outDir, { recursive: true });
  const svg = await readFile(join(root, "public", "icon-master.svg"));

  const targets = [
    { name: "icon-192.png", size: 192 },
    { name: "icon-512.png", size: 512 },
    { name: "maskable-512.png", size: 512 },
  ];
  for (const t of targets) {
    const buf = await sharp(svg).resize(t.size, t.size).png().toBuffer();
    await writeFile(join(outDir, t.name), buf);
    console.log("✓", t.name);
  }
}
main();
