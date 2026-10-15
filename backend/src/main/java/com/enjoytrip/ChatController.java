package com.enjoytrip;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api")
public class ChatController {
    private final JdbcTemplate db;
    private volatile boolean tableReady;
    public ChatController(JdbcTemplate db) { this.db = db; }

    public record Credentials(String id, String password) {}
    public record SavedChat(String id, String title, String state, String updatedAt) {}
    public record ChatBody(String title, String state) {}

    @GetMapping("/auth/me")
    public Map<String, Object> me(HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        return Map.of("authenticated", session != null && "test".equals(session.getAttribute("user")));
    }

    @PostMapping("/auth/login")
    public Map<String, String> login(@RequestBody Credentials credentials, HttpServletRequest request) {
        if (!"test".equals(credentials.id()) || !"test".equals(credentials.password())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "아이디 또는 비밀번호를 확인해 주세요.");
        }
        HttpSession previous = request.getSession(false);
        if (previous != null) previous.invalidate();
        request.getSession(true).setAttribute("user", "test");
        return Map.of("id", "test");
    }

    @PostMapping("/auth/logout")
    public Map<String, Boolean> logout(HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        if (session != null) session.invalidate();
        return Map.of("ok", true);
    }

    @GetMapping("/chats")
    public List<SavedChat> chats(HttpServletRequest request) {
        String owner = requireUser(request);
        ensureTable();
        return db.query("SELECT id,title,state,updated_at FROM chat_conversations WHERE owner_id=? ORDER BY updated_at DESC,id",
                (rs, i) -> new SavedChat(rs.getString("id"), rs.getString("title"), rs.getString("state"), rs.getString("updated_at")), owner);
    }

    @PutMapping("/chats/{id}")
    public Map<String, Boolean> save(@PathVariable UUID id, @RequestBody ChatBody body, HttpServletRequest request) {
        String owner = requireUser(request);
        if (body.title() == null || body.title().isBlank() || body.title().length() > 200
                || body.state() == null || body.state().length() > 1_000_000) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "대화 내용을 확인해 주세요.");
        }
        ensureTable();
        if (!Boolean.TRUE.equals(db.queryForObject("SELECT JSON_VALID(?)", Boolean.class, body.state()))) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "대화 형식이 올바르지 않습니다.");
        }
        db.update("""
                INSERT INTO chat_conversations(id,owner_id,title,state) VALUES(?,?,?,?)
                ON DUPLICATE KEY UPDATE title=VALUES(title),state=VALUES(state),updated_at=CURRENT_TIMESTAMP(6)
                """, id.toString(), owner, body.title(), body.state());
        return Map.of("ok", true);
    }

    private String requireUser(HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        if (session == null || !"test".equals(session.getAttribute("user"))) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "로그인이 필요합니다.");
        }
        return "test";
    }

    // One fixed user needs no users table. A single row stores each conversation's UI state.
    private synchronized void ensureTable() {
        if (tableReady) return;
        db.execute("""
                CREATE TABLE IF NOT EXISTS chat_conversations (
                  id CHAR(36) PRIMARY KEY, owner_id VARCHAR(20) NOT NULL,
                  title VARCHAR(200) NOT NULL, state JSON NOT NULL,
                  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                  updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                  INDEX idx_chat_owner_updated (owner_id,updated_at)
                ) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_bin
                """);
        tableReady = true;
    }

    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<Map<String, String>> error(ResponseStatusException e) {
        return ResponseEntity.status(e.getStatusCode()).body(Map.of("message", e.getReason() == null ? "요청을 확인해 주세요." : e.getReason()));
    }
}
