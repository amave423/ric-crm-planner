import type {
  AutomationCommonSettings,
  AutomationConfig,
  AutomationRobot,
  AutomationScope,
  AutomationStage,
  AutomationTrigger,
} from "../types/automation";

const STORAGE_KEY = "ric_crm_automation_configs_v2";

type AutomationConfigs = Record<string, AutomationConfig>;

const DEFAULT_SETTINGS: AutomationCommonSettings = {
  runMode: "queue",
  timing: "immediate",
  delayMinutes: 0,
  condition: "always",
};

const STAGE_TEMPLATES: Record<AutomationScope, AutomationStage[]> = {
  crm: [
    {
      id: "application-new",
      title: "Новая заявка",
      description: "Проектант подал заявку, организатор еще не обработал карточку.",
    },
    {
      id: "org-chat-link",
      title: "Ссылка на орг.чат",
      description: "Проектанту отправлена ссылка на организационный чат.",
    },
    {
      id: "joined-org-chat",
      title: "Добавился в орг.чат",
      description: "Проектант перешел по ссылке и подтвердил участие в чате.",
    },
    {
      id: "testing",
      title: "Тестирование",
      description: "Заявка ожидает прохождения или проверки тестирования.",
    },
    {
      id: "in-work",
      title: "В работе",
      description: "Проектант принят и передан в дальнейшую работу.",
    },
  ],
  tasks: [
    {
      id: "backlog",
      title: "Бэклог",
      description: "Задача создана и ожидает распределения.",
    },
    {
      id: "in-progress",
      title: "В работе",
      description: "Задача находится у исполнителя или команды.",
    },
    {
      id: "urgent",
      title: "Срочно",
      description: "Задача требует внимания из-за срока или блокера.",
    },
    {
      id: "done",
      title: "Готово",
      description: "Задача завершена и может быть проверена.",
    },
  ],
};

const ROBOT_TEMPLATES: Record<AutomationScope, Array<Omit<AutomationRobot, "enabled" | "settings">>> = {
  crm: [
    {
      id: "crm-notify-organizer",
      stageId: "application-new",
      title: "Уведомить организатора",
      description: "Создает уведомление о новой заявке и прикладывает ссылку на карточку.",
      action: "notification.organizer",
      subject: "Новая заявка",
      message: "Проектант отправил заявку. Проверьте карточку и выберите следующий статус.",
    },
    {
      id: "crm-send-chat-link",
      stageId: "org-chat-link",
      title: "Отправить ссылку на орг.чат",
      description: "Отправляет проектанту уведомление или сообщение ВК со ссылкой на организационный чат.",
      action: "message.vk_or_notification",
      subject: "Ссылка на организационный чат",
      message: "Перейдите по ссылке и присоединитесь к организационному чату мероприятия.",
    },
    {
      id: "crm-send-testing",
      stageId: "testing",
      title: "Отправить тестирование",
      description: "Отправляет проектанту ссылку на модуль тестирования.",
      action: "testing.link",
      subject: "Тестирование по заявке",
      message: "Ваша заявка перешла на этап тестирования. Откройте ссылку и выполните задание.",
    },
  ],
  tasks: [
    {
      id: "task-notify-assignee",
      stageId: "in-progress",
      title: "Уведомить исполнителя",
      description: "Отправляет проектанту уведомление, когда задача перешла в работу.",
      action: "notification.assignee",
      subject: "Задача в работе",
      message: "Вам назначена задача. Проверьте описание и сроки выполнения.",
    },
    {
      id: "task-notify-curator",
      stageId: "urgent",
      title: "Уведомить куратора",
      description: "Сообщает куратору, что задача приближается к дедлайну или просрочена.",
      action: "notification.curator",
      subject: "Задача требует внимания",
      message: "До крайнего срока остался один день, а задача еще не завершена.",
    },
    {
      id: "task-create-review",
      stageId: "done",
      title: "Создать задачу на проверку",
      description: "Создает follow-up задачу для проверки результата.",
      action: "task.review",
      subject: "Проверить результат",
      message: "Задача завершена. Проверьте результат и оставьте обратную связь.",
    },
  ],
};

