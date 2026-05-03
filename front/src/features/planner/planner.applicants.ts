import type { Request } from "../../types/request";
import type { ApplicantsTreeNode, ProjectApplicantsGroup } from "./planner.types";
import type { PlannerCatalogEvent } from "./planner.catalog";
import { hasStartedWork } from "./api/planner";

type ApplicantAccumulator = {
  ownerId: number;
  name: string;
  status?: string;
  specialization?: string;
  requestIds: number[];
  latestRequestId: number;
};

type BuildProjectApplicantGroupsParams = {
  crmCatalog: PlannerCatalogEvent[];
  requests: Request[];
  closedEventIds: number[];
  userNameById: Map<number, string>;
  eventTitleById: Record<number, string>;
  directionTitleById: Record<number, string>;
  projectTitleById: Record<number, string>;
};

function upsertApplicant(
  applicantsByOwner: Map<number, ApplicantAccumulator>,
  ownerId: number,
  displayName: string,
  request: Request
) {
  const current = applicantsByOwner.get(ownerId);
  if (!current) {
    applicantsByOwner.set(ownerId, {
      ownerId,
      name: displayName,
      status: request.status,
      specialization: request.specialization,
      requestIds: [request.id],
      latestRequestId: Number(request.id) || 0,
    });
    return;
  }

  current.requestIds.push(request.id);
  if ((Number(request.id) || 0) >= current.latestRequestId) {
    current.latestRequestId = Number(request.id) || current.latestRequestId;
    current.status = request.status;
    current.specialization = request.specialization || current.specialization;
    if (displayName) current.name = displayName;
  }
}

export function buildProjectApplicantGroups({
  crmCatalog,
  requests,
  closedEventIds,
  userNameById,
  eventTitleById,
  directionTitleById,
  projectTitleById,
}: BuildProjectApplicantGroupsParams): ProjectApplicantsGroup[] {
  const applicantsByEvent = new Map<number, Map<number, ApplicantAccumulator>>();
  const fallbackGroups = new Map<
    string,
    {
      key: string;
      eventId?: number;
      directionId?: number;
      projectId?: number;
      eventTitle: string;
      directionTitle: string;
      projectTitle: string;
      applicantsByOwner: Map<number, ApplicantAccumulator>;
    }
  >();
  const catalogEventIds = new Set(crmCatalog.map((event) => Number(event.id)));

  requests.forEach((request) => {
    const ownerId = Number(request.ownerId);
    const eventId = Number(request.eventId);
    if (!Number.isFinite(ownerId) || !Number.isFinite(eventId)) return;
    const isClosedEvent = closedEventIds.includes(eventId);
    if (isClosedEvent && !hasStartedWork(request.status)) return;

    if (!applicantsByEvent.has(eventId)) applicantsByEvent.set(eventId, new Map());
    const eventApplicants = applicantsByEvent.get(eventId);
    if (!eventApplicants) return;

    const displayName = (userNameById.get(ownerId) || request.studentName || `Участник #${ownerId}`).trim();
    upsertApplicant(eventApplicants, ownerId, displayName, request);

    if (catalogEventIds.has(eventId)) return;

    const directionIdRaw = Number(request.directionId);
    const projectIdRaw = Number(request.projectId);
    const directionId = Number.isFinite(directionIdRaw) ? directionIdRaw : undefined;
    const projectId = Number.isFinite(projectIdRaw) ? projectIdRaw : undefined;
    const key = `${eventId}:${directionId ?? "none"}:${projectId ?? "none"}`;

    if (!fallbackGroups.has(key)) {
      fallbackGroups.set(key, {
        key,
        eventId,
        directionId,
        projectId,
        eventTitle: request.eventTitle?.trim() || eventTitleById[eventId] || `Мероприятие #${eventId}`,
        directionTitle:
          (directionId ? directionTitleById[directionId] : "") ||
          (directionId ? `Направление #${directionId}` : "Без направления"),
        projectTitle:
          request.projectTitle?.trim() ||
          (projectId ? projectTitleById[projectId] : "") ||
          (projectId ? `Проект #${projectId}` : "Без проекта"),
        applicantsByOwner: new Map(),
      });
    }

    const fallbackGroup = fallbackGroups.get(key);
    if (!fallbackGroup) return;
    upsertApplicant(fallbackGroup.applicantsByOwner, ownerId, displayName, request);
  });

  const catalogGroups: ProjectApplicantsGroup[] = crmCatalog.flatMap((event): ProjectApplicantsGroup[] => {
    const eventApplicants = applicantsByEvent.get(Number(event.id)) ?? new Map();
    const applicants = Array.from(eventApplicants.values())
      .map((applicant) => ({
        ownerId: applicant.ownerId,
        name: applicant.name,
        status: applicant.status,
        specialization: applicant.specialization,
        requestIds: applicant.requestIds,
      }))
      .sort((a, b) => a.name.localeCompare(b.name, "ru"));

    return event.directions.flatMap((direction): ProjectApplicantsGroup[] => {
      if (direction.projects.length === 0) {
        return [
          {
            key: `${event.id}:${direction.id}:empty`,
            eventId: event.id,
            directionId: direction.id,
            projectId: undefined,
            eventTitle: event.title,
            directionTitle: direction.title,
            projectTitle: "Проекты не добавлены",
            applicants,
          },
        ];
      }

      return direction.projects.map((project): ProjectApplicantsGroup => ({
        key: `${event.id}:${direction.id}:${project.id}`,
        eventId: event.id,
        directionId: direction.id,
        projectId: project.id,
        eventTitle: event.title,
        directionTitle: direction.title,
        projectTitle: project.title,
        applicants,
      }));
    });
  });

  const unknownGroups = Array.from(fallbackGroups.values()).map((group) => ({
    key: group.key,
    eventId: group.eventId,
    directionId: group.directionId,
    projectId: group.projectId,
    eventTitle: group.eventTitle,
    directionTitle: group.directionTitle,
    projectTitle: group.projectTitle,
    applicants: Array.from(group.applicantsByOwner.values())
      .map((applicant) => ({
        ownerId: applicant.ownerId,
        name: applicant.name,
        status: applicant.status,
        specialization: applicant.specialization,
        requestIds: applicant.requestIds,
      }))
      .sort((a, b) => a.name.localeCompare(b.name, "ru")),
  }));

  return [...catalogGroups, ...unknownGroups].sort(
    (a, b) =>
      a.eventTitle.localeCompare(b.eventTitle, "ru") ||
      a.directionTitle.localeCompare(b.directionTitle, "ru") ||
      a.projectTitle.localeCompare(b.projectTitle, "ru")
  );
}

