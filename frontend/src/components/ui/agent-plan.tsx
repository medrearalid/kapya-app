"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Circle,
  CircleAlert,
  CircleDotDashed,
  ChevronDown,
  CircleX,
} from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useBehaviorStore } from "../../store/behavior-store";
import { usePlannerStore } from "../../store/planner-store";

type TaskStatus = "completed" | "in-progress" | "pending" | "need-help" | "failed";

interface PlanSubtask {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
}

interface PlanTask {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  subtasks: PlanSubtask[];
}

interface PlannedMealItem {
  id?: string;
  date?: string;
  mealType?: string;
  completed?: boolean;
  recipe?: {
    tarifAdi?: string;
  };
}

interface InsightState {
  loading?: boolean;
  error?: string;
  data?: unknown;
  log?: string;
}

interface PlanProps {
  compact?: boolean;
  className?: string;
}

const STATUS_BADGE_CLASS: Record<TaskStatus, string> = {
  completed: "bg-green-100 text-green-700",
  "in-progress": "bg-blue-100 text-blue-700",
  pending: "bg-muted text-muted-foreground",
  "need-help": "bg-yellow-100 text-yellow-700",
  failed: "bg-red-100 text-red-700",
};

const getStatusIcon = (status: TaskStatus, sizeClass: string) => {
  if (status === "completed") {
    return <CheckCircle2 className={`${sizeClass} text-green-500`} />;
  }

  if (status === "in-progress") {
    return <CircleDotDashed className={`${sizeClass} text-blue-500`} />;
  }

  if (status === "need-help") {
    return <CircleAlert className={`${sizeClass} text-yellow-500`} />;
  }

  if (status === "failed") {
    return <CircleX className={`${sizeClass} text-red-500`} />;
  }

  return <Circle className={`${sizeClass} text-muted-foreground`} />;
};

const insightToStatus = (insight: InsightState | undefined): TaskStatus => {
  if (insight?.loading) {
    return "in-progress";
  }

  if (String(insight?.error ?? "").trim()) {
    return "need-help";
  }

  if (insight?.data) {
    return "completed";
  }

  return "pending";
};

const mergeStatuses = (statuses: TaskStatus[]): TaskStatus => {
  if (statuses.includes("in-progress")) {
    return "in-progress";
  }

  if (statuses.includes("need-help") || statuses.includes("failed")) {
    return "need-help";
  }

  if (statuses.every((status) => status === "completed")) {
    return "completed";
  }

  return "pending";
};

const compareMealItems = (left: PlannedMealItem, right: PlannedMealItem) => {
  const leftDate = String(left?.date ?? "");
  const rightDate = String(right?.date ?? "");
  if (leftDate !== rightDate) {
    return leftDate.localeCompare(rightDate);
  }

  return String(left?.mealType ?? "").localeCompare(String(right?.mealType ?? ""));
};

interface TaskCardProps {
  task: PlanTask;
  isExpanded: boolean;
  compact: boolean;
  onToggle: () => void;
}

