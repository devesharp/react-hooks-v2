// Exemplo de uso do useFetchForm

import React from 'react'
import { useFetchForm } from '../useFetchForm'

// Tipo do usuário para exemplo
interface User {
  id: number
  name: string
  email: string
  age: number
  createdAt?: string
  updatedAt?: string
}

// Tipo para dados da API (formato diferente do formulário)
interface UserAPI {
  id: number
  full_name: string // snake_case na API
  email_address: string // snake_case na API
  user_age: number // snake_case na API
  created_at: string
  updated_at: string
}

// Exemplo 1: Criando um novo usuário
export function CreateUserExample() {
  const form = useFetchForm<User>({
    // Sem ID = modo criação
    id: null,
    resolvers: {
      create: async () => {
        // Simula uma chamada de API para criar usuário
        const response = await fetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form.data)
        })
        return response.json()
      }
    },
    initialData: {
      name: '',
      email: '',
      age: 0
    },
    onSuccess: (data, action) => {
      console.log(`Usuário ${action === 'create' ? 'criado' : 'atualizado'} com sucesso:`, data)
    },
    onFailure: (error, action) => {
      console.error(`Erro ao ${action === 'create' ? 'criar' : 'atualizar'} usuário:`, error)
    }
  })

  const handleSubmit = async () => {
    const result = await form.submitForm()
    if (result.success) {
      console.log('Usuário criado:', result.data)
    }
  }

  const handleInputChange = (field: keyof User, value: unknown) => {
    form.updateData({ [field]: value })
  }

  return {
    data: form.data,
    isSubmitting: form.isSubmitting,
    submitError: form.submitError,
    handleSubmit,
    handleInputChange,
    isCreating: form.isCreating
  }
}

