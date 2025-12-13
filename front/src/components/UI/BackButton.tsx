import chevron from "../../assets/icons/chevron-right.svg";
import "./back-button.scss";

interface Props {
  onClick: () => void;
}

export default function BackButton({ onClick }: Props) {
  return (
    <button className="back-btn" onClick={onClick}>
      <img src={chevron} alt="back" />
    </button>
  );
}
