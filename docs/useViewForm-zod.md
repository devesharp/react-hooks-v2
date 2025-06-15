# Integração Zod com useViewForm

Este documento explica como usar o wrapper Zod para validação de formulários com o `useViewForm`.

## Instalação

```bash
npm install zod
# ou
yarn add zod
```

## Importação

```typescript
import { z } from 'zod';
import { 
  zodWrapper, 
  zodWrapperAsync, 
  zodSchemas,
  combineZodSchemas,
  conditionalZodSchema 
} from '@devesharp/react-hooks-v2';
```

## Funcionalidades Principais

### 1. zodWrapper - Validação Síncrona
### 2. zodWrapperAsync - Validação Assíncrona  
### 3. zodSchemas - Schemas Pré-definidos
### 4. Utilitários Avançados

## Novidades: resolveGet vs resolveGetById

A partir desta versão, o `useViewForm` suporta dois tipos de resolvers para carregamento de dados:

### resolveGetById
- **Usado quando há ID**: Recebe o ID como parâmetro
- **Para edição**: Carrega dados específicos de um registro

```typescript
const viewForm = useViewForm({
  id: 123,
  resolveGetById: (id) => api.getUser(id), // Recebe o ID como parâmetro
});
```

### resolveGet  
- **Usado sem necessidade de ID**: Não recebe parâmetros
- **Para dados gerais**: Carrega dados padrão, configurações, etc.

```typescript
const viewForm = useViewForm({
  resolveGet: () => api.getDefaultSettings(), // Sem parâmetros
});
```

### Prioridade de Execução

1. **Com ID + resolveGetById**: Usa `resolveGetById(id)`
2. **Com ID + apenas resolveGet**: Usa `resolveGet()`  
3. **Sem ID + resolveGet**: Usa `resolveGet()`

```typescript
// Exemplo: Prioriza resolveGetById quando há ID
const viewForm = useViewForm({
  id: 123,
  resolveGetById: (id) => api.getUser(id),     // ✅ Este será usado
  resolveGet: () => api.getDefaultUser(),      // ❌ Este será ignorado
});

// Exemplo: Usa resolveGet quando não há resolveGetById
const viewForm = useViewForm({
  id: 123,
  resolveGet: () => api.getCurrentUser(),      // ✅ Este será usado
});

// Exemplo: Carregamento sem ID
const viewForm = useViewForm({
  resolveGet: () => api.getFormDefaults(),     // ✅ Este será usado
});
```

## Uso Básico

### 1. Validação Síncrona

```typescript
import { z } from 'zod';
import { useViewForm, zodWrapper } from '@devesharp/react-hooks-v2';

interface UserForm {
  name: string;
  email: string;
  age: number;
}

// Definir schema Zod
const userSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  email: z.string().email('Email inválido'),
  age: z.number().min(18, 'Idade mínima é 18 anos'),
});

function MyComponent() {
  const viewForm = useViewForm<UserForm>({
    initialData: { name: '', email: '', age: 0 },
    // ✅ Usar zodWrapper para validação
    validateData: zodWrapper(userSchema),
    resolveCreate: async (data) => {
      // Lógica de criação
      return data;
    },
  });

  // ... resto do componente
}
```

### 2. Validação Assíncrona

```typescript
const userSchemaAsync = z.object({
  email: z.string().email().refine(async (email) => {
    // Verificar se email já existe
    const exists = await checkEmailExists(email);
    return !exists;
  }, 'Email já está em uso'),
});

const viewForm = useViewForm({
  validateData: zodWrapperAsync(userSchemaAsync),
  // ... outras props
});
```

## Opções Avançadas

### Transformação de Dados

```typescript
const validateData = zodWrapper(userSchema, {
  // Transformar dados antes da validação
  transform: (data: any) => ({
    ...data,
    name: data.name?.trim(),
    email: data.email?.toLowerCase().trim(),
    age: parseInt(data.age) || 0,
  }),
});
```

### Mensagens Customizadas

