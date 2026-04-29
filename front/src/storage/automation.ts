import type {
  AutomationCommonSettings,
  AutomationConfig,
  AutomationRobot,
  AutomationScope,
  AutomationStage,
  AutomationTrigger,
} from "../types/automation";

const STORAGE_KEY = "ric_crm_automation_configs_v3";

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
      id: "crm-new-contact",
      title: "Новый контакт",
      description: "Пользователь появился в CRM, но еще не прошел первичную обработку.",
    },
    {
      id: "crm-contacted",
      title: "Первичный контакт",
      description: "Организатор связался с пользователем или отправил первое сообщение.",
    },
    {
      id: "crm-warmed",
      title: "Готов к участию",
      description: "Пользователь заинтересован и может быть переведен к заявке или задаче.",
    },
  ],
  planner: [
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
  requests: [
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
      id: "accepted",
      title: "Принят",
      description: "Проектант принят и передан в дальнейшую работу.",
    },
  ],
};

const ROBOT_TEMPLATES: Record<AutomationScope, Array<Omit<AutomationRobot, "enabled" | "settings">>> = {
  crm: [
    {
      id: "crm-notify-organizer",
      stageId: "crm-new-contact",
      title: "Уведомить организатора",
      description: "Создает уведомление о новом контакте в CRM.",
      action: "notification.organizer",
      subject: "Новый контакт в CRM",
      message: "В CRM появился новый пользователь. Проверьте карточку и выберите дальнейшее действие.",
    },
    {
      id: "crm-send-welcome",
      stageId: "crm-contacted",
      title: "Отправить приветственное сообщение",
      description: "Отправляет пользователю сообщение с базовой информацией о мероприятии.",
      action: "message.welcome",
      subject: "Информация о мероприятии",
      message: "Здравствуйте! Отправляем информацию о мероприятии и дальнейших шагах участия.",
    },
    {
      id: "crm-create-follow-up",
      stageId: "crm-warmed",
      title: "Создать задачу организатору",
      description: "Создает задачу на дальнейшую обработку заинтересованного пользователя.",
      action: "task.organizer_follow_up",
      subject: "Связаться с участником",
      message: "Пользователь готов к участию. Нужно уточнить детали и предложить следующий шаг.",
    },
  ],
  planner: [
    {
      id: "planner-notify-assignee",
      stageId: "in-progress",
      title: "Уведомить исполнителя",
      description: "Отправляет проектанту уведомление, когда задача перешла в работу.",
      action: "notification.assignee",
      subject: "Задача в работе",
      message: "Вам назначена задача. Проверьте описание и сроки выполнения.",
    },
    {
      id: "planner-notify-curator",
      stageId: "urgent",
      title: "Уведомить куратора",
      description: "Сообщает куратору, что задача приближается к дедлайну или просрочена.",
      action: "notification.curator",
      subject: "Задача требует внимания",
      message: "До крайнего срока остался один день, а задача еще не завершена.",
    },
    {
      id: "planner-create-review",
      stageId: "done",
      title: "Создать задачу на проверку",
      description: "Создает follow-up задачу для проверки результата.",
      action: "task.review",
      subject: "Проверить результат",
      message: "Задача завершена. Проверьте результат и оставьте обратную связь.",
    },
  ],
  requests: [
    {
      id: "request-notify-organizer",
      stageId: "application-new",
      title: "Уведомить организатора",
      description: "Создает уведомление о новой заявке и прикладывает ссылку на карточку.",
      action: "notification.organizer",
      subject: "Новая заявка",
      message: "Проектант отправил заявку. Проверьте карточку и выберите следующий статус.",
    },
    {
      id: "request-send-chat-link",
      stageId: "org-chat-link",
      title: "Отправить ссылку на орг.чат",
      description: "Отправляет проектанту уведомление или сообщение ВК со ссылкой на организационный чат.",
      action: "message.vk_or_notification",
      subject: "Ссылка на организационный чат",
      message: "Перейдите по ссылке и присоединитесь к организационному чату мероприятия.",
    },
    {
      id: "request-send-testing",
      stageId: "testing",
      title: "Отправить тестирование",
      description: "Отправляет проектанту ссылку на модуль тестирования.",
      action: "testing.link",
      subject: "Тестирование по заявке",
      message: "Ваша заявка перешла на этап тестирования. Откройте ссылку и выполните задание.",
    },
  ],
};