// Exemplo 2: Editando um usuário existente (com update recebendo id e data)
export function EditUserExample(userId: number) {
  const form = useFetchForm<User>({
    // Com ID = modo edição
    id: userId,
    resolvers: {
      get: async (id) => {
        // Busca os dados do usuário
        const response = await fetch(`/api/users/${id}`)
        return response.json()
      },
      // Update agora recebe (id, data) como parâmetros
      update: async (id, data) => {
        const response = await fetch(`/api/users/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        })
        return response.json()
      }
    },
    onSuccess: (data, action) => {
      console.log(`Usuário ${action}d com sucesso:`, data)
    }
  })

  const handleResetToOriginal = () => {
    // Volta para os dados originais carregados do servidor
    form.resetToOriginal()
  }

  return {
    data: form.data,
    originalData: form.originalData, // Dados originais do get
    isLoading: form.isLoading,
    isSubmitting: form.isSubmitting,
    submitError: form.submitError,
    loadError: form.loadError,
    submitForm: form.submitForm,
    updateData: form.updateData,
    resetData: form.resetData,
    resetToOriginal: handleResetToOriginal,
    isEditing: form.isEditing,
    isDirty: form.isDirty // Verifica se foi modificado
  }
}

// Exemplo 3: Usando resolvers customizados
export function CustomResolversExample(userId: number) {
  const form = useFetchForm<User, {
    validateEmail: () => Promise<{ isValid: boolean, message?: string }>
    checkDuplicateName: () => Promise<{ isDuplicate: boolean }>
    getUserStats: () => Promise<{ loginCount: number, lastLogin: Date }>
  }>({
    id: userId,
    resolvers: {
      get: async (id) => {
        const response = await fetch(`/api/users/${id}`)
        return response.json()
      },
      update: async (id, data) => {
        const response = await fetch(`/api/users/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        })
        return response.json()
      },
      // Resolvers customizados
      validateEmail: async () => {
        const response = await fetch(`/api/validate-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: form.data.email })
        })
        return response.json()
      },
      checkDuplicateName: async () => {
        const response = await fetch(`/api/check-name/${form.data.name}`)
        return response.json()
      },
      getUserStats: async () => {
        const response = await fetch(`/api/users/${userId}/stats`)
        return response.json()
      }
    }
  })

  const handleValidateEmail = async () => {
    try {
      const result = await form.executeResolver('validateEmail')
      console.log('Validação do email:', result)
    } catch (error) {
      console.error('Erro na validação:', error)
    }
  }

  const handleCheckDuplicateName = async () => {
    try {
      const result = await form.executeResolver('checkDuplicateName')
      console.log('Verificação de nome duplicado:', result)
    } catch (error) {
      console.error('Erro na verificação:', error)
    }
  }

  return {
    form,
    // Dados dos resolvers customizados
    emailValidation: form.resolve.validateEmail,
    duplicateCheck: form.resolve.checkDuplicateName,
    userStats: form.resolve.getUserStats,
    // Funções para executar resolvers
    validateEmail: handleValidateEmail,
    checkDuplicateName: handleCheckDuplicateName
  }
}

// Exemplo 4: Integração com react-hook-form
export function ReactHookFormIntegrationExample() {
  const form = useFetchForm<User>({
    id: null,
    resolvers: {
      create: async () => {
        // Lógica de criação
        return { id: 1, name: 'João', email: 'joao@email.com', age: 30 }
      }
    }
  })

  // Props para integração com react-hook-form
  const formProps = form.getFormProps()

  // Exemplo de como usar com react-hook-form:
  /*
  const { register, handleSubmit, setValue, watch, reset } = useForm({
    defaultValues: formProps.values
  })

  // Sincroniza mudanças do react-hook-form com o useFetchForm
  const watchedValues = watch()
  useEffect(() => {
    formProps.onChange(watchedValues)
  }, [watchedValues])

  const onSubmit = async (data) => {
    await formProps.onSubmit(data)
  }

  // Reset para dados originais
  const resetToOriginal = () => {
    if (form.originalData) {
      reset(form.originalData)
      form.resetToOriginal()
    }
  }
  */

  return {
    formProps,
    form,
    isDirty: form.isDirty,
    originalData: form.originalData
  }
}

// Exemplo 5: Formulário completo com todas as funcionalidades
export function CompleteUserFormExample(userId?: number) {
  const form = useFetchForm<User, {
    uploadAvatar: () => Promise<{ avatarUrl: string }>
    sendWelcomeEmail: () => Promise<{ sent: boolean }>
  }>({
    id: userId || null,
    resolvers: {
      get: userId ? async (id) => {
        const response = await fetch(`/api/users/${id}`)
        return response.json()
      } : undefined,
      
      create: async () => {
        const response = await fetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form.data)
        })
        return response.json()
      },
      
      // Update com nova assinatura (id, data)
      update: userId ? async (id, data) => {
        const response = await fetch(`/api/users/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        })
        return response.json()
      } : undefined,

      // Resolvers customizados
      uploadAvatar: async () => {
        // Simula upload de avatar
        return { avatarUrl: 'https://example.com/avatar.jpg' }
      },
      
      sendWelcomeEmail: async () => {
        // Simula envio de email
        return { sent: true }
      }
    },
    initialData: {
      name: '',
      email: '',
      age: 0
    },
    onSuccess: (data, action) => {
      console.log(`Usuário ${action === 'create' ? 'criado' : 'atualizado'}:`, data)
      
      // Se foi criação, envia email de boas-vindas
      if (action === 'create') {
        form.executeResolver('sendWelcomeEmail')
      }
    },
    onFailure: (error, action) => {
      console.error(`Erro ao ${action === 'create' ? 'criar' : 'atualizar'}:`, error)
    }
  })

  const handleUploadAvatar = async () => {
    try {
      const result = await form.executeResolver('uploadAvatar')
      console.log('Avatar enviado:', result)
    } catch (error) {
      console.error('Erro no upload:', error)
    }
  }

  return {
    // Dados e estados
    data: form.data,
    originalData: form.originalData, // Dados originais do get
    isLoading: form.isLoading,
    isSubmitting: form.isSubmitting,
    isDirty: form.isDirty, // Verifica se foi modificado
    
    // Erros
    submitError: form.submitError,
    loadError: form.loadError,
    
    // Funções principais
    updateData: form.updateData,
    submitForm: form.submitForm,
    resetData: form.resetData,
    resetToOriginal: form.resetToOriginal, // Reset para dados originais
    
    // Resolvers customizados
    uploadAvatar: handleUploadAvatar,
    avatarData: form.resolve.uploadAvatar,
    welcomeEmailData: form.resolve.sendWelcomeEmail,
    
    // Estados úteis
    isEditing: form.isEditing,
    isCreating: form.isCreating,
    
    // Para integração com outros gerenciadores
    getFormProps: form.getFormProps
  }
}

