import { useCallback, useEffect, useState } from "react";
import { getDirectionsByEvent } from "../../../api/directions";
import { getProjectsByDirection, saveProjectsForDirection } from "../../../api/projects";
import type { Project } from "../../../types/project";
import { useToast } from "../../Toast/ToastProvider";
import { useWizard } from "../EventWizardModal";
import type { DirectionModel, ProjectModel } from "../types";

type LocalProject = ProjectModel & { directionId?: string };

export default function ProjectForm() {
  const { mode, eventId, savedDirections, directionId: ctxDirectionId, projectId: ctxProjectId } = useWizard();
  const { showToast } = useToast();

  const [directions, setDirections] = useState<DirectionModel[]>([]);
  const [directionId, setDirectionId] = useState<string>(ctxDirectionId ? String(ctxDirectionId) : "");
  const [projects, setProjects] = useState<LocalProject[]>([]);
  const [editingProjectId, setEditingProjectId] = useState<number | null>(mode === "edit" && ctxProjectId ? Number(ctxProjectId) : null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loadingDirections, setLoadingDirections] = useState(false);
  const [loadingProjects, setLoadingProjects] = useState(false);

  const resetDraft = () => {
    setEditingProjectId(null);
    setTitle("");
    setDescription("");
    setErrors({});
  };

  const fillForm = useCallback(
    (project?: LocalProject) => {
      if (!project) return;
      setEditingProjectId(Number(project.id));
      setDirectionId(String(project.directionId ?? ctxDirectionId ?? ""));
      setTitle(project.title ?? "");
      setDescription(project.description ?? "");
      setErrors({});
    },
    [ctxDirectionId]
  );

  useEffect(() => {
    let mounted = true;

    (async () => {
      if (savedDirections && savedDirections.length > 0) {
        if (!mounted) return;
        setDirections(savedDirections);
        if (!directionId && savedDirections.length > 0) setDirectionId(String(ctxDirectionId ?? savedDirections[0].id));
        return;
      }

      if (!eventId) return;
      setLoadingDirections(true);
      try {
        const loadedDirections = await getDirectionsByEvent(eventId);
        if (!mounted) return;
        setDirections(loadedDirections || []);
        if (!directionId && loadedDirections && loadedDirections.length > 0) {
          setDirectionId(String(ctxDirectionId ?? loadedDirections[0].id));
        }
      } catch {
        if (mounted) setDirections([]);
      } finally {
        if (mounted) setLoadingDirections(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [ctxDirectionId, directionId, eventId, savedDirections]);

  useEffect(() => {
    let mounted = true;

    (async () => {
      if (!directionId) {
        setProjects([]);
        return;
      }

      const cachedDirection = (savedDirections || []).find((direction) => String(direction.id) === String(directionId));
      if (cachedDirection?.projects?.length) {
        if (!mounted) return;
        const mapped = cachedDirection.projects.map((project) => ({
          ...project,
          directionId: String(directionId),
        }));
        setProjects(mapped);
        if (mode === "edit" && ctxProjectId) {
          fillForm(mapped.find((project) => Number(project.id) === Number(ctxProjectId)));
        }
        return;
      }

      setLoadingProjects(true);
      try {
        const apiProjects = await getProjectsByDirection(Number(directionId));
        if (!mounted) return;
        const mapped = (apiProjects || []).map((project) => ({
          id: Number(project.id),
          title: project.title ?? "",
          description: project.description ?? "",
          directionId: String(directionId),
        }));
        setProjects(mapped);
        if (mode === "edit" && ctxProjectId) {
          fillForm(mapped.find((project) => Number(project.id) === Number(ctxProjectId)));
        }
      } catch {
        if (mounted) setProjects([]);
      } finally {
        if (mounted) setLoadingProjects(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [ctxProjectId, directionId, fillForm, mode, savedDirections]);

  useEffect(() => {
    if (ctxDirectionId) setDirectionId(String(ctxDirectionId));
  }, [ctxDirectionId]);

  const validateDraft = () => {
    const nextErrors: Record<string, string> = {};
    if (!directionId) nextErrors.directionId = "Выберите направление";
    if (!title.trim()) nextErrors.title = "Введите название проекта";
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const buildDraft = (): LocalProject => ({
    id: editingProjectId ?? Date.now(),
    title: title.trim(),
    description: description.trim(),
    directionId,
  });

  const saveDraftToList = () => {
    if (!validateDraft()) return false;
    const nextProject = buildDraft();

    if (editingProjectId != null) {
      setProjects((prev) => prev.map((project) => (Number(project.id) === Number(editingProjectId) ? { ...project, ...nextProject } : project)));
      showToast("success", "Изменения проекта добавлены в черновик");
      return true;
    }

    setProjects((prev) => [...prev, nextProject]);
    resetDraft();
    return true;
  };

  const removeProject = (id: number) => {
    setProjects((prev) => prev.filter((project) => Number(project.id) !== Number(id)));
    if (Number(editingProjectId) === Number(id)) resetDraft();
  };

  const handleSave = async () => {
    if (!directionId) {
      showToast("error", "Выберите направление");
      return;
    }

    let preparedProjects = [...projects];
    if (title.trim()) {
      if (!validateDraft()) return;
      const draft = buildDraft();
      preparedProjects =
        editingProjectId != null
          ? preparedProjects.map((project) => (Number(project.id) === Number(editingProjectId) ? { ...project, ...draft } : project))
          : [...preparedProjects, draft];
    }

    for (const project of preparedProjects) {
      if (!project.title?.trim()) {
        showToast("error", "У одного из проектов нет названия");
        return;
      }
    }

    try {
      const payload: Project[] = preparedProjects.map((project) => ({
        id: Number(project.id),
        title: project.title ?? "",
        description: project.description ?? "",
        directionId: Number(directionId),
      }));
      const saved = await saveProjectsForDirection(Number(directionId), payload);
      const mapped = (saved || []).map((project) => ({
        id: Number(project.id),
        title: project.title ?? "",
        description: project.description ?? "",
        directionId: String(directionId),
      }));
      setProjects(mapped);
      resetDraft();
      if (mode === "edit" && ctxProjectId) {
        fillForm(mapped.find((project) => Number(project.id) === Number(ctxProjectId)));
      }
      showToast("success", "Проекты сохранены");
    } catch {
      showToast("error", "Ошибка при сохранении проектов");
    }
  };

  return (
    <div className="wizard-form">
      <h2 className="h2">{mode === "edit" ? "Редактирование проекта" : "Добавление проектов"}</h2>

      <div className={`field-wrap ${errors.directionId ? "error" : ""}`}>
        <label className="text-small">
          Выберите направление
          <select
            value={directionId}
            disabled={mode === "edit" && Boolean(ctxDirectionId)}
            onChange={(event) => {
              setDirectionId(String(event.target.value));
              setErrors((prev) => {
                const next = { ...prev };
                delete next.directionId;
                return next;
              });
            }}
          >
            <option value="">Выберите направление</option>
            {loadingDirections ? (
              <option>Загрузка...</option>
            ) : (
              directions.map((direction) => (
                <option key={direction.id} value={direction.id}>
                  {direction.title}
                </option>
              ))
            )}
          </select>
        </label>
        {errors.directionId && <div className="field-error">{errors.directionId}</div>}
      </div>

      <div className={`field-wrap ${errors.title ? "error" : ""}`}>
        <label className="text-small">
          Название проекта
          <div className="wizard-inline-add-row wizard-inline-add-row--entity">
            <input
              placeholder="Введите название проекта"
              value={title}
              onChange={(event) => {
                setTitle(event.target.value);
                setErrors((prev) => {
                  const next = { ...prev };
                  delete next.title;
                  return next;
                });
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  saveDraftToList();
                }
              }}
            />
            <button className="primary wizard-inline-add-button wizard-inline-add-button--secondary" type="button" onClick={saveDraftToList}>
              {editingProjectId != null ? "Обновить" : "Добавить"}
            </button>
          </div>
        </label>
        {errors.title && <div className="field-error">{errors.title}</div>}
      </div>

      <label className="text-small">
        Описание
        <textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Краткое описание проекта" />
      </label>

      <div className="tags" style={{ marginTop: 12 }}>
        {loadingProjects ? (
          <div>Загрузка...</div>
        ) : (
          projects.map((project) => (
            <div
              key={project.id}
              className="tag"
              style={Number(editingProjectId) === Number(project.id) ? { outline: "2px solid var(--wizard-accent)" } : undefined}
            >
              <button
                type="button"
                style={{ border: "none", background: "transparent", padding: 0, textAlign: "left", display: "flex", flexDirection: "column", gap: 2 }}
                onClick={() => fillForm(project)}
              >
                <strong style={{ lineHeight: 1 }}>{project.title}</strong>
                {project.description && <span className="text-small" style={{ opacity: 0.8 }}>{project.description}</span>}
              </button>
              <button type="button" onClick={() => removeProject(Number(project.id))} aria-label="Удалить проект">
                x
              </button>
            </div>
          ))
        )}
      </div>

      <div className="wizard-actions">
        <button className="primary" type="button" onClick={handleSave}>
          Сохранить настройки проекта
        </button>
      </div>
    </div>
  );
}
