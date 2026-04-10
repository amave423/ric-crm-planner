import { useEffect, useRef, useState } from "react";
import type { PlannerSubtask } from "../../../types/planner";
import type { PlannerDragPreview } from "../planner.types";

type UsePlannerDragOptions = {
  canEditTeam: (teamId: number) => boolean;
  onDropSubtask: (subtaskId: number, column: string) => void;
};

export function usePlannerDrag({ canEditTeam, onDropSubtask }: UsePlannerDragOptions) {
  const [draggingSubtaskId, setDraggingSubtaskId] = useState<number | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
  const [dragStartX, setDragStartX] = useState<number | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number } | null>(null);
  const [dragPreview, setDragPreview] = useState<PlannerDragPreview | null>(null);

  const dragTargetRef = useRef<{ x: number; y: number; tilt: number } | null>(null);
  const dragPreviewRef = useRef<PlannerDragPreview | null>(null);
  const dragAnimRef = useRef<number | null>(null);
  const dragPreviewElRef = useRef<HTMLDivElement | null>(null);
  const dragImageRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!dragOffset || dragStartX == null || !draggingSubtaskId) return;
    const handleGlobalDragOver = (event: DragEvent) => {
      if (!event.clientX && !event.clientY) return;
      const deltaX = event.clientX - dragStartX;
      const tilt = Math.abs(deltaX) >= 12 ? (deltaX > 0 ? 6 : -6) : 0;
      dragTargetRef.current = {
        x: event.clientX - dragOffset.x,
        y: event.clientY - dragOffset.y,
        tilt,
      };
    };
    window.addEventListener("dragover", handleGlobalDragOver);
    return () => window.removeEventListener("dragover", handleGlobalDragOver);
  }, [dragOffset, dragStartX, draggingSubtaskId]);

  useEffect(() => {
    if (!draggingSubtaskId) return;
    const step = () => {
      const target = dragTargetRef.current;
      const current = dragPreviewRef.current;
      if (target && current) {
        const lerp = (a: number, b: number) => a + (b - a) * 0.18;
        const next = {
          ...current,
          x: lerp(current.x, target.x),
          y: lerp(current.y, target.y),
          tilt: lerp(current.tilt, target.tilt),
        };
        dragPreviewRef.current = next;
        const el = dragPreviewElRef.current;
        if (el) {
          el.style.transform = `translate3d(${next.x}px, ${next.y}px, 0) rotate(${next.tilt}deg)`;
        }
      }
      dragAnimRef.current = requestAnimationFrame(step);
    };
    dragAnimRef.current = requestAnimationFrame(step);
    return () => {
      if (dragAnimRef.current) cancelAnimationFrame(dragAnimRef.current);
      dragAnimRef.current = null;
    };
  }, [draggingSubtaskId]);

  const resetDragState = () => {
    setDraggingSubtaskId(null);
    setDragOverColumn(null);
    setDragStartX(null);
    setDragOffset(null);
    setDragPreview(null);
    dragTargetRef.current = null;
    dragPreviewRef.current = null;
    if (dragAnimRef.current) cancelAnimationFrame(dragAnimRef.current);
    dragAnimRef.current = null;
  };

  const handleDragStart = (event: React.DragEvent<HTMLDivElement>, subtask: PlannerSubtask, teamId: number) => {
    if (!canEditTeam(teamId)) return;
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", String(subtask.id));
    if (dragImageRef.current) event.dataTransfer.setDragImage(dragImageRef.current, 0, 0);
    const rect = event.currentTarget.getBoundingClientRect();
    const offsetX = Math.max(0, Math.min(rect.width, event.clientX - rect.left));
    const offsetY = Math.max(0, Math.min(rect.height, event.clientY - rect.top));
    setDragOffset({ x: offsetX, y: offsetY });
    setDragStartX(event.clientX || null);
    const preview = {
      subtask,
      x: event.clientX - offsetX,
      y: event.clientY - offsetY,
      width: rect.width,
      tilt: 0,
    };
    dragPreviewRef.current = preview;
    dragTargetRef.current = { x: preview.x, y: preview.y, tilt: 0 };
    setDragPreview(preview);
    setDraggingSubtaskId(subtask.id);
  };

  const handleDragMove = (event: React.DragEvent<HTMLDivElement>) => {
    if (dragStartX == null || !dragOffset) return;
    if (!event.clientX && !event.clientY) return;
    const deltaX = event.clientX - dragStartX;
    const tilt = Math.abs(deltaX) >= 12 ? (deltaX > 0 ? 6 : -6) : 0;
    dragTargetRef.current = {
      x: event.clientX - dragOffset.x,
      y: event.clientY - dragOffset.y,
      tilt,
    };
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>, column: string) => {
    event.preventDefault();
    if (dragOverColumn !== column) setDragOverColumn(column);
    event.dataTransfer.dropEffect = "move";
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>, column: string) => {
    if (dragOverColumn !== column) return;
    const related = event.relatedTarget as Node | null;
    if (related && event.currentTarget.contains(related)) return;
    setDragOverColumn(null);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>, column: string) => {
    event.preventDefault();
    const raw = event.dataTransfer.getData("text/plain");
    const subtaskId = Number(raw);
    if (!subtaskId) return;
    onDropSubtask(subtaskId, column);
    resetDragState();
  };

  return {
    draggingSubtaskId,
    dragOverColumn,
    dragPreview,
    dragPreviewElRef,
    dragImageRef,
    handleDragStart,
    handleDragMove,
    handleDragEnd: resetDragState,
    handleDragOver,
    handleDragLeave,
    handleDrop,
  };
}
