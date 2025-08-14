"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  Users,
  UsersRound,
  Settings,
  CalendarDays,
  Clock,
  KeyRound,
  LogOut,
  User,
  Menu,
  UserX,
  Calendar,
  FileText,
  CheckCircle,
  ClipboardList,
  Coins,
  Building2,
  PlaneTakeoff,
  CheckSquare,
  BarChart3,
  Settings2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { ChevronDown } from "lucide-react"
import { useState, useEffect } from "react"
import { supabaseAuthStorage } from "@/lib/supabase-auth-storage"
import { useToast } from "@/hooks/use-toast"
import type { Database } from "@/types/database"

type Member = Database["public"]["Tables"]["members"]["Row"]

const menuItems = [
  {
    title: "대시보드",
    href: "/",
    icon: LayoutDashboard,
    roles: ["관리자", "일반직원"],
  },
  {
    title: "인사 관리",
    icon: Users,
    roles: ["관리자"],
    children: [
      {
        title: "활성 구성원",
        href: "/members",
        icon: Users,
        roles: ["관리자"],
      },
      {
        title: "퇴사자 관리",
        href: "/members/terminated",
        icon: UserX,
        roles: ["관리자"],
      },
      {
        title: "팀 관리",
        href: "/teams",
        icon: Building2,
        roles: ["관리자"],
      },
    ],
  },
  {
    title: "근무 관리",
    icon: CalendarDays,
    roles: ["관리자", "일반직원"],
    children: [
      {
        title: "근무표 조회",
        href: "/work-schedule",
        icon: Calendar,
        roles: ["관리자", "일반직원"],
      },
      {
        title: "근무표 관리",
        href: "/work-schedule/manage",
        icon: Settings2,
        roles: ["관리자"],
      },
      {
        title: "근무 유형",
        href: "/settings/work-types",
        icon: Clock,
        roles: ["관리자"],
      },
      {
        title: "근무 마일리지",
        href: "/mileage/manage",
        icon: Coins,
        roles: ["관리자"],
      },
    ],
  },
  {
    title: "연차 관리",
    icon: PlaneTakeoff,
    roles: ["관리자", "일반직원"],
    children: [
      {
        title: "연차 신청",
        href: "/leave-request",
        icon: FileText,
        roles: ["관리자", "일반직원"],
      },
      {
        title: "연차 승인",
        href: "/leave-approval",
        icon: CheckSquare,
        roles: ["관리자"],
      },
      {
        title: "연차 설정",
        href: "/settings/annual-leave",
        icon: Settings2,
        roles: ["관리자"],
      },
    ],
  },
  {
    title: "근태 관리",
    icon: ClipboardList,
    roles: ["관리자", "일반직원"],
    children: [
      {
        title: "나의 근태",
        href: "/attendance/my",
        icon: ClipboardList,
        roles: ["관리자", "일반직원"],
      },
      {
        title: "전체 근태",
        href: "/attendance/all",
        icon: BarChart3,
        roles: ["관리자"],
      },
    ],
  },
  {
    title: "설정",
    icon: Settings,
    roles: ["관리자", "일반직원"],
    children: [
      {
        title: "비밀번호 변경",
        href: "/settings/password",
        icon: KeyRound,
        roles: ["관리자", "일반직원"],
      },
    ],
  },
]

