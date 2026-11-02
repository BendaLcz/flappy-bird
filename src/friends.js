// The birds that can be freed in Rescue mode. `colors` has the same shape as a skin's colors,
// so the sprite code draws them with the regular bird painter.

const bird = (body, tail, belly, wing, beak, outline) => ({
  body,
  tail,
  belly,
  wing,
  beak,
  outline,
});

export const FRIENDS = [
  {
    id: "sparrow",
    name: "Sparrow",
    colors: bird(
      "#b5835a",
      "#6b4226",
      "#e8d5b0",
      "#8a5a34",
      "#f2a900",
      "#3a2414",
    ),
  },
  {
    id: "parrot",
    name: "Parrot",
    colors: bird(
      "#3cb44b",
      "#e53935",
      "#b5ecae",
      "#e53935",
      "#ffd23f",
      "#0e3d22",
    ),
  },
  {
    id: "penguin",
    name: "Penguin",
    colors: bird(
      "#2b2f3a",
      "#1c1f27",
      "#ffffff",
      "#1c1f27",
      "#ff9800",
      "#0a0c12",
    ),
  },
  {
    id: "flamingo",
    name: "Flamingo",
    colors: bird(
      "#ff7fa8",
      "#e0457b",
      "#ffd1e0",
      "#e0457b",
      "#3a2b2b",
      "#5a1a30",
    ),
  },
  {
    id: "toucan",
    name: "Toucan",
    colors: bird(
      "#23252b",
      "#111317",
      "#ffffff",
      "#111317",
      "#ff8c00",
      "#050608",
    ),
  },
  {
    id: "owl",
    name: "Owl",
    colors: bird(
      "#a07850",
      "#6e4f2e",
      "#f1e4c8",
      "#6e4f2e",
      "#ffb300",
      "#33210f",
    ),
  },
  {
    id: "duckling",
    name: "Duckling",
    colors: bird(
      "#ffe45c",
      "#f5c400",
      "#fff6b0",
      "#f5c400",
      "#ff8a00",
      "#5a4500",
    ),
  },
  {
    id: "hummingbird",
    name: "Hummingbird",
    colors: bird(
      "#2bbfa6",
      "#7e57c2",
      "#b7f5ea",
      "#7e57c2",
      "#2b2b3a",
      "#0b3b34",
    ),
  },
];

export const findFriend = (id) => FRIENDS.find((f) => f.id === id);
