import { useState, useRef, useEffect, useCallback } from 'react';
import { useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { Id } from '../../../convex/_generated/dataModel';
import { Textarea } from '../ui/textarea';
import { Button } from '../ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus } from 'lucide-react';

type Node = {
  _id: Id<'nodes'>;
  _creationTime: number;
  text: string;
  state: 'red' | 'yellow' | 'green';
  listId: Id<'lists'>;
  order: number;
};

interface BottomSectionProps {
  listId: Id<'lists'>;
  nodes: Node[];
}

export default function BottomSection({ listId, nodes }: BottomSectionProps) {
  const createNode = useMutation(api.lists.createNode);
  const updateNodeText = useMutation(api.lists.updateNodeText);
  const updateNodeState = useMutation(api.lists.updateNodeState);
  const deleteNode = useMutation(api.lists.deleteNode);

  const textareaRefs = useRef<(HTMLTextAreaElement | null)[]>([]);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [focusedIdx, setFocusedIdx] = useState<number | null>(null);
  const [localTexts, setLocalTexts] = useState<Record<string, string>>({});

  // Initialize local texts from nodes
  useEffect(() => {
    const newLocalTexts: Record<string, string> = {};
    nodes.forEach(node => {
      newLocalTexts[node._id] = node.text;
    });
    setLocalTexts(newLocalTexts);
  }, [nodes]);

  // Add item
  const addItem = useCallback(async () => {
    try {
      await createNode({
        listId,
        text: "",
        state: 'red',
      });
      setTimeout(() => {
        textareaRefs.current[nodes.length]?.focus();
      }, 100);
    } catch (error) {
      console.error('Failed to create node:', error);
    }
  }, [listId, createNode, nodes.length]);

  // Cmd+Enter to add item
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        void addItem();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [addItem]);

  // Autosize textareas
  useEffect(() => {
    textareaRefs.current.forEach((textarea) => {
      if (textarea) {
        textarea.style.height = 'auto';
        textarea.style.height = `${Math.max(32, textarea.scrollHeight)}px`;
      }
    });
  }, [nodes, localTexts]);

  const handleTextChange = (nodeId: Id<'nodes'>, newText: string) => {
    setLocalTexts(prev => ({
      ...prev,
      [nodeId]: newText
    }));
  };

  const handleTextBlur = async (node: Node, newText: string) => {
    const trimmed = newText.trim();
    if (trimmed === "") {
      try {
        await deleteNode({ nodeId: node._id });
      } catch (error) {
        console.error('Failed to delete node:', error);
      }
    } else if (trimmed !== node.text) {
      try {
        await updateNodeText({
          nodeId: node._id,
          text: trimmed,
        });
      } catch (error) {
        console.error('Failed to update node text:', error);
      }
    }
  };

  const handleStateChange = async (nodeId: Id<'nodes'>, currentState: 'red' | 'yellow' | 'green', pushForward: number) => {
    let nextState = currentState === 'red' ? 'yellow' : currentState === 'yellow' ? 'green' : 'red';
    if (pushForward > 1) {
      nextState = nextState === 'red' ? 'yellow' : nextState === 'yellow' ? 'green' : 'red';
    }
    try {
      await updateNodeState({
        nodeId,
        state: nextState as 'red' | 'yellow' | 'green',
      });
    } catch (error) {
      console.error('Failed to update node state:', error);
    }
  };

  const handleDeleteNode = async (nodeId: Id<'nodes'>) => {
    try {
      await deleteNode({ nodeId });
    } catch (error) {
      console.error('Failed to delete node:', error);
    }
  };

  // Animation order
  const getOrder = (state: 'red' | 'yellow' | 'green') =>
    state === 'red' ? 0 : state === 'yellow' ? 1 : 2;
  const sortedNodes = [...nodes].sort((a, b) => getOrder(a.state) - getOrder(b.state));

  return (
    <div className="space-y-3">
      <Button
        variant="fancy"
        className="w-full"
        onClick={() => void addItem()}
      >
        <Plus className="w-4 h-4 mr-2" />
        Add item (⌘+Enter)
      </Button>

      <motion.div layout className="space-y-2">
        <AnimatePresence>
          {sortedNodes.map((node) => {
            const index = nodes.findIndex((n) => n._id === node._id);
            const localText = localTexts[node._id] ?? node.text;

            return (
              <motion.div
                key={node._id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="flex items-start gap-3"
                onMouseEnter={() => setHoveredIdx(index)}
                onMouseLeave={() => setHoveredIdx(null)}
              >
                <div
                  className={`
                    rounded-full w-6 h-6 shrink-0 mb-auto transition-all duration-200 cursor-pointer
                    ${node.state === 'red' ? 'bg-destructive' : ''}
                    ${node.state === 'yellow' ? 'bg-yellow-500' : ''}
                    ${node.state === 'green' ? 'bg-green-500' : ''}
                  `}
                  onClick={() => void handleStateChange(node._id, node.state, 1)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    void handleStateChange(node._id, node.state, 2);
                  }}
                />

                <Textarea
                  value={localText}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleTextChange(node._id, e.target.value)}
                  className="my-auto p-0 border-0 text-base bg-transparent placeholder:text-gray"
                  rows={1}
                  placeholder="Add a task..."
                  style={{
                    minHeight: '32px',
                    height: '32px',
                    resize: 'none',
                    overflowY: 'hidden'
                  }}
                  ref={(el: HTMLTextAreaElement | null) => {
                    textareaRefs.current[index] = el;
                  }}
                  onInput={(e: React.FormEvent<HTMLTextAreaElement>) => {
                    const textarea = e.currentTarget;
                    textarea.style.height = 'auto';
                    textarea.style.height = `${Math.max(32, textarea.scrollHeight)}px`;
                  }}
                  onFocus={() => setFocusedIdx(index)}
                  onBlur={(e: React.FocusEvent<HTMLTextAreaElement>) => {
                    setFocusedIdx(null);
                    void handleTextBlur(node, e.currentTarget.value);
                  }}
                  onKeyDown={(e: React.KeyboardEvent<HTMLTextAreaElement>) => {
                    const textarea = e.currentTarget;
                    if (
                      e.key === 'Backspace' &&
                      textarea.value === ''
                    ) {
                      e.preventDefault();
                      void handleDeleteNode(node._id);
                      setTimeout(() => {
                        if (index > 0) {
                          textareaRefs.current[index - 1]?.focus();
                        } else if (nodes.length > 1) {
                          textareaRefs.current[1]?.focus();
                        }
                      }, 0);
                      return;
                    }
                    if (
                      e.key === 'ArrowUp' &&
                      textarea.selectionStart === 0 &&
                      textarea.selectionEnd === 0 &&
                      index > 0
                    ) {
                      e.preventDefault();
                      textareaRefs.current[index - 1]?.focus();
                    }
                    if (
                      e.key === 'ArrowDown' &&
                      textarea.selectionStart === textarea.value.length &&
                      textarea.selectionEnd === textarea.value.length &&
                      index < nodes.length - 1
                    ) {
                      const value = textarea.value;
                      const beforeCaret = value.slice(0, textarea.selectionStart);
                      if (
                        beforeCaret.split('\n').length === value.split('\n').length
                      ) {
                        e.preventDefault();
                        textareaRefs.current[index + 1]?.focus();
                      }
                    }
                  }}
                />

                {((focusedIdx === null && hoveredIdx === index) || focusedIdx === index) && (
                  <Button
                    size="icon"
                    variant="destructive"
                    className="w-6 h-6 shrink-0 mt-0.5 opacity-70 hover:opacity-100"
                    onClick={() => void handleDeleteNode(node._id)}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
