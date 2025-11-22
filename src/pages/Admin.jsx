import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AdminSidebar from "../component/AdminSidebar.jsx";
import AdminAPI from "../api/adminAPI.jsx";
import toast from "../utils/toast.js";

export default function AdminCourses() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("courses"); // courses | categories
  
  // Categories State
  const [categories, setCategories] = useState([]);
  const [categoryLoading, setCategoryLoading] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [categoryForm, setCategoryForm] = useState({
    code: "",
    name: "",
    description: "",
  });

  // Courses State
  const [courses, setCourses] = useState([]);
  const [courseLoading, setCourseLoading] = useState(false);
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);
  const [courseForm, setCourseForm] = useState({
    categoryCode: "",
    title: "",
    description: "",
    price: "",
    thumbnailUrl: "",
    duration: "",
    level: "Beginner",
    isPublished: false,
  });
  const [thumbnailFile, setThumbnailFile] = useState(null);
  const [thumbnailPreview, setThumbnailPreview] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    const userRole = localStorage.getItem("userRole");
    
    if (!token) {
      navigate("/auth");
      return;
    }

    // Kiểm tra role admin - chỉ ADMIN hoặc ROLE_ADMIN mới được truy cập
    if (userRole !== "ADMIN" && userRole !== "ROLE_ADMIN") {
      toast.error("Access denied! Admin only.");
      navigate("/home");
      return;
    }
    
    fetchCategories();
    fetchCourses();
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("userEmail");
    navigate("/auth");
  };

  // ==================== CATEGORIES ====================

  const fetchCategories = async () => {
    try {
      setCategoryLoading(true);
      const response = await AdminAPI.getAllCategories();
      if (response.data.success) {
        setCategories(response.data.data || []);
      }
    } catch (err) {
      console.error("Error fetching categories:", err);
      toast.error(err.response?.data?.message || "Failed to load categories");
    } finally {
      setCategoryLoading(false);
    }
  };

  const handleCreateCategory = () => {
    setCategoryForm({ code: "", name: "", description: "" });
    setEditingCategory(null);
    setShowCategoryModal(true);
  };

  const handleEditCategory = (category) => {
    setCategoryForm({
      code: category.code,
      name: category.name,
      description: category.description || "",
    });
    setEditingCategory(category);
    setShowCategoryModal(true);
  };

  const handleSaveCategory = async () => {
    try {
      if (!categoryForm.code || !categoryForm.name) {
        toast.warning("Please fill in required fields");
        return;
      }

      if (editingCategory) {
        const response = await AdminAPI.updateCategory({
          id: editingCategory.id,
          ...categoryForm,
        });
        if (response.data.success) {
          toast.success("Category updated successfully!");
          fetchCategories();
          setShowCategoryModal(false);
        }
      } else {
        const response = await AdminAPI.createCategory(categoryForm);
        if (response.data.success) {
          toast.success("Category created successfully!");
          fetchCategories();
          setShowCategoryModal(false);
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save category");
    }
  };

  const handleDeleteCategory = async (code) => {
    if (!window.confirm("Are you sure you want to delete this category?")) return;
    
    try {
      const response = await AdminAPI.deleteCategory(code);
      if (response.data.success) {
        toast.success("Category deleted successfully!");
        fetchCategories();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete category");
    }
  };

  // ==================== COURSES ====================

  const fetchCourses = async () => {
    try {
      setCourseLoading(true);
      const response = await AdminAPI.getAllCourses();
      if (response.data.success) {
        setCourses(response.data.data || []);
      }
    } catch (err) {
      console.error("Error fetching courses:", err);
      toast.error(err.response?.data?.message || "Failed to load courses");
    } finally {
      setCourseLoading(false);
    }
  };

  const handleCreateCourse = () => {
    setCourseForm({
      categoryCode: "",
      title: "",
      description: "",
      price: "",
      thumbnailUrl: "",
      duration: "",
      level: "Beginner",
      isPublished: false,
    });
    setEditingCourse(null);
    setThumbnailFile(null);
    setThumbnailPreview(null);
    setShowCourseModal(true);
  };

  const handleEditCourse = (course) => {
    setCourseForm({
      categoryCode: course.categoryCode,
      title: course.title,
      description: course.description || "",
      price: course.price,
      thumbnailUrl: course.thumbnailUrl || "",
      duration: course.duration,
      level: course.level,
      isPublished: course.published || false,
    });
    setEditingCourse(course);
    setThumbnailFile(null);
    setThumbnailPreview(course.thumbnailUrl || null); // Hiển thị thumbnail cũ
    setShowCourseModal(true);
  };

  const handleSaveCourse = async () => {
    try {
      if (!courseForm.categoryCode || !courseForm.title || !courseForm.price || !courseForm.duration) {
        toast.warning("Please fill in required fields");
        return;
      }

      let thumbnailUrl = courseForm.thumbnailUrl;

      // Nếu có file mới được chọn, upload file trước
      if (thumbnailFile) {
        try {
          const uploadResponse = await AdminAPI.uploadThumbnail(thumbnailFile);
          if (uploadResponse.data.success) {
            thumbnailUrl = uploadResponse.data.data; // URL trả về từ backend
          } else {
            toast.error("Failed to upload thumbnail");
            return;
          }
        } catch (uploadErr) {
          toast.error(uploadErr.response?.data?.message || "Failed to upload thumbnail");
          return;
        }
      }

      const payload = {
        ...courseForm,
        thumbnailUrl,
        price: parseFloat(courseForm.price),
        duration: parseFloat(courseForm.duration),
      };

      if (editingCourse) {
        const response = await AdminAPI.updateCourse({
          id: editingCourse.id,
          ...payload,
        });
        if (response.data.success) {
          toast.success("Course updated successfully!");
          fetchCourses();
          setShowCourseModal(false);
          setThumbnailFile(null);
          setThumbnailPreview(null);
        }
      } else {
        const response = await AdminAPI.createCourse(payload);
        if (response.data.success) {
          toast.success("Course created successfully!");
          fetchCourses();
          setShowCourseModal(false);
          setThumbnailFile(null);
          setThumbnailPreview(null);
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save course");
    }
  };

  const handleDeleteCourse = async (id) => {
    if (!window.confirm("Are you sure you want to delete this course?")) return;
    
    try {
      const response = await AdminAPI.deleteCourse(id);
      if (response.data.success) {
        toast.success("Course deleted successfully!");
        fetchCourses();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete course");
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(price);
  };

  return (
    <div className="flex h-screen bg-gray-950">
      <AdminSidebar onLogout={handleLogout} />

      <main className="flex-1 overflow-y-auto">
        {/* Header */}
        <header className="sticky top-0 z-10 border-b border-gray-800 bg-gray-900/95 backdrop-blur-sm">
          <div className="px-8 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-white">Course Management</h1>
                <p className="text-sm text-gray-400">Manage courses and categories</p>
              </div>
            </div>

            {/* Tabs */}
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => setActiveTab("courses")}
                className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition ${
                  activeTab === "courses"
                    ? "bg-purple-600 text-white"
                    : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                }`}
              >
                <span className="material-symbols-outlined text-lg">school</span>
                Courses ({courses.length})
              </button>
              <button
                onClick={() => setActiveTab("categories")}
                className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition ${
                  activeTab === "categories"
                    ? "bg-purple-600 text-white"
                    : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                }`}
              >
                <span className="material-symbols-outlined text-lg">category</span>
                Categories ({categories.length})
              </button>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="p-8">
          {activeTab === "categories" ? (
            // ==================== CATEGORIES TAB ====================
            <div>
              <div className="mb-6 flex items-center justify-between">
                <h2 className="text-xl font-bold text-white">Course Categories</h2>
                <button
                  onClick={handleCreateCategory}
                  className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 px-4 py-2 font-semibold text-white transition hover:shadow-lg"
                >
                  <span className="material-symbols-outlined">add</span>
                  Create Category
                </button>
              </div>

              {categoryLoading ? (
                <div className="flex justify-center py-20">
                  <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-700 border-t-purple-500"></div>
                </div>
              ) : categories.length === 0 ? (
                <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-16 text-center">
                  <span className="material-symbols-outlined mb-4 text-6xl text-gray-600">category</span>
                  <h3 className="mb-2 text-xl font-semibold text-white">No categories yet</h3>
                  <p className="text-gray-400">Create your first category to get started</p>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {categories.map((category) => (
                    <div
                      key={category.id}
                      className="rounded-xl border border-gray-800 bg-gray-900 p-6 transition hover:border-purple-500/50"
                    >
                      <div className="mb-3 flex items-start justify-between">
                        <div className="flex-1">
                          <div className="mb-1 inline-block rounded bg-purple-500/10 px-2 py-1 text-xs font-mono text-purple-400">
                            {category.code}
                          </div>
                          <h3 className="text-lg font-bold text-white">{category.name}</h3>
                          <p className="mt-1 text-sm text-gray-400">{category.description}</p>
                        </div>
                      </div>
                      <div className="mt-4 flex gap-2">
                        <button
                          onClick={() => handleEditCategory(category)}
                          className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
                        >
                          <span className="material-symbols-outlined text-sm">edit</span>
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteCategory(category.code)}
                          className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-red-700"
                        >
                          <span className="material-symbols-outlined text-sm">delete</span>
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            // ==================== COURSES TAB ====================
            <div>
              <div className="mb-6 flex items-center justify-between">
                <h2 className="text-xl font-bold text-white">Courses Management</h2>
                <button
                  onClick={handleCreateCourse}
                  className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 px-4 py-2 font-semibold text-white transition hover:shadow-lg"
                >
                  <span className="material-symbols-outlined">add</span>
                  Create Course
                </button>
              </div>

              {courseLoading ? (
                <div className="flex justify-center py-20">
                  <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-700 border-t-purple-500"></div>
                </div>
              ) : courses.length === 0 ? (
                <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-16 text-center">
                  <span className="material-symbols-outlined mb-4 text-6xl text-gray-600">school</span>
                  <h3 className="mb-2 text-xl font-semibold text-white">No courses yet</h3>
                  <p className="text-gray-400">Create your first course to get started</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {courses.map((course) => (
                    <div
                      key={course.id}
                      className="rounded-xl border border-gray-800 bg-gray-900 p-6 transition hover:border-purple-500/50"
                    >
                      <div className="flex gap-6">
                        {/* Thumbnail */}
                        <div className="h-32 w-48 flex-shrink-0 overflow-hidden rounded-lg bg-gray-800">
                          {course.thumbnailUrl ? (
                            <img
                              src={course.thumbnailUrl}
                              alt={course.title}
                              className="h-full w-full object-cover"
                              onError={(e) => {
                                e.target.src = "https://via.placeholder.com/400x225/1a1a1a/666?text=No+Image";
                              }}
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center">
                              <span className="material-symbols-outlined text-4xl text-gray-700">school</span>
                            </div>
                          )}
                        </div>

                        {/* Content */}
                        <div className="flex-1">
                          <div className="mb-2 flex items-start justify-between">
                            <div className="flex-1">
                              <h3 className="mb-1 text-lg font-bold text-white">{course.title}</h3>
                              <p className="mb-2 text-sm text-gray-400 line-clamp-2">{course.description}</p>
                              <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                                <span className="rounded bg-gray-800 px-2 py-1 font-mono text-purple-400">
                                  {course.categoryCode}
                                </span>
                                <span className={`rounded px-2 py-1 ${
                                  course.level === "Beginner" ? "bg-green-500/10 text-green-500" :
                                  course.level === "Intermediate" ? "bg-yellow-500/10 text-yellow-500" :
                                  "bg-red-500/10 text-red-500"
                                }`}>
                                  {course.level}
                                </span>
                                <span className="flex items-center gap-1">
                                  <span className="material-symbols-outlined text-sm">schedule</span>
                                  {course.duration}h
                                </span>
                                <span className="font-semibold text-purple-400">{formatPrice(course.price)}</span>
                                <span className={`rounded px-2 py-1 ${
                                  course.published ? "bg-green-500/10 text-green-500" : "bg-gray-500/10 text-gray-500"
                                }`}>
                                  {course.published ? "Published" : "Draft"}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="mt-4 flex gap-2">
                            <button
                              onClick={() => navigate(`/admin/courses/${course.id}/content`)}
                              className="flex items-center gap-1 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-purple-700"
                            >
                              <span className="material-symbols-outlined text-sm">school</span>
                              Manage Content
                            </button>
                            <button
                              onClick={() => handleEditCourse(course)}
                              className="flex items-center gap-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
                            >
                              <span className="material-symbols-outlined text-sm">edit</span>
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteCourse(course.id)}
                              className="flex items-center gap-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700"
                            >
                              <span className="material-symbols-outlined text-sm">delete</span>
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Category Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-gray-800 bg-gray-900 p-6">
            <h3 className="mb-4 text-xl font-bold text-white">
              {editingCategory ? "Edit Category" : "Create Category"}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-400">Code *</label>
                <input
                  type="text"
                  value={categoryForm.code}
                  onChange={(e) => setCategoryForm({ ...categoryForm, code: e.target.value.toUpperCase() })}
                  className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-white focus:border-purple-500 focus:outline-none"
                  placeholder="PROGRAMMING"
                  disabled={editingCategory} // Code không thể sửa khi edit
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-400">Name *</label>
                <input
                  type="text"
                  value={categoryForm.name}
                  onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                  className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-white focus:border-purple-500 focus:outline-none"
                  placeholder="Lập trình"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-400">Description</label>
                <textarea
                  value={categoryForm.description}
                  onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                  className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-white focus:border-purple-500 focus:outline-none"
                  rows="3"
                  placeholder="Các khóa học về lập trình..."
                />
              </div>
            </div>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setShowCategoryModal(false)}
                className="flex-1 rounded-lg bg-gray-800 px-4 py-2 font-medium text-white transition hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveCategory}
                className="flex-1 rounded-lg bg-purple-600 px-4 py-2 font-medium text-white transition hover:bg-purple-700"
              >
                {editingCategory ? "Update" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Course Modal */}
      {showCourseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl border border-gray-800 bg-gray-900 p-6">
            <h3 className="mb-4 text-xl font-bold text-white">
              {editingCourse ? "Edit Course" : "Create Course"}
            </h3>
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-400">Category *</label>
                  <select
                    value={courseForm.categoryCode}
                    onChange={(e) => setCourseForm({ ...courseForm, categoryCode: e.target.value })}
                    className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-white focus:border-purple-500 focus:outline-none"
                  >
                    <option value="">Select category</option>
                    {categories.map((cat) => (
                      <option key={cat.code} value={cat.code}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-400">Level *</label>
                  <select
                    value={courseForm.level}
                    onChange={(e) => setCourseForm({ ...courseForm, level: e.target.value })}
                    className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-white focus:border-purple-500 focus:outline-none"
                  >
                    <option value="Beginner">Beginner</option>
                    <option value="Intermediate">Intermediate</option>
                    <option value="Advanced">Advanced</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-400">Title *</label>
                <input
                  type="text"
                  value={courseForm.title}
                  onChange={(e) => setCourseForm({ ...courseForm, title: e.target.value })}
                  className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-white focus:border-purple-500 focus:outline-none"
                  placeholder="Khóa học Java Spring Boot từ A-Z"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-400">Description</label>
                <textarea
                  value={courseForm.description}
                  onChange={(e) => setCourseForm({ ...courseForm, description: e.target.value })}
                  className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-white focus:border-purple-500 focus:outline-none"
                  rows="3"
                  placeholder="Học Spring Boot từ cơ bản đến nâng cao..."
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-400">Price (VND) *</label>
                  <input
                    type="number"
                    value={courseForm.price}
                    onChange={(e) => setCourseForm({ ...courseForm, price: e.target.value })}
                    className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-white focus:border-purple-500 focus:outline-none"
                    placeholder="1500000"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-400">Duration (hours) *</label>
                  <input
                    type="number"
                    value={courseForm.duration}
                    onChange={(e) => setCourseForm({ ...courseForm, duration: e.target.value })}
                    className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-white focus:border-purple-500 focus:outline-none"
                    placeholder="40"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-400">Thumbnail Image</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files[0];
                    if (file) {
                      setThumbnailFile(file);
                      setThumbnailPreview(URL.createObjectURL(file));
                    }
                  }}
                  className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-white focus:border-purple-500 focus:outline-none file:mr-4 file:rounded file:border-0 file:bg-purple-600 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-purple-700"
                />
                {thumbnailPreview && (
                  <div className="mt-3">
                    <img
                      src={thumbnailPreview}
                      alt="Preview"
                      className="h-32 w-auto rounded-lg border border-gray-700 object-cover"
                    />
                  </div>
                )}
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="isPublished"
                  checked={courseForm.isPublished}
                  onChange={(e) => setCourseForm({ ...courseForm, isPublished: e.target.checked })}
                  className="h-4 w-4 rounded border-gray-700 bg-gray-800 text-purple-600 focus:ring-purple-500"
                />
                <label htmlFor="isPublished" className="text-sm font-medium text-gray-400">
                  Publish immediately
                </label>
              </div>
            </div>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setShowCourseModal(false)}
                className="flex-1 rounded-lg bg-gray-800 px-4 py-2 font-medium text-white transition hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveCourse}
                className="flex-1 rounded-lg bg-purple-600 px-4 py-2 font-medium text-white transition hover:bg-purple-700"
              >
                {editingCourse ? "Update" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
