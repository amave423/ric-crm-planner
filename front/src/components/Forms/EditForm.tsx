import "./form.scss";
import { useState } from "react";
import AppButton from "../UI/Button";
import AppInput, { AppTextArea } from "../UI/Input";

export type Field = {
  key: string;
  label: string;
  type?: "text" | "textarea" | "date";
};

interface Props {
  fields: Field[];
  initial: Record<string, string> | null | undefined;
  onSave: (data: Record<string, string>) => void;
}

export default function EditForm({ fields, initial, onSave }: Props) {
  const [form, setForm] = useState<Record<string, string>>(initial || {});

  const update = (key: string, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  return (
    <form
      className="form-body"
      onSubmit={(e) => {
        e.preventDefault();
        onSave(form);
      }}
    >
      {fields.map((f) => (
        <div key={f.key} className="form-row">
          <label className="text-small">{f.label}</label>

          {f.type === "textarea" ? (
            <AppTextArea
              className="text-regular"
              value={form[f.key] || ""}
              onChange={(e) => update(f.key, e.target.value)}
            />
          ) : (
            <AppInput
              type={f.type === "date" ? "date" : "text"}
              className="text-regular"
              value={form[f.key] || ""}
              onChange={(e) => update(f.key, e.target.value)}
            />
          )}
        </div>
      ))}

      <AppButton className="primary-btn text-regular">Сохранить</AppButton>
    </form>
  );
}
