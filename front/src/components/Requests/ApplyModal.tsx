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
  const [errors, setErrors] = useState<Record<string, string>>({});
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
    setErrors({});
  }, [isOpen]); // <-- только при открытии модалки, чтобы не сбрасывать поля при ререндере родителя

  const validate = () => {
    const e: Record<string, string> = {};
    if (!studentName.trim()) e.studentName = "Введите ФИО";
    if (!telegram.trim()) e.telegram = "Укажите аккаунт в Telegram";
    if (!university.trim()) e.university = "Укажите университет";
    if (!course.trim()) e.course = "Укажите курс";
    if (!specialization.trim()) e.specialization = "Выберите специализацию";
    if (!projectTitle) e.project = "Проект не выбран";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSend = () => {
    if (!validate()) {
      showToast("error", "Заполните обязательные поля.");
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
    showToast("success", "Заявка отправлена");
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
            <input
              className="text-regular"
              value={studentName}
              onChange={(e) => {
                setStudentName(e.target.value);
                setErrors(prev => { const p = { ...prev }; delete p.studentName; return p; });
              }}
              aria-invalid={!!errors.studentName}
            />
            {errors.studentName && <div className="field-error">{errors.studentName}</div>}
          </div>

          <div className="form-field">
            <label className="text-small">Аккаунт в Telegram</label>
            <input
              className="text-regular"
              value={telegram}
              onChange={(e) => {
                setTelegram(e.target.value);
                setErrors(prev => { const p = { ...prev }; delete p.telegram; return p; });
              }}
              aria-invalid={!!errors.telegram}
            />
            {errors.telegram && <div className="field-error">{errors.telegram}</div>}
          </div>

          <div className="form-field">
            <label className="text-small">Университет</label>
            <input
              className="text-regular"
              value={university}
              onChange={(e) => {
                setUniversity(e.target.value);
                setErrors(prev => { const p = { ...prev }; delete p.university; return p; });
              }}
              aria-invalid={!!errors.university}
            />
            {errors.university && <div className="field-error">{errors.university}</div>}
          </div>

          <div className="form-field">
            <label className="text-small">Курс</label>
            <input
              className="text-regular"
              value={course}
              onChange={(e) => {
                setCourse(e.target.value);
                setErrors(prev => { const p = { ...prev }; delete p.course; return p; });
              }}
              aria-invalid={!!errors.course}
            />
            {errors.course && <div className="field-error">{errors.course}</div>}
          </div>

          <div className="form-field">
            <label className="text-small">Специализация</label>
            <select
              className="text-regular"
              value={specialization}
              onChange={(e) => {
                setSpecialization(e.target.value);
                setErrors(prev => { const p = { ...prev }; delete p.specialization; return p; });
              }}
              aria-invalid={!!errors.specialization}
            >
              <option value="">—</option>
              {specializations.map((s) => (
                <option key={s.id} value={s.title}>{s.title}</option>
              ))}
            </select>
            {errors.specialization && <div className="field-error">{errors.specialization}</div>}
          </div>

          <div className="form-field">
            <label className="text-small">О вас (необязательно)</label>
            <textarea
              value={about}
              onChange={(e) => setAbout(e.target.value)}
            />
          </div>
        </div>

        <div className="apply-actions">
          <button type="button" className="btn-cancel" onClick={onClose}>Отмена</button>
          <button type="button" className="btn-send" onClick={handleSend}>Отправить</button>
        </div>
      </div>
    </Modal>
  );
}