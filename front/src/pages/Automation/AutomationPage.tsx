import { useContext, useEffect, useState } from "react";
import { Empty, Segmented } from "antd";
import AutomationPanel from "../../components/Automation/AutomationPanel";
import { AuthContext } from "../../context/AuthContext";
import type { AutomationScope } from "../../types/automation";
import "./automation.scss";

const TEXT = {
  title: "Роботы и триггеры",
  subtitle: "Переключайтесь между сценариями автоматизации для CRM, планировщика и заявок.",
  noAccessTitle: "Настройка доступна организаторам",
  noAccessDescription: "Студенты могут смотреть свои заявки, а автоматизация настраивается со стороны организатора.",
} as const;

const AUTOMATION_TABS: Array<{ label: string; value: AutomationScope }> = [
  { label: "CRM", value: "crm" },
  { label: "Планировщик", value: "planner" },
  { label: "Заявки", value: "requests" },
];

const AUTOMATION_TAB_STORAGE_KEY = "automation-selected-tab";

function isAutomationScope(value: string | null): value is AutomationScope {
  return AUTOMATION_TABS.some((tab) => tab.value === value);
}

export default function AutomationPage() {
  const { user } = useContext(AuthContext);
  const [tab, setTab] = useState<AutomationScope>(() => {
    const savedTab = window.localStorage.getItem(AUTOMATION_TAB_STORAGE_KEY);
    return isAutomationScope(savedTab) ? savedTab : "crm";
  });
  const canManageAutomation = Boolean(user && user.role !== "student");

  useEffect(() => {
    window.localStorage.setItem(AUTOMATION_TAB_STORAGE_KEY, tab);
  }, [tab]);

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
      <div className="automation-page__head">
        <div>
          <h1>{TEXT.title}</h1>
          <p>{TEXT.subtitle}</p>
        </div>

        <Segmented
          className="automation-page__tabs"
          size="large"
          shape="round"
          value={tab}
          onChange={(value) => setTab(value as AutomationScope)}
          options={AUTOMATION_TABS}
        />
      </div>

      <AutomationPanel scope={tab} />
    </section>
  );
}
