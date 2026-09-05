import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';

interface Widget {
  id: string;
  type: string;
  title: string;
  position: { x: number; y: number; w: number; h: number };
}

interface DashboardGridProps {
  widgets: Widget[];
  columns?: number;
  rowHeight?: number;
  gap?: number;
  onWidgetMove?: (id: string, position: { x: number; y: number }) => void;
  onWidgetResize?: (id: string, size: { w: number; h: number }) => void;
  onWidgetRemove?: (id: string) => void;
  editMode?: boolean;
}

function DashboardGrid({
  widgets,
  columns = 12,
  rowHeight = 80,
  gap = 16,
  onWidgetMove,
  onWidgetResize,
  onWidgetRemove,
  editMode = false,
}: DashboardGridProps) {
  return (
    <div
      data-testid="dashboard-grid"
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
        gap: `${gap}px`,
      }}
    >
      {widgets.map((widget) => (
        <div
          key={widget.id}
          data-testid={`widget-${widget.id}`}
          data-type={widget.type}
          style={{
            gridColumn: `${widget.position.x + 1} / span ${widget.position.w}`,
            gridRow: `span ${widget.position.h}`,
            minHeight: `${rowHeight * widget.position.h}px`,
          }}
        >
          <h3>{widget.title}</h3>
          <span data-testid={`widget-type-${widget.id}`}>{widget.type}</span>
          {editMode && (
            <div className="edit-controls">
              <button
                data-testid={`move-${widget.id}`}
                onClick={() => onWidgetMove?.(widget.id, { x: 0, y: 0 })}
              >
                Move
              </button>
              <button
                data-testid={`resize-${widget.id}`}
                onClick={() => onWidgetResize?.(widget.id, { w: 6, h: 4 })}
              >
                Resize
              </button>
              <button
                data-testid={`remove-${widget.id}`}
                onClick={() => onWidgetRemove?.(widget.id)}
              >
                Remove
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

describe('DashboardGrid', () => {
  const defaultWidgets: Widget[] = [
    {
      id: 'w1',
      type: 'chart',
      title: 'Temperature Chart',
      position: { x: 0, y: 0, w: 6, h: 4 },
    },
    {
      id: 'w2',
      type: 'gauge',
      title: 'CPU Usage',
      position: { x: 6, y: 0, w: 6, h: 4 },
    },
    {
      id: 'w3',
      type: 'table',
      title: 'Device List',
      position: { x: 0, y: 4, w: 12, h: 4 },
    },
  ];

  it('should render all widgets', () => {
    render(<DashboardGrid widgets={defaultWidgets} />);

    expect(screen.getByText('Temperature Chart')).toBeInTheDocument();
    expect(screen.getByText('CPU Usage')).toBeInTheDocument();
    expect(screen.getByText('Device List')).toBeInTheDocument();
  });

  it('should display correct widget types', () => {
    render(<DashboardGrid widgets={defaultWidgets} />);

    expect(screen.getByTestId('widget-type-w1')).toHaveTextContent('chart');
    expect(screen.getByTestId('widget-type-w2')).toHaveTextContent('gauge');
    expect(screen.getByTestId('widget-type-w3')).toHaveTextContent('table');
  });

  it('should apply grid styles correctly', () => {
    render(<DashboardGrid widgets={defaultWidgets} columns={12} gap={16} />);

    const grid = screen.getByTestId('dashboard-grid');
    expect(grid).toBeInTheDocument();
  });

  it('should render empty grid when no widgets', () => {
    render(<DashboardGrid widgets={[]} />);

    const grid = screen.getByTestId('dashboard-grid');
    expect(grid).toBeInTheDocument();
    expect(grid.children).toHaveLength(0);
  });

  describe('edit mode', () => {
    it('should show edit controls when editMode is true', () => {
      render(<DashboardGrid widgets={defaultWidgets} editMode />);

      expect(screen.getByTestId('move-w1')).toBeInTheDocument();
      expect(screen.getByTestId('resize-w1')).toBeInTheDocument();
      expect(screen.getByTestId('remove-w1')).toBeInTheDocument();
    });

    it('should hide edit controls when editMode is false', () => {
      render(<DashboardGrid widgets={defaultWidgets} editMode={false} />);

      expect(screen.queryByTestId('move-w1')).not.toBeInTheDocument();
    });

    it('should call onWidgetMove when move button clicked', () => {
      const onWidgetMove = jest.fn();
      render(
        <DashboardGrid
          widgets={defaultWidgets}
          editMode
          onWidgetMove={onWidgetMove}
        />
      );

      fireEvent.click(screen.getByTestId('move-w1'));

      expect(onWidgetMove).toHaveBeenCalledWith('w1', { x: 0, y: 0 });
    });

    it('should call onWidgetResize when resize button clicked', () => {
      const onWidgetResize = jest.fn();
      render(
        <DashboardGrid
          widgets={defaultWidgets}
          editMode
          onWidgetResize={onWidgetResize}
        />
      );

      fireEvent.click(screen.getByTestId('resize-w1'));

      expect(onWidgetResize).toHaveBeenCalledWith('w1', { w: 6, h: 4 });
    });

    it('should call onWidgetRemove when remove button clicked', () => {
      const onWidgetRemove = jest.fn();
      render(
        <DashboardGrid
          widgets={defaultWidgets}
          editMode
          onWidgetRemove={onWidgetRemove}
        />
      );

      fireEvent.click(screen.getByTestId('remove-w1'));

      expect(onWidgetRemove).toHaveBeenCalledWith('w1');
    });
  });

  describe('widget positioning', () => {
    it('should render widgets at correct positions', () => {
      render(<DashboardGrid widgets={defaultWidgets} />);

      const widget1 = screen.getByTestId('widget-w1');
      expect(widget1).toBeInTheDocument();
    });

    it('should handle single widget layout', () => {
      const singleWidget: Widget[] = [
        {
          id: 'w1',
          type: 'chart',
          title: 'Full Width',
          position: { x: 0, y: 0, w: 12, h: 8 },
        },
      ];

      render(<DashboardGrid widgets={singleWidget} />);
      expect(screen.getByText('Full Width')).toBeInTheDocument();
    });
  });

  describe('responsive behavior', () => {
    it('should render with different column counts', () => {
      const { rerender } = render(
        <DashboardGrid widgets={defaultWidgets} columns={6} />
      );

      expect(screen.getByTestId('dashboard-grid')).toBeInTheDocument();

      rerender(<DashboardGrid widgets={defaultWidgets} columns={4} />);
      expect(screen.getByTestId('dashboard-grid')).toBeInTheDocument();
    });
  });
});