// Exemplo 6: Usando transformações de dados
export function TransformDataExample(userId?: number) {
  const form = useFetchForm<User>({
    id: userId || null,
    resolvers: {
      get: async (id) => {
        // API retorna dados em formato diferente
        const response = await fetch(`/api/users/${id}`)
        return response.json() as UserAPI
      },
      create: async () => {
        const response = await fetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form.data)
        })
        return response.json() as UserAPI
      },
      update: async (id, data) => {
        const response = await fetch(`/api/users/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        })
        return response.json() as UserAPI
      }
    },
    // Transforma dados da API para o formato do formulário
    transformData: (apiData: UserAPI) => ({
      id: apiData.id,
      name: apiData.full_name,
      email: apiData.email_address,
      age: apiData.user_age,
      createdAt: apiData.created_at,
      updatedAt: apiData.updated_at
    }),
    // Transforma dados do formulário para o formato da API
    transformSubmitData: (formData) => ({
      full_name: formData.name,
      email_address: formData.email,
      user_age: formData.age
    }),
    initialData: {
      name: '',
      email: '',
      age: 0
    }
  })

  return {
    data: form.data,
    isUpdateData: form.isUpdateData, // Para mostrar aviso de dados não salvos
    submitForm: form.submitForm,
    updateData: form.updateData
  }
}

// Exemplo 7: Verificador de alterações não salvas
export function UnsavedChangesExample() {
  const form = useFetchForm<User>({
    id: null,
    resolvers: {
      create: async () => {
        // Simula criação
        return { id: 1, name: 'João', email: 'joao@email.com', age: 30 }
      }
    },
    initialData: {
      name: '',
      email: '',
      age: 0
    }
  })

  // Componente de aviso para alterações não salvas
  const UnsavedChangesWarning = () => {
    if (!form.isUpdateData) return null
    
    return (
      <div style={{ 
        background: '#fff3cd', 
        border: '1px solid #ffeaa7', 
        padding: '10px', 
        borderRadius: '4px',
        marginBottom: '10px'
      }}>
        ⚠️ Existem alterações não salvas
      </div>
    )
  }

  // Hook para avisar antes de sair da página
  React.useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (form.isUpdateData) {
        e.preventDefault()
        e.returnValue = 'Existem alterações não salvas. Deseja realmente sair?'
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [form.isUpdateData])

  return {
    form,
    UnsavedChangesWarning,
    hasUnsavedChanges: form.isUpdateData
  }
}

// Exemplo 8: Transformações complexas com validação
export function ComplexTransformExample() {
  const form = useFetchForm<User>({
    id: null,
    resolvers: {
      create: async () => {
        const response = await fetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form.data)
        })
        return response.json()
      }
    },
    // Transforma e valida dados de entrada
    transformData: (data) => {
      return {
        ...data,
        // Garante que o nome sempre tenha primeira letra maiúscula
        name: data.name?.charAt(0).toUpperCase() + data.name?.slice(1).toLowerCase(),
        // Normaliza o email para minúsculas
        email: data.email?.toLowerCase(),
        // Garante que a idade seja um número válido
        age: Math.max(0, Math.min(120, data.age || 0))
      }
    },
    // Prepara dados para envio
    transformSubmitData: (data) => {
      return {
        ...data,
        // Remove espaços extras do nome
        name: data.name?.trim(),
        // Valida formato do email
        email: data.email?.trim().toLowerCase(),
        // Converte idade para número
        age: Number(data.age) || 0,
        // Adiciona timestamp
        submittedAt: new Date().toISOString()
      }
    },
    initialData: {
      name: '',
      email: '',
      age: 0
    }
  })

  return {
    data: form.data,
    isUpdateData: form.isUpdateData,
    submitForm: form.submitForm,
    updateData: form.updateData
  }
}

// Exemplo 9: Formulário com transformações e avisos
export function FormWithWarningsExample(userId?: number) {
  const form = useFetchForm<User, {
    validateData: () => Promise<{ isValid: boolean, errors: string[] }>
  }>({
    id: userId || null,
    resolvers: {
      get: userId ? async (id) => {
        const response = await fetch(`/api/users/${id}`)
        return response.json()
      } : undefined,
      
      create: async () => {
        const response = await fetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form.data)
        })
        return response.json()
      },
      
      update: userId ? async (id, data) => {
        const response = await fetch(`/api/users/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        })
        return response.json()
      } : undefined,

      // Resolver customizado para validação
      validateData: async () => {
        const response = await fetch('/api/validate-user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form.data)
        })
        return response.json()
      }
    },
    // Normaliza dados de entrada
    transformData: (data) => ({
      ...data,
      name: data.name?.trim(),
      email: data.email?.toLowerCase().trim(),
      age: Math.max(0, data.age || 0)
    }),
    // Prepara dados para envio
    transformSubmitData: (data) => ({
      ...data,
      name: data.name?.trim(),
      email: data.email?.toLowerCase().trim(),
      age: Number(data.age) || 0
    }),
    initialData: {
      name: '',
      email: '',
      age: 0
    },
    onSuccess: (data, action) => {
      console.log(`Usuário ${action === 'create' ? 'criado' : 'atualizado'} com sucesso`)
    }
  })

  const handleSubmitWithValidation = async () => {
    // Valida antes de enviar
    try {
      const validation = await form.executeResolver('validateData')
      if (!validation.isValid) {
        console.error('Dados inválidos:', validation.errors)
        return
      }
    } catch (error) {
      console.error('Erro na validação:', error)
      return
    }

    // Se válido, submete
    const result = await form.submitForm()
    if (result.success) {
      console.log('Formulário enviado com sucesso!')
    }
  }

  return {
    // Dados e estados
    data: form.data,
    originalData: form.originalData,
    isLoading: form.isLoading,
    isSubmitting: form.isSubmitting,
    
    // Verificadores de estado
    isDirty: form.isDirty,
    isUpdateData: form.isUpdateData, // Para avisos de dados não salvos
    
    // Funções
    updateData: form.updateData,
    submitForm: handleSubmitWithValidation,
    resetData: form.resetData,
    resetToOriginal: form.resetToOriginal,
    
    // Estados úteis
    isEditing: form.isEditing,
    isCreating: form.isCreating,
    
    // Dados de validação
    validationData: form.resolve.validateData
  }
}

