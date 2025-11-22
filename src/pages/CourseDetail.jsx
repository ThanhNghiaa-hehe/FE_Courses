import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Sidebar from "../component/Sidebar.jsx";
import CourseAPI from "../api/courseAPI.jsx";
import LessonAPI from "../api/lessonAPI.jsx";
import { getImageUrl } from "../config/apiConfig.jsx";
import { handleLogout as logout } from "../utils/auth.js";

export default function CourseDetail() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  
  const [course, setCourse] = useState(null);
  const [chapters, setChapters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [expandedChapters, setExpandedChapters] = useState({});

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (!token) {
      navigate("/auth");
      return;
    }
    fetchCourseDetail();
    checkEnrollment();
  }, [courseId]);

  const fetchCourseDetail = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Lấy thông tin khóa học
      const courseRes = await CourseAPI.getCourseById(courseId);
      console.log("Course response:", courseRes.data);
      if (courseRes.data.success) {
        setCourse(courseRes.data.data);
      }

      // Lấy danh sách chapters của khóa học (Public API)
      const chaptersRes = await LessonAPI.getChaptersByCourse(courseId);
      console.log("Chapters response:", chaptersRes.data);
      
      if (chaptersRes.data.success) {
        const chaptersData = chaptersRes.data.data || [];
        
        // Load lessons cho từng chapter
        const chaptersWithLessons = await Promise.all(
          chaptersData.map(async (chapter) => {
            try {
              const lessonsRes = await LessonAPI.getLessonsByChapter(chapter.id);
              console.log(`Lessons for chapter ${chapter.id}:`, lessonsRes.data);
              
              return {
                ...chapter,
                lessons: lessonsRes.data.success ? lessonsRes.data.data : []
              };
            } catch (err) {
              console.error(`Error loading lessons for chapter ${chapter.id}:`, err);
              return {
                ...chapter,
                lessons: []
              };
            }
          })
        );

        console.log("Chapters with lessons:", chaptersWithLessons);
        setChapters(chaptersWithLessons);
      }
    } catch (err) {
      console.error("Error fetching course detail:", err);
      setError(err.response?.data?.message || "Failed to load course details");
    } finally {
      setLoading(false);
    }
  };

  const checkEnrollment = () => {
    const enrolledCourses = JSON.parse(localStorage.getItem('enrolledCourses') || '[]');
    setIsEnrolled(enrolledCourses.includes(courseId));
  };

  const handleEnroll = async () => {
    try {
      // Lưu vào localStorage
      const enrolledCourses = JSON.parse(localStorage.getItem('enrolledCourses') || '[]');
      if (!enrolledCourses.includes(courseId)) {
        enrolledCourses.push(courseId);
        localStorage.setItem('enrolledCourses', JSON.stringify(enrolledCourses));
      }

      // Gọi API để khởi tạo progress (nếu backend đã implement)
      try {
        await LessonAPI.enrollCourse(courseId);
      } catch (apiErr) {
        console.warn("Progress API not available yet:", apiErr);
        // Không báo lỗi nếu API chưa có, vẫn cho phép đăng ký
      }
      
      alert("Đăng ký khóa học thành công!");
      setIsEnrolled(true);
      navigate(`/course/${courseId}/learn`);
    } catch (err) {
      console.error("Error enrolling course:", err);
      alert(err.response?.data?.message || "Failed to enroll");
    }
  };

  const handleStartLearning = () => {
    navigate(`/course/${courseId}/learn`);
  };

  const toggleChapter = (chapterId) => {
    setExpandedChapters(prev => ({
      ...prev,
      [chapterId]: !prev[chapterId]
    }));
  };

  const handleLogout = () => {
    logout(navigate);
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(price);
  };

  const getLevelColor = (level) => {
    const colors = {
      Beginner: "bg-green-500/10 text-green-400 border-green-500/20",
      Intermediate: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
      Advanced: "bg-red-500/10 text-red-400 border-red-500/20",
    };
    return colors[level] || colors.Beginner;
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-950">
        <div className="text-center">
          <div className="mb-4 inline-block h-12 w-12 animate-spin rounded-full border-4 border-gray-700 border-t-purple-500"></div>
          <p className="text-gray-400">Loading course details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-950">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <button
            onClick={() => navigate("/home")}
            className="text-purple-400 hover:text-purple-300"
          >
            ← Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-950">
      <Sidebar onLogout={handleLogout} />

      <main className="flex-1 overflow-y-auto">
        {/* Hero Section */}
        <div className="relative bg-gradient-to-r from-purple-900/30 to-pink-900/30 border-b border-gray-800">
          <div className="max-w-7xl mx-auto px-8 py-12">
            <button
              onClick={() => navigate("/home")}
              className="text-purple-400 hover:text-purple-300 mb-6 flex items-center gap-2"
            >
              ← Back to Courses
            </button>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Course Info */}
              <div className="lg:col-span-2">
                <div className="mb-4">
                  <span className={`inline-block rounded-full border px-3 py-1 text-xs font-semibold ${getLevelColor(course?.level)}`}>
                    {course?.level}
                  </span>
                </div>
                <h1 className="text-4xl font-bold text-white mb-4">{course?.title}</h1>
                <p className="text-gray-300 text-lg mb-6">{course?.description}</p>
                
                <div className="flex items-center gap-6 text-sm text-gray-400">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-base">schedule</span>
                    <span>{course?.duration} giờ</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-base">school</span>
                    <span>{chapters.length} chapters</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-base">play_circle</span>
                    <span>{chapters.reduce((acc, ch) => acc + (ch.lessons?.length || 0), 0)} lessons</span>
                  </div>
                </div>
              </div>

              {/* Course Thumbnail & Action */}
              <div className="lg:col-span-1">
                <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden shadow-xl">
                  {course?.thumbnailUrl ? (
                    <img
                      src={getImageUrl(course.thumbnailUrl)}
                      alt={course?.title}
                      className="w-full h-48 object-cover"
                      onError={(e) => {
                        e.target.src = "http://localhost:8080/static/courses/html-css.jpg";
                      }}
                    />
                  ) : (
                    <div className="w-full h-48 bg-gray-800 flex items-center justify-center">
                      <span className="material-symbols-outlined text-6xl text-gray-600">image</span>
                    </div>
                  )}
                  
                  <div className="p-6">
                    <div className="text-3xl font-bold text-white mb-4">
                      {formatPrice(course?.price)}
                    </div>
                    
                    {isEnrolled ? (
                      <button
                        onClick={handleStartLearning}
                        className="w-full rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 px-6 py-3 font-semibold text-white transition hover:shadow-lg"
                      >
                        Tiếp tục học
                      </button>
                    ) : (
                      <button
                        onClick={handleEnroll}
                        className="w-full rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 px-6 py-3 font-semibold text-white transition hover:shadow-lg"
                      >
                        Đăng ký ngay
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Course Content */}
        <div className="max-w-7xl mx-auto px-8 py-12">
          <h2 className="text-2xl font-bold text-white mb-6">Nội dung khóa học</h2>
          
          {chapters.length === 0 ? (
            <div className="text-center py-12 bg-gray-900 rounded-xl border border-gray-800">
              <p className="text-gray-400">Chưa có nội dung cho khóa học này</p>
            </div>
          ) : (
            <div className="space-y-4">
              {chapters.map((chapter, idx) => (
                <div key={chapter.id} className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
                  <button
                    onClick={() => toggleChapter(chapter.id)}
                    className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-800/50 transition"
                  >
                    <div className="flex items-center gap-4">
                      <span className="text-purple-400 font-bold">Chapter {idx + 1}</span>
                      <h3 className="text-white font-semibold">{chapter.title}</h3>
                      <span className="text-gray-500 text-sm">
                        ({chapter.lessons?.length || 0} lessons)
                      </span>
                    </div>
                    <span className="material-symbols-outlined text-gray-400">
                      {expandedChapters[chapter.id] ? "expand_less" : "expand_more"}
                    </span>
                  </button>

                  {expandedChapters[chapter.id] && (
                    <div className="border-t border-gray-800 px-6 py-4 bg-gray-950/50">
                      {chapter.description && (
                        <p className="text-gray-400 text-sm mb-4">{chapter.description}</p>
                      )}
                      
                      <div className="space-y-2">
                        {chapter.lessons?.length > 0 ? (
                          chapter.lessons.map((lesson, lessonIdx) => (
                            <div
                              key={lesson.id}
                              className="flex items-center gap-3 py-3 px-4 rounded-lg bg-gray-900/50 hover:bg-gray-800/50 transition text-gray-300"
                            >
                              <span className="material-symbols-outlined text-sm text-purple-400">
                                {lesson.videoType === 'YOUTUBE' ? 'play_circle' : 'article'}
                              </span>
                              <div className="flex-1">
                                <div className="text-sm font-medium">
                                  {lessonIdx + 1}. {lesson.title}
                                </div>
                                {lesson.description && (
                                  <div className="text-xs text-gray-500 mt-1">
                                    {lesson.description}
                                  </div>
                                )}
                              </div>
                              <div className="flex items-center gap-3 text-xs text-gray-500">
                                {lesson.isFree && (
                                  <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded">
                                    FREE
                                  </span>
                                )}
                                <span>
                                  {lesson.duration || 0} phút
                                </span>
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="text-center text-gray-500 py-4 text-sm">
                            Chưa có bài học nào
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
