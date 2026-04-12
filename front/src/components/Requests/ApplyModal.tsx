import { useContext, useEffect, useState } from "react";
import client from "../../api/client";
import { REQUEST_STATUS } from "../../constants/requestProgress";
import { AuthContext } from "../../context/AuthContext";
import type { Request } from "../../types/request";
import Modal from "../Modal/Modal";
import { useToast } from "../Toast/ToastProvider";

type ProfileResponse = {
  telegram?: string;
  university?: string;
  course?: string | number;
  specialty?: string;
  about?: string;
};

interface Props {
  isOpen: boolean;
  onClose: () => void;
  projectId?: number;
  projectTitle?: string;
  eventId?: number;
  eventTitle?: string;
  directionId?: number;
  specializations?: { id: number; title: string }[];
  onSubmit: (req: Request) => boolean | Promise<boolean>;
}

export default function ApplyModal({
  isOpen,
  onClose,
  projectId,
  projectTitle,
  eventId,
  eventTitle,
  directionId,
  specializations = [],
  onSubmit,
}: Props) {
  const { user } = useContext(AuthContext);
  const { showToast } = useToast();

  const [studentName, setStudentName] = useState("");
  const [telegram, setTelegram] = useState("");
  const [university, setUniversity] = useState("");
  const [course, setCourse] = useState("");
  const [specialization, setSpecialization] = useState<string>(specializations[0]?.title || "");
  const [about, setAbout] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!isOpen) return;
    let mounted = true;

    (async () => {
      try {
        const profile = user && !client.USE_MOCK ? await client.get<ProfileResponse>("/api/users/profile/") : undefined;
        const userRecord = (user ?? {}) as Record<string, unknown>;
        if (!mounted) return;

        setStudentName(user ? `${user.name || ""} ${user.surname || ""}`.trim() : "");
        setTelegram(String(profile?.telegram ?? userRecord.telegram ?? ""));
        setUniversity(String(profile?.university ?? userRecord.university ?? ""));
        setCourse(String(profile?.course ?? userRecord.course ?? ""));
        setSpecialization(String(profile?.specialty ?? userRecord.specialty ?? specializations[0]?.title ?? ""));
        setAbout(String(profile?.about ?? userRecord.about ?? ""));
        setErrors({});
      } catch {
        if (!mounted) return;
        setStudentName(user ? `${user.name || ""} ${user.surname || ""}`.trim() : "");
        setTelegram("");
        setUniversity("");
        setCourse("");
        setSpecialization(specializations[0]?.title || "");
        setAbout("");
        setErrors({});
      }
    })();

    return () => {
      mounted = false;
    };
  }, [isOpen, specializations, user]);

  const validate = () => {
    const nextErrors: Record<string, string> = {};
    if (!studentName.trim()) nextErrors.studentName = "Введите ФИО";
    if (!telegram.trim()) nextErrors.telegram = "Укажите аккаунт в Telegram";
    if (!university.trim()) nextErrors.university = "Укажите университет";
    if (!course.trim()) nextErrors.course = "Укажите курс";
    if (!specialization.trim()) nextErrors.specialization = "Выберите специализацию";
    if (!eventId) nextErrors.event = "Не найдено мероприятие";
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSend = () => {
    if (!validate()) {
      showToast("error", "Заполните обязательные поля.");
      return;
    }

    const selectedSpecialization = specializations.find((item) => item.title === specialization);
    const request: Request = {
      id: 0,
      studentName: studentName.trim(),
      telegram: telegram.trim(),
      university: university.trim(),
      course: course.trim(),
      projectId,
      projectTitle,
      eventId,
      eventTitle,
      directionId,
      specializationId: selectedSpecialization?.id,
      specialization,
      about: about.trim(),
      status: REQUEST_STATUS.SUBMITTED,
      createdAt: new Date().toISOString(),
      ownerId: user?.id,
    };

    const result = onSubmit(request);
    Promise.resolve(result).then((ok) => {
      if (ok) onClose();
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Подать заявку" hideActions>
      <div className="apply-form">
        <div className="apply-header">
          <div className="apply-project">{eventTitle || projectTitle || "Выбранное мероприятие"}</div>
        </div>

        <div className="form-body">
          <div className="form-field">
            <label className="text-small">ФИО</label>
            <input
              className="text-regular"
              value={studentName}
              onChange={(event) => {
                setStudentName(event.target.value);
                setErrors((prev) => {
                  const next = { ...prev };
                  delete next.studentName;
                  return next;
                });
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
              onChange={(event) => {
                setTelegram(event.target.value);
                setErrors((prev) => {
                  const next = { ...prev };
                  delete next.telegram;
                  return next;
                });
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
              onChange={(event) => {
                setUniversity(event.target.value);
                setErrors((prev) => {
                  const next = { ...prev };
                  delete next.university;
                  return next;
                });
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
              onChange={(event) => {
                setCourse(event.target.value);
                setErrors((prev) => {
                  const next = { ...prev };
                  delete next.course;
                  return next;
                });
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
              onChange={(event) => {
                setSpecialization(event.target.value);
                setErrors((prev) => {
                  const next = { ...prev };
                  delete next.specialization;
                  return next;
                });
              }}
              aria-invalid={!!errors.specialization}
            >
              <option value="">-</option>
              {specializations.map((item) => (
                <option key={item.id} value={item.title}>
                  {item.title}
                </option>
              ))}
            </select>
            {errors.specialization && <div className="field-error">{errors.specialization}</div>}
          </div>

          <div className="form-field">
            <label className="text-small">О себе (необязательно)</label>
            <textarea value={about} onChange={(event) => setAbout(event.target.value)} />
          </div>
        </div>

        <div className="apply-actions">
          <button type="button" className="btn-cancel" onClick={onClose}>
            Отмена
          </button>
          <button type="button" className="btn-send" onClick={handleSend}>
            Отправить
          </button>
        </div>
      </div>
    </Modal>
  );
}
