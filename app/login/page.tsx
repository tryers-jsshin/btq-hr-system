"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Eye, EyeOff, LogIn, AlertCircle } from "lucide-react"
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
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">HR 시스템</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-center">
              <LogIn className="h-5 w-5 mr-2" />
              로그인
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {errors.general && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{errors.general}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="employeeNumber">사원번호</Label>
                <Input
                  id="employeeNumber"
                  type="text"
                  value={formData.employeeNumber}
                  onChange={(e) => setFormData((prev) => ({ ...prev, employeeNumber: e.target.value }))}
                  placeholder="사원번호를 입력하세요"
                  className={errors.employeeNumber ? "border-red-500" : ""}
                />
                {errors.employeeNumber && <p className="text-sm text-red-500">{errors.employeeNumber}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">비밀번호</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={(e) => setFormData((prev) => ({ ...prev, password: e.target.value }))}
                    placeholder="비밀번호를 입력하세요"
                    className={errors.password ? "border-red-500 pr-10" : "pr-10"}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-gray-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-400" />
                    )}
                  </Button>
                </div>
                {errors.password && <p className="text-sm text-red-500">{errors.password}</p>}
              </div>

              <div className="bg-blue-50 p-3 rounded-lg">
                <p className="text-sm text-blue-700 font-medium">로그인 정보</p>
                <p className="text-xs text-blue-600 mt-1">• 사원번호: 구성원 등록 시 입력한 사원번호</p>
                <p className="text-xs text-blue-600">• 초기 비밀번호: 구성원 등록 시 입력한 전화번호 (하이픈 제외)</p>
                <p className="text-xs text-blue-600 mt-1">예: 010-1234-5678 → 01012345678</p>
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "로그인 중..." : "로그인"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
