# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default tseslint.config({
  extends: [
    // Remove ...tseslint.configs.recommended and replace with this
    ...tseslint.configs.recommendedTypeChecked,
    // Alternatively, use this for stricter rules
    ...tseslint.configs.strictTypeChecked,
    // Optionally, add this for stylistic rules
    ...tseslint.configs.stylisticTypeChecked,
  ],
  languageOptions: {
    // other options...
    parserOptions: {
      project: ['./tsconfig.node.json', './tsconfig.app.json'],
      tsconfigRootDir: import.meta.dirname,
    },
  },
})
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default tseslint.config({
  plugins: {
    // Add the react-x and react-dom plugins
    'react-x': reactX,
    'react-dom': reactDom,
  },
  rules: {
    // other rules...
    // Enable its recommended typescript rules
    ...reactX.configs['recommended-typescript'].rules,
    ...reactDom.configs.recommended.rules,
  },
})
```

# My Hooks Lib

Uma biblioteca de hooks customizados para React, desenvolvida em TypeScript.

## 📦 Instalação

```bash
npm install my-hooks-lib
# ou
yarn add my-hooks-lib
# ou
pnpm add my-hooks-lib
```

## 🚀 Uso

```typescript
import { useDebounce, useLocalStorage, useToggle } from 'my-hooks-lib'
```

## 🧠 Hooks Disponíveis

### useDebounce

Hook para debounce de valores, útil para otimizar pesquisas e inputs.

```typescript
import { useDebounce } from 'my-hooks-lib'

function SearchComponent() {
  const [searchTerm, setSearchTerm] = useState('')
  const debouncedSearchTerm = useDebounce(searchTerm, 500)

  useEffect(() => {
    if (debouncedSearchTerm) {
      // Fazer busca apenas após 500ms de inatividade
      performSearch(debouncedSearchTerm)
    }
  }, [debouncedSearchTerm])

  return (
    <input
      value={searchTerm}
      onChange={(e) => setSearchTerm(e.target.value)}
      placeholder="Digite para buscar..."
    />
  )
}
```

### useIsMounted

Hook para verificar se o componente ainda está montado, útil para evitar vazamentos de memória.

```typescript
import { useIsMounted } from 'my-hooks-lib'

function AsyncComponent() {
  const isMounted = useIsMounted()
  const [data, setData] = useState(null)

  useEffect(() => {
    fetchData().then(result => {
      if (isMounted()) {
        setData(result)
      }
    })
  }, [isMounted])

  return <div>{data}</div>
}
```

### useLocalStorage

Hook para gerenciar dados no localStorage com sincronização entre abas.

```typescript
import { useLocalStorage } from 'my-hooks-lib'

function SettingsComponent() {
  const [theme, setTheme] = useLocalStorage('theme', 'light')
  const [user, setUser] = useLocalStorage('user', { name: '', email: '' })

  return (
    <div>
      <button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>
        Tema atual: {theme}
      </button>
      <input
        value={user.name}
        onChange={(e) => setUser(prev => ({ ...prev, name: e.target.value }))}
        placeholder="Nome"
      />
    </div>
  )
}
```

### useToggle

Hook para gerenciar estados booleanos com funções de toggle.

```typescript
import { useToggle } from 'my-hooks-lib'

function ModalComponent() {
  const [isOpen, toggle, setIsOpen] = useToggle(false)

  return (
    <div>
      <button onClick={toggle}>
        {isOpen ? 'Fechar' : 'Abrir'} Modal
      </button>
      <button onClick={() => setIsOpen(true)}>
        Forçar Abrir
      </button>
      {isOpen && <div>Conteúdo do Modal</div>}
    </div>
  )
}
```

### useFetch

Hook para fazer requisições HTTP com estados de loading e error.

```typescript
import { useFetch } from 'my-hooks-lib'

function UserProfile({ userId }: { userId: string }) {
  const { data, loading, error } = useFetch(`/api/users/${userId}`)

  if (loading) return <div>Carregando...</div>
  if (error) return <div>Erro: {error}</div>
  if (!data) return <div>Usuário não encontrado</div>

  return (
    <div>
      <h1>{data.name}</h1>
      <p>{data.email}</p>
    </div>
  )
}
```

## 🛠️ Desenvolvimento

### Scripts Disponíveis

```bash
# Build da biblioteca
npm run build

# Linting
npm run lint

# Desenvolvimento (se usando com Vite)
npm run dev
```

### Estrutura do Projeto

```
my-hooks-lib/
├── src/
│   ├── hooks/
│   │   ├── useDebounce.ts
│   │   ├── useIsMounted.ts
│   │   ├── useLocalStorage.ts
│   │   ├── useToggle.ts
│   │   ├── useFetch.ts
│   │   └── index.ts
│   └── index.ts
├── dist/                 # Arquivos compilados
├── package.json
├── tsconfig.json
├── tsup.config.ts
└── README.md
```

## 📋 Requisitos

- React >= 17
- TypeScript (recomendado)

## 🤝 Contribuindo

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

## 🔗 Links Úteis

- [Documentação do React](https://reactjs.org/)
- [TypeScript](https://www.typescriptlang.org/)
- [TSUP](https://tsup.egoist.dev/)


# Testes do useDebounce

Este arquivo contém testes abrangentes para o hook `useDebounce`.

## 📋 Cenários Testados

### ✅ Comportamento Básico
- **Valor inicial**: Verifica se o hook retorna o valor inicial imediatamente
- **Delay padrão**: Testa se o debounce funciona com o delay padrão de 500ms
- **Delay customizado**: Verifica se delays personalizados funcionam corretamente

### ✅ Comportamento Avançado
- **Cancelamento de timeout**: Testa se timeouts anteriores são cancelados quando o valor muda rapidamente
- **Mudança de delay**: Verifica se o hook responde corretamente quando o delay é alterado
- **Delay zero**: Testa o comportamento com delay zero

### ✅ Tipos de Dados
- **String**: Valores de texto
- **Number**: Valores numéricos
- **Object**: Objetos complexos
- **Array**: Arrays de dados

### ✅ Gerenciamento de Memória
- **Cleanup**: Verifica se timeouts são limpos quando o componente é desmontado
- **Referência**: Testa se a referência do valor é mantida quando não há mudanças

## 🧪 Executando os Testes

```bash
# Executar todos os testes
npm run test

# Executar testes uma vez
npm run test:run

# Executar testes com coverage
npm run test:coverage
```

## 🔧 Ferramentas Utilizadas

- **Vitest**: Framework de testes
- **@testing-library/react**: Utilitários para testar hooks React
- **jsdom**: Ambiente DOM para testes
- **Fake Timers**: Para controlar setTimeout/clearTimeout nos testes

## 📊 Cobertura de Testes

Os testes cobrem:
- ✅ Todas as linhas de código do hook
- ✅ Todos os cenários de uso comum
- ✅ Casos extremos (edge cases)
- ✅ Gerenciamento de memória
- ✅ Diferentes tipos de dados 