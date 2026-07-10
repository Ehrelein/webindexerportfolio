# ADR-004: Express вместо Fastify

## Статус
Принято

## Контекст]
Нужен HTTP сервер для dashboard, API, search. Варианты: Express, Fastify, Koa.

## Решение
Используем Express 4.18.

## Обоснование

### Express (выбрано)
- **Ecosystem** —最大の npm ecosystem, middleware everywhere
- **Familiarity** — все знают Express, легко найти help
- **Stability** — production-ready, battle-tested
- **Performance** — достаточно для我们的负载 (100-500 rps)

### Fastify (отклонено)
- **Performance** — 2x быстрее, но我们的 bottleneck: network/DB, не HTTP
- **Ecosystem** — меньше plugins чем Express
- **Learning curve** — schema-based validation, plugins system

### Koa (отклонено)
- **Minimal** — нужно больше boilerplate
- **Ecosystem** — меньше middleware

## Когда изменить
- Когда нужно >10K rps (Fastify)
- Когда нужна schema validation (Fastify)
- Когда нужен HTTP/2 (Fastify)

## Ссылки
- https://expressjs.com/
- https://fastify.dev/
