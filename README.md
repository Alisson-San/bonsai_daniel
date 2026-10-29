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

**As edições da curadoria são salvas no banco de dados (ver "Banco de dados") e aparecem para todos os visitantes.** Enquanto ninguém salvar pela curadoria, o site mostra o acervo inicial de `src/data/initial.ts`. O cadeado pede login (e-mail e senha) de uma conta autorizada.

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

Folha de Acer compartilhada entre Canvas e SVG com sete lóbulos serrilhados e nervuras. Comparador vetorial utiliza uma garrafa ilustrativa de 25 cm, na mesma escala vertical da altura cadastrada; não substitui a foto com a mão.

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
- **Imagem estática do hero (disfarce da espera):** em qualquer tela, `public/images/hero-poster-{dark,light}.webp` (até 800px) ou `hero-poster-{dark,light}-large.webp` (acima) mostra a cena 3D pronta no primeiro quadro, já com folhas caindo da copa; o Three.js começa a baixar na hora e a cena ao vivo, montada quando a página fica ociosa, aparece por cima na mesma composição. A imagem é recortada na mesma caixa que a câmera enquadra (`POSTER` em `src/lib/bonsaiScene.ts`), então `background-size: contain` a alinha com a cena em qualquer tamanho. Ao mudar a cena 3D, gere de novo: `npm run build && npm run preview` e, em outro terminal, `node scripts/poster.cjs` (requer Playwright com Chromium e ImageMagick).
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

## Apresentação da coleção

- **Até 4 exemplares:** cada um ganha uma faixa larga própria, com a foto grande de um lado e o texto do outro, alternando os lados (no celular, foto em cima). **A partir de 5:** grade de cards.
- **Card enxuto:** categoria e código, nome, espécie, descrição curta, uma linha de medidas (idade · altura · nebari), preço em destaque e uma ação principal ("Tenho interesse", WhatsApp) com o link "Ver detalhes". Os indicadores de sol, rega e cuidado ficam na ficha (e no card só na curadoria).
- **Foto:** moldura retangular arredondada, que mostra a copa inteira.
- **Texto:** corpo de 17 px (15 px no celular), títulos maiores e botões de 50 px de altura (`src/system.css`).
- **Prévia de link:** `index.html` traz as tags Open Graph com `public/images/og-cover.jpg` (1200×630, o logo 3D), usada pelo WhatsApp, Instagram e Facebook. As URLs apontam para `https://bonsaidaniel.vercel.app/`; atualize se o domínio mudar.

## Biografia (`/biografia`)

Página própria do cultivador (`src/components/Biography.tsx`), aberta pelo botão "Conheça a história" na seção O Cultivador e pelo menu. Tem retrato e apresentação, destaques, a história, a trajetória (marcos), uma galeria de eventos, exposições e prêmios e uma chamada para a coleção. Tudo é editado na própria página pelo modo Curadoria; blocos vazios ficam ocultos para os visitantes.

- **Destaques:** um por linha, `título | detalhe`.
- **História:** parágrafos separados por uma linha em branco; o primeiro aparece em destaque.
- **Trajetória:** um marco por linha, `ano | título | texto`.
- **Galeria:** fotos enviadas na Curadoria, com legenda editável.

A navegação entre a página inicial e a biografia é feita no próprio app (com transição de página onde o navegador suporta) e o botão voltar funciona. O build pré-renderiza as duas páginas (`dist/index.html` e `dist/biografia/index.html`, ver `vercel.json`), e o app hidrata o HTML pronto em vez de recriá-lo.

## Banco de dados (Supabase)

O catálogo fica no projeto Supabase `bonsai-daniel` (plano gratuito, região São Paulo). Qualquer visitante lê; só a curadoria grava.

