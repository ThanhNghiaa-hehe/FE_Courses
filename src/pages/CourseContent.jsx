import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import LessonAPI from "../api/lessonAPI";
import CourseAPI from "../api/courseAPI";
import ProgressAPI from "../api/progressAPI";
import { jwtDecode } from "jwt-decode";
import toast from "../utils/toast.js";

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
  const [completedLessons, setCompletedLessons] = useState(new Set());
  const [userId, setUserId] = useState(null);
  const videoRef = useRef(null);
  const progressIntervalRef = useRef(null);

  useEffect(() => {
    // Lấy userId từ token
    const token = localStorage.getItem("accessToken");
    if (token) {
      try {
        const decoded = jwtDecode(token);
        setUserId(decoded.sub);
      } catch (err) {
        console.error("Error decoding token:", err);
      }
    }
    
    fetchCourseContent();
    fetchProgress();
    
    // Cleanup interval khi component unmount
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
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
        toast.error("Failed to load course content. Please try again later.");
      }
    } catch (err) {
      console.error("Error fetching course content:", err);
      toast.error(err.response?.data?.message || "Failed to load course");
    } finally {
      setLoading(false);
    }
  };

  const fetchProgress = async () => {
    try {
      if (!userId) return;
      
      // Lấy progress từ localStorage theo userId
      const progressKey = `progress_${userId}_${courseId}`;
      const savedProgress = JSON.parse(localStorage.getItem(progressKey) || '{}');
      console.log("📊 Saved progress from localStorage:", savedProgress);
      
      if (savedProgress.completedLessons) {
        setCompletedLessons(new Set(savedProgress.completedLessons));
      }
      
      // Cập nhật chapters với completion status
      setChapters(prevChapters => 
        prevChapters.map(chapter => ({
          ...chapter,
          lessons: chapter.lessons.map(lesson => ({
            ...lesson,
            isCompleted: savedProgress.completedLessons?.includes(lesson.id || lesson.lessonId) || false
          }))
        }))
      );
    } catch (err) {
      console.error("Error fetching progress:", err);
    }
  };

  const loadLesson = async (lessonId) => {
    try {
      console.log("Loading lesson:", lessonId);
      
      // Kiểm tra xem lesson có bị lock không
      if (!canAccessLesson(lessonId)) {
        return;
      }
      
      // Clear previous interval
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
      
      const res = await LessonAPI.getUserLesson(lessonId);
      console.log("Lesson response:", res.data);
      if (res.data.success) {
        setCurrentLesson(res.data.data);
        setVideoProgress(0); // Reset video progress
        console.log("Current lesson set:", res.data.data);
        
        // Bắt đầu simulate progress cho YouTube video sau 2 giây
        if (res.data.data.videoType === 'YOUTUBE') {
          setTimeout(startYouTubeProgressSimulation, 2000);
        }
      }
    } catch (err) {
      console.error("Error loading lesson:", err);
      // Nếu API getUserLesson chưa có, tạm thời lấy từ chapters data
      console.warn("Trying to get lesson from chapters data...");
      for (const chapter of chapters) {
        const lesson = chapter.lessons?.find(l => l.lessonId === lessonId || l.id === lessonId);
        if (lesson) {
          setCurrentLesson(lesson);
          setVideoProgress(0); // Reset video progress
          console.log("Lesson loaded from chapters data:", lesson);
          
          // Bắt đầu simulate progress cho YouTube video
          if (lesson.videoType === 'YOUTUBE') {
            setTimeout(startYouTubeProgressSimulation, 2000);
          }
          return;
        }
      }
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
      const lessonId = currentLesson.id || currentLesson.lessonId;
      
      // Lưu vào localStorage
      const savedProgress = JSON.parse(localStorage.getItem(`progress_${courseId}`) || '{}');
      const completed = new Set(savedProgress.completedLessons || []);
      completed.add(lessonId);
      
      localStorage.setItem(`progress_${courseId}`, JSON.stringify({
        ...savedProgress,
        completedLessons: Array.from(completed),
        lastUpdated: new Date().toISOString()
      }));
      
      setCompletedLessons(completed);
      
      // Cập nhật UI
      setChapters(prevChapters => 
        prevChapters.map(chapter => ({
          ...chapter,
          lessons: chapter.lessons.map(lesson => 
            (lesson.id === lessonId || lesson.lessonId === lessonId)
              ? { ...lesson, isCompleted: true }
              : lesson
          )
        }))
      );
      
      console.log("✅ Lesson completed:", lessonId);
      
      // Tự động chuyển sang bài tiếp theo
      const nextLesson = findNextLesson();
      if (nextLesson) {
        setTimeout(() => {
          loadLesson(nextLesson.id || nextLesson.lessonId);
        }, 1000);
      }
    } catch (err) {
      console.error("❌ Error marking complete:", err);
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

  const handleVideoProgress = (percent) => {
    if (!currentLesson) return;
    
    setVideoProgress(percent);
    
    // Auto-complete khi xem hết video (100%)
    if (percent >= 100 && !isLessonCompleted(currentLesson.id || currentLesson.lessonId)) {
      setTimeout(() => {
        handleMarkComplete();
      }, 500);
    }
  };

  // Simulate progress cho YouTube videos (vì YouTube iframe không trigger events)
  const startYouTubeProgressSimulation = () => {
    // Không cần auto-simulate nữa, user sẽ click "Đã xem xong"
    console.log("YouTube video loaded - waiting for user to mark as completed");
  };

  const canAccessLesson = (lessonId) => {
    // Bài học đầu tiên luôn mở
    const firstLesson = chapters[0]?.lessons?.[0];
    if (!firstLesson) return false;
    if ((firstLesson.id || firstLesson.lessonId) === lessonId) return true;
    
    // Kiểm tra bài trước đã complete chưa (phải xem hết 100%)
    const previousLesson = findPreviousLesson(lessonId);
    if (!previousLesson) return true; // Không tìm thấy bài trước = cho phép truy cập
    
    const isPreviousCompleted = completedLessons.has(previousLesson.id || previousLesson.lessonId);
    return isPreviousCompleted;
  };

  const findPreviousLesson = (lessonId) => {
    for (let i = 0; i < chapters.length; i++) {
      const lessons = chapters[i].lessons || [];
      const currentIndex = lessons.findIndex(l => (l.id || l.lessonId) === lessonId);
      
      if (currentIndex !== -1) {
        // Nếu có lesson trước trong cùng chapter
        if (currentIndex > 0) {
          return lessons[currentIndex - 1];
        }
        // Nếu có chapter trước
        if (i > 0 && chapters[i - 1].lessons?.length > 0) {
          const prevChapterLessons = chapters[i - 1].lessons;
          return prevChapterLessons[prevChapterLessons.length - 1];
        }
      }
    }
    return null;
  };

  const isLessonCompleted = (lessonId) => {
    return completedLessons.has(lessonId);
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
                <span>Tiến độ</span>
                <span>{Math.round((completedLessons.size / getTotalLessons()) * 100)}%</span>
              </div>
              <div className="w-full bg-white/30 rounded-full h-2">
                <div
                  className="bg-white h-2 rounded-full transition-all"
                  style={{ width: `${Math.round((completedLessons.size / getTotalLessons()) * 100)}%` }}
                ></div>
              </div>
              <p className="text-white/80 text-xs mt-1">
                {completedLessons.size}/{getTotalLessons()} bài học
              </p>
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
                  {chapter.lessons?.map((lesson, lessonIdx) => {
                    const isCompleted = isLessonCompleted(lesson.id || lesson.lessonId);
                    const isLocked = !canAccessLesson(lesson.id || lesson.lessonId);
                    const isCurrent = currentLesson?.id === (lesson.id || lesson.lessonId);
                    
                    return (
                      <button
                        key={lesson.lessonId}
                        onClick={() => loadLesson(lesson.id || lesson.lessonId)}
                        disabled={isLocked}
                        className={`w-full text-left p-2 rounded flex items-center gap-2 transition ${
                          isCurrent
                            ? "bg-purple-100 text-purple-700 font-semibold"
                            : isLocked
                            ? "opacity-50 cursor-not-allowed hover:bg-gray-50"
                            : "hover:bg-gray-100 text-gray-700"
                        }`}
                      >
                        {isCompleted ? (
                          <span className="text-green-500 text-lg">✓</span>
                        ) : isLocked ? (
                          <span className="text-gray-400 text-lg">🔒</span>
                        ) : (
                          <span className="text-gray-400">{lessonIdx + 1}</span>
                        )}
                        <span className="flex-1 text-sm">{lesson.title}</span>
                        {lesson.duration && (
                          <span className="text-xs text-gray-500">{lesson.duration}min</span>
                        )}
                      </button>
                    );
                  })}
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
              <div className="bg-black rounded-lg mb-6 aspect-video shadow-xl relative">
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
                    ref={videoRef}
                    className="w-full h-full rounded-lg"
                    controls
                    src={currentLesson.videoUrl}
                    onTimeUpdate={(e) => {
                      const percent = Math.floor((e.target.currentTime / e.target.duration) * 100);
                      if (!isNaN(percent)) {
                        handleVideoProgress(percent);
                      }
                    }}
                  >
                    Your browser does not support the video tag.
                  </video>
                )}
                
                {/* Video Progress Indicator */}
                {isLessonCompleted(currentLesson.id || currentLesson.lessonId) && (
                  <div className="absolute top-4 right-4 bg-green-600 text-white px-3 py-1 rounded-full text-sm font-semibold">
                    ✓ Hoàn thành
                  </div>
                )}
              </div>
            )}

            {/* Lesson Header */}
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h1 className="text-3xl font-bold text-gray-800">
                  {currentLesson.title}
                </h1>
                {!isLessonCompleted(currentLesson.id || currentLesson.lessonId) ? (
                  <button
                    onClick={() => {
                      setVideoProgress(100);
                      handleVideoProgress(100);
                    }}
                    className="px-6 py-2 rounded-lg font-semibold bg-purple-600 text-white hover:bg-purple-700 transition"
                  >
                    Mark as Complete
                  </button>
                ) : (
                  <span className="px-6 py-2 rounded-lg font-semibold bg-green-500 text-white">
                    ✓ Completed
                  </span>
                )}
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

// Helper function
const getTotalLessons = () => {
  return chapters.reduce((total, chapter) => total + (chapter.lessons?.length || 0), 0);
};

export default CourseContent;
