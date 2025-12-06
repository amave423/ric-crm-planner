import { useState } from "react";
import "../../styles/profile.scss";

export default function ProfilePage() {
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

  const update = (key: string, value: string) => setProfile({ ...profile, [key]: value });

  return (
    <div className="profile-page">
      <h1>Личный кабинет</h1>
      <div className="profile-columns">
        <div className="left">
          <h3>Личная информация</h3>
          <input disabled={!editing} value={profile.name} onChange={(e)=>update("name", e.target.value)} />
          <input disabled={!editing} value={profile.surname} onChange={(e)=>update("surname", e.target.value)} />
          <input disabled={!editing} value={profile.university} onChange={(e)=>update("university", e.target.value)} placeholder="Учебное заведение" />
          <input disabled={!editing} value={profile.course} onChange={(e)=>update("course", e.target.value)} placeholder="Курс и группа" />
          <input disabled={!editing} value={profile.specialty} onChange={(e)=>update("specialty", e.target.value)} placeholder="Специальность" />
          <textarea disabled={!editing} value={profile.about} onChange={(e)=>update("about", e.target.value)} placeholder="О себе" />
        </div>
        <div className="right">
          <h3>Контакты</h3>
          <input disabled={!editing} value={profile.telegram} onChange={(e)=>update("telegram", e.target.value)} placeholder="Telegram" />
          <input disabled={!editing} value={profile.vk} onChange={(e)=>update("vk", e.target.value)} placeholder="Вконтакте" />
          <input disabled value={profile.email} />
        </div>
      </div>

      <button className="edit-btn" onClick={() => setEditing(!editing)}>
        {editing ? "Сохранить изменения" : "Внести изменения"}
      </button>
    </div>
  );
}
