import "./form.scss";
import { useState } from "react";

export type Field = {
  key: string;
  label: string;
  type?: "text" | "textarea" | "date";
};

interface Props {
  fields: Field[];
  onCreate: (data: any) => void;
}

export default function CreateForm({ fields, onCreate }: Props) {
  const [form, setForm] = useState<any>({});

  const update = (key: string, value: string) =>
    setForm((prev: any) => ({ ...prev, [key]: value }));

  return (
    <form
      className="form-body"
      onSubmit={(e) => {
        e.preventDefault();
        onCreate(form);
      }}
    >
      {fields.map((f) => (
        <div key={f.key} className="form-row">
          <label className="text-small">{f.label}</label>

          {f.type === "textarea" ? (
            <textarea
              className="text-regular"
              onChange={(e) => update(f.key, e.target.value)}
            />
          ) : (
            <input
              type={f.type === "date" ? "date" : "text"}
              className="text-regular"
              onChange={(e) => update(f.key, e.target.value)}
            />
          )}
        </div>
      ))}

      <button className="primary-btn text-regular" type="submit">
        Создать
      </button>
    </form>
  );
}