const TRIGGER_TEMPLATES: Record<AutomationScope, Array<Omit<AutomationTrigger, "enabled" | "settings" | "allowBackTransition">>> = {
  crm: [
    {
      id: "crm-application-created",
      stageId: "application-new",
      title: "Проектант подал заявку",
      description: "Отслеживает отправку заявки и перемещает карточку в стадию новой заявки.",
      eventCode: "application.created",
      targetStageId: "application-new",
    },
    {
      id: "crm-chat-link-opened",
      stageId: "joined-org-chat",
      title: "Переход по ссылке из уведомления",
      description: "Когда проектант открыл ссылку на орг.чат, карточка переходит на стадию подтверждения.",
      eventCode: "notification.link_opened",
      targetStageId: "joined-org-chat",
    },
    {
      id: "crm-request-testing",
      stageId: "testing",
      title: "Статус заявки изменен",
      description: "Отслеживает ручной перевод заявки на тестирование.",
      eventCode: "request.status_changed",
      targetStageId: "testing",
    },
  ],
  tasks: [
    {
      id: "task-deadline-soon",
      stageId: "urgent",
      title: "До дедлайна остался один день",
      description: "Отслеживает приближение крайнего срока и переводит задачу в срочную стадию.",
      eventCode: "task.deadline_soon",
      targetStageId: "urgent",
    },
    {
      id: "task-status-done",
      stageId: "done",
      title: "Статус изменен на готово",
      description: "Когда исполнитель завершил задачу, триггер переносит ее в стадию готовности.",
      eventCode: "task.status_done",
      targetStageId: "done",
    },
    {
      id: "task-status-started",
      stageId: "in-progress",
      title: "Задача взята в работу",
      description: "Отслеживает начало работы и переводит задачу в активную стадию.",
      eventCode: "task.status_started",
      targetStageId: "in-progress",
    },
  ],
};

function nowIso() {
  return new Date().toISOString();
}

function configKey(scope: AutomationScope, eventId: number) {
  return `${scope}:${eventId}`;
}

export function createDefaultAutomationConfig(scope: AutomationScope, eventId: number): AutomationConfig {
  return {
    scope,
    eventId,
    updatedAt: nowIso(),
    stages: STAGE_TEMPLATES[scope],
    triggers: TRIGGER_TEMPLATES[scope].map((trigger, index) => ({
      ...trigger,
      settings: { ...DEFAULT_SETTINGS },
      enabled: index === 0,
      allowBackTransition: false,
    })),
    robots: ROBOT_TEMPLATES[scope].map((robot, index) => ({
      ...robot,
      settings: { ...DEFAULT_SETTINGS },
      enabled: index === 0,
    })),
  };
}

function mergeConfigWithDefaults(config: AutomationConfig): AutomationConfig {
  const defaults = createDefaultAutomationConfig(config.scope, config.eventId);
  const savedTriggers = new Map((config.triggers || []).map((trigger) => [trigger.id, trigger]));
  const savedRobots = new Map((config.robots || []).map((robot) => [robot.id, robot]));

  return {
    ...defaults,
    ...config,
    stages: defaults.stages,
    triggers: defaults.triggers.map((trigger) => ({
      ...trigger,
      ...savedTriggers.get(trigger.id),
      settings: {
        ...trigger.settings,
        ...savedTriggers.get(trigger.id)?.settings,
      },
    })),
    robots: defaults.robots.map((robot) => ({
      ...robot,
      ...savedRobots.get(robot.id),
      settings: {
        ...robot.settings,
        ...savedRobots.get(robot.id)?.settings,
      },
    })),
  };
}

export function readAutomationConfigs(): AutomationConfigs {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};

    const parsed = JSON.parse(raw) as AutomationConfigs;
    return Object.fromEntries(
      Object.entries(parsed)
        .filter(([, config]) => config?.scope && Number.isFinite(config?.eventId))
        .map(([key, config]) => [key, mergeConfigWithDefaults(config)])
    );
  } catch {
    return {};
  }
}

export function readAutomationConfig(scope: AutomationScope, eventId: number): AutomationConfig {
  const configs = readAutomationConfigs();
  return configs[configKey(scope, eventId)] ?? createDefaultAutomationConfig(scope, eventId);
}

export function writeAutomationConfig(config: AutomationConfig) {
  const configs = readAutomationConfigs();
  configs[configKey(config.scope, config.eventId)] = {
    ...config,
    updatedAt: nowIso(),
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(configs));
}
