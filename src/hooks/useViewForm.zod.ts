import { z, type ZodSchema, type ZodError } from 'zod';
import { NestedErrors } from './useViewForm.interfaces';


/**
 * Wrapper para usar schemas Zod com validateData do useViewForm
 * 
 * @param schema - Schema Zod para validação
 * @param options - Opções de configuração
 * @returns Função compatível com validateData
 * 
 * @example
 * ```tsx
 * import { z } from 'zod';
 * import { zodWrapper } from './useViewForm.zod';
 * 
 * const userSchema = z.object({
 *   name: z.string().min(1, 'Nome é obrigatório'),
 *   email: z.string().email('Email inválido'),
 *   age: z.number().min(18, 'Idade mínima é 18 anos'),
 * });
 * 
 * const viewForm = useViewForm({
 *   validateData: zodWrapper(userSchema),
 *   // ... outras props
 * });
 * ```
 */
export function zodWrapper<T>(
  schema: ZodSchema<T>,
  options: {
    /**
     * Transformar dados antes da validação
     */
    transform?: (data: unknown) => unknown;
    /**
     * Personalizar mensagens de erro
     */
    customErrorMessages?: Record<string, string>;
    /**
     * Incluir path completo do campo no erro (ex: "address.street")
     */
    includeFieldPath?: boolean;
    /**
     * Retornar erros mantendo a estrutura aninhada do objeto
     * Se true, retorna { CORRETOR: { NOME: "Required" } }
     * Se false, retorna { "CORRETOR.NOME": "Required" }
     */
    nestedErrors?: boolean;
  } = {}
) {
  const { transform, customErrorMessages = {}, includeFieldPath = true, nestedErrors = false } = options;

  return (data: unknown): Record<string, string> | NestedErrors => {
    try {
      // Aplicar transformação se fornecida
      const dataToValidate = transform ? transform(data) : data;
      
      // Validar com Zod
      schema.parse(dataToValidate);
      
      // Se chegou até aqui, não há erros
      return {};
    } catch (error) {
      if (error instanceof Error && 'issues' in error) {
        const zodError = error as ZodError;
        
        if (nestedErrors) {
          // Retornar erros mantendo a estrutura aninhada
          const errors: NestedErrors = {};

          // Primeiro, identificar quais objetos estão ausentes e criar objetos vazios para eles
          const missingObjects: string[] = [];
          zodError.issues.forEach((issue) => {
            if (issue.code === 'invalid_type' && issue.expected === 'object' && issue.path.length === 1) {
              missingObjects.push(issue.path[0].toString());
            }
          });

          // Se há objetos ausentes, criar um novo objeto com eles como objetos vazios e validar novamente
          if (missingObjects.length > 0) {
            const testData = { ...(data as Record<string, unknown>) };
            missingObjects.forEach(key => {
              testData[key] = {};
            });

            try {
              schema.parse(testData);
            } catch (nestedError) {
              if (nestedError instanceof Error && 'issues' in nestedError) {
                const nestedZodError = nestedError as ZodError;
                nestedZodError.issues.forEach((issue) => {
                  const path = issue.path;
                  const fieldPath = path.join('.');
                  const errorMessage = customErrorMessages[fieldPath] || issue.message;

                  // Construir objeto aninhado
                  let current: NestedErrors = errors;
                  for (let i = 0; i < path.length - 1; i++) {
                    const key = path[i].toString();
                    if (!current[key]) {
                      current[key] = {};
                    }
                    current = current[key] as Record<string, string>;
                  }
                  
                  const lastKey = path[path.length - 1]?.toString() || 'root';
                  current[lastKey] = errorMessage;
                });
              }
            }
          } else {
            // Processar erros normalmente se não há objetos ausentes
            zodError.issues.forEach((issue) => {
              const path = issue.path;
              const fieldPath = path.join('.');
              const errorMessage = customErrorMessages[fieldPath] || issue.message;

              // Construir objeto aninhado
              let current = errors;
              for (let i = 0; i < path.length - 1; i++) {
                const key = path[i].toString();
                if (!current[key]) {
                  current[key] = {};
                }
                current = current[key] as Record<string, string>;
              }
              
              const lastKey = path[path.length - 1]?.toString() || 'root';
              current[lastKey] = errorMessage;
            });
          }

          return errors;
        } else {
          // Comportamento original com dot notation
          const errors: Record<string, string> = {};

          // Primeiro, identificar quais objetos estão ausentes e criar objetos vazios para eles
          const missingObjects: string[] = [];
          zodError.issues.forEach((issue) => {
            if (issue.code === 'invalid_type' && issue.expected === 'object' && issue.path.length === 1) {
              missingObjects.push(issue.path[0].toString());
            }
          });

          // Se há objetos ausentes, criar um novo objeto com eles como objetos vazios e validar novamente
          if (missingObjects.length > 0) {
            const testData = { ...(data as Record<string, unknown>) };
            missingObjects.forEach(key => {
              testData[key] = {};
            });

            try {
              schema.parse(testData);
            } catch (nestedError) {
              if (nestedError instanceof Error && 'issues' in nestedError) {
                const nestedZodError = nestedError as ZodError;
                nestedZodError.issues.forEach((issue) => {
                  // Construir o caminho do campo
                  const fieldPath = includeFieldPath && issue.path.length > 0
                    ? issue.path.join('.')
                    : issue.path[issue.path.length - 1]?.toString() || 'root';

                  // Usar mensagem customizada se disponível, senão usar a do Zod
                  const errorMessage = customErrorMessages[fieldPath] || issue.message;

                  errors[fieldPath] = errorMessage;
                });
              }
            }
          } else {
            // Processar erros normalmente se não há objetos ausentes
            zodError.issues.forEach((issue) => {
              // Construir o caminho do campo
              const fieldPath = includeFieldPath && issue.path.length > 0
                ? issue.path.join('.')
                : issue.path[issue.path.length - 1]?.toString() || 'root';

              // Usar mensagem customizada se disponível, senão usar a do Zod
              const errorMessage = customErrorMessages[fieldPath] || issue.message;

              errors[fieldPath] = errorMessage;
            });
          }

          return errors;
        }
      }

      // Se não for um erro do Zod, retornar erro genérico
      return {
        root: error instanceof Error ? error.message : 'Erro de validação desconhecido'
      };
    }
  };
}

