# Bonsai Daniel Bourscheid

Catálogo SPA com curadoria visual na própria página, construído a partir de `AGENTS.md` e das imagens de `raw/`.

## Executar

Neste ambiente, use o inicializador do projeto, que encontra uma instalação válida de Node/npm e evita os atalhos quebrados do sistema:

```sh
./iniciar.sh
```

Ele instala as dependências se necessário e inicia em `http://localhost:5173`. A instalação precisa de acesso ao registro npm. No VS Code, também é possível usar **Terminal → Executar Tarefa → Bonsai: iniciar**.

Outros comandos: `./iniciar.sh --check`, `./iniciar.sh --install`, `./iniciar.sh --build` e `./iniciar.sh --test`. Os arquivos de ambiente ficam em `.local-tools/` (ignorados no Git); nenhuma configuração global é alterada. Para instalações fora dos locais detectados, defina `BONSAI_NODE` e `BONSAI_NPM_CLI` com os caminhos dos executáveis Node e `npm-cli.js`.

Em uma máquina com Node/npm configurados normalmente:

Requer Node.js 22.12 ou superior e npm.

```sh
npm install
npm run dev
```

Abra a URL exibida pelo Vite (normalmente `http://localhost:5173`).

```sh
npm test
npm run build
npm run preview
```

O `package-lock.json` registra as dependências instaladas. Mantenha-o no controle de versão para builds reproduzíveis.

## Primeira versão

- Layout responsivo verde-floresta/dourado, logo oficial, folhas atmosféricas, motion com spring e preferência por movimento reduzido.
- Dois Ficus com fotos reais, nomes, idades, nebari e preços fornecidos pelo proprietário. Fichas iniciais completas: alturas de 48/52 cm, sol pleno externo, cuidado e rega editáveis.
- Busca por nome/código/espécie, filtros por categoria/espécie/status, cards e galeria com botão de escala real.
- Curadoria pelo cadeado no topo/rodapé: textos inline, cadastro, edição, duplicação, exclusão e alternância de status.
- Upload de múltiplas fotos, drag-and-drop ou URL; seleção de capa e tags de ângulo; prévia no editor.
- Criação de categorias e espécies nos filtros ou ao cadastrar um exemplar.
- IndexedDB, backup JSON validado e controle de revisão para impedir sobrescrita por uma aba desatualizada.
- WhatsApp com mensagem contextual, preço e referência de foto; compartilhamento nativo com foto quando suportado, com alternativas de texto/download.

## Configurar contato

Abra **Curadoria → Ativar edição visual → Contato**. Cadastre o WhatsApp com código do país e DDD, Instagram e localização. O número não foi inventado: o botão de interesse mostra um aviso até a configuração.

O template aceita `{nome}`, `{codigo}`, `{especie}`, `{idade}`, `{preco}` e `{foto}`. Fotos locais Base64 são compartilhadas como arquivo quando possível, nunca como um link público fictício.

## Persistência e publicação

**Esta versão salva as edições somente no navegador utilizado.** Publicar o app na Vercel disponibiliza o acervo inicial de `src/data/initial.ts` e as imagens de `public/images/`. Alterações feitas pela curadoria não atualizam o site para outros visitantes. O cadeado abre o modo de edição local; não implementa autenticação de servidor.

Exporte backups para preservar os cadastros antes de limpar dados do navegador. Imagens locais via upload ficam no JSON. Imagens por URL continuam sendo referências externas. Há limite de 8 MB por upload, 24 fotos por exemplar e 80 MB de JSON para o catálogo inteiro. Um catálogo que exceda o limite não é salvo, preservando a possibilidade de restauração.

Para a etapa de publicação de conteúdo compartilhado, substituir `CatalogRepository` por uma API com autenticação e armazenamento remoto de imagens. A interface foi separada em `src/lib/repository.ts` para essa evolução.

As fichas iniciais inalteradas têm links `/?exemplar=db-001`. Cadastros criados/editados localmente compartilham texto e foto, pois ainda não têm uma ficha pública. Web Share e clipboard dependem de HTTPS/localhost, do navegador e, para fotos externas, de CORS.

## Vercel

