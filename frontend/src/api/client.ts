import type {
  User,
  AuthResponse,
  Course,
  CourseEnrollment,
  Quiz,
  Attempt,
  QuizResultsSummary,
  AdminDashboardData,
  Skill,
  UserSkill,
  TraineeProfile,
  TrainerProfile,
  AdminUserProfile,
  ProficiencyLevel,
  CourseCompetency,
  TraineeCourseSkillGap,
  TraineeOverallSkillGap,
  CourseRecommendation,
  CourseTrainerMatchingResponse,
  Certificate,
  CertificateVerification,
  AppNotification,
  CourseCompletionStatus,
  TraineeCompletionSummary,
  InstitutionalAnalytics,
  CourseFeedback,
  CourseFeedbackSummary,
  TrainerFeedback,
  TrainerFeedbackSummary,
  MyFeedbackSubmissions,
  Announcement,
  DeadlineCheckResult,
} from '../types';


export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = localStorage.getItem('access_token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    const errorMsg =
      (data && data.detail) || `Request failed with status ${res.status}`;
    throw new Error(errorMsg);
  }

  return data as T;
}

// Authentication APIs
export const authApi = {
  login: (credentials: { email: string; password: string }) =>
    apiRequest<AuthResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    }),

  signup: (payload: { email: string; password: string; name: string; role: 'TRAINEE' | 'TRAINER' }) =>
    apiRequest<User>('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  changePassword: (payload: { current_password: string; new_password: string }) =>
    apiRequest<{ message: string }>('/api/auth/change-password', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
};

// Admin APIs
export const adminApi = {
  getDashboard: () =>
    apiRequest<AdminDashboardData>('/api/admin/dashboard'),

  getPendingUsers: () =>
    apiRequest<User[]>('/api/admin/pending-users'),

  getAllUsers: () =>
    apiRequest<User[]>('/api/admin/users'),

  approveUser: (userId: number) =>
    apiRequest<User>('/api/admin/approve-user', {
      method: 'POST',
      body: JSON.stringify({ user_id: userId }),
    }),

  getUserProfile: (userId: number) =>
    apiRequest<AdminUserProfile>(`/api/admin/users/${userId}/profile`),
};

// Course APIs
export const coursesApi = {
  getCourses: () =>
    apiRequest<Course[]>('/api/courses'),

  getTrainerCourses: () =>
    apiRequest<Course[]>('/api/trainer/my-courses'),

  createCourse: (payload: { title: string; description?: string; status?: 'DRAFT' | 'PUBLISHED' }) =>
    apiRequest<Course>('/api/courses', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  enrollCourse: (courseId: number) =>
    apiRequest<CourseEnrollment>(`/api/courses/${courseId}/enroll`, {
      method: 'POST',
    }),

  getMyEnrolledCourses: () =>
    apiRequest<CourseEnrollment[]>('/api/trainee/my-courses'),

  getCompletionStatus: (courseId: number, traineeId?: number) => {
    const query = traineeId ? `?trainee_id=${traineeId}` : '';
    return apiRequest<CourseCompletionStatus>(`/api/courses/${courseId}/completion-status${query}`);
  },

  getTrainerCourseTraineesCompletion: (courseId: number) =>
    apiRequest<TraineeCompletionSummary[]>(`/api/trainer/courses/${courseId}/trainees-completion`),
};

// Quiz APIs
export const quizzesApi = {
  getQuizzes: (courseId?: number) => {
    const query = courseId ? `?course_id=${courseId}` : '';
    return apiRequest<Quiz[]>(`/api/quizzes${query}`);
  },

  getQuiz: (quizId: number) =>
    apiRequest<Quiz>(`/api/quizzes/${quizId}`),

  createQuiz: (payload: { course_id: number; title: string; deadline?: string }) =>
    apiRequest<Quiz>('/api/quizzes', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  addQuestion: (
    quizId: number,
    payload: {
      text: string;
      options: string[];
      correct_index: number;
      explanation?: string;
    }
  ) =>
    apiRequest<Quiz>(`/api/quizzes/${quizId}/questions`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  submitQuiz: (
    quizId: number,
    payload: { answers: { question_id: number; selected_index: number }[] }
  ) =>
    apiRequest<Attempt>(`/api/quizzes/${quizId}/submit`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getMyAttempts: () =>
    apiRequest<Attempt[]>('/api/trainee/my-attempts'),

  getQuizResults: (quizId: number) =>
    apiRequest<QuizResultsSummary>(`/api/trainer/quizzes/${quizId}/results`),
};

// Phase 2: Profiles & Skills APIs
export const profilesApi = {
  getSkills: () =>
    apiRequest<Skill[]>('/api/skills'),

  // Trainee
  getTraineeProfile: () =>
    apiRequest<TraineeProfile>('/api/trainee/profile'),

  updateTraineeProfile: (payload: {
    qualification?: string;
    work_experience?: string;
    interests?: string;
    profile_summary?: string;
  }) =>
    apiRequest<TraineeProfile>('/api/trainee/profile', {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  getTraineeSkills: () =>
    apiRequest<UserSkill[]>('/api/trainee/skills'),

  addTraineeSkill: (payload: {
    skill_id?: number;
    skill_name?: string;
    category?: string;
    proficiency: ProficiencyLevel;
    evidence?: string;
  }) =>
    apiRequest<UserSkill>('/api/trainee/skills', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateTraineeSkill: (
    skillId: number,
    payload: {
      proficiency?: ProficiencyLevel;
      evidence?: string;
    }
  ) =>
    apiRequest<UserSkill>(`/api/trainee/skills/${skillId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  deleteTraineeSkill: (skillId: number) =>
    apiRequest<{ message: string }>(`/api/trainee/skills/${skillId}`, {
      method: 'DELETE',
    }),

  // Trainer
  getTrainerProfile: () =>
    apiRequest<TrainerProfile>('/api/trainer/profile'),

  updateTrainerProfile: (payload: {
    qualification?: string;
    specialization?: string;
    work_experience?: string;
    expertise_summary?: string;
  }) =>
    apiRequest<TrainerProfile>('/api/trainer/profile', {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  getTrainerSkills: () =>
    apiRequest<UserSkill[]>('/api/trainer/skills'),

  addTrainerSkill: (payload: {
    skill_id?: number;
    skill_name?: string;
    category?: string;
    proficiency: ProficiencyLevel;
    evidence?: string;
  }) =>
    apiRequest<UserSkill>('/api/trainer/skills', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateTrainerSkill: (
    skillId: number,
    payload: {
      proficiency?: ProficiencyLevel;
      evidence?: string;
    }
  ) =>
    apiRequest<UserSkill>(`/api/trainer/skills/${skillId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  deleteTrainerSkill: (skillId: number) =>
    apiRequest<{ message: string }>(`/api/trainer/skills/${skillId}`, {
      method: 'DELETE',
    }),
};

// Phase 3: Competencies & Matching APIs
export const competenciesApi = {
  getCourseCompetencies: (courseId: number) =>
    apiRequest<CourseCompetency[]>(`/api/courses/${courseId}/competencies`),

  addCourseCompetency: (
    courseId: number,
    payload: {
      skill_id?: number;
      skill_name?: string;
      category?: string;
      min_proficiency: ProficiencyLevel;
      weight?: number;
    }
  ) =>
    apiRequest<CourseCompetency>(`/api/courses/${courseId}/competencies`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateCourseCompetency: (
    courseId: number,
    competencyId: number,
    payload: {
      min_proficiency?: ProficiencyLevel;
      weight?: number;
    }
  ) =>
    apiRequest<CourseCompetency>(`/api/courses/${courseId}/competencies/${competencyId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  deleteCourseCompetency: (courseId: number, competencyId: number) =>
    apiRequest<{ message: string }>(`/api/courses/${courseId}/competencies/${competencyId}`, {
      method: 'DELETE',
    }),

  // Trainee Skill Gap & Recommendations
  getTraineeCourseSkillGap: (courseId: number) =>
    apiRequest<TraineeCourseSkillGap>(`/api/trainee/skill-gap/${courseId}`),

  getTraineeOverallSkillGap: () =>
    apiRequest<TraineeOverallSkillGap>('/api/trainee/skill-gap'),

  getTraineeRecommendations: () =>
    apiRequest<CourseRecommendation[]>('/api/trainee/recommendations'),

  // Trainer Matching
  getCourseTrainerMatches: (courseId: number) =>
    apiRequest<CourseTrainerMatchingResponse>(`/api/courses/${courseId}/trainer-matches`),

  getAdminTrainerMatching: (courseId: number) =>
    apiRequest<CourseTrainerMatchingResponse>(`/api/admin/trainer-matching/${courseId}`),
};

// Phase 4: Certificates APIs
export const certificatesApi = {
  issueCertificate: (payload: { course_id: number; trainee_id: number; grade?: string }) =>
    apiRequest<Certificate>('/api/certificates/issue', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getMyCertificates: () =>
    apiRequest<Certificate[]>('/api/trainee/certificates'),

  getTrainerCourseCertificates: (courseId: number) =>
    apiRequest<Certificate[]>(`/api/trainer/courses/${courseId}/certificates`),

  getAdminCertificates: () =>
    apiRequest<Certificate[]>('/api/admin/certificates'),

  revokeCertificate: (certificateId: number) =>
    apiRequest<Certificate>(`/api/admin/certificates/${certificateId}/revoke`, {
      method: 'POST',
    }),

  verifyCertificate: (certificateCode: string) =>
    apiRequest<CertificateVerification>(`/api/certificates/verify/${encodeURIComponent(certificateCode)}`),
};

// Phase 4 & 6: Notifications APIs
export const notificationsApi = {
  getNotifications: () =>
    apiRequest<AppNotification[]>('/api/notifications'),

  getUnreadCount: () =>
    apiRequest<{ unread_count: number }>('/api/notifications/unread-count'),

  markAsRead: (notificationId: number) =>
    apiRequest<AppNotification>(`/api/notifications/${notificationId}/read`, {
      method: 'PATCH',
    }),

  markAllAsRead: () =>
    apiRequest<{ message: string }>('/api/notifications/mark-all-read', {
      method: 'POST',
    }),

  checkDeadlines: () =>
    apiRequest<DeadlineCheckResult>('/api/notifications/check-deadlines', {
      method: 'POST',
    }),
};

// Phase 6: Feedback APIs
export const feedbackApi = {
  submitCourseFeedback: (payload: { course_id: number; rating: number; comment?: string }) =>
    apiRequest<CourseFeedback>('/api/feedback/courses', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getCourseFeedback: (courseId: number) =>
    apiRequest<CourseFeedbackSummary>(`/api/feedback/courses/${courseId}`),

  submitTrainerFeedback: (payload: { trainer_id: number; course_id: number; rating: number; comment?: string }) =>
    apiRequest<TrainerFeedback>('/api/feedback/trainers', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getTrainerFeedback: (trainerId: number) =>
    apiRequest<TrainerFeedbackSummary>(`/api/feedback/trainers/${trainerId}`),

  getMySubmissions: () =>
    apiRequest<MyFeedbackSubmissions>('/api/feedback/my-submissions'),
};

// Phase 6: Announcements APIs
export const announcementsApi = {
  createAnnouncement: (payload: { title: string; content: string; course_id?: number | null }) =>
    apiRequest<Announcement>('/api/announcements', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getAnnouncements: () =>
    apiRequest<Announcement[]>('/api/announcements'),
};


// Phase 5: Admin Analytics & Institutional Reports APIs
async function downloadCsvBlob(endpoint: string, defaultFilename: string): Promise<Blob> {
  const token = localStorage.getItem('access_token');
  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE_URL}${endpoint}`, { headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to download report' }));
    throw new Error(err.detail || 'Failed to download report');
  }

  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = defaultFilename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
  return blob;
}

export const analyticsApi = {
  getInstitutionalAnalytics: () =>
    apiRequest<InstitutionalAnalytics>('/api/admin/analytics/overview'),

  downloadEnrollmentsCsv: () =>
    downloadCsvBlob('/api/admin/reports/enrollments/csv', 'enrollments_report.csv'),

  downloadCertificatesCsv: () =>
    downloadCsvBlob('/api/admin/reports/certificates/csv', 'certificates_report.csv'),

  downloadCoursesCsv: () =>
    downloadCsvBlob('/api/admin/reports/courses-performance/csv', 'courses_performance_report.csv'),
};

