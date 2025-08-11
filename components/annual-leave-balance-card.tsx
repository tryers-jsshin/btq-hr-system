"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar, Clock, Eye, Plus, Minus } from "lucide-react"
import type { AnnualLeaveBalance } from "@/types/annual-leave"

interface AnnualLeaveBalanceCardProps {
  balance: AnnualLeaveBalance
  onViewHistory: (balance: AnnualLeaveBalance) => void
  onAdjust: (balance: AnnualLeaveBalance, type: "grant" | "expire") => void
}

export function AnnualLeaveBalanceCard({ balance, onViewHistory, onAdjust }: AnnualLeaveBalanceCardProps) {
  const getBalanceColor = (currentBalance: number) => {
    if (currentBalance <= 0) return "text-red-600"
    if (currentBalance <= 5) return "text-yellow-600"
    return "text-green-600"
  }

  const calculateYearsOfService = () => {
    const joinDate = new Date(balance.join_date)
    const today = new Date()

    // 년, 월 단위로 정확히 계산
    let years = today.getFullYear() - joinDate.getFullYear()
    let months = today.getMonth() - joinDate.getMonth()

    // 일자를 고려한 보정
    if (today.getDate() < joinDate.getDate()) {
      months--
    }

    // 월이 음수인 경우 보정
    if (months < 0) {
      years--
      months += 12
    }

    // 표시 형식 결정
    if (years === 0) {
      return `${months}개월`
    } else if (months === 0) {
      return `${years}년`
    } else {
      return `${years}년 ${months}개월`
    }
  }

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center">
            {balance.member_name}
            <Badge variant="secondary" className="ml-2">
              {balance.team_name}
            </Badge>
          </CardTitle>
          <div className="flex items-center space-x-1">
            <Button variant="ghost" size="sm" onClick={() => onViewHistory(balance)} title="사용 내역">
              <Eye className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => onAdjust(balance, "grant")} title="연차 부여">
              <Plus className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => onAdjust(balance, "expire")} title="연차 차감">
              <Minus className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* 현재 잔액 */}
        <div className="text-center p-4 bg-gray-50 rounded-lg">
          <div className="text-sm text-gray-600 mb-1">현재 연차 잔액</div>
          <div className={`text-3xl font-bold ${getBalanceColor(balance.current_balance)}`}>
            {balance.current_balance}일
          </div>
        </div>

        {/* 상세 정보 */}
        <div className="grid grid-cols-3 gap-2 text-sm">
          <div className="text-center p-2 bg-blue-50 rounded">
            <div className="text-blue-600 font-medium">{balance.total_granted}</div>
            <div className="text-blue-500 text-xs">총 부여</div>
          </div>
          <div className="text-center p-2 bg-orange-50 rounded">
            <div className="text-orange-600 font-medium">{balance.total_used}</div>
            <div className="text-orange-500 text-xs">총 사용</div>
          </div>
          <div className="text-center p-2 bg-red-50 rounded">
            <div className="text-red-600 font-medium">{balance.total_expired}</div>
            <div className="text-red-500 text-xs">총 소멸</div>
          </div>
        </div>

        {/* 기본 정보 */}
        <div className="space-y-2 text-sm text-gray-600">
          <div className="flex items-center">
            <Calendar className="h-4 w-4 mr-2" />
            <span>입사일: {new Date(balance.join_date).toLocaleDateString("ko-KR")}</span>
          </div>
          <div className="flex items-center">
            <Clock className="h-4 w-4 mr-2" />
            <span>근속: {calculateYearsOfService()}</span>
          </div>
        </div>

        {/* 마지막 업데이트 */}
        <div className="text-xs text-gray-500 text-right">
          마지막 업데이트: {new Date(balance.last_updated).toLocaleDateString("ko-KR")}
        </div>
      </CardContent>
    </Card>
  )
}
