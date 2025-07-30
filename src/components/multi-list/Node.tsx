import { useState, useRef, useEffect, useCallback } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { Textarea } from "../ui/textarea";
import { Button } from "../ui/button";
import { motion } from "framer-motion";
import { Trash2, Plus, Calendar } from "lucide-react";

type Node = {
  _id: Id<"nodes">;
  _creationTime: number;
  text: string;
  state: "red" | "yellow" | "green";
  listId: Id<"lists">;
  order: number;
  dueDate?: string | null;
  parent?: Id<"nodes"> | null;
  children?: Node[];
};

interface NodeProps {
  node: Node;
  nodes: Node[];
  textareaRefs: React.MutableRefObject<Map<Id<"nodes">, HTMLTextAreaElement>>;
  localTexts: Record<string, string>;
  setLocalTexts: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  lastCreatedNodeId: Id<"nodes"> | null;
  setLastCreatedNodeId: React.Dispatch<React.SetStateAction<Id<"nodes"> | null>>;
  localDueDates: Record<string, string>;
  setLocalDueDates: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  datePickerOpen: Record<string, boolean>;
  setDatePickerOpen: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  addItem: (parent?: Id<"nodes">) => Promise<void>;
}

export default function Node({ node, nodes, textareaRefs, localTexts, setLocalTexts, lastCreatedNodeId, setLastCreatedNodeId, localDueDates, setLocalDueDates, datePickerOpen, setDatePickerOpen, addItem }: NodeProps) {
  const updateNodeText = useMutation(api.lists.updateNodeText);
  const updateNodeState = useMutation(api.lists.updateNodeState);
  const deleteNode = useMutation(api.lists.deleteNode);

  const handleTextChange = (nodeId: Id<"nodes">, newText: string) => {
    setLocalTexts((prev) => ({
      ...prev,
      [nodeId]: newText,
    }));
  };

  const handleDueDateChange = (nodeId: Id<"nodes">, newDueDate: string) => {
    setLocalDueDates((prev) => ({
      ...prev,
      [nodeId]: newDueDate,
    }));
  };

  const handleTextBlur = async (
    node: Node,
    newText: string,
    dueDate?: string,
  ) => {
    const trimmed = newText.trim();
    const dueDateVal = dueDate === "" ? undefined : dueDate;
    if (trimmed !== node.text || dueDateVal !== node.dueDate) {
      try {
        await updateNodeText({
          nodeId: node._id,
          text: trimmed,
          dueDate: dueDateVal,
        });
      } catch (error) {
        console.error("Failed to update node text or due date:", error);
      }
    }
  };

  const handleStateChange = async (
    nodeId: Id<"nodes">,
    currentState: "red" | "yellow" | "green",
    pushForward: number,
  ) => {
    let nextState =
      currentState === "red"
        ? "yellow"
        : currentState === "yellow"
          ? "green"
          : "red";
    if (pushForward > 1) {
      nextState =
        nextState === "red"
          ? "yellow"
          : nextState === "yellow"
            ? "green"
            : "red";
    }
    try {
      await updateNodeState({
        nodeId,
        state: nextState as "red" | "yellow" | "green",
      });
    } catch (error) {
      console.error("Failed to update node state:", error);
    }
  };

  const handleDeleteNode = async (nodeId: Id<"nodes">) => {
    try {
      await deleteNode({ nodeId });
    } catch (error) {
      console.error("Failed to delete node:", error);
    }
  };

  const localText = localTexts[node._id] ?? node.text;
  const colorClass =
    node.state === "red"
      ? "bg-red-500"
      : node.state === "yellow"
        ? "bg-yellow-500"
        : "bg-green-500";
  const localDueDate = localDueDates[node._id] ?? "";
  const isDatePickerOpen = datePickerOpen[node._id] ?? false;

  return (
    <motion.div
      key={node._id}
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.01, ease: "easeOut" }}
      className="flex flex-col"
    >
      <div className="flex">
        <div
          onClick={() =>
            void handleStateChange(node._id, node.state, 1)
          }
          onContextMenu={(e) => {
            e.preventDefault();
            void handleStateChange(node._id, node.state, 2);
          }}
          className={`!w-6 rounded-full transition-all duration-100 cursor-pointer  mb-1 hover:blur-xs ${colorClass}`}
        ></div>
        <div className="flex w-full">
          <Textarea
            value={localText}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
              handleTextChange(node._id, e.target.value)
            }
            className="my-auto pt-0.5 border-0 text-base bg-transparent placeholder:text-gray"
            rows={1}
            placeholder="Add a task..."
            style={{
              minHeight: "32px",
              height: "32px",
              resize: "none",
              overflowY: "hidden",
            }}
            ref={(el: HTMLTextAreaElement | null) => {
              if (el) {
                textareaRefs.current.set(node._id, el);
                if (lastCreatedNodeId === node._id) {
                  el.focus();
                  setLastCreatedNodeId(null);
                }
              } else {
                textareaRefs.current.delete(node._id);
              }
            }}
            onInput={(e: React.FormEvent<HTMLTextAreaElement>) => {
              const textarea = e.currentTarget;
              textarea.style.height = "auto";
              textarea.style.height = `${Math.max(32, textarea.scrollHeight)}px`;
            }}
            onBlur={(e: React.FocusEvent<HTMLTextAreaElement>) => {
              void handleTextBlur(
                node,
                e.currentTarget.value,
                localDueDate,
              );
            }}
            onKeyDown={(
              e: React.KeyboardEvent<HTMLTextAreaElement>,
            ) => {
              const textarea = e.currentTarget;

              // Handle cmd+enter to create new item from within textarea
              if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                e.preventDefault();
                void addItem(node.parent ?? undefined);
                return;
              }

              if (e.key === "Backspace" && textarea.value === "") {
                e.preventDefault();
                void handleDeleteNode(node._id);
                return;
              }

              // Arrow key navigation
              const sortedNodes = nodes.sort((a, b) => a.order - b.order);
              const currentIndex = sortedNodes.findIndex(
                (n) => n._id === node._id,
              );

              if (
                e.key === "ArrowUp" &&
                textarea.selectionStart === 0 &&
                textarea.selectionEnd === 0 &&
                currentIndex > 0
              ) {
                e.preventDefault();
                const prevNode = sortedNodes[currentIndex - 1];
                textareaRefs.current.get(prevNode._id)?.focus();
              }

              if (
                e.key === "ArrowDown" &&
                textarea.selectionStart === textarea.value.length &&
                textarea.selectionEnd === textarea.value.length &&
                currentIndex < sortedNodes.length - 1
              ) {
                const value = textarea.value;
                const beforeCaret = value.slice(
                  0,
                  textarea.selectionStart,
                );
                if (
                  beforeCaret.split("\n").length ===
                  value.split("\n").length
                ) {
                  e.preventDefault();
                  const nextNode = sortedNodes[currentIndex + 1];
                  textareaRefs.current.get(nextNode._id)?.focus();
                }
              }
            }}
          />

          {localDueDate ? (
            <input
              type="date"
              className="ml-2 px-2 py-1 rounded border border-gray-300 bg-white text-sm"
              value={localDueDate}
              onChange={(e) => {
                handleDueDateChange(node._id, e.target.value);
                void handleTextBlur(node, localText, e.target.value);
              }}
              onBlur={(e) => {
                void handleTextBlur(node, localText, e.target.value);
              }}
              placeholder="Due date"
            />
          ) : (
            <button
              className="ml-2 p-1 rounded hover:bg-gray-100"
              type="button"
              aria-label="Set due date"
              onClick={() =>
                setDatePickerOpen((prev) => ({
                  ...prev,
                  [node._id]: true,
                }))
              }
            >
              <Calendar className="w-4 h-4 text-primary" />
            </button>
          )}

          {isDatePickerOpen && !localDueDate && (
            <input
              type="date"
              className="ml-2 px-2 py-1 rounded border border-gray-300 bg-white text-sm"
              value={localDueDate}
              autoFocus
              onChange={(e) => {
                handleDueDateChange(node._id, e.target.value);
                void handleTextBlur(node, localText, e.target.value);
                setDatePickerOpen((prev) => ({
                  ...prev,
                  [node._id]: false,
                }));
              }}
              onBlur={(_) => {
                setDatePickerOpen((prev) => ({
                  ...prev,
                  [node._id]: false,
                }));
              }}
              placeholder="Due date"
            />
          )}

          <Button
            size="icon"
            variant="ghost"
            className="w-6 h-6 my-auto opacity-70 hover:opacity-100"
            onClick={() => void addItem(node._id)}
          >
            <Plus className="w-3 h-3" />
          </Button>

          <Button
            size="icon"
            variant="ghost"
            className="w-6 h-6 my-auto opacity-70 hover:opacity-100 text-destructive hover:text-destructive"
            onClick={() => void handleDeleteNode(node._id)}
          >
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      </div>
      <div className="ml-6">
        {node.children?.map((child) => (
          <Node
            key={child._id}
            node={child}
            nodes={nodes}
            textareaRefs={textareaRefs}
            localTexts={localTexts}
            setLocalTexts={setLocalTexts}
            lastCreatedNodeId={lastCreatedNodeId}
            setLastCreatedNodeId={setLastCreatedNodeId}
            localDueDates={localDueDates}
            setLocalDueDates={setLocalDueDates}
            datePickerOpen={datePickerOpen}
            setDatePickerOpen={setDatePickerOpen}
            addItem={addItem}
          />
        ))}
      </div>
    </motion.div>
  );
}
