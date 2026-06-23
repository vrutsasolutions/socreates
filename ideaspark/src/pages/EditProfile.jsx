import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../api/axiosInstance";
import { checkUsername } from "../api/authApi";
import Icon from "../components/common/Icon";
import { setEditorInput, takeEditorOutput } from "../state/imageEditorStore";

const USERNAME_RE = /^[a-z0-9._]{3,30}$/;

export default function EditProfile() {
  const navigate = useNavigate();
  const { user, login } = useAuth();
  const fileRef = useRef();

  const originalUsername = user?.username || "";
  const originalUsernameRef = useRef(originalUsername);
  const [form, setForm] = useState({
    name: user?.name || "",
    username: originalUsername,
    bio: user?.bio || "",
    email: user?.email || "",
  });
  const [passwords, setPasswords] = useState({
    current: "",
    newPass: "",
    confirm: "",
  });
  const [avatar, setAvatar] = useState(null);
  const [preview, setPreview] = useState(user?.profileImage || null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [section, setSection] = useState("profile");
  const [uname, setUname] = useState({ state: "idle", message: "" });
  const reqId = useRef(0);

  const handleUsernameChange = (e) => {
    const next = e.target.value.toLowerCase().trim();
    setForm({ ...form, username: next });
    if (!next || next === originalUsernameRef.current)
      setUname({ state: "idle", message: "" });
  };

  useEffect(() => {
    const u = form.username;
    if (!u || u === originalUsernameRef.current) return;
    const id = ++reqId.current;
    const t = setTimeout(async () => {
      if (!USERNAME_RE.test(u)) {
        setUname({ state: "invalid", message: "3–30 chars: a–z, 0–9, . or _" });
        return;
      }
      setUname({ state: "checking", message: "Checking availability…" });
      try {
        const { data } = await checkUsername(u);
        if (id !== reqId.current) return;
        setUname(
          data.success
            ? { state: "available", message: "Username is available" }
            : {
                state: "taken",
                message: data.message || "Username is not available",
              },
        );
      } catch {
        if (id !== reqId.current) return;
        setUname({ state: "idle", message: "" });
      }
    }, 500);

    return () => clearTimeout(t);
  }, [form.username]);

  useEffect(() => {
  const edited = takeEditorOutput();

  if (edited?.length) {
    // Avoid synchronous setState inside effect to prevent cascading renders
    // Schedule state updates asynchronously
    setTimeout(() => {
      setAvatar(edited[0]);
      setPreview(URL.createObjectURL(edited[0]));
    }, 0);
  }
}, []);

  const handleImage = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";

    if (!file) return;

    setEditorInput([file], "/edit-profile");
    navigate("/edit-images");
  };

  const handleSave = async () => {
    const usernameChanged = form.username !== originalUsername;
    if (usernameChanged && !USERNAME_RE.test(form.username)) {
      setError("Please choose a valid username");
      return;
    }
    if (usernameChanged && uname.state === "taken") {
      setError("That username is already taken");
      return;
    }
    setError("");
    setSuccess("");
    setSaving(true);
    try {
      const profile = { name: form.name, bio: form.bio };
      if (usernameChanged) profile.username = form.username;
      const fd = new FormData();
      fd.append(
        "profile",
        new Blob([JSON.stringify(profile)], { type: "application/json" }),
      );
      if (avatar) fd.append("avatar", avatar);
      const { data } = await api.put("/users/me", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      login(data, localStorage.getItem("token"));
      setSuccess("Profile updated!");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update profile");
    }
    setSaving(false);
  };

  const handlePasswordChange = async () => {
    setError("");
    setSuccess("");
    if (passwords.newPass !== passwords.confirm)
      return setError("New passwords do not match");
    if (passwords.newPass.length < 6)
      return setError("Password must be at least 6 characters");
    setSaving(true);
    try {
      await api.put("/users/me/password", {
        currentPassword: passwords.current,
        newPassword: passwords.newPass,
      });
      setPasswords({ current: "", newPass: "", confirm: "" });
      setSuccess("Password changed successfully!");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to change password");
    }
    setSaving(false);
  };

  const inputCls =
    "w-full bg-[#F0F6FF] border border-[#BBDEFB] rounded-2xl px-4 py-3.5 text-[#0D2137] placeholder-[#90A4AE] text-sm focus:outline-none focus:border-[#1565C0] focus:ring-2 focus:ring-[#1565C0]/20 transition";

  return (
    <div className="min-h-screen bg-[#F4F7FF] pb-10">
      {/* Header — matches Home/Inbox */}
      <header className="sticky top-0 z-30 bg-[#1565C0] px-4 pt-4 pb-4 relative shadow-lg border-b border-white/10">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute w-40 h-40 rounded-full border-[30px] border-white/5 -top-16 -right-10" />
          <div className="absolute w-32 h-32 rounded-full border-[24px] border-white/5 -bottom-10 -left-8" />
        </div>
        <div className="flex items-center gap-3 relative z-10">
          <button
            onClick={() => navigate(-1)}
            aria-label="Go back"
            className="w-9 h-9 flex items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25 active:scale-90 transition-all"
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
          <h1 className="text-white font-bold text-lg flex-1">Edit Profile</h1>
        </div>
      </header>

      {/* Content wrapper — matches Home's rounded-t-[32px] white card */}
      <div className="bg-[#1565C0]">
        <div className="bg-white rounded-t-[32px] pt-6">
          {/* Section Tabs — matches Home's tab style */}
          <div className="flex gap-3 px-4 pb-4 border-b border-[#F0F6FF]">
            {["profile", "password"].map((s) => (
              <button
                key={s}
                onClick={() => setSection(s)}
                className={`px-5 py-2.5 rounded-2xl text-sm font-semibold capitalize transition-all active:scale-95
                  ${
                    section === s
                      ? "bg-[#1565C0] text-white shadow-lg shadow-blue-300/40"
                      : "bg-[#F0F6FF] text-[#1565C0] border border-[#BBDEFB] hover:bg-[#DBEAFE] hover:border-[#1565C0]"
                  }`}
              >
                {s === "profile" ? (
                  <span className="inline-flex items-center gap-1.5">
                    <Icon name="user" className="w-4 h-4" />
                    Profile
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5">
                    <Icon name="lock" className="w-4 h-4" />
                    Password
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="px-4 pt-5 space-y-5">
            {/* Alerts */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 text-red-500 text-sm flex items-center gap-2.5">
                <Icon name="alert-triangle" className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}
            {success && (
              <div className="bg-green-50 border border-green-200 rounded-2xl px-4 py-3 text-green-600 text-sm flex items-center gap-2">
                <Icon name="check" className="w-4 h-4 shrink-0" />
                {success}
              </div>
            )}

            {/* Profile Section */}
            {section === "profile" && (
              <>
                {/* Avatar */}
                <div className="flex flex-col items-center gap-3 py-2">
                  <div className="relative w-24 h-24">
                    {preview ? (
                      <img
                        src={preview}
                        alt="avatar"
                        className="w-24 h-24 rounded-3xl object-cover border-2 border-[#BBDEFB]"
                      />
                    ) : (
                      <div className="w-24 h-24 rounded-3xl bg-[#1565C0] flex items-center justify-center text-white text-4xl font-bold">
                        {user?.name?.[0]?.toUpperCase()}
                      </div>
                    )}
                    <button
                     onClick={() => fileRef.current?.click()}
                      className="absolute -bottom-2 -right-2 w-8 h-8 bg-[#1565C0] rounded-2xl flex items-center justify-center text-white shadow-md active:scale-90 transition-all"
                    >
                      <Icon name="camera" className="w-4 h-4" />
                    </button>
                  </div>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImage}
                    className="hidden"
                  />
                  <p className="text-[#90A4AE] text-xs">
                    Tap the camera to change photo
                  </p>
                </div>

                <div>
                  <label className="block text-[#1565C0] text-xs font-semibold uppercase tracking-widest mb-2">
                    Display Name
                  </label>
                  <input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Your name"
                    className={inputCls}
                  />
                </div>

                <div>
                  <label className="block text-[#1565C0] text-xs font-semibold uppercase tracking-widest mb-2">
                    Username
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#90A4AE] text-sm">
                      @
                    </span>
                    <input
                      value={form.username}
                      onChange={handleUsernameChange}
                      placeholder="yourname"
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck={false}
                      className={`${inputCls} pl-8 ${
                        uname.state === "available"
                          ? "border-green-400 focus:border-green-500 focus:ring-green-500/20"
                          : uname.state === "taken" || uname.state === "invalid"
                            ? "border-red-300 focus:border-red-400 focus:ring-red-400/20"
                            : ""
                      }`}
                    />
                  </div>
                  {!originalUsername && (
                    <p className="text-[#90A4AE] text-xs mt-1.5 pl-1">
                      You don't have a username yet — pick one.
                    </p>
                  )}
                  {uname.message && (
                    <p
                      className={`text-xs mt-1.5 pl-1 ${
                        uname.state === "available"
                          ? "text-green-600"
                          : uname.state === "checking"
                            ? "text-[#90A4AE]"
                            : "text-red-500"
                      }`}
                    >
                      {uname.state === "available"
                        ? "✓ "
                        : uname.state === "taken"
                          ? "✕ "
                          : ""}
                      {uname.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-[#1565C0] text-xs font-semibold uppercase tracking-widest mb-2">
                    Bio
                  </label>
                  <textarea
                    value={form.bio}
                    onChange={(e) => setForm({ ...form, bio: e.target.value })}
                    rows={3}
                    placeholder="Tell people about yourself..."
                    className={`${inputCls} resize-none`}
                  />
                </div>

                <div>
                  <label className="block text-[#1565C0] text-xs font-semibold uppercase tracking-widest mb-2">
                    Email
                  </label>
                  <input
                    value={form.email}
                    disabled
                    className={`${inputCls} opacity-50 cursor-not-allowed`}
                  />
                  <p className="text-[#90A4AE] text-xs mt-1.5 pl-1">
                    Email cannot be changed
                  </p>
                </div>

                <button
                  onClick={handleSave}
                  disabled={
                    saving ||
                    uname.state === "checking" ||
                    uname.state === "taken" ||
                    uname.state === "invalid"
                  }
                  className="w-full bg-[#1565C0] hover:bg-[#0D47A1] text-white font-bold py-4 rounded-2xl active:scale-95 transition-all shadow-lg shadow-blue-300/40 disabled:opacity-50 text-sm pb-6"
                >
                  {saving ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin inline-block" />
                      Saving...
                    </span>
                  ) : (
                    "Save Changes"
                  )}
                </button>
              </>
            )}

            {/* Password Section */}
            {section === "password" && (
              <>
                <div>
                  <label className="block text-[#1565C0] text-xs font-semibold uppercase tracking-widest mb-2">
                    Current Password
                  </label>
                  <input
                    type="password"
                    value={passwords.current}
                    onChange={(e) =>
                      setPasswords({ ...passwords, current: e.target.value })
                    }
                    placeholder="••••••••"
                    className={inputCls}
                  />
                </div>

                <div>
                  <label className="block text-[#1565C0] text-xs font-semibold uppercase tracking-widest mb-2">
                    New Password
                  </label>
                  <input
                    type="password"
                    value={passwords.newPass}
                    onChange={(e) =>
                      setPasswords({ ...passwords, newPass: e.target.value })
                    }
                    placeholder="Min. 6 characters"
                    className={inputCls}
                  />
                </div>

                <div>
                  <label className="block text-[#1565C0] text-xs font-semibold uppercase tracking-widest mb-2">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    value={passwords.confirm}
                    onChange={(e) =>
                      setPasswords({ ...passwords, confirm: e.target.value })
                    }
                    placeholder="Repeat new password"
                    className={inputCls}
                  />
                </div>

                <button
                  onClick={handlePasswordChange}
                  disabled={saving}
                  className="w-full bg-[#1565C0] hover:bg-[#0D47A1] text-white font-bold py-4 rounded-2xl active:scale-95 transition-all shadow-lg shadow-blue-300/40 disabled:opacity-50 text-sm mb-6"
                >
                  {saving ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin inline-block" />
                      Updating...
                    </span>
                  ) : (
                    "Change Password"
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
