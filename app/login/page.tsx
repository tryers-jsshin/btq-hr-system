"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Eye, EyeOff, LogIn, AlertCircle, Building2, Shield } from "lucide-react"
import { supabaseAuthStorage } from "@/lib/supabase-auth-storage"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"

export default function LoginPage() {
  const [formData, setFormData] = useState({
    employeeNumber: "",
    password: "",
  })
  const [showPassword, setShowPassword] = useState(false)
  const [errors, setErrors] = useState<{ [key: string]: string }>({})
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    // 이미 로그인된 경우 대시보드로 리다이렉트
    const checkAuth = async () => {
      const isLoggedIn = await supabaseAuthStorage.isLoggedIn()
      if (isLoggedIn) {
        router.push("/")
      }
    }
    checkAuth()
  }, [router])

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {}

    if (!formData.employeeNumber) {
      newErrors.employeeNumber = "사원번호를 입력해주세요"
    }

    if (!formData.password) {
      newErrors.password = "비밀번호를 입력해주세요"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    setIsLoading(true)

    try {
      const result = await supabaseAuthStorage.login(formData.employeeNumber, formData.password)

      if (result.success) {
        toast({
          title: "로그인 성공",
          description: result.message,
        })
        router.push("/")
      } else {
        setErrors({ general: result.message })
      }
    } catch (error) {
      setErrors({ general: "로그인 중 오류가 발생했습니다." })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#fafbfb] to-white flex items-center justify-center p-4">
      {/* 배경 장식 요소 */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-[#5e6ad2]/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-[#8b7cf6]/5 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* 로고 및 타이틀 */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-[#5e6ad2] to-[#8b7cf6] rounded-2xl mb-4 shadow-lg">
            <Building2 className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-[#0a0b0c]">HR 시스템</h1>
        </div>

        <Card className="border-[#f3f4f6] shadow-lg bg-white/80 backdrop-blur-sm">
          <div className="p-8">
            <form onSubmit={handleSubmit} className="space-y-5">
              {errors.general && (
                <Alert className="bg-[#fef2f2] border-[#fecaca] text-[#dc2626]">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{errors.general}</AlertDescription>
                </Alert>
              )}

              {/* 사원번호 입력 */}
              <div className="space-y-2">
                <Label htmlFor="employeeNumber" className="text-[#4a5568] font-medium">
                  사원번호
                </Label>
                <Input
                  id="employeeNumber"
                  type="text"
                  value={formData.employeeNumber}
                  onChange={(e) => setFormData((prev) => ({ ...prev, employeeNumber: e.target.value }))}
                  placeholder="사원번호를 입력하세요"
                  className={`h-11 bg-white border-[#e2e8f0] focus:border-[#5e6ad2] focus:ring-[#5e6ad2]/20 ${
                    errors.employeeNumber ? "border-[#dc2626] focus:border-[#dc2626]" : ""
                  }`}
                />
                {errors.employeeNumber && (
                  <p className="text-sm text-[#dc2626] mt-1">{errors.employeeNumber}</p>
                )}
              </div>

              {/* 비밀번호 입력 */}
              <div className="space-y-2">
                <Label htmlFor="password" className="text-[#4a5568] font-medium">
                  비밀번호
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={(e) => setFormData((prev) => ({ ...prev, password: e.target.value }))}
                    placeholder="비밀번호를 입력하세요"
                    className={`h-11 bg-white border-[#e2e8f0] focus:border-[#5e6ad2] focus:ring-[#5e6ad2]/20 pr-10 ${
                      errors.password ? "border-[#dc2626] focus:border-[#dc2626]" : ""
                    }`}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-[#718096]" />
                    ) : (
                      <Eye className="h-4 w-4 text-[#718096]" />
                    )}
                  </Button>
                </div>
                {errors.password && (
                  <p className="text-sm text-[#dc2626] mt-1">{errors.password}</p>
                )}
              </div>

              {/* 로그인 버튼 */}
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-11 bg-gradient-to-r from-[#5e6ad2] to-[#8b7cf6] hover:from-[#5661c5] hover:to-[#7e6fe8] text-white font-medium shadow-md transition-all duration-200 disabled:opacity-50"
              >
                {isLoading ? (
                  <span className="flex items-center">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                    로그인 중...
                  </span>
                ) : (
                  <span className="flex items-center justify-center">
                    <LogIn className="h-4 w-4 mr-2" />
                    로그인
                  </span>
                )}
              </Button>
            </form>
          </div>
        </Card>
      </div>
    </div>
  )
}
