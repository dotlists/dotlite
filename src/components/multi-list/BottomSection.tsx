import { useState, useRef, useEffect, useCallback, useMemo, memo } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { Textarea } from "../ui/textarea";
import { Button } from "../ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { Trash2, Plus, Calendar } from "lucide-react";
import MiddleSection from "./MiddleSection";
import Confirm from "../Confirm";

type Node = {
  _id: Id<"nodes">;
  _creationTime: number;
  text: string;
  state: "red" | "yellow" | "green";
  listId: Id<"lists">;
  order: number;
  dueDate?: string | null;
};

interface BottomSectionProps {
  listId: Id<"lists">;
  nodes: Node[];
}

type NodeRowProps = {
  node: Node;
  prevNodeId: Id<"nodes"> | null;
  nextNodeId: Id<"nodes"> | null;
  onCycleState: (
    nodeId: Id<"nodes">,
    currentState: Node["state"],
    pushForward: number,
  ) => Promise<void>;
  onDelete: (nodeId: Id<"nodes">) => Promise<void>;
  onAddItem: () => Promise<void>;
  onSave: (node: Node, text: string, dueDate: string) => Promise<boolean>;
  registerTextarea: (
    nodeId: Id<"nodes">,
    element: HTMLTextAreaElement | null,
  ) => void;
  focusNode: (nodeId: Id<"nodes">) => void;
  autoFocus: boolean;
  clearPendingFocus: (nodeId: Id<"nodes">) => void;
};

const normalizeDueDate = (value: string | null | undefined) => value ?? "";