- **Tabela `catalog`:** uma linha (`id = 'current'`) com o catálogo inteiro em `data` (JSON validado pelo mesmo `catalogSchema`) e um número de `revision`. Cada gravação só vale sobre a revisão de onde partiu, então duas pessoas (ou abas) nunca se sobrescrevem sem aviso.
- **Tabela `admins`:** e-mails que podem editar (hoje `alirod.santos@gmail.com`). Fechada para a API; para incluir alguém, rode no SQL Editor: `insert into public.admins (email) values ('email@exemplo.com');`
- **Bucket `fotos`:** fotos enviadas na curadoria vão para o Storage na hora de salvar; o catálogo guarda só as URLs públicas.
- **Regras (RLS):** leitura pública; inserir e alterar o catálogo e as fotos só para usuário logado com e-mail confirmado e listado em `admins` (`public.is_admin()`).
- **Login:** o cadeado abre "Entrar na curadoria" (e-mail e senha). No primeiro acesso, use "Primeiro acesso" para criar a senha e confirme pelo link enviado por e-mail; "Esqueci a senha" manda um link de troca.
- **Código:** `src/lib/supabase.ts` (configuração; a chave publicável pode ficar no navegador, e as variáveis `VITE_SUPABASE_URL`/`VITE_SUPABASE_PUBLISHABLE_KEY` a substituem), `src/lib/remoteRepository.ts` (leitura, gravação e envio de fotos), `src/components/CurationAccess.tsx` (login). A biblioteca do Supabase só carrega quando a curadoria é aberta; visitantes leem o catálogo por uma chamada simples.
- **Build:** a pré-renderização busca o catálogo publicado e o embute na página, então o HTML já chega com os exemplares reais. Mudanças feitas depois aparecem para o visitante assim que a página carrega.
- **Configuração no painel do Supabase (Authentication → URL Configuration):** defina *Site URL* como `https://bonsaidaniel.vercel.app` e inclua essa URL em *Redirect URLs*, para os links de confirmação e de troca de senha voltarem ao site.

## Seções da página inicial

- **Vendidos:** exemplares marcados como "Vendido" saem da coleção e aparecem em "Já encontraram um novo lar", com foto em tons apagados e acesso à ficha. Na curadoria e no filtro "Vendido" eles continuam na coleção, para edição.
- **Como funciona:** passos da compra, editáveis na curadoria (um por linha, `título | texto`).
- **Depoimentos:** ocultos até o primeiro ser cadastrado na curadoria (um por linha, `depoimento | nome | cidade`).
- **Logo no topo:** na página inicial, o logo do menu fica oculto enquanto o emblema 3D está na tela; ao rolar, o emblema recua e esmaece e o logo do menu aparece no lugar. O menu só se esconde ao rolar para baixo depois do topo.

## Abertura e 3D

- **Entrada:** o emblema entra em foco, depois título, texto, botão e benefícios sobem em sequência (`src/system.css`, desativado com movimento reduzido).
- **Brilho dourado:** logo que a cena aparece e depois a cada 9 s, uma luz percorre o arco e passa pelos filetes e letras douradas da placa.
- **Rolagem:** ao rolar para fora do topo, a árvore gira até 24° dentro do vaso, mostrando que é 3D; o vaso fica parado como base da placa.
- **Celular:** em aparelhos Android, inclinar o telefone inclina a árvore (giroscópio); no iPhone fica o giro pela rolagem.
- **Coleção:** cada foto abre de uma janela menor e assenta de um leve zoom ao entrar na tela.
- **Ficha:** mais larga, foto fixa enquanto o texto rola e tipografia maior; o comparador de porte com a garrafa saiu (a foto com a mão já mostra a escala).

## Hero 3D na identidade da logo

A cena é montada sobre as medidas da logo oficial (`public/images/logo_escuro.jpeg`, 1586×992 px): 160 px da logo valem uma unidade da cena, com o eixo vertical da logo (coluna 760) no centro e a borda do vaso (linha 567) como referência (`LOGO`, `logoX` e `logoY` em `src/lib/bonsaiScene.ts`). Por isso arco, vaso, placa e copa caem nas mesmas posições da logo em qualquer tela.