// Exemplo 10: Hook personalizado para avisos de saída
export function useUnsavedChangesWarning(hasUnsavedChanges: boolean) {
  React.useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault()
        e.returnValue = 'Existem alterações não salvas. Deseja realmente sair?'
      }
    }

    const handlePopState = () => {
      if (hasUnsavedChanges) {
        const confirmLeave = window.confirm('Existem alterações não salvas. Deseja realmente sair?')
        if (!confirmLeave) {
          window.history.pushState(null, '', window.location.href)
        }
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    window.addEventListener('popstate', handlePopState)
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      window.removeEventListener('popstate', handlePopState)
    }
  }, [hasUnsavedChanges])
}

// Exemplo de uso do hook de aviso
export function FormWithNavigationWarning() {
  const form = useFetchForm<User>({
    id: null,
    resolvers: {
      create: async () => ({ id: 1, name: 'Test', email: 'test@email.com', age: 25 })
    }
  })

  // Usa o hook de aviso personalizado
  useUnsavedChangesWarning(form.isUpdateData)

  return {
    form,
    hasUnsavedChanges: form.isUpdateData
  }
}

// Exemplo 1: Usando funções otimizadas para chaves específicas
export function OptimizedKeyManagementExample() {
  const form = useFetchForm<User>({
    id: null,
    resolvers: {
      create: async () => {
        return { id: 1, name: 'João', email: 'joao@email.com', age: 30 }
      }
    },
    initialData: {
      name: '',
      email: '',
      age: 0
    }
  })

  // Funções otimizadas para manipular chaves específicas
  const handleNameChange = (newName: string) => {
    // Atualiza apenas a chave 'name' - mais eficiente que updateData
    form.updateDataKey('name', newName)
  }

  const handleEmailChange = (newEmail: string) => {
    // Atualiza apenas a chave 'email'
    form.updateDataKey('email', newEmail)
  }

  const handleAgeChange = (newAge: number) => {
    // Atualiza apenas a chave 'age'
    form.updateDataKey('age', newAge)
  }

  // Obtém valores específicos sem acessar todo o objeto data
  const getCurrentName = () => form.getDataKey('name')
  const getCurrentEmail = () => form.getDataKey('email')
  const getOriginalName = () => form.getOriginalDataKey('name')

  // Exemplo de uso em um componente
  const FormComponent = () => {
    const currentName = form.getDataKey('name')
    const originalName = form.getOriginalDataKey('name')
    const hasNameChanged = currentName !== originalName

    return {
      currentName,
      originalName,
      hasNameChanged,
      // isUpdateData é otimizado e só recalcula quando necessário
      hasUnsavedChanges: form.isUpdateData
    }
  }

  return {
    form,
    handlers: {
      handleNameChange,
      handleEmailChange,
      handleAgeChange
    },
    getters: {
      getCurrentName,
      getCurrentEmail,
      getOriginalName
    },
    FormComponent,
    // Estados otimizados - não recalculam a cada render
    isDirty: form.isDirty,
    isUpdateData: form.isUpdateData
  }
}

