import { renderHook, act } from '@testing-library/react';
import { useView } from '../useView';

// Mock para use-immer - versão simplificada que funciona
vi.mock('use-immer', async () => {
  const actual = await vi.importActual('react');
  return {
    useImmer: (initialState: any) => {
      return (actual as any).useState(initialState);
    },
    useImmerReducer: (reducer: any, initialState: any) => {
      const [state, setState] = (actual as any).useState(initialState);
      const dispatch = (action: any) => {
        setState((prev: any) => reducer(prev, action));
      };
      return [state, dispatch];
    },
  };
});

describe('useView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Inicialização básica', () => {
    it('deve inicializar com firstLoad=true por padrão quando há resolves', () => {
      const mockResolver = vi.fn().mockResolvedValue('test');
      const resolves = { test: mockResolver };

      const { result } = renderHook(() => useView({ resolves }));

      expect(result.current.isLoading).toBe(true);
      expect(result.current.isStarted).toBe(false);
    });

    it('deve inicializar com firstLoad=false quando especificado', () => {
      const mockResolver = vi.fn().mockResolvedValue('test');
      const resolves = { test: mockResolver };

      const { result } = renderHook(() => 
        useView({ resolves, firstLoad: false })
      );

      expect(result.current.isLoading).toBe(false);
      expect(result.current.isStarted).toBe(true);
    });

    it('deve inicializar sem resolves', () => {
      const { result } = renderHook(() => useView({}));

      // Quando não há resolves, o hook inicia com firstLoad=true por padrão
      // mas como não há resolves para processar, mantém o estado inicial
      expect(result.current.isLoading).toBe(true);
      expect(result.current.isStarted).toBe(false);
      expect(result.current.isErrorOnLoad).toBe(false);
      expect(result.current.isCriticalError).toBe(false);
      expect(result.current.resolvesResponse).toEqual({});
    });

    it('deve inicializar sem resolves com firstLoad=false', () => {
      const { result } = renderHook(() => useView({ firstLoad: false }));

      // Quando firstLoad=false, o hook inicia como "started"
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isStarted).toBe(true);
      expect(result.current.isErrorOnLoad).toBe(false);
      expect(result.current.isCriticalError).toBe(false);
      expect(result.current.resolvesResponse).toEqual({});
    });
  });

  describe('Estrutura do retorno', () => {
    it('deve retornar todas as propriedades esperadas', () => {
      const { result } = renderHook(() => useView({}));

      // Propriedades de status
      expect(typeof result.current.isLoading).toBe('boolean');
      expect(typeof result.current.isStarted).toBe('boolean');
      expect(typeof result.current.isErrorOnLoad).toBe('boolean');
      expect(typeof result.current.isCriticalError).toBe('boolean');

      // Objetos e funções
      expect(typeof result.current.statusInfo).toBe('object');
      expect(typeof result.current.setStatusInfo).toBe('function');
      expect(typeof result.current.resolvesResponse).toBe('object');
      expect(typeof result.current.reloadPage).toBe('function');
    });

    it('deve manter consistência entre propriedades individuais e statusInfo', () => {
      const { result } = renderHook(() => useView({}));

      expect(result.current.isLoading).toBe(result.current.statusInfo.isLoading);
      expect(result.current.isStarted).toBe(result.current.statusInfo.isStarted);
      expect(result.current.isErrorOnLoad).toBe(result.current.statusInfo.isErrorOnLoad);
      expect(result.current.isCriticalError).toBe(result.current.statusInfo.isCriticalError);
    });
  });

  describe('Resolvers síncronos', () => {
    it('deve processar resolver síncrono simples', async () => {
      const mockData = { id: 1, name: 'Test' };
      const syncResolver = () => mockData;
      const resolves = { userData: syncResolver };

      const { result } = renderHook(() => useView({ resolves }));

      // Aguarda um pouco para o processamento
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      // Verifica se o estado mudou
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isStarted).toBe(true);
      expect(result.current.resolvesResponse.userData).toEqual(mockData);
    });

    it('deve lidar com erro em resolver síncrono', async () => {
      const syncResolver = () => {
        throw new Error('Sync error');
      };
      const resolves = { userData: syncResolver };

      const { result } = renderHook(() => useView({ resolves }));

      // Aguarda um pouco para o processamento
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.isStarted).toBe(false);
      expect(result.current.isErrorOnLoad).toBe(true);
    });
  });

  describe('Callbacks', () => {
    it('deve chamar onStarted quando resolver é bem-sucedido', async () => {
      const userData = { id: 1, name: 'User' };
      const onStarted = vi.fn();
      
      const resolves = { user: () => userData };

      renderHook(() => useView({ resolves, onStarted }));

      // Aguarda um pouco para o processamento
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      expect(onStarted).toHaveBeenCalledWith({ user: userData });
    });

    it('deve chamar onErrorStarted quando há erro', async () => {
      const onErrorStarted = vi.fn();
      const error = new Error('Test error');
      
      const resolves = { 
        user: () => { throw error; }
      };

      renderHook(() => useView({ resolves, onErrorStarted }));

      // Aguarda um pouco para o processamento
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      expect(onErrorStarted).toHaveBeenCalledWith({ user: error });
    });
  });

  describe('reloadPage', () => {
    it('deve ter função reloadPage disponível', () => {
      const { result } = renderHook(() => useView({}));

      expect(typeof result.current.reloadPage).toBe('function');
    });

    it('deve executar reloadPage sem erro', async () => {
      const userData = { id: 1, name: 'User' };
      const resolves = { user: () => userData };

      const { result } = renderHook(() => useView({ resolves }));

      await act(async () => {
        const reloadResult = await result.current.reloadPage(false);
        expect(typeof reloadResult).toBe('object');
      });
    });
  });

  describe('Múltiplos resolvers', () => {
    it('deve processar múltiplos resolvers síncronos', async () => {
      const userData = { id: 1, name: 'User' };
      const settingsData = { theme: 'dark' };
      
      const resolves = {
        user: () => userData,
        settings: () => settingsData
      };

      const { result } = renderHook(() => useView({ resolves }));

      // Aguarda um pouco para o processamento
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      expect(result.current.isStarted).toBe(true);
      expect(result.current.resolvesResponse.user).toEqual(userData);
      expect(result.current.resolvesResponse.settings).toEqual(settingsData);
    });

    it('deve lidar com erro parcial em múltiplos resolvers', async () => {
      const userData = { id: 1, name: 'User' };
      
      const resolves = {
        user: () => userData,
        settings: () => { throw new Error('Settings error'); }
      };

      const { result } = renderHook(() => useView({ resolves }));

      // Aguarda um pouco para o processamento
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      expect(result.current.isStarted).toBe(false);
      expect(result.current.isErrorOnLoad).toBe(true);
      expect(result.current.resolvesResponse.user).toEqual(userData);
      expect(result.current.resolvesResponse.settings).toBeUndefined();
    });
  });

  describe('Casos extremos', () => {
    it('deve lidar com resolves vazio', () => {
      const { result } = renderHook(() => useView({ resolves: {} }));

      // Quando resolves é um objeto vazio, o hook inicia com firstLoad=true
      // mas como não há resolves para processar, mantém o estado inicial
      expect(result.current.isLoading).toBe(true);
      expect(result.current.isStarted).toBe(false);
      expect(result.current.isErrorOnLoad).toBe(false);
      expect(result.current.resolvesResponse).toEqual({});
    });

    it('deve lidar com resolver undefined', async () => {
      const resolves = { user: undefined as unknown };

      const { result } = renderHook(() => useView({ resolves }));

      // Aguarda um pouco para o processamento
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      expect(result.current.isStarted).toBe(false);
      expect(result.current.isErrorOnLoad).toBe(true);
    });

    it('deve lidar com erro não-Error (string)', async () => {
      const resolves = { 
        user: () => { throw 'String error'; }
      };

      const { result } = renderHook(() => useView({ resolves }));

      // Aguarda um pouco para o processamento
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      expect(result.current.isStarted).toBe(false);
      expect(result.current.isErrorOnLoad).toBe(true);
    });
  });

  describe('Tipos TypeScript', () => {
    it('deve inferir tipos corretamente', async () => {
      const userData = { id: 1, name: 'User', age: 30 };
      const resolves = { user: () => userData };

      const { result } = renderHook(() => useView({ resolves }));

      // Aguarda um pouco para o processamento
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      // TypeScript deve inferir que user tem o tipo correto
      const user = result.current.resolvesResponse.user;
      expect(user).toEqual(userData);
    });
  });

  describe('Hot reload', () => {
    it('deve evitar recarregamento durante hot reload', async () => {
      const mockResolver = vi.fn().mockResolvedValue('data');
      const resolves = { test: mockResolver };

      const { rerender } = renderHook(() => useView({ resolves }));

      // Aguarda um pouco para o processamento inicial
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      expect(mockResolver).toHaveBeenCalledTimes(1);

      // Simula hot reload (re-render sem mudança de props)
      rerender();

      // Não deve chamar o resolver novamente
      expect(mockResolver).toHaveBeenCalledTimes(1);
    });
  });

  describe('Variáveis externas', () => {
    it('deve atualizar valor do resolve quando variavel externa muda', async () => {
      let variavelExterna = 10;
      const resolves = { changeValue: () => variavelExterna };

      const { result } = renderHook(() => useView({ resolves }));

      // Aguarda processamento inicial
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      expect(result.current.resolvesResponse.changeValue).toBe(10);

      // Altera a variável externa
      variavelExterna = 20;

      // Recarrega os resolves para refletir a mudança
      await act(async () => {
        await result.current.reloadPage(false);
      });

      expect(result.current.resolvesResponse.changeValue).toBe(20);
    });
  });
});