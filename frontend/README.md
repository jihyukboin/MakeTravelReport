# Enjoy Trip frontend

Next.js 프론트엔드 `3003`, Spring 백엔드 `3002`, MySQL `3307`을 사용합니다.

```sh
npm ci
npm run dev
```

- 고정 로그인: ID `test`, PW `test`. Spring HttpSession과 HttpOnly 쿠키를 사용하며 회원가입·사용자 테이블은 없습니다.
- 사이드패널 하단 50px 영역에서 로그인합니다. 로그인 후 대화 상태는 MySQL `chat_conversations` 한 테이블에 자동 저장합니다. 로그인 전에 시작한 대화는 로그인할 때 함께 저장합니다.
- 첫 메시지를 보내면 `/c/{chat_uuid}`로 이동합니다. 로그인 후 새로고침하거나 최근 대화를 선택하면 질문·선택·추천 결과를 복원합니다.
- 인증 상태와 대화 이력은 서버 레이아웃이 세션 쿠키를 전달해 조회하고 첫 HTML에 렌더링합니다. 브라우저에서 초기 인증/이력 조회를 수행하지 않습니다.
- 로그인·로그아웃은 Server Action에서 Spring 세션과 HttpOnly 쿠키를 처리합니다. 사이드패널 골격·인증 상태 분기·로그인 입력 필드는 서버 컴포넌트이며, 모달 열기·제출 상태·채팅 조작·실시간 대화 목록만 클라이언트에서 처리합니다.
- 프론트엔드 `/api/chats/*`, `/api/recommendations`가 백엔드를 호출합니다. 백엔드 주소는 `API_BASE_URL` 또는 `NEXT_PUBLIC_API_BASE_URL`로 지정하며 기본값은 `http://localhost:3002`입니다.
- 백엔드는 `../infra/.env`의 MySQL 설정을 읽고 대화 테이블을 프로세스의 첫 조회/저장 때 한 번 자동 생성합니다.

## 전기차 여행 추천

출발지 → 전기차·출발 배터리·날짜 → 분위기 → 세부 취향 → 일출/일몰 → 여행지 **1곳** 순서입니다.

`POST /api/recommendations`는 실제 MySQL 관광지와 충전소 데이터를 조회합니다. 고정 추천 목록이나 SQLite 대체 데이터는 사용하지 않습니다.

- 취향의 관광 분류 코드에 맞는 관광지만 검색합니다.
- 공개 충전소에서 삭제되지 않은 DC 콤보 호환 충전기(04/05/06/08)를 확인합니다. 저장 상태가 충전 가능(2) 또는 충전 중(3)인 충전소를 사용합니다.
- 차량 인증 주행거리 × (출발 배터리 - 20% 잔량)을 이동 예산으로 잡고, 관광지와 주변 충전소까지의 추정 이동 거리를 확인합니다.
- 관광지에서 5km 이내 충전소가 있어야 하며, 이동 거리 + 충전소 거리 × 4 + 전부 충전 중일 때 10점의 비용이 가장 낮은 1곳을 선택합니다.
- 선택 날짜에 해당하는 50km 이내 가장 가까운 관측지의 일출/일몰 시각을 함께 표시합니다. 데이터가 없으면 다른 날짜로 대체하지 않습니다.

추천 단계에서는 외부 지오코딩 호출 없이 출발 시군구 관광지의 평균 좌표를 사용합니다. 계획서에서는 설정된 TMAP 키로 정확한 출발 주소 좌표와 실제 도로 경로를 조회합니다. 이동 거리는 직선거리 × 1.3의 추정치이며 도로 경로, 중간 충전, 귀환을 계산하지 않습니다. 충전 상태는 수집 시점의 기록입니다. 이 기준은 결과 화면에도 표시합니다.

## 알고리즘 적용 기획

PDF의 알고리즘 2개 이상 적용 요구에 맞춰 Java `RecommendationService`에 구현했습니다.

1. **공간 해시 탐색**: 충전소를 위경도 0.05도 격자에 나누고, 관광지 반경에 걸치는 격자만 조회한 후 Haversine 거리로 가까운 충전소를 결정합니다. 구성 시간·메모리는 충전소 수 S에 대해 O(S), 관광지별 조회는 주변 격자 안 충전소 수에 비례합니다. 모든 충전소가 같은 격자에 몰리면 최악 O(S)입니다.
2. **가중치 기반 최적 후보 선정**: 취향·배터리·충전소 조건을 통과한 관광지를 비용으로 평가하고 크기 1의 우선순위 큐에 최적 후보만 유지합니다. 관광지 수 A에 대해 선정 O(A), 추가 후보 저장 O(1)입니다.

