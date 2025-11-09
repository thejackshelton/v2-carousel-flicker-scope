import {
  component$,
  createContextId,
  type PropsOf,
  type Signal,
  Slot,
  useComputed$,
  useConstant,
  useContextProvider,
  useId,
  useSignal,
  useTask$,
} from "@qwik.dev/core";
import { getIndexFromValue, getValueFromIndex } from "./carousel-utils";

export const carouselContextId = createContextId<CarouselContext>(
  "qui-carousel-context"
);

export type CarouselContext = {
  // core state
  localId: string;
  scrollAreaRef: Signal<HTMLDivElement | undefined>;
  scrollStartRef: Signal<HTMLDivElement | undefined>;
  nextButtonRef: Signal<HTMLButtonElement | undefined>;
  prevButtonRef: Signal<HTMLButtonElement | undefined>;
  isMouseDragging: Signal<boolean>;
  isMouseWheel: Signal<boolean>;
  itemRefsArray: Signal<Array<Signal>>;
  itemValuesArray: Signal<string[]>;
  navTriggerRefsArray: Signal<Array<Signal>>;
  currentValue: Signal<string>;
  currentIndex: Signal<number>;
  isScroller: Signal<boolean>;
  isAutoplay: Signal<boolean>;

  // derived
  isDraggable: Signal<boolean>;
  itemsPerView: Signal<number>;
  gap: Signal<number>;
  align: Signal<"start" | "center" | "end">;
  isRewind: Signal<boolean>;
  autoPlayIntervalMs: Signal<number>;
  startValue: string;
  sensitivity: Signal<{ mouse: number; touch: number }>;
  move: Signal<number>;
  orientation: Signal<"horizontal" | "vertical">;
  maxItemHeight: Signal<number | undefined>;
  isTitle: Signal<boolean>;
  currItemIndex: number;
  currNavTriggerIndex: number;
  totalItems: Signal<number>;
  validValues: Signal<string[]>;
  validIndexes: Signal<number[]>;
};

export type PublicCarouselRootProps = PropsOf<"div"> & {
  /** The gap between items */
  gap?: number;

  /** Number of items to show at once */
  itemsPerView?: number;

  /** Whether the carousel is draggable */
  draggable?: boolean;

  /** Alignment of items within the viewport */
  align?: "start" | "center" | "end";

  /** Whether the carousel should rewind */
  rewind?: boolean;

  /** Time in milliseconds before the next item plays during autoplay */
  autoPlayIntervalMs?: number;

  /** The sensitivity of the carousel dragging */
  sensitivity?: {
    mouse?: number;
    touch?: number;
  };

  /** The amount of items to move when hitting the next or previous button */
  move?: number;

  /** The carousel's direction */
  orientation?: "horizontal" | "vertical";

  /** The maximum height of the items. Needed in vertical carousels */
  maxItemHeight?: number;

  /** Whether the carousel should support mousewheel navigation */
  mousewheel?: boolean;

  onChange?: (value: string) => void;
};

