import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const root = join(process.cwd(), "src/lib/contexts");
const contexts = readdirSync(root).filter((d) => statSync(join(root, d)).isDirectory());

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? files(p) : [p];
  });
}

describe("fronteiras dos contextos", () => {
  it("nenhum arquivo importa internos de outro contexto", () => {
    const bad: string[] = [];
    for (const p of files(join(process.cwd(), "src"))) {
      if (!/\.(ts|tsx)$/.test(p)) continue;
      const src = readFileSync(p, "utf8");
      for (const m of src.matchAll(/from\s+["']@\/lib\/contexts\/([^/"']+)\/([^"']+)["']/g)) {
        const own = p.includes(`/contexts/${m[1]}/`);
        if (!own && m[2] !== "index") bad.push(`${p} -> ${m[0]}`);
      }
    }
    expect(bad).toEqual([]);
  });
  it("todo contexto expõe um index", () => {
    for (const c of contexts) expect(statSync(join(root, c, "index.ts")).isFile()).toBe(true);
  });
});