```typescript
const validateData = zodWrapper(userSchema, {
  customErrorMessages: {
    name: 'Nome personalizado é obrigatório',
    email: 'Email personalizado inválido',
    'address.street': 'Rua é obrigatória', // Para campos aninhados
  },
});
```

### Controle de Path dos Erros

```typescript
const validateData = zodWrapper(userSchema, {
  includeFieldPath: false, // Remove path completo dos erros
});

// Com includeFieldPath: true (padrão)
// Erro: { 'user.address.street': 'Rua é obrigatória' }

// Com includeFieldPath: false
// Erro: { 'street': 'Rua é obrigatória' }
```

## Schemas Pré-definidos

O `zodSchemas` oferece schemas comuns prontos para uso:

### Schemas Básicos

```typescript
import { zodSchemas } from '@devesharp/react-hooks-v2';

const userSchema = z.object({
  // Email obrigatório
  email: zodSchemas.email()(),
  
  // Email opcional
  emailOptional: zodSchemas.email()(false),
  
  // String obrigatória
  name: zodSchemas.requiredString('Nome'),
  
  // Número positivo
  age: zodSchemas.positiveNumber('Idade'),
  
  // CPF brasileiro
  cpf: zodSchemas.cpf(),
  
  // Telefone brasileiro
  phone: zodSchemas.phone(),
  
  // Senha forte
  password: zodSchemas.strongPassword(),
  
  // Data dd/mm/yyyy
  birthDate: zodSchemas.date(),
  
  // Data mm/yyyy (mês/ano)
  expiryDate: zodSchemas.dateMonth(),
  
  // Cartão de crédito
  creditCard: zodSchemas.creditCard(),
  
  // CNPJ brasileiro
  cnpj: zodSchemas.cnpj(),
  
  // CEP brasileiro
  zipCode: zodSchemas.cep(),
  
  // URL com http/https
  website: zodSchemas.url(),
});

// Exemplo de formulário de empresa
const companySchema = z.object({
  companyName: zodSchemas.requiredString('Nome da Empresa'),
  cnpj: zodSchemas.cnpj('CNPJ inválido'),
  email: zodSchemas.email()(),
  website: zodSchemas.url('Site deve começar com http:// ou https://'),
  zipCode: zodSchemas.cep('CEP inválido'),
  foundedDate: zodSchemas.date('Data de fundação inválida'),
});

// Exemplo de formulário de pagamento
const paymentSchema = z.object({
  cardNumber: zodSchemas.creditCard('Número do cartão inválido'),
  expiryDate: zodSchemas.dateMonth('Data de validade inválida (MM/YYYY)'),
  holderName: zodSchemas.requiredString('Nome do portador'),
  billingZipCode: zodSchemas.cep('CEP de cobrança inválido'),
});
```

### Schemas de Data

```typescript
// Data completa dd/mm/yyyy
birthDate: zodSchemas.date(), // Aceita: "01/01/1990", "31/12/2023"

// Mês/ano mm/yyyy (útil para cartões de crédito)
expiryDate: zodSchemas.dateMonth(), // Aceita: "01/2025", "12/2030"
```

### Schemas Financeiros

```typescript
// Cartão de crédito (16 dígitos com ou sem espaços)
creditCard: zodSchemas.creditCard(), // Aceita: "1234567890123456", "1234 5678 9012 3456"

// CNPJ brasileiro (com ou sem formatação)
cnpj: zodSchemas.cnpj(), // Aceita: "12.345.678/0001-90", "12345678000190"

// CEP brasileiro (com ou sem hífen)
zipCode: zodSchemas.cep(), // Aceita: "01234-567", "01234567"
```

### Schemas de Identificação

```typescript
// CPF brasileiro (com ou sem formatação)
cpf: zodSchemas.cpf(), // Aceita: "123.456.789-00", "12345678900"

// Telefone brasileiro
phone: zodSchemas.phone(), // Aceita: "(11) 99999-9999", "11999999999"
```

