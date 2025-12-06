import type { InputHTMLAttributes } from "react";
import "../../styles/ui.scss";

export default function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className="ui-input" />;
}