const NodeRow = memo<NodeRowProps>(
  ({
    node,
    prevNodeId,
    nextNodeId,
    onCycleState,
    onDelete,
    onAddItem,
    onSave,
    registerTextarea,
    focusNode,
    autoFocus,
    clearPendingFocus,
  }) => {
    const textareaRef = useRef<HTMLTextAreaElement | null>(null);
    const dateInputRef = useRef<HTMLInputElement | null>(null);
    const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
    const [isDirty, setIsDirty] = useState(false);

    const updateDirtyState = useCallback(() => {
      const textVal = textareaRef.current?.value ?? "";
      const dueVal = dateInputRef.current?.value ?? "";
      const trimmed = textVal.trim();
      const normalizedDue = dueVal === "" ? "" : dueVal;
      const originalDue = normalizeDueDate(node.dueDate);
      setIsDirty(!(trimmed === node.text && normalizedDue === originalDue));
    }, [node.text, node.dueDate]);

    useEffect(() => {
      const textarea = textareaRef.current;
      if (textarea) {
        textarea.value = node.text;
        textarea.style.height = "auto";
        textarea.style.height = `${Math.max(32, textarea.scrollHeight)}px`;
        if (autoFocus) {
          textarea.focus();
          textarea.setSelectionRange(
            textarea.value.length,
            textarea.value.length,
          );
          clearPendingFocus(node._id);
        }
      }

      const dateInput = dateInputRef.current;
      if (dateInput) {
        dateInput.value = normalizeDueDate(node.dueDate);
      }

      setIsDirty(false);
      setIsDatePickerOpen(false);
    }, [node._id, node.text, node.dueDate, autoFocus, clearPendingFocus]);

    const textareaCallbackRef = useCallback(
      (element: HTMLTextAreaElement | null) => {
        textareaRef.current = element;
        registerTextarea(node._id, element);
        if (element) {
          element.value = node.text;
          element.style.height = "auto";
          element.style.height = `${Math.max(32, element.scrollHeight)}px`;
        }
      },
      [node._id, node.text, registerTextarea],
    );

    const handleInput = useCallback(
      (event: React.FormEvent<HTMLTextAreaElement>) => {
        const textarea = event.currentTarget;
        textarea.style.height = "auto";
        textarea.style.height = `${Math.max(32, textarea.scrollHeight)}px`;
        setIsDirty(true);
      },
      [],
    );

    const handleBlur = useCallback(async () => {
      const textVal = textareaRef.current?.value ?? "";
      const dueVal = dateInputRef.current?.value ?? "";
      const saved = await onSave(node, textVal, dueVal);
      if (saved) {
        setIsDirty(false);
      } else {
        updateDirtyState();
      }
    }, [node, onSave, updateDirtyState]);

    const handleDateChange = useCallback(
      async (event: React.ChangeEvent<HTMLInputElement>) => {
        const dueVal = event.target.value;
        setIsDirty(true);
        const textVal = textareaRef.current?.value ?? "";
        const saved = await onSave(node, textVal, dueVal);
        if (saved) {
          setIsDirty(false);
          setIsDatePickerOpen(false);
        } else {
          updateDirtyState();
        }
      },
      [node, onSave, updateDirtyState],
    );

    const handleKeyDown = useCallback(
      (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
        const textarea = event.currentTarget;

        if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
          event.preventDefault();
          void onAddItem();
          return;
        }

        if (event.key === "Backspace" && textarea.value === "") {
          event.preventDefault();
          void onDelete(node._id);
          return;
        }

        if (
          event.key === "ArrowUp" &&
          textarea.selectionStart === 0 &&
          textarea.selectionEnd === 0 &&
          prevNodeId
        ) {
          event.preventDefault();
          focusNode(prevNodeId);
          return;
        }

        if (
          event.key === "ArrowDown" &&
          textarea.selectionStart === textarea.value.length &&
          textarea.selectionEnd === textarea.value.length &&
          nextNodeId
        ) {
          const value = textarea.value;
          const beforeCaret = value.slice(0, textarea.selectionStart);
          if (beforeCaret.split("\n").length === value.split("\n").length) {
            event.preventDefault();
            focusNode(nextNodeId);
          }
        }
      },
      [focusNode, node._id, onAddItem, onDelete, nextNodeId, prevNodeId],
    );

    const handleStateClick = useCallback(
      (pushForward: number) => {
        void onCycleState(node._id, node.state, pushForward);
      },
      [node._id, node.state, onCycleState],
    );

    const shouldShowDateInput = Boolean(node.dueDate) || isDatePickerOpen;

    return (
      <motion.div
        layout
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.1, ease: "easeOut" }}
        className="flex"
      >
        <div
          onClick={() => handleStateClick(1)}
          onContextMenu={(event) => {
            event.preventDefault();
            handleStateClick(2);
          }}
          className={`!w-6 rounded-full transition-all duration-100 cursor-pointer mb-1 hover:blur-xs ${
            node.state === "red"
              ? "bg-red-500"
              : node.state === "yellow"
                ? "bg-yellow-500"
                : "bg-green-500"
          }`}
        ></div>
        <div className="flex w-full">
          <Textarea
            defaultValue={node.text}
            className="my-auto pt-0.5 border-0 text-base bg-transparent placeholder:text-gray"
            rows={1}
            placeholder="Add a task..."
            style={{
              minHeight: "32px",
              height: "32px",
              resize: "none",
              overflowY: "hidden",
            }}
            ref={textareaCallbackRef}
            onInput={handleInput}
            onBlur={() => void handleBlur()}
            onKeyDown={handleKeyDown}
          />

          <div className="ml-2 flex items-center gap-2">
            {shouldShowDateInput ? (
              <input
                type="date"
                className="px-2 py-1 rounded border border-gray-300 bg-white text-sm"
                defaultValue={normalizeDueDate(node.dueDate)}
                ref={dateInputRef}
                onChange={(e) => void handleDateChange(e)}
                placeholder="Due date"
              />
            ) : (
              <button
                className="p-1 rounded hover:bg-gray-100"
                type="button"
                aria-label="Set due date"
                onClick={() => setIsDatePickerOpen(true)}
              >
                <Calendar className="w-4 h-4 text-primary" />
              </button>
            )}
            {isDirty && (
              <span
                className="h-2 w-2 rounded-full bg-blue-500"
                aria-label="Unsaved changes"
              >
                {" "}
              </span>
            )}
          </div>

          <Confirm
            action="Delete node"
            onConfirm={() => void onDelete(node._id)}
            message="Deleting this task is permanent and cannot be undone. Are you sure you want to delete it?"
          >
            <Button
              size="icon"
              variant="ghost"
              className="w-6 h-6 my-auto opacity-70 hover:opacity-100 text-destructive hover:text-destructive"
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          </Confirm>
        </div>
      </motion.div>
    );
  },
);

NodeRow.displayName = "NodeRow";