const TRIGGER_TEMPLATES: Record<
  AutomationScope,
  Array<Omit<AutomationTrigger, "enabled" | "settings" | "allowBackTransition">>
> = {
  crm: [
    {
      id: "crm-contact-created",
      stageId: "crm-new-contact",
      title: "Пользователь создан",
      description: "Отслеживает появление нового пользователя в CRM.",
      eventCode: "crm.contact_created",
      targetStageId: "crm-new-contact",
    },
    {
      id: "crm-message-opened",
      stageId: "crm-contacted",
      title: "Сообщение прочитано",
      description: "Когда пользователь просмотрел сообщение, карточка переходит на стадию первичного контакта.",
      eventCode: "crm.message_opened",
      targetStageId: "crm-contacted",
    },
    {
      id: "crm-interest-confirmed",
      stageId: "crm-warmed",
      title: "Интерес подтвержден",
      description: "Отслеживает подтверждение интереса и переводит карточку к дальнейшей работе.",
      eventCode: "crm.interest_confirmed",
      targetStageId: "crm-warmed",
    },
  ],
  planner: [
    {
      id: "planner-deadline-soon",
      stageId: "urgent",
      title: "До дедлайна остался один день",
      description: "Отслеживает приближение крайнего срока и переводит задачу в срочную стадию.",
      eventCode: "task.deadline_soon",
      targetStageId: "urgent",
    },
    {
      id: "planner-status-done",
      stageId: "done",
      title: "Статус изменен на готово",
      description: "Когда исполнитель завершил задачу, триггер переносит ее в стадию готовности.",
      eventCode: "task.status_done",
      targetStageId: "done",
    },
    {
      id: "planner-status-started",
      stageId: "in-progress",
      title: "Задача взята в работу",
      description: "Отслеживает начало работы и переводит задачу в активную стадию.",
      eventCode: "task.status_started",
      targetStageId: "in-progress",
    },
  ],
  requests: [
    {
      id: "request-application-created",
      stageId: "application-new",
      title: "Проектант подал заявку",
      description: "Отслеживает отправку заявки и перемещает карточку в стадию новой заявки.",
      eventCode: "application.created",
      targetStageId: "application-new",
    },
    {
      id: "request-chat-link-opened",
      stageId: "joined-org-chat",
      title: "Переход по ссылке из уведомления",
      description: "Когда проектант открыл ссылку на орг.чат, карточка переходит на стадию подтверждения.",
      eventCode: "notification.link_opened",
      targetStageId: "joined-org-chat",
    },
    {
      id: "request-status-testing",
      stageId: "testing",
      title: "Статус заявки изменен",
      description: "Отслеживает ручной перевод заявки на тестирование.",
      eventCode: "request.status_changed",
      targetStageId: "testing",
    },
  ],
};

function nowIso() {
  return new Date().toISOString();
}

function configKey(scope: AutomationScope, eventId: number) {
  return `${scope}:${eventId}`;
}

function normalizeScope(value: unknown): AutomationScope | null {
  if (value === "crm" || value === "planner" || value === "requests") return value;
  if (value === "tasks") return "planner";
  return null;
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
  const normalizedScope = normalizeScope(config.scope) ?? "crm";
  const normalizedConfig = { ...config, scope: normalizedScope };
  const defaults = createDefaultAutomationConfig(normalizedScope, normalizedConfig.eventId);
  const savedTriggers = new Map((normalizedConfig.triggers || []).map((trigger) => [trigger.id, trigger]));
  const savedRobots = new Map((normalizedConfig.robots || []).map((robot) => [robot.id, robot]));

  return {
    ...defaults,
    ...normalizedConfig,
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
        .map(([, config]) => {
          const scope = normalizeScope(config?.scope);
          if (!scope || !Number.isFinite(config?.eventId)) return null;
          const merged = mergeConfigWithDefaults({ ...config, scope });
          return [configKey(merged.scope, merged.eventId), merged] as const;
        })
        .filter((entry): entry is readonly [string, AutomationConfig] => Boolean(entry))
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
