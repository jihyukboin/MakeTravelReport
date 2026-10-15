package com.enjoytrip;

import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.*;

@Service
public class RecommendationService {
    private final JdbcTemplate db;
    private static final double CHARGER_RADIUS_KM = 5;
    private static final double ROAD_FACTOR = 1.3;
    private static final Set<String> CATEGORIES = Set.of("NA01", "NA02", "HS01", "VE07");
    private static final Comparator<Destination> ORDER = Comparator.comparingDouble(Destination::score)
            .thenComparing(d -> d.attraction().id());

    public RecommendationService(JdbcTemplate db) { this.db = db; }

    public record Request(String departure, String sido, String sigungu, String category,
                          String vehicle, String moment, Integer batteryPercent, LocalDate date) {}
    public record Point(double latitude, double longitude) {}
    public record Origin(String label, Point point, boolean approximate) {}
    public record Vehicle(String id, String name, int rangeKm, String connector) {}
    public record Attraction(String id, String title, String address, String category, Point point) {}
    public record Charger(String id, String name, String address, String hours, Point point,
                          int available, int charging, double outputKw, String statusUpdatedAt) {}
    public record Sun(String location, LocalDate date, String moment, String time, double distanceKm) {}
    public record Destination(Attraction attraction, double distanceKm, double estimatedRoadKm,
                              Charger charger, double chargerDistanceKm, Sun sun, double score) {}
    public record Result(Origin origin, Vehicle vehicle, LocalDate date, int batteryPercent,
                         int reservePercent, double estimatedReachKm, int matchedCount,
                         List<Destination> destinations) {}

