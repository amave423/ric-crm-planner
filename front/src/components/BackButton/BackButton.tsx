import { useNavigate } from "react-router-dom";
import "./back-btn.scss";
import arrow from "../../assets/icons/chevron-right.svg";

interface Props {
  to: string;
  label: string;
}

export default function BackButton({ to, label }: Props) {
  const navigate = useNavigate();

  return (
    <button className="back-btn" onClick={() => navigate(to)}>
      <img src={arrow} alt="back" className="icon" />
      <span>{label}</span>
    </button>
  );
}
