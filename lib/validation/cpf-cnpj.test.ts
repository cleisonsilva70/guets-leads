import { test } from "node:test";
import assert from "node:assert/strict";
import { isValidCpf, isValidCnpj, isValidCpfOrCnpj } from "./cpf-cnpj";

test("isValidCpf - CPF válido (dígitos verificadores corretos)", () => {
  assert.equal(isValidCpf("529.982.247-25"), true);
});

test("isValidCpf - rejeita todos os dígitos iguais", () => {
  assert.equal(isValidCpf("111.111.111-11"), false);
});

test("isValidCpf - rejeita dígito verificador errado", () => {
  assert.equal(isValidCpf("529.982.247-26"), false);
});

test("isValidCnpj - CNPJ válido (dígitos verificadores corretos)", () => {
  assert.equal(isValidCnpj("11.222.333/0001-81"), true);
});

test("isValidCnpj - rejeita dígito verificador errado", () => {
  assert.equal(isValidCnpj("11.222.333/0001-82"), false);
});

test("isValidCpfOrCnpj - aceita os dois formatos, rejeita tamanho errado", () => {
  assert.equal(isValidCpfOrCnpj("529.982.247-25"), true);
  assert.equal(isValidCpfOrCnpj("11.222.333/0001-81"), true);
  assert.equal(isValidCpfOrCnpj("123"), false);
});