    public static Vehicle vehicle(String id) {
        if ("g80-ev".equals(id)) return new Vehicle(id, "Electrified G80 · 87.2 kWh", 427, "DC 콤보");
        if ("ioniq5".equals(id)) return new Vehicle(id, "아이오닉 5 롱레인지 · 84 kWh", 485, "DC 콤보");
        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "지원하지 않는 차량입니다.");
    }

    public Result recommend(Request request) {
        if (request == null || request.departure() == null || request.departure().isBlank()
                || request.departure().length() > 500 || request.sido() == null || request.sigungu() == null
                || !CATEGORIES.contains(Objects.toString(request.category(), ""))
                || !("sunrise".equals(request.moment()) || "sunset".equals(request.moment()))) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "출발지와 여행 취향을 확인해 주세요.");
        }
        Vehicle vehicle = vehicle(request.vehicle());
        int battery = request.batteryPercent() == null ? 100 : request.batteryPercent();
        if (battery <= 20 || battery > 100) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "출발 배터리는 21~100%로 입력해 주세요.");
        }
        LocalDate date = request.date() == null ? LocalDate.now(ZoneId.of("Asia/Seoul")) : request.date();
        Origin origin = findOrigin(request.sido(), request.sigungu());
        double reach = vehicle.rangeKm() * (battery - 20) / 100.0;
        // A latitude band is a conservative superset of the reachable circle.
        // Keep the exact Haversine + charger-leg check below as the final filter.
        double latitudeDelta = Math.toDegrees(reach / ROAD_FACTOR / 6371);

        List<Attraction> attractions = db.query("""
                SELECT content_id,title,CONCAT_WS(' ',address1,address2) address,category_code,latitude,longitude
                FROM attractions WHERE category_code LIKE ? AND latitude BETWEEN 33 AND 39
                AND longitude BETWEEN 124 AND 132 AND content_type_id IN ('12','14')
                AND latitude BETWEEN ? AND ?
                """, (rs, i) -> new Attraction(rs.getString("content_id"), rs.getString("title"),
                rs.getString("address"), rs.getString("category_code"),
                new Point(rs.getDouble("latitude"), rs.getDouble("longitude"))), request.category() + "%",
                origin.point().latitude() - latitudeDelta, origin.point().latitude() + latitudeDelta);

        if (attractions.isEmpty()) {
            return new Result(origin, vehicle, date, battery, 20, round(reach), 0, List.of());
        }
        DoubleSummaryStatistics latitudes = attractions.stream()
                .mapToDouble(a -> a.point().latitude()).summaryStatistics();
        double chargerLatitudeDelta = Math.toDegrees(CHARGER_RADIUS_KM / 6371);

        // Only public, non-deleted DC Combo chargers with a usable snapshot state.
        List<Charger> chargers = db.query("""
                SELECT s.station_id,s.name,s.address,s.operating_hours,s.latitude,s.longitude,
                SUM(st.status_code='2') available,SUM(st.status_code='3') charging,
                MAX(c.output_kw) output_kw,MAX(st.updated_at) status_updated_at
                FROM charging_stations s JOIN chargers c ON c.station_id=s.station_id
                JOIN charger_status st ON st.station_id=c.station_id AND st.charger_id=c.charger_id
                WHERE s.restricted=0 AND c.deleted=0 AND c.charger_type IN ('04','05','06','08')
                AND st.status_code IN ('2','3') AND s.latitude BETWEEN 33 AND 39
                AND s.longitude BETWEEN 124 AND 132
                AND s.latitude BETWEEN ? AND ?
                GROUP BY s.station_id,s.name,s.address,s.operating_hours,s.latitude,s.longitude
                """, (rs, i) -> new Charger(rs.getString("station_id"), rs.getString("name"),
                rs.getString("address"), rs.getString("operating_hours"),
                new Point(rs.getDouble("latitude"), rs.getDouble("longitude")),
                rs.getInt("available"), rs.getInt("charging"), rs.getDouble("output_kw"), rs.getString("status_updated_at")),
                latitudes.getMin() - chargerLatitudeDelta, latitudes.getMax() + chargerLatitudeDelta);
        ChargerGrid grid = new ChargerGrid(chargers);
        // A bounded max heap retains the best destination without sorting all candidates.
        BestDestination best = new BestDestination();
        int matched = 0;
        for (Attraction attraction : attractions) {
            double distance = distance(origin.point(), attraction.point());
            if (distance * ROAD_FACTOR > reach) continue;
            Charger charger = grid.nearest(attraction.point(), CHARGER_RADIUS_KM);
            if (charger == null) continue;
            double chargerDistance = distance(attraction.point(), charger.point());
            // Include the final attraction-to-charger leg within the battery budget.
            if ((distance + chargerDistance) * ROAD_FACTOR > reach) continue;
            matched++;
            double score = distance + chargerDistance * 4 + (charger.available() == 0 ? 10 : 0);
            best.offer(new Destination(attraction, round(distance), round(distance * ROAD_FACTOR),
                    charger, round(chargerDistance), null, score));
        }
        List<Destination> destinations = best.destinations().stream().map(d -> new Destination(
                d.attraction(), d.distanceKm(), d.estimatedRoadKm(), d.charger(), d.chargerDistanceKm(),
                findSun(d.attraction().point(), date, request.moment()), round(d.score()))).toList();
        return new Result(origin, vehicle, date, battery, 20, round(reach), matched, destinations);
    }

    private Origin findOrigin(String sido, String sigungu) {
        Map<String, String> aliases = Map.ofEntries(Map.entry("서울", "11"), Map.entry("부산", "26"),
                Map.entry("대구", "27"), Map.entry("인천", "28"), Map.entry("광주", "12"),
                Map.entry("전남", "12"), Map.entry("전라남도", "12"), Map.entry("대전", "30"),
                Map.entry("울산", "31"), Map.entry("세종", "36110"), Map.entry("경기", "41"),
                Map.entry("충북", "43"), Map.entry("충남", "44"), Map.entry("경북", "47"),
                Map.entry("경남", "48"), Map.entry("제주", "50"), Map.entry("강원", "51"), Map.entry("전북", "52"));
        String region = aliases.getOrDefault(sido, "");
        List<Origin> origins = db.query("""
                SELECT r.name region,d.name district,AVG(a.latitude) latitude,AVG(a.longitude) longitude
                FROM regions r JOIN districts d ON d.region_code=r.code
                JOIN attractions a ON a.region_code=d.region_code AND a.district_code=d.code
                WHERE (r.code=? OR r.name=?) AND (? LIKE CONCAT('%',d.name,'%') OR (?='' AND r.code='36110'))
                AND a.latitude BETWEEN 33 AND 39 AND a.longitude BETWEEN 124 AND 132
                GROUP BY r.name,d.name ORDER BY CHAR_LENGTH(d.name) DESC LIMIT 1
                """, (rs, i) -> new Origin(rs.getString("region") + " " + rs.getString("district") + " 관광지 중심",
                new Point(rs.getDouble("latitude"), rs.getDouble("longitude")), true), region, sido, sigungu, sigungu);
        if (origins.isEmpty()) throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY,
                "출발 지역의 좌표를 찾지 못했습니다. 출발지를 다시 선택해 주세요.");
        return origins.getFirst();
    }

    private Sun findSun(Point point, LocalDate date, String moment) {
        String column = "sunrise".equals(moment) ? "sunrise" : "sunset";
        List<Sun> times = db.query("SELECT l.name,l.latitude,l.longitude,t." + column + " time " +
                "FROM astronomy_locations l JOIN sun_times t ON t.location_name=l.name " +
                "WHERE t.observation_date=? AND t." + column + " IS NOT NULL AND l.latitude IS NOT NULL AND l.longitude IS NOT NULL",
                (rs, i) -> new Sun(rs.getString("name"), date, moment, rs.getString("time"),
                        round(distance(point, new Point(rs.getDouble("latitude"), rs.getDouble("longitude"))))), date);
        return times.stream().filter(s -> s.distanceKm() <= 50).min(Comparator.comparingDouble(Sun::distanceKm)).orElse(null);
    }

    public static double distance(Point a, Point b) {
        double lat = Math.toRadians(b.latitude() - a.latitude());
        double lon = Math.toRadians(b.longitude() - a.longitude());
        double h = Math.pow(Math.sin(lat / 2), 2) + Math.cos(Math.toRadians(a.latitude()))
                * Math.cos(Math.toRadians(b.latitude())) * Math.pow(Math.sin(lon / 2), 2);
        return 6371 * 2 * Math.asin(Math.sqrt(Math.min(1, h)));
    }

    private static double round(double value) { return Math.round(value * 10) / 10.0; }

    // Fixed Top-1 ranking. The same production implementation is benchmarked against full sorting.
    static class BestDestination {
        private final PriorityQueue<Destination> heap = new PriorityQueue<>(ORDER.reversed());
        void offer(Destination destination) {
            heap.offer(destination);
            if (heap.size() > 1) heap.poll();
        }
        List<Destination> destinations() { return List.copyOf(heap); }
    }

    // Uniform spatial hash: only nearby cells are searched, followed by exact Haversine filtering.
    static class ChargerGrid {
        private static final double CELL = 0.05;
        private final Map<Long, List<Charger>> cells = new HashMap<>();
        ChargerGrid(List<Charger> chargers) {
            for (Charger charger : chargers) cells.computeIfAbsent(key(row(charger.point().latitude()),
                    row(charger.point().longitude())), k -> new ArrayList<>()).add(charger);
        }
        Charger nearest(Point point, double radius) {
            int latCells = (int) Math.ceil(radius / (111 * CELL));
            int lonCells = (int) Math.ceil(radius / (111 * CELL * Math.cos(Math.toRadians(point.latitude()))));
            Charger best = null;
            double nearest = radius;
            for (int y = row(point.latitude()) - latCells; y <= row(point.latitude()) + latCells; y++) {
                for (int x = row(point.longitude()) - lonCells; x <= row(point.longitude()) + lonCells; x++) {
                    for (Charger charger : cells.getOrDefault(key(y, x), List.of())) {
                        double km = distance(point, charger.point());
                        if (km < nearest || (km == nearest && (best == null || charger.id().compareTo(best.id()) < 0))) {
                            best = charger; nearest = km;
                        }
                    }
                }
            }
            return best;
        }
        private static int row(double value) { return (int) Math.floor(value / CELL); }
        private static long key(int y, int x) { return ((long) y << 32) ^ (x & 0xffffffffL); }
    }
}
