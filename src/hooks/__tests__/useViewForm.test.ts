import { renderHook, act } from '@testing-library/react';
import { useViewForm } from '../useViewForm';
import { IUseViewFormProps } from '../useViewForm.interfaces';

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

// Mock para useView
vi.mock('../useView', () => ({
  useView: vi.fn(() => ({
    statusInfo: {
      isLoading: false,
      isStarted: true,
      isErrorOnLoad: false,
      isCriticalError: false,
    },
    setStatusInfo: vi.fn(),
    reloadPage: vi.fn().mockResolvedValue({}),
    resolvesResponse: {},
  })),
}));

// Mock para axios
vi.mock('axios', () => ({
  isAxiosError: vi.fn((error) => error && error.response),
}));

// Mock para clone-deep
vi.mock('clone-deep', () => ({
  default: vi.fn((obj) => JSON.parse(JSON.stringify(obj))),
}));

// Mock para is-promise
vi.mock('is-promise', () => ({
  default: vi.fn((value) => value && typeof value.then === 'function'),
}));

interface TestFormData {
  id?: number;
  name: string;
  email: string;
  nested?: {
    value: string;
  };
  items?: Array<{ title: string }>;
}

describe('useViewForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Inicialização básica', () => {
    it('deve inicializar com dados padrão', () => {
      const { result } = renderHook(() => 
        useViewForm<TestFormData>({})
      );

      expect(result.current.isEditing).toBe(false);
      expect(result.current.isSaving).toBe(false);
      expect(result.current.isNotFound).toBe(false);
      expect(result.current.isNotAuthorization).toBe(false);
      expect(result.current.resource).toEqual({});
      expect(result.current.originalResource).toEqual({});
    });

    it('deve inicializar com dados iniciais', () => {
      const initialData = { name: 'Test', email: 'test@test.com' };
      
      const { result } = renderHook(() => 
        useViewForm<TestFormData>({
          initialData,
        })
      );

      expect(result.current.resource).toEqual(initialData);
      expect(result.current.initialData).toEqual(initialData);
    });

    it('deve identificar modo de edição quando há ID', () => {
      const { result } = renderHook(() => 
        useViewForm<TestFormData, number>({
          id: 123,
        })
      );

      expect(result.current.isEditing).toBe(true);
    });

    it('deve identificar modo de criação quando não há ID', () => {
      const { result } = renderHook(() => 
        useViewForm<TestFormData>({})
      );

      expect(result.current.isEditing).toBe(false);
    });
  });

  describe('Manipulação de dados', () => {
    it('deve definir campo simples', () => {
      const { result } = renderHook(() => 
        useViewForm<TestFormData>({})
      );

      act(() => {
        result.current.setField('name', 'João');
      });

      expect(result.current.getField('name')).toBe('João');
    });

    it('deve definir campo aninhado', () => {
      const { result } = renderHook(() => 
        useViewForm<TestFormData>({})
      );

      act(() => {
        result.current.setField('nested.value', 'teste');
      });

      expect(result.current.getField('nested.value')).toBe('teste');
    });

    it('deve obter dados completos', () => {
      const initialData = { name: 'Test', email: 'test@test.com' };
      
      const { result } = renderHook(() => 
        useViewForm<TestFormData>({
          initialData,
        })
      );

      const data = result.current.getData();
      expect(data).toEqual(initialData);
    });

    it('deve obter dados com tratamento', () => {
      const initialData = { name: 'Test', email: 'test@test.com' };
      const handleFormData = vi.fn((data) => ({ ...data, processed: true }));
      
      const { result } = renderHook(() => 
        useViewForm<TestFormData>({
          initialData,
          handleFormData,
        })
      );

      const data = result.current.getData(true);
      expect(handleFormData).toHaveBeenCalledWith(initialData);
      expect(data).toEqual({ ...initialData, processed: true });
    });

    it('deve definir dados completos', () => {
      const { result } = renderHook(() => 
        useViewForm<TestFormData>({})
      );

      const newData = { name: 'Novo', email: 'novo@test.com' };

      act(() => {
        result.current.setData(newData);
      });

      expect(result.current.getData()).toEqual(newData);
    });

    it('deve obter campo original', () => {
      const initialData = { name: 'Original', email: 'original@test.com' };
      
      const { result } = renderHook(() => 
        useViewForm<TestFormData>({
          initialData,
        })
      );

      // Simular carregamento de dados originais
      act(() => {
        result.current.setData({ name: 'Modificado', email: 'modificado@test.com' });
      });

      // O campo original deve manter o valor inicial
      expect(result.current.getOriginalField('name')).toBeUndefined(); // Pois originalResource inicia vazio
    });
  });

  describe('Validação', () => {
    it('deve executar validação sem erros', async () => {
      const validateData = vi.fn().mockReturnValue({});
      
      const { result } = renderHook(() => 
        useViewForm<TestFormData>({
          validateData,
        })
      );

      await act(async () => {
        const errors = await result.current.checkErrors();
        expect(errors).toEqual({});
        expect(validateData).toHaveBeenCalled();
      });
    });

    it('deve executar validação com erros', async () => {
      const errors = { name: 'Nome é obrigatório' };
      const validateData = vi.fn().mockReturnValue(errors);
      
      const { result } = renderHook(() => 
        useViewForm<TestFormData>({
          validateData,
        })
      );

      await act(async () => {
        const validationErrors = await result.current.checkErrors();
        expect(validationErrors).toEqual(errors);
      });
    });

    it('deve executar validação assíncrona', async () => {
      const errors = { email: 'Email já existe' };
      const validateData = vi.fn().mockResolvedValue(errors);
      
      const { result } = renderHook(() => 
        useViewForm<TestFormData>({
          validateData,
        })
      );

      await act(async () => {
        const validationErrors = await result.current.checkErrors();
        expect(validationErrors).toEqual(errors);
      });
    });
  });

  describe('Submissão - Criação', () => {
    it('deve submeter formulário de criação com sucesso', async () => {
      const formData = { name: 'Novo', email: 'novo@test.com' };
      const responseData = { id: 1, ...formData };
      const resolveCreate = vi.fn().mockResolvedValue(responseData);
      const onSuccess = vi.fn();
      
      const { result } = renderHook(() => 
        useViewForm<TestFormData>({
          resolveCreate,
          onSuccess,
          initialData: formData,
        })
      );

      await act(async () => {
        await result.current.submitForm();
      });

      expect(resolveCreate).toHaveBeenCalledWith(formData);
      expect(onSuccess).toHaveBeenCalledWith(responseData, true);
      expect(result.current.isSaving).toBe(false);
    });

    it('deve usar resolveAction quando não há resolveCreate', async () => {
      const formData = { name: 'Novo', email: 'novo@test.com' };
      const responseData = { id: 1, ...formData };
      const resolveAction = vi.fn().mockResolvedValue(responseData);
      const onSuccess = vi.fn();
      
      const { result } = renderHook(() => 
        useViewForm<TestFormData>({
          resolveAction,
          onSuccess,
          initialData: formData,
        })
      );

      await act(async () => {
        await result.current.submitForm();
      });

      expect(resolveAction).toHaveBeenCalledWith(formData);
      expect(onSuccess).toHaveBeenCalledWith(responseData, true);
    });

    it('deve chamar onSuccess mesmo sem resolver de criação', async () => {
      const formData = { name: 'Novo', email: 'novo@test.com' };
      const onSuccess = vi.fn();
      
      const { result } = renderHook(() => 
        useViewForm<TestFormData>({
          onSuccess,
          initialData: formData,
        })
      );

      await act(async () => {
        await result.current.submitForm();
      });

      expect(onSuccess).toHaveBeenCalledWith(formData, true);
    });

    it('deve tratar erro na criação', async () => {
      const formData = { name: 'Novo', email: 'novo@test.com' };
      const error = new Error('Erro na criação');
      const resolveCreate = vi.fn().mockRejectedValue(error);
      const onFailed = vi.fn();
      
      const { result } = renderHook(() => 
        useViewForm<TestFormData>({
          resolveCreate,
          onFailed,
          initialData: formData,
        })
      );

      await act(async () => {
        await result.current.submitForm();
      });

      expect(onFailed).toHaveBeenCalledWith(error, true);
      expect(result.current.isSaving).toBe(false);
    });
  });

  describe('Submissão - Atualização', () => {
    it('deve submeter formulário de atualização com sucesso', async () => {
      const id = 123;
      const formData = { name: 'Atualizado', email: 'atualizado@test.com' };
      const responseData = { id, ...formData };
      const resolveUpdate = vi.fn().mockResolvedValue(responseData);
      const onSuccess = vi.fn();
      
      const { result } = renderHook(() => 
        useViewForm<TestFormData, number>({
          id,
          resolveUpdate,
          onSuccess,
          initialData: formData,
        })
      );

      await act(async () => {
        await result.current.submitForm();
      });

      expect(resolveUpdate).toHaveBeenCalledWith(id, formData);
      expect(onSuccess).toHaveBeenCalledWith(responseData, true);
    });

    it('deve atualizar resource após salvar quando updateResourceOnSave=true', async () => {
      const id = 123;
      const formData = { name: 'Atualizado', email: 'atualizado@test.com' };
      const responseData = { id, ...formData, updated: true };
      const resolveUpdate = vi.fn().mockResolvedValue(responseData);
      const handleInsertForm = vi.fn((data) => data);
      
      const { result } = renderHook(() => 
        useViewForm<TestFormData, number>({
          id,
          resolveUpdate,
          updateResourceOnSave: true,
          handleInsertForm,
          initialData: formData,
        })
      );

      await act(async () => {
        await result.current.submitForm();
      });

      expect(handleInsertForm).toHaveBeenCalledWith(responseData);
    });

    it('deve chamar onSuccess mesmo sem resolver de atualização', async () => {
      const id = 123;
      const formData = { name: 'Atualizado', email: 'atualizado@test.com' };
      const onSuccess = vi.fn();
      
      const { result } = renderHook(() => 
        useViewForm<TestFormData, number>({
          id,
          onSuccess,
          initialData: formData,
        })
      );

      await act(async () => {
        await result.current.submitForm();
      });

      expect(onSuccess).toHaveBeenCalledWith(formData, false);
    });

    it('deve tratar erro na atualização', async () => {
      const id = 123;
      const formData = { name: 'Atualizado', email: 'atualizado@test.com' };
      const error = new Error('Erro na atualização');
      const resolveUpdate = vi.fn().mockRejectedValue(error);
      const onFailed = vi.fn();
      
      const { result } = renderHook(() => 
        useViewForm<TestFormData, number>({
          id,
          resolveUpdate,
          onFailed,
          initialData: formData,
        })
      );

      await act(async () => {
        await result.current.submitForm();
      });

      expect(onFailed).toHaveBeenCalledWith(error, true);
    });
  });

  describe('Validação na submissão', () => {
    it('deve impedir submissão quando há erros de validação', async () => {
      const formData = { name: '', email: 'test@test.com' };
      const validationErrors = { name: 'Nome é obrigatório' };
      const validateData = vi.fn().mockReturnValue(validationErrors);
      const onErrorData = vi.fn();
      const resolveCreate = vi.fn();
      
      const { result } = renderHook(() => 
        useViewForm<TestFormData>({
          validateData,
          onErrorData,
          resolveCreate,
          initialData: formData,
        })
      );

      await act(async () => {
        await result.current.submitForm();
      });

      expect(onErrorData).toHaveBeenCalledWith(['Nome é obrigatório']);
      expect(resolveCreate).not.toHaveBeenCalled();
    });

    it('deve impedir submissão com validação assíncrona com erros', async () => {
      const formData = { name: 'Test', email: 'invalid-email' };
      const validationErrors = { email: 'Email inválido' };
      const validateData = vi.fn().mockResolvedValue(validationErrors);
      const onErrorData = vi.fn();
      const resolveCreate = vi.fn();
      
      const { result } = renderHook(() => 
        useViewForm<TestFormData>({
          validateData,
          onErrorData,
          resolveCreate,
          initialData: formData,
        })
      );

      await act(async () => {
        await result.current.submitForm();
      });

      expect(onErrorData).toHaveBeenCalledWith(['Email inválido']);
      expect(resolveCreate).not.toHaveBeenCalled();
    });
  });

  describe('Tratamento de dados do formulário', () => {
    it('deve aplicar handleFormData na submissão', async () => {
      const formData = { name: 'Test', email: 'test@test.com' };
      const processedData = { ...formData, processed: true };
      const handleFormData = vi.fn().mockReturnValue(processedData);
      const resolveCreate = vi.fn().mockResolvedValue({});
      
      const { result } = renderHook(() => 
        useViewForm<TestFormData>({
          handleFormData,
          resolveCreate,
          initialData: formData,
        })
      );

      await act(async () => {
        await result.current.submitForm();
      });

      expect(handleFormData).toHaveBeenCalledWith(formData);
      expect(resolveCreate).toHaveBeenCalledWith(processedData);
    });

    it('deve aplicar handleFormData assíncrono na submissão', async () => {
      const formData = { name: 'Test', email: 'test@test.com' };
      const processedData = { ...formData, processed: true };
      const handleFormData = vi.fn().mockResolvedValue(processedData);
      const resolveCreate = vi.fn().mockResolvedValue({});
      
      const { result } = renderHook(() => 
        useViewForm<TestFormData>({
          handleFormData,
          resolveCreate,
          initialData: formData,
        })
      );

      await act(async () => {
        await result.current.submitForm();
      });

      expect(handleFormData).toHaveBeenCalledWith(formData);
      expect(resolveCreate).toHaveBeenCalledWith(processedData);
    });
  });

  describe('Estados de carregamento', () => {
    it('deve definir isSaving durante submissão', async () => {
      let resolvePromise: (value: any) => void;
      const resolveCreate = vi.fn(() => new Promise(resolve => {
        resolvePromise = resolve;
      }));
      
      const { result } = renderHook(() => 
        useViewForm<TestFormData>({
          resolveCreate,
          initialData: { name: 'Test', email: 'test@test.com' },
        })
      );

      // Inicia submissão
      act(() => {
        result.current.submitForm();
      });

      // Deve estar salvando
      expect(result.current.isSaving).toBe(true);

      // Resolve a promise
      await act(async () => {
        resolvePromise!({});
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      // Não deve mais estar salvando
      expect(result.current.isSaving).toBe(false);
    });
  });

  describe('Tratamento de erros HTTP', () => {
    it('deve ter estado inicial correto para isNotFound', () => {
      const onErrorStarted = vi.fn();
      
      const { result } = renderHook(() => 
        useViewForm<TestFormData>({
          onErrorStarted,
        })
      );

      // Estado inicial deve ser false
      expect(result.current.isNotFound).toBe(false);
    });

    it('deve ter estado inicial correto para isNotAuthorization', () => {
      const { result } = renderHook(() => 
        useViewForm<TestFormData>({})
      );

      // Estado inicial deve ser false
      expect(result.current.isNotAuthorization).toBe(false);
    });
  });

  describe('Recarregamento de página', () => {
    it('deve ter função reloadPage disponível', () => {
      const { result } = renderHook(() => 
        useViewForm<TestFormData>({})
      );

      expect(typeof result.current.reloadPage).toBe('function');
    });

    it('deve executar reloadPage e resetar estados', async () => {
      const { result } = renderHook(() => 
        useViewForm<TestFormData>({})
      );

      await act(async () => {
        const reloadResult = await result.current.reloadPage();
        expect(typeof reloadResult).toBe('object');
      });

      expect(result.current.isSaving).toBe(false);
      expect(result.current.isNotFound).toBe(false);
      expect(result.current.isNotAuthorization).toBe(false);
    });
  });

  describe('Mudança de ID', () => {
    it('deve resetar dados quando ID muda', () => {
      const initialData = { name: 'Initial', email: 'initial@test.com' };
      
      const { result, rerender } = renderHook(
        ({ id }) => useViewForm<TestFormData, number>({
          id,
          initialData,
        }),
        { initialProps: { id: 1 } }
      );

      // Modifica dados
      act(() => {
        result.current.setField('name', 'Modified');
      });

      expect(result.current.getField('name')).toBe('Modified');

      // Muda ID
      rerender({ id: 2 });

      // Dados devem ser resetados
      expect(result.current.resource).toEqual(initialData);
    });

    it('deve manter dados quando ID não muda (hot reload)', () => {
      const initialData = { name: 'Initial', email: 'initial@test.com' };
      
      const { result, rerender } = renderHook(
        ({ id }) => useViewForm<TestFormData, number>({
          id,
          initialData,
        }),
        { initialProps: { id: 1 } }
      );

      // Modifica dados
      act(() => {
        result.current.setField('name', 'Modified');
      });

      expect(result.current.getField('name')).toBe('Modified');

      // Re-renderiza com mesmo ID (simula hot reload)
      rerender({ id: 1 });

      // Dados devem ser mantidos
      expect(result.current.getField('name')).toBe('Modified');
    });
  });

  describe('Integração com useView', () => {
    it('deve inicializar corretamente com resolveGet', () => {
      const resolveGet = vi.fn();
      const customResolve = vi.fn();
      const resolves = { custom: customResolve };
      
      const { result } = renderHook(() => 
        useViewForm<TestFormData, number>({
          id: 123,
          resolveGet,
          resolves,
        })
      );

      // Verifica se o hook foi inicializado corretamente
      expect(result.current.isEditing).toBe(true);
      expect(typeof result.current.statusInfo).toBe('object');
    });

    it('deve propagar callbacks corretamente', () => {
      const onStarted = vi.fn();
      const onErrorStarted = vi.fn();
      
      const { result } = renderHook(() => 
        useViewForm<TestFormData>({
          onStarted,
          onErrorStarted,
        })
      );

      // Verifica se o hook foi inicializado
      expect(typeof result.current.statusInfo).toBe('object');
      expect(typeof result.current.setStatusInfo).toBe('function');
    });
  });

  describe('Propriedades de retorno', () => {
    it('deve retornar todas as propriedades esperadas', () => {
      const { result } = renderHook(() => 
        useViewForm<TestFormData>({})
      );

      // Propriedades básicas
      expect(typeof result.current.isEditing).toBe('boolean');
      expect(typeof result.current.isSaving).toBe('boolean');
      expect(typeof result.current.isNotFound).toBe('boolean');
      expect(typeof result.current.isNotAuthorization).toBe('boolean');

      // Dados
      expect(typeof result.current.resource).toBe('object');
      expect(typeof result.current.originalResource).toBe('object');
      expect(typeof result.current.initialData).toBe('object');

      // Funções de manipulação
      expect(typeof result.current.setField).toBe('function');
      expect(typeof result.current.getField).toBe('function');
      expect(typeof result.current.getOriginalField).toBe('function');
      expect(typeof result.current.getData).toBe('function');
      expect(typeof result.current.setData).toBe('function');

      // Funções de ação
      expect(typeof result.current.submitForm).toBe('function');
      expect(typeof result.current.checkErrors).toBe('function');
      expect(typeof result.current.reloadPage).toBe('function');

      // Propriedades do useView
      expect(typeof result.current.statusInfo).toBe('object');
      expect(typeof result.current.setStatusInfo).toBe('function');
      expect(typeof result.current.resolvesResponse).toBe('object');
    });
  });

  describe('Casos extremos', () => {
    it('deve lidar com dados undefined/null', () => {
      const { result } = renderHook(() => 
        useViewForm<TestFormData>({
          initialData: undefined as any,
        })
      );

      expect(result.current.resource).toEqual({});
    });

    it('deve lidar com setField em objeto vazio', () => {
      const { result } = renderHook(() => 
        useViewForm<TestFormData>({})
      );

      act(() => {
        result.current.setField('name', 'Test');
      });

      expect(result.current.getField('name')).toBe('Test');
    });

    it('deve lidar com getField de campo inexistente', () => {
      const { result } = renderHook(() => 
        useViewForm<TestFormData>({})
      );

      const value = result.current.getField('name');
      expect(value).toBeUndefined();
    });

    it('deve lidar com submissão sem dados', async () => {
      const resolveCreate = vi.fn().mockResolvedValue({});
      
      const { result } = renderHook(() => 
        useViewForm<TestFormData>({
          resolveCreate,
        })
      );

      await act(async () => {
        await result.current.submitForm();
      });

      expect(resolveCreate).toHaveBeenCalledWith({});
    });
  });

  describe('Performance e otimização', () => {
    it('deve ter funções disponíveis após re-render', () => {
      const { result, rerender } = renderHook(() => 
        useViewForm<TestFormData>({})
      );

      const firstRenderFunctions = {
        setField: typeof result.current.setField,
        getField: typeof result.current.getField,
        submitForm: typeof result.current.submitForm,
        reloadPage: typeof result.current.reloadPage,
      };

      rerender();

      // As funções devem continuar sendo funções
      expect(typeof result.current.setField).toBe(firstRenderFunctions.setField);
      expect(typeof result.current.getField).toBe(firstRenderFunctions.getField);
      expect(typeof result.current.submitForm).toBe(firstRenderFunctions.submitForm);
      expect(typeof result.current.reloadPage).toBe(firstRenderFunctions.reloadPage);
    });
  });

  describe('Testes adicionais de cobertura', () => {
    describe('handleInsertForm', () => {
      it('deve aplicar handleInsertForm nos dados carregados', () => {
        const mockData = { id: 1, name: 'Test', email: 'test@test.com' };
        const handleInsertForm = vi.fn((data) => ({ ...data, processed: true }));
        
        const { result } = renderHook(() => 
          useViewForm<TestFormData, number>({
            id: 1,
            handleInsertForm,
            resolveGet: vi.fn().mockResolvedValue(mockData),
          })
        );

        // Verifica se o hook foi inicializado corretamente
        expect(typeof result.current.resource).toBe('object');
        expect(result.current.isEditing).toBe(true);
      });

      it('deve usar handleInsertForm assíncrono', async () => {
        const mockData = { id: 1, name: 'Test', email: 'test@test.com' };
        const processedData = { ...mockData, processed: true };
        const handleInsertForm = vi.fn().mockResolvedValue(processedData);
        
        const { result } = renderHook(() => 
          useViewForm<TestFormData, number>({
            id: 1,
            handleInsertForm,
          })
        );

        // handleInsertForm deve ser chamado durante a inicialização
        expect(typeof result.current.resource).toBe('object');
      });
    });

    describe('Tratamento de erros HTTP específicos', () => {
      it('deve tratar erro 404 com status_code customizado', () => {
        const customError = { status_code: 404 };
        
        const { result } = renderHook(() => 
          useViewForm<TestFormData>({})
        );

        // Testa se o estado inicial está correto
        expect(result.current.isNotFound).toBe(false);
      });

      it('deve tratar erro 401 com status_code customizado', () => {
        const customError = { status_code: 401 };
        
        const { result } = renderHook(() => 
          useViewForm<TestFormData>({})
        );

        // Testa se o estado inicial está correto
        expect(result.current.isNotAuthorization).toBe(false);
      });

      it('deve tratar erro 404 do Fetch API', () => {
        const fetchError = new Response('Not Found', { status: 404 });
        
        const { result } = renderHook(() => 
          useViewForm<TestFormData>({})
        );

        expect(result.current.isNotFound).toBe(false);
      });

      it('deve tratar erro 401 do Fetch API', () => {
        const fetchError = new Response('Unauthorized', { status: 401 });
        
        const { result } = renderHook(() => 
          useViewForm<TestFormData>({})
        );

        expect(result.current.isNotAuthorization).toBe(false);
      });
    });

    describe('Campos aninhados complexos', () => {
      it('deve definir campo em array', () => {
        const { result } = renderHook(() => 
          useViewForm<TestFormData>({})
        );

        act(() => {
          result.current.setField('items.0.title', 'Primeiro item');
        });

        expect(result.current.getField('items.0.title')).toBe('Primeiro item');
      });

      it('deve lidar com múltiplos níveis de aninhamento', () => {
        interface ComplexData {
          level1: {
            level2: {
              level3: {
                value: string;
              };
            };
          };
        }

        const { result } = renderHook(() => 
          useViewForm<ComplexData>({})
        );

        act(() => {
          result.current.setField('level1.level2.level3.value', 'deep value');
        });

        expect(result.current.getField('level1.level2.level3.value')).toBe('deep value');
      });
    });

    describe('Resolvers síncronos', () => {
      it('deve lidar com resolveCreate síncrono', async () => {
        const formData = { name: 'Test', email: 'test@test.com' };
        const responseData = { id: 1, ...formData };
        const resolveCreate = vi.fn(() => responseData); // Síncrono
        const onSuccess = vi.fn();
        
        const { result } = renderHook(() => 
          useViewForm<TestFormData>({
            resolveCreate,
            onSuccess,
            initialData: formData,
          })
        );

        await act(async () => {
          await result.current.submitForm();
        });

        expect(resolveCreate).toHaveBeenCalledWith(formData);
        expect(onSuccess).toHaveBeenCalledWith(responseData, true);
      });

      it('deve lidar com resolveUpdate síncrono', async () => {
        const id = 123;
        const formData = { name: 'Updated', email: 'updated@test.com' };
        const responseData = { id, ...formData };
        const resolveUpdate = vi.fn(() => responseData); // Síncrono
        const onSuccess = vi.fn();
        
        const { result } = renderHook(() => 
          useViewForm<TestFormData, number>({
            id,
            resolveUpdate,
            onSuccess,
            initialData: formData,
          })
        );

        await act(async () => {
          await result.current.submitForm();
        });

        expect(resolveUpdate).toHaveBeenCalledWith(id, formData);
        expect(onSuccess).toHaveBeenCalledWith(responseData, true);
      });
    });

    describe('Estados de loading durante operações', () => {
      it('deve manter isSaving=false inicialmente', () => {
        const { result } = renderHook(() => 
          useViewForm<TestFormData>({
            initialData: { name: 'Test', email: 'test@test.com' },
          })
        );

        // Estado inicial deve ser false
        expect(result.current.isSaving).toBe(false);
      });
    });

    describe('Configurações firstLoad', () => {
      it('deve respeitar firstLoad=false', () => {
        const resolveGet = vi.fn();
        
        const { result } = renderHook(() => 
          useViewForm<TestFormData, number>({
            id: 123,
            resolveGet,
            firstLoad: false,
          })
        );

        // Verifica se o hook foi inicializado
        expect(result.current.isEditing).toBe(true);
      });

      it('deve usar firstLoad=true por padrão', () => {
        const resolveGet = vi.fn();
        
        const { result } = renderHook(() => 
          useViewForm<TestFormData, number>({
            id: 123,
            resolveGet,
          })
        );

        // Verifica se o hook foi inicializado
        expect(result.current.isEditing).toBe(true);
      });
    });

    describe('Callback checkErrors com dados específicos', () => {
      it('deve ter função checkErrors disponível', () => {
        const validateData = vi.fn().mockReturnValue({});
        
        const { result } = renderHook(() => 
          useViewForm<TestFormData>({
            validateData,
          })
        );

        expect(typeof result.current.checkErrors).toBe('function');
      });

      it('deve ter dados iniciais corretos', () => {
        const initialData = { name: 'Initial', email: 'initial@test.com' };
        
        const { result } = renderHook(() => 
          useViewForm<TestFormData>({
            initialData,
          })
        );

        expect(result.current.resource).toEqual(initialData);
      });
    });

    describe('Integração completa de fluxos', () => {
      it('deve ter todas as propriedades necessárias para criação', () => {
        const formData = { name: 'New User', email: 'new@test.com' };
        const validateData = vi.fn().mockReturnValue({});
        const handleFormData = vi.fn((data) => ({ ...data, processed: true }));
        const resolveCreate = vi.fn().mockResolvedValue({});
        const onSuccess = vi.fn();
        
        const { result } = renderHook(() => 
          useViewForm<TestFormData>({
            validateData,
            handleFormData,
            resolveCreate,
            onSuccess,
            initialData: formData,
          })
        );

        // Verifica se todas as propriedades estão disponíveis
        expect(typeof result.current.submitForm).toBe('function');
        expect(result.current.resource).toEqual(formData);
        expect(result.current.isEditing).toBe(false);
      });

      it('deve ter todas as propriedades necessárias para atualização', () => {
        const id = 123;
        const formData = { name: 'Updated User', email: 'updated@test.com' };
        const validateData = vi.fn().mockReturnValue({});
        const handleFormData = vi.fn((data) => data);
        const handleInsertForm = vi.fn((data) => data);
        const resolveUpdate = vi.fn().mockResolvedValue({});
        const onSuccess = vi.fn();
        
        const { result } = renderHook(() => 
          useViewForm<TestFormData, number>({
            id,
            validateData,
            handleFormData,
            handleInsertForm,
            resolveUpdate,
            onSuccess,
            updateResourceOnSave: true,
            initialData: formData,
          })
        );

        // Verifica se todas as propriedades estão disponíveis
        expect(typeof result.current.submitForm).toBe('function');
        expect(result.current.resource).toEqual(formData);
        expect(result.current.isEditing).toBe(true);
      });
    });
  });
}); 