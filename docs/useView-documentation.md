# useView Hook - Documentação Completa

## Introdução

O `useView` é um hook React personalizado projetado para gerenciar o carregamento de dados assíncronos e síncronos de forma elegante e consistente. Ele fornece um sistema robusto de gerenciamento de estado para operações de carregamento, tratamento de erros e callbacks de ciclo de vida.

## Características Principais

- ✅ Suporte a resolvers síncronos e assíncronos
- ✅ Gerenciamento automático de estados de carregamento
- ✅ Tratamento robusto de erros
- ✅ Callbacks de ciclo de vida
- ✅ Função de recarregamento
- ✅ TypeScript com inferência de tipos
- ✅ Prevenção de recarregamentos desnecessários (hot reload)

## Instalação

```typescript
import { useView } from './hooks/useView';
```

## API Reference

### Parâmetros

```typescript
interface IUseViewProps<T extends Record<string, IResolve>> {
  resolves?: T;                    // Objeto com resolvers
  firstLoad?: boolean;             // Se deve carregar inicialmente (padrão: true)
  onStarted?: (v: IResolvedValues<T>) => void;     // Callback de sucesso
  onErrorStarted?: (v: { [K in keyof T]?: Error }) => void; // Callback de erro
}
```

### Tipos de Resolvers

```typescript
// Função síncrona
type SyncResolver = () => any;

// Função assíncrona
type AsyncResolver = () => Promise<any>;

// Promise direta
type DirectPromise = Promise<any>;

// Tipo unificado
type IResolve = SyncResolver | AsyncResolver | DirectPromise;
```

### Retorno

```typescript
{
  // Estados de carregamento
  isLoading: boolean;           // Indica se está carregando
  isStarted: boolean;           // Indica se foi iniciado com sucesso
  isErrorOnLoad: boolean;       // Indica se houve erro no carregamento
  isCriticalError: boolean;     // Indica erro crítico
  
  // Objetos de estado
  statusInfo: IStatusInfo;      // Objeto com todos os estados
  resolvesResponse: Partial<IResolvedValues<T>>; // Dados resolvidos
  
  // Funções de controle
  setStatusInfo: (status: Partial<IStatusInfo>) => void; // Atualizar status
  reloadPage: (wait1s?: boolean) => Promise<Partial<IResolvedValues<T>>>; // Recarregar
  runResolver: (key: keyof T) => Promise<unknown>; // Executar resolver específico
}
```

## Exemplos Básicos

### 1. Resolver Síncrono Simples

```typescript
function MyComponent() {
  const userData = { id: 1, name: 'João', email: 'joao@email.com' };
  
  const { isLoading, isStarted, resolvesResponse } = useView({
    resolves: {
      user: () => userData
    }
  });

  if (isLoading) return <div>Carregando...</div>;
  if (!isStarted) return <div>Erro ao carregar</div>;

  return (
    <div>
      <h1>Bem-vindo, {resolvesResponse.user?.name}!</h1>
      <p>Email: {resolvesResponse.user?.email}</p>
    </div>
  );
}
```

### 2. Resolver Assíncrono com API

```typescript
function UserProfile() {
  const { isLoading, isStarted, resolvesResponse, reloadPage } = useView({
    resolves: {
      user: async () => {
        const response = await fetch('/api/user');
        return response.json();
      },
      settings: async () => {
        const response = await fetch('/api/settings');
        return response.json();
      }
    }
  });

  if (isLoading) return <div>Carregando perfil...</div>;
  if (!isStarted) return <div>Erro ao carregar perfil</div>;

  return (
    <div>
      <h1>{resolvesResponse.user?.name}</h1>
      <p>Tema: {resolvesResponse.settings?.theme}</p>
      <button onClick={() => reloadPage()}>Recarregar</button>
    </div>
  );
}
```

### 3. Sem Carregamento Inicial

```typescript
function LazyComponent() {
  const { isLoading, resolvesResponse, reloadPage } = useView({
    resolves: {
      data: () => fetch('/api/data').then(r => r.json())
    },
    firstLoad: false // Não carrega automaticamente
  });

  return (
    <div>
      {isLoading && <div>Carregando...</div>}
      {resolvesResponse.data && <div>Dados: {JSON.stringify(resolvesResponse.data)}</div>}
      <button onClick={() => reloadPage()}>Carregar Dados</button>
    </div>
  );
}
```

