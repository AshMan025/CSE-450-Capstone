import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  getMarkBySubmission,
  overrideMark,
  publishMark
} from '../utils/services';
import type { Mark } from '../utils/services';
import {
  ArrowLeft,
  Save,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

const EvaluationView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [mark, setMark] = useState<Mark | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [score, setScore] = useState<number>(0);
  const [isPublished, setIsPublished] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;
      try {
        const res = await getMarkBySubmission(Number(id));
        const currentMark = res.data;

        if (currentMark) {
          setMark(currentMark);
          setScore(currentMark.final_score);
          setIsPublished(currentMark.is_published);
        }
      } catch (err: any) {
        if (err.response?.status === 404) {
          setError('Evaluation results not found yet. It may still be processing.');
        } else if (err.response?.status === 403) {
          setError('Mark not yet published or you are not authorized.');
        } else {
          setError('Failed to fetch marks');
        }
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const handleUpdate = async () => {
    if (!mark) return;
    try {
      await overrideMark(mark.id, { final_score: score, teacher_override: { comment: 'Teacher reviewed results.' } });
      await publishMark(mark.id, isPublished);
      alert('Marks updated and saved!');
    } catch (err) {
      alert('Failed to update marks');
    }
  };

  if (loading) return <div>Loading evaluation...</div>;

  return (
    <div className="animate-fade-in">
      <button onClick={() => navigate(-1)} className="btn btn-secondary" style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <ArrowLeft size={16} /> Back
      </button>

      {error ? (
        <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
          <AlertCircle size={48} color="var(--color-danger)" style={{ marginBottom: '1rem' }} />
          <h3>{error}</h3>
        </div>
      ) : mark && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '2rem' }}>
          <div className="glass-panel" style={{ padding: '2rem' }}>
            <h2>AI Evaluation Result</h2>
            <div style={{ marginTop: '2rem' }}>
              <h4 style={{ color: 'var(--color-primary)' }}>Raw JSON Output</h4>
              <pre style={{
                background: 'rgba(0,0,0,0.3)',
                padding: '1rem',
                borderRadius: 'var(--radius-md)',
                maxHeight: '400px',
                overflow: 'auto'
              }}>
                {JSON.stringify(mark.base_result, null, 2)}
              </pre>
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '2rem' }}>
            <h3>Teacher Actions</h3>
            <div className="form-group" style={{ marginTop: '2rem' }}>
              <label className="form-label">Final Score</label>
              <input
                type="number"
                className="form-input"
                disabled={user?.role !== 'teacher'}
                value={score}
                onChange={e => setScore(Number(e.target.value))}
              />
            </div>

            {user?.role === 'teacher' && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
                  <input
                    type="checkbox"
                    id="published"
                    checked={isPublished}
                    onChange={e => setIsPublished(e.target.checked)}
                  />
                  <label htmlFor="published" className="form-label" style={{ marginBottom: 0 }}>Publish Mark to Student</label>
                </div>

                <button className="btn btn-primary" style={{ width: '100%' }} onClick={handleUpdate}>
                  <Save size={18} /> Save & {isPublished ? 'Publish' : 'Retain'}
                </button>
              </>
            )}

            {user?.role === 'student' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '1rem' }}>
                <CheckCircle size={18} color="var(--color-success)" />
                <span>Mark is {mark.is_published ? 'Published' : 'Under Review'}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default EvaluationView;
