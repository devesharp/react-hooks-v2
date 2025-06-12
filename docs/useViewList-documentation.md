# useViewList – Documentação Completa

> Guia definitivo para carregar, paginar e gerenciar **listas** em React + TypeScript com o hook `useViewList`.

---

## 1. Visão Geral

`useViewList` encapsula toda a complexidade de **busca, paginação, filtros** e **manipulação local** de coleções. Por baixo do capô ele utiliza `useView` para o _first-load_, mas expõe uma API otimizada para:

1. Buscar recursos paginados (limit / offset);
2. Trocar filtros dinamicamente sem _boilerplate_;
3. Avançar / voltar páginas e fazer _retry_ automático;
4. Manipular localmente a lista (add, update, delete, reorder…).

Ideal para tabelas, _infinite scrolls_ ou qualquer listagem paginada que precise de **estado robusto** e **tratamento de erros**.

---

## 2. Tipos e Assinatura

```ts
useViewList<
  IResource extends { id: string | number },
  IFilter = Record<string, unknown>,
  TResolves extends Record<string, IResolve> = Record<string, IResolve>
>(props: IUseViewListProps<IResource, IFilter, TResolves>)
```

### 2.1. `IUseViewListProps`

| Prop | Tipo | Descrição |
|------|------|-----------|
| `resolveResources*` | `IResolve<IResponseResults<IResource>>` | Função/Promise que retorna `{ results, count }`. |
| `limit` | `number` | Tamanho da página (default `20`). |
| `initialOffset` | `number` | Offset inicial (default `0`). |
| `initialSort` | `SortValue` | Ordenação inicial (default `null`). |
| `filtersDefault` | `Partial<IFilter>` | Filtros base aplicados a TODAS as buscas. |
| `initialFilters` | `Partial<IFilter>` | Filtros iniciais adicionais. |
| `treatmentResources` | `(items) ⇒ IResource[]` | Manipula a lista antes de salvar no estado (ex.: _map_, _sort_). |
| `onStarted` / `onErrorStarted` | Callbacks herdados de `useView`. |
| `onErrorSearch` | `(err: Error) ⇒ void` | Invocado em erro durante buscas subsequentes. |
| `resolves` | `TResolves` | Resolvers extras executados junto com `resolveResources`. |
| `firstLoad` | `boolean` | Se faz a busca inicial automática (default `true`). |

> **Obrigatório**: `resolveResources`.

#### Tipos de Ordenação

```ts
type SortDirection = 'asc' | 'desc';

interface ISortConfig {
  column: string | null;
  direction: SortDirection;
}

type SortValue = null | ISortConfig;
```

### 2.2. Retorno do Hook

| Campo | Tipo | Finalidade |
|-------|------|------------|
| `resources` | `IResource[]` | Lista atual. |
| `resourcesTotal` | `number` | Total fornecido por `count`. |
| `filters` | `{ offset:number; sort:SortValue } & Partial<IFilter>` | Filtros vigentes. |
| **Estados de Busca e Paginação** |
| `isSearching` | `boolean` | `true` enquanto busca em progresso. |
| `isErrorOnSearching` | `boolean` | `true` se última busca falhou. |
| `isFirstPage` | `boolean` | `true` se offset === 0. |
| `isLastPage` | `boolean` | `true` se offset+limit >= total. |
| **Estados de Carregamento (herdados de useView)** |
| `isLoading` | `boolean` | `true` durante carregamento inicial. |
| `isStarted` | `boolean` | `true` após primeira execução. |
| `isErrorOnLoad` | `boolean` | `true` se houve erro no carregamento inicial. |
| `isCriticalError` | `boolean` | `true` para erros críticos. |
| **Funções de Controle** |
| `setStatusInfo` | `function` | Atualiza estados manualmente (herdado de useView). |
| `resolvesResponse` | `object` | Respostas dos resolvers (herdado de useView). |
| **Busca & Navegação** |
| `setFilters(filters, opts?)` | Busca com filtros novos. `opts.force` ignora comparação. |
| `nextPage()` / `previousPage()` | Paginação forward/backward. |
| `setPage(pageNumber)` | Navega para página específica (começando em 0). |
| `setSort(sort)` | Atualiza ordenação mantendo offset atual. Aceita `SortValue`. |
| `retry()` | Reexecuta a última busca que falhou. |
| `reloadPage()` | _Hard refresh_ via `useView`. |
| **Manipulação Local** |
| `pushResource(item, push?)` | Adiciona no fim (`push=true`) ou início. |
| `updateResource(id, item)` | Substitui item inteiro. |
| `putResource(id, partial)` | Merge parcial. |
| `deleteResource(id)` | Remove 1 item. |
| `deleteManyResources(ids[])` | Remove vários. |
| `changePosition(id, idx)` | Move item para posição. |
| `putManyResource(partial, ids?)` | Merge em vários (ou todos). |