## Exemplos Avançados

### 1. Com Callbacks de Ciclo de Vida

```typescript
function AdvancedComponent() {
  const [notification, setNotification] = useState('');

  const { isLoading, resolvesResponse } = useView({
    resolves: {
      user: () => fetchUser(),
      posts: () => fetchUserPosts(),
      analytics: () => fetchAnalytics()
    },
    onStarted: (data) => {
      console.log('Dados carregados com sucesso:', data);
      setNotification('Dados carregados!');
      
      // Acesso tipado aos dados
      console.log(`Usuário: ${data.user.name}`);
      console.log(`Posts: ${data.posts.length}`);
    },
    onErrorStarted: (errors) => {
      console.error('Erros no carregamento:', errors);
      setNotification('Erro ao carregar dados');
      
      // Verificar erros específicos
      if (errors.user) {
        console.error('Erro ao carregar usuário:', errors.user.message);
      }
    }
  });

  return (
    <div>
      {notification && <div className="notification">{notification}</div>}
      {isLoading && <div>Carregando dashboard...</div>}
      {resolvesResponse.user && (
        <div>
          <h1>Dashboard - {resolvesResponse.user.name}</h1>
          <p>Posts: {resolvesResponse.posts?.length || 0}</p>
        </div>
      )}
    </div>
  );
}
```

### 2. Múltiplos Resolvers com Tratamento de Erro Parcial

```typescript
function RobustComponent() {
  const { isLoading, isStarted, isErrorOnLoad, resolvesResponse } = useView({
    resolves: {
      essentialData: async () => {
        const response = await fetch('/api/essential');
        if (!response.ok) throw new Error('Dados essenciais não disponíveis');
        return response.json();
      },
      optionalData: async () => {
        try {
          const response = await fetch('/api/optional');
          return response.ok ? response.json() : null;
        } catch {
          return null; // Falha silenciosa para dados opcionais
        }
      },
      userPreferences: () => {
        return JSON.parse(localStorage.getItem('preferences') || '{}');
      }
    }
  });

  // Renderização baseada no estado
  if (isLoading) {
    return <div>Carregando aplicação...</div>;
  }

  if (isErrorOnLoad && !resolvesResponse.essentialData) {
    return <div>Erro crítico: Não foi possível carregar dados essenciais</div>;
  }

  return (
    <div>
      <h1>Aplicação Carregada</h1>
      
      {/* Dados essenciais sempre presentes se chegou aqui */}
      <div>Dados principais: {JSON.stringify(resolvesResponse.essentialData)}</div>
      
      {/* Dados opcionais podem não estar presentes */}
      {resolvesResponse.optionalData && (
        <div>Dados extras: {JSON.stringify(resolvesResponse.optionalData)}</div>
      )}
      
      {/* Preferências do localStorage */}
      <div>Preferências: {JSON.stringify(resolvesResponse.userPreferences)}</div>
    </div>
  );
}
```

### 3. Recarregamento com Debounce

```typescript
function SearchComponent() {
  const [searchTerm, setSearchTerm] = useState('');
  
  const { isLoading, resolvesResponse, reloadPage } = useView({
    resolves: {
      searchResults: async () => {
        if (!searchTerm.trim()) return [];
        
        const response = await fetch(`/api/search?q=${encodeURIComponent(searchTerm)}`);
        return response.json();
      }
    },
    firstLoad: false
  });

  // Debounce da busca
  useEffect(() => {
    if (!searchTerm.trim()) return;
    
    const timer = setTimeout(() => {
      reloadPage(false); // Sem delay adicional
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm, reloadPage]);

  return (
    <div>
      <input
        type="text"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        placeholder="Digite para buscar..."
      />
      
      {isLoading && <div>Buscando...</div>}
      
      <div>
        {resolvesResponse.searchResults?.map((item, index) => (
          <div key={index}>{item.title}</div>
        ))}
      </div>
    </div>
  );
}
```

