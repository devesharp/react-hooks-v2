import React from 'react';
import { useViewForm } from './useViewForm';

// Simulação de API
const api = {
  // Buscar usuário específico por ID (para edição)
  getUser: async (id: number) => {
    console.log(`Buscando usuário ${id}...`);
    return {
      id,
      name: `Usuário ${id}`,
      email: `user${id}@example.com`,
      role: 'user',
    };
  },

  // Buscar dados padrão do formulário (sem ID)
  getDefaultUserData: async () => {
    console.log('Carregando dados padrão...');
    return {
      role: 'user', // Role padrão
      country: 'BR', // País padrão
      language: 'pt-BR', // Idioma padrão
    };
  },

  // Buscar configurações do sistema
  getSystemSettings: async () => {
    console.log('Carregando configurações do sistema...');
    return {
      allowRegistration: true,
      maxFileSize: 10485760, // 10MB
      supportedFormats: ['jpg', 'png', 'pdf'],
    };
  },

  // Criar usuário
  createUser: async (data: UserFormData) => {
    console.log('Criando usuário:', data);
    return { id: Date.now(), ...data };
  },

  // Atualizar usuário
  updateUser: async (id: number, data: UserFormData) => {
    console.log(`Atualizando usuário ${id}:`, data);
    return { id, ...data };
  },
};

interface UserFormData {
  id?: number;
  name: string;
  email: string;
  role: string;
  country?: string;
  language?: string;
}

interface SystemSettings {
  allowRegistration: boolean;
  maxFileSize: number;
  supportedFormats: string[];
}

// Exemplo 1: Formulário de usuário com edição (resolveGetById)
export function UserEditForm({ userId }: { userId?: number }) {
  const viewForm = useViewForm<UserFormData, number>({
    id: userId,
    // Quando há ID, usa resolveGetById para buscar dados específicos
    resolveGetById: (id) => api.getUser(id),
    // Quando não há ID, usa resolveGet para dados padrão
    resolveGet: () => api.getDefaultUserData(),
    resolveCreate: (data) => api.createUser(data),
    resolveUpdate: (id, data) => api.updateUser(id, data),
    onSuccess: (result, isCreating) => {
      console.log(isCreating ? 'Usuário criado!' : 'Usuário atualizado!', result);
    },
  });

  return (
    <div>
      <h2>{viewForm.isEditing ? 'Editar Usuário' : 'Novo Usuário'}</h2>
      
      {viewForm.isLoading && <p>Carregando...</p>}
      
      <form onSubmit={(e) => { e.preventDefault(); viewForm.submitForm(); }}>
        <div>
          <label>Nome:</label>
          <input
            value={viewForm.getField('name') || ''}
            onChange={(e) => viewForm.setField('name', e.target.value)}
            placeholder="Digite o nome"
          />
        </div>

        <div>
          <label>Email:</label>
          <input
            type="email"
            value={viewForm.getField('email') || ''}
            onChange={(e) => viewForm.setField('email', e.target.value)}
            placeholder="Digite o email"
          />
        </div>

        <div>
          <label>Role:</label>
          <select
            value={viewForm.getField('role') || ''}
            onChange={(e) => viewForm.setField('role', e.target.value)}
          >
            <option value="">Selecione...</option>
            <option value="user">Usuário</option>
            <option value="admin">Administrador</option>
          </select>
        </div>

        <div>
          <label>País:</label>
          <input
            value={viewForm.getField('country') || ''}
            onChange={(e) => viewForm.setField('country', e.target.value)}
            placeholder="País"
          />
        </div>

        <button type="submit" disabled={viewForm.isSaving}>
          {viewForm.isSaving ? 'Salvando...' : (viewForm.isEditing ? 'Atualizar' : 'Criar')}
        </button>
      </form>

      <div>
        <h3>Debug Info:</h3>
        <p>Modo: {viewForm.isEditing ? 'Edição' : 'Criação'}</p>
        <p>ID: {userId || 'Nenhum'}</p>
        <p>Dados atuais: {JSON.stringify(viewForm.resource, null, 2)}</p>
      </div>
    </div>
  );
}

// Exemplo 2: Formulário de configurações (apenas resolveGet)
export function SystemSettingsForm() {
  const viewForm = useViewForm<SystemSettings>({
    // Sem ID, sempre usa resolveGet para carregar configurações
    resolveGet: () => api.getSystemSettings(),
    resolveCreate: (data) => {
      console.log('Salvando configurações:', data);
      return Promise.resolve(data);
    },
    onSuccess: (result) => {
      console.log('Configurações salvas!', result);
    },
  });

  return (
    <div>
      <h2>Configurações do Sistema</h2>
      
      {viewForm.isLoading && <p>Carregando configurações...</p>}
      
      <form onSubmit={(e) => { e.preventDefault(); viewForm.submitForm(); }}>
        <div>
          <label>
            <input
              type="checkbox"
              checked={viewForm.getField('allowRegistration') || false}
              onChange={(e) => viewForm.setField('allowRegistration', e.target.checked)}
            />
            Permitir registro de novos usuários
          </label>
        </div>

        <div>
          <label>Tamanho máximo de arquivo (bytes):</label>
          <input
            type="number"
            value={viewForm.getField('maxFileSize') || ''}
            onChange={(e) => viewForm.setField('maxFileSize', Number(e.target.value))}
          />
        </div>

        <div>
          <label>Formatos suportados (separados por vírgula):</label>
          <input
            value={viewForm.getField('supportedFormats')?.join(', ') || ''}
            onChange={(e) => viewForm.setField('supportedFormats', e.target.value.split(', '))}
            placeholder="jpg, png, pdf"
          />
        </div>

        <button type="submit" disabled={viewForm.isSaving}>
          {viewForm.isSaving ? 'Salvando...' : 'Salvar Configurações'}
        </button>
      </form>

      <div>
        <h3>Configurações Atuais:</h3>
        <pre>{JSON.stringify(viewForm.resource, null, 2)}</pre>
      </div>
    </div>
  );
}