> **Nota**: As propriedades de estado (`isSearching`, `isErrorOnSearching`, etc.) são retornadas diretamente no objeto principal, não como objetos aninhados.

---

## 3. Exemplos Práticos

### 3.1. Lista Básica com Filtros

```tsx
interface Product { id:number; name:string; price:number; }
interface ProductFilter { search?:string; min?:number; max?:number; }

export default function ProductList() {
  const {
    resources, resourcesTotal, filters,
    isSearching, isErrorOnSearching, isFirstPage, isLastPage,
    setFilters, nextPage, previousPage, setPage, setSort
  } = useViewList<Product, ProductFilter>({
    resolveResources: ({ offset, sort, ...filtros }) =>
      api.get('/products', { params: { offset, limit: 20, sort, ...filtros } })
         .then(res => res.data),
    filtersDefault: { min: 0 },
    initialSort: { column: 'name', direction: 'asc' },
  });

  return (
    <div>
      <input
        placeholder="Buscar…"
        onChange={e => setFilters({ search: e.target.value })}
      />

      {/* Controles de ordenação */}
      <select 
        value={filters.sort ? `${filters.sort.column}_${filters.sort.direction}` : ''} 
        onChange={e => {
          if (!e.target.value) {
            setSort(null);
          } else {
            const [column, direction] = e.target.value.split('_');
            setSort({ column, direction: direction as 'asc' | 'desc' });
          }
        }}
      >
        <option value="">Sem ordenação</option>
        <option value="name_asc">Nome A-Z</option>
        <option value="name_desc">Nome Z-A</option>
        <option value="price_asc">Preço Menor</option>
        <option value="price_desc">Preço Maior</option>
      </select>

      {isSearching && <p>Carregando…</p>}
      {isErrorOnSearching && <p>Erro na busca 😢</p>}

      <ul>
        {resources.map(p => (
          <li key={p.id}>{p.name} – R$ {p.price}</li>
        ))}
      </ul>

      <div>
        <button onClick={previousPage} disabled={isFirstPage}>Anterior</button>
        <button onClick={() => setPage(0)}>Página 1</button>
        <button onClick={() => setPage(1)}>Página 2</button>
        <button onClick={() => setPage(2)}>Página 3</button>
        <button onClick={nextPage} disabled={isLastPage}>Próxima</button>
      </div>

      <p>{resources.length} / {resourcesTotal}</p>
    </div>
  );
}
```

### 3.2. _Infinite Scroll_

```tsx
function InfiniteUsers() {
  const {
    resources, isSearching, isLastPage,
    nextPage
  } = useViewList<User>({
    limit: 50,
    resolveResources: ({ offset }) =>
      api.get('/users', { params: { offset, limit: 50 } }).then(r => r.data),
  });

  useEffect(() => {
    const onScroll = () => {
      if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 100 && !isSearching && !isLastPage) {
        nextPage();
      }
    };
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, [isSearching, isLastPage, nextPage]);

  return (
    <div>
      {resources.map(u => <UserCard key={u.id} user={u} />)}
      {isSearching && <Loader />}
    </div>
  );
}
```

### 3.3. Navegação por Páginas Específicas

```tsx
function PaginatedTable() {
  const {
    resources, resourcesTotal,
    isSearching, isFirstPage, isLastPage,
    nextPage, previousPage, setPage, filters
  } = useViewList<Item>({
    limit: 10,
    resolveResources: ({ offset }) =>
      api.get('/items', { params: { offset, limit: 10 } }).then(r => r.data),
  });

  // Calcula informações de paginação
  const currentPage = Math.floor(filters.offset / 10);
  const totalPages = Math.ceil(resourcesTotal / 10);

  return (
    <div>
      <table>
        {/* Renderiza tabela */}
      </table>

      <div className="pagination">
        <button onClick={previousPage} disabled={isFirstPage}>
          ← Anterior
        </button>

        {/* Páginas numeradas */}
        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
          const pageNum = currentPage < 3 ? i : currentPage - 2 + i;
          if (pageNum >= totalPages) return null;
          
          return (
            <button
              key={pageNum}
              onClick={() => setPage(pageNum)}
              className={pageNum === currentPage ? 'active' : ''}
            >
              {pageNum + 1}
            </button>
          );
        })}

        <button onClick={nextPage} disabled={isLastPage}>
          Próxima →
        </button>
      </div>

      <p>
        Página {currentPage + 1} de {totalPages} 
        ({resources.length} de {resourcesTotal} itens)
      </p>
    </div>
  );
}
```

