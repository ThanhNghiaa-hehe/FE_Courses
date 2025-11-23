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
  const [youtubePlayer, setYoutubePlayer] = useState(null);
  const videoRef = useRef(null);
  const progressIntervalRef = useRef(null);
  const saveIntervalRef = useRef(null);
  const currentLessonIdRef = useRef(null); // Lưu lessonId để dùng trong callbacks
  const playerDivId = "youtube-player-div";

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
    
    // Load YouTube iframe API
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
    }
    
    fetchCourseContent();
    fetchProgress();
    
    // Cleanup interval khi component unmount
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
      if (saveIntervalRef.current) {
        clearInterval(saveIntervalRef.current);
      }
      if (youtubePlayer) {
        youtubePlayer.destroy();
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
        console.log("📚 RAW Chapters response:", chaptersRes);
        console.log("📚 Chapters response.data:", chaptersRes.data);
        
        // Kiểm tra structure response
        if (!chaptersRes.data) {
          console.error("❌ No data in response");
          throw new Error("No data returned from API");
        }
        
        // Backend có thể trả về trực tiếp array hoặc wrapped trong data
        let chaptersData = [];
        
        if (Array.isArray(chaptersRes.data)) {
          // Response trực tiếp là array
          console.log("📚 Response is direct array");
          chaptersData = chaptersRes.data;
        } else if (chaptersRes.data.success && Array.isArray(chaptersRes.data.data)) {
          // Response wrapped: { success: true, data: [...] }
          console.log("📚 Response is wrapped with success");
          chaptersData = chaptersRes.data.data;
        } else if (Array.isArray(chaptersRes.data.data)) {
          // Response có data nhưng không có success
          console.log("📚 Response has data without success flag");
          chaptersData = chaptersRes.data.data;
        } else {
          console.error("❌ Unknown response structure:", chaptersRes.data);
        }
        
        console.log("📚 Final chapters data:", chaptersData);
        console.log("📚 Chapters count:", chaptersData.length);
        
        if (chaptersData.length === 0) {
          console.warn("⚠️ No chapters found for course:", courseId);
          toast.error("Khóa học chưa có nội dung. Vui lòng liên hệ admin.");
          setChapters([]);
          return;
        }
        
        // Load lessons cho từng chapter
        const chaptersWithLessons = await Promise.all(
          chaptersData.map(async (chapter) => {
            try {
              console.log(`📖 Loading lessons for chapter ${chapter.id} (${chapter.title})`);
              const lessonsRes = await LessonAPI.getLessonsByChapter(chapter.id);
              console.log(`📖 RAW Lessons response for ${chapter.id}:`, lessonsRes);
              
              // Parse lessons response tương tự
              let lessons = [];
              if (Array.isArray(lessonsRes.data)) {
                lessons = lessonsRes.data;
              } else if (lessonsRes.data.success && Array.isArray(lessonsRes.data.data)) {
                lessons = lessonsRes.data.data;
              } else if (Array.isArray(lessonsRes.data.data)) {
                lessons = lessonsRes.data.data;
              }
              
              console.log(`📖 Found ${lessons.length} lessons in chapter ${chapter.id}`);
              
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
                  id: lesson.id,
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
              console.error(`❌ Error loading lessons for chapter ${chapter.id}:`, err);
              console.error(`❌ Error details:`, err.response?.data);
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

        console.log("✅ Chapters with lessons (final):", chaptersWithLessons);
        console.log("✅ Total chapters:", chaptersWithLessons.length);
        chaptersWithLessons.forEach((ch, idx) => {
          console.log(`  Chapter ${idx + 1}: ${ch.title} - ${ch.lessons.length} lessons`);
        });
        
        setChapters(chaptersWithLessons);
        
        // Tự động mở chapter đầu tiên và chọn lesson đầu tiên
        if (chaptersWithLessons.length > 0) {
          setExpandedChapters({ [chaptersWithLessons[0].chapterId]: true });
          if (chaptersWithLessons[0].lessons?.length > 0) {
            loadLesson(chaptersWithLessons[0].lessons[0].lessonId);
          }
        }
      } catch (chaptersErr) {
        console.error("❌ Error fetching chapters:", chaptersErr);
        console.error("❌ Error response:", chaptersErr.response?.data);
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
      console.log("📖 Loading lesson:", lessonId);
      
      // Dừng tracking video cũ
      stopProgressTracking();
      
      // Kiểm tra xem lesson có bị lock không
      if (!canAccessLesson(lessonId)) {
        toast.error('Bạn cần hoàn thành bài trước để mở bài này!');
        return;
      }
      
      const res = await LessonAPI.getUserLesson(lessonId);
      console.log("Lesson response:", res.data);
      
      if (res.data.success) {
        const lessonData = res.data.data;
        setCurrentLesson(lessonData);
        setVideoProgress(lessonData.videoProgress || 0);
        
        // Lưu lessonId vào ref để dùng trong callbacks
        currentLessonIdRef.current = lessonData.id || lessonData.lessonId;
        
        console.log("✅ Current lesson set:", lessonData);
        console.log("📊 Saved progress:", lessonData.videoProgress || 0, "%");
        console.log("🔖 Lesson ID saved to ref:", currentLessonIdRef.current);
        
        // Init YouTube player nếu là YouTube video
        if ((lessonData.videoType === 'YOUTUBE' || 
             lessonData.videoUrl?.includes('youtube.com') || 
             lessonData.videoUrl?.includes('youtu.be')) && 
            lessonData.videoUrl) {
          const videoId = getYouTubeVideoId(lessonData.videoUrl);
          if (videoId) {
            console.log("🎬 Will initialize YouTube player with ID:", videoId);
            setTimeout(() => {
              initYouTubePlayer(videoId, lessonData.videoProgress || 0);
            }, 500);
          }
        }
      }
    } catch (err) {
      console.error("❌ Error loading lesson:", err);
      
      // Fallback: lấy từ chapters data
      console.warn("⚠️ Trying to get lesson from chapters data...");
      for (const chapter of chapters) {
        const lesson = chapter.lessons?.find(l => l.lessonId === lessonId || l.id === lessonId);
        if (lesson) {
          setCurrentLesson(lesson);
          setVideoProgress(0);
          console.log("✅ Lesson loaded from chapters data:", lesson);
          
          if ((lesson.videoType === 'YOUTUBE' || 
               lesson.videoUrl?.includes('youtube.com') || 
               lesson.videoUrl?.includes('youtu.be')) && 
              lesson.videoUrl) {
            const videoId = getYouTubeVideoId(lesson.videoUrl);
            if (videoId) {
              setTimeout(() => {
                initYouTubePlayer(videoId, 0);
              }, 500);
            }
          }
          return;
        }
      }
      
      toast.error('Không thể tải bài học!');
    }
  };

  const toggleChapter = (chapterId) => {
    setExpandedChapters(prev => ({
      ...prev,
      [chapterId]: !prev[chapterId]
    }));
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

  // ==================== YOUTUBE VIDEO PROGRESS TRACKING ====================
  
  /**
   * Extract YouTube video ID từ URL
   * Support: youtube.com/watch?v=ID, youtube.com/embed/ID, youtu.be/ID
   */
  const getYouTubeVideoId = (url) => {
    if (!url) return null;
    
    console.log("🔍 Extracting YouTube ID from:", url);
    
    // Pattern 1: youtube.com/embed/ID
    if (url.includes('/embed/')) {
      const embedMatch = url.match(/\/embed\/([^?&#]+)/);
      if (embedMatch) {
        console.log("✅ Found YouTube ID (embed):", embedMatch[1]);
        return embedMatch[1];
      }
    }
    
    // Pattern 2: youtube.com/watch?v=ID hoặc youtu.be/ID
    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const match = url.match(regex);
    
    if (match) {
      console.log("✅ Found YouTube ID (regex):", match[1]);
      return match[1];
    }
    
    console.warn("⚠️ Could not extract YouTube ID from:", url);
    return null;
  };

  /**
   * Initialize YouTube Player với iframe API
   */
  const initYouTubePlayer = (videoId, savedProgress = 0) => {
    if (!window.YT || !window.YT.Player) {
      console.error('YouTube iframe API not loaded yet');
      setTimeout(() => initYouTubePlayer(videoId, savedProgress), 500);
      return;
    }

    // Destroy player cũ nếu có
    if (youtubePlayer) {
      youtubePlayer.destroy();
    }

    console.log('🎬 Initializing YouTube Player:', videoId);

    const player = new window.YT.Player(playerDivId, {
      height: '100%',
      width: '100%',
      videoId: videoId,
      playerVars: {
        'autoplay': 0,
        'controls': 1,
        'modestbranding': 1,
        'rel': 0,
        'origin': window.location.origin, // Fix CORS warnings
        'enablejsapi': 1
      },
      events: {
        'onReady': (event) => onYouTubePlayerReady(event, savedProgress),
        'onStateChange': onYouTubePlayerStateChange
      }
    });

    setYoutubePlayer(player);
  };

  /**
   * Handle khi YouTube player ready
   */
  const onYouTubePlayerReady = (event, savedProgress) => {
    console.log('✅ YouTube Player ready');
    
    // Seek đến vị trí đã save
    if (savedProgress > 0 && savedProgress < 100) {
      const duration = event.target.getDuration();
      const startTime = (savedProgress / 100) * duration;
      event.target.seekTo(startTime, true);
      console.log(`▶️ Resumed from ${savedProgress}% (${startTime}s)`);
    }
  };

  /**
   * Handle YouTube player state change
   */
  const onYouTubePlayerStateChange = (event) => {
    const state = event.data;
    
    if (state === window.YT.PlayerState.PLAYING) {
      console.log('▶️ Video playing');
      startProgressTracking();
    } else if (state === window.YT.PlayerState.PAUSED) {
      console.log('⏸️ Video paused');
      stopProgressTracking();
      saveVideoProgressToBackend(); // Save ngay khi pause
    } else if (state === window.YT.PlayerState.ENDED) {
      console.log('⏹️ Video ended');
      stopProgressTracking();
      markVideoComplete(); // Auto-complete khi xem hết
    }
  };

  /**
   * Bắt đầu track progress (update UI mỗi 1s, save BE mỗi 10s)
   */
  const startProgressTracking = () => {
    // Clear intervals cũ
    stopProgressTracking();

    // Update UI mỗi 1 giây
    progressIntervalRef.current = setInterval(() => {
      updateProgressUI();
    }, 1000);

    // Save backend mỗi 10 giây
    saveIntervalRef.current = setInterval(() => {
      saveVideoProgressToBackend();
    }, 10000);

    console.log('🎯 Started progress tracking');
  };

  /**
   * Dừng track progress
   */
  const stopProgressTracking = () => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
    if (saveIntervalRef.current) {
      clearInterval(saveIntervalRef.current);
      saveIntervalRef.current = null;
    }
    console.log('🛑 Stopped progress tracking');
  };

  /**
   * Update progress UI
   */
  const updateProgressUI = () => {
    if (!youtubePlayer || !youtubePlayer.getCurrentTime) return;

    try {
      const currentTime = youtubePlayer.getCurrentTime();
      const duration = youtubePlayer.getDuration();
      
      if (!duration || duration === 0) return;
      
      const percent = Math.floor((currentTime / duration) * 100);
      setVideoProgress(percent);
      
      console.log(`📊 Progress: ${percent}% (${Math.floor(currentTime)}s / ${Math.floor(duration)}s)`);
    } catch (err) {
      console.error('Error updating progress UI:', err);
    }
  };

  /**
   * Save video progress to backend
   */
  const saveVideoProgressToBackend = async () => {
    if (!youtubePlayer || !currentLesson) return;

    try {
      const currentTime = youtubePlayer.getCurrentTime();
      const duration = youtubePlayer.getDuration();
      
      if (!duration || duration === 0) return;
      
      const percent = Math.floor((currentTime / duration) * 100);
      
      // Skip nếu percent quá nhỏ
      if (percent < 1) return;

      const lessonId = currentLesson.id || currentLesson.lessonId;
      
      console.log(`💾 Saving progress to backend: ${percent}%`);

      const response = await ProgressAPI.updateVideoProgress(lessonId, percent);
      
      if (response.data.success) {
        console.log(`✅ Progress saved: ${percent}%`);
        
        // Check nếu backend auto-complete (>= 90%)
        const lessonProgress = response.data.data?.lessonProgress?.find(
          lp => lp.lessonId === lessonId
        );
        
        if (lessonProgress && lessonProgress.completed) {
          console.log('🎉 Lesson auto-completed by backend!');
          handleLessonCompleted(lessonId);
        }
      }
    } catch (err) {
      console.error('❌ Error saving progress:', err);
    }
  };

  /**
   * Mark video complete (100%)
   */
  const markVideoComplete = async () => {
    const lessonId = currentLessonIdRef.current;
    
    if (!lessonId) {
      console.warn('⚠️ No lesson ID in ref to mark complete');
      return;
    }
    
    console.log('🏁 Marking video as complete (100%)', {
      lessonId,
      currentLesson: currentLesson?.title || 'Unknown'
    });

    try {
      const response = await ProgressAPI.updateVideoProgress(lessonId, 100);
      console.log('✅ Complete API response:', response.data);
      
      if (response.data.success) {
        handleLessonCompleted(lessonId);
        toast.success('Đã hoàn thành bài học!');
      } else {
        console.error('❌ Backend did not confirm completion');
      }
    } catch (err) {
      console.error('❌ Error marking complete:', err);
      toast.error('Không thể đánh dấu hoàn thành');
    }
  };

  /**
   * Handle khi lesson completed
   */
  const handleLessonCompleted = (lessonId) => {
    console.log('🎉 Handling lesson completion:', lessonId);
    
    // Update local state
    const newCompleted = new Set(completedLessons);
    newCompleted.add(lessonId);
    setCompletedLessons(newCompleted);

    // Update localStorage
    const storageKey = `completed_${userId}_${courseId}`;
    const completed = Array.from(newCompleted);
    localStorage.setItem(storageKey, JSON.stringify(completed));
    
    console.log('✅ Updated completed lessons:', completed);

    // Refresh progress
    fetchProgress();

    // Auto navigate to next lesson (optional)
    // const nextLesson = findNextLesson();
    // if (nextLesson) {
    //   setTimeout(() => loadLesson(nextLesson.id), 2000);
    // }
  };

  /**
   * Save HTML5 video progress
   */
  const saveHTML5VideoProgress = async (percent) => {
    if (!currentLesson) return;
    
    const lessonId = currentLesson.id || currentLesson.lessonId;
    
    try {
      console.log(`💾 Saving HTML5 video progress: ${percent}%`);
      const response = await ProgressAPI.updateVideoProgress(lessonId, percent);
      
      if (response.data.success) {
        console.log(`✅ HTML5 progress saved: ${percent}%`);
        
        // Check auto-complete
        const lessonProgress = response.data.data?.lessonProgress?.find(
          lp => lp.lessonId === lessonId
        );
        
        if (lessonProgress && lessonProgress.completed) {
          handleLessonCompleted(lessonId);
        }
      }
    } catch (err) {
      console.error('❌ Error saving HTML5 progress:', err);
    }
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
              <div className="bg-black rounded-lg mb-6 aspect-video shadow-xl relative overflow-hidden">
                {(() => {
                  console.log("🎥 Current Lesson Video:", {
                    videoType: currentLesson.videoType,
                    videoUrl: currentLesson.videoUrl,
                    lessonId: currentLesson.id || currentLesson.lessonId
                  });
                  return null;
                })()}
                
                {/* Auto-detect YouTube URL nếu videoType null */}
                {(currentLesson.videoType === 'YOUTUBE' || 
                  currentLesson.videoUrl.includes('youtube.com') || 
                  currentLesson.videoUrl.includes('youtu.be')) ? (
                  /* YouTube Player - Sẽ được initialize bởi YouTube iframe API */
                  <div 
                    id={playerDivId}
                    className="w-full h-full"
                  ></div>
                ) : (
                  /* HTML5 Video */
                  <video
                    ref={videoRef}
                    className="w-full h-full rounded-lg"
                    controls
                    src={currentLesson.videoUrl}
                    onTimeUpdate={(e) => {
                      const percent = Math.floor((e.target.currentTime / e.target.duration) * 100);
                      if (!isNaN(percent)) {
                        setVideoProgress(percent);
                        // Auto save progress mỗi 10s cho HTML5 video
                        if (percent % 10 === 0 && percent > 0) {
                          saveHTML5VideoProgress(percent);
                        }
                      }
                    }}
                    onEnded={() => {
                      // Auto complete khi video HTML5 kết thúc
                      const lessonId = currentLesson.id || currentLesson.lessonId;
                      ProgressAPI.updateVideoProgress(lessonId, 100)
                        .then(() => handleLessonCompleted(lessonId))
                        .catch(err => console.error('Error:', err));
                    }}
                  >
                    Your browser does not support the video tag.
                  </video>
                )}
                
                {/* Video Progress Indicator */}
                {isLessonCompleted(currentLesson.id || currentLesson.lessonId) && (
                  <div className="absolute top-4 right-4 bg-green-600 text-white px-3 py-1 rounded-full text-sm font-semibold flex items-center gap-1">
                    <span className="material-symbols-outlined text-base">check_circle</span>
                    Hoàn thành
                  </div>
                )}
                
                {/* Video Progress Bar */}
                {videoProgress > 0 && videoProgress < 100 && (
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-800/50">
                    <div 
                      className="h-full bg-purple-600 transition-all duration-300"
                      style={{ width: `${videoProgress}%` }}
                    ></div>
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
