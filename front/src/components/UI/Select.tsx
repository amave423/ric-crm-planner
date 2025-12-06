import type { SelectHTMLAttributes } from "react";
import "../../styles/ui.scss";

export default function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className="ui-select" />;
}