export function buildApplicantsTree(
  projectApplicantGroups: ProjectApplicantsGroup[],
  closedEventIds: number[],
  hiddenEventIdSet: Set<number>
): ApplicantsTreeNode[] {
  const eventsMap = new Map<
    string,
    {
      key: string;
      eventId?: number;
      eventClosed: boolean;
      eventHidden: boolean;
      title: string;
      directionsMap: Map<string, { key: string; title: string; projects: ProjectApplicantsGroup[] }>;
    }
  >();

  projectApplicantGroups.forEach((group) => {
    const eventKey = `e:${(group.eventTitle || "").trim().toLowerCase() || group.eventId || "none"}`;
    if (!eventsMap.has(eventKey)) {
      eventsMap.set(eventKey, {
        key: eventKey,
        title: group.eventTitle,
        eventId: group.eventId,
        eventClosed: typeof group.eventId === "number" ? closedEventIds.includes(group.eventId) : false,
        eventHidden: typeof group.eventId === "number" ? hiddenEventIdSet.has(group.eventId) : false,
        directionsMap: new Map(),
      });
    }
    const eventNode = eventsMap.get(eventKey);
    if (!eventNode) return;

    const directionKey = `d:${(group.directionTitle || "").trim().toLowerCase() || group.directionId || "none"}`;
    if (!eventNode.directionsMap.has(directionKey)) {
      eventNode.directionsMap.set(directionKey, { key: directionKey, title: group.directionTitle, projects: [] });
    }
    eventNode.directionsMap.get(directionKey)?.projects.push(group);
  });

  return Array.from(eventsMap.values())
    .map((eventNode) => ({
      key: eventNode.key,
      eventId: eventNode.eventId,
      eventClosed: eventNode.eventClosed,
      eventHidden: eventNode.eventHidden,
      title: eventNode.title,
      directions: Array.from(eventNode.directionsMap.values())
        .map((directionNode) => ({
          key: directionNode.key,
          title: directionNode.title,
          projects: directionNode.projects.sort((a, b) => a.projectTitle.localeCompare(b.projectTitle, "ru")),
        }))
        .sort((a, b) => a.title.localeCompare(b.title, "ru")),
    }))
    .sort((a, b) => a.title.localeCompare(b.title, "ru"));
}
