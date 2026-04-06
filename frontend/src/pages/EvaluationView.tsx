import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  getMarkBySubmission,
  overrideMark,
  publishMark,
  updateSubmissionStatus
} from '../utils/services';
import type { Mark } from '../utils/services';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import {
  ArrowLeft,
  Save,
  CheckCircle,
  AlertCircle,
  FileText
} from 'lucide-react';

interface EvaluationBreakdownItem {
  question: string;
  score: number;
  max: number;
  feedback: string;
}

interface EvaluationResult {
  student_id?: string;
  total_score?: number;
  max_score?: number;
  breakdown?: EvaluationBreakdownItem[];
  overall_feedback?: string;
}

const buildMarkdownFromResult = (result: EvaluationResult | null): string => {
  if (!result) return 'No evaluation available.';
  const lines: string[] = [];

  lines.push(`# Evaluation Report`);
  if (result.student_id) {
    lines.push(`**Student ID:** ${result.student_id}`);
  }
  if (typeof result.total_score === 'number' && typeof result.max_score === 'number') {
    lines.push(`**Total Score:** ${result.total_score} / ${result.max_score}`);
  }
  lines.push('');

  if (result.overall_feedback) {
    lines.push(`## Overall Feedback`);
    lines.push(result.overall_feedback);
    lines.push('');
  }

  if (result.breakdown && result.breakdown.length > 0) {
    lines.push(`## Question-wise Evaluation`);
    result.breakdown.forEach((item, index) => {
      lines.push(`### Q${index + 1}. ${item.question}`);
      lines.push(`**Marks:** ${item.score} / ${item.max}`);
      lines.push('');
      if (item.feedback) {
        lines.push(item.feedback);
        lines.push('');
      }
    });
  }

  return lines.join('\n');
};

