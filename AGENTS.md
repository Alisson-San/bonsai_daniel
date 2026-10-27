# PROJETO: Catálogo Interativo & Visual CMS - "Bonsai Daniel Bourscheid"

## 1. VISÃO GERAL E DIREÇÃO DE ARTE
Desenvolva uma aplicação web Single Page Application (SPA) ultra-fluida e moderna para o catálogo "Bonsai Daniel Bourscheid". O site deve ter a sensação de um software nativo de galeria de arte viva (estilo Apple / Awwwards), combinando estética japonesa de luxo com motion design avançado e um sistema de gerenciamento de conteúdo visual (In-Page Visual CMS).

### Paleta de Cores (Baseada na Logo Oficial):
- **Background Principal:** Verde Floresta Imperial Profundo (`#0B1911` a `#12261A`) com textura sutil de granulação (noise) e gradientes radiais suaves.
- **Superfícies / Cards (Glassmorphism):** `rgba(20, 40, 28, 0.65)` com `backdrop-filter: blur(16px)` e bordas finas em Dourado Metálico translúcido (`rgba(212, 175, 55, 0.25)`).
- **Primary Accent (Dourado Bourscheid):** Gradiente linear `#D4AF37` para `#F3E5AB` (usado em títulos de destaque, bordas ativas, badges e ícones).
- **Secondary Accent (Vermelho Acer/Momiji):** `#D9232E` (usado em detalhes sutis, tags de raridade/destaque e partículas de folhas).
- **Tipografia:** 
  - Títulos: Fonte Serifada Clássica de Alto Contraste (`Cormorant Garamond` ou `Cinzel`).
  - UI, Filtros e Dados Técnicos: Sans-serif limpa e geométrica (`Plus Jakarta Sans` ou `Inter`).

---

## 2. EXPERIÊNCIA DE MOTION DESIGN & FLUIDEZ (FEELING DE SOFTWARE)
- **Física e Transições (Framer Motion / FLIP):** Todas as mudanças de estado (filtragem de categorias, abertura de modal de detalhes, adição de item) devem usar animações baseadas em física (`spring`: stiffness 300, damping 30) e *Shared Layout Transitions* (a foto do card se expande suavemente até virar a foto principal do modal).
- **Efeito Atmosférico no Hero:** Ao fundo da seção inicial (Hero), implemente um efeito sutil e contínuo em Canvas/CSS de pequenas folhas vermelhas de *Acer Palmatum* caindo lentamente com desfoque de profundidade (depth-of-field).
- **Micro-interações nos Cards:** 
  - Efeito de inclinação 3D sutil no hover (3D Tilt / Parallax suave) com brilho especular dourado acompanhando o cursor.
  - No hover do card, fazer crossfade automático entre a foto principal e a foto secundária (ex: visão com escala da mão).

---

