import Modal from "../../../../components/Modal/Modal";

type ConfirmCloseEnrollmentModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

export default function ConfirmCloseEnrollmentModal({ isOpen, onClose, onConfirm }: ConfirmCloseEnrollmentModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Подтверждение">
      <div className="confirm-body">
        <div className="confirm-text">Завершить набор участников и сформировать список тех, кто уже перешёл в статус «Приступил к ПШ»?</div>
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