function TaskCard({ task, isExpanded, compact, onToggle }: Readonly<TaskCardProps>) {
  const { t } = useTranslation();
  const badgeClass = STATUS_BADGE_CLASS[task.status];

  const statusLabelMap: Record<TaskStatus, string> = {
    completed: t("planner.agentPlan.status.completed"),
    "in-progress": t("planner.agentPlan.status.inProgress"),
    pending: t("planner.agentPlan.status.pending"),
    "need-help": t("planner.agentPlan.status.needHelp"),
    failed: t("planner.agentPlan.status.failed"),
  };

  return (
    <li className="rounded-xl border border-black/10 bg-white/85 p-2.5 dark:border-slate-700/65 dark:bg-slate-900/70">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-start gap-2 text-left"
      >
        <span className="mt-0.5 shrink-0" aria-hidden="true">
          {getStatusIcon(task.status, compact ? "h-3.5 w-3.5" : "h-4 w-4")}
        </span>

        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-[#050505] dark:text-slate-100">
            {task.title}
          </span>
          <span className="mt-0.5 block text-xs text-[#4b4b4b] dark:text-slate-300">
            {task.description}
          </span>
        </span>

        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] ${badgeClass}`}
        >
          {statusLabelMap[task.status]}
        </span>

        <ChevronDown
          className={`h-4 w-4 shrink-0 text-[#737373] transition-transform dark:text-slate-300 ${
            isExpanded ? "rotate-180" : ""
          }`}
          aria-hidden="true"
        />
      </button>

      <AnimatePresence initial={false}>
        {isExpanded ? (
          <motion.ul
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="mt-2 space-y-1 overflow-hidden border-l border-dashed border-black/20 pl-3 dark:border-slate-600/80"
          >
            {task.subtasks.map((subtask) => (
              <li
                key={subtask.id}
                className="rounded-lg bg-[#f7f4f0] px-2 py-1.5 dark:bg-slate-800/65"
              >
                <p className="flex items-center gap-1.5 text-xs font-semibold text-[#171717] dark:text-slate-100">
                  <span aria-hidden="true">{getStatusIcon(subtask.status, "h-3 w-3")}</span>
                  <span className="truncate">{subtask.title}</span>
                </p>
                <p className="mt-0.5 text-[11px] leading-relaxed text-[#4b4b4b] dark:text-slate-300">
                  {subtask.description}
                </p>
              </li>
            ))}
          </motion.ul>
        ) : null}
      </AnimatePresence>
    </li>
  );
}

export default function Plan({ compact = false, className = "" }: Readonly<PlanProps>) {
  const { t } = useTranslation();
  const prefersReducedMotion = useReducedMotion();
  const plannedMealsRaw = usePlannerStore((state) => state.plannedMeals);
  const plannerInsight = useBehaviorStore((state) => state.insightByTrigger?.planner_page);
  const walletInsight = useBehaviorStore((state) => state.insightByTrigger?.wallet_page);
  const activeAgentProcessCount = useBehaviorStore((state) => state.activeAgentProcessCount ?? 0);

  const plannedMeals = useMemo(
    () => (Array.isArray(plannedMealsRaw) ? plannedMealsRaw : []) as PlannedMealItem[],
    [plannedMealsRaw],
  );

  const toMealTypeLabel = (mealType: string) => {
    if (mealType === "kahvalti") {
      return t("planner.breakfast");
    }

    if (mealType === "ogle") {
      return t("planner.lunch");
    }

    if (mealType === "aksam") {
      return t("planner.dinner");
    }

    return mealType;
  };

  const tasks = useMemo<PlanTask[]>(() => {
    const plannerInsightStatus = insightToStatus(plannerInsight);
    const walletInsightStatus = insightToStatus(walletInsight);

    const insightTask: PlanTask = {
      id: "insight-task",
      title: t("planner.agentPlan.task.insight.title"),
      description: t("planner.agentPlan.task.insight.description"),
      status: mergeStatuses([
        plannerInsightStatus,
        walletInsightStatus,
        activeAgentProcessCount > 0 ? "in-progress" : "completed",
      ]),
      subtasks: [
        {
          id: "planner-insight",
          title: t("planner.agentPlan.subtask.plannerInsight.title"),
          description:
            String(plannerInsight?.log ?? "").trim() ||
            t("planner.agentPlan.subtask.noEvent.description"),
          status: plannerInsightStatus,
        },
        {
          id: "wallet-insight",
          title: t("planner.agentPlan.subtask.walletInsight.title"),
          description:
            String(walletInsight?.log ?? "").trim() ||
            t("planner.agentPlan.subtask.noEvent.description"),
          status: walletInsightStatus,
        },
        {
          id: "active-process",
          title: t("planner.agentPlan.subtask.activeProcess.title"),
          description: t("planner.agentPlan.subtask.activeProcess.description", {
            count: activeAgentProcessCount,
          }),
          status: activeAgentProcessCount > 0 ? "in-progress" : "completed",
        },
      ],
    };

    const completedMealsCount = plannedMeals.filter((meal) => meal?.completed).length;
    const pendingMealsCount = Math.max(0, plannedMeals.length - completedMealsCount);

    let mealSummaryStatus: TaskStatus = "in-progress";
    if (plannedMeals.length === 0) {
      mealSummaryStatus = "pending";
    } else if (pendingMealsCount === 0) {
      mealSummaryStatus = "completed";
    }

    const mealSummaryTask: PlanTask = {
      id: "meal-summary",
      title: t("planner.agentPlan.task.mealSummary.title"),
      description: t("planner.agentPlan.task.mealSummary.description"),
      status: mealSummaryStatus,
      subtasks: [
        {
          id: "meal-total",
          title: t("planner.agentPlan.subtask.totalMeals.title"),
          description: t("planner.agentPlan.subtask.totalMeals.description", {
            count: plannedMeals.length,
          }),
          status: plannedMeals.length > 0 ? "completed" : "pending",
        },
        {
          id: "meal-completed",
          title: t("planner.agentPlan.subtask.completedMeals.title"),
          description: t("planner.agentPlan.subtask.completedMeals.description", {
            count: completedMealsCount,
          }),
          status: completedMealsCount > 0 ? "completed" : "pending",
        },
        {
          id: "meal-pending",
          title: t("planner.agentPlan.subtask.pendingMeals.title"),
          description: t("planner.agentPlan.subtask.pendingMeals.description", {
            count: pendingMealsCount,
          }),
          status: pendingMealsCount > 0 ? "in-progress" : "completed",
        },
      ],
    };

    const mealLimit = compact ? 10 : 12;
    const sortedMeals = [...plannedMeals].sort(compareMealItems).slice(0, mealLimit);

    const upcomingSubtasks: PlanSubtask[] =
      sortedMeals.length > 0
        ? sortedMeals.map((meal, index) => {
            const mealDate = String(meal?.date ?? "").trim();
            const mealType = toMealTypeLabel(String(meal?.mealType ?? ""));
            const recipeName =
              String(meal?.recipe?.tarifAdi ?? "").trim() ||
              t("planner.agentPlan.subtask.noMeal.description");

            return {
              id: String(meal?.id ?? `meal-${index}`),
              title: `${mealDate} • ${mealType}`,
              description: recipeName,
              status: meal?.completed ? "completed" : "pending",
            };
          })
        : [
            {
              id: "no-upcoming-meal",
              title: t("planner.agentPlan.subtask.noMeal.title"),
              description: t("planner.agentPlan.subtask.noMeal.description"),
              status: "pending",
            },
          ];

    let upcomingTaskStatus: TaskStatus = "in-progress";
    if (sortedMeals.length === 0) {
      upcomingTaskStatus = "pending";
    } else if (sortedMeals.every((meal) => meal?.completed)) {
      upcomingTaskStatus = "completed";
    }

    const upcomingTask: PlanTask = {
      id: "upcoming-meals",
      title: t("planner.agentPlan.task.upcoming.title"),
      description: t("planner.agentPlan.task.upcoming.description"),
      status: upcomingTaskStatus,
      subtasks: upcomingSubtasks,
    };

    return [insightTask, mealSummaryTask, upcomingTask];
  }, [
    plannerInsight,
    walletInsight,
    activeAgentProcessCount,
    plannedMeals,
    compact,
    t,
  ]);

  const [expandedTaskIds, setExpandedTaskIds] = useState<string[]>([
    "insight-task",
    "meal-summary",
  ]);

  useEffect(() => {
    setExpandedTaskIds((current) => {
      const validSet = new Set(tasks.map((task) => task.id));
      const filtered = current.filter((id) => validSet.has(id));
      if (filtered.length > 0) {
        return filtered;
      }

      const fallbackId = tasks[0]?.id;
      return fallbackId ? [fallbackId] : [];
    });
  }, [tasks]);

  const toggleTaskExpansion = (taskId: string) => {
    setExpandedTaskIds((current) => {
      if (current.includes(taskId)) {
        return current.filter((id) => id !== taskId);
      }

      return [...current, taskId];
    });
  };

  const contentHeightClass = compact ? "max-h-[65vh] md:max-h-[540px]" : "max-h-[420px]";

  return (
    <div className={`h-full ${className}`.trim()}>
      <div
        className={`h-full overflow-auto rounded-2xl border border-black/10 bg-white/90 p-2.5 shadow-soft dark:border-slate-700/60 dark:bg-slate-900/78 ${contentHeightClass}`}
      >
        <motion.ul
          initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
          animate={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
          transition={prefersReducedMotion ? undefined : { duration: 0.22, ease: "easeOut" }}
          className="space-y-2"
        >
          {tasks.map((task) => {
            const isExpanded = expandedTaskIds.includes(task.id);
            return (
              <TaskCard
                key={task.id}
                task={task}
                compact={compact}
                isExpanded={isExpanded}
                onToggle={() => toggleTaskExpansion(task.id)}
              />
            );
          })}
        </motion.ul>
      </div>
    </div>
  );
}
