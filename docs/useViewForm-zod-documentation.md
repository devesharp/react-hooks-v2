# zodWrapper - Integração com Zod

O `zodWrapper` permite usar schemas Zod com o `useViewForm`, oferecendo validação robusta e tipada.

## Funcionalidades

### Opção `nestedErrors`

A nova opção `nestedErrors` permite retornar erros mantendo a estrutura aninhada do objeto, em vez de usar dot notation.

#### Comportamento Padrão (nestedErrors: false)

```tsx
import { z } from 'zod';
import { zodWrapper } from './useViewForm.zod';

const schema = z.object({
  CORRETOR: z.object({
    NOME: z.string().min(1, 'Nome é obrigatório'),
    EMAIL: z.string().email('Email inválido'),
  }),
  USER_NAME: z.string().min(1, 'Login é obrigatório'),
});

const validate = zodWrapper(schema, { nestedErrors: false });
const result = validate({});

// Resultado:
// {
//   "CORRETOR.NOME": "Required",
//   "CORRETOR.EMAIL": "Required", 
//   "USER_NAME": "Required"
// }
```

#### Novo Comportamento (nestedErrors: true)

```tsx
const validate = zodWrapper(schema, { nestedErrors: true });
const result = validate({});

// Resultado:
// {
//   CORRETOR: {
//     NOME: "Required",
//     EMAIL: "Required"
//   },
//   USER_NAME: "Required"
// }
```

### Exemplo Prático

```tsx
import { z } from 'zod';
import { useViewForm, zodWrapper } from '@devesharp/react-hooks-v2';

const formSchema = z.object({
  CORRETOR: z.object({
    NOME: z.string().min(1, 'Nome é obrigatório'),
    EMAIL: z.string().email('Email inválido'),
    TELEFONE: z.string().min(10, 'Telefone deve ter pelo menos 10 dígitos'),
  }),
  USER_NAME: z.string().min(1, 'Login é obrigatório'),
  ENDERECO: z.object({
    RUA: z.string().min(1, 'Rua é obrigatória'),
    CIDADE: z.object({
      NOME: z.string().min(1, 'Nome da cidade é obrigatório'),
      UF: z.string().length(2, 'UF deve ter 2 caracteres'),
    }),
  }),
});

function FormularioCorretor() {
  const {
    resource,
    errors,
    setField,
    submitForm,
    isSaving
  } = useViewForm({
    initialData: {
      CORRETOR: { NOME: '', EMAIL: '', TELEFONE: '' },
      USER_NAME: '',
      ENDERECO: { RUA: '', CIDADE: { NOME: '', UF: '' } }
    },
    validateData: zodWrapper(formSchema, { 
      nestedErrors: true,
      customErrorMessages: {
        'CORRETOR.NOME': 'Nome do corretor é obrigatório',
        'CORRETOR.EMAIL': 'Email do corretor é inválido',
        'USER_NAME': 'Nome de usuário é obrigatório',
      }
    }),
    resolveCreate: (data) => api.post('/corretores', data),
  });

  return (
    <form onSubmit={submitForm}>
      <div>
        <label>Nome do Corretor:</label>
        <input
          value={resource.CORRETOR.NOME}
          onChange={(e) => setField('CORRETOR.NOME', e.target.value)}
        />
        {errors.CORRETOR?.NOME && (
          <span className="error">{errors.CORRETOR.NOME}</span>
        )}
      </div>

      <div>
        <label>Email do Corretor:</label>
        <input
          value={resource.CORRETOR.EMAIL}
          onChange={(e) => setField('CORRETOR.EMAIL', e.target.value)}
        />
        {errors.CORRETOR?.EMAIL && (
          <span className="error">{errors.CORRETOR.EMAIL}</span>
        )}
      </div>

      <div>
        <label>Nome de Usuário:</label>
        <input
          value={resource.USER_NAME}
          onChange={(e) => setField('USER_NAME', e.target.value)}
        />
        {errors.USER_NAME && (
          <span className="error">{errors.USER_NAME}</span>
        )}
      </div>

      <div>
        <label>Rua:</label>
        <input
          value={resource.ENDERECO.RUA}
          onChange={(e) => setField('ENDERECO.RUA', e.target.value)}
        />
        {errors.ENDERECO?.RUA && (
          <span className="error">{errors.ENDERECO.RUA}</span>
        )}
      </div>

      <div>
        <label>Cidade:</label>
        <input
          value={resource.ENDERECO.CIDADE.NOME}
          onChange={(e) => setField('ENDERECO.CIDADE.NOME', e.target.value)}
        />
        {errors.ENDERECO?.CIDADE?.NOME && (
          <span className="error">{errors.ENDERECO.CIDADE.NOME}</span>
        )}
      </div>

      <button type="submit" disabled={isSaving}>
        {isSaving ? 'Salvando...' : 'Salvar'}
      </button>
    </form>
  );
}
```

### Vantagens da Estrutura Aninhada

1. **Melhor Organização**: Os erros seguem a mesma estrutura dos dados
2. **Acesso Mais Intuitivo**: `errors.CORRETOR.NOME` em vez de `errors['CORRETOR.NOME']`
3. **TypeScript Friendly**: Melhor suporte a tipos quando usando TypeScript
4. **Compatibilidade com Componentes**: Mais fácil de passar erros para componentes aninhados

### Opções Disponíveis

```tsx
zodWrapper(schema, {
  nestedErrors: true,           // Retorna erros em estrutura aninhada
  customErrorMessages: {},      // Mensagens personalizadas por campo
  includeFieldPath: true,       // Inclui path completo nos erros
  transform: (data) => data,    // Transformação antes da validação
})
```

### Compatibilidade

- ✅ Funciona com `zodWrapper` e `zodWrapperAsync`
- ✅ Suporta objetos aninhados de qualquer profundidade
- ✅ Suporta arrays aninhados
- ✅ Compatível com mensagens customizadas
- ✅ Mantém compatibilidade com comportamento anterior 