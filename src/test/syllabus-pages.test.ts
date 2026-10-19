import { describe, it, expect } from "vitest";
import { selectSyllabusPages } from "@/lib/syllabus-pages";

describe("selectSyllabusPages", () => {
  const pages = Array.from({ length: 60 }, (_, i) => `página ${i + 1} regras gerais`);
  pages[1] = "Sumário ... Anexo II - Conteúdo programático";
  pages[45] = "ANEXO II - CONTEÚDO PROGRAMÁTICO conhecimentos básicos";

  it("skips the table of contents and starts at the syllabus section", () => {
    const { pages: kept } = selectSyllabusPages(pages, "");
    expect(kept[0]).toBe(46);
    expect(kept).not.toContain(2);
  });

  it("keeps earlier pages that mention the target role", () => {
    const p = [...pages];
    p[10] = "Quadro de vagas: Técnico de Informática";
    const { pages: kept } = selectSyllabusPages(p, "técnico de informatica");
    expect(kept).toContain(11);
  });
});
