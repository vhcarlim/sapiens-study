import { describe, expect, it } from "vitest";
import { parseDuration, parseSheet } from "@/lib/spreadsheet-import";

const tsv = `Início\tMatéria\tConteúdo\tDuração\tDuração (minutos)\tAnotações
13/08/2024 07:30\t(AFT) Direito do Trabalho\t\t4h\t240\tRevisão dos mapas mentais
06/08/2024 18:00\t(AFT) Direito do Trabalho\t\t2h\t120\t"Direito Coletivo do Trabalho.
Organização sindical."`;

describe("importação de planilha do Aprovado", () => {
  it("converte data dd/mm/aaaa, matéria e minutos exatos", () => {
    const { sessions } = parseSheet(tsv);
    expect(sessions).toHaveLength(2);
    expect(sessions[0]).toMatchObject({ date: "2024-08-13", subject: "(AFT) Direito do Trabalho", minutes: 240 });
    expect(sessions[1].notes).toContain("Organização sindical");
  });
  it("lê durações no formato 5h 30m", () => {
    expect(parseDuration("5h 30m")).toBe(330);
    expect(parseDuration("1h30m")).toBe(90);
  });
});
