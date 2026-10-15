# EnjoyTrip 데이터 인프라

공공데이터 API 원본, 정규화 CSV/SQLite, MySQL 적재용 SQL을 관리한다.
API 키와 DB 암호는 `infra/.env`에 있으며 `.gitignore`로 제외한다. `.env.example`은 설정 항목만 제공한다.

## 수집 범위

| 데이터 | 수집 API | 범위 |
|---|---|---|
| 관광정보 | KorService2/areaBasedSyncList2 | 전국 공개 목록 전체, 모든 콘텐츠 유형 |
| 법정동 | KorService2/ldongCode2 | 전체 지역·시군구 코드 |
| 관광 분류 | KorService2/lclsSystmCode2 | 전체 신분류 3단계 |
| 관광사진 | PhotoGalleryService1/gallerySyncDetailList1 | 공개 개별 사진 전체의 메타데이터·이미지 URL |
| 충전기 | EvCharger/getChargerInfo | 전국 충전소·충전기·응답 시점 상태 전체 |
| 일출·일몰 | RiseSetInfoService/getAreaRiseSetInfo | 205개 지역, 2026-10-15~2026-11-13 포함 30일 |
| 날씨 | OpenWeather 현재 날씨 | 제공 키의 401 오류로 제외 |

목록 API의 `totalCount`까지 모든 페이지를 수집한다. 관광정보는 목록에서 제공하는 위치·주소·분류·대표사진을 포함한다. 관광지별 별도 상세 API의 소개문·이용요금·추가 사진 등은 이 목록 데이터에 포함되지 않는다. 사진은 DB에서 사용할 메타데이터와 URL을 저장하며 이미지 바이너리는 내려받지 않는다. 실시간 충전 상태는 수집 시점 스냅샷이며 현재 상태를 보장하지 않는다.

일출·일몰은 기간이 무한하므로 지정 기간을 수집한다. `sun_locations.json`의 지역 목록은 한국천문연구원 공식 활용 가이드에서 추출했으며, 실제 응답으로 확인한 현재 지역명 강화도·성산일출봉·울릉도를 사용한다. API가 정상 응답하면서 데이터가 없는 요청은 manifest의 `unavailable`에 기록한다.

## 실행

작업 디렉터리는 프로젝트 루트다. Python 3 표준 라이브러리와 Docker Compose를 사용한다. 별도의 Python 패키지는 필요 없다.

```bash
# 전국 데이터: 성공한 페이지는 재사용하므로 중단 후 재실행 가능
python3 infra/scripts/collect.py

# 일출·일몰: 양 끝 날짜 포함, 기본값은 sun_locations.json의 모든 지역
python3 infra/scripts/collect.py --only sun --sun-start 2026-10-15 --sun-end 2026-11-13

# 원본 검증 → 정규화 → CSV / SQLite / 압축 MySQL SQL 생성
python3 infra/scripts/normalize.py

# MySQL 시작, 생성된 데이터 적재 및 실제 DB 검증
# load_mysql.py는 이 프로젝트 DB에서 schema.sql에 정의된 테이블을 교체한다.
docker compose -f infra/compose.yaml up -d --wait
python3 infra/scripts/load_mysql.py
```

기존 성공 응답은 캐시한다. 최신 스냅샷이 필요하면 기존 `infra/data/raw`를 별도 경로로 보관한 뒤 전국·일출 수집을 모두 다시 실행한다. 다른 일출 수집 기간으로 바꿀 때도 기존 sun 원본을 별도 보관해야 한다. 정규화 단계에서 manifest와 실제 행 수가 다르면 적재 파일을 생성하지 않는다.

국문 관광정보·사진은 각각 1,000회/일, 출몰시각은 10,000회/일이라는 공공데이터포털 개발계정 안내에 맞춰 페이지 크기와 수집 범위를 설정했다. 일출 수집기는 한 번에 9,500요청을 넘는 기간을 거부하며, 서비스 인증/일일 한도 오류는 즉시 중단한다. 같은 날 다른 프로그램에서 호출한 수량은 이 스크립트가 알 수 없으므로 실제 한도는 API 응답을 따른다. 일출 요청은 최대 4개 동시 실행하고 각 요청 후 대기한다.

## 파일 위치

- `data/raw/<dataset>/`: 원본 JSON/XML 응답을 gzip으로 보관. 정상 응답만 캐시.
- `data/raw/<dataset>/manifest.json`: API 전체 건수·수집 건수·범위·완료 상태.
- `data/collection.json`: 전국 데이터 수집 결과.
- `data/normalized/enjoytrip.sqlite3`: 외래키를 적용한 로컬 조회용 관계형 DB.
- `data/normalized/*.csv`: 테이블별 UTF-8 BOM CSV. NULL은 `\N`으로 표기.
- `data/normalized/enjoytrip.mysql.sql.gz`: MySQL 스키마·데이터·인덱스.
- `data/normalized/counts.json`: 정규화 테이블별 건수.
- `data/mysql-verification.json`: 실제 MySQL 행 수와 모든 외래키의 고아 행 검증 결과.

## 정규화 구조

- `regions → districts`: 법정동 지역·시군구. 관광정보와 충전소의 지역 코드 체계가 다를 수 있어 충전소 코드를 관광 코드로 임의 연결하지 않는다.
- `categories`: 신분류 1~3단계의 부모·자식 관계.
- `content_types → attractions → attraction_images`: 관광 유형, 관광정보, 대표 이미지.
- `photos ↔ photo_keywords ↔ keywords`: 개별 사진과 중복 제거한 검색 키워드의 다대다 관계.
- `charging_operators → charging_stations → chargers → charger_status`: 운영기관, 충전소, 충전기, 상태 스냅샷.
- `astronomy_locations → sun_times`: 관측 지역과 날짜별 일출·일몰·달·박명 시각.

