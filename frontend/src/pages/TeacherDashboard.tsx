import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCourses, createCourse } from '../utils/services';
import type { Course } from '../utils/services';
import { PlusCircle, BookOpen, Bot } from 'lucide-react';
import LLMGuidance from '../components/LLMGuidance';

const TeacherDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showLLMGuide, setShowLLMGuide] = useState(false);
  const [newCourseName, setNewCourseName] = useState('');
  const [newCourseDesc, setNewCourseDesc] = useState('');

  const fetchCourses = async () => {
    try {
      const res = await getCourses();
      setCourses(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createCourse({ name: newCourseName, description: newCourseDesc });
      setNewCourseName('');
      setNewCourseDesc('');
      setShowCreate(false);
      fetchCourses();
    } catch (err) {
      console.error(err);
      alert('Failed to create course');
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h2>My Courses</h2>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button className="btn btn-secondary" onClick={() => setShowLLMGuide(!showLLMGuide)}>
            <Bot size={18} /> LLM Guide
          </button>
          <button className="btn btn-primary" onClick={() => setShowCreate(!showCreate)}>
            <PlusCircle size={18} /> New Course
          </button>
        </div>
      </div>

      {showLLMGuide && <LLMGuidance />}

      {showCreate && (
        <div className="glass-panel animate-fade-in" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
          <h3>Create a New Course</h3>
          <form onSubmit={handleCreateCourse}>
            <div className="form-group" style={{ marginTop: '1rem' }}>
              <label className="form-label">Course Name</label>
              <input type="text" className="form-input" required value={newCourseName} onChange={e => setNewCourseName(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea className="form-input" rows={3} value={newCourseDesc} onChange={e => setNewCourseDesc(e.target.value)} />
            </div>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button type="submit" className="btn btn-primary">Create</button>
              <button type="button" className="btn btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <p>Loading courses...</p>
      ) : courses.length === 0 ? (
        <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center' }}>
          <BookOpen size={48} color="var(--color-text-secondary)" style={{ marginBottom: '1rem', opacity: 0.5 }} />
          <h3>No Courses Yet</h3>
          <p>Create your first course to start adding assignments.</p>
        </div>
      ) : (
        <div className="grid-cards">
          {courses.map(course => (
            <div key={course.id} className="card">
              <div className="card-title">{course.name}</div>
              <div className="card-body">{course.description || 'No description provided.'}</div>
              <div className="card-footer">
                <span className="badge badge-success" style={{ fontSize: '0.7rem' }}>Active</span>
                <button
                  className="btn btn-secondary"
                  style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                  onClick={() => navigate(`/dashboard/course/${course.id}`)}
                >
                  Manage
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TeacherDashboard;
