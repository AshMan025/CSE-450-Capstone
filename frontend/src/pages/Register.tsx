import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../utils/api';
import { UserPlus } from 'lucide-react';

const Register: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'student' | 'teacher'>('student');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await api.post('/auth/register', { name, email, password, role });
      // Successfully registered, now redirect to login
      navigate('/login', { state: { message: 'Registration successful! Please login.' } });
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
      <div className="glass-panel animate-fade-in" style={{ padding: '2.5rem', width: '100%', maxWidth: '450px' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ display: 'inline-flex', background: 'var(--color-surface-hover)', padding: '1rem', borderRadius: '50%', marginBottom: '1rem' }}>
            <UserPlus size={32} color="var(--color-secondary)" />
          </div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 700 }}>Create Account</h2>
          <p>Join the Exam Evaluation platform</p>
        </div>

        {error && (
          <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--color-error)', padding: '0.75rem', borderRadius: '0.5rem', marginBottom: '1.5rem', fontSize: '0.875rem', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="name">Full Name</label>
            <input
              id="name"
              type="text"
              className="form-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="John Doe"
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="email">Email Address</label>
            <input
              id="email"
              type="email"
              className="form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              minLength={6}
            />
          </div>

          <div className="form-group" style={{ marginBottom: '1.5rem' }}>
            <label className="form-label">I am a...</label>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
              <label style={{ flex: 1, display: 'flex', alignItems: 'center', padding: '0.75rem', border: `1px solid ${role === 'student' ? 'var(--color-primary)' : 'var(--color-border)'}`, borderRadius: 'var(--radius-md)', cursor: 'pointer', background: role === 'student' ? 'rgba(99, 102, 241, 0.1)' : 'transparent', transition: 'all 0.2s' }}>
                <input
                  type="radio"
                  name="role"
                  value="student"
                  checked={role === 'student'}
                  onChange={() => setRole('student')}
                  style={{ marginRight: '0.5rem' }}
                />
                Student
              </label>
              <label style={{ flex: 1, display: 'flex', alignItems: 'center', padding: '0.75rem', border: `1px solid ${role === 'teacher' ? 'var(--color-secondary)' : 'var(--color-border)'}`, borderRadius: 'var(--radius-md)', cursor: 'pointer', background: role === 'teacher' ? 'rgba(236, 72, 153, 0.1)' : 'transparent', transition: 'all 0.2s' }}>
                <input
                  type="radio"
                  name="role"
                  value="teacher"
                  checked={role === 'teacher'}
                  onChange={() => setRole('teacher')}
                  style={{ marginRight: '0.5rem' }}
                />
                Teacher
              </label>
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', padding: '0.75rem', background: 'linear-gradient(135deg, var(--color-secondary), var(--color-primary))' }}
            disabled={loading}
          >
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <div style={{ marginTop: '2rem', textAlign: 'center', fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
          Already have an account? <Link to="/login" style={{ color: 'var(--color-secondary)', textDecoration: 'none', fontWeight: 500 }}>Sign in</Link>
        </div>
      </div>
    </div>
  );
};

export default Register;