### 3.4. Manipulação Local Instantânea

```tsx
// Após criar item no servidor, já insere na lista sem refazer busca
onSuccess: (novo) => pushResource(novo, false);

// Otimistic update
putResource(id, { name: 'Renomeando…' });
api.put(`/items/${id}`, { name });

// Mudança de ordenação sem perder a página atual
setSort({ column: 'created_at', direction: 'desc' });

// Remover ordenação
setSort(null);
```

---

## 4. Navegação e Ordenação

### 4.1. Navegação por Páginas com `setPage()`

A função `setPage()` permite navegar diretamente para uma página específica, calculando automaticamente o offset correto.

#### Como Funciona

```tsx
// Página começa em 0
setPage(0); // Primeira página (offset = 0)
setPage(1); // Segunda página (offset = limit * 1)
setPage(2); // Terceira página (offset = limit * 2)
```

#### Características

- **Páginas começam em 0**: A primeira página é `setPage(0)`
- **Cálculo automático**: `offset = página × limit`
- **Proteção contra valores negativos**: `setPage(-1)` vira `setPage(0)`
- **Usa a mesma lógica de erro**: Se falhar, permite `retry()`

### 4.2. Ordenação com `setSort()`

A função `setSort()` permite alterar a ordenação dos resultados mantendo a página atual.

#### Como Funciona

```tsx
// Definir ordenação
setSort({ column: 'name', direction: 'asc' });     // Ordena por nome A-Z
setSort({ column: 'name', direction: 'desc' });    // Ordena por nome Z-A
setSort({ column: 'created_at', direction: 'desc' }); // Ordena por data

// Remover ordenação
setSort(null);
```

#### Características

- **Mantém offset**: Não reseta para primeira página
- **Busca automática**: Executa nova busca com nova ordenação
- **Tratamento de erro**: Se falhar, permite `retry()`
- **Tipagem forte**: Aceita `SortValue` (null ou objeto com column/direction)
- **Flexível**: `column` pode ser `null` para casos especiais

#### Estrutura do Sort

```ts
type SortDirection = 'asc' | 'desc';

interface ISortConfig {
  column: string | null;  // Nome da coluna ou null
  direction: SortDirection; // 'asc' ou 'desc'
}

type SortValue = null | ISortConfig;
```

### 4.3. Exemplo Prático com Paginação e Ordenação

```tsx
function SortableTable() {
  const { 
    resources, resourcesTotal, filters,
    isSearching, isFirstPage, isLastPage,
    setPage, setSort, nextPage, previousPage 
  } = useViewList({
    limit: 10,
    initialSort: { column: 'name', direction: 'asc' },
    resolveResources: ({ offset, sort }) =>
      api.get('/items', { params: { offset, limit: 10, sort } }).then(r => r.data),
  });

  const currentPage = Math.floor(filters.offset / 10);
  const totalPages = Math.ceil(resourcesTotal / 10);

  const handleSort = (column: string) => {
    const currentSort = filters.sort;
    
    if (currentSort?.column === column) {
      // Se já está ordenando por esta coluna, inverte a direção
      const newDirection = currentSort.direction === 'asc' ? 'desc' : 'asc';
      setSort({ column, direction: newDirection });
    } else {
      // Nova coluna, começa com 'asc'
      setSort({ column, direction: 'asc' });
    }
  };

  return (
    <div>
      {/* Controles de ordenação */}
      <div className="sort-controls">
        <label>Ordenar por:</label>
        <select 
          value={filters.sort ? `${filters.sort.column}_${filters.sort.direction}` : ''} 
          onChange={e => {
            if (!e.target.value) {
              setSort(null);
            } else {
              const [column, direction] = e.target.value.split('_');
              setSort({ column, direction: direction as 'asc' | 'desc' });
            }
          }}
        >
          <option value="">Sem ordenação</option>
          <option value="name_asc">Nome ↑</option>
          <option value="name_desc">Nome ↓</option>
          <option value="created_at_asc">Data ↑</option>
          <option value="created_at_desc">Data ↓</option>
        </select>
      </div>

      {/* Tabela */}
      <table>
        <thead>
          <tr>
            <th>
              <button onClick={() => handleSort('name')}>
                Nome 
                {filters.sort?.column === 'name' && (
                  filters.sort.direction === 'asc' ? ' ↑' : ' ↓'
                )}
              </button>
            </th>
            <th>
              <button onClick={() => handleSort('created_at')}>
                Data
                {filters.sort?.column === 'created_at' && (
                  filters.sort.direction === 'asc' ? ' ↑' : ' ↓'
                )}
              </button>
            </th>
          </tr>
        </thead>
        <tbody>
          {resources.map(item => (
            <tr key={item.id}>
              <td>{item.name}</td>
              <td>{item.createdAt}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Paginação */}
      <div className="pagination">
        <button onClick={previousPage} disabled={isFirstPage}>
          ← Anterior
        </button>

        <span>Página {currentPage + 1} de {totalPages}</span>

        <button onClick={nextPage} disabled={isLastPage}>
          Próxima →
        </button>
      </div>

      {isSearching && <div>Carregando...</div>}
    </div>
  );
}
```

