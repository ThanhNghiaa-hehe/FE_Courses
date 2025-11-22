import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AdminSidebar from "../component/AdminSidebar.jsx";
import AdminAPI from "../api/adminAPI.jsx";
import UserAPI from "../api/userAPI.jsx";
import toast from "../utils/toast.js";

export default function AdminUsers() {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [newRole, setNewRole] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState("all"); // all, USER, ADMIN

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
    
    fetchUsers();
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("userEmail");
    localStorage.removeItem("userRole");
    navigate("/auth");
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await AdminAPI.getAllUsers();
      if (response.data.success) {
        setUsers(response.data.data || []);
      }
    } catch (err) {
      console.error("Error fetching users:", err);
      toast.error(err.response?.data?.message || "Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (user) => {
    setSelectedUser(user);
    setShowModal(true);
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm("Are you sure you want to delete this user?")) return;
    
    try {
      const response = await UserAPI.deleteUser(userId);
      if (response.data.success) {
        toast.success("User deleted successfully!");
        fetchUsers();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete user");
    }
  };

  const handleToggleStatus = async (userId, currentStatus) => {
    try {
      const response = await AdminAPI.updateUserActive(userId, !currentStatus);
      if (response.data.success) {
        toast.success(`User ${currentStatus ? 'disabled' : 'enabled'} successfully!`);
        fetchUsers();
      }
    } catch (err) {
      console.error("Error toggling user status:", err);
      toast.error(err.response?.data?.message || "Failed to update user status");
    }
  };

  const handleOpenRoleModal = (user) => {
    setSelectedUser(user);
    setNewRole(user.role);
    setShowRoleModal(true);
  };

  const handleChangeRole = async () => {
    console.log("🔄 handleChangeRole called");
    console.log("Selected User:", selectedUser);
    console.log("New Role:", newRole);

    if (!newRole) {
      toast.warning("Please select a role!");
      return;
    }

    if (newRole === selectedUser.role) {
      toast.info("Role is the same, no changes needed!");
      setShowRoleModal(false);
      return;
    }

    try {
      console.log("📡 Calling API updateUserRole with:", {
        userId: selectedUser.id,
        role: newRole
      });
      
      const response = await AdminAPI.updateUserRole(selectedUser.id, { role: newRole });
      
      console.log("✅ API Response:", response);
      console.log("✅ Response.data:", response.data);
      console.log("✅ Response.data.success:", response.data.success);
      console.log("✅ Response.data.message:", response.data.message);
      
      // Backend trả về success = true
      if (response.data && response.data.success) {
        toast.success(response.data.message || "Role updated successfully!");
        setShowRoleModal(false);
        fetchUsers();
      } else {
        // Nếu không có success field, check status code
        if (response.status === 200) {
          toast.success(response.data.message || "Role updated successfully!");
          setShowRoleModal(false);
          fetchUsers();
        } else {
          toast.error(response.data.message || "Failed to update role");
        }
      }
    } catch (err) {
      console.error("❌ Error changing user role:", err);
      console.error("Error details:", err.response?.data);
      toast.error(err.response?.data?.message || "Failed to update role");
    }
  };

  const filteredUsers = users.filter((user) => {
    const matchesSearch = 
      user.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.fullName?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = filterRole === "all" || 
                        user.role === filterRole || 
                        (filterRole === "ADMIN" && user.role === "ROLE_ADMIN") ||
                        (filterRole === "USER" && user.role === "ROLE_USER");
    
    return matchesSearch && matchesRole;
  });

  const getRoleBadge = (role) => {
    if (role === "ADMIN" || role === "ROLE_ADMIN") {
      return "bg-red-500/10 text-red-400 border-red-500/20";
    }
    return "bg-blue-500/10 text-blue-400 border-blue-500/20";
  };

  const getStatusBadge = (isEnabled) => {
    return isEnabled
      ? "bg-green-500/10 text-green-400 border-green-500/20"
      : "bg-gray-500/10 text-gray-400 border-gray-500/20";
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
                <h1 className="text-2xl font-bold text-white">User Management</h1>
                <p className="text-sm text-gray-400">
                  Manage system users ({filteredUsers.length} users)
                </p>
              </div>
              <button
                onClick={fetchUsers}
                className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-red-600 to-orange-600 px-4 py-2 font-semibold text-white shadow-lg transition hover:shadow-xl"
              >
                <span className="material-symbols-outlined">refresh</span>
                Refresh
              </button>
            </div>

            {/* Filters */}
            <div className="mt-4 flex flex-wrap gap-3">
              {/* Search */}
              <div className="flex-1 min-w-[300px]">
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                    search
                  </span>
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search by username, email, or name..."
                    className="w-full rounded-lg border border-gray-700 bg-gray-800 py-2 pl-10 pr-4 text-white placeholder-gray-500 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                  />
                </div>
              </div>

              {/* Role Filter */}
              <select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
                className="rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-white focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
              >
                <option value="all">All Roles</option>
                <option value="USER">Users (ROLE_USER)</option>
                <option value="ADMIN">Admins (ROLE_ADMIN)</option>
              </select>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="p-8">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <div className="mb-4 inline-block h-12 w-12 animate-spin rounded-full border-4 border-gray-700 border-t-red-500"></div>
                <p className="text-gray-400">Loading users...</p>
              </div>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-16 text-center">
              <span className="material-symbols-outlined mb-4 text-6xl text-gray-600">
                person_off
              </span>
              <h3 className="mb-2 text-xl font-semibold text-white">No users found</h3>
              <p className="text-gray-400">
                {searchTerm || filterRole !== "all" 
                  ? "Try adjusting your filters"
                  : "No users in the system yet"}
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-gray-800">
              <table className="w-full">
                <thead className="bg-gray-900">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">
                      User
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">
                      Email
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">
                      Role
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">
                      Status
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">
                      Joined Date
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-semibold uppercase tracking-wider text-gray-400">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800 bg-gray-900/50">
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="transition hover:bg-gray-800/50">
                      {/* User Info */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-red-500 to-orange-500 text-white font-semibold">
                            {user.avatarUrl ? (
                              <img
                                src={user.avatarUrl}
                                alt={user.username}
                                className="h-10 w-10 rounded-full object-cover"
                              />
                            ) : (
                              user.username?.charAt(0).toUpperCase() || "U"
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-white">{user.username}</p>
                            <p className="text-sm text-gray-400">{user.fullName || "N/A"}</p>
                          </div>
                        </div>
                      </td>

                      {/* Email */}
                      <td className="px-6 py-4">
                        <p className="text-sm text-gray-300">{user.email}</p>
                      </td>

                      {/* Role */}
                      <td className="px-6 py-4">
                        <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getRoleBadge(user.role)}`}>
                          {user.role}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4">
                        <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getStatusBadge(user.isEnabled)}`}>
                          {user.isEnabled ? "Active" : "Inactive"}
                        </span>
                      </td>

                      {/* Join Date */}
                      <td className="px-6 py-4">
                        <p className="text-sm text-gray-400">
                          {user.createdAt 
                            ? new Date(user.createdAt).toLocaleDateString('vi-VN')
                            : 'N/A'}
                        </p>
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleViewDetails(user)}
                            className="rounded-lg bg-blue-600 p-2 text-white transition hover:bg-blue-700"
                            title="View Details"
                          >
                            <span className="material-symbols-outlined text-lg">visibility</span>
                          </button>
                          <button
                            onClick={() => handleOpenRoleModal(user)}
                            className="rounded-lg bg-purple-600 p-2 text-white transition hover:bg-purple-700"
                            title="Change Role"
                          >
                            <span className="material-symbols-outlined text-lg">admin_panel_settings</span>
                          </button>
                          <button
                            onClick={() => handleToggleStatus(user.id, user.isEnabled)}
                            className={`rounded-lg p-2 text-white transition ${
                              user.isEnabled
                                ? "bg-orange-600 hover:bg-orange-700"
                                : "bg-green-600 hover:bg-green-700"
                            }`}
                            title={user.isEnabled ? "Disable" : "Enable"}
                          >
                            <span className="material-symbols-outlined text-lg">
                              {user.isEnabled ? "block" : "check_circle"}
                            </span>
                          </button>
                          <button
                            onClick={() => handleDeleteUser(user.id)}
                            className="rounded-lg bg-red-600 p-2 text-white transition hover:bg-red-700"
                            title="Delete User"
                          >
                            <span className="material-symbols-outlined text-lg">delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* User Details Modal */}
      {showModal && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-xl border border-gray-800 bg-gray-900 p-6 shadow-2xl">
            <div className="mb-6 flex items-center justify-between">
              <h3 className="text-xl font-bold text-white">User Details</h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 transition hover:text-white"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="space-y-6">
              {/* Avatar & Basic Info */}
              <div className="flex items-center gap-6 rounded-lg border border-gray-800 bg-gray-800/50 p-6">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-red-500 to-orange-500 text-3xl font-bold text-white">
                  {selectedUser.avatarUrl ? (
                    <img
                      src={selectedUser.avatarUrl}
                      alt={selectedUser.username}
                      className="h-20 w-20 rounded-full object-cover"
                    />
                  ) : (
                    selectedUser.username?.charAt(0).toUpperCase() || "U"
                  )}
                </div>
                <div className="flex-1">
                  <h4 className="text-2xl font-bold text-white">{selectedUser.username}</h4>
                  <p className="text-gray-400">{selectedUser.fullName || "No full name"}</p>
                  <div className="mt-2 flex gap-2">
                    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getRoleBadge(selectedUser.role)}`}>
                      {selectedUser.role}
                    </span>
                    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getStatusBadge(selectedUser.isEnabled)}`}>
                      {selectedUser.isEnabled ? "Active" : "Inactive"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Detailed Info Grid */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-lg border border-gray-800 bg-gray-800/30 p-4">
                  <p className="mb-1 text-xs text-gray-500">Email Address</p>
                  <p className="font-medium text-white">{selectedUser.email}</p>
                </div>
                <div className="rounded-lg border border-gray-800 bg-gray-800/30 p-4">
                  <p className="mb-1 text-xs text-gray-500">User ID</p>
                  <p className="font-mono text-sm font-medium text-white">{selectedUser.id}</p>
                </div>
                <div className="rounded-lg border border-gray-800 bg-gray-800/30 p-4">
                  <p className="mb-1 text-xs text-gray-500">Account Created</p>
                  <p className="font-medium text-white">
                    {selectedUser.createdAt 
                      ? new Date(selectedUser.createdAt).toLocaleString('vi-VN')
                      : 'N/A'}
                  </p>
                </div>
                <div className="rounded-lg border border-gray-800 bg-gray-800/30 p-4">
                  <p className="mb-1 text-xs text-gray-500">Account Status</p>
                  <p className={`font-medium ${selectedUser.isEnabled ? 'text-green-400' : 'text-red-400'}`}>
                    {selectedUser.isEnabled ? "Active & Enabled" : "Disabled"}
                  </p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-6 flex gap-3 border-t border-gray-800 pt-6">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 rounded-lg bg-gray-800 px-4 py-3 font-medium text-white transition hover:bg-gray-700"
              >
                Close
              </button>
              <button
                onClick={() => {
                  handleToggleStatus(selectedUser.id, selectedUser.isEnabled);
                  setShowModal(false);
                }}
                className={`flex-1 rounded-lg px-4 py-3 font-medium text-white transition ${
                  selectedUser.isEnabled
                    ? "bg-orange-600 hover:bg-orange-700"
                    : "bg-green-600 hover:bg-green-700"
                }`}
              >
                {selectedUser.isEnabled ? "Disable Account" : "Enable Account"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Change Role Modal */}
      {showRoleModal && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-gray-800 bg-gray-900 p-6 shadow-2xl">
            <div className="mb-6 flex items-center justify-between">
              <h3 className="text-xl font-bold text-white">Change User Role</h3>
              <button
                onClick={() => setShowRoleModal(false)}
                className="text-gray-400 transition hover:text-white"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="space-y-4">
              {/* User Info */}
              <div className="rounded-lg border border-gray-800 bg-gray-800/50 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-red-500 to-orange-500 text-lg font-bold text-white">
                    {selectedUser.username?.charAt(0).toUpperCase() || "U"}
                  </div>
                  <div>
                    <p className="font-semibold text-white">{selectedUser.username}</p>
                    <p className="text-sm text-gray-400">{selectedUser.email}</p>
                  </div>
                </div>
              </div>

              {/* Current Role */}
              <div>
                <p className="mb-2 text-sm text-gray-400">Current Role</p>
                <div className="rounded-lg border border-gray-700 bg-gray-800 p-3">
                  <span className={`inline-flex rounded-full border px-3 py-1 text-sm font-semibold ${getRoleBadge(selectedUser.role)}`}>
                    {selectedUser.role}
                  </span>
                </div>
              </div>

              {/* New Role Selection */}
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-300">
                  Select New Role <span className="text-red-500">*</span>
                </label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-3 text-white focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                >
                  <option value="">-- Select Role --</option>
                  <option value="USER">USER (Regular User)</option>
                  <option value="MANAGER">MANAGER (Manager)</option>
                  <option value="ADMIN">ADMIN (Administrator)</option>
                </select>
                <p className="mt-2 text-xs text-gray-500">
                  ⚠️ Warning: You cannot change your own role
                </p>
              </div>

              {/* Role Descriptions */}
              <div className="space-y-2 rounded-lg border border-gray-800 bg-gray-800/30 p-4">
                <p className="text-xs font-semibold text-gray-400">Role Descriptions:</p>
                <ul className="space-y-1 text-xs text-gray-500">
                  <li>• <span className="text-blue-400">USER</span>: Basic access to courses</li>
                  <li>• <span className="text-yellow-400">MANAGER</span>: Can manage courses and categories</li>
                  <li>• <span className="text-red-400">ADMIN</span>: Full system access</li>
                </ul>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setShowRoleModal(false)}
                className="flex-1 rounded-lg bg-gray-800 px-4 py-3 font-medium text-white transition hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={handleChangeRole}
                className="flex-1 rounded-lg bg-gradient-to-r from-red-600 to-orange-600 px-4 py-3 font-medium text-white transition hover:shadow-lg"
              >
                Update Role
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