## 3. ARQUITETURA DO CATÁLOGO E BANCO DE IMAGENS POR PLANTA
Cada Bonsai cadastrado deve suportar uma estrutura rica de dados e um **Banco de Múltiplas Imagens (Multi-Angle Gallery)**:
- **Campos do Exemplar:**
  - `id`, `codigo` (ex: #DB-014)
  - `nomePopular` (ex: Ficus Retusa / Figueira)
  - `especieCientifica` (ex: *Ficus microcarpa*)
  - `categoria` (Ex: Pré-Bonsai de Engorda, Bonsai Formado, Exemplar de Coleção / Mestre, Shohin)
  - `idadeEstimada` (ex: "12 anos"), `alturaCm` (ex: "45 cm"), `larguraNebariCm` (ex: "22 cm")
  - `estilo` (ex: Moyogi, Chokkan, Tronco Duplo / Sokan)
  - `ambiente` (Sol Pleno, Meia-Sombra), `nivelCuidado` (Iniciante, Intermediário, Avançado)
  - `preco` (Valor numérico formatado em R$ ou flag "Sob Consulta")
  - `disponivel` (Boolean: Disponível / Reservado / Vendido)
  - `descricao` (História da planta, trabalho de madeira/ramificação realizado, vaso atual)
  - `galeria`: Array de objetos de imagem `{ url, anguloTag }`, onde `anguloTag` classifica a visão:
    1. `Frente (Omote)`
    2. `Costas (Ura)`
    3. `Detalhe de Tronco / Nebari`
    4. `Escala Real (Comparação Humana)` -> *Feature especial: botão "Ver Escala Real" no modal que alterna diretamente para a foto onde aparece a mão/braço ao lado do tronco para dar noção exata de volume.*

---

## 4. MODO ADMINISTRADOR "IN-PAGE" (EDIÇÃO DIRETO NO LAYOUT)
Não crie uma página `/admin` separada e desconectada. Crie uma **Barra Flutuante de Curadoria (Admin Dock)** no canto inferior da tela (acessível via botão discreto de cadeado/login no rodapé ou topo).
Quando o **"Modo Edição Visual"** estiver ATIVO:
1. **Edição Inline (WYSIWYG):**
   - Textos do Hero, bio do cultivador e informações de contato (WhatsApp, Instagram, Localização) ganham um contorno dourado pontilhado no hover; clicar permite editar o texto diretamente na tela.
2. **Gerenciamento Direto na Grade do Catálogo:**
   - Aparece um primeiro Card fixo estilizado: **"+ Cadastrar Novo Bonsai"** na própria grade do catálogo.
   - Cada card existente exibe botões rápidos no canto superior: `Editar`, `Duplicar`, `Alternar Status (Disponível/Vendido)` e `Excluir`.
3. **Modal de Edição & Upload com Preview em Tempo Real:**
   - Ao clicar para editar ou criar um bonsai, abre-se o próprio Modal Imersivo do produto, porém com os campos destravados (inputs estilizados no próprio layout).
   - **Gerenciador de Galeria da Planta:** Área de Drag-and-Drop (ou upload via arquivo/URL/Base64 persistido em LocalStorage/IndexedDB inicialmente, preparado para API) permitindo adicionar várias fotos da mesma planta, definir qual é a Capa e atribuir a tag de visão (Frente, Nebari, Escala Real, etc.).
   - **Gerenciador de Categorias/Espécies:** Permitir criar novas tags de categoria ou espécie dinamicamente na barra de filtros.
4. **Exportação/Importação Rápida de Backup (JSON):** Na barra flutuante do Admin, adicione botões "Exportar Catálogo (JSON)" e "Importar Backup" para garantir portabilidade imediata dos dados cadastrados.

---

## 5. INTEGRAÇÃO INTELIGENTE COM WHATSAPP (CONVERSÃO RÁPIDA)
Dentro do modal de visualização do Bonsai e nos cards, o botão de ação principal (**"Tenho Interesse neste Exemplar"**) deve acionar a API do WhatsApp + Web Share API:
- **Geração de Mensagem Contextual Completa:**
  Ao clicar, abrir link `https://wa.me/{NUMERO_ADMIN}?text={MENSAGEM_ENCODED}` contendo:
  *"Olá Daniel! Estava navegando no catálogo e tenho interesse no exemplar: *[Nome Popular - Código]* ([Espécie] - [Idade] - Valor: [Preço]). Foto de referência: [URL_DA_FOTO_PRINCIPAL]. Poderia me passar mais detalhes?"*
- **Compartilhamento Direto com Imagem (Mobile/Web Share API):**
  Adicionar ao lado um botão secundário "Compartilhar Ficha c/ Foto" que utiliza `navigator.share({ files: [imagem], title, text })` quando suportado pelo dispositivo, permitindo enviar a foto real do bonsai diretamente para a conversa do WhatsApp com 1 toque.
- O número do WhatsApp de destino e o template base da mensagem devem ser editáveis pelo administrador direto no painel de Configurações de Contato na página.

