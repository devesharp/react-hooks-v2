import { z } from 'zod';
import { 
  zodWrapper, 
  zodWrapperAsync, 
  zodSchemas, 
  combineZodSchemas, 
  conditionalZodSchema 
} from '../useViewForm.zod';

describe('useViewForm.zod', () => {
  describe('zodWrapper', () => {
    it('deve retornar objeto vazio quando dados são válidos', () => {
      const schema = z.object({
        name: z.string().min(1),
        email: z.string().email(),
        age: z.number().min(18),
      });

      const validate = zodWrapper(schema);
      const result = validate({
        name: 'João',
        email: 'joao@test.com',
        age: 25,
      });

      expect(result).toEqual({});
    });

    it('deve retornar erros quando dados são inválidos', () => {
      const schema = z.object({
        name: z.string().min(1, 'Nome é obrigatório'),
        email: z.string().email('Email inválido'),
        age: z.number().min(18, 'Idade mínima é 18 anos'),
      });

      const validate = zodWrapper(schema);
      const result = validate({
        name: '',
        email: 'email-inválido',
        age: 15,
      });

      expect(result).toEqual({
        name: 'Nome é obrigatório',
        email: 'Email inválido',
        age: 'Idade mínima é 18 anos',
      });
    });

    it('deve funcionar com campos aninhados', () => {
      const schema = z.object({
        user: z.object({
          profile: z.object({
            name: z.string().min(1, 'Nome é obrigatório'),
          }),
        }),
        address: z.object({
          street: z.string().min(1, 'Rua é obrigatória'),
          city: z.string().min(1, 'Cidade é obrigatória'),
        }),
      });

      const validate = zodWrapper(schema);
      const result = validate({
        user: {
          profile: {
            name: '',
          },
        },
        address: {
          street: '',
          city: 'São Paulo',
        },
      });

      expect(result).toEqual({
        'user.profile.name': 'Nome é obrigatório',
        'address.street': 'Rua é obrigatória',
      });
    });

    it('deve usar mensagens customizadas quando fornecidas', () => {
      const schema = z.object({
        name: z.string().min(1),
        email: z.string().email(),
      });

      const validate = zodWrapper(schema, {
        customErrorMessages: {
          name: 'Nome personalizado é obrigatório',
          email: 'Email personalizado inválido',
        },
      });

      const result = validate({
        name: '',
        email: 'invalid',
      });

      expect(result).toEqual({
        name: 'Nome personalizado é obrigatório',
        email: 'Email personalizado inválido',
      });
    });

    it('deve aplicar transformação antes da validação', () => {
      const schema = z.object({
        name: z.string().min(1),
        age: z.number(),
      });

      const validate = zodWrapper(schema, {
        transform: (data: any) => ({
          ...data,
          name: data.name?.trim(),
          age: parseInt(data.age),
        }),
      });

      const result = validate({
        name: '  João  ',
        age: '25',
      });

      expect(result).toEqual({});
    });

    it('deve controlar includeFieldPath', () => {
      const schema = z.object({
        user: z.object({
          name: z.string().min(1, 'Nome é obrigatório'),
        }),
      });

      const validateWithPath = zodWrapper(schema, { includeFieldPath: true });
      const validateWithoutPath = zodWrapper(schema, { includeFieldPath: false });

      const data = { user: { name: '' } };

      const resultWithPath = validateWithPath(data);
      const resultWithoutPath = validateWithoutPath(data);

      expect(resultWithPath).toEqual({ 'user.name': 'Nome é obrigatório' });
      expect(resultWithoutPath).toEqual({ name: 'Nome é obrigatório' });
    });

    it('deve lidar com erros não-Zod', () => {
      const schema = z.object({
        name: z.string(),
      });

      const validate = zodWrapper(schema, {
        transform: () => {
          throw new Error('Erro customizado');
        },
      });

      const result = validate({ name: 'test' });

      expect(result).toEqual({
        root: 'Erro customizado',
      });
    });

    it('deve retornar erros em estrutura aninhada quando nestedErrors=true', () => {
      const schema = z.object({
        CORRETOR: z.object({
          NOME: z.string().min(1, 'Nome é obrigatório'),
        }),
        USER_NAME: z.string().min(1, 'Login é obrigatório'),
        SENHA: z.string().min(1, 'Senha é obrigatória'),
      });

      const validate = zodWrapper(schema, { nestedErrors: true });
      const result = validate({
        CORRETOR: {
          NOME: '',
        },
        USER_NAME: '',
        SENHA: '',
      });

      expect(result).toEqual({
        CORRETOR: {
          NOME: 'Nome é obrigatório',
        },
        USER_NAME: 'Login é obrigatório',
        SENHA: 'Senha é obrigatória',
      });
    });

    it('deve retornar erros em dot notation quando nestedErrors=false (padrão)', () => {
      const schema = z.object({
        CORRETOR: z.object({
          NOME: z.string().min(1, 'Nome é obrigatório'),
        }),
        USER_NAME: z.string().min(1, 'Login é obrigatório'),
      });

      const validate = zodWrapper(schema, { nestedErrors: false });
      const result = validate({
        CORRETOR: {
          NOME: '',
        },
        USER_NAME: '',
      });

      expect(result).toEqual({
        'CORRETOR.NOME': 'Nome é obrigatório',
        'USER_NAME': 'Login é obrigatório',
      });
    });

    it('deve funcionar com campos aninhados profundos usando nestedErrors', () => {
      const schema = z.object({
        user: z.object({
          profile: z.object({
            personal: z.object({
              name: z.string().min(1, 'Nome é obrigatório'),
              age: z.number().min(1, 'Idade é obrigatória'),
            }),
          }),
        }),
        settings: z.object({
          theme: z.string().min(1, 'Tema é obrigatório'),
        }),
      });

      const validate = zodWrapper(schema, { nestedErrors: true });
      const result = validate({
        user: {
          profile: {
            personal: {
              name: '',
              age: 0,
            },
          },
        },
        settings: {
          theme: '',
        },
      });

      expect(result).toEqual({
        user: {
          profile: {
            personal: {
              name: 'Nome é obrigatório',
              age: 'Idade é obrigatória',
            },
          },
        },
        settings: {
          theme: 'Tema é obrigatório',
        },
      });
    });

    it('deve usar mensagens customizadas com nestedErrors', () => {
      const schema = z.object({
        CORRETOR: z.object({
          NOME: z.string().min(1),
        }),
        USER_NAME: z.string().min(1),
      });

      const validate = zodWrapper(schema, {
        nestedErrors: true,
        customErrorMessages: {
          'CORRETOR.NOME': 'Nome personalizado é obrigatório',
          'USER_NAME': 'Login personalizado é obrigatório',
        },
      });

      const result = validate({
        CORRETOR: {
          NOME: '',
        },
        USER_NAME: '',
      });

      expect(result).toEqual({
        CORRETOR: {
          NOME: 'Nome personalizado é obrigatório',
        },
        USER_NAME: 'Login personalizado é obrigatório',
      });
    });
  });

  describe('zodWrapperAsync', () => {
    it('deve retornar objeto vazio quando dados são válidos (async)', async () => {
      const schema = z.object({
        name: z.string().min(1),
        email: z.string().email(),
      });

      const validate = zodWrapperAsync(schema);
      const result = await validate({
        name: 'João',
        email: 'joao@test.com',
      });

      expect(result).toEqual({});
    });

    it('deve retornar erros quando dados são inválidos (async)', async () => {
      const schema = z.object({
        name: z.string().min(1, 'Nome é obrigatório'),
        email: z.string().email('Email inválido'),
      });

      const validate = zodWrapperAsync(schema);
      const result = await validate({
        name: '',
        email: 'invalid',
      });

      expect(result).toEqual({
        name: 'Nome é obrigatório',
        email: 'Email inválido',
      });
    });

    it('deve funcionar com validação assíncrona', async () => {
      const schema = z.object({
        email: z.string().email().refine(async (email) => {
          // Simular verificação assíncrona
          await new Promise(resolve => setTimeout(resolve, 10));
          return email !== 'exists@test.com';
        }, 'Email já existe'),
      });

      const validate = zodWrapperAsync(schema);
      
      const validResult = await validate({ email: 'new@test.com' });
      expect(validResult).toEqual({});

      const invalidResult = await validate({ email: 'exists@test.com' });
      expect(invalidResult).toEqual({
        email: 'Email já existe',
      });
    });

    it('deve aplicar transformação assíncrona', async () => {
      const schema = z.object({
        name: z.string().min(1),
      });

      const validate = zodWrapperAsync(schema, {
        transform: async (data: any) => {
          await new Promise(resolve => setTimeout(resolve, 10));
          return { ...data, name: data.name?.trim() };
        },
      });

      const result = await validate({ name: '  João  ' });
      expect(result).toEqual({});
    });

    it('deve retornar erros em estrutura aninhada quando nestedErrors=true (async)', async () => {
      const schema = z.object({
        CORRETOR: z.object({
          NOME: z.string().min(1, 'Nome é obrigatório'),
        }),
        USER_NAME: z.string().min(1, 'Login é obrigatório'),
      });

      const validate = zodWrapperAsync(schema, { nestedErrors: true });
      const result = await validate({
        CORRETOR: {
          NOME: '',
        },
        USER_NAME: '',
      });

      expect(result).toEqual({
        CORRETOR: {
          NOME: 'Nome é obrigatório',
        },
        USER_NAME: 'Login é obrigatório',
      });
    });

    it('deve retornar erros em dot notation quando nestedErrors=false (async)', async () => {
      const schema = z.object({
        CORRETOR: z.object({
          NOME: z.string().min(1, 'Nome é obrigatório'),
        }),
        USER_NAME: z.string().min(1, 'Login é obrigatório'),
      });

      const validate = zodWrapperAsync(schema, { nestedErrors: false });
      const result = await validate({
        CORRETOR: {
          NOME: '',
        },
        USER_NAME: '',
      });

      expect(result).toEqual({
        'CORRETOR.NOME': 'Nome é obrigatório',
        'USER_NAME': 'Login é obrigatório',
      });
    });
  });

  describe('zodSchemas', () => {
    it('deve criar schema de email corretamente', () => {
      const requiredEmail = zodSchemas.email()(true);
      const optionalEmail = zodSchemas.email()(false);

      expect(requiredEmail.safeParse('').success).toBe(false);
      expect(requiredEmail.safeParse('valid@email.com').success).toBe(true);
      expect(optionalEmail.safeParse('').success).toBe(true);
      expect(optionalEmail.safeParse('valid@email.com').success).toBe(true);
    });

    it('deve criar schema de string obrigatória', () => {
      const schema = zodSchemas.requiredString('Nome');

      expect(schema.safeParse('').success).toBe(false);
      expect(schema.safeParse('João').success).toBe(true);
    });

    it('deve criar schema de número positivo', () => {
      const schema = zodSchemas.positiveNumber('Idade');

      expect(schema.safeParse(-1).success).toBe(false);
      expect(schema.safeParse(0).success).toBe(false);
      expect(schema.safeParse(25).success).toBe(true);
    });

    it('deve validar CPF', () => {
      const schema = zodSchemas.cpf();

      expect(schema.safeParse('123.456.789-00').success).toBe(true);
      expect(schema.safeParse('12345678900').success).toBe(true);
      expect(schema.safeParse('123.456.789-0').success).toBe(false);
      expect(schema.safeParse('invalid').success).toBe(false);
    });

    it('deve validar telefone', () => {
      const schema = zodSchemas.phone();

      expect(schema.safeParse('(11) 99999-9999').success).toBe(true);
      expect(schema.safeParse('(11) 9999-9999').success).toBe(true);
      expect(schema.safeParse('11999999999').success).toBe(true);
      expect(schema.safeParse('1199999999').success).toBe(true);
      expect(schema.safeParse('invalid').success).toBe(false);
    });

    it('deve validar senha forte', () => {
      const schema = zodSchemas.strongPassword();

      expect(schema.safeParse('MinhaSenh@123').success).toBe(true);
      expect(schema.safeParse('minhasenha').success).toBe(false); // sem maiúscula e número
      expect(schema.safeParse('MINHASENHA').success).toBe(false); // sem minúscula e número
      expect(schema.safeParse('MinhaSenh').success).toBe(false); // sem número
      expect(schema.safeParse('123456').success).toBe(false); // muito curta
    });

    it('deve validar data dd/mm/yyyy', () => {
      const schema = zodSchemas.date();

      expect(schema.safeParse('01/01/2023').success).toBe(true);
      expect(schema.safeParse('31/12/2023').success).toBe(true);
      expect(schema.safeParse('15/06/2023').success).toBe(true);
      expect(schema.safeParse('32/01/2023').success).toBe(false); // dia inválido
      expect(schema.safeParse('01/13/2023').success).toBe(false); // mês inválido
      expect(schema.safeParse('1/1/2023').success).toBe(false); // sem zero à esquerda
      expect(schema.safeParse('01-01-2023').success).toBe(false); // formato errado
      expect(schema.safeParse('2023/01/01').success).toBe(false); // ordem errada
    });

    it('deve validar data mm/yyyy', () => {
      const schema = zodSchemas.dateMonth();

      expect(schema.safeParse('01/2023').success).toBe(true);
      expect(schema.safeParse('12/2023').success).toBe(true);
      expect(schema.safeParse('06/2023').success).toBe(true);
      expect(schema.safeParse('13/2023').success).toBe(false); // mês inválido
      expect(schema.safeParse('00/2023').success).toBe(false); // mês inválido
      expect(schema.safeParse('1/2023').success).toBe(false); // sem zero à esquerda
      expect(schema.safeParse('01/23').success).toBe(false); // ano incompleto
    });

    it('deve validar cartão de crédito', () => {
      const schema = zodSchemas.creditCard();

      expect(schema.safeParse('1234567890123456').success).toBe(true);
      expect(schema.safeParse('1234 5678 9012 3456').success).toBe(true);
      expect(schema.safeParse('12345678901234567').success).toBe(false); // muito longo
      expect(schema.safeParse('123456789012345').success).toBe(false); // muito curto
      expect(schema.safeParse('1234-5678-9012-3456').success).toBe(false); // formato errado
      expect(schema.safeParse('abcd5678901234567').success).toBe(false); // com letras
    });

    it('deve validar CNPJ', () => {
      const schema = zodSchemas.cnpj();

      expect(schema.safeParse('12.345.678/0001-90').success).toBe(true);
      expect(schema.safeParse('12345678000190').success).toBe(true);
      expect(schema.safeParse('12.345.678/0001-9').success).toBe(false); // dígito incompleto
      expect(schema.safeParse('123.456.789/0001-90').success).toBe(false); // formato errado
      expect(schema.safeParse('1234567800019').success).toBe(false); // muito curto
      expect(schema.safeParse('123456780001900').success).toBe(false); // muito longo
    });

    it('deve validar CEP', () => {
      const schema = zodSchemas.cep();

      expect(schema.safeParse('01234-567').success).toBe(true);
      expect(schema.safeParse('01234567').success).toBe(true);
      expect(schema.safeParse('1234-567').success).toBe(false); // muito curto
      expect(schema.safeParse('012345-67').success).toBe(false); // formato errado
      expect(schema.safeParse('01234-5678').success).toBe(false); // muito longo
      expect(schema.safeParse('abcde-fgh').success).toBe(false); // com letras
    });

    it('deve validar URL', () => {
      const schema = zodSchemas.url();

      expect(schema.safeParse('https://www.google.com').success).toBe(true);
      expect(schema.safeParse('http://example.com').success).toBe(true);
      expect(schema.safeParse('https://subdomain.example.com/path').success).toBe(true);
      expect(schema.safeParse('www.google.com').success).toBe(false); // sem protocolo
      expect(schema.safeParse('ftp://example.com').success).toBe(false); // protocolo errado
      expect(schema.safeParse('https://').success).toBe(false); // incompleta
      expect(schema.safeParse('http://').success).toBe(false); // incompleta
    });
  });

  describe('combineZodSchemas', () => {
    it('deve combinar múltiplos schemas', () => {
      const userSchema = z.object({
        name: z.string(),
      });

      const addressSchema = z.object({
        street: z.string(),
      });

      const combined = combineZodSchemas({
        user: userSchema,
        address: addressSchema,
      });

      const validData = {
        user: { name: 'João' },
        address: { street: 'Rua A' },
      };

      const invalidData = {
        user: { name: 123 }, // inválido
        address: { street: 'Rua A' },
      };

      expect(combined.safeParse(validData).success).toBe(true);
      expect(combined.safeParse(invalidData).success).toBe(false);
    });
  });

  describe('conditionalZodSchema', () => {
    it('deve aplicar schema baseado em condição', () => {
      const schema = conditionalZodSchema(
        (data: any) => data.type === 'person',
        z.object({
          type: z.literal('person'),
          name: z.string().min(1),
          age: z.number(),
        }),
        z.object({
          type: z.literal('company'),
          companyName: z.string().min(1),
          cnpj: z.string(),
        })
      );

      const personData = {
        type: 'person',
        name: 'João',
        age: 30,
      };

      const companyData = {
        type: 'company',
        companyName: 'Empresa XYZ',
        cnpj: '12.345.678/0001-90',
      };

      const invalidPersonData = {
        type: 'person',
        name: '', // inválido
        age: 30,
      };

      expect(schema.safeParse(personData).success).toBe(true);
      expect(schema.safeParse(companyData).success).toBe(true);
      expect(schema.safeParse(invalidPersonData).success).toBe(false);
    });
  });

  describe('Integração com useViewForm', () => {
    it('deve ser compatível com validateData do useViewForm', () => {
      const schema = z.object({
        name: z.string().min(1, 'Nome é obrigatório'),
        email: z.string().email('Email inválido'),
        age: z.number().min(18, 'Idade mínima é 18 anos'),
      });

      const validateData = zodWrapper(schema);

      // Simular dados válidos
      const validResult = validateData({
        name: 'João',
        email: 'joao@test.com',
        age: 25,
      });

      expect(validResult).toEqual({});

      // Simular dados inválidos
      const invalidResult = validateData({
        name: '',
        email: 'invalid',
        age: 15,
      });

      expect(Object.keys(invalidResult).length).toBeGreaterThan(0);
      expect(typeof invalidResult).toBe('object');
    });

    it('deve funcionar com validação assíncrona no useViewForm', async () => {
      const schema = z.object({
        email: z.string().email().refine(async (email) => {
          // Simular verificação de email único
          await new Promise(resolve => setTimeout(resolve, 10));
          return email !== 'taken@test.com';
        }, 'Email já está em uso'),
      });

      const validateData = zodWrapperAsync(schema);

      // Simular dados válidos
      const validResult = await validateData({
        email: 'available@test.com',
      });

      expect(validResult).toEqual({});

      // Simular dados inválidos
      const invalidResult = await validateData({
        email: 'taken@test.com',
      });

      expect(invalidResult).toEqual({
        email: 'Email já está em uso',
      });
    });

    it('deve funcionar com nestedErrors no useViewForm', () => {
      const schema = z.object({
        CORRETOR: z.object({
          NOME: z.string().min(1, 'Nome é obrigatório'),
          EMAIL: z.string().email('Email inválido'),
        }),
        USER_NAME: z.string().min(1, 'Login é obrigatório'),
        SENHA: z.string().min(8, 'Senha deve ter pelo menos 8 caracteres'),
      });

      // Usar nestedErrors para manter estrutura aninhada
      const validateData = zodWrapper(schema, { nestedErrors: true });

      const result = validateData({
        CORRETOR: {
          NOME: '',
          EMAIL: 'email-inválido',
        },
        USER_NAME: '',
        SENHA: '123',
      });

      // Resultado mantém a estrutura aninhada
      expect(result).toEqual({
        CORRETOR: {
          NOME: 'Nome é obrigatório',
          EMAIL: 'Email inválido',
        },
        USER_NAME: 'Login é obrigatório',
        SENHA: 'Senha deve ter pelo menos 8 caracteres',
      });

      // Verificar que é um objeto aninhado, não dot notation
      expect(result.CORRETOR).toBeDefined();
      expect(typeof result.CORRETOR).toBe('object');
      expect(result.CORRETOR.NOME).toBe('Nome é obrigatório');
      expect(result.CORRETOR.EMAIL).toBe('Email inválido');
    });
  });
}); 