import React from 'react';
import { renderHook, render, screen, fireEvent, waitFor } from '@testing-library/react';
import { act } from 'react-dom/test-utils';

import { ViewFormProvider, useFormContext, useFormField } from '../useViewFormProvider';

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
  age?: number;
  nested?: {
    value: string;
    deep?: {
      property: string;
    };
  };
  items?: Array<{ title: string }>;
}

describe('useViewFormProvider', () => {
  const mockFormData = {
    isEditing: false,
    isSaving: false,
    isNotFound: false,
    isNotAuthorization: false,
    isLoading: false,
    isStarted: true,
    isErrorOnLoad: false,
    isCriticalError: false,
    resource: { name: 'Test', email: 'test@test.com' },
    originalResource: { name: 'Original', email: 'original@test.com' },
    errors: {},
    statusInfo: {
      isLoading: false,
      isStarted: true,
      isErrorOnLoad: false,
      isCriticalError: false,
    },
    resolvesResponse: {},
    initialData: {},
    setResource: vi.fn(),
    setStatusInfo: vi.fn(),
    getData: vi.fn(() => ({ name: 'Test', email: 'test@test.com' })),
    setData: vi.fn(),
    setField: vi.fn(),
    getField: vi.fn(),
    getOriginalField: vi.fn(),
    submitForm: vi.fn(),
    reloadPage: vi.fn(),
    checkErrors: vi.fn(),
    setErrors: vi.fn(),
    setFieldErrors: vi.fn(),
    clearErrors: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('ViewFormProvider', () => {
    it('deve renderizar children corretamente', () => {
      render(
        <ViewFormProvider<TestFormData> {...mockFormData}>
          <div data-testid="child">Child Component</div>
        </ViewFormProvider>
      );

      expect(screen.getByTestId('child')).toBeInTheDocument();
      expect(screen.getByText('Child Component')).toBeInTheDocument();
    });

    it('deve receber dados do useViewForm como props', () => {
      const formData = {
        ...mockFormData,
        isEditing: true,
        resource: { name: 'Test Props', email: 'props@test.com' },
      };

      const TestComponent = () => {
        const context = useFormContext<TestFormData>();
        return <div data-testid="form-data">{JSON.stringify(context.resource)}</div>;
      };

      render(
        <ViewFormProvider<TestFormData> {...formData}>
          <TestComponent />
        </ViewFormProvider>
      );

      expect(screen.getByTestId('form-data')).toHaveTextContent(
        JSON.stringify(formData.resource)
      );
    });

    it('deve fornecer contexto para componentes filhos', () => {
      const TestComponent = () => {
        const context = useFormContext<TestFormData>();
        return <div data-testid="context-data">{JSON.stringify(context.resource)}</div>;
      };

      render(
        <ViewFormProvider<TestFormData> {...mockFormData}>
          <TestComponent />
        </ViewFormProvider>
      );

      expect(screen.getByTestId('context-data')).toHaveTextContent(
        JSON.stringify(mockFormData.resource)
      );
    });
  });

  describe('useFormContext', () => {
    it('deve retornar dados do contexto corretamente', () => {
      const TestComponent = () => {
        const context = useFormContext<TestFormData>();
        return (
          <div>
            <div data-testid="is-editing">{context.isEditing.toString()}</div>
            <div data-testid="is-saving">{context.isSaving.toString()}</div>
            <div data-testid="resource">{JSON.stringify(context.resource)}</div>
          </div>
        );
      };

      render(
        <ViewFormProvider<TestFormData> {...mockFormData}>
          <TestComponent />
        </ViewFormProvider>
      );

      expect(screen.getByTestId('is-editing')).toHaveTextContent('false');
      expect(screen.getByTestId('is-saving')).toHaveTextContent('false');
      expect(screen.getByTestId('resource')).toHaveTextContent(
        JSON.stringify(mockFormData.resource)
      );
    });

    it('deve permitir chamar funções do contexto', () => {
      const TestComponent = () => {
        const { submitForm, clearErrors, reloadPage } = useFormContext<TestFormData>();
        
        return (
          <div>
            <button data-testid="submit" onClick={submitForm}>Submit</button>
            <button data-testid="clear" onClick={clearErrors}>Clear</button>
            <button data-testid="reload" onClick={() => reloadPage()}>Reload</button>
          </div>
        );
      };

      render(
        <ViewFormProvider<TestFormData> {...mockFormData}>
          <TestComponent />
        </ViewFormProvider>
      );

      fireEvent.click(screen.getByTestId('submit'));
      expect(mockFormData.submitForm).toHaveBeenCalled();

      fireEvent.click(screen.getByTestId('clear'));
      expect(mockFormData.clearErrors).toHaveBeenCalled();

      fireEvent.click(screen.getByTestId('reload'));
      expect(mockFormData.reloadPage).toHaveBeenCalled();
    });

    it('deve lançar erro quando usado fora do provider', () => {
      const TestComponent = () => {
        useFormContext<TestFormData>();
        return <div>Test</div>;
      };

      // Capturar erro do console
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => render(<TestComponent />)).toThrow(
        'useFormContext deve ser usado dentro de um ViewFormProvider'
      );

      consoleSpy.mockRestore();
    });
  });

  describe('useFormField', () => {
    it('deve retornar valor do campo corretamente', () => {
      mockFormData.getField.mockImplementation((field) => {
        if (field === 'name') return 'Test Name';
        if (field === 'email') return 'test@test.com';
        return undefined;
      });

      const TestComponent = () => {
        const { value: nameValue } = useFormField<TestFormData, 'name'>('name');
        const { value: emailValue } = useFormField<TestFormData, 'email'>('email');
        
        return (
          <div>
            <div data-testid="name-value">{nameValue}</div>
            <div data-testid="email-value">{emailValue}</div>
          </div>
        );
      };

      render(
        <ViewFormProvider<TestFormData> {...mockFormData}>
          <TestComponent />
        </ViewFormProvider>
      );

      expect(screen.getByTestId('name-value')).toHaveTextContent('Test Name');
      expect(screen.getByTestId('email-value')).toHaveTextContent('test@test.com');
    });

    it('deve usar valor padrão quando campo está vazio', () => {
      mockFormData.getField.mockReturnValue(undefined);

      const TestComponent = () => {
        const { value } = useFormField<TestFormData, 'name'>('name', 'Default Name');
        
        return <div data-testid="default-value">{value}</div>;
      };

      render(
        <ViewFormProvider<TestFormData> {...mockFormData}>
          <TestComponent />
        </ViewFormProvider>
      );

      expect(screen.getByTestId('default-value')).toHaveTextContent('Default Name');
    });

    it('deve chamar setField quando setValue é executado', () => {
      mockFormData.getField.mockReturnValue('Current Value');

      const TestComponent = () => {
        const { value, setValue } = useFormField<TestFormData, 'name'>('name');
        
        return (
          <div>
            <div data-testid="current-value">{value}</div>
            <button 
              data-testid="set-value" 
              onClick={() => setValue('New Value')}
            >
              Set Value
            </button>
          </div>
        );
      };

      render(
        <ViewFormProvider<TestFormData> {...mockFormData}>
          <TestComponent />
        </ViewFormProvider>
      );

      fireEvent.click(screen.getByTestId('set-value'));
      expect(mockFormData.setField).toHaveBeenCalledWith('name', 'New Value');
    });

    it('deve retornar erro do campo corretamente', () => {
      mockFormData.errors = { name: 'Nome é obrigatório', email: 'Email inválido' };

      const TestComponent = () => {
        const { error: nameError } = useFormField<TestFormData, 'name'>('name');
        const { error: emailError } = useFormField<TestFormData, 'email'>('email');
        const { error: ageError } = useFormField<TestFormData, 'age'>('age');
        
        return (
          <div>
            <div data-testid="name-error">{nameError || 'no error'}</div>
            <div data-testid="email-error">{emailError || 'no error'}</div>
            <div data-testid="age-error">{ageError || 'no error'}</div>
          </div>
        );
      };

      render(
        <ViewFormProvider<TestFormData> {...mockFormData}>
          <TestComponent />
        </ViewFormProvider>
      );

      expect(screen.getByTestId('name-error')).toHaveTextContent('Nome é obrigatório');
      expect(screen.getByTestId('email-error')).toHaveTextContent('Email inválido');
      expect(screen.getByTestId('age-error')).toHaveTextContent('no error');
    });

    it('deve chamar setFieldErrors quando setError é executado', () => {
      const TestComponent = () => {
        const { setError } = useFormField<TestFormData, 'name'>('name');
        
        return (
          <button 
            data-testid="set-error" 
            onClick={() => setError('Erro customizado')}
          >
            Set Error
          </button>
        );
      };

      render(
        <ViewFormProvider<TestFormData> {...mockFormData}>
          <TestComponent />
        </ViewFormProvider>
      );

      fireEvent.click(screen.getByTestId('set-error'));
      expect(mockFormData.setFieldErrors).toHaveBeenCalledWith('name', 'Erro customizado');
    });

    it('deve funcionar com campos aninhados', () => {
      mockFormData.getField.mockImplementation((field) => {
        if (field === 'nested.value') return 'Nested Value';
        if (field === 'nested.deep.property') return 'Deep Property';
        return undefined;
      });

      const TestComponent = () => {
        const { value: nestedValue, setValue: setNestedValue } = useFormField<TestFormData, 'nested.value'>('nested.value');
        const { value: deepValue, setValue: setDeepValue } = useFormField<TestFormData, 'nested.deep.property'>('nested.deep.property');
        
        return (
          <div>
            <div data-testid="nested-value">{nestedValue}</div>
            <div data-testid="deep-value">{deepValue}</div>
            <button 
              data-testid="set-nested" 
              onClick={() => setNestedValue('New Nested')}
            >
              Set Nested
            </button>
            <button 
              data-testid="set-deep" 
              onClick={() => setDeepValue('New Deep')}
            >
              Set Deep
            </button>
          </div>
        );
      };

      render(
        <ViewFormProvider<TestFormData> {...mockFormData}>
          <TestComponent />
        </ViewFormProvider>
      );

      expect(screen.getByTestId('nested-value')).toHaveTextContent('Nested Value');
      expect(screen.getByTestId('deep-value')).toHaveTextContent('Deep Property');

      fireEvent.click(screen.getByTestId('set-nested'));
      expect(mockFormData.setField).toHaveBeenCalledWith('nested.value', 'New Nested');

      fireEvent.click(screen.getByTestId('set-deep'));
      expect(mockFormData.setField).toHaveBeenCalledWith('nested.deep.property', 'New Deep');
    });

    it('deve lançar erro quando usado fora do provider', () => {
      const TestComponent = () => {
        useFormField<TestFormData, 'name'>('name');
        return <div>Test</div>;
      };

      // Capturar erro do console
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => render(<TestComponent />)).toThrow(
        'useFormContext deve ser usado dentro de um ViewFormProvider'
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Integração completa', () => {
    it('deve funcionar com formulário completo', async () => {
      mockFormData.getField.mockImplementation((field) => {
        if (field === 'name') return 'João Silva';
        if (field === 'email') return 'joao@test.com';
        return undefined;
      });

      mockFormData.errors = {};

      const FormComponent = () => {
        const { submitForm, isSaving, errors } = useFormContext<TestFormData>();
        const { value: name, setValue: setName, error: nameError } = useFormField<TestFormData, 'name'>('name', '');
        const { value: email, setValue: setEmail, error: emailError } = useFormField<TestFormData, 'email'>('email', '');

        return (
          <form onSubmit={(e) => { e.preventDefault(); submitForm(); }}>
            <div>
              <input
                data-testid="name-input"
                value={name || ''}
                onChange={(e) => setName(e.target.value)}
              />
              {nameError && <span data-testid="name-error">{nameError}</span>}
            </div>
            
            <div>
              <input
                data-testid="email-input"
                value={email || ''}
                onChange={(e) => setEmail(e.target.value)}
              />
              {emailError && <span data-testid="email-error">{emailError}</span>}
            </div>

            <button 
              data-testid="submit-button" 
              type="submit" 
              disabled={isSaving}
            >
              {isSaving ? 'Salvando...' : 'Salvar'}
            </button>

            {Object.keys(errors).length > 0 && (
              <div data-testid="form-errors">
                {Object.entries(errors).map(([field, error]) => (
                  <div key={field}>{field}: {error}</div>
                ))}
              </div>
            )}
          </form>
        );
      };

      render(
        <ViewFormProvider<TestFormData> {...mockFormData}>
          <FormComponent />
        </ViewFormProvider>
      );

      // Verificar valores iniciais
      expect(screen.getByTestId('name-input')).toHaveValue('João Silva');
      expect(screen.getByTestId('email-input')).toHaveValue('joao@test.com');
      expect(screen.getByTestId('submit-button')).toHaveTextContent('Salvar');

      // Alterar valores
      fireEvent.change(screen.getByTestId('name-input'), { target: { value: 'Maria Silva' } });
      expect(mockFormData.setField).toHaveBeenCalledWith('name', 'Maria Silva');

      fireEvent.change(screen.getByTestId('email-input'), { target: { value: 'maria@test.com' } });
      expect(mockFormData.setField).toHaveBeenCalledWith('email', 'maria@test.com');

      // Submeter formulário
      fireEvent.click(screen.getByTestId('submit-button'));
      expect(mockFormData.submitForm).toHaveBeenCalled();
    });

    it('deve exibir erros de validação', () => {
      mockFormData.errors = {
        name: 'Nome é obrigatório',
        email: 'Email inválido'
      };

      const FormWithErrors = () => {
        const { errors } = useFormContext<TestFormData>();
        const { error: nameError } = useFormField<TestFormData, 'name'>('name');
        const { error: emailError } = useFormField<TestFormData, 'email'>('email');

        return (
          <div>
            <div data-testid="name-field-error">{nameError || 'no error'}</div>
            <div data-testid="email-field-error">{emailError || 'no error'}</div>
            <div data-testid="form-errors-count">{Object.keys(errors).length}</div>
          </div>
        );
      };

      render(
        <ViewFormProvider<TestFormData> {...mockFormData}>
          <FormWithErrors />
        </ViewFormProvider>
      );

      expect(screen.getByTestId('name-field-error')).toHaveTextContent('Nome é obrigatório');
      expect(screen.getByTestId('email-field-error')).toHaveTextContent('Email inválido');
      expect(screen.getByTestId('form-errors-count')).toHaveTextContent('2');
    });

    it('deve funcionar com múltiplos componentes usando diferentes campos', () => {
      mockFormData.getField.mockImplementation((field) => {
        const data: any = {
          name: 'João',
          email: 'joao@test.com',
          'nested.value': 'Nested Data',
          age: 30
        };
        return data[field];
      });

      const NameComponent = () => {
        const { value, setValue } = useFormField<TestFormData, 'name'>('name');
        return (
          <input
            data-testid="name-component"
            value={value || ''}
            onChange={(e) => setValue(e.target.value)}
          />
        );
      };

      const EmailComponent = () => {
        const { value, setValue } = useFormField<TestFormData, 'email'>('email');
        return (
          <input
            data-testid="email-component"
            value={value || ''}
            onChange={(e) => setValue(e.target.value)}
          />
        );
      };

      const NestedComponent = () => {
        const { value, setValue } = useFormField<TestFormData, 'nested.value'>('nested.value');
        return (
          <input
            data-testid="nested-component"
            value={value || ''}
            onChange={(e) => setValue(e.target.value)}
          />
        );
      };

      const AgeComponent = () => {
        const { value, setValue } = useFormField<TestFormData, 'age'>('age');
        return (
          <input
            data-testid="age-component"
            type="number"
            value={value || 0}
            onChange={(e) => setValue(Number(e.target.value))}
          />
        );
      };

      render(
        <ViewFormProvider<TestFormData> {...mockFormData}>
          <NameComponent />
          <EmailComponent />
          <NestedComponent />
          <AgeComponent />
        </ViewFormProvider>
      );

      expect(screen.getByTestId('name-component')).toHaveValue('João');
      expect(screen.getByTestId('email-component')).toHaveValue('joao@test.com');
      expect(screen.getByTestId('nested-component')).toHaveValue('Nested Data');
      expect(screen.getByTestId('age-component')).toHaveValue(30);

      // Testar alterações independentes
      fireEvent.change(screen.getByTestId('name-component'), { target: { value: 'Pedro' } });
      expect(mockFormData.setField).toHaveBeenCalledWith('name', 'Pedro');

      fireEvent.change(screen.getByTestId('age-component'), { target: { value: '25' } });
      expect(mockFormData.setField).toHaveBeenCalledWith('age', 25);
    });
  });

  describe('Estados do formulário', () => {
    it('deve refletir estado de carregamento', () => {
      mockFormData.isLoading = true;
      mockFormData.isSaving = true;

      const StatusComponent = () => {
        const { isLoading, isSaving, isEditing } = useFormContext<TestFormData>();
        
        return (
          <div>
            <div data-testid="is-loading">{isLoading.toString()}</div>
            <div data-testid="is-saving">{isSaving.toString()}</div>
            <div data-testid="is-editing">{isEditing.toString()}</div>
          </div>
        );
      };

      render(
        <ViewFormProvider<TestFormData> {...mockFormData}>
          <StatusComponent />
        </ViewFormProvider>
      );

      expect(screen.getByTestId('is-loading')).toHaveTextContent('true');
      expect(screen.getByTestId('is-saving')).toHaveTextContent('true');
      expect(screen.getByTestId('is-editing')).toHaveTextContent('false');
    });

    it('deve refletir estados de erro', () => {
      mockFormData.isNotFound = true;
      mockFormData.isNotAuthorization = false;
      mockFormData.isErrorOnLoad = true;

      const ErrorStatusComponent = () => {
        const { isNotFound, isNotAuthorization, isErrorOnLoad } = useFormContext<TestFormData>();
        
        return (
          <div>
            <div data-testid="is-not-found">{isNotFound.toString()}</div>
            <div data-testid="is-not-authorization">{isNotAuthorization.toString()}</div>
            <div data-testid="is-error-on-load">{isErrorOnLoad.toString()}</div>
          </div>
        );
      };

      render(
        <ViewFormProvider<TestFormData> {...mockFormData}>
          <ErrorStatusComponent />
        </ViewFormProvider>
      );

      expect(screen.getByTestId('is-not-found')).toHaveTextContent('true');
      expect(screen.getByTestId('is-not-authorization')).toHaveTextContent('false');
      expect(screen.getByTestId('is-error-on-load')).toHaveTextContent('true');
    });
  });
}); 