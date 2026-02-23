/**
 * Stub declarations for @shopify/flash-list to avoid type-checking the package's
 * source files, which have compatibility issues with RN 0.81 + React 19.
 * Runtime still uses the real package.
 */
import type { ComponentType, Ref } from "react";

declare module "@shopify/flash-list" {
  export interface FlashListRef<T> {
    scrollToEnd: (opts?: { animated?: boolean }) => void;
    scrollToOffset: (params: { offset: number; animated?: boolean }) => void;
    scrollToIndex: (params: { index: number; animated?: boolean }) => void;
  }

  export interface ListRenderItemInfo<ItemT> {
    item: ItemT;
    index: number;
  }

  export type ListRenderItem<ItemT> = (
    info: ListRenderItemInfo<ItemT>
  ) => React.ReactElement | null;

  export interface FlashListProps<ItemT> {
    data: ReadonlyArray<ItemT>;
    renderItem: ListRenderItem<ItemT>;
    keyExtractor?: (item: ItemT, index: number) => string;
    estimatedItemSize?: number;
    extraData?: unknown;
    [key: string]: unknown;
  }

  export const FlashList: ComponentType<FlashListProps<any>>;
}
