import { Carousel } from "@qds.dev/ui";
import { component$, useSignal } from "@qwik.dev/core";

export default component$(() => {
  const colors = ["red", "green", "blue", "yellow", "purple", "orange", "pink"];

  const selectedSlide = useSignal("yellow");

  return (
    <Carousel.Root bind:value={selectedSlide}>
      <Carousel.ScrollArea>
        {colors.map((color) => (
          <Carousel.Item
            value={color}
            key={color}
            style={{
              backgroundColor: color,
            }}
          >
            {color}
          </Carousel.Item>
        ))}
      </Carousel.ScrollArea>

      <Carousel.NavList>
        {colors.map((color) => (
          <Carousel.NavTrigger key={color}>{color}</Carousel.NavTrigger>
        ))}
      </Carousel.NavList>

      <p>Selected slide: {selectedSlide.value}</p>
    </Carousel.Root>
  );
});
