import React, { useState, useEffect } from 'react';
import { Navbar } from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import { coursesApi, quizzesApi, certificatesApi, notificationsApi } from '../api/client';
import { TraineeProfileSection } from '../components/TraineeProfileSection';
import { TraineeSkillGapSection } from '../components/TraineeSkillGapSection';
import { CertificateModal } from '../components/CertificateModal';
import { CourseFeedbackModal } from '../components/CourseFeedbackModal';
import { AnnouncementFeed } from '../components/AnnouncementFeed';
import type { Course, CourseEnrollment, Quiz, Attempt, Certificate } from '../types';

export const TraineeDashboard: React.FC = () => {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'my-courses' | 'catalog' | 'quizzes' | 'results' | 'profile' | 'skill-gap' | 'certificates' | 'announcements'>('my-courses');
  const [myEnrollments, setMyEnrollments] = useState<CourseEnrollment[]>([]);
  const [catalog, setCatalog] = useState<Course[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [myAttempts, setMyAttempts] = useState<Attempt[]>([]);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [selectedCertForModal, setSelectedCertForModal] = useState<Certificate | null>(null);
  const [feedbackCourseModal, setFeedbackCourseModal] = useState<{ courseId: number; courseTitle: string; trainerId?: number } | null>(null);
  const [loading, setLoading] = useState(true);

  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [enrollingId, setEnrollingId] = useState<number | null>(null);

  // Active quiz taker state
  const [activeQuizToTake, setActiveQuizToTake] = useState<Quiz | null>(null);
  const [loadingQuizDetails, setLoadingQuizDetails] = useState(false);
  const [userAnswers, setUserAnswers] = useState<Record<number, number>>({});
  const [submittingQuiz, setSubmittingQuiz] = useState(false);
  const [latestAttemptResult, setLatestAttemptResult] = useState<Attempt | null>(null);

  const loadTraineeData = async () => {
    setLoading(true);
    try {
      const [enrollments, allCourses, allQuizzes, attempts, myCerts] = await Promise.all([
        coursesApi.getMyEnrolledCourses().catch(() => []),
        coursesApi.getCourses().catch(() => []),
        quizzesApi.getQuizzes().catch(() => []),
        quizzesApi.getMyAttempts().catch(() => []),
        certificatesApi.getMyCertificates().catch(() => []),
      ]);

      setMyEnrollments(enrollments);
      setCatalog(allCourses);
      setQuizzes(allQuizzes);
      setMyAttempts(attempts);
      setCertificates(myCerts);

      // Check deadlines in background
      notificationsApi.checkDeadlines().catch(() => {});
    } catch (err: unknown) {
      console.error('Failed to load trainee data', err);
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    loadTraineeData();
  }, []);

  const handleEnroll = async (courseId: number) => {
    setEnrollingId(courseId);
    setMessage(null);
    try {
      await coursesApi.enrollCourse(courseId);
      setMessage({ text: 'Successfully enrolled in course!', type: 'success' });
      await loadTraineeData();
      setActiveTab('my-courses');
    } catch (err: unknown) {
      const error = err as Error;
      setMessage({ text: error.message || 'Enrollment failed', type: 'error' });
    } finally {
      setEnrollingId(null);
    }
  };

  const isEnrolled = (courseId: number) => {
    return myEnrollments.some((e) => e.course_id === courseId);
  };

  const handleOpenQuiz = async (quizId: number) => {
    setLoadingQuizDetails(true);
    setLatestAttemptResult(null);
    setUserAnswers({});
    try {
      const fullQuiz = await quizzesApi.getQuiz(quizId);
      setActiveQuizToTake(fullQuiz);
    } catch (err: unknown) {
      const error = err as Error;
      setMessage({ text: error.message || 'Could not load quiz details', type: 'error' });
    } finally {
      setLoadingQuizDetails(false);
    }
  };

  const handleSubmitQuiz = async () => {
    if (!activeQuizToTake) return;

    const questions = activeQuizToTake.questions || [];
    if (questions.length === 0) {
      setMessage({ text: 'This quiz has no questions yet', type: 'error' });
      return;
    }

    // Prepare answers payload
    const formattedAnswers = questions.map((q) => ({
      question_id: q.id,
      selected_index: userAnswers[q.id] !== undefined ? userAnswers[q.id] : -1,
    }));

    // Verify all answered
    const unanswered = formattedAnswers.some((a) => a.selected_index === -1);
    if (unanswered) {
      alert('Please select an answer for all questions before submitting.');
      return;
    }

    setSubmittingQuiz(true);
    try {
      const result = await quizzesApi.submitQuiz(activeQuizToTake.id, {
        answers: formattedAnswers,
      });

      setLatestAttemptResult(result);
      // Reload attempts
      const updatedAttempts = await quizzesApi.getMyAttempts().catch(() => []);
      setMyAttempts(updatedAttempts);
    } catch (err: unknown) {
      const error = err as Error;
      alert(`Submission failed: ${error.message}`);
    } finally {
      setSubmittingQuiz(false);
    }
  };

  const navTabs = [
    { id: 'my-courses', label: `My Courses (${myEnrollments.length})` },
    { id: 'catalog', label: `Available Courses (${catalog.length})` },
    { id: 'quizzes', label: `Assessments (${quizzes.length})` },
    { id: 'results', label: `My Scores (${myAttempts.length})` },
    { id: 'certificates', label: `Certificates (${certificates.length})` },
    { id: 'announcements', label: '📢 Announcements' },
    { id: 'profile', label: 'My Profile & Skills' },

    { id: 'skill-gap', label: 'Skill Gap & Recommendations' },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Navbar
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab as any);
          setMessage(null);
        }}
        tabs={navTabs}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Trainee Banner */}
        <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-950 text-emerald-400 border border-emerald-800">
                Trainee Learning Space
              </span>
              <span className="text-xs text-slate-400">Personalized Growth Portal</span>
            </div>
            <h2 className="text-2xl font-black text-white mt-2">
              Welcome, {currentUser?.name}
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Explore capacity building courses, enroll in curriculum, and complete MCQ assessments.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="px-4 py-2 bg-slate-800/80 border border-slate-700 rounded-2xl text-center">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Enrolled Modules</span>
              <span className="text-xl font-black text-white">{myEnrollments.length}</span>
            </div>
            <div className="px-4 py-2 bg-slate-800/80 border border-slate-700 rounded-2xl text-center">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Quizzes Completed</span>
              <span className="text-xl font-black text-emerald-400">{myAttempts.length}</span>
            </div>
          </div>
        </div>

        {message && (
          <div
            className={`mb-6 p-4 rounded-2xl text-sm font-medium border ${
              message.type === 'success'
                ? 'bg-emerald-950/60 border-emerald-800 text-emerald-300'
                : 'bg-rose-950/60 border-rose-800 text-rose-300'
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Tab 1: My Courses */}
        {activeTab === 'my-courses' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-white">My Enrolled Courses</h3>
                <p className="text-xs text-slate-400 mt-0.5">Programs you have registered for.</p>
              </div>
              <button
                onClick={() => setActiveTab('catalog')}
                className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 cursor-pointer"
              >
                Browse Catalog →
              </button>
            </div>

            {loading ? (
              <div className="py-12 text-center text-slate-500 text-xs">Loading your enrollments...</div>
            ) : myEnrollments.length === 0 ? (
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center">
                <p className="text-sm font-medium text-slate-300">You are not enrolled in any courses yet.</p>
                <p className="text-xs text-slate-500 mt-1 mb-4">
                  Explore available modules from verified trainers and boost your capacities.
                </p>
                <button
                  onClick={() => setActiveTab('catalog')}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Browse Available Courses
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {myEnrollments.map((enr) => (
                  <div
                    key={enr.id}
                    className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3 text-[10px] text-slate-400">
                        <span className="font-mono">Course #{enr.course_id}</span>
                        {enr.completed_at ? (
                          <span className="px-2 py-0.5 rounded-full font-bold bg-indigo-950 text-indigo-300 border border-indigo-700 shadow-xs">
                            Completed 🎉
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
                            Active Learner
                          </span>
                        )}
                      </div>
                      <h4 className="text-lg font-bold text-white leading-snug">
                        {enr.course?.title || `Module #${enr.course_id}`}
                      </h4>
                      <p className="text-xs text-slate-300 mt-2 line-clamp-3">
                        {enr.course?.description || 'Curriculum objectives enrolled.'}
                      </p>
                    </div>

                    <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between">
                      <span className="text-[10px] text-slate-500">
                        {enr.completed_at
                          ? `Completed ${new Date(enr.completed_at).toLocaleDateString()}`
                          : `Enrolled ${new Date(enr.enrolled_at).toLocaleDateString()}`}
                      </span>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => setFeedbackCourseModal({
                            courseId: enr.course_id,
                            courseTitle: enr.course?.title || `Course #${enr.course_id}`,
                            trainerId: enr.course?.trainer_id,
                          })}
                          title="Evaluate course & instructor"
                          className="text-xs font-semibold text-amber-400 hover:text-amber-300 cursor-pointer flex items-center gap-1"
                        >
                          <span>⭐ Review</span>
                        </button>
                        {(() => {
                          const cert = certificates.find((c) => c.course_id === enr.course_id);
                          if (cert) {
                            return (
                              <button
                                onClick={() => setSelectedCertForModal(cert)}
                                className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 cursor-pointer flex items-center gap-1"
                              >
                                <span>🏆 Diploma</span>
                              </button>
                            );
                          }
                          return (
                            <button
                              onClick={() => setActiveTab('quizzes')}
                              className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 cursor-pointer"
                            >
                              Take Quizzes →
                            </button>
                          );
                        })()}
                      </div>
                    </div>
                  </div>

                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Available Courses */}
        {activeTab === 'catalog' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-white">Course Catalog Directory</h3>
                <p className="text-xs text-slate-400 mt-0.5">Explore institutional capacity building modules.</p>
              </div>
            </div>

            {loading ? (
              <div className="py-12 text-center text-slate-500 text-xs">Loading course catalog...</div>
            ) : catalog.length === 0 ? (
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center text-slate-500 text-xs">
                No published courses available at this time.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {catalog.map((course) => {
                  const alreadyEnrolled = isEnrolled(course.id);
                  return (
                    <div
                      key={course.id}
                      className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-3 text-[10px] text-slate-400">
                          <span className="font-mono">Module #{course.id}</span>
                          <span className="px-2 py-0.5 rounded-full font-bold bg-blue-950 text-blue-300 border border-blue-800">
                            {course.status}
                          </span>
                        </div>
                        <h4 className="text-lg font-bold text-white leading-snug">{course.title}</h4>
                        <p className="text-xs text-slate-300 mt-2 line-clamp-3">
                          {course.description || 'No description provided.'}
                        </p>
                      </div>

                      <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between">
                        <span className="text-[10px] text-slate-500">
                          Faculty #{course.trainer_id}
                        </span>

                        {alreadyEnrolled ? (
                          <span className="px-3 py-1.5 rounded-xl bg-slate-800 text-emerald-400 text-xs font-semibold border border-slate-700">
                            ✓ Enrolled
                          </span>
                        ) : (
                          <button
                            onClick={() => handleEnroll(course.id)}
                            disabled={enrollingId === course.id}
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-600/30 transition-all cursor-pointer"
                          >
                            {enrollingId === course.id ? 'Enrolling...' : 'Enroll in Course'}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Quizzes */}
        {activeTab === 'quizzes' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-white">Subject-wise Assessments</h3>
                <p className="text-xs text-slate-400 mt-0.5">Test your comprehension with automated grading.</p>
              </div>
            </div>

            {loading ? (
              <div className="py-12 text-center text-slate-500 text-xs">Loading assessments...</div>
            ) : quizzes.length === 0 ? (
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center text-slate-500 text-xs">
                No active assessments found.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {quizzes.map((quiz) => (
                  <div
                    key={quiz.id}
                    className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-mono text-slate-400">
                          Course #{quiz.course_id}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-950 text-blue-300 border border-blue-800">
                          {quiz.questions ? quiz.questions.length : 0} Questions
                        </span>
                      </div>
                      <h4 className="text-lg font-bold text-white">{quiz.title}</h4>
                      {quiz.deadline && (
                        <p className="text-[11px] text-amber-400 mt-1">
                          Deadline: {new Date(quiz.deadline).toLocaleString()}
                        </p>
                      )}
                    </div>

                    <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between">
                      <span className="text-[10px] text-slate-500">
                        {quiz.questions?.length || 0} Questions
                      </span>
                      <button
                        onClick={() => handleOpenQuiz(quiz.id)}
                        disabled={loadingQuizDetails}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-600/30 transition-all cursor-pointer"
                      >
                        Attend Assessment →
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 4: Results */}
        {activeTab === 'results' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-bold text-white">My Assessment History & Scores</h3>
              <p className="text-xs text-slate-400 mt-0.5">Your official grades graded by LearnBridge engine.</p>
            </div>

            {loading ? (
              <div className="py-12 text-center text-slate-500 text-xs">Loading your scores...</div>
            ) : myAttempts.length === 0 ? (
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center">
                <p className="text-sm font-medium text-slate-300">You haven't attempted any quizzes yet.</p>
                <p className="text-xs text-slate-500 mt-1 mb-4">
                  Take a subject assessment to track your competency achievements.
                </p>
                <button
                  onClick={() => setActiveTab('quizzes')}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Go to Assessments
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {myAttempts.map((attempt) => (
                  <div
                    key={attempt.id}
                    className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col md:flex-row md:items-center md:justify-between gap-4"
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-mono text-slate-400">
                          Attempt #{attempt.id}
                        </span>
                        <span className="text-xs text-slate-500">•</span>
                        <span className="text-xs text-slate-400">
                          {new Date(attempt.submitted_at).toLocaleString()}
                        </span>
                      </div>
                      <h4 className="text-lg font-bold text-white">
                        {attempt.quiz?.title || `Assessment Quiz #${attempt.quiz_id}`}
                      </h4>
                      <p className="text-xs text-slate-400 mt-1">
                        {attempt.details?.filter((d) => d.is_correct).length || 0} of{' '}
                        {attempt.details?.length || 0} questions correct
                      </p>
                    </div>

                    <div className="flex items-center gap-4">
                      <div
                        className={`px-4 py-2 rounded-2xl text-center border ${
                          attempt.score >= 50
                            ? 'bg-emerald-950/70 border-emerald-800 text-emerald-300'
                            : 'bg-rose-950/70 border-rose-800 text-rose-300'
                        }`}
                      >
                        <span className="text-[10px] uppercase font-bold block">Score</span>
                        <span className="text-2xl font-black">{attempt.score}%</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 5: Profile & Skills */}
        {activeTab === 'profile' && (
          <TraineeProfileSection onProfileUpdated={loadTraineeData} />
        )}

        {/* Tab 6: Skill Gap & Recommendations */}
        {activeTab === 'skill-gap' && (
          <TraineeSkillGapSection onEnrollSuccess={loadTraineeData} />
        )}

        {/* Modal: Take Quiz */}
        {activeQuizToTake && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 overflow-y-auto">
            <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl my-8">
              <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-5">
                <div>
                  <h3 className="text-xl font-bold text-white">{activeQuizToTake.title}</h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Course #{activeQuizToTake.course_id} • {activeQuizToTake.questions?.length || 0} Questions
                  </p>
                </div>
                <button
                  onClick={() => {
                    setActiveQuizToTake(null);
                    setLatestAttemptResult(null);
                  }}
                  className="text-slate-400 hover:text-white cursor-pointer font-bold"
                >
                  ✕
                </button>
              </div>

              {latestAttemptResult ? (
                /* Results Display */
                <div className="text-center py-6 space-y-4">
                  <div
                    className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center text-3xl font-black border ${
                      latestAttemptResult.score >= 50
                        ? 'bg-emerald-950/80 border-emerald-600 text-emerald-400'
                        : 'bg-rose-950/80 border-rose-600 text-rose-400'
                    }`}
                  >
                    {latestAttemptResult.score}%
                  </div>
                  <h4 className="text-xl font-bold text-white">Assessment Evaluated!</h4>
                  <p className="text-xs text-slate-300">
                    You scored <span className="font-bold text-white">{latestAttemptResult.score}%</span>.
                    Your score has been permanently recorded in your academic profile.
                  </p>

                  <div className="pt-4 flex gap-3 justify-center">
                    <button
                      onClick={() => {
                        setActiveQuizToTake(null);
                        setLatestAttemptResult(null);
                        setActiveTab('results');
                      }}
                      className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold cursor-pointer"
                    >
                      View All Scores
                    </button>
                  </div>
                </div>
              ) : (
                /* Questions Form */
                <div className="space-y-6">
                  {(!activeQuizToTake.questions || activeQuizToTake.questions.length === 0) ? (
                    <div className="py-8 text-center text-slate-500 text-xs">
                      No questions have been configured for this quiz yet.
                    </div>
                  ) : (
                    activeQuizToTake.questions.map((question, qIdx) => (
                      <div
                        key={question.id}
                        className="p-5 bg-slate-800/60 border border-slate-700/60 rounded-2xl space-y-3"
                      >
                        <p className="text-sm font-semibold text-white">
                          <span className="text-indigo-400 font-bold mr-2">Q{qIdx + 1}.</span>
                          {question.text}
                        </p>

                        <div className="space-y-2 pt-1">
                          {question.options.map((opt, optIdx) => (
                            <label
                              key={optIdx}
                              className={`flex items-center gap-3 p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                                userAnswers[question.id] === optIdx
                                  ? 'bg-indigo-950/60 border-indigo-600 text-white'
                                  : 'bg-slate-850 border-slate-700/50 text-slate-300 hover:bg-slate-800'
                              }`}
                            >
                              <input
                                type="radio"
                                name={`q_${question.id}`}
                                checked={userAnswers[question.id] === optIdx}
                                onChange={() =>
                                  setUserAnswers({ ...userAnswers, [question.id]: optIdx })
                                }
                                className="w-4 h-4 text-indigo-600 focus:ring-indigo-500"
                              />
                              <span>{opt}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    ))
                  )}

                  {activeQuizToTake.questions && activeQuizToTake.questions.length > 0 && (
                    <div className="pt-4 flex gap-3">
                      <button
                        type="button"
                        onClick={() => setActiveQuizToTake(null)}
                        className="flex-1 py-3 bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleSubmitQuiz}
                        disabled={submittingQuiz}
                        className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-600/30 transition-all cursor-pointer"
                      >
                        {submittingQuiz ? 'Grading Assessment...' : 'Submit Answers for Grading'}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab: Earned Certificates */}
        {activeTab === 'certificates' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h3 className="text-xl font-bold text-white">Earned Certificates & Credentials</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Tamper-proof verifiable credentials awarded upon achieving course completion criteria.
                </p>
              </div>
              <a
                href="/verify-certificate"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-semibold px-4 py-2 bg-slate-800 text-indigo-400 hover:text-indigo-300 rounded-xl border border-slate-700 hover:bg-slate-700 transition-colors inline-flex items-center gap-1.5 self-start sm:self-auto"
              >
                <span>Public Verification Registry ↗</span>
              </a>
            </div>

            {loading ? (
              <div className="py-12 text-center text-slate-500 text-xs">Loading certificates...</div>
            ) : certificates.length === 0 ? (
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center">
                <span className="text-4xl block mb-2">🏆</span>
                <p className="text-sm font-semibold text-slate-300">No Certificates Earned Yet</p>
                <p className="text-xs text-slate-500 mt-1 mb-4 max-w-md mx-auto">
                  Satisfy all course assessment requirements with passing grades to earn official accredited certificates.
                </p>
                <button
                  onClick={() => setActiveTab('my-courses')}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold cursor-pointer shadow-md shadow-indigo-600/30 transition-all"
                >
                  Continue Coursework
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {certificates.map((cert) => (
                  <div
                    key={cert.id}
                    className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col justify-between relative overflow-hidden group hover:border-indigo-500/40 transition-all"
                  >
                    <div>
                      {/* Top Header Badge */}
                      <div className="flex items-center justify-between mb-3 text-[10px]">
                        <span
                          className={`px-2.5 py-0.5 rounded-full font-bold border ${
                            cert.status === 'ACTIVE'
                              ? 'bg-emerald-950/70 text-emerald-300 border-emerald-800'
                              : 'bg-rose-950/70 text-rose-300 border-rose-800'
                          }`}
                        >
                          ● {cert.status}
                        </span>
                        <span className="font-mono text-indigo-400 font-bold bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                          {cert.certificate_code}
                        </span>
                      </div>

                      <h4 className="text-lg font-bold text-white leading-snug group-hover:text-indigo-300 transition-colors">
                        {cert.course_title || `Course #${cert.course_id}`}
                      </h4>

                      <div className="mt-4 p-3 bg-slate-800/40 border border-slate-800 rounded-xl space-y-1 text-xs">
                        <div className="flex justify-between text-[11px]">
                          <span className="text-slate-400">Awarded To:</span>
                          <span className="text-slate-200 font-medium">{cert.trainee_name}</span>
                        </div>
                        <div className="flex justify-between text-[11px]">
                          <span className="text-slate-400">Issued On:</span>
                          <span className="text-slate-200">
                            {new Date(cert.issue_date).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="flex justify-between text-[11px]">
                          <span className="text-slate-400">Grade Standing:</span>
                          <span className="text-emerald-400 font-bold">{cert.grade || 'Pass'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between gap-2">
                      <button
                        onClick={() => setSelectedCertForModal(cert)}
                        className="flex-1 py-2 px-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-600/25 transition-all cursor-pointer text-center"
                      >
                        View Diploma & QR
                      </button>
                      <a
                        href={`/verify-certificate?code=${cert.certificate_code}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-semibold transition-all text-center"
                      >
                        Verify ↗
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 8: Announcements */}
        {activeTab === 'announcements' && (
          <div className="space-y-6">
            <AnnouncementFeed canCreate={false} />
          </div>
        )}
      </main>

      {/* Certificate Modal */}
      <CertificateModal
        certificate={selectedCertForModal}
        onClose={() => setSelectedCertForModal(null)}
      />

      {/* Course Feedback Modal */}
      {feedbackCourseModal && (
        <CourseFeedbackModal
          courseId={feedbackCourseModal.courseId}
          courseTitle={feedbackCourseModal.courseTitle}
          trainerId={feedbackCourseModal.trainerId}
          onClose={() => setFeedbackCourseModal(null)}
        />
      )}
    </div>
  );
};

