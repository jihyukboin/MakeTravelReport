# MakeTravelReport

Enjoy Trip 여행 보고서 생성기 프로젝트입니다.

| 구성 | 기술 | 포트 |
| --- | --- | --- |
| 백엔드 | Java / Spring Boot | 3002 |
| 프론트엔드 | Next.js | 3003 |
| 데이터베이스 | MySQL / Docker Compose | 3307 |

## 로컬 실행

프로젝트 루트에서 환경 설정 예제를 복사하고 API 키와 DB 암호를 입력합니다.

```bash
cp infra/.env.example infra/.env
docker compose -f infra/compose.yaml up -d --wait
```

백엔드는 별도 터미널에서 실행합니다.

```bash
cd backend
./gradlew bootRun
```

프론트엔드는 별도 터미널에서 실행합니다.

```bash
cd frontend
npm ci
npm run dev
```

브라우저에서 http://localhost:3003 으로 접속합니다.

API 키, DB 암호, 수집 데이터, 의존성 및 빌드 결과는 저장소에 포함하지 않습니다.
공공데이터 수집과 MySQL 적재 방법은 [인프라 문서](infra/README.md)를 참고하세요.