### Schemas Web

```typescript
// URL com protocolo obrigatório
website: zodSchemas.url(), // Aceita: "https://example.com", "http://site.com.br"

// Email com validação completa
email: zodSchemas.email()(), // Obrigatório
emailOptional: zodSchemas.email()(false), // Opcional
```

### Schemas de Segurança

```typescript
// Senha forte (mínimo 8 caracteres, maiúscula, minúscula e número)
password: zodSchemas.strongPassword(), // Aceita: "MinhaSenh@123"
```

## Utilitários Avançados

### Combinar Schemas

```typescript
const userSchema = z.object({
  name: z.string(),
});

const addressSchema = z.object({
  street: z.string(),
});

const combinedSchema = combineZodSchemas({
  user: userSchema,
  address: addressSchema,
});
```

### Schema Condicional

```typescript
const schema = conditionalZodSchema(
  (data: any) => data.type === 'person',
  // Schema para pessoa
  z.object({
    type: z.literal('person'),
    name: z.string(),
    age: z.number(),
  }),
  // Schema para empresa
  z.object({
    type: z.literal('company'),
    companyName: z.string(),
    cnpj: z.string(),
  })
);
```

## Exemplo Completo com Provider

```typescript
import React from 'react';
import { z } from 'zod';
import { 
  useViewForm, 
  ViewFormProvider, 
  useFormField,
  zodWrapper,
  zodSchemas 
} from '@devesharp/react-hooks-v2';

interface UserForm {
  name: string;
  email: string;
  age: number;
  address: {
    street: string;
    city: string;
  };
}

const userSchema = z.object({
  name: zodSchemas.requiredString('Nome'),
  email: zodSchemas.email()(),
  age: zodSchemas.positiveNumber('Idade').min(18, 'Idade mínima é 18 anos'),
  address: z.object({
    street: zodSchemas.requiredString('Rua'),
    city: zodSchemas.requiredString('Cidade'),
  }),
});

function UserForm() {
  const viewFormData = useViewForm<UserForm>({
    initialData: {
      name: '',
      email: '',
      age: 0,
      address: { street: '', city: '' },
    },
    validateData: zodWrapper(userSchema, {
      transform: (data: any) => ({
        ...data,
        name: data.name?.trim(),
        email: data.email?.toLowerCase().trim(),
      }),
    }),
    resolveCreate: async (data) => {
      console.log('Criando usuário:', data);
      return { id: Date.now(), ...data };
    },
  });

  return (
    <ViewFormProvider<UserForm> {...viewFormData}>
      <FormFields />
      <SubmitButton />
    </ViewFormProvider>
  );
}

function FormFields() {
  const { value: name, setValue: setName, error: nameError } = 
    useFormField<UserForm, 'name'>('name', '');
  
  const { value: email, setValue: setEmail, error: emailError } = 
    useFormField<UserForm, 'email'>('email', '');
  
  const { value: street, setValue: setStreet, error: streetError } = 
    useFormField<UserForm, 'address.street'>('address.street', '');

  return (
    <div>
      <div>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nome"
        />
        {nameError && <span style={{ color: 'red' }}>{nameError}</span>}
      </div>

      <div>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
        />
        {emailError && <span style={{ color: 'red' }}>{emailError}</span>}
      </div>

      <div>
        <input
          value={street}
          onChange={(e) => setStreet(e.target.value)}
          placeholder="Rua"
        />
        {streetError && <span style={{ color: 'red' }}>{streetError}</span>}
      </div>
    </div>
  );
}

function SubmitButton() {
  const { submitForm, isSaving } = useFormContext();

  return (
    <button onClick={submitForm} disabled={isSaving}>
      {isSaving ? 'Salvando...' : 'Salvar'}
    </button>
  );
}
```

## Validação de Campos Aninhados

O wrapper suporta automaticamente campos aninhados usando dot notation:

