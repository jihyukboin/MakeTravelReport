package com.enjoytrip;

import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;

import java.nio.file.Files;
import java.nio.file.Path;
import java.lang.management.ManagementFactory;
import java.time.LocalDate;
import java.util.*;
import java.util.function.Supplier;

import static com.enjoytrip.RecommendationService.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.mock;

/** Fixed synthetic data, exact baseline, JVM warmup and median timings. No external APIs. */
class AlgorithmBenchmarkTests {
    private static final Comparator<Destination> ORDER = Comparator.comparingDouble(Destination::score)
            .thenComparing(d -> d.attraction().id());
    private final Point origin = new Point(37.5665, 126.978);

    private Charger charger(String id, Point point, int available) {
        return new Charger(id, id, "fixture", "24h", point, available, 1, 100, null);
    }

    private JdbcTemplate database(List<Attraction> attractions, List<Charger> chargers, List<String> queries) {
        return mock(JdbcTemplate.class, call -> {
            String sql = call.getArgument(0);
            queries.add(sql);
            if (sql.contains("AVG(a.latitude)")) return List.of(new Origin("fixture", origin, true));
            if (sql.contains("FROM attractions WHERE")) return attractions;
            if (sql.contains("FROM charging_stations")) return chargers;
            if (sql.contains("FROM astronomy_locations")) return List.of();
            throw new AssertionError("Unexpected query: " + sql);
        });
    }

    private List<Destination> baseline(List<Attraction> attractions, List<Charger> chargers, double reach) {
        List<Destination> candidates = new ArrayList<>();
        for (Attraction attraction : attractions) {
            double km = distance(origin, attraction.point());
            Charger nearest = chargers.stream().filter(c -> distance(attraction.point(), c.point()) <= 5)
                    .min(Comparator.comparingDouble((Charger c) -> distance(attraction.point(), c.point()))
                            .thenComparing(Charger::id)).orElse(null);
            if (nearest == null) continue;
            double leg = distance(attraction.point(), nearest.point());
            if ((km + leg) * 1.3 > reach) continue;
            candidates.add(new Destination(attraction, km, km * 1.3, nearest, leg, null,
                    km + leg * 4 + (nearest.available() == 0 ? 10 : 0)));
        }
        candidates.sort(ORDER);
        return candidates;
    }

    @Test
    void recommendationMatchesExhaustiveSearchAndFullSortIncludingTies() {
        Random random = new Random(20261015);
        List<Charger> chargers = new ArrayList<>();
        List<Attraction> attractions = new ArrayList<>();
        for (int i = 0; i < 500; i++) chargers.add(charger("c" + i,
                new Point(36 + random.nextDouble() * 2, 126 + random.nextDouble() * 2), i % 2));
        for (int i = 0; i < 200; i++) attractions.add(new Attraction("a" + i, "fixture", "fixture", "HS01",
                new Point(36 + random.nextDouble() * 2, 126 + random.nextDouble() * 2)));
        var service = new RecommendationService(database(attractions, chargers, new ArrayList<>()));
        for (int battery : List.of(21, 40, 80, 100)) {
            var result = service.recommend(new Request("fixture", "서울", "중구", "HS01", "ioniq5", "sunset", battery, LocalDate.of(2026, 10, 15)));
            var expected = baseline(attractions, chargers, 485 * (battery - 20) / 100.0);
            assertEquals(expected.size(), result.matchedCount());
            assertEquals(Math.min(1, expected.size()), result.destinations().size());
            if (!expected.isEmpty()) {
                assertEquals(expected.getFirst().attraction().id(), result.destinations().getFirst().attraction().id());
                assertEquals(expected.getFirst().charger().id(), result.destinations().getFirst().charger().id());
            }
        }
        var tied = List.of(new Attraction("z", "tie", "fixture", "HS01", origin),
                new Attraction("a", "tie", "fixture", "HS01", origin));
        var result = new RecommendationService(database(tied, List.of(charger("z", origin, 1), charger("a", origin, 1)), new ArrayList<>()))
                .recommend(new Request("fixture", "서울", "중구", "HS01", "ioniq5", "sunset", 100, null));
        assertEquals("a", result.destinations().getFirst().attraction().id());
        assertEquals("a", result.destinations().getFirst().charger().id());
    }

    @Test
    void emptyAttractionsSkipNationwideChargerQuery() {
        List<String> queries = new ArrayList<>();
        var result = new RecommendationService(database(List.of(), List.of(), queries))
                .recommend(new Request("fixture", "서울", "중구", "HS01", "ioniq5", "sunset", 100, null));
        assertTrue(result.destinations().isEmpty());
        assertEquals(2, queries.size());
        assertTrue(queries.stream().noneMatch(sql -> sql.contains("FROM charging_stations")));
    }

