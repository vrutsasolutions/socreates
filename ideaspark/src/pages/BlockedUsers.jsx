import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchBlockedUsers, unblockUser } from "../api/messagingApi";

export default function BlockedUsers() {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadBlockedUsers = async () => {
    try {
      const res = await fetchBlockedUsers();
      setUsers(res.data || []);
    } catch (err) {
      console.error("Failed to load blocked users:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBlockedUsers();
  }, []);

  const handleUnblock = async (userId) => {
    try {
      await unblockUser(userId);
      setUsers((prev) => prev.filter((u) => u.id !== userId));
    } catch (err) {
      console.error("Failed to unblock user:", err);
      alert(err.response?.data?.message || "Failed to unblock user");
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F7FF]">
      <header className="bg-[#1565C0] text-white px-4 py-4 flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-full bg-white/15 flex items-center justify-center"
        >
          ←
        </button>
        <h1 className="text-lg font-bold">Blocked Users</h1>
      </header>

      <div className="p-4">
        {loading ? (
          <p className="text-[#90A4AE]">Loading...</p>
        ) : users.length === 0 ? (
          <p className="text-center text-[#90A4AE] mt-10">
            No blocked users
          </p>
        ) : (
          <div className="bg-white rounded-2xl overflow-hidden border border-[#DBEAFE]">
            {users.map((user) => (
              <div
                key={user.id}
                className="flex items-center gap-3 px-4 py-4 border-b border-[#E3F2FD]"
              >
                <img
                  src={user.profileImage || "/default-avatar.png"}
                  alt={user.name}
                  className="w-12 h-12 rounded-full object-cover bg-[#DBEAFE]"
                />

                <div className="flex-1 min-w-0">
                  <p className="font-bold text-[#0D2137] truncate">
                    {user.name}
                  </p>
                  <p className="text-sm text-[#90A4AE] truncate">
                    @{user.username || user.email}
                  </p>
                </div>

                <button
                  onClick={() => handleUnblock(user.id)}
                  className="px-4 py-2 rounded-full bg-[#1565C0] text-white text-sm font-semibold"
                >
                  Unblock
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}