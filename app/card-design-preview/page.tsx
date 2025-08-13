"use client"

import { useState } from "react"
import { Phone, Mail, Building2, ChevronRight, MoreVertical, Users, Calendar, Shield, Edit, Eye, Trash2, Star, Clock, Hash } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"

// 더미 데이터
const sampleMembers = [
  { id: "1", name: "김민지", employee_number: "E001", team_name: "개발팀", role: "관리자", phone: "010-1234-5678", join_date: "2022-03-15", email: "minji.kim@company.com" },
  { id: "2", name: "이준호", employee_number: "E002", team_name: "디자인팀", role: "일반직원", phone: "010-2345-6789", join_date: "2023-01-10", email: "junho.lee@company.com" },
  { id: "3", name: "박서연", employee_number: "E003", team_name: "마케팅팀", role: "일반직원", phone: "010-3456-7890", join_date: "2023-06-20", email: "seoyeon.park@company.com" },
  { id: "4", name: "최동욱", employee_number: "E004", team_name: "영업팀", role: "관리자", phone: "010-4567-8901", join_date: "2021-11-05", email: "dongwook.choi@company.com" },
  { id: "5", name: "정하나", employee_number: "E005", team_name: "인사팀", role: "일반직원", phone: "010-5678-9012", join_date: "2024-02-15", email: "hana.jung@company.com" },
]