export const CarouselRoot = component$((props: PublicCarouselRootProps) => {
  const { align: _align, ...rest } = props;

  // core state
  const localId = useId();
  const isTitle = useSignal(false);
  const scrollAreaRef = useSignal<HTMLDivElement>();
  const nextButtonRef = useSignal<HTMLButtonElement>();
  const prevButtonRef = useSignal<HTMLButtonElement>();
  const scrollStartRef = useSignal<HTMLDivElement>();
  const isMouseDragging = useSignal<boolean>(false);
  const itemRefsArray = useSignal<Array<Signal>>([]);
  const itemValuesArray = useSignal<string[]>([]);
  const navTriggerRefsArray = useSignal<Array<Signal>>([]);
  const totalItems = useSignal(0);
  const isInitialLoad = useSignal(true);

  const currItemIndex = 0;
  const currNavTriggerIndex = 0;

  const currentValue = useSignal(0);
  const isAutoplay = useSignal(false);

  const isScroller = useSignal(false);

  // derived
  const isDraggable = useComputed$(() => props.draggable ?? true);
  const itemsPerView = useComputed$(() => props.itemsPerView ?? 1);
  const gap = useComputed$(() => props.gap ?? 0);
  const align = useComputed$(() => props.align ?? "start");
  const isRewind = useComputed$(() => props.rewind ?? false);
  const autoPlayIntervalMs = useComputed$(() => props.autoPlayIntervalMs ?? 0);
  const sensitivity = useComputed$(() => {
    return {
      mouse: props.sensitivity?.mouse ?? 1.5,
      touch: props.sensitivity?.touch ?? 1.25,
    };
  });
  const move = useComputed$(() => props.move ?? 1);
  const maxItemHeight = useComputed$(() => props.maxItemHeight ?? undefined);
  const orientation = useComputed$(() => {
    if (props.maxItemHeight === undefined) {
      return "horizontal";
    }
    return props.orientation ?? "horizontal";
  });
  const isMouseWheel = useComputed$(() => props.mousewheel ?? false);

  const titleId = `${localId}-title`;

  const currentIndex = useComputed$(() => {
    return getIndexFromValue(currentValue.value, itemValuesArray.value);
  });

  const startValue = useConstant(() => currentValue.value);

  const validIndexes = useComputed$(() => {
    const total = totalItems.value;
    const itemsPerViewVal = itemsPerView.value;
    const moveVal = move.value;
    const lastScrollableIndex = total - itemsPerViewVal;

    if (total === 0 || lastScrollableIndex < 0) {
      return [];
    }

    const indexes: number[] = [];

    for (let i = 0; i <= lastScrollableIndex; i += moveVal) {
      indexes.push(i);
    }

    if (lastScrollableIndex % moveVal !== 0) {
      indexes.push(lastScrollableIndex);
    }

    return indexes;
  });

  const validValues = useComputed$(() => {
    if (validIndexes.value.length === 0) return [];
    return validIndexes.value.map((idx) =>
      getValueFromIndex(idx, itemValuesArray.value)
    );
  });

  useTask$(({ track }) => {
    track(() => currentValue.value);

    if (!isInitialLoad.value) {
      props.onChange?.(currentValue.value);
    }

    isInitialLoad.value = false;
  });

  const context: CarouselContext = {
    currItemIndex,
    currNavTriggerIndex,
    totalItems,
    localId,
    scrollAreaRef,
    nextButtonRef,
    prevButtonRef,
    scrollStartRef,
    isMouseDragging,
    isMouseWheel,
    itemRefsArray,
    itemValuesArray,
    navTriggerRefsArray,
    currentValue,
    currentIndex,
    isScroller,
    isAutoplay,
    isDraggable,
    itemsPerView,
    gap,
    align,
    isRewind,
    autoPlayIntervalMs,
    startValue,
    sensitivity,
    move,
    orientation,
    maxItemHeight,
    isTitle,
    validValues,
    validIndexes,
  };

  useContextProvider(carouselContextId, context);

  return (
    <div
      {...rest}
      role="group"
      aria-labelledby={isTitle.value ? titleId : undefined}
      aria-label={!isTitle.value ? `content slideshow` : undefined}
      aria-roledescription="carousel"
      aria-live={isAutoplay.value ? "off" : "polite"}
      ui-qds-carousel-root
      ui-qds-scope
      ui-horizontal={orientation.value === "horizontal"}
      ui-vertical={orientation.value === "vertical"}
      style={{
        "--items-per-view": itemsPerView.value,
        "--gap": `${gap.value}px`,
        "--scroll-snap-align": align.value,
        "--orientation": orientation.value === "vertical" ? "column" : "row",
        "--max-item-height": `${maxItemHeight.value}px`,
      }}
    >
      <Slot />
    </div>
  );
});
