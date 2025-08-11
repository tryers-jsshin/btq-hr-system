-- 기존 RLS 정책 삭제
DROP POLICY IF EXISTS "Users can view their own leave requests" ON public.leave_requests;
DROP POLICY IF EXISTS "Users can create their own leave requests" ON public.leave_requests;
DROP POLICY IF EXISTS "Users can update their pending leave requests" ON public.leave_requests;
DROP POLICY IF EXISTS "Admins can view all leave requests" ON public.leave_requests;
DROP POLICY IF EXISTS "Admins can update all leave requests" ON public.leave_requests;

-- RLS 비활성화 (자체 인증을 사용하는 경우)
ALTER TABLE public.leave_requests DISABLE ROW LEVEL SECURITY;

-- 또는 Supabase Auth를 사용한다면 아래 정책들을 사용
-- ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;

-- 모든 인증된 사용자가 자신의 연차 신청을 조회할 수 있음
-- CREATE POLICY "Authenticated users can view their own requests" ON public.leave_requests
--   FOR SELECT USING (auth.role() = 'authenticated');

-- 모든 인증된 사용자가 연차를 신청할 수 있음  
-- CREATE POLICY "Authenticated users can create requests" ON public.leave_requests
--   FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- 모든 인증된 사용자가 자신의 연차 신청을 수정할 수 있음
-- CREATE POLICY "Authenticated users can update their requests" ON public.leave_requests
--   FOR UPDATE USING (auth.role() = 'authenticated');