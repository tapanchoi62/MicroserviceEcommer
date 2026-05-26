# Search Service

## Responsibilities

- Product Search
- Full-text Search
- Filtering
- Faceted Search
- Autocomplete

## Technology

- Elasticsearch
- OpenSearch

## Features

- Typo tolerance
- Relevance scoring
- Search suggestions
- Aggregations

## Indexing Flow

```text
Product Updated
    ↓
Kafka Event
    ↓
Search Index Update
```
