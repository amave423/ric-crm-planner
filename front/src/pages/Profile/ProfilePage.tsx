import { useState, useEffect, useContext, useMemo } from "react";
import "../../styles/profile.scss";
import { AuthContext } from "../../context/AuthContext";
import { getProfile, saveProfile } from "../../storage/storage";
import { useToast } from "../../components/Toast/ToastProvider";

export default function ProfilePage() {
  const { user, updateProfile } = useContext(AuthContext);
  const [editing, setEditing] = useState(false);
  const { showToast } = useToast();

  const [profile, setProfile] = useState({
    name: "Имя",
    surname: "Фамилия",
    university: "",
    course: "",
    specialty: "",
    workplace: "",
    about: "",
    telegram: "",
    vk: "",
    email: "example@mail.ru",
  });

  useEffect(() => {
    if (!user) return;
    const stored = getProfile(user.id);
    setProfile({
      name: user.name || "Имя",
      surname: user.surname || "Фамилия",
      university: stored?.university || "",
      course: stored?.course || "",
      specialty: stored?.specialty || "",
      workplace: stored?.workplace || "",
      about: stored?.about || "",
      telegram: stored?.telegram || "",
      vk: stored?.vk || "",
      email: user.email || "",
    });
  }, [user]);

  const update = (key: string, value: string) => setProfile({ ...profile, [key]: value });

  const onSave = () => {
    if (!user) return;
    updateProfile({ name: profile.name, surname: profile.surname });
    saveProfile(user.id, {
      university: profile.university,
      course: profile.course,
      specialty: profile.specialty,
      workplace: profile.workplace,
      about: profile.about,
      telegram: profile.telegram,
      vk: profile.vk,
    });
    setEditing(false);
    showToast("success", "Профиль сохранён");
  };

  const COLORS = [
    "#f44336","#e91e63","#9c27b0","#673ab7","#3f51b5","#2196f3","#03a9f4","#00bcd4",
    "#009688","#4caf50","#8bc34a","#cddc39","#ffeb3b","#ffc107","#ff9800","#ff5722",
    "#795548","#607d8b"
  ];

  const pickColor = (seed: string | number | undefined) => {
    const s = String(seed ?? profile.email ?? profile.name ?? Math.random());
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
    return COLORS[Math.abs(h) % COLORS.length];
  };

  const initials = useMemo(() => {
    const s = (profile.surname || "").trim();
    const n = (profile.name || "").trim();
    const a = (s[0] || "").toUpperCase();
    const b = (n[0] || "").toUpperCase();
    return (a + b) || "—";
  }, [profile.name, profile.surname]);

  const avatarBg = useMemo(() => pickColor(user?.id ?? profile.email), [user, profile.email]);

  return (
    <div className="page profile-page">
      <h1 className="page-title h1">Личный кабинет</h1>

      <div className="profile-container">
        <div className="profile-block">
          <h4 className="h4">Личная информация</h4>

          <div className="avatar-wrap">
            <div className="avatar" style={{ background: avatarBg }}>{initials}</div>
          </div>

          <div className="inputs">
            <input className="text-regular" disabled={!editing} value={profile.name} onChange={(e) => update("name", e.target.value)} />

            <input className="text-regular" disabled={!editing} value={profile.surname} onChange={(e) => update("surname", e.target.value)} />

            <input className="text-regular" disabled={!editing} value={profile.university} onChange={(e) => update("university", e.target.value)} placeholder="Учебное заведение" />

            <input className="text-regular" disabled={!editing} value={profile.course} onChange={(e) => update("course", e.target.value)} placeholder="Курс" />

            <input className="text-regular" disabled={!editing} value={profile.specialty} onChange={(e) => update("specialty", e.target.value)} placeholder="Специальность" />

            <textarea className="text-regular" disabled={!editing} value={profile.about} onChange={(e) => update("about", e.target.value)} placeholder="О себе" />
          </div>
        </div>

        <div className="profile-block">
          <h4 className="h4">Контакты</h4>

          <div className="inputs">
            <input className="text-regular" disabled={!editing} value={profile.telegram} onChange={(e) => update("telegram", e.target.value)} placeholder="Telegram" />

            <input className="text-regular" disabled={!editing} value={profile.vk} onChange={(e) => update("vk", e.target.value)} placeholder="ВКонтакте" />

            <input className="text-regular" disabled value={profile.email} />
          </div>
        </div>
      </div>

      <button
        className="edit-btn h3"
        onClick={() => {
          if (editing) onSave();
          else setEditing(true);
        }}
      >
        {editing ? "Сохранить изменения" : "Редактировать"}
      </button>
    </div>
  );
}