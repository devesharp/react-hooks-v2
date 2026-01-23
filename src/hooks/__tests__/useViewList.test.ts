import { renderHook, act } from '@testing-library/react';
import { useViewList } from '../useViewList';
import { IResponseResults, SortValue } from '../useViewList.interfaces';

// Mock para use-immer - versão simplificada que funciona
vi.mock('use-immer', async () => {
  const actual = await vi.importActual('react');
  return {
    useImmer: <T>(initialState: T) => {
      return (actual as typeof import('react')).useState(initialState);
    },
    useImmerReducer: <T, A>(reducer: (state: T, action: A) => T, initialState: T) => {
      const [state, setState] = (actual as typeof import('react')).useState(initialState);
      const dispatch = (action: A) => {
        setState((prev: T) => reducer(prev, action));
      };
      return [state, dispatch];
    },
  };
});

// Mock para useView
vi.mock('../useView', () => ({
  useView: vi.fn((props: any) => {
    // Simula o comportamento do useView
    const mockOnStarted = props.onStarted;
    const mockOnErrorStarted = props.onErrorStarted;
    
    // Simula chamada dos callbacks quando apropriado
    if (mockOnStarted && props.resolves?.resources) {
      setTimeout(() => {
        try {
          const result = props.resolves.resources();
          if (result instanceof Promise) {
            result.then(mockOnStarted).catch((err: Error) => {
              if (mockOnErrorStarted) {
                mockOnErrorStarted({ resources: err });
              }
            });
          } else {
            mockOnStarted(result);
          }
        } catch (err) {
          if (mockOnErrorStarted) {
            mockOnErrorStarted({ resources: err });
          }
        }
      }, 10);
    }

    return {
      statusInfo: {
        isLoading: false,
        isStarted: true,
        isErrorOnLoad: false,
        isCriticalError: false,
      },
      setStatusInfo: vi.fn(),
      reloadPage: vi.fn().mockResolvedValue({}),
      resolvesResponse: {},
    };
  }),
}));

interface TestResource {
  id: number;
  name: string;
  email: string;
  status: 'active' | 'inactive';
}

interface TestFilter {
  search?: string;
  status?: 'active' | 'inactive';
  category?: string;
}

