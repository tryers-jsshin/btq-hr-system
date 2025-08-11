-- 모든 테이블의 RLS 비활성화 (자체 인증 시스템 사용 시)
-- 프로덕션 환경에서는 적절한 보안 정책을 설정하세요

ALTER TABLE public.members DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_types DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_schedule_entries DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.termination_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_requests DISABLE ROW LEVEL SECURITY;

-- 연차 관련 테이블들도 RLS 비활성화 (있다면)
ALTER TABLE public.annual_leave_policies DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.annual_leave_transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.annual_leave_balances DISABLE ROW LEVEL SECURITY;