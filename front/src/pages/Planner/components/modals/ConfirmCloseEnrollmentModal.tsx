import Modal from "../../../../components/Modal/Modal";

type ConfirmCloseEnrollmentModalProps = {
  isOpen: boolean;
  eventTitle?: string;
  onClose: () => void;
  onConfirm: () => void;
};

export default function ConfirmCloseEnrollmentModal({ isOpen, eventTitle, onClose, onConfirm }: ConfirmCloseEnrollmentModalProps) {
  const resolvedTitle = eventTitle?.trim() || "это мероприятие";

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Подтверждение">
      <div className="confirm-body">
        <div className="confirm-text">
          Завершить набор по мероприятию «{resolvedTitle}» и оставить в планировщике только участников со статусом
          «Приступил к ПШ»?
        </div>
        <div className="confirm-actions">
          <button className="link-btn" onClick={onClose}>
            Отмена
          </button>
          <button className="primary" onClick={onConfirm}>
            Подтвердить
          </button>
        </div>
      </div>
    </Modal>
  );
}
