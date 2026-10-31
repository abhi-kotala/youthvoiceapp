import { describe, expect, it } from "vitest";
import { quickCheck } from "./moderation.server";

describe("moderation keyword screen", () => {
  it("lets serious civic topics with everyday words reach the AI review", () => {
    expect(quickCheck("Should schools improve sex education?")).toBeNull();
    expect(quickCheck("Is the budget plan nuts? Cut the butt-numbing bus rides")).toBeNull();
    expect(quickCheck('Protesters chanted "kill them all" — should the city respond?')).toBeNull();
  });

  it("still blocks crude posts like the earlier Rambo ones", () => {
    expect(quickCheck("should rambo lick its balls")?.allowed).toBe(false);
    expect(quickCheck("Should Rambo twerk it on Friday's")?.allowed).toBe(false);
  });

  it("still blocks direct threats and slurs", () => {
    expect(quickCheck("I will kill you")?.allowed).toBe(false);
    expect(quickCheck("kys")?.allowed).toBe(false);
    expect(quickCheck("you are a bitch")?.allowed).toBe(false);
  });
});
