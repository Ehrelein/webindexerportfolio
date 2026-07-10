# ADR-003: Kafka vs RabbitMQ vs SQLite frontier

## Статус
Принято (SQLite frontier для single-instance, Kafka для distributed)

## Контекст
Нужна очередь URL для краулинга. Варианты: SQLite frontier (текущий), Kafka, RabbitMQ.

## Решение
- **Single instance**: SQLite frontier (auto-increment id, batch select)
- **Distributed**: Kafka с 10 партициями

## Обоснование

### SQLite frontier (текущий выбор)
- **Zero cost** — $0
- **Zero config** — нет процесса
- **Достаточно** — для 1 воркера 50K frontier
- **ACID** — транзакции, no data loss

### Kafka (для distributed)
- **Partitioning** — параллельное потребление по доменам
- **Replay** — можно перезапустить消费 с offsets
- **Retention** — хранит URL для retry
- **Scalability** — горизонтальное масштабирование воркеров

### RabbitMQ (отклонено)
- **Overhead** — management UI, AMQP protocol
- **No replay** — после消费 сообщение удалено
- **Less scalable** — чем Kafka для high throughput

## Когда перейти на Kafka
- Когда >5 воркеров
- Когда нужен distributed queue
- Когда нужен replay и retry

## Ссылки
- https://kafka.apache.org/documentation/
- https://www.rabbitmq.com/