## Casos de Uso Comuns

### 1. Dashboard com Múltiplas APIs

```typescript
function Dashboard() {
  const { isLoading, resolvesResponse, reloadPage } = useView({
    resolves: {
      stats: () => fetch('/api/stats').then(r => r.json()),
      recentActivity: () => fetch('/api/activity').then(r => r.json()),
      notifications: () => fetch('/api/notifications').then(r => r.json()),
      userInfo: () => fetch('/api/user').then(r => r.json())
    },
    onStarted: (data) => {
      // Atualizar título da página
      document.title = `Dashboard - ${data.userInfo.name}`;
    }
  });

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="dashboard">
      <header>
        <h1>Dashboard</h1>
        <button onClick={() => reloadPage()}>Atualizar</button>
      </header>
      
      <div className="dashboard-grid">
        <StatsWidget data={resolvesResponse.stats} />
        <ActivityWidget data={resolvesResponse.recentActivity} />
        <NotificationsWidget data={resolvesResponse.notifications} />
      </div>
    </div>
  );
}
```

### 2. Formulário com Dados de Inicialização

```typescript
function EditUserForm({ userId }: { userId: string }) {
  const [formData, setFormData] = useState({});

  const { isLoading, isStarted, resolvesResponse } = useView({
    resolves: {
      userData: async () => {
        const response = await fetch(`/api/users/${userId}`);
        return response.json();
      },
      countries: () => fetch('/api/countries').then(r => r.json()),
      roles: () => fetch('/api/roles').then(r => r.json())
    },
    onStarted: (data) => {
      // Inicializar formulário com dados do usuário
      setFormData(data.userData);
    }
  });

  if (isLoading) return <div>Carregando formulário...</div>;
  if (!isStarted) return <div>Erro ao carregar dados</div>;

  return (
    <form>
      <input
        value={formData.name || ''}
        onChange={(e) => setFormData({...formData, name: e.target.value})}
        placeholder="Nome"
      />
      
      <select value={formData.country || ''}>
        {resolvesResponse.countries?.map(country => (
          <option key={country.code} value={country.code}>
            {country.name}
          </option>
        ))}
      </select>
      
      <select value={formData.role || ''}>
        {resolvesResponse.roles?.map(role => (
          <option key={role.id} value={role.id}>
            {role.name}
          </option>
        ))}
      </select>
    </form>
  );
}
```

### 3. Página com Dependências Condicionais

```typescript
function ConditionalDataPage() {
  const [userRole, setUserRole] = useState<string | null>(null);

  const { isLoading, resolvesResponse, reloadPage } = useView({
    resolves: {
      user: async () => {
        const response = await fetch('/api/user');
        const userData = await response.json();
        setUserRole(userData.role); // Atualiza role para próximo carregamento
        return userData;
      },
      adminData: async () => {
        if (userRole !== 'admin') return null;
        const response = await fetch('/api/admin-data');
        return response.json();
      },
      publicData: () => fetch('/api/public-data').then(r => r.json())
    }
  });

  // Recarregar quando role mudar
  useEffect(() => {
    if (userRole) {
      reloadPage(false);
    }
  }, [userRole, reloadPage]);

  if (isLoading) return <div>Carregando...</div>;

  return (
    <div>
      <h1>Bem-vindo, {resolvesResponse.user?.name}</h1>
      
      <div>Dados públicos: {JSON.stringify(resolvesResponse.publicData)}</div>
      
      {resolvesResponse.user?.role === 'admin' && resolvesResponse.adminData && (
        <div>
          <h2>Área Administrativa</h2>
          <div>{JSON.stringify(resolvesResponse.adminData)}</div>
        </div>
      )}
    </div>
  );
}
```

## Tratamento de Erros

### 1. Estratégias de Erro

