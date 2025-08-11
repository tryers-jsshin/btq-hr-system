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

const statusColors = {
  "대기중": "bg-yellow-100 text-yellow-800",
  "승인됨": "bg-green-100 text-green-800",
  "반려됨": "bg-red-100 text-red-800",
  "취소됨": "bg-gray-100 text-gray-800",
}

// 휴가 유형별 색상 - 동적으로 처리
const getLeaveTypeColor = (leaveType: string) => {
  // 기본 색상 맵
  const colorMap: Record<string, string> = {
    "연차": "bg-blue-100 text-blue-800",
    "오전반차": "bg-purple-100 text-purple-800",
    "오후반차": "bg-indigo-100 text-indigo-800",
    "특별 휴가": "bg-green-100 text-green-800",
    "병가": "bg-red-100 text-red-800",
    "경조휴가": "bg-gray-100 text-gray-800",
  }
  // 정의되지 않은 휴가 유형은 기본 색상 사용
  return colorMap[leaveType] || "bg-orange-100 text-orange-800"
}

export default function LeaveApprovalPage() {
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
    // 관리자는 승인된 연차를 취소할 수 있음
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
          <h1 className="text-2xl font-bold">연차 승인 관리</h1>
        </div>
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-gray-600">로딩 중...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">연차 승인 관리</h1>
        <div className="text-sm text-gray-600">
          관리자: {currentUser?.name}
        </div>
      </div>

      {/* 통계 카드 */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.total_requests}</div>
              <div className="text-sm text-gray-600">전체 신청</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-yellow-600">{stats.pending_requests}</div>
              <div className="text-sm text-gray-600">대기 중</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-600">{stats.approved_requests}</div>
              <div className="text-sm text-gray-600">승인됨</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-red-600">{stats.rejected_requests}</div>
              <div className="text-sm text-gray-600">반려됨</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-gray-600">{stats.cancelled_requests}</div>
              <div className="text-sm text-gray-600">취소됨</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 연차 신청 목록 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            연차 신청 목록
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="pending" className="space-y-4">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="pending">대기중 ({stats?.pending_requests || 0})</TabsTrigger>
              <TabsTrigger value="all">전체</TabsTrigger>
              <TabsTrigger value="승인됨">승인됨</TabsTrigger>
              <TabsTrigger value="반려됨">반려됨</TabsTrigger>
              <TabsTrigger value="취소됨">취소됨</TabsTrigger>
            </TabsList>

            {/* 대기중 탭 */}
            <TabsContent value="pending" className="space-y-4">
              {leaveRequests
                .filter((request) => request.status === "대기중")
                .map((request) => (
                  <Card key={request.id} className="border-l-4 border-l-yellow-500">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Badge className={getLeaveTypeColor(request.leave_type)}>
                              {request.leave_type}
                            </Badge>
                            <Badge className={statusColors[request.status]}>
                              {request.status}
                            </Badge>
                            <span className="text-sm text-gray-600">
                              {request.total_days}일
                            </span>
                          </div>
                          
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 text-sm font-medium">
                              <Users className="h-4 w-4" />
                              <span>{request.member_name}</span>
                              {request.team_name && (
                                <span className="text-gray-600">({request.team_name})</span>
                              )}
                            </div>
                            
                            <div className="flex items-center gap-2 text-sm">
                              <CalendarDays className="h-4 w-4" />
                              <span>
                                {request.start_date === request.end_date
                                  ? formatDate(request.start_date)
                                  : `${formatDate(request.start_date)} ~ ${formatDate(request.end_date)}`
                                }
                              </span>
                            </div>
                            
                            <div className="flex items-center gap-2 text-sm">
                              <Clock className="h-4 w-4" />
                              <span>신청일: {formatDateTime(request.requested_at)}</span>
                            </div>
                            
                            {request.reason && (
                              <div className="text-sm text-gray-600">
                                사유: {request.reason}
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {canTakeAction(request) && (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleApprovalAction(request, "approve")}
                              className="flex items-center gap-1 bg-green-600 hover:bg-green-700"
                            >
                              <CheckCircle className="h-3 w-3" />
                              승인
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleApprovalAction(request, "reject")}
                              className="flex items-center gap-1 text-red-600 hover:text-red-700 border-red-200 hover:border-red-300"
                            >
                              <XCircle className="h-3 w-3" />
                              반려
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              
              {leaveRequests.filter((request) => request.status === "대기중").length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  대기 중인 연차 신청이 없습니다.
                </div>
              )}
            </TabsContent>

            {/* 기타 탭들 */}
            {["all", "승인됨", "반려됨", "취소됨"].map((status) => (
              <TabsContent key={status} value={status} className="space-y-4">
                {leaveRequests
                  .filter((request) => status === "all" || request.status === status)
                  .map((request) => (
                    <Card key={request.id} className="border-l-4 border-l-gray-300">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="space-y-2 flex-1">
                            <div className="flex items-center gap-2">
                            <Badge className={getLeaveTypeColor(request.leave_type)}>
                              {request.leave_type}
                            </Badge>
                            <Badge className={statusColors[request.status]}>
                              {request.status}
                            </Badge>
                            <span className="text-sm text-gray-600">
                              {request.total_days}일
                            </span>
                          </div>
                          
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 text-sm font-medium">
                              <Users className="h-4 w-4" />
                              <span>{request.member_name}</span>
                              {request.team_name && (
                                <span className="text-gray-600">({request.team_name})</span>
                              )}
                            </div>
                            
                            <div className="flex items-center gap-2 text-sm">
                              <CalendarDays className="h-4 w-4" />
                              <span>
                                {request.start_date === request.end_date
                                  ? formatDate(request.start_date)
                                  : `${formatDate(request.start_date)} ~ ${formatDate(request.end_date)}`
                                }
                              </span>
                            </div>
                            
                            <div className="flex items-center gap-2 text-sm">
                              <Clock className="h-4 w-4" />
                              <span>신청일: {formatDateTime(request.requested_at)}</span>
                            </div>
                            
                            {request.reason && (
                              <div className="text-sm text-gray-600">
                                사유: {request.reason}
                              </div>
                            )}
                            
                            {request.status === "승인됨" && request.approved_at && (
                              <div className="text-sm text-green-600">
                                승인일: {formatDateTime(request.approved_at)}
                              </div>
                            )}
                            
                            {request.status === "반려됨" && (
                              <>
                                {request.approved_at && (
                                  <div className="text-sm text-red-600">
                                    반려일: {formatDateTime(request.approved_at)}
                                  </div>
                                )}
                                {request.rejected_reason && (
                                  <div className="text-sm text-red-600">
                                    반려 사유: {request.rejected_reason}
                                  </div>
                                )}
                              </>
                            )}
                            
                            {request.status === "취소됨" && request.cancelled_at && (
                              <div className="text-sm text-gray-600">
                                취소일: {formatDateTime(request.cancelled_at)}
                              </div>
                            )}
                            </div>
                          </div>
                          
                          {canCancelRequest(request) && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleCancelRequest(request.id, request.member_name)}
                              className="flex items-center gap-1 text-red-600 hover:text-red-700"
                            >
                              <X className="h-3 w-3" />
                              취소
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                
                {leaveRequests.filter((request) => status === "all" || request.status === status).length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    {status === "all" ? "연차 신청 내역이 없습니다." : `${status} 상태의 신청이 없습니다.`}
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