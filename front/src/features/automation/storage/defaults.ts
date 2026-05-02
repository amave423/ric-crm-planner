import { REQUEST_STATUS } from "../../../constants/requestProgress";
import type {
  AutomationCommonSettings,
  AutomationRobot,
  AutomationScope,
  AutomationStage,
  AutomationTrigger,
} from "../types";

export const DEFAULT_SETTINGS: AutomationCommonSettings = {
  runMode: "queue",
  timing: "immediate",
  delayMinutes: 0,
  condition: {
    mode: "all",
    rules: [],
  },
};

const APPLICATION_STAGES: AutomationStage[] = [
  {
    id: "application-submitted",
    title: REQUEST_STATUS.SUBMITTED,
    description: "Проектант отправил заявку на мероприятие.",
  },
  {
    id: "application-testing",
    title: REQUEST_STATUS.TESTING,
    description: "Проектанту отправлено тестирование или заявка ожидает проверки.",
  },
  {
    id: "application-joined-chat",
    title: REQUEST_STATUS.JOINED_CHAT,
    description: "Проектант перешел в организационный чат мероприятия.",
  },
  {
    id: "application-started",
    title: REQUEST_STATUS.STARTED,
    description: "Проектант приступил к проектной школе.",
  },
];

export const STAGE_TEMPLATES: Record<AutomationScope, AutomationStage[]> = {
  crm: APPLICATION_STAGES,
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
  requests: APPLICATION_STAGES,
};

export const ROBOT_TEMPLATES: Record<AutomationScope, Array<Omit<AutomationRobot, "enabled" | "settings">>> = {
  crm: [
    {
      id: "crm-notify-organizer",
      stageId: "application-submitted",
      title: "Уведомить организатора",
      description: "Создает уведомление ответственным организаторам о новой заявке.",
      action: "notification.organizer",
      subject: "Новая заявка в CRM",
      message: "Проектант отправил заявку. Проверьте карточку и выберите следующий статус.",
    },
    {
      id: "crm-send-testing",
      stageId: "application-testing",
      title: "Отправить тестирование",
      description: "Отправляет проектанту ссылку на модуль тестирования.",
      action: "testing.link",
      subject: "Тестирование по заявке",
      message: "Ваша заявка перешла на этап тестирования. Откройте ссылку и выполните задание.",
    },
    {
      id: "crm-send-chat-link",
      stageId: "application-joined-chat",
      title: "Отправить ссылку на орг.чат",
      description: "Отправляет проектанту уведомление или сообщение VK со ссылкой на организационный чат.",
      action: "message.vk_or_notification",
      subject: "Ссылка на организационный чат",
      message: "Перейдите по ссылке и присоединитесь к организационному чату мероприятия.",
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
      stageId: "application-submitted",
      title: "Уведомить организатора",
      description: "Создает уведомление о новой заявке и прикладывает ссылку на карточку.",
      action: "notification.organizer",
      subject: "Новая заявка",
      message: "Проектант отправил заявку. Проверьте карточку и выберите следующий статус.",
    },
    {
      id: "request-send-testing",
      stageId: "application-testing",
      title: "Отправить тестирование",
      description: "Отправляет проектанту ссылку на модуль тестирования.",
      action: "testing.link",
      subject: "Тестирование по заявке",
      message: "Ваша заявка перешла на этап тестирования. Откройте ссылку и выполните задание.",
    },
    {
      id: "request-send-chat-link",
      stageId: "application-joined-chat",
      title: "Отправить ссылку на орг.чат",
      description: "Отправляет проектанту ссылку на организационный чат.",
      action: "message.vk_or_notification",
      subject: "Ссылка на организационный чат",
      message: "Перейдите по ссылке и присоединитесь к организационному чату мероприятия.",
    },
  ],
};

export const TRIGGER_TEMPLATES: Record<
  AutomationScope,
  Array<Omit<AutomationTrigger, "enabled" | "settings" | "allowBackTransition">>
> = {
  crm: [
    {
      id: "crm-application-created",
      stageId: "application-submitted",
      title: "Проектант подал заявку",
      description: "Отслеживает отправку заявки и перемещает карточку в статус новой заявки.",
      eventCode: "application.created",
      targetStageId: "application-submitted",
    },
    {
      id: "crm-testing-started",
      stageId: "application-testing",
      title: "Тестирование начато",
      description: "Срабатывает, когда проектант открывает или начинает тестирование.",
      eventCode: "testing.started",
      targetStageId: "application-testing",
    },
    {
      id: "crm-chat-link-opened",
      stageId: "application-joined-chat",
      title: "Переход по ссылке на орг.чат",
      description: "Срабатывает, когда проектант переходит по индивидуальной ссылке на орг.чат.",
      eventCode: "notification.chat_link_opened",
      targetStageId: "application-joined-chat",
    },
  ],
  planner: [
    {
      id: "planner-deadline-soon",
      stageId: "urgent",
      title: "До дедлайна остался один день",
      description: "Отслеживает приближение крайнего срока и переносит задачу в срочную стадию.",
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
      stageId: "application-submitted",
      title: "Проектант подал заявку",
      description: "Отслеживает отправку заявки и перемещает карточку в стадию новой заявки.",
      eventCode: "application.created",
      targetStageId: "application-submitted",
    },
    {
      id: "request-testing-started",
      stageId: "application-testing",
      title: "Тестирование начато",
      description: "Отслеживает начало тестирования проектантом.",
      eventCode: "testing.started",
      targetStageId: "application-testing",
    },
    {
      id: "request-chat-link-opened",
      stageId: "application-joined-chat",
      title: "Переход по ссылке на орг.чат",
      description: "Когда проектант открыл ссылку на орг.чат, карточка переходит на стадию подтверждения.",
      eventCode: "notification.chat_link_opened",
      targetStageId: "application-joined-chat",
    },
  ],
};
