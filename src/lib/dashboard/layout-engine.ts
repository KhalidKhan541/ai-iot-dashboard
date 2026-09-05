/**
 * Layout engine for dashboard widgets.
 * Provides grid-based layout calculation, drag-and-drop reordering,
 * responsive breakpoints, collision detection, and layout persistence.
 */

// ── Types ────────────────────────────────────────────────────────────────────

export type Breakpoint = "xs" | "sm" | "md" | "lg" | "xl" | "xxl";

export type GridLayoutDirection = "ltr" | "rtl";

export interface GridPosition {
  col: number;
  row: number;
  colSpan: number;
  rowSpan: number;
}

export interface LayoutItem {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  minH?: number;
  maxW?: number;
  maxH?: number;
  static?: boolean;
}

export interface LayoutConfig {
  columns: number;
  rowHeight: number;
  gap: number;
  padding: number;
  containerWidth: number;
  direction: GridLayoutDirection;
  isDraggable: boolean;
  isResizable: boolean;
  allowOverlap: boolean;
  compactType: "vertical" | "horizontal" | "none";
  preventCollision: boolean;
}

export interface ResponsiveBreakpointConfig {
  breakpoint: Breakpoint;
  columns: number;
  minContainerWidth: number;
  rowHeight: number;
  gap: number;
}

export interface LayoutSnapshot {
  id: string;
  name: string;
  breakpoint: Breakpoint;
  items: LayoutItem[];
  createdAt: Date;
}

export interface LayoutTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  items: LayoutItem[];
  previewUrl?: string;
  isBuiltIn: boolean;
  tags: string[];
}

export interface DragEvent {
  itemId: string;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  deltaX: number;
  deltaY: number;
  isDrop: boolean;
}

export interface ResizeEvent {
  itemId: string;
  startW: number;
  startH: number;
  currentW: number;
  currentH: number;
  deltaW: number;
  deltaH: number;
  handle: "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";
  isEnd: boolean;
}

export interface CollisionResult {
  hasCollision: boolean;
  collidingWith: string[];
  suggestedPosition?: GridPosition;
}

// ── Breakpoint Definitions ───────────────────────────────────────────────────

const BREAKPOINT_CONFIGS: ResponsiveBreakpointConfig[] = [
  { breakpoint: "xs", columns: 1, minContainerWidth: 0, rowHeight: 80, gap: 8 },
  { breakpoint: "sm", columns: 2, minContainerWidth: 640, rowHeight: 80, gap: 8 },
  { breakpoint: "md", columns: 4, minContainerWidth: 768, rowHeight: 80, gap: 12 },
  { breakpoint: "lg", columns: 8, minContainerWidth: 1024, rowHeight: 80, gap: 12 },
  { breakpoint: "xl", columns: 12, minContainerWidth: 1280, rowHeight: 80, gap: 16 },
  { breakpoint: "xxl", columns: 16, minContainerWidth: 1536, rowHeight: 80, gap: 16 },
];

const DEFAULT_CONFIG: LayoutConfig = {
  columns: 12,
  rowHeight: 80,
  gap: 16,
  padding: 16,
  containerWidth: 1200,
  direction: "ltr",
  isDraggable: true,
  isResizable: true,
  allowOverlap: false,
  compactType: "vertical",
  preventCollision: true,
};

// ── Layout Engine ────────────────────────────────────────────────────────────

export class LayoutEngine {
  private config: LayoutConfig;
  private items: Map<string, LayoutItem> = new Map();
  private snapshots: LayoutSnapshot[] = [];

