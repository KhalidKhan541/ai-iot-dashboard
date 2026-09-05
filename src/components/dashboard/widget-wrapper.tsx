'use client';

import { ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { GripVertical, Maximize2, Minimize2, Edit, Trash2, MoreVertical } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface WidgetWrapperProps {
  title: string;
  children: ReactNode;
  editable?: boolean;
  onEdit?: () => void;
  onRemove?: () => void;
  onFullscreen?: () => void;
}

export function WidgetWrapper({
  title,
  children,
  editable = false,
  onEdit,
  onRemove,
  onFullscreen,
}: WidgetWrapperProps) {
  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center gap-2">
          {editable && (
            <Button variant="ghost" size="icon" className="h-6 w-6 cursor-grab">
              <GripVertical className="h-4 w-4" />
            </Button>
          )}
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
        </div>
        <div className="flex items-center gap-1">
          {onFullscreen && (
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onFullscreen}>
              <Maximize2 className="h-3 w-3" />
            </Button>
          )}
          {editable && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6">
                  <MoreVertical className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onEdit}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onRemove} className="text-destructive">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Remove
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </CardHeader>
      <CardContent className="h-[calc(100%-3rem)]">{children}</CardContent>
    </Card>
  );
}
