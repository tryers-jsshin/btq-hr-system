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
  UserX,
  Calendar,
  FileText,
  CheckCircle,
  ClipboardList,
  Coins,
} from "lucide-react"
import { Button } from "@/components/ui/button"
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
    roles: ["관리자", "일반직원"], // 모든 사용자 접근 가능
  },
  {
    title: "구성원 관리",
    icon: Users,
    roles: ["관리자"], // 관리자만 접근 가능
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
    ],
  },
  {
    title: "팀 관리",
    href: "/teams",
    icon: UsersRound,
    roles: ["관리자"], // 관리자만 접근 가능
  },
  {
    title: "근무표",
    href: "/work-schedule",
    icon: CalendarDays,
    roles: ["관리자", "일반직원"], // 모든 사용자 접근 가능
  },
  {
    title: "연차 신청",
    href: "/leave-request",
    icon: FileText,
    roles: ["관리자", "일반직원"], // 모든 사용자 접근 가능
  },
  {
    title: "연차 승인",
    href: "/leave-approval",
    icon: CheckCircle,
    roles: ["관리자"], // 관리자만 접근 가능
  },
  {
    title: "나의 근태 관리",
    href: "/attendance/my",
    icon: ClipboardList,
    roles: ["관리자", "일반직원"], // 모든 사용자 접근 가능
  },
  {
    title: "구성원 근태 관리",
    href: "/attendance/all",
    icon: ClipboardList,
    roles: ["관리자"], // 관리자만 접근 가능
  },
  {
    title: "근무 마일리지",
    href: "/mileage/manage",
    icon: Coins,
    roles: ["관리자"], // 관리자만 접근 가능
  },
  {
    title: "기본 설정",
    icon: Settings,
    roles: ["관리자", "일반직원"], // 설정 메뉴 자체는 접근 가능 (하위 메뉴에서 권한 제어)
    children: [
      {
        title: "근무 유형",
        href: "/settings/work-types",
        icon: Clock,
        roles: ["관리자"], // 관리자만 접근 가능
      },
      {
        title: "연차 관리",
        href: "/settings/annual-leave",
        icon: Calendar,
        roles: ["관리자"], // 관리자만 접근 가능
      },
      {
        title: "비밀번호 변경",
        href: "/settings/password",
        icon: KeyRound,
        roles: ["관리자", "일반직원"], // 모든 사용자 접근 가능
      },
    ],
  },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { toast } = useToast()
  const [openSettings, setOpenSettings] = useState(pathname.startsWith("/settings"))
  const [openMembers, setOpenMembers] = useState(pathname.startsWith("/members"))
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
      <div className="flex h-full flex-col bg-white border-r border-[#f3f4f6]">
        <div className="flex h-16 items-center px-6 border-b border-[#f3f4f6]">
          <h1 className="text-xl font-bold text-[#0a0b0c]">HR 시스템</h1>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <p className="text-[#718096]">로딩 중...</p>
        </div>
      </div>
    )
  }

  if (!currentUser) {
    return null // 로그인되지 않은 경우 사이드바 숨김
  }

  return (
    <div className="flex h-full flex-col bg-white border-r border-[#f3f4f6]">
      {/* Header */}
      <div className="flex h-16 items-center px-6 border-b border-[#f3f4f6] bg-white">
        <h1 className="text-xl font-bold text-[#0a0b0c]">HR 시스템</h1>
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

            // 구성원 관리 메뉴인지 확인
            const isOpen = item.title === "구성원 관리" ? openMembers : openSettings
            const setOpen = item.title === "구성원 관리" ? setOpenMembers : setOpenSettings

            return (
              <Collapsible key={item.title} open={isOpen} onOpenChange={setOpen}>
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
                    <Link key={child.href} href={child.href}>
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
            <Link key={item.href} href={item.href}>
              <Button
                variant="ghost"
                className={cn(
                  "w-full justify-start px-3 py-2 text-left font-normal rounded-lg transition-colors duration-100",
                  pathname === item.href || (item.href === "/work-schedule" && pathname.startsWith("/work-schedule"))
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
  )
}
