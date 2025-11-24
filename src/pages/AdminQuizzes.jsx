import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import AdminSidebar from "../component/AdminSidebar";
import AdminAPI from "../api/adminAPI";
import LessonAPI from "../api/lessonAPI";
import QuizAPI from "../api/quizAPI";
import toast from "../utils/toast";

const AdminQuizzes = () => {
  const navigate = useNavigate();

  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState("");
  const [lessons, setLessons] = useState([]);
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingQuiz, setEditingQuiz] = useState(null);

  const [formData, setFormData] = useState({
    lessonId: "",
    courseId: "",
    chapterId: "",
    title: "",
    description: "",
    timeLimit: 600, // seconds
    passingScore: 70,
    maxAttempts: 3,
    questions: [
      {
        id: `q${Date.now()}`,
        question: "",
        type: "SINGLE_CHOICE",
        points: 10,
        explanation: "",
        options: [
          { id: `opt${Date.now()}_1`, text: "", isCorrect: false },
          { id: `opt${Date.now()}_2`, text: "", isCorrect: false },
          { id: `opt${Date.now()}_3`, text: "", isCorrect: false },
          { id: `opt${Date.now()}_4`, text: "", isCorrect: false }
        ]
      }
    ]
  });

  const handleLogout = () => {
    localStorage.clear();
    navigate("/auth");
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  useEffect(() => {
    if (selectedCourse) {
      fetchLessons(selectedCourse);
    }
  }, [selectedCourse]);

  const fetchCourses = async () => {
    try {
      const response = await AdminAPI.getAllCourses();
      if (response.data.success) {
        setCourses(response.data.data);
      }
    } catch (err) {
      console.error("Error fetching courses:", err);
    }
  };

  const fetchQuizzes = async () => {
    try {
      const response = await QuizAPI.getAllQuizzes();
      if (response.data.success) {
        setQuizzes(response.data.data);
      }
    } catch (err) {
      console.error("Error fetching quizzes:", err);
    }
  };

  const fetchLessons = async (courseId) => {
    try {
      setLoading(true);
      const response = await LessonAPI.getLessonsByCourse(courseId);
      if (response.data.success) {
        setLessons(response.data.data);
        
        // Load all quizzes from backend
        await fetchQuizzes();
      }
    } catch (err) {
      console.error("Error fetching lessons:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (quiz = null) => {
    if (quiz) {
      // Edit mode
      setEditingQuiz(quiz);
      setFormData({
        lessonId: quiz.lessonId,
        courseId: quiz.courseId,
        chapterId: quiz.chapterId,
        title: quiz.title,
        description: quiz.description || "",
        timeLimit: quiz.timeLimit,
        passingScore: quiz.passingScore,
        maxAttempts: quiz.maxAttempts || 3,
        questions: quiz.questions
      });
    } else {
      // Create mode
      setEditingQuiz(null);
      setFormData({
        lessonId: "",
        courseId: selectedCourse,
        chapterId: "",
        title: "",
        description: "",
        timeLimit: 600,
        passingScore: 70,
        maxAttempts: 3,
        questions: [
          {
            id: `q${Date.now()}`,
            question: "",
            type: "SINGLE_CHOICE",
            points: 10,
            explanation: "",
            options: [
              { id: `opt${Date.now()}_1`, text: "", isCorrect: false },
              { id: `opt${Date.now()}_2`, text: "", isCorrect: false },
              { id: `opt${Date.now()}_3`, text: "", isCorrect: false },
              { id: `opt${Date.now()}_4`, text: "", isCorrect: false }
            ]
          }
        ]
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingQuiz(null);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleQuestionChange = (index, field, value) => {
    const newQuestions = [...formData.questions];
    newQuestions[index] = {
      ...newQuestions[index],
      [field]: value
    };
    setFormData(prev => ({ ...prev, questions: newQuestions }));
  };

  const handleOptionChange = (questionIndex, optionIndex, field, value) => {
    const newQuestions = [...formData.questions];
    const options = [...newQuestions[questionIndex].options];
    
    if (field === 'isCorrect') {
      // Uncheck all other options for SINGLE_CHOICE
      options.forEach((opt, idx) => {
        opt.isCorrect = (idx === optionIndex);
      });
    } else {
      options[optionIndex] = {
        ...options[optionIndex],
        [field]: value
      };
    }
    
    newQuestions[questionIndex].options = options;
    setFormData(prev => ({ ...prev, questions: newQuestions }));
  };

  const addQuestion = () => {
    setFormData(prev => ({
      ...prev,
      questions: [
        ...prev.questions,
        {
          id: `q${Date.now()}`,
          question: "",
          type: "SINGLE_CHOICE",
          points: 10,
          explanation: "",
          options: [
            { id: `opt${Date.now()}_1`, text: "", isCorrect: false },
            { id: `opt${Date.now()}_2`, text: "", isCorrect: false },
            { id: `opt${Date.now()}_3`, text: "", isCorrect: false },
            { id: `opt${Date.now()}_4`, text: "", isCorrect: false }
          ]
        }
      ]
    }));
  };

  const removeQuestion = (index) => {
    if (formData.questions.length <= 1) {
      toast.error("Phải có ít nhất 1 câu hỏi!");
      return;
    }
    
    const newQuestions = formData.questions.filter((_, i) => i !== index);
    setFormData(prev => ({ ...prev, questions: newQuestions }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!formData.lessonId) {
      toast.error("Vui lòng chọn bài học!");
      return;
    }

    if (!formData.title.trim()) {
      toast.error("Vui lòng nhập tiêu đề quiz!");
      return;
    }

    // Get courseId and chapterId from selected lesson
    const selectedLesson = lessons.find(l => l.id === formData.lessonId);
    if (!selectedLesson) {
      toast.error("Không tìm thấy bài học!");
      return;
    }

    // Validate questions
    for (let i = 0; i < formData.questions.length; i++) {
      const q = formData.questions[i];
      
      if (!q.question.trim()) {
        toast.error(`Câu hỏi ${i + 1}: Vui lòng nhập câu hỏi!`);
        return;
      }

      if (q.options.some(opt => !opt.text.trim())) {
        toast.error(`Câu hỏi ${i + 1}: Vui lòng nhập đầy đủ các đáp án!`);
        return;
      }

      const hasCorrect = q.options.some(opt => opt.isCorrect);
      if (!hasCorrect) {
        toast.error(`Câu hỏi ${i + 1}: Vui lòng chọn đáp án đúng!`);
        return;
      }
    }

    try {
      // Prepare data with courseId and chapterId from lesson
      const submitData = {
        ...formData,
        courseId: selectedCourse,
        chapterId: selectedLesson.chapterId
      };
      
      console.log("📤 Submit Data:", JSON.stringify(submitData, null, 2));
      console.log("🔑 Token:", localStorage.getItem("accessToken"));
      console.log("👤 Role:", localStorage.getItem("userRole"));
      
      if (editingQuiz) {
        // Update
        const response = await QuizAPI.updateQuiz(editingQuiz.id, submitData);
        if (response.data.success) {
          toast.success("Cập nhật quiz thành công!");
          
          // Reload quizzes from backend
          await fetchQuizzes();
          
          handleCloseModal();
        }
      } else {
        // Create
        const response = await QuizAPI.createQuiz(submitData);
        if (response.data.success) {
          toast.success("Tạo quiz thành công!");
          
          // Reload quizzes from backend
          await fetchQuizzes();
          
          handleCloseModal();
        }
      }
    } catch (err) {
      console.error("Error saving quiz:", err);
      console.error("Response status:", err.response?.status);
      console.error("Response data:", err.response?.data);
      console.error("Response headers:", err.response?.headers);
      
      // Check if token expired
      if (err.response?.status === 401 || err.response?.status === 403) {
        const message = err.response?.data?.message || err.response?.data || "Phiên đăng nhập hết hạn hoặc không có quyền truy cập!";
        toast.error(message);
      } else {
        toast.error(err.response?.data?.message || "Có lỗi xảy ra!");
      }
    }
  };

  const handleDelete = async (quizId) => {
    if (!window.confirm("Bạn có chắc muốn xóa quiz này?")) return;

    try {
      const response = await QuizAPI.deleteQuiz(quizId);
      if (response.data.success) {
        toast.success("Xóa quiz thành công!");
        
        // Reload quizzes from backend
        await fetchQuizzes();
      }
    } catch (err) {
      console.error("Error deleting quiz:", err);
      toast.error("Không thể xóa quiz!");
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-900">
      <AdminSidebar onLogout={handleLogout} />
      
      <div className="flex-1 p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Quản lý Quiz</h1>
            <p className="text-gray-400">Tạo và quản lý các bài kiểm tra cho từng bài học</p>
          </div>

          {/* Course Selection */}
          <div className="bg-gray-800 rounded-xl p-6 mb-6 border border-gray-700">
            <label className="block text-white font-semibold mb-2">Chọn khóa học</label>
            <select
              value={selectedCourse}
              onChange={(e) => setSelectedCourse(e.target.value)}
              className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg border border-gray-600 focus:border-purple-500 focus:outline-none"
            >
              <option value="">-- Chọn khóa học --</option>
              {courses.map(course => (
                <option key={course.id} value={course.id}>{course.title}</option>
              ))}
            </select>
          </div>

          {selectedCourse && (
            <>
              {/* Create Button */}
              <div className="mb-6">
                <button
                  onClick={() => handleOpenModal()}
                  className="bg-gradient-to-r from-purple-600 to-purple-700 text-white px-6 py-3 rounded-lg font-semibold hover:from-purple-700 hover:to-purple-800 transition-all flex items-center gap-2"
                >
                  <span className="material-symbols-outlined">add</span>
                  Tạo Quiz mới
                </button>
              </div>

              {/* Quizzes List */}
              {loading ? (
                <div className="text-center text-white py-12">Đang tải...</div>
              ) : quizzes.length === 0 ? (
                <div className="bg-gray-800 rounded-xl p-12 text-center border border-gray-700">
                  <span className="material-symbols-outlined text-gray-600 text-6xl mb-4">quiz</span>
                  <p className="text-gray-400 text-lg">Chưa có quiz nào cho khóa học này</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {quizzes.map(quiz => (
                    <div
                      key={quiz.id}
                      className="bg-gray-800 rounded-xl p-6 border border-gray-700 hover:border-purple-500 transition-all"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="text-xl font-bold text-white mb-2">{quiz.title}</h3>
                          <p className="text-gray-400 text-sm mb-4">Bài học: {quiz.lessonTitle}</p>
                          
                          <div className="flex gap-6 text-sm text-gray-300">
                            <div className="flex items-center gap-2">
                              <span className="material-symbols-outlined text-lg">quiz</span>
                              <span>{quiz.questions.length} câu hỏi</span>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <span className="material-symbols-outlined text-lg">schedule</span>
                              <span>{quiz.timeLimit} phút</span>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <span className="material-symbols-outlined text-lg">emoji_events</span>
                              <span>Đạt: {quiz.passingScore}%</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <button
                            onClick={() => handleOpenModal(quiz)}
                            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-all flex items-center gap-1"
                          >
                            <span className="material-symbols-outlined text-sm">edit</span>
                            Sửa
                          </button>
                          
                          <button
                            onClick={() => handleDelete(quiz.id)}
                            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-all flex items-center gap-1"
                          >
                            <span className="material-symbols-outlined text-sm">delete</span>
                            Xóa
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-gray-800 rounded-2xl max-w-4xl w-full my-8 border border-gray-700 max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gray-800 border-b border-gray-700 p-6 z-10">
              <h2 className="text-2xl font-bold text-white">
                {editingQuiz ? "Chỉnh sửa Quiz" : "Tạo Quiz mới"}
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="p-6">
              {/* Basic Info */}
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-white font-semibold mb-2">Bài học *</label>
                  <select
                    name="lessonId"
                    value={formData.lessonId}
                    onChange={handleInputChange}
                    className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg border border-gray-600 focus:border-purple-500 focus:outline-none"
                    required
                  >
                    <option value="">-- Chọn bài học --</option>
                    {lessons.map(lesson => (
                      <option key={lesson.id} value={lesson.id}>{lesson.title}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-white font-semibold mb-2">Tiêu đề Quiz *</label>
                  <input
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg border border-gray-600 focus:border-purple-500 focus:outline-none"
                    placeholder="VD: Kiểm tra useState Hook"
                    required
                  />
                </div>

                <div>
                  <label className="block text-white font-semibold mb-2">Mô tả</label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg border border-gray-600 focus:border-purple-500 focus:outline-none"
                    rows="3"
                    placeholder="Mô tả ngắn về quiz này..."
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-white font-semibold mb-2">Thời gian (giây) *</label>
                    <input
                      type="number"
                      name="timeLimit"
                      value={formData.timeLimit}
                      onChange={handleInputChange}
                      min="60"
                      max="7200"
                      className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg border border-gray-600 focus:border-purple-500 focus:outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-white font-semibold mb-2">Điểm đạt (%) *</label>
                    <input
                      type="number"
                      name="passingScore"
                      value={formData.passingScore}
                      onChange={handleInputChange}
                      min="0"
                      max="100"
                      className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg border border-gray-600 focus:border-purple-500 focus:outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-white font-semibold mb-2">Số lần làm tối đa *</label>
                    <input
                      type="number"
                      name="maxAttempts"
                      value={formData.maxAttempts}
                      onChange={handleInputChange}
                      min="1"
                      max="10"
                      className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg border border-gray-600 focus:border-purple-500 focus:outline-none"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Questions */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-white">Câu hỏi</h3>
                  <button
                    type="button"
                    onClick={addQuestion}
                    className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-all flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-sm">add</span>
                    Thêm câu hỏi
                  </button>
                </div>

                <div className="space-y-6">
                  {formData.questions.map((question, qIndex) => (
                    <div key={qIndex} className="bg-gray-700 rounded-xl p-6 border border-gray-600">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-white font-semibold">Câu {qIndex + 1}</h4>
                        {formData.questions.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeQuestion(qIndex)}
                            className="text-red-400 hover:text-red-300"
                          >
                            <span className="material-symbols-outlined">delete</span>
                          </button>
                        )}
                      </div>

                      <div className="space-y-4">
                        <div>
                          <label className="block text-gray-300 mb-2">Câu hỏi *</label>
                          <textarea
                            value={question.question}
                            onChange={(e) => handleQuestionChange(qIndex, 'question', e.target.value)}
                            className="w-full bg-gray-600 text-white px-4 py-3 rounded-lg border border-gray-500 focus:border-purple-500 focus:outline-none"
                            rows="2"
                            placeholder="Nhập câu hỏi..."
                            required
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-gray-300 mb-2">Điểm *</label>
                            <input
                              type="number"
                              value={question.points}
                              onChange={(e) => handleQuestionChange(qIndex, 'points', parseInt(e.target.value))}
                              className="w-full bg-gray-600 text-white px-4 py-2 rounded-lg border border-gray-500 focus:border-purple-500 focus:outline-none"
                              min="1"
                              max="100"
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-gray-300 mb-2">Loại câu hỏi</label>
                            <input
                              type="text"
                              value={question.type}
                              className="w-full bg-gray-600 text-gray-400 px-4 py-2 rounded-lg border border-gray-500 cursor-not-allowed"
                              readOnly
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-gray-300 mb-2">Giải thích</label>
                          <textarea
                            value={question.explanation}
                            onChange={(e) => handleQuestionChange(qIndex, 'explanation', e.target.value)}
                            className="w-full bg-gray-600 text-white px-4 py-2 rounded-lg border border-gray-500 focus:border-purple-500 focus:outline-none"
                            rows="2"
                            placeholder="Giải thích tại sao đáp án này đúng..."
                          />
                        </div>

                        <div>
                          <label className="block text-gray-300 mb-2">Các đáp án *</label>
                          <div className="space-y-2">
                            {question.options.map((option, oIndex) => (
                              <div key={oIndex} className="flex items-center gap-3 bg-gray-800 p-3 rounded-lg">
                                <input
                                  type="checkbox"
                                  checked={option.isCorrect}
                                  onChange={(e) => handleOptionChange(qIndex, oIndex, 'isCorrect', e.target.checked)}
                                  className="w-5 h-5 accent-green-500"
                                />
                                <input
                                  type="text"
                                  value={option.text}
                                  onChange={(e) => handleOptionChange(qIndex, oIndex, 'text', e.target.value)}
                                  className="flex-1 bg-gray-600 text-white px-4 py-2 rounded-lg border border-gray-500 focus:border-purple-500 focus:outline-none"
                                  placeholder={`Đáp án ${oIndex + 1}`}
                                  required
                                />
                                {option.isCorrect && (
                                  <span className="text-green-400 text-sm font-semibold">Đúng</span>
                                )}
                              </div>
                            ))}
                          </div>
                          <p className="text-gray-400 text-sm mt-2">* Chọn checkbox để đánh dấu đáp án đúng</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-4">
                <button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-purple-600 to-purple-700 text-white py-3 rounded-xl font-bold hover:from-purple-700 hover:to-purple-800 transition-all"
                >
                  {editingQuiz ? "Cập nhật" : "Tạo Quiz"}
                </button>
                
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="flex-1 bg-gray-600 text-white py-3 rounded-xl font-bold hover:bg-gray-700 transition-all"
                >
                  Hủy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminQuizzes;
