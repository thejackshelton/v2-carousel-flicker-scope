import {
  $,
  component$,
  type PropsOf,
  Slot,
  useComputed$,
  useConstant,
  useContext,
  useSignal,
  useTask$,
} from "@qwik.dev/core";
import { carouselContextId } from "./carousel-root";

export type CarouselItemProps = PropsOf<"div"> & {
  /** The value for this carousel item. Defaults to string index if not provided. */
  value?: string;
};

export const CarouselItem = component$((props: CarouselItemProps) => {
  const context = useContext(carouselContextId);
  const itemRef = useSignal<HTMLDivElement | undefined>();
  const { value: givenValue, ...rest } = props;

  const index = useConstant(() => {
    const currItemIndex = context.currItemIndex;
    context.currItemIndex++;
    return currItemIndex;
  });

  const itemValue = useConstant(() => {
    return givenValue ?? String(index);
  });

  const itemId = `${context.localId}-${itemValue}`;

  const isVisible = useComputed$(() => {
    const currentIdx = context.currentIndex.value;
    const start = currentIdx;
    const end = start + context.itemsPerView.value;
    return index !== undefined && index >= start && index < end;
  });

  const isActive = useComputed$(() => {
    return context.currentValue.value === itemValue;
  });

  const isInactive = useComputed$(() => {
    return !context.isScroller.value && !isActive.value;
  });

  useTask$(function getIndexOrder() {
    if (index === undefined) {
      throw new Error("QDS: Carousel Item cannot find its proper index.");
    }

    context.itemRefsArray.value[index] = itemRef;

    const newValuesArray = [...context.itemValuesArray.value];
    if (newValuesArray.length <= index) {
      while (newValuesArray.length <= index) {
        newValuesArray.push(String(newValuesArray.length));
      }
    }
    newValuesArray[index] = itemValue;
    context.itemValuesArray.value = newValuesArray;
  });

  const handleFocusIn$ = $(() => {
    context.isAutoplay.value = false;
  });

  useTask$(({ track }) => {
    track(() => context.itemRefsArray.value);
    const totalItems = context.itemRefsArray.value.length;
    context.totalItems.value = totalItems;
  });

  return (
    <>
      <ScrollMarker align="start" index={index} value={itemValue} />
      <div
        {...rest}
        ref={itemRef}
        id={itemId}
        inert={!isVisible.value}
        hidden={isInactive.value}
        aria-roledescription="slide"
        role={
          context.navTriggerRefsArray.value.length > 0 ? "tabpanel" : undefined
        }
        ui-qds-carousel-item
        ui-qds-scope
        ui-current={isVisible.value ? "" : undefined}
        aria-label={`${index + 1} of ${context.totalItems.value}`}
        onFocusIn$={[handleFocusIn$, rest.onFocusIn$]}
      >
        <Slot />
        <ScrollMarker align="center" index={index} value={itemValue} />
      </div>
      <ScrollMarker align="end" index={index} value={itemValue} />
    </>
  );
});

type ScrollMarkerProps = PropsOf<"div"> & {
  align: "start" | "center" | "end";
  index: number;
  value: string;
};

const ScrollMarker = component$((props: ScrollMarkerProps) => {
  const context = useContext(carouselContextId);

  const { align, index, value, ...rest } = props;

  const isVisible = useComputed$(
    () =>
      context.startValue === value &&
      context.currentIndex.value === index &&
      context.align.value === align
  );

  return (
    <div
      ref={context.scrollStartRef}
      ui-qds-scroll-start
      hidden={!isVisible.value}
      {...{ [`ui-${align}`]: "" }}
      {...rest}
    />
  );
});
