import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  getAssignment,
  getAssignmentSubmissions,
  getMySubmission,
  uploadFile,
  submitAssignment,
  startEvaluation
} from '../utils/services';
import type { Submission, Assignment } from '../utils/services';
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

  // Student Upload State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const [assignment, setAssignment] = useState<Assignment | null>(null);

  const fetchData = async () => {
    if (!id) return;
    try {
      // Fetch assignment info directly
      const aRes = await getAssignment(Number(id));
      setAssignment(aRes.data);

      if (user?.role === 'teacher') {
        const res = await getAssignmentSubmissions(Number(id));
        setSubmissions(res.data);
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

    setUploading(true);
    try {
      const uploadRes = await uploadFile(selectedFile);
      const fileId = uploadRes.data.id;
      await submitAssignment(Number(id), fileId);
      alert('Assignment submitted successfully!');
      setSelectedFile(null);
      fetchData();
    } catch (err) {
      alert('Failed to submit assignment');
    } finally {
      setUploading(false);
    }
  };

  const handleRunEvaluation = async (submission: Submission) => {
    if (!assignment || !user) return;
    try {
      await startEvaluation({
        submission_id: submission.id,
        assignment_id: assignment.id,
        file_id: submission.file_id,
        marking_strategy: assignment.marking_strategy,
        prompt: assignment.default_prompt,
        teacher_id: user.id,
        student_id: submission.student_id
      });
      alert('Evaluation job started!');
      fetchData();
    } catch (err) {
      alert('Failed to start evaluation');
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
                onChange={e => setSelectedFile(e.target.files?.[0] || null)}
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={uploading}>
              {uploading ? 'Uploading...' : 'Submit Assignment'}
            </button>
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
              <thead style={{ background: 'rgba(255,255,255,0.05)' }}>
                <tr>
                  {user?.role === 'teacher' && <th style={{ padding: '1rem', textAlign: 'left' }}>Student</th>}
                  <th style={{ padding: '1rem', textAlign: 'left' }}>Status</th>
                  <th style={{ padding: '1rem', textAlign: 'left' }}>Date</th>
                  <th style={{ padding: '1rem', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {submissions.map(s => (
                  <tr key={s.id} style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                    {user?.role === 'teacher' && (
                      <td style={{ padding: '1rem' }}>{s.student_name ? s.student_name : `Student #${s.student_id}`}</td>
                    )}
                    <td style={{ padding: '1rem' }}>
                      <span className={`badge ${s.status === 'submitted' ? 'badge-primary' : s.status === 'evaluated' ? 'badge-success' : 'badge-secondary'}`}>
                        {s.status}
                      </span>
                    </td>
                    <td style={{ padding: '1rem', opacity: 0.7 }}>{new Date(s.submitted_at).toLocaleString()}</td>
                    <td style={{ padding: '1rem', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                        {user?.role === 'teacher' && s.status === 'submitted' && (
                          <button className="btn btn-primary" style={{ padding: '0.2rem 0.5rem' }} onClick={() => handleRunEvaluation(s)}>
                            <Play size={16} /> Run Evaluation
                          </button>
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
      </div>
    </div>
  );
};

export default AssignmentDetail;