/**
 * Wrapper assíncrono para usar schemas Zod com validateData do useViewForm
 * Útil quando você precisa fazer validações assíncronas
 * 
 * @param schema - Schema Zod para validação
 * @param options - Opções de configuração
 * @returns Promise de função compatível com validateData
 * 
 * @example
 * ```tsx
 * import { z } from 'zod';
 * import { zodWrapperAsync } from './useViewForm.zod';
 * 
 * const userSchema = z.object({
 *   email: z.string().email().refine(async (email) => {
 *     // Validação assíncrona - verificar se email já existe
 *     const exists = await checkEmailExists(email);
 *     return !exists;
 *   }, 'Email já está em uso'),
 * });
 * 
 * const viewForm = useViewForm({
 *   validateData: zodWrapperAsync(userSchema),
 *   // ... outras props
 * });
 * ```
 */
export function zodWrapperAsync<T>(
  schema: ZodSchema<T>,
  options: {
    transform?: (data: unknown) => unknown | Promise<unknown>;
    customErrorMessages?: Record<string, string>;
    includeFieldPath?: boolean;
    /**
     * Retornar erros mantendo a estrutura aninhada do objeto
     * Se true, retorna { CORRETOR: { NOME: "Required" } }
     * Se false, retorna { "CORRETOR.NOME": "Required" }
     */
    nestedErrors?: boolean;
  } = {}
) {
  const { transform, customErrorMessages = {}, includeFieldPath = true, nestedErrors = false } = options;

  return async (data: unknown): Promise<Record<string, string> | Record<string, unknown>> => {
    try {
      // Aplicar transformação se fornecida
      const dataToValidate = transform ? await transform(data) : data;
      
      // Validar com Zod (pode ser assíncrono)
      await schema.parseAsync(dataToValidate);
      
      // Se chegou até aqui, não há erros
      return {};
    } catch (error) {
      if (error instanceof Error && 'issues' in error) {
        const zodError = error as ZodError;
        
        if (nestedErrors) {
          // Retornar erros mantendo a estrutura aninhada
          const errors: Record<string, unknown> = {};

          // Primeiro, identificar quais objetos estão ausentes e criar objetos vazios para eles
          const missingObjects: string[] = [];
          zodError.issues.forEach((issue) => {
            if (issue.code === 'invalid_type' && issue.expected === 'object' && issue.path.length === 1) {
              missingObjects.push(issue.path[0].toString());
            }
          });

          // Se há objetos ausentes, criar um novo objeto com eles como objetos vazios e validar novamente
          if (missingObjects.length > 0) {
            const testData = { ...(data as Record<string, unknown>) };
            missingObjects.forEach(key => {
              testData[key] = {};
            });

            try {
              schema.parse(testData);
            } catch (nestedError) {
              if (nestedError instanceof Error && 'issues' in nestedError) {
                const nestedZodError = nestedError as ZodError;
                nestedZodError.issues.forEach((issue) => {
                  const path = issue.path;
                  const fieldPath = path.join('.');
                  const errorMessage = customErrorMessages[fieldPath] || issue.message;

                  // Construir objeto aninhado
                  let current = errors;
                  for (let i = 0; i < path.length - 1; i++) {
                    const key = path[i].toString();
                    if (!current[key]) {
                      current[key] = {};
                    }
                    current = current[key] as Record<string, unknown>;
                  }
                  
                  const lastKey = path[path.length - 1]?.toString() || 'root';
                  current[lastKey] = errorMessage;
                });
              }
            }
          } else {
            // Processar erros normalmente se não há objetos ausentes
            zodError.issues.forEach((issue) => {
              const path = issue.path;
              const fieldPath = path.join('.');
              const errorMessage = customErrorMessages[fieldPath] || issue.message;

              // Construir objeto aninhado
              let current = errors;
              for (let i = 0; i < path.length - 1; i++) {
                const key = path[i].toString();
                if (!current[key]) {
                  current[key] = {};
                }
                current = current[key] as Record<string, unknown>;
              }
              
              const lastKey = path[path.length - 1]?.toString() || 'root';
              current[lastKey] = errorMessage;
            });
          }

          return errors;
        } else {
          // Comportamento original com dot notation
          const errors: Record<string, string> = {};

          // Primeiro, identificar quais objetos estão ausentes e criar objetos vazios para eles
          const missingObjects: string[] = [];
          zodError.issues.forEach((issue) => {
            if (issue.code === 'invalid_type' && issue.expected === 'object' && issue.path.length === 1) {
              missingObjects.push(issue.path[0].toString());
            }
          });

          // Se há objetos ausentes, criar um novo objeto com eles como objetos vazios e validar novamente
          if (missingObjects.length > 0) {
            const testData = { ...(data as Record<string, unknown>) };
            missingObjects.forEach(key => {
              testData[key] = {};
            });

            try {
              schema.parse(testData);
            } catch (nestedError) {
              if (nestedError instanceof Error && 'issues' in nestedError) {
                const nestedZodError = nestedError as ZodError;
                nestedZodError.issues.forEach((issue) => {
                  // Construir o caminho do campo
                  const fieldPath = includeFieldPath && issue.path.length > 0
                    ? issue.path.join('.')
                    : issue.path[issue.path.length - 1]?.toString() || 'root';

                  // Usar mensagem customizada se disponível, senão usar a do Zod
                  const errorMessage = customErrorMessages[fieldPath] || issue.message;

                  errors[fieldPath] = errorMessage;
                });
              }
            }
          } else {
            // Processar erros normalmente se não há objetos ausentes
            zodError.issues.forEach((issue) => {
              // Construir o caminho do campo
              const fieldPath = includeFieldPath && issue.path.length > 0
                ? issue.path.join('.')
                : issue.path[issue.path.length - 1]?.toString() || 'root';

              // Usar mensagem customizada se disponível, senão usar a do Zod
              const errorMessage = customErrorMessages[fieldPath] || issue.message;

              errors[fieldPath] = errorMessage;
            });
          }

          return errors;
        }
      }

      // Se não for um erro do Zod, retornar erro genérico
      return {
        root: error instanceof Error ? error.message : 'Erro de validação desconhecido'
      };
    }
  };
}

