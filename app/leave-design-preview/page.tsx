"use client"

import React, { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { CalendarDays, Clock, FileText, Plus, X, Eye, MoreVertical, Calendar, User, TrendingUp } from "lucide-react"
import { cn } from "@/lib/utils"

// 샘플 데이터
const sampleBalance = {
  current_balance: 8.5,
  total_granted: 15,
  total_used: 6.5,
  total_expired: 0
}

const sampleRequests = [
  {
    id: "1",
    leave_type: "연차",
    status: "승인됨" as const,
    start_date: "2024-08-20",
    end_date: "2024-08-20",
    total_days: 1,
    reason: "개인 사정으로 인한 휴가",
    requested_at: "2024-08-15T09:00:00",
    approved_at: "2024-08-15T14:30:00"
  },
  {
    id: "2", 
    leave_type: "오전반차",
    status: "대기중" as const,
    start_date: "2024-08-25",
    end_date: "2024-08-25", 
    total_days: 0.5,
    reason: "병원 방문",
    requested_at: "2024-08-13T16:20:00"
  },
  {
    id: "3",
    leave_type: "연차",
    status: "반려됨" as const,
    start_date: "2024-08-30",
    end_date: "2024-09-02",
    total_days: 4,
    reason: "여행",
    requested_at: "2024-08-12T11:15:00",
    rejected_reason: "업무 일정상 해당 기간 연차 승인이 어렵습니다"
  }
]

const statusColors = {
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
}

export default function LeaveDesignPreview() {
  const [selectedDesign, setSelectedDesign] = useState<number | null>(null)
  const [activeTab, setActiveTab] = useState("all")
  const [mobileFilter, setMobileFilter] = useState("all")
  const [dashboardFilter, setDashboardFilter] = useState("all")
  const [minimalFilter, setMinimalFilter] = useState("all")

  const getFilteredRequests = (filter: string) => {
    if (filter === "all") return sampleRequests
    return sampleRequests.filter(req => req.status === filter)
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const year = date.getFullYear().toString().slice(-2) // 마지막 2자리만
    const month = date.getMonth() + 1
    const day = date.getDate()
    return `${year}년 ${month}월 ${day}일`
  }

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    })
  }

  return (
    <div className="min-h-screen bg-[#fafbfb]">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white border-b border-[#f3f4f6]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <h1 className="text-2xl font-semibold text-[#0a0b0c]">연차 신청 페이지 디자인 프리뷰</h1>
          <p className="text-sm text-[#718096] mt-1">5가지 디자인 중 선택하세요</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-12">
        
        {/* Option 1: 현재 스타일 개선 (Linear Light 테마) */}
        <section onClick={() => setSelectedDesign(1)}>
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-[#0a0b0c]">Option 1: Linear Light 테마</h2>
            <p className="text-sm text-[#718096]">현재 디자인을 Linear Light 테마로 개선</p>
          </div>
          
          <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-semibold text-[#0a0b0c]">연차 신청</h1>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" className="border-[#f3f4f6] text-[#4a5568] hover:bg-[#fafbfb]">
                  <Eye className="h-4 w-4 mr-2" />
                  연차 정책 보기
                </Button>
                <Button className="bg-[#5e6ad2] hover:bg-[#4e5ac2] text-white">
                  <Plus className="h-4 w-4 mr-2" />
                  연차 신청
                </Button>
              </div>
            </div>

            {/* Balance Card */}
            <Card className="bg-white border-[#f3f4f6]">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-[#0a0b0c]">
                  <CalendarDays className="h-5 w-5 text-[#5e6ad2]" />
                  연차 잔액
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-[#fafbfb] rounded-lg">
                    <div className="text-2xl font-bold text-[#5e6ad2]">{sampleBalance.current_balance}</div>
                    <div className="text-sm text-[#718096]">잔여 연차</div>
                  </div>
                  <div className="text-center p-4 bg-[#fafbfb] rounded-lg">
                    <div className="text-2xl font-bold text-[#00b8cc]">{sampleBalance.total_granted}</div>
                    <div className="text-sm text-[#718096]">총 부여</div>
                  </div>
                  <div className="text-center p-4 bg-[#fafbfb] rounded-lg">
                    <div className="text-2xl font-bold text-[#8b7cf6]">{sampleBalance.total_used}</div>
                    <div className="text-sm text-[#718096]">사용</div>
                  </div>
                  <div className="text-center p-4 bg-[#fafbfb] rounded-lg">
                    <div className="text-2xl font-bold text-[#4a5568]">{sampleBalance.total_expired}</div>
                    <div className="text-sm text-[#718096]">소멸</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Requests List */}
            <Card className="bg-white border-[#f3f4f6]">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-[#0a0b0c]">
                  <FileText className="h-5 w-5 text-[#5e6ad2]" />
                  연차 신청 내역
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="all" className="space-y-4">
                  <TabsList className="grid w-full grid-cols-5 bg-[#fafbfb]">
                    <TabsTrigger value="all" className="text-[#4a5568] data-[state=active]:bg-white data-[state=active]:text-[#0a0b0c]">전체</TabsTrigger>
                    <TabsTrigger value="대기중" className="text-[#4a5568] data-[state=active]:bg-white data-[state=active]:text-[#0a0b0c]">대기중</TabsTrigger>
                    <TabsTrigger value="승인됨" className="text-[#4a5568] data-[state=active]:bg-white data-[state=active]:text-[#0a0b0c]">승인됨</TabsTrigger>
                    <TabsTrigger value="반려됨" className="text-[#4a5568] data-[state=active]:bg-white data-[state=active]:text-[#0a0b0c]">반려됨</TabsTrigger>
                    <TabsTrigger value="취소됨" className="text-[#4a5568] data-[state=active]:bg-white data-[state=active]:text-[#0a0b0c]">취소됨</TabsTrigger>
                  </TabsList>
                  
                  {["all", "대기중", "승인됨", "반려됨", "취소됨"].map((status) => (
                    <TabsContent key={status} value={status} className="space-y-4">
                      {getFilteredRequests(status).map((request) => (
                        <Card key={request.id} className="border-l-4 border-l-[#5e6ad2] bg-white border-[#f3f4f6]">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between">
                              <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                  <Badge className={cn("border", leaveTypeColors[request.leave_type as keyof typeof leaveTypeColors])}>
                                    {request.leave_type}
                                  </Badge>
                                  <Badge className={cn("border", statusColors[request.status])}>
                                    {request.status}
                                  </Badge>
                                  <span className="text-sm text-[#718096]">
                                    {request.total_days}일
                                  </span>
                                </div>
                                
                                <div className="space-y-2">
                                  <div className="flex items-center gap-2 text-sm text-[#4a5568]">
                                    <CalendarDays className="h-4 w-4 text-[#718096]" />
                                    <span>{formatDate(request.start_date)}</span>
                                  </div>
                                  <div className="flex items-center gap-2 text-sm text-[#4a5568]">
                                    <Clock className="h-4 w-4 text-[#718096]" />
                                    <span>신청일: {formatDateTime(request.requested_at)}</span>
                                  </div>
                                  {request.reason && (
                                    <div className="text-sm text-[#718096]">
                                      사유: {request.reason}
                                    </div>
                                  )}
                                </div>
                              </div>
                              
                              {request.status === "대기중" && (
                                <Button size="sm" variant="outline" className="border-red-200 text-red-600 hover:bg-red-50">
                                  <X className="h-3 w-3 mr-1" />
                                  취소
                                </Button>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                      
                      {getFilteredRequests(status).length === 0 && (
                        <div className="text-center py-8 text-[#718096]">
                          {status === "all" ? "연차 신청 내역이 없습니다." : `${status} 상태의 신청이 없습니다.`}
                        </div>
                      )}
                    </TabsContent>
                  ))}
                </Tabs>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Option 2: 컴팩트 카드 디자인 */}
        <section onClick={() => setSelectedDesign(2)} className="bg-white p-6 rounded-xl">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-[#0a0b0c]">Option 2: 컴팩트 카드</h2>
            <p className="text-sm text-[#718096]">공간 효율적인 카드 기반 레이아웃</p>
          </div>
          
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-semibold text-[#0a0b0c]">연차 신청</h1>
              <Button className="bg-[#5e6ad2] hover:bg-[#4e5ac2] text-white">
                <Plus className="h-4 w-4 mr-2" />
                신규 신청
              </Button>
            </div>

            {/* Mini Balance Cards */}
            <div className="grid grid-cols-4 gap-3">
              <Card className="bg-gradient-to-br from-[#5e6ad2] to-[#8b7cf6] text-white border-0">
                <CardContent className="p-3 text-center">
                  <div className="text-xl font-bold">{sampleBalance.current_balance}</div>
                  <div className="text-xs opacity-90">잔여</div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-[#00b8cc] to-[#0891b2] text-white border-0">
                <CardContent className="p-3 text-center">
                  <div className="text-xl font-bold">{sampleBalance.total_granted}</div>
                  <div className="text-xs opacity-90">부여</div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-[#8b7cf6] to-[#a855f7] text-white border-0">
                <CardContent className="p-3 text-center">
                  <div className="text-xl font-bold">{sampleBalance.total_used}</div>
                  <div className="text-xs opacity-90">사용</div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-[#64748b] to-[#475569] text-white border-0">
                <CardContent className="p-3 text-center">
                  <div className="text-xl font-bold">{sampleBalance.total_expired}</div>
                  <div className="text-xs opacity-90">소멸</div>
                </CardContent>
              </Card>
            </div>

            {/* Compact Request Cards */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-[#0a0b0c]">신청 내역</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const filters = ["all", "대기중", "승인됨", "반려됨", "취소됨"]
                    const currentIndex = filters.indexOf(activeTab)
                    const nextIndex = (currentIndex + 1) % filters.length
                    setActiveTab(filters[nextIndex])
                  }}
                  className="text-xs text-[#5e6ad2] hover:bg-[#5e6ad2]/10"
                >
                  {activeTab === "all" ? "전체" : activeTab} ▼
                </Button>
              </div>
              
              {/* Filter Buttons */}
              <div className="flex gap-2 flex-wrap">
                {["all", "대기중", "승인됨", "반려됨", "취소됨"].map((filter) => (
                  <Button
                    key={filter}
                    size="sm"
                    variant={activeTab === filter ? "default" : "outline"}
                    onClick={() => setActiveTab(filter)}
                    className={cn(
                      "text-xs h-7",
                      activeTab === filter
                        ? "bg-[#5e6ad2] text-white hover:bg-[#4e5ac2]"
                        : "border-[#f3f4f6] text-[#718096] hover:bg-[#fafbfb]"
                    )}
                  >
                    {filter === "all" ? "전체" : filter}
                  </Button>
                ))}
              </div>
              
              {getFilteredRequests(activeTab).map((request) => (
                <Card key={request.id} className="bg-white border-[#f3f4f6] hover:shadow-sm transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-8 rounded-full bg-[#5e6ad2]"></div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <Badge className={cn("text-xs", leaveTypeColors[request.leave_type as keyof typeof leaveTypeColors])}>
                              {request.leave_type}
                            </Badge>
                            <span className="text-sm font-medium text-[#0a0b0c]">
                              {formatDate(request.start_date)}
                            </span>
                          </div>
                          <div className="text-xs text-[#718096]">{request.total_days}일 • {request.reason}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={cn("text-xs", statusColors[request.status])}>
                          {request.status}
                        </Badge>
                        {request.status === "대기중" && (
                          <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-[#718096]">
                            <X className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              
              {getFilteredRequests(activeTab).length === 0 && (
                <div className="text-center py-8 text-[#718096]">
                  {activeTab === "all" ? "연차 신청 내역이 없습니다." : `${activeTab} 상태의 신청이 없습니다.`}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Option 3: 대시보드 스타일 */}
        <section onClick={() => setSelectedDesign(3)}>
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-[#0a0b0c]">Option 3: 대시보드 스타일</h2>
            <p className="text-sm text-[#718096]">시각적 지표와 차트를 활용한 대시보드</p>
          </div>
          
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-semibold text-[#0a0b0c]">연차 대시보드</h1>
              <Button className="bg-[#5e6ad2] hover:bg-[#4e5ac2] text-white">
                <Plus className="h-4 w-4 mr-2" />
                연차 신청
              </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Balance Overview */}
              <div className="lg:col-span-2">
                <Card className="bg-white border-[#f3f4f6]">
                  <CardHeader>
                    <CardTitle className="text-[#0a0b0c]">연차 사용 현황</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-[#718096]">사용률</span>
                        <span className="text-sm font-medium text-[#0a0b0c]">
                          {((sampleBalance.total_used / sampleBalance.total_granted) * 100).toFixed(1)}%
                        </span>
                      </div>
                      <Progress 
                        value={(sampleBalance.total_used / sampleBalance.total_granted) * 100} 
                        className="h-2"
                      />
                      <div className="grid grid-cols-3 gap-4 pt-2">
                        <div className="text-center">
                          <div className="text-lg font-semibold text-[#00b8cc]">{sampleBalance.total_granted}</div>
                          <div className="text-xs text-[#718096]">총 부여</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-semibold text-[#8b7cf6]">{sampleBalance.total_used}</div>
                          <div className="text-xs text-[#718096]">사용</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-semibold text-[#5e6ad2]">{sampleBalance.current_balance}</div>
                          <div className="text-xs text-[#718096]">잔여</div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Quick Stats */}
              <div className="space-y-4">
                <Card className="bg-gradient-to-br from-[#5e6ad2] to-[#8b7cf6] text-white border-0">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-2xl font-bold">{sampleBalance.current_balance}</div>
                        <div className="text-sm opacity-90">사용 가능한 연차</div>
                      </div>
                      <CalendarDays className="h-8 w-8 opacity-80" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white border-[#f3f4f6]">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-lg font-semibold text-[#ea580c]">1</div>
                        <div className="text-xs text-[#718096]">대기중인 신청</div>
                      </div>
                      <Clock className="h-6 w-6 text-[#ea580c]" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white border-[#f3f4f6]">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-lg font-semibold text-[#16a34a]">2</div>
                        <div className="text-xs text-[#718096]">이번 달 승인</div>
                      </div>
                      <TrendingUp className="h-6 w-6 text-[#16a34a]" />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Recent Activity */}
            <Card className="bg-white border-[#f3f4f6]">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-[#0a0b0c]">신청 내역</CardTitle>
                  <div className="flex gap-1">
                    {["all", "대기중", "승인됨", "반려됨"].map((filter) => (
                      <Button
                        key={filter}
                        size="sm"
                        variant={dashboardFilter === filter ? "default" : "ghost"}
                        onClick={() => setDashboardFilter(filter)}
                        className={cn(
                          "text-xs h-6 px-2",
                          dashboardFilter === filter
                            ? "bg-[#5e6ad2] text-white"
                            : "text-[#718096] hover:text-[#0a0b0c]"
                        )}
                      >
                        {filter === "all" ? "전체" : filter}
                      </Button>
                    ))}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {getFilteredRequests(dashboardFilter).map((request) => (
                    <div key={request.id} className="flex items-center gap-3 p-3 bg-[#fafbfb] rounded-lg">
                      <div className={cn(
                        "w-3 h-3 rounded-full",
                        request.status === "승인됨" ? "bg-[#16a34a]" :
                        request.status === "대기중" ? "bg-[#ea580c]" : "bg-[#dc2626]"
                      )}></div>
                      <div className="flex-1">
                        <div className="text-sm font-medium text-[#0a0b0c]">
                          {request.leave_type} • {formatDate(request.start_date)}
                        </div>
                        <div className="text-xs text-[#718096]">
                          {request.status} • {request.total_days}일
                        </div>
                      </div>
                      <Badge className={cn("text-xs", statusColors[request.status])}>
                        {request.status}
                      </Badge>
                    </div>
                  ))}
                  
                  {getFilteredRequests(dashboardFilter).length === 0 && (
                    <div className="text-center py-6 text-[#718096]">
                      {dashboardFilter === "all" ? "신청 내역이 없습니다." : `${dashboardFilter} 상태의 신청이 없습니다.`}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Option 4: 모바일 우선 + 데스크톱 확장 */}
        <section onClick={() => setSelectedDesign(4)} className="bg-white p-6 rounded-xl">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-[#0a0b0c]">Option 4: 반응형 모바일 우선</h2>
            <p className="text-sm text-[#718096]">모바일 최적화에서 데스크톱으로 확장되는 반응형 디자인</p>
          </div>
          
          <div className="max-w-6xl mx-auto">
            {/* Header */}
            <div className="mb-6 md:mb-8">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-semibold text-[#0a0b0c]">연차 신청</h1>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column: Balance & Actions */}
              <div className="lg:col-span-1 space-y-4">
                {/* Balance Card - Responsive */}
                <Card className="bg-gradient-to-br from-[#5e6ad2] to-[#8b7cf6] text-white border-0">
                  <CardContent className="p-4 md:p-6 text-center">
                    <div className="text-3xl md:text-4xl font-bold mb-2">{sampleBalance.current_balance}일</div>
                    <div className="text-sm md:text-base opacity-90 mb-4 md:mb-6">사용 가능한 연차</div>
                    
                    {/* Stats Grid */}
                    <div className="grid grid-cols-3 gap-3 md:gap-4 pt-3 md:pt-4 border-t border-white/20">
                      <div className="text-center">
                        <div className="text-lg md:text-xl font-semibold">{sampleBalance.total_granted}</div>
                        <div className="text-xs md:text-sm opacity-80">부여</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg md:text-xl font-semibold">{sampleBalance.total_used}</div>
                        <div className="text-xs md:text-sm opacity-80">사용</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg md:text-xl font-semibold">{sampleBalance.total_expired}</div>
                        <div className="text-xs md:text-sm opacity-80">소멸</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Action Buttons - Responsive */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-3">
                  <Button className="bg-[#5e6ad2] hover:bg-[#4e5ac2] text-white h-12 md:h-10 lg:h-12">
                    <Plus className="h-4 w-4 mr-2" />
                    연차 신청
                  </Button>
                  <Button variant="outline" className="border-[#f3f4f6] text-[#4a5568] hover:bg-[#fafbfb] h-12 md:h-10 lg:h-12">
                    <Eye className="h-4 w-4 mr-2" />
                    정책 보기
                  </Button>
                </div>

              </div>

              {/* Right Column: Request List */}
              <div className="lg:col-span-2 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <h3 className="text-base md:text-lg font-medium text-[#0a0b0c]">신청 내역</h3>
                  
                  {/* Filter Controls - Mobile: Dropdown, Desktop: Buttons */}
                  <div className="sm:hidden">
                    <select 
                      value={mobileFilter}
                      onChange={(e) => setMobileFilter(e.target.value)}
                      className="w-full text-sm bg-white border border-[#f3f4f6] rounded-lg px-3 py-2 text-[#718096]"
                    >
                      <option value="all">전체 보기</option>
                      <option value="대기중">대기중</option>
                      <option value="승인됨">승인됨</option>
                      <option value="반려됨">반려됨</option>
                      <option value="취소됨">취소됨</option>
                    </select>
                  </div>
                  
                  <div className="hidden sm:flex gap-2">
                    {["all", "대기중", "승인됨", "반려됨", "취소됨"].map((filter) => (
                      <Button
                        key={filter}
                        size="sm"
                        variant={mobileFilter === filter ? "default" : "outline"}
                        onClick={() => setMobileFilter(filter)}
                        className={cn(
                          "text-xs h-8",
                          mobileFilter === filter
                            ? "bg-[#5e6ad2] text-white hover:bg-[#4e5ac2]"
                            : "border-[#f3f4f6] text-[#718096] hover:bg-[#fafbfb]"
                        )}
                      >
                        {filter === "all" ? "전체" : filter}
                      </Button>
                    ))}
                  </div>
                </div>
                
                {/* Request Cards - Responsive Layout */}
                <div className="space-y-3">
                  {getFilteredRequests(mobileFilter).map((request) => (
                    <Card key={request.id} className="bg-[#fafbfb] border-[#f3f4f6] hover:shadow-sm transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          {/* Left: Main Info */}
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge className={cn("text-xs", leaveTypeColors[request.leave_type as keyof typeof leaveTypeColors])}>
                                {request.leave_type}
                              </Badge>
                              <span className="text-xs text-[#718096]">{request.total_days}일</span>
                            </div>
                            
                            <div>
                              <div className="text-sm md:text-base font-medium text-[#0a0b0c] mb-1">
                                {request.total_days > 1 
                                  ? `${formatDate(request.start_date)} ~ ${formatDate(request.end_date)}`
                                  : formatDate(request.start_date)
                                }
                              </div>
                              <div className="text-xs md:text-sm text-[#718096]">
                                {request.reason || '-'}
                              </div>
                            </div>
                          </div>

                          {/* Right: Status & Actions */}
                          <div className="flex items-center gap-2">
                            <span className={cn(
                              "text-xs font-medium",
                              request.status === "대기중" ? "text-[#ea580c]" :
                              request.status === "승인됨" ? "text-[#16a34a]" :
                              request.status === "반려됨" ? "text-[#dc2626]" :
                              "text-[#64748b]"
                            )}>
                              {request.status}
                            </span>
                            {request.status === "대기중" && (
                              <Button size="sm" variant="ghost" className="text-[#718096] hover:bg-[#f8fafc] hover:text-[#4a5568] h-5 w-5 p-0">
                                <X className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  
                  {getFilteredRequests(mobileFilter).length === 0 && (
                    <div className="text-center py-8 md:py-12">
                      <div className="text-4xl md:text-5xl mb-3">📋</div>
                      <div className="text-sm md:text-base text-[#718096]">
                        {mobileFilter === "all" ? "신청 내역이 없습니다." : `${mobileFilter} 상태의 신청이 없습니다.`}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Option 5: 미니멀 클린 */}
        <section onClick={() => setSelectedDesign(5)}>
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-[#0a0b0c]">Option 5: 미니멀 클린</h2>
            <p className="text-sm text-[#718096]">불필요한 요소를 제거한 깔끔한 디자인</p>
          </div>
          
          <div className="space-y-8 max-w-4xl mx-auto">
            <div className="text-center space-y-2">
              <h1 className="text-3xl font-light text-[#0a0b0c]">연차 신청</h1>
              <p className="text-[#718096]">간편하게 연차를 신청하고 관리하세요</p>
            </div>

            {/* Clean Balance Display */}
            <div className="bg-white rounded-2xl p-8 border border-[#f3f4f6] shadow-sm">
              <div className="text-center space-y-6">
                <div>
                  <div className="text-5xl font-extralight text-[#5e6ad2] mb-2">
                    {sampleBalance.current_balance}
                  </div>
                  <div className="text-[#718096]">남은 연차 일수</div>
                </div>
                
                <div className="flex justify-center gap-12">
                  <div className="text-center">
                    <div className="text-xl font-light text-[#0a0b0c]">{sampleBalance.total_granted}</div>
                    <div className="text-sm text-[#718096]">총 부여</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-light text-[#0a0b0c]">{sampleBalance.total_used}</div>
                    <div className="text-sm text-[#718096]">사용</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-light text-[#0a0b0c]">{sampleBalance.total_expired}</div>
                    <div className="text-sm text-[#718096]">소멸</div>
                  </div>
                </div>

                <Button className="bg-[#5e6ad2] hover:bg-[#4e5ac2] text-white rounded-full px-8">
                  새 연차 신청하기
                </Button>
              </div>
            </div>

            {/* Clean Request List */}
            <div className="space-y-4">
              <div className="text-center space-y-4">
                <h3 className="text-xl font-light text-[#0a0b0c]">신청 내역</h3>
                <div className="flex justify-center gap-2">
                  {["all", "대기중", "승인됨", "반려됨", "취소됨"].map((filter) => (
                    <Button
                      key={filter}
                      variant={minimalFilter === filter ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setMinimalFilter(filter)}
                      className={cn(
                        "rounded-full px-4 text-xs",
                        minimalFilter === filter
                          ? "bg-[#5e6ad2] text-white hover:bg-[#4e5ac2]"
                          : "text-[#718096] hover:text-[#0a0b0c] hover:bg-[#fafbfb]"
                      )}
                    >
                      {filter === "all" ? "전체" : filter}
                    </Button>
                  ))}
                </div>
              </div>
              
              <div className="space-y-1">
                {getFilteredRequests(minimalFilter).map((request) => (
                  <div key={request.id} className="bg-white rounded-xl p-6 border border-[#f3f4f6] hover:shadow-sm transition-shadow">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-3">
                          <span className="text-lg font-light text-[#0a0b0c]">
                            {request.leave_type}
                          </span>
                          <span className="text-sm text-[#718096]">
                            {formatDate(request.start_date)}
                          </span>
                          <span className="text-sm text-[#718096]">
                            {request.total_days}일
                          </span>
                        </div>
                        <div className="text-sm text-[#718096]">
                          {request.reason}
                        </div>
                      </div>
                      <Badge className={cn(
                        "rounded-full px-3 py-1",
                        statusColors[request.status]
                      )}>
                        {request.status}
                      </Badge>
                    </div>
                  </div>
                ))}
                
                {getFilteredRequests(minimalFilter).length === 0 && (
                  <div className="text-center py-12 text-[#718096]">
                    <div className="text-lg font-light">
                      {minimalFilter === "all" ? "신청 내역이 없습니다." : `${minimalFilter} 상태의 신청이 없습니다.`}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Selection Feedback */}
      {selectedDesign && (
        <div className="fixed bottom-4 left-4 right-4 bg-[#0a0b0c] text-white rounded-lg px-4 py-3 shadow-lg z-50">
          <p className="text-sm text-center">Option {selectedDesign}를 선택하셨습니다</p>
        </div>
      )}
    </div>
  )
}