"use client"

import React, { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CalendarDays, Clock, FileText, CheckCircle, XCircle, Users, X } from "lucide-react"
import { format } from "date-fns"
import { ko } from "date-fns/locale"
import { supabaseLeaveRequestStorage } from "@/lib/supabase-leave-request-storage"
import { supabase } from "@/lib/supabase"
import { LeaveApprovalDialog } from "@/components/leave-approval-dialog"
import type { LeaveRequest, LeaveRequestStats } from "@/types/leave-request"

// Linear Light 테마 색상 시스템
const statusColors = {
  "대기중": "text-[#ea580c]",
  "승인됨": "text-[#16a34a]", 
  "반려됨": "text-[#dc2626]",
  "취소됨": "text-[#64748b]",
}

const statusBadgeColors = {
  "대기중": "bg-[#fff7ed] text-[#ea580c] border-[#fed7aa]",
  "승인됨": "bg-[#f0fdf4] text-[#16a34a] border-[#bbf7d0]",
  "반려됨": "bg-[#fef2f2] text-[#dc2626] border-[#fecaca]",
  "취소됨": "bg-[#f8fafc] text-[#64748b] border-[#e2e8f0]",
}

const leaveTypeColors = {
  "연차": "bg-[#eff6ff] text-[#2563eb] border-[#dbeafe]",
  "오전반차": "bg-[#f5f3ff] text-[#7c3aed] border-[#e9d5ff]",
  "오후반차": "bg-[#fdf4ff] text-[#a855f7] border-[#f3e8ff]",
  "특별휴가": "bg-[#ecfdf5] text-[#059669] border-[#a7f3d0]",
  "병가": "bg-[#fef2f2] text-[#dc2626] border-[#fecaca]",
  "경조휴가": "bg-[#f8fafc] text-[#64748b] border-[#e2e8f0]",
}

// 동적 휴가 유형 색상 처리
const getLeaveTypeColor = (leaveType: string) => {
  return leaveTypeColors[leaveType as keyof typeof leaveTypeColors] || "bg-[#fef3c7] text-[#d97706] border-[#fde68a]"
}

