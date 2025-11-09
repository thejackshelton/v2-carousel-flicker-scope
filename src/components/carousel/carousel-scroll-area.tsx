import {
  $,
  component$,
  type PropsOf,
  Slot,
  sync$,
  useContext,
  useOnWindow,
  useSignal,
  useStyles$,
  useTask$,
  useVisibleTask$,
} from "@qwik.dev/core";
import { isServer } from "@qwik.dev/core/build";
import styles from "./carousel.css?inline";
import { carouselContextId } from "./carousel-root";
import { useScroller } from "./hooks/use-scroller";
import { getValueFromIndex } from "./carousel-utils";

export const CarouselScrollArea = component$((props: PropsOf<"div">) => {
  useStyles$(styles);
  const context = useContext(carouselContextId);

  const { onMouseDown$, onTouchStart$, onTouchMove$, onTouchEnd$, ...rest } =
    props;

  const isMouseMoving = useSignal(false);
  const isTouchMoving = useSignal(true);
  const isTouchStart = useSignal(false);
  const initialLoad = useSignal(true);
  const isNewPosOnLoad = useSignal(false);

  const {
    startPos,
    transform,
    boundaries,
    isMouseDown,
    isTouchDevice,
    orientationProps,
    getItemPosition,
    setBoundaries,
    setTransform,
    setTransition,
    setInitialItemPos,
  } = useScroller(context);

  const { direction, pagePosition, clientPosition } =
    orientationProps[context.orientation.value];

  const handleMouseMove = $(async (e: MouseEvent) => {
    if (!isMouseDown.value || startPos.value === undefined) return;
    if (!context.scrollAreaRef.value || !boundaries.value) return;

    const pos = e[pagePosition];
    const dragSpeed = context.sensitivity.value.mouse;
    const walk = (startPos.value - pos) * dragSpeed;
    const newTransform = transform.value[direction] - walk;

    if (
      newTransform >= boundaries.value.min &&
      newTransform <= boundaries.value.max
    ) {
      transform.value[direction] = newTransform;

      await setTransition(false);
      await setTransform();
    }

    startPos.value = pos;
    isMouseMoving.value = true;
  });

  const handleDragSnap = $(async () => {
    if (!context.scrollAreaRef.value) return;

    const items = context.itemRefsArray.value;
    if (items.length === 0) return;

    const currentPosition = -transform.value[direction];
    let closestIndex = 0;
    let minDistance = Infinity;

    for (let i = 0; i < items.length; i++) {
      const item = items[i]?.value as HTMLElement | undefined;
      if (!item) continue;

      const itemPosition = await getItemPosition(i);
      const distance = Math.abs(itemPosition - currentPosition);

      if (distance < minDistance) {
        closestIndex = i;
        minDistance = distance;
      }
    }

    const dragSnapPosition = await getItemPosition(closestIndex);
    await setTransition(true);
    transform.value[direction] = -dragSnapPosition;
    await setTransform();

    context.currentValue.value = getValueFromIndex(
      closestIndex,
      context.itemValuesArray.value
    );
    isMouseDown.value = false;
    isMouseMoving.value = false;
    isTouchMoving.value = false;
    isTouchStart.value = false;
    window.removeEventListener("mousemove", handleMouseMove);
  });

  const handleMouseDown = $(async (e: MouseEvent) => {
    if (!context.isDraggable.value || !context.scrollAreaRef.value) return;

    await setTransition(true);

    if (context.startValue && context.scrollStartRef.value) {
      context.scrollStartRef.value.style.setProperty(
        "--scroll-snap-align",
        "none"
      );
    }

    await setBoundaries();
    isMouseDown.value = true;
    startPos.value = e.pageX;
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleDragSnap);
    isMouseMoving.value = false;
  });

  useTask$(async ({ track }) => {
    track(() => context.currentValue.value);

    if (isMouseMoving.value) {
      isMouseMoving.value = false;
      return;
    }

    if (isTouchDevice.value && isTouchMoving.value) return;

    if (!context.scrollAreaRef.value || isServer) return;

    context.scrollStartRef.value?.style.setProperty(
      "--scroll-snap-align",
      "none"
    );

    if (isMouseDown.value) return;

    const currentIndex = context.currentIndex.value;
    const snapPosition = await getItemPosition(currentIndex);
    await setTransition(true);
    transform.value[direction] = -snapPosition;
    await setTransform();

    window.removeEventListener("mousemove", handleMouseMove);
  });

  const handleResize = $(async () => {
    const isCoarsePointer = window.matchMedia("(pointer: coarse)").matches;

    if (isCoarsePointer) return;

    await setTransition(true);

    if (!context.scrollAreaRef.value) return;

    const newPosition = await getItemPosition(context.currentIndex.value);
    transform.value.x = -newPosition;

    await setTransform();
    context.scrollAreaRef.value.style.transition = "none";
  });

  const handleTouchStart = $(async (e: TouchEvent) => {
    if (!context.isDraggable.value || !context.scrollAreaRef.value) return;

    if (context.startValue && context.scrollStartRef.value) {
      context.scrollStartRef.value.style.setProperty(
        "--scroll-snap-align",
        "none"
      );
    }

    startPos.value = e.touches[0][clientPosition];
    isTouchStart.value = true;
    isTouchMoving.value = false;

    await setBoundaries();
    await setTransition(false);
  });

  const handleTouchMove = $(async (e: TouchEvent) => {
    if (isMouseDown.value || startPos.value === undefined) return;
    if (!context.scrollAreaRef.value || !boundaries.value) return;

    const pos = e.touches[0][clientPosition];
    const dragSpeed = context.sensitivity.value.touch;

    const walk = (startPos.value - pos) * dragSpeed;
    const newTransform = transform.value[direction] - walk;

    if (
      newTransform >= boundaries.value.min &&
      newTransform <= boundaries.value.max
    ) {
      transform.value[direction] = newTransform;
      await setTransform();
    }

    startPos.value = pos;
    isTouchMoving.value = true;
  });

  useOnWindow("resize", handleResize);

  useTask$(() => {
    if (!initialLoad.value) return;
    const startValue = context.startValue;
    const currentValue = context.currentValue.value;
    isNewPosOnLoad.value =
      startValue !== "0" && startValue !== undefined && currentValue !== "0";
  });

  const handleWheel = $((e: WheelEvent) => {
    if (!context.isDraggable.value || !context.scrollAreaRef.value) return;
    if (!context.isMouseWheel.value) return;

    const validValues = context.validValues.value;
    const currentValue = context.currentValue.value;
    const currentPosition = validValues.indexOf(currentValue);
    const direction = e.deltaY > 0 ? 1 : -1;

    // check if in bounds
    const newPosition = Math.max(
      0,
      Math.min(currentPosition + direction, validValues.length - 1)
    );
    context.currentValue.value = validValues[newPosition];
  });

  useTask$(() => {
    initialLoad.value = false;
  });

  // leaving this here for now we can remove later
  useVisibleTask$(() => {
    setInitialItemPos();
  });

  // This only works because we don't need to serialize refs or signals
  let touchStartX = 0;
  let touchStartY = 0;
  let activeCarousel: HTMLElement | null = null;
  let isHorizontal: boolean | null = null;
  let isVertical: boolean | null = null;

  const preventTouchStart = sync$((e: TouchEvent) => {
    const touch = e.touches[0];
    if (!touch) return;

    const target = e.target as HTMLElement;
    activeCarousel = target.closest("[ui-qds-carousel-root]");
    if (!activeCarousel) return;

    isHorizontal = activeCarousel.hasAttribute("ui-horizontal");
    isVertical = activeCarousel.hasAttribute("ui-vertical");
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
  });

  const preventTouchMove = sync$((e: TouchEvent) => {
    if (!activeCarousel || isHorizontal === null || isVertical === null) return;

    const touch = e.touches[0];
    if (!touch) return;

    const deltaX = Math.abs(touch.clientX - touchStartX);
    const deltaY = Math.abs(touch.clientY - touchStartY);

    if (isHorizontal && deltaX > deltaY && deltaX > 5) {
      e.preventDefault();
    } else if (isVertical && deltaY > deltaX && deltaY > 5) {
      e.preventDefault();
    }
  });

  return (
    <div
      ui-qds-carousel-viewport
      onMouseDown$={[handleMouseDown, onMouseDown$]}
      onTouchStart$={[preventTouchStart, handleTouchStart, onTouchStart$]}
      onTouchMove$={[preventTouchMove, handleTouchMove, onTouchMove$]}
      onTouchEnd$={[handleDragSnap, onTouchEnd$]}
      onWheel$={handleWheel}
      preventdefault:wheel={context.isMouseWheel.value}
    >
      <div
        {...rest}
        ref={context.scrollAreaRef}
        ui-qds-carousel-scroll-area
        ui-horizontal={context.orientation.value === "horizontal"}
        ui-vertical={context.orientation.value === "vertical"}
        ui-draggable={context.isDraggable.value ? "" : undefined}
        ui-align={context.align.value}
        ui-initial-touch={isTouchStart.value ? "" : undefined}
        ui-initial={isNewPosOnLoad.value ? "" : undefined}
      >
        <Slot />
      </div>
    </div>
  );
});
