# WebIndexer Architecture

## High-Level Architecture

```mermaid
graph TB
    subgraph "Client Layer"
        Browser[Browser]
        CLI[CLI / API Client]
    end

    subgraph "Application Layer"
        Express[Express Server]
        Crawler[Crawler Process]
        Scheduler[Scheduler]
    end

    subgraph "Data Layer"
        SQLite[(SQLite WAL)]
        Redis[(Redis Cache)]
        Kafka[Kafka Queue]
        ES[(Elasticsearch)]
    end

    subgraph "Infrastructure Layer"
        PM2[PM2 Process Manager]
        Docker[Docker Containers]
        K8s[Kubernetes]
    end

    subgraph "Monitoring Layer"
        Prometheus[Prometheus]
        Grafana[Grafana]
        Pino[Pino Logger]
    end

    Browser --> Express
    CLI --> Express
    Express --> Crawler
    Express --> SQLite
    Express --> Redis
    Crawler --> Kafka
    Crawler --> SQLite
    Crawler --> ES
    Crawler --> Redis
    PM2 --> Crawler
    PM2 --> Express
    Docker --> PM2
    K8s --> Docker
    Crawler --> Prometheus
    Express --> Prometheus
    Prometheus --> Grafana
    Crawler --> Pino
    Express --> Pino
```

## Crawl Pipeline

```mermaid
flowchart LR
    A[Seed URLs] --> B[Frontier Queue]
    B --> C{Domain Check}
    C -->|Blacklisted| D[Skip]
    C -->|Rate Limited| E[Wait]
    C -->|OK| F[Fetch HTML]
    F --> G{Status Check}
    G -->|5xx| H[Retry]
    G -->|4xx| I[Mark Visited]
    G -->|200| J[Parse Page]
    J --> K[Extract Links]
    K --> L[Enqueue New URLs]
    J --> M[Save to DB]
    M --> N[Update FTS Index]
    I --> O[Cleanup Frontier]
```

## Data Flow

```mermaid
sequenceDiagram
    participant Client
    participant Express
    participant Crawler
    participant SQLite
    participant Redis
    participant Kafka
    participant ES

    Client->>Express: GET /api/stats
    Express->>SQLite: SELECT COUNT(*)
    SQLite-->>Express: nodeCount
    Express-->>Client: { total: 200K }

    Crawler->>SQLite: SELECT FROM frontier
    SQLite-->>Crawler: batch of URLs
    Crawler->>Kafka: publish(url)
    Kafka-->>Crawler: offset
    Crawler->>ES: index(doc)
    ES-->>Crawler: indexed
    Crawler->>SQLite: INSERT INTO nodes
    Crawler->>Redis: SET dedup(url)
```

## Deployment Architecture

```mermaid
graph TB
    subgraph "VPS (Vultr)"
        subgraph "Docker Stack"
            App[App Container]
            Kafka[Kafka]
            Redis[Redis]
            ES[Elasticsearch]
            Prometheus[Prometheus]
            Grafana[Grafana]
        end
        PM2[PM2]
        SQLite[(SQLite)]
    end

    subgraph "CDN/Proxy"
        Cloudflare[Cloudflare]
    end

    subgraph "CI/CD"
        GitHub[GitHub Actions]
        Terraform[Terraform]
    end

    Cloudflare --> App
    GitHub -->|push| App
    Terraform -->|provision| VPS
    PM2 --> App
    App --> Kafka
    App --> Redis
    App --> ES
    App --> SQLite
```

## Security Architecture

```mermaid
graph TB
    subgraph "Perimeter"
        CF[Cloudflare WAF]
        RateLimit[Rate Limiter]
    end

    subgraph "Application"
        CSP[CSP Headers]
        Input[Input Validation]
        Auth[Request ID]
    end

    subgraph "Data"
        SQLite WAL[SQLite WAL]
        Redis Auth[Redis Auth]
        Secrets[.env Secrets]
    end

    CF --> RateLimit
    RateLimit --> CSP
    CSP --> Input
    Input --> Auth
    Auth --> SQLite WAL
    Auth --> Redis Auth
    Secrets --> App
```

## Scaling Architecture

```mermaid
graph TB
    subgraph "Current: Single Instance"
        App1[App 1]
        DB1[(SQLite)]
    end

    subgraph "Scale 1: Horizontal (2-5 instances)"
        App2a[App 1]
        App2b[App 2]
        Kafka2[Kafka]
        DB2[(SQLite)]
    end

    subgraph "Scale 2: Full Stack (5+ instances)"
        App3a[App 1]
        App3b[App 2]
        App3c[App 3]
        Kafka3[Kafka Cluster]
        Redis3[Redis Cluster]
        ES3[ES Cluster]
        DB3[(PostgreSQL)]
    end

    App1 --> DB1
    App2a --> Kafka2
    App2b --> Kafka2
    Kafka2 --> DB2
    App3a --> Kafka3
    App3b --> Kafka3
    App3c --> Kafka3
    Kafka3 --> Redis3
    Kafka3 --> ES3
    Kafka3 --> DB3
```
