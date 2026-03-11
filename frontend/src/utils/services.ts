import api from './api';

export interface Course {
  id: number;
  name: string;
  description: string;
  teacher_id: number;
  created_at: string;
}

export interface Enrollment {
  id: number;
  course_id: number;
  student_id: number;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

export interface Assignment {
  id: number;
  course_id: number;
  title: string;
  description: string;
  deadline: string;
  marking_strategy: string;
  default_prompt: string;
  created_at: string;
}

export interface Submission {
  id: number;
  assignment_id: number;
  student_id: number;
  file_id: string;
  status: string;
  submitted_at: string;
}

export interface Mark {
  id: number;
  assignment_id: number;
  submission_id: number;
  student_id: number;
  base_result: any;
  teacher_override: any;
  final_score: number;
  is_published: boolean;
}

// Course API
export const getCourses = () => api.get<Course[]>('/courses/');
export const getCourse = (id: number) => api.get<Course>(`/courses/${id}`);
export const createCourse = (data: Partial<Course>) => api.post<Course>('/courses/', data);
export const enrollInCourse = (id: number) => api.post<Enrollment>(`/courses/${id}/enroll`);
export const getCourseEnrollments = (id: number) => api.get<Enrollment[]>(`/courses/${id}/enrollments`);
export const updateEnrollmentStatus = (id: number, status: string) => api.put<Enrollment>(`/courses/enrollments/${id}/status?status=${status}`);

// Assignment API
export const getCourseAssignments = (courseId: number) => api.get<Assignment[]>(`/assignments/course/${courseId}`);
export const createAssignment = (data: Partial<Assignment>) => api.post<Assignment>('/assignments/', data);
export const submitAssignment = (id: number, file_id: string) => api.post<Submission>(`/assignments/${id}/submit`, { assignment_id: id, file_id });
export const getAssignmentSubmissions = (id: number) => api.get<Submission[]>(`/assignments/${id}/submissions`);

// File API
export const uploadFile = (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  return api.post('/files/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

// LLM API
export const startEvaluation = (data: any) => api.post('/llm/evaluate', data);
export const getEvaluationJob = (id: number) => api.get(`/llm/jobs/${id}`);

// Marks API
export const getAssignmentMarks = (assignmentId: number) => api.get<Mark[]>(`/marks/assignment/${assignmentId}`);
export const getStudentMarks = (studentId: number) => api.get<Mark[]>(`/marks/student/${studentId}`);
export const createInitialMark = (data: any) => api.post<Mark>('/marks/', data);
export const overrideMark = (id: number, data: any) => api.put<Mark>(`/marks/${id}/override`, data);
export const publishMark = (id: number, is_published: boolean) => api.put<Mark>(`/marks/${id}/publish`, { is_published });
