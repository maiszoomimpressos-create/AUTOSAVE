// Fixtures so no codigo do teste (nenhum dado no banco). Rotulos no formato real do Google/Nominatim.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  parseBrazilianAddress,
  fromGoogleComponents,
  fromNominatimAddress,
  mergeAddress,
  normalizeStreet,
  parseAddressQuery,
  isAddressQuery,
  dedupePlaces,
} from "../src/lib/places-address.ts";

test("endereco completo do Google", () => {
  assert.deepEqual(parseBrazilianAddress("Av. Assunção, 1757 - Alto Alegre, Cascavel - PR, 85805-030"), {
    street: "Av. Assunção", street_number: "1757", neighborhood: "Alto Alegre", city: "Cascavel", state: "PR", postal_code: "85805-030",
  });
});

test("rua sem numero", () => {
  const a = parseBrazilianAddress("Av. Assunção - Alto Alegre, Cascavel - PR, 85805-030");
  assert.equal(a.street, "Av. Assunção");
  assert.equal(a.street_number, null);
  assert.equal(a.neighborhood, "Alto Alegre");
});

test("complemento antes da rua (sala/box)", () => {
  const a = parseBrazilianAddress("SALAS 36 & 37 - Av. Assunção, 1757 - Centro, Cascavel - PR, 85700-000");
  assert.equal(a.street, "Av. Assunção");
  assert.equal(a.street_number, "1757");
  assert.equal(a.neighborhood, "Centro");
  assert.equal(a.city, "Cascavel");
});

test("so cidade/UF/CEP", () => {
  assert.deepEqual(parseBrazilianAddress("Casca - RS, 99260-000"), {
    street: null, street_number: null, neighborhood: null, city: "Casca", state: "RS", postal_code: "99260-000",
  });
});

test("so bairro + cidade, com Brasil no fim", () => {
  const a = parseBrazilianAddress("Centro, Francisco Beltrão - PR, 85605-060, Brasil");
  assert.equal(a.neighborhood, "Centro");
  assert.equal(a.city, "Francisco Beltrão");
  assert.equal(a.street, null);
});

test("componentes do Google tem prioridade e o texto completa", () => {
  const comp = fromGoogleComponents([
    { longText: "Rua Exemplo", types: ["route"] },
    { longText: "45", types: ["street_number"] },
    { longText: "Paraná", shortText: "PR", types: ["administrative_area_level_1"] },
  ]);
  const a = mergeAddress(comp, parseBrazilianAddress("R. Exemplo, 45 - Vila, Cidade X - PR, 85000-000"));
  assert.equal(a.street, "Rua Exemplo");
  assert.equal(a.state, "PR");
  assert.equal(a.neighborhood, "Vila");
  assert.equal(a.postal_code, "85000-000");
});

test("endereco do Nominatim (addressdetails)", () => {
  const a = fromNominatimAddress({ road: "Rua Damasco", house_number: "10", suburb: "Bairro Y", town: "Cidade Z", "ISO3166-2-lvl4": "BR-PR", postcode: "85601-000" });
  assert.deepEqual(a, { street: "Rua Damasco", street_number: "10", neighborhood: "Bairro Y", city: "Cidade Z", state: "PR", postal_code: "85601-000" });
});

test("rua normalizada: abreviacoes e acentos", () => {
  assert.equal(normalizeStreet("Av. Assunção"), "avenida assuncao");
  assert.equal(normalizeStreet("AVENIDA ASSUNCAO"), "avenida assuncao");
  assert.equal(normalizeStreet("R. Dr Vitorino Monteiro"), "rua doutor vitorino monteiro");
});

test("busca por endereco x busca por nome", () => {
  assert.deepEqual(parseAddressQuery("av assunção 1757"), { street: "av assunção", street_norm: "avenida assuncao", number: "1757" });
  assert.deepEqual(parseAddressQuery("Rua Damasco"), { street: "Rua Damasco", street_norm: "rua damasco", number: null });
  assert.equal(parseAddressQuery("damasco, 120")?.street_norm, "damasco");
  assert.equal(isAddressQuery("rodoviária de francisco beltrão"), false);
  assert.equal(isAddressQuery("hospital regional"), false);
  assert.equal(isAddressQuery("aeroporto"), false);
});

test("dedupe: mesmo place_id e mesmo nome a < 50 m", () => {
  const list = [
    { place_id: "g:1", name: "Rodoviária X", lat: -26.1, lng: -53.05 },
    { place_id: "g:1", name: "Rodoviária X", lat: -26.1, lng: -53.05 },
    { place_id: "osm:2", name: "rodoviaria x", lat: -26.1002, lng: -53.0501 },
    { place_id: "g:3", name: "Rodoviária X", lat: -26.2, lng: -53.05 },
    { place_id: "g:4", name: "Mercado Y", lat: -26.1, lng: -53.05 },
  ];
  assert.deepEqual(dedupePlaces(list).map((p) => p.place_id), ["g:1", "g:3", "g:4"]);
});