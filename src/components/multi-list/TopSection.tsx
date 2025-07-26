import { useState, useEffect } from 'react';
import { useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { Id } from '../../../convex/_generated/dataModel';
import { Button } from '../ui/button';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from '../ui/dropdown-menu';
import { ChevronDown, Plus, Trash2, GripVertical } from 'lucide-react';

type List = {
  _id: Id<'lists'>;
  _creationTime: number;
  name: string;
  userId: Id<'users'>;
  order: number;
};

interface TopSectionProps {
  lists: List[];
  selectedList: List;
  setSelectedListId: (id: Id<'lists'>) => void;
}

export default function TopSection({ lists, selectedList, setSelectedListId }: TopSectionProps) {
  const updateListName = useMutation(api.lists.updateListName);
  const createList = useMutation(api.lists.createList);
  const deleteList = useMutation(api.lists.deleteList);
  const reorderLists = useMutation(api.lists.reorderLists);

  const [listName, setListName] = useState(selectedList.name);
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  // Update local state when selected list changes
  useEffect(() => {
    setListName(selectedList.name);
  }, [selectedList.name]);

  const handleListNameChange = async (newName: string) => {
    setListName(newName);
    try {
      await updateListName({
        listId: selectedList._id,
        name: newName,
      });
    } catch (error) {
      console.error('Failed to update list name:', error);
    }
  };

  const handleCreateList = async () => {
    try {
      const newListId = await createList({ name: 'New List' });
      setSelectedListId(newListId);
      setTimeout(() => {
        const input = document.getElementById('list-name-input');
        if (input) {
          (input as HTMLInputElement).focus();
          (input as HTMLInputElement).select();
        }
      }, 100);
    } catch (error) {
      console.error('Failed to create list:', error);
    }
  };

  const handleDeleteList = async () => {
    if (lists.length === 1) {
      window.alert("You must have at least one list.");
      return;
    }
    const confirmed = window.confirm(
      `Are you sure you want to delete "${selectedList.name}"? This cannot be undone.`
    );
    if (confirmed) {
      try {
        await deleteList({ listId: selectedList._id });
      } catch (error) {
        console.error('Failed to delete list:', error);
      }
    }
  };

  const handleReorderLists = async (fromIdx: number, toIdx: number) => {
    const reorderedLists = [...lists];
    const [removed] = reorderedLists.splice(fromIdx, 1);
    reorderedLists.splice(toIdx, 0, removed);

    try {
      await reorderLists({
        listIds: reorderedLists.map(list => list._id),
      });
    } catch (error) {
      console.error('Failed to reorder lists:', error);
    }
  };

  return (
    <div className="relative flex items-center gap-2">
      <input
        id="list-name-input"
        className="!text-3xl border-none outline-none w-full bg-transparent p-2 font-serif placeholder:text-gray-500"
        value={listName}
        onChange={e => setListName(e.target.value)}
        onBlur={e => void handleListNameChange(e.target.value)}
        placeholder="list name goes here"
      />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="shrink-0">
            <ChevronDown className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <div className="px-2 py-1.5 text-sm font-semibold text-muted-foreground">
            Switch List
          </div>
          <DropdownMenuSeparator />

          {lists.map((list, idx) => (
            <DropdownMenuItem
              key={list._id}
              onClick={() => setSelectedListId(list._id)}
              className={`
                flex items-center justify-between cursor-pointer
                my-1.5
                ${selectedList._id === list._id ? 'bg-accent font-medium' : ''}
                ${dragOverIdx === idx && draggedIdx !== null && draggedIdx !== idx ? 'bg-accent/50' : ''}
              `}
              draggable
              onDragStart={(e: React.DragEvent) => {
                setDraggedIdx(idx);
                e.dataTransfer.effectAllowed = 'move';
              }}
              onDragOver={(e: React.DragEvent) => {
                e.preventDefault();
                setDragOverIdx(idx);
              }}
              onDrop={(e: React.DragEvent) => {
                e.preventDefault();
                if (draggedIdx !== null && draggedIdx !== idx) {
                  void handleReorderLists(draggedIdx, idx);
                }
                setDraggedIdx(null);
                setDragOverIdx(null);
              }}
              onDragEnd={() => {
                setDraggedIdx(null);
                setDragOverIdx(null);
              }}
              style={{
                opacity: draggedIdx === idx ? 0.5 : 1,
                userSelect: 'none',
              }}
            >
              <span className="flex-1 truncate">
                {list.name || <span className="italic text-muted-foreground">Untitled</span>}
              </span>
              <GripVertical className="w-4 h-4 text-muted-foreground/50" />
            </DropdownMenuItem>
          ))}

          <DropdownMenuSeparator />

          <DropdownMenuItem onClick={() => void handleCreateList()} className="text-sm">
            <Plus className="w-4 h-4 mr-2" />
            Create New List
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={() => void handleDeleteList()}
            className="text-sm text-destructive focus:text-destructive h-10"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete Current List
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