```typescript
const schema = z.object({
  user: z.object({
    profile: z.object({
      name: z.string().min(1, 'Nome é obrigatório'),
    }),
  }),
  address: z.object({
    street: z.string().min(1, 'Rua é obrigatória'),
  }),
});

// Os erros serão retornados como:
// {
//   'user.profile.name': 'Nome é obrigatório',
//   'address.street': 'Rua é obrigatória'
// }
```

## Tratamento de Erros

### Erros Personalizados

```typescript
const validateData = zodWrapper(schema, {
  customErrorMessages: {
    // Erro para campo específico
    'email': 'Por favor, insira um email válido',
    
    // Erro para campo aninhado
    'address.zipCode': 'CEP deve estar no formato 00000-000',
  },
});
```

### Erros Não-Zod

Se ocorrer um erro que não seja do Zod (ex: erro na transformação), será retornado:

```typescript
{
  root: 'Mensagem do erro'
}
```

## Performance

### Validação Assíncrona

Use `zodWrapperAsync` apenas quando necessário, pois validações assíncronas são mais lentas:

```typescript
// ✅ Bom - validação síncrona
const syncValidation = zodWrapper(syncSchema);

// ⚠️ Use apenas quando necessário - validação assíncrona
const asyncValidation = zodWrapperAsync(asyncSchema);
```

### Transformações

Transformações são aplicadas antes da validação e podem melhorar a UX:

```typescript
const validateData = zodWrapper(schema, {
  transform: (data: any) => ({
    ...data,
    // Limpar espaços em branco
    name: data.name?.trim(),
    // Normalizar email
    email: data.email?.toLowerCase().trim(),
    // Converter strings para números
    age: parseInt(data.age) || 0,
  }),
});
```

## Migração de Validação Manual

### Antes (validação manual)

```typescript
const validateData = (data: UserForm) => {
  const errors: Record<string, string> = {};
  
  if (!data.name) {
    errors.name = 'Nome é obrigatório';
  }
  
  if (!data.email || !data.email.includes('@')) {
    errors.email = 'Email inválido';
  }
  
  if (data.age < 18) {
    errors.age = 'Idade mínima é 18 anos';
  }
  
  return errors;
};
```

### Depois (com Zod)

```typescript
const userSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  email: z.string().email('Email inválido'),
  age: z.number().min(18, 'Idade mínima é 18 anos'),
});

const validateData = zodWrapper(userSchema);
```

## Benefícios

1. **Type Safety**: Validação e tipos TypeScript sincronizados
2. **Reutilização**: Schemas podem ser reutilizados em diferentes contextos
3. **Composição**: Fácil combinação e extensão de schemas
4. **Validação Rica**: Suporte a validações complexas e assíncronas
5. **Mensagens Customizadas**: Controle total sobre mensagens de erro
6. **Performance**: Validação otimizada com caching interno do Zod

## Limitações

1. **Dependência Externa**: Requer instalação do Zod
2. **Curva de Aprendizado**: Necessário conhecer a API do Zod
3. **Bundle Size**: Adiciona ~13kb ao bundle (gzipped)

## Troubleshooting

### Erro: "Zod is not defined"

Certifique-se de que o Zod está instalado:

```bash
npm install zod
```

### Erros de Tipo TypeScript

Certifique-se de que os tipos do schema Zod correspondem à interface do formulário:

```typescript
// ✅ Correto
interface UserForm {
  name: string;
  age: number;
}

const schema = z.object({
  name: z.string(),
  age: z.number(),
});

// ❌ Incorreto - tipos não correspondem
interface UserForm {
  name: string;
  age: number;
}

const schema = z.object({
  name: z.string(),
  age: z.string(), // Deveria ser z.number()
});
```

### Validação Assíncrona Não Funciona

Use `zodWrapperAsync` em vez de `zodWrapper`:

```typescript
// ❌ Incorreto
const validateData = zodWrapper(asyncSchema);

// ✅ Correto
const validateData = zodWrapperAsync(asyncSchema);
```

## Configurações Avançadas

