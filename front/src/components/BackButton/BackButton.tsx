import { useNavigate } from "react-router-dom";
import { ArrowLeftOutlined } from "@ant-design/icons";
import "./back-btn.scss";
import AppButton from "../UI/Button";

interface Props {
  to: string;
  label: string;
}

export default function BackButton({ to, label }: Props) {
  const navigate = useNavigate();

  return (
    <AppButton className="back-btn back-btn--text" onClick={() => navigate(to)}>
      <ArrowLeftOutlined className="icon" />
      <span>{label}</span>
    </AppButton>
  );
}
