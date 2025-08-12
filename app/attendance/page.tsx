"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function AttendancePage() {
  const router = useRouter()
  
  useEffect(() => {
    // 기본적으로 나의 근태 관리로 리다이렉트
    router.replace("/attendance/my")
  }, [router])
  
  return (
    <div className="flex items-center justify-center h-full">
      <p className="text-gray-500">리다이렉트 중...</p>
    </div>
  )
}