// Exemplo 3: Demonstração da prioridade de resolvers
export function ResolverPriorityDemo() {
  const [userId, setUserId] = React.useState<number | undefined>();
  const [showBothResolvers, setShowBothResolvers] = React.useState(false);

  const viewForm = useViewForm<UserFormData, number>({
    id: userId,
    // Quando há ID e ambos os resolvers, resolveGetById tem prioridade
    resolveGetById: showBothResolvers ? (id) => {
      console.log('🎯 Usando resolveGetById para ID:', id);
      return api.getUser(id);
    } : undefined,
    // resolveGet é usado quando não há resolveGetById ou quando não há ID
    resolveGet: () => {
      console.log('📋 Usando resolveGet para dados padrão');
      return api.getDefaultUserData();
    },
  });

  return (
    <div>
      <h2>Demonstração de Prioridade de Resolvers</h2>
      
      <div style={{ marginBottom: '20px', padding: '10px', border: '1px solid #ccc' }}>
        <h3>Controles:</h3>
        <div>
          <label>
            ID do usuário:
            <input
              type="number"
              value={userId || ''}
              onChange={(e) => setUserId(e.target.value ? Number(e.target.value) : undefined)}
              placeholder="Digite um ID ou deixe vazio"
            />
          </label>
        </div>
        <div>
          <label>
            <input
              type="checkbox"
              checked={showBothResolvers}
              onChange={(e) => setShowBothResolvers(e.target.checked)}
            />
            Incluir resolveGetById
          </label>
        </div>
      </div>

      <div style={{ marginBottom: '20px', padding: '10px', backgroundColor: '#f5f5f5' }}>
        <h3>Situação Atual:</h3>
        <p><strong>ID:</strong> {userId || 'Nenhum'}</p>
        <p><strong>resolveGetById:</strong> {showBothResolvers ? '✅ Definido' : '❌ Não definido'}</p>
        <p><strong>resolveGet:</strong> ✅ Sempre definido</p>
        
        <h4>Resolver que será usado:</h4>
        {userId && showBothResolvers ? (
          <p style={{ color: 'green' }}>🎯 <strong>resolveGetById</strong> (prioridade quando há ID)</p>
        ) : (
          <p style={{ color: 'blue' }}>📋 <strong>resolveGet</strong> (fallback ou padrão)</p>
        )}
      </div>

      <div>
        <h3>Dados Carregados:</h3>
        {viewForm.isLoading ? (
          <p>Carregando...</p>
        ) : (
          <pre>{JSON.stringify(viewForm.resource, null, 2)}</pre>
        )}
      </div>

      <button onClick={() => viewForm.reloadPage()}>
        Recarregar Dados
      </button>
    </div>
  );
}

// Exemplo de uso completo
export function UseViewFormExamples() {
  const [activeExample, setActiveExample] = React.useState<'edit' | 'settings' | 'priority'>('edit');
  const [editUserId, setEditUserId] = React.useState<number | undefined>(1);

  return (
    <div style={{ padding: '20px' }}>
      <h1>Exemplos useViewForm - resolveGet vs resolveGetById</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <button 
          onClick={() => setActiveExample('edit')}
          style={{ marginRight: '10px', backgroundColor: activeExample === 'edit' ? '#007bff' : '#f8f9fa' }}
        >
          Formulário de Usuário
        </button>
        <button 
          onClick={() => setActiveExample('settings')}
          style={{ marginRight: '10px', backgroundColor: activeExample === 'settings' ? '#007bff' : '#f8f9fa' }}
        >
          Configurações do Sistema
        </button>
        <button 
          onClick={() => setActiveExample('priority')}
          style={{ backgroundColor: activeExample === 'priority' ? '#007bff' : '#f8f9fa' }}
        >
          Demonstração de Prioridade
        </button>
      </div>

      {activeExample === 'edit' && (
        <div>
          <div style={{ marginBottom: '20px' }}>
            <label>
              ID do usuário para edição (deixe vazio para criar novo):
              <input
                type="number"
                value={editUserId || ''}
                onChange={(e) => setEditUserId(e.target.value ? Number(e.target.value) : undefined)}
                placeholder="ID do usuário"
              />
            </label>
          </div>
          <UserEditForm userId={editUserId} />
        </div>
      )}

      {activeExample === 'settings' && <SystemSettingsForm />}
      
      {activeExample === 'priority' && <ResolverPriorityDemo />}
    </div>
  );
}

export default UseViewFormExamples; 