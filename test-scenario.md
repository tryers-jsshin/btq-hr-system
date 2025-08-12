# 이벤트 소싱 마일리지 시스템 테스트 시나리오

## 테스트 준비
1. 마이그레이션 SQL 실행 (`sql/migrate_to_event_sourcing.sql`)
2. 개발 서버 실행 (`npm run dev`)
3. 테스트 사용자로 로그인

## 테스트 시나리오

### 1. 기본 근태 기록 테스트
- [ ] 출근/퇴근 체크인
- [ ] 마일리지 트랜잭션 생성 확인 (is_active=true)
- [ ] work_date와 event_source 필드 확인

### 2. 근태 수정 테스트
- [ ] 기존 근태 기록 수정 (시간 변경)
- [ ] 이전 트랜잭션 is_active=false 확인
- [ ] 새 트랜잭션 is_active=true 확인
- [ ] 동일 work_date에 대한 중복 없음 확인

### 3. 연차 신청/승인 테스트
- [ ] 연차 신청
- [ ] 연차 승인 시 마일리지 0으로 설정
- [ ] event_source='leave' 확인
- [ ] 기존 트랜잭션 비활성화 확인

### 4. 연차 취소 테스트
- [ ] 승인된 연차 취소
- [ ] 마일리지 재계산 확인
- [ ] 이전 트랜잭션 복원 또는 새 트랜잭션 생성
- [ ] event_source='attendance' 또는 'schedule' 확인

### 5. CSV 업로드 테스트
- [ ] CSV 파일 업로드
- [ ] event_source='manual' 확인
- [ ] 중복 업로드 시 이전 데이터 비활성화

### 6. 근무표 변경 테스트
- [ ] 근무 유형 변경
- [ ] 마일리지 재계산
- [ ] event_source='schedule' 확인

### 7. 관리자 조정 테스트
- [ ] 관리자 조정 추가
- [ ] transaction_type='admin_adjust' 유지
- [ ] 다른 트랜잭션 변경 시 admin_adjust는 영향 없음

## 검증 쿼리

```sql
-- 특정 멤버의 특정 날짜 마일리지 히스토리
SELECT * FROM work_mileage_transactions
WHERE member_id = :member_id
  AND work_date = :date
ORDER BY created_at DESC;

-- 활성 트랜잭션만 조회
SELECT * FROM work_mileage_transactions
WHERE member_id = :member_id
  AND work_date = :date
  AND is_active = true;

-- 중복 확인
SELECT member_id, work_date, transaction_type, COUNT(*)
FROM work_mileage_transactions
WHERE is_active = true
GROUP BY member_id, work_date, transaction_type
HAVING COUNT(*) > 1;
```

## 예상 결과

### 성공 기준
1. **Idempotency**: 동일한 작업을 여러 번 수행해도 결과가 동일
2. **No Duplicates**: 활성 트랜잭션에서 중복 없음
3. **History Preserved**: 모든 변경 이력 보존 (is_active 플래그로 구분)
4. **Admin Adjust Protected**: 관리자 조정은 자동 프로세스에서 보호
5. **Source Tracking**: 모든 트랜잭션의 출처 추적 가능

### 문제 해결됨
- ✅ 동일 reference_id로 중복 트랜잭션 생성 문제
- ✅ 연차 취소 시 마일리지 복구 안 되는 문제
- ✅ 근무표 변경 시 마일리지 재계산 문제
- ✅ CSV 중복 업로드 시 중복 트랜잭션 문제