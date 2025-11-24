import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import LessonAPI from "../api/lessonAPI";
import CourseAPI from "../api/courseAPI";
import ProgressAPI from "../api/progressAPI";
import QuizAPI from "../api/quizAPI";
import { jwtDecode } from "jwt-decode";
import toast from "../utils/toast.js";

const CourseContent = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

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
  const [chapterQuizzes, setChapterQuizzes] = useState({});
  const [quizPassStatus, setQuizPassStatus] = useState({});
  const [isYouTubeVideo, setIsYouTubeVideo] = useState(false);
  const videoRef = useRef(null);
  const progressIntervalRef = useRef(null);
  const saveIntervalRef = useRef(null);
  const currentLessonIdRef = useRef(null); // Lưu lessonId để dùng trong callbacks
  const youtubePlayerDivRef = useRef(null); // Ref cho YouTube player div
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
      console.log("🔍 Starting to fetch chapters...");
      console.log("🔍 Course ID:", courseId);
      
      try {
        console.log("📊 Loading chapters with progress and unlock status...");
        const progressResponse = await ProgressAPI.getChaptersWithProgress(courseId);
        
        console.log("📊 Progress response received:", progressResponse);
        
        if (progressResponse.data.success) {
          const chaptersWithProgress = progressResponse.data.data;
          console.log("✅ Chapters with progress loaded:", chaptersWithProgress);
          
          // Load lessons for each chapter
          const chaptersWithLessons = await Promise.all(
            chaptersWithProgress.map(async (chapter) => {
              try {
                console.log(`📖 Loading lessons for chapter ${chapter.chapterId}`);
                const lessonsRes = await LessonAPI.getLessonsByChapter(chapter.chapterId);
                
                let lessons = [];
                if (Array.isArray(lessonsRes.data)) {
                  lessons = lessonsRes.data;
                } else if (lessonsRes.data.success && Array.isArray(lessonsRes.data.data)) {
                  lessons = lessonsRes.data.data;
                } else if (Array.isArray(lessonsRes.data.data)) {
                  lessons = lessonsRes.data.data;
                }
                
                console.log(`📖 Found ${lessons.length} lessons in chapter ${chapter.chapterId}`);
                
                return {
                  chapterId: chapter.chapterId,
                  title: chapter.title,
                  description: chapter.description,
                  order: chapter.order,
                  totalLessons: chapter.totalLessons,
                  completedLessons: chapter.completedLessons,
                  progressPercent: chapter.progressPercent,
                  isUnlocked: true, // Always unlock all chapters for enrolled users
                  lessons: lessons.map(lesson => ({
                    lessonId: lesson.id,
                    id: lesson.id,
                    title: lesson.title,
                    description: lesson.description,
                    duration: lesson.duration,
                    isCompleted: false, // Will be updated by fetchProgress
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
                console.error(`❌ Error loading lessons for chapter ${chapter.chapterId}:`, err);
                return {
                  ...chapter,
                  lessons: []
                };
              }
            })
          );
          
          console.log("✅ Chapters with lessons loaded:", chaptersWithLessons);
          setChapters(chaptersWithLessons);
          
          // Fetch progress to mark completed lessons and get current lesson
          const progressResult = await fetchProgress();
          
          // Fetch quizzes
          setTimeout(() => {
            fetchChapterQuizzes();
          }, 500);
          
          // Load the lesson user was on, or first incomplete lesson, or first lesson
          let lessonToLoad = null;
          
          // Check if auto-loading from navigation state (e.g., from quiz result)
          const autoLoadLessonId = location.state?.autoLoadLesson;
          if (autoLoadLessonId) {
            lessonToLoad = autoLoadLessonId;
            console.log("🎯 Auto-loading lesson from navigation:", lessonToLoad);
            // Clear state to prevent re-loading on refresh
            navigate(location.pathname, { replace: true, state: {} });
          }
          // Try to load current lesson from progress
          else if (progressResult?.currentLessonId) {
            lessonToLoad = progressResult.currentLessonId;
            console.log("📍 Loading current lesson from progress:", lessonToLoad);
          }
          
          // If no current lesson, find first incomplete lesson
          if (!lessonToLoad && progressResult?.completedIds) {
            for (const chapter of chaptersWithLessons) {
              const incompleteLesson = chapter.lessons?.find(
                lesson => !progressResult.completedIds.includes(lesson.id)
              );
              if (incompleteLesson) {
                lessonToLoad = incompleteLesson.id;
                console.log("📍 Loading first incomplete lesson:", lessonToLoad);
                setExpandedChapters({ [chapter.chapterId]: true });
                break;
              }
            }
          }
          
          // Fallback to first lesson
          if (!lessonToLoad) {
            const firstUnlockedChapter = chaptersWithLessons.find(ch => ch.isUnlocked);
            if (firstUnlockedChapter?.lessons?.[0]) {
              lessonToLoad = firstUnlockedChapter.lessons[0].lessonId;
              setExpandedChapters({ [firstUnlockedChapter.chapterId]: true });
              console.log("📍 Loading first lesson (fallback):", lessonToLoad);
            }
          }
          
          if (lessonToLoad) {
            loadLesson(lessonToLoad);
          }
          
          return; // Success - exit early
        }
      } catch (progressErr) {
        console.error("❌ Error loading chapters with progress, falling back:", progressErr);
      }
      
      // Fallback: Load chapters without progress info
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
        
        // 🆕 Fetch quizzes after chapters loaded
        setTimeout(() => {
          fetchChapterQuizzes();
        }, 500);
        
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

  const refreshChaptersUnlockStatus = async () => {
    try {
      console.log("🔄 Refreshing chapters unlock status...");
      
      // Load both chapters and progress in parallel
      const [progressResponse, courseProgressResponse] = await Promise.all([
        ProgressAPI.getChaptersWithProgress(courseId),
        ProgressAPI.getCourseProgress(courseId)
      ]);
      
      console.log("📊 Raw course progress response:", courseProgressResponse);
      
      if (progressResponse.data.success) {
        const chaptersWithProgress = progressResponse.data.data;
        console.log("✅ Chapters unlock status refreshed:", chaptersWithProgress);
        
        // Get completed lesson IDs
        let completedIds = [];
        if (courseProgressResponse.data.success) {
          const progressData = courseProgressResponse.data.data;
          console.log("📊 Full progress data:", progressData);
          
          // Backend returns lessonsProgress (not lessonProgress)
          completedIds = progressData.lessonsProgress
            ?.filter(lp => lp.completed)
            .map(lp => lp.lessonId) || [];
          
          console.log("✅ Completed lessons:", completedIds);
          setCompletedLessons(new Set(completedIds));
        }
        
          // Load lessons for each chapter
          const chaptersWithLessons = await Promise.all(
            chaptersWithProgress.map(async (chapter) => {
              try {
                const lessonsRes = await LessonAPI.getLessonsByChapter(chapter.chapterId);
                
                let lessons = [];
                if (Array.isArray(lessonsRes.data)) {
                  lessons = lessonsRes.data;
                } else if (lessonsRes.data.success && Array.isArray(lessonsRes.data.data)) {
                  lessons = lessonsRes.data.data;
                } else if (Array.isArray(lessonsRes.data.data)) {
                  lessons = lessonsRes.data.data;
                }
                
                return {
                  chapterId: chapter.chapterId,
                  title: chapter.title,
                  description: chapter.description,
                  order: chapter.order,
                  totalLessons: chapter.totalLessons,
                  completedLessons: chapter.completedLessons,
                  progressPercent: chapter.progressPercent,
                  isUnlocked: true, // Always unlock all chapters for enrolled users
                  lessons: lessons.map(lesson => ({
                    lessonId: lesson.id,
                    id: lesson.id,
                    title: lesson.title,
                    description: lesson.description,
                    duration: lesson.duration,
                    isCompleted: completedIds.includes(lesson.id),
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
                console.error(`❌ Error loading lessons for chapter ${chapter.chapterId}:`, err);
                return {
                  ...chapter,
                  isUnlocked: true, // Always unlock even on error
                  lessons: []
                };
              }
            })
          );        console.log("✅ Final chapters with lessons:", chaptersWithLessons);
        setChapters(chaptersWithLessons);
      }
    } catch (err) {
      console.error("❌ Error refreshing unlock status:", err);
    }
  };

  const fetchProgress = async () => {
    try {
      console.log("🔍 fetchProgress() called");
      
      // Get userId directly from token instead of state
      const token = localStorage.getItem("accessToken");
      let currentUserId = userId;
      
      if (!currentUserId && token) {
        try {
          const decoded = jwtDecode(token);
          currentUserId = decoded.sub;
          console.log("🔑 Extracted userId from token:", currentUserId);
        } catch (err) {
          console.error("❌ Error decoding token:", err);
        }
      }
      
      console.log("🔍 userId:", currentUserId);
      console.log("🔍 courseId:", courseId);
      
      if (!currentUserId) {
        console.log("❌ No userId, skipping progress fetch");
        return null;
      }
      
      console.log("📊 Fetching progress from backend...");
      
      // Load progress from backend
      const response = await ProgressAPI.getCourseProgress(courseId);
      
      console.log("📊 Progress API response:", response);
      
      if (response.data.success) {
        const progressData = response.data.data;
        console.log("✅ Progress loaded from backend:", progressData);
        console.log("📝 lessonsProgress array:", progressData.lessonsProgress);
        
        // Extract completed lesson IDs - backend returns lessonsProgress (not lessonProgress)
        const completedIds = progressData.lessonsProgress
          ?.filter(lp => lp.completed)
          .map(lp => lp.lessonId) || [];
        
        console.log("✅ Completed lesson IDs:", completedIds);
        console.log("✅ Setting completedLessons Set with:", completedIds);
        
        setCompletedLessons(new Set(completedIds));
        
        // Update localStorage cache
        const progressKey = `progress_${currentUserId}_${courseId}`;
        localStorage.setItem(progressKey, JSON.stringify({
          completedLessons: completedIds,
          currentLessonId: progressData.currentLessonId,
          lastSync: new Date().toISOString()
        }));
        
        console.log("🔄 Updating chapters with completion status...");
        
        // Update chapters with completion status
        setChapters(prevChapters => {
          const updatedChapters = prevChapters.map(chapter => ({
            ...chapter,
            lessons: chapter.lessons.map(lesson => {
              const isCompleted = completedIds.includes(lesson.id || lesson.lessonId);
              console.log(`  Lesson ${lesson.title}: isCompleted = ${isCompleted}`);
              return {
                ...lesson,
                isCompleted
              };
            })
          }));
          console.log("✅ Updated chapters:", updatedChapters);
          return updatedChapters;
        });
        
        // Return progress data for caller
        return {
          completedIds,
          currentLessonId: progressData.currentLessonId
        };
      }
      console.log("⚠️ Progress API response not successful");
      return null;
    } catch (err) {
      console.error("❌ Error fetching progress from backend:", err);
      
      // Get userId from token for fallback
      const token = localStorage.getItem("accessToken");
      let currentUserId = userId;
      if (!currentUserId && token) {
        try {
          const decoded = jwtDecode(token);
          currentUserId = decoded.sub;
        } catch (err) {
          console.error("Error decoding token:", err);
        }
      }
      
      // Fallback to localStorage if backend fails
      const progressKey = `progress_${currentUserId}_${courseId}`;
      const savedProgress = JSON.parse(localStorage.getItem(progressKey) || '{}');
      
      if (savedProgress.completedLessons) {
        console.log("📦 Using cached progress from localStorage");
        setCompletedLessons(new Set(savedProgress.completedLessons));
        return {
          completedIds: savedProgress.completedLessons,
          currentLessonId: savedProgress.currentLessonId
        };
      }
      return null;
    }
  };

  // 🆕 Fetch quizzes for all lessons in a chapter
  const fetchChapterQuizzes = async () => {
    try {
      const quizzesMap = {};
      const passStatusMap = {};

      for (const chapter of chapters) {
        for (const lesson of chapter.lessons) {
          try {
            // Try to get quiz for this lesson (using user API)
            const quizRes = await QuizAPI.getQuiz(lesson.id);
            if (quizRes.data.success) {
              quizzesMap[lesson.id] = quizRes.data.data;
              
              // Check if user has passed this quiz
              try {
                const passedRes = await QuizAPI.hasPassedQuiz(quizRes.data.data.id);
                if (passedRes.data.success) {
                  passStatusMap[quizRes.data.data.id] = passedRes.data.data;
                }
              } catch (err) {
                passStatusMap[quizRes.data.data.id] = false;
              }
            }
          } catch (err) {
            // No quiz for this lesson
          }
        }
      }

      setChapterQuizzes(quizzesMap);
      setQuizPassStatus(passStatusMap);
      console.log("🎯 Chapter quizzes loaded:", quizzesMap);
      console.log("✅ Quiz pass status:", passStatusMap);
    } catch (err) {
      console.error("Error fetching quizzes:", err);
    }
  };

  // 🆕 Check if all lessons in chapter are completed
  const isChapterCompleted = (chapter) => {
    return chapter.lessons.every(lesson => 
      completedLessons.has(lesson.id || lesson.lessonId)
    );
  };

  // 🆕 Get quiz for last lesson in chapter
  const getChapterQuiz = (chapter) => {
    if (chapter.lessons.length === 0) return null;
    const lastLesson = chapter.lessons[chapter.lessons.length - 1];
    return chapterQuizzes[lastLesson.id];
  };

  const loadLesson = async (lessonId) => {
    try {
      console.log("📖 Loading lesson:", lessonId);
      
      // Dừng tracking video cũ
      stopProgressTracking();
      
      // Cleanup YouTube player cũ và force clear div
      if (youtubePlayer) {
        console.log("🧹 Destroying old YouTube player");
        try {
          youtubePlayer.destroy();
        } catch (e) {
          console.warn("Error destroying player:", e);
        }
        setYoutubePlayer(null);
      }
      
      // Move player div out of container and clear it
      const playerDiv = youtubePlayerDivRef.current;
      if (playerDiv) {
        console.log("🧹 Resetting player div position and clearing");
        // Move back to root if in container
        const container = document.getElementById('youtube-player-container');
        if (container && playerDiv.parentNode === container) {
          document.body.appendChild(playerDiv);
        }
        // Reset to hidden position
        playerDiv.style.position = 'fixed';
        playerDiv.style.top = '-9999px';
        playerDiv.style.left = '-9999px';
        playerDiv.style.width = '640px';
        playerDiv.style.height = '360px';
        playerDiv.style.zIndex = '-1';
        // Clear content
        playerDiv.innerHTML = '';
      }
      
      // Cleanup HTML5 video cũ
      if (videoRef.current) {
        console.log("🧹 Cleaning up HTML5 video");
        videoRef.current.pause();
        videoRef.current.src = "";
        videoRef.current.load();
      }
      
      // Reset states
      setIsYouTubeVideo(false);
      setVideoProgress(0);
      
      // Đợi cleanup hoàn tất
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const res = await LessonAPI.getUserLesson(lessonId);
      console.log("Lesson response:", res.data);
      
      if (res.data.success) {
        const lessonData = res.data.data;
        
        // Lưu lessonId vào ref để dùng trong callbacks
        currentLessonIdRef.current = lessonData.id || lessonData.lessonId;
        
        console.log("✅ Current lesson set:", lessonData);
        console.log("📊 Saved progress:", lessonData.videoProgress || 0, "%");
        console.log("🔖 Lesson ID saved to ref:", currentLessonIdRef.current);
        
        // Check if YouTube video
        const isYT = lessonData.videoType === 'YOUTUBE' || 
                     lessonData.videoUrl?.includes('youtube.com') || 
                     lessonData.videoUrl?.includes('youtu.be');
        
        console.log("🎬 Video type detected - isYouTube:", isYT);
        
        // Set lesson data
        setCurrentLesson(lessonData);
        setVideoProgress(lessonData.videoProgress || 0);
        
        // Set isYouTubeVideo để render đúng component
        setIsYouTubeVideo(isYT);
        
        // Init YouTube player nếu là YouTube video
        if (isYT && lessonData.videoUrl) {
          const videoId = getYouTubeVideoId(lessonData.videoUrl);
          if (videoId) {
            console.log("🎥 Will init YouTube player with ID:", videoId);
            // Đợi DOM render
            setTimeout(() => {
              initYouTubePlayer(videoId, lessonData.videoProgress || 0);
            }, 500);
          }
        }
        
        console.log("✅ Video loaded, type:", isYT ? 'YouTube' : 'HTML5');
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
          
          const isYT = lesson.videoType === 'YOUTUBE' || 
                       lesson.videoUrl?.includes('youtube.com') || 
                       lesson.videoUrl?.includes('youtu.be');
          setIsYouTubeVideo(isYT);
          
          // Init YouTube player if needed
          if (isYT && lesson.videoUrl) {
            const videoId = getYouTubeVideoId(lesson.videoUrl);
            if (videoId) {
              setTimeout(() => {
                initYouTubePlayer(videoId, 0);
              }, 500);
            }
          }
          
          console.log("✅ Lesson loaded from chapters data:", lesson);
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

    // Wait for container to be ready
    const container = document.getElementById('youtube-player-container');
    if (!container) {
      console.warn('⚠️ Container not ready, retrying...');
      setTimeout(() => initYouTubePlayer(videoId, savedProgress), 200);
      return;
    }

    // Use ref to get player div
    const playerDiv = youtubePlayerDivRef.current;
    if (!playerDiv) {
      console.error('❌ Player div ref not found!');
      return;
    }
    
    console.log('🎬 Initializing YouTube Player:', videoId);
    console.log('📦 Container ready, moving player div first');
    
    // Move player div to container BEFORE creating player
    playerDiv.style.position = 'relative';
    playerDiv.style.top = '0';
    playerDiv.style.left = '0';
    playerDiv.style.width = '100%';
    playerDiv.style.height = '100%';
    playerDiv.style.zIndex = '1';
    playerDiv.innerHTML = '';
    container.appendChild(playerDiv);
    
    console.log('📦 Creating YouTube player...');

    const player = new window.YT.Player(playerDivId, {
      height: '100%',
      width: '100%',
      videoId: videoId,
      playerVars: {
        'autoplay': 0,
        'controls': 1,
        'modestbranding': 1,
        'rel': 0,
        'origin': window.location.origin,
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
      console.log('🎬 Video ENDED - will mark complete and check quiz');
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
  const handleLessonCompleted = async (lessonId) => {
    console.log('🎉 Handling lesson completion:', lessonId);
    
    // Mark lesson as completed on backend
    try {
      await ProgressAPI.completeLesson(lessonId);
      console.log('✅ Lesson marked as completed on backend');
      
      // Wait a bit for backend to process
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (err) {
      console.error('❌ Error marking lesson complete:', err);
    }
    
    // Update local state
    const newCompleted = new Set(completedLessons);
    newCompleted.add(lessonId);
    setCompletedLessons(newCompleted);

    // Refresh chapters unlock status from backend
    await refreshChaptersUnlockStatus();

    // Check if lesson has quiz and auto-navigate
    try {
      const quizResponse = await QuizAPI.getQuizByLesson(lessonId);
      if (quizResponse.data.success && quizResponse.data.data) {
        const quiz = quizResponse.data.data;
        console.log('📝 Lesson has quiz, navigating to quiz:', quiz);
        
        // Always navigate to quiz after completing lesson
        toast.success('Bài học hoàn thành! Chuyển sang phần quiz...');
        setTimeout(() => {
          navigate(`/course/${courseId}/quiz/${quiz.id}`);
        }, 1500);
        return;
      }
    } catch (err) {
      console.error('Error checking quiz:', err);
    }

    // No quiz - just show success
    toast.success('Đã hoàn thành bài học!');
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
        
        // Auto-complete when reach 100%
        if (percent >= 100 && !completedLessons.has(lessonId)) {
          console.log('🎉 Video completed, marking lesson as complete...');
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
      {/* YouTube Player - ALWAYS PRESENT at root level with ref */}
      <div 
        ref={youtubePlayerDivRef}
        id={playerDivId}
        style={{ 
          position: 'fixed',
          top: '-9999px',
          left: '-9999px',
          width: '640px',
          height: '360px',
          zIndex: -1
        }}
      ></div>
      
      {/* Sidebar - Course Outline */}
      <div className="w-80 bg-gray-900 shadow-lg overflow-y-auto border-r border-gray-700">
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
            <div className="p-4 text-center text-gray-400">
              <p>Chưa có nội dung</p>
            </div>
          ) : (
            chapters.map((chapter, idx) => (
            <div key={chapter.chapterId} className="mb-2">
              <button
                onClick={() => toggleChapter(chapter.chapterId)}
                className="w-full text-left p-3 bg-gray-800 hover:bg-gray-700 rounded-lg flex items-center justify-between font-semibold text-white"
              >
                <span className="flex items-center gap-2">
                  <span className="text-purple-400">📚</span>
                  {chapter.title}
                  <span className="text-xs text-gray-400">
                    ({chapter.completedLessons}/{chapter.totalLessons})
                  </span>
                </span>
                <span className="text-gray-400">
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
                            ? "bg-purple-600 text-white font-semibold"
                            : isLocked
                            ? "opacity-50 cursor-not-allowed hover:bg-gray-800 text-gray-500"
                            : "hover:bg-gray-800 text-gray-300"
                        }`}
                      >
                        {isCompleted ? (
                          <span className="text-green-500 text-lg">✓</span>
                        ) : isLocked ? (
                          <span className="text-gray-600 text-lg">🔒</span>
                        ) : (
                          <span className="text-gray-500">{lessonIdx + 1}</span>
                        )}
                        <span className="flex-1 text-sm">{lesson.title}</span>
                        {lesson.duration && (
                          <span className="text-xs text-gray-400">{lesson.duration}min</span>
                        )}
                      </button>
                    );
                  })}

                  {/* 🆕 Quiz Button - Show at end of chapter if all lessons completed */}
                  {(() => {
                    const chapterComplete = isChapterCompleted(chapter);
                    const quiz = getChapterQuiz(chapter);
                    
                    if (quiz && chapterComplete) {
                      const isPassed = quizPassStatus[quiz.id];
                      
                      return (
                        <button
                          onClick={() => navigate(`/course/${courseId}/quiz/${quiz.id}`)}
                          className={`w-full text-left p-3 rounded-lg flex items-center gap-3 transition mt-2 border-2 ${
                            isPassed
                              ? "bg-green-50 border-green-500 hover:bg-green-100"
                              : "bg-yellow-50 border-yellow-500 hover:bg-yellow-100 animate-pulse"
                          }`}
                        >
                          <span className="text-2xl">
                            {isPassed ? "✅" : "📝"}
                          </span>
                          <div className="flex-1">
                            <div className={`font-semibold ${isPassed ? "text-green-700" : "text-yellow-700"}`}>
                              {quiz.title}
                            </div>
                            <div className="text-xs text-gray-600">
                              {isPassed ? "Đã hoàn thành" : "Làm quiz để tiếp tục"}
                            </div>
                          </div>
                          <span className="text-gray-500">
                            {quiz.questions?.length || 0} câu • {quiz.timeLimit}p
                          </span>
                        </button>
                      );
                    }
                    return null;
                  })()}
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
                {/* YouTube player container */}
                {isYouTubeVideo ? (
                  <div 
                    id="youtube-player-container"
                    className="w-full h-full"
                  ></div>
                ) : (
                  /* HTML5 video */
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
                      const lessonId = currentLesson.id || currentLesson.lessonId;
                      if (isYouTubeVideo) {
                        // For YouTube embed, mark as complete directly
                        markVideoComplete();
                      } else {
                        // For HTML5 video, update progress to 100%
                        setVideoProgress(100);
                        saveHTML5VideoProgress(100);
                      }
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