## 검증

```sh
npm run lint
npx next typegen
npx tsc --noEmit
cd ../backend
./gradlew test
# infra MySQL이 실행 중일 때 DB 통합 검사 포함
ENJOYTRIP_DB_TEST=true ./gradlew test --rerun-tasks
```

공간 탐색은 고정 난수의 충전소 2,000개·조회 지점 500개에 대해 전체 탐색 결과와 비교합니다. DB 통합 검사는 실제 관광 분류·충전소 거리·배터리 예산·로그인·대화 저장/복원을 확인하고 테스트 대화 행은 삭제합니다.

## 차량 이미지 및 사양 출처

차량 사진은 다운로드 후 차량이 잘리지 않도록 크롭해 **1200×750 WebP**로 저장했습니다. 이미지와 사양은 연식·트림에 따라 다를 수 있습니다.

- G80 EV 이미지: [Genesis 공식 디자인](https://www.genesis.com/ae/en/models/luxury-sedan-genesis/electrified-g80/design.html), 23MY 외관. [원본 JPG](https://www.genesis.com/content/dam/genesis-p2/worldwide/assets/models/electrified-g80/23my/design/genesis-ww-design-electrified-g80-exterior-desktop-1920x960-en.jpg).
- 아이오닉 5 이미지: [Hyundai 공식 외관](https://www.hyundai.com/la/en/find-a-car/ioniq5/exterior). [원본 JPG](https://www.hyundai.com/content/dam/hyundai/template_en/en/images/find-a-car/pip/ioniq5/Design/ioniq5-ne-kv-m.jpg).
- G80 EV 87.2 kWh / 427km: [Genesis 출시 자료](https://www.genesis.com/kr/ko/support/pr-center/detail.html?seq=0000000310).
- 아이오닉 5 84 kWh 롱레인지 2WD 최대 485km: [Hyundai 공식 모델 소개](https://www.hyundai.com/kr/ko/e/vehicles/ioniq5/intro).

이미지의 저작권은 각 제조사에 있습니다.

## 여행 계획서와 PDF

최종 여행지 카드의 `계획서 보러가기`를 누르면 `/c/{chat_uuid}/result`가 새 창에서 열립니다. 문서 본문은 서버에서 렌더링하며, 로그인 전 대화도 현재 세션의 스냅샷으로 열 수 있습니다. 로그인한 대화는 DB 이력에서도 계획서를 복원합니다.

계획서에는 관광지 원본 이미지, 선택한 전기차, 출발지→관광지→충전소 동선, 일출·일몰과 충전 상태를 포함합니다. TMAP Full Text Geocoding으로 출발 진입 좌표를 조회하고 자동차 경로안내와 경로 이미지 안내 API로 두 구간의 도로 지도·회전 안내·거리·시간·통행료를 표시합니다. 좌표 조회가 안 되면 추천 당시의 지역 중심 좌표 사용 여부를 표시합니다.

`frontend/.env.local`에 서버 전용 `TMAP_APP_KEY`를 지정합니다. 키는 브라우저로 전달하지 않으며 지도 이미지는 서버에서 받아 문서와 PDF에 포함합니다. 카카오 자동차 길찾기 API는 사용하지 않습니다.

PDF는 `@react-pdf/renderer`로 서버에서 생성하고 한글 폰트를 임베드합니다. 기존 OFL Pretendard GOV 폰트에서 400/700 정적 TTF를 변환해 사용합니다. `sharp`는 PDF용 차량 WebP를 JPEG로 변환하는 데 사용합니다. 문서 화면의 글자 크기는 최소 14px이며 PDF에서도 대응 크기인 최소 10.5pt를 유지합니다.

참고 문서: [TMAP 개발 가이드](https://tmapapi.tmapmobility.com/), [자동차 경로안내](https://tmap-skopenapi.readme.io/reference/자동차-경로안내), [경로 이미지 안내](https://tmapapi.tmapmobility.com/main.html#webservice/docs/RouteStaticMapDoc), [React PDF](https://react-pdf.org/).
