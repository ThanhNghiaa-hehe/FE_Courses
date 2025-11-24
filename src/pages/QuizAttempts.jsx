import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import QuizAPI from "../api/quizAPI";
import toast from "../utils/toast";

const QuizAttempts = () => {
  const { quizId, courseId } = useParams();
  const navigate = useNavigate();

  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAttempts();
  }, [quizId]);

  const fetchAttempts = async () => {
    try {
      setLoading(true);
      const response = await QuizAPI.getQuizAttempts(quizId);
      
      if (response.data.success) {
        setAttempts(response.data.data);
        console.log("📊 Quiz attempts loaded:", response.data.data);
      }
    } catch (err) {
      console.error("Error loading attempts:", err);
      toast.error("Không thể tải lịch sử làm bài!");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="text-white text-xl">Đang tải lịch sử...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate(`/course/${courseId}`)}
            className="text-purple-400 hover:text-purple-300 mb-4 flex items-center gap-2"
          >
            <span className="material-symbols-outlined">arrow_back</span>
            Quay lại khóa học
          </button>
          
          <h1 className="text-3xl font-bold text-white mb-2">Lịch sử làm bài</h1>
          <p className="text-gray-400">Tổng số lần thử: {attempts.length}</p>
        </div>

        {/* Attempts List */}
        {attempts.length === 0 ? (
          <div className="bg-gray-800 rounded-xl p-12 text-center border border-gray-700">
            <span className="material-symbols-outlined text-gray-600 text-6xl mb-4">quiz</span>
            <p className="text-gray-400 text-lg">Bạn chưa có lần làm bài nào</p>
          </div>
        ) : (
          <div className="space-y-4">
            {attempts.map((attempt, index) => {
              const percentage = Math.round((attempt.score / attempt.totalQuestions) * 100);
              const isPassed = attempt.passed;

              return (
                <div
                  key={attempt.id}
                  className={`bg-gray-800 rounded-xl p-6 border-2 transition-all ${
                    isPassed 
                      ? 'border-green-600 hover:border-green-500' 
                      : 'border-gray-700 hover:border-gray-600'
                  }`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                        isPassed ? 'bg-green-600' : 'bg-gray-600'
                      }`}>
                        <span className="text-white font-bold">#{attempts.length - index}</span>
                      </div>
                      
                      <div>
                        <h3 className="text-white font-semibold">
                          {isPassed ? '✅ Đã vượt qua' : '❌ Chưa đạt'}
                        </h3>
                        <p className="text-gray-400 text-sm">
                          {formatDate(attempt.attemptDate)}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className={`text-2xl font-bold ${
                        isPassed ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {percentage}%
                      </div>
                      <div className="text-gray-400 text-sm">
                        {attempt.score}/{attempt.totalQuestions} điểm
                      </div>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        isPassed ? 'bg-green-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-gray-700">
                    <div className="text-center">
                      <div className="text-gray-400 text-xs mb-1">Đúng</div>
                      <div className="text-green-400 font-bold">{attempt.correctAnswers}</div>
                    </div>
                    
                    <div className="text-center">
                      <div className="text-gray-400 text-xs mb-1">Sai</div>
                      <div className="text-red-400 font-bold">
                        {attempt.totalQuestions - attempt.correctAnswers}
                      </div>
                    </div>
                    
                    <div className="text-center">
                      <div className="text-gray-400 text-xs mb-1">Điểm đạt</div>
                      <div className="text-white font-bold">{attempt.passingScore}%</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Try Again Button */}
        <div className="mt-8 text-center">
          <button
            onClick={() => navigate(`/course/${courseId}/quiz/${quizId}`)}
            className="bg-gradient-to-r from-purple-600 to-purple-700 text-white px-8 py-3 rounded-xl font-bold hover:from-purple-700 hover:to-purple-800 transition-all"
          >
            Làm lại bài quiz
          </button>
        </div>
      </div>
    </div>
  );
};

export default QuizAttempts;