  constructor(config: Partial<LayoutConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // ─── Configuration ───────────────────────────────────────────────────

  updateConfig(config: Partial<LayoutConfig>): void {
    this.config = { ...this.config, ...config };
  }

  getConfig(): LayoutConfig {
    return { ...this.config };
  }

  getBreakpoint(containerWidth: number): Breakpoint {
    const sorted = [...BREAKPOINT_CONFIGS].reverse();
    for (const bp of sorted) {
      if (containerWidth >= bp.minContainerWidth) return bp.breakpoint;
    }
    return "xs";
  }

  getBreakpointConfig(breakpoint: Breakpoint): ResponsiveBreakpointConfig {
    return (
      BREAKPOINT_CONFIGS.find((bp) => bp.breakpoint === breakpoint) ??
      BREAKPOINT_CONFIGS[3]
    );
  }

  // ─── Item Management ─────────────────────────────────────────────────

  setItems(items: LayoutItem[]): void {
    this.items.clear();
    for (const item of items) {
      this.items.set(item.id, this.normalizeItem(item));
    }
  }

  getItems(): LayoutItem[] {
    return Array.from(this.items.values());
  }

  getItem(id: string): LayoutItem | undefined {
    return this.items.get(id);
  }

  addItem(item: LayoutItem): LayoutItem {
    const normalized = this.normalizeItem(item);
    this.items.set(normalized.id, normalized);
    return normalized;
  }

  removeItem(id: string): boolean {
    return this.items.delete(id);
  }

  updateItem(id: string, updates: Partial<LayoutItem>): LayoutItem | null {
    const existing = this.items.get(id);
    if (!existing) return null;
    const updated = this.normalizeItem({ ...existing, ...updates });
    this.items.set(id, updated);
    return updated;
  }

  // ─── Grid Calculations ───────────────────────────────────────────────

  getContainerWidth(): number {
    return this.config.containerWidth - this.config.padding * 2;
  }

  getColWidth(): number {
    const totalGap = this.config.gap * (this.config.columns - 1);
    return (this.getContainerWidth() - totalGap) / this.config.columns;
  }

  xToCol(x: number): number {
    return Math.round(x / (this.getColWidth() + this.config.gap));
  }

  colToX(col: number): number {
    return col * (this.getColWidth() + this.config.gap);
  }

  yToRow(y: number): number {
    return Math.round(y / (this.config.rowHeight + this.config.gap));
  }

  rowToY(row: number): number {
    return row * (this.config.rowHeight + this.config.gap);
  }

  getItemPixelSize(item: LayoutItem): { width: number; height: number } {
    return {
      width:
        item.w * this.getColWidth() + (item.w - 1) * this.config.gap,
      height:
        item.h * this.config.rowHeight + (item.h - 1) * this.config.gap,
    };
  }

  getItemPixelPosition(item: LayoutItem): { left: number; top: number } {
    return {
      left: this.colToX(item.x),
      top: this.rowToY(item.y),
    };
  }

  getGridBounds(): { maxCol: number; maxRow: number } {
    let maxCol = this.config.columns;
    let maxRow = 0;
    for (const item of this.items.values()) {
      maxRow = Math.max(maxRow, item.y + item.h);
    }
    return { maxCol, maxRow };
  }

  // ─── Collision Detection ─────────────────────────────────────────────

  checkCollision(
    itemId: string,
    x: number,
    y: number,
    w: number,
    h: number
  ): CollisionResult {
    const collidingWith: string[] = [];

    if (x < 0 || y < 0 || x + w > this.config.columns) {
      return { hasCollision: true, collidingWith: ["boundary"] };
    }

    for (const [id, item] of this.items) {
      if (id === itemId) continue;

      const overlaps =
        x < item.x + item.w &&
        x + w > item.x &&
        y < item.y + item.h &&
        y + h > item.y;

      if (overlaps) collidingWith.push(id);
    }

    return {
      hasCollision: collidingWith.length > 0,
      collidingWith,
      suggestedPosition:
        collidingWith.length > 0
          ? this.findFreePosition(w, h, itemId)
          : undefined,
    };
  }

  private findFreePosition(
    w: number,
    h: number,
    excludeId: string
  ): GridPosition | undefined {
    for (let y = 0; y < 200; y++) {
      for (let x = 0; x <= this.config.columns - w; x++) {
        const result = this.checkCollisionInternal(x, y, w, h, excludeId);
        if (!result.hasCollision) {
          return { col: x, row: y, colSpan: w, rowSpan: h };
        }
      }
    }
    return undefined;
  }

  private checkCollisionInternal(
    x: number,
    y: number,
    w: number,
    h: number,
    excludeId: string
  ): CollisionResult {
    const collidingWith: string[] = [];
    for (const [id, item] of this.items) {
      if (id === excludeId) continue;
      if (
        x < item.x + item.w &&
        x + w > item.x &&
        y < item.y + item.h &&
        y + h > item.y
      ) {
        collidingWith.push(id);
      }
    }
    return { hasCollision: collidingWith.length > 0, collidingWith };
  }

  // ─── Compaction ──────────────────────────────────────────────────────

  compactLayout(direction: "vertical" | "horizontal" = "vertical"): LayoutItem[] {
    const sorted = this.getSortedItems();

    if (direction === "vertical") {
      return this.compactVertical(sorted);
    }
    return this.compactHorizontal(sorted);
  }

  private compactVertical(items: LayoutItem[]): LayoutItem[] {
    const result: LayoutItem[] = [];

    for (const item of items) {
      if (item.static) {
        result.push({ ...item });
        continue;
      }

      let newY = 0;
      while (true) {
        const collision = this.checkCollisionInternal(
          item.x,
          newY,
          item.w,
          item.h,
          item.id
        );
        if (!collision.hasCollision) break;
        newY++;
      }

      result.push({ ...item, y: newY });
    }

    return result;
  }

  private compactHorizontal(items: LayoutItem[]): LayoutItem[] {
    const result: LayoutItem[] = [];

    for (const item of items) {
      if (item.static) {
        result.push({ ...item });
        continue;
      }

      let newX = 0;
      while (true) {
        const collision = this.checkCollisionInternal(
          newX,
          item.y,
          item.w,
          item.h,
          item.id
        );
        if (!collision.hasCollision) break;
        newX++;
        if (newX + item.w > this.config.columns) {
          newX = 0;
          break;
        }
      }

      result.push({ ...item, x: newX });
    }

    return result;
  }

  // ─── Drag Handling ───────────────────────────────────────────────────

  handleDragStart(itemId: string): LayoutItem | null {
    const item = this.items.get(itemId);
    if (!item || item.static) return null;
    return { ...item };
  }

  handleDrag(
    itemId: string,
    deltaX: number,
    deltaY: number
  ): LayoutItem | null {
    const item = this.items.get(itemId);
    if (!item || item.static) return null;

    const newCol = this.xToCol(this.colToX(item.x) + deltaX);
    const newRow = this.yToRow(this.rowToY(item.y) + deltaY);

    const clampedCol = Math.max(0, Math.min(newCol, this.config.columns - item.w));
    const clampedRow = Math.max(0, newRow);

    if (this.config.preventCollision) {
      const collision = this.checkCollision(
        itemId,
        clampedCol,
        clampedRow,
        item.w,
        item.h
      );
      if (collision.hasCollision) return { ...item };
    }

    return { ...item, x: clampedCol, y: clampedRow };
  }

  handleDragEnd(itemId: string, finalX: number, finalY: number): LayoutItem | null {
    const item = this.items.get(itemId);
    if (!item) return null;

    const updated = { ...item, x: finalX, y: finalY };
    this.items.set(itemId, this.normalizeItem(updated));

    if (this.config.compactType === "vertical") {
      this.compactLayout("vertical");
    }

    return this.items.get(itemId) ?? null;
  }

  // ─── Resize Handling ─────────────────────────────────────────────────

  handleResizeStart(itemId: string): LayoutItem | null {
    const item = this.items.get(itemId);
    if (!item || item.static) return null;
    return { ...item };
  }

  handleResize(
    itemId: string,
    deltaW: number,
    deltaH: number,
    handle: ResizeEvent["handle"]
  ): LayoutItem | null {
    const item = this.items.get(itemId);
    if (!item || item.static) return null;

    let newW = item.w;
    let newH = item.h;
    let newX = item.x;
    let newY = item.y;

    if (handle.includes("e")) newW = item.w + deltaW;
    if (handle.includes("w")) {
      newW = item.w - deltaW;
      newX = item.x + deltaW;
    }
    if (handle.includes("s")) newH = item.h + deltaH;
    if (handle.includes("n")) {
      newH = item.h - deltaH;
      newY = item.y + deltaH;
    }

    newW = Math.max(item.minW ?? 1, Math.min(newW, item.maxW ?? this.config.columns));
    newH = Math.max(item.minH ?? 1, Math.min(newH, item.maxH ?? 50));
    newX = Math.max(0, newX);
    newY = Math.max(0, newY);

    if (newX + newW > this.config.columns) {
      newW = this.config.columns - newX;
    }

    if (this.config.preventCollision) {
      const collision = this.checkCollision(itemId, newX, newY, newW, newH);
      if (collision.hasCollision) return { ...item };
    }

    return { ...item, x: newX, y: newY, w: newW, h: newH };
  }

  handleResizeEnd(itemId: string, finalItem: LayoutItem): LayoutItem | null {
    const normalized = this.normalizeItem(finalItem);
    this.items.set(itemId, normalized);
    return normalized;
  }

  // ─── Layout Templates ────────────────────────────────────────────────

  applyTemplate(template: LayoutTemplate, containerWidth?: number): void {
    if (containerWidth) {
      this.config.containerWidth = containerWidth;
      const bp = this.getBreakpoint(containerWidth);
      const bpConfig = this.getBreakpointConfig(bp);
      this.config.columns = bpConfig.columns;
      this.config.rowHeight = bpConfig.rowHeight;
      this.config.gap = bpConfig.gap;
    }

    this.items.clear();
    for (const item of template.items) {
      const normalized = this.normalizeItem(item);
      this.items.set(normalized.id, normalized);
    }
  }

  // ─── Snapshots ───────────────────────────────────────────────────────

  saveSnapshot(name: string, breakpoint: Breakpoint): LayoutSnapshot {
    const snapshot: LayoutSnapshot = {
      id: crypto.randomUUID(),
      name,
      breakpoint,
      items: this.getItems().map((item) => ({ ...item })),
      createdAt: new Date(),
    };
    this.snapshots.push(snapshot);
    return snapshot;
  }

  restoreSnapshot(snapshotId: string): boolean {
    const snapshot = this.snapshots.find((s) => s.id === snapshotId);
    if (!snapshot) return false;
    this.setItems(snapshot.items.map((item) => ({ ...item })));
    return true;
  }

  getSnapshots(): LayoutSnapshot[] {
    return [...this.snapshots];
  }

  deleteSnapshot(snapshotId: string): boolean {
    const index = this.snapshots.findIndex((s) => s.id === snapshotId);
    if (index === -1) return false;
    this.snapshots.splice(index, 1);
    return true;
  }

  // ─── Responsive Layout ───────────────────────────────────────────────

  calculateResponsiveLayout(
    items: LayoutItem[],
    fromBreakpoint: Breakpoint,
    toBreakpoint: Breakpoint
  ): LayoutItem[] {
    const fromConfig = this.getBreakpointConfig(fromBreakpoint);
    const toConfig = this.getBreakpointConfig(toBreakpoint);

    if (fromConfig.columns === toConfig.columns) {
      return items.map((item) => ({ ...item }));
    }

    const scale = toConfig.columns / fromConfig.columns;

    return items.map((item) => {
      const newW = Math.max(
        1,
        Math.min(
          Math.round(item.w * scale),
          toConfig.columns
        )
      );
      const newX = Math.max(
        0,
        Math.min(
          Math.round(item.x * scale),
          toConfig.columns - newW
        )
      );

      return {
        ...item,
        x: newX,
        w: newW,
        minW: item.minW ? Math.max(1, Math.round(item.minW * scale)) : undefined,
        maxW: item.maxW ? Math.min(toConfig.columns, Math.round(item.maxW * scale)) : undefined,
      };
    });
  }

  // ─── Serialization ───────────────────────────────────────────────────

  serialize(): string {
    return JSON.stringify({
      config: this.config,
      items: this.getItems(),
    });
  }

  deserialize(data: string): void {
    const parsed = JSON.parse(data);
    if (parsed.config) this.config = { ...DEFAULT_CONFIG, ...parsed.config };
    if (parsed.items) this.setItems(parsed.items);
  }

  exportLayout(): { config: LayoutConfig; items: LayoutItem[] } {
    return {
      config: { ...this.config },
      items: this.getItems().map((item) => ({ ...item })),
    };
  }

  importLayout(data: { config?: Partial<LayoutConfig>; items?: LayoutItem[] }): void {
    if (data.config) this.updateConfig(data.config);
    if (data.items) this.setItems(data.items);
  }

  // ─── Utilities ───────────────────────────────────────────────────────

  private normalizeItem(item: LayoutItem): LayoutItem {
    return {
      ...item,
      x: Math.max(0, Math.min(item.x, this.config.columns - 1)),
      y: Math.max(0, item.y),
      w: Math.max(1, Math.min(item.w, this.config.columns)),
      h: Math.max(1, item.h),
      minW: item.minW ? Math.max(1, item.minW) : undefined,
      minH: item.minH ? Math.max(1, item.minH) : undefined,
    };
  }

  private getSortedItems(): LayoutItem[] {
    return Array.from(this.items.values()).sort((a, b) => {
      if (a.y !== b.y) return a.y - b.y;
      return a.x - b.x;
    });
  }

  getLayoutHeight(): number {
    let maxBottom = 0;
    for (const item of this.items.values()) {
      maxBottom = Math.max(maxBottom, item.y + item.h);
    }
    return this.rowToY(maxBottom) + this.config.rowHeight;
  }

  getUnusedSpaces(): { x: number; y: number; w: number; h: number }[] {
    const sorted = this.compactLayout("vertical");
    const spaces: { x: number; y: number; w: number; h: number }[] = [];
    const occupied = new Set<string>();

    for (const item of sorted) {
      for (let dy = 0; dy < item.h; dy++) {
        for (let dx = 0; dx < item.w; dx++) {
          occupied.add(`${item.x + dx},${item.y + dy}`);
        }
      }
    }

    const maxRow = this.getGridBounds().maxRow + 5;
    for (let y = 0; y < maxRow; y++) {
      for (let x = 0; x < this.config.columns; x++) {
        if (!occupied.has(`${x},${y}`)) {
          let w = 1;
          while (
            x + w < this.config.columns &&
            !occupied.has(`${x + w},${y}`)
          ) {
            w++;
          }
          spaces.push({ x, y, w, h: 1 });
          for (let dx = 1; dx < w; dx++) {
            occupied.add(`${x + dx},${y}`);
          }
        }
      }
    }

    return spaces;
  }

  findBestPosition(
    w: number,
    h: number,
    preferredX?: number,
    preferredY?: number
  ): GridPosition | undefined {
    if (preferredX !== undefined && preferredY !== undefined) {
      const result = this.checkCollision("temp", preferredX, preferredY, w, h);
      if (!result.hasCollision) {
        return { col: preferredX, row: preferredY, colSpan: w, rowSpan: h };
      }
    }
    return this.findFreePosition(w, h, "temp");
  }
}

// ── Factory ──────────────────────────────────────────────────────────────────

let defaultEngine: LayoutEngine | null = null;

export function getLayoutEngine(config?: Partial<LayoutConfig>): LayoutEngine {
  if (!defaultEngine || config) {
    defaultEngine = new LayoutEngine(config);
  }
  return defaultEngine;
}

export function createLayoutEngine(config?: Partial<LayoutConfig>): LayoutEngine {
  return new LayoutEngine(config);
}
