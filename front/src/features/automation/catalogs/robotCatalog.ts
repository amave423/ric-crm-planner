import type { AutomationScope, CatalogGroup } from "../types";

export const ROBOT_CATALOG: Record<AutomationScope, CatalogGroup[]> = {
  crm: [
    {
      title: "Коммуникации",
      items: [
        {
          code: "message.vk",
          title: "Отправить сообщение VK",
          description: "Отправляет проектанту сообщение от имени организатора.",
          subject: "Сообщение по мероприятию",
          message: "Здравствуйте! Отправляем информацию по следующему шагу.",
        },
        {
          code: "notification.user",
          title: "Отправить уведомление",
          description: "Показывает уведомление проектанту в системе.",
          subject: "Уведомление",
          message: "Проверьте обновления по мероприятию.",
        },
      ],
    },
    {
      title: "Организатор",
      items: [
        {
          code: "notification.organizer",
          title: "Уведомить организатора",
          description: "Создает уведомление ответственным организаторам.",
          subject: "Новая активность в CRM",
          message: "Проверьте карточку и выберите следующий шаг.",
        },
        {
          code: "task.organizer",
          title: "Поставить задачу",
          description: "Создает задачу организатору по текущей карточке.",
          subject: "Обработать карточку",
          message: "Нужно проверить данные участника и принять решение.",
        },
      ],
    },
    {
      title: "Интеграции",
      items: [
        {
          code: "testing.link",
          title: "Отправить тестирование",
          description: "Отправляет ссылку на модуль тестирования.",
          subject: "Тестирование",
          message: "Перейдите по ссылке и выполните тестовое задание.",
        },
      ],
    },
  ],
  planner: [
    {
      title: "Задачи",
      items: [
        {
          code: "task.create",
          title: "Создать задачу",
          description: "Создает новую задачу для участника или организатора.",
          subject: "Новая задача",
          message: "Проверьте задачу и сроки выполнения.",
        },
        {
          code: "notification.deadline",
          title: "Напомнить о сроке",
          description: "Отправляет напоминание исполнителю по задаче.",
          subject: "Скоро дедлайн",
          message: "Проверьте состояние задачи.",
        },
      ],
    },
  ],
  requests: [
    {
      title: "Заявки",
      items: [
        {
          code: "notification.organizer",
          title: "Уведомить организатора",
          description: "Создает уведомление о заявке.",
          subject: "Новая заявка",
          message: "Проверьте заявку проектанта.",
        },
        {
          code: "testing.link",
          title: "Отправить тестирование",
          description: "Отправляет ссылку на тестирование.",
          subject: "Тестирование по заявке",
          message: "Откройте ссылку и выполните тестовое задание.",
        },
      ],
    },
  ],
};
