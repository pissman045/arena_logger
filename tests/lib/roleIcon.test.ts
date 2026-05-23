import { describe, expect, it } from "vitest";
import { inferBattleRoles } from "../../src/lib/roleIcon";

describe("inferBattleRoles", () => {
  it("assigns attack to the left side when the global score is lower", () => {
    const result = inferBattleRoles({
      leftAttackScore: 0.1,
      leftDefenseScore: 0.4,
      rightAttackScore: 0.5,
      rightDefenseScore: 0.2,
    });

    expect(result).toMatchObject({
      leftRole: "attack",
      rightRole: "defense",
    });
    expect(result.attackLeftTotalScore).toBeCloseTo(0.3);
    expect(result.defenseLeftTotalScore).toBeCloseTo(0.9);
  });

  it("assigns defense to the left side when the mirrored pairing is better", () => {
    const result = inferBattleRoles({
      leftAttackScore: 0.6,
      leftDefenseScore: 0.2,
      rightAttackScore: 0.1,
      rightDefenseScore: 0.7,
    });

    expect(result).toMatchObject({
      leftRole: "defense",
      rightRole: "attack",
    });
    expect(result.attackLeftTotalScore).toBeCloseTo(1.3);
    expect(result.defenseLeftTotalScore).toBeCloseTo(0.3);
  });
});
