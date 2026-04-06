import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, Trash2, CheckCircle, XCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';

interface APIKeyEntry {
  id: number;
  provider: string;
  model_name: string;
  masked_key: string;
  is_valid: string;
  last_tested_at?: string;
  error_message?: string;
  created_at: string;
  updated_at: string;
}

const PROVIDERS = [
  { label: 'OpenAI', value: 'openai', models: ['gpt-4o-mini', 'gpt-4.1-nano', 'gpt-4.1-mini', 'gpt-4o', 'gpt-4.1', 'gpt-4-turbo'] },
  { label: 'Google Gemini', value: 'gemini', models: ['gemini-2.0-flash', 'gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-pro'] },
  { label: 'Anthropic Claude', value: 'claude', models: ['claude-3-5-sonnet-20240620', 'claude-3-opus-20240229', 'claude-3-sonnet-20240229', 'claude-3-haiku-20240307'] },
  { label: 'Mistral', value: 'mistral', models: ['mistral-large', 'mistral-medium', 'mistral-small'] },
  { label: 'Cohere', value: 'cohere', models: ['command', 'command-light', 'command-nightly'] },
];

const APIKeyManagement: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [keys, setKeys] = useState<APIKeyEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [testingId, setTestingId] = useState<number | null>(null);

  // Form state
  const [selectedProvider, setSelectedProvider] = useState('openai');
  const [selectedModel, setSelectedModel] = useState('gpt-4');
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  const fetchKeys = async () => {
    try {
      const res = await api.get<APIKeyEntry[]>('/llm/api-keys');
      setKeys(res.data);
    } catch (err) {
      console.error('Failed to fetch API keys:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKeys();
  }, []);

  const handleSaveKey = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    if (!apiKeyInput.trim()) {
      setFormError('Please enter an API key');
      return;
    }

    try {
      await api.post('/llm/api-keys', {
        provider: selectedProvider,
        model_name: selectedModel,
        api_key: apiKeyInput,
      });

      setFormSuccess('✓ API key saved successfully!');
      setApiKeyInput('');
      setShowForm(false);
      fetchKeys();
    } catch (err: any) {
      setFormError(err.response?.data?.detail || 'Failed to save API key');
    }
  };

  const handleTestKey = async (keyId: number) => {
    const key = keys.find(k => k.id === keyId);
    if (!key) return;

    setTestingId(keyId);
    // Optimistically mark as running so UI updates immediately
    setKeys(prev => prev.map(k => k.id === keyId ? { ...k, is_valid: 'running', error_message: undefined } : k));
    try {
      // For now, test with an empty request to the backend (it will test the saved key)
      // In production, you'd want to test the key without sending it again
      // Since we have the provider and model, we'd fetch from DB and test
      await api.post('/llm/api-keys/test', {
        provider: key.provider,
        model_name: key.model_name,
        api_key: '', // Backend will fetch from DB instead
      });

      // Refresh the list to update final test status
      fetchKeys();
    } catch (err: any) {
      console.error('Test failed:', err);
    } finally {
      setTestingId(null);
    }
  };

  const handleDeleteKey = async (keyId: number) => {
    if (!window.confirm('Are you sure you want to delete this API key?')) return;

    try {
      await api.delete(`/llm/api-keys/${keyId}`);
      setFormSuccess('✓ API key deleted successfully');
      fetchKeys();
    } catch (err: any) {
      setFormError(err.response?.data?.detail || 'Failed to delete API key');
    }
  };

  const currentProvider = PROVIDERS.find(p => p.value === selectedProvider);
  const availableModels = currentProvider?.models || [];

  if (!user || user.role !== 'teacher') {
    return <div>Access denied. Teachers only.</div>;
  }

  return (
    <div className="animate-fade-in">
      <button
        onClick={() => navigate('/dashboard')}
        className="btn btn-secondary"
        style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
      >
        <ArrowLeft size={16} /> Back to Dashboard
      </button>

      <div className="glass-panel" style={{ padding: '2rem', marginBottom: '2rem' }}>
        <h1 style={{ margin: 0, marginBottom: '0.5rem' }}>LLM API Key Management</h1>
        <p style={{ opacity: 0.7, marginTop: 0 }}>Add and manage your LLM provider API keys for automated evaluations.</p>
      </div>

      {formError && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          padding: '1rem',
          borderRadius: 'var(--radius-md)',
          color: '#ef4444',
          marginBottom: '1.5rem'
        }}>
          {formError}
        </div>
      )}

      {formSuccess && (
        <div style={{
          background: 'rgba(16, 185, 129, 0.1)',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          padding: '1rem',
          borderRadius: 'var(--radius-md)',
          color: '#10b981',
          marginBottom: '1.5rem'
        }}>
          {formSuccess}
        </div>
      )}

      {!showForm && (
        <button
          className="btn btn-primary"
          onClick={() => setShowForm(true)}
          style={{ marginBottom: '2rem' }}
        >
          + Add New API Key
        </button>
      )}

      {showForm && (
        <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
          <h3 style={{ marginTop: 0 }}>Add API Key</h3>
          <form onSubmit={handleSaveKey}>
            <div className="form-group">
              <label className="form-label">Provider</label>
              <select
                className="form-input"
                value={selectedProvider}
                onChange={(e) => {
                  setSelectedProvider(e.target.value);
                  // Reset model to first available
                  const newProvider = PROVIDERS.find(p => p.value === e.target.value);
                  if (newProvider) setSelectedModel(newProvider.models[0]);
                }}
              >
                {PROVIDERS.map(p => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Model</label>
              <select
                className="form-input"
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
              >
                {availableModels.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">API Key</label>
              <input
                type="password"
                className="form-input"
                placeholder="Paste your API key here"
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
              />
              <small style={{ opacity: 0.7, marginTop: '0.5rem', display: 'block' }}>
                Your API key will be encrypted and stored securely.
              </small>
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <button type="submit" className="btn btn-primary">Save Key</button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setShowForm(false);
                  setApiKeyInput('');
                  setFormError('');
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <p>Loading API keys...</p>
      ) : keys.length === 0 ? (
        <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
          <p style={{ opacity: 0.7 }}>No API keys configured yet. Add one to get started.</p>
        </div>
      ) : (
        <div className="glass-panel" style={{ padding: '0', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ background: 'rgba(255,255,255,0.05)' }}>
              <tr>
                <th style={{ padding: '1rem', textAlign: 'left' }}>Provider</th>
                <th style={{ padding: '1rem', textAlign: 'left' }}>Model</th>
                <th style={{ padding: '1rem', textAlign: 'left' }}>Status</th>
                <th style={{ padding: '1rem', textAlign: 'left' }}>Last Tested</th>
                <th style={{ padding: '1rem', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {keys.map(key => (
                <tr key={key.id} style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '1rem' }}>
                    <span style={{ textTransform: 'capitalize', fontWeight: 500 }}>{key.provider}</span>
                  </td>
                  <td style={{ padding: '1rem' }}>{key.model_name}</td>
                  <td style={{ padding: '1rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {key.is_valid === 'valid' ? (
                          <>
                            <CheckCircle size={16} color="var(--color-success)" />
                            <span style={{ color: 'var(--color-success)' }}>Valid</span>
                          </>
                        ) : key.is_valid === 'running' ? (
                          <>
                            <span style={{ color: 'var(--color-info)' }}>Running</span>
                          </>
                        ) : key.is_valid === 'invalid' || key.is_valid === 'quota_exceeded' || key.is_valid === 'network_error' ? (
                          <>
                            <XCircle size={16} color="var(--color-error)" />
                            <span style={{ color: 'var(--color-error)', fontSize: '0.9rem' }}>
                              {key.is_valid === 'quota_exceeded' ? 'Quota Exceeded' : (key.is_valid === 'network_error' ? 'Network Error' : 'Invalid')}
                            </span>
                          </>
                        ) : (
                          <span style={{ color: 'var(--color-warning)' }}>Untested</span>
                        )}
                      </div>
                      {key.error_message && (
                        <div style={{ fontSize: '0.85rem', color: 'var(--color-muted)', opacity: 0.9 }}>
                          {key.error_message}
                        </div>
                      )}
                    </div>
                  </td>
                  <td style={{ padding: '1rem', opacity: 0.7, fontSize: '0.9rem' }}>
                    {key.last_tested_at ? new Date(key.last_tested_at).toLocaleString() : '—'}
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                      <button
                        className="btn btn-secondary"
                        style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem' }}
                        onClick={() => handleTestKey(key.id)}
                        disabled={testingId === key.id}
                      >
                        {testingId === key.id ? 'Testing...' : 'Test'}
                      </button>
                      <button
                        className="btn btn-secondary"
                        style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem' }}
                        onClick={() => handleDeleteKey(key.id)}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default APIKeyManagement;
