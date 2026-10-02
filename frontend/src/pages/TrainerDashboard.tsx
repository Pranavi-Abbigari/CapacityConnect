import React, { useState, useEffect } from 'react';
import { Navbar } from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import { coursesApi, quizzesApi } from '../api/client';
import { TrainerProfileSection } from '../components/TrainerProfileSection';
import { TrainerCourseCompetencyModal } from '../components/TrainerCourseCompetencyModal';
import { TrainerMatchingModal } from '../components/TrainerMatchingModal';
import { TrainerCompletionModal } from '../components/TrainerCompletionModal';
import { CertificateModal } from '../components/CertificateModal';
import type { Course, Quiz, QuizResultsSummary, Certificate } from '../types';

export const TrainerDashboard: React.FC = () => {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'courses' | 'quizzes' | 'profile'>('courses');
  const [activeCourseForCompetencies, setActiveCourseForCompetencies] = useState<Course | null>(null);
  const [activeCourseForMatching, setActiveCourseForMatching] = useState<Course | null>(null);
  const [activeCourseForCertificates, setActiveCourseForCertificates] = useState<Course | null>(null);
  const [selectedCertForModal, setSelectedCertForModal] = useState<Certificate | null>(null);
  const [myCourses, setMyCourses] = useState<Course[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Modal states
  const [isCourseModalOpen, setIsCourseModalOpen] = useState(false);
  const [courseTitle, setCourseTitle] = useState('');
  const [courseDescription, setCourseDescription] = useState('');
  const [submittingCourse, setSubmittingCourse] = useState(false);

  const [isQuizModalOpen, setIsQuizModalOpen] = useState(false);
  const [selectedCourseId, setSelectedCourseId] = useState<number | ''>('');
  const [quizTitle, setQuizTitle] = useState('');
  const [submittingQuiz, setSubmittingQuiz] = useState(false);

  const [isQuestionModalOpen, setIsQuestionModalOpen] = useState(false);
  const [activeQuizForQuestion, setActiveQuizForQuestion] = useState<Quiz | null>(null);
  const [questionText, setQuestionText] = useState('');
  const [opt0, setOpt0] = useState('');
  const [opt1, setOpt1] = useState('');
  const [opt2, setOpt2] = useState('');
  const [opt3, setOpt3] = useState('');
  const [correctIndex, setCorrectIndex] = useState<number>(0);
  const [explanation, setExplanation] = useState('');
  const [submittingQuestion, setSubmittingQuestion] = useState(false);

  const [activeResultsModal, setActiveResultsModal] = useState<QuizResultsSummary | null>(null);
  const [loadingResults, setLoadingResults] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [courses, allQuizzes] = await Promise.all([
        coursesApi.getTrainerCourses().catch(() => coursesApi.getCourses()),
        quizzesApi.getQuizzes().catch(() => []),
      ]);
      setMyCourses(courses);
      setQuizzes(allQuizzes);
    } catch (err: unknown) {
      console.error('Error fetching trainer data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingCourse(true);
    setMessage(null);
    try {
      await coursesApi.createCourse({
        title: courseTitle,
        description: courseDescription,
        status: 'PUBLISHED',
      });
      setMessage({ text: 'Course successfully published!', type: 'success' });
      setCourseTitle('');
      setCourseDescription('');
      setIsCourseModalOpen(false);
      await loadData();
    } catch (err: unknown) {
      const error = err as Error;
      setMessage({ text: error.message || 'Failed to create course', type: 'error' });
    } finally {
      setSubmittingCourse(false);
    }
  };

  const handleCreateQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourseId) {
      setMessage({ text: 'Please select a course for this quiz', type: 'error' });
      return;
    }
    setSubmittingQuiz(true);
    setMessage(null);
    try {
      await quizzesApi.createQuiz({
        course_id: Number(selectedCourseId),
        title: quizTitle,
      });
      setMessage({ text: 'Assessment quiz created! Now add questions.', type: 'success' });
      setQuizTitle('');
      setIsQuizModalOpen(false);
      await loadData();
    } catch (err: unknown) {
      const error = err as Error;
      setMessage({ text: error.message || 'Failed to create quiz', type: 'error' });
    } finally {
      setSubmittingQuiz(false);
    }
  };

  const handleAddQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeQuizForQuestion) return;

    if (!opt0 || !opt1 || !opt2 || !opt3) {
      setMessage({ text: 'Please enter all 4 options', type: 'error' });
      return;
    }

    setSubmittingQuestion(true);
    setMessage(null);
    try {
      await quizzesApi.addQuestion(activeQuizForQuestion.id, {
        text: questionText,
        options: [opt0, opt1, opt2, opt3],
        correct_index: Number(correctIndex),
        explanation: explanation || undefined,
      });

      setMessage({ text: 'Question added to assessment!', type: 'success' });
      setQuestionText('');
      setOpt0('');
      setOpt1('');
      setOpt2('');
      setOpt3('');
      setExplanation('');
      setCorrectIndex(0);
      setIsQuestionModalOpen(false);
      await loadData();
    } catch (err: unknown) {
      const error = err as Error;
      setMessage({ text: error.message || 'Failed to add question', type: 'error' });
    } finally {
      setSubmittingQuestion(false);
    }
  };

  const handleViewResults = async (quizId: number) => {
    setLoadingResults(true);
    try {
      const summary = await quizzesApi.getQuizResults(quizId);
      setActiveResultsModal(summary);
    } catch (err: unknown) {
      const error = err as Error;
      setMessage({ text: error.message || 'Failed to load results', type: 'error' });
    } finally {
      setLoadingResults(false);
    }
  };

  const navTabs = [
    { id: 'courses', label: `My Courses (${myCourses.length})` },
    { id: 'quizzes', label: `Assessments & Quizzes (${quizzes.length})` },
    { id: 'profile', label: 'Expertise & Profile' },
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
        {/* Trainer Banner */}
        <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-blue-950 text-blue-400 border border-blue-800">
                Trainer Portal
              </span>
              <span className="text-xs text-slate-400">Institutional Faculty Member</span>
            </div>
            <h2 className="text-2xl font-black text-white mt-2">
              Welcome back, {currentUser?.name}
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Author capacity building curriculum, publish assessments, and evaluate trainee progress.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setIsCourseModalOpen(true)}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-600/30 transition-all cursor-pointer"
            >
              + Create Course
            </button>
            <button
              onClick={() => setIsQuizModalOpen(true)}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold transition-all cursor-pointer"
            >
              + Create Quiz
            </button>
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

        {/* Tab 1: Courses */}
        {activeTab === 'courses' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-white">Your Training Programs & Courses</h3>
              <button
                onClick={() => setIsCourseModalOpen(true)}
                className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 cursor-pointer"
              >
                + New Course
              </button>
            </div>

            {loading ? (
              <div className="py-12 text-center text-slate-500 text-xs">Loading course modules...</div>
            ) : myCourses.length === 0 ? (
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center">
                <p className="text-sm font-medium text-slate-300">You haven't authored any courses yet.</p>
                <p className="text-xs text-slate-500 mt-1 mb-4">
                  Create your first capacity building curriculum to publish training modules for trainees.
                </p>
                <button
                  onClick={() => setIsCourseModalOpen(true)}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Create Your First Course
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {myCourses.map((course) => (
                  <div
                    key={course.id}
                    className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-3xl p-6 shadow-xl flex flex-col justify-between transition-all"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3 text-[10px] text-slate-400">
                        <span className="font-mono">Module #{course.id}</span>
                        <span className="px-2 py-0.5 rounded-full font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-800">
                          {course.status}
                        </span>
                      </div>
                      <h4 className="text-lg font-bold text-white leading-snug">{course.title}</h4>
                      <p className="text-xs text-slate-300 mt-2 line-clamp-3">
                        {course.description || 'No description provided.'}
                      </p>
                    </div>

                    <div className="mt-6 pt-4 border-t border-slate-800 flex flex-col gap-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-slate-500">
                          Created {new Date(course.created_at).toLocaleDateString()}
                        </span>
                        <button
                          onClick={() => {
                            setSelectedCourseId(course.id);
                            setIsQuizModalOpen(true);
                          }}
                          className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 cursor-pointer"
                        >
                          + Add Assessment
                        </button>
                      </div>
                      <div className="grid grid-cols-3 gap-1.5 pt-1 border-t border-slate-800/60">
                        <button
                          onClick={() => setActiveCourseForCompetencies(course)}
                          className="py-1.5 px-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[10px] font-semibold transition-all border border-slate-700 cursor-pointer text-center truncate"
                        >
                          Prerequisites
                        </button>
                        <button
                          onClick={() => setActiveCourseForMatching(course)}
                          className="py-1.5 px-1.5 bg-purple-950/60 hover:bg-purple-900/60 text-purple-300 rounded-lg text-[10px] font-semibold transition-all border border-purple-800/80 cursor-pointer text-center truncate"
                        >
                          Matching
                        </button>
                        <button
                          onClick={() => setActiveCourseForCertificates(course)}
                          className="py-1.5 px-1.5 bg-indigo-950/60 hover:bg-indigo-900/60 text-indigo-300 rounded-lg text-[10px] font-semibold transition-all border border-indigo-800/80 cursor-pointer text-center truncate"
                        >
                          Certs 🏆
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Quizzes */}
        {activeTab === 'quizzes' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-white">Subject-wise Assessments & MCQs</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Build multi-choice questionnaires and view automatic grading outcomes.
                </p>
              </div>
              <button
                onClick={() => setIsQuizModalOpen(true)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold cursor-pointer"
              >
                + New Quiz
              </button>
            </div>

            {loading ? (
              <div className="py-12 text-center text-slate-500 text-xs">Loading assessments...</div>
            ) : quizzes.length === 0 ? (
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center">
                <p className="text-sm font-medium text-slate-300">No assessments created yet.</p>
                <p className="text-xs text-slate-500 mt-1 mb-4">
                  Create a quiz linked to your courses to test trainee knowledge.
                </p>
                <button
                  onClick={() => setIsQuizModalOpen(true)}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Create Assessment Quiz
                </button>
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

                    <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between gap-3">
                      <button
                        onClick={() => {
                          setActiveQuizForQuestion(quiz);
                          setIsQuestionModalOpen(true);
                        }}
                        className="flex-1 py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition-all border border-slate-700 cursor-pointer"
                      >
                        + Add Question
                      </button>
                      <button
                        onClick={() => handleViewResults(quiz.id)}
                        disabled={loadingResults}
                        className="flex-1 py-2 px-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition-all shadow-sm cursor-pointer"
                      >
                        View Results
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Expertise & Profile */}
        {activeTab === 'profile' && (
          <TrainerProfileSection onProfileUpdated={loadData} />
        )}

        {/* Modal: Create Course */}
        {isCourseModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
            <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl">
              <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-5">
                <h3 className="text-lg font-bold text-white">Create New Course Module</h3>
                <button
                  onClick={() => setIsCourseModalOpen(false)}
                  className="text-slate-400 hover:text-white cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreateCourse} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                    Course Title
                  </label>
                  <input
                    type="text"
                    required
                    value={courseTitle}
                    onChange={(e) => setCourseTitle(e.target.value)}
                    placeholder="e.g. Cloud Architecture & Microservices"
                    className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                    Description & Objectives
                  </label>
                  <textarea
                    rows={4}
                    value={courseDescription}
                    onChange={(e) => setCourseDescription(e.target.value)}
                    placeholder="Detailed syllabus and learning competencies covered..."
                    className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="flex gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setIsCourseModalOpen(false)}
                    className="flex-1 py-2.5 bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingCourse}
                    className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-md cursor-pointer"
                  >
                    {submittingCourse ? 'Publishing...' : 'Publish Course'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Create Quiz */}
        {isQuizModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
            <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl">
              <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-5">
                <h3 className="text-lg font-bold text-white">Create Assessment Questionnaire</h3>
                <button
                  onClick={() => setIsQuizModalOpen(false)}
                  className="text-slate-400 hover:text-white cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreateQuiz} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                    Select Associated Course
                  </label>
                  <select
                    required
                    value={selectedCourseId}
                    onChange={(e) => setSelectedCourseId(Number(e.target.value))}
                    className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">-- Choose a course --</option>
                    {myCourses.map((c) => (
                      <option key={c.id} value={c.id}>
                        #{c.id}: {c.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                    Assessment Title
                  </label>
                  <input
                    type="text"
                    required
                    value={quizTitle}
                    onChange={(e) => setQuizTitle(e.target.value)}
                    placeholder="e.g. Module 1: Comprehensive Assessment"
                    className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="flex gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setIsQuizModalOpen(false)}
                    className="flex-1 py-2.5 bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingQuiz}
                    className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-md cursor-pointer"
                  >
                    {submittingQuiz ? 'Creating...' : 'Create Assessment'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Add Question */}
        {isQuestionModalOpen && activeQuizForQuestion && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 overflow-y-auto">
            <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl my-8">
              <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-5">
                <div>
                  <h3 className="text-lg font-bold text-white">Add MCQ Question</h3>
                  <p className="text-xs text-slate-400 mt-0.5">To: {activeQuizForQuestion.title}</p>
                </div>
                <button
                  onClick={() => setIsQuestionModalOpen(false)}
                  className="text-slate-400 hover:text-white cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleAddQuestion} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                    Question Text
                  </label>
                  <textarea
                    rows={2}
                    required
                    value={questionText}
                    onChange={(e) => setQuestionText(e.target.value)}
                    placeholder="Enter the MCQ question here..."
                    className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="space-y-3">
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Four Answer Choices (Select the radio of the correct answer)
                  </label>

                  {[
                    { val: opt0, setVal: setOpt0, idx: 0 },
                    { val: opt1, setVal: setOpt1, idx: 1 },
                    { val: opt2, setVal: setOpt2, idx: 2 },
                    { val: opt3, setVal: setOpt3, idx: 3 },
                  ].map((item) => (
                    <div key={item.idx} className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="correctOption"
                        checked={correctIndex === item.idx}
                        onChange={() => setCorrectIndex(item.idx)}
                        className="w-4 h-4 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      />
                      <input
                        type="text"
                        required
                        value={item.val}
                        onChange={(e) => item.setVal(e.target.value)}
                        placeholder={`Option ${item.idx + 1}`}
                        className="flex-1 px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      {correctIndex === item.idx && (
                        <span className="text-[10px] font-bold text-emerald-400 whitespace-nowrap">
                          ✓ Correct Answer
                        </span>
                      )}
                    </div>
                  ))}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                    Explanation (Optional)
                  </label>
                  <input
                    type="text"
                    value={explanation}
                    onChange={(e) => setExplanation(e.target.value)}
                    placeholder="Why this answer is correct..."
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="flex gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setIsQuestionModalOpen(false)}
                    className="flex-1 py-2.5 bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingQuestion}
                    className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-md cursor-pointer"
                  >
                    {submittingQuestion ? 'Saving Question...' : 'Save Question'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: View Results */}
        {activeResultsModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 overflow-y-auto">
            <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl my-8">
              <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-5">
                <div>
                  <h3 className="text-lg font-bold text-white">Assessment Results Summary</h3>
                  <p className="text-xs text-slate-400">{activeResultsModal.quiz_title}</p>
                </div>
                <button
                  onClick={() => setActiveResultsModal(null)}
                  className="text-slate-400 hover:text-white cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-4 text-center">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Total Attempts</span>
                  <p className="text-2xl font-black text-white mt-1">
                    {activeResultsModal.total_attempts}
                  </p>
                </div>
                <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-4 text-center">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Average Score</span>
                  <p className="text-2xl font-black text-emerald-400 mt-1">
                    {activeResultsModal.average_score}%
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Trainee Submissions
                </h4>
                {activeResultsModal.attempts.length === 0 ? (
                  <p className="text-xs text-slate-500 py-4 text-center">
                    No trainees have taken this assessment yet.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-800 text-slate-400 text-[10px] uppercase">
                          <th className="py-2.5 px-3">Trainee</th>
                          <th className="py-2.5 px-3">Score</th>
                          <th className="py-2.5 px-3">Submitted At</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/50">
                        {activeResultsModal.attempts.map((att) => (
                          <tr key={att.id}>
                            <td className="py-3 px-3">
                              <span className="font-semibold text-white block">
                                {att.trainee?.name || `Trainee #${att.trainee_id}`}
                              </span>
                              <span className="text-[10px] text-slate-400">
                                {att.trainee?.email}
                              </span>
                            </td>
                            <td className="py-3 px-3">
                              <span
                                className={`px-2 py-0.5 rounded-md font-bold text-xs ${
                                  att.score >= 50
                                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                    : 'bg-rose-950 text-rose-300 border border-rose-800'
                                }`}
                              >
                                {att.score}%
                              </span>
                            </td>
                            <td className="py-3 px-3 text-slate-400 text-[11px]">
                              {new Date(att.submitted_at).toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Modal: Course Competency Requirements */}
        {activeCourseForCompetencies && (
          <TrainerCourseCompetencyModal
            course={activeCourseForCompetencies}
            onClose={() => setActiveCourseForCompetencies(null)}
            onOpenMatching={(course) => {
              setActiveCourseForCompetencies(null);
              setActiveCourseForMatching(course);
            }}
          />
        )}

        {/* Modal: Trainer Matching Evaluation */}
        {activeCourseForMatching && (
          <TrainerMatchingModal
            course={activeCourseForMatching}
            onClose={() => setActiveCourseForMatching(null)}
          />
        )}

        {/* Modal: Course Trainees Completion & Certification */}
        {activeCourseForCertificates && (
          <TrainerCompletionModal
            course={activeCourseForCertificates}
            onClose={() => setActiveCourseForCertificates(null)}
            onViewCertificate={(cert) => setSelectedCertForModal(cert)}
          />
        )}

        {/* Modal: Certificate Diploma & QR Preview */}
        <CertificateModal
          certificate={selectedCertForModal}
          onClose={() => setSelectedCertForModal(null)}
        />
      </main>
    </div>
  );
};