export default function CardDesignPreview() {
  const [selectedDesign, setSelectedDesign] = useState<number | null>(null)
  const [swipedCard, setSwipedCard] = useState<string | null>(null)

  // 근속연수 계산
  const getYearsOfService = (joinDate: string) => {
    const join = new Date(joinDate)
    const now = new Date()
    const years = now.getFullYear() - join.getFullYear()
    const months = now.getMonth() - join.getMonth()
    
    if (months < 0) return years - 1
    return years
  }

  // 이니셜 생성
  const getInitials = (name: string) => {
    return name.substring(0, 2)
  }

  return (
    <div className="min-h-screen bg-[#fafbfb] pb-20">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white border-b border-[#f3f4f6]">
        <div className="px-4 py-4">
          <h1 className="text-xl font-semibold text-[#0a0b0c]">모바일 카드 디자인 프리뷰</h1>
          <p className="text-sm text-[#718096] mt-1">스크롤하여 5가지 디자인을 확인하세요</p>
        </div>
      </div>

      {/* Design Option 1: 컴팩트 미니멀 카드 */}
      <section className="px-4 py-6">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-[#0a0b0c]">Option 1: 컴팩트 미니멀</h2>
          <p className="text-sm text-[#718096]">필수 정보만 간결하게 표시 • 공간 효율적</p>
        </div>
        <div className="space-y-3">
          {sampleMembers.slice(0, 2).map((member) => (
            <div
              key={member.id}
              className="bg-white rounded-lg border border-[#f3f4f6] p-4 active:scale-[0.98] transition-transform"
              onClick={() => setSelectedDesign(1)}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-base font-semibold text-[#0a0b0c]">{member.name}</h3>
                    {member.role === "관리자" && (
                      <Badge className="bg-[#5e6ad2] text-white text-[10px] px-1.5 py-0 h-4">관리자</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-sm text-[#718096]">
                    <span>{member.employee_number}</span>
                    <span>•</span>
                    <span>{member.team_name}</span>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-[#9ca3af]" />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Design Option 2: 아바타 강조 카드 */}
      <section className="px-4 py-6 bg-white">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-[#0a0b0c]">Option 2: 아바타 강조</h2>
          <p className="text-sm text-[#718096]">시각적 식별 용이 • 친근한 느낌</p>
        </div>
        <div className="space-y-3">
          {sampleMembers.slice(0, 2).map((member) => (
            <div
              key={member.id}
              className="bg-[#fafbfb] rounded-xl p-4 active:bg-[#f7f8f9] transition-colors"
              onClick={() => setSelectedDesign(2)}
            >
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12 bg-gradient-to-br from-[#5e6ad2] to-[#8b7cf6]">
                  <AvatarFallback className="bg-transparent text-white text-sm font-medium">
                    {getInitials(member.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-semibold text-[#0a0b0c]">{member.name}</h3>
                    {member.role === "관리자" && (
                      <Shield className="h-4 w-4 text-[#5e6ad2]" />
                    )}
                  </div>
                  <div className="text-sm text-[#718096] mt-0.5">{member.team_name}</div>
                  <div className="flex items-center gap-3 text-xs text-[#9ca3af] mt-1">
                    <span className="flex items-center gap-1">
                      <Hash className="h-3 w-3" />
                      {member.employee_number}
                    </span>
                    <span className="flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      {member.phone}
                    </span>
                  </div>
                </div>
                <Button variant="ghost" size="sm" className="h-9 w-9 p-0">
                  <MoreVertical className="h-4 w-4 text-[#718096]" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Design Option 3: 액션 버튼 통합 카드 */}
      <section className="px-4 py-6">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-[#0a0b0c]">Option 3: 액션 버튼 통합</h2>
          <p className="text-sm text-[#718096]">빠른 액션 실행 • 효율적 워크플로우</p>
        </div>
        <div className="space-y-3">
          {sampleMembers.slice(0, 2).map((member) => (
            <div
              key={member.id}
              className="bg-white rounded-xl border border-[#f3f4f6] overflow-hidden"
              onClick={() => setSelectedDesign(3)}
            >
              <div className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-semibold text-[#0a0b0c]">{member.name}</h3>
                      {member.role === "관리자" && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 bg-[#f1f3f4] text-[#5e6ad2] font-medium">
                          ADMIN
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-[#718096] mt-1">{member.team_name} • {member.employee_number}</p>
                  </div>
                  <Star className="h-4 w-4 text-[#d1d5db]" />
                </div>
                
                <div className="space-y-1.5 text-sm">
                  <div className="flex items-center gap-2 text-[#4a5568]">
                    <Phone className="h-3.5 w-3.5 text-[#9ca3af]" />
                    <span>{member.phone}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[#4a5568]">
                    <Mail className="h-3.5 w-3.5 text-[#9ca3af]" />
                    <span className="truncate">{member.email}</span>
                  </div>
                </div>
              </div>
              
              <div className="flex border-t border-[#f3f4f6]">
                <button className="flex-1 py-2.5 text-sm font-medium text-[#5e6ad2] hover:bg-[#fafbfb] transition-colors flex items-center justify-center gap-1.5">
                  <Eye className="h-3.5 w-3.5" />
                  상세
                </button>
                <div className="w-px bg-[#f3f4f6]" />
                <button className="flex-1 py-2.5 text-sm font-medium text-[#5e6ad2] hover:bg-[#fafbfb] transition-colors flex items-center justify-center gap-1.5">
                  <Edit className="h-3.5 w-3.5" />
                  수정
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Design Option 4: 정보 계층 구조 카드 */}
      <section className="px-4 py-6 bg-white">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-[#0a0b0c]">Option 4: 정보 계층 구조</h2>
          <p className="text-sm text-[#718096]">명확한 정보 위계 • 스캔 가능성 높음</p>
        </div>
        <div className="space-y-3">
          {sampleMembers.slice(0, 2).map((member) => (
            <div
              key={member.id}
              className="bg-white rounded-xl border border-[#f3f4f6] shadow-sm hover:shadow-md transition-shadow"
              onClick={() => setSelectedDesign(4)}
            >
              {/* Header */}
              <div className="px-4 py-3 bg-gradient-to-r from-[#fafbfb] to-white border-b border-[#f3f4f6]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-[#5e6ad2]" />
                    <span className="text-xs font-medium text-[#718096] uppercase tracking-wider">
                      {member.employee_number}
                    </span>
                  </div>
                  {member.role === "관리자" && (
                    <Badge className="bg-[#5e6ad2]/10 text-[#5e6ad2] border-0 text-[10px] px-2 py-0.5">
                      관리자
                    </Badge>
                  )}
                </div>
              </div>
              
              {/* Body */}
              <div className="p-4">
                <h3 className="text-lg font-semibold text-[#0a0b0c] mb-2">{member.name}</h3>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-[#9ca3af] mb-0.5">소속</p>
                    <p className="text-sm text-[#4a5568] font-medium">{member.team_name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[#9ca3af] mb-0.5">근속</p>
                    <p className="text-sm text-[#4a5568] font-medium">{getYearsOfService(member.join_date)}년차</p>
                  </div>
                  <div>
                    <p className="text-xs text-[#9ca3af] mb-0.5">연락처</p>
                    <p className="text-sm text-[#4a5568] font-medium">{member.phone}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[#9ca3af] mb-0.5">입사일</p>
                    <p className="text-sm text-[#4a5568] font-medium">{member.join_date}</p>
                  </div>
                </div>
              </div>
              
              {/* Actions */}
              <div className="px-4 pb-3 flex justify-end">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 px-3 text-xs">
                      액션 <ChevronRight className="h-3 w-3 ml-1" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>
                      <Eye className="h-3.5 w-3.5 mr-2" />
                      상세보기
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Edit className="h-3.5 w-3.5 mr-2" />
                      수정
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Design Option 5: 스와이프 액션 카드 */}
      <section className="px-4 py-6">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-[#0a0b0c]">Option 5: 스와이프 액션</h2>
          <p className="text-sm text-[#718096]">제스처 기반 인터랙션 • 모던한 UX</p>
        </div>
        <div className="space-y-3">
          {sampleMembers.slice(0, 2).map((member) => (
            <div
              key={member.id}
              className="relative overflow-hidden rounded-xl"
              onClick={() => setSelectedDesign(5)}
            >
              {/* Swipe Actions Background */}
              <div className={cn(
                "absolute inset-0 bg-gradient-to-r from-[#5e6ad2] to-[#8b7cf6] flex items-center justify-end px-4 transition-opacity",
                swipedCard === member.id ? "opacity-100" : "opacity-0"
              )}>
                <div className="flex gap-3">
                  <button className="bg-white/20 backdrop-blur-sm rounded-lg p-2">
                    <Eye className="h-4 w-4 text-white" />
                  </button>
                  <button className="bg-white/20 backdrop-blur-sm rounded-lg p-2">
                    <Edit className="h-4 w-4 text-white" />
                  </button>
                </div>
              </div>
              
              {/* Main Card */}
              <div 
                className={cn(
                  "relative bg-white border border-[#f3f4f6] rounded-xl p-4 transition-transform",
                  swipedCard === member.id ? "-translate-x-32" : "translate-x-0"
                )}
                onTouchStart={() => setSwipedCard(swipedCard === member.id ? null : member.id)}
              >
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-[#f1f3f4] to-[#e5e7eb] flex items-center justify-center">
                      <Users className="h-5 w-5 text-[#718096]" />
                    </div>
                    {member.role === "관리자" && (
                      <div className="absolute -top-1 -right-1 h-3 w-3 bg-[#5e6ad2] rounded-full border-2 border-white" />
                    )}
                  </div>
                  
                  <div className="flex-1">
                    <h3 className="text-base font-semibold text-[#0a0b0c]">{member.name}</h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-[#9ca3af]">{member.employee_number}</span>
                      <span className="text-xs text-[#d1d5db]">•</span>
                      <span className="text-xs text-[#718096] font-medium">{member.team_name}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-2">
                      <button className="text-xs text-[#5e6ad2] font-medium hover:underline">
                        전화
                      </button>
                      <span className="text-xs text-[#d1d5db]">|</span>
                      <button className="text-xs text-[#5e6ad2] font-medium hover:underline">
                        이메일
                      </button>
                      <span className="text-xs text-[#d1d5db]">|</span>
                      <button className="text-xs text-[#5e6ad2] font-medium hover:underline">
                        상세
                      </button>
                    </div>
                  </div>
                  
                  <div className="flex flex-col items-end gap-1">
                    <Clock className="h-3.5 w-3.5 text-[#9ca3af]" />
                    <span className="text-[10px] text-[#9ca3af]">{getYearsOfService(member.join_date)}년</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Selection Feedback */}
      {selectedDesign && (
        <div className="fixed bottom-4 left-4 right-4 bg-[#0a0b0c] text-white rounded-lg px-4 py-3 shadow-lg z-50">
          <p className="text-sm">Option {selectedDesign}를 선택하셨습니다</p>
        </div>
      )}
      
      {/* Design Option 6: 카드 플립 애니메이션 */}
      <section className="px-4 py-6 bg-white">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-[#0a0b0c]">Option 6: 카드 플립</h2>
          <p className="text-sm text-[#718096]">탭하여 뒤집기 • 앞면 기본정보 / 뒷면 상세정보</p>
        </div>
        <div className="space-y-3">
          {sampleMembers.slice(0, 2).map((member) => (
            <div
              key={member.id}
              className="relative h-32"
              onClick={() => setSelectedDesign(6)}
            >
              <div className="absolute inset-0 bg-white rounded-xl border border-[#f3f4f6] shadow-sm p-4">
                <div className="h-full flex flex-col justify-between">
                  {/* Front side */}
                  <div>
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="text-lg font-semibold text-[#0a0b0c]">{member.name}</h3>
                        <p className="text-sm text-[#718096]">{member.team_name}</p>
                      </div>
                      <div className="flex flex-col items-end">
                        {member.role === "관리자" && (
                          <Badge className="bg-gradient-to-r from-[#5e6ad2] to-[#8b7cf6] text-white text-[10px] px-2 py-0.5">
                            ADMIN
                          </Badge>
                        )}
                        <span className="text-xs text-[#9ca3af] mt-1">{member.employee_number}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1.5">
                        <Phone className="h-3.5 w-3.5 text-[#9ca3af]" />
                        <span className="text-sm text-[#4a5568]">{member.phone}</span>
                      </div>
                    </div>
                    <div className="text-xs text-[#9ca3af]">탭하여 뒤집기 →</div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Design Option 7: 태그 기반 카드 */}
      <section className="px-4 py-6">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-[#0a0b0c]">Option 7: 태그 기반</h2>
          <p className="text-sm text-[#718096]">컬러 태그로 정보 구분 • 빠른 시각적 인지</p>
        </div>
        <div className="space-y-3">
          {sampleMembers.slice(0, 2).map((member) => (
            <div
              key={member.id}
              className="bg-white rounded-xl border border-[#f3f4f6] p-4"
              onClick={() => setSelectedDesign(7)}
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-semibold text-[#0a0b0c]">{member.name}</h3>
                <MoreVertical className="h-4 w-4 text-[#9ca3af]" />
              </div>
              
              <div className="flex flex-wrap gap-1.5">
                <span className="inline-flex items-center px-2 py-1 rounded-full bg-[#5e6ad2]/10 text-[#5e6ad2] text-xs font-medium">
                  {member.employee_number}
                </span>
                <span className="inline-flex items-center px-2 py-1 rounded-full bg-[#00b8cc]/10 text-[#00b8cc] text-xs font-medium">
                  {member.team_name}
                </span>
                {member.role === "관리자" && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full bg-[#8b7cf6]/10 text-[#8b7cf6] text-xs font-medium">
                    관리자
                  </span>
                )}
                <span className="inline-flex items-center px-2 py-1 rounded-full bg-[#059669]/10 text-[#059669] text-xs font-medium">
                  {getYearsOfService(member.join_date)}년차
                </span>
              </div>
              
              <div className="mt-3 pt-3 border-t border-[#f3f4f6] flex items-center justify-between">
                <span className="text-sm text-[#718096]">{member.phone}</span>
                <div className="flex gap-2">
                  <button className="text-xs text-[#5e6ad2] font-medium">연락</button>
                  <span className="text-[#d1d5db]">•</span>
                  <button className="text-xs text-[#5e6ad2] font-medium">상세</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Design Option 8: 프로그레스 카드 */}
      <section className="px-4 py-6 bg-white">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-[#0a0b0c]">Option 8: 프로그레스 표시</h2>
          <p className="text-sm text-[#718096]">근속/성과 시각화 • 동기부여 요소</p>
        </div>
        <div className="space-y-3">
          {sampleMembers.slice(0, 2).map((member) => (
            <div
              key={member.id}
              className="bg-gradient-to-br from-white to-[#fafbfb] rounded-xl border border-[#f3f4f6] p-4"
              onClick={() => setSelectedDesign(8)}
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-base font-semibold text-[#0a0b0c]">{member.name}</h3>
                  <p className="text-sm text-[#718096]">{member.team_name} • {member.employee_number}</p>
                </div>
                {member.role === "관리자" && (
                  <div className="px-2 py-1 bg-gradient-to-r from-[#5e6ad2] to-[#8b7cf6] rounded-md">
                    <Shield className="h-3.5 w-3.5 text-white" />
                  </div>
                )}
              </div>
              
              <div className="space-y-2">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-[#718096]">근속기간</span>
                    <span className="text-xs font-medium text-[#4a5568]">{getYearsOfService(member.join_date)}년</span>
                  </div>
                  <div className="h-1.5 bg-[#f3f4f6] rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-[#5e6ad2] to-[#8b7cf6] rounded-full"
                      style={{ width: `${Math.min(getYearsOfService(member.join_date) * 10, 100)}%` }}
                    />
                  </div>
                </div>
                
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-[#718096]">연차 사용률</span>
                    <span className="text-xs font-medium text-[#4a5568]">75%</span>
                  </div>
                  <div className="h-1.5 bg-[#f3f4f6] rounded-full overflow-hidden">
                    <div className="h-full bg-[#00b8cc] rounded-full" style={{ width: '75%' }} />
                  </div>
                </div>
              </div>
              
              <div className="mt-3 flex items-center gap-3 text-sm text-[#4a5568]">
                <Phone className="h-3.5 w-3.5" />
                <span>{member.phone}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Design Option 9: 미니 프로필 카드 */}
      <section className="px-4 py-6">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-[#0a0b0c]">Option 9: 미니 프로필</h2>
          <p className="text-sm text-[#718096]">초컴팩트 디자인 • 대량 리스트에 최적</p>
        </div>
        <div className="space-y-2">
          {sampleMembers.slice(0, 3).map((member) => (
            <div
              key={member.id}
              className="bg-white rounded-lg border border-[#f3f4f6] px-3 py-2.5 flex items-center"
              onClick={() => setSelectedDesign(9)}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-[#0a0b0c] truncate">{member.name}</h3>
                  {member.role === "관리자" && (
                    <Badge className="bg-[#5e6ad2] text-white text-[10px] px-1.5 py-0 h-4">관리자</Badge>
                  )}
                </div>
                <p className="text-xs text-[#718096] truncate">
                  {member.team_name}
                </p>
              </div>
              
              <MoreVertical className="h-4 w-4 text-[#9ca3af] flex-shrink-0" />
            </div>
          ))}
        </div>
      </section>

      {/* Design Option 10: 네오모피즘 카드 */}
      <section className="px-4 py-6 bg-[#f7f8f9]">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-[#0a0b0c]">Option 10: 네오모피즘</h2>
          <p className="text-sm text-[#718096]">부드러운 그림자 • 프리미엄 느낌</p>
        </div>
        <div className="space-y-3">
          {sampleMembers.slice(0, 2).map((member) => (
            <div
              key={member.id}
              className="bg-[#f7f8f9] rounded-2xl p-4"
              style={{
                boxShadow: '8px 8px 16px #d1d5db, -8px -8px 16px #ffffff'
              }}
              onClick={() => setSelectedDesign(10)}
            >
              <div className="flex items-center gap-3">
                <div 
                  className="h-14 w-14 rounded-xl flex items-center justify-center"
                  style={{
                    background: 'linear-gradient(145deg, #ffffff, #e5e7eb)',
                    boxShadow: 'inset 3px 3px 6px #d1d5db, inset -3px -3px 6px #ffffff'
                  }}
                >
                  <span className="text-[#5e6ad2] font-bold text-lg">{getInitials(member.name)}</span>
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-semibold text-[#0a0b0c]">{member.name}</h3>
                    {member.role === "관리자" && (
                      <Badge className="bg-white text-[#5e6ad2] text-[10px] px-2 py-0.5 shadow-sm">
                        관리자
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-[#4a5568] mt-0.5">{member.team_name}</p>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-xs text-[#718096]">{member.employee_number}</span>
                    <span className="text-xs text-[#d1d5db]">•</span>
                    <span className="text-xs text-[#718096]">{member.phone}</span>
                  </div>
                </div>
              </div>
              
              <div className="mt-3 flex gap-2">
                <button 
                  className="flex-1 py-1.5 rounded-lg text-xs font-medium text-[#5e6ad2]"
                  style={{
                    background: 'linear-gradient(145deg, #ffffff, #e5e7eb)',
                    boxShadow: '2px 2px 4px #d1d5db, -2px -2px 4px #ffffff'
                  }}
                >
                  상세보기
                </button>
                <button 
                  className="flex-1 py-1.5 rounded-lg text-xs font-medium text-[#5e6ad2]"
                  style={{
                    background: 'linear-gradient(145deg, #ffffff, #e5e7eb)',
                    boxShadow: '2px 2px 4px #d1d5db, -2px -2px 4px #ffffff'
                  }}
                >
                  수정
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Design Summary */}
      <section className="px-4 py-8 mt-8 bg-gradient-to-b from-white to-[#fafbfb]">
        <h2 className="text-lg font-semibold text-[#0a0b0c] mb-4">디자인 비교</h2>
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-white rounded-lg p-2.5 border border-[#f3f4f6]">
            <h3 className="font-medium text-xs text-[#0a0b0c] mb-0.5">1. 컴팩트 미니멀</h3>
            <p className="text-[10px] text-[#718096]">공간 효율적</p>
          </div>
          <div className="bg-white rounded-lg p-2.5 border border-[#f3f4f6]">
            <h3 className="font-medium text-xs text-[#0a0b0c] mb-0.5">2. 아바타 강조</h3>
            <p className="text-[10px] text-[#718096]">시각적 식별</p>
          </div>
          <div className="bg-white rounded-lg p-2.5 border border-[#f3f4f6]">
            <h3 className="font-medium text-xs text-[#0a0b0c] mb-0.5">3. 액션 버튼</h3>
            <p className="text-[10px] text-[#718096]">빠른 액션</p>
          </div>
          <div className="bg-white rounded-lg p-2.5 border border-[#f3f4f6]">
            <h3 className="font-medium text-xs text-[#0a0b0c] mb-0.5">4. 정보 계층</h3>
            <p className="text-[10px] text-[#718096]">체계적 정보</p>
          </div>
          <div className="bg-white rounded-lg p-2.5 border border-[#f3f4f6]">
            <h3 className="font-medium text-xs text-[#0a0b0c] mb-0.5">5. 스와이프</h3>
            <p className="text-[10px] text-[#718096]">모던 UX</p>
          </div>
          <div className="bg-white rounded-lg p-2.5 border border-[#f3f4f6]">
            <h3 className="font-medium text-xs text-[#0a0b0c] mb-0.5">6. 카드 플립</h3>
            <p className="text-[10px] text-[#718096]">인터랙티브</p>
          </div>
          <div className="bg-white rounded-lg p-2.5 border border-[#f3f4f6]">
            <h3 className="font-medium text-xs text-[#0a0b0c] mb-0.5">7. 태그 기반</h3>
            <p className="text-[10px] text-[#718096]">빠른 인지</p>
          </div>
          <div className="bg-white rounded-lg p-2.5 border border-[#f3f4f6]">
            <h3 className="font-medium text-xs text-[#0a0b0c] mb-0.5">8. 프로그레스</h3>
            <p className="text-[10px] text-[#718096]">데이터 시각화</p>
          </div>
          <div className="bg-white rounded-lg p-2.5 border border-[#f3f4f6]">
            <h3 className="font-medium text-xs text-[#0a0b0c] mb-0.5">9. 미니 프로필</h3>
            <p className="text-[10px] text-[#718096]">초컴팩트</p>
          </div>
          <div className="bg-white rounded-lg p-2.5 border border-[#f3f4f6]">
            <h3 className="font-medium text-xs text-[#0a0b0c] mb-0.5">10. 네오모피즘</h3>
            <p className="text-[10px] text-[#718096]">프리미엄</p>
          </div>
        </div>
      </section>
    </div>
  )
}