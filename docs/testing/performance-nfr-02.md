# Performance check — product listing (NFR-02)

SRS NFR-02 (proposed acceptance): product listing p95 ≤ 500 ms at 20 concurrent virtual users with 1,000 seeded products, in a documented environment. It was an unmeasured target until Sprint 6.

## Method

| Item | Value |
| --- | --- |
| Date | 2026-11-10 |
| Code | `develop` plus Sprint 6 changes (the product listing query is unchanged since Sprint 3) |
| Environment | Development container (Linux), Spring Boot jar and PostgreSQL 16 on the same machine, default connection pool, no network between API and database |
| Data | 1,000 products (21 demonstration products plus 979 generated), 981 active, in 6 categories; `ANALYZE` run after loading |
| Load | `autocannon` 8.0.0, 20 concurrent connections, 15 seconds per request, direct to the API port |
| Measure | Latency percentiles reported by the tool; p97.5 is shown because it is the nearest reported value above p95, so p95 is at most that |

Data load (run once on an empty test database):

```sql
INSERT INTO commerceflow.products (id, category_id, name, slug, description, price, stock_quantity, active, image_path, image_alt, display_order)
SELECT gen_random_uuid(), (SELECT id FROM commerceflow.categories ORDER BY display_order OFFSET (g % 6) LIMIT 1),
  'Perf product ' || g || CASE WHEN g % 7 = 0 THEN ' lamp' WHEN g % 5 = 0 THEN ' mug' ELSE ' chair' END, 'perf-' || g,
  'A generated product used to measure listing speed, number ' || g, (10 + (g % 500))::numeric(12,2), g % 40, g % 50 <> 0,
  '/images/products/stoneware-mug', 'Generated product', 1000 + g
FROM generate_series(1, 979) g;
```

Run, for each request below: `npx autocannon@8.0.0 -c 20 -d 15 -j "http://localhost:8081<path>"`.

## Results

| Request | Requests/s | p50 | p90 | p97.5 | p99 | Max | Errors |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `GET /products?size=9&page=0` | 1,444 | 69 ms | 111 ms | 128 ms | 137 ms | 174 ms | 0 |
| `GET /products?size=9&page=40` (deep page) | 2,356 | 74 ms | 117 ms | 134 ms | 142 ms | 177 ms | 0 |
| `GET /products?q=lamp&size=9` (search) | 1,338 | 81 ms | 136 ms | 158 ms | 168 ms | 319 ms | 0 |
| `GET /products?category=living&minPrice=100.00&maxPrice=500.00&sort=price,asc&size=9` | 3,880 | 74 ms | 134 ms | 153 ms | 163 ms | 197 ms | 0 |
| `GET /products?available=true&size=9` | 3,269 | 76 ms | 133 ms | 153 ms | 163 ms | 201 ms | 0 |

## Conclusion

Every measured listing request is far inside the target: p97.5 is at most 158 ms against a limit of 500 ms for p95, with no errors. No index was added (the search uses a sequential scan of 1,000 rows, which is fast enough; a trigram index becomes worthwhile at a much larger catalog).

## Limits of this measurement

- It measures the application and its queries, not the hosting. The production API runs on a free Render instance and a free Neon database over the network, so production latency is higher than these figures and the first request after idle also waits for a cold start (about two minutes, S3-D01). The target was not measured on production, to avoid loading a free service.
- The load tool and the API shared one machine, which makes these figures conservative for CPU and optimistic for network.
- Only the product listing was measured, as the requirement states.
