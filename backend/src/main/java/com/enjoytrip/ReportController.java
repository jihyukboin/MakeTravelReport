package com.enjoytrip;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api")
public class ReportController {
    private final JdbcTemplate db;
    public ReportController(JdbcTemplate db) { this.db = db; }
    public record Snapshot(String state) {}
    public record Photo(String imageUrl, String copyrightType) {}

    @PostMapping("/reports/{id}")
    public Map<String, Boolean> prepare(@PathVariable UUID id, @RequestBody Snapshot snapshot, HttpServletRequest request) {
        if (snapshot.state() == null || snapshot.state().length() > 1_000_000
                || !Boolean.TRUE.equals(db.queryForObject("SELECT JSON_VALID(?)", Boolean.class, snapshot.state()))) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "계획서 내용을 확인해 주세요.");
        }
        // Guests can open their completed plan in a new tab without creating another database table.
        request.getSession(true).setAttribute("report:" + id, snapshot.state());
        return Map.of("ok", true);
    }

    @GetMapping("/reports/{id}")
    public Snapshot get(@PathVariable UUID id, HttpServletRequest request) {
        var session = request.getSession(false);
        if (session != null && session.getAttribute("report:" + id) instanceof String state) return new Snapshot(state);
        if (session != null && "test".equals(session.getAttribute("user"))) {
            var rows = db.query("SELECT state FROM chat_conversations WHERE id=? AND owner_id='test'",
                    (rs, i) -> new Snapshot(rs.getString("state")), id.toString());
            if (!rows.isEmpty()) return rows.getFirst();
        }
        throw new ResponseStatusException(HttpStatus.NOT_FOUND, "계획서를 찾을 수 없습니다.");
    }

    @GetMapping("/attractions/{id}/photo")
    public Photo photo(@PathVariable String id) {
        var rows = db.query("SELECT image_url,copyright_type FROM attraction_images WHERE content_id=?",
                (rs, i) -> new Photo(rs.getString("image_url"), rs.getString("copyright_type")), id);
        return rows.isEmpty() ? new Photo(null, null) : rows.getFirst();
    }
}
