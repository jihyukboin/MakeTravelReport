package com.enjoytrip;

import org.springframework.dao.DataAccessException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/recommendations")
public class RecommendationController {
    private final RecommendationService service;
    public RecommendationController(RecommendationService service) { this.service = service; }

    @PostMapping
    public RecommendationService.Result recommend(@RequestBody RecommendationService.Request request) {
        try {
            return service.recommend(request);
        } catch (DataAccessException e) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "여행 데이터를 조회하지 못했습니다. DB 연결을 확인한 후 다시 시도해 주세요.");
        }
    }

    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<java.util.Map<String, String>> error(ResponseStatusException e) {
        return ResponseEntity.status(e.getStatusCode()).body(java.util.Map.of("message",
                e.getReason() == null ? "추천 요청을 확인해 주세요." : e.getReason()));
    }
}