export default function BottomSection({ listId, nodes }: BottomSectionProps) {
  const createNode = useMutation(api.lists.createNode);
  const updateNodeText = useMutation(api.lists.updateNodeText);
  const updateNodeState = useMutation(api.lists.updateNodeState);
  const deleteNode = useMutation(api.lists.deleteNode);

  const textareaRefs = useRef<Map<Id<"nodes">, HTMLTextAreaElement>>(new Map());
  const [lastCreatedNodeId, setLastCreatedNodeId] =
    useState<Id<"nodes"> | null>(null);

  const registerTextarea = useCallback(
    (nodeId: Id<"nodes">, element: HTMLTextAreaElement | null) => {
      if (element) {
        textareaRefs.current.set(nodeId, element);
      } else {
        textareaRefs.current.delete(nodeId);
      }
    },
    [],
  );

  const focusNode = useCallback((nodeId: Id<"nodes">) => {
    const textarea = textareaRefs.current.get(nodeId);
    if (textarea) {
      textarea.focus();
      const valueLength = textarea.value.length;
      textarea.setSelectionRange(valueLength, valueLength);
    }
  }, []);

  const clearPendingFocus = useCallback((nodeId: Id<"nodes">) => {
    setLastCreatedNodeId((current) => (current === nodeId ? null : current));
  }, []);

  const addItem = useCallback(async () => {
    try {
      const newNodeId = await createNode({
        listId,
        text: "",
        state: "red",
      });
      setLastCreatedNodeId(newNodeId);
    } catch (error) {
      console.error("Failed to create node:", error);
    }
  }, [listId, createNode]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
        const activeElement = document.activeElement;
        if (activeElement && activeElement.tagName === "TEXTAREA") {
          return;
        }
        event.preventDefault();
        void addItem();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [addItem]);

  const handleNodeSave = useCallback(
    async (node: Node, text: string, dueDate: string) => {
      const trimmed = text.trim();
      const normalizedDue = dueDate === "" ? undefined : dueDate;
      const currentDue = node.dueDate ?? undefined;

      if (trimmed === node.text && normalizedDue === currentDue) {
        return false;
      }

      try {
        await updateNodeText({
          nodeId: node._id,
          text: trimmed,
          dueDate: normalizedDue,
        });
        return true;
      } catch (error) {
        console.error("Failed to update node text or due date:", error);
        return false;
      }
    },
    [updateNodeText],
  );

  const handleStateChange = useCallback(
    async (
      nodeId: Id<"nodes">,
      currentState: Node["state"],
      pushForward: number,
    ) => {
      let nextState: Node["state"] =
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
          state: nextState,
        });
      } catch (error) {
        console.error("Failed to update node state:", error);
      }
    },
    [updateNodeState],
  );

  const handleDeleteNode = useCallback(
    async (nodeId: Id<"nodes">) => {
      try {
        await deleteNode({ nodeId });
      } catch (error) {
        console.error("Failed to delete node:", error);
      }
    },
    [deleteNode],
  );

  const getOrder = useCallback((state: Node["state"]) => {
    return state === "red" ? 0 : state === "yellow" ? 1 : 2;
  }, []);

  const sortedNodes = useMemo(() => {
    const nodesCopy = [...nodes];
    nodesCopy.sort((a, b) => {
      const colorDiff = getOrder(a.state) - getOrder(b.state);
      if (colorDiff !== 0) return colorDiff;

      if (a.dueDate && b.dueDate) {
        const dateDiff =
          new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        if (dateDiff !== 0) return dateDiff;
      } else if (a.dueDate && !b.dueDate) {
        return -1;
      } else if (!a.dueDate && b.dueDate) {
        return 1;
      }

      return a.text.localeCompare(b.text);
    });
    return nodesCopy;
  }, [nodes, getOrder]);

  return (
    <div className="space-y-3">
      <div className="flex gap-3">
        <MiddleSection nodes={nodes} />
        <Button
          variant="fancy"
          className="flex-col"
          onClick={() => void addItem()}
        >
          <Plus className="w-5 h-5 -mb-3" />
          <span className="text-xs">⌘+enter</span>
        </Button>
      </div>

      <motion.div layout className="space-y-2">
        <AnimatePresence>
          {sortedNodes.map((node, index) => {
            const prevNodeId = index > 0 ? sortedNodes[index - 1]._id : null;
            const nextNodeId =
              index < sortedNodes.length - 1
                ? sortedNodes[index + 1]._id
                : null;

            return (
              <NodeRow
                key={node._id}
                node={node}
                prevNodeId={prevNodeId}
                nextNodeId={nextNodeId}
                onCycleState={handleStateChange}
                onDelete={handleDeleteNode}
                onAddItem={addItem}
                onSave={handleNodeSave}
                registerTextarea={registerTextarea}
                focusNode={focusNode}
                autoFocus={lastCreatedNodeId === node._id}
                clearPendingFocus={clearPendingFocus}
              />
            );
          })}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
