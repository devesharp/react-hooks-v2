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