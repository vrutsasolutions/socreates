import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import BottomNav from "../components/common/BottomNav.premium";
import IdeaCard, {
  IdeaCardSkeleton,
} from "../components/common/IdeaCard.premium";
import { useAuth } from "../context/AuthContext";
import api from "../api/axiosInstance";
import { ProfileSkeleton } from "../components/common/LoadingStates.premium";
import {
  EmptyProfile,
  EmptyProfileSaved,
} from "../components/common/EmptyStates.premium";
import {
  ProfileLoadError,
  PermissionError,
} from "../components/common/ErrorStates.premium";

const TABS = ["My Ideas", "Saved"];

export default function Profile() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [tab, setTab] = useState("My Ideas");
  const [myIdeas, setMyIdeas] = useState([]);
  const [saved, setSaved] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get("/ideas/mine").catch(() => ({ data: [] })),
      api.get("/ideas/saved").catch(() => ({ data: [] })),
    ])
      .then(([mine, saved]) => {
        setMyIdeas(mine.data);
        setSaved(saved.data);
      })
      .finally(() => setLoading(false));
  }, []);

  const ideas = tab === "My Ideas" ? myIdeas : saved;
  const handleDeleteIdea = async (ideaId) => {
    if (!window.confirm("Are you sure you want to delete this idea?")) return;

    try {
      await api.delete(`/ideas/${ideaId}`);
      setMyIdeas((prev) => prev.filter((idea) => idea.id !== ideaId));
    } catch (err) {
      alert(err.response?.data?.message || "Failed to delete idea");
    }
  };

  return (
    <div className="min-h-screen bg-white pb-24">
      {/* Header */}
      <header className="px-4 py-4 flex items-center justify-between bg-[#1565C0]">
        <button
          onClick={() => navigate(-1)}
          className="text-blue-200 hover:text-white transition"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>
        <h1 className="text-white font-bold text-lg">Profile</h1>
        <button
          onClick={() => navigate("/settings")}
          className="text-blue-200 hover:text-white transition"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
        </button>
      </header>

      {/* Profile info */}
      <div className="bg-[#1565C0] px-4 pb-6 text-center">
        {/* Avatar */}
        <div className="mx-auto mb-4 relative w-24 h-24">
          {user?.profileImage ? (
            <img
              src={user.profileImage}
              alt={user.name}
              className="w-24 h-24 rounded-3xl object-cover"
            />
          ) : (
            <div className="w-24 h-24 rounded-3xl bg-[#BBDEFB] flex items-center justify-center text-[#1565C0] text-4xl font-bold">
              {user?.name?.[0]?.toUpperCase()}
            </div>
          )}
          {user?.isPremium && (
            <div className="absolute -bottom-2 -right-2 bg-[#FACC15] rounded-full w-7 h-7 flex items-center justify-center text-sm border-2 border-[#1565C0]">
              ⭐
            </div>
          )}
        </div>

        <h2 className="text-white text-xl font-bold">{user?.name}</h2>
        <p className="text-blue-200 text-sm">@{user?.email?.split("@")[0]}</p>
        {user?.bio && (
          <p className="text-blue-200 text-sm mt-2 leading-relaxed max-w-xs mx-auto">
            {user.bio}
          </p>
        )}
      </div>

      <div className="bg-[#1565C0]">
        <div className="bg-white rounded-t-3xl px-4 pt-4">
          {/* Stats */}
          <div className="flex justify-center gap-8 py-4 border-b border-[#BBDEFB]">
            {[
              { label: "Ideas", value: myIdeas.length },
              { label: "Saved", value: saved.length },
              {
                label: "Likes",
                value: myIdeas.reduce((a, i) => a + (i.likeCount || 0), 0),
              },
            ].map(({ label, value }) => (
              <div key={label} className="text-center">
                <div className="text-[#1565C0] font-bold text-lg">{value}</div>
                <div className="text-[#90A4AE] text-xs">{label}</div>
              </div>
            ))}
          </div>

          {/* Edit button */}
          <button
            onClick={() => navigate("/edit-profile")}
            className="mt-4 w-full bg-[#F0F6FF] border border-[#BBDEFB] text-[#1565C0] font-medium text-sm py-3 rounded-xl hover:border-[#1565C0] hover:text-[#1565C0] transition-all active:scale-95"
          >
            ✏️ Edit Profile
          </button>

          {/* Tabs */}
          <div className="flex gap-2 mt-4 mb-4">
            {TABS.map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all
                  ${tab === t ? "bg-[#1565C0] text-white shadow-md shadow-blue-300/40" : "bg-[#F0F6FF] text-[#1565C0] border border-[#BBDEFB]"}`}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Ideas grid */}
          <div>
            {loading ? (
              <div className="grid grid-cols-2 gap-3">
                {Array(4)
                  .fill(0)
                  .map((_, i) => (
                    <div
                      key={i}
                      className="bg-[#F0F6FF] rounded-2xl overflow-hidden animate-pulse"
                    >
                      <div className="h-32 bg-[#BBDEFB]" />
                      <div className="p-3 space-y-2">
                        <div className="h-3 bg-[#BBDEFB] rounded w-3/4" />
                        <div className="h-2.5 bg-[#BBDEFB] rounded" />
                      </div>
                    </div>
                  ))}
              </div>
            ) : ideas.length > 0 ? (
              <div className="grid grid-cols-2 gap-3">
                {ideas.map((i) => (
                  <div key={i.id} className="relative">
                    <IdeaCard idea={i} />

                    {tab === "My Ideas" && (
                      <button
                        onClick={() => handleDeleteIdea(i.id)}
                        className="absolute top-2 right-2 bg-red-500 text-white text-xs px-2 py-1 rounded-lg shadow"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <div className="text-4xl mb-3">
                  {tab === "My Ideas" ? "💡" : "🔖"}
                </div>
                <p className="text-[#1565C0] font-medium text-sm">
                  {tab === "My Ideas"
                    ? "No ideas published yet"
                    : "No saved ideas yet"}
                </p>
                {tab === "My Ideas" && (
                  <button
                    onClick={() => navigate("/add-idea")}
                    className="mt-3 text-[#1565C0] text-xs hover:text-[#BBDEFB] transition"
                  >
                    + Share your first idea
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
