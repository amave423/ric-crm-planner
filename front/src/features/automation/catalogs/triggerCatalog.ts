import type { AutomationScope, CatalogGroup } from "../types";

export const TRIGGER_CATALOG: Record<AutomationScope, CatalogGroup[]> = {
  crm: [
    {
      title: "Действия проектанта",
      items: [
        {
          code: "application.created",
          title: "Проектант подал заявку",
          description: "Срабатывает после отправки заявки на мероприятие.",
        },
        {
          code: "notification.link_opened",
          title: "Переход по ссылке",
          description: "Срабатывает после перехода по ссылке из уведомления.",
        },
        {
          code: "testing.started",
          title: "Тестирование начато",
          description: "Срабатывает, когда проектант открыл или начал тестирование.",
        },
        {
          code: "testing.completed",
          title: "Тестирование завершено",
          description: "Срабатывает, когда проектант завершил тестирование.",
        },
      ],
    },
    {
      title: "Изменения карточки",
      items: [
        {
          code: "request.status_changed",
          title: "Статус изменен",
          description: "Срабатывает при ручном изменении статуса заявки.",
        },
        {
          code: "field.changed",
          title: "Поле изменено",
          description: "Срабатывает после изменения выбранного поля карточки.",
        },
      ],
    },
  ],
  planner: [
    {
      title: "Задачи",
      items: [
        {
          code: "task.deadline_soon",
          title: "Скоро дедлайн",
          description: "Срабатывает за выбранное время до крайнего срока.",
        },
        {
          code: "task.status_changed",
          title: "Статус задачи изменен",
          description: "Срабатывает при смене статуса задачи.",
        },
        {
          code: "task.status_done",
          title: "Задача завершена",
          description: "Срабатывает, когда задача переходит в готовность.",
        },
        {
          code: "task.status_started",
          title: "Задача взята в работу",
          description: "Срабатывает, когда исполнитель начал выполнение задачи.",
        },
      ],
    },
  ],
  requests: [
    {
      title: "Заявки",
      items: [
        {
          code: "application.created",
          title: "Проектант подал заявку",
          description: "Срабатывает после отправки заявки.",
        },
        {
          code: "testing.started",
          title: "Тестирование начато",
          description: "Срабатывает после начала тестирования проектантом.",
        },
        {
          code: "notification.chat_link_opened",
          title: "Переход по ссылке на орг.чат",
          description: "Срабатывает после перехода по индивидуальной ссылке.",
        },
      ],
    },
  ],
};
