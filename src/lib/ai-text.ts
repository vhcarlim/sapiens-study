/** Rule appended to every study prompt so answers stay in Brazilian Portuguese. */
export const PT_BR_RULE = "Responda estritamente em português do Brasil (pt-BR). É proibido usar palavras, caracteres ou alfabetos de outros idiomas (árabe, hebraico, cirílico, asiáticos etc.).";

// Arabic, Hebrew, Cyrillic, Devanagari, Thai, CJK, Hangul and presentation forms. Greek is kept for formulas.
const FOREIGN = /[\u0400-\u052F\u0590-\u05FF\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\u0900-\u097F\u0E00-\u0E7F\u3040-\u30FF\u3400-\u9FFF\uAC00-\uD7AF\uFB1D-\uFDFF\uFE70-\uFEFF]+/g;

/** Removes stray foreign-script tokens a model may leak, tidying the gap left behind. */
export function stripForeignScripts(text: string): string {
  return text.replace(FOREIGN, "").replace(/ {2,}/g, " ").replace(/ +([/,.;:])/g, "$1");
}