관광정보·사진 ID는 서로 다른 식별자이므로 임의로 연결하지 않는다. 충전기는 `(station_id, charger_id)`, 출몰시각은 `(location_name, observation_date)`를 기본키로 사용한다. 빈 값·유효하지 않은 숫자/시각은 NULL, Y/N은 1/0, 일시는 `YYYY-MM-DD HH:MM:SS`, 시각은 `HH:MM:SS`로 변환한다. 원본의 초가 없는 시각은 `:00`을 붙이며, 출몰시각의 날짜·시간은 한국 현지 시각이다. 0 좌표는 미제공 값으로 보고 NULL로 저장한다. API의 부가 필드는 원본 응답에서 복구할 수 있다.

문자열 ID의 선행 0을 보존한다. SQL은 UTF-8 hex 문자열을 사용해 따옴표·역슬래시·개행을 안전하게 보존하고, MySQL 문자열은 대소문자와 문자를 구분하는 `utf8mb4_0900_bin`을 사용해 서로 다른 키워드가 합쳐지지 않도록 한다.

## Spring 연결

MySQL은 `127.0.0.1:3307`, 데이터베이스와 사용자는 `.env`의 `MYSQL_DATABASE`, `MYSQL_USER`, 암호는 `MYSQL_PASSWORD`다.

```properties
spring.datasource.url=jdbc:mysql://localhost:3307/enjoytrip?serverTimezone=Asia/Seoul&characterEncoding=UTF-8
spring.datasource.username=${MYSQL_USER}
spring.datasource.password=${MYSQL_PASSWORD}
```

`backend/`에서 실행하면 `application.properties`의 `spring.config.import`가 `../infra/.env`를 읽는다. 다른 작업 디렉터리에서 실행할 때는 환경변수를 전달하거나 설정 경로를 지정한다. Docker 볼륨 `enjoytrip_mysql_data`에 DB가 유지된다.

## 데이터 출처

- [한국관광공사 국문 관광정보 서비스](https://www.data.go.kr/tcs/dss/selectApiDataDetailView.do?publicDataPk=15101578)
- [한국관광공사 관광사진 정보](https://www.data.go.kr/tcs/dss/selectApiDataDetailView.do?publicDataPk=15101914)
- [한국환경공단 전기자동차 충전소 정보](https://www.data.go.kr/tcs/dss/selectApiDataDetailView.do?publicDataPk=15076352)
- [한국천문연구원 출몰시각 정보](https://www.data.go.kr/tcs/dss/selectApiDataDetailView.do?publicDataPk=15012688)
- [한국천문연구원 공식 활용 가이드](https://www.data.go.kr/cmm/cmm/fileDownload.do?atchFileId=FILE_000000002694817&fileDetailSn=1)

사진 활용 시 제공 기관·촬영자와 공공누리 이용 조건을 확인한다. 대표 이미지의 이용 유형은 `attraction_images.copyright_type`, 관광사진 촬영자는 `photos.photographer`에 보존한다.

## 조회 예시

```sql
-- 서울 관광지와 분류명
SELECT a.content_id, a.title, d.name AS district, c.name AS category,
       a.latitude, a.longitude, i.image_url
FROM attractions a
LEFT JOIN districts d ON d.region_code=a.region_code AND d.code=a.district_code
LEFT JOIN categories c ON c.code=a.category_code
LEFT JOIN attraction_images i ON i.content_id=a.content_id
WHERE a.region_code='11' AND a.content_type_id='12'
LIMIT 20;

-- 키워드로 개별 사진 검색
SELECT p.photo_id, p.title, p.image_url, p.photographer
FROM photos p JOIN photo_keywords pk ON pk.photo_id=p.photo_id
WHERE pk.keyword='경복궁'
LIMIT 20;

-- 서울의 날짜별 일출·일몰
SELECT observation_date, sunrise, sunset
FROM sun_times WHERE location_name='서울'
ORDER BY observation_date;

-- 충전소별 운영 중인 충전기 수(수집 시점)
SELECT s.station_id, s.name, COUNT(*) AS available_chargers
FROM charging_stations s
JOIN chargers c ON c.station_id=s.station_id
JOIN charger_status st ON st.station_id=c.station_id AND st.charger_id=c.charger_id
WHERE st.status_code='2' AND c.deleted=0
GROUP BY s.station_id, s.name
LIMIT 20;
```

세종은 관광 API의 지역·시군구 코드가 `36110`으로 내려오므로 다른 지역처럼 2자리로 자르지 않는다. 충전기 층수는 `지하 1층` 같은 원본 표현이 있어 문자열로 보존한다.

## 데이터 보존 검증과 인덱스 최적화

이미 적재된 DB를 검사할 때는 다음 명령을 사용한다. `--verify-only`는 기존 테이블을 교체하지 않고 행 수와 외래키만 검사한다.

```bash
python3 infra/scripts/load_mysql.py --verify-only
python3 infra/scripts/optimize_mysql.py
```

`optimize_mysql.py`는 정규화 스크립트와 같은 인덱스 목록을 사용한다. 없는 인덱스만 추가하므로 반복 실행할 수 있으며 관광지와 채팅 데이터는 유지한다. 관광 분류·콘텐츠 유형·위경도 복합 인덱스가 추천 조회를 지원한다. 대량 운영 데이터에서는 인덱스 생성 작업의 부하와 잠금을 고려해 실행한다.

Compose는 필수 DB 설정이 비어 있으면 즉시 오류를 내고, DB 포트를 로컬 인터페이스에만 노출한다. 컨테이너 로그는 10MB씩 최대 3개로 회전한다. 설정 변경은 사용자가 Compose를 다시 적용한 뒤 반영된다.
