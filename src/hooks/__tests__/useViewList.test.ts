import { renderHook, act } from '@testing-library/react';
import { useViewList } from '../useViewList';
import { IResponseResults } from '../useViewList.interfaces';

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
      expect(result.current.filters).toEqual({ offset: 0 });
      expect(result.current.statusInfoList.isSearching).toBe(true);
      expect(result.current.statusInfoList.isErrorOnSearching).toBe(false);
      expect(result.current.statusInfoList.isFirstPage).toBe(false);
      expect(result.current.statusInfoList.isLastPage).toBe(false);
    });

    it('deve inicializar com parâmetros customizados', () => {
      const resolveResources = createMockResolveResources();
      const initialFilters = { search: 'test', status: 'active' as const };
      const filtersDefault = { category: 'users' };

      const { result } = renderHook(() =>
        useViewList<TestResource, TestFilter>({
          resolveResources,
          limit: 10,
          initialOffset: 5,
          initialFilters,
          filtersDefault,
          firstLoad: false,
        })
      );

      expect(result.current.filters).toEqual({
        offset: 5,
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
        search: 'test',
        status: 'active',
      });
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

      expect(result.current.statusInfoList.isSearching).toBe(true);
      expect(result.current.statusInfoList.isErrorOnSearching).toBe(false);

      // Aguarda conclusão
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 150));
      });

      expect(result.current.statusInfoList.isSearching).toBe(false);
    });

    it('deve ter propriedades de estado de erro', () => {
      const resolveResources = vi.fn().mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() =>
        useViewList<TestResource, TestFilter>({
          resolveResources,
          firstLoad: false,
        })
      );

      expect(typeof result.current.statusInfoList.isSearching).toBe('boolean');
      expect(typeof result.current.statusInfoList.isErrorOnSearching).toBe('boolean');
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
      expect(result.current.statusInfoList.isErrorOnSearching).toBe(true);
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

      expect(typeof result.current.statusInfoList.isFirstPage).toBe('boolean');
      expect(typeof result.current.statusInfoList.isLastPage).toBe('boolean');
    });

    it('deve ter informações de paginação no statusInfoList', () => {
      const resolveResources = createMockResolveResources(mockResources, mockResources.length);

      const { result } = renderHook(() =>
        useViewList<TestResource, TestFilter>({
          resolveResources,
          limit: 20,
        })
      );

      expect(result.current.statusInfoList).toHaveProperty('isFirstPage');
      expect(result.current.statusInfoList).toHaveProperty('isLastPage');
      expect(result.current.statusInfoList).toHaveProperty('isSearching');
      expect(result.current.statusInfoList).toHaveProperty('isErrorOnSearching');
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
      expect(typeof result.current.statusInfoList).toBe('object');

      // Funções de controle
      expect(typeof result.current.setFilters).toBe('function');
      expect(typeof result.current.reloadPage).toBe('function');
      expect(typeof result.current.nextPage).toBe('function');
      expect(typeof result.current.previousPage).toBe('function');
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
      expect(typeof result.current.statusInfo).toBe('object');
      expect(typeof result.current.setStatusInfo).toBe('function');
      expect(typeof result.current.resolvesResponse).toBe('object');
    });
  });
}); 