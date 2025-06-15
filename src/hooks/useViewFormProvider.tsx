import React, { createContext, useContext, ReactNode } from "react";
import { useViewForm } from "./useViewForm";
import { IResolve } from "./useView.interfaces";

// Tipo para o retorno do useViewForm
type UseViewFormReturn<
  DataForm = unknown,
  IDType = string | number,
  TResolves extends Record<string, IResolve> = Record<string, IResolve>
> = ReturnType<typeof useViewForm<DataForm, IDType, TResolves>>;

// Context para o formulário completo
const ViewFormContext = createContext<UseViewFormReturn | null>(null);

// Props do Provider - recebe os dados do useViewForm
interface ViewFormProviderProps<
  DataForm = unknown,
  IDType = string | number,
  TResolves extends Record<string, IResolve> = Record<string, IResolve>
> extends UseViewFormReturn<DataForm, IDType, TResolves> {
  children: ReactNode;
}

// Provider Component
export function ViewFormProvider<
  DataForm = unknown,
  IDType = string | number,
  TResolves extends Record<string, IResolve> = Record<string, IResolve>
>({
  children,
  ...formData
}: ViewFormProviderProps<DataForm, IDType, TResolves>) {
  return (
    <ViewFormContext.Provider value={formData as UseViewFormReturn}>
      {children}
    </ViewFormContext.Provider>
  );
}

// Hook para acessar o contexto completo do formulário
export function useFormContext<
  DataForm = unknown,
  IDType = string | number,
  TResolves extends Record<string, IResolve> = Record<string, IResolve>
>(): UseViewFormReturn<DataForm, IDType, TResolves> {
  const context = useContext(ViewFormContext);
  
  return context as UseViewFormReturn<DataForm, IDType, TResolves>;
}

// Hook para acessar um campo específico do formulário
export function useFormField<
  T = unknown
>(
  fieldName: string,
  defaultValue?: T
): {
  value: T;
  setValue: (value: T) => void;
  error: string | undefined;
  setError: (error: string) => void;
} {
  const context = useFormContext();
  
  if (!context) {
    return {
      value: defaultValue as T,
      setValue: () => {},
      error: undefined,
      setError: () => {},
    }
  }

  const { getField, setField, errors, setFieldErrors } = context;

  // Obter o valor atual do campo ou usar o valor padrão
  const value = getField(fieldName as never) ?? defaultValue;

  // Função para definir o valor do campo
  const setValue = (newValue: T) => {
    setField(fieldName as never, newValue as never);
  };

  // Obter o erro do campo
  const error = errors[fieldName as string];

  // Função para definir erro do campo
  const setError = (errorMessage: string) => {
    setFieldErrors(fieldName as never, errorMessage);
  };

  return {
    value: value as T,
    setValue,
    error,
    setError,
  };
}
