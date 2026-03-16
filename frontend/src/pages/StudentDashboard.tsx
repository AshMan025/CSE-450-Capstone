import React, { useState, useEffect } from 'react';
import { getCourses, enrollInCourse } from '../utils/services';
import type { Course } from '../utils/services';
import { Search, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const StudentDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchData = async () => {
    try {
      const coursesRes = await getCourses();
      setCourses(coursesRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleEnroll = async (courseId: number) => {
    try {
      await enrollInCourse(courseId);
      alert('Enrollment requested!');
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to enroll');
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h2>Available Courses</h2>
        <div style={{ position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--color-text-secondary)' }} />
          <input
            type="text"
            className="form-input"
            placeholder="Search courses..."
            style={{ paddingLeft: '2.5rem', width: '250px' }}
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <p>Loading courses...</p>
      ) : (
        <div className="grid-cards">
          {courses
            .filter(course => {
              if (!searchTerm.trim()) return true;
              const term = searchTerm.toLowerCase();
              return (
                course.name.toLowerCase().includes(term) ||
                (course.description || '').toLowerCase().includes(term)
              );
            })
            .map(course => (
            <div key={course.id} className="card">
              <div className="card-title">{course.name}</div>
              <div className="card-body">{course.description || 'No description provided.'}</div>
              <div className="card-footer" style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  className="btn btn-primary"
                  style={{ flex: 1, padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                  onClick={() => handleEnroll(course.id)}
                >
                  Request Enrollment
                </button>
                <button
                  className="btn btn-secondary"
                  style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                  onClick={() => navigate(`/dashboard/course/${course.id}`)}
                >
                  View <ChevronRight size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default StudentDashboard;