/**
 * Utilitário para criar schemas Zod comuns
 */
export const zodSchemas = {
  /**
   * Schema para email
   */
  email: (message = 'Email inválido') => 
    (required = true) => required 
      ? z.string().min(1, 'Email é obrigatório').email(message)
      : z.string().optional().refine((val) => !val || z.string().email().safeParse(val).success, message),

  /**
   * Schema para string obrigatória
   */
  requiredString: (fieldName: string, minLength = 1) =>
    z.string().min(minLength, `${fieldName} é obrigatório`),

  /**
   * Schema para número positivo
   */
  positiveNumber: (fieldName: string) =>
    z.number().positive(`${fieldName} deve ser um número positivo`),

  /**
   * Schema para CPF brasileiro
   */
  cpf: (message = 'CPF inválido') =>
    z.string().regex(/^\d{3}\.\d{3}\.\d{3}-\d{2}$|^\d{11}$/, message),

  /**
   * Schema para telefone brasileiro
   */
  phone: (message = 'Telefone inválido') =>
    z.string().regex(/^\(\d{2}\)\s\d{4,5}-\d{4}$|^\d{10,11}$/, message),

  /**
   * Schema para senha forte
   */
  strongPassword: (message = 'Senha deve ter pelo menos 8 caracteres, incluindo maiúscula, minúscula e número') =>
    z.string().min(8).regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, message),

  /**
   * Schema para data no formato dd/mm/yyyy
   */
  date: (message = 'Data inválida. Use o formato dd/mm/yyyy') =>
    z.string().regex(/^(0[1-9]|[12][0-9]|3[01])\/(0[1-9]|1[0-2])\/\d{4}$/, message),

  /**
   * Schema para data no formato mm/yyyy (mês/ano)
   */
  dateMonth: (message = 'Data inválida. Use o formato mm/yyyy') =>
    z.string().regex(/^(0[1-9]|1[0-2])\/\d{4}$/, message),

  /**
   * Schema para cartão de crédito
   */
  creditCard: (message = 'Número de cartão de crédito inválido') =>
    z.string().regex(/^\d{4}\s?\d{4}\s?\d{4}\s?\d{4}$|^\d{16}$/, message),

  /**
   * Schema para CNPJ brasileiro
   */
  cnpj: (message = 'CNPJ inválido') =>
    z.string().regex(/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$|^\d{14}$/, message),

  /**
   * Schema para CEP brasileiro
   */
  cep: (message = 'CEP inválido') =>
    z.string().regex(/^\d{5}-?\d{3}$/, message),

  /**
   * Schema para URL com http ou https
   */
  url: (message = 'URL inválida. Deve começar com http:// ou https://') =>
    z.string().regex(/^https?:\/\/.+/, message),
};

/**
 * Utilitário para combinar múltiplos schemas
 */
export function combineZodSchemas<T extends Record<string, ZodSchema>>(schemas: T) {
  return z.object(schemas);
}

/**
 * Utilitário para criar schema condicional
 */
export function conditionalZodSchema<T, U>(
  condition: (data: unknown) => boolean,
  trueSchema: ZodSchema<T>,
  falseSchema: ZodSchema<U>
) {
  return z.unknown().superRefine((data, ctx) => {
    const schema = condition(data) ? trueSchema : falseSchema;
    const result = schema.safeParse(data);
    
    if (!result.success) {
      result.error.issues.forEach((issue) => {
        ctx.addIssue(issue);
      });
    }
  });
}