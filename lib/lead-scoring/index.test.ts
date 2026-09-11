import { test } from "node:test";
import assert from "node:assert/strict";
import { calculateLeadScore, classifyLeadScore } from "./index";

test("calculateLeadScore soma os quatro pesos", () => {
  const score = calculateLeadScore({
    segment: "fitness", // 20
    salesChannel: "physical_store", // 20
    investmentRange: "r1200_2000", // 10
    purchaseFrequency: "weekly", // 20
  });
  assert.equal(score, 70);
});

test("calculateLeadScore - pior cenário possível", () => {
  const score = calculateLeadScore({
    segment: "not_selling_yet", // 5
    salesChannel: "whatsapp", // 10
    investmentRange: "r1200_2000", // 10
    purchaseFrequency: "first_purchase", // 5
  });
  assert.equal(score, 30);
});

test("classifyLeadScore - limites das faixas (seção 26 do briefing)", () => {
  assert.equal(classifyLeadScore(70), "hot");
  assert.equal(classifyLeadScore(69), "qualified");
  assert.equal(classifyLeadScore(40), "qualified");
  assert.equal(classifyLeadScore(39), "beginner");
  assert.equal(classifyLeadScore(0), "beginner");
  assert.equal(classifyLeadScore(120), "hot");
});
