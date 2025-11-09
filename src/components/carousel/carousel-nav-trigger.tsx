import {
  $,
  component$,
  PropsOf,
  Slot,
  sync$,
  useComputed$,
  useConstant,
  useContext,
  useSignal,
  useTask$,
} from "@qwik.dev/core";
import { carouselContextId } from "./carousel-root";
import { getValueFromIndex } from "./carousel-utils";

type NavTriggerProps = PropsOf<"button">;

export const CarouselNavTrigger = component$((props: NavTriggerProps) => {
  const context = useContext(carouselContextId);
  const navTriggerRef = useSignal<HTMLButtonElement>();
  const index = useConstant(() => {
    const currNavTriggerIndex = context.currNavTriggerIndex;
    context.currNavTriggerIndex++;
    return currNavTriggerIndex;
  });
  const itemId = `${context.localId}-${index ?? -1}`;

  useTask$(() => {
    if (index === undefined) {
      throw new Error("QDS: Carousel NavTrigger cannot find its proper index.");
    }

    context.navTriggerRefsArray.value[index] = navTriggerRef;
  });

  const itemValue = useComputed$(() => {
    return getValueFromIndex(index, context.itemValuesArray.value);
  });

  const handleClick$ = $(() => {
    context.currentValue.value = itemValue.value;
  });

  const handleFocus$ = $(() => {
    context.currentValue.value = itemValue.value;
  });

  const handleKeyDownSync$ = sync$((e: KeyboardEvent) => {
    if (e.key === "Home" || e.key === "End") {
      e.preventDefault();
    }
  });

  const handleKeyDown$ = $((e: KeyboardEvent) => {
    const usedKeys = ["ArrowRight", "ArrowLeft", "Home", "End"];
    if (!usedKeys.includes(e.key)) return;

    const validValues = context.validValues.value;
    const validIdxs = context.validIndexes.value;
    const lastScrollableValue = validValues[validValues.length - 1];
    const lastScrollableIndex = validIdxs[validIdxs.length - 1];

    if (e.key === "Home") {
      context.currentValue.value = validValues[0];
      const navTriggerRef = context.navTriggerRefsArray.value[validIdxs[0]]
        ?.value as HTMLButtonElement | undefined;
      navTriggerRef?.focus();
      return;
    }

    if (e.key === "End") {
      context.currentValue.value = lastScrollableValue;
      const navTriggerRef = context.navTriggerRefsArray.value[
        lastScrollableIndex
      ]?.value as HTMLButtonElement | undefined;
      navTriggerRef?.focus();
      return;
    }

    const direction = e.key === "ArrowRight" ? 1 : -1;
    const currentPosition = validIdxs.indexOf(index);
    let newPosition = currentPosition + direction;

    if (context.isRewind.value) {
      newPosition = (newPosition + validIdxs.length) % validIdxs.length;
    } else {
      newPosition = Math.max(0, Math.min(newPosition, validIdxs.length - 1));
    }

    const newValue = validValues[newPosition];
    context.currentValue.value = newValue;
    const navTriggerRef = context.navTriggerRefsArray.value[
      validIdxs[newPosition]
    ]?.value as HTMLButtonElement | undefined;
    navTriggerRef?.focus();
  });

  const isRendered = useComputed$(() => {
    if (context.totalItems.value === 0) return false;
    const validIdxs = context.validIndexes.value;
    return validIdxs.includes(index);
  });

  const isActiveNavTrigger = useComputed$(() => {
    if (!context.validIndexes.value.includes(index)) return false;
    const currentIndex = context.currentIndex.value;
    const validIdxs = context.validIndexes.value;
    const currentPosition = validIdxs.indexOf(index);
    const nextNavTriggerIndex = validIdxs[currentPosition + 1];
    return (
      currentIndex >= index &&
      (nextNavTriggerIndex === undefined || currentIndex < nextNavTriggerIndex)
    );
  });

  return (
    <button
      {...props}
      ref={navTriggerRef}
      role="tab"
      hidden={!isRendered.value}
      tabIndex={context.currentValue.value === itemValue.value ? 0 : -1}
      aria-label={`Slide ${index + 1}`}
      aria-controls={itemId}
      ui-current={isActiveNavTrigger.value ? "" : undefined}
      aria-selected={isActiveNavTrigger.value}
      onClick$={[handleClick$, props.onClick$]}
      onFocus$={[handleFocus$, props.onFocus$]}
      onKeyDown$={[handleKeyDownSync$, handleKeyDown$, props.onKeyDown$]}
    >
      <Slot />
    </button>
  );
});
