"use client"

import React, { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CalendarDays, Clock, Users, CheckCircle, XCircle, Calendar, AlertCircle, ChevronDown, MoreHorizontal, X } from "lucide-react"
import { format } from "date-fns"
import { ko } from "date-fns/locale"

// 샘플 데이터
const sampleRequest = {
  id: "1",
  member_name: "김민수",
  team_name: "개발팀",
  leave_type: "연차",
  start_date: "2024-02-15",
  end_date: "2024-02-16",
  total_days: 2,
  reason: "개인 사유로 인한 연차 신청입니다.",
  status: "대기중",
  requested_at: "2024-02-10T09:30:00"
}

// Linear Light 테마 색상
const getLeaveTypeColor = (leaveType: string) => {
  const colors = {
    "연차": "bg-[#eff6ff] text-[#2563eb] border-[#dbeafe]",
    "오전반차": "bg-[#f5f3ff] text-[#7c3aed] border-[#e9d5ff]",
    "오후반차": "bg-[#fdf4ff] text-[#a855f7] border-[#f3e8ff]",
  }
  return colors[leaveType as keyof typeof colors] || "bg-[#fef3c7] text-[#d97706] border-[#fde68a]"
}

const formatDate = (dateString: string) => {
  return format(new Date(dateString), "M월 d일", { locale: ko })
}

const formatDateTime = (dateString: string) => {
  return format(new Date(dateString), "M/d HH:mm", { locale: ko })
}

