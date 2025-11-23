import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import LessonAPI from "../api/lessonAPI";
import CourseAPI from "../api/courseAPI";
import ProgressAPI from "../api/progressAPI";
import { jwtDecode } from "jwt-decode";
import toast from "../utils/toast.js";

const CourseContent = () => {
  // Debug flag – set false to silence logs after ổn định
  const DEBUG = true;
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
  const [fallbackUsed, setFallbackUsed] = useState(false);
  // Refs giữ trạng thái đồng bộ ngay lập tức (state cập nhật có độ trễ render)
  const currentLessonRef = useRef(null);
  const activeLessonIdRef = useRef(null);
  const videoRef = useRef(null);
  const youtubeIframeRef = useRef(null);
  const progressIntervalRef = useRef(null);
  const saveIntervalRef = useRef(null);
  // Dynamic container id to force iframe refresh each lesson
  const [playerDivId, setPlayerDivId] = useState('youtube-player-initial');
  const lastVideoIdRef = useRef(null);
  const playerReadyRef = useRef(false);
  const ytApiPromiseRef = useRef(null);
  const ytApiStartedRef = useRef(false);
  const playerDivIdRef = useRef('youtube-player-initial');

  // Utility: timestamp helper for debug timing
  const ts = () => new Date().toISOString().split('T')[1].replace('Z','');

  // Promise-based loader for YouTube IFrame API to avoid race conditions
  const waitForYouTubeAPI = (timeout = 8000) => {
    if (ytApiPromiseRef.current) return ytApiPromiseRef.current;
    ytApiPromiseRef.current = new Promise((resolve, reject) => {
      const start = performance.now();
      const check = () => {
        if (window.YT && window.YT.Player) {
          if (DEBUG) console.log(`[YT API READY @${ts()}] after ${(performance.now()-start).toFixed(0)}ms`);
          resolve(true);
          return;
        }
        if (performance.now() - start > timeout) {
          reject(new Error('YouTube IFrame API load timeout'));
          return;
        }
        setTimeout(check, 100);
      };
      check();
    });
    return ytApiPromiseRef.current;
  };

  // Watch for playerDivId changes and reinitialize YouTube player
  useEffect(() => {
    if (!currentLesson || !playerDivId) return;
    
    const videoType = currentLesson.videoType || inferVideoType(currentLesson.videoUrl, currentLesson.videoType);
    if (videoType === 'YOUTUBE' || isYouTubeUrl(currentLesson.videoUrl)) {
      const videoId = getYouTubeVideoId(currentLesson.videoUrl);
      if (videoId && playerDivId !== 'youtube-player-initial') {
        // Stop old player tracking
        stopProgressTracking();
        
        // Wait for DOM to be ready with the new container
        const initTimer = setTimeout(() => {
          const container = document.getElementById(playerDivId);
          if (container) {
            if (DEBUG) console.log('[EFFECT] Initializing player for container:', playerDivId);
            waitForYouTubeAPI()
              .then(() => initYouTubePlayer(videoId, currentLesson.videoProgress || 0, getLessonId(currentLesson), playerDivId))
              .catch(err => {
                console.warn('[EFFECT] API wait failed, using fallback', err);
                createRawIframe(videoId, playerDivId);
              });
          } else {
            console.error('[EFFECT] Container not found:', playerDivId);
          }
        }, 500);
        
        return () => clearTimeout(initTimer);
      }
    }
  }, [playerDivId, currentLesson]);

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
    if (!window.YT && !ytApiStartedRef.current) {
      ytApiStartedRef.current = true;
      const existing = document.querySelector('script[src="https://www.youtube.com/iframe_api"]');
      if (!existing) {
        const tag = document.createElement('script');
        tag.src = 'https://www.youtube.com/iframe_api';
        tag.async = true;
        const firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
        if (DEBUG) console.log(`[YT API INJECT @${ts()}] inserted iframe_api script`);
      } else if (DEBUG) {
        console.log('[YT API] script already present, reusing');
      }
      window.onYouTubeIframeAPIReady = () => {
        if (DEBUG) console.log(`[YT API GLOBAL CALLBACK @${ts()}] window.onYouTubeIframeAPIReady fired`);
      };
    }
    
    // Load progress trước, sau đó load content
    const loadData = async () => {
      await fetchProgress(); // Load progress trước
      await fetchCourseContent(); // Sau đó load content và auto-select lesson
    };
    
    loadData();
    
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
        
        // Sort chapters theo order
        const sortedChapters = chaptersWithLessons.sort((a, b) => a.order - b.order);
        
        // Sort lessons trong từng chapter theo order
        sortedChapters.forEach(chapter => {
          if (chapter.lessons && chapter.lessons.length > 0) {
            chapter.lessons.sort((a, b) => (a.order || 0) - (b.order || 0));
          }
        });
        
        setChapters(sortedChapters);
        
        // Tìm lesson đầu tiên chưa hoàn thành để tiếp tục học
        // Nếu không có, mặc định load lesson đầu tiên
        let firstIncompleteLesson = null;
        
        for (const chapter of sortedChapters) {
          if (chapter.lessons && chapter.lessons.length > 0) {
            for (const lesson of chapter.lessons) {
              const lessonId = lesson.id || lesson.lessonId;
              if (!completedLessons.has(lessonId)) {
                firstIncompleteLesson = { lesson, chapterId: chapter.chapterId };
                break;
              }
            }
            if (firstIncompleteLesson) break;
          }
        }
        
        // Nếu không tìm thấy lesson chưa hoàn thành, load lesson đầu tiên
        if (!firstIncompleteLesson && sortedChapters.length > 0 && sortedChapters[0].lessons?.length > 0) {
          firstIncompleteLesson = {
            lesson: sortedChapters[0].lessons[0],
            chapterId: sortedChapters[0].chapterId
          };
        }
        
        if (firstIncompleteLesson) {
          const autoId = firstIncompleteLesson.lesson.id || firstIncompleteLesson.lesson.lessonId;
          console.log('[AUTO] Will load first lesson:', firstIncompleteLesson.lesson.title, 'id=', autoId);
          setExpandedChapters({ [firstIncompleteLesson.chapterId]: true });
          // Bỏ qua access control vì setChapters chưa đồng bộ khi gọi lần đầu
          loadLesson(autoId, { skipAccess: true });
        } else {
          console.warn('[AUTO] Không có lesson để auto load');
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
      // Lấy userId từ token nếu chưa có
      let currentUserId = userId;
      if (!currentUserId) {
        const token = localStorage.getItem("accessToken");
        if (token) {
          try {
            const decoded = jwtDecode(token);
            currentUserId = decoded.sub;
            setUserId(currentUserId);
          } catch (err) {
            console.error("Error decoding token:", err);
          }
        }
      }
      
      if (!currentUserId) {
        console.warn("⚠️ No userId found, skipping progress fetch");
        return;
      }
      
      // Lấy progress từ localStorage theo userId
      const progressKey = `progress_${currentUserId}_${courseId}`;
      const savedProgress = JSON.parse(localStorage.getItem(progressKey) || '{}');
      console.log("📊 Saved progress from localStorage:", savedProgress);
      
      if (savedProgress.completedLessons && Array.isArray(savedProgress.completedLessons)) {
        const completedSet = new Set(savedProgress.completedLessons);
        setCompletedLessons(completedSet);
        console.log(`✅ Loaded ${completedSet.size} completed lessons from localStorage`);
      }
      
      // Cập nhật chapters với completion status (nếu đã có chapters)
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

  // Chuẩn hoá lấy ID bài học
  const getLessonId = (lesson) => (lesson?.id ?? lesson?.lessonId);

  // Detect YouTube URL (some admin endpoints do not provide videoType)
  const isYouTubeUrl = (url) => {
    if (!url) return false;
    return /(youtube\.com|youtu\.be)/i.test(url);
  };

  // Infer video type when backend doesn't supply one
  const inferVideoType = (url, rawType) => {
    if (rawType) return rawType; // trust provided videoType if exists
    if (isYouTubeUrl(url)) return 'YOUTUBE';
    return 'HTML5';
  };

  // Helper: Initialize YouTube player after ensuring DOM is ready
  const initYouTubePlayerAsync = (videoId, savedProgress, lessonId, containerId) => {
    // Use double requestAnimationFrame to ensure DOM paint completed
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const container = document.getElementById(containerId);
        if (DEBUG) console.log(`[RAF INIT @${ts()}] containerExists=${!!container} id=${containerId}`);
        
        if (!container) {
          console.error('[RAF INIT] Container not found, using fallback immediately');
          createRawIframe(videoId, containerId);
          setFallbackUsed(true);
          return;
        }
        
        waitForYouTubeAPI()
          .then(() => initYouTubePlayer(videoId, savedProgress, lessonId, containerId))
          .catch(err => {
            console.warn('[RAF INIT] API wait failed', err.message);
            createRawIframe(videoId, containerId);
            setFallbackUsed(true);
          });
      });
    });
  };

  const loadLesson = async (lessonId, options = {}) => {
    // options:
    // skipAccess: bỏ qua kiểm tra truy cập (auto-next hoặc lần đầu)
    // allowReplayOnCompleted: nếu bài học đã hoàn thành (progress=100) vẫn reset progress về 0 để người dùng xem lại ngay
    const { skipAccess = false, allowReplayOnCompleted = false } = options;
    try {
      console.log('[LOAD] lessonId =', lessonId, 'skipAccess =', skipAccess);
      
      // Dừng tracking video cũ
      stopProgressTracking();
      
      // Kiểm tra xem lesson có bị lock không
      if (!skipAccess && !canAccessLesson(lessonId)) {
        console.warn('[ACCESS] Locked lessonId =', lessonId);
        toast.error('Bạn cần hoàn thành bài trước để mở bài này!');
        return;
      } else if (skipAccess) {
        console.log('[ACCESS] Skip check (auto-load or backend next) for lessonId =', lessonId);
      }
      
      // Lấy lesson details (không nhất thiết chứa progress chính xác)
      const lessonRes = await LessonAPI.getUserLesson(lessonId);
      if (!lessonRes.data.success) throw new Error('Lesson not found');
      const lessonDataRaw = lessonRes.data.data;
      // Ensure videoType populated
      const lessonData = {
        ...lessonDataRaw,
        videoType: inferVideoType(lessonDataRaw.videoUrl, lessonDataRaw.videoType)
      };

      // Lấy progress từ backend để resume chính xác
      let backendProgress = 0;
      let backendCompleted = false;
      try {
        const progressRes = await ProgressAPI.getLessonProgress(lessonId);
        if (progressRes.data.success && progressRes.data.data) {
          backendProgress = progressRes.data.data.videoProgress || 0;
          backendCompleted = progressRes.data.data.completed || false;
          console.log('[RESUME] backendProgress =', backendProgress, 'completed =', backendCompleted);
        } else {
          console.log('[RESUME] no backend progress, start from 0');
        }
      } catch (perr) {
        console.warn('[RESUME] error fetching backend progress, fallback 0', perr);
      }

      // Nếu được phép replay và bài đã hoàn thành, reset progress về 0 để người dùng có trải nghiệm xem lại mượt mà
      if (allowReplayOnCompleted && backendCompleted && backendProgress >= 100) {
        console.log('[REPLAY MODE] Resetting completed lesson progress to 0 for immediate replay');
        backendProgress = 0; // chỉ reset UI progress, không thay đổi trạng thái completed backend
      }

      setCurrentLesson({ ...lessonData, videoProgress: backendProgress, isCompleted: backendCompleted });
      currentLessonRef.current = { ...lessonData, videoProgress: backendProgress, isCompleted: backendCompleted };
      activeLessonIdRef.current = getLessonId(lessonData);
      setVideoProgress(backendProgress);
      console.log('✅ Current lesson set:', lessonData.title, 'progress =', backendProgress);

      // Initialize YouTube player if it's a YouTube video
      if (lessonData.videoType === 'YOUTUBE' || isYouTubeUrl(lessonData.videoUrl)) {
        const videoId = getYouTubeVideoId(lessonData.videoUrl);
        if (videoId) {
          // Stop old player and tracking
          stopProgressTracking();
          if (youtubePlayer) {
            try {
              youtubePlayer.destroy();
              setYoutubePlayer(null);
            } catch (e) {
              console.warn('Error destroying old player:', e);
            }
          }
          
          // Generate unique container ID for this lesson
          const newPlayerId = `youtube-player-${getLessonId(lessonData)}-${Date.now()}`;
          setPlayerDivId(newPlayerId);
          playerDivIdRef.current = newPlayerId;
          
          if (DEBUG) console.log('[LOAD] New playerDivId set:', newPlayerId);
        }
      }
    } catch (err) {
      console.error("❌ Error loading lesson:", err);
      
      // Fallback: lấy từ chapters data
      console.warn("⚠️ Trying to get lesson from chapters data...");
      for (const chapter of chapters) {
        const lesson = chapter.lessons?.find(l => getLessonId(l) === lessonId);
        if (lesson) {
          setCurrentLesson(lesson);
          currentLessonRef.current = lesson;
          activeLessonIdRef.current = getLessonId(lesson);
          setVideoProgress(0);
          console.log("✅ Lesson loaded from chapters data:", lesson);
          
          // YouTube video will be handled by iframe in JSX
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

  const findNextLesson = (completedLessonId = null) => {
    const baseId = completedLessonId || (currentLesson ? getLessonId(currentLesson) : null);
    if (!baseId) return null;
    for (let i = 0; i < chapters.length; i++) {
      const lessons = chapters[i].lessons || [];
      const currentIndex = lessons.findIndex(l => getLessonId(l) === baseId);
      if (currentIndex !== -1) {
        if (currentIndex < lessons.length - 1) return lessons[currentIndex + 1];
        if (i < chapters.length - 1 && chapters[i + 1].lessons?.length > 0) return chapters[i + 1].lessons[0];
        return null;
      }
    }
    return null;
  };

  // Tìm bài kế tiếp chưa hoàn thành (skip các bài đã completed 100%)
  const findNextIncompleteLesson = (completedLessonId = null) => {
    const startId = completedLessonId || (currentLesson ? getLessonId(currentLesson) : null);
    if (!startId) return null;
    let passedCurrent = false;
    for (let i = 0; i < chapters.length; i++) {
      const lessons = chapters[i].lessons || [];
      for (let j = 0; j < lessons.length; j++) {
        const l = lessons[j];
        const lid = getLessonId(l);
        if (!passedCurrent) {
          if (lid === startId) {
            passedCurrent = true;
          }
          continue;
        }
        // Bỏ qua lesson đã completed (theo state hoặc flag isCompleted)
        const completed = completedLessons.has(lid) || l.isCompleted || l.videoProgress >= 90;
        if (!completed) return l;
      }
    }
    return null;
  };

  // ==================== YOUTUBE VIDEO PROGRESS TRACKING ====================
  
  /**
   * Extract YouTube video ID từ URL
   */
  const getYouTubeVideoId = (url) => {
    if (!url) return null;
    // Direct embed pattern: https://www.youtube.com/embed/VIDEOID
    const embedMatch = url.match(/youtube\.com\/embed\/([A-Za-z0-9_-]{11})/);
    if (embedMatch) return embedMatch[1];
    // youtu.be short link
    const shortMatch = url.match(/youtu\.be\/([A-Za-z0-9_-]{11})/);
    if (shortMatch) return shortMatch[1];
    // watch?v= pattern
    const watchMatch = url.match(/[?&]v=([A-Za-z0-9_-]{11})/);
    if (watchMatch) return watchMatch[1];
    // Fallback generic extractor (existing complex cases: /v/, /embed/, etc.)
    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const match = url.match(regex);
    return match ? match[1] : null;
  };

  /**
   * Initialize YouTube Player với iframe API
   */
  const initYouTubePlayer = (videoId, savedProgress = 0, lessonIdForPlayer = null, containerId = null) => {
    const targetId = containerId || playerDivId;
    const container = document.getElementById(targetId);
    if (DEBUG) console.log(`[YT INIT @${ts()}] entry videoId=${videoId} containerId=${targetId} containerExists=${!!container}`);
    if (!container) {
      console.error('[YT INIT] Container not found, id=', targetId);
      return;
    }
    if (!window.YT || !window.YT.Player) {
      setTimeout(() => initYouTubePlayer(videoId, savedProgress, lessonIdForPlayer), 500);
      return;
    }
    // Tạo player mới nếu chưa có hoặc videoId THAY ĐỔI
    const needNewPlayer = !youtubePlayer || lastVideoIdRef.current !== videoId;
    if (!needNewPlayer && youtubePlayer && typeof youtubePlayer.loadVideoById === 'function') {
      try {
        stopProgressTracking();
        if (lessonIdForPlayer) activeLessonIdRef.current = lessonIdForPlayer;
        youtubePlayer.loadVideoById({ videoId, startSeconds: 0 });
        lastVideoIdRef.current = videoId;
        if (savedProgress > 0 && savedProgress < 90) {
          // Seek sau một chút khi duration sẵn sàng
          setTimeout(() => {
            try {
              const d = youtubePlayer.getDuration();
              if (d && d > 0) youtubePlayer.seekTo((savedProgress / 100) * d, true);
            } catch (e) {}
          }, 600);
        }
        setVideoProgress(savedProgress);
        if (DEBUG) console.log('[YT LOAD] Reused player, new videoId=', videoId);
        return;
      } catch (e) {
        console.warn('[YT LOAD] reuse failed, will recreate', e);
      }
    }
    // Stop tracking first
    stopProgressTracking();
    
    // Destroy cũ và tạo mới (bảo đảm refresh iframe)
    if (youtubePlayer) {
      try {
        youtubePlayer.stopVideo?.();
        youtubePlayer.destroy();
        setYoutubePlayer(null);
      } catch (destroyErr) {
        console.warn('Destroy old player error:', destroyErr);
      }
    }
    
    // Clear container safely - remove children manually to avoid React conflict
    const containerToClean = document.getElementById(targetId);
    if (containerToClean) {
      while (containerToClean.firstChild) {
        containerToClean.removeChild(containerToClean.firstChild);
      }
    }

    if (lessonIdForPlayer) {
      activeLessonIdRef.current = lessonIdForPlayer;
    }
    playerReadyRef.current = false;
    const player = new window.YT.Player(targetId, {
      height: '100%',
      width: '100%',
      videoId: videoId,
      playerVars: {
        'autoplay': 0,
        'controls': 1,
        'modestbranding': 1,
        'rel': 0,
        'enablejsapi': 1,
        'origin': window.location.origin
      },
      events: {
        'onReady': (event) => {
          playerReadyRef.current = true;
          if (DEBUG) console.log(`[YT READY @${ts()}] videoId=${videoId}`);
          onYouTubePlayerReady(event, savedProgress);
        },
        'onStateChange': onYouTubePlayerStateChange,
        'onError': (err) => {
          console.error('[YT ERROR]', err.data);
          if (DEBUG) {
            const codeMap = {
              2: 'Invalid video parameter (ID hoặc URL sai)',
              5: 'HTML5 player error (trình duyệt hoặc feature không hỗ trợ)',
              100: 'Video không tồn tại hoặc bị xóa',
              101: 'Video không cho phép embed (owner chặn)',
              150: 'Video bị chặn embed (policy)'
            };
            console.warn('[YT ERROR DETAIL]', codeMap[err.data] || 'Không rõ nguyên nhân');
          }
          if ([101,150].includes(err.data)) {
            toast.error('Video bị chặn embed. Vui lòng mở trực tiếp trên YouTube.');
          } else if (err.data === 100) {
            toast.error('Video không tồn tại hoặc đã bị xóa.');
          } else if (err.data === 2) {
            toast.error('VideoID không hợp lệ. Kiểm tra URL trong lesson.');
          }
        }
      }
    });
    lastVideoIdRef.current = videoId;
    setYoutubePlayer(player);
    if (DEBUG) console.log(`[YT PLAYER CREATED @${ts()}] videoId=${videoId} container=${targetId}`);
  };

  const createRawIframe = (videoId, containerId = null) => {
    const targetId = containerId || playerDivId;
    const containerEl = document.getElementById(targetId);
    if (!containerEl) {
      console.error('[RAW IFRAME] Container not found, id=', targetId);
      return;
    }
    // Clear safely to avoid React conflict
    while (containerEl.firstChild) {
      containerEl.removeChild(containerEl.firstChild);
    }
    const iframe = document.createElement('iframe');
    iframe.width = '100%';
    iframe.height = '100%';
    iframe.src = `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1&enablejsapi=1`;
    iframe.title = 'YouTube video player';
    iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
    iframe.allowFullscreen = true;
    iframe.style.border = '0';
    containerEl.appendChild(iframe);
    if (DEBUG) console.log(`[RAW IFRAME CREATED @${ts()}] videoId=${videoId} container=${targetId}`);
  };

  /**
   * Handle khi YouTube player ready
   */
  const onYouTubePlayerReady = (event, savedProgress) => {
    // Set initial progress
    if (savedProgress > 0) {
      setVideoProgress(savedProgress);
    }
    
    // Seek đến vị trí đã save (nếu chưa hoàn thành)
    if (savedProgress > 0 && savedProgress < 90) {
      setTimeout(() => {
        const duration = event.target.getDuration();
        if (duration && duration > 0) {
          const startTime = (savedProgress / 100) * duration;
          event.target.seekTo(startTime, true);
        }
      }, 1000);
    }
  };

  /**
   * Handle YouTube player state change
   */
  const onYouTubePlayerStateChange = async (event) => {
    const state = event.data;
    const liveLessonId = currentLessonRef.current ? getLessonId(currentLessonRef.current) : activeLessonIdRef.current;
    if (DEBUG) console.log('[YT STATE]', state, 'lessonId=', liveLessonId);
    try {
      if (state === window.YT.PlayerState.PLAYING) {
        if (DEBUG) console.log('[TRACK] startProgressTracking');
        startProgressTracking();
      } else if (state === window.YT.PlayerState.PAUSED) {
        if (DEBUG) console.log('[TRACK] pause -> stop + save');
        stopProgressTracking();
        await saveVideoProgressToBackend();
      } else if (state === window.YT.PlayerState.ENDED) {
        if (DEBUG) console.log('[TRACK] ended -> mark complete (no auto-next)');
        stopProgressTracking();
        // Mark complete without auto-next
        if (liveLessonId) {
          await ProgressAPI.updateVideoProgress(liveLessonId, 100);
          handleLessonCompleted(liveLessonId, false); // autoNext = false
        }
      }
    } catch (e) {
      console.error('[YT STATE ERROR]', e);
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
      if (percent !== videoProgress) {
        if (DEBUG && (percent % 10 === 0 || percent > 90)) {
          console.log('[PROGRESS UI]', percent + '%', `(time ${Math.floor(currentTime)}/${Math.floor(duration)})`);
        }
        setVideoProgress(percent);
      }
    } catch (err) {
      console.error('Error updating progress UI:', err);
    }
  };

  /**
   * Save video progress to backend
   */
  const saveVideoProgressToBackend = async () => {
    if (!youtubePlayer) return;
    const baseLesson = currentLessonRef.current;
    if (!baseLesson) return;

    try {
      const currentTime = youtubePlayer.getCurrentTime();
      const duration = youtubePlayer.getDuration();
      
      if (!duration || duration === 0) return;
      
      const percent = Math.floor((currentTime / duration) * 100);
      const lessonId = getLessonId(baseLesson);
      if (percent < 1 || isLessonCompleted(lessonId)) {
        if (DEBUG) console.log('[SAVE SKIP] percent<1 hoặc đã completed', percent, 'lessonId', lessonId);
        return;
      }
      if (DEBUG && percent % 10 === 0) console.log('[SAVE TRY]', percent + '% lesson', lessonId);

      const response = await ProgressAPI.updateVideoProgress(lessonId, percent);
      
      if (response.data.success) {
        
        // Update local state để giữ progress khi tua video
        setVideoProgress(percent);
        
        // Lưu vào localStorage để restore nhanh khi quay lại
        if (userId) {
          const progressKey = `video_progress_${userId}_${lessonId}`;
          localStorage.setItem(progressKey, percent.toString());
        }
        
        // Check nếu backend auto-complete (>= 90%)
        const lessonProgress = response.data.data?.lessonProgress?.find(
          lp => lp.lessonId === lessonId
        );
        
        if (lessonProgress && lessonProgress.completed) {
          if (DEBUG) console.log('[BACKEND COMPLETED >=90%] auto next');
          stopProgressTracking();
          handleLessonCompleted(lessonId, true);
        }
      }
    } catch (err) {
      // Nếu save backend fail, vẫn lưu vào localStorage
      if (userId && percent > 0) {
        const progressKey = `video_progress_${userId}_${lessonId}`;
        localStorage.setItem(progressKey, percent.toString());
      }
    }
  };

  /**
   * Mark video complete (100%) - Gọi khi video ENDED (xem hết)
   */
  const markVideoComplete = async (explicitLessonId = null) => {
    const baseLesson = currentLessonRef.current;
    const lessonId = explicitLessonId || (baseLesson ? getLessonId(baseLesson) : activeLessonIdRef.current);
    if (!lessonId) {
      console.error('[COMPLETE] No lessonId available for completion');
      return;
    }
    if (DEBUG) console.log('[COMPLETE] Marking 100% for', lessonId, '(no auto-next)');
    try {
      await ProgressAPI.updateVideoProgress(lessonId, 100);
      handleLessonCompleted(lessonId, false); // autoNext = false
    } catch (err) {
      console.error('Error marking complete:', err);
    }
  };

  /**
   * Handle khi lesson completed
   * autoNext = true: Tự động chuyển bài (khi xem video hết)
   * autoNext = false: Không chuyển bài (khi bấm Mark as Complete)
   */
  const handleLessonCompleted = (lessonId, autoNext = false) => {
    // Update local state
    const newCompleted = new Set(completedLessons);
    newCompleted.add(lessonId);
    setCompletedLessons(newCompleted);
    if (currentLessonRef.current && getLessonId(currentLessonRef.current) === lessonId) {
      currentLessonRef.current.isCompleted = true;
    }

    // Update localStorage
    if (userId) {
      const progressKey = `progress_${userId}_${courseId}`;
      const savedProgress = JSON.parse(localStorage.getItem(progressKey) || '{}');
      savedProgress.completedLessons = Array.from(newCompleted);
      localStorage.setItem(progressKey, JSON.stringify(savedProgress));
    }

    // Update chapters UI
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

    if (autoNext) {
      toast.success('🎉 Hoàn thành bài học! Bạn đã unlock bài tiếp theo.');
    } else {
      toast.success('🎉 Hoàn thành bài học!');
    }

    // Auto chuyển bài nếu autoNext = true (disabled by default)
    if (autoNext) {
      if (DEBUG) console.log('[AUTO NEXT] querying backend next lesson for', lessonId);
      setTimeout(async () => {
        let backendNext = null;
        try {
          const nextRes = await ProgressAPI.getNextLesson(lessonId);
          if (nextRes.data.success && nextRes.data.data?.nextLesson) {
            backendNext = nextRes.data.data.nextLesson;
          } else if (DEBUG) {
            console.log('[AUTO NEXT][BACKEND] first attempt no nextLesson');
          }
        } catch (e) {
          console.warn('[AUTO NEXT] backend error first attempt', e);
        }

        // Nếu chưa có, thử poll lại 1 lần sau 500ms (có thể backend chưa kịp mark completed)
        if (!backendNext) {
          await new Promise(r => setTimeout(r, 500));
          try {
            const nextRes2 = await ProgressAPI.getNextLesson(lessonId);
            if (nextRes2.data.success && nextRes2.data.data?.nextLesson) {
              backendNext = nextRes2.data.data.nextLesson;
              if (DEBUG) console.log('[AUTO NEXT][BACKEND] second attempt got nextLesson');
            } else if (DEBUG) {
              console.log('[AUTO NEXT][BACKEND] second attempt still no nextLesson');
            }
          } catch (e2) {
            console.warn('[AUTO NEXT] backend error second attempt', e2);
          }
        }

        if (backendNext) {
          if (DEBUG) console.log('[AUTO NEXT][BACKEND] nextLesson =', backendNext.id, backendNext.title, 'unlocked=', backendNext.unlocked, 'completedFlag=', backendNext.completed);
          toast.info(`Chuyển sang bài: ${backendNext.title}`);
          // Nếu backend trả về lesson đã completed thì cho phép replay (reset progress UI về 0)
          loadLesson(backendNext.id, { skipAccess: true, allowReplayOnCompleted: true });
          return;
        }

        if (DEBUG) console.log('[AUTO NEXT] fallback to local scan (next incomplete)');
        const fallbackIncomplete = findNextIncompleteLesson(lessonId);
        if (fallbackIncomplete) {
          const fid = getLessonId(fallbackIncomplete);
          if (DEBUG) console.log('[AUTO NEXT][FALLBACK-INCOMPLETE] chosen =', fid, fallbackIncomplete.title);
          toast.info(`Chuyển sang bài: ${fallbackIncomplete.title}`);
          // Cho phép replay nếu bài fallback đã hoàn thành vì lý do nào đó (edge case)
          loadLesson(fid, { skipAccess: true, allowReplayOnCompleted: true });
        } else {
          // Không còn bài chưa hoàn thành phía sau -> hiển thị chúc mừng
          const maybeNext = findNextLesson(lessonId);
          if (maybeNext) {
            const mid = getLessonId(maybeNext);
            if (!isLessonCompleted(mid)) {
              if (DEBUG) console.log('[AUTO NEXT][FALLBACK-NEXT] navigating to next (not marked completed) =', mid, maybeNext.title);
              loadLesson(mid, { skipAccess: true });
            } else {
              toast.success('🎊 Bạn đã hoàn thành tất cả bài học!');
            }
          } else {
            toast.success('🎊 Bạn đã hoàn thành tất cả bài học!');
          }
        }
      }, 1200); // giảm nhẹ delay
    }
  };

  /**
   * Save HTML5 video progress
   */
  const saveHTML5VideoProgress = async (percent) => {
    if (!currentLesson) return;
    
    const lessonId = currentLesson.id || currentLesson.lessonId;
    
    try {
      const response = await ProgressAPI.updateVideoProgress(lessonId, percent);
      
      if (response.data.success) {
        
        // Check auto-complete (backend tự complete khi >= 90%)
        const lessonProgress = response.data.data?.lessonProgress?.find(
          lp => lp.lessonId === lessonId
        );
        
        if (lessonProgress && lessonProgress.completed) {
          // Backend auto-complete do user xem >= 90%, tự động chuyển bài
          handleLessonCompleted(lessonId, true); // autoNext = true
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
    if (getLessonId(firstLesson) === lessonId) return true;
    
    // Kiểm tra bài trước đã complete chưa (phải xem hết 100%)
    const previousLesson = findPreviousLesson(lessonId);
    if (!previousLesson) return true; // Không tìm thấy bài trước = cho phép truy cập
    
    const isPreviousCompleted = completedLessons.has(getLessonId(previousLesson));
    return isPreviousCompleted;
  };

  const findPreviousLesson = (lessonId) => {
    for (let i = 0; i < chapters.length; i++) {
      const lessons = chapters[i].lessons || [];
      const currentIndex = lessons.findIndex(l => getLessonId(l) === lessonId);
      
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

  const getTotalLessons = () => {
    return chapters.reduce((total, chapter) => total + (chapter.lessons?.length || 0), 0);
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
                {(currentLesson.videoType === 'YOUTUBE' || isYouTubeUrl(currentLesson.videoUrl)) ? (
                  /* YouTube Player - IFrame API approach */
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
                      const lessonId = currentLesson.id || currentLesson.lessonId;
                      ProgressAPI.updateVideoProgress(lessonId, 100)
                        .then(() => handleLessonCompleted(lessonId, true))
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
                {videoProgress > 0 && videoProgress < 100 && !isLessonCompleted(currentLesson.id || currentLesson.lessonId) && (
                  <div className="absolute bottom-0 left-0 right-0 h-2 bg-gray-800/80">
                    <div 
                      className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-300"
                      style={{ width: `${videoProgress}%` }}
                    ></div>
                  </div>
                )}
                
                {/* Video Progress Percentage Display */}
                {videoProgress > 0 && videoProgress < 100 && !isLessonCompleted(currentLesson.id || currentLesson.lessonId) && (
                  <div className="absolute top-4 left-4 bg-black/70 text-white px-3 py-1 rounded-full text-sm font-semibold backdrop-blur-sm">
                    {videoProgress}%
                  </div>
                )}
              </div>
            )}

            {/* Lesson Header */}
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex-1">
                  <h1 className="text-3xl font-bold text-gray-800 mb-2">
                    {currentLesson.title}
                  </h1>
                  {videoProgress > 0 && videoProgress < 100 && (
                    <div className="flex items-center gap-3">
                      <div className="flex-1 max-w-xs bg-gray-200 rounded-full h-2 overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-300"
                          style={{ width: `${videoProgress}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-semibold text-purple-600">{videoProgress}%</span>
                    </div>
                  )}
                </div>
                {!isLessonCompleted(currentLesson.id || currentLesson.lessonId) ? (
                  <button
                    onClick={async () => {
                      const lessonId = currentLesson.id || currentLesson.lessonId;
                      try {
                        await ProgressAPI.updateVideoProgress(lessonId, 100);
                        handleLessonCompleted(lessonId, false);
                      } catch (err) {
                        toast.error('Không thể đánh dấu hoàn thành');
                      }
                    }}
                    className="px-6 py-2 rounded-lg font-semibold bg-purple-600 text-white hover:bg-purple-700 transition flex items-center gap-2 whitespace-nowrap"
                  >
                    <span className="material-symbols-outlined text-lg">check_circle</span>
                    Mark as Complete
                  </button>
                ) : (
                  <span className="px-6 py-2 rounded-lg font-semibold bg-green-500 text-white flex items-center gap-2 whitespace-nowrap">
                    <span className="material-symbols-outlined text-lg">check_circle</span>
                    Completed
                  </span>
                )}
              </div>

              {currentLesson.description && (
                <p className="text-gray-600 mb-4">{currentLesson.description}</p>
              )}

              <div className="flex items-center gap-4 text-sm text-gray-500">
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-base">schedule</span>
                  {currentLesson.duration || 0} minutes
                </span>
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-base">favorite</span>
                  {currentLesson.likes || 0}
                </span>
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-base">visibility</span>
                  {currentLesson.views || 0}
                </span>
              </div>
            </div>
            
            {/* Next Lesson Card - Show when completed */}
            {isLessonCompleted(currentLesson.id || currentLesson.lessonId) && (() => {
              // Ưu tiên bài chưa hoàn thành; nếu không có thì dùng bài kế tiếp thông thường
              const nextLesson = findNextIncompleteLesson(currentLesson.id || currentLesson.lessonId) || findNextLesson(currentLesson.id || currentLesson.lessonId);
              return nextLesson ? (
                <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg shadow-lg p-6 mb-6 text-white">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-semibold mb-1 opacity-90">Bài tiếp theo</p>
                      <h3 className="text-xl font-bold mb-2">{nextLesson.title}</h3>
                      <p className="text-sm opacity-80 mb-4">{nextLesson.description || 'Tiếp tục hành trình học tập của bạn'}</p>
                    </div>
                    <button
                      onClick={() => loadLesson(nextLesson.id || nextLesson.lessonId, { allowReplayOnCompleted: true })}
                      className="bg-white text-purple-600 px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition flex items-center gap-2 ml-4 whitespace-nowrap"
                    >
                      Tiếp tục học
                      <span className="material-symbols-outlined">arrow_forward</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-gradient-to-r from-green-600 to-teal-600 rounded-lg shadow-lg p-6 mb-6 text-white text-center">
                  <span className="material-symbols-outlined text-6xl mb-4 block">celebration</span>
                  <h3 className="text-2xl font-bold mb-2">Chúc mừng!</h3>
                  <p className="text-lg opacity-90">Bạn đã hoàn thành tất cả bài học trong khóa học này! 🎉</p>
                </div>
              );
            })()}

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
