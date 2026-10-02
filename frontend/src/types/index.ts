export type UserRole = 'TRAINEE' | 'TRAINER' | 'ADMIN';
export type UserStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type CourseStatus = 'DRAFT' | 'PUBLISHED';
export type ProficiencyLevel = 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert';

export interface User {
  id: number;
  email: string;
  name: string;
  role: UserRole;
  status: UserStatus;
  is_active: boolean;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface Course {
  id: number;
  title: string;
  description: string | null;
  trainer_id: number;
  status: CourseStatus;
  created_at: string;
}

export interface CourseEnrollment {
  id: number;
  course_id: number;
  trainee_id: number;
  enrolled_at: string;
  completed_at: string | null;
  course?: Course;
}

export interface Question {
  id: number;
  quiz_id: number;
  text: string;
  options: string[];
  correct_index?: number;
  explanation?: string | null;
}

export interface Quiz {
  id: number;
  course_id: number;
  title: string;
  deadline: string | null;
  created_at: string;
  questions: Question[];
}

export interface AttemptDetail {
  id: number;
  question_id: number;
  selected_index: number;
  is_correct: boolean;
}

export interface Attempt {
  id: number;
  quiz_id: number;
  trainee_id: number;
  score: number;
  submitted_at: string;
  details: AttemptDetail[];
  quiz?: Quiz;
  trainee?: User;
}

export interface QuizResultsSummary {
  quiz_id: number;
  quiz_title: string;
  total_attempts: number;
  average_score: number;
  attempts: Attempt[];
}

export interface AdminDashboardData {
  total_users: number;
  total_trainees: number;
  total_trainers: number;
  total_courses: number;
  total_enrollments: number;
  total_attempts: number;
}

export interface Skill {
  id: number;
  name: string;
  category: string | null;
  description: string | null;
  created_at?: string;
}

export interface UserSkill {
  id: number;
  user_id: number;
  skill_id: number;
  proficiency: ProficiencyLevel;
  evidence: string | null;
  created_at?: string;
  skill?: Skill;
}

export interface TraineeProfile {
  user_id: number;
  name?: string;
  email?: string;
  role?: string;
  qualification: string | null;
  work_experience: string | null;
  interests: string | null;
  profile_summary: string | null;
  updated_at?: string | null;
  skills: UserSkill[];
}

export interface TrainerProfile {
  user_id: number;
  name?: string;
  email?: string;
  role?: string;
  qualification: string | null;
  specialization: string | null;
  work_experience: string | null;
  expertise_summary: string | null;
  updated_at?: string | null;
  skills: UserSkill[];
}

export interface AdminUserProfile {
  id: number;
  name: string;
  email: string;
  role: string;
  status: string;
  trainee_profile?: TraineeProfile | null;
  trainer_profile?: TrainerProfile | null;
  skills: UserSkill[];
}

export interface CourseCompetency {
  id: number;
  course_id: number;
  skill_id: number;
  min_proficiency: ProficiencyLevel;
  weight: number;
  created_at?: string;
  skill?: Skill;
}

export interface SkillGapItem {
  skill_id: number;
  skill_name: string;
  category?: string | null;
  required_proficiency: ProficiencyLevel;
  trainee_proficiency?: ProficiencyLevel | null;
  status: 'MATCHED' | 'INSUFFICIENT' | 'MISSING';
  weight: number;
  score_awarded: number;
  gap_message: string;
}

export interface CourseRecommendation {
  course_id: number;
  title: string;
  description?: string | null;
  skills_covered: string[];
  reason: string;
}

export interface TraineeCourseSkillGap {
  trainee_id: number;
  trainee_name: string;
  course_id: number;
  course_title: string;
  match_percentage: number;
  total_competencies: number;
  matched_count: number;
  insufficient_count: number;
  missing_count: number;
  matched_skills: SkillGapItem[];
  insufficient_skills: SkillGapItem[];
  missing_skills: SkillGapItem[];
  recommendations: CourseRecommendation[];
}

export interface TraineeOverallSkillGap {
  trainee_id: number;
  trainee_name: string;
  total_enrolled_courses: number;
  average_match_percentage: number;
  course_gaps: TraineeCourseSkillGap[];
  all_gap_skills: string[];
  curated_recommendations: CourseRecommendation[];
}

export interface TrainerCompetencyCoverage {
  skill_id: number;
  skill_name: string;
  category?: string | null;
  required_proficiency: ProficiencyLevel;
  trainer_proficiency?: ProficiencyLevel | null;
  status: 'MATCHED' | 'INSUFFICIENT' | 'MISSING';
  weight: number;
  score_awarded: number;
  message: string;
}

export interface TrainerMatchItem {
  trainer_id: number;
  trainer_name: string;
  trainer_email: string;
  qualification?: string | null;
  specialization?: string | null;
  match_percentage: number;
  matched_skills_count: number;
  total_skills_count: number;
  matched_competencies: TrainerCompetencyCoverage[];
  insufficient_competencies: TrainerCompetencyCoverage[];
  missing_competencies: TrainerCompetencyCoverage[];
}

export interface CourseTrainerMatchingResponse {
  course_id: number;
  course_title: string;
  required_competencies_count: number;
  required_competencies: CourseCompetency[];
  total_trainers_evaluated: number;
  ranked_trainers: TrainerMatchItem[];
}

export type CertificateStatus = 'ACTIVE' | 'REVOKED';

export interface Certificate {
  id: number;
  certificate_code: string;
  course_id: number;
  course_title?: string;
  trainee_id: number;
  trainee_name?: string;
  issuer_id: number;
  issuer_name?: string;
  issue_date: string;
  status: CertificateStatus;
  grade?: string | null;
  verification_hash: string;
  verification_url?: string;
}

export interface CertificateVerification {
  certificate_code: string;
  status: string;
  is_valid: boolean;
  course_title: string;
  trainee_name: string;
  issuer_name: string;
  issue_date: string;
  grade?: string | null;
  verification_hash: string;
}

export interface AppNotification {
  id: number;
  user_id: number;
  title: string;
  message: string;
  type: string;
  link?: string | null;
  is_read: boolean;
  created_at: string;
}

export interface QuizEvaluation {
  quiz_id: number;
  quiz_title: string;
  passed: boolean;
  best_score?: number | null;
  attempts_count: number;
}

export interface CourseCompletionStatus {
  course_id: number;
  course_title: string;
  trainee_id: number;
  is_completed: boolean;
  completed_at?: string | null;
  total_quizzes: number;
  passed_quizzes: number;
  average_score?: number | null;
  grade?: string | null;
  quiz_evaluations: QuizEvaluation[];
}

export interface TraineeCompletionSummary {
  trainee_id: number;
  trainee_name: string;
  trainee_email: string;
  enrolled_at: string;
  completed_at?: string | null;
  is_completed: boolean;
  has_certificate: boolean;
  certificate_id?: number | null;
  certificate_code?: string | null;
  certificate_status?: string | null;
  suggested_grade?: string | null;
  average_score?: number | null;
}

export interface AnalyticsKPIs {
  total_users: number;
  total_trainees: number;
  total_trainers: number;
  total_courses: number;
  total_enrollments: number;
  completed_enrollments: number;
  overall_completion_rate: number;
  total_quizzes: number;
  total_attempts: number;
  platform_average_quiz_score: number;
  total_certificates_issued: number;
  active_certificates: number;
  revoked_certificates: number;
}

export interface CourseCompletionMetric {
  course_id: number;
  course_title: string;
  trainer_name: string;
  total_enrolled: number;
  completed_count: number;
  completion_rate: number;
  average_quiz_score: number;
}

export interface SkillAcquisitionItem {
  skill_id: number;
  skill_name: string;
  category?: string | null;
  learner_count: number;
}

export interface SkillGapMetricItem {
  skill_id: number;
  skill_name: string;
  gap_count: number;
}

export interface SkillIntelligence {
  most_acquired_skills: SkillAcquisitionItem[];
  top_skill_gaps: SkillGapMetricItem[];
}

export interface TrainerPerformanceMetric {
  trainer_id: number;
  trainer_name: string;
  total_courses: number;
  total_students: number;
  average_student_score: number;
  completion_rate: number;
}

export interface InstitutionalAnalytics {
  kpis: AnalyticsKPIs;
  completion_metrics: CourseCompletionMetric[];
  grade_distribution: Record<string, number>;
  skill_intelligence: SkillIntelligence;
  trainer_performance: TrainerPerformanceMetric[];
}

// Phase 6: Feedback & Announcements Types
export interface CourseFeedback {
  id: number;
  course_id: number;
  trainee_id: number;
  trainee_name?: string;
  rating: number;
  comment?: string | null;
  created_at: string;
}

export interface CourseFeedbackSummary {
  course_id: number;
  course_title?: string;
  average_rating: number;
  total_reviews: number;
  reviews: CourseFeedback[];
}

export interface TrainerFeedback {
  id: number;
  trainer_id: number;
  trainer_name?: string;
  trainee_id: number;
  trainee_name?: string;
  course_id: number;
  course_title?: string;
  rating: number;
  comment?: string | null;
  created_at: string;
}

export interface TrainerFeedbackSummary {
  trainer_id: number;
  trainer_name?: string;
  average_rating: number;
  total_reviews: number;
  reviews: TrainerFeedback[];
}

export interface MyFeedbackSubmissions {
  course_feedbacks: CourseFeedback[];
  trainer_feedbacks: TrainerFeedback[];
}

export interface Announcement {
  id: number;
  author_id: number;
  author_name?: string;
  author_role?: string;
  course_id?: number | null;
  course_title?: string | null;
  title: string;
  content: string;
  created_at: string;
}

export interface DeadlineCheckResult {
  message: string;
  reminders_created: number;
  reminders: Array<{
    quiz_id: number;
    quiz_title: string;
    deadline: string;
    notification_id: number;
  }>;
}