### 4.4. Integração com URLs

```tsx
// Sincronizar página e ordenação com URL
const [searchParams, setSearchParams] = useSearchParams();
const pageFromUrl = parseInt(searchParams.get('page') || '0');
const sortColumn = searchParams.get('sortColumn');
const sortDirection = searchParams.get('sortDirection') as 'asc' | 'desc' | null;

const initialSort: SortValue = sortColumn && sortDirection 
  ? { column: sortColumn, direction: sortDirection }
  : null;

const { setPage, setSort, filters } = useViewList({
  initialOffset: pageFromUrl * 20,
  initialSort,
  // ...
});

// Atualizar URL quando página ou ordenação muda
const handlePageChange = (page: number) => {
  setPage(page);
  const params = new URLSearchParams();
  params.set('page', page.toString());
  
  if (filters.sort) {
    params.set('sortColumn', filters.sort.column || '');
    params.set('sortDirection', filters.sort.direction);
  }
  
  setSearchParams(params);
};

const handleSortChange = (sort: SortValue) => {
  setSort(sort);
  const params = new URLSearchParams();
  params.set('page', currentPage.toString());
  
  if (sort) {
    params.set('sortColumn', sort.column || '');
    params.set('sortDirection', sort.direction);
  }
  
  setSearchParams(params);
};
```

---

## 5. Tratamento de Erros & Retry

```tsx
const { isErrorOnSearching, retry } = useViewList({
  resolveResources: async () => {
    const res = await api.get('/endpoint');
    if(!res.ok) throw new Error('Falha');
    return res.data;
  },
  onErrorSearch: err => toast.error(err.message)
});

{isErrorOnSearching && <button onClick={retry}>Tentar novamente</button>}
```

---

## 6. Melhores Práticas

1. **Memoize filtros** ao passá-los manualmente (useMemo/useCallback) para evitar renders extras.
2. Use `treatmentResources` para normalizar/ordenar dados antes de salvar – evita _map_ em cada render.
3. Nunca manipule `filters.offset` diretamente; use `nextPage`, `previousPage`, `setPage` ou `setFilters`.
4. Para paginação numérica, calcule a página atual com `Math.floor(filters.offset / limit)`.
5. Combine com `useViewForm` para editar itens e refletir mudanças usando `updateResource` ou `putResource`.

---

## 7. Troubleshooting

| Sintoma | Possível Causa | Ação Recomendada |
|---------|---------------|------------------|
| `isFirstPage`/`isLastPage` incorretos | `resolveResources` não devolve `count` coerente | Garanta o total correto no backend. |
| Offsets bagunçados após erro | Não usar `retry()` | Sempre use `retry()` – ele restaura offset anterior. |
| Lista vazia após delete | `resourcesTotal` não atualizado | Certifique-se de usar `deleteResource`/`deleteManyResources`. |
| `setPage()` não funciona como esperado | Página negativa ou cálculo incorreto | Lembre-se: páginas começam em 0, offset = página × limit. |
| Propriedades de estado não encontradas | Tentativa de acessar `statusInfo.isLoading` | Use diretamente `isLoading`, `isSearching`, etc. (propriedades achatadas). |
| Ordenação não funciona | Backend não processa parâmetro `sort` | Verifique se o backend está lendo e aplicando o parâmetro `sort` corretamente. |
| `setSort()` reseta página | Comportamento esperado diferente | `setSort()` mantém offset atual; use `setFilters()` para resetar página. |
| Erro de tipo com `setSort` | Passando string ao invés de objeto | Use `{ column: 'nome', direction: 'asc' }` ou `null`. |
| Sort não aparece nos filtros | Inicialização incorreta | Verifique se `initialSort` está no formato correto. |

---

## 8. Conclusão

`useViewList` simplifica listagens paginadas, oferecendo:

- **Estado completo** de busca/paginação;
- **API declarativa** para filtros;
- **Navegação flexível** com `nextPage`, `previousPage` e `setPage`;
- **Funções de manipulação local** prontas para _optimistic UI_;
- Integração direta com `useView` e outros hooks da lib.

> Utilize-o para elevar a experiência de listas na sua aplicação React! 🚀 