export default function LeaveApprovalCardsDemo() {
  const [expandedCard, setExpandedCard] = useState<number | null>(null)
  
  return (
    <div className="max-w-md mx-auto p-4 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-[#0a0b0c] mb-2">연차 승인 카드 레이아웃 데모</h1>
        <p className="text-[#718096]">10가지 카드 레이아웃 중 선택해주세요</p>
      </div>

      {/* Version 1: Timeline Focus */}
      <div>
        <h3 className="text-sm font-semibold text-[#4a5568] mb-3">Version 1: Timeline Focus</h3>
        <Card className="bg-white border-[#f3f4f6]">
          <CardContent className="p-4">
            <div className="flex gap-3">
              {/* Timeline indicator */}
              <div className="flex flex-col items-center">
                <div className="w-10 h-10 bg-[#eff6ff] rounded-full flex items-center justify-center">
                  <CalendarDays className="h-5 w-5 text-[#2563eb]" />
                </div>
                <div className="w-0.5 h-full bg-[#f3f4f6] mt-2" />
              </div>
              
              {/* Content */}
              <div className="flex-1">
                <div className="text-lg font-semibold text-[#0a0b0c] mb-1">
                  2월 15일 ~ 2월 16일
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm text-[#4a5568]">{sampleRequest.member_name}</span>
                  <span className="text-sm text-[#718096]">•</span>
                  <span className="text-sm text-[#718096]">{sampleRequest.team_name}</span>
                </div>
                <div className="flex items-center gap-2 mb-3">
                  <Badge className={`text-xs ${getLeaveTypeColor(sampleRequest.leave_type)}`}>
                    {sampleRequest.leave_type}
                  </Badge>
                  <span className="text-xs text-[#718096]">{sampleRequest.total_days}일</span>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" className="bg-[#16a34a] hover:bg-[#15803d] text-white h-8">
                    승인
                  </Button>
                  <Button size="sm" variant="outline" className="text-[#dc2626] border-[#fecaca] hover:bg-[#fef2f2] h-8">
                    반려
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Version 2: Compact Minimal */}
      <div>
        <h3 className="text-sm font-semibold text-[#4a5568] mb-3">Version 2: Compact Minimal</h3>
        <Card className="bg-[#fafbfb] border-[#f3f4f6]">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Badge className={`text-xs ${getLeaveTypeColor(sampleRequest.leave_type)}`}>
                  {sampleRequest.leave_type}
                </Badge>
                <span className="text-sm font-medium text-[#0a0b0c]">
                  {sampleRequest.member_name}
                </span>
                <span className="text-sm text-[#718096]">
                  2/15~2/16 (2일)
                </span>
              </div>
              <div className="flex gap-1">
                <Button size="sm" className="bg-[#16a34a] hover:bg-[#15803d] text-white h-7 px-2 text-xs">
                  승인
                </Button>
                <Button size="sm" variant="ghost" className="text-[#dc2626] hover:bg-[#fef2f2] h-7 px-2 text-xs">
                  반려
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Version 3: Card with Avatar */}
      <div>
        <h3 className="text-sm font-semibold text-[#4a5568] mb-3">Version 3: Card with Avatar</h3>
        <Card className="bg-white border-[#f3f4f6] shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-[#5e6ad2] to-[#8b7cf6] rounded-full flex items-center justify-center text-white font-bold">
                김
              </div>
              <div className="flex-1">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="font-semibold text-[#0a0b0c]">{sampleRequest.member_name}</div>
                    <div className="text-xs text-[#718096]">{sampleRequest.team_name}</div>
                  </div>
                  <span className="text-xs text-[#ea580c] font-medium">대기중</span>
                </div>
                <div className="bg-[#fafbfb] rounded-lg p-2 mb-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Badge className={`text-xs ${getLeaveTypeColor(sampleRequest.leave_type)}`}>
                      {sampleRequest.leave_type}
                    </Badge>
                    <span className="text-[#4a5568]">
                      {formatDate(sampleRequest.start_date)} ~ {formatDate(sampleRequest.end_date)}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" className="flex-1 bg-[#16a34a] hover:bg-[#15803d] text-white h-8">
                    승인
                  </Button>
                  <Button size="sm" variant="outline" className="flex-1 text-[#dc2626] border-[#fecaca] hover:bg-[#fef2f2] h-8">
                    반려
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Version 4: Status Prominent */}
      <div>
        <h3 className="text-sm font-semibold text-[#4a5568] mb-3">Version 4: Status Prominent</h3>
        <Card className="bg-white border-l-4 border-l-[#ea580c] border-[#f3f4f6]">
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="bg-[#fff7ed] text-[#ea580c] px-3 py-1 rounded-full text-sm font-semibold">
                ⏳ 승인 대기중
              </div>
              <div className="text-xs text-[#718096]">
                {formatDateTime(sampleRequest.requested_at)}
              </div>
            </div>
            <div className="space-y-2 mb-3">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-[#718096]" />
                <span className="text-sm font-medium text-[#0a0b0c]">{sampleRequest.member_name}</span>
                <span className="text-sm text-[#718096]">({sampleRequest.team_name})</span>
              </div>
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-[#718096]" />
                <Badge className={`text-xs ${getLeaveTypeColor(sampleRequest.leave_type)}`}>
                  {sampleRequest.leave_type}
                </Badge>
                <span className="text-sm text-[#4a5568]">
                  {formatDate(sampleRequest.start_date)} ~ {formatDate(sampleRequest.end_date)}
                </span>
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" className="flex-1 bg-[#16a34a] hover:bg-[#15803d] text-white">
                <CheckCircle className="h-4 w-4 mr-1" />
                승인
              </Button>
              <Button size="sm" variant="outline" className="flex-1 text-[#dc2626] border-[#fecaca] hover:bg-[#fef2f2]">
                <XCircle className="h-4 w-4 mr-1" />
                반려
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Version 5: Two-Column Grid */}
      <div>
        <h3 className="text-sm font-semibold text-[#4a5568] mb-3">Version 5: Two-Column Grid</h3>
        <Card className="bg-white border-[#f3f4f6]">
          <CardContent className="p-4">
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <div className="text-xs text-[#718096] mb-1">신청자</div>
                <div className="text-sm font-medium text-[#0a0b0c]">{sampleRequest.member_name}</div>
              </div>
              <div>
                <div className="text-xs text-[#718096] mb-1">소속</div>
                <div className="text-sm font-medium text-[#0a0b0c]">{sampleRequest.team_name}</div>
              </div>
              <div>
                <div className="text-xs text-[#718096] mb-1">유형</div>
                <Badge className={`text-xs ${getLeaveTypeColor(sampleRequest.leave_type)}`}>
                  {sampleRequest.leave_type}
                </Badge>
              </div>
              <div>
                <div className="text-xs text-[#718096] mb-1">기간</div>
                <div className="text-sm font-medium text-[#0a0b0c]">{sampleRequest.total_days}일</div>
              </div>
            </div>
            <div className="bg-[#fafbfb] rounded p-2 mb-3">
              <div className="text-xs text-[#4a5568]">
                {formatDate(sampleRequest.start_date)} ~ {formatDate(sampleRequest.end_date)}
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" className="flex-1 bg-[#16a34a] hover:bg-[#15803d] text-white h-8">
                승인
              </Button>
              <Button size="sm" variant="outline" className="flex-1 text-[#dc2626] border-[#fecaca] hover:bg-[#fef2f2] h-8">
                반려
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Version 6: Actions at Bottom */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-[#4a5568] mb-3">Version 6: Actions at Bottom</h3>
        
        {/* 대기중 상태 */}
        <div>
          <p className="text-xs text-[#718096] mb-2">대기중 상태:</p>
          <Card className="bg-[#fafbfb] border-[#f3f4f6]">
            <CardContent className="p-4">
              <div className="space-y-2 mb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-[#0a0b0c]">{sampleRequest.member_name}</span>
                    <span className="text-sm text-[#718096]">• {sampleRequest.team_name}</span>
                  </div>
                  <Badge className={`text-xs ${getLeaveTypeColor(sampleRequest.leave_type)}`}>
                    {sampleRequest.leave_type}
                  </Badge>
                </div>
                <div className="text-sm text-[#4a5568]">
                  {formatDate(sampleRequest.start_date)} ~ {formatDate(sampleRequest.end_date)} ({sampleRequest.total_days}일)
                </div>
                <div className="text-xs text-[#718096]">
                  {sampleRequest.reason}
                </div>
              </div>
              {/* Action buttons inside card */}
              <div className="flex gap-2 pt-3 border-t border-[#f3f4f6]">
                <Button size="sm" className="flex-1 bg-[#16a34a] hover:bg-[#15803d] text-white">
                  승인
                </Button>
                <Button size="sm" className="flex-1 bg-white hover:bg-[#fef2f2] text-[#dc2626] border-[#fecaca]">
                  반려
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 승인됨 상태 */}
        <div>
          <p className="text-xs text-[#718096] mb-2">승인됨 상태:</p>
          <Card className="bg-[#f0fdf4] border-[#bbf7d0]">
            <CardContent className="p-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-[#0a0b0c]">{sampleRequest.member_name}</span>
                    <span className="text-sm text-[#718096]">• {sampleRequest.team_name}</span>
                  </div>
                  <Badge className={`text-xs ${getLeaveTypeColor(sampleRequest.leave_type)}`}>
                    {sampleRequest.leave_type}
                  </Badge>
                </div>
                <div className="text-sm text-[#4a5568]">
                  {formatDate(sampleRequest.start_date)} ~ {formatDate(sampleRequest.end_date)} ({sampleRequest.total_days}일)
                </div>
                <div className="text-xs text-[#718096]">
                  {sampleRequest.reason}
                </div>
                <div className="flex items-center justify-between pt-3 border-t border-[#bbf7d0]">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-[#16a34a]" />
                    <span className="text-sm font-medium text-[#16a34a]">승인됨</span>
                  </div>
                  <Button size="sm" variant="ghost" className="text-[#dc2626] hover:bg-[#fef2f2] h-7 px-2 text-xs">
                    취소
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 반려됨 상태 */}
        <div>
          <p className="text-xs text-[#718096] mb-2">반려됨 상태:</p>
          <Card className="bg-[#fef2f2] border-[#fecaca]">
            <CardContent className="p-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-[#0a0b0c]">{sampleRequest.member_name}</span>
                    <span className="text-sm text-[#718096]">• {sampleRequest.team_name}</span>
                  </div>
                  <Badge className={`text-xs ${getLeaveTypeColor(sampleRequest.leave_type)}`}>
                    {sampleRequest.leave_type}
                  </Badge>
                </div>
                <div className="text-sm text-[#4a5568]">
                  {formatDate(sampleRequest.start_date)} ~ {formatDate(sampleRequest.end_date)} ({sampleRequest.total_days}일)
                </div>
                <div className="text-xs text-[#718096]">
                  {sampleRequest.reason}
                </div>
                <div className="pt-3 border-t border-[#fecaca]">
                  <div className="flex items-center gap-2">
                    <XCircle className="h-4 w-4 text-[#dc2626]" />
                    <span className="text-sm font-medium text-[#dc2626]">반려됨</span>
                  </div>
                  <div className="text-xs text-[#dc2626] mt-1">
                    반려 사유: 해당 기간에 중요 프로젝트 일정이 있습니다.
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 취소됨 상태 */}
        <div>
          <p className="text-xs text-[#718096] mb-2">취소됨 상태:</p>
          <Card className="bg-[#f8fafc] border-[#e2e8f0] opacity-75">
            <CardContent className="p-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-[#64748b]">{sampleRequest.member_name}</span>
                    <span className="text-sm text-[#94a3b8]">• {sampleRequest.team_name}</span>
                  </div>
                  <Badge className="text-xs bg-[#f8fafc] text-[#64748b] border-[#e2e8f0]">
                    {sampleRequest.leave_type}
                  </Badge>
                </div>
                <div className="text-sm text-[#94a3b8] line-through">
                  {formatDate(sampleRequest.start_date)} ~ {formatDate(sampleRequest.end_date)} ({sampleRequest.total_days}일)
                </div>
                <div className="text-xs text-[#94a3b8]">
                  {sampleRequest.reason}
                </div>
                <div className="pt-3 border-t border-[#e2e8f0]">
                  <div className="flex items-center gap-2">
                    <X className="h-4 w-4 text-[#64748b]" />
                    <span className="text-sm font-medium text-[#64748b]">취소됨</span>
                    <span className="text-xs text-[#94a3b8]">• 2024년 2월 12일 10:30</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Version 7: Expandable Details */}
      <div>
        <h3 className="text-sm font-semibold text-[#4a5568] mb-3">Version 7: Expandable Details</h3>
        <Card className="bg-white border-[#f3f4f6]">
          <CardContent className="p-4">
            <div 
              className="cursor-pointer"
              onClick={() => setExpandedCard(expandedCard === 7 ? null : 7)}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-[#0a0b0c]">{sampleRequest.member_name}</span>
                  <Badge className={`text-xs ${getLeaveTypeColor(sampleRequest.leave_type)}`}>
                    {sampleRequest.leave_type}
                  </Badge>
                  <span className="text-xs text-[#718096]">{sampleRequest.total_days}일</span>
                </div>
                <ChevronDown className={`h-4 w-4 text-[#718096] transition-transform ${expandedCard === 7 ? 'rotate-180' : ''}`} />
              </div>
              
              {expandedCard === 7 && (
                <div className="space-y-2 pt-2 border-t border-[#f3f4f6] mb-3">
                  <div className="text-sm text-[#4a5568]">
                    <span className="text-[#718096]">팀:</span> {sampleRequest.team_name}
                  </div>
                  <div className="text-sm text-[#4a5568]">
                    <span className="text-[#718096]">기간:</span> {formatDate(sampleRequest.start_date)} ~ {formatDate(sampleRequest.end_date)}
                  </div>
                  <div className="text-sm text-[#4a5568]">
                    <span className="text-[#718096]">사유:</span> {sampleRequest.reason}
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex gap-2">
              <Button size="sm" className="flex-1 bg-[#16a34a] hover:bg-[#15803d] text-white h-8">
                승인
              </Button>
              <Button size="sm" variant="outline" className="flex-1 text-[#dc2626] border-[#fecaca] hover:bg-[#fef2f2] h-8">
                반려
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Version 8: Visual Calendar */}
      <div>
        <h3 className="text-sm font-semibold text-[#4a5568] mb-3">Version 8: Visual Calendar</h3>
        <Card className="bg-white border-[#f3f4f6]">
          <CardContent className="p-4">
            <div className="flex gap-4">
              {/* Calendar visual */}
              <div className="bg-[#eff6ff] rounded-lg p-3 text-center">
                <div className="text-xs text-[#2563eb] font-medium">FEB</div>
                <div className="text-2xl font-bold text-[#2563eb]">15</div>
                <div className="text-xs text-[#2563eb]">~16</div>
              </div>
              
              {/* Content */}
              <div className="flex-1">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="font-medium text-[#0a0b0c]">{sampleRequest.member_name}</div>
                    <div className="text-xs text-[#718096]">{sampleRequest.team_name}</div>
                  </div>
                  <Badge className={`text-xs ${getLeaveTypeColor(sampleRequest.leave_type)}`}>
                    {sampleRequest.leave_type} {sampleRequest.total_days}일
                  </Badge>
                </div>
                <div className="text-xs text-[#718096] mb-3">{sampleRequest.reason}</div>
                <div className="flex gap-2">
                  <Button size="sm" className="bg-[#16a34a] hover:bg-[#15803d] text-white h-7 px-3 text-xs">
                    승인
                  </Button>
                  <Button size="sm" variant="outline" className="text-[#dc2626] border-[#fecaca] hover:bg-[#fef2f2] h-7 px-3 text-xs">
                    반려
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Version 9: Notification Style */}
      <div>
        <h3 className="text-sm font-semibold text-[#4a5568] mb-3">Version 9: Notification Style</h3>
        <Card className="bg-gradient-to-r from-[#fff7ed] to-white border-[#fed7aa]">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="mt-0.5">
                <AlertCircle className="h-5 w-5 text-[#ea580c]" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium text-[#0a0b0c] mb-1">
                  새로운 연차 신청
                </div>
                <div className="text-xs text-[#718096] mb-2">
                  {sampleRequest.member_name} ({sampleRequest.team_name})님이 {sampleRequest.total_days}일간 연차를 신청했습니다.
                </div>
                <div className="flex items-center gap-2 mb-3">
                  <Badge className={`text-xs ${getLeaveTypeColor(sampleRequest.leave_type)}`}>
                    {sampleRequest.leave_type}
                  </Badge>
                  <span className="text-xs text-[#4a5568]">
                    {formatDate(sampleRequest.start_date)} ~ {formatDate(sampleRequest.end_date)}
                  </span>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" className="bg-[#16a34a] hover:bg-[#15803d] text-white h-8 text-xs">
                    승인하기
                  </Button>
                  <Button size="sm" variant="ghost" className="text-[#dc2626] hover:bg-[#fef2f2] h-8 text-xs">
                    반려하기
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Version 10: Split Layout */}
      <div>
        <h3 className="text-sm font-semibold text-[#4a5568] mb-3">Version 10: Split Layout</h3>
        <Card className="bg-white border-[#f3f4f6] overflow-hidden">
          <div className="flex">
            {/* Left side - Info */}
            <CardContent className="flex-1 p-4 border-r border-[#f3f4f6]">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-[#0a0b0c]">{sampleRequest.member_name}</span>
                  <span className="text-xs text-[#718096]">{sampleRequest.team_name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={`text-xs ${getLeaveTypeColor(sampleRequest.leave_type)}`}>
                    {sampleRequest.leave_type}
                  </Badge>
                  <span className="text-xs text-[#4a5568]">
                    {formatDate(sampleRequest.start_date)} ~ {formatDate(sampleRequest.end_date)}
                  </span>
                </div>
                <div className="text-xs text-[#718096]">
                  {sampleRequest.reason}
                </div>
              </div>
            </CardContent>
            
            {/* Right side - Actions */}
            <div className="bg-[#fafbfb] p-4 flex flex-col justify-center gap-2">
              <Button size="sm" className="bg-[#16a34a] hover:bg-[#15803d] text-white h-8 text-xs">
                승인
              </Button>
              <Button size="sm" variant="outline" className="bg-white text-[#dc2626] border-[#fecaca] hover:bg-[#fef2f2] h-8 text-xs">
                반려
              </Button>
            </div>
          </div>
        </Card>
      </div>

    </div>
  )
}