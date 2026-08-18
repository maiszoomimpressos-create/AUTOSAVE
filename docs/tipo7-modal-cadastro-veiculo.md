# Integração — Modal de cadastro de veículo (Tipo7 → AUTOSAVE)

O modal fica com vocês (visual, UX, validação de tela). Ao salvar, em vez de
gravar num banco próprio, enviem os dados pro endpoint abaixo. O AUTOSAVE é a
fonte única de verdade dos veículos.

## Endpoint

```
POST https://<dominio-autosave>/api/v1/vehicles
x-api-key: <chave fornecida pelo AUTOSAVE>
Content-Type: application/json
```

- Se a placa **não existir**, cria o veículo → responde `201` com `created: true`.
- Se a placa **já existir**, atualiza só os campos enviados (upsert) → responde
  `200` com `created: false`. Não duplica registro.
- Textos são automaticamente convertidos pra MAIÚSCULO no nosso lado (exceto os
  três campos de valor fixo marcados abaixo) — podem mandar como o usuário digitou.

## Buscar antes de cadastrar (isso faltava na v1 deste doc)

**Antes de deixar o usuário preencher o formulário**, assim que ele terminar
de digitar a placa (on blur, ou debounce de ~400ms), chamem este endpoint pra
saber se o veículo já existe aqui:

```
GET https://<dominio-autosave>/api/v1/vehicles?plate=ABC1D23
x-api-key: <mesma chave do POST>

→ { "found": true, "vehicles": [ { "plate": "ABC1D23", "brand": "FIAT", "model": "STRADA", ... } ] }
→ { "found": false, "vehicles": [] }
```

- Aceita placa **parcial** (ex.: `plate=ABC1`) e devolve até 10 resultados —
  dá pra usar até como autocomplete enquanto o usuário digita, não só na
  placa completa.
- Se `found: true` (achou por placa completa), **pré-preencham o formulário**
  com os dados retornados em vez de deixar tudo em branco — evita o usuário
  redigitar dados que já temos, e evita reescrever por engano um veículo que
  já existe com informação desatualizada.
- O `POST` continua funcionando sozinho sem o `GET` antes (ele já faz upsert
  por placa), mas sem o `GET` o usuário nunca vê "esse veículo já está
  cadastrado, aqui estão os dados" — é puramente uma melhoria de UX do modal,
  os dados no banco ficam corretos de qualquer jeito.

## Campo obrigatório

| Campo   | Tipo   | Obrigatório | Observação                                  |
|---------|--------|:-----------:|----------------------------------------------|
| `plate` | string | **sim**     | Placa. Formato livre — normalizamos aqui (maiúscula, sem traço/espaço). |

## Campos opcionais — identificação do veículo

| Campo             | Tipo   | Observação |
|-------------------|--------|------------|
| `name`            | string | Nome/apelido do veículo. Se não vier, geramos `MARCA MODELO` (ou a placa, se não tiver nenhum dos dois). |
| `type`            | string | **valor fixo (enum)** — ver tabela de opções abaixo. |
| `brand`           | string | Marca. |
| `model`           | string | Modelo. |
| `year`            | number | Ano. |
| `color`           | string | Cor. |
| `status`          | string | **valor fixo (enum)** — ver tabela de opções abaixo. |
| `category`        | string | Categoria (ex.: passeio, carga, aluguel). |
| `species`         | string | Espécie (CRLV). |
| `body_type`       | string | Carroceria. |

## Valores aceitos de `type` e `status` (fixos — montem o `<select>` com isso)

Esses dois campos são enum no nosso banco: **só aceitam exatamente um destes
valores** (em inglês, minúsculo). O rótulo é só sugestão de exibição — usem o
texto que fizer sentido pra vocês, mas o `value` enviado pro POST tem que ser
um destes:

**`type`**

| value        | rótulo sugerido |
|--------------|------------------|
| `car`        | Carro |
| `motorcycle` | Moto |
| `truck`      | Caminhão |
| `bus`        | Ônibus |
| `van`        | Van |
| `tractor`    | Trator |
| `harvester`  | Colheitadeira |
| `forklift`   | Empilhadeira |
| `generator`  | Gerador |
| `trailer`    | Reboque / Carreta |
| `equipment`  | Equipamento |
| `other`      | Outro |

**`status`**

| value         | rótulo sugerido |
|---------------|------------------|
| `active`      | Ativo |
| `maintenance` | Manutenção |
| `stopped`     | Parado |
| `critical`    | Crítico |

