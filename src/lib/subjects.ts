import { bankKey } from "@/lib/ai-quota";

/** Canonical subject list shared by the site and the Colab importer. Keys are bankKey(name). */
export const CANONICAL_SUBJECTS: { name: string; aliases: string[] }[] = [
  { name: "Língua Portuguesa", aliases: ["Português", "Portugues", "Gramática", "Interpretação de Texto", "Redação Oficial"] },
  { name: "Língua Inglesa", aliases: ["Inglês", "Ingles", "English"] },
  { name: "Língua Espanhola", aliases: ["Espanhol"] },
  { name: "Raciocínio Lógico", aliases: ["Raciocínio Lógico-Matemático", "Raciocinio Logico", "RLM", "Lógica"] },
  { name: "Matemática", aliases: ["Matemática Básica"] },
  { name: "Matemática Financeira", aliases: ["Mat. Financeira"] },
  { name: "Estatística", aliases: ["Estatistica", "Probabilidade e Estatística"] },
  { name: "Informática", aliases: ["Noções de Informática", "Informatica"] },
  { name: "Tecnologia da Informação", aliases: ["TI", "Ciência de Dados", "Banco de Dados", "Engenharia de Software", "Segurança da Informação", "Redes de Computadores", "Governança de TI"] },
  { name: "Direito Constitucional", aliases: ["Dir. Constitucional", "Constitucional"] },
  { name: "Direito Administrativo", aliases: ["Dir. Administrativo", "Administrativo"] },
  { name: "Direito Tributário", aliases: ["Dir. Tributário", "Tributário", "Legislação Tributária"] },
  { name: "Direito Civil", aliases: ["Dir. Civil", "Civil"] },
  { name: "Direito Processual Civil", aliases: ["Processo Civil", "Dir. Processual Civil", "CPC"] },
  { name: "Direito Penal", aliases: ["Dir. Penal", "Penal", "Legislação Penal Especial"] },
  { name: "Direito Processual Penal", aliases: ["Processo Penal", "Dir. Processual Penal", "CPP"] },
  { name: "Direito do Trabalho", aliases: ["Dir. do Trabalho", "Trabalhista"] },
  { name: "Direito Processual do Trabalho", aliases: ["Processo do Trabalho"] },
  { name: "Direito Previdenciário", aliases: ["Previdenciário", "Legislação Previdenciária"] },
  { name: "Direito Empresarial", aliases: ["Direito Comercial", "Empresarial"] },
  { name: "Direito Financeiro", aliases: ["Dir. Financeiro"] },
  { name: "Direito Econômico", aliases: [] },
  { name: "Direito Ambiental", aliases: [] },
  { name: "Direitos Humanos", aliases: [] },
  { name: "Direito Eleitoral", aliases: [] },
  { name: "Administração Pública", aliases: ["Administração Geral e Pública", "Gestão Pública"] },
  { name: "Administração Geral", aliases: ["Administração"] },
  { name: "Administração Financeira e Orçamentária", aliases: ["AFO", "Orçamento Público"] },
  { name: "Contabilidade Geral", aliases: ["Contabilidade", "Contabilidade Societária"] },
  { name: "Contabilidade Pública", aliases: ["Contabilidade Aplicada ao Setor Público", "CASP"] },
  { name: "Contabilidade de Custos", aliases: ["Custos"] },
  { name: "Auditoria", aliases: ["Auditoria Governamental", "Auditoria Contábil"] },
  { name: "Controle Externo", aliases: [] },
  { name: "Controle Interno", aliases: [] },
  { name: "Economia", aliases: ["Microeconomia", "Macroeconomia", "Economia do Setor Público"] },
  { name: "Finanças Públicas", aliases: [] },
  { name: "Ética no Serviço Público", aliases: ["Ética", "Ética e Integridade"] },
  { name: "Legislação Específica", aliases: ["Legislação Aplicada", "Lei Orgânica", "Regimento Interno"] },
  { name: "Atualidades", aliases: ["Conhecimentos Gerais", "Realidade Brasileira", "Sociedade Brasileira"] },
  { name: "Arquivologia", aliases: [] },
  { name: "Políticas Públicas", aliases: [] },
  { name: "Comércio Internacional", aliases: [] },
];

const STOP = new Set(["de", "da", "do", "das", "dos", "e", "a", "o", "em", "no", "na", "nocoes", "lei", "art", "ao", "aos", "as", "os"]);
const words = (s: string) => bankKey(s).split(" ").filter((w) => w.length > 1 && !STOP.has(w));

const INDEX = new Map<string, string>();
for (const s of CANONICAL_SUBJECTS) for (const n of [s.name, ...s.aliases]) INDEX.set(bankKey(n), bankKey(s.name));

export const CANONICAL_KEYS = new Set(CANONICAL_SUBJECTS.map((s) => bankKey(s.name)));

/** Resolves any subject name to its canonical key, or null when unknown. */
export function canonicalSubject(name: string): string | null {
  const k = bankKey(name);
  if (!k) return null;
  const exact = INDEX.get(k);
  if (exact) return exact;
  // Longest alias contained in the name wins ("Noções de Direito Constitucional" -> direito constitucional).
  let best: string | null = null; let len = 0;
  for (const [alias, key] of INDEX) {
    if (alias.length > len && alias.length >= 4 && (` ${k} `).includes(` ${alias} `)) { best = key; len = alias.length; }
  }
  return best;
}

/** Key used to store/search a subject: canonical when known, otherwise the plain slug. */
export function subjectKey(name: string) {
  return canonicalSubject(name) ?? bankKey(name);
}

/** 0..1 overlap between two topic texts (shared meaningful words over the smaller set). */
export function topicScore(a: string, b: string) {
  const A = new Set(words(a)); const B = new Set(words(b));
  if (!A.size || !B.size) return 0;
  let hit = 0; for (const w of A) if (B.has(w)) hit++;
  return hit / Math.min(A.size, B.size);
}

export function originLabel(board: string, origin: { exam?: string | undefined; year?: number | undefined }) {
  return [board.trim(), origin.exam?.trim(), origin.year && !origin.exam?.includes(String(origin.year)) ? String(origin.year) : ""].filter(Boolean).join(" · ").slice(0, 200);
}
