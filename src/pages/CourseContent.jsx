import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import LessonAPI from "../api/lessonAPI";
import CourseAPI from "../api/courseAPI";

const CourseContent = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();

  const [course, setCourse] = useState(null);
  const [chapters, setChapters] = useState([]);
  const [currentLesson, setCurrentLesson] = useState(null);
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedChapters, setExpandedChapters] = useState({});
  const [videoProgress, setVideoProgress] = useState(0);

  useEffect(() => {
    fetchCourseContent();
    fetchProgress();
  }, [courseId]);

  const fetchCourseContent = async () => {
    try {
      setLoading(true);
      
      // Lấy thông tin khóa học
      const courseRes = await CourseAPI.getCourseById(courseId);
      console.log("Course data:", courseRes.data);
      if (courseRes.data.success) {
        setCourse(courseRes.data.data);
      }

      // Lấy chapters của khóa học (Public API)
      try {
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
                const lessons = lessonsRes.data.success ? lessonsRes.data.data : [];
                
                return {
                  chapterId: chapter.id,
                  title: chapter.title,
                  description: chapter.description,
                  order: chapter.order,
                  totalLessons: lessons.length,
                  completedLessons: 0,
                  progressPercent: 0,
                  isUnlocked: true,
                  lessons: lessons.map(lesson => ({
                    lessonId: lesson.id,
                    id: lesson.id, // Thêm id để dễ tìm kiếm
                    title: lesson.title,
                    description: lesson.description,
                    duration: lesson.duration,
                    isCompleted: false,
                    order: lesson.order,
                    type: lesson.contentType || lesson.videoType || 'VIDEO',
                    videoUrl: lesson.videoUrl,
                    videoType: lesson.videoType,
                    content: lesson.content,
                    contentHtml: lesson.contentHtml,
                    isFree: lesson.isFree
                  }))
                };
              } catch (err) {
                console.error(`Error loading lessons for chapter ${chapter.id}:`, err);
                return {
                  chapterId: chapter.id,
                  title: chapter.title,
                  description: chapter.description,
                  order: chapter.order,
                  totalLessons: 0,
                  completedLessons: 0,
                  progressPercent: 0,
                  isUnlocked: true,
                  lessons: []
                };
              }
            })
          );

          console.log("Chapters with lessons:", chaptersWithLessons);
          setChapters(chaptersWithLessons);
          
          // Tự động mở chapter đầu tiên và chọn lesson đầu tiên
          if (chaptersWithLessons.length > 0) {
            setExpandedChapters({ [chaptersWithLessons[0].chapterId]: true });
            if (chaptersWithLessons[0].lessons?.length > 0) {
              loadLesson(chaptersWithLessons[0].lessons[0].lessonId);
            }
          }
        }
      } catch (chaptersErr) {
        console.error("Error fetching chapters:", chaptersErr);
        alert("Failed to load course content. Please try again later.");
      }
    } catch (err) {
      console.error("Error fetching course content:", err);
      alert(err.response?.data?.message || "Failed to load course");
    } finally {
      setLoading(false);
    }
  };

  const fetchProgress = async () => {
    try {
      const res = await LessonAPI.getCourseProgress(courseId);
      if (res.data.success) {
        setProgress(res.data.data);
      }
    } catch (err) {
      console.error("Error fetching progress:", err);
    }
  };

  const loadLesson = async (lessonId) => {
    try {
      console.log("Loading lesson:", lessonId);
      const res = await LessonAPI.getUserLesson(lessonId);
      console.log("Lesson response:", res.data);
      if (res.data.success) {
        setCurrentLesson(res.data.data);
        console.log("Current lesson set:", res.data.data);
      }
    } catch (err) {
      console.error("Error loading lesson:", err);
      // Nếu API getUserLesson chưa có, tạm thời lấy từ chapters data
      console.warn("Trying to get lesson from chapters data...");
      for (const chapter of chapters) {
        const lesson = chapter.lessons?.find(l => l.lessonId === lessonId || l.id === lessonId);
        if (lesson) {
          setCurrentLesson(lesson);
          console.log("Lesson loaded from chapters data:", lesson);
          return;
        }
      }
      alert(err.response?.data?.message || "Failed to load lesson");
    }
  };

  const toggleChapter = (chapterId) => {
    setExpandedChapters(prev => ({
      ...prev,
      [chapterId]: !prev[chapterId]
    }));
  };

  const handleMarkComplete = async () => {
    if (!currentLesson) return;
    
    try {
      const res = await LessonAPI.markLessonComplete(currentLesson.id);
      if (res.data.success) {
        alert("Lesson marked as complete!");
        fetchProgress();
        
        // Tự động chuyển sang lesson tiếp theo
        const nextLesson = findNextLesson();
        if (nextLesson) {
          loadLesson(nextLesson.id);
        }
      }
    } catch (err) {
      alert(err.response?.data?.message || "Failed to mark complete");
    }
  };

  const findNextLesson = () => {
    for (let i = 0; i < chapters.length; i++) {
      const lessons = chapters[i].lessons || [];
      const currentIndex = lessons.findIndex(l => l.id === currentLesson?.id);
      
      if (currentIndex !== -1) {
        // Nếu có lesson tiếp theo trong cùng chapter
        if (currentIndex < lessons.length - 1) {
          return lessons[currentIndex + 1];
        }
        // Nếu có chapter tiếp theo
        if (i < chapters.length - 1 && chapters[i + 1].lessons?.length > 0) {
          return chapters[i + 1].lessons[0];
        }
      }
    }
    return null;
  };

  const handleVideoProgress = async (percent) => {
    setVideoProgress(percent);
    
    if (!currentLesson) return;
    
    // Update progress mỗi 10%
    if (percent % 10 === 0) {
      try {
        await LessonAPI.updateVideoProgress(currentLesson.id, percent);
      } catch (err) {
        console.error("Error updating progress:", err);
      }
    }
    
    // Auto-complete tại 90%
    if (percent >= 90 && !isLessonCompleted(currentLesson.id)) {
      try {
        // Lấy thông tin lesson tiếp theo
        const nextRes = await LessonAPI.getNextLesson(currentLesson.id);
        if (nextRes.data.success) {
          const nextInfo = nextRes.data.data;
          
          if (nextInfo.nextLesson) {
            // Có lesson tiếp theo
            if (window.confirm(`Bài học hoàn thành! Tiếp tục với: ${nextInfo.nextLesson.title}?`)) {
              loadLesson(nextInfo.nextLesson.lessonId);
            }
          } else if (nextInfo.requiresQuiz) {
            alert("Bạn cần hoàn thành Quiz để mở khóa chapter tiếp theo!");
          } else if (nextInfo.courseCompleted) {
            alert("🎉 Chúc mừng! Bạn đã hoàn thành khóa học!");
          }
          
          // Refresh progress
          fetchProgress();
        }
      } catch (err) {
        console.error("Error getting next lesson:", err);
      }
    }
  };

  const isLessonCompleted = (lessonId) => {
    // Kiểm tra trong chapters data
    for (const chapter of chapters) {
      const lesson = chapter.lessons?.find(l => l.lessonId === lessonId);
      if (lesson) {
        return lesson.isCompleted || false;
      }
    }
    return false;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading course content...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar - Course Outline */}
      <div className="w-80 bg-white shadow-lg overflow-y-auto border-r border-gray-200">
        <div className="p-4 border-b bg-gradient-to-r from-purple-600 to-pink-600">
          <button
            onClick={() => navigate("/my-courses")}
            className="text-white mb-3 hover:underline flex items-center gap-2"
          >
            ← Back to My Courses
          </button>
          <h2 className="text-white font-bold text-lg">{course?.title || "Loading..."}</h2>
          {progress && (
            <div className="mt-2">
              <div className="flex justify-between text-white text-sm mb-1">
                <span>Progress</span>
                <span>{progress.progressPercent || 0}%</span>
              </div>
              <div className="w-full bg-white/30 rounded-full h-2">
                <div
                  className="bg-white h-2 rounded-full transition-all"
                  style={{ width: `${progress.progressPercent || 0}%` }}
                ></div>
              </div>
            </div>
          )}
        </div>

        {/* Chapters & Lessons */}
        <div className="p-2">
          {chapters.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              <p>Chưa có nội dung</p>
            </div>
          ) : (
            chapters.map((chapter, idx) => (
            <div key={chapter.chapterId} className="mb-2">
              <button
                onClick={() => toggleChapter(chapter.chapterId)}
                className="w-full text-left p-3 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center justify-between font-semibold"
              >
                <span className="flex items-center gap-2">
                  <span className="text-purple-600">📚</span>
                  {chapter.title}
                  <span className="text-xs text-gray-500">
                    ({chapter.completedLessons}/{chapter.totalLessons})
                  </span>
                </span>
                <span className="text-gray-500">
                  {expandedChapters[chapter.chapterId] ? "▼" : "▶"}
                </span>
              </button>

              {expandedChapters[chapter.chapterId] && (
                <div className="ml-4 mt-1 space-y-1">
                  {chapter.lessons?.map((lesson, lessonIdx) => (
                    <button
                      key={lesson.lessonId}
                      onClick={() => loadLesson(lesson.lessonId)}
                      className={`w-full text-left p-2 rounded flex items-center gap-2 ${
                        currentLesson?.id === lesson.lessonId
                          ? "bg-purple-100 text-purple-700 font-semibold"
                          : "hover:bg-gray-100 text-gray-700"
                      }`}
                    >
                      {lesson.isCompleted ? (
                        <span className="text-green-500">✓</span>
                      ) : (
                        <span className="text-gray-400">{lessonIdx + 1}</span>
                      )}
                      <span className="flex-1 text-sm">{lesson.title}</span>
                      <span className="text-xs text-gray-500">{lesson.duration || ""}min</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto bg-gray-100">
        {currentLesson ? (
          <div className="max-w-5xl mx-auto p-6">
            {/* Video Player */}
            {currentLesson.videoUrl && (
              <div className="bg-black rounded-lg mb-6 aspect-video shadow-xl">
                {currentLesson.videoType === 'YOUTUBE' ? (
                  <iframe
                    className="w-full h-full rounded-lg"
                    src={currentLesson.videoUrl}
                    title={currentLesson.title}
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  ></iframe>
                ) : (
                  <video
                    className="w-full h-full rounded-lg"
                    controls
                    src={currentLesson.videoUrl}
                    onTimeUpdate={(e) => {
                      const percent = Math.floor((e.target.currentTime / e.target.duration) * 100);
                      handleVideoProgress(percent);
                    }}
                  >
                    Your browser does not support the video tag.
                  </video>
                )}
              </div>
            )}

            {/* Lesson Header */}
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h1 className="text-3xl font-bold text-gray-800">
                  {currentLesson.title}
                </h1>
                <button
                  onClick={handleMarkComplete}
                  className={`px-6 py-2 rounded-lg font-semibold ${
                    isLessonCompleted(currentLesson.id)
                      ? "bg-green-500 text-white"
                      : "bg-purple-600 text-white hover:bg-purple-700"
                  }`}
                  disabled={isLessonCompleted(currentLesson.id)}
                >
                  {isLessonCompleted(currentLesson.id) ? "✓ Completed" : "Mark as Complete"}
                </button>
              </div>

              {currentLesson.description && (
                <p className="text-gray-600 mb-4">{currentLesson.description}</p>
              )}

              <div className="flex items-center gap-4 text-sm text-gray-500">
                <span>⏱️ {currentLesson.duration || 0} minutes</span>
                <span>❤️ {currentLesson.likes || 0} likes</span>
                <span>👁️ {currentLesson.views || 0} views</span>
              </div>
            </div>

            {/* Lesson Content */}
            <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
              <h2 className="text-2xl font-bold mb-4 text-gray-800 border-b pb-3">📖 Nội dung bài học</h2>
              {currentLesson.contentType === 'MARKDOWN' && currentLesson.content ? (
                <div className="prose prose-lg max-w-none">
                  <div className="whitespace-pre-wrap bg-gray-50 p-6 rounded-lg border border-gray-200 text-gray-800 font-mono text-sm">
                    {currentLesson.content}
                  </div>
                </div>
              ) : currentLesson.contentHtml ? (
                <div 
                  className="prose prose-lg max-w-none text-gray-800"
                  dangerouslySetInnerHTML={{ __html: currentLesson.contentHtml }}
                />
              ) : currentLesson.content ? (
                <div 
                  className="prose prose-lg max-w-none text-gray-800"
                  dangerouslySetInnerHTML={{ __html: currentLesson.content }}
                />
              ) : (
                <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                  <span className="text-4xl mb-4 block">📝</span>
                  <p className="text-gray-500">Nội dung bài học đang được cập nhật...</p>
                </div>
              )}
            </div>

            {/* Quiz Section (if lesson has quiz) */}
            {currentLesson.type === "QUIZ" && currentLesson.quiz && (
              <div className="bg-white rounded-lg shadow p-6 mt-6">
                <h2 className="text-2xl font-bold mb-4 text-gray-800">📝 Quiz</h2>
                {/* TODO: Implement quiz component */}
                <p className="text-gray-600">Quiz feature coming soon...</p>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-gray-500">
              <p className="text-xl mb-2">Select a lesson to start learning</p>
              <p className="text-sm">Choose from the course outline on the left</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CourseContent;
