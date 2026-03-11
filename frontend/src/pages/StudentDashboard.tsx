import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getCourses, enrollInCourse } from '../utils/services';
import type { Course } from '../utils/services';
import { Search } from 'lucide-react';

const StudentDashboard: React.FC = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      // In a real app we'd have a specific endpoint for student enrollments
      // For MVP we just fetch all courses and see which ones they are in.
      const coursesRes = await getCourses();
      setCourses(coursesRes.data);

      // Hardcoded: Fetch enrollments - for MVP we actually need an endpoint in course-service like /enrollments/me
      // But we can just use the courses list to let them enroll.
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
      fetchData(); // Simplistic refresh
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
          <input type="text" className="form-input" placeholder="Search courses..." style={{ paddingLeft: '2.5rem', width: '250px' }} />
        </div>
      </div>

      {loading ? (
        <p>Loading courses...</p>
      ) : (
        <div className="grid-cards">
          {courses.map(course => (
            <div key={course.id} className="card">
              <div className="card-title">{course.name}</div>
              <div className="card-body">{course.description || 'No description provided.'}</div>
              <div className="card-footer">
                <button
                  className="btn btn-primary"
                  style={{ width: '100%', padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                  onClick={() => handleEnroll(course.id)}
                >
                  Request Enrollment
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
