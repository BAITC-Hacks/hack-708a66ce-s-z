# Decision support and typed contracts

QALA uses Jev as a typed selection model and OpenAI as a prose explanation model. The scoring engine owns every numerical outcome. The interface identifies which providers actually succeeded, including partial failure and no-key local operation.

## Request path

1. `POST /api/decision-support` accepts decisions, language, goal, a short question and an optional draft.
2. AJV checks the request schema. The engine checks budget, uniqueness, scope, category limits, conflicts and completion feasibility.
3. The server enumerates every legal next candidate (up to 54), simulates it, and attaches trusted score/metric deltas, cost, delay and fairness effects.
4. If configured, `POST https://api.typesafe.ai/v1/systemone` receives model `jev-1.13.0`, trusted state, a Choice question and a Noul ambiguity question. Every Choice criterion is a legal candidate ID with calculated attributes. The two questions are independent.
5. Returned envelopes, option membership, probabilities, sum and selected maximum are checked. Unknown/malformed selections fall back to local ranking.
6. If configured, OpenAI Responses receives calculated current/draft outcomes and validated alternatives. Strict JSON output contains summary, strengths, tradeoffs and next step; it cannot replace candidate IDs.
7. The browser validates the full response and reconstructs all candidate data from its engine. Context changes abort requests and invalidate old advice.
8. The user opens a suggestion, inspects its preview and explicitly applies it. Confidence below 55% asks for additional review; Noul at least 0.6 flags an ambiguous request. These are UI thresholds, not empirically calibrated municipal risk estimates.

Provider timeouts are 15 seconds for Jev and 25 seconds for explanation. Keys stay on the local Node server. Prompts contain synthetic scenario state and the user-entered question, which should not contain sensitive information.

## Schemas

| File                            | Contract                                                                                  |
| ------------------------------- | ----------------------------------------------------------------------------------------- |
| `decision.schema.json`          | Local policy requires one known district; citywide policy forbids a district              |
| `advisor-request.schema.json`   | 0–5 decisions, RU/EN/KK, five goal enums, question at most 800 characters, optional draft |
| `advisor-response.schema.json`  | Provider provenance, reviewed candidate, alternatives, confidence, narration              |
| `advisor-narration.schema.json` | Bounded summary, strengths, tradeoffs and next step                                       |
| `jev-request.schema.json`       | Typed Choice and Noul question envelope                                                   |
| `jev-response.schema.json`      | Typed selection, probability dictionary, confidence and ambiguity                         |
| `decision-event.schema.json`    | A numbered adoption with recomputable before/after values                                 |
| `scenario.schema.json`          | Synthetic model version, decisions, events, baseline and result                           |

All schemas use JSON Schema draft-07. `https://qala.local/schemas/...` values are schema identifiers, not hosted network services. Runtime checks add business semantics that JSON shapes cannot establish. Scenario events are derived from the decision sequence; they do not pretend to be authenticated timestamps or a tamper-proof audit ledger.

## Local ranking

- Quality of life: next-step Score gain.
- Equity: weakest-district gain plus critical indicators resolved.
- Mobility / ecology: population-weighted changes in the two category indicators.
- Earlier benefits: Score gain divided by `1 + delay`.

All choices preserve a feasible five-decision completion. These heuristics are not globally optimal search, and the local fallback does not interpret arbitrary free text. Jev selection can differ from the local rank. LLM-only mode explains the locally selected option.

## Verification boundary

Mock tests cover provider envelopes, invalid IDs/probabilities, low confidence, ambiguity, malformed narration and provider failures. Browser tests cover no automatic adoption, malformed alternatives, stale replies, and unchanged scores. No live provider call has been verified without a supplied key. Schema validation cannot establish that generated prose is true; the numeric panels remain the source of truth.

References: [Jev typed primitives](https://typesafe.ai/blog/introducing-system-one-models-and-jev), [Jev API](https://docs.typesafe.ai/api), [models](https://docs.typesafe.ai/models), [OpenAI Responses](https://developers.openai.com/api/docs/guides/text).

## Optional key connection

The localhost app offers an optional connection during onboarding and in the advisor. `GET /api/session-credentials` returns provider status and a random anti-CSRF token, never a key. `POST` requires the same local Origin/Host, the token, JSON content and a body no larger than 2 KiB. The server rejects non-loopback clients, cross-site reads, unknown fields and malformed keys. Vite preserves the browser Host when forwarding `/api` so these checks also work during development.

Session credentials are private fields in server memory. They override an existing environment key while connected; disconnect clears session overrides and leaves `.env` configuration intact. Forms clear credentials on submission/collapse. Nothing is written to browser storage, disk, scenario JSON or the bundled HTML. A key is not verified with a paid provider call on connection. The first explicit advice request contacts the configured provider; failures remain visible and fall back to local calculation.

The `file://` game neither asks for a usable secret nor contacts the endpoint: it explains how to run the localhost app. Automated tests use dummy values or mocked providers, including HTTP-level origin, CSRF, redaction, body-size, disconnect and restart checks.
