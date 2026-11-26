# Cidade Sapiens 3D

Uma ilha flutuante 3D no Painel que cresce conforme seu estudo real: nível, XP, ofensiva, domínio das matérias, Arena, revisões e data da prova.

## O que você verá
- No Painel, um card "Cidade Sapiens" (recolhível, com botão de tela cheia), carregado só quando aparece na tela.
- Cinco distritos clicáveis:
  - **Cidadela Central** — 5 estágios (vila → torre → castelo → catedral → cidadela dourada) pelo nível geral.
  - **Distrito das Disciplinas** — uma torre por matéria da trilha; altura e detalhes pelo domínio. Na Visão Global, matérias de mesmo nome se juntam.
  - **Arena** — anfiteatro com arquibancadas/bandeiras pelo volume de questões; cor da chama pela taxa de acerto.
  - **Jardim da Memória** — árvores vivas com revisões em dia; névoa leve quando há atrasadas.
  - **Farol da Prova** — luz mais intensa conforme a prova se aproxima (apagado sem data).
- Barra inferior translúcida: Geral, Cidadela, Matérias, Arena, Revisões; zoom + e −; clima/partículas; Dia/Noite seguindo o tema do site (à noite janelas e postes acendem).
- Clique num prédio: a câmera desliza até ele e abre um card com status, o que falta para o próximo estágio e um botão ("Treinar na Arena", "Fazer revisões", "Abrir plano").
- Câmera nunca mostra o vazio embaixo da ilha. Com "reduzir movimento" ligado: sem animações nem partículas, cortes de câmera diretos.
- Estilo low-poly com as cores Sapiens (bege/cobalto no claro, preto/verde fósforo no escuro), sem neon exagerado.

## Fora do escopo
Nenhuma mudança no banco de dados, nem multiplayer, nem modelos 3D baixados (tudo gerado por código, como pedido).

## Detalhes técnicos
- Instalar `three`, `@react-three/fiber@^9`, `@react-three/drei@^10`, `@types/three`.
- `src/lib/contexts/progression/city.ts`: função pura `buildCityState(dados)` → estágios/alturas/estados por distrito, usando o módulo de gamificação existente, domínio por skill, histórico da Arena, revisões e `exam_date`. Exportada pela porta do contexto Progressão. Testes vitest para limites de estágio (nível→estágio, domínio→altura, atrasos→névoa, dias→farol).
- `src/components/city/CityCard.tsx` (SSR seguro) faz `React.lazy` de `CityCanvas.tsx` dentro de `<ClientOnly>` com fallback leve; IntersectionObserver adia o carregamento.
- Cena: geometria procedural, `InstancedMesh` para árvores/postes, `ContactShadows`, `Environment` com Lightformers (sem HDR externo), `OrbitControls` com `maxPolarAngle` ~1,25 rad e limites de zoom; um único `useFrame` para animar câmera (lerp) e partículas; cores lidas dos tokens CSS do tema.
- Dados reutilizam as queries já carregadas no Painel (sem consultas novas).
- Verificação com o script de screenshot do 3D (claro/escuro, clique em distrito, 1014px e celular).
