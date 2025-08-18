# 데이터베이스 스키마

> **최종 확인**: 2025-08-14 - 퇴사자 관리 시스템 완성 후 스키마 검증, 기존 테이블 구조 안정적으로 활용

## 📊 테이블 구조

### 1. members (구성원)
```sql
CREATE TABLE public.members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar NOT NULL,
  password varchar NOT NULL,
  employee_number varchar UNIQUE,
  team_id uuid REFERENCES teams(id),
  team_name varchar,
  role varchar CHECK (role IN ('일반직원', '관리자')),
  join_date date NOT NULL,
  phone varchar NOT NULL,
  weekly_schedule jsonb NOT NULL DEFAULT '{}',
  status varchar DEFAULT 'active' CHECK (status IN ('active', 'terminated', 'rehired')),
  termination_date date,
  termination_reason text,
  is_admin boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

### 2. teams (팀)
```sql
CREATE TABLE public.teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar NOT NULL UNIQUE,
  member_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

### 3. leave_requests (연차 신청)
```sql
CREATE TABLE public.leave_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES members(id),
  member_name varchar NOT NULL,
  team_name varchar,
  leave_type varchar NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  total_days numeric NOT NULL DEFAULT 0,
  reason text,
  status varchar NOT NULL DEFAULT '대기중' 
    CHECK (status IN ('대기중', '승인됨', '반려됨', '취소됨')),
  requested_at timestamptz DEFAULT now(),
  approved_at timestamptz,
  approved_by varchar,
  rejected_reason text,
  cancelled_at timestamptz,
  cancelled_by varchar,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

### 4. annual_leave_transactions (연차 거래)
```sql
CREATE TABLE public.annual_leave_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES members(id),
  member_name varchar NOT NULL,
  transaction_type varchar NOT NULL 
    CHECK (transaction_type IN ('grant', 'manual_grant', 'grant_cancel', 
                               'use', 'use_cancel', 'expire', 'adjust')),
  amount numeric NOT NULL,
  reason text NOT NULL,
  grant_date date,
  expire_date date,
  reference_id uuid,
  created_by varchar NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  status varchar DEFAULT 'active' CHECK (status IN ('active', 'cancelled')),
  cancelled_at timestamptz,
  cancelled_by varchar,
  expired_at timestamptz,
  expired_by varchar,
  is_expired boolean DEFAULT false
);
```

### 5. annual_leave_balances (연차 잔액)
```sql
CREATE TABLE public.annual_leave_balances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL UNIQUE REFERENCES members(id),
  member_name varchar NOT NULL,
  team_name varchar,
  join_date date NOT NULL,
  total_granted numeric DEFAULT 0,
  total_used numeric DEFAULT 0,
  total_expired numeric DEFAULT 0,
  current_balance numeric DEFAULT 0,
  last_updated timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

### 6. annual_leave_policies (연차 정책)
```sql
CREATE TABLE public.annual_leave_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_name varchar NOT NULL,
  description text,
  is_active boolean DEFAULT true,
  first_year_monthly_grant integer DEFAULT 1,
  first_year_max_days integer DEFAULT 11,
  base_annual_days integer DEFAULT 15,
  increment_years integer DEFAULT 2,
  increment_days integer DEFAULT 1,
  max_annual_days integer DEFAULT 25,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

### 7. work_types (근무 유형)
```sql
CREATE TABLE public.work_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  bgcolor varchar DEFAULT '#dbeafe',
  fontcolor varchar DEFAULT '#1e40af',
  deduction_days numeric DEFAULT NULL,
  is_leave boolean DEFAULT false,
  is_holiday boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

