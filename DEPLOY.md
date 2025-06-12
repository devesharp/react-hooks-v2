# 🚀 Guia de Deploy

Este documento explica como fazer o deploy da biblioteca `@devesharp/react-hooks-v2` para o npm.

## 📋 Pré-requisitos

Antes de fazer o deploy, certifique-se de que:

1. **Você está logado no npm**: `npm whoami`
2. **Tem permissões para publicar**: Você deve ser membro da organização `@devesharp`
3. **A versão foi atualizada**: Atualize a versão no `package.json` seguindo [Semantic Versioning](https://semver.org/)

## 🔧 Scripts Disponíveis

### Scripts de Versionamento

#### `npm run version:patch`
Incrementa a versão patch (1.0.0 → 1.0.1) sem criar tag git:
```bash
npm run version:patch
```

#### `npm run version:minor`
Incrementa a versão minor (1.0.0 → 1.1.0) sem criar tag git:
```bash
npm run version:minor
```

#### `npm run version:major`
Incrementa a versão major (1.0.0 → 2.0.0) sem criar tag git:
```bash
npm run version:major
```

### Scripts de Deploy

### `npm run simulate-deploy`
Simula todo o processo de deploy com mensagens explicativas:
- 🔢 Incrementa a versão patch
- ✅ Executa lint
- 🧪 Executa testes
- 🏗️ Faz build
- 📦 Simula publicação

```bash
npm run simulate-deploy
```

### `npm run check-deploy`
Executa todas as verificações e simula o empacotamento sem publicar:
- ✅ Lint do código
- ✅ Execução dos testes
- ✅ Build da biblioteca
- ✅ Simulação do empacotamento

```bash
npm run check-deploy
```

### `npm run deploy:dry`
Executa todo o processo de deploy em modo simulação (dry-run):
- ✅ Todas as verificações do `check-deploy`
- ✅ Simulação da publicação no npm

```bash
npm run deploy:dry
```

### `npm run deploy`
**⚠️ CUIDADO**: Este comando publica efetivamente no npm!
- 🔢 Incrementa automaticamente a versão patch
- ✅ Todas as verificações
- 🚀 Publicação real no npm

```bash
npm run deploy
```

## 📝 Processo de Deploy Passo a Passo

### 1. Preparação
```bash
# Certifique-se de estar na branch main/master
git checkout main
git pull origin main

# Verifique se está logado no npm
npm whoami
```

### 2. Atualização da Versão
A versão é incrementada automaticamente durante o deploy, mas você pode fazer isso manualmente se necessário:

- **PATCH** (1.0.0 → 1.0.1): Bug fixes - **Automático no deploy**
- **MINOR** (1.0.0 → 1.1.0): Novas funcionalidades (backward compatible)
- **MAJOR** (1.0.0 → 2.0.0): Breaking changes

```bash
# Scripts disponíveis para versionamento manual
npm run version:patch  # para bug fixes (sem git tag)
npm run version:minor  # para novas features (sem git tag)
npm run version:major  # para breaking changes (sem git tag)

# Ou use o npm version tradicional (com git tag)
npm version patch  # para bug fixes
npm version minor  # para novas features
npm version major  # para breaking changes
```

### 3. Verificação
```bash
# Execute a verificação completa
npm run check-deploy

# Se tudo estiver ok, teste em modo dry-run
npm run deploy:dry
```

### 4. Deploy
```bash
# Faça o commit das mudanças (se houver)
git add .
git commit -m "feat: add new features" # ou "fix: bug fixes"
git push origin main

# Execute o deploy (incrementa versão patch automaticamente)
npm run deploy
```

### 5. Pós-Deploy
```bash
# O npm version já cria automaticamente uma tag git
# Faça push das tags criadas
git push origin --tags

# Ou se quiser criar uma tag manual
git tag v1.0.1  # substitua pela versão atual
git push origin --tags
```

## 🔍 Verificações Automáticas

O script de deploy executa automaticamente:

1. **ESLint**: Verifica a qualidade do código
2. **Testes**: Executa todos os testes unitários
3. **Build**: Compila a biblioteca para produção
4. **Empacotamento**: Prepara os arquivos para publicação

## 📦 Arquivos Incluídos no Pacote

Os seguintes arquivos são incluídos no pacote npm:
- `dist/` - Arquivos compilados
- `README.md` - Documentação
- `LICENSE` - Licença
- `package.json` - Metadados do pacote

## ❌ Arquivos Excluídos

Os seguintes arquivos são excluídos via `.npmignore`:
- Código fonte (`src/`)
- Testes (`**/__tests__/`, `**/*.test.*`)
- Configurações de desenvolvimento
- Arquivos temporários

## 🚨 Troubleshooting

### Erro de Autenticação
```bash
npm login
# ou
npm adduser
```

### Erro de Permissão
Certifique-se de que você tem permissão para publicar na organização `@devesharp`.

### Versão já Existe
```bash
# Atualize a versão no package.json
npm version patch
```

### Falha nos Testes
```bash
# Execute os testes individualmente para identificar o problema
npm run test:run
```

## 📚 Links Úteis

- [npm Documentation](https://docs.npmjs.com/)
- [Semantic Versioning](https://semver.org/)
- [npm publish](https://docs.npmjs.com/cli/v8/commands/npm-publish)
- [npm version](https://docs.npmjs.com/cli/v8/commands/npm-version) 