```html
<select name="type">
  <option value="car">Carro</option>
  <option value="motorcycle">Moto</option>
  <option value="truck">Caminhão</option>
  <option value="bus">Ônibus</option>
  <option value="van">Van</option>
  <option value="tractor">Trator</option>
  <option value="harvester">Colheitadeira</option>
  <option value="forklift">Empilhadeira</option>
  <option value="generator">Gerador</option>
  <option value="trailer">Reboque / Carreta</option>
  <option value="equipment">Equipamento</option>
  <option value="other">Outro</option>
</select>

<select name="status">
  <option value="active">Ativo</option>
  <option value="maintenance">Manutenção</option>
  <option value="stopped">Parado</option>
  <option value="critical">Crítico</option>
</select>
```

Se um dia precisarem de um valor que não está nessa lista (ex.: um novo tipo
de veículo), avisem — esses dois campos são enum de verdade no banco, então
diferente dos outros campos, **não dá pra criar um valor novo sozinho via
API**: precisa de uma alteração no schema do nosso lado.

## Campos opcionais — documento / dados do CRLV

| Campo             | Tipo   | Observação |
|-------------------|--------|------------|
| `chassis_number`  | string | Chassi. |
| `renavam`         | string | Renavam. |
| `engine_number`   | string | Número do motor. |
| `security_code`   | string | Código de segurança do CRV/CLA. |
| `license_expiry`  | string | Validade do licenciamento. Formato de data `AAAA-MM-DD`. Não é alterado para maiúsculo. |
| `licensing_year`  | number | Exercício de licenciamento. |
| `restrictions`    | string | Restrições/observações do documento. |

## Campos opcionais — características técnicas

| Campo          | Tipo   | Observação |
|----------------|--------|------------|
| `odometer_km`  | number | Odômetro (km). |
| `fuel_type`    | string | Combustível. |
| `capacity`     | number | Capacidade (passageiros/carga). |
| `power_cv`     | number | Potência (CV). |
| `displacement` | string | Cilindrada. |
| `cmt`          | string | Capacidade máxima de tração. |
| `axles`        | number | Número de eixos. |

## Campos opcionais — proprietário / motorista / localização

| Campo            | Tipo   | Observação |
|------------------|--------|------------|
| `owner_name`     | string | Nome do proprietário. |
| `owner_document` | string | CPF/CNPJ do proprietário. |
| `driver_phone`   | string | Telefone do motorista. |
| `city`           | string | Município (do documento). |
| `state`          | string | UF (do documento). |
| `notes`          | string | Observações livres. |

> Se o modal de vocês precisar de um campo que não existe na lista acima,
> **não precisam avisar antes**: mandem a chave direto no corpo do POST (ex.:
> `"seguro_vencimento": "2026-05-01"`) que o AUTOSAVE cria automaticamente um
> campo personalizado pra ela na primeira vez que aparecer, e passa a aceitar
> e guardar esse valor dali em diante — inclusive aparece na tela `/veiculos`
> pro time daqui ver. Só use nomes em `snake_case` (letras minúsculas,
> números e `_`).

## Exemplo de payload mínimo

```json
{
  "plate": "ABC1D23",
  "brand": "Fiat",
  "model": "Strada",
  "color": "Branco",
  "year": 2022
}
```

## Exemplo de payload completo

```json
{
  "plate": "ABC1D23",
  "type": "car",
  "brand": "Fiat",
  "model": "Strada",
  "year": 2022,
  "color": "Branco",
  "status": "active",
  "category": "passeio",
  "chassis_number": "9BWZZZ377VT004251",
  "renavam": "00123456789",
  "owner_name": "Fulano de Tal",
  "owner_document": "12345678900",
  "driver_phone": "46988212387",
  "city": "Francisco Beltrão",
  "state": "PR",
  "license_expiry": "2026-12-31"
}
```

## Resposta

```json
{ "vehicle": { "id": "...", "plate": "ABC1D23", "brand": "FIAT", ... }, "created": true }
```

## Webhook (opcional, pra saberem quando um veículo muda por outra via)

Se cadastrarem uma `webhook_url` na chave, avisamos automaticamente sempre que
um veículo for criado/atualizado — por esse modal, pela tela do AUTOSAVE, ou
por qualquer outra chave. Ver detalhes e verificação de assinatura na página
`/api-docs` do AUTOSAVE.

## Chave de acesso (x-api-key)

Já foi gerada uma chave pra vocês, nome **"Tipo7 - Cadastro de veículos"**,
liberada pro recurso `vehicles` com todos os campos acima. Ela foi enviada
separadamente (não fica neste arquivo por segurança) — se precisar gerar de
novo ou revogar, isso é feito na tela `/api-docs` do AUTOSAVE.
