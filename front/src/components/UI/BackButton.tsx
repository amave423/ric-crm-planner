import chevron from "../../assets/icons/chevron-right.svg";
import "./back-button.scss";
import AppButton from "./Button";

interface Props {
  onClick: () => void;
}

export default function BackButton({ onClick }: Props) {
  return (
    <AppButton className="back-btn--icon" onClick={onClick}>
      <img src={chevron} alt="back" />
    </AppButton>
  );
}