### 8. work_schedule_entries (근무 일정)
```sql
CREATE TABLE public.work_schedule_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid REFERENCES members(id),
  date date NOT NULL,
  work_type_id uuid NOT NULL REFERENCES work_types(id),
  original_work_type_id uuid REFERENCES work_types(id),
  replaced_by_leave_id uuid REFERENCES leave_requests(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

### 9. attendance_records (근태 기록)
```sql
CREATE TABLE public.attendance_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_id uuid REFERENCES attendance_snapshots(id),
  employee_number varchar NOT NULL,
  member_id uuid REFERENCES members(id),
  member_name varchar NOT NULL,
  work_date date NOT NULL,
  check_in_time time,
  check_out_time time,
  schedule_id uuid REFERENCES work_schedule_entries(id),
  work_type_id uuid REFERENCES work_types(id),
  scheduled_start_time time,
  scheduled_end_time time,
  is_late boolean DEFAULT false,
  late_minutes integer DEFAULT 0,
  is_early_leave boolean DEFAULT false,
  early_leave_minutes integer DEFAULT 0,
  overtime_minutes integer DEFAULT 0,
  actual_work_minutes integer DEFAULT 0,
  is_modified boolean DEFAULT false,
  modified_by varchar,
  modified_at timestamptz,
  modification_reason text,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz DEFAULT CURRENT_TIMESTAMP
);
```

### 10. attendance_snapshots (근태 스냅샷)
```sql
CREATE TABLE public.attendance_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  filename varchar NOT NULL,
  upload_date date NOT NULL,
  uploaded_by varchar NOT NULL,
  uploaded_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  total_records integer DEFAULT 0,
  status varchar DEFAULT 'uploaded',
  error_message text,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz DEFAULT CURRENT_TIMESTAMP
);
```

### 11. work_mileage_transactions (근무 마일리지)
```sql
CREATE TABLE public.work_mileage_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES members(id),
  transaction_date date NOT NULL,
  transaction_type varchar NOT NULL 
    CHECK (transaction_type IN ('overtime', 'late', 'early_leave', 
                               'admin_adjust', 'initial_balance')),
  minutes integer NOT NULL,
  reason text,
  created_by uuid REFERENCES members(id),
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  reference_id uuid,
  work_date date,
  event_source varchar 
    CHECK (event_source IN ('attendance', 'leave', 'schedule', 'manual', 'legacy')),
  source_id uuid,
  is_active boolean DEFAULT true
);
```

### 12. termination_logs (퇴사 로그)
```sql
CREATE TABLE public.termination_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES members(id),
  action varchar NOT NULL CHECK (action IN ('terminate', 'cancel', 'rehire')),
  termination_date date,
  termination_reason text,
  cancellation_reason text,
  created_by varchar,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

### 13. overtime_settlements (초과근무 정산)
```sql
CREATE TABLE public.overtime_settlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES members(id),
  member_name varchar NOT NULL,
  settlement_month varchar NOT NULL,
  total_overtime_minutes integer DEFAULT 0,
  total_late_minutes integer DEFAULT 0,
  late_count integer DEFAULT 0,
  net_overtime_minutes integer DEFAULT 0,
  converted_leave_days numeric DEFAULT 0,
  settlement_status varchar DEFAULT 'pending',
  settled_by varchar,
  settled_at timestamptz,
  settlement_note text,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz DEFAULT CURRENT_TIMESTAMP
);
```

## 🔗 테이블 관계

### 주요 관계
1. **members ↔ teams**: 구성원은 하나의 팀에 소속
2. **members ↔ leave_requests**: 구성원은 여러 연차 신청 가능
3. **members ↔ annual_leave_transactions**: 구성원별 연차 거래 이력
4. **members ↔ work_schedule_entries**: 구성원별 근무 일정
5. **work_types ↔ work_schedule_entries**: 근무 유형과 일정 연결
6. **leave_requests ↔ work_schedule_entries**: 연차 승인 시 근무표 연동

### 인덱스 권장사항
- `members.employee_number` (UNIQUE)
- `leave_requests.member_id, status, start_date`
- `work_schedule_entries.member_id, date`
- `attendance_records.member_id, work_date`
- `annual_leave_transactions.member_id, transaction_type, created_at`

## 📝 주의사항
1. **UUID 사용**: 모든 기본키는 UUID 타입
2. **Soft Delete**: termination 상태로 관리
3. **감사 추적**: created_at, updated_at 필수
4. **트랜잭션**: 연차/마일리지는 이벤트 소싱 패턴
5. **JSON 타입**: weekly_schedule은 JSONB로 유연하게 관리