### Transformação de Dados

Você pode transformar os dados antes da validação:

```typescript
const validate = zodWrapper(schema, {
  transform: (data: any) => ({
    ...data,
    email: data.email?.toLowerCase(),
    name: data.name?.trim(),
  }),
});
```

### Mensagens de Erro Personalizadas

```typescript
const validate = zodWrapper(schema, {
  customErrorMessages: {
    'user.name': 'Nome personalizado é obrigatório',
    'user.email': 'Email personalizado inválido',
  },
});
```

### Controle de Path nos Erros

```typescript
// Com path completo (padrão)
const validateWithPath = zodWrapper(schema, { includeFieldPath: true });
// Resultado: { 'user.name': 'erro' }

// Sem path completo
const validateWithoutPath = zodWrapper(schema, { includeFieldPath: false });
// Resultado: { name: 'erro' }
```

### Estrutura de Erros Aninhada

**Nova funcionalidade**: Você pode escolher entre retornar erros em formato flat (dot notation) ou em estrutura aninhada:

```typescript
const schema = z.object({
  CORRETOR: z.object({
    NOME: z.string().min(1, "Nome é obrigatório"),
    EMAIL: z.string().email("Email inválido"),
  }),
  USER_NAME: z.string().min(1, "Login é obrigatório"),
  SENHA: z.string().min(8, "Senha deve ter pelo menos 8 caracteres"),
});

// Formato flat (padrão) - dot notation
const validateFlat = zodWrapper(schema, { nestedErrors: false });
const flatResult = validateFlat({
  CORRETOR: { NOME: '', EMAIL: 'invalid' },
  USER_NAME: '',
  SENHA: '123',
});
// Resultado:
// {
//   'CORRETOR.NOME': 'Nome é obrigatório',
//   'CORRETOR.EMAIL': 'Email inválido',
//   'USER_NAME': 'Login é obrigatório',
//   'SENHA': 'Senha deve ter pelo menos 8 caracteres'
// }

// Formato aninhado - mantém estrutura do objeto
const validateNested = zodWrapper(schema, { nestedErrors: true });
const nestedResult = validateNested({
  CORRETOR: { NOME: '', EMAIL: 'invalid' },
  USER_NAME: '',
  SENHA: '123',
});
// Resultado:
// {
//   CORRETOR: {
//     NOME: 'Nome é obrigatório',
//     EMAIL: 'Email inválido'
//   },
//   USER_NAME: 'Login é obrigatório',
//   SENHA: 'Senha deve ter pelo menos 8 caracteres'
// }
```

#### Quando usar cada formato?

**Use `nestedErrors: false` (padrão)** quando:
- Você quer compatibilidade com `getFieldError` e `setFieldError` do `useViewForm`
- Precisa acessar erros usando dot notation
- Quer integração simples com `useFormField`

**Use `nestedErrors: true`** quando:
- Você quer manter a estrutura original do objeto
- Precisa iterar sobre erros de forma hierárquica
- Quer exibir erros agrupados por seção do formulário

#### Exemplo prático com useViewForm

```typescript
interface FormData {
  CORRETOR: {
    NOME: string;
    EMAIL: string;
  };
  USER_NAME: string;
  SENHA: string;
}

// Para usar com getFieldError/setFieldError (dot notation)
const { getFieldError, setFieldError } = useViewForm<FormData>({
  validateData: zodWrapper(schema, { nestedErrors: false }),
  // ...
});

// Acessar erros específicos
const nomeError = getFieldError('CORRETOR.NOME');
setFieldError('CORRETOR.EMAIL', 'Email já está em uso');

// Para usar com estrutura aninhada
const { errors } = useViewForm<FormData>({
  validateData: zodWrapper(schema, { nestedErrors: true }),
  // ...
});

// Acessar erros aninhados
if (errors.CORRETOR?.NOME) {
  console.log('Erro no nome:', errors.CORRETOR.NOME);
}
```

## Exemplo Completo: Formulário de Cadastro