export default function LeaveApprovalDemo1() {
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([])
  const [stats, setStats] = useState<LeaveRequestStats | null>(null)
  const [currentUser, setCurrentUser] = useState<{ id: string; name: string; role: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null)
  const [showApprovalDialog, setShowApprovalDialog] = useState(false)
  const [approvalAction, setApprovalAction] = useState<"approve" | "reject">("approve")

  useEffect(() => {
    // 관리자 권한 확인
    const userData = localStorage.getItem("currentUser")
    if (userData) {
      const user = JSON.parse(userData)
      if (user.role !== "관리자") {
        alert("관리자만 접근 가능합니다.")
        window.history.back()
        return
      }
      setCurrentUser(user)
      loadData()
    }
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      
      // 모든 연차 신청 목록 조회
      const requests = await supabaseLeaveRequestStorage.getAllLeaveRequests()
      setLeaveRequests(requests)
      
      // 통계 조회
      const requestStats = await supabaseLeaveRequestStorage.getLeaveRequestStats()
      setStats(requestStats)
    } catch (error) {
      console.error("데이터 로드 오류:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleApprovalAction = (request: LeaveRequest, action: "approve" | "reject") => {
    setSelectedRequest(request)
    setApprovalAction(action)
    setShowApprovalDialog(true)
  }

  const handleApprovalSubmit = async () => {
    await loadData()
    setShowApprovalDialog(false)
    setSelectedRequest(null)
  }

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "yyyy년 M월 d일", { locale: ko })
  }

  const formatDateTime = (dateString: string) => {
    return format(new Date(dateString), "yyyy년 M월 d일 HH:mm", { locale: ko })
  }

  const canTakeAction = (request: LeaveRequest): boolean => {
    return request.status === "대기중"
  }
  
  const canCancelRequest = (request: LeaveRequest): boolean => {
    return request.status === "승인됨"
  }
  
  const handleCancelRequest = async (requestId: string, memberName: string) => {
    if (!currentUser) return
    
    if (!confirm(`${memberName}님의 연차 신청을 취소하시겠습니까?\n\n취소 시 연차가 복구되고 근무표가 원상태로 돌아갑니다.`)) return
    
    try {
      const result = await supabaseLeaveRequestStorage.cancelLeaveRequest({
        request_id: requestId,
        cancelled_by: currentUser.name,
      })
      
      // 근무표 미등록 알림이 있으면 표시
      if (result.message) {
        alert(result.message)
      }
      
      await loadData()
    } catch (error) {
      console.error("연차 취소 오류:", error)
      alert(error instanceof Error ? error.message : "연차 취소 중 오류가 발생했습니다.")
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#0a0b0c]">연차 승인 관리</h1>
            <p className="text-[#4a5568] mt-1">시안 1: Minimalist Clean</p>
          </div>
        </div>
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#5e6ad2] border-t-transparent mx-auto"></div>
          <p className="mt-4 text-[#4a5568]">데이터를 불러오는 중...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#0a0b0c]">연차 승인 관리</h1>
          <p className="text-[#718096] mt-2">시안 1: Minimalist Clean</p>
        </div>
        <div className="text-sm text-[#4a5568]">
          관리자: <span className="font-semibold text-[#0a0b0c]">{currentUser?.name}</span>
        </div>
      </div>

      {/* 깔끔한 통계 카드 */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
          <Card className="bg-white border-[#f3f4f6] shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 bg-[#eff6ff] rounded-full flex items-center justify-center mx-auto mb-3">
                <FileText className="h-6 w-6 text-[#2563eb]" />
              </div>
              <div className="text-3xl font-bold text-[#0a0b0c] mb-1">{stats.total_requests}</div>
              <div className="text-sm text-[#4a5568]">전체 신청</div>
            </CardContent>
          </Card>
          
          <Card className="bg-white border-[#f3f4f6] shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 bg-[#fff7ed] rounded-full flex items-center justify-center mx-auto mb-3">
                <Clock className="h-6 w-6 text-[#ea580c]" />
              </div>
              <div className="text-3xl font-bold text-[#ea580c] mb-1">{stats.pending_requests}</div>
              <div className="text-sm text-[#4a5568]">대기중</div>
            </CardContent>
          </Card>
          
          <Card className="bg-white border-[#f3f4f6] shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 bg-[#f0fdf4] rounded-full flex items-center justify-center mx-auto mb-3">
                <CheckCircle className="h-6 w-6 text-[#16a34a]" />
              </div>
              <div className="text-3xl font-bold text-[#16a34a] mb-1">{stats.approved_requests}</div>
              <div className="text-sm text-[#4a5568]">승인됨</div>
            </CardContent>
          </Card>
          
          <Card className="bg-white border-[#f3f4f6] shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 bg-[#fef2f2] rounded-full flex items-center justify-center mx-auto mb-3">
                <XCircle className="h-6 w-6 text-[#dc2626]" />
              </div>
              <div className="text-3xl font-bold text-[#dc2626] mb-1">{stats.rejected_requests}</div>
              <div className="text-sm text-[#4a5568]">반려됨</div>
            </CardContent>
          </Card>
          
          <Card className="bg-white border-[#f3f4f6] shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 bg-[#f8fafc] rounded-full flex items-center justify-center mx-auto mb-3">
                <X className="h-6 w-6 text-[#64748b]" />
              </div>
              <div className="text-3xl font-bold text-[#64748b] mb-1">{stats.cancelled_requests}</div>
              <div className="text-sm text-[#4a5568]">취소됨</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 연차 신청 목록 */}
      <Card className="bg-white border-[#f3f4f6] shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-3 text-xl text-[#0a0b0c]">
            <div className="w-6 h-6 bg-[#5e6ad2] rounded-full flex items-center justify-center">
              <FileText className="h-4 w-4 text-white" />
            </div>
            연차 신청 목록
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <Tabs defaultValue="pending" className="space-y-6">
            <TabsList className="grid w-full grid-cols-5 bg-[#fafbfb] p-1">
              <TabsTrigger value="pending" className="data-[state=active]:bg-white data-[state=active]:text-[#5e6ad2] data-[state=active]:shadow-sm">
                대기중 ({stats?.pending_requests || 0})
              </TabsTrigger>
              <TabsTrigger value="all" className="data-[state=active]:bg-white data-[state=active]:text-[#5e6ad2] data-[state=active]:shadow-sm">
                전체
              </TabsTrigger>
              <TabsTrigger value="승인됨" className="data-[state=active]:bg-white data-[state=active]:text-[#5e6ad2] data-[state=active]:shadow-sm">
                승인됨
              </TabsTrigger>
              <TabsTrigger value="반려됨" className="data-[state=active]:bg-white data-[state=active]:text-[#5e6ad2] data-[state=active]:shadow-sm">
                반려됨
              </TabsTrigger>
              <TabsTrigger value="취소됨" className="data-[state=active]:bg-white data-[state=active]:text-[#5e6ad2] data-[state=active]:shadow-sm">
                취소됨
              </TabsTrigger>
            </TabsList>

            {/* 대기중 탭 */}
            <TabsContent value="pending" className="space-y-4">
              {leaveRequests
                .filter((request) => request.status === "대기중")
                .map((request) => (
                  <Card key={request.id} className="bg-white border-l-4 border-l-[#ea580c] border-[#f3f4f6] shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="space-y-4 flex-1">
                          <div className="flex items-center gap-3 flex-wrap">
                            <Badge className={getLeaveTypeColor(request.leave_type)}>
                              {request.leave_type}
                            </Badge>
                            <Badge className={statusBadgeColors[request.status]}>
                              {request.status}
                            </Badge>
                            <span className="text-sm font-semibold text-[#0a0b0c] bg-[#fafbfb] px-2 py-1 rounded">
                              {request.total_days}일
                            </span>
                          </div>
                          
                          <div className="space-y-3">
                            <div className="flex items-center gap-3 text-sm">
                              <Users className="h-4 w-4 text-[#718096]" />
                              <span className="font-semibold text-[#0a0b0c]">{request.member_name}</span>
                              {request.team_name && (
                                <span className="text-[#4a5568] bg-[#f7f8f9] px-2 py-0.5 rounded">
                                  {request.team_name}
                                </span>
                              )}
                            </div>
                            
                            <div className="flex items-center gap-3 text-sm">
                              <CalendarDays className="h-4 w-4 text-[#718096]" />
                              <span className="text-[#4a5568]">
                                {request.start_date === request.end_date
                                  ? formatDate(request.start_date)
                                  : `${formatDate(request.start_date)} ~ ${formatDate(request.end_date)}`
                                }
                              </span>
                            </div>
                            
                            <div className="flex items-center gap-3 text-sm">
                              <Clock className="h-4 w-4 text-[#718096]" />
                              <span className="text-[#4a5568]">신청일: {formatDateTime(request.requested_at)}</span>
                            </div>
                            
                            {request.reason && (
                              <div className="p-3 bg-[#fafbfb] rounded-lg">
                                <span className="text-sm text-[#4a5568]">
                                  <span className="font-medium text-[#0a0b0c]">사유:</span> {request.reason}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {canTakeAction(request) && (
                          <div className="flex gap-2 ml-4">
                            <Button
                              size="sm"
                              onClick={() => handleApprovalAction(request, "approve")}
                              className="flex items-center gap-2 bg-[#16a34a] hover:bg-[#15803d] text-white h-9"
                            >
                              <CheckCircle className="h-4 w-4" />
                              승인
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleApprovalAction(request, "reject")}
                              className="flex items-center gap-2 text-[#dc2626] hover:text-[#b91c1c] border-[#f3f4f6] hover:border-[#fecaca] hover:bg-[#fef2f2] h-9"
                            >
                              <XCircle className="h-4 w-4" />
                              반려
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              
              {leaveRequests.filter((request) => request.status === "대기중").length === 0 && (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-[#f7f8f9] rounded-full flex items-center justify-center mx-auto mb-4">
                    <Clock className="h-8 w-8 text-[#718096]" />
                  </div>
                  <p className="text-[#4a5568] text-lg">대기 중인 연차 신청이 없습니다.</p>
                  <p className="text-[#718096] text-sm mt-2">새로운 신청이 들어오면 여기에 표시됩니다.</p>
                </div>
              )}
            </TabsContent>

            {/* 기타 탭들 */}
            {["all", "승인됨", "반려됨", "취소됨"].map((status) => (
              <TabsContent key={status} value={status} className="space-y-4">
                {leaveRequests
                  .filter((request) => status === "all" || request.status === status)
                  .map((request) => (
                    <Card key={request.id} className="bg-white border-[#f3f4f6] shadow-sm hover:shadow-md transition-shadow">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between">
                          <div className="space-y-4 flex-1">
                            <div className="flex items-center gap-3 flex-wrap">
                              <Badge className={getLeaveTypeColor(request.leave_type)}>
                                {request.leave_type}
                              </Badge>
                              <Badge className={statusBadgeColors[request.status]}>
                                {request.status}
                              </Badge>
                              <span className="text-sm font-semibold text-[#0a0b0c] bg-[#fafbfb] px-2 py-1 rounded">
                                {request.total_days}일
                              </span>
                            </div>
                            
                            <div className="space-y-3">
                              <div className="flex items-center gap-3 text-sm">
                                <Users className="h-4 w-4 text-[#718096]" />
                                <span className="font-semibold text-[#0a0b0c]">{request.member_name}</span>
                                {request.team_name && (
                                  <span className="text-[#4a5568] bg-[#f7f8f9] px-2 py-0.5 rounded">
                                    {request.team_name}
                                  </span>
                                )}
                              </div>
                              
                              <div className="flex items-center gap-3 text-sm">
                                <CalendarDays className="h-4 w-4 text-[#718096]" />
                                <span className="text-[#4a5568]">
                                  {request.start_date === request.end_date
                                    ? formatDate(request.start_date)
                                    : `${formatDate(request.start_date)} ~ ${formatDate(request.end_date)}`
                                  }
                                </span>
                              </div>
                              
                              <div className="flex items-center gap-3 text-sm">
                                <Clock className="h-4 w-4 text-[#718096]" />
                                <span className="text-[#4a5568]">신청일: {formatDateTime(request.requested_at)}</span>
                              </div>
                              
                              {request.reason && (
                                <div className="p-3 bg-[#fafbfb] rounded-lg">
                                  <span className="text-sm text-[#4a5568]">
                                    <span className="font-medium text-[#0a0b0c]">사유:</span> {request.reason}
                                  </span>
                                </div>
                              )}
                              
                              {request.status === "승인됨" && request.approved_at && (
                                <div className="text-sm">
                                  <span className="font-medium text-[#16a34a]">승인일:</span> 
                                  <span className="text-[#4a5568] ml-2">{formatDateTime(request.approved_at)}</span>
                                </div>
                              )}
                              
                              {request.status === "반려됨" && (
                                <>
                                  {request.approved_at && (
                                    <div className="text-sm">
                                      <span className="font-medium text-[#dc2626]">반려일:</span> 
                                      <span className="text-[#4a5568] ml-2">{formatDateTime(request.approved_at)}</span>
                                    </div>
                                  )}
                                  {request.rejected_reason && (
                                    <div className="p-3 bg-[#fef2f2] border border-[#fecaca] rounded-lg">
                                      <span className="text-sm text-[#dc2626]">
                                        <span className="font-medium">반려 사유:</span> {request.rejected_reason}
                                      </span>
                                    </div>
                                  )}
                                </>
                              )}
                              
                              {request.status === "취소됨" && request.cancelled_at && (
                                <div className="text-sm">
                                  <span className="font-medium text-[#64748b]">취소일:</span> 
                                  <span className="text-[#4a5568] ml-2">{formatDateTime(request.cancelled_at)}</span>
                                </div>
                              )}
                            </div>
                          </div>
                          
                          {canCancelRequest(request) && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleCancelRequest(request.id, request.member_name)}
                              className="flex items-center gap-2 text-[#dc2626] hover:text-[#b91c1c] border-[#f3f4f6] hover:border-[#fecaca] hover:bg-[#fef2f2] h-9 ml-4"
                            >
                              <X className="h-4 w-4" />
                              취소
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                
                {leaveRequests.filter((request) => status === "all" || request.status === status).length === 0 && (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-[#f7f8f9] rounded-full flex items-center justify-center mx-auto mb-4">
                      <FileText className="h-8 w-8 text-[#718096]" />
                    </div>
                    <p className="text-[#4a5568] text-lg">
                      {status === "all" ? "연차 신청 내역이 없습니다." : `${status} 상태의 신청이 없습니다.`}
                    </p>
                  </div>
                )}
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      {/* 승인/반려 다이얼로그 */}
      {selectedRequest && (
        <LeaveApprovalDialog
          open={showApprovalDialog}
          onOpenChange={setShowApprovalDialog}
          request={selectedRequest}
          action={approvalAction}
          approverId={currentUser?.id || ""}
          onSubmit={handleApprovalSubmit}
        />
      )}
    </div>
  )
}