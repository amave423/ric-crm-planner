import { useEffect, useMemo, useState } from "react";
import { Empty, Segmented, Spin, Tag } from "antd";
import { RobotOutlined, SaveOutlined, SettingOutlined, ThunderboltOutlined } from "@ant-design/icons";
import { getEvents } from "../../api/events";
import { useToast } from "../Toast/ToastProvider";
import AppButton from "../UI/Button";
import AppInput, { AppTextArea } from "../UI/Input";
import AppSelect from "../UI/Select";
import AppSwitch from "../UI/Switch";
import { createDefaultAutomationConfig, readAutomationConfig, writeAutomationConfig } from "../../storage/automation";
import type {
  AutomationCommonSettings,
  AutomationConfig,
  AutomationCondition,
  AutomationRobot,
  AutomationRunMode,
  AutomationScope,
  AutomationTiming,
  AutomationTrigger,
} from "../../types/automation";
import type { Event } from "../../types/event";
import "./automation-panel.scss";

const SCOPE_TEXT: Record<AutomationScope, { title: string; subtitle: string; empty: string }> = {
  crm: {
    title: "Роботы в CRM",
    subtitle:
      "Автоматизация заявок: роботы отправляют уведомления и сообщения, а триггеры отслеживают действия проектантов и двигают карточку по стадиям.",
    empty: "Выберите мероприятие, чтобы настроить автоматизацию заявок.",
  },
  tasks: {
    title: "Роботы в задачах",
    subtitle:
      "Автоматизация планировщика: роботы назначают действия по задачам, а триггеры следят за сроками и сменой статусов.",
    empty: "Выберите мероприятие, чтобы настроить автоматизацию задач.",
  },
};

const TEXT = {
  event: "Мероприятие",
  stages: "Стадии",
  robots: "Роботы",
  triggers: "Триггеры",
  save: "Сохранить",
  saved: "Настройки роботов и триггеров сохранены",
  loadError: "Не удалось загрузить мероприятия",
  noEvents: "Мероприятия не найдены",
  noRobots: "На этой стадии пока нет роботов",
  noTriggers: "На этой стадии пока нет триггеров",
  active: "включен",
  inactive: "выключен",
  runMode: "По очереди",
  timing: "Когда",
  delayMinutes: "Задержка, минут",
  condition: "При условии",
  allowBack: "Разрешить переходить на предыдущий статус",
  subject: "Тема",
  message: "Текст сообщения",
  targetStage: "Перемещает на стадию",
} as const;

const RUN_MODE_OPTIONS: Array<{ value: AutomationRunMode; label: string }> = [
  { value: "queue", label: "После предыдущих" },
  { value: "parallel", label: "Независимо" },
];

const TIMING_OPTIONS: Array<{ value: AutomationTiming; label: string }> = [
  { value: "immediate", label: "Сразу" },
  { value: "delayed", label: "Через время" },
];

const CONDITION_OPTIONS: Array<{ value: AutomationCondition; label: string }> = [
  { value: "always", label: "Всегда" },
  { value: "important", label: "Только важные" },
  { value: "overdue", label: "Просроченные" },
  { value: "deadline_soon", label: "Скоро дедлайн" },
  { value: "testing", label: "На тестировании" },
  { value: "has_vk", label: "Есть VK" },
];

type AutomationPanelProps = {
  scope: AutomationScope;
  lockedEventId?: number;
  className?: string;
};

function getEventTitle(event?: Event) {
  return event?.title?.trim() || `Мероприятие #${event?.id ?? ""}`;
}

function clampDelay(value: string) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return Math.round(parsed);
}

