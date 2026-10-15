<div align="center">

<img src="docs/media/cover.svg" alt="MakeTravelReport — 취향에서 출발해 충전의 여유까지 담는 전기차 여행 계획서" width="100%" />

# MakeTravelReport

**취향을 고르면, 여행지와 충전소를 잇는 나만의 계획서가 완성됩니다.**

출발지 · 전기차 · 배터리 · 여행 취향을 바탕으로 관광지 한 곳을 추천하고,<br />
실제 도로 경로와 일몰 시각을 담은 여행 계획서를 PDF로 내려받는 EnjoyTrip 서비스입니다.

`Java 21` · `Spring Boot 4.1` · `Next.js 16` · `React 19` · `MySQL 8.4` · `Docker Compose`

[▶ 전체 시연 영상](docs/media/walkthrough.mp4) · [서비스 화면](#서비스-화면) · [알고리즘 기획서](#알고리즘-적용-기획서) · [시작하기](#시작하기) · [요구사항 검증](#pdf-요구사항-검증)

</div>

---

## 프로젝트 소개

전기차 여행은 가고 싶은 장소뿐 아니라 **현재 배터리로 갈 수 있는지, 여행지 가까이에 호환 충전소가 있는지**까지 함께 살펴야 합니다. MakeTravelReport는 흩어진 공공데이터를 관계형 DB로 연결하고, 공간 탐색과 후보 선정 알고리즘으로 이 과정을 줄입니다.

사용자는 네 번의 A/B 선택으로 여행 취향을 정합니다. 서버는 실제 관광지·충전소 데이터 안에서 조건을 만족하는 한 곳을 고르고, 인근 일출·일몰 시각과 함께 제안합니다. 완성된 계획서에서는 TMAP 도로 경로, 구간별 시간·거리·통행료, 충전소 정보를 확인할 수 있습니다.

| 전국 관광지 | 충전소 / 충전기 | 정규화 데이터 | 적용 알고리즘 |
| :---: | :---: | :---: | :---: |
| **49,614곳** | **101,091곳 / 527,433대** | **15개 테이블 · 2,005,033행** | **공간 해시 + 힙 기반 Top-1** |

> 데이터 건수는 2026-10-15 로컬 MySQL 검증 기준입니다. 충전 상태는 수집 시점의 스냅샷입니다. [검증 원본](docs/evidence/mysql-verification.json)

## 시연 영상

[![실제 브라우저에서 처음부터 끝까지 조작한 여행 계획서 생성 과정 — 클릭하면 전체 영상](docs/media/walkthrough-preview.gif)](docs/media/walkthrough.mp4)

**[▶ 전체 영상 MP4](docs/media/walkthrough.mp4)** · **[원본 WebM](docs/media/walkthrough.webm)** · **[실제 생성된 여행 계획서 PDF](docs/media/sample-travel-plan.pdf)**

위 GIF는 실제 녹화의 약 2.9배속 미리보기입니다. 전체 영상은 홈부터 로그인, 주소 검색, 취향 선택, 추천, 대화 복원, 계획서와 PDF 다운로드, 로그아웃까지 **한 브라우저 탭에서 연속 녹화**했습니다. 새 창으로 열린 계획서는 녹화 중인 탭에서도 같은 주소를 열어 보여 줍니다. 정지 이미지를 이어 붙인 영상이나 API 모의 응답을 사용하지 않았습니다.

| 구간 | 실제 조작 |
| --- | --- |
| 00:00–00:07 | 홈 → 데모 계정 로그인 → 여행 메시지 입력 |
| 00:07–00:14 | 카카오 우편번호 서비스에서 서울시청 검색 → 출발지 설정 |
| 00:14–00:23 | G80 · 배터리 80% · 날짜 → 자연 → 물가 → 일몰 |
| 00:23–00:32 | 한강·서울숲공원주차장 추천 → 새로고침 후 결과 복원 |
| 00:32–00:44 | 계획서 → 차량·동선·TMAP 지도 → 충전소·일몰 → PDF 다운로드 |
| 00:44–종료 | 대화로 복귀 → 로그아웃 → 홈 |

촬영: **2026-10-15, 1440×1000, Chromium**. 관광지·충전소는 실제 MySQL, 주소 검색과 도로 지도는 실제 외부 서비스 응답입니다. 예제 여행일은 출몰시각 데이터가 있는 `2026-10-15`이며, 화면과 PDF의 교통 시간은 각각 조회한 시점에 따라 달라질 수 있습니다. [촬영 단계·추천 응답·API 상태 기록](docs/media/capture.json)

## 서비스 화면

### 여행의 시작

| 홈 | 로그인 |
| --- | --- |
| ![새 여행 메시지와 추천 질문을 보여 주는 홈](docs/media/01-home.webp) | ![서버 액션과 세션 쿠키를 사용하는 로그인](docs/media/02-login.webp) |
| 여행 이야기를 입력하면 새 대화를 시작합니다. | 데모 계정으로 저장한 대화를 이어 갑니다. |

| 실제 주소 검색 | 출발지 확정 |
| --- | --- |
| ![카카오 주소 검색에서 서울시청 도로명주소를 찾은 화면](docs/media/03-address-search.webp) | ![서울시청 주소를 확인하고 출발지로 설정](docs/media/04-departure.webp) |
| 도로명·건물명·지번으로 출발지를 찾습니다. | 상세주소를 더하고 다음 단계로 이동합니다. |

### 네 번의 선택으로 완성하는 취향

| 01 차량·배터리·날짜 | 02 여행 분위기 |
| --- | --- |
| ![전기차 두 모델과 배터리 및 날짜 선택](docs/media/05-vehicle.webp) | ![자연과 역사 문화 중 분위기 선택](docs/media/06-atmosphere.webp) |

| 03 구체적인 풍경 | 04 기억하고 싶은 순간 |
| --- | --- |
| ![물가와 산 숲 중 세부 취향 선택](docs/media/07-preference.webp) | ![일출과 일몰 중 원하는 순간 선택](docs/media/08-moment.webp) |

### 추천에서 계획서까지

| 여행지·충전소 추천 | 새로고침 후 복원 |
| --- | --- |
| ![배터리 예산과 호환 충전소를 고려한 한강 추천](docs/media/09-recommendation.webp) | ![새로고침 후 저장된 대화와 추천 복원](docs/media/11-restored-chat.webp) |
| 조건을 통과한 후보 가운데 비용이 가장 낮은 한 곳을 고릅니다. | 질문·답변·선택·추천 결과를 그대로 이어 봅니다. |

<details>
<summary><strong>충전소 정보와 계획서 연결 자세히 보기</strong></summary>

![호환 충전소의 운영 시간·기록 시각·지도와 계획서 열기 버튼](docs/media/10-charger.webp)

</details>

| 여행 계획서 표지 | 실제 도로 경로 |
| --- | --- |
| ![관광지 사진과 선택 취향을 담은 한강 계획서](docs/media/12-report-cover.webp) | ![TMAP 자동차 지도와 거리 시간 안내](docs/media/14-report-routes.webp) |
| 선택한 취향을 사진과 함께 문서로 정리합니다. | 출발지→여행지→충전소의 도로 동선을 확인합니다. |

| 차량과 여정 | 충전소와 하늘 |
| --- | --- |
| ![전기차 모델과 출발지 여행지 충전소 동선](docs/media/13-report-vehicle.webp) | ![충전소 정보와 서울 관측 기준 일몰 시각](docs/media/15-report-charging.webp) |

<details>
<summary><strong>다운로드한 PDF와 마지막 단계 보기</strong></summary>

| 실제 PDF 첫 페이지 | 실제 PDF 마지막 페이지 |
| --- | --- |
| ![서버에서 생성해 다운로드한 한글 PDF 첫 페이지](docs/media/pdf-page-1.webp) | ![충전소와 일몰을 담은 실제 PDF 마지막 페이지](docs/media/pdf-page-6.webp) |

| 다운로드 완료 | 로그아웃 |
| --- | --- |
| ![PDF 다운로드를 마친 시점](docs/media/16-pdf-download.webp) | ![로그아웃 후 홈으로 돌아온 마지막 단계](docs/media/17-logout.webp) |

PDF는 웹페이지 캡처가 아니라 서버의 `@react-pdf/renderer`로 생성합니다. 촬영에서 내려받은 문서는 **6페이지**이며, 한글 텍스트 추출과 여행지명 포함 여부를 검사했습니다. 경로 안내 길이에 따라 페이지 수는 달라질 수 있습니다.

</details>

## 주요 기능

| 영역 | 구현 내용 |
| --- | --- |
| 출발지 | 실제 카카오 우편번호 검색, 도로명·지번·상세주소 선택 |
| 맞춤 질문 | 차량 → 분위기 → 세부 취향 → 일출/일몰의 A/B 분기 |
| 전기차 | G80 EV·아이오닉 5, 배터리 21–100%, 잔량 20% 확보 기준 |
| 관광지 추천 | 취향·거리·배터리·주변 충전소 조건을 통과한 최적 후보 1곳 |
| 충전소 탐색 | 반경 5km, 공개·미삭제·DC 콤보 호환·사용 가능한 상태 기록 |
| 출몰시각 | 여행일과 일치하는 50km 이내 가장 가까운 관측지 시각 |
| 대화 저장 | 데모 계정 세션, 자동 저장, 저장 실패 재시도, 새로고침 후 복원 |
| 계획서 | 서버 렌더링, 관광지 사진, 차량, 동선, 충전소, 일출·일몰 |
| 도로 안내 | TMAP 주소 좌표 변환, 두 구간 도로 경로·지도·시간·통행료 |
| PDF | 한글 폰트 임베드, 관광지·차량 이미지, 구간별 도로 안내 다운로드 |

## 서비스 구조

```mermaid
flowchart LR
    U[사용자] --> B[브라우저 · 3003]
    B --> N[Next.js App Router]
    N --> S[Server Components / Server Actions]
    N --> P[동일 출처 API 프록시]
    S --> J[Spring Boot · 3002]
    P --> J
    J --> A[공간 해시 + Top-1 힙]
    A --> DB[(MySQL 8.4 · Docker · 3307)]
    J --> DB
    S --> T[TMAP 좌표 · 도로 경로 · 지도]
    S --> R[한글 PDF 생성]
    B --> K[카카오 우편번호 검색]
    D[공공데이터 API] --> C[수집 · 정규화 · 검증]
    C --> DB
```

인증 상태와 대화 이력은 서버에서 읽어 렌더링합니다. 브라우저 조작이 필요한 채팅·주소 검색·선택 카드에 클라이언트 컴포넌트를 사용합니다. 세션 쿠키는 HttpOnly이며 Next.js 서버가 Spring으로 전달합니다. TMAP 키와 DB 암호는 브라우저 번들에 포함하지 않습니다.

### 데이터 모델

```mermaid
erDiagram
    regions ||--o{ districts : contains
    regions o|--o{ attractions : locates
    districts o|--o{ attractions : locates
    categories o|--o{ categories : parent
    categories o|--o{ attractions : classifies
    content_types ||--o{ attractions : defines
    attractions ||--o| attraction_images : image
    photos ||--o{ photo_keywords : tags
    keywords ||--o{ photo_keywords : links
    charging_operators o|--o{ charging_stations : operates
    charging_stations ||--o{ chargers : contains
    chargers ||--o| charger_status : snapshot
    astronomy_locations ||--o{ sun_times : observes
```

공공데이터는 **15개 테이블**, 앱 대화는 별도의 `chat_conversations`에 저장합니다. 관광사진과 관광지는 서로 다른 ID 체계를 사용하므로 임의로 연결하지 않습니다. 충전소의 지역 코드도 관광 지역 코드에 억지로 연결하지 않습니다. [스키마](infra/schema.sql) · [정규화·적재 설명](infra/README.md)

## 알고리즘 적용 기획서

문제 영역은 **대규모 충전소에서 주변 시설을 찾는 탐색**과 **조건을 통과한 관광지 중 최적 한 곳을 고르는 선정**입니다. 두 알고리즘은 실제 `POST /api/recommendations`에서 함께 실행됩니다. Haversine은 거리 계산식으로 사용하며 별도 탐색 알고리즘으로 세지 않습니다. 도로 경로는 TMAP 응답이며 직접 구현한 최단 경로 알고리즘으로 주장하지 않습니다.

### 기획서 1 공간 해시를 이용한 주변 호환 충전소 탐색

| 항목 | 내용 |
| --- | --- |
| 내용 | 관광지 반경 5km 안에서 가장 가까운 호환 충전소 찾기 |
| 적용 알고리즘 | 균일 격자 공간 해시 탐색 + Haversine 정확 거리 필터 |
| 자료구조 | `HashMap<Long, List<Charger>>` |
| 적용 서비스 | 전기차 여행지 추천의 주변 충전소 연결 |
| 구현 | [RecommendationService.java — ChargerGrid](backend/src/main/java/com/enjoytrip/RecommendationService.java) |

**알고리즘 개요.** 관광지마다 전국 충전소를 모두 살펴보면 관광지 수 A, 충전소 수 S에 대해 O(A×S)의 거리 계산이 필요합니다. 공간 해시는 충전소를 위도·경도 0.05도 크기의 격자로 나누어 해시맵에 저장합니다. 관광지의 반경과 겹치는 셀만 방문하므로, 멀리 떨어진 충전소는 처음부터 거리 계산 대상에서 빠집니다.

**적용 서비스 개발 개요.** DB에서 공개 충전소, 삭제되지 않은 충전기, DC 콤보 호환 유형 `04/05/06/08`, 상태 기록 `2/3`을 통과한 데이터를 읽습니다. 각 좌표를 `floor(latitude / 0.05)`, `floor(longitude / 0.05)`로 변환하고 두 정수를 하나의 `long` 키로 결합합니다. 같은 셀의 충전소는 리스트로 저장하므로 해시 충돌과 실제 공간 근접성을 혼동하지 않습니다.

조회할 때는 위도 방향 셀 수와 위도의 코사인을 고려한 경도 방향 셀 수를 각각 올림해 탐색 범위를 잡습니다. 격자는 후보를 줄이는 장치이며, 최종 판정은 지구 반지름 6,371km를 사용하는 Haversine 거리로 합니다. **5km 경계를 포함**하고, 같은 거리라면 충전소 ID 순으로 결과를 고정합니다. 선택된 충전소까지 이동하는 거리도 배터리 예산에 포함합니다.

SQL에서는 도달 가능한 위도 대역과 관광지 주변 충전소 위도 대역을 먼저 제한합니다. 위도 차이만으로 계산한 거리는 실제 대권 거리 이하이므로 이 대역은 유효 후보를 포함하는 보수적 범위입니다. 정확한 도달 여부는 다시 Java에서 검사합니다. 특정 셀에 데이터가 몰리면 공간 해시의 이점이 줄어드는 특성도 고려했습니다.

```text
충전소 전처리: cell(lat, lon) → 해시맵에 충전소 추가
관광지 조회: 반경과 겹치는 셀 순회
             → 셀 안의 충전소만 Haversine 계산
             → 거리 ≤ 5km 중 최소 거리 / 최소 ID 선택
```

| 분석 | 복잡도·검증 |
| --- | --- |
| 인덱스 생성 | 시간 O(S), 추가 공간 O(S) |
| 관광지 한 곳 조회 | 방문 셀 안 후보 수에 비례, 최악 O(S) |
| 전체 탐색 | O(S + A×B), B는 방문 셀 안 후보 수; 고밀도 최악 O(A×S) |
| 정확도 | 2,000개·500지점 기존 회귀 + 10,000개·1,000지점 전체 탐색 비교, 셀 경계·반경 경계·동점 검사 |

### 기획서 2 우선순위 큐를 이용한 최적 여행지 선정

| 항목 | 내용 |
| --- | --- |
| 내용 | 취향·충전·배터리 조건을 통과한 관광지 중 최적 1곳 선정 |
| 적용 알고리즘 | 가중 비용 평가 + 최대 힙 기반 스트리밍 Top-1 선정 |
| 자료구조 | 역순 비교자를 사용하는 `PriorityQueue<Destination>` |
| 적용 서비스 | 취향과 충전 여유를 함께 고려하는 여행지 추천 |
| 구현 | [RecommendationService.java — BestDestination](backend/src/main/java/com/enjoytrip/RecommendationService.java) |

**알고리즘 개요.** 최종 화면에는 여행지 한 곳만 필요합니다. 조건을 만족하는 후보를 전부 저장해 정렬하면 M개 후보에 대해 O(M log M)의 시간과 O(M)의 후보 참조 공간을 씁니다. 이 프로젝트는 후보를 하나씩 평가하면서 가장 좋은 한 곳만 힙에 남겨 전체 정렬과 후보 목록 보관을 줄입니다.

**적용 서비스 개발 개요.** 먼저 취향의 관광 분류와 관광 콘텐츠 유형을 적용합니다. 출발 좌표는 해당 시군구 관광지의 평균이며, 차량 인증 주행거리에 `(출발 배터리 − 20) / 100`을 곱해 이동 예산을 계산합니다. 출발지에서 관광지까지의 거리만으로도 예산을 넘는 후보는 충전소 탐색 전에 제외합니다. 나머지는 공간 해시로 충전소를 찾고 `(출발→관광지 + 관광지→충전소 직선거리) × 1.3`이 예산 안에 있는지 검사합니다.

통과한 후보의 비용은 **출발→관광지 거리 + 4×관광지→충전소 거리 + 충전 가능 기기가 0대일 때 10점**입니다. 충전소 접근성이 좋은 후보를 선호하되, 이 점수는 학습된 선호 확률이나 최적 도로 비용이 아닌 서비스의 명시적인 선정 규칙입니다. 비용이 같으면 관광지 ID 순으로 고정합니다. 비교에는 반올림 전 비용을 사용하고 화면 표시 단계에서만 반올림합니다.

새 후보를 최대 힙에 넣고 크기가 1을 넘으면 가장 나쁜 후보를 제거합니다. 매 단계 뒤 힙에는 지금까지 본 후보 중 가장 좋은 한 곳이 남습니다. 첫 후보에 대해 성립하고, 다음 후보를 추가한 뒤 더 나쁜 쪽을 제거해도 유지되므로 마지막까지 처리하면 전체 최적 한 곳이 남습니다. 인근 일출·일몰 조회는 최종 선정 뒤에 수행해 후보마다 반복하지 않습니다.

```text
reach = vehicleRange × (batteryPercent − 20) / 100
후보 관광지 순회:
    출발→관광지 × 1.3 > reach 이면 건너뜀
    5km 이내 호환 충전소가 없으면 건너뜀
    (출발→관광지 + 관광지→충전소) × 1.3 > reach 이면 건너뜀
    score = 출발→관광지 + 4×관광지→충전소 + 충전 대기 패널티
    최대 힙에 추가 → 크기 > 1이면 최악 후보 제거
최종 1곳에 선택 날짜의 인근 출몰시각 연결
```

| 분석 | 복잡도·검증 |
| --- | --- |
| M개 유효 후보 선정 | O(M log 2) = O(M) |
| 선정용 추가 후보 공간 | O(1), 처리 후 1개·삽입 직후 최대 2개 |
| 전체 메모리 | 관광지·충전소 목록과 격자는 별도로 O(A+S); 서비스 전체가 O(1)은 아님 |
| 정확도 | 전체 탐색+정렬과 추천 ID·충전소 ID·후보 수 비교, 21/40/80/100% 배터리, 동점·빈 후보 검사 |

## 성능과 정확도 검증

![두 알고리즘의 기준 방식과 개선 방식 중앙값 실행시간 비교](docs/media/benchmark.svg)

| 측정 대상 | 기준 방식 | 적용 방식 | 중앙값 비교 |
| --- | --- | --- | --- |
| 주변 충전소 탐색 | 10,000개 전체 탐색 × 1,000지점 | 실제 ChargerGrid, 인덱스 생성 포함 | **541.370ms → 7.372ms · 73.43배** |
| 최적 여행지 선정 | 100,000개 후보 전체 정렬 | 실제 BestDestination Top-1 | **29.299ms → 3.028ms · 9.67배** |

**조건:** Java `21.0.12.1`, 고정 난수 `42` / `20261015`, 워밍업 2회 후 5회 중앙값. 공간 탐색은 한국 영역에 균일 분포한 합성 좌표이며 **1,000개 조회 결과가 기준 방식과 모두 일치**했습니다. 선정 측정은 미리 만든 후보를 사용해 후보 생성 비용을 제외하고 두 방식 모두 같은 최종 후보를 반환하는지 검사했습니다. 시간 측정값 자체를 테스트 통과 조건으로 사용하지 않습니다.

| 현재 스레드의 작업 1회 할당량 | 기준 방식 | 적용 방식 |
| --- | --- | --- |
| 충전소 탐색 | 4,248 bytes | 3,822,496 bytes |
| 최적 후보 선정 | 861,600 bytes | 192 bytes |

공간 인덱스는 추가 메모리로 거리 계산을 줄입니다. 선정 알고리즘은 전체 정렬용 복사 배열의 할당을 줄입니다. 메모리는 JDK `ThreadMXBean`의 현재 스레드 할당량이며 **최대 힙 사용량·프로세스 RSS·유지 메모리가 아닙니다**. 합성 입력의 알고리즘 비교이며 실제 API 전체 응답속도나 모든 데이터 분포의 개선 배율을 뜻하지 않습니다.

[공간 탐색 측정 JSON](docs/evidence/algorithm-benchmark.json) · [선정 측정 JSON](docs/evidence/ranking-benchmark.json) · [측정·정확도 소스](backend/src/test/java/com/enjoytrip/AlgorithmBenchmarkTests.java)

### 검증 결과

| 검사 | 결과와 근거 |
| --- | --- |
| 백엔드 | **21개 통과 · 실패 0 · 건너뜀 0**, 실제 MySQL 통합 검사 포함 — [기록](docs/evidence/backend-tests.json) |
| 프론트엔드 | ESLint, Next.js 타입 생성, TypeScript, 프로덕션 빌드 통과 — [기록](docs/evidence/frontend-checks.json) |
| DB | 15개 테이블 행 수 일치, 외래키 13개 검사, 고아 행 0 — [기록](docs/evidence/mysql-verification.json) |
| 인프라 | Python 구문·Compose 설정 검사, 인덱스 반복 실행 확인 — [기록](docs/evidence/infra-checks.json) |
| 브라우저 | 로그인→검색→추천→복원→계획서→PDF→로그아웃, JavaScript 오류 0 — [기록](docs/media/capture.json) |
| 저장 회귀 | 같은 상태 중복 저장 방지, 503 오류 후 재시도 성공 — [기록](docs/evidence/chat-saving.json) |

저장 회귀 검사는 오류 분기를 재현하기 위해 저장 요청 한 건에만 503을 주입합니다. **시연 영상의 API 응답은 모의 응답으로 대체하지 않았습니다.**

## 코드 최적화

| 영역 | 개선 | 효과·검증 |
| --- | --- | --- |
| 백엔드 | 관광지·충전소의 위도 대역 SQL 필터 | 유효 후보를 포함하는 보수적 범위로 조회·격자 구성을 줄이고 정확 거리 재검사 |
| 백엔드 | 배터리 초과 후보의 충전소 탐색 생략 | 결과에 영향 없는 조기 제외, 전체 탐색 기준과 결과 비교 |
| 백엔드 | 빈 관광지 목록의 충전소 조회 생략 | 불필요한 전국 충전소 쿼리 제거, 전용 회귀 검사 |
| 백엔드 | 대화 테이블 DDL을 첫 사용 시 한 번만 실행 | 매 조회·저장마다 반복하던 DDL 제거, 실패하면 다음 요청에서 재시도 |
| 프론트 | 저장 대기 상태까지 중복 확인 | 자동 저장과 계획서 열기의 flush가 같은 상태를 중복 전송하지 않음 |
| 프론트 | 통신 제한시간과 실패 재시도 처리 | 무한 대기를 막고 실패한 상태는 다시 저장 가능 |
| 프론트 | 세션 렌더링 Suspense·계획서 로딩 화면 | Cache Components를 유지하며 운영 빌드의 동적 데이터 경계 오류 해결 |
| 프론트 | PDF 라우트 런타임 선언 충돌 제거 | 기본 Node.js 런타임으로 운영 빌드 호환 |
| 프론트 | TMAP 키 누락 시 즉시 대체 표시 | 실패가 확정된 외부 요청 생략 |
| 프론트 | 사진 실패 시 PDF 텍스트 표지 | 외부 이미지 오류로 PDF 전체 생성이 실패하지 않음 |
| 인프라 | 관광지 분류·유형·좌표 복합 인덱스 | 추천 쿼리 지원, 기존 데이터 보존 인덱스 추가 |
| 인프라 | verify-only 데이터 검사 | 재적재 없이 행 수·외래키 검증 |
| 인프라 | 적재 오류 출력을 임시파일에 기록 | stderr 파이프가 가득 차며 멈출 수 있는 위험 제거 |
| 인프라 | 필수 환경변수 검사·로그 회전 | 누락 설정 조기 발견, 로그 크기 제한 |

설정·소스 변경을 실행 프로세스에 적용하려면 사용자가 서버와 Compose를 다시 실행해야 합니다. 검증 중 개발 서버를 임의로 재시작하지 않았으며, 변경된 Java 코드는 테스트 프로세스에서 실제 DB에 연결해 검사했습니다.

## PDF 요구사항 검증

기준: `자바전공_enjoytrip_16_04_알고리즘.pdf`, Algorithm PJT 4회차, **2026-10-15**. 교육용 명세서 원본은 저장소에 재배포하지 않습니다.

| 명세 위치 | 조건 | 상태 | 근거 |
| --- | --- | :---: | --- |
| p.5 · 요구사항 1 | EnjoyTrip에서 알고리즘 적용 문제를 찾아 구현 | 충족 | 전기차 관광지·호환 충전소 추천 API와 실제 시연 |
| p.5 · 요구사항 2 | 알고리즘 2개 이상 적용 | 충족 | 공간 해시, 최대 힙 기반 Top-1 선정 |
| p.5 · 요구사항 3·4 | 알고리즘별 내용·명칭·개요·적용 서비스·개발 개요 | 충족 | 위 두 기획서의 모든 항목과 구현 설명 |
| p.3 · 목표 | 자료구조·Big-O, 정확도·시간·메모리 평가 | 근거 확보 | 복잡도 표, 기준 방식 비교, 두 벤치마크·할당량 |
| p.3–4 · 준비사항 | 공공데이터와 Java·MySQL 활용 | 활용 | 관광·사진·충전·출몰시각 4종, Java/Spring·MySQL |
| p.4 · 참고 데이터 | 지역별 날씨 | 미연동 | 기존 OpenWeather 키 401 이력. p.5에 모든 참고 API의 필수 구현 지시는 없음 |
| p.6 · 제출물 1 | 알고리즘 적용 기획서 | 작성 완료 | README의 알고리즘 기획서 2건 |
| p.6 · 제출물 2 | 알고리즘을 적용한 EnjoyTrip 프로젝트 | 구현·검증 | backend·frontend·infra와 동작 자료 |
| p.6 · 제출 방식 | README·Word·PPT 문서화, GitLab 업로드 | 문서 완료 / 업로드 별도 | 요청한 README 형식. 외부 GitLab 업로드는 수행하지 않음 |

**판정:** 코드·기획서의 필수 요구사항은 충족합니다. 수업 제출 완료 여부는 지정된 GitLab 업로드와 반별 제출 방식 확인이 남아 있습니다. 명세에 없는 응답시간·개선 배율 합격 기준을 임의로 만들지 않았습니다.

## 시작하기

### 1 사전 준비

- JDK **21**, Node.js **24 권장**, npm, Python **3**, Docker Engine·Compose
- 공공데이터포털 서비스 키: 새 데이터를 수집할 때 필요
- TMAP 서버용 키: 실제 도로 경로·지도·시간을 사용할 때 필요
- MySQL 데이터: 아래 수집·정규화·적재를 실행해야 추천이 동작합니다.

### 2 환경변수

루트에서 예제를 복사합니다.

```bash
cp infra/.env.example infra/.env
cp frontend/.env.example frontend/.env.local
```

`infra/.env`:

```dotenv
DATA_GO_KR_SERVICE_KEY=YOUR_DECODED_SERVICE_KEY
OPENWEATHER_API_KEY=YOUR_OPENWEATHER_KEY
MYSQL_DATABASE=enjoytrip
MYSQL_USER=enjoytrip
MYSQL_PASSWORD=SET_YOUR_PASSWORD
MYSQL_ROOT_PASSWORD=SET_YOUR_ROOT_PASSWORD
MYSQL_PORT=3307
```

`frontend/.env.local`:

```dotenv
API_BASE_URL=http://localhost:3002
TMAP_APP_KEY=YOUR_SERVER_SIDE_TMAP_KEY
```

TMAP 키가 없어도 추천과 계획서·PDF는 사용할 수 있으나 도로 지도·회전 안내·실제 시간은 제공되지 않습니다. `OPENWEATHER_API_KEY`는 기존 설정 항목이며 현재 앱은 사용하지 않습니다. 비밀 설정과 수집 데이터는 Git에서 제외합니다.

### 3 DB 준비

```bash
# MySQL만 Docker에서 실행합니다.
docker compose -f infra/compose.yaml up -d --wait

# 공공데이터 수집 → 검증·정규화 → MySQL 적재
python3 infra/scripts/collect.py
python3 infra/scripts/collect.py --only sun --sun-start 2026-10-15 --sun-end 2026-11-13
python3 infra/scripts/normalize.py
python3 infra/scripts/load_mysql.py
```

기본 `load_mysql.py`는 이 프로젝트의 공공데이터 테이블을 교체합니다. **이미 데이터가 있는 DB를 확인만 할 때는 아래 명령을 사용하세요.** 채팅 테이블은 교체 대상에 포함하지 않습니다.

```bash
python3 infra/scripts/load_mysql.py --verify-only
python3 infra/scripts/optimize_mysql.py
```

수집은 호출 한도와 기간에 따라 오래 걸릴 수 있습니다. 성공 응답은 재사용하며 API 키·원본·정규화 결과는 저장소에 포함하지 않습니다. [수집 범위와 상세 안내](infra/README.md)

### 4 백엔드

```bash
cd backend
./gradlew bootRun
```

`http://localhost:3002`. backend 디렉터리에서 실행하면 `../infra/.env`를 읽습니다.

### 5 프론트엔드

새 터미널에서 실행합니다.

```bash
cd frontend
npm ci
npm run dev
```

접속: **http://localhost:3003**. 데모 계정: **ID `test` / PW `test`**. 회원가입이나 다중 사용자 계정 서비스는 구현하지 않았으며 이 계정의 저장 대화는 공유됩니다.

## 테스트와 재현

```bash
# DB 전용 테스트는 환경변수가 없으면 건너뜁니다.
cd backend
./gradlew test

# 실행 중인 MySQL까지 검사하고 벤치마크 다시 생성
ENJOYTRIP_DB_TEST=true ./gradlew test --rerun-tasks

# 프론트 정적 검사와 운영 빌드
cd ../frontend
npm run lint
npx next typegen
npx tsc --noEmit
npm run build

# 루트에서 인프라 확인
cd ..
python3 -m py_compile infra/scripts/*.py
docker compose -f infra/compose.yaml config --quiet
python3 infra/scripts/load_mysql.py --verify-only
```

최신 측정은 `backend/build/reports/algorithm-benchmark.json`, `ranking-benchmark.json`에 생성됩니다. `docs/evidence/`는 README 작성 시점의 제출용 기록입니다.

<details>
<summary><strong>실제 브라우저 촬영과 저장 회귀 검사 재현</strong></summary>

백엔드·프론트·MySQL이 실행 중이어야 합니다. 스크립트는 서버를 시작하거나 종료하지 않습니다.

```bash
python3 -m venv /tmp/enjoytrip-demo
/tmp/enjoytrip-demo/bin/pip install -r scripts/requirements-demo.txt
/tmp/enjoytrip-demo/bin/playwright install chromium
/tmp/enjoytrip-demo/bin/python scripts/capture_demo.py
/tmp/enjoytrip-demo/bin/python scripts/verify_chat_saving.py
```

캡처는 docs/media에 17개 화면·원본 WebM·PDF·촬영 기록을 저장하며 데모 계정에 실제 대화를 만듭니다. 외부 주소 검색의 한글 표시에는 저장소의 OFL 폰트를 촬영 브라우저의 임시 fontconfig에 등록합니다. 저장 회귀 검사는 촬영한 대화에 메시지 2개를 추가하고 저장 지연과 단일 실패를 검사합니다. 영상에는 이 오류 주입을 사용하지 않습니다.

</details>

## API 요약

| 메서드 | Spring API | 인증 | 용도 |
| --- | --- | --- | --- |
| GET | `/api/health` | 불필요 | 앱 응답 여부; DB 상태는 별도 검사 |
| GET | `/api/auth/me` | 선택 | 데모 세션 확인 |
| POST | `/api/auth/login` | 불필요 | 로그인·세션 갱신 |
| POST | `/api/auth/logout` | 선택 | 세션 종료 |
| GET | `/api/chats` | 필요 | 저장 대화·상태 |
| PUT | `/api/chats/{uuid}` | 필요 | 대화 JSON 저장·수정 |
| POST | `/api/recommendations` | 불필요 | 차량·취향·배터리 조건 추천 |
| POST | `/api/reports/{uuid}` | 세션 생성 | 계획서 스냅샷 준비 |
| GET | `/api/reports/{uuid}` | 같은 세션 / 로그인 | 계획서 상태 조회 |
| GET | `/api/attractions/{id}/photo` | 불필요 | 대표사진·공공누리 유형 |

브라우저는 동일 출처 `/api/chats/*`, `/api/recommendations`와 Server Actions를 사용합니다. 모든 Spring API를 프록시에 공개하지는 않습니다. 계획서는 `/c/{uuid}/result`, PDF는 `/c/{uuid}/result/pdf`입니다.

<details>
<summary><strong>추천 API 요청 예시</strong></summary>

```bash
curl http://localhost:3002/api/recommendations \
  -H 'Content-Type: application/json' \
  -d '{"departure":"서울 중구 세종대로 110","sido":"서울","sigungu":"중구","category":"NA02","vehicle":"g80-ev","moment":"sunset","batteryPercent":80,"date":"2026-10-15"}'
```

`category`: NA01 산 / NA02 하천·해양 / HS01 역사유적 / VE07 전시.<br />
`vehicle`: g80-ev, ioniq5. `moment`: sunrise, sunset.<br />
잘못된 입력은 400, 출발 좌표가 없으면 422, DB 조회 실패는 503입니다. 적합한 후보가 없으면 200과 빈 destinations를 반환합니다.

</details>

## 프로젝트 구성

```text
.
├── README.md                          # 소개·기획서·요구사항·검증·실행 안내
├── backend/
│   ├── src/main/java/com/enjoytrip/
│   │   ├── RecommendationService.java # 공간 탐색·배터리·Top-1
│   │   ├── RecommendationController.java
│   │   ├── ChatController.java        # 데모 세션·대화 저장
│   │   └── ReportController.java      # 계획서·관광지 사진
│   └── src/test/java/com/enjoytrip/    # 알고리즘·성능·API·DB 검사
├── frontend/
│   ├── app/(chat)/                    # 대화 서버 레이아웃·경로
│   ├── app/(report)/                  # 계획서 SSR·PDF 다운로드
│   ├── app/actions/                   # 인증·계획서 Server Actions
│   ├── app/api/                       # 동일 출처 API 프록시
│   ├── app/components/                # 질문·추천·PDF·대화 UI
│   └── app/lib/                       # 세션·TMAP·계획서 데이터
├── infra/
│   ├── compose.yaml                   # MySQL·영속 볼륨·헬스체크
│   ├── schema.sql                     # 정규화 테이블·외래키
│   └── scripts/                       # 수집·정규화·적재·검증·인덱스
├── scripts/                           # 브라우저 녹화·저장 회귀 검사
└── docs/
    ├── media/                         # 실제 화면·전체 영상·샘플 PDF
    └── evidence/                      # 테스트·측정·검증 기록
```

## 데이터 범위와 현재 한계

- 추천은 시군구 관광지 평균 좌표 기준입니다. 계획서에서 TMAP으로 실제 출발 주소 경로를 다시 조회하며, 도로 거리가 추천의 배터리 예산을 초과하면 안내를 표시합니다.
- 직선거리×1.3은 이동량 추정식입니다. 중간 충전, 귀환 동선, 도로 제약, 고도·기온에 따른 전비는 최적화하지 않습니다.
- 충전 가능·충전 중 수는 수집 기록이며 실시간 갱신이나 예약 기능은 없습니다.
- 출몰시각은 **205개 지역, 2026-10-15–2026-11-13의 30일**입니다. 다른 날짜로 대체하지 않으며 데이터가 없으면 미제공으로 표시합니다.
- 일출·일몰 선택은 표시 시각을 결정합니다. 실제 조망 가능 관광지만 필터링하거나 도착 시각을 역산하는 일정 최적화는 구현하지 않았습니다.
- 외부 경로 API가 실패하면 도로 안내 없이 계획서를 표시하고, 사진 다운로드가 실패하면 PDF에 텍스트 표지를 사용합니다.
- 데모 인증은 고정 계정 한 개입니다. 회원가입·비밀번호 관리·사용자별 계정 분리는 제공하지 않습니다.

## 출처와 참고

| 데이터·자산 | 출처 |
| --- | --- |
| 관광지 | [한국관광공사 국문 관광정보](https://www.data.go.kr/tcs/dss/selectApiDataDetailView.do?publicDataPk=15101578) |
| 관광사진 | [한국관광공사 관광사진](https://www.data.go.kr/tcs/dss/selectApiDataDetailView.do?publicDataPk=15101914) |
| 충전소·충전기 | [한국환경공단 전기자동차 충전소](https://www.data.go.kr/tcs/dss/selectApiDataDetailView.do?publicDataPk=15076352) |
| 일출·일몰 | [한국천문연구원 출몰시각](https://www.data.go.kr/tcs/dss/selectApiDataDetailView.do?publicDataPk=15012688) |
| 도로 경로·지도 | [TMAP API](https://tmapapi.tmapmobility.com/) |
| 차량 이미지·사양 | Genesis·Hyundai 공식 자료 — [개별 출처](frontend/README.md#차량-이미지-및-사양-출처) |
| 한글 폰트 | Pretendard GOV, SIL Open Font License — [라이선스](frontend/app/fonts/OFL.txt) |
| README 구성 참고 | [Michelin Travel RAG](https://github.com/jihyukboin/Michelin-Travel-RAG), [EnjoyTrip web](https://github.com/jihyukboin/EnjoyTrip_web) |

관광지 이미지의 공공누리 유형과 출처를 계획서에 표시합니다. 차량·지도·관광 이미지 권리는 각 제공자에게 있으며 외부 자산 이용 조건은 해당 출처를 따릅니다. 저장소 자체의 오픈소스 배포 라이선스는 별도로 지정하지 않았습니다.