    @Test
    void benchmarkSpatialSearchAgainstExactExhaustiveSearch() throws Exception {
        Random random = new Random(42);
        List<Charger> chargers = new ArrayList<>();
        List<Point> points = new ArrayList<>();
        for (int i = 0; i < 10_000; i++) chargers.add(charger(String.format("%05d", i),
                new Point(33 + random.nextDouble() * 6, 124 + random.nextDouble() * 8), 1));
        for (int i = 0; i < 1_000; i++) points.add(new Point(33 + random.nextDouble() * 6, 124 + random.nextDouble() * 8));
        Supplier<List<String>> brute = () -> points.stream().map(point -> {
            Charger best = null;
            double nearest = 5;
            for (Charger c : chargers) {
                double km = distance(point, c.point());
                if (km < nearest || (km == nearest && (best == null || c.id().compareTo(best.id()) < 0))) {
                    best = c;
                    nearest = km;
                }
            }
            return best == null ? "" : best.id();
        }).toList();
        Supplier<List<String>> indexed = () -> {
            ChargerGrid grid = new ChargerGrid(chargers);
            return points.stream().map(point -> {
                Charger c = grid.nearest(point, 5);
                return c == null ? "" : c.id();
            }).toList();
        };
        assertEquals(brute.get(), indexed.get(), "All 1,000 nearest station IDs must match");
        for (int i = 0; i < 2; i++) { brute.get(); indexed.get(); }
        double baselineMs = medianMs(brute);
        double gridMs = medianMs(indexed);
        var memory = (com.sun.management.ThreadMXBean) ManagementFactory.getThreadMXBean();
        memory.setThreadAllocatedMemoryEnabled(true);
        long baselineAllocated = allocatedBytes(memory, brute);
        long gridAllocated = allocatedBytes(memory, indexed);
        String json = String.format(Locale.ROOT, """
                {
                  "dataset": "synthetic uniform Korea bounds; not live request latency",
                  "seed": 42,
                  "chargers": 10000,
                  "queries": 1000,
                  "radius_km": 5,
                  "warmups": 2,
                  "measured_runs": 5,
                  "baseline_median_ms": %.3f,
                  "grid_with_build_median_ms": %.3f,
                  "speedup": %.2f,
                  "exact_matches": 1000,
                  "baseline_thread_allocated_bytes": %d,
                  "grid_thread_allocated_bytes": %d,
                  "memory_method": "ThreadMXBean current-thread allocation per run; not peak retained heap or RSS",
                  "java": "%s"
                }
                """, baselineMs, gridMs, baselineMs / gridMs, baselineAllocated, gridAllocated, System.getProperty("java.version"));
        Path report = Path.of("build/reports/algorithm-benchmark.json");
        Files.createDirectories(report.getParent());
        Files.writeString(report, json);
        System.out.println(json);
    }

    private double medianMs(Supplier<?> task) {
        long[] durations = new long[5];
        for (int i = 0; i < durations.length; i++) {
            long start = System.nanoTime();
            assertNotNull(task.get());
            durations[i] = System.nanoTime() - start;
        }
        Arrays.sort(durations);
        return durations[2] / 1_000_000.0;
    }

    @Test
    void benchmarkProductionTopOneAgainstFullSort() throws Exception {
        Random random = new Random(20261015);
        List<Destination> candidates = new ArrayList<>();
        Charger station = charger("fixture", origin, 1);
        for (int i = 0; i < 100_000; i++) {
            Attraction attraction = new Attraction(String.format("%06d", i), "fixture", "fixture", "HS01", origin);
            candidates.add(new Destination(attraction, 0, 0, station, 0, null, random.nextDouble() * 1000));
        }
        Supplier<List<Destination>> fullSort = () -> {
            List<Destination> copy = new ArrayList<>(candidates);
            copy.sort(ORDER);
            return List.of(copy.getFirst());
        };
        Supplier<List<Destination>> topOne = () -> {
            BestDestination ranking = new BestDestination();
            candidates.forEach(ranking::offer);
            return ranking.destinations();
        };
        assertEquals(fullSort.get(), topOne.get());
        assertTrue(new BestDestination().destinations().isEmpty());
        for (int i = 0; i < 2; i++) { fullSort.get(); topOne.get(); }
        double sortMs = medianMs(fullSort);
        double heapMs = medianMs(topOne);
        var memory = (com.sun.management.ThreadMXBean) ManagementFactory.getThreadMXBean();
        memory.setThreadAllocatedMemoryEnabled(true);
        long sortAllocated = allocatedBytes(memory, fullSort);
        long heapAllocated = allocatedBytes(memory, topOne);
        String json = String.format(Locale.ROOT, """
                {
                  "dataset": "100000 prebuilt synthetic destinations; candidate construction excluded",
                  "seed": 20261015,
                  "candidates": 100000,
                  "retained_results": 1,
                  "warmups": 2,
                  "measured_runs": 5,
                  "sort_median_ms": %.3f,
                  "heap_median_ms": %.3f,
                  "speedup": %.2f,
                  "sort_thread_allocated_bytes": %d,
                  "heap_thread_allocated_bytes": %d,
                  "memory_method": "ThreadMXBean current-thread allocation; not peak retained heap or RSS",
                  "exact_match": true,
                  "java": "%s"
                }
                """, sortMs, heapMs, sortMs / heapMs, sortAllocated, heapAllocated, System.getProperty("java.version"));
        Path report = Path.of("build/reports/ranking-benchmark.json");
        Files.createDirectories(report.getParent());
        Files.writeString(report, json);
        System.out.println(json);
    }

    private long allocatedBytes(com.sun.management.ThreadMXBean memory, Supplier<?> task) {
        long thread = Thread.currentThread().threadId();
        long before = memory.getThreadAllocatedBytes(thread);
        assertNotNull(task.get());
        return memory.getThreadAllocatedBytes(thread) - before;
    }
}