- **Arco:** círculo completo centrado na linha 485 (raio externo de 472 px), com uma linha dourada grossa e uma fina sobre uma faixa escura (sombra suave no tema escuro, contorno preto sólido no tema claro, como nos dois arquivos da logo). O círculo continua curvando abaixo do topo da placa e termina escondido atrás dela.
- **Vaso como base da placa:** vaso largo de cantos arredondados (colunas 465–1040), em pedra escura com borda mais clara e gasta. A placa fica à frente do vaso e, sobre ele, o preto da placa se dissolve: a face do vaso aparece com "BONSAI" e os filetes dourados ("— BONSAI —") e se funde à placa logo abaixo. O filete externo da placa esmaece ao chegar no vaso.
- **Tronco:** eixo em S traçado da logo (o meio da silhueta, linha a linha): base à direita do eixo, inclina para a esquerda ao subir e volta à direita no alto. A seção é moldada por contrafortes (um por raiz) e por fibras que giram num sentido embaixo e no outro em cima, reforçando o S. Sombreamento como na ilustração: sulcos quase pretos, flancos marrons e cristas creme (textura de cristas onduladas), pouca luz ambiente e bordas escurecidas que arredondam cada fibra e raiz.
- **Raízes (nebari):** 10 raízes saem da base do tronco, descem e serpenteiam em arcos baixos sobre um montículo de musgo acima da borda do vaso até perto da borda, com algumas ramificações; o lado de baixo de cada raiz é mais escuro.
- **Galhos:** dois galhos principais quase horizontais abrem para a esquerda e para a direita sob a copa (como na logo), mais galhos altos, líder e galhos para frente e para trás; cada um com ramos secundários que terminam dentro da folhagem.
- **Copa:** silhueta conferida coluna a coluna contra a logo (triangular arredondada, base quase plana e aberta só junto ao tronco, que aparece inteiro até os galhos). Folhas de bordo japonês como as da logo: sete lobos em forma de lança (estreitos no centro, largos no meio, ponta longa) com recortes fundos e serrilhado fino, em tamanhos variados e quase todas viradas para quem olha. Luz e sombra como na logo: as folhas do alto e de fora de cada tufo são claras, as de baixo, de dentro e do fundo caem em carmim escuro, e a copa é mais clara no alto à esquerda; cada lobo é claro na nervura e mais escuro nas bordas, com um brilho rosado nas nervuras. As cores seguem a distribuição medida nas folhas da logo (sombras #6F0908, meios-tons #AF1212, brilhos #FA342E), sem puxar para rosa ou cinza.
- **Placa:** contorno medido na logo (cantos com recortes côncavos e a aba inferior em forma de bacia, medida coluna a coluna, terminando numa pontinha), bordas em dourado-bronze, sombra suave embaixo, "DANIEL BOURSCHEID" nas posições da logo e a folha de bordo vermelha traçada da própria logo, com cabo, nervuras e borda clara.

A cena é montada em etapas que devolvem a vez ao navegador entre si, para a página continuar rolando enquanto ela é criada. Ela começa já composta, sem animação de entrada (que brigaria com a imagem estática); depois, só inclinação de até 8° com o ponteiro e brisa no vertex shader. Movimento reduzido mostra a cena estática. Pixel ratio máximo 2 (1,5 no celular), menos detalhe e placa em resolução menor em telas pequenas.

Ao mudar a cena, gere de novo as imagens estáticas (`node scripts/poster.cjs`, veja "Desempenho no celular").

## Hero como capa

A composição 3D fica centralizada no topo da hero (`.hero-stage`). O texto de apresentação vem centralizado logo abaixo. O canvas cobre a hero inteira, atrás do texto, para que poucas folhas (12 no desktop, 7 no celular) caiam de toda a copa até o fim da hero. A chamada editável acima do título fica oculta fora da curadoria, porque a placa já mostra a marca. Se os quadros ficarem abaixo de ~40 fps, a resolução cai automaticamente em passos de 0,25 até 1×. As folhas que caem (18 no desktop, 10 no celular) usam o mesmo formato, saem sobretudo do lado direito da copa e ficam numa camada acima do conteúdo, sem capturar o ponteiro.

## Padrões visuais (`src/system.css`)

Camada carregada por último com variáveis únicas: chamadas douradas 11px/3px em maiúsculas; texto corrido 15px (14px no celular); títulos de seção num só tamanho (`--fs-h2`); botões com 48px de altura, 13px e cantos de 10px (pílulas e selos seguem arredondados); respiro vertical igual em todas as seções (`--section-y`); grade da vitrine alinhada ao container, junto com título e filtros; foto do cultivador com o mesmo canto arredondado dos cards. Para ajustar o site inteiro, altere as variáveis no topo do arquivo.
