import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  getAssignment,
  getAssignmentSubmissions,
  getMySubmission,
  uploadFile,
  submitAssignment,
  startEvaluation,
  getAPIKeys,
  getEvaluationJob,
} from '../utils/services';
import type { Submission, Assignment } from '../utils/services';

type APIKeyEntry = {
  id: number;
  provider: string;
  model_name: string;
  is_valid: string;
  last_tested_at?: string;
  error_message?: string;
};
import {
  Upload,
  Play,
  ChevronRight,
  ArrowLeft
} from 'lucide-react';

const AssignmentDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);

  const [apiKeys, setApiKeys] = useState<APIKeyEntry[]>([]);
  const [selectedKeys, setSelectedKeys] = useState<Record<number, number | null>>({});
  const [globalSelectedKey, setGlobalSelectedKey] = useState<number | null>(null);
  const [evalResults, setEvalResults] = useState<Record<number, {status: string; error_message?: string; model_used?: string}>>({});
  const [runningSubmissionIds, setRunningSubmissionIds] = useState<Record<number, boolean>>({});
  const [isEvaluatingAll, setIsEvaluatingAll] = useState(false);

  // Student Upload State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const deadlinePassed = assignment ? new Date() > new Date(assignment.deadline) : false;

  const fetchData = async () => {
    if (!id) return;
    try {
      // Fetch assignment info directly
      const aRes = await getAssignment(Number(id));
      setAssignment(aRes.data);

      if (user?.role === 'teacher') {
        const res = await getAssignmentSubmissions(Number(id));
        setSubmissions(res.data);
        // fetch teacher's saved API keys and initialize selections
        try {
          const kres = await getAPIKeys();
          const allKeys: APIKeyEntry[] = kres.data;
          const preferredDefault = allKeys.find((k) => k.is_valid === 'valid')?.id;
          const defaultKeyId = preferredDefault ?? allKeys[0]?.id ?? null;
          setApiKeys(allKeys);
          const initial: Record<number, number | null> = {};
          res.data.forEach((s: Submission) => { initial[s.id] = defaultKeyId });
          setSelectedKeys(initial);
          setGlobalSelectedKey(defaultKeyId);
        } catch (e) {
          console.error('Failed to load API keys', e);
        }
      } else {
        const res = await getMySubmission(Number(id));
        setSubmissions(res.data ? [res.data] : []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id, user]);

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || !id) return;
    if (deadlinePassed) return;

    setUploading(true);
    try {
      const uploadRes = await uploadFile(selectedFile);
      const fileId = uploadRes.data.id;
      await submitAssignment(Number(id), fileId);
      alert('Assignment submitted successfully!');
      setSelectedFile(null);
      fetchData();
    } catch (err) {
      const message =
        (err as any)?.response?.data?.detail ||
        (err as any)?.message ||
        'Failed to submit assignment';
      alert(message);
    } finally {
      setUploading(false);
    }
  };

  const handleRunEvaluation = async (submission: Submission, overrideKeyId?: number | null) => {
    if (!assignment || !user) return;
    if (runningSubmissionIds[submission.id]) return;
    // choose key: override -> per-submission -> global
    const selected_key = overrideKeyId ?? selectedKeys[submission.id] ?? globalSelectedKey;
    setRunningSubmissionIds(prev => ({ ...prev, [submission.id]: true }));
    setEvalResults(prev => ({ ...prev, [submission.id]: { status: 'running' } }));
    try {
      const resp = await startEvaluation({
        submission_id: submission.id,
        assignment_id: assignment.id,
        file_id: submission.file_id,
        marking_strategy: assignment.marking_strategy,
        prompt: assignment.default_prompt,
        teacher_id: user.id,
        student_id: submission.student_id,
        selected_api_key_id: selected_key
      });
      const job = resp.data;

      await new Promise<void>((resolve) => {
        const poll = async () => {
          try {
            const jres = await getEvaluationJob(job.id);
            const j = jres.data;
            if (j.status === 'completed') {
              setEvalResults(prev => ({ ...prev, [submission.id]: { status: 'completed', model_used: j.llm_model_used } }));
              setRunningSubmissionIds(prev => ({ ...prev, [submission.id]: false }));
              fetchData();
              resolve();
              return;
            } else if (j.status === 'failed') {
              setEvalResults(prev => ({ ...prev, [submission.id]: { status: 'failed', error_message: j.error_message } }));
              setRunningSubmissionIds(prev => ({ ...prev, [submission.id]: false }));
              fetchData();
              resolve();
              return;
            } else {
              setTimeout(poll, 2000);
            }
          } catch (e) {
            setEvalResults(prev => ({ ...prev, [submission.id]: { status: 'failed', error_message: 'Failed to poll job' } }));
            setRunningSubmissionIds(prev => ({ ...prev, [submission.id]: false }));
            resolve();
          }
        };
        poll();
      });
    } catch (err) {
      alert('Failed to start evaluation');
      setEvalResults(prev => ({ ...prev, [submission.id]: { status: 'failed', error_message: 'Failed to start job' } }));
      setRunningSubmissionIds(prev => ({ ...prev, [submission.id]: false }));
    }
  };

  const handleEvaluateAll = async () => {
    if (isEvaluatingAll) return;
    setIsEvaluatingAll(true);
    try {
      for (const s of submissions) {
        if (s.status !== 'submitted') continue;
        await handleRunEvaluation(s, globalSelectedKey);
      }
    } finally {
      setIsEvaluatingAll(false);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="animate-fade-in">
      <button onClick={() => navigate(-1)} className="btn btn-secondary" style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <ArrowLeft size={16} /> Back
      </button>

      {user?.role === 'student' && (
        <div className="glass-panel" style={{ padding: '2rem', marginBottom: '2rem' }}>
          <h2>Submit Assignment</h2>
          <form onSubmit={handleFileUpload}>
            <div className="form-group" style={{ marginTop: '1.5rem' }}>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Upload size={18} /> Select File (PDF or Image)
              </label>
              <input
                type="file"
                className="form-input"
                required
                disabled={deadlinePassed}
                onChange={e => setSelectedFile(e.target.files?.[0] || null)}
              />
            </div>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <button type="submit" className="btn btn-primary" disabled={uploading || deadlinePassed}>
                {deadlinePassed ? 'Deadline Passed' : uploading ? 'Uploading...' : 'Submit Assignment'}
              </button>
              {deadlinePassed && (
                <div
                  style={{
                    padding: '0.6rem 0.8rem',
                    borderRadius: '0.6rem',
                    background: 'rgba(239, 68, 68, 0.10)',
                    border: '1px solid rgba(239, 68, 68, 0.20)',
                    color: 'var(--color-error)',
                    fontSize: '0.9rem',
                  }}
                >
                  Deadline has passed — you can’t submit this assignment.
                </div>
              )}
            </div>
          </form>
        </div>
      )}

      <div className="glass-panel" style={{ padding: '2rem' }}>
        <h2 style={{ marginBottom: '1.5rem' }}>{user?.role === 'teacher' ? 'All Submissions' : 'My Submissions'}</h2>

        {submissions.length === 0 ? (
          <p>No submissions found.</p>
        ) : (
          <div className="glass-panel" style={{ padding: '0', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ background: 'var(--table-head-bg)' }}>
                <tr>
                  {user?.role === 'teacher' && <th style={{ padding: '1rem', textAlign: 'left' }}>Student</th>}
                  <th style={{ padding: '1rem', textAlign: 'left' }}>Status</th>
                  <th style={{ padding: '1rem', textAlign: 'left' }}>Date</th>
                  <th style={{ padding: '1rem', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {submissions.map(s => (
                  <tr key={s.id} style={{ borderTop: '1px solid var(--table-row-border)' }}>
                    {user?.role === 'teacher' && (
                      <td style={{ padding: '1rem' }}>{s.student_name ? s.student_name : `Student #${s.student_id}`}</td>
                    )}
                    <td style={{ padding: '1rem' }}>
                      {(() => {
                        const rowRunning = !!runningSubmissionIds[s.id];
                        return (
                      <span className={`badge ${s.status === 'submitted' ? 'badge-primary' : s.status === 'evaluated' ? 'badge-success' : 'badge-secondary'}`}>
                        {rowRunning ? 'evaluating' : s.status}
                      </span>
                        );
                      })()}
                    </td>
                    <td style={{ padding: '1rem', opacity: 0.7 }}>{new Date(s.submitted_at).toLocaleString()}</td>
                    <td style={{ padding: '1rem', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                        {user?.role === 'teacher' && s.status === 'submitted' && (
                          <>
                            <select
                              value={selectedKeys[s.id] ?? ''}
                              onChange={(e) => setSelectedKeys(prev => ({ ...prev, [s.id]: e.target.value ? Number(e.target.value) : null }))}
                              style={{ marginRight: '0.5rem' }}
                              disabled={!!runningSubmissionIds[s.id] || isEvaluatingAll}
                            >
                              <option value="">Select LLM</option>
                              {apiKeys.map(k => (
                                <option key={k.id} value={k.id}>{`${k.provider} — ${k.model_name}`}</option>
                              ))}
                            </select>
                            <button
                              className="btn btn-primary"
                              style={{ padding: '0.2rem 0.5rem' }}
                              onClick={() => handleRunEvaluation(s)}
                              disabled={!!runningSubmissionIds[s.id] || isEvaluatingAll}
                            >
                              <Play size={16} /> {!!runningSubmissionIds[s.id] ? 'Evaluating...' : 'Run Evaluation'}
                            </button>
                          </>
                        )}
                        <button
                          className="btn btn-secondary"
                          style={{ padding: '0.2rem 0.5rem', opacity: user?.role === 'student' && s.status !== 'evaluated' ? 0.6 : 1 }}
                          disabled={user?.role === 'student' && s.status !== 'evaluated'}
                          title={user?.role === 'student' && s.status !== 'evaluated' ? 'Results not available until evaluation completes.' : undefined}
                          onClick={() => navigate(`/dashboard/evaluation/${s.id}`)}
                        >
                          {user?.role === 'teacher'
                            ? (s.status === 'evaluated' ? 'Review & Marks' : 'View Result')
                            : (s.status === 'evaluated' ? 'View Result' : 'Pending')}
                          <ChevronRight size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {user?.role === 'teacher' && apiKeys.length > 0 && (
          <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <label style={{ opacity: 0.8 }}>Evaluate all with:</label>
            <select
              value={globalSelectedKey ?? ''}
              onChange={e => setGlobalSelectedKey(e.target.value ? Number(e.target.value) : null)}
              disabled={isEvaluatingAll}
            >
              <option value="">Select LLM</option>
              {apiKeys.map(k => (
                <option key={k.id} value={k.id}>{`${k.provider} — ${k.model_name}`}</option>
              ))}
            </select>
            <button
              className="btn btn-primary"
              onClick={handleEvaluateAll}
              disabled={!globalSelectedKey || isEvaluatingAll}
            >
              {isEvaluatingAll ? 'Evaluating All...' : 'Evaluate All'}
            </button>
          </div>
        )}

        {Object.keys(evalResults).length > 0 && (
          <div style={{ marginTop: '1rem' }}>
            <h4>Evaluation Results</h4>
            <ul>
              {Object.entries(evalResults).map(([sid, res]) => (
                <li key={sid}>{`Submission ${sid}: ${res.status}${res.error_message ? ' — ' + res.error_message : ''}${res.model_used ? ' (model: ' + res.model_used + ')' : ''}`}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default AssignmentDetail;
