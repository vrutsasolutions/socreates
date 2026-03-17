import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axiosInstance';

function formatDate(dateString) {
  if (!dateString) return '';
  const diff = Math.floor((new Date() - new Date(dateString)) / 1000);
  if (diff < 60)    return 'just now';
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function IdeaCard({ idea, onSaveToggle }) {
  const navigate = useNavigate();
  const [saved, setSaved]   = useState(idea.savedByCurrentUser);
  const [likes, setLikes]   = useState(idea.likeCount || 0);
  const [liked, setLiked]   = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSave = async (e) => {
    e.stopPropagation();
    if (saving) return;
    setSaving(true);
    try {
      saved ? await api.delete(`/ideas/${idea.id}/save`) : await api.post(`/ideas/${idea.id}/save`);
      setSaved(!saved);
      onSaveToggle?.(idea.id, !saved);
    } catch (_) {}
    setSaving(false);
  };

  const handleLike = async (e) => {
    e.stopPropagation();
    try {
      liked ? await api.delete(`/ideas/${idea.id}/like`) : await api.post(`/ideas/${idea.id}/like`);
      setLikes(l => liked ? l - 1 : l + 1);
      setLiked(!liked);
    } catch (_) {}
  };

  return (
    <div onClick={() => navigate(idea.isPremium ? `/premium/${idea.id}` : `/ideas/${idea.id}`)}
         className="bg-white border border-[#E3F2FD] rounded-2xl overflow-hidden
                    cursor-pointer active:scale-[0.98] transition-all hover:border-[#90CAF9]
                    hover:shadow-md hover:shadow-blue-100/50 group">

      {/* Image */}
      <div className="relative h-36 bg-[#F0F6FF] overflow-hidden flex items-center justify-center">
        {idea.imageUrl ? (
          <img src={idea.imageUrl} alt={idea.title}
               className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        ) : (
          <span className="text-4xl opacity-30">💡</span>
        )}
        {idea.isPremium && (
          <div className="absolute top-2 left-2 bg-yellow-400 text-yellow-900
                          text-[10px] font-bold px-2 py-0.5 rounded-full">
            ⭐ PRO
          </div>
        )}
        {idea.category && (
          <div className="absolute top-2 right-2 bg-[#1565C0]/80 text-white
                          text-[10px] px-2 py-0.5 rounded-full">
            {idea.category}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-3">
        <div className="flex items-center gap-1.5 mb-2">
          <div className="w-6 h-6 rounded-full bg-[#1565C0] flex items-center
                          justify-center text-white text-[10px] font-bold shrink-0">
            {idea.creatorName?.[0]?.toUpperCase() ?? '?'}
          </div>
          <span className="text-[#90A4AE] text-xs truncate">{idea.creatorName}</span>
          <span className="text-[#BBDEFB] text-xs ml-auto shrink-0">{formatDate(idea.createdAt)}</span>
        </div>

        <h3 className="text-[#0D2137] font-semibold text-sm leading-snug mb-1 line-clamp-2">
          {idea.title}
        </h3>

        <p className={`text-[#546E7A] text-xs leading-relaxed line-clamp-2 mb-3
          ${idea.isPremium ? 'blur-[3px] select-none' : ''}`}>
          {idea.description}
        </p>

        {/* Actions */}
        <div className="flex items-center justify-between">
          <button onClick={handleLike}
                  className={`flex items-center gap-1 text-xs transition-colors
                    ${liked ? 'text-red-400' : 'text-[#90A4AE] hover:text-red-400'}`}>
            <svg className="w-3.5 h-3.5" fill={liked ? 'currentColor' : 'none'}
                 viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round"
                    d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
            {likes}
          </button>

          <button onClick={handleSave} disabled={saving}
                  className={`flex items-center gap-1 text-xs transition-colors
                    ${saved ? 'text-[#1565C0]' : 'text-[#90A4AE] hover:text-[#1565C0]'}`}>
            <svg className="w-3.5 h-3.5" fill={saved ? 'currentColor' : 'none'}
                 viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round"
                    d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>
            {saved ? 'Saved' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
