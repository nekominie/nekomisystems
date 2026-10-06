import { ref } from 'vue';
import type { ShapeType, BallPresetId } from '../utils/sandboxPhysics';
import type { BallSkin } from '../types/game';

export interface PlacementItem {
  kind: 'shape' | 'ball';
  shapeType?: ShapeType;
  skin?: BallSkin;
  name?: string;
}

// Backwards compatibility alias
export type DraggingItem = PlacementItem;

export const activePlacementItem = ref<PlacementItem | null>(null);

// Physics preset (metal / rubber / plastic) applied to every ball spawned from now on
export const activeBallPreset = ref<BallPresetId>('plastic');

// Alias activeDragItem for any existing references
export const activeDragItem = activePlacementItem;

export function setPlacementItem(item: PlacementItem | null) {
  activePlacementItem.value = item;
}

export function clearPlacementItem() {
  activePlacementItem.value = null;
}

export function setDragItem(item: PlacementItem | null) {
  activePlacementItem.value = item;
}
