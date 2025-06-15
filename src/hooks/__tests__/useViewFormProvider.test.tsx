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
    getFieldError: vi.fn(),
    setFieldError: vi.fn(),
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
      mockFormData.getFieldError = vi.fn()
        .mockImplementation((field) => {
          if (field === 'name') return 'Nome é obrigatório';
          if (field === 'email') return 'Email inválido';
          return undefined;
        });

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
      expect(mockFormData.setFieldError).toHaveBeenCalledWith('name', 'Erro customizado');
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
      mockFormData.getFieldError = vi.fn()
        .mockImplementation((field) => {
          if (field === 'name') return 'Nome é obrigatório';
          if (field === 'email') return 'Email inválido';
          return undefined;
        });

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

    it('deve usar getFieldError para obter erros de campos', () => {
      mockFormData.getFieldError = vi.fn()
        .mockImplementation((field) => {
          if (field === 'name') return 'Nome é obrigatório';
          if (field === 'email') return 'Email inválido';
          if (field === 'nested.field') return 'Campo aninhado inválido';
          return undefined;
        });

      const TestComponent = () => {
        const { error: nameError } = useFormField<TestFormData, 'name'>('name');
        const { error: emailError } = useFormField<TestFormData, 'email'>('email');
        const { error: nestedError } = useFormField<TestFormData, 'nested.field'>('nested.field');
        const { error: noError } = useFormField<TestFormData, 'age'>('age');
        
        return (
          <div>
            <div data-testid="name-error">{nameError || 'no error'}</div>
            <div data-testid="email-error">{emailError || 'no error'}</div>
            <div data-testid="nested-error">{nestedError || 'no error'}</div>
            <div data-testid="no-error">{noError || 'no error'}</div>
          </div>
        );
      };

      render(
        <ViewFormProvider<TestFormData> {...mockFormData}>
          <TestComponent />
        </ViewFormProvider>
      );

      expect(mockFormData.getFieldError).toHaveBeenCalledWith('name');
      expect(mockFormData.getFieldError).toHaveBeenCalledWith('email');
      expect(mockFormData.getFieldError).toHaveBeenCalledWith('nested.field');
      expect(mockFormData.getFieldError).toHaveBeenCalledWith('age');

      expect(screen.getByTestId('name-error')).toHaveTextContent('Nome é obrigatório');
      expect(screen.getByTestId('email-error')).toHaveTextContent('Email inválido');
      expect(screen.getByTestId('nested-error')).toHaveTextContent('Campo aninhado inválido');
      expect(screen.getByTestId('no-error')).toHaveTextContent('no error');
    });

    it('deve usar setFieldError para definir erros de campos', () => {
      const TestComponent = () => {
        const { setError: setNameError } = useFormField<TestFormData, 'name'>('name');
        const { setError: setNestedError } = useFormField<TestFormData, 'nested.field'>('nested.field');
        
        return (
          <div>
            <button 
              data-testid="set-name-error" 
              onClick={() => setNameError('Nome é obrigatório')}
            >
              Set Name Error
            </button>
            <button 
              data-testid="set-nested-error" 
              onClick={() => setNestedError('Campo aninhado inválido')}
            >
              Set Nested Error
            </button>
          </div>
        );
      };

      render(
        <ViewFormProvider<TestFormData> {...mockFormData}>
          <TestComponent />
        </ViewFormProvider>
      );

      fireEvent.click(screen.getByTestId('set-name-error'));
      expect(mockFormData.setFieldError).toHaveBeenCalledWith('name', 'Nome é obrigatório');

      fireEvent.click(screen.getByTestId('set-nested-error'));
      expect(mockFormData.setFieldError).toHaveBeenCalledWith('nested.field', 'Campo aninhado inválido');
    });

    it('deve funcionar com campos aninhados usando dot notation para erros', () => {
      mockFormData.getFieldError = vi.fn()
        .mockImplementation((field) => {
          if (field === 'user.profile.name') return 'Nome do perfil é obrigatório';
          if (field === 'address.street') return 'Rua é obrigatória';
          if (field === 'items.0.title') return 'Título do primeiro item é obrigatório';
          return undefined;
        });

      const TestComponent = () => {
        const { error: profileNameError, setError: setProfileNameError } = useFormField<TestFormData, 'user.profile.name'>('user.profile.name');
        const { error: streetError, setError: setStreetError } = useFormField<TestFormData, 'address.street'>('address.street');
        const { error: itemTitleError, setError: setItemTitleError } = useFormField<TestFormData, 'items.0.title'>('items.0.title');
        
        return (
          <div>
            <div data-testid="profile-name-error">{profileNameError || 'no error'}</div>
            <div data-testid="street-error">{streetError || 'no error'}</div>
            <div data-testid="item-title-error">{itemTitleError || 'no error'}</div>
            <button 
              data-testid="set-profile-error" 
              onClick={() => setProfileNameError('Novo erro do perfil')}
            >
              Set Profile Error
            </button>
            <button 
              data-testid="set-street-error" 
              onClick={() => setStreetError('Novo erro da rua')}
            >
              Set Street Error
            </button>
          </div>
        );
      };

      render(
        <ViewFormProvider<TestFormData> {...mockFormData}>
          <TestComponent />
        </ViewFormProvider>
      );

      expect(mockFormData.getFieldError).toHaveBeenCalledWith('user.profile.name');
      expect(mockFormData.getFieldError).toHaveBeenCalledWith('address.street');
      expect(mockFormData.getFieldError).toHaveBeenCalledWith('items.0.title');

      expect(screen.getByTestId('profile-name-error')).toHaveTextContent('Nome do perfil é obrigatório');
      expect(screen.getByTestId('street-error')).toHaveTextContent('Rua é obrigatória');
      expect(screen.getByTestId('item-title-error')).toHaveTextContent('Título do primeiro item é obrigatório');

      fireEvent.click(screen.getByTestId('set-profile-error'));
      expect(mockFormData.setFieldError).toHaveBeenCalledWith('user.profile.name', 'Novo erro do perfil');

      fireEvent.click(screen.getByTestId('set-street-error'));
      expect(mockFormData.setFieldError).toHaveBeenCalledWith('address.street', 'Novo erro da rua');
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