import { component$, type PropsOf, Slot } from "@qwik.dev/core";

type CarouselNavListProps = PropsOf<"div">;

export const CarouselNavList = component$(
  ({ ...props }: CarouselNavListProps) => {
    return (
      <div {...props} role="tablist">
        <Slot />
      </div>
    );
  }
);
