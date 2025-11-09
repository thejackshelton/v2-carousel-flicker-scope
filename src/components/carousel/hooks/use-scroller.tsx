import { $, useSignal, useTask$ } from "@qwik.dev/core";
import { CarouselContext } from "../carousel-root";

type OrientationProps = {
  size: "width" | "height";
  scroll: "scrollWidth" | "scrollHeight";
  client: "clientWidth" | "clientHeight";
  direction: "x" | "y";
  pagePosition: "pageX" | "pageY";
  clientPosition: "clientX" | "clientY";
};

export function useScroller(context: CarouselContext) {
  const startPos = useSignal<number>();
  const transform = useSignal({ x: 0, y: 0, z: 0 });
  const boundaries = useSignal<{ min: number; max: number } | null>(null);
  const isMouseDown = useSignal(false);
  const isTouchDevice = useSignal(false);
  const isInitialTransition = useSignal(true);
  const givenTransition = useSignal<string>();

  useTask$(() => {
    context.isScroller.value = true;
  });

  const orientationProps: Record<"vertical" | "horizontal", OrientationProps> = {
    vertical: {
      size: "height",
      scroll: "scrollHeight",
      client: "clientHeight",
      direction: "y",
      pagePosition: "pageY",
      clientPosition: "clientY"
    },
    horizontal: {
      size: "width",
      scroll: "scrollWidth",
      client: "clientWidth",
      direction: "x",
      pagePosition: "pageX",
      clientPosition: "clientX"
    }
  };

  const { direction, scroll, client, size } = orientationProps[context.orientation.value];

  const setTransform = $(() => {
    if (!context.scrollAreaRef.value) return;

    const transformMap = {
      x: (value: number) => `${value}px, 0, 0`,
      y: (value: number) => `0, ${value}px, 0`
    };

    const value = transform.value[direction];

    context.scrollAreaRef.value.style.transform = `translate3d(${transformMap[direction](value)})`;
  });

  const setBoundaries = $(() => {
    if (!context.scrollAreaRef.value) return;

    const maxTransform = 0;
    const minTransform = -(
      context.scrollAreaRef.value[scroll] - context.scrollAreaRef.value[client]
    );
    boundaries.value = { min: minTransform, max: maxTransform };
  });

  const setTransition = $((isEnabled: boolean) => {
    if (!context.scrollAreaRef.value) return;

    if (isInitialTransition.value) {
      givenTransition.value = getComputedStyle(context.scrollAreaRef.value).transition;
      isInitialTransition.value = false;
    }

    context.scrollAreaRef.value.style.transition = isEnabled
      ? (givenTransition.value ?? "revert")
      : "none";
  });

  const getItemPosition = $((index: number) => {
    if (!context.scrollAreaRef.value) return 0;
    const scrollArea = context.scrollAreaRef.value;
    const items = context.itemRefsArray.value;
    let position = 0;

    for (let i = 0; i < index; i++) {
      const item = items[i]?.value as HTMLElement | undefined;
      if (item) {
        const rect = item.getBoundingClientRect();
        position += rect[size as keyof DOMRect] as number;
        position += context.gap.value;
      }
    }

    const alignment = context.align.value;
    const currentItem = items[index]?.value as HTMLElement | undefined;
    if (!currentItem) return 0;
    const currentRect = currentItem.getBoundingClientRect();
    const scrollAreaSize = scrollArea[client as keyof HTMLElement] as number;
    const itemSize = currentRect[size as keyof DOMRect] as number;

    if (alignment === "center") {
      position -= (scrollAreaSize - itemSize) / 2;
    } else if (alignment === "end") {
      position -= scrollAreaSize - itemSize;
    }

    const maxPosition = 0;
    const minPosition = -(scrollArea[scroll] - scrollAreaSize);
    position = Math.max(minPosition, Math.min(maxPosition, -position));

    return Math.abs(position);
  });

  const setInitialItemPos = $(async () => {
    if (!context.scrollAreaRef.value) {
      return;
    }

    context.scrollAreaRef.value.style.transform = "none";

    const scrollLeft = context.scrollAreaRef.value.scrollLeft;
    const scrollTop = context.scrollAreaRef.value.scrollTop;

    transform.value = {
      x: -scrollLeft,
      y: -scrollTop,
      z: transform.value.z
    };

    await setTransition(false);
    await setTransform();
    context.scrollAreaRef.value.style.overflow = "visible";
  });

  return {
    startPos,
    transform,
    boundaries,
    isMouseDown,
    isTouchDevice,
    isInitialTransition,
    setTransform,
    setBoundaries,
    setTransition,
    setInitialItemPos,
    orientationProps,
    getItemPosition
  };
}
