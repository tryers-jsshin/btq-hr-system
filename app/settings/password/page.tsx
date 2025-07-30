"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { KeyRound, Eye, EyeOff, CheckCircle, AlertCircle } from "lucide-react"
import { supabaseMemberStorage } from "@/lib/supabase-member-storage"
import { useToast } from "@/hooks/use-toast"
import type { Database } from "@/types/database"
import { useRouter } from "next/navigation"
import { supabaseAuthStorage } from "@/lib/supabase-auth-storage"

type Member = Database["public"]["Tables"]["members"]["Row"]

export default function PasswordChange() {
  const [currentUser, setCurrentUser] = useState<Member | null>(null)
  const [formData, setFormData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  })
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  })
  const [errors, setErrors] = useState<{ [key: string]: string }>({})
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()
  const router = useRouter()

  useEffect(() => {
    const loadCurrentUser = async () => {
      try {
        const user = await supabaseAuthStorage.getCurrentUser()
        if (user) {
          setCurrentUser(user)
        } else {
          router.push("/login")
        }
      } catch (error) {
        console.error("사용자 정보 로드 실패:", error)
        router.push("/login")
      }
    }

    loadCurrentUser()
  }, [router])

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {}

    if (!formData.currentPassword) {
      newErrors.currentPassword = "현재 비밀번호를 입력해주세요"
    }

    if (!formData.newPassword) {
      newErrors.newPassword = "새 비밀번호를 입력해주세요"
    } else {
      const passwordValidation = validatePassword(formData.newPassword)
      if (!passwordValidation.isValid) {
        newErrors.newPassword = passwordValidation.message
      }
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = "새 비밀번호 확인을 입력해주세요"
    } else if (formData.newPassword !== formData.confirmPassword) {
      newErrors.confirmPassword = "새 비밀번호가 일치하지 않습니다"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const validatePassword = (password: string) => {
    if (password.length < 4) {
      return { isValid: false, message: "비밀번호는 최소 4자 이상이어야 합니다" }
    }
    if (password.length > 20) {
      return { isValid: false, message: "비밀번호는 최대 20자까지 가능합니다" }
    }
    return { isValid: true, message: "" }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm() || !currentUser) return

    setIsLoading(true)

    try {
      const result = await supabaseMemberStorage.changePassword(
        currentUser.id,
        formData.currentPassword,
        formData.newPassword,
      )

      if (result.success) {
        // 폼 초기화
        setFormData({
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        })
        setErrors({})

        // 성공 알림
        toast({
          title: "✅ 비밀번호 변경 완료",
          description: "비밀번호가 성공적으로 변경되었습니다.",
          duration: 3000,
        })
      } else {
        setErrors({ currentPassword: result.message })
        toast({
          title: "❌ 비밀번호 변경 실패",
          description: result.message,
          variant: "destructive",
          duration: 3000,
        })
      }
    } catch (error) {
      console.error("비밀번호 변경 오류:", error)
      toast({
        title: "❌ 오류 발생",
        description: "비밀번호 변경 중 오류가 발생했습니다.",
        variant: "destructive",
        duration: 3000,
      })
    } finally {
      setIsLoading(false)
    }
  }

  const togglePasswordVisibility = (field: "current" | "new" | "confirm") => {
    setShowPasswords((prev) => ({
      ...prev,
      [field]: !prev[field],
    }))
  }

  const getPasswordStrength = (password: string) => {
    if (password.length === 0) return { strength: 0, text: "", color: "" }
    if (password.length < 4) return { strength: 1, text: "약함", color: "text-red-500" }
    if (password.length < 8) return { strength: 2, text: "보통", color: "text-yellow-500" }
    return { strength: 3, text: "강함", color: "text-green-500" }
  }

  const passwordStrength = getPasswordStrength(formData.newPassword)

  if (!currentUser) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">비밀번호 변경</h1>
          <p className="text-gray-600">로딩 중...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center">
          <KeyRound className="h-6 w-6 mr-2" />
          비밀번호 변경
        </h1>
      </div>

      <div className="max-w-md">
        <Card>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* 현재 비밀번호 */}
              <div className="space-y-2">
                <Label htmlFor="currentPassword">현재 비밀번호</Label>
                <div className="relative">
                  <Input
                    id="currentPassword"
                    type={showPasswords.current ? "text" : "password"}
                    value={formData.currentPassword}
                    onChange={(e) => setFormData((prev) => ({ ...prev, currentPassword: e.target.value }))}
                    placeholder="현재 비밀번호를 입력하세요"
                    className={errors.currentPassword ? "border-red-500 pr-10" : "pr-10"}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => togglePasswordVisibility("current")}
                  >
                    {showPasswords.current ? (
                      <EyeOff className="h-4 w-4 text-gray-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-400" />
                    )}
                  </Button>
                </div>
                {errors.currentPassword && (
                  <p className="text-sm text-red-500 flex items-center">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    {errors.currentPassword}
                  </p>
                )}
              </div>

              {/* 새 비밀번호 */}
              <div className="space-y-2">
                <Label htmlFor="newPassword">새 비밀번호</Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={showPasswords.new ? "text" : "password"}
                    value={formData.newPassword}
                    onChange={(e) => setFormData((prev) => ({ ...prev, newPassword: e.target.value }))}
                    placeholder="새 비밀번호를 입력하세요"
                    className={errors.newPassword ? "border-red-500 pr-10" : "pr-10"}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => togglePasswordVisibility("new")}
                  >
                    {showPasswords.new ? (
                      <EyeOff className="h-4 w-4 text-gray-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-400" />
                    )}
                  </Button>
                </div>
                {formData.newPassword && (
                  <div className="flex items-center space-x-2 text-sm">
                    <span className="text-gray-600">강도:</span>
                    <span className={passwordStrength.color}>{passwordStrength.text}</span>
                    <div className="flex space-x-1">
                      {[1, 2, 3].map((level) => (
                        <div
                          key={level}
                          className={`h-2 w-6 rounded ${
                            level <= passwordStrength.strength
                              ? level === 1
                                ? "bg-red-500"
                                : level === 2
                                  ? "bg-yellow-500"
                                  : "bg-green-500"
                              : "bg-gray-200"
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                )}
                {errors.newPassword && (
                  <p className="text-sm text-red-500 flex items-center">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    {errors.newPassword}
                  </p>
                )}
              </div>

              {/* 새 비밀번호 확인 */}
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">새 비밀번호 확인</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showPasswords.confirm ? "text" : "password"}
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                    placeholder="새 비밀번호를 다시 입력하세요"
                    className={errors.confirmPassword ? "border-red-500 pr-10" : "pr-10"}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => togglePasswordVisibility("confirm")}
                  >
                    {showPasswords.confirm ? (
                      <EyeOff className="h-4 w-4 text-gray-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-400" />
                    )}
                  </Button>
                </div>
                {formData.confirmPassword && formData.newPassword === formData.confirmPassword && (
                  <p className="text-sm text-green-500 flex items-center">
                    <CheckCircle className="h-4 w-4 mr-1" />
                    비밀번호가 일치합니다
                  </p>
                )}
                {errors.confirmPassword && (
                  <p className="text-sm text-red-500 flex items-center">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    {errors.confirmPassword}
                  </p>
                )}
              </div>

              {/* 안내 메시지 */}
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <ul className="text-sm space-y-1">
                    <li>• 비밀번호는 최소 4자 이상, 최대 20자까지 가능합니다</li>
                    <li>• 현재 비밀번호와 다른 비밀번호를 입력해주세요</li>
                    <li>• 안전한 비밀번호 사용을 권장합니다</li>
                  </ul>
                </AlertDescription>
              </Alert>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "변경 중..." : "비밀번호 변경"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