Aqui está um exemplo completo mostrando como usar a nova funcionalidade `nestedErrors`:

```typescript
import { z } from 'zod';
import { zodWrapper } from './useViewForm.zod';
import { useViewForm } from './useViewForm';

// Schema do formulário
const cadastroSchema = z.object({
  CORRETOR: z.object({
    NOME: z.string().min(1, "Nome é obrigatório"),
    EMAIL: z.string().email("Email inválido"),
    TELEFONE: z.string().min(10, "Telefone deve ter pelo menos 10 dígitos"),
  }),
  EMPRESA: z.object({
    NOME: z.string().min(1, "Nome da empresa é obrigatório"),
    CNPJ: z.string().regex(/^\d{14}$/, "CNPJ deve ter 14 dígitos"),
  }),
  USER_NAME: z.string().min(3, "Login deve ter pelo menos 3 caracteres"),
  SENHA: z.string().min(8, "Senha deve ter pelo menos 8 caracteres"),
});

interface CadastroForm {
  CORRETOR: {
    NOME: string;
    EMAIL: string;
    TELEFONE: string;
  };
  EMPRESA: {
    NOME: string;
    CNPJ: string;
  };
  USER_NAME: string;
  SENHA: string;
}

function CadastroFormComponent() {
  const {
    resource,
    setField,
    getFieldError,
    setFieldError,
    errors,
    submitForm,
    isSaving
  } = useViewForm<CadastroForm>({
    initialData: {
      CORRETOR: { NOME: '', EMAIL: '', TELEFONE: '' },
      EMPRESA: { NOME: '', CNPJ: '' },
      USER_NAME: '',
      SENHA: '',
    },
    // Usar nestedErrors: false para compatibilidade com getFieldError/setFieldError
    validateData: zodWrapper(cadastroSchema, { nestedErrors: false }),
    resolveCreate: async (data) => {
      // Simular API call
      const response = await fetch('/api/cadastro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return response.json();
    },
    onSuccess: () => {
      alert('Cadastro realizado com sucesso!');
    },
  });

  // Validação customizada para verificar se email já existe
  const handleEmailBlur = async () => {
    const email = resource.CORRETOR?.EMAIL;
    if (email && !getFieldError('CORRETOR.EMAIL')) {
      try {
        const response = await fetch(`/api/check-email/${email}`);
        if (!response.ok) {
          setFieldError('CORRETOR.EMAIL', 'Email já está em uso');
        }
      } catch (error) {
        console.error('Erro ao verificar email:', error);
      }
    }
  };

  return (
    <form onSubmit={(e) => { e.preventDefault(); submitForm(); }}>
      {/* Seção Corretor */}
      <fieldset>
        <legend>Dados do Corretor</legend>
        
        <div>
          <label>Nome:</label>
          <input
            value={resource.CORRETOR?.NOME || ''}
            onChange={(e) => setField('CORRETOR.NOME', e.target.value)}
          />
          {getFieldError('CORRETOR.NOME') && (
            <span className="error">{getFieldError('CORRETOR.NOME')}</span>
          )}
        </div>

        <div>
          <label>Email:</label>
          <input
            type="email"
            value={resource.CORRETOR?.EMAIL || ''}
            onChange={(e) => setField('CORRETOR.EMAIL', e.target.value)}
            onBlur={handleEmailBlur}
          />
          {getFieldError('CORRETOR.EMAIL') && (
            <span className="error">{getFieldError('CORRETOR.EMAIL')}</span>
          )}
        </div>

        <div>
          <label>Telefone:</label>
          <input
            value={resource.CORRETOR?.TELEFONE || ''}
            onChange={(e) => setField('CORRETOR.TELEFONE', e.target.value)}
          />
          {getFieldError('CORRETOR.TELEFONE') && (
            <span className="error">{getFieldError('CORRETOR.TELEFONE')}</span>
          )}
        </div>
      </fieldset>

      {/* Seção Empresa */}
      <fieldset>
        <legend>Dados da Empresa</legend>
        
        <div>
          <label>Nome da Empresa:</label>
          <input
            value={resource.EMPRESA?.NOME || ''}
            onChange={(e) => setField('EMPRESA.NOME', e.target.value)}
          />
          {getFieldError('EMPRESA.NOME') && (
            <span className="error">{getFieldError('EMPRESA.NOME')}</span>
          )}
        </div>

        <div>
          <label>CNPJ:</label>
          <input
            value={resource.EMPRESA?.CNPJ || ''}
            onChange={(e) => setField('EMPRESA.CNPJ', e.target.value.replace(/\D/g, ''))}
          />
          {getFieldError('EMPRESA.CNPJ') && (
            <span className="error">{getFieldError('EMPRESA.CNPJ')}</span>
          )}
        </div>
      </fieldset>

      {/* Seção Login */}
      <fieldset>
        <legend>Dados de Acesso</legend>
        
        <div>
          <label>Login:</label>
          <input
            value={resource.USER_NAME || ''}
            onChange={(e) => setField('USER_NAME', e.target.value)}
          />
          {getFieldError('USER_NAME') && (
            <span className="error">{getFieldError('USER_NAME')}</span>
          )}
        </div>

        <div>
          <label>Senha:</label>
          <input
            type="password"
            value={resource.SENHA || ''}
            onChange={(e) => setField('SENHA', e.target.value)}
          />
          {getFieldError('SENHA') && (
            <span className="error">{getFieldError('SENHA')}</span>
          )}
        </div>
      </fieldset>

      <button type="submit" disabled={isSaving}>
        {isSaving ? 'Cadastrando...' : 'Cadastrar'}
      </button>
    </form>
  );
}

export default CadastroFormComponent;
```

