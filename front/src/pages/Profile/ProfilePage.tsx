import { useState, useEffect, useContext } from "react";
import "../../styles/profile.scss";
import { AuthContext } from "../../context/AuthContext";
import { getProfile, saveProfile } from "../../storage/storage";

export default function ProfilePage() {
  const { user, updateProfile } = useContext(AuthContext);
  const [editing, setEditing] = useState(false);

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
    alert("Профиль сохранён");
  };

  return (
    <div className="page profile-page">
      <h1 className="page-title">Личный кабинет</h1>

      <div className="profile-container">
        <div className="profile-block">
          <h3>Личная информация</h3>

          <div className="inputs">
            <input disabled={!editing} value={profile.name} onChange={(e) => update("name", e.target.value)} />

            <input disabled={!editing} value={profile.surname} onChange={(e) => update("surname", e.target.value)} />

            <input disabled={!editing} value={profile.university} onChange={(e) => update("university", e.target.value)} placeholder="Учебное заведение" />

            <input disabled={!editing} value={profile.course} onChange={(e) => update("course", e.target.value)} placeholder="Курс, группа" />

            <input disabled={!editing} value={profile.specialty} onChange={(e) => update("specialty", e.target.value)} placeholder="Специальность" />

            <textarea disabled={!editing} value={profile.about} onChange={(e) => update("about", e.target.value)} placeholder="О себе" />
          </div>
        </div>

        <div className="profile-block">
          <h3>Контакты</h3>

          <div className="inputs">
            <input disabled={!editing} value={profile.telegram} onChange={(e) => update("telegram", e.target.value)} placeholder="Telegram" />

            <input disabled={!editing} value={profile.vk} onChange={(e) => update("vk", e.target.value)} placeholder="ВКонтакте" />

            <input disabled value={profile.email} />
          </div>
        </div>
      </div>

      <button
        className="edit-btn"
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