"use client"

import type React from "react"

import { usePathname } from "next/navigation"
import { Sidebar } from "@/components/sidebar"
import { MobileNav } from "@/components/mobile-nav"
import { RouteGuard } from "@/components/route-guard"

interface ConditionalLayoutProps {
  children: React.ReactNode
}

export function ConditionalLayout({ children }: ConditionalLayoutProps) {
  const pathname = usePathname()
  const isLoginPage = pathname === "/login"

  if (isLoginPage) {
    // 로그인 페이지는 전체 화면 사용
    return (
      <div className="min-h-screen bg-[#fafbfb]">
        <RouteGuard>{children}</RouteGuard>
      </div>
    )
  }

  // 일반 페이지는 사이드바 레이아웃 사용
  return (
    <RouteGuard>
      <div className="flex h-screen bg-white">
        {/* Desktop Sidebar */}
        <div className="hidden lg:flex lg:w-64 lg:flex-col">
          <Sidebar />
        </div>

        {/* Main Content */}
        <div className="flex flex-1 flex-col overflow-hidden bg-white">
          {/* Mobile Navigation */}
          <div className="lg:hidden">
            <MobileNav />
          </div>

          {/* Page Content */}
          <main className="flex-1 overflow-y-auto p-4 lg:p-6 bg-white">{children}</main>
        </div>
      </div>
    </RouteGuard>
  )
}
