import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AdminSidebar from "../component/AdminSidebar.jsx";
import AdminAPI from "../api/adminAPI.jsx";
import toast from "../utils/toast.js";

export default function AdminCategories() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [form, setForm] = useState({
    code: "",
    name: "",
    description: "",
  });

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    const userRole = localStorage.getItem("userRole");
    
    if (!token) {
      navigate("/auth");
      return;
    }

    if (userRole !== "ADMIN" && userRole !== "ROLE_ADMIN") {
      toast.error("Access denied! Admin only.");
      navigate("/home");
      return;
    }
    
    fetchCategories();
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("userEmail");
    localStorage.removeItem("userRole");
    navigate("/auth");
  };

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const response = await AdminAPI.getAllCategories();
      if (response.data.success) {
        setCategories(response.data.data || []);
      }
    } catch (err) {
      console.error("Error fetching categories:", err);
      toast.error(err.response?.data?.message || "Failed to load categories");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setForm({ code: "", name: "", description: "" });
    setEditingCategory(null);
    setShowModal(true);
  };

  const handleEdit = (category) => {
    setForm({
      code: category.code,
      name: category.name,
      description: category.description || "",
    });
    setEditingCategory(category);
    setShowModal(true);
  };

  const handleSave = async () => {
    try {
      if (!form.code || !form.name) {
        toast.warning("Code and Name are required!");
        return;
      }

      if (editingCategory) {
        const response = await AdminAPI.updateCategory({
          id: editingCategory.id,
          ...form,
        });
        if (response.data.success) {
          toast.success("Category updated successfully!");
          fetchCategories();
          setShowModal(false);
        }
      } else {
        const response = await AdminAPI.createCategory(form);
        if (response.data.success) {
          toast.success("Category created successfully!");
          fetchCategories();
          setShowModal(false);
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save category");
    }
  };

  const handleDelete = async (code) => {
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

  return (
    <div className="flex h-screen bg-gray-950">
      <AdminSidebar onLogout={handleLogout} />

      <main className="flex-1 overflow-y-auto">
        {/* Header */}
        <header className="sticky top-0 z-10 border-b border-gray-800 bg-gray-900/95 backdrop-blur-sm">
          <div className="px-8 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-white">Course Categories</h1>
                <p className="text-sm text-gray-400">
                  Manage course categories ({categories.length} total)
                </p>
              </div>
              <button
                onClick={handleCreate}
                className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-red-600 to-orange-600 px-4 py-2 font-semibold text-white shadow-lg transition hover:shadow-xl"
              >
                <span className="material-symbols-outlined">add</span>
                Create Category
              </button>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="p-8">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <div className="mb-4 inline-block h-12 w-12 animate-spin rounded-full border-4 border-gray-700 border-t-red-500"></div>
                <p className="text-gray-400">Loading categories...</p>
              </div>
            </div>
          ) : categories.length === 0 ? (
            <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-16 text-center">
              <span className="material-symbols-outlined mb-4 text-6xl text-gray-600">
                category
              </span>
              <h3 className="mb-2 text-xl font-semibold text-white">No categories yet</h3>
              <p className="mb-6 text-gray-400">
                Create your first category to organize courses
              </p>
              <button
                onClick={handleCreate}
                className="rounded-lg bg-gradient-to-r from-red-600 to-orange-600 px-6 py-3 font-semibold text-white transition hover:shadow-lg"
              >
                Create First Category
              </button>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {categories.map((category) => (
                <div
                  key={category.id}
                  className="group rounded-xl border border-gray-800 bg-gradient-to-br from-gray-900 to-gray-800 p-6 transition hover:border-orange-500/50 hover:shadow-xl hover:shadow-orange-500/10"
                >
                  {/* Header */}
                  <div className="mb-4 flex items-start justify-between">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-red-500 to-orange-500">
                      <span className="material-symbols-outlined text-2xl text-white">
                        category
                      </span>
                    </div>
                    <div className="rounded-full bg-red-500/10 px-3 py-1">
                      <span className="font-mono text-xs font-semibold text-red-400">
                        {category.code}
                      </span>
                    </div>
                  </div>

                  {/* Content */}
                  <h3 className="mb-2 text-lg font-bold text-white group-hover:text-orange-400">
                    {category.name}
                  </h3>
                  <p className="mb-4 line-clamp-2 text-sm text-gray-400">
                    {category.description || "No description"}
                  </p>

                  {/* Meta Info */}
                  <div className="mb-4 flex items-center gap-2 text-xs text-gray-500">
                    <span className="material-symbols-outlined text-base">schedule</span>
                    {category.createdAt 
                      ? new Date(category.createdAt).toLocaleDateString('vi-VN')
                      : 'N/A'}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 border-t border-gray-700 pt-4">
                    <button
                      onClick={() => handleEdit(category)}
                      className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
                    >
                      <span className="material-symbols-outlined text-base">edit</span>
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(category.code)}
                      className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-red-700"
                    >
                      <span className="material-symbols-outlined text-base">delete</span>
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-gray-800 bg-gray-900 p-6 shadow-2xl">
            <div className="mb-6 flex items-center justify-between">
              <h3 className="text-xl font-bold text-white">
                {editingCategory ? "Edit Category" : "Create Category"}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 transition hover:text-white"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="space-y-4">
              {/* Code */}
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-300">
                  Code <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                  className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-3 font-mono text-white placeholder-gray-500 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                  placeholder="PROGRAMMING"
                  disabled={editingCategory} // Code không thể sửa khi edit
                />
                <p className="mt-1 text-xs text-gray-500">
                  Unique identifier (uppercase, no spaces)
                </p>
              </div>

              {/* Name */}
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-300">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-3 text-white placeholder-gray-500 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                  placeholder="Lập trình"
                />
              </div>

              {/* Description */}
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-300">
                  Description
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-3 text-white placeholder-gray-500 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                  rows="4"
                  placeholder="Các khóa học về lập trình phần mềm, web, mobile..."
                />
                <p className="mt-1 text-xs text-gray-500">
                  Optional description for this category
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 rounded-lg bg-gray-800 px-4 py-3 font-medium text-white transition hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="flex-1 rounded-lg bg-gradient-to-r from-red-600 to-orange-600 px-4 py-3 font-medium text-white transition hover:shadow-lg"
              >
                {editingCategory ? "Update" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
