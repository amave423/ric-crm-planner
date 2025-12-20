import { useState, useEffect, useContext } from "react";
import Modal from "../Modal/Modal";
import type { Request } from "../../types/request";
import { AuthContext } from "../../context/AuthContext";
import { getProfile } from "../../storage/storage";
import { useToast } from "../Toast/ToastProvider";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  projectId?: number;
  projectTitle?: string;
  eventId?: number;
  specializations?: { id: number; title: string }[];
  onSubmit: (req: Request) => void;
}

export default function ApplyModal({ isOpen, onClose, projectId, projectTitle, eventId, specializations = [], onSubmit }: Props) {
  const { user } = useContext(AuthContext);

  const [studentName, setStudentName] = useState("");
  const [telegram, setTelegram] = useState("");
  const [university, setUniversity] = useState("");
  const [course, setCourse] = useState("");
  const [specialization, setSpecialization] = useState<string>(specializations[0]?.title || "");
  const [about, setAbout] = useState("");
  const { showToast } = useToast();

  useEffect(() => {
    if (!isOpen) return;
    const prof = user ? getProfile(user.id) : undefined;
    setStudentName(user ? `${user.name || ""} ${user.surname || ""}`.trim() : "");
    setTelegram(prof?.telegram || "");
    setUniversity(prof?.university || "");
    setCourse(prof?.course || "");
    setSpecialization(prof?.specialty || specializations[0]?.title || "");
    setAbout(prof?.about || "");
  }, [isOpen, user, specializations]);

  const canSend = studentName.trim() && telegram.trim() && university.trim() && course.trim() && specialization.trim() && projectTitle;

  const handleSend = () => {
    if (!canSend) {
      showToast("error", "Заполните все обязательные поля (кроме «О вас»).");
      return;
    }

    const req: Request = {
      id: 0,
      studentName: studentName.trim(),
      telegram: telegram.trim(),
      university: university.trim(),
      course: course.trim(),
      projectId,
      projectTitle,
      eventId,
      specialization,
      about: about.trim(),
      status: "Прислал заявку",
      createdAt: new Date().toISOString(),
      ownerId: user?.id
    };

    onSubmit(req);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Подать заявку" hideActions>
      <div className="apply-form">
        <div className="apply-header">
          <div className="apply-project">{projectTitle || "Выбранный проект"}</div>
        </div>

        <div className="form-body">
          <div className="form-field">
            <label className="text-small">ФИО</label>
            <input className="text-regular" value={studentName} onChange={(e) => setStudentName(e.target.value)} />
          </div>

          <div className="form-field">
            <label className="text-small">Аккаунт в Telegram</label>
            <input className="text-regular" value={telegram} onChange={(e) => setTelegram(e.target.value)} />
          </div>

          <div className="form-field">
            <label className="text-small">Университет</label>
            <input className="text-regular" value={university} onChange={(e) => setUniversity(e.target.value)} />
          </div>

          <div className="form-field">
            <label className="text-small">Курс</label>
            <input className="text-regular" value={course} onChange={(e) => setCourse(e.target.value)} />
          </div>

          <div className="form-field">
            <label className="text-small">Специализация</label>
            <select className="text-regular" value={specialization} onChange={(e) => setSpecialization(e.target.value)}>
              <option value="">—</option>
              {specializations.map((s) => (
                <option key={s.id} value={s.title}>{s.title}</option>
              ))}
            </select>
          </div>

          <div className="form-field">
            <label className="text-small">О вас (необязательно)</label>
            <textarea value={about} onChange={(e) => setAbout(e.target.value)} />
          </div>
        </div>

        <div className="apply-actions">
          <button className="btn-cancel" onClick={onClose}>Отмена</button>
          <button className="btn-send" onClick={handleSend} disabled={!canSend}>Отправить</button>
        </div>
      </div>
    </Modal>
  );
}