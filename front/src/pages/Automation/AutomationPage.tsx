import { useContext } from "react";
import { Empty } from "antd";
import AutomationPanel from "../../components/Automation/AutomationPanel";
import { AuthContext } from "../../context/AuthContext";
import "./automation.scss";

const TEXT = {
  noAccessTitle: "Настройка доступна организаторам",
  noAccessDescription: "Студенты могут смотреть свои заявки, а автоматизация настраивается со стороны организатора.",
} as const;

export default function AutomationPage() {
  const { user } = useContext(AuthContext);
  const canManageAutomation = Boolean(user && user.role !== "student");

  if (!canManageAutomation) {
    return (
      <section className="automation-page">
        <div className="automation-page__empty">
          <Empty description={TEXT.noAccessDescription}>
            <h1>{TEXT.noAccessTitle}</h1>
          </Empty>
        </div>
      </section>
    );
  }

  return (
    <section className="automation-page">
      <AutomationPanel scope="crm" />
    </section>
  );
}