export function MobileNav() {
  const pathname = usePathname()
  const router = useRouter()
  const { toast } = useToast()
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({
    "인사 관리": pathname.startsWith("/members") || pathname.startsWith("/teams"),
    "근무 관리": pathname.startsWith("/work-schedule") || pathname.startsWith("/settings/work-types") || pathname.startsWith("/mileage"),
    "연차 관리": pathname.startsWith("/leave-") || pathname.startsWith("/settings/annual-leave"),
    "근태 관리": pathname.startsWith("/attendance"),
    "설정": pathname.startsWith("/settings/password"),
  })
  const [open, setOpen] = useState(false)
  const [currentUser, setCurrentUser] = useState<Member | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadCurrentUser = async () => {
      try {
        const user = await supabaseAuthStorage.getCurrentUser()
        setCurrentUser(user)

        // 로그인되지 않은 경우 로그인 페이지로 리다이렉트
        if (!user) {
          router.push("/login")
        }
      } catch (error) {
        console.error("사용자 정보 로드 실패:", error)
        router.push("/login")
      } finally {
        setIsLoading(false)
      }
    }

    loadCurrentUser()
  }, [router])

  const handleLogout = async () => {
    if (confirm("로그아웃 하시겠습니까?")) {
      try {
        await supabaseAuthStorage.logout()
        toast({
          title: "로그아웃 완료",
          description: "성공적으로 로그아웃되었습니다.",
        })
        router.push("/login")
        setOpen(false)
      } catch (error) {
        toast({
          title: "오류 발생",
          description: "로그아웃 중 오류가 발생했습니다.",
          variant: "destructive",
        })
      }
    }
  }

  // 사용자 권한에 따른 메뉴 필터링
  const hasAccess = (roles: string[]) => {
    return currentUser && roles.includes(currentUser.role)
  }

  if (isLoading) {
    return (
      <div className="flex h-16 items-center justify-between px-4 border-b border-[#f3f4f6] bg-white">
        <h1 className="text-lg font-bold text-[#5e6ad2]">HR 시스템</h1>
        <div className="text-[#718096]">로딩 중...</div>
      </div>
    )
  }

  if (!currentUser) {
    return null // 로그인되지 않은 경우 네비게이션 숨김
  }

  return (
    <div className="flex h-16 items-center justify-between px-4 border-b border-[#f3f4f6] bg-white shadow-sm">
      <h1 className="text-lg font-bold text-[#5e6ad2]">HR 시스템</h1>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="text-[#4a5568] hover:bg-[#fafbfb] hover:text-[#0a0b0c] rounded-lg">
            <Menu className="h-6 w-6" />
            <span className="sr-only">메뉴 열기</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0">
          <DialogHeader className="sr-only">
            <DialogTitle>네비게이션 메뉴</DialogTitle>
          </DialogHeader>
          <div className="flex h-full flex-col">
            {/* Header */}
            <div className="flex h-16 items-center px-6 border-b border-[#f3f4f6] bg-white">
              <h1 className="text-xl font-bold text-[#5e6ad2]">HR 시스템</h1>
            </div>

            {/* Navigation */}
            <nav className="flex-1 space-y-1 px-3 py-4">
              {menuItems.map((item) => {
                // 메뉴 접근 권한 확인
                if (!hasAccess(item.roles)) {
                  return null
                }

                if (item.children) {
                  // 하위 메뉴 중 접근 가능한 메뉴가 있는지 확인
                  const accessibleChildren = item.children.filter((child) => hasAccess(child.roles))

                  // 접근 가능한 하위 메뉴가 없으면 상위 메뉴도 숨김
                  if (accessibleChildren.length === 0) {
                    return null
                  }

                  // 메뉴 열림/닫힘 상태 관리
                  const isOpen = openMenus[item.title] || false
                  const setMenuOpen = (open: boolean) => {
                    setOpenMenus(prev => ({ ...prev, [item.title]: open }))
                  }

                  return (
                    <Collapsible key={item.title} open={isOpen} onOpenChange={setMenuOpen}>
                      <CollapsibleTrigger asChild>
                        <Button
                          variant="ghost"
                          className={cn(
                            "w-full justify-between px-3 py-2 text-left font-normal rounded-lg transition-colors duration-100",
                            false ? "bg-[#f3f4f6] text-[#0a0b0c]" : "text-[#4a5568] hover:bg-[#fafbfb] hover:text-[#0a0b0c]",
                          )}
                        >
                          <div className="flex items-center">
                            <item.icon className="mr-3 h-5 w-5" />
                            {item.title}
                          </div>
                          <ChevronDown className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")} />
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="space-y-1 pl-6">
                        {accessibleChildren.map((child) => (
                          <Link key={child.href} href={child.href} onClick={() => setOpen(false)}>
                            <Button
                              variant="ghost"
                              className={cn(
                                "w-full justify-start px-3 py-2 text-left font-normal rounded-lg transition-colors duration-100",
                                pathname === child.href
                                  ? "bg-[#5e6ad2]/10 text-[#5e6ad2] font-medium"
                                  : "text-[#4a5568] hover:bg-[#fafbfb] hover:text-[#0a0b0c]",
                              )}
                            >
                              <child.icon className="mr-3 h-4 w-4" />
                              {child.title}
                            </Button>
                          </Link>
                        ))}
                      </CollapsibleContent>
                    </Collapsible>
                  )
                }

                return (
                  <Link key={item.href} href={item.href} onClick={() => setOpen(false)}>
                    <Button
                      variant="ghost"
                      className={cn(
                        "w-full justify-start px-3 py-2 text-left font-normal rounded-lg transition-colors duration-100",
                        pathname === item.href
                          ? "bg-[#5e6ad2]/10 text-[#5e6ad2] font-medium"
                          : "text-[#4a5568] hover:bg-[#fafbfb] hover:text-[#0a0b0c]",
                      )}
                    >
                      <item.icon className="mr-3 h-5 w-5" />
                      {item.title}
                    </Button>
                  </Link>
                )
              })}
            </nav>

            {/* User Info & Logout */}
            <div className="border-t border-[#f3f4f6] p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-semibold text-[#0a0b0c]">{currentUser.name}</p>
                    {currentUser.role === '관리자' && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-[#5e6ad2]/10 text-[#5e6ad2]">
                        관리자
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[#718096] mt-0.5">
                    {currentUser.team_name || '팀 미지정'}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-[#718096] hover:text-[#dc2626] hover:bg-[#fef2f2] rounded-lg transition-all duration-100"
                  onClick={handleLogout}
                  title="로그아웃"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
