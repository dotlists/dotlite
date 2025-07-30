import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { Button } from "../ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { Plus } from "lucide-react";
import MiddleSection from "./MiddleSection";
import Node from "./Node";

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

interface BottomSectionProps {
  listId: Id<"lists">;
  nodes: Node[];
}

const getOrder = (state: "red" | "yellow" | "green") =>
  state === "red" ? 0 : state === "yellow" ? 1 : 2;

const sortNodes = (a: Node, b: Node) => {
  const colorDiff = getOrder(a.state) - getOrder(b.state);
  if (colorDiff !== 0) return colorDiff;

  // Due date: null/undefined goes last
  if (a.dueDate && b.dueDate) {
    const dateDiff =
      new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    if (dateDiff !== 0) return dateDiff;
  } else if (a.dueDate && !b.dueDate) {
    return -1;
  } else if (!a.dueDate && b.dueDate) {
    return 1;
  }

  // Alphabetical by text
  return a.text.localeCompare(b.text);
};

const buildTree = (nodes: Node[]): Node[] => {
  const nodeMap = new Map(nodes.map((node) => [node._id, { ...node, children: [] }]));
  const tree: Node[] = [];

  for (const node of nodes) {
    if (node.parent && nodeMap.has(node.parent)) {
      nodeMap.get(node.parent)?.children.push(nodeMap.get(node._id)!);
    } else {
      tree.push(nodeMap.get(node._id)!);
    }
  }

  for (const node of nodeMap.values()) {
    node.children.sort(sortNodes);
  }

  tree.sort(sortNodes);

  return tree;
};

export default function BottomSection({ listId, nodes }: BottomSectionProps) {
  const createNode = useMutation(api.lists.createNode);

  const textareaRefs = useRef<Map<Id<"nodes">, HTMLTextAreaElement>>(new Map());
  const [localTexts, setLocalTexts] = useState<Record<string, string>>({});
  const [lastCreatedNodeId, setLastCreatedNodeId] =
    useState<Id<"nodes"> | null>(null);
  const [localDueDates, setLocalDueDates] = useState<Record<string, string>>(
    {},
  );
  const [datePickerOpen, setDatePickerOpen] = useState<Record<string, boolean>>(
    {},
  );

  // Initialize local texts from nodes, preserving existing local changes
  useEffect(() => {
    const newLocalTexts: Record<string, string> = {};
    const newLocalDueDates: Record<string, string> = {};
    for (const node of nodes) {
      if (!(node._id in localTexts)) {
        newLocalTexts[node._id] = node.text;
      }
      if (!(node._id in localDueDates)) {
        newLocalDueDates[node._id] = node.dueDate ?? "";
      }
    }
    setLocalTexts((prev) => ({ ...prev, ...newLocalTexts }));
    setLocalDueDates((prev) => ({ ...prev, ...newLocalDueDates }));
  }, [nodes, localTexts, localDueDates]);

  // Add item
  const addItem = useCallback(async (parent?: Id<"nodes">) => {
    try {
      const newNodeId = await createNode({
        listId,
        text: "",
        state: "red",
        parent,
      });
      setLastCreatedNodeId(newNodeId);
    } catch (error) {
      console.error("Failed to create node:", error);
    }
  }, [listId, createNode]);

  // Cmd+Enter to add item
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        // Don't create a new item if we're currently focused on a textarea
        const activeElement = document.activeElement;
        if (activeElement && activeElement.tagName === "TEXTAREA") {
          return;
        }
        e.preventDefault();
        void addItem();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [addItem]);

  // Autosize textareas
  useEffect(() => {
    textareaRefs.current.forEach((textarea) => {
      if (textarea) {
        textarea.style.height = "auto";
        textarea.style.height = `${Math.max(32, textarea.scrollHeight)}px`;
      }
    });
  }, [nodes, localTexts]);

  const nodeTree = useMemo(() => buildTree(nodes), [nodes]);

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
          {nodeTree.map((node) => (
            <Node
              key={node._id}
              node={node}
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
        </AnimatePresence>
      </motion.div>
    </div>
  );
}