const EvaluationView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [mark, setMark] = useState<Mark | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const retryTimerRef = useRef<number | null>(null);

  const [scoreInput, setScoreInput] = useState<string>('0');
  const [isPublished, setIsPublished] = useState(false);
  const [activeTab, setActiveTab] = useState<'formatted' | 'edit' | 'raw'>('formatted');
  const [editorResult, setEditorResult] = useState<EvaluationResult | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;
      try {
        if (retryTimerRef.current) {
          window.clearTimeout(retryTimerRef.current);
          retryTimerRef.current = null;
        }
        const res = await getMarkBySubmission(Number(id));
        const currentMark = res.data;

        if (currentMark) {
          setMark(currentMark);
          setScoreInput(String(currentMark.final_score ?? 0));
          setIsPublished(currentMark.is_published);
          setError(null);
        }
      } catch (err: any) {
        if (err.response?.status === 404) {
          // Marks are created async by the evaluation job; give it a short window to appear.
          const maxRetries = 10;
          const delayMs = 1500;
          if (retryCount < maxRetries) {
            setError(`Evaluation results not found yet. Retrying... (${retryCount + 1}/${maxRetries})`);
            retryTimerRef.current = window.setTimeout(() => setRetryCount((c) => c + 1), delayMs);
          } else {
            setError('Evaluation results not found yet. It may still be processing.');
          }
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
    return () => {
      if (retryTimerRef.current) {
        window.clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }
    };
  }, [id, retryCount]);

  const handleUpdate = async () => {
    if (!mark) return;
    if (!editorResult) {
      alert('Nothing to save yet.');
      return;
    }
    const parsed = Number(scoreInput);
    if (!Number.isFinite(parsed) || parsed < 0) {
      alert('Please enter a valid non-negative final score.');
      return;
    }
    const finalScore = Math.round(parsed);

    try {
      const overrideRes = await overrideMark(mark.id, {
        final_score: finalScore,
        teacher_override: editorResult
      });
      setMark(overrideRes.data);
      setScoreInput(String(overrideRes.data.final_score));

      const publishRes = await publishMark(mark.id, isPublished);
      setMark(publishRes.data);
      if (isPublished) {
        // When results are published, reflect that in the submission status
        // so students see "evaluated" instead of "pending".
        await updateSubmissionStatus(mark.submission_id, 'evaluated');
      }
      alert('Evaluation updated successfully.');
    } catch (err) {
      alert('Failed to update marks');
    }
  };

  const handleExportPdf = () => {
    window.print();
  };

  const effectiveResult: EvaluationResult | null = useMemo(() => {
    if (!mark) return null;
    // If teacher_override exists, that is the canonical final script.
    if (mark.teacher_override) return mark.teacher_override as EvaluationResult;
    return mark.base_result as EvaluationResult;
  }, [mark]);

  useEffect(() => {
    if (effectiveResult) {
      setEditorResult({ ...effectiveResult });
    }
  }, [effectiveResult]);

  useEffect(() => {
    if (mark) {
      setScoreInput(String(mark.final_score ?? 0));
    }
  }, [mark]);

  const isTeacher = user?.role === 'teacher';

  if (loading) return <div>Loading evaluation...</div>;

  return (
    <div className="animate-fade-in">
      <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <button
          onClick={() => navigate(-1)}
          className="btn btn-secondary"
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <ArrowLeft size={16} /> Back
        </button>

        {mark && (
          <button
            className="btn btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            onClick={handleExportPdf}
          >
            <FileText size={16} /> Export / Print PDF
          </button>
        )}
      </div>

      {error ? (
        <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
          <AlertCircle size={48} color="var(--color-danger)" style={{ marginBottom: '1rem' }} />
          <h3>{error}</h3>
        </div>
      ) : mark && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '2rem' }}>
          {/* Left: Formatted / Script View */}
          <div className="glass-panel print-container" style={{ padding: '2rem' }}>
            <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h2>{isTeacher ? 'Evaluation Script' : 'Your Evaluated Script'}</h2>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  className={`btn btn-secondary ${activeTab === 'formatted' ? 'badge-primary' : ''}`}
                  onClick={() => setActiveTab('formatted')}
                >
                  Formatted
                </button>
                {isTeacher && (
                  <button
                    className={`btn btn-secondary ${activeTab === 'edit' ? 'badge-primary' : ''}`}
                    onClick={() => setActiveTab('edit')}
                  >
                    Edit Script
                  </button>
                )}
                {isTeacher && (
                  <button
                    className={`btn btn-secondary ${activeTab === 'raw' ? 'badge-primary' : ''}`}
                    onClick={() => setActiveTab('raw')}
                  >
                    Raw JSON
                  </button>
                )}
              </div>
            </div>

            {activeTab === 'formatted' && (
              <div style={{ marginTop: isTeacher ? '1rem' : 0 }}>
                <ReactMarkdown
                  remarkPlugins={[remarkMath]}
                  rehypePlugins={[rehypeKatex]}
                  components={{
                    h1: ({ node, ...props }) => <h2 {...props} />,
                    h2: ({ node, ...props }) => <h3 {...props} />,
                    h3: ({ node, ...props }) => <h4 {...props} />
                  }}
                >
                  {buildMarkdownFromResult(effectiveResult)}
                </ReactMarkdown>
              </div>
            )}

            {activeTab === 'edit' && isTeacher && editorResult && (
              <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div>
                  <h3>Overall Feedback</h3>
                  <textarea
                    className="form-input"
                    style={{ minHeight: '100px' }}
                    value={editorResult.overall_feedback ?? ''}
                    onChange={e =>
                      setEditorResult(prev => ({
                        ...(prev || {}),
                        overall_feedback: e.target.value
                      }))
                    }
                  />
                  <p style={{ fontSize: '0.8rem', opacity: 0.7 }}>
                    You can use LaTeX math here, e.g. <code>$E = mc^2$</code> or <code>$$\int_0^1 x^2 dx$$</code>.
                  </p>
                </div>

                {editorResult.breakdown && editorResult.breakdown.length > 0 && (
                  <div>
                    <h3>Per-question Overrides</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      {editorResult.breakdown.map((item, idx) => (
                        <div
                          key={idx}
                          style={{
                            border: '1px solid rgba(255,255,255,0.08)',
                            borderRadius: 'var(--radius-md)',
                            padding: '1rem',
                            background: 'rgba(15,23,42,0.6)'
                          }}
                        >
                          <div style={{ marginBottom: '0.5rem' }}>
                            <strong>Q{idx + 1}.</strong> {item.question}
                          </div>
                          <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.75rem' }}>
                            <div style={{ flex: '0 0 120px' }}>
                              <label className="form-label">Score</label>
                              <input
                                type="number"
                                className="form-input"
                                value={item.score}
                                onChange={e => {
                                  const value = Number(e.target.value);
                                  setEditorResult(prev => {
                                    if (!prev || !prev.breakdown) return prev;
                                    const copy = { ...prev, breakdown: [...prev.breakdown] };
                                    copy.breakdown[idx] = { ...copy.breakdown[idx], score: value };
                                    return copy;
                                  });
                                }}
                              />
                            </div>
                            <div style={{ flex: '0 0 120px' }}>
                              <label className="form-label">Max</label>
                              <input
                                type="number"
                                className="form-input"
                                value={item.max}
                                onChange={e => {
                                  const value = Number(e.target.value);
                                  setEditorResult(prev => {
                                    if (!prev || !prev.breakdown) return prev;
                                    const copy = { ...prev, breakdown: [...prev.breakdown] };
                                    copy.breakdown[idx] = { ...copy.breakdown[idx], max: value };
                                    return copy;
                                  });
                                }}
                              />
                            </div>
                          </div>
                          <div>
                            <label className="form-label">Feedback</label>
                            <textarea
                              className="form-input"
                              style={{ minHeight: '80px' }}
                              value={item.feedback}
                              onChange={e => {
                                const value = e.target.value;
                                setEditorResult(prev => {
                                  if (!prev || !prev.breakdown) return prev;
                                  const copy = { ...prev, breakdown: [...prev.breakdown] };
                                  copy.breakdown[idx] = { ...copy.breakdown[idx], feedback: value };
                                  return copy;
                                });
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'raw' && isTeacher && (
              <div style={{ marginTop: '1rem' }}>
                <h3>Raw JSON Output</h3>
                <pre
                  style={{
                    background: 'rgba(0,0,0,0.3)',
                    padding: '1rem',
                    borderRadius: 'var(--radius-md)',
                    maxHeight: '400px',
                    overflow: 'auto',
                    fontSize: '0.8rem'
                  }}
                >
                  {JSON.stringify(mark.base_result, null, 2)}
                </pre>
              </div>
            )}
          </div>

          {/* Right: Summary & Teacher/Student actions */}
          <div className="glass-panel no-print" style={{ padding: '2rem' }}>
            <h3>{isTeacher ? 'Result Summary & Actions' : 'Your Result Summary'}</h3>
            <div className="form-group" style={{ marginTop: '1.5rem' }}>
              <label className="form-label">Final Score</label>
              <input
                type="number"
                className="form-input"
                disabled={!isTeacher}
                value={scoreInput}
                onChange={e => setScoreInput(e.target.value)}
              />
            </div>

            {isTeacher && (
              <>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    marginBottom: '1.5rem',
                    marginTop: '0.5rem'
                  }}
                >
                  <input
                    type="checkbox"
                    id="published"
                    checked={isPublished}
                    onChange={e => setIsPublished(e.target.checked)}
                  />
                  <label htmlFor="published" className="form-label" style={{ marginBottom: 0 }}>
                    Publish results to student
                  </label>
                </div>

                <button className="btn btn-primary" style={{ width: '100%' }} onClick={handleUpdate}>
                  <Save size={18} /> {isPublished ? 'Save & Publish Results' : 'Save (Keep Unpublished)'}
                </button>
              </>
            )}

            {!isTeacher && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '1.5rem' }}>
                  <CheckCircle size={18} color="var(--color-success)" />
                  <span>Mark is {mark.is_published ? 'Published' : 'Under Review'}</span>
                </div>
                <p style={{ fontSize: '0.85rem', marginTop: '0.75rem' }}>
                  You are viewing the final evaluation as confirmed by your teacher.
                </p>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default EvaluationView;
