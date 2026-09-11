import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeWhatsapp, isValidBrazilianWhatsapp, buildWhatsappLink } from "./whatsapp";

test("normalizeWhatsapp - formato local com máscara vira internacional", () => {
  assert.equal(normalizeWhatsapp("(84) 99999-8888"), "5584999998888");
});

test("normalizeWhatsapp - já vem com DDI 55", () => {
  assert.equal(normalizeWhatsapp("55 84 99999-8888"), "5584999998888");
});

test("normalizeWhatsapp - fixo sem o 9", () => {
  assert.equal(normalizeWhatsapp("(84) 3333-8888"), "558433338888");
});

test("isValidBrazilianWhatsapp - números válidos", () => {
  assert.equal(isValidBrazilianWhatsapp("(84) 99999-8888"), true);
  assert.equal(isValidBrazilianWhatsapp("5584999998888"), true);
});

test("isValidBrazilianWhatsapp - números inválidos", () => {
  assert.equal(isValidBrazilianWhatsapp("123"), false);
  assert.equal(isValidBrazilianWhatsapp(""), false);
});

test("buildWhatsappLink - monta URL wa.me com mensagem codificada", () => {
  const link = buildWhatsappLink("5584999998888", "Olá Ana!");
  assert.equal(link, "https://wa.me/5584999998888?text=Ol%C3%A1%20Ana!");
});
