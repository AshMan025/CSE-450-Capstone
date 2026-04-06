import React from 'react';
import { Bot, Zap, BrainCircuit, CheckCircle } from 'lucide-react';

const LLMGuidance: React.FC = () => {
  return (
    <div className="glass-panel animate-fade-in" style={{ padding: '2rem', marginTop: '2rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
        <Bot size={28} color="var(--color-primary)" />
        <h3 style={{ margin: 0 }}>Model Selection Guide</h3>
      </div>

      <p style={{ color: 'var(--color-text-secondary)', marginBottom: '2rem' }}>
        Choose the best AI model for your specific marking needs to optimize accuracy and performance.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>

        <div style={{ background: 'var(--guide-card-bg)', padding: '1.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <Zap size={20} color="#f59e0b" />
            <h4 style={{ margin: 0, color: 'var(--color-text-primary)' }}>Gemini 1.5 Flash</h4>
            <span className="badge badge-success" style={{ marginLeft: 'auto', fontSize: '0.65rem' }}>Fastest</span>
          </div>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
            <li style={{ marginBottom: '0.5rem', display: 'flex', gap: '0.5rem' }}><CheckCircle size={16} color="var(--color-success)" /> Best for Multiple Choice (MCQs)</li>
            <li style={{ marginBottom: '0.5rem', display: 'flex', gap: '0.5rem' }}><CheckCircle size={16} color="var(--color-success)" /> Best for Short Form Answers</li>
            <li style={{ display: 'flex', gap: '0.5rem' }}><CheckCircle size={16} color="var(--color-success)" /> High volume evaluation</li>
          </ul>
        </div>

        <div style={{ background: 'var(--guide-card-bg)', padding: '1.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <BrainCircuit size={20} color="#818cf8" />
            <h4 style={{ margin: 0, color: 'var(--color-text-primary)' }}>Gemini 1.5 Pro</h4>
            <span className="badge badge-primary" style={{ marginLeft: 'auto', fontSize: '0.65rem' }}>Smartest</span>
          </div>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
            <li style={{ marginBottom: '0.5rem', display: 'flex', gap: '0.5rem' }}><CheckCircle size={16} color="var(--color-success)" /> Best for Long Essays</li>
            <li style={{ marginBottom: '0.5rem', display: 'flex', gap: '0.5rem' }}><CheckCircle size={16} color="var(--color-success)" /> Nuanced Reasoning tasks</li>
            <li style={{ display: 'flex', gap: '0.5rem' }}><CheckCircle size={16} color="var(--color-success)" /> Detailed conversational feedback</li>
          </ul>
        </div>

      </div>

      <div style={{ marginTop: '2rem', padding: '1rem', background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.2)', borderRadius: 'var(--radius-md)', fontSize: '0.875rem' }}>
        <strong>💡 Note on Fallbacks:</strong> If the primary model becomes unavailable (due to rate limits or API outage), the system will automatically fall back to the next model in your defined chain to ensure evaluations complete successfully.
      </div>
    </div>
  );
};

export default LLMGuidance;
