#!/usr/bin/env bash
# Ambiente do projeto: não modifica Node, npm ou configuração do shell do usuário.
set -euo pipefail
cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.."
project_dir="$PWD"
runtime_dir="$project_dir/.local-tools"
mkdir -p "$runtime_dir/bin" "$runtime_dir/npm-cache"

valid_node() {
  [[ -x "$1" ]] && "$1" -e 'const [major,minor]=process.versions.node.split(".").map(Number);process.exit(major>22 || (major===22 && minor>=12) ? 0 : 1)' >/dev/null 2>&1
}
node_bin=""
shopt -s nullglob
candidates=("${BONSAI_NODE:-}" "$(command -v node || true)" "$HOME/.local/bin/node" "$HOME"/.nvm/versions/node/*/bin/node "$HOME"/.vscode-server/bin/*/node /usr/bin/node /usr/local/bin/node)
for candidate in "${candidates[@]}"; do
  if valid_node "$candidate"; then node_bin="$(readlink -f -- "$candidate")"; break; fi
done
if [[ -z "$node_bin" ]]; then
  printf '%s\n' 'Não foi encontrado Node >=22.12. Instale Node LTS ou defina BONSAI_NODE com o caminho do executável.' >&2
  exit 1
fi

npm_cli=""
node_dir="$(dirname -- "$node_bin")"
npm_command="$(command -v npm || true)"
npm_resolved="$(readlink -f -- "$npm_command" 2>/dev/null || true)"
npm_candidates=("${BONSAI_NPM_CLI:-}" "$node_dir/../lib/node_modules/npm/bin/npm-cli.js" "$node_dir/node_modules/npm/bin/npm-cli.js" /usr/share/nodejs/npm/bin/npm-cli.js /usr/lib/node_modules/npm/bin/npm-cli.js /usr/local/lib/node_modules/npm/bin/npm-cli.js)
if [[ "$npm_resolved" == */npm-cli.js ]]; then npm_candidates+=("$npm_resolved"); fi
# Compatibilidade com o npm já presente neste workspace, cujo wrapper usa um Node removido.
npm_candidates+=("$HOME/Linguagens/AssentsPowerBI/.local-artifacts/build-tools/package/bin/npm-cli.js")
for candidate in "${npm_candidates[@]}"; do
  if [[ -f "$candidate" ]] && "$node_bin" "$candidate" --version >/dev/null 2>&1; then npm_cli="$candidate"; break; fi
done
if [[ -z "$npm_cli" ]]; then
  printf '%s\n' 'npm não encontrado. Instale Node com npm ou defina BONSAI_NPM_CLI para npm-cli.js.' >&2
  exit 1
fi
ln -sf -- "$node_bin" "$runtime_dir/bin/node"
{
  printf '#!/usr/bin/env bash\n'
  printf 'exec %q %q "$@"\n' "$node_bin" "$npm_cli"
} > "$runtime_dir/bin/npm"
chmod +x "$runtime_dir/bin/npm"
export PATH="$runtime_dir/bin:$PATH"
export npm_config_cache="$runtime_dir/npm-cache"
export npm_config_fetch_retries=0
export npm_config_fetch_timeout=15000

printf 'Node %s · npm %s\n' "$(node --version)" "$(npm --version)"
mode="${1:---dev}"
case "$mode" in --dev|--check|--install|--build|--test) ;; *) printf 'Uso: ./iniciar.sh [--dev|--check|--install|--build|--test]\n' >&2; exit 2 ;; esac
fingerprint() { sha256sum package.json package-lock.json 2>/dev/null | sha256sum | cut -d' ' -f1; }
dependencies_ready() {
  node --input-type=module -e 'for(const p of ["vite","typescript","react","react-dom","framer-motion","lucide-react","zod","fake-indexeddb"]) import.meta.resolve(p)' >/dev/null 2>&1
}
if [[ "$mode" == --check ]]; then
  if dependencies_ready; then printf '%s\n' 'Dependências encontradas.'; else printf '%s\n' 'Dependências ausentes. Execute ./iniciar.sh para instalar e iniciar.' >&2; exit 1; fi
  exit 0
fi
current_fingerprint="$(fingerprint || true)"
saved_fingerprint="$(cat "$runtime_dir/dependencies.sha256" 2>/dev/null || true)"
if [[ "$mode" == --install ]] || ! dependencies_ready || [[ "$current_fingerprint" != "$saved_fingerprint" ]]; then
  printf '%s\n' 'Instalando dependências do projeto…'
  if ! npm install --no-audit --no-fund; then
    printf '\n%s\n' 'Não foi possível instalar as dependências. Se houver EAI_AGAIN/ENOTFOUND, este terminal está sem acesso ao registro npm. Execute ./iniciar.sh em um terminal com acesso à internet.' >&2
    exit 1
  fi
  fingerprint > "$runtime_dir/dependencies.sha256"
fi
case "$mode" in
  --install) printf '%s\n' 'Ambiente instalado. Execute ./iniciar.sh para abrir o servidor.' ;;
  --build) exec npm run build ;;
  --test) exec npm test ;;
  --dev) printf '\n%s\n' 'Servidor: http://localhost:5173 (Ctrl+C para encerrar)'; exec npm run dev -- --host 127.0.0.1 --port 5173 --strictPort ;;
esac
