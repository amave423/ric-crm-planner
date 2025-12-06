import { useState } from "react";
import "./form.scss";

interface Field {
  key: string;
  label: string;
  type?: "text" | "textarea";
}

interface EditFormProps {
  fields: Field[];
  initial: any;
  onSave: (values: any) => void;
}

export default function EditForm({ fields, initial, onSave }: EditFormProps) {
  const [form, setForm] = useState(initial);

  const update = (key: string, value: string) => {
    setForm({ ...form, [key]: value });
  };

  return (
    <div className="edit-form">
      {fields.map(f => (
        <div className="form-field" key={f.key}>
          <label>{f.label}</label>

          {f.type === "textarea" ? (
            <textarea
              value={form[f.key] || ""}
              onChange={(e) => update(f.key, e.target.value)}
            />
          ) : (
            <input
              value={form[f.key] || ""}
              onChange={(e) => update(f.key, e.target.value)}
            />
          )}
        </div>
      ))}

      <button className="save-btn" onClick={() => onSave(form)}>
        Сохранить
      </button>
    </div>
  );
}