Repositório: `git@github.com:Alisson-San/bonsai_daniel.git` (branch `main`).

1. Em [vercel.com/new](https://vercel.com/new), importe o repositório `Alisson-San/bonsai_daniel`.
2. A Vercel detecta tudo pelo `vercel.json`: framework Vite, `npm run build`, saída `dist`, fallback de SPA (links como `/#DB-001` e `/?exemplar=db-001` funcionam). Mantenha a raiz do projeto como diretório raiz. Não há variáveis de ambiente.
3. Node: o `package.json` exige Node 22.12+; a Vercel usa a versão 22.x automaticamente.
4. Cada `git push` na `main` gera um novo deploy de produção; outras branches geram prévias.

O hero 3D carrega o Three.js do jsDelivr no navegador do visitante; não é preciso configurar nada na Vercel. Um modelo real pode ser publicado colocando `public/models/bonsai.glb` no repositório.

Referência oficial: [Vite na Vercel](https://vercel.com/docs/frameworks/frontend/vite).

## Organização

| Caminho | Responsabilidade |
| --- | --- |
| `src/App.tsx` | Página, filtros e coordenação da curadoria |
| `src/components/` | Cards, ficha, modal acessível, editores |
| `src/lib/schema.ts` | Tipos e validação de dados/backup |
| `src/lib/repository.ts` | Persistência IndexedDB e revisão de gravação |
| `src/lib/catalog.ts` | Busca, preços, WhatsApp, backups e links públicos |
| `src/lib/media.ts` | Arquivos, download e preparação do compartilhamento |
| `src/data/initial.ts` | Acervo e textos iniciais publicados |
| `public/images/` | Cópias das fotos/logo usadas pelo site |
| `raw/` | Originais preservados |
| `tests/` | Regras de domínio e persistência |

## Refinamento visual

- Tema automático pelo sistema, alternância Sol/Lua e retorno ao automático (ícone de monitor). Preferência persistida no navegador.
- Logos oficiais clara/escura com máscaras SVG no contorno do brasão; logo flutuante e glow no Hero.
- Canvas de folhas de Acer com vento e reação ao ponteiro, pausado fora da tela/aba e com movimento reduzido.
- Revelação por scroll com fade, blur e stagger; zoom nos cards, seleção de ângulos e atalho de escala real.
- Preços comerciais, pills técnicas e ações de galeria/WhatsApp nos cards.
- Modal com lupa, miniaturas identificadas, níveis de cuidado/sol e orientação de rega. Os indicadores iniciais usam cuidado 2/3 e exposição solar 3/3.
- Clique em Curadoria para ativar o Dock. Nome, espécie, preço e descrição editáveis diretamente nos cards e no modal; galeria completa pelo editor.
- Inputs de arquivo ocultos, acionados por controles estilizados. Upload múltiplo e drag-and-drop preservados.
- Cadastros antigos intactos de demonstração são atualizados com os dados fornecidos; cadastros personalizados e excluídos são preservados.
- Cada planta tem uma foto original e três visões: geral, nebari e copa. As visões de detalhe são enquadramentos por zoom/pan declarados no cadastro, não fotografias adicionais. Crop e legenda são preservados no backup JSON.

## Verificação atual

`npm run build` passou (TypeScript + bundle Vite). A suíte `npm test` passou: 24 casos entre catálogo, tema/dados iniciais, enquadramentos fotográficos e IndexedDB, incluindo concorrência de gravação entre abas. Rollup emitiu avisos de comentários de otimização na dependência Zod e de bundle acima de 500 kB (164 kB gzip); não houve erro de build.

Revisão independente de código realizada. Sem teste visual automatizado nesta sessão: o ambiente restringe abrir o servidor local (`listen EPERM`) e não disponibiliza navegador. Para conferir os dois temas, animações e interações, execute `./iniciar.sh` no terminal normal e abra `http://localhost:5173`. Sem deploy nesta etapa.

## V3 — conversão e assets vetoriais

Hero em 60vh, com redução adicional em celulares baixos para acomodar filtros. Badges de envio, numeração e suporte; cards com código contrastado, idade, altura, nebari, sol e ações Ver Ficha/Comprar junto ao preço.

Folha de Acer compartilhada entre Canvas e selo SVG com sete lóbulos serrilhados e nervuras. Selo circular com texto animado. Comparador vetorial utiliza uma garrafa ilustrativa de 25 cm, na mesma escala vertical da altura cadastrada; não substitui a foto com a mão.

Modal com fotografia original em moldura, enquadramentos animados e indicadores coloridos. Para completar a ficha do segundo exemplar, foi usada inicialmente a mesma orientação de rega fornecida para o primeiro; o texto e os níveis podem ser alterados na curadoria.

Migração conservadora dos cadastros iniciais V1/V2 intactos. Alterações pessoais e exclusões não são sobrescritas. Verificação adicional por renderização React no servidor: dois cards e dois modais sem placeholders, com dados, indicadores, visões e ações esperadas. A primeira dobra e animações ainda precisam de conferência visual no navegador real, indisponível nesta sessão.

## Enquadramento fotográfico limpo

Cards, modal e prévia da curadoria usam `BonsaiPhoto` com a fotografia original, sem remoção de fundo, worker de processamento ou pedestal SVG. A foto dos cards usa moldura quadrada (1:1), com friso de madeira de 12 px. Uma vinheta radial escurece suavemente topo e laterais no modo vitrine; ao abrir a escala com a mão, a vinheta desaparece em 0,5 s, revelando a fotografia clara. O corte inferior é ancorado na base do vaso; os dois exemplares iniciais usam 22% de corte, ajustável na curadoria para novas fotos.

O enquadramento padrão usa zoom 1,18 e foco central/direito. O botão de escala e a primeira visão do carrossel abrem para 1,05, preservando a mão e escondendo o torno. Miniaturas de nebari/copa usam zoom e pan, com transição de 0,5 s e respeito a movimento reduzido. A lupa permite explorar a foto com o ponteiro.

No editor, Enquadramento Fotográfico controla corte inferior, zoom e foco horizontal. Capas que usam um detalhe da galeria mantêm seu próprio recorte; escolha a visão geral para ajustar a moldura. Upload e compartilhamento preservam o arquivo original. Backups antigos com configurações de palco continuam aceitos, mas esses efeitos não são renderizados.

Foram inspecionadas prévias geométricas das duas fotos originais nos enquadramentos normal e aberto. A conferência de animações e interações no navegador permanece pendente neste ambiente.

## Experiência espacial (3D)

- **Hero WebGL** (`src/lib/bonsaiScene.ts`, `src/components/BonsaiHero3D.tsx`): Acer palmatum procedural em estilo Moyogi (tronco e galhos afunilados, nebari e copas com folhas instanciadas no formato da folha da marca), vaso oval e pedestal de pedra flutuante com filete dourado. Spot dourado `#D4AF37` com sombras, rim-light vermelho `#D9232E`, `FogExp2`, cone de luz volumétrico, poeira dourada e enso ao fundo. Centenas de folhas cruzam o espaço: as do plano focal são malhas 3D; as próximas da câmera e as distantes são sprites desfocados (profundidade de campo). A câmera segue o mouse (parallax orbital) e a cena gira com o scroll.
- O Three.js 0.180.0 é carregado **via CDN** (jsDelivr) em tempo de execução; os tipos vêm de `@types/three` (dev). Sem WebGL ou sem acesso ao CDN, o hero volta às folhas em Canvas 2D e ao logo. A animação pausa fora da tela/aba; com movimento reduzido, a cena é renderizada estática.
- **Vitrine diorama** (`PlantCard`): sem caixas. Cada exemplar fica em um palco 3D em camadas: `translateZ(-40px)` enso dourado com textura de pincel e numeral em marca d'água; `translateZ(40px)` a foto com máscara orgânica esfumada e sombra projetada que se move contra a inclinação; `translateZ(70px)` badges de vidro (preço, idade, nebari) orbitando a base. No hover: inclinação, brilho especular e crossfade para uma visão de detalhe.
- **Modal**: fotografia original completa, sem máscara, recorte ou filtro, com a parede e a mão do cultivador. Os enquadramentos de detalhe cadastrados não aparecem aqui (`rawPhotosOf`); a lupa só atua quando acionada. Mantém comparador de porte, barras de cuidado, WhatsApp e compartilhamento.

Verificado em Chromium headless (WebGL por SwiftShader), em 1440×900 e 390×844, nos temas escuro e claro: cena 3D, vitrine e modal renderizam sem erros no console.

## Desempenho no celular

- **Página pré-renderizada:** `npm run build` gera o HTML da página inicial (`src/entry-server.tsx` + `scripts/prerender.mjs`). Texto, catálogo e fotos aparecem antes do JavaScript; depois o app assume a página.
- **Imagem estática do hero:** em telas até 800px, `public/images/hero-poster-{dark,light}.webp` mostra a cena 3D pronta no primeiro quadro; a cena ao vivo começa na mesma composição, sem a animação de entrada, e aparece por cima. Ao mudar a cena 3D, gere de novo: `npm run build && npm run preview` e, em outro terminal, `node scripts/poster.cjs` (requer Playwright com Chromium e ImageMagick).
- O 3D só começa com a página ociosa e compila os shaders antes do primeiro quadro, sem travar a rolagem. Fontes do Google carregam sem bloquear a renderização.

## Revisão visual (container, vitrine com palco, experiência)

- **Container único** `--container: min(1200px, 100% - 32px)` em header, hero, vitrine, cultivador, CTA e rodapé (bordas alinhadas em 1440/1024/390 px, sem scroll horizontal).
- **Botões dourados**: o filete à direita vinha da borda transparente de 1px com o gradiente começando na padding-box, que se repetia na faixa da borda. Corrigido com `background-origin: border-box`.
- **Hero 3D**: ~25 folhas só em vermelho/laranja/dourado, emitidas ao redor da árvore e mascaradas fora da coluna de texto. Sem sprites desfocados, nenhuma folha com movimento reduzido, pausa fora da tela. Anel completo com respiro, sombra de contato elíptica, textura de casca e mais variação nas folhas. A árvore se posiciona e se afasta conforme a proporção da tela.
- **Vitrine**: campo opcional `fotoVitrine` (PNG/WebP recortado fora do site). Com recorte: palco com anel, sombra de contato, drop-shadow e inclinação ≤10° só com mouse. Sem recorte: foto real em moldura em arco, sem máscara. O modal mostra só as fotos reais. JSONs antigos continuam válidos.
- **Indicadores** sol/rega/cuidado em escala 1–5 (`indicadores`), editáveis clicando nos ícones na curadoria ou no editor. Fichas antigas derivam os valores dos níveis 1–3 e dos textos.
- **Header** fixo e translúcido, recolhe ao rolar para baixo. **Transição** card → modal com View Transitions API (fallback: fade do modal).
- **Link da ficha** `site.com/#DB-001` incluído na mensagem do WhatsApp (`{link}` no modelo; modelos antigos recebem o link ao final). O hash abre o modal ao carregar.
- **Foto do cultivador** editável na curadoria (`settings.fotoCultivador`), com opção de restaurar a padrão.

## Hero 3D realista

A árvore procedural ganhou relevo de casca, nebari com raízes aparentes, três ordens de galhos, milhares de folhas texturizadas (serrilhado, nervuras, leve concavidade e brilho translúcido nas bordas) com sombras recortadas, vaso esmaltado com verniz flutuando sem pedestal (só uma sombra de contato suave), substrato de cascalho com musgo, pontas dos galhos que se abrem em raminhos finos com tufos de folhas e iluminação de ambiente (RoomEnvironment). Todas as texturas são geradas no navegador; não há arquivos de imagem extras. O Three.js passou a ser carregado pelo endpoint `+esm` do jsDelivr, o mesmo usado pelos módulos extras, garantindo uma só instância.

**Modelo real:** um arquivo `public/models/bonsai.glb` válido substitui automaticamente a árvore e o vaso procedurais no mesmo palco (veja `public/models/LEIA-ME.txt`). Sem o arquivo, ou se ele falhar, a árvore procedural continua.

## Hero 3D na identidade da logo

A cena é montada sobre as medidas da logo oficial (`public/images/logo_escuro.jpeg`, 1586×992 px): 160 px da logo valem uma unidade da cena, com o eixo vertical da logo (coluna 760) no centro e a borda do vaso (linha 567) como referência (`LOGO`, `logoX` e `logoY` em `src/lib/bonsaiScene.ts`). Por isso arco, vaso, placa e copa caem nas mesmas posições da logo em qualquer tela.

- **Arco:** círculo completo centrado na linha 485 (raio externo de 472 px), com uma linha dourada grossa e uma fina sobre uma faixa escura (sombra suave no tema escuro, contorno preto sólido no tema claro, como nos dois arquivos da logo). O círculo continua curvando abaixo do topo da placa e termina escondido atrás dela. Na entrada, as linhas se desenham a partir do topo.
- **Vaso como base da placa:** vaso largo de cantos arredondados (colunas 465–1040), em pedra escura com borda mais clara e gasta. A placa fica à frente do vaso e, sobre ele, o preto da placa se dissolve: a face do vaso aparece com "BONSAI" e os filetes dourados ("— BONSAI —") e se funde à placa logo abaixo. O filete externo da placa esmaece ao chegar no vaso.
- **Tronco:** eixo em S traçado da logo, alargando-se da metade para baixo; a seção é moldada por contrafortes (um por raiz) e por fibras estreitas que se torcem e se separam ao subir, com sulcos escurecidos. Casca com fibras longas, fendas escuras e cristas claras.
- **Raízes (nebari):** 13 raízes saem alto do tronco, descem e serpenteiam em arcos baixos sobre um montículo de musgo acima da borda do vaso até perto da borda, com algumas ramificações.
- **Galhos:** dois galhos principais quase horizontais abrem para a esquerda e para a direita sob a copa (como na logo), mais galhos altos, líder e galhos para frente e para trás; cada um com ramos secundários que terminam dentro da folhagem.
- **Copa:** silhueta conferida coluna a coluna contra a logo (triangular arredondada, base quase plana e aberta só junto ao tronco). Folhas palmadas de sete pontas em vermelho puro amostrado da logo (#E01A18 dominante, tons escuros no interior); o brilho é limitado sem saturar os canais, para o vermelho não virar coral.
- **Placa:** contorno da logo (cantos com recortes côncavos e aba em escudo), bordas em dourado-bronze, "DANIEL BOURSCHEID" e a folha vermelha nas posições da logo.

A cena é montada em etapas que devolvem a vez ao navegador entre si, para o celular continuar rolando enquanto ela é criada. A entrada leva 1,5 s (arco se desenha, vaso aparece, folhas surgem em onda); depois, só inclinação de até 8° com o ponteiro e brisa no vertex shader. Movimento reduzido mostra a cena estática. Pixel ratio máximo 2 (1,5 no celular), menos detalhe e placa em resolução menor em telas pequenas.

Ao mudar a cena, gere de novo as imagens estáticas do celular (`node scripts/poster.cjs`, veja "Desempenho no celular").

## Hero como capa

A composição 3D fica centralizada no topo da hero (`.hero-stage`). O texto de apresentação vem centralizado logo abaixo. O canvas cobre a hero inteira, atrás do texto, para que poucas folhas (12 no desktop, 7 no celular) caiam de toda a copa até o fim da hero. A chamada editável acima do título fica oculta fora da curadoria, porque a placa já mostra a marca. Se os quadros ficarem abaixo de ~40 fps, a resolução cai automaticamente em passos de 0,25 até 1×. As folhas que caem (18 no desktop, 10 no celular) usam o mesmo formato, saem sobretudo do lado direito da copa e ficam numa camada acima do conteúdo, sem capturar o ponteiro.

## Padrões visuais (`src/system.css`)

Camada carregada por último com variáveis únicas: chamadas douradas 11px/3px em maiúsculas; texto corrido 15px (14px no celular); títulos de seção num só tamanho (`--fs-h2`); botões com 48px de altura, 13px e cantos de 10px (pílulas e selos seguem arredondados); respiro vertical igual em todas as seções (`--section-y`); grade da vitrine alinhada ao container, junto com título e filtros; foto do cultivador com o mesmo canto arredondado dos cards. Para ajustar o site inteiro, altere as variáveis no topo do arquivo.