describe('useViewList', () => {
  const mockResources: TestResource[] = [
    { id: 1, name: 'User 1', email: 'user1@test.com', status: 'active' },
    { id: 2, name: 'User 2', email: 'user2@test.com', status: 'inactive' },
    { id: 3, name: 'User 3', email: 'user3@test.com', status: 'active' },
  ];

  const createMockResolveResources = (
    resources: TestResource[] = mockResources,
    total: number = resources.length
  ) => {
    return vi.fn(
      (...args: unknown[]): Promise<IResponseResults<TestResource>> => {
        const filters = args[0] as { offset: number } & Partial<TestFilter>;
        const { offset = 0 } = filters || {};
        const limit = 20; // valor padrão
        const start = offset;
        const end = start + limit;
        const results = resources.slice(start, end);
        
        return Promise.resolve({
          results,
          count: total,
        });
      }
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Inicialização básica', () => {
    it('deve inicializar com valores padrão', () => {
      const resolveResources = createMockResolveResources();

      const { result } = renderHook(() =>
        useViewList<TestResource, TestFilter>({
          resolveResources,
        })
      );

      expect(result.current.resources).toEqual([]);
      expect(result.current.resourcesTotal).toBe(0);
      expect(result.current.filters).toEqual({ offset: 0, sort: null });
      expect(result.current.isSearching).toBe(true);
      expect(result.current.isErrorOnSearching).toBe(false);
      expect(result.current.isFirstPage).toBe(false);
      expect(result.current.isLastPage).toBe(false);
    });

    it('deve inicializar com parâmetros customizados', () => {
      const resolveResources = createMockResolveResources();
      const initialFilters = { search: 'test', status: 'active' as const };
      const filtersDefault = { category: 'users' };
      const initialSort: SortValue = { column: 'name', direction: 'asc' };

      const { result } = renderHook(() =>
        useViewList<TestResource, TestFilter>({
          resolveResources,
          limit: 10,
          initialOffset: 5,
          initialSort,
          initialFilters,
          filtersDefault,
          firstLoad: false,
        })
      );

      expect(result.current.filters).toEqual({
        offset: 5,
        sort: { column: 'name', direction: 'asc' },
        category: 'users',
        search: 'test',
        status: 'active',
      });
    });

    it('deve ter função treatmentResources disponível', () => {
      const resolveResources = createMockResolveResources();
      const treatmentResources = vi.fn((resources: TestResource[]) =>
        resources.map(r => ({ ...r, name: r.name.toUpperCase() }))
      );

      const { result } = renderHook(() =>
        useViewList<TestResource, TestFilter>({
          resolveResources,
          treatmentResources,
        })
      );

      // Verifica que o hook foi inicializado corretamente
      expect(result.current).toBeDefined();
      expect(typeof result.current.resources).toBe('object');
    });
  });

  describe('Callbacks', () => {
    it('deve chamar onStarted quando busca é bem-sucedida', async () => {
      const resolveResources = createMockResolveResources();
      const onStarted = vi.fn();

      renderHook(() =>
        useViewList<TestResource, TestFilter>({
          resolveResources,
          onStarted,
        })
      );

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      expect(onStarted).toHaveBeenCalled();
    });

    it('deve chamar onErrorStarted quando há erro na inicialização', async () => {
      const resolveResources = vi.fn().mockRejectedValue(new Error('Network error'));
      const onErrorStarted = vi.fn();

      renderHook(() =>
        useViewList<TestResource, TestFilter>({
          resolveResources,
          onErrorStarted,
        })
      );

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      expect(onErrorStarted).toHaveBeenCalled();
    });

    it('deve chamar onErrorSearch quando há erro na busca', async () => {
      const resolveResources = createMockResolveResources();
      const onErrorSearch = vi.fn();

      const { result } = renderHook(() =>
        useViewList<TestResource, TestFilter>({
          resolveResources,
          onErrorSearch,
          firstLoad: false,
        })
      );

      // Simula erro na busca
      resolveResources.mockRejectedValueOnce(new Error('Search error'));

      await act(async () => {
        await result.current.setFilters({ search: 'test' });
      });

      expect(onErrorSearch).toHaveBeenCalledWith(expect.any(Error));
    });

    it('deve chamar onBeforeSearch antes de iniciar busca', async () => {
      const resolveResources = createMockResolveResources();
      const onBeforeSearch = vi.fn();

      const { result } = renderHook(() =>
        useViewList<TestResource, TestFilter>({
          resolveResources,
          onBeforeSearch,
          firstLoad: false,
        })
      );

      await act(async () => {
        await result.current.setFilters({ search: 'test' });
      });

      expect(onBeforeSearch).toHaveBeenCalledWith({
        offset: 0,
        sort: null,
        search: 'test',
      });
    });

    it('deve chamar onAfterSearch após busca bem-sucedida', async () => {
      const resolveResources = createMockResolveResources();
      const onAfterSearch = vi.fn();

      const { result } = renderHook(() =>
        useViewList<TestResource, TestFilter>({
          resolveResources,
          onAfterSearch,
          firstLoad: false,
        })
      );

      await act(async () => {
        await result.current.setFilters({ search: 'test' });
      });

      expect(onAfterSearch).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          results: expect.any(Array),
          count: expect.any(Number),
        }),
        filters: {
          offset: 0,
          sort: null,
          search: 'test',
        },
      });
    });

    it('deve chamar onAfterSearch após erro na busca', async () => {
      const resolveResources = createMockResolveResources();
      const onAfterSearch = vi.fn();

      const { result } = renderHook(() =>
        useViewList<TestResource, TestFilter>({
          resolveResources,
          onAfterSearch,
          firstLoad: false,
        })
      );

      // Simula erro na busca
      resolveResources.mockRejectedValueOnce(new Error('Search error'));

      await act(async () => {
        await result.current.setFilters({ search: 'test' });
      });

      expect(onAfterSearch).toHaveBeenCalledWith({
        success: false,
        error: expect.any(Error),
        filters: {
          offset: 0,
          sort: null,
          search: 'test',
        },
      });
    });

    it('deve chamar onChangeFilters quando filtros são alterados', async () => {
      const resolveResources = createMockResolveResources();
      const onChangeFilters = vi.fn();

      const { result } = renderHook(() =>
        useViewList<TestResource, TestFilter>({
          resolveResources,
          onChangeFilters,
          firstLoad: false,
        })
      );

      const previousFilters = result.current.filters;

      await act(async () => {
        await result.current.setFilters({ search: 'test' });
      });

      expect(onChangeFilters).toHaveBeenCalledWith(
        {
          offset: 0,
          sort: null,
          search: 'test',
        },
        previousFilters
      );
    });

    it('deve chamar callbacks na ordem correta durante busca', async () => {
      const resolveResources = createMockResolveResources();
      const callOrder: string[] = [];
      
      const onBeforeSearch = vi.fn(() => callOrder.push('before'));
      const onChangeFilters = vi.fn(() => callOrder.push('change'));
      const onAfterSearch = vi.fn(() => callOrder.push('after'));

      const { result } = renderHook(() =>
        useViewList<TestResource, TestFilter>({
          resolveResources,
          onBeforeSearch,
          onChangeFilters,
          onAfterSearch,
          firstLoad: false,
        })
      );

      await act(async () => {
        await result.current.setFilters({ search: 'test' });
      });

      expect(callOrder).toEqual(['before', 'change', 'after']);
    });
  });

  describe('Filtros', () => {
    it('deve atualizar filtros e fazer nova busca', async () => {
      const resolveResources = createMockResolveResources();

      const { result } = renderHook(() =>
        useViewList<TestResource, TestFilter>({
          resolveResources,
          firstLoad: false,
        })
      );

      await act(async () => {
        await result.current.setFilters({ search: 'test', status: 'active' });
      });

      expect(result.current.filters).toEqual(
        expect.objectContaining({
          search: 'test',
          status: 'active',
        })
      );
      expect(resolveResources).toHaveBeenCalledWith({
        offset: 0,
        sort: null,
        search: 'test',
        status: 'active',
      });
    });

    it('deve aplicar handleFilters antes de usar os filtros', async () => {
      const resolveResources = createMockResolveResources();
      const handleFilters = vi.fn((filters) => ({
        ...filters,
        newValue: true,
      }));

      const { result } = renderHook(() =>
        useViewList<TestResource, TestFilter>({
          resolveResources,
          handleFilters,
          firstLoad: false,
        })
      );

      await act(async () => {
        await result.current.setFilters({ search: 'test' });
      });

      expect(handleFilters).toHaveBeenCalled();
      expect(resolveResources).toHaveBeenCalledWith(
        expect.objectContaining({
          offset: 0,
          sort: null,
          search: 'test',
          newValue: true,
        })
      );
    });

    it('deve aplicar handleFilters em todas as operações de filtro', async () => {
      const resolveResources = createMockResolveResources();
      const handleFilters = vi.fn((filters) => ({
        ...filters,
        processed: true,
      }));

      const { result } = renderHook(() =>
        useViewList<TestResource, TestFilter>({
          resolveResources,
          handleFilters,
          firstLoad: false,
        })
      );

      // Testa setFilters
      await act(async () => {
        await result.current.setFilters({ search: 'test' });
      });
      expect(handleFilters).toHaveBeenCalled();

      // Testa setSort
      handleFilters.mockClear();
      await act(async () => {
        result.current.setSort({ column: 'name', direction: 'asc' });
      });
      expect(handleFilters).toHaveBeenCalled();

      // Testa nextPage
      handleFilters.mockClear();
      await act(async () => {
        result.current.nextPage();
      });
      expect(handleFilters).toHaveBeenCalled();

      // Testa previousPage
      handleFilters.mockClear();
      act(() => {
        result.current.filters.offset = 20;
      });
      await act(async () => {
        result.current.previousPage();
      });
      expect(handleFilters).toHaveBeenCalled();

      // Testa setPage
      handleFilters.mockClear();
      await act(async () => {
        result.current.setPage(2);
      });
      expect(handleFilters).toHaveBeenCalled();
    });

    it('não deve fazer busca se filtros não mudaram', async () => {
      const resolveResources = createMockResolveResources();

      const { result } = renderHook(() =>
        useViewList<TestResource, TestFilter>({
          resolveResources,
          firstLoad: false,
        })
      );

      const initialCallCount = resolveResources.mock.calls.length;

      await act(async () => {
        await result.current.setFilters({});
      });

      expect(resolveResources.mock.calls.length).toBe(initialCallCount);
    });

    it('deve forçar busca quando force=true', async () => {
      const resolveResources = createMockResolveResources();

      const { result } = renderHook(() =>
        useViewList<TestResource, TestFilter>({
          resolveResources,
          firstLoad: false,
        })
      );

      const initialCallCount = resolveResources.mock.calls.length;

      await act(async () => {
        await result.current.setFilters({}, { force: true });
      });

      expect(resolveResources.mock.calls.length).toBe(initialCallCount + 1);
    });
  });

  describe('Ordenação', () => {
    it('deve ter função setSort disponível', () => {
      const resolveResources = createMockResolveResources();

      const { result } = renderHook(() =>
        useViewList<TestResource, TestFilter>({
          resolveResources,
          firstLoad: false,
        })
      );

      expect(typeof result.current.setSort).toBe('function');
    });

    it('deve atualizar ordenação e fazer nova busca', async () => {
      const resolveResources = createMockResolveResources();

      const { result } = renderHook(() =>
        useViewList<TestResource, TestFilter>({
          resolveResources,
          firstLoad: false,
        })
      );

      // Define um offset inicial para verificar que é mantido
      act(() => {
        result.current.filters.offset = 20;
      });

      const newSort: SortValue = { column: 'name', direction: 'desc' };

      await act(async () => {
        result.current.setSort(newSort);
      });

      expect(result.current.filters.sort).toEqual({ column: 'name', direction: 'desc' });
      expect(resolveResources).toHaveBeenCalledWith(
        expect.objectContaining({
          sort: { column: 'name', direction: 'desc' },
          offset: 20, // Deve manter o offset atual
        })
      );
    });

    it('deve inicializar com sort customizado', () => {
      const resolveResources = createMockResolveResources();
      const initialSort: SortValue = { column: 'created_at', direction: 'desc' };

      const { result } = renderHook(() =>
        useViewList<TestResource, TestFilter>({
          resolveResources,
          initialSort,
          firstLoad: false,
        })
      );

      expect(result.current.filters.sort).toEqual({ column: 'created_at', direction: 'desc' });
    });

    it('deve permitir remover ordenação com null', async () => {
      const resolveResources = createMockResolveResources();
      const initialSort: SortValue = { column: 'name', direction: 'asc' };

      const { result } = renderHook(() =>
        useViewList<TestResource, TestFilter>({
          resolveResources,
          initialSort,
          firstLoad: false,
        })
      );

      // Verifica que começou com ordenação
      expect(result.current.filters.sort).toEqual({ column: 'name', direction: 'asc' });

      // Remove ordenação
      await act(async () => {
        result.current.setSort(null);
      });

      expect(result.current.filters.sort).toBe(null);
      expect(resolveResources).toHaveBeenCalledWith(
        expect.objectContaining({
          sort: null,
        })
      );
    });

    it('deve executar setSort sem erro', () => {
      const resolveResources = createMockResolveResources();

      const { result } = renderHook(() =>
        useViewList<TestResource, TestFilter>({
          resolveResources,
          firstLoad: false,
        })
      );

      expect(() => {
        result.current.setSort({ column: 'name', direction: 'asc' });
      }).not.toThrow();

      expect(() => {
        result.current.setSort(null);
      }).not.toThrow();
    });
  });

  describe('Paginação', () => {
    it('deve avançar para próxima página', async () => {
      const resolveResources = createMockResolveResources();

      const { result } = renderHook(() =>
        useViewList<TestResource, TestFilter>({
          resolveResources,
          limit: 2,
          firstLoad: false,
        })
      );

      // Simula que já temos recursos carregados
      act(() => {
        result.current.filters.offset = 2; // Simula offset atual
      });

      await act(async () => {
        result.current.nextPage();
      });

      expect(resolveResources).toHaveBeenCalledWith(
        expect.objectContaining({ offset: 2 })
      );
    });

    it('deve voltar para página anterior', async () => {
      const resolveResources = createMockResolveResources();

      const { result } = renderHook(() =>
        useViewList<TestResource, TestFilter>({
          resolveResources,
          limit: 2,
          firstLoad: false,
        })
      );

      // Simula que estamos na segunda página
      act(() => {
        result.current.filters.offset = 4;
      });

      await act(async () => {
        result.current.previousPage();
      });

      expect(resolveResources).toHaveBeenCalledWith(
        expect.objectContaining({ offset: 2 })
      );
    });

    it('não deve permitir offset negativo na página anterior', async () => {
      const resolveResources = createMockResolveResources();

      const { result } = renderHook(() =>
        useViewList<TestResource, TestFilter>({
          resolveResources,
          limit: 10,
          firstLoad: false,
        })
      );

      // Simula que estamos na primeira página
      act(() => {
        result.current.filters.offset = 5;
      });

      await act(async () => {
        result.current.previousPage();
      });

      expect(resolveResources).toHaveBeenCalledWith(
        expect.objectContaining({ offset: 0 })
      );
    });

    it('deve navegar para página específica usando setPage', async () => {
      const resolveResources = createMockResolveResources();

      const { result } = renderHook(() =>
        useViewList<TestResource, TestFilter>({
          resolveResources,
          limit: 10,
          firstLoad: false,
        })
      );

      // Navega para a página 2 (offset = 2 * 10 = 20)
      await act(async () => {
        result.current.setPage(2);
      });

      expect(resolveResources).toHaveBeenCalledWith(
        expect.objectContaining({ offset: 20 })
      );
    });

    it('deve navegar para página 0 usando setPage', async () => {
      const resolveResources = createMockResolveResources();

      const { result } = renderHook(() =>
        useViewList<TestResource, TestFilter>({
          resolveResources,
          limit: 5,
          firstLoad: false,
        })
      );

      // Navega para a página 0 (offset = 0 * 5 = 0)
      await act(async () => {
        result.current.setPage(0);
      });

      expect(resolveResources).toHaveBeenCalledWith(
        expect.objectContaining({ offset: 0 })
      );
    });

    it('não deve permitir página negativa no setPage', async () => {
      const resolveResources = createMockResolveResources();

      const { result } = renderHook(() =>
        useViewList<TestResource, TestFilter>({
          resolveResources,
          limit: 10,
          firstLoad: false,
        })
      );

      // Tenta navegar para página negativa
      await act(async () => {
        result.current.setPage(-1);
      });

      // Deve usar página 0 (offset = 0)
      expect(resolveResources).toHaveBeenCalledWith(
        expect.objectContaining({ offset: 0 })
      );
    });

    it('deve calcular offset corretamente para diferentes páginas e limites', async () => {
      const resolveResources = createMockResolveResources();

      const { result } = renderHook(() =>
        useViewList<TestResource, TestFilter>({
          resolveResources,
          limit: 15,
          firstLoad: false,
        })
      );

      // Página 3 com limite 15 = offset 45
      await act(async () => {
        result.current.setPage(3);
      });

      expect(resolveResources).toHaveBeenCalledWith(
        expect.objectContaining({ offset: 45 })
      );
    });

    it('deve ter função retry disponível', () => {
      const resolveResources = createMockResolveResources();

      const { result } = renderHook(() =>
        useViewList<TestResource, TestFilter>({
          resolveResources,
          firstLoad: false,
        })
      );

      expect(typeof result.current.retry).toBe('function');
      
      // Testa que a função pode ser chamada sem erro
      expect(() => {
        result.current.retry();
      }).not.toThrow();
    });
  });

  describe('Lazy loading (infinite scroll)', () => {
    it('deve fazer append sem duplicar quando lazyLoading=true', async () => {
      const resolveResources = vi.fn();

      const { result } = renderHook(() =>
        useViewList<TestResource, TestFilter>({
          resolveResources,
          limit: 2,
          firstLoad: false,
          lazyLoading: true,
        })
      );

      // Recursos iniciais
      act(() => {
        result.current.pushResource({ id: 1, name: 'User 1', email: 'u1@test.com', status: 'active' });
        result.current.pushResource({ id: 2, name: 'User 2', email: 'u2@test.com', status: 'inactive' });
      });
      // offset agora deve ser 2
      expect(result.current.filters.offset).toBe(2);

      // Próxima página deverá usar offset 4 (2 + limit 2) e retornar item duplicado (id 2) e novo (id 3)
      resolveResources.mockImplementationOnce((filters: { offset: number }) => {
        expect(filters.offset).toBe(4);
        return Promise.resolve<IResponseResults<TestResource>>({
          results: [
            { id: 2, name: 'User 2', email: 'u2@test.com', status: 'inactive' }, // duplicado
            { id: 3, name: 'User 3', email: 'u3@test.com', status: 'active' },   // novo
          ],
          count: 100,
        });
      });

      await act(async () => {
        result.current.nextPage();
        await new Promise((r) => setTimeout(r, 30));
      });

      expect(result.current.resources.map((r) => r.id)).toEqual([1, 2, 3]);
      expect(result.current.isErrorOnSearchingInfinitScroll).toBe(false);
    });

    it('deve marcar erro específico de infinite scroll quando falhar', async () => {
      const resolveResources = vi.fn().mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() =>
        useViewList<TestResource, TestFilter>({
          resolveResources,
          limit: 5,
          firstLoad: false,
          lazyLoading: true,
        })
      );

      // Simula estado com alguns itens e offset atual
      act(() => {
        result.current.pushResource({ id: 1, name: 'User 1', email: 'u1@test.com', status: 'active' });
        result.current.pushResource({ id: 2, name: 'User 2', email: 'u2@test.com', status: 'inactive' });
      });
      const initialOffset = result.current.filters.offset; // 2

      await act(async () => {
        result.current.nextPage();
        await new Promise((r) => setTimeout(r, 30));
      });

      // No lazy, marca flag específica e mantém offset já avançado pelo nextPage (2 + limit 5 = 7)
      expect(result.current.isErrorOnSearchingInfinitScroll).toBe(true);
      expect(result.current.filters.offset).toBe(initialOffset + 5);
    });
  });

  describe('loadNewsResource', () => {
    function makeResource(id: number): TestResource {
      return { id, name: `User ${id}`, email: `u${id}@test.com`, status: id % 2 ? 'active' : 'inactive' };
    }

    it('deve carregar itens novos do offset 0 e ajustar offset pelo número de novos', async () => {
      const resolveResources = vi.fn().mockImplementation((filters: { offset: number }) => {
        expect(filters.offset).toBe(0);
        const all = Array.from({ length: 20 }, (_, i) => makeResource(i + 1));
        return Promise.resolve<IResponseResults<TestResource>>({
          results: all,
          count: 20,
        });
      });

      const { result } = renderHook(() =>
        useViewList<TestResource, TestFilter>({
          resolveResources,
          limit: 10,
          firstLoad: false,
        })
      );

      // Preenche com 10 itens existentes (ids 1..10). Offset deve ir para 10.
      act(() => {
        for (let i = 1; i <= 10; i++) {
          result.current.pushResource(makeResource(i));
        }
      });
      expect(result.current.filters.offset).toBe(10);
      const initialLen = result.current.resources.length;
      expect(initialLen).toBe(10);

      await act(async () => {
        result.current.loadNewsResource();
        await new Promise((r) => setTimeout(r, 30));
      });

      // Devem ter sido adicionados 10 novos (11..20), offset atualizado para 20
      expect(result.current.filters.offset).toBe(20);
      expect(result.current.resources.length).toBe(20);
      // Deve conter todos ids 1..20
      const ids = result.current.resources.map((r) => r.id).sort((a, b) => Number(a) - Number(b));
      expect(ids).toEqual(Array.from({ length: 20 }, (_, i) => i + 1));
    });
  });

  describe('Manipulação de recursos', () => {
    let resolveResources: ReturnType<typeof createMockResolveResources>;
    let hookResult: {
      current: ReturnType<typeof useViewList<TestResource, TestFilter>>;
    };

    beforeEach(async () => {
      resolveResources = createMockResolveResources();
      
      const { result } = renderHook(() =>
        useViewList<TestResource, TestFilter>({
          resolveResources,
          firstLoad: true, // Carrega recursos inicialmente
        })
      );

      hookResult = result;

      // Aguarda o carregamento inicial
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
      });
    });

    describe('pushResource', () => {
      it('deve ter função pushResource disponível', () => {
        expect(typeof hookResult.current.pushResource).toBe('function');
      });

      it('deve adicionar recurso e atualizar total', () => {
        const initialTotal = hookResult.current.resourcesTotal;
        const newResource: TestResource = {
          id: 4,
          name: 'User 4',
          email: 'user4@test.com',
          status: 'active',
        };

        act(() => {
          hookResult.current.pushResource(newResource);
        });

        expect(hookResult.current.resourcesTotal).toBe(initialTotal + 1);
      });
    });

    describe('Funções de manipulação', () => {
      it('deve ter todas as funções de manipulação disponíveis', () => {
        expect(typeof hookResult.current.updateResource).toBe('function');
        expect(typeof hookResult.current.putResource).toBe('function');
        expect(typeof hookResult.current.deleteResource).toBe('function');
        expect(typeof hookResult.current.deleteManyResources).toBe('function');
        expect(typeof hookResult.current.changePosition).toBe('function');
        expect(typeof hookResult.current.putManyResource).toBe('function');
      });

      it('deve executar funções sem erro', () => {
        act(() => {
          hookResult.current.updateResource(1, {
            id: 1,
            name: 'Updated',
            email: 'updated@test.com',
            status: 'active',
          });
        });

        act(() => {
          hookResult.current.putResource(1, { name: 'Partial Update' });
        });

        act(() => {
          hookResult.current.deleteResource(999); // ID que não existe
        });

        act(() => {
          hookResult.current.deleteManyResources([999, 1000]);
        });

        act(() => {
          hookResult.current.changePosition(1, 2);
        });

        act(() => {
          hookResult.current.putManyResource({ status: 'inactive' as const });
        });

        // Se chegou até aqui, todas as funções executaram sem erro
        expect(true).toBe(true);
      });
    });
  });

  describe('Estados de loading e erro', () => {
    it('deve gerenciar estado de busca', async () => {
      const resolveResources = vi.fn().mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({
          results: mockResources,
          count: mockResources.length,
        }), 100))
      );

      const { result } = renderHook(() =>
        useViewList<TestResource, TestFilter>({
          resolveResources,
          firstLoad: false,
        })
      );

      // Inicia busca
      act(() => {
        result.current.setFilters({ search: 'test' });
      });

      expect(result.current.isSearching).toBe(true);
      expect(result.current.isErrorOnSearching).toBe(false);

      // Aguarda conclusão
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 150));
      });

      expect(result.current.isSearching).toBe(false);
    });

    it('deve ter propriedades de estado de erro', () => {
      const resolveResources = vi.fn().mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() =>
        useViewList<TestResource, TestFilter>({
          resolveResources,
          firstLoad: false,
        })
      );

      expect(typeof result.current.isSearching).toBe('boolean');
      expect(typeof result.current.isErrorOnSearching).toBe('boolean');
    });

    it('deve reverter offset em caso de erro na paginação', async () => {
      const resolveResources = createMockResolveResources();

      const { result } = renderHook(() =>
        useViewList<TestResource, TestFilter>({
          resolveResources,
          firstLoad: false,
        })
      );

      // Define offset inicial
      act(() => {
        result.current.filters.offset = 2;
      });

      const initialOffset = result.current.filters.offset;

      // Simula erro na próxima página
      resolveResources.mockRejectedValueOnce(new Error('Network error'));

      await act(async () => {
        result.current.nextPage();
      });

      // Offset deve ter sido revertido
      expect(result.current.filters.offset).toBe(initialOffset);
      expect(result.current.isErrorOnSearching).toBe(true);
    });
  });

  describe('Informações de paginação', () => {
    it('deve ter propriedades de paginação', () => {
      const resolveResources = createMockResolveResources(mockResources, 100);

      const { result } = renderHook(() =>
        useViewList<TestResource, TestFilter>({
          resolveResources,
          limit: 20,
        })
      );

      expect(typeof result.current.isFirstPage).toBe('boolean');
      expect(typeof result.current.isLastPage).toBe('boolean');
    });

    it('deve ter informações de paginação diretamente no retorno', () => {
      const resolveResources = createMockResolveResources(mockResources, mockResources.length);

      const { result } = renderHook(() =>
        useViewList<TestResource, TestFilter>({
          resolveResources,
          limit: 20,
        })
      );

      expect(result.current).toHaveProperty('isFirstPage');
      expect(result.current).toHaveProperty('isLastPage');
      expect(result.current).toHaveProperty('isSearching');
      expect(result.current).toHaveProperty('isErrorOnSearching');
    });
  });

  describe('Estrutura do retorno', () => {
    it('deve retornar todas as propriedades esperadas', () => {
      const resolveResources = createMockResolveResources();

      const { result } = renderHook(() =>
        useViewList<TestResource, TestFilter>({
          resolveResources,
        })
      );

      // Propriedades básicas
      expect(Array.isArray(result.current.resources)).toBe(true);
      expect(typeof result.current.resourcesTotal).toBe('number');
      expect(typeof result.current.filters).toBe('object');

      // Propriedades de estado (achatadas no retorno)
      expect(typeof result.current.isSearching).toBe('boolean');
      expect(typeof result.current.isErrorOnSearching).toBe('boolean');
      expect(typeof result.current.isFirstPage).toBe('boolean');
      expect(typeof result.current.isLastPage).toBe('boolean');
      expect(typeof result.current.isLoading).toBe('boolean');
      expect(typeof result.current.isStarted).toBe('boolean');
      expect(typeof result.current.isErrorOnLoad).toBe('boolean');
      expect(typeof result.current.isCriticalError).toBe('boolean');

      // Funções de controle
      expect(typeof result.current.setFilters).toBe('function');
      expect(typeof result.current.reloadPage).toBe('function');
      expect(typeof result.current.nextPage).toBe('function');
      expect(typeof result.current.previousPage).toBe('function');
      expect(typeof result.current.setPage).toBe('function');
      expect(typeof result.current.setSort).toBe('function');
      expect(typeof result.current.retry).toBe('function');

      // Funções de manipulação de recursos
      expect(typeof result.current.pushResource).toBe('function');
      expect(typeof result.current.updateResource).toBe('function');
      expect(typeof result.current.putResource).toBe('function');
      expect(typeof result.current.deleteResource).toBe('function');
      expect(typeof result.current.deleteManyResources).toBe('function');
      expect(typeof result.current.changePosition).toBe('function');
      expect(typeof result.current.putManyResource).toBe('function');

      // Propriedades do useView
      expect(typeof result.current.setStatusInfo).toBe('function');
      expect(typeof result.current.resolvesResponse).toBe('object');
    });
  });
}); 