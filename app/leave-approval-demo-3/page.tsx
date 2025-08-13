"use client"

import React, { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { CalendarDays, Clock, FileText, CheckCircle, XCircle, Users, X, Plus, MoreVertical } from "lucide-react"
import { format } from "date-fns"
import { ko } from "date-fns/locale"
import { supabaseLeaveRequestStorage } from "@/lib/supabase-leave-request-storage"
import { supabase } from "@/lib/supabase"
import { LeaveApprovalDialog } from "@/components/leave-approval-dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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

const getLeaveTypeColor = (leaveType: string) => {
  return leaveTypeColors[leaveType as keyof typeof leaveTypeColors] || "bg-[#fef3c7] text-[#d97706] border-[#fde68a]"
}

export default function LeaveApprovalDemo3() {
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([])
  const [filteredRequests, setFilteredRequests] = useState<LeaveRequest[]>([])
  const [stats, setStats] = useState<LeaveRequestStats | null>(null)
  const [currentUser, setCurrentUser] = useState<{ id: string; name: string; role: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null)
  const [showApprovalDialog, setShowApprovalDialog] = useState(false)
  const [approvalAction, setApprovalAction] = useState<"approve" | "reject">("approve")
  
  // 필터 상태
  const [searchTerm, setSearchTerm] = useState("")
  const [activeTab, setActiveTab] = useState("pending")

  useEffect(() => {
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

  // 필터링 로직
  useEffect(() => {
    let filtered = leaveRequests

    // 탭에 따른 기본 필터링
    if (activeTab === "pending") {
      filtered = filtered.filter(request => request.status === "대기중")
    } else if (activeTab !== "all") {
      filtered = filtered.filter(request => request.status === activeTab)
    }

    // 검색어 필터링
    if (searchTerm) {
      filtered = filtered.filter(request =>
        request.member_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        request.team_name?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    setFilteredRequests(filtered)
  }, [leaveRequests, searchTerm, activeTab])

  const loadData = async () => {
    try {
      setLoading(true)
      
      const requests = await supabaseLeaveRequestStorage.getAllLeaveRequests()
      setLeaveRequests(requests)
      
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
    return format(new Date(dateString), "yy.M.d(E)", { locale: ko })
  }

  const formatDateTime = (dateString: string) => {
    return format(new Date(dateString), "M/d HH:mm", { locale: ko })
  }

  const canTakeAction = (request: LeaveRequest): boolean => {
    return request.status === "대기중"
  }
  
  const canCancelRequest = (request: LeaveRequest): boolean => {
    return request.status === "승인됨"
  }
  
  const handleCancelRequest = async (requestId: string, memberName: string) => {
    if (!currentUser) return
    
    if (!confirm(`${memberName}님의 연차 신청을 취소하시겠습니까?`)) return
    
    try {
      const result = await supabaseLeaveRequestStorage.cancelLeaveRequest({
        request_id: requestId,
        cancelled_by: currentUser.name,
      })
      
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
            <p className="text-[#4a5568] mt-1">시안 3: Mobile-First Optimized</p>
          </div>
        </div>
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#5e6ad2] border-t-transparent mx-auto"></div>
          <p className="mt-4 text-[#4a5568]">데이터를 불러오는 중...</p>
        </div>
      </div>
    )
  }

  const pendingRequests = leaveRequests.filter(r => r.status === "대기중")

  return (
    <div className="space-y-6 pb-20 md:pb-6">
      {/* 헤더 - 모바일 최적화 */}
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-[#0a0b0c]">연차 승인</h1>
        <p className="text-[#718096] text-sm md:text-base mt-1">Mobile-First Optimized</p>
      </div>


      {/* 검색바 */}
      <div className="px-1">
        <Input
          placeholder="이름 또는 팀명으로 검색..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="border-[#f3f4f6] focus:border-[#5e6ad2] focus:ring-1 focus:ring-[#5e6ad2]"
        />
      </div>

      {/* 탭 네비게이션 - 모바일 스크롤 */}
      <div className="px-1">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <div className="overflow-x-auto">
            <TabsList className="grid w-max grid-cols-5 bg-[#fafbfb] min-w-full">
              <TabsTrigger value="pending" className="data-[state=active]:bg-white data-[state=active]:text-[#5e6ad2] whitespace-nowrap px-3">
                대기중 ({stats?.pending_requests || 0})
              </TabsTrigger>
              <TabsTrigger value="all" className="data-[state=active]:bg-white data-[state=active]:text-[#5e6ad2] whitespace-nowrap px-3">
                전체 ({stats?.total_requests || 0})
              </TabsTrigger>
              <TabsTrigger value="승인됨" className="data-[state=active]:bg-white data-[state=active]:text-[#5e6ad2] whitespace-nowrap px-3">
                승인됨 ({stats?.approved_requests || 0})
              </TabsTrigger>
              <TabsTrigger value="반려됨" className="data-[state=active]:bg-white data-[state=active]:text-[#5e6ad2] whitespace-nowrap px-3">
                반려됨 ({stats?.rejected_requests || 0})
              </TabsTrigger>
              <TabsTrigger value="취소됨" className="data-[state=active]:bg-white data-[state=active]:text-[#5e6ad2] whitespace-nowrap px-3">
                취소됨 ({stats?.cancelled_requests || 0})
              </TabsTrigger>
            </TabsList>
          </div>

          {/* 데스크톱 테이블 뷰 */}
          <div className="hidden md:block">
            <Card className="bg-white border-[#f3f4f6]">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-[#fafbfb] border-b border-[#f3f4f6]">
                      <tr>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-[#4a5568] uppercase">신청자</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-[#4a5568] uppercase">유형</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-[#4a5568] uppercase">상태</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-[#4a5568] uppercase">기간</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-[#4a5568] uppercase">일수</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-[#4a5568] uppercase">사유</th>
                        <th className="text-center px-4 py-3 text-xs font-semibold text-[#4a5568] uppercase">액션</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#f3f4f6]">
                      {filteredRequests.map((request) => (
                        <tr key={request.id} className="hover:bg-[#f7f8f9] transition-colors">
                          <td className="px-4 py-3">
                            <div>
                              <div className="font-semibold text-[#0a0b0c] text-sm">{request.member_name}</div>
                              {request.team_name && (
                                <div className="text-xs text-[#718096]">{request.team_name}</div>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-sm text-[#0a0b0c] font-medium">
                              {request.leave_type}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-sm font-medium ${statusColors[request.status]}`}>
                              {request.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-[#4a5568]">
                            {request.start_date === request.end_date
                              ? formatDate(request.start_date)
                              : `${formatDate(request.start_date)} ~ ${formatDate(request.end_date)}`
                            }
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-semibold text-[#0a0b0c]">{request.total_days}일</span>
                          </td>
                          <td className="px-4 py-3 text-sm text-[#718096]">
                            {request.reason || '-'}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex justify-center">
                              {canTakeAction(request) ? (
                                <div className="flex gap-1">
                                  <Button
                                    size="sm"
                                    onClick={() => handleApprovalAction(request, "approve")}
                                    className="bg-[#5e6ad2] hover:bg-[#4e5ac2] text-white h-7 px-2 text-xs font-medium"
                                  >
                                    승인
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleApprovalAction(request, "reject")}
                                    className="bg-white text-[#dc2626] border-[#f3f4f6] hover:bg-[#fef2f2] hover:border-[#fecaca] h-7 px-2 text-xs font-medium"
                                  >
                                    반려
                                  </Button>
                                </div>
                              ) : canCancelRequest(request) ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleCancelRequest(request.id, request.member_name)}
                                  className="bg-white text-[#718096] border-[#f3f4f6] hover:bg-[#fef2f2] hover:text-[#dc2626] hover:border-[#fecaca] h-7 px-2 text-xs font-medium"
                                >
                                  취소
                                </Button>
                              ) : (
                                <span className="text-xs text-[#718096]">-</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 모바일 카드 뷰 - Version 6 스타일 적용 */}
          <div className="md:hidden space-y-3">
            {filteredRequests.map((request) => (
              <Card key={request.id} className={`
                ${request.status === "대기중" ? "bg-[#fafbfb] border-[#f3f4f6]" :
                  request.status === "승인됨" ? "bg-[#f0fdf4] border-[#bbf7d0]" :
                  request.status === "반려됨" ? "bg-[#fef2f2] border-[#fecaca]" :
                  "bg-[#f8fafc] border-[#e2e8f0] opacity-75"}
              `}>
                <CardContent className="p-4">
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-[#0a0b0c]">{request.member_name}</span>
                        <span className="text-sm text-[#718096]">• {request.team_name}</span>
                      </div>
                      <Badge className={`text-xs ${getLeaveTypeColor(request.leave_type)}`}>
                        {request.leave_type}
                      </Badge>
                    </div>
                    <div className="text-sm text-[#4a5568]">
                      {request.start_date === request.end_date
                        ? formatDate(request.start_date)
                        : `${formatDate(request.start_date)} ~ ${formatDate(request.end_date)}`
                      } / {request.total_days}일
                    </div>
                    <div className="text-xs text-[#718096]">
                      {request.reason || '-'}
                    </div>
                  </div>

                  {/* 대기중 상태 - 액션 버튼 표시 */}
                  {request.status === "대기중" && canTakeAction(request) && (
                    <div className="flex gap-2 pt-3 border-t border-[#f3f4f6]">
                      <Button 
                        size="sm" 
                        onClick={() => handleApprovalAction(request, "approve")}
                        className="flex-1 bg-[#5e6ad2] hover:bg-[#4e5ac2] text-white font-medium"
                      >
                        승인
                      </Button>
                      <Button 
                        size="sm" 
                        onClick={() => handleApprovalAction(request, "reject")}
                        className="flex-1 bg-white hover:bg-[#fef2f2] text-[#dc2626] border border-[#f3f4f6] hover:border-[#fecaca] font-medium"
                      >
                        반려
                      </Button>
                    </div>
                  )}

                  {/* 승인됨 상태 */}
                  {request.status === "승인됨" && (
                    <div className="flex items-center justify-between pt-3 border-t border-[#bbf7d0]">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-[#16a34a]" />
                        <span className="text-sm font-medium text-[#16a34a]">승인됨</span>
                      </div>
                      {canCancelRequest(request) && (
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => handleCancelRequest(request.id, request.member_name)}
                          className="bg-white text-[#718096] border-[#f3f4f6] hover:bg-[#fef2f2] hover:text-[#dc2626] hover:border-[#fecaca] h-7 px-2 text-xs font-medium"
                        >
                          취소
                        </Button>
                      )}
                    </div>
                  )}

                  {/* 반려됨 상태 */}
                  {request.status === "반려됨" && (
                    <div className="pt-3 border-t border-[#fecaca]">
                      <div className="flex items-center gap-2">
                        <XCircle className="h-4 w-4 text-[#dc2626]" />
                        <span className="text-sm font-medium text-[#dc2626]">반려됨</span>
                      </div>
                      {request.rejected_reason && (
                        <div className="text-xs text-[#dc2626] mt-1">
                          반려 사유: {request.rejected_reason}
                        </div>
                      )}
                    </div>
                  )}

                  {/* 취소됨 상태 */}
                  {request.status === "취소됨" && (
                    <div className="pt-3 border-t border-[#e2e8f0]">
                      <div className="flex items-center gap-2">
                        <X className="h-4 w-4 text-[#64748b]" />
                        <span className="text-sm font-medium text-[#64748b]">취소됨</span>
                        {request.cancelled_at && (
                          <span className="text-xs text-[#94a3b8]">
                            • {formatDateTime(request.cancelled_at)}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
            
            {filteredRequests.length === 0 && (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-[#f7f8f9] rounded-full flex items-center justify-center mx-auto mb-4">
                  <FileText className="h-8 w-8 text-[#718096]" />
                </div>
                <p className="text-[#4a5568]">조건에 맞는 연차 신청이 없습니다.</p>
                <p className="text-[#718096] text-sm mt-1">검색 조건을 변경해보세요.</p>
              </div>
            )}
          </div>
        </Tabs>
      </div>

      {/* 모바일 FAB - 대기중 신청이 있을 때만 표시 */}
      {pendingRequests.length > 0 && (
        <div className="md:hidden fixed bottom-6 right-6 z-50">
          <Button 
            onClick={() => {
              if (pendingRequests[0]) {
                handleApprovalAction(pendingRequests[0], "approve")
              }
            }}
            className="h-14 w-14 rounded-full bg-[#5e6ad2] hover:bg-[#4e5ac2] text-white shadow-lg"
          >
            <CheckCircle className="h-6 w-6" />
          </Button>
        </div>
      )}

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