```typescript
function ErrorHandlingExample() {
  const [errorMessage, setErrorMessage] = useState('');

  const { isLoading, isStarted, isErrorOnLoad, resolvesResponse } = useView({
    resolves: {
      criticalData: async () => {
        const response = await fetch('/api/critical');
        if (!response.ok) {
          throw new Error(`Erro crítico: ${response.status}`);
        }
        return response.json();
      },
      optionalData: async () => {
        try {
          const response = await fetch('/api/optional');
          return response.ok ? response.json() : { fallback: true };
        } catch (error) {
          console.warn('Dados opcionais não disponíveis:', error);
          return { fallback: true };
        }
      }
    },
    onErrorStarted: (errors) => {
      if (errors.criticalData) {
        setErrorMessage(`Erro crítico: ${errors.criticalData.message}`);
      }
    }
  });

  if (isLoading) return <div>Carregando...</div>;
  
  if (isErrorOnLoad && !resolvesResponse.criticalData) {
    return (
      <div className="error-state">
        <h2>Oops! Algo deu errado</h2>
        <p>{errorMessage}</p>
        <button onClick={() => window.location.reload()}>
          Tentar Novamente
        </button>
      </div>
    );
  }

  return (
    <div>
      <h1>Dados Carregados</h1>
      <div>Críticos: {JSON.stringify(resolvesResponse.criticalData)}</div>
      <div>Opcionais: {JSON.stringify(resolvesResponse.optionalData)}</div>
    </div>
  );
}
```

### 2. Retry Logic

```typescript
function RetryExample() {
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 3;

  const { isLoading, isErrorOnLoad, reloadPage } = useView({
    resolves: {
      unstableData: async () => {
        const response = await fetch('/api/unstable-endpoint');
        if (!response.ok) {
          throw new Error('Falha na requisição');
        }
        return response.json();
      }
    },
    onErrorStarted: (errors) => {
      if (retryCount < maxRetries) {
        console.log(`Tentativa ${retryCount + 1} de ${maxRetries}`);
        setTimeout(() => {
          setRetryCount(prev => prev + 1);
          reloadPage(false);
        }, 1000 * Math.pow(2, retryCount)); // Backoff exponencial
      }
    }
  });

  if (isLoading) {
    return (
      <div>
        Carregando...
        {retryCount > 0 && <span> (Tentativa {retryCount + 1})</span>}
      </div>
    );
  }

  if (isErrorOnLoad && retryCount >= maxRetries) {
    return (
      <div>
        <p>Falha após {maxRetries} tentativas</p>
        <button onClick={() => {
          setRetryCount(0);
          reloadPage();
        }}>
          Tentar Novamente
        </button>
      </div>
    );
  }

  return <div>Dados carregados com sucesso!</div>;
}
```

## Melhores Práticas

### 1. Organização de Resolvers

```typescript
// ✅ Bom: Separar lógica em funções
const fetchUserData = async (userId: string) => {
  const response = await fetch(`/api/users/${userId}`);
  return response.json();
};

const fetchUserPosts = async (userId: string) => {
  const response = await fetch(`/api/users/${userId}/posts`);
  return response.json();
};

function UserPage({ userId }: { userId: string }) {
  const { isLoading, resolvesResponse } = useView({
    resolves: {
      user: () => fetchUserData(userId),
      posts: () => fetchUserPosts(userId)
    }
  });
  
  // ...
}
```

### 2. Tipagem Forte

```typescript
// ✅ Definir tipos específicos
interface User {
  id: string;
  name: string;
  email: string;
}

interface Post {
  id: string;
  title: string;
  content: string;
}

function TypedComponent() {
  const { resolvesResponse } = useView({
    resolves: {
      user: (): User => ({ id: '1', name: 'João', email: 'joao@email.com' }),
      posts: (): Post[] => [
        { id: '1', title: 'Post 1', content: 'Conteúdo 1' }
      ]
    }
  });

  // TypeScript infere os tipos automaticamente
  const userName = resolvesResponse.user?.name; // string | undefined
  const postCount = resolvesResponse.posts?.length; // number | undefined
  
  return <div>{userName} tem {postCount} posts</div>;
}
```

### 3. Gerenciamento de Estado Global

