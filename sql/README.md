# SQL 실행 안내

## '오프' 근무 유형 추가

work_types 테이블에 '오프'를 정식 근무 유형으로 추가합니다.

```bash
# Supabase SQL Editor에서 실행하거나
# psql 명령어로 실행
psql $DATABASE_URL < add-off-work-type.sql
```

### 변경 내용
- '오프'를 work_types 테이블에 정식 근무 유형으로 추가
- 색상: 회색 계열 (bg-gray-100, text-gray-600)
- deduction_days: NULL (연차 차감 없음)
- is_leave: false (휴가 유형이 아님)

### 이점
1. 프론트엔드 하드코딩 제거
2. 일관된 데이터 관리
3. 색상 및 속성을 DB에서 중앙 관리
4. 향후 다양한 휴무 유형 추가 가능 (공휴일, 회사휴무 등)