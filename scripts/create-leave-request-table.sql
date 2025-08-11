-- 연차 신청 테이블 생성
CREATE TABLE IF NOT EXISTS public.leave_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL,
  member_name character varying NOT NULL,
  team_name character varying,
  leave_type character varying NOT NULL CHECK (leave_type::text = ANY (ARRAY['연차'::character varying::text, '오전반차'::character varying::text, '오후반차'::character varying::text])),
  start_date date NOT NULL,
  end_date date NOT NULL,
  total_days numeric(3,1) NOT NULL DEFAULT 0,
  reason text,
  status character varying NOT NULL DEFAULT '대기중'::character varying CHECK (status::text = ANY (ARRAY['대기중'::character varying::text, '승인됨'::character varying::text, '반려됨'::character varying::text, '취소됨'::character varying::text])),
  requested_at timestamp with time zone DEFAULT now(),
  approved_at timestamp with time zone,
  approved_by character varying,
  rejected_reason text,
  cancelled_at timestamp with time zone,
  cancelled_by character varying,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT leave_requests_pkey PRIMARY KEY (id),
  CONSTRAINT leave_requests_member_id_fkey FOREIGN KEY (member_id) REFERENCES public.members(id) ON DELETE CASCADE
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_leave_requests_member_id ON public.leave_requests(member_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_status ON public.leave_requests(status);
CREATE INDEX IF NOT EXISTS idx_leave_requests_start_date ON public.leave_requests(start_date);
CREATE INDEX IF NOT EXISTS idx_leave_requests_requested_at ON public.leave_requests(requested_at DESC);

-- RLS (Row Level Security) 정책 설정
ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;

-- 모든 사용자는 자신의 연차 신청을 조회할 수 있음
CREATE POLICY "Users can view their own leave requests" ON public.leave_requests
  FOR SELECT USING (auth.uid()::text = member_id::text);

-- 모든 사용자는 자신의 연차를 신청할 수 있음
CREATE POLICY "Users can create their own leave requests" ON public.leave_requests
  FOR INSERT WITH CHECK (auth.uid()::text = member_id::text);

-- 사용자는 대기중인 자신의 연차 신청을 수정할 수 있음 (취소용)
CREATE POLICY "Users can update their pending leave requests" ON public.leave_requests
  FOR UPDATE USING (auth.uid()::text = member_id::text AND status = '대기중');

-- 관리자는 모든 연차 신청을 볼 수 있음
CREATE POLICY "Admins can view all leave requests" ON public.leave_requests
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.members 
      WHERE members.id::text = auth.uid()::text 
      AND members.role = '관리자'
      AND members.status = 'active'
    )
  );

-- 관리자는 모든 연차 신청을 수정할 수 있음 (승인/반려용)
CREATE POLICY "Admins can update all leave requests" ON public.leave_requests
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.members 
      WHERE members.id::text = auth.uid()::text 
      AND members.role = '관리자'
      AND members.status = 'active'
    )
  );

-- 업데이트 시간 자동 갱신 트리거
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_leave_requests_updated_at BEFORE UPDATE ON public.leave_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 연차 유형별 근무표 맵핑을 위한 근무 유형들 추가
-- UUID를 사용하는 대신 이미 존재하는 work_types에서 적절한 ID를 찾아서 사용하거나
-- 새로 추가할 때는 UUID를 생성해야 합니다.

-- 먼저 연차용 근무 유형이 있는지 확인하고 없으면 추가
DO $$
BEGIN
  -- 연차 근무 유형 추가
  IF NOT EXISTS (SELECT 1 FROM public.work_types WHERE name = '연차') THEN
    INSERT INTO public.work_types (name, start_time, end_time, bgcolor, fontcolor) 
    VALUES ('연차', '00:00:00', '23:59:59', '#fef3c7', '#92400e');
  END IF;

  -- 오전반차 근무 유형 추가
  IF NOT EXISTS (SELECT 1 FROM public.work_types WHERE name = '오전반차') THEN
    INSERT INTO public.work_types (name, start_time, end_time, bgcolor, fontcolor) 
    VALUES ('오전반차', '00:00:00', '12:00:00', '#ddd6fe', '#5b21b6');
  END IF;

  -- 오후반차 근무 유형 추가
  IF NOT EXISTS (SELECT 1 FROM public.work_types WHERE name = '오후반차') THEN
    INSERT INTO public.work_types (name, start_time, end_time, bgcolor, fontcolor) 
    VALUES ('오후반차', '12:00:00', '23:59:59', '#c7d2fe', '#3730a3');
  END IF;
END $$;