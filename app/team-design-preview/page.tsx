"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Users, 
  MoreVertical, 
  Building2, 
  UserCheck,
  TrendingUp,
  Award,
  Briefcase,
  Target,
  Calendar,
  Hash
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"

// 더미 데이터
const sampleTeams = [
  { id: "1", name: "개발팀", member_count: 12, created_at: "2023-01-15", target: 15, leader: "김민지" },
  { id: "2", name: "디자인팀", member_count: 8, created_at: "2023-03-20", target: 10, leader: "이준호" },
  { id: "3", name: "마케팅팀", member_count: 6, created_at: "2023-06-10", target: 8, leader: "박서연" },
  { id: "4", name: "영업팀", member_count: 15, created_at: "2022-11-05", target: 20, leader: "최동욱" },
  { id: "5", name: "인사팀", member_count: 4, created_at: "2024-02-15", target: 5, leader: "정하나" },
]

export default function TeamDesignPreview() {
  const [selectedDesign, setSelectedDesign] = useState<number | null>(null)

  const handleEdit = () => console.log("Edit clicked")
  const handleDelete = () => console.log("Delete clicked")

  return (
    <div className="min-h-screen bg-[#fafbfb] pb-20">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white border-b border-[#f3f4f6]">
        <div className="px-4 py-4">
          <h1 className="text-xl font-semibold text-[#0a0b0c]">팀 카드 디자인 프리뷰</h1>
          <p className="text-sm text-[#718096] mt-1">5가지 디자인 중 선택하세요</p>
        </div>
      </div>

      {/* Design Option 1: 현재 디자인 (개선) */}
      <section className="px-4 py-6">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-[#0a0b0c]">Option 1: 그라데이션 아이콘</h2>
          <p className="text-sm text-[#718096]">현재 적용된 디자인의 개선 버전</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sampleTeams.slice(0, 3).map((team) => (
            <Card 
              key={team.id}
              className="bg-white border border-[#f3f4f6] hover:border-[#e5e7eb] transition-all duration-200 group"
              onClick={() => setSelectedDesign(1)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-md bg-gradient-to-br from-[#5e6ad2] to-[#8b7cf6] flex items-center justify-center">
                      <Users className="h-4 w-4 text-white" />
                    </div>
                    <h3 className="text-base font-semibold text-[#0a0b0c]">{team.name}</h3>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 w-8 p-0 hover:bg-[#f3f4f6]"
                      >
                        <MoreVertical className="h-4 w-4 text-[#718096]" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-32">
                      <DropdownMenuItem onClick={handleEdit}>수정</DropdownMenuItem>
                      <DropdownMenuItem onClick={handleDelete} className="text-red-600">삭제</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center justify-between py-3 px-3 bg-[#fafbfb] rounded-lg">
                  <span className="text-sm text-[#4a5568]">활성 구성원</span>
                  <Badge className="bg-[#5e6ad2]/10 text-[#5e6ad2] hover:bg-[#5e6ad2]/10 border-0 font-semibold">
                    {team.member_count}명
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Design Option 2: 미니멀 플랫 */}
      <section className="px-4 py-6 bg-white">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-[#0a0b0c]">Option 2: 미니멀 플랫</h2>
          <p className="text-sm text-[#718096]">깔끔하고 단순한 디자인</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sampleTeams.slice(0, 3).map((team) => (
            <Card 
              key={team.id}
              className="bg-white border border-[#f3f4f6] hover:shadow-md transition-all duration-200"
              onClick={() => setSelectedDesign(2)}
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-[#5e6ad2]" />
                    <h3 className="text-lg font-semibold text-[#0a0b0c]">{team.name}</h3>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreVertical className="h-4 w-4 text-[#718096]" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-32">
                      <DropdownMenuItem onClick={handleEdit}>수정</DropdownMenuItem>
                      <DropdownMenuItem onClick={handleDelete} className="text-red-600">삭제</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-[#718096]" />
                    <span className="text-sm text-[#4a5568]">구성원</span>
                  </div>
                  <span className="text-lg font-bold text-[#0a0b0c]">{team.member_count}</span>
                </div>
                <div className="h-px bg-[#f3f4f6]" />
                <div className="flex items-center gap-2">
                  <UserCheck className="h-4 w-4 text-[#718096]" />
                  <span className="text-sm text-[#718096]">팀장: {team.leader}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Design Option 3: 프로그레스 바 */}
      <section className="px-4 py-6">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-[#0a0b0c]">Option 3: 목표 대시보드</h2>
          <p className="text-sm text-[#718096]">팀 목표와 진행률 표시</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sampleTeams.slice(0, 3).map((team) => (
            <Card 
              key={team.id}
              className="bg-white border border-[#f3f4f6] overflow-hidden hover:shadow-lg transition-all duration-200"
              onClick={() => setSelectedDesign(3)}
            >
              <div className="h-1 bg-gradient-to-r from-[#5e6ad2] to-[#8b7cf6]" />
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-[#0a0b0c]">{team.name}</h3>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreVertical className="h-4 w-4 text-[#718096]" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-32">
                      <DropdownMenuItem onClick={handleEdit}>수정</DropdownMenuItem>
                      <DropdownMenuItem onClick={handleDelete} className="text-red-600">삭제</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[#718096]">팀원 충원률</span>
                    <span className="font-medium text-[#0a0b0c]">
                      {team.member_count}/{team.target}명
                    </span>
                  </div>
                  <Progress 
                    value={(team.member_count / team.target) * 100} 
                    className="h-2"
                  />
                </div>
                <div className="flex items-center justify-between pt-2">
                  <div className="flex items-center gap-2">
                    <Target className="h-4 w-4 text-[#718096]" />
                    <span className="text-sm text-[#718096]">목표</span>
                  </div>
                  <Badge variant="secondary">
                    {Math.round((team.member_count / team.target) * 100)}%
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Design Option 4: 컴팩트 리스트 */}
      <section className="px-4 py-6 bg-white">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-[#0a0b0c]">Option 4: 컴팩트 리스트</h2>
          <p className="text-sm text-[#718096]">공간 효율적인 리스트 형태</p>
        </div>
        <div className="space-y-2">
          {sampleTeams.slice(0, 3).map((team) => (
            <Card 
              key={team.id}
              className="bg-white border border-[#f3f4f6] hover:bg-[#fafbfb] transition-all duration-200"
              onClick={() => setSelectedDesign(4)}
            >
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full bg-[#f7f8f9] flex items-center justify-center">
                      <span className="text-lg font-bold text-[#5e6ad2]">
                        {team.name.substring(0, 2)}
                      </span>
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-[#0a0b0c]">{team.name}</h3>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-sm text-[#718096]">
                          <Users className="h-3 w-3 inline mr-1" />
                          {team.member_count}명
                        </span>
                        <span className="text-sm text-[#718096]">
                          <Calendar className="h-3 w-3 inline mr-1" />
                          {new Date(team.created_at).getFullYear()}년 창설
                        </span>
                      </div>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreVertical className="h-4 w-4 text-[#718096]" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-32">
                      <DropdownMenuItem onClick={handleEdit}>수정</DropdownMenuItem>
                      <DropdownMenuItem onClick={handleDelete} className="text-red-600">삭제</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Design Option 5: 스탯 카드 */}
      <section className="px-4 py-6">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-[#0a0b0c]">Option 5: 스탯 카드</h2>
          <p className="text-sm text-[#718096]">다양한 정보를 한눈에</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sampleTeams.slice(0, 3).map((team) => (
            <Card 
              key={team.id}
              className="bg-white border border-[#f3f4f6] hover:border-[#5e6ad2] transition-all duration-200"
              onClick={() => setSelectedDesign(5)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <Badge className="bg-[#5e6ad2] text-white px-2 py-0.5 text-xs">
                    TEAM
                  </Badge>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreVertical className="h-4 w-4 text-[#718096]" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-32">
                      <DropdownMenuItem onClick={handleEdit}>수정</DropdownMenuItem>
                      <DropdownMenuItem onClick={handleDelete} className="text-red-600">삭제</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <h3 className="text-xl font-bold text-[#0a0b0c] mt-2">{team.name}</h3>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-[#fafbfb] rounded-lg p-3">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Users className="h-3.5 w-3.5 text-[#5e6ad2]" />
                      <span className="text-xs text-[#718096]">구성원</span>
                    </div>
                    <p className="text-lg font-bold text-[#0a0b0c]">{team.member_count}</p>
                  </div>
                  <div className="bg-[#fafbfb] rounded-lg p-3">
                    <div className="flex items-center gap-1.5 mb-1">
                      <TrendingUp className="h-3.5 w-3.5 text-[#00b8cc]" />
                      <span className="text-xs text-[#718096]">성장률</span>
                    </div>
                    <p className="text-lg font-bold text-[#0a0b0c]">+{Math.floor(Math.random() * 30)}%</p>
                  </div>
                </div>
                <div className="border-t border-[#f3f4f6] pt-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Award className="h-4 w-4 text-[#8b7cf6]" />
                      <span className="text-sm text-[#4a5568]">팀장</span>
                    </div>
                    <span className="text-sm font-medium text-[#0a0b0c]">{team.leader}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Selection Feedback */}
      {selectedDesign && (
        <div className="fixed bottom-4 left-4 right-4 bg-[#0a0b0c] text-white rounded-lg px-4 py-3 shadow-lg z-50">
          <p className="text-sm">Option {selectedDesign}를 선택하셨습니다</p>
        </div>
      )}

      {/* Design Summary */}
      <section className="px-4 py-8 mt-8 bg-gradient-to-b from-white to-[#fafbfb]">
        <h2 className="text-lg font-semibold text-[#0a0b0c] mb-4">디자인 비교</h2>
        <div className="space-y-2">
          <div className="bg-white rounded-lg p-3 border border-[#f3f4f6]">
            <h3 className="font-medium text-sm text-[#0a0b0c] mb-1">Option 1: 그라데이션 아이콘</h3>
            <p className="text-xs text-[#718096]">✅ 시각적 매력 ✅ 현대적 ❌ 공간 사용</p>
          </div>
          <div className="bg-white rounded-lg p-3 border border-[#f3f4f6]">
            <h3 className="font-medium text-sm text-[#0a0b0c] mb-1">Option 2: 미니멀 플랫</h3>
            <p className="text-xs text-[#718096]">✅ 깔끔함 ✅ 정보 명확 ❌ 단조로움</p>
          </div>
          <div className="bg-white rounded-lg p-3 border border-[#f3f4f6]">
            <h3 className="font-medium text-sm text-[#0a0b0c] mb-1">Option 3: 목표 대시보드</h3>
            <p className="text-xs text-[#718096]">✅ 진행률 시각화 ✅ 목표 관리 ❌ 복잡함</p>
          </div>
          <div className="bg-white rounded-lg p-3 border border-[#f3f4f6]">
            <h3 className="font-medium text-sm text-[#0a0b0c] mb-1">Option 4: 컴팩트 리스트</h3>
            <p className="text-xs text-[#718096]">✅ 공간 효율 ✅ 많은 팀 표시 ❌ 정보 제한</p>
          </div>
          <div className="bg-white rounded-lg p-3 border border-[#f3f4f6]">
            <h3 className="font-medium text-sm text-[#0a0b0c] mb-1">Option 5: 스탯 카드</h3>
            <p className="text-xs text-[#718096]">✅ 정보 풍부 ✅ 대시보드형 ❌ 복잡도</p>
          </div>
        </div>
      </section>
    </div>
  )
}