export default function AutomationPanel({ scope, lockedEventId, className = "" }: AutomationPanelProps) {
  const { showToast } = useToast();
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<number | null>(lockedEventId ?? null);
  const [selectedStageId, setSelectedStageId] = useState<string>("");
  const [config, setConfig] = useState<AutomationConfig | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    setLoading(true);

    getEvents()
      .then((items) => {
        if (!mounted) return;
        setEvents(items);
        setSelectedEventId((current) => lockedEventId ?? current ?? items[0]?.id ?? null);
      })
      .catch(() => {
        if (mounted) showToast("error", TEXT.loadError);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [lockedEventId, showToast]);

  useEffect(() => {
    if (!lockedEventId) return;
    setSelectedEventId(lockedEventId);
  }, [lockedEventId]);

  useEffect(() => {
    if (!selectedEventId) {
      setConfig(null);
      return;
    }

    const nextConfig = readAutomationConfig(scope, selectedEventId);
    setConfig(nextConfig);
    setSelectedStageId((current) => current || nextConfig.stages[0]?.id || "");
  }, [scope, selectedEventId]);

  useEffect(() => {
    if (!config) return;
    if (config.stages.some((stage) => stage.id === selectedStageId)) return;
    setSelectedStageId(config.stages[0]?.id || "");
  }, [config, selectedStageId]);

  const selectedEvent = useMemo(
    () => events.find((event) => Number(event.id) === Number(selectedEventId)),
    [events, selectedEventId]
  );

  const selectedStage = useMemo(
    () => config?.stages.find((stage) => stage.id === selectedStageId),
    [config?.stages, selectedStageId]
  );

  const stageOptions = useMemo(
    () => config?.stages.map((stage) => ({ value: stage.id, label: stage.title })) ?? [],
    [config?.stages]
  );

  const robots = config?.robots.filter((robot) => robot.stageId === selectedStageId) ?? [];
  const triggers = config?.triggers.filter((trigger) => trigger.stageId === selectedStageId) ?? [];

  const updateRobot = (robotId: string, updater: (robot: AutomationRobot) => AutomationRobot) => {
    setConfig((current) => {
      if (!current) return current;
      return {
        ...current,
        robots: current.robots.map((robot) => (robot.id === robotId ? updater(robot) : robot)),
      };
    });
  };

  const updateTrigger = (triggerId: string, updater: (trigger: AutomationTrigger) => AutomationTrigger) => {
    setConfig((current) => {
      if (!current) return current;
      return {
        ...current,
        triggers: current.triggers.map((trigger) => (trigger.id === triggerId ? updater(trigger) : trigger)),
      };
    });
  };

  const updateSettings = (
    settings: AutomationCommonSettings,
    patch: Partial<AutomationCommonSettings>
  ): AutomationCommonSettings => ({
    ...settings,
    ...patch,
  });

  const handleSave = () => {
    if (!config || !selectedEventId) return;
    const nextConfig = {
      ...config,
      scope,
      eventId: selectedEventId,
      stages: config.stages.length > 0 ? config.stages : createDefaultAutomationConfig(scope, selectedEventId).stages,
    };
    writeAutomationConfig(nextConfig);
    setConfig(nextConfig);
    showToast("success", TEXT.saved);
  };

  const scopeText = SCOPE_TEXT[scope];

  return (
    <section className={`automation-panel automation-panel--${scope} ${className}`.trim()}>
      <div className="automation-panel__head">
        <div className="automation-panel__title">
          <span className="automation-panel__icon">
            <SettingOutlined />
          </span>
          <div>
            <h2>{scopeText.title}</h2>
            <p>{scopeText.subtitle}</p>
          </div>
        </div>

        <div className="automation-panel__actions">
          <label className="automation-panel__event">
            <span>{TEXT.event}</span>
            {lockedEventId ? (
              <strong>{getEventTitle(selectedEvent)}</strong>
            ) : (
              <AppSelect
                value={selectedEventId ?? undefined}
                placeholder={TEXT.event}
                disabled={loading || events.length === 0}
                onChange={(value) => setSelectedEventId(Number(value))}
                options={events.map((event) => ({ value: event.id, label: getEventTitle(event) }))}
                showSearch
                optionFilterProp="label"
              />
            )}
          </label>

          <AppButton className="automation-panel__save" onClick={handleSave} disabled={!config}>
            <SaveOutlined />
            <span>{TEXT.save}</span>
          </AppButton>
        </div>
      </div>

      {loading ? (
        <div className="automation-panel__empty">
          <Spin />
        </div>
      ) : !config || !selectedEventId ? (
        <div className="automation-panel__empty">
          <Empty description={events.length === 0 ? TEXT.noEvents : scopeText.empty} />
        </div>
      ) : (
        <>
          <div className="automation-panel__stages">
            <span>{TEXT.stages}</span>
            <Segmented
              value={selectedStageId}
              onChange={(value) => setSelectedStageId(String(value))}
              options={stageOptions}
              block
            />
          </div>

          {selectedStage && (
            <div className="automation-panel__stage-note">
              <strong>{selectedStage.title}</strong>
              <span>{selectedStage.description}</span>
            </div>
          )}

          <div className="automation-panel__grid">
            <div className="automation-panel__column">
              <div className="automation-panel__column-title">
                <RobotOutlined />
                <span>{TEXT.robots}</span>
              </div>

              {robots.map((robot) => (
                <article key={robot.id} className={`automation-rule ${robot.enabled ? "is-active" : ""}`}>
                  <RuleTop
                    title={robot.title}
                    description={robot.description}
                    enabled={robot.enabled}
                    onChange={(enabled) => updateRobot(robot.id, (item) => ({ ...item, enabled }))}
                  />

                  <SettingsEditor
                    settings={robot.settings}
                    onChange={(settings) => updateRobot(robot.id, (item) => ({ ...item, settings }))}
                  />

                  <div className="automation-rule__specific">
                    <label>
                      <span>{TEXT.subject}</span>
                      <AppInput
                        value={robot.subject}
                        onChange={(event) =>
                          updateRobot(robot.id, (item) => ({ ...item, subject: event.target.value }))
                        }
                      />
                    </label>
                    <label>
                      <span>{TEXT.message}</span>
                      <AppTextArea
                        value={robot.message}
                        autoSize={{ minRows: 2, maxRows: 4 }}
                        onChange={(event) =>
                          updateRobot(robot.id, (item) => ({ ...item, message: event.target.value }))
                        }
                      />
                    </label>
                  </div>
                </article>
              ))}
              {robots.length === 0 && <div className="automation-panel__mini-empty">{TEXT.noRobots}</div>}
            </div>

            <div className="automation-panel__column">
              <div className="automation-panel__column-title">
                <ThunderboltOutlined />
                <span>{TEXT.triggers}</span>
              </div>

              {triggers.map((trigger) => (
                <article key={trigger.id} className={`automation-rule ${trigger.enabled ? "is-active" : ""}`}>
                  <RuleTop
                    title={trigger.title}
                    description={trigger.description}
                    enabled={trigger.enabled}
                    onChange={(enabled) => updateTrigger(trigger.id, (item) => ({ ...item, enabled }))}
                  />

                  <SettingsEditor
                    settings={trigger.settings}
                    onChange={(settings) => updateTrigger(trigger.id, (item) => ({ ...item, settings }))}
                  />

                  <div className="automation-rule__specific">
                    <div className="automation-rule__target">
                      <span>{TEXT.targetStage}</span>
                      <strong>
                        {config.stages.find((stage) => stage.id === trigger.targetStageId)?.title ?? selectedStage?.title}
                      </strong>
                    </div>
                    <label className="automation-rule__toggle-row">
                      <span>{TEXT.allowBack}</span>
                      <AppSwitch
                        checked={trigger.allowBackTransition}
                        onChange={(allowBackTransition) =>
                          updateTrigger(trigger.id, (item) => ({ ...item, allowBackTransition }))
                        }
                      />
                    </label>
                  </div>
                </article>
              ))}
              {triggers.length === 0 && <div className="automation-panel__mini-empty">{TEXT.noTriggers}</div>}
            </div>
          </div>
        </>
      )}
    </section>
  );

  function SettingsEditor({
    settings,
    onChange,
  }: {
    settings: AutomationCommonSettings;
    onChange: (settings: AutomationCommonSettings) => void;
  }) {
    return (
      <div className="automation-settings">
        <label>
          <span>{TEXT.runMode}</span>
          <AppSelect
            value={settings.runMode}
            onChange={(value) => onChange(updateSettings(settings, { runMode: value as AutomationRunMode }))}
            options={RUN_MODE_OPTIONS}
          />
        </label>

        <label>
          <span>{TEXT.timing}</span>
          <AppSelect
            value={settings.timing}
            onChange={(value) => onChange(updateSettings(settings, { timing: value as AutomationTiming }))}
            options={TIMING_OPTIONS}
          />
        </label>

        {settings.timing === "delayed" && (
          <label>
            <span>{TEXT.delayMinutes}</span>
            <AppInput
              type="number"
              min={0}
              value={String(settings.delayMinutes)}
              onChange={(event) => onChange(updateSettings(settings, { delayMinutes: clampDelay(event.target.value) }))}
            />
          </label>
        )}

        <label>
          <span>{TEXT.condition}</span>
          <AppSelect
            value={settings.condition}
            onChange={(value) => onChange(updateSettings(settings, { condition: value as AutomationCondition }))}
            options={CONDITION_OPTIONS}
          />
        </label>
      </div>
    );
  }
}

function RuleTop({
  title,
  description,
  enabled,
  onChange,
}: {
  title: string;
  description: string;
  enabled: boolean;
  onChange: (enabled: boolean) => void;
}) {
  return (
    <div className="automation-rule__top">
      <div>
        <h3>{title}</h3>
        <p>{description}</p>
        <Tag color={enabled ? "blue" : "default"}>{enabled ? TEXT.active : TEXT.inactive}</Tag>
      </div>
      <AppSwitch checked={enabled} onChange={onChange} />
    </div>
  );
}
