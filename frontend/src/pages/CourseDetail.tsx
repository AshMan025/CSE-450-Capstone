import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  getCourse,
  getCourseEnrollments,
  getCourseAssignments,
  updateEnrollmentStatus,
  createAssignment
} from '../utils/services';
import type {
  Course,
  Enrollment,
  Assignment
} from '../utils/services';
import {
  Users,
  FileText,
  PlusCircle,
  CheckCircle,
  XCircle,
  ArrowLeft,
  Calendar
} from 'lucide-react';

const CourseDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [course, setCourse] = useState<Course | null>(null);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'assignments' | 'enrollments'>('assignments');

  // Create Assignment State
  const [showCreateAssignment, setShowCreateAssignment] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newDeadline, setNewDeadline] = useState('');
  const [newStrategy, setNewStrategy] = useState('Standard marking out of 100.');
  const [newPrompt, setNewPrompt] = useState('Evaluate the student submission based on general correctness.');

  const fetchData = async () => {
    if (!id) return;
    try {
      const [cRes, eRes, aRes] = await Promise.all([
        getCourse(Number(id)),
        user?.role === 'teacher' ? getCourseEnrollments(Number(id)) : Promise.resolve({ data: [] }),
        getCourseAssignments(Number(id))
      ]);
      setCourse(cRes.data);
      if (eRes && 'data' in eRes) setEnrollments(eRes.data);
      setAssignments(aRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id, user]);

  const handleStatusUpdate = async (enrollmentId: number, status: 'approved' | 'rejected') => {
    try {
      await updateEnrollmentStatus(enrollmentId, status);
      fetchData();
    } catch (err) {
      alert('Failed to update status');
    }
  };

  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createAssignment({
        course_id: Number(id),
        title: newTitle,
        description: newDesc,
        deadline: new Date(newDeadline).toISOString(),
        marking_strategy: newStrategy,
        default_prompt: newPrompt
      });
      setShowCreateAssignment(false);
      fetchData();
    } catch (err) {
      alert('Failed to create assignment');
    }
  };

  if (loading) return <div>Loading course...</div>;
  if (!course) return <div>Course not found</div>;

  return (
    <div className="animate-fade-in">
      <button onClick={() => navigate('/dashboard')} className="btn btn-secondary" style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <ArrowLeft size={16} /> Back to Dashboard
      </button>

      <div className="glass-panel" style={{ padding: '2rem', marginBottom: '2rem' }}>
        <h1 style={{ margin: 0 }}>{course.name}</h1>
        <p style={{ opacity: 0.7, marginTop: '0.5rem' }}>{course.description}</p>
      </div>

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '1rem' }}>
        <button
          className={`btn ${activeTab === 'assignments' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('assignments')}
        >
          <FileText size={18} /> Assignments
        </button>
        {user?.role === 'teacher' && (
          <button
            className={`btn ${activeTab === 'enrollments' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('enrollments')}
          >
            <Users size={18} /> Manage Students
          </button>
        )}
      </div>

      {activeTab === 'assignments' && (
        <div className="animate-fade-in">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h2>Assignments</h2>
            {user?.role === 'teacher' && (
              <button className="btn btn-primary" onClick={() => setShowCreateAssignment(true)}>
                <PlusCircle size={18} /> Create Assignment
              </button>
            )}
          </div>

          {showCreateAssignment && (
            <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
              <h3>New Assignment</h3>
              <form onSubmit={handleCreateAssignment}>
                <div className="form-group">
                  <label className="form-label">Title</label>
                  <input type="text" className="form-input" required value={newTitle} onChange={e => setNewTitle(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea className="form-input" rows={2} value={newDesc} onChange={e => setNewDesc(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Deadline</label>
                  <input type="datetime-local" className="form-input" required value={newDeadline} onChange={e => setNewDeadline(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Marking Strategy (Guide for LLM)</label>
                  <textarea className="form-input" rows={2} value={newStrategy} onChange={e => setNewStrategy(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Default AI Prompt</label>
                  <textarea className="form-input" rows={2} value={newPrompt} onChange={e => setNewPrompt(e.target.value)} />
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <button type="submit" className="btn btn-primary">Create</button>
                  <button type="button" className="btn btn-secondary" onClick={() => setShowCreateAssignment(false)}>Cancel</button>
                </div>
              </form>
            </div>
          )}

          <div className="grid-cards">
            {assignments.length === 0 ? (
              <p>No assignments created yet.</p>
            ) : (
              assignments.map(a => (
                <div key={a.id} className="card animate-fade-in">
                  <div className="card-title">{a.title}</div>
                  <div className="card-body">
                    <p style={{ fontSize: '0.9rem', opacity: 0.8 }}>{a.description}</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', marginTop: '1rem', color: 'var(--color-secondary)' }}>
                      <Calendar size={14} /> Due: {new Date(a.deadline).toLocaleString()}
                    </div>
                  </div>
                  <div className="card-footer">
                    <button
                      className="btn btn-primary"
                      style={{ width: '100%' }}
                      onClick={() => navigate(`/dashboard/assignment/${a.id}`)}
                    >
                      {user?.role === 'teacher' ? 'View Submissions' : 'Submit Work'}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {activeTab === 'enrollments' && user?.role === 'teacher' && (
        <div className="animate-fade-in">
          <h2>Student Enrollments</h2>
          <div className="glass-panel" style={{ padding: '0', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ background: 'var(--table-head-bg)' }}>
                <tr>
                  <th style={{ padding: '1rem', textAlign: 'left' }}>Student</th>
                  <th style={{ padding: '1rem', textAlign: 'left' }}>Status</th>
                  <th style={{ padding: '1rem', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {enrollments.length === 0 ? (
                  <tr><td colSpan={3} style={{ padding: '2rem', textAlign: 'center' }}>No enrollment requests.</td></tr>
                ) : (
                  enrollments.map(e => (
                    <tr key={e.id} style={{ borderTop: '1px solid var(--table-row-border)' }}>
                      <td style={{ padding: '1rem' }}>{e.student_name ? e.student_name : `Student #${e.student_id}`}</td>
                      <td style={{ padding: '1rem' }}>
                        <span className={`badge ${e.status === 'approved' ? 'badge-success' : e.status === 'pending' ? 'badge-primary' : 'badge-danger'}`}>
                          {e.status}
                        </span>
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'right' }}>
                        {e.status === 'pending' && (
                          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                            <button className="btn btn-secondary" style={{ padding: '0.2rem 0.5rem' }} onClick={() => handleStatusUpdate(e.id, 'approved')}>
                              <CheckCircle size={16} color="var(--color-success)" />
                            </button>
                            <button className="btn btn-secondary" style={{ padding: '0.2rem 0.5rem' }} onClick={() => handleStatusUpdate(e.id, 'rejected')}>
                              <XCircle size={16} color="var(--color-danger)" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default CourseDetail;