// Exemplo 2: Performance otimizada para formulários grandes
export function LargeFormOptimizedExample() {
  interface LargeFormData {
    personalInfo: {
      firstName: string
      lastName: string
      email: string
      phone: string
    }
    address: {
      street: string
      city: string
      state: string
      zipCode: string
    }
    preferences: {
      newsletter: boolean
      notifications: boolean
      theme: 'light' | 'dark'
    }
  }

  const form = useFetchForm<LargeFormData>({
    id: null,
    resolvers: {
      create: async () => {
        return {
          personalInfo: { firstName: 'João', lastName: 'Silva', email: 'joao@email.com', phone: '123456789' },
          address: { street: 'Rua A', city: 'São Paulo', state: 'SP', zipCode: '01000-000' },
          preferences: { newsletter: true, notifications: false, theme: 'light' as const }
        }
      }
    },
    initialData: {
      personalInfo: { firstName: '', lastName: '', email: '', phone: '' },
      address: { street: '', city: '', state: '', zipCode: '' },
      preferences: { newsletter: false, notifications: false, theme: 'light' as const }
    }
  })

  // Atualização otimizada de seções específicas
  const updatePersonalInfo = (info: Partial<LargeFormData['personalInfo']>) => {
    const currentPersonalInfo = form.getDataKey('personalInfo') || {}
    form.updateDataKey('personalInfo', { ...currentPersonalInfo, ...info })
  }

  const updateAddress = (address: Partial<LargeFormData['address']>) => {
    const currentAddress = form.getDataKey('address') || {}
    form.updateDataKey('address', { ...currentAddress, ...address })
  }

  const updatePreferences = (prefs: Partial<LargeFormData['preferences']>) => {
    const currentPrefs = form.getDataKey('preferences') || {}
    form.updateDataKey('preferences', { ...currentPrefs, ...prefs })
  }

  // Getters otimizados para seções específicas
  const getPersonalInfo = () => form.getDataKey('personalInfo')
  const getAddress = () => form.getDataKey('address')
  const getPreferences = () => form.getDataKey('preferences')

  return {
    form,
    // Funções otimizadas para seções
    updatePersonalInfo,
    updateAddress,
    updatePreferences,
    // Getters otimizados
    getPersonalInfo,
    getAddress,
    getPreferences,
    // Estados otimizados - calculados apenas quando data/originalData mudam
    hasUnsavedChanges: form.isUpdateData,
    isDirty: form.isDirty
  }
}

