import type { ButtonHTMLAttributes } from "react";
import "../../styles/ui.scss";

export default function Button(props: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button {...props} className="ui-button" />;
}
