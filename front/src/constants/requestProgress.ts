export const REQUEST_STATUS = {
  SUBMITTED: "Прислал заявку",
  TESTING: "Прохождение тестирования",
  JOINED_CHAT: "Добавился в орг чат",
  STARTED: "Приступил к ПШ",
} as const;

export const ORGANIZER_REQUEST_STATUSES = [
  REQUEST_STATUS.SUBMITTED,
  REQUEST_STATUS.TESTING,
  REQUEST_STATUS.JOINED_CHAT,
  REQUEST_STATUS.STARTED,
];

export type RequestTransitionSource = "testing" | "start";

export function buildMockRequestTransitionUrl(
  requestId: number,
  targetStatus: string,
  source: RequestTransitionSource
) {
  const url = new URL("/requests", window.location.origin);
  url.searchParams.set("requestAction", "progress");
  url.searchParams.set("requestId", String(requestId));
  url.searchParams.set("targetStatus", targetStatus);
  url.searchParams.set("source", source);
  return url.toString();
}

export function getRequestTransitionCopy(source: RequestTransitionSource, targetStatus: string) {
  if (source === "testing") {
    return {
      title: "Подтверждение перехода",
      message: `Подтвердить завершение тестирования и перевод заявки в статус "${targetStatus}"?`,
    };
  }

  return {
    title: "Подтверждение перехода",
    message: `Подтвердить перевод заявки в статус "${targetStatus}"?`,
  };
}

