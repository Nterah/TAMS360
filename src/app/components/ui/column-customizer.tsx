import { useState } from "react";
import { Button } from "./button";
import { Checkbox } from "./checkbox";
import { Label } from "./label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "./dropdown-menu";
import { Settings2 } from "lucide-react";

export interface ColumnConfig {
  id: string;
  label: string;
  visible: boolean;
  required?: boolean; // Cannot be hidden
}

interface ColumnCustomizerProps {
  columns: ColumnConfig[];
  onColumnsChange: (columns: ColumnConfig[]) => void;
}

export function ColumnCustomizer({ columns, onColumnsChange }: ColumnCustomizerProps) {
  const [localColumns, setLocalColumns] = useState(columns);

  const handleToggleColumn = (columnId: string) => {
    const updatedColumns = localColumns.map(col =>
      col.id === columnId ? { ...col, visible: !col.visible } : col
    );
    setLocalColumns(updatedColumns);
    onColumnsChange(updatedColumns);
  };

  const handleShowAll = () => {
    const updatedColumns = localColumns.map(col => ({ ...col, visible: true }));
    setLocalColumns(updatedColumns);
    onColumnsChange(updatedColumns);
  };

  const handleHideAll = () => {
    const updatedColumns = localColumns.map(col => 
      col.required ? col : { ...col, visible: false }
    );
    setLocalColumns(updatedColumns);
    onColumnsChange(updatedColumns);
  };

  const handleReset = () => {
    const resetColumns = columns.map(col => ({ ...col, visible: true }));
    setLocalColumns(resetColumns);
    onColumnsChange(resetColumns);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings2 className="w-4 h-4 mr-2" />
          Columns
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[250px]">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Customize Columns</span>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleReset}
            className="h-6 px-2 text-xs"
          >
            Reset
          </Button>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <div className="px-2 py-1 space-y-1 max-h-[300px] overflow-y-auto">
          {localColumns.map((column) => (
            <div key={column.id} className="flex items-center space-x-2 py-1.5">
              <Checkbox
                id={`column-${column.id}`}
                checked={column.visible}
                disabled={column.required}
                onCheckedChange={() => handleToggleColumn(column.id)}
              />
              <Label
                htmlFor={`column-${column.id}`}
                className="text-sm font-normal cursor-pointer flex-1"
              >
                {column.label}
                {column.required && (
                  <span className="text-xs text-muted-foreground ml-1">(required)</span>
                )}
              </Label>
            </div>
          ))}
        </div>
        <DropdownMenuSeparator />
        <div className="flex gap-2 p-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleShowAll}
            className="flex-1"
          >
            Show All
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleHideAll}
            className="flex-1"
          >
            Hide All
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
