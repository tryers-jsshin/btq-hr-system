"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { supabaseAuthStorage } from "@/lib/supabase-auth-storage"

// 페이지별 접근 권한 정의
const pagePermissions: { [key: string]: string[] } = {
  "/": ["관리자", "일반직원"], // 대시보드
  "/members": ["관리자"], // 구성원 관리
  "/teams": ["관리자"], // 팀 관리
  "/work-schedule": ["관리자", "일반직원"], // 근무표 조회
  "/work-schedule/manage": ["관리자"], // 근무표 관리
  "/settings/work-types": ["관리자"], // 근무 유형 설정
  "/settings/password": ["관리자", "일반직원"], // 비밀번호 변경
}

interface RouteGuardProps {
  children: React.ReactNode
}

export function RouteGuard({ children }: RouteGuardProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    const checkAuth = async () => {
      // 로그인 페이지는 권한 체크 제외
      if (pathname === "/login") {
        setIsChecking(false)
        return
      }

      try {
        const currentUser = await supabaseAuthStorage.getCurrentUser()

        // 로그인되지 않은 경우
        if (!currentUser) {
          router.push("/login")
          return
        }

        // 페이지 접근 권한 확인
        const allowedRoles = pagePermissions[pathname]

        if (allowedRoles && !allowedRoles.includes(currentUser.role)) {
          // 권한이 없는 경우 대시보드로 리다이렉트
          router.push("/")
          return
        }
      } catch (error) {
        console.error("권한 확인 중 오류:", error)
        router.push("/login")
        return
      } finally {
        setIsChecking(false)
      }
    }

    checkAuth()
  }, [pathname, router])

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">권한 확인 중...</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
