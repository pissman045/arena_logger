import type { RelativeRect } from "../types/battle";

export const sampleImageSize = {
  width: 3840,
  height: 2879,
} as const;

export const extractionRegions = {
  leftRoleIcon: { x: 0.041667, y: 0.312609, width: 0.044271, height: 0.059048 },
  leftResult: { x: 0.09375, y: 0.312609, width: 0.101563, height: 0.066002 },
  leftUserName: { x: 0.325521, y: 0.302188, width: 0.200521, height: 0.027788 },
  leftChar1Name: { x: 0.071615, y: 0.725946, width: 0.061198, height: 0.046891 },
  leftChar1Damage: { x: 0.071615, y: 0.406391, width: 0.061198, height: 0.267454 },
  leftChar2Name: { x: 0.130208, y: 0.725946, width: 0.061198, height: 0.046891 },
  leftChar2Damage: { x: 0.130208, y: 0.406391, width: 0.061198, height: 0.267454 },
  leftChar3Name: { x: 0.188802, y: 0.725946, width: 0.061198, height: 0.046891 },
  leftChar3Damage: { x: 0.188802, y: 0.406391, width: 0.061198, height: 0.267454 },
  leftChar4Name: { x: 0.247396, y: 0.725946, width: 0.061198, height: 0.046891 },
  leftChar4Damage: { x: 0.247396, y: 0.406391, width: 0.061198, height: 0.267454 },
  leftChar5Name: { x: 0.30599, y: 0.725946, width: 0.061198, height: 0.046891 },
  leftChar5Damage: { x: 0.30599, y: 0.406391, width: 0.061198, height: 0.267454 },
  leftChar6Name: { x: 0.364583, y: 0.725946, width: 0.061198, height: 0.046891 },
  leftChar6Damage: { x: 0.364583, y: 0.406391, width: 0.061198, height: 0.267454 },
  rightRoleIcon: { x: 0.539063, y: 0.312609, width: 0.044271, height: 0.059048 },
  rightResult: { x: 0.591146, y: 0.312609, width: 0.101563, height: 0.066002 },
  rightUserName: { x: 0.815104, y: 0.302188, width: 0.200521, height: 0.027788 },
  rightChar1Name: { x: 0.567708, y: 0.725946, width: 0.061198, height: 0.046891 },
  rightChar1Damage: { x: 0.567708, y: 0.406391, width: 0.061198, height: 0.267454 },
  rightChar2Name: { x: 0.626302, y: 0.725946, width: 0.061198, height: 0.046891 },
  rightChar2Damage: { x: 0.626302, y: 0.406391, width: 0.061198, height: 0.267454 },
  rightChar3Name: { x: 0.684896, y: 0.725946, width: 0.061198, height: 0.046891 },
  rightChar3Damage: { x: 0.684896, y: 0.406391, width: 0.061198, height: 0.267454 },
  rightChar4Name: { x: 0.74349, y: 0.725946, width: 0.061198, height: 0.046891 },
  rightChar4Damage: { x: 0.74349, y: 0.406391, width: 0.061198, height: 0.267454 },
  rightChar5Name: { x: 0.802083, y: 0.725946, width: 0.061198, height: 0.046891 },
  rightChar5Damage: { x: 0.802083, y: 0.406391, width: 0.061198, height: 0.267454 },
  rightChar6Name: { x: 0.860677, y: 0.725946, width: 0.061198, height: 0.046891 },
  rightChar6Damage: { x: 0.860677, y: 0.406391, width: 0.061198, height: 0.267454 },
} satisfies Record<string, RelativeRect>;
