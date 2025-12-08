import "./modal.scss";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

export default function Modal({ isOpen, onClose, title, children }: ModalProps) {
  if (!isOpen) return null;

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        
        {title && <h2 className="modal-title">{title}</h2>}

        <div className="modal-content">{children}</div>

        <button className="close-btn" onClick={onClose}>Закрыть</button>
      </div>
    </div>
  );
}