// Exemplo 3: Comparação de performance - antes e depois
export function PerformanceComparisonExample() {
  const form = useFetchForm<User>({
    id: 1,
    resolvers: {
      get: async () => ({ id: 1, name: 'João', email: 'joao@email.com', age: 30 }),
      update: async (id, data) => ({ ...data, id } as User)
    }
  })

  // ❌ ANTES - Ineficiente (recalcula a cada render)
  const BadExample = () => {
    // Isso seria recalculado a cada render se não fosse otimizado
    const hasChanges = form.data.name !== form.originalData?.name ||
                      form.data.email !== form.originalData?.email ||
                      form.data.age !== form.originalData?.age

    return { hasChanges }
  }

  // ✅ DEPOIS - Eficiente (usa valores otimizados)
  const GoodExample = () => {
    // isUpdateData é calculado apenas quando data ou originalData mudam
    const hasChanges = form.isUpdateData
    
    // Acesso otimizado a chaves específicas
    const currentName = form.getDataKey('name')
    const originalName = form.getOriginalDataKey('name')
    const nameChanged = currentName !== originalName

    return { hasChanges, nameChanged }
  }

  // Exemplo de atualização otimizada
  const handleOptimizedUpdate = (field: keyof User, value: unknown) => {
    // Atualiza apenas a chave específica, não o objeto inteiro
    form.updateDataKey(field, value)
  }

  return {
    form,
    BadExample,
    GoodExample,
    handleOptimizedUpdate,
    // Estados otimizados
    isUpdateData: form.isUpdateData, // Só recalcula quando necessário
    isDirty: form.isDirty // Só recalcula quando necessário
  }
}

// Exemplo 4: Refresh manual do isUpdateData
export function ManualRefreshExample() {
  const form = useFetchForm<User>({
    id: null,
    resolvers: {
      create: async () => ({ id: 1, name: 'João', email: 'joao@email.com', age: 30 })
    }
  })

  // Cenário onde você pode precisar forçar recálculo
  const handleComplexDataManipulation = () => {
    // Se você fizer manipulações complexas que não triggam o useMemo
    const currentData = { ...form.data }
    
    // Alguma lógica complexa que modifica currentData
    currentData.name = currentData.name?.toUpperCase()
    
    // Atualiza os dados
    form.updateData(currentData)
    
    // Se por algum motivo o isUpdateData não foi recalculado corretamente,
    // você pode forçar o recálculo (raramente necessário)
    if (form.isUpdateData === false && /* alguma condição */ true) {
      form.refreshUpdateDataCheck()
    }
  }

  return {
    form,
    handleComplexDataManipulation,
    refreshCheck: form.refreshUpdateDataCheck
  }
}

// Exemplo 5: Hook personalizado otimizado para avisos
export function useOptimizedUnsavedWarning(hasUnsavedChanges: boolean) {
  React.useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault()
        e.returnValue = 'Existem alterações não salvas. Deseja realmente sair?'
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [hasUnsavedChanges]) // Só re-executa quando hasUnsavedChanges muda
} 