### Alternativa com Estrutura Aninhada

Se você preferir trabalhar com a estrutura aninhada de erros:

```typescript
function CadastroFormWithNestedErrors() {
  const {
    resource,
    setField,
    errors,
    submitForm,
    isSaving
  } = useViewForm<CadastroForm>({
    initialData: {
      CORRETOR: { NOME: '', EMAIL: '', TELEFONE: '' },
      EMPRESA: { NOME: '', CNPJ: '' },
      USER_NAME: '',
      SENHA: '',
    },
    // Usar nestedErrors: true para manter estrutura aninhada
    validateData: zodWrapper(cadastroSchema, { nestedErrors: true }),
    // ... outras configurações
  });

  return (
    <form onSubmit={(e) => { e.preventDefault(); submitForm(); }}>
      {/* Seção Corretor */}
      <fieldset>
        <legend>Dados do Corretor</legend>
        
        <div>
          <label>Nome:</label>
          <input
            value={resource.CORRETOR?.NOME || ''}
            onChange={(e) => setField('CORRETOR.NOME', e.target.value)}
          />
          {errors.CORRETOR?.NOME && (
            <span className="error">{errors.CORRETOR.NOME}</span>
          )}
        </div>

        <div>
          <label>Email:</label>
          <input
            type="email"
            value={resource.CORRETOR?.EMAIL || ''}
            onChange={(e) => setField('CORRETOR.EMAIL', e.target.value)}
          />
          {errors.CORRETOR?.EMAIL && (
            <span className="error">{errors.CORRETOR.EMAIL}</span>
          )}
        </div>
      </fieldset>

      {/* Exibir resumo de erros por seção */}
      {errors.CORRETOR && Object.keys(errors.CORRETOR).length > 0 && (
        <div className="error-summary">
          <h4>Erros nos dados do corretor:</h4>
          <ul>
            {Object.entries(errors.CORRETOR).map(([field, error]) => (
              <li key={field}>{field}: {error}</li>
            ))}
          </ul>
        </div>
      )}

      <button type="submit" disabled={isSaving}>
        {isSaving ? 'Cadastrando...' : 'Cadastrar'}
      </button>
    </form>
  );
} 