```typescript
// ✅ Combinar com Context API
const DataContext = createContext<any>(null);

function DataProvider({ children }: { children: React.ReactNode }) {
  const viewState = useView({
    resolves: {
      globalConfig: () => fetch('/api/config').then(r => r.json()),
      userSession: () => fetch('/api/session').then(r => r.json())
    }
  });

  return (
    <DataContext.Provider value={viewState}>
      {children}
    </DataContext.Provider>
  );
}

function ChildComponent() {
  const { resolvesResponse } = useContext(DataContext);
  return <div>Config: {resolvesResponse.globalConfig?.theme}</div>;
}
```

## Troubleshooting

### Problemas Comuns

1. **Hook não carrega dados**
   ```typescript
   // ❌ Problema: firstLoad=false sem chamar reloadPage
   const { resolvesResponse } = useView({
     resolves: { data: () => fetchData() },
     firstLoad: false // Dados nunca carregam
   });
   
   // ✅ Solução: Chamar reloadPage ou usar firstLoad=true
   const { resolvesResponse, reloadPage } = useView({
     resolves: { data: () => fetchData() },
     firstLoad: false
   });
   
   useEffect(() => {
     reloadPage(); // Carregar quando necessário
   }, []);
   ```

2. **Recarregamentos infinitos**
   ```typescript
   // ❌ Problema: Dependência que sempre muda
   function BadComponent() {
     const { reloadPage } = useView({
       resolves: { data: () => fetchData() }
     });
     
     useEffect(() => {
       reloadPage(); // Causa loop infinito
     }, [reloadPage]);
   }
   
   // ✅ Solução: Usar callback ref ou condições
   function GoodComponent() {
     const [shouldReload, setShouldReload] = useState(false);
     
     const { reloadPage } = useView({
       resolves: { data: () => fetchData() }
     });
     
     useEffect(() => {
       if (shouldReload) {
         reloadPage();
         setShouldReload(false);
       }
     }, [shouldReload, reloadPage]);
   }
   ```

3. **Tipos não inferidos corretamente**
   ```typescript
   // ❌ Problema: Resolver com tipo any
   const { resolvesResponse } = useView({
     resolves: {
       data: () => fetchData() // Retorna any
     }
   });
   
   // ✅ Solução: Tipar explicitamente
   const { resolvesResponse } = useView({
     resolves: {
       data: (): Promise<UserData> => fetchData()
     }
   });
   ```

## Considerações de Performance

### 1. Memoização de Resolvers

```typescript
function OptimizedComponent({ userId }: { userId: string }) {
  // ✅ Memoizar resolvers que dependem de props
  const resolvers = useMemo(() => ({
    user: () => fetchUser(userId),
    posts: () => fetchUserPosts(userId)
  }), [userId]);

  const { isLoading, resolvesResponse } = useView({
    resolves: resolvers
  });

  // ...
}
```

### 2. Carregamento Lazy

```typescript
function LazyLoadingExample() {
  const [loadHeavyData, setLoadHeavyData] = useState(false);

  const { resolvesResponse, reloadPage } = useView({
    resolves: {
      lightData: () => fetchLightData(),
      heavyData: loadHeavyData ? () => fetchHeavyData() : undefined
    }
  });

  const handleLoadHeavyData = () => {
    setLoadHeavyData(true);
    // O hook automaticamente detecta a mudança e recarrega
  };

  return (
    <div>
      <div>Dados leves: {JSON.stringify(resolvesResponse.lightData)}</div>
      
      {!loadHeavyData && (
        <button onClick={handleLoadHeavyData}>
          Carregar Dados Pesados
        </button>
      )}
      
      {resolvesResponse.heavyData && (
        <div>Dados pesados: {JSON.stringify(resolvesResponse.heavyData)}</div>
      )}
    </div>
  );
}
```

## Conclusão

O hook `useView` é uma ferramenta poderosa para gerenciar carregamento de dados em aplicações React. Ele oferece:

- **Simplicidade**: API intuitiva e fácil de usar
- **Flexibilidade**: Suporte a diferentes tipos de resolvers
- **Robustez**: Tratamento de erros e estados de carregamento
- **Performance**: Prevenção de recarregamentos desnecessários
- **TypeScript**: Inferência de tipos automática

Use este hook sempre que precisar carregar dados assíncronos com controle de estado robusto e tratamento de erros elegante.