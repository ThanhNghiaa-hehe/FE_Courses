import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import QuizAPI from "../api/quizAPI";
import toast from "../utils/toast";

const QuizPage = () => {
  const { quizId, courseId } = useParams();
  const navigate = useNavigate();

  const [quiz, setQuiz] = useState(null);
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);

  useEffect(() => {
    fetchQuiz();
  }, [quizId]);

  useEffect(() => {
    if (hasStarted && timeLeft > 0) {
      const timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            handleSubmit(); // Auto submit when time's up
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [hasStarted, timeLeft]);

  const fetchQuiz = async () => {
    try {
      setLoading(true);
      const response = await QuizAPI.getQuiz(quizId);
      
      if (response.data.success) {
        const quizData = response.data.data;
        setQuiz(quizData);
        setTimeLeft(quizData.timeLimit); // timeLimit already in seconds from backend
        console.log("📝 Quiz loaded:", quizData);
      }
    } catch (err) {
      console.error("Error loading quiz:", err);
      toast.error("Không thể tải bài quiz!");
    } finally {
      setLoading(false);
    }
  };

  const handleStartQuiz = () => {
    setHasStarted(true);
    toast.info("Bài quiz đã bắt đầu!");
  };

  const handleAnswerSelect = (questionIndex, optionId) => {
    console.log('🎯 Answer selected:', { questionIndex, optionId });
    setAnswers(prev => ({
      ...prev,
      [questionIndex]: optionId
    }));
  };

  const handleSubmit = async () => {
    // Check if all questions are answered
    const unansweredCount = quiz.questions.length - Object.keys(answers).length;
    
    if (unansweredCount > 0) {
      const confirm = window.confirm(
        `Bạn còn ${unansweredCount} câu chưa trả lời. Bạn có chắc muốn nộp bài?`
      );
      if (!confirm) return;
    }

    try {
      setSubmitting(true);

      // Format answers for API
      // Backend expects: { questionId, selectedOptions: [optionId] }
      const formattedAnswers = Object.entries(answers).map(([questionIndex, optionId]) => {
        const question = quiz.questions[parseInt(questionIndex)];
        
        console.log(`Question ${questionIndex}:`, {
          questionId: question.id,
          optionId,
          options: question.options.map((opt, idx) => ({ idx, id: opt.id, text: opt.text, isCorrect: opt.isCorrect }))
        });
        
        return {
          questionId: question.id,
          selectedOptions: [optionId]
        };
      });

      const submitData = {
        quizId: quiz.id,
        answers: formattedAnswers
      };

      console.log("📤 Submitting quiz:", JSON.stringify(submitData, null, 2));

      const response = await QuizAPI.submitQuiz(submitData);

      console.log("📥 Response:", response);
      console.log("📥 Response data:", response.data);

      if (response.data.success) {
        const result = response.data.data;
        
        console.log("✅ Quiz submitted successfully:", result);
        toast.success("Đã nộp bài thành công!");
        
        // Navigate to result page
        navigate(`/course/${courseId}/quiz/${quizId}/result`, {
          state: { result }
        });
      } else {
        console.error("❌ Submit failed:", response.data.message);
        toast.error(response.data.message || "Nộp bài thất bại!");
      }
    } catch (err) {
      console.error("Error submitting quiz:", err);
      console.error("Error response:", err.response?.data);
      console.error("Error status:", err.response?.status);
      
      const errorMsg = err.response?.data?.message || err.message || "Không thể nộp bài quiz!";
      toast.error(errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="text-white text-xl">Đang tải bài quiz...</div>
      </div>
    );
  }

  if (!quiz) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="text-white text-xl">Không tìm thấy bài quiz!</div>
      </div>
    );
  }

  if (!hasStarted) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-purple-900 via-gray-900 to-gray-900 p-6">
        <div className="bg-gray-800 rounded-2xl shadow-2xl p-8 max-w-2xl w-full border border-gray-700">
          <h1 className="text-3xl font-bold text-white mb-4">{quiz.title}</h1>
          
          <div className="space-y-4 mb-8">
            <div className="flex items-center gap-3 text-gray-300">
              <span className="material-symbols-outlined">quiz</span>
              <span>Số câu hỏi: <strong className="text-white">{quiz.questions.length}</strong></span>
            </div>
            
            <div className="flex items-center gap-3 text-gray-300">
              <span className="material-symbols-outlined">schedule</span>
              <span>Thời gian: <strong className="text-white">{Math.floor(quiz.timeLimit / 60)} phút</strong></span>
            </div>
            
            <div className="flex items-center gap-3 text-gray-300">
              <span className="material-symbols-outlined">emoji_events</span>
              <span>Điểm đạt: <strong className="text-white">{quiz.passingScore}%</strong></span>
            </div>
          </div>

          <div className="bg-yellow-900/30 border border-yellow-600 rounded-lg p-4 mb-6">
            <h3 className="text-yellow-400 font-semibold mb-2">⚠️ Lưu ý:</h3>
            <ul className="text-yellow-200 text-sm space-y-1">
              <li>• Thời gian làm bài sẽ bắt đầu ngay khi bạn nhấn "Bắt đầu"</li>
              <li>• Bài làm sẽ tự động nộp khi hết thời gian</li>
              <li>• Bạn không thể quay lại sau khi nộp bài</li>
            </ul>
          </div>

          <div className="flex gap-4">
            <button
              onClick={() => navigate(`/course/${courseId}`)}
              className="flex-1 bg-gray-700 text-white py-4 rounded-xl font-bold text-lg hover:bg-gray-600 transition-all shadow-lg flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined">arrow_back</span>
              Quay lại bài học
            </button>
            
            <button
              onClick={handleStartQuiz}
              className="flex-1 bg-gradient-to-r from-purple-600 to-purple-700 text-white py-4 rounded-xl font-bold text-lg hover:from-purple-700 hover:to-purple-800 transition-all shadow-lg"
            >
              Bắt đầu làm bài
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-gray-800 rounded-xl shadow-lg p-6 mb-6 border border-gray-700 sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-white">{quiz.title}</h1>
            
            <div className={`text-xl font-bold px-4 py-2 rounded-lg ${
              timeLeft <= 60 ? 'bg-red-600 animate-pulse' : 'bg-purple-600'
            } text-white`}>
              ⏱️ {formatTime(timeLeft)}
            </div>
          </div>

          <div className="mt-4 flex gap-4 text-sm text-gray-300">
            <span>Đã trả lời: {Object.keys(answers).length}/{quiz.questions.length}</span>
            <span>•</span>
            <span>Điểm đạt: {quiz.passingScore}%</span>
          </div>
        </div>

        {/* Questions */}
        <div className="space-y-6">
          {quiz.questions.map((question, index) => (
            <div key={index} className="bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-700">
              <div className="flex gap-3 mb-4">
                <span className="flex-shrink-0 w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                  {index + 1}
                </span>
                <h3 className="text-white text-lg font-semibold">{question.questionText}</h3>
              </div>

              <div className="space-y-3 ml-11">
                {question.options.map((option, optIndex) => {
                  const isSelected = answers[index] === option.id;
                  
                  return (
                    <label
                      key={option.id || optIndex}
                      className={`flex items-center gap-3 p-4 rounded-lg cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-purple-600 border-2 border-purple-400'
                          : 'bg-gray-700 border-2 border-gray-600 hover:border-purple-500'
                      }`}
                    >
                      <input
                        type="radio"
                        name={`question-${index}`}
                        value={option.id}
                        checked={isSelected}
                        onChange={() => handleAnswerSelect(index, option.id)}
                        className="w-5 h-5"
                      />
                      <span className="text-white">{option.text}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Submit Button */}
        <div className="mt-8 flex justify-center">
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="bg-gradient-to-r from-green-600 to-green-700 text-white px-12 py-4 rounded-xl font-bold text-lg hover:from-green-700 hover:to-green-800 transition-all shadow-lg disabled:opacity-50"
          >
            {submitting ? "Đang nộp bài..." : "Nộp bài"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default QuizPage;
