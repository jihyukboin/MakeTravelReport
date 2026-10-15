package com.enjoytrip;

import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Random;

import static com.enjoytrip.RecommendationService.*;
import static org.junit.jupiter.api.Assertions.*;

class RecommendationServiceTests {
    private Charger charger(String id, Point point) {
        return new Charger(id, id, "주소", "24시간", point, 1, 0, 100, "2026-10-15 12:00:00");
    }

    @Test
    void haversineMatchesKnownDistances() {
        Point seoul = new Point(37.5665, 126.9780);
        assertEquals(0, distance(seoul, seoul));
        assertEquals(325, distance(seoul, new Point(35.1796, 129.0756)), 5);
    }

    @Test
    void spatialGridMatchesBruteForceAcrossCellBoundaries() {
        Random random = new Random(42);
        List<Charger> chargers = new ArrayList<>();
        for (int i = 0; i < 2000; i++) chargers.add(charger("station-" + i,
                new Point(33 + random.nextDouble() * 6, 124 + random.nextDouble() * 8)));
        ChargerGrid grid = new ChargerGrid(chargers);
        for (int i = 0; i < 500; i++) {
            Point point = new Point(33 + random.nextDouble() * 6, 124 + random.nextDouble() * 8);
            Charger expected = chargers.stream().filter(c -> distance(point, c.point()) < 5)
                    .min(Comparator.comparingDouble((Charger c) -> distance(point, c.point())).thenComparing(Charger::id)).orElse(null);
            assertEquals(expected, grid.nearest(point, 5));
        }
        Charger acrossBoundary = charger("boundary", new Point(37.55001, 127.05001));
        assertEquals(acrossBoundary, new ChargerGrid(List.of(acrossBoundary)).nearest(new Point(37.54999, 127.04999), 5));
    }

    @Test
    void excludesChargersOutsideRadiusAndHandlesEmptyData() {
        Point point = new Point(37.5, 127);
        assertNull(new ChargerGrid(List.of()).nearest(point, 5));
        assertNull(new ChargerGrid(List.of(charger("far", new Point(37.6, 127)))).nearest(point, 5));
    }

    @Test
    void includesExactRadiusAndBreaksEqualDistanceTiesById() {
        Point point = new Point(37.5, 127);
        Charger edge = charger("edge", new Point(37.54, 127));
        double radius = distance(point, edge.point());
        assertEquals(edge, new ChargerGrid(List.of(edge)).nearest(point, radius));
        Charger first = charger("a", edge.point());
        assertEquals(first, new ChargerGrid(List.of(edge, first)).nearest(point, radius));
    }

    @Test
    void validatesVehicleBatteryAndPreferencesBeforeQueryingDatabase() {
        RecommendationService service = new RecommendationService(null);
        assertThrows(ResponseStatusException.class, () -> vehicle("unknown"));
        assertThrows(ResponseStatusException.class, () -> service.recommend(null));
        assertThrows(ResponseStatusException.class, () -> service.recommend(
                new Request("서울시청", "서울", "중구", "NA02' OR 1=1", "g80-ev", "sunset", 100, null)));
        for (int battery : List.of(0, 20, 101)) assertThrows(ResponseStatusException.class, () -> service.recommend(
                new Request("서울시청", "서울", "중구", "NA02", "g80-ev", "sunset", battery, null)));
        assertTrue(vehicle("ioniq5").rangeKm() > vehicle("g80-ev").rangeKm());
    }
}
