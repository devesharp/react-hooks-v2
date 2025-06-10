# useFetch Hook

Um hook React poderoso e tipado para gerenciar múltiplos resolvers de dados (síncronos, assíncronos e promises).

## Características

- ✅ **Totalmente tipado** com TypeScript
- ✅ **Suporte a múltiplos tipos de resolvers**:
  - Funções síncronas
  - Funções assíncronas
  - Promises diretas
- ✅ **Estados de loading individuais e global**
- ✅ **Tratamento de erros por resolver**
- ✅ **Refetch seletivo ou global**
- ✅ **Auto-execução na inicialização**
- ✅ **Estados de inicialização (isStarted, isErrorOnLoad)**
- ✅ **Callbacks de eventos (onStarted, onError)**
- ✅ **Função de reload com opção de manter dados**

## Uso Básico

```typescript
import { useFetch } from './hooks/useFetch'

const MyComponent = () => {
  const { 
    resolve, 
    loading, 
    errors, 
    isLoading, 
    isStarted, 
    isErrorOnLoad, 
    refetch, 
    onReload 
  } = useFetch({
    resolvers: {
      // Função síncrona
      items: () => ({ item: "valor" }),
      
      // Função assíncrona
      testAsync: async () => ({ item: "valor" }),
      
      // Promise direta
      promise: new Promise((resolve) => resolve({ item: "valor" }))
    },
    onStarted: (results) => {
      console.log('Todos os resolvers executados com sucesso:', results)
    },
    onError: (errors) => {
      console.log('Alguns resolvers falharam:', errors)
    }
  })

  // Acessar dados tipados
  console.log(resolve.items)     // { item: string } | undefined
  console.log(resolve.testAsync) // { item: string } | undefined
  console.log(resolve.promise)   // { item: string } | undefined

  return (
    <div>
      {/* Estados de inicialização */}
      <div>
        Status: {isStarted ? '✅ Iniciado' : isErrorOnLoad ? '❌ Erro' : '⏳ Carregando'}
      </div>
      
      {isLoading && <p>Carregando...</p>}
      
      <div>Items: {resolve.items?.item}</div>
      <div>Async: {resolve.testAsync?.item}</div>
      <div>Promise: {resolve.promise?.item}</div>
      
      {errors.items && <p>Erro: {errors.items.message}</p>}
      {isErrorOnLoad && <p>Houve erros na inicialização!</p>}
      
      <button onClick={() => refetch()}>Recarregar Tudo</button>
      <button onClick={() => refetch('items')}>Recarregar Items</button>
      <button onClick={() => onReload(false)}>Reload (Limpar)</button>
      <button onClick={() => onReload(true)}>Reload (Manter)</button>
    </div>
  )
}
```

## Exemplo Avançado

```typescript
const AdvancedExample = () => {
  const { resolve, loading, errors, refetch, executeResolver } = useFetch({
    resolvers: {
      // API call
      users: async () => {
        const response = await fetch('/api/users')
        return response.json() as Promise<User[]>
      },
      
      // Configuração local
      config: () => ({
        theme: 'dark',
        language: 'pt-BR'
      }),
      
      // Promise com delay
      delayedData: new Promise<{ message: string }>(resolve => 
        setTimeout(() => resolve({ message: 'Dados carregados!' }), 2000)
      ),
      
      // Dados que podem falhar
      riskyOperation: async () => {
        if (Math.random() > 0.5) {
          throw new Error('Operação falhou')
        }
        return { success: true }
      }
    }
  })

  return (
    <div>
      {/* Loading states individuais */}
      {loading.users && <p>Carregando usuários...</p>}
      {loading.delayedData && <p>Carregando dados...</p>}
      
      {/* Dados */}
      <h2>Usuários ({resolve.users?.length || 0})</h2>
      <p>Tema: {resolve.config?.theme}</p>
      <p>Mensagem: {resolve.delayedData?.message}</p>
      
      {/* Tratamento de erros */}
      {errors.riskyOperation && (
        <p style={{ color: 'red' }}>
          Erro na operação: {errors.riskyOperation.message}
        </p>
      )}
      
      {/* Controles */}
      <button onClick={() => executeResolver('users')}>
        Recarregar Usuários
      </button>
      
      <button onClick={() => executeResolver('riskyOperation')}>
        Tentar Operação Novamente
      </button>
    </div>
  )
}
```

## API

### Parâmetros

```typescript
interface IFetchProps<T extends Record<string, Resolver>> {
  resolvers: T
  onStarted?: (results: Partial<ResolvedValues<T>>) => void
  onError?: (errors: { [K in keyof T]?: Error }) => void
}
```

### Retorno

```typescript
{
  // Dados resolvidos (tipados automaticamente)
  resolve: Partial<ResolvedValues<T>>
  
  // Estados de loading por resolver
  loading: Record<keyof T, boolean>
  
  // Erros por resolver
  errors: Record<keyof T, Error | null>
  
  // Loading global (true se qualquer resolver estiver carregando)
  isLoading: boolean
  
  // Se todos os resolvers foram executados com sucesso na inicialização
  isStarted: boolean
  
  // Se houve erro durante a inicialização
  isErrorOnLoad: boolean
  
  // Reexecutar todos os resolvers ou um específico
  refetch: (key?: keyof T) => Promise<unknown>
  
  // Executar um resolver específico
  executeResolver: (key: keyof T) => Promise<unknown>
  
  // Recarregar todos os resolvers com opção de manter dados
  onReload: (keepData?: boolean) => Promise<unknown>
}
```

### Tipos de Resolvers Suportados

```typescript
// Função síncrona
() => any

// Função assíncrona
async () => any

// Promise direta
Promise<any>
```

## Características Técnicas

- **Auto-execução**: Todos os resolvers são executados automaticamente na inicialização
- **Tipagem automática**: O TypeScript infere automaticamente os tipos de retorno
- **Gerenciamento de estado**: Estados de loading e erro são gerenciados automaticamente
- **Performance**: Usa `useCallback` e `useRef` para evitar re-renderizações desnecessárias
- **Tratamento de erros**: Erros são capturados e armazenados por resolver individual

## Casos de Uso

- **Carregamento de dados múltiplos**: APIs, configurações, dados locais
- **Estados de loading complexos**: Controle granular de loading por fonte de dados
- **Retry de operações**: Reexecutar operações específicas que falharam
- **Dados mistos**: Combinar dados síncronos e assíncronos em uma única interface 