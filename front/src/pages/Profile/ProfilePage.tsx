import { useContext, useEffect, useMemo, useState } from "react";
import client from "../../api/client";
import { useToast } from "../../components/Toast/ToastProvider";
import { AuthContext } from "../../context/AuthContext";
import "../../styles/profile.scss";
import AppButton from "../../components/UI/Button";

type ProfileResponse = {
  name?: string;
  surname?: string;
  university?: string;
  course?: string | number;
  specialty?: string;
  job?: string;
  workplace?: string;
  about?: string;
  telegram?: string;
  vk?: string;
  email?: string;
};

type ProfileUpdatePayload = Record<string, string | undefined>;

const AVATAR_COLORS = [
  "#f44336",
  "#e91e63",
  "#9c27b0",
  "#673ab7",
  "#3f51b5",
  "#2196f3",
  "#03a9f4",
  "#00bcd4",
  "#009688",
  "#4caf50",
  "#8bc34a",
  "#cddc39",
  "#ffeb3b",
  "#ffc107",
  "#ff9800",
  "#ff5722",
  "#795548",
  "#607d8b",
];

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
    let mounted = true;
    (async () => {
      if (!user) {
        setProfile((p) => ({ ...p, email: "example@mail.ru" }));
        return;
      }

      if (client.USE_MOCK) {
        const userRecord = user as unknown as Record<string, unknown>;
        setProfile({
          name: user.name || "\u0418\u043c\u044f",
          surname: user.surname || "\u0424\u0430\u043c\u0438\u043b\u0438\u044f",
          university: String(userRecord.university ?? ""),
          course: String(userRecord.course ?? ""),
          specialty: String(userRecord.specialty ?? ""),
          workplace: String(userRecord.workplace ?? userRecord.job ?? ""),
          about: String(userRecord.about ?? ""),
          telegram: String(userRecord.telegram ?? ""),
          vk: String(userRecord.vk ?? ""),
          email: user.email || "",
        });
        return;
      }

      try {
        const data = await client.get<ProfileResponse>("/api/users/profile/");
        if (!mounted) return;
        setProfile({
          name: data?.name || user.name || "Имя",
          surname: data?.surname || user.surname || "Фамилия",
          university: data?.university || "",
          course: data?.course != null ? String(data.course) : "",
          specialty: data?.specialty || "",
          workplace: data?.job || data?.workplace || "",
          about: data?.about || "",
          telegram: data?.telegram || "",
          vk: data?.vk || "",
          email: data?.email || user.email || "",
        });
      } catch {
        if (!mounted) return;
        setProfile({
          name: user.name || "Имя",
          surname: user.surname || "Фамилия",
          university: "",
          course: "",
          specialty: "",
          workplace: "",
          about: "",
          telegram: "",
          vk: "",
          email: user.email || "",
        });
      }
    })();

    return () => {
      mounted = false;
    };
  }, [user]);

  const update = (key: string, value: string) => setProfile({ ...profile, [key]: value });

  const onSave = async () => {
    if (!user) return;
    try {
      const payload: ProfileUpdatePayload = {
        name: profile.name,
        surname: profile.surname,
        telegram: profile.telegram || undefined,
        email: profile.email || undefined,
        course: profile.course || undefined,
        university: profile.university || undefined,
        vk: profile.vk || undefined,
        specialty: profile.specialty || undefined,
        about: profile.about || undefined,
        workplace: profile.workplace || undefined,
        job: profile.workplace || undefined,
      };

      Object.keys(payload).forEach((k) => {
        const value = payload[k];
        if (typeof value === "undefined" || value === "") delete payload[k];
      });

      await updateProfile(payload);
      setEditing(false);
      showToast("success", "Профиль сохранён");
    } catch {
      showToast("error", "Ошибка при сохранении профиля");
    }
  };

  const initials = useMemo(() => {
    const s = (profile.surname || "").trim();
    const n = (profile.name || "").trim();
    const a = (s[0] || "").toUpperCase();
    const b = (n[0] || "").toUpperCase();
    return (a + b) || "—";
  }, [profile.name, profile.surname]);

  const avatarBg = useMemo(() => {
    const s = String(user?.id ?? profile.email ?? profile.name ?? "default");
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
    return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
  }, [profile, user]);

  return (
    <div className="page profile-page">
      <h1 className="page-title h1">Личный кабинет</h1>

      <div className="profile-container">
        <div className="profile-block">
          <h4 className="h4">Личная информация</h4>

          <div className="avatar-wrap">
            <div className="avatar" style={{ background: avatarBg }}>
              {initials}
            </div>
          </div>

          <div className="inputs">
            <input className="text-regular" disabled={!editing} value={profile.name} onChange={(e) => update("name", e.target.value)} />
            <input className="text-regular" disabled={!editing} value={profile.surname} onChange={(e) => update("surname", e.target.value)} />
            <input
              className="text-regular"
              disabled={!editing}
              value={profile.university}
              onChange={(e) => update("university", e.target.value)}
              placeholder="Учебное заведение"
            />
            <input className="text-regular" disabled={!editing} value={profile.course} onChange={(e) => update("course", e.target.value)} placeholder="Курс" />
            <input
              className="text-regular"
              disabled={!editing}
              value={profile.specialty}
              onChange={(e) => update("specialty", e.target.value)}
              placeholder="Специальность"
            />
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

      <AppButton
        className="edit-btn h3"
        onClick={() => {
          if (editing) void onSave();
          else setEditing(true);
        }}
      >
        {editing ? "Сохранить изменения" : "Редактировать"}
      </AppButton>
    </div>
  );
}
