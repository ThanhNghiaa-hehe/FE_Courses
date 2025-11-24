import React, { useEffect } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import CourseAPI from "../api/courseAPI";
import ProgressAPI from "../api/progressAPI";

const QuizResult = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { courseId, quizId } = useParams();
  const result = location.state?.result;

  if (!result) {
    navigate(`/course/${courseId}`);
    return null;
  }

  const isPassed = result.passed;
  // Backend returns percentage directly
  const percentage = result.percentage || 0;
  
  // Calculate from results array if available
  const totalQuestions = result.results?.length || 0;
  const correctAnswers = result.results?.filter(r => r.correct).length || 0;

  // Auto-navigate to next lesson after passing quiz
  useEffect(() => {
    const navigateToNextLesson = async () => {
      if (!isPassed) return; // Chỉ chuyển khi pass quiz

      try {
        // Fetch course structure
        const courseResponse = await CourseAPI.getCourseContent(courseId);
        if (!courseResponse.data.success) return;

        const chapters = courseResponse.data.data?.chapters || [];
        
        // Fetch progress để biết lesson hiện tại
        const progressResponse = await ProgressAPI.getUserProgress(courseId);
        if (!progressResponse.data.success) return;

        const lessonProgress = progressResponse.data.data?.lessonProgress || [];
        const completedLessonIds = lessonProgress
          .filter(lp => lp.completed)
          .map(lp => lp.lessonId);

        // Find next uncompleted lesson
        let nextLesson = null;
        for (const chapter of chapters) {
          for (const lesson of chapter.lessons || []) {
            const lessonId = lesson.id || lesson.lessonId;
            if (!completedLessonIds.includes(lessonId)) {
              nextLesson = lesson;
              break;
            }
          }
          if (nextLesson) break;
        }

        if (nextLesson) {
          console.log('🎯 Found next lesson:', nextLesson);
          // Navigate after 3 seconds
          setTimeout(() => {
            navigate(`/course/${courseId}/learn`, { 
              state: { autoLoadLesson: nextLesson.id || nextLesson.lessonId } 
            });
          }, 3000);
        } else {
          console.log('🎉 Course completed! No more lessons.');
          // Navigate back to course after 3 seconds
          setTimeout(() => {
            navigate(`/course/${courseId}/learn`);
          }, 3000);
        }
      } catch (err) {
        console.error('Error finding next lesson:', err);
      }
    };

    navigateToNextLesson();
  }, [isPassed, courseId, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-gray-900 to-gray-900 flex items-center justify-center p-6">
      <div className="bg-gray-800 rounded-2xl shadow-2xl p-8 max-w-2xl w-full border border-gray-700">
        {/* Result Icon */}
        <div className="flex justify-center mb-6">
          {isPassed ? (
            <div className="w-24 h-24 bg-green-600 rounded-full flex items-center justify-center animate-bounce">
              <span className="material-symbols-outlined text-white text-6xl">check_circle</span>
            </div>
          ) : (
            <div className="w-24 h-24 bg-red-600 rounded-full flex items-center justify-center">
              <span className="material-symbols-outlined text-white text-6xl">cancel</span>
            </div>
          )}
        </div>

        {/* Title */}
        <h1 className={`text-3xl font-bold text-center mb-2 ${isPassed ? 'text-green-400' : 'text-red-400'}`}>
          {isPassed ? '🎉 Chúc mừng! Bạn đã vượt qua!' : '😔 Rất tiếc! Bạn chưa đạt'}
        </h1>

        <p className="text-gray-400 text-center mb-8">
          {isPassed 
            ? '🎯 Tự động chuyển sang bài học tiếp theo sau 3 giây...' 
            : 'Hãy xem lại bài giảng và thử lại'}
        </p>

        {/* Score Display */}
        <div className="bg-gray-700 rounded-xl p-6 mb-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <div className="text-gray-400 text-sm mb-1">Điểm số</div>
              <div className="text-3xl font-bold text-white">
                {result.score}/{result.totalScore}
              </div>
            </div>

            <div className="text-center">
              <div className="text-gray-400 text-sm mb-1">Phần trăm</div>
              <div className={`text-3xl font-bold ${isPassed ? 'text-green-400' : 'text-red-400'}`}>
                {percentage}%
              </div>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-gray-600">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Điểm đạt yêu cầu:</span>
              <span className="text-white font-semibold">{result.passingScore || 70}%</span>
            </div>
          </div>
        </div>

        {/* Detailed Results */}
        <div className="bg-gray-700 rounded-xl p-6 mb-6">
          <h3 className="text-white font-semibold mb-4">📊 Chi tiết kết quả</h3>
          
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-300">✅ Câu trả lời đúng:</span>
              <span className="text-green-400 font-bold">{correctAnswers}</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-gray-300">❌ Câu trả lời sai:</span>
              <span className="text-red-400 font-bold">
                {totalQuestions - correctAnswers}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-gray-300">📝 Tổng số câu:</span>
              <span className="text-white font-bold">{totalQuestions}</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-gray-300">🔄 Số lần làm:</span>
              <span className="text-white font-bold">{result.attemptNumber || 1}</span>
            </div>

            {result.remainingAttempts !== undefined && (
              <div className="flex justify-between items-center">
                <span className="text-gray-300">🎯 Lượt còn lại:</span>
                <span className="text-yellow-400 font-bold">{result.remainingAttempts}</span>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4">
          <button
            onClick={() => navigate(`/course/${courseId}/learn`)}
            className="flex-1 bg-gradient-to-r from-purple-600 to-purple-700 text-white py-3 rounded-xl font-bold hover:from-purple-700 hover:to-purple-800 transition-all"
          >
            {isPassed ? 'Tiếp tục học' : 'Quay lại khóa học'}
          </button>
          
          {!isPassed && result.remainingAttempts > 0 && (
            <button
              onClick={() => navigate(`/course/${courseId}/quiz/${quizId}`)}
              className="flex-1 bg-gray-600 text-white py-3 rounded-xl font-bold hover:bg-gray-700 transition-all"
            >
              Thử lại
            </button>
          )}
        </div>

        {/* Attempt History Link */}
        <div className="mt-6 text-center">
          <button
            onClick={() => navigate(`/course/${courseId}/quiz/${quizId}/attempts`)}
            className="text-purple-400 hover:text-purple-300 text-sm font-semibold"
          >
            Xem lịch sử làm bài →
          </button>
        </div>
      </div>
    </div>
  );
};

